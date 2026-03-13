"use client";
import AuthGuard from "@/components/auth-guard";
import CheckinFlow from "@/components/checkin-flow";

export default function CheckinPage() {
  return (
    <AuthGuard>
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Check-in</h1>
          <p className="text-muted-foreground text-sm">
            Pause. Recalibrate. What&apos;s your real priority right now?
          </p>
        </div>
        <CheckinFlow />
      </div>
    </AuthGuard>
  );
}
