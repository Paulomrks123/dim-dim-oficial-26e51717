import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Chamado pelo agendamento diário: lança as despesas mensais vencidas de todas as contas.
export async function handleRecurringJob(request: Request): Promise<Response> {
  const authFailure = await authenticateCronRequest(request);
  if (authFailure) return authFailure;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("generate_recurring_expenses", {});
  if (error) {
    console.error("[recurring-expenses]", error.message);
    return Response.json({ success: false, error: "generation_failed" }, { status: 500 });
  }
  return Response.json({ success: true, inserted: Number(data ?? 0) });
}

export const Route = createFileRoute("/api/public/jobs/recurring-expenses")({
  server: {
    handlers: {
      POST: async ({ request }) => handleRecurringJob(request),
    },
  },
});
