import { storage } from "./storage";
import { SMSService } from "./services/sms";

const HOUR_MS = 60 * 60 * 1000;

function clampDueDay(value: unknown, fallback = 5): number {
  const n = typeof value === "string" ? parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 28) return fallback;
  return n;
}

function clampDaysBefore(value: unknown, fallback = 3): number {
  const n = typeof value === "string" ? parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 30) return fallback;
  return n;
}

function formatMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

async function processReminders(): Promise<void> {
  try {
    const enabledSetting = await storage.getSetting("send_payment_reminders");
    if (enabledSetting && enabledSetting.value === "false") {
      return;
    }

    const dueDaySetting = await storage.getSetting("payment_due_day");
    const dueDay = clampDueDay(dueDaySetting?.value);

    const daysBeforeSetting = await storage.getSetting("reminder_days_before");
    const daysBefore = clampDaysBefore(daysBeforeSetting?.value);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = today.getFullYear();
    const monthIdx = today.getMonth();
    const monthStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    const dueDate = new Date(year, monthIdx, dueDay);
    dueDate.setHours(0, 0, 0, 0);

    const daysUntilDue = Math.round(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Only act when today is within the reminder window AND we haven't passed the due date.
    if (daysUntilDue < 0 || daysUntilDue > daysBefore) {
      return;
    }

    const tenants = await storage.getAllTenants();

    for (const tenant of tenants) {
      try {
        // Skip tenants with no move-in date or whose move-in is in the future
        if (!tenant.moveInDate) continue;
        const moveIn = new Date(tenant.moveInDate + "T00:00:00");
        if (moveIn > today) continue;

        // If they moved in this month AFTER the due day, current month is skipped (no bill)
        if (
          moveIn.getFullYear() === year &&
          moveIn.getMonth() === monthIdx &&
          moveIn.getDate() > dueDay
        ) {
          continue;
        }

        // Skip if already paid (verified) or pending review for this month
        const payments = await storage.getPaymentsByTenantId(tenant.id);
        const thisMonthPayment = payments.find(
          (p) =>
            p.month === monthStr &&
            (p.status === "verified" || p.status === "pending"),
        );
        if (thisMonthPayment) continue;

        // De-dup: only send one "before_due" reminder per tenant per month
        const alreadySent = await storage.hasReminderBeenSent(
          tenant.id,
          monthStr,
          "before_due",
        );
        if (alreadySent) continue;

        if (!tenant.contact) continue;

        const result = await SMSService.notifyPaymentDueSoon(
          tenant.contact,
          tenant.fullName,
          formatMonthLabel(monthStr),
          tenant.rentAmount,
          daysUntilDue,
        );

        if (result?.success === false) {
          console.error(
            `[scheduler] SMS failed for tenant ${tenant.id}:`,
            result.error,
          );
          continue;
        }

        await storage.logReminderSent(tenant.id, monthStr, "before_due");
        console.log(
          `[scheduler] Sent before-due reminder to ${tenant.fullName} for ${monthStr}`,
        );
      } catch (innerErr) {
        console.error(
          `[scheduler] Error processing tenant ${tenant.id}:`,
          innerErr,
        );
      }
    }
  } catch (err) {
    console.error("[scheduler] Reminder job failed:", err);
  }
}

let timer: NodeJS.Timeout | null = null;

export function startReminderScheduler(): void {
  if (timer) return;
  // Initial run shortly after startup, then every hour
  setTimeout(() => {
    processReminders();
  }, 30 * 1000);
  timer = setInterval(processReminders, HOUR_MS);
  console.log("✓ Reminder scheduler started (runs hourly)");
}

// Exported so we can trigger a manual run from an admin endpoint
export async function runReminderJobNow(): Promise<void> {
  await processReminders();
}
