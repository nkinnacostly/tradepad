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

    // 2. Get user from token
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
    const { bank_account_number, bank_name, bank_code, business_name, business_email, business_mobile } = await req.json();

    if (!bank_account_number || !bank_name || !bank_code || !business_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4. Create Flutterwave subaccount
    const flwResponse = await fetch(
      "https://api.flutterwave.com/v3/subaccounts",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("FLUTTERWAVE_SECRET_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number: bank_account_number,
          account_bank: bank_code,
          business_name,
          business_email: business_email ?? `${user.id}@tradepad.app`,
          business_mobile: business_mobile ?? "08000000000",
          country: "NG",
          split_type: "percentage",
          split_value: 0.985, // artisan gets 98.5%, Tradepad keeps 1.5%
        }),
      },
    );

    const flwData = await flwResponse.json();

    if (flwData.status !== "success") {
      return new Response(
        JSON.stringify({ error: flwData.message ?? "Flutterwave error" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const subaccountId = flwData.data.subaccount_id;

    // 5. Save to profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        bank_account_number,
        bank_name,
        bank_code,
        flutterwave_subaccount_id: subaccountId,
      })
      .eq("id", user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Could not save bank details" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, subaccount_id: subaccountId }),
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