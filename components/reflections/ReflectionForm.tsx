"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Calendar, Target, TrendingUp } from "lucide-react";
import { ReflectionType, Reflection } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { 
  saveReflection, 
  getPeriodStart,
  getPeriodLabel,
  REFLECTION_PROMPTS,
  REFLECTION_LABELS
} from "@/lib/reflections";
import { toast } from "sonner";

const TYPE_ICONS = {
  daily: <Calendar className="w-4 h-4" />,
  weekly: <Target className="w-4 h-4" />,
  monthly: <TrendingUp className="w-4 h-4" />,
};

const MOOD_OPTIONS = [
  "😊 Great",
  "😐 Good", 
  "😔 Okay",
  "😞 Rough",
  "😢 Tough"
];

const ENERGY_LEVELS = [
  { value: 1, label: "Very Low" },
  { value: 2, label: "Low" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "High" },
  { value: 5, label: "Very High" },
];

interface ReflectionFormProps {
  initialType?: ReflectionType;
  existingReflection?: Reflection;
}

export default function ReflectionForm({ 
  initialType = "daily",
  existingReflection 
}: ReflectionFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [type, setType] = useState<ReflectionType>(initialType);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [mood, setMood] = useState<string>("");
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);

  const prompts = REFLECTION_PROMPTS[type];
  const periodStart = getPeriodStart(type);
  const periodLabel = getPeriodLabel(type, periodStart);
  const config = REFLECTION_LABELS[type];

  useEffect(() => {
    if (existingReflection) {
      setType(existingReflection.type);
      setSections(existingReflection.sections);
      setMood(existingReflection.mood || "");
      setEnergyLevel(existingReflection.energy_level);
    } else {
      // Initialize empty sections for this type
      const emptySections: Record<string, string> = {};
      prompts.forEach(prompt => {
        emptySections[prompt.key] = "";
      });
      setSections(emptySections);
    }
  }, [type, prompts, existingReflection]);

  const handleSectionChange = (key: string, value: string) => {
    setSections(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate at least one section has content
    const hasContent = Object.values(sections).some(value => value.trim().length > 0);
    if (!hasContent) {
      toast.error("Please write at least one reflection section");
      return;
    }

    setLoading(true);

    try {
      const result = await saveReflection(
        user.id,
        type,
        periodStart,
        sections,
        mood || null,
        energyLevel
      );

      if (result) {
        toast.success(`${config.label} reflection saved!`);
        router.push("/reflections");
      } else {
        toast.error("Failed to save reflection");
      }
    } catch (error) {
      console.error("Error saving reflection:", error);
      toast.error("Failed to save reflection");
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (newType: ReflectionType) => {
    if (existingReflection) {
      // Don't allow type change for existing reflections
      return;
    }
    setType(newType);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {existingReflection ? "Edit" : "New"} {config.label} Reflection
          </h1>
          <p className="text-muted-foreground">{periodLabel}</p>
        </div>
      </div>

      {/* Type Selector (only for new reflections) */}
      {!existingReflection && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium mb-3 block">Reflection Type</Label>
            <div className="grid grid-cols-3 gap-3">
              {(["daily", "weekly", "monthly"] as ReflectionType[]).map((t) => {
                const tConfig = REFLECTION_LABELS[t];
                return (
                  <Button
                    key={t}
                    variant={type === t ? "default" : "outline"}
                    onClick={() => handleTypeChange(t)}
                    className="h-auto p-3 flex flex-col gap-2"
                  >
                    {TYPE_ICONS[t]}
                    <span className="text-sm">{tConfig.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mood & Energy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How are you feeling?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Mood</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger>
                <SelectValue placeholder="Select your mood" />
              </SelectTrigger>
              <SelectContent>
                {MOOD_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Energy Level</Label>
            <Select 
              value={energyLevel?.toString()} 
              onValueChange={(value) => setEnergyLevel(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select energy level" />
              </SelectTrigger>
              <SelectContent>
                {ENERGY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < level.value ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span>{level.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reflection Sections */}
      <div className="space-y-4">
        {prompts.map((prompt) => (
          <Card key={prompt.key}>
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-2 block">
                {prompt.label}
              </Label>
              <Textarea
                placeholder={prompt.placeholder}
                value={sections[prompt.key] || ""}
                onChange={(e) => handleSectionChange(prompt.key, e.target.value)}
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={loading} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Saving..." : "Save Reflection"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
