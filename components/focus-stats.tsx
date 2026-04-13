"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function FocusStats() {
  const { user } = useAuth();
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadStats() {
    if (!user) return;
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [{ data: todayData }, { data: weekData }] = await Promise.all([
      supabase
        .from("focus_sessions")
        .select("duration")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("started_at", today.toISOString()),
      supabase
        .from("focus_sessions")
        .select("duration")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("started_at", weekAgo.toISOString()),
    ]);

    setTodayMinutes(todayData?.reduce((sum, s) => sum + s.duration, 0) || 0);
    setWeekMinutes(weekData?.reduce((sum, s) => sum + s.duration, 0) || 0);
    setLoading(false);
  }

  if (loading) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Timer size={16} className="text-primary" />
            Focus Time
          </CardTitle>
          <Link href="/focus">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              Start <ArrowRight size={12} />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          <div>
            <p className="text-2xl font-bold">{todayMinutes}</p>
            <p className="text-xs text-muted-foreground">min today</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{weekMinutes}</p>
            <p className="text-xs text-muted-foreground">min this week</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}