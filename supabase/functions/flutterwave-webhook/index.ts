import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, verif-hash",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify webhook secret
    const webhookSecret = Deno.env.get("FLUTTERWAVE_WEBHOOK_SECRET");
    const signature = req.headers.get("verif-hash");

    if (!webhookSecret || signature !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse payload
    const payload = await req.json();

    // 3. Only process successful charges
    if (payload?.event !== "charge.completed") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = payload?.data;
    if (!data || data.status !== "successful") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Check this is a Tradepad payment
    const jobId = data?.meta?.job_id;
    const platform = data?.meta?.platform;

    if (platform !== "tradepad" || !jobId) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Get payment amount
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Get transaction reference
    const reference = data.tx_ref ?? data.flw_ref ?? "";

    // 7. Update Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    // Fetch the job to resolve its owner and confirm it exists (404 otherwise).
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, owner_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Webhook: job not found", jobId);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Record the payment and update the job balance atomically. The RPC locks
    // the job row, inserts the payment (idempotent on the unique reference),
    // and applies the capped amount_paid update in a single transaction.
    const { data: result, error: rpcError } = await supabase.rpc(
      "record_job_payment",
      {
        p_job_id: jobId,
        p_owner_id: job.owner_id,
        p_reference: reference,
        p_amount: amount,
      },
    );

    if (rpcError) {
      console.error("record_job_payment failed:", rpcError);
      return new Response(
        JSON.stringify({ error: "Payment recording failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (result?.recorded === false) {
      // Duplicate webhook for an already-processed reference — safe no-op.
      console.log("Webhook: reference already processed, skipping:", reference);
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});