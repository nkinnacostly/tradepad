import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Server-side prices in naira. Used only to validate the verified amount —
// never to trust anything supplied by the client.
const EXPECTED_PRICES = {
  monthly: 1500,
  annual: 12000,
} as const;

type BillingCycle = keyof typeof EXPECTED_PRICES;

const json = (body: Record<string, unknown>, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify auth — authenticated app user only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } =
      await supabase.auth.getUser(token);
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 2. Parse + validate input
    const { tx_ref } = await req.json();

    if (!tx_ref || typeof tx_ref !== "string" || !tx_ref.startsWith("SUB-")) {
      return json({ error: "A valid subscription tx_ref is required" }, 400);
    }

    // 3. Ownership — tx_ref is SUB-{user_id}-{timestamp}. The user id is a UUID
    // (which itself contains hyphens), so take everything between the SUB-
    // prefix and the final -timestamp segment.
    const withoutPrefix = tx_ref.slice("SUB-".length);
    const lastDash = withoutPrefix.lastIndexOf("-");
    const refUserId =
      lastDash > 0 ? withoutPrefix.slice(0, lastDash) : "";

    if (refUserId !== user.id) {
      return json(
        { error: "You can only verify your own subscription payment" },
        403,
      );
    }

    // 4. Idempotency — already activated?
    const { data: existing } = await supabase
      .from("subscription_payments")
      .select("id")
      .eq("reference", tx_ref)
      .maybeSingle();

    if (existing) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_expires_at")
        .eq("id", user.id)
        .single();

      return json(
        {
          success: true,
          is_pro: true,
          already_processed: true,
          expires_at: profile?.subscription_expires_at ?? null,
        },
        200,
      );
    }

    // 5. Verify with Flutterwave by reference (never trust the client amount)
    const flwResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${Deno.env.get("FLUTTERWAVE_SECRET_KEY")}`,
          "Content-Type": "application/json",
        },
      },
    );

    const verificationData = await flwResponse.json();
    const flutterwaveData = verificationData?.data;

    if (
      verificationData?.status !== "success" ||
      flutterwaveData?.status !== "successful" ||
      flutterwaveData?.tx_ref !== tx_ref ||
      flutterwaveData?.currency !== "NGN"
    ) {
      // Not confirmed yet — let the app tell the user to retry shortly.
      return json(
        {
          success: true,
          is_pro: false,
          confirmed: false,
          message: "Payment not confirmed yet. Please try again in a moment.",
        },
        200,
      );
    }

    // 6. Amount check against the cycle (defense in depth)
    const billingCycle: string | undefined = flutterwaveData?.meta?.billing_cycle;
    const cycle = billingCycle as BillingCycle;
    const expectedPrice = EXPECTED_PRICES[cycle];
    const paidAmount = Number(flutterwaveData.amount);

    if (!expectedPrice || !(paidAmount >= expectedPrice * 0.99)) {
      console.error("verify-subscription: amount or cycle invalid — no grant", {
        tx_ref,
        billingCycle,
        paidAmount,
      });
      return json(
        {
          success: false,
          is_pro: false,
          error: "Payment amount does not match the selected plan",
        },
        400,
      );
    }

    // 7. Ledger insert, stacking expiry, and the Pro grant happen atomically
    // in Postgres. The RPC trusts that we already verified the payment above,
    // and handles idempotency on the unique reference.
    const { data: result, error } = await supabase.rpc(
      "process_subscription_payment",
      {
        p_owner_id: user.id,
        p_reference: tx_ref,
        p_amount: paidAmount,
        p_cycle: cycle,
      },
    );

    if (error) {
      console.error(
        "verify-subscription: process_subscription_payment error",
        error,
      );
      return json(
        { success: false, is_pro: false, error: "Could not record payment" },
        500,
      );
    }

    if (result?.granted) {
      console.log("verify-subscription: Pro granted", {
        tx_ref,
        ownerId: user.id,
        expires_at: result.expires_at,
      });
    } else {
      console.log("verify-subscription: already processed (idempotent no-op)", {
        tx_ref,
        ownerId: user.id,
      });
    }

    // granted: true => newly activated; false => already processed. Either way
    // the user is Pro, so report is_pro: true with the current expiry.
    return json(
      {
        success: true,
        is_pro: true,
        already_processed: result?.granted === false,
        expires_at: result?.expires_at ?? null,
      },
      200,
    );
  } catch (error) {
    console.error("verify-subscription error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
