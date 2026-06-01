import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req: Request) => {
  try {
    // Verify cron secret — this function is called by pg_cron, not users
    const cronSecret = Deno.env.get("CRON_SECRET");
    const incomingSecret = req.headers.get("x-cron-secret");

    if (!cronSecret || incomingSecret !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Find all jobs due tomorrow that are not delivered
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        due_date,
        status,
        owner_id,
        clients (full_name)
      `)
      .eq("due_date", tomorrowStr)
      .neq("status", "delivered");

    if (jobsError) {
      console.error("Jobs query error:", jobsError);
      return new Response(JSON.stringify({ error: jobsError.message }), {
        status: 500,
      });
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No jobs due tomorrow", sent: 0 }),
        { status: 200 },
      );
    }

    // Get push tokens for all affected owners
    const ownerIds = [...new Set(jobs.map((j) => j.owner_id))];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, push_token, business_name")
      .in("id", ownerIds);

    if (profilesError) {
      console.error("Profiles query error:", profilesError);
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 500,
      });
    }

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p]),
    );

    // Build push messages and notification records
    const messages: object[] = [];
    const notificationInserts: object[] = [];

    for (const job of jobs) {
      const profile = profileMap.get(job.owner_id);
      const clientName =
        (job.clients as { full_name: string } | null)?.full_name ??
        "A client";

      const title = "Job Due Tomorrow 📅";
      const body = `${job.title} for ${clientName} is due tomorrow.`;

      // Add notification record
      notificationInserts.push({
        owner_id: job.owner_id,
        title,
        body,
        type: "due_reminder",
        job_id: job.id,
        is_read: false,
      });

      // Add push message if token exists
      if (profile?.push_token) {
        messages.push({
          to: profile.push_token,
          sound: "default",
          title,
          body,
          data: { job_id: job.id, type: "due_reminder" },
        });
      }
    }

    // Insert notification records into database
    if (notificationInserts.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notificationInserts);

      if (insertError) {
        console.error("Notification insert error:", insertError);
      }
    }

    // Send push notifications
    let totalSent = 0;
    if (messages.length > 0) {
      const chunks: object[][] = [];
      for (let i = 0; i < messages.length; i += 100) {
        chunks.push(messages.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          body: JSON.stringify(chunk),
        });

        if (response.ok) {
          totalSent += chunk.length;
        } else {
          console.error("Expo push error:", await response.text());
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Reminders sent",
        notifications_created: notificationInserts.length,
        push_sent: totalSent,
        total_jobs: jobs.length,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("send-due-reminders error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});