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

    // Fetch current job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, amount_paid, total_amount, owner_id")
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

    // Insert payment record — skip entirely if duplicate reference
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        job_id: jobId,
        owner_id: job.owner_id,
        amount,
        payment_method: "online",
        reference,
        notes: "Paid via Flutterwave payment link",
      });

    if (paymentError) {
      if (paymentError.code === "23505") {
        // unique_violation — already processed, return success
        console.log("Webhook: duplicate reference, skipping:", reference);
        return new Response(
          JSON.stringify({ success: true, skipped: true }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      console.error("Webhook: payment insert error", paymentError);
      return new Response(
        JSON.stringify({ error: "Payment recording failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Only update job balance if payment insert succeeded
    // Cap at total_amount to prevent over-credit
    const newAmountPaid = Math.min(
      Number(job.amount_paid) + amount,
      Number(job.total_amount),
    );

    const { error: updateError } = await supabase
      .from("jobs")
      .update({ amount_paid: newAmountPaid })
      .eq("id", jobId);

    if (updateError) {
      console.error("Webhook: job update error", updateError);
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