"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import SpotifyPicker from "@/components/spotify-picker";
import TaskSelector from "@/components/task-selector";
import { SpotifyTrack, Task, SessionLabel, PROJECT_OPTIONS } from "@/types";
import { getSessionLabel, todayISO } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import AuthGuard from "@/components/auth-guard";

const SESSION_OPTIONS: { value: SessionLabel; label: string }[] = [
  { value: "morning", label: "🌅 Morning" },
  { value: "afternoon", label: "☀️ Afternoon" },
  { value: "evening", label: "🌙 Evening" },
  { value: "general", label: "📝 General" },
];

const MOODS = ["😊", "😤", "😰", "🤔", "🔥", "😴", "💡", "😌", "🙏", "💪"];

export default function NewJournalPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [session, setSession] = useState<SessionLabel>(getSessionLabel());
  const [mood, setMood] = useState("");
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showTasks, setShowTasks] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("tasks").select("*").neq("status", "done").order("created_at", { ascending: false })
      .then(({ data }) => setTasks(data ?? []));
  }, []);

  async function save() {
    if (!content.trim()) { toast.error("Write something first!"); return; }
    setSaving(true);
    const { data: journal, error } = await supabase
      .from("journals")
      .insert({
        date: todayISO(),
        session_label: session,
        title: title.trim() || null,
        content: content.trim(),
        mood: mood || null,
        spotify_track_id: track?.id ?? null,
        spotify_track_name: track?.name ?? null,
        spotify_artist: track?.artist ?? null,
        spotify_album_art: track?.album_art ?? null,
        spotify_preview_url: track?.preview_url ?? null,
        spotify_url: track?.spotify_url ?? null,
      })
      .select()
      .single();

    if (error || !journal) { toast.error("Failed to save"); setSaving(false); return; }

    // Link tasks
    if (selectedTasks.length > 0) {
      await supabase.from("journal_tasks").insert(
        selectedTasks.map((tid) => ({ journal_id: journal.id, task_id: tid }))
      );
    }

    toast.success("Entry saved ✓");
    router.push(`/journal/${journal.id}`);
  }

  return (
    <AuthGuard>
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">New Entry</h1>
        <p className="text-muted-foreground text-sm">Write freely. Attach a song. Link it to your tasks.</p>
      </div>

      {/* Session + Mood row */}
      <div className="flex gap-3 mb-5">
        <select
          value={session}
          onChange={(e) => setSession(e.target.value as SessionLabel)}
          className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {SESSION_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div className="flex gap-1.5 flex-wrap">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(mood === m ? "" : m)}
              className={`text-xl rounded-lg p-1.5 transition-all ${mood === m ? "bg-primary/20 scale-110" : "hover:bg-secondary"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-base font-medium outline-none focus:border-primary placeholder:text-muted-foreground mb-4"
      />

      {/* Content */}
      <textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind? How are you feeling? What happened today?"
        rows={10}
        className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground resize-none mb-4 leading-relaxed"
      />

      {/* Spotify */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Song for this entry</p>
        <SpotifyPicker value={track} onChange={setTrack} />
      </div>

      {/* Task linking */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowTasks(!showTasks)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          {showTasks ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          Link to tasks ({selectedTasks.length} selected)
        </button>
        {showTasks && (
          <TaskSelector tasks={tasks} selected={selectedTasks} onChange={setSelectedTasks} />
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={save} disabled={saving || !content.trim()}>
          {saving ? "Saving..." : "Save Entry"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </div>
    </AuthGuard>
  );
}
