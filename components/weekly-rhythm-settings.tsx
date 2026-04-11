'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getWeeklyRhythms,
  upsertRhythmBlock,
  applyRhythmPreset,
  DAYS_OF_WEEK,
  TIME_BLOCKS,
  ENERGY_LEVELS,
  FOCUS_MODES,
} from '@/lib/weekly-rhythms';
import { RHYTHM_PRESETS, RhythmPreset, WeeklyRhythm, TimeBlock, EnergyLevel, FocusMode } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TIME_BLOCK_ICONS = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌙',
};

const ENERGY_ICONS = {
  high: '⚡',
  medium: '📊',
  low: '🔋',
};

export function WeeklyRhythmSettings() {
  const { user } = useAuth();
  const [rhythms, setRhythms] = useState<WeeklyRhythm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [applyingPreset, setApplyingPreset] = useState<RhythmPreset | null>(null);

  useEffect(() => {
    if (user) {
      loadRhythms(user.id);
    }
  }, [user]);

  async function loadRhythms(userId: string) {
    setIsLoading(true);
    const data = await getWeeklyRhythms(userId);
    setRhythms(data);
    setIsLoading(false);
  }

  function getRhythm(dayOfWeek: number, timeBlock: TimeBlock): WeeklyRhythm | undefined {
    return rhythms.find(r => r.day_of_week === dayOfWeek && r.time_block === timeBlock);
  }

  async function handleUpdate(
    dayOfWeek: number,
    timeBlock: TimeBlock,
    field: 'energy_level' | 'focus_mode',
    value: string
  ) {
    if (!user) return;

    const existing = getRhythm(dayOfWeek, timeBlock);
    const blockKey = `${dayOfWeek}-${timeBlock}`;
    setIsSaving(blockKey);

    const energyLevel = field === 'energy_level' 
      ? (value as EnergyLevel) 
      : (existing?.energy_level || 'medium');
    const focusMode = field === 'focus_mode' 
      ? (value as FocusMode) 
      : (existing?.focus_mode || 'quick');

    const updated = await upsertRhythmBlock(
      user.id,
      dayOfWeek,
      timeBlock,
      energyLevel,
      focusMode,
      existing?.notes || undefined
    );

    if (updated) {
      setRhythms(prev => {
        const filtered = prev.filter(
          r => !(r.day_of_week === dayOfWeek && r.time_block === timeBlock)
        );
        return [...filtered, updated];
      });
    }

    setIsSaving(null);
  }

  async function handleApplyPreset(preset: RhythmPreset) {
    if (!user) return;

    setApplyingPreset(preset);
    const result = await applyRhythmPreset(user.id, preset);
    
    if (result.length > 0) {
      setRhythms(result);
      toast.success(`Applied ${RHYTHM_PRESETS[preset].name} preset`);
    } else {
      toast.error('Failed to apply preset');
    }

    setApplyingPreset(null);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Weekly Rhythm
        </CardTitle>
        <CardDescription>
          Map your energy levels throughout the week. We&apos;ll suggest the best times for different types of work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Presets */}
        <div>
          <p className="text-sm font-medium mb-3">Quick Start Presets</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RHYTHM_PRESETS) as RhythmPreset[]).map(preset => (
              <Button
                key={preset}
                variant={applyingPreset === preset ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleApplyPreset(preset)}
                disabled={applyingPreset !== null}
              >
                {applyingPreset === preset && (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                )}
                {RHYTHM_PRESETS[preset].name}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Presets set up your whole week. Customize individual blocks below.
          </p>
        </div>

        {/* Weekly Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted-foreground font-normal">Day</th>
                {TIME_BLOCKS.map(block => (
                  <th key={block.value} className="text-center p-2 min-w-[140px]">
                    <div className="flex items-center justify-center gap-1">
                      <span>{TIME_BLOCK_ICONS[block.value]}</span>
                      <span className="font-medium">{block.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-normal">{block.hours}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS_OF_WEEK.map(day => (
                <tr key={day.value} className="border-t">
                  <td className="p-2 font-medium sticky left-0 bg-background">
                    {day.label}
                  </td>
                  {TIME_BLOCKS.map(block => {
                    const rhythm = getRhythm(day.value, block.value);
                    const blockKey = `${day.value}-${block.value}`;
                    const isSavingThis = isSaving === blockKey;

                    return (
                      <td key={block.value} className="p-1 align-top">
                        <div className="space-y-1">
                          {/* Energy Level */}
                          <Select
                            value={rhythm?.energy_level || 'medium'}
                            onValueChange={(value) =>
                              handleUpdate(day.value, block.value, 'energy_level', value)
                            }
                            disabled={isSavingThis}
                          >
                            <SelectTrigger className="h-8 text-xs px-2">
                              <span className="mr-1">
                                {ENERGY_ICONS[rhythm?.energy_level || 'medium']}
                              </span>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ENERGY_LEVELS.map(level => (
                                <SelectItem key={level.value} value={level.value}>
                                  <span className="mr-1">{ENERGY_ICONS[level.value]}</span>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Focus Mode */}
                          <Select
                            value={rhythm?.focus_mode || 'quick'}
                            onValueChange={(value) =>
                              handleUpdate(day.value, block.value, 'focus_mode', value)
                            }
                            disabled={isSavingThis}
                          >
                            <SelectTrigger className="h-8 text-xs px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FOCUS_MODES.map(mode => (
                                <SelectItem key={mode.value} value={mode.value}>
                                  <span className="mr-1" style={{ color: mode.color }}>●</span>
                                  {mode.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="pt-4 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">Energy Levels</p>
          <div className="flex flex-wrap gap-3">
            {ENERGY_LEVELS.map(level => (
              <div key={level.value} className="flex items-center gap-1 text-xs">
                <span>{ENERGY_ICONS[level.value]}</span>
                <Badge variant="outline" style={{ borderColor: level.color }}>
                  {level.label}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-xs font-medium text-muted-foreground mb-2 mt-3">Focus Modes</p>
          <div className="flex flex-wrap gap-3">
            {FOCUS_MODES.map(mode => (
              <div key={mode.value} className="flex items-center gap-1 text-xs">
                <span style={{ color: mode.color }}>●</span>
                <span>{mode.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}