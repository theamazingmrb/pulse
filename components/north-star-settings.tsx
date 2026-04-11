'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { getNorthStar, upsertNorthStar, NORTH_STAR_PROMPTS, MAX_CONTENT_LENGTH } from '@/lib/north-star';
import type { NorthStar } from '@/types';

export function NorthStarSettings() {
  const { user } = useAuth();
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    async function loadNorthStar() {
      if (!user) return;
      setIsLoading(true);
      const data = await getNorthStar(user.id);
      setNorthStar(data);
      setContent(data?.content || '');
      setIsLoading(false);
    }
    if (user) {
      loadNorthStar();
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    
    setIsSaving(true);
    const result = await upsertNorthStar(user.id, content);
    setIsSaving(false);

    if (result.success) {
      setNorthStar(result.data || null);
      toast.success('North Star saved! ✨');
    } else {
      toast.error(result.error || 'Failed to save');
    }
  }

  function cyclePrompt() {
    setPromptIndex((prev) => (prev + 1) % NORTH_STAR_PROMPTS.length);
  }

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CONTENT_LENGTH;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          North Star
        </CardTitle>
        <CardDescription>
          Your life vision — the single statement that anchors everything you do.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt hint */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground italic">
              {NORTH_STAR_PROMPTS[promptIndex]}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={cyclePrompt}
            className="h-6 w-6 flex-shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your North Star here..."
            rows={4}
            className={`resize-none ${isOverLimit ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {northStar?.updated_at && (
                <>Last updated {new Date(northStar.updated_at).toLocaleDateString()}</>
              )}
            </span>
            <span className={isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {charCount}/{MAX_CONTENT_LENGTH}
            </span>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || isOverLimit || !content.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Save North Star
              </>
            )}
          </Button>
        </div>

        {/* Helper text when empty */}
        {!content && !northStar && (
          <p className="text-xs text-muted-foreground text-center">
            Your North Star will appear on your dashboard as a guiding light. 
            Keep it brief, powerful, and personal.
          </p>
        )}
      </CardContent>
    </Card>
  );
}