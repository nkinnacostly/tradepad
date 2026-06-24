import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } =
      await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tx_ref, job_id } = await req.json();

    if (!tx_ref || !job_id) {
      return new Response(
        JSON.stringify({ error: "tx_ref and job_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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

    const flwData = await flwResponse.json();

    if (
      flwData.status !== "success" ||
      flwData.data?.status !== "successful"
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          paid: false,
          message: "Payment not completed yet",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const amount = Number(flwData.data.amount);
    const reference = flwData.data.tx_ref;
    // The job the verified transaction was actually for (falls back to the
    // request body for older links without meta.job_id).
    const jobId = flwData.data.meta?.job_id ?? job_id;

    // Confirm the job exists and belongs to the caller (ownership + 404).
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, owner_id")
      .eq("id", jobId)
      .eq("owner_id", user.id)
      .single();

    if (jobError || !job) {
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
        p_job_id: job.id,
        p_owner_id: job.owner_id,
        p_reference: reference,
        p_amount: amount,
      },
    );

    if (rpcError) {
      console.error("record_job_payment failed:", rpcError);
      return new Response(
        JSON.stringify({ error: "Could not record payment" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (result?.recorded === false) {
      // Already recorded (duplicate, or the webhook beat us) — safe no-op.
      console.log("verify-payment: reference already recorded:", reference);
      return new Response(
        JSON.stringify({
          success: true,
          paid: true,
          already_recorded: true,
          message: "Payment already recorded",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        paid: true,
        amount,
        message: "Payment verified and recorded",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
