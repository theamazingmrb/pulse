"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/auth-guard";
import {
  REFLECTION_PROMPTS,
  REFLECTION_LABELS,
  getPeriodStart,
  getPeriodLabel,
  getReflectionForPeriod,
  getReflectionById,
  saveReflection,
} from "@/lib/reflections";
import { ReflectionType } from "@/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MOODS = ["😊", "😤", "😰", "🤔", "🔥", "😴", "💡", "😌", "🙏", "💪"];

const TYPE_OPTIONS: { value: ReflectionType; emoji: string; desc: string }[] = [
  { value: "daily", emoji: "🌅", desc: "Today's check-in" },
  { value: "weekly", emoji: "📅", desc: "This week's review" },
  { value: "monthly", emoji: "🗓️", desc: "This month's deep dive" },
];

export default function NewReflectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const initialType = (searchParams.get("type") as ReflectionType) ?? "daily";
  const editId = searchParams.get("edit");

  const [type, setType] = useState<ReflectionType>(initialType);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const periodStart = getPeriodStart(type);
  const periodLabel = getPeriodLabel(type, periodStart);

  const loadExisting = useCallback(async (userId: string, t: ReflectionType, ps: string) => {
    setLoadingExisting(true);
    const existing = await getReflectionForPeriod(userId, t, ps);
    if (existing) {
      setSections(existing.sections ?? {});
      setMood(existing.mood ?? "");
      setEnergy(existing.energy_level ?? null);
      setExistingId(existing.id);
    } else {
      setSections({});
      setMood("");
      setEnergy(null);
      setExistingId(null);
    }
    setLoadingExisting(false);
  }, []);

  // Load by edit ID on initial mount
  useEffect(() => {
    if (!user || !editId) return;
    (async () => {
      setLoadingExisting(true);
      const reflection = await getReflectionById(editId);
      if (reflection) {
        setType(reflection.type);
        setSections(reflection.sections ?? {});
        setMood(reflection.mood ?? "");
        setEnergy(reflection.energy_level ?? null);
        setExistingId(reflection.id);
      }
      setLoadingExisting(false);
    })();
  }, [user, editId]);

  // When type changes (and not in edit mode), check if period already has a reflection
  useEffect(() => {
    if (!user || editId) return;
    loadExisting(user.id, type, getPeriodStart(type));
  }, [user, type, editId, loadExisting]);

  function setSection(key: string, value: string) {
    setSections((prev) => ({ ...prev, [key]: value }));
  }

  const prompts = REFLECTION_PROMPTS[type];
  const meta = REFLECTION_LABELS[type];

  const hasContent = prompts.some((p) => (sections[p.key] ?? "").trim().length > 0);

  async function save() {
    if (!user) return;
    if (!hasContent) { toast.error("Write something in at least one section."); return; }
    setSaving(true);
    const result = await saveReflection(
      user.id,
      type,
      periodStart,
      sections,
      mood || null,
      energy
    );
    if (!result) {
      toast.error("Failed to save reflection.");
      setSaving(false);
      return;
    }
    toast.success("Reflection saved ✓");
    router.push(`/reflections/${result.id}`);
  }

  return (
    <AuthGuard>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">
            {existingId ? "Edit Reflection" : "New Reflection"}
          </h1>
          <p className="text-muted-foreground text-sm">Honest reflection builds real progress.</p>
        </div>

        {/* Type selector */}
        {!editId && (
          <div className="flex gap-3 mb-6">
            {TYPE_OPTIONS.map((opt) => {
              const m = REFLECTION_LABELS[opt.value];
              return (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                    type === opt.value
                      ? `${m.bg} ${m.color} border-current`
                      : "border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span>{m.label}</span>
                  <span className="text-[10px] font-normal opacity-70">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Period label */}
        <div className="flex items-center gap-2 mb-6">
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", meta.bg, meta.color)}>
            {meta.label}
          </span>
          <span className="text-sm text-muted-foreground">{periodLabel}</span>
          {existingId && (
            <span className="text-xs text-muted-foreground ml-1">(editing existing)</span>
          )}
        </div>

        {loadingExisting ? (
          <p className="text-sm text-muted-foreground mb-6">Loading...</p>
        ) : (
          <>
            {/* Mood + Energy row */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Mood</p>
                <div className="flex gap-1.5 flex-wrap">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(mood === m ? "" : m)}
                      className={cn(
                        "text-xl rounded-lg p-1.5 transition-all",
                        mood === m ? "bg-primary/20 scale-110" : "hover:bg-secondary"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Energy</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEnergy(energy === n ? null : n)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-sm font-medium transition-all border",
                        energy !== null && n <= energy
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Structured sections */}
            <div className="flex flex-col gap-5 mb-8">
              {prompts.map((prompt) => (
                <div key={prompt.key}>
                  <label className="block text-sm font-semibold mb-2">{prompt.label}</label>
                  <textarea
                    value={sections[prompt.key] ?? ""}
                    onChange={(e) => setSection(prompt.key, e.target.value)}
                    placeholder={prompt.placeholder}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3">
          <Button onClick={save} disabled={saving || !hasContent || loadingExisting}>
            {saving ? "Saving..." : existingId ? "Update Reflection" : "Save Reflection"}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </AuthGuard>
  );
}
