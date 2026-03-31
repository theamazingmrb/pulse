"use client";
import { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isGoogleConnected, initiateGoogleAuth } from "@/lib/google-calendar";
import { useAuth } from "@/lib/auth-context";

export default function GoogleCalendarConnect() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    const key = `google_calendar_banner_dismissed_${user.id}`;
    const dismissed = sessionStorage.getItem(key) === "true";
    if (!dismissed && !isGoogleConnected()) {
      setShow(true);
    }
  }, [user]);

  const dismiss = () => {
    if (!user) return;
    const key = `google_calendar_banner_dismissed_${user.id}`;
    sessionStorage.setItem(key, "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 mb-6">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Calendar size={16} className="text-blue-500 flex-shrink-0" />
        <p className="text-sm text-muted-foreground truncate">
          Connect Google Calendar so Plan My Day schedules around your meetings.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
          onClick={initiateGoogleAuth}
        >
          Connect Calendar
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
