'use client';

import { useState, useEffect } from 'react';
import { Target, Ban, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getLatestDailyIntent } from '@/lib/daily-intent';
import { todayISO } from '@/lib/utils';

export function DailyIntentDisplay() {
  const { user } = useAuth();
  const [intent, setIntent] = useState<{
    daily_intent: string | null;
    say_no_to: string | null;
    date: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadIntent() {
      if (!user) return;
      setIsLoading(true);
      const data = await getLatestDailyIntent(user.id);
      setIntent(data);
      setIsLoading(false);
    }
    if (user) {
      loadIntent();
    }
  }, [user]);

  if (isLoading || !intent?.daily_intent) {
    // Don't show anything if no intent set
    return null;
  }

  const isToday = intent.date === todayISO();

  return (
    <div className="mb-6">
      <div className="group relative rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 p-4 hover:border-emerald-500/40 transition-colors">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Target className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">
                Daily Intent
              </p>
              {!isToday && (
                <span className="text-xs text-muted-foreground">
                  ({intent.date})
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed mb-3">
              {intent.daily_intent}
            </p>
            {intent.say_no_to && (
              <div className="flex items-start gap-2 pt-2 border-t border-emerald-500/10">
                <Ban size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-rose-600/70 dark:text-rose-400/70 uppercase tracking-wider mb-1">
                    Saying No To
                  </p>
                  <p className="text-sm text-muted-foreground">{intent.say_no_to}</p>
                </div>
              </div>
            )}
          </div>
          <Link 
            href="/checkin" 
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
              Update <ChevronRight className="h-3 w-3" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}