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

type BillingCycle = keyof typeof EXPECTED_PRICES;

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
    // TEMPORARY: inspect the real Flutterwave payload shape.
    console.log("subscription-webhook raw body:", JSON.stringify(payload));
    // The webhook body is used ONLY to learn which transaction to verify.
    // Metadata (owner_id, billing_cycle) is read from the verify response
    // below — the real Flutterwave webhook body does not nest meta under data.
    const data = payload?.data;

    const txRef: string = data?.tx_ref ?? "";
    const transactionId = data?.id;

    // Not a subscription payment — acknowledge and no-op.
    if (!txRef.startsWith("SUB-")) {
      return ack({ received: true });
    }

    if (!transactionId) {
      console.error("subscription-webhook: missing transaction id", { txRef });
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

    // Trust the verify response for everything else: owner_id and billing_cycle
    // come from data.meta — the same shape verify-subscription reads.
    const ownerId: string | undefined = flutterwaveData?.meta?.owner_id;
    const billingCycle: string | undefined =
      flutterwaveData?.meta?.billing_cycle;

    if (!ownerId) {
      console.error("subscription-webhook: missing owner_id in verify meta", {
        txRef,
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

    // Step 6 — Ledger insert, stacking expiry, and the Pro grant happen
    // atomically in Postgres. The RPC trusts that we already verified the
    // payment above, and handles idempotency on the unique reference.
    const { data: result, error } = await supabase.rpc(
      "process_subscription_payment",
      {
        p_owner_id: ownerId,
        p_reference: txRef,
        p_amount: paidAmount,
        p_cycle: cycle,
      },
    );

    if (error) {
      console.error(
        "subscription-webhook: process_subscription_payment error",
        error,
      );
      return ack({ received: true });
    }

    if (result?.granted) {
      console.log("subscription-webhook: Pro granted", {
        txRef,
        ownerId,
        expires_at: result.expires_at,
      });
    } else {
      console.log(
        "subscription-webhook: already processed (idempotent no-op)",
        { txRef, ownerId },
      );
    }

    return ack({
      success: true,
      owner_id: ownerId,
      granted: result?.granted ?? false,
      subscription_expires_at: result?.expires_at ?? null,
    });
  } catch (error) {
    // Always acknowledge so Flutterwave/the router does not retry a request
    // we have already consumed. Pro is only granted on the success path above.
    console.error("subscription-webhook error:", error);
    return ack({ received: true });
  }
});
