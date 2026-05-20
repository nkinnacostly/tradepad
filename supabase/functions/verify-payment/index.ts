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

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();

    if (existingPayment) {
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

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, amount_paid, owner_id")
      .eq("id", job_id)
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

    await supabase.from("payments").insert({
      job_id,
      owner_id: job.owner_id,
      amount,
      payment_method: "online",
      reference,
      notes: "Paid via Flutterwave payment link",
    });

    const newAmountPaid = Number(job.amount_paid) + amount;
    await supabase
      .from("jobs")
      .update({ amount_paid: newAmountPaid })
      .eq("id", job_id);

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
