"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/types/database";

interface PersonalResultsDashboardProps {
  leaderboard: LeaderboardEntry[];
  voterName?: string;
}

const chartConfig = {
  net_score: {
    label: "Net Score",
  },
  win_points: {
    label: "Win Points",
    color: "hsl(var(--chart-1))",
  },
  loss_points: {
    label: "Loss Points",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function PersonalResultsDashboard({
  leaderboard,
  voterName = "Your",
}: PersonalResultsDashboardProps) {
  const maxScore = Math.max(
    ...leaderboard.map((entry) => Math.abs(entry.net_score)),
    1
  );

  return (
    <div className="space-y-8">
      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            {voterName}&apos;s Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No votes yet.
            </p>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <PersonalLeaderboardRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  maxScore={maxScore}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horizontal Bar Chart */}
      {leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Net Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leaderboard}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                >
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={70}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="net_score" radius={[0, 4, 4, 0]}>
                    {leaderboard.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={entry.net_score >= 0 ? COLORS[0] : COLORS[1]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface PersonalLeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
  maxScore: number;
}

function PersonalLeaderboardRow({ entry, index, maxScore }: PersonalLeaderboardRowProps) {
  const percentage = Math.abs(entry.net_score / maxScore) * 100;
  const isPositive = entry.net_score >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center gap-4"
    >
      {/* Rank badge */}
      <div className="w-8 flex justify-center">
        {entry.rank === 1 ? (
          <Badge className="bg-amber-500 text-white">1st</Badge>
        ) : entry.rank === 2 ? (
          <Badge className="bg-slate-400 text-white">2nd</Badge>
        ) : entry.rank === 3 ? (
          <Badge className="bg-amber-700 text-white">3rd</Badge>
        ) : (
          <span className="text-muted-foreground font-medium">
            {entry.rank}
          </span>
        )}
      </div>

      {/* Name and score bar */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium">{entry.name}</span>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : entry.net_score < 0 ? (
              <TrendingDown className="w-4 h-4 text-rose-500" />
            ) : (
              <Minus className="w-4 h-4 text-slate-400" />
            )}
            <span
              className={`font-bold ${
                isPositive
                  ? "text-emerald-500"
                  : entry.net_score < 0
                    ? "text-rose-500"
                    : "text-slate-400"
              }`}
            >
              {entry.net_score > 0 ? "+" : ""}
              {entry.net_score}
            </span>
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`h-full rounded-full ${
              isPositive ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Win Points: +{entry.win_points}</span>
          <span>Loss Points: -{entry.loss_points}</span>
        </div>
      </div>
    </motion.div>
  );
}
