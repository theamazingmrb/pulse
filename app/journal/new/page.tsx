"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import SpotifyPicker from "@/components/spotify-picker";
import TaskSelector from "@/components/task-selector";
import { SpotifyTrack, Task, SessionLabel } from "@/types";
import { getSessionLabel, todayISO } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ImagePlus, X } from "lucide-react";
import AuthGuard from "@/components/auth-guard";
import Image from "next/image";

const SESSION_OPTIONS: { value: SessionLabel; label: string }[] = [
  { value: "morning", label: "🌅 Morning" },
  { value: "afternoon", label: "☀️ Afternoon" },
  { value: "evening", label: "🌙 Evening" },
  { value: "general", label: "📝 General" },
];

const MOODS = ["😊", "😤", "😰", "🤔", "🔥", "😴", "💡", "😌", "🙏", "💪"];
const MAX_IMAGES = 5;

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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("tasks").select("*").neq("status", "done").order("created_at", { ascending: false })
      .then(({ data }) => setTasks(data ?? []));
  }, []);

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - imageUrls.length;
    if (remaining <= 0) { toast.error(`Max ${MAX_IMAGES} images`); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not logged in"); return; }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploadingCount((c) => c + toUpload.length);

    const uploaded: string[] = [];
    for (const file of toUpload) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); setUploadingCount((c) => c - 1); continue; }
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("journal-images").upload(path, file);
      if (error) { toast.error(`Failed to upload ${file.name}`); setUploadingCount((c) => c - 1); continue; }
      const { data: { publicUrl } } = supabase.storage.from("journal-images").getPublicUrl(path);
      uploaded.push(publicUrl);
      setUploadingCount((c) => c - 1);
    }
    if (uploaded.length > 0) setImageUrls((prev) => [...prev, ...uploaded]);
  }

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

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
        image_urls: imageUrls.length > 0 ? imageUrls : null,
      })
      .select()
      .single();

    if (error || !journal) { toast.error("Failed to save"); setSaving(false); return; }

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

      {/* Images */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Photos</p>
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url) => (
            <div key={url} className="relative group">
              <Image
                src={url}
                alt="Journal photo"
                width={96}
                height={96}
                className="w-24 h-24 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {uploadingCount > 0 && (
            Array.from({ length: uploadingCount }).map((_, i) => (
              <div key={`uploading-${i}`} className="w-24 h-24 rounded-lg border border-border bg-secondary animate-pulse flex items-center justify-center">
                <span className="text-xs text-muted-foreground">...</span>
              </div>
            ))
          )}
          {imageUrls.length < MAX_IMAGES && uploadingCount === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-lg border border-dashed border-border bg-secondary hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
            >
              <ImagePlus size={20} />
              <span className="text-xs">Add photo</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleImageFiles(e.target.files)}
        />
        {imageUrls.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">{imageUrls.length}/{MAX_IMAGES} photos</p>
        )}
      </div>

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
        <Button onClick={save} disabled={saving || !content.trim() || uploadingCount > 0}>
          {saving ? "Saving..." : uploadingCount > 0 ? "Uploading..." : "Save Entry"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </div>
    </AuthGuard>
  );
}
