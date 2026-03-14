"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getPendingReminder, PendingReminder } from "@/lib/reflections";

export default function ReflectionReminderBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [reminder, setReminder] = useState<PendingReminder | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadReminder(user.id);
  }, [user]);

  async function loadReminder(userId: string) {
    const pending = await getPendingReminder(userId);
    if (!pending) { setChecked(true); return; }

    // Check sessionStorage dismissal
    const key = `reflection_reminder_dismissed_${pending.type}_${pending.periodStart}_${userId}`;
    if (sessionStorage.getItem(key) === "true") {
      setChecked(true);
      return;
    }

    setReminder(pending);
    setChecked(true);
  }

  const dismiss = () => {
    if (!user || !reminder) return;
    const key = `reflection_reminder_dismissed_${reminder.type}_${reminder.periodStart}_${user.id}`;
    sessionStorage.setItem(key, "true");
    setReminder(null);
  };

  const handleReflect = () => {
    if (!reminder) return;
    dismiss();
    router.push(`/reflections/new?type=${reminder.type}`);
  };

  // Don't render until we've checked (avoid flash)
  if (!checked || !reminder) return null;

  const typeEmoji =
    reminder.type === "monthly" ? "🗓️" : reminder.type === "weekly" ? "📅" : reminder.isEvening ? "🌙" : "🌅";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-6">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Star size={15} className="text-primary flex-shrink-0" />
        <span className="text-sm text-muted-foreground truncate">
          {typeEmoji} {reminder.message}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button size="sm" className="h-8 text-xs" onClick={handleReflect}>
          Reflect Now
        </Button>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
