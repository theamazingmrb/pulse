"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/auth-guard";
import StreakBadge from "@/components/streak-badge";
import { getReflections, getStreaks, REFLECTION_LABELS, getPeriodLabel } from "@/lib/reflections";
import { Reflection, ReflectionStreak, ReflectionType } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type TabType = "all" | ReflectionType;

const TABS: { value: TabType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function ReflectionsPage() {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [streaks, setStreaks] = useState<ReflectionStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) loadData(user.id);
  }, [user]);

  async function loadData(userId: string) {
    const [refs, stks] = await Promise.all([
      getReflections(userId),
      getStreaks(userId),
    ]);
    setReflections(refs);
    setStreaks(stks);
    setLoading(false);
  }

  function getStreak(type: ReflectionType): ReflectionStreak {
    return (
      streaks.find((s) => s.type === type) ?? {
        user_id: "",
        type,
        current_streak: 0,
        longest_streak: 0,
        last_completed_period: null,
      }
    );
  }

  const filtered = reflections.filter((r) => {
    if (tab !== "all" && r.type !== tab) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    if (r.title?.toLowerCase().includes(q)) return true;
    return Object.values(r.sections).some((v) => v.toLowerCase().includes(q));
  });

  return (
    <AuthGuard>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Reflections</h1>
            <p className="text-muted-foreground text-sm">Track your growth. Build the habit.</p>
          </div>
          <Link href="/reflections/new">
            <Button>
              <Plus size={14} /> New Reflection
            </Button>
          </Link>
        </div>

        {/* Streak badges */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
          {(["daily", "weekly", "monthly"] as ReflectionType[]).map((t) => {
            const s = getStreak(t);
            return (
              <StreakBadge
                key={t}
                type={t}
                streak={s.current_streak}
                longest={s.longest_streak}
              />
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reflections..."
            className="w-full rounded-lg border border-border bg-secondary pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                tab === t.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌱</p>
            <p className="font-medium mb-1">
              {search ? "No reflections match your search." : "No reflections yet."}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {!search && "Start reflecting to build your streak."}
            </p>
            {!search && (
              <Link href="/reflections/new">
                <Button>
                  <Plus size={14} /> Start Reflecting
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((r) => (
              <ReflectionCard key={r.id} reflection={r} />
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

function ReflectionCard({ reflection: r }: { reflection: Reflection }) {
  const meta = REFLECTION_LABELS[r.type];
  const periodLabel = getPeriodLabel(r.type, r.period_start);

  // First non-empty section value as excerpt
  const excerpt = Object.values(r.sections).find((v) => v.trim());

  return (
    <Link href={`/reflections/${r.id}`}>
      <div className="rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors p-4 cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", meta.bg, meta.color)}>
              {meta.label}
            </span>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
            {r.mood && <span className="text-base">{r.mood}</span>}
          </div>
          {r.energy_level && (
            <div className="flex gap-0.5 flex-shrink-0">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    n <= r.energy_level! ? "bg-primary" : "bg-border"
                  )}
                />
              ))}
            </div>
          )}
        </div>
        {r.title && (
          <p className="font-medium text-sm mb-1">{r.title}</p>
        )}
        {excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
        )}
      </div>
    </Link>
  );
}
