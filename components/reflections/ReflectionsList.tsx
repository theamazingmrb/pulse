"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Target, TrendingUp, Flame } from "lucide-react";
import { Reflection, ReflectionType, ReflectionStreak } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { getReflections, getStreaks } from "@/lib/reflections";
import { REFLECTION_LABELS, getPeriodLabel } from "@/lib/reflections";
import { cn, formatDate } from "@/lib/utils";

const TYPE_ICONS = {
  daily: <Calendar className="w-4 h-4" />,
  weekly: <Target className="w-4 h-4" />,
  monthly: <TrendingUp className="w-4 h-4" />,
};

export default function ReflectionsList() {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [streaks, setStreaks] = useState<ReflectionStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReflectionType>("daily");

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    const [reflectionsData, streaksData] = await Promise.all([
      getReflections(user.id),
      getStreaks(user.id),
    ]);
    
    setReflections(reflectionsData);
    setStreaks(streaksData);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const getReflectionsByType = (type: ReflectionType) => {
    return reflections.filter(r => r.type === type);
  };

  const getStreakForType = (type: ReflectionType) => {
    return streaks.find(s => s.type === type);
  };

  const renderReflectionCard = (reflection: Reflection) => {
    const config = REFLECTION_LABELS[reflection.type];
    const periodLabel = getPeriodLabel(reflection.type, reflection.period_start);
    
    return (
      <Card key={reflection.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {TYPE_ICONS[reflection.type]}
              <CardTitle className="text-lg">{periodLabel}</CardTitle>
            </div>
            <Badge 
              variant="secondary" 
              className={cn("text-xs", config.color, config.bg)}
            >
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reflection.mood && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Mood:</span>
                <span className="text-muted-foreground">{reflection.mood}</span>
              </div>
            )}
            
            {reflection.energy_level && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Energy:</span>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full",
                        i < reflection.energy_level! ? "bg-primary" : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {Object.entries(reflection.sections).map(([key, value]: [string, string]) => (
                <div key={key} className="text-sm">
                  <div className="font-medium text-muted-foreground mb-1 capitalize">
                    {key.replace(/_/g, " ")}
                  </div>
                  <div className="line-clamp-3">{value}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              {formatDate(reflection.updated_at)}
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/reflections/${reflection.id}`}>
                View →
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["daily", "weekly", "monthly"] as ReflectionType[]).map((type) => {
          const streak = getStreakForType(type);
          const config = REFLECTION_LABELS[type];
          const count = getReflectionsByType(type).length;
          
          return (
            <Card key={type}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {TYPE_ICONS[type]}
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {count} reflection{count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  {streak && streak.current_streak > 0 && (
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame className="w-4 h-4" />
                      <span className="font-medium">{streak.current_streak}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New Reflection Button */}
      <div className="flex justify-center">
        <Button asChild>
          <Link href="/reflections/new">
            <Plus className="w-4 h-4 mr-2" />
            New Reflection
          </Link>
        </Button>
      </div>

      {/* Reflections by Type */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReflectionType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        
        {(["daily", "weekly", "monthly"] as ReflectionType[]).map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            {getReflectionsByType(type).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  {TYPE_ICONS[type]}
                  <h3 className="text-lg font-semibold mt-2 mb-2">
                    No {type} reflections yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Start your {type} reflection habit today
                  </p>
                  <Button asChild>
                    <Link href={`/reflections/new?type=${type}`}>
                      Create {type} reflection
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getReflectionsByType(type).map(renderReflectionCard)}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
