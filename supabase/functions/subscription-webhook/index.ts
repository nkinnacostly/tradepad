import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, verif-hash",
};

// Server-side prices in naira. Used only to validate the verified amount —
// never to trust anything in the forwarded payload.
const EXPECTED_PRICES = {
  monthly: 1500,
  annual: 12000,
} as const;

const PERIOD_DAYS = {
  monthly: 30,
  annual: 365,
} as const;

type BillingCycle = keyof typeof EXPECTED_PRICES;

const DAY_MS = 24 * 60 * 60 * 1000;

// Helper so every acknowledgement uses the identical 200 shape Flutterwave
// (via the getpaidly.co router) expects, preventing retries.
const ack = (body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Step 1 — Auth: verify the forwarded webhook secret. This is the only
  // non-200 path; everything past it acknowledges with 200.
  const webhookSecret = Deno.env.get("FLUTTERWAVE_WEBHOOK_SECRET");
  const signature = req.headers.get("verif-hash");

  if (!webhookSecret || signature !== webhookSecret) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Step 2 — Parse
    const payload = await req.json();
    const data = payload?.data;

    const txRef: string = data?.tx_ref ?? "";

    // Not a subscription payment — acknowledge and no-op.
    if (!txRef.startsWith("SUB-")) {
      return ack({ received: true });
    }

    const ownerId: string | undefined = data?.meta?.owner_id;
    const billingCycle: string | undefined = data?.meta?.billing_cycle;
    const transactionId = data?.id;

    if (!ownerId || !transactionId) {
      console.error("subscription-webhook: missing owner_id or transaction id", {
        txRef,
      });
      return ack({ received: true });
    }

    // Service-role client — writes to profiles and subscription_payments,
    // bypassing RLS.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    // Step 3 — Idempotency (first line): already processed?
    const { data: existing } = await supabase
      .from("subscription_payments")
      .select("id")
      .eq("reference", txRef)
      .maybeSingle();

    if (existing) {
      console.log("subscription-webhook: already processed, skipping:", txRef);
      return ack({ success: true, already_processed: true });
    }

    // Step 4 — Verify with Flutterwave by transaction id (never trust payload).
    const flwResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
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
      flutterwaveData?.tx_ref !== txRef ||
      flutterwaveData?.currency !== "NGN"
    ) {
      console.error("subscription-webhook: verification failed", {
        txRef,
        verifyStatus: verificationData?.status,
        chargeStatus: flutterwaveData?.status,
        currency: flutterwaveData?.currency,
      });
      return ack({ received: true });
    }

    // Step 5 — Validate amount against the cycle (defense in depth).
    const cycle = billingCycle as BillingCycle;
    const expectedPrice = EXPECTED_PRICES[cycle];
    const paidAmount = Number(flutterwaveData.amount);

    if (!expectedPrice || !(paidAmount >= expectedPrice * 0.99)) {
      console.error("subscription-webhook: amount or cycle invalid — no grant", {
        txRef,
        billingCycle,
        paidAmount,
      });
      return ack({ received: true });
    }

    // Step 6 — Compute the new expiry with stacking.
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_expires_at")
      .eq("id", ownerId)
      .single();

    const now = new Date();
    const currentExpiry = profile?.subscription_expires_at
      ? new Date(profile.subscription_expires_at)
      : null;

    const hasActiveFuture =
      profile?.subscription_status === "active" &&
      currentExpiry !== null &&
      currentExpiry.getTime() > now.getTime();

    // Early renewals keep their remaining days — the new period stacks on top.
    const base = hasActiveFuture ? (currentExpiry as Date) : now;
    const newExpiry = new Date(base.getTime() + PERIOD_DAYS[cycle] * DAY_MS);

    // Step 7 — Write the ledger row. The unique reference is the second line
    // of idempotency defense (Postgres unique violation = already processed).
    const { error: insertError } = await supabase
      .from("subscription_payments")
      .insert({
        owner_id: ownerId,
        reference: txRef,
        amount: paidAmount,
        billing_cycle: cycle,
        period_start: base.toISOString(),
        period_end: newExpiry.toISOString(),
        status: "success",
      });

    if (insertError) {
      if (insertError.code === "23505") {
        console.log(
          "subscription-webhook: duplicate reference, skipping:",
          txRef,
        );
        return ack({ success: true, already_processed: true });
      }
      console.error("subscription-webhook: ledger insert error", insertError);
      return ack({ received: true });
    }

    // Step 8 — Grant Pro.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "pro",
        subscription_status: "active",
        subscription_expires_at: newExpiry.toISOString(),
        billing_cycle: cycle,
      })
      .eq("id", ownerId);

    if (updateError) {
      console.error("subscription-webhook: profile update error", updateError);
    }

    return ack({
      success: true,
      owner_id: ownerId,
      subscription_expires_at: newExpiry.toISOString(),
    });
  } catch (error) {
    // Always acknowledge so Flutterwave/the router does not retry a request
    // we have already consumed. Pro is only granted on the success path above.
    console.error("subscription-webhook error:", error);
    return ack({ received: true });
  }
});
