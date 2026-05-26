import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = process.env.AI_API_URL;

async function callAI(system: string, user: string) {
  const key = process.env.AI_API_KEY;
  if (!GATEWAY || !key) throw new Error("AI not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (res.status === 429) throw new Error("Rate limit — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export const aiProjectAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      projectId: z.string().uuid(),
      action: z.enum(["summarize", "blockers", "standup", "breakdown", "review"]),
      input: z.string().max(5000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.action === "breakdown") {
      const out = await callAI(
        "You break product features into 6 atomic developer subtasks. Return a numbered markdown list, each task one line.",
        `Feature: ${data.input ?? ""}`,
      );
      return { result: out };
    }
    if (data.action === "review") {
      const out = await callAI(
        "You are a senior code reviewer. Review the snippet for bugs, performance, readability, and security. End with: Quality Score: X/10",
        data.input ?? "",
      );
      return { result: out };
    }
    const { data: tasks } = await supabase
      .from("tasks").select("title,status,priority,assignee_id,due_date,updated_at")
      .eq("project_id", data.projectId).limit(200);
    const ctx = JSON.stringify(tasks ?? []);
    let sys = "", user = "";
    if (data.action === "summarize") {
      sys = "You summarize project progress concisely in 4-5 sentences.";
      user = `Tasks:\n${ctx}`;
    } else if (data.action === "blockers") {
      sys = "Identify tasks stuck in In Progress for >2 days or with no assignee. Return a short markdown list with reasons.";
      user = `Tasks (with updated_at):\n${ctx}\nNow: ${new Date().toISOString()}`;
    } else {
      sys = "Generate a daily standup report based on task data. Use sections: Yesterday, Today, Blockers.";
      user = `Tasks:\n${ctx}`;
    }
    return { result: await callAI(sys, user) };
  });
