"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import JournalCard from "@/components/journal-card";
import { Plus } from "lucide-react";
import { Journal } from "@/types";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import AuthGuard from "@/components/auth-guard";

export default function JournalPage() {
  const { user } = useAuth();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadJournals();
    }
  }, [user]);

  async function loadJournals() {
    const { data } = await supabase
      .from("journals")
      .select("*, journal_tasks(tasks(id, title, status, project_id))")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    const shaped = (data ?? []).map((j: any) => ({
      ...j,
      tasks: j.journal_tasks?.map((jt: any) => jt.tasks) ?? [],
    })) as Journal[];
    setJournals(shaped);
    setLoading(false);
  }

  const byDate = journals.reduce((acc: Record<string, Journal[]>, j: Journal) => {
    if (!acc[j.date]) acc[j.date] = [];
    acc[j.date].push(j);
    return acc;
  }, {});

  return (
    <AuthGuard>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Journal</h1>
            <p className="text-muted-foreground text-sm">Your log — by day, by session, by feeling.</p>
          </div>
          <Link href="/journal/new">
            <Button><Plus size={15} /> New Entry</Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        ) : Object.keys(byDate).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground mb-4">No journal entries yet.</p>
            <Link href="/journal/new">
              <Button><Plus size={14} /> Write your first entry</Button>
            </Link>
          </div>
        ) : (
          Object.entries(byDate).map(([date, entries]) => (
            <div key={date} className="mb-8">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">{formatDate(date)}</h2>
              <div className="flex flex-col gap-3">
                {entries.map((j) => <JournalCard key={j.id} journal={j} />)}
              </div>
            </div>
          ))
        )}
      </div>
    </AuthGuard>
  );
}
