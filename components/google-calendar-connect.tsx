"use client";
import { useState, useEffect } from "react";
import { Calendar, X, Check, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isGoogleConnectedAsync, initiateGoogleAuth, handleGoogleCallback, disconnectGoogleCalendar, GoogleAccount } from "@/lib/google-calendar";
import { useAuth } from "@/lib/auth-context";

export default function GoogleCalendarConnect() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check connection status on mount and handle OAuth callback
  useEffect(() => {
    async function checkConnection() {
      if (!user) return;

      // Handle OAuth callback if present
      await handleGoogleCallback();

      // Check connection status
      const status = await isGoogleConnectedAsync();
      setAccounts(status.accounts);
      setLoading(false);

      // Show banner if not connected and not dismissed this session
      const key = `google_calendar_banner_dismissed_${user.id}`;
      const dismissed = sessionStorage.getItem(key) === "true";
      setShow(status.accounts.length === 0 && !dismissed);
    }

    checkConnection();
  }, [user]);

  const dismiss = () => {
    if (!user) return;
    const key = `google_calendar_banner_dismissed_${user.id}`;
    sessionStorage.setItem(key, "true");
    setShow(false);
    setError(null);
  };

  const handleConnect = () => {
    setError(null);
    const errorMsg = initiateGoogleAuth();
    if (errorMsg) {
      setError(errorMsg);
    }
  };

  const handleDisconnect = async (accountId?: string) => {
    const success = await disconnectGoogleCalendar(accountId);
    if (success) {
      const status = await isGoogleConnectedAsync();
      setAccounts(status.accounts);
      if (status.accounts.length === 0) setShow(true);
    }
  };

  // Connected state: show list of accounts + add another
  if (accounts.length > 0) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Check size={16} className="text-green-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                Google Calendar connected
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {accounts.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300"
                  >
                    {a.google_email}
                    {a.is_primary && <span className="text-[9px] opacity-70">(primary)</span>}
                    <button
                      onClick={() => handleDisconnect(a.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title={`Disconnect ${a.google_email}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={handleConnect}
            >
              <Plus size={14} className="mr-1" /> Add account
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-destructive h-8"
              onClick={() => handleDisconnect()}
            >
              Disconnect all
            </Button>
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 mt-2 text-sm text-destructive">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Show connect banner
  if (!show || loading) return null;

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar size={16} className="text-blue-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground truncate">
            Connect Google Calendar so Plan My Day schedules around your meetings. Add multiple accounts to aggregate them.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
            onClick={handleConnect}
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
      {error && (
        <div className="flex items-start gap-2 mt-2 text-sm text-destructive">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
