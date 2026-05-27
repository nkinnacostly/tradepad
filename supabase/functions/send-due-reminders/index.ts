import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    // Get tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

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
      .gte("due_date", tomorrowStart.toISOString().split("T")[0])
      .lte("due_date", tomorrowEnd.toISOString().split("T")[0])
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
      .in("id", ownerIds)
      .not("push_token", "is", null);

    if (profilesError) {
      console.error("Profiles query error:", profilesError);
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 500,
      });
    }

    const tokenMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.push_token]),
    );

    // Build notification messages
    const messages: object[] = [];

    for (const job of jobs) {
      const token = tokenMap.get(job.owner_id);
      if (!token) continue;

      const clientName =
        (job.clients as { full_name: string } | null)?.full_name ??
        "A client";

      messages.push({
        to: token,
        sound: "default",
        title: "Job Due Tomorrow 📅",
        body: `${job.title} for ${clientName} is due tomorrow.`,
        data: { job_id: job.id },
      });
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ message: "No tokens found", sent: 0 }),
        { status: 200 },
      );
    }

    // Send via Expo Push API (batch up to 100)
    const chunks: object[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    let totalSent = 0;
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

    return new Response(
      JSON.stringify({
        message: "Reminders sent",
        sent: totalSent,
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