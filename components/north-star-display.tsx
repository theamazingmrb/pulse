'use client';

import { useState, useEffect } from 'react';
import { Star, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getNorthStar, truncateNorthStar } from '@/lib/north-star';
import type { NorthStar } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface NorthStarDisplayProps {
  compact?: boolean;
}

export function NorthStarDisplay({ compact = false }: NorthStarDisplayProps) {
  const { user } = useAuth();
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadNorthStar() {
      if (!user) return;
      setIsLoading(true);
      const data = await getNorthStar(user.id);
      setNorthStar(data);
      setIsLoading(false);
    }
    if (user) {
      loadNorthStar();
    }
  }, [user]);

  if (isLoading || !northStar) {
    // Don't show anything if no North Star set
    return null;
  }

  const shouldTruncate = northStar.content.length > 100;
  const displayContent = shouldTruncate && !isExpanded 
    ? truncateNorthStar(northStar.content) 
    : northStar.content;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
        <span className="italic truncate max-w-md">{truncateNorthStar(northStar.content, 60)}</span>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div 
        className="group relative rounded-lg border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 p-4 cursor-pointer hover:border-yellow-500/40 transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-yellow-600/70 dark:text-yellow-400/70 mb-1">
              North Star
            </p>
            <p className={`text-sm leading-relaxed ${shouldTruncate ? 'line-clamp-2' : ''}`}>
              {displayContent}
            </p>
            {shouldTruncate && (
              <p className="text-xs text-muted-foreground mt-1 group-hover:text-yellow-600 transition-colors">
                Click to expand
              </p>
            )}
          </div>
          <Link 
            href="/settings" 
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Expanded Modal */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              Your North Star
            </DialogTitle>
            <DialogDescription>
              The vision that guides your priorities and decisions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base leading-relaxed">{northStar.content}</p>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(northStar.updated_at).toLocaleDateString()}
            </p>
            <Link href="/settings">
              <Button variant="outline" size="sm" onClick={() => setIsExpanded(false)}>
                Edit in Settings
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}