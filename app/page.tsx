"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="text-2xl mb-3">{emoji}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <div className="flex items-center justify-center min-h-[60vh]" />;
  }

  return (
    <div className="px-6 md:px-10 max-w-4xl">
      {/* Hero */}
      <div className="py-16 md:py-24">
        <div className="flex items-center gap-2 mb-6">
          <Compass size={26} className="text-primary" />
          <span className="text-primary font-bold tracking-tight">Priority</span>
          <span className="font-bold tracking-tight">Compass</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
          Focus on what<br />
          <span className="text-primary">actually matters.</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-10 max-w-md leading-relaxed">
          A calm, intentional productivity system. Set your daily priority, manage tasks, and reflect — without the noise.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link href="/signup">
            <Button size="lg">Get started free</Button>
          </Link>
          <Link href="/signin">
            <Button variant="outline" size="lg">Sign in</Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-20">
        <FeatureCard
          emoji="🎯"
          title="Daily Check-ins"
          description="Set your top priority in 60 seconds. Morning, midday, evening — recalibrate throughout the day and never lose focus."
        />
        <FeatureCard
          emoji="⚡"
          title="Priority-first Tasks"
          description="Four priority levels: Hot, Warm, Cool, Backlog. Auto-schedule or place manually. Lock what can't move."
        />
        <FeatureCard
          emoji="📖"
          title="Contextual Journaling"
          description="Write freely. Attach the song you're listening to. Link entries to your tasks and capture the full picture of your day."
        />
      </div>
    </div>
  );
}
