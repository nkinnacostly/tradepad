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
    // 1. Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get request body
    const { job_id, amount, customer_name, customer_phone } = await req.json();

    if (!job_id || !amount || !customer_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4. Get profile with subaccount ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_name, flutterwave_subaccount_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!profile.flutterwave_subaccount_id) {
      return new Response(
        JSON.stringify({ error: "Bank account not set up yet" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 5. Generate unique reference
    const reference = `TRADEPAD-${job_id}-${Date.now()}`;

    // 6. Create Flutterwave payment link
   // Replace this section in the function:
const flwResponse = await fetch(
  "https://api.flutterwave.com/v3/payments",  // Standard checkout endpoint
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("FLUTTERWAVE_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount,
      currency: "NGN",
      redirect_url: "https://tradepad.app/payment-complete",
      customer: {
        email: `${customer_name.toLowerCase().replace(/\s+/g, "")}@tradepad-client.app`,
        phonenumber: customer_phone ?? "",
        name: customer_name,
      },
      meta: {
        job_id,
        platform: "tradepad",
      },
      subaccounts: [
        {
          id: profile.flutterwave_subaccount_id,
        },
      ],
      customizations: {
        title: profile.business_name,
        description: `Payment for job`,
      },
    }),
  },
);

const flwData = await flwResponse.json();

if (flwData.status !== "success") {
  return new Response(
    JSON.stringify({ error: flwData.message ?? "Could not create payment link" }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

const paymentLink = flwData.data.link;  // Standard checkout returns data.link

    return new Response(
      JSON.stringify({
        success: true,
        payment_link: paymentLink,
        tx_ref: reference,
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