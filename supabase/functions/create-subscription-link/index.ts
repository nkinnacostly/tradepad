import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Server-side prices in naira. The client only sends the cycle — never an
// amount — so a tampered request cannot buy Pro for less than these values.
const SUBSCRIPTION_PRICES = {
  monthly: 1500,
  annual: 12000,
} as const;

type BillingCycle = keyof typeof SUBSCRIPTION_PRICES;

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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get request body — only the billing cycle is trusted from the client
    const { billing_cycle } = await req.json();

    if (billing_cycle !== "monthly" && billing_cycle !== "annual") {
      return new Response(JSON.stringify({ error: "Invalid billing cycle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cycle = billing_cycle as BillingCycle;
    // Price is decided server-side, never read from the request body.
    const amount = SUBSCRIPTION_PRICES[cycle];

    // 4. Get profile for the customer name / email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Generate unique reference. The SUB- prefix is mandatory and exact —
    // the getpaidly.co webhook router keys on it to identify subscriptions.
    const reference = `SUB-${user.id}-${Date.now()}`;

    // 6. Create Flutterwave payment link.
    // This is a platform payment to Tradepad itself, so there is NO subaccount
    // or split config — the full fee lands in the Tradepad Flutterwave account.
    const flwResponse = await fetch(
      "https://api.flutterwave.com/v3/payments", // Standard checkout endpoint
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("FLUTTERWAVE_SECRET_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount,
          currency: "NGN",
          redirect_url: "https://tradepad.app/payment-complete",
          customer: {
            email: user.email ?? `${user.id}@users.tradepad.app`,
            name: profile.business_name ?? "Tradepad User",
          },
          meta: {
            platform: "tradepad",
            type: "subscription",
            owner_id: user.id,
            billing_cycle: cycle,
          },
          customizations: {
            title: "Tradepad Pro",
            description: `Tradepad Pro (${cycle}) subscription`,
          },
        }),
      },
    );

    const flwData = await flwResponse.json();

    if (flwData.status !== "success") {
      return new Response(
        JSON.stringify({
          error: flwData.message ?? "Could not create subscription link",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const paymentLink = flwData.data.link; // Standard checkout returns data.link

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
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
