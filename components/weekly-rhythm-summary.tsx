'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getTodayRhythms,
  getCurrentTimeBlock,
  ENERGY_LEVELS,
  FOCUS_MODES,
} from '@/lib/weekly-rhythms';
import { WeeklyRhythm, TimeBlock } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Brain, ArrowRight, Sunrise, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

const TIME_BLOCK_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
};

const ENERGY_EMOJIS = {
  high: '⚡',
  medium: '📊',
  low: '🔋',
};

const FOCUS_EMOJIS = {
  deep: '🧠',
  quick: '✅',
  planning: '📋',
  admin: '⚙️',
};

export function WeeklyRhythmSummary() {
  const { user } = useAuth();
  const [rhythms, setRhythms] = useState<WeeklyRhythm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRhythms(user.id);
    }
  }, [user]);

  async function loadRhythms(userId: string) {
    setIsLoading(true);
    const data = await getTodayRhythms(userId);
    setRhythms(data);
    setIsLoading(false);
  }

  const currentTimeBlock = getCurrentTimeBlock();
  const currentRhythm = rhythms.find(r => r.time_block === currentTimeBlock);

  const getRhythmByTimeBlock = (block: TimeBlock) =>
    rhythms.find(r => r.time_block === block);

  // Get today's day name
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

  // If no rhythms set up, show a prompt
  if (!isLoading && rhythms.length === 0) {
    return (
      <Link href="/settings#rhythm">
        <Card className="border-dashed border-primary/40 hover:border-primary/70 transition-colors cursor-pointer mb-6">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Set up your Weekly Rhythm</p>
                <p className="text-sm text-muted-foreground">
                  Tell us when you have the most energy so we can schedule better.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Configure <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </Link>
    );
  }

  if (isLoading) {
    return null;
  }

  // Generate a helpful message based on current rhythm
  function getMessage(block: TimeBlock, rhythm: WeeklyRhythm | undefined): string {
    if (!rhythm) return '';

    const focusConfig = FOCUS_MODES.find(m => m.value === rhythm.focus_mode);

    const timeBlockLabels = {
      morning: 'this morning',
      afternoon: 'this afternoon',
      evening: 'this evening',
    };

    if (rhythm.energy_level === 'high') {
      return `Your ${timeBlockLabels[block]} is HIGH energy — perfect for ${focusConfig?.label || rhythm.focus_mode}.`;
    }
    if (rhythm.energy_level === 'medium') {
      return `${timeBlockLabels[block].charAt(0).toUpperCase() + timeBlockLabels[block].slice(1)} is looking steady. Good for ${focusConfig?.label || rhythm.focus_mode}.`;
    }
    return `${timeBlockLabels[block].charAt(0).toUpperCase() + timeBlockLabels[block].slice(1)} energy is lower — save it for ${focusConfig?.label || rhythm.focus_mode}.`;
  }

  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {dayName}&apos;s Energy
            </p>
            <p className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Weekly Rhythm
            </p>
          </div>
          <Link href="/settings#rhythm">
            <Button variant="ghost" size="sm" className="text-xs">
              Edit
            </Button>
          </Link>
        </div>

        {/* Today's blocks */}
        <div className="grid grid-cols-3 gap-3">
          {(['morning', 'afternoon', 'evening'] as TimeBlock[]).map(block => {
            const rhythm = getRhythmByTimeBlock(block);
            const Icon = TIME_BLOCK_ICONS[block];
            const isCurrent = block === currentTimeBlock;

            return (
              <div
                key={block}
                className={`relative p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium capitalize">{block}</span>
                </div>
                {rhythm ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{ENERGY_EMOJIS[rhythm.energy_level]}</span>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: ENERGY_LEVELS.find(e => e.value === rhythm.energy_level)?.color,
                        }}
                      >
                        {rhythm.energy_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{FOCUS_EMOJIS[rhythm.focus_mode]}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {rhythm.focus_mode}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not set</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Current block suggestion */}
        {currentRhythm && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {getMessage(currentTimeBlock, currentRhythm)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}