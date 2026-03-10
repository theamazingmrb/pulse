import Link from "next/link";
import Image from "next/image";
import { Journal } from "@/types";
import { cn, formatDate, formatTime, SESSION_EMOJI, PROJECT_COLORS } from "@/lib/utils";
import { Music, Link2 } from "lucide-react";

export default function JournalCard({ journal }: { journal: Journal }) {
  return (
    <Link href={`/journal/${journal.id}`}>
      <div className="group rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-all">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{SESSION_EMOJI[journal.session_label]}</span>
              <span className="text-xs text-muted-foreground capitalize">{journal.session_label}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{formatDate(journal.date)}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{formatTime(journal.created_at)}</span>
            </div>
            {journal.title && (
              <h3 className="font-semibold text-sm">{journal.title}</h3>
            )}
          </div>
          {journal.mood && (
            <span className="text-xl flex-shrink-0">{journal.mood}</span>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{journal.content}</p>

        <div className="flex items-center gap-3 flex-wrap">
          {journal.spotify_track_name && (
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
              {journal.spotify_album_art && (
                <Image src={journal.spotify_album_art} alt="" width={16} height={16} className="rounded" />
              )}
              <Music size={11} />
              <span className="truncate max-w-[140px]">{journal.spotify_track_name}</span>
            </div>
          )}
          {journal.tasks && journal.tasks.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 size={11} />
              {journal.tasks.slice(0, 2).map((t) => (
                <span key={t.id} className={cn("px-2 py-0.5 rounded-full border text-xs", PROJECT_COLORS[t.project ?? ""] ?? "bg-secondary border-border")}>
                  {t.title}
                </span>
              ))}
              {journal.tasks.length > 2 && (
                <span className="text-muted-foreground">+{journal.tasks.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
