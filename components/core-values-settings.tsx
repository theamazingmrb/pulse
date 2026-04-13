'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Loader2, Sparkles, RefreshCw, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { 
  getCoreValues, 
  addCoreValue, 
  deleteCoreValue, 
  reorderCoreValues,
  CORE_VALUE_PROMPTS,
  MAX_VALUES,
  MAX_VALUE_LENGTH 
} from '@/lib/core-values';
import type { CoreValue } from '@/types';

export function CoreValuesSettings() {
  const { user } = useAuth();
  const [values, setValues] = useState<CoreValue[]>([]);
  const [newInput, setNewInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadValues() {
      if (!user) return;
      setIsLoading(true);
      const data = await getCoreValues(user.id);
      setValues(data);
      setIsLoading(false);
    }
    if (user) {
      loadValues();
    }
  }, [user]);

  async function handleAdd() {
    if (!user || !newInput.trim()) return;
    
    setIsAdding(true);
    const result = await addCoreValue(user.id, newInput.trim(), values.length);
    setIsAdding(false);

    if (result.success) {
      setNewInput('');
      if (result.data) {
        setValues(prev => [...prev, ...result.data!]);
      }
      toast.success('Value added! ✨');
    } else {
      toast.error(result.error || 'Failed to add value');
    }
  }

  async function handleDelete(valueId: string) {
    if (!user) return;
    
    setDeletingId(valueId);
    const result = await deleteCoreValue(user.id, valueId);
    setDeletingId(null);

    if (result.success) {
      setValues(prev => prev.filter(v => v.id !== valueId));
      toast.success('Value removed');
    } else {
      toast.error(result.error || 'Failed to delete value');
    }
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    
    // Reorder locally
    const newValues = [...values];
    const [removed] = newValues.splice(draggedIndex, 1);
    newValues.splice(targetIndex, 0, removed);
    setValues(newValues);
    setDraggedIndex(targetIndex);
  }, [draggedIndex, values]);

  const handleDragEnd = async () => {
    if (draggedIndex === null || !user) return;
    
    const orderedIds = values.map(v => v.id);
    const result = await reorderCoreValues(user.id, orderedIds);
    
    if (result.success && result.data) {
      setValues(result.data);
    }
    
    setDraggedIndex(null);
  };

  function cyclePrompt() {
    setPromptIndex((prev) => (prev + 1) % CORE_VALUE_PROMPTS.length);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const charCount = newInput.length;
  const isOverLimit = charCount > MAX_VALUE_LENGTH;
  const isAtLimit = values.length >= MAX_VALUES;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
          What Matters Most
        </CardTitle>
        <CardDescription>
          Your core values — the principles that guide your decisions and priorities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing values */}
        {values.length > 0 && (
          <div className="space-y-2">
            {values.map((value, index) => (
              <div
                key={value.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500/60 flex-shrink-0" />
                <span className="flex-1 text-sm">{value.value_text}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(value.id)}
                  disabled={deletingId === value.id}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                >
                  {deletingId === value.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new value */}
        {!isAtLimit && (
          <div className="space-y-2">
            {/* Prompt hint */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Sparkles className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground italic">
                  {CORE_VALUE_PROMPTS[promptIndex]}
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

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                placeholder="Add a core value..."
                className={`flex-1 ${isOverLimit ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isOverLimit && newInput.trim()) {
                    handleAdd();
                  }
                }}
                disabled={isAdding}
              />
              <Button
                onClick={handleAdd}
                disabled={isAdding || isOverLimit || !newInput.trim()}
                size="icon"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-lg">+</span>
                )}
              </Button>
            </div>
            
            {/* Character count */}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {values.length} of {MAX_VALUES} values
              </span>
              <span className={isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                {charCount}/{MAX_VALUE_LENGTH}
              </span>
            </div>
          </div>
        )}

        {/* Helper text when empty */}
        {values.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Define 2-3 values that guide your decisions. 
            These will appear on your dashboard as a reminder.
          </p>
        )}

        {/* At limit message */}
        {isAtLimit && (
          <p className="text-xs text-muted-foreground text-center">
            Maximum {MAX_VALUES} values reached. Remove one to add another.
          </p>
        )}
      </CardContent>
    </Card>
  );
}