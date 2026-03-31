"use client";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth-guard";
import CheckinFlow from "@/components/checkin-flow";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

function formatLastCheckin(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) return "Less than an hour ago";
  if (diffHours < 24) {
    const h = Math.floor(diffHours);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (diffDays < 2) return "Yesterday";
  if (diffDays < 7) {
    const d = Math.floor(diffDays);
    return `${d} days ago`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function CheckinPageContent() {
  const { user } = useAuth();
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("checkins")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setLastCheckin(data.created_at);
      });
  }, [user]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Check-in</h1>
        <p className="text-muted-foreground text-sm">
          Pause. Recalibrate. What&apos;s your real priority right now?
        </p>
        {lastCheckin && (
          <p className="text-muted-foreground text-xs mt-1">
            Last checked in: {formatLastCheckin(lastCheckin)}
          </p>
        )}
      </div>
      <CheckinFlow />
    </div>
  );
}

export default function CheckinPage() {
  return (
    <AuthGuard>
      <CheckinPageContent />
    </AuthGuard>
  );
}
