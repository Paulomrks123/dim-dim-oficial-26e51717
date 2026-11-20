import { describe, expect, it } from "vitest";
import { handleRecurringJob } from "@/routes/api/public/jobs/recurring-expenses";

describe("Lançamento diário das recorrentes", () => {
  it("recusa o disparo sem a credencial do agendamento", async () => {
    process.env["LOVABLE_CRON_SECRET"] = "test-cron-secret";
    const response = await handleRecurringJob(new Request("http://localhost/api/public/jobs/recurring-expenses", { method: "POST" }));
    expect(response.status).toBe(401);
  });
  it("recusa a credencial errada", async () => {
    process.env["LOVABLE_CRON_SECRET"] = "test-cron-secret";
    const response = await handleRecurringJob(
      new Request("http://localhost/api/public/jobs/recurring-expenses", { method: "POST", headers: { Authorization: "Bearer wrong-secret" } }),
    );
    expect(response.status).toBe(401);
  });
});
