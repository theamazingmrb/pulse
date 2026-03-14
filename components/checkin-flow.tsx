"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getTimeOfDay, getGreeting } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, RefreshCw, CheckSquare, Map, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Task, WarMapItem, WarMapCategory } from "@/types";
import { getTasks, PRIORITY_CONFIG } from "@/lib/tasks";
import { getAllWarMapItems, linkTaskToWarMapItem } from "@/lib/warmap";
import { cn } from "@/lib/utils";

type Step = "start" | "priority" | "warmap" | "context" | "energy" | "done";

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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedWarMapItemId, setSelectedWarMapItemId] = useState<string | null>(null);
  const [others, setOthers] = useState(["", ""]);
  const [context, setContext] = useState("");
  const [energy, setEnergy] = useState(3);
  const [saving, setSaving] = useState(false);

  // Data for pickers
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [warmapItems, setWarmapItems] = useState<(WarMapItem & { category: WarMapCategory })[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [tasks, wm] = await Promise.all([
      getTasks(user.id),
      getAllWarMapItems(user.id),
    ]);
    setActiveTasks(tasks.filter((t) => t.status === "active"));
    setWarmapItems(wm);
  }

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

    // Link task to warmap item if both selected
    if (!error && selectedTaskId && selectedWarMapItemId) {
      await linkTaskToWarMapItem(selectedTaskId, selectedWarMapItemId);
    }

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

  function selectTask(task: Task) {
    setSelectedTaskId(task.id);
    setTopPriority(task.title);
    setShowTaskPicker(false);
  }

  function clearTaskSelection() {
    setSelectedTaskId(null);
    setTopPriority("");
  }

  const goToNext = () => {
    if (warmapItems.length > 0) {
      setStep("warmap");
    } else {
      setStep("context");
    }
  };

  const selectedTask = activeTasks.find((t) => t.id === selectedTaskId);
  const selectedWarmapItem = warmapItems.find((i) => i.id === selectedWarMapItemId);

  function reset() {
    setStep("start");
    setTopPriority("");
    setSelectedTaskId(null);
    setSelectedWarMapItemId(null);
    setOthers(["", ""]);
    setContext("");
    setEnergy(3);
  }

  const totalSteps = warmapItems.length > 0 ? 4 : 3;

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
            <StepHeader num={1} total={totalSteps} label={prompts.headline} />
            <p className="text-lg font-medium mb-4">{prompts.priorityQ}</p>

            {/* Selected task chip */}
            {selectedTask ? (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-primary/40 bg-primary/5">
                <CheckSquare size={14} className="text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedTask.title}</p>
                  {selectedTask.project && (
                    <p className="text-xs text-muted-foreground truncate">{selectedTask.project.name}</p>
                  )}
                </div>
                <button onClick={clearTaskSelection} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <textarea
                autoFocus
                value={topPriority}
                onChange={(e) => setTopPriority(e.target.value)}
                placeholder="Be specific — what exactly will you do?"
                rows={2}
                className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none mb-3"
              />
            )}

            {/* Task picker toggle */}
            {activeTasks.length > 0 && !selectedTask && (
              <div className="mb-4">
                <button
                  onClick={() => setShowTaskPicker(!showTaskPicker)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <CheckSquare size={12} />
                  {showTaskPicker ? "Hide tasks" : `Or pick from your ${activeTasks.length} active task${activeTasks.length === 1 ? "" : "s"}`}
                </button>

                {showTaskPicker && (
                  <div className="mt-2 border border-border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                    {activeTasks.map((task) => {
                      const pc = PRIORITY_CONFIG[task.priority_level as keyof typeof PRIORITY_CONFIG];
                      return (
                        <button
                          key={task.id}
                          onClick={() => selectTask(task)}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-secondary transition-colors border-b border-border/50 last:border-0"
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: pc?.color }}
                          />
                          <span className="text-sm truncate flex-1">{task.title}</span>
                          {task.project && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0"
                              style={{
                                backgroundColor: `${task.project.color}20`,
                                borderColor: task.project.color,
                                color: task.project.color,
                              }}
                            >
                              {task.project.name}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
              <Button onClick={goToNext} disabled={!topPriority.trim()}>
                Next <ArrowRight size={15} />
              </Button>
            </div>
          </Slide>
        )}

        {step === "warmap" && (
          <Slide key="warmap">
            <StepHeader num={2} total={totalSteps} label={prompts.headline} />
            <div className="flex items-center gap-2 mb-2">
              <Map size={16} className="text-primary" />
              <p className="text-lg font-medium">Link to your WarMap?</p>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Which goal does <span className="text-foreground font-medium">&ldquo;{topPriority}&rdquo;</span> serve?
            </p>

            <div className="flex flex-col gap-2 mb-6">
              {/* Group items by category */}
              {Object.entries(
                warmapItems.reduce((acc, item) => {
                  const key = item.category.id;
                  if (!acc[key]) acc[key] = { category: item.category, items: [] };
                  acc[key].items.push(item);
                  return acc;
                }, {} as Record<string, { category: WarMapCategory; items: typeof warmapItems }>)
              ).map(([, { category, items }]) => (
                <div key={category.id}>
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.icon} {category.name}
                  </p>
                  <div className="flex flex-col gap-1 pl-3">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedWarMapItemId(selectedWarMapItemId === item.id ? null : item.id)}
                        className={cn(
                          "flex items-center gap-2 text-sm px-3 py-2 rounded-lg border text-left transition-colors",
                          selectedWarMapItemId === item.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("priority")}>← Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setSelectedWarMapItemId(null); setStep("context"); }}>
                  Skip
                </Button>
                <Button onClick={() => setStep("context")}>
                  {selectedWarmapItem ? "Linked ✓" : "Next"} <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          </Slide>
        )}

        {step === "context" && (
          <Slide key="context">
            <StepHeader num={warmapItems.length > 0 ? 3 : 2} total={totalSteps} label={prompts.headline} />
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
              <Button variant="ghost" onClick={() => setStep(warmapItems.length > 0 ? "warmap" : "priority")}>← Back</Button>
              <Button onClick={() => setStep("energy")}>Next <ArrowRight size={15} /></Button>
            </div>
          </Slide>
        )}

        {step === "energy" && (
          <Slide key="energy">
            <StepHeader num={totalSteps} total={totalSteps} label={prompts.headline} />
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
              <p className="text-lg font-medium text-primary mb-2">{topPriority}</p>
              {selectedWarmapItem && (
                <p className="text-xs text-muted-foreground mb-6 flex items-center gap-1 justify-center">
                  <Map size={11} />
                  Linked to <span className="font-medium">{selectedWarmapItem.title}</span>
                </p>
              )}
              <div className="flex gap-3 justify-center mt-6">
                <Button onClick={() => router.push("/journal/new")} variant="outline">
                  Write a journal entry
                </Button>
                <Button onClick={reset}>
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
