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
import type { LeaderboardEntry, PairConsensus } from "@/lib/types/database";

interface ResultsDashboardProps {
  leaderboard: LeaderboardEntry[];
  consensus: PairConsensus[];
}

const chartConfig = {
  net_score: {
    label: "Avg Net Score",
  },
  win_points: {
    label: "Avg Win Points",
    color: "hsl(var(--chart-1))",
  },
  loss_points: {
    label: "Avg Loss Points",
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

export function ResultsDashboard({
  leaderboard,
  consensus,
}: ResultsDashboardProps) {
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
            Global Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No votes yet. Be the first to cast your vote!
            </p>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <LeaderboardRow
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

      {/* Consensus Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Pair Consensus</CardTitle>
          <p className="text-sm text-muted-foreground">
            Shows which matchups had the strongest agreement
          </p>
        </CardHeader>
        <CardContent>
          {consensus.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No consensus data available yet.
            </p>
          ) : (
            <div className="space-y-3">
              {consensus.slice(0, 10).map((pair, index) => (
                <ConsensusRow key={pair.pair_hash} pair={pair} index={index} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
  maxScore: number;
}

function LeaderboardRow({ entry, index, maxScore }: LeaderboardRowProps) {
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
          <span>
            Avg Win Points: +{entry.win_points}
          </span>
          <span>
            Avg Loss Points: -{entry.loss_points}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

interface ConsensusRowProps {
  pair: PairConsensus;
  index: number;
}

function ConsensusRow({ pair, index }: ConsensusRowProps) {
  const avgDisplay = pair.avg_conviction >= 0
    ? `+${pair.avg_conviction.toFixed(1)}`
    : pair.avg_conviction.toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{pair.option_a}</span>
        <span className="text-xs text-muted-foreground">vs</span>
        <span className="text-muted-foreground">{pair.option_b}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-medium text-primary">{pair.winner_name}</span>
        <Badge variant="outline">
          Avg: {avgDisplay}
        </Badge>
        <Badge variant="secondary">{pair.win_percentage}% win</Badge>
      </div>
    </motion.div>
  );
}
