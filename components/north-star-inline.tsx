'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Edit2, Check, X, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { 
  getNorthStar, 
  upsertNorthStar, 
  NORTH_STAR_PROMPTS, 
  MAX_CONTENT_LENGTH,
  truncateNorthStar 
} from '@/lib/north-star';
import type { NorthStar } from '@/types';
import { toast } from 'sonner';

export function NorthStarInline() {
  const { user } = useAuth();
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    async function loadNorthStar() {
      if (!user) return;
      setIsLoading(true);
      const data = await getNorthStar(user.id);
      setNorthStar(data);
      setContent(data?.content || '');
      // If no North Star exists, open edit mode by default
      if (!data) {
        setIsEditing(true);
      }
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
      setIsEditing(false);
      toast.success('North Star saved! ✨');
    } else {
      toast.error(result.error || 'Failed to save');
    }
  }

  function handleCancel() {
    setContent(northStar?.content || '');
    setIsEditing(false);
  }

  function cyclePrompt() {
    setPromptIndex((prev) => (prev + 1) % NORTH_STAR_PROMPTS.length);
  }

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CONTENT_LENGTH;

  if (isLoading) {
    return null;
  }

  // Edit mode
  if (isEditing) {
    return (
      <Card className="mb-6 border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-amber-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium">
              {northStar ? 'Edit Your North Star' : 'Set Your North Star'}
            </span>
          </div>

          {/* Prompt hint */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-background/50">
            <Sparkles className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground italic flex-1">
              {NORTH_STAR_PROMPTS[promptIndex]}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={cyclePrompt}
              className="h-5 w-5 flex-shrink-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          {/* Textarea */}
          <div className="space-y-1.5">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your North Star here..."
              rows={3}
              className={`resize-none text-sm ${isOverLimit ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              autoFocus
            />
            <div className="flex justify-end text-xs">
              <span className={isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                {charCount}/{MAX_CONTENT_LENGTH}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {northStar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isOverLimit || !content.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>

          {/* Helper text when empty */}
          {!northStar && (
            <p className="text-xs text-muted-foreground text-center">
              Your North Star is your life vision — the single statement that guides everything you do.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Display mode (read-only with edit button)
  if (!northStar) {
    // No North Star set - show "Add" button
    return (
      <Card 
        className="mb-6 border-dashed border-yellow-500/30 hover:border-yellow-500/60 transition-colors cursor-pointer"
        onClick={() => setIsEditing(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Set Your North Star</p>
                <p className="text-xs text-muted-foreground">
                  Define your life vision to guide your priorities
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Has North Star - show with edit button
  const shouldTruncate = northStar.content.length > 150;
  const displayContent = shouldTruncate 
    ? truncateNorthStar(northStar.content, 150) 
    : northStar.content;

  return (
    <Card className="mb-6 border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 hover:border-yellow-500/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-yellow-600/70 dark:text-yellow-400/70 mb-1">
              North Star
            </p>
            <p className="text-sm leading-relaxed">
              {displayContent}
            </p>
            {shouldTruncate && (
              <button 
                className="text-xs text-muted-foreground hover:text-yellow-600 transition-colors mt-1"
                onClick={() => setIsEditing(true)}
              >
                Click to see full text
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 opacity-60 hover:opacity-100"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}