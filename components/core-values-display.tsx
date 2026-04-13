'use client';

import { useState, useEffect } from 'react';
import { Heart, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getCoreValues } from '@/lib/core-values';
import type { CoreValue } from '@/types';

interface CoreValuesDisplayProps {
  compact?: boolean;
}

export function CoreValuesDisplay({ compact = false }: CoreValuesDisplayProps) {
  const { user } = useAuth();
  const [values, setValues] = useState<CoreValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading || !values || values.length === 0) {
    // Don't show anything if no values set
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
        <span className="truncate max-w-md">
          {values.slice(0, 3).map(v => v.value_text).join(' · ')}
        </span>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="group relative rounded-lg border border-rose-500/20 bg-gradient-to-r from-rose-500/5 to-pink-500/5 p-4 hover:border-rose-500/40 transition-colors">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-rose-600/70 dark:text-rose-400/70 mb-2">
              What Matters Most
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => (
                <span
                  key={value.id}
                  className="inline-flex items-center gap-1.5 text-sm bg-white/50 dark:bg-black/20 rounded-full px-3 py-1 border border-rose-500/20"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500/60" />
                  {value.value_text}
                </span>
              ))}
            </div>
          </div>
          <Link 
            href="/settings" 
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
              Edit <ChevronRight className="h-3 w-3" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}