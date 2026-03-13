"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const FEATURES = [
  {
    emoji: "🎯",
    title: "Daily Check-ins",
    description: "Set your top priority in 60 seconds. Recalibrate morning, midday, and evening.",
  },
  {
    emoji: "⚡",
    title: "Priority Tasks",
    description: "Hot, Warm, Cool, Backlog. Auto-schedule or place manually. Lock what can't move.",
  },
  {
    emoji: "📖",
    title: "Contextual Journal",
    description: "Write freely. Attach the song you're listening to and link entries to tasks.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="flex flex-col items-center min-h-screen px-6">
      {/* Hero */}
      <div className="flex flex-col items-center text-center max-w-2xl pt-24 pb-16">
        <div className="flex items-center gap-2 mb-10">
          <Activity size={20} className="text-primary" />
          <span className="font-bold tracking-tight">Pulse</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-5">
          Focus on what<br />
          <span className="text-primary">actually matters.</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-sm leading-relaxed mb-10">
          Daily check-ins, priority tasks, and journaling — all in one calm, intentional space.
        </p>
        <div className="flex gap-3">
          <Link href="/signup">
            <Button size="lg">Get started free</Button>
          </Link>
          <Link href="/signin">
            <Button variant="outline" size="lg">Sign in</Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl pb-20">
        {FEATURES.map(({ emoji, title, description }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-6">
            <div className="text-2xl mb-3">{emoji}</div>
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
