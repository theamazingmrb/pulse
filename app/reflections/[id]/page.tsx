export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import Link from "next/link";
import { getReflectionById, REFLECTION_PROMPTS, REFLECTION_LABELS, getPeriodLabel } from "@/lib/reflections";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReflectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const reflection = await getReflectionById(id);
  if (!reflection) notFound();

  const meta = REFLECTION_LABELS[reflection.type];
  const periodLabel = getPeriodLabel(reflection.type, reflection.period_start);
  const prompts = REFLECTION_PROMPTS[reflection.type];

  const createdAt = new Date(reflection.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="max-w-2xl">
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/reflections">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <ArrowLeft size={15} />
            Reflections
          </Button>
        </Link>
        <Link href={`/reflections/new?edit=${reflection.id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil size={13} />
            Edit
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", meta.bg, meta.color)}>
            {meta.label}
          </span>
          <span className="text-sm font-medium">{periodLabel}</span>
          {reflection.mood && <span className="text-xl">{reflection.mood}</span>}
        </div>

        <p className="text-xs text-muted-foreground">{createdAt}</p>

        {/* Energy */}
        {reflection.energy_level && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Energy</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    n <= reflection.energy_level! ? "bg-primary" : "bg-border"
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{reflection.energy_level}/5</span>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-6">
        {prompts.map((prompt) => {
          const answer = reflection.sections[prompt.key];
          if (!answer?.trim()) return null;
          return (
            <div key={prompt.key}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {prompt.label}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
            </div>
          );
        })}
      </div>

      {/* All sections empty fallback */}
      {prompts.every((p) => !reflection.sections[p.key]?.trim()) && (
        <p className="text-sm text-muted-foreground italic">No content recorded.</p>
      )}
    </div>
  );
}
