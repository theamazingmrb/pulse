import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatTime, SESSION_EMOJI, PROJECT_COLORS, STATUS_COLORS, cn } from "@/lib/utils";
import { Music, ExternalLink, ArrowLeft, Link2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: journal } = await supabase
    .from("journals")
    .select("*, journal_tasks(tasks(id, title, status, project_id))")
    .eq("id", id)
    .single();

  if (!journal) notFound();

  const tasks = journal.journal_tasks?.map((jt: { tasks: unknown }) => jt.tasks) ?? [];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/journal">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground">
            <ArrowLeft size={14} /> All entries
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span>{SESSION_EMOJI[journal.session_label as keyof typeof SESSION_EMOJI]}</span>
              <span className="text-sm text-muted-foreground capitalize">{journal.session_label}</span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">{formatDate(journal.date)}</span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">{formatTime(journal.created_at)}</span>
            </div>
            {journal.title && <h1 className="text-2xl font-bold">{journal.title}</h1>}
          </div>
          {journal.mood && <span className="text-3xl">{journal.mood}</span>}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border bg-card p-6 mb-5">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{journal.content}</p>
      </div>

      {/* Spotify track */}
      {journal.spotify_track_name && (
        <Card className="mb-5">
          <CardContent>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Music size={11} /> Song
            </p>
            <div className="flex items-center gap-3">
              {journal.spotify_album_art && (
                <Image src={journal.spotify_album_art} alt={journal.spotify_track_name} width={56} height={56} className="rounded" />
              )}
              <div className="flex-1">
                <p className="font-medium">{journal.spotify_track_name}</p>
                <p className="text-sm text-muted-foreground">{journal.spotify_artist}</p>
              </div>
              {journal.spotify_url && (
                <a href={journal.spotify_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink size={13} /> Open in Spotify
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked tasks */}
      {tasks.length > 0 && (
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Link2 size={11} /> Linked Tasks
            </p>
            <div className="flex flex-col gap-2">
              {tasks.map((t: { id: string; title: string; status: string; project: string | null }) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm">
                  <span className="flex-1 font-medium truncate">{t.title}</span>
                  {t.project && (
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border", PROJECT_COLORS[t.project] ?? "bg-secondary border-border text-muted-foreground")}>
                      {t.project}
                    </span>
                  )}
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border capitalize", STATUS_COLORS[t.status])}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
