"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StreaksData } from "@/lib/analytics";
import { Flame, Trophy, CheckCircle, Star } from "lucide-react";

interface Props {
  data: StreaksData;
}

export default function StreaksSection({ data }: Props) {
  const achievedMilestones = data.milestones.filter((m) => m.achieved);
  const nextMilestones = data.milestones.filter((m) => !m.achieved).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Streak Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/20">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Check-in Streak
                </p>
                <p className="text-3xl font-bold">{data.checkinStreak}</p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Star className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Reflection Streak
                </p>
                <p className="text-3xl font-bold">{data.reflectionStreak}</p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Flame className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Focus Streak
                </p>
                <p className="text-3xl font-bold">{data.focusStreak}</p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestones Achieved */}
      {achievedMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <CardTitle>Milestones Achieved</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {achievedMilestones.map((milestone, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">{milestone.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Milestones */}
      {nextMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Next Milestones</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nextMilestones.map((milestone, index) => {
                const progress = Math.min(
                  (milestone.current / milestone.target) * 100,
                  100
                );
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{milestone.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {milestone.current} / {milestone.target}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Milestones Grid */}
      <Card>
        <CardHeader>
          <CardTitle>All Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {data.milestones.map((milestone, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  milestone.achieved
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-border bg-secondary/30"
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  {milestone.achieved ? (
                    <Trophy className="w-6 h-6 text-amber-500" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium truncate">{milestone.label}</div>
                  {milestone.achieved ? (
                    <div className="text-xs text-amber-500 mt-1">Achieved!</div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">
                      {milestone.current}/{milestone.target}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Streak Tips */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Flame className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Streak Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Do a quick check-in every morning to maintain your streak</li>
                <li>• Even 15 minutes of focus counts toward your focus streak</li>
                <li>• Daily reflections help you stay accountable and mindful</li>
                <li>• Set a reminder to keep your streaks going!</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}