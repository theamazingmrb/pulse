"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getTimeOfDay, getGreeting } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Step = "start" | "priority" | "context" | "energy" | "done";

const TOD_PROMPTS = {
  morning: {
    headline: "Morning check-in",
    priorityQ: "What's the single most important thing you'll do today?",
    othersQ: "What 2 other things matter today?",
    contextQ: "Anything that might get in the way?",
  },
  midday: {
    headline: "Midday recalibrate",
    priorityQ: "What's your top priority right now — this afternoon?",
    othersQ: "Anything else on deck for today?",
    contextQ: "What's shifted since this morning?",
  },
  evening: {
    headline: "Evening wind-down",
    priorityQ: "What's the one thing you want to make sure gets done or decided tonight?",
    othersQ: "What's carrying over to tomorrow?",
    contextQ: "How are you feeling about today overall?",
  },
};

export default function CheckinFlow({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const tod = getTimeOfDay();
  const prompts = TOD_PROMPTS[tod];

  const [step, setStep] = useState<Step>("start");
  const [topPriority, setTopPriority] = useState("");
  const [others, setOthers] = useState(["", ""]);
  const [context, setContext] = useState("");
  const [energy, setEnergy] = useState(3);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!topPriority.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("checkins").insert({
      user_id: user.id,
      time_of_day: tod,
      top_priority: topPriority.trim(),
      other_priorities: others.filter(Boolean),
      context: context.trim() || null,
      energy_level: energy,
    });
    setSaving(false);
    if (error) { 
      console.error("Check-in error:", error);
      toast.error("Failed to save check-in"); 
      return; 
    }
    toast.success("Check-in saved 🎯");
    setStep("done");
    onComplete?.();
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {step === "start" && (
          <Slide key="start">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">{tod === "morning" ? "🌅" : tod === "midday" ? "☀️" : "🌙"}</div>
              <h2 className="text-2xl font-bold mb-2">{getGreeting()}.</h2>
              <p className="text-muted-foreground mb-8">{prompts.headline} — takes 60 seconds.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setStep("priority")} size="lg">
                  Let&apos;s go <ArrowRight size={16} />
                </Button>
                <Button variant="outline" size="lg" onClick={() => setStep("priority")}>
                  <RefreshCw size={16} /> Recalibrate
                </Button>
              </div>
            </div>
          </Slide>
        )}

        {step === "priority" && (
          <Slide key="priority">
            <StepHeader num={1} total={3} label={prompts.headline} />
            <p className="text-lg font-medium mb-6">{prompts.priorityQ}</p>
            <textarea
              autoFocus
              value={topPriority}
              onChange={(e) => setTopPriority(e.target.value)}
              placeholder="Be specific — what exactly will you do?"
              rows={2}
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none mb-6"
            />
            <p className="text-sm text-muted-foreground mb-3">{prompts.othersQ}</p>
            {[0, 1].map((i) => (
              <input
                key={i}
                value={others[i]}
                onChange={(e) => { const n = [...others]; n[i] = e.target.value; setOthers(n); }}
                placeholder={`Priority ${i + 2} (optional)`}
                className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary placeholder:text-muted-foreground mb-2"
              />
            ))}
            <div className="flex justify-end mt-4">
              <Button onClick={() => setStep("context")} disabled={!topPriority.trim()}>
                Next <ArrowRight size={15} />
              </Button>
            </div>
          </Slide>
        )}

        {step === "context" && (
          <Slide key="context">
            <StepHeader num={2} total={3} label={prompts.headline} />
            <p className="text-lg font-medium mb-6">{prompts.contextQ}</p>
            <textarea
              autoFocus
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Optional — what's on your mind?"
              rows={3}
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none mb-6"
            />
            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={() => setStep("priority")}>← Back</Button>
              <Button onClick={() => setStep("energy")}>Next <ArrowRight size={15} /></Button>
            </div>
          </Slide>
        )}

        {step === "energy" && (
          <Slide key="energy">
            <StepHeader num={3} total={3} label={prompts.headline} />
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-yellow-400" />
              <p className="text-lg font-medium">Energy level right now?</p>
            </div>
            <div className="flex gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setEnergy(n)}
                  className={`flex-1 py-4 rounded-lg border text-lg font-bold transition-all ${
                    energy === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mb-6">1 = exhausted · 5 = fully charged</p>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("context")}>← Back</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save check-in ✓"}
              </Button>
            </div>
          </Slide>
        )}

        {step === "done" && (
          <Slide key="done">
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold mb-2">Locked in.</h2>
              <p className="text-muted-foreground mb-2">Top priority:</p>
              <p className="text-lg font-medium text-primary mb-8">{topPriority}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => router.push("/journal/new")} variant="outline">
                  Write a journal entry
                </Button>
                <Button onClick={() => { setStep("start"); setTopPriority(""); setOthers(["",""]); setContext(""); setEnergy(3); }}>
                  <RefreshCw size={14} /> Check in again
                </Button>
              </div>
            </div>
          </Slide>
        )}
      </AnimatePresence>
    </div>
  );
}

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function StepHeader({ num, total, label }: { num: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1 ml-auto">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1 w-8 rounded-full ${i < num ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
    </div>
  );
}
