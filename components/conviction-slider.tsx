"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ConvictionSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const convictionLabels: Record<number, string> = {
  0: "Toss-up",
  1: "Slight edge",
  2: "Slight edge",
  3: "Mild preference",
  4: "Mild preference",
  5: "Moderate",
  6: "Moderate",
  7: "Strong",
  8: "Strong",
  9: "Very strong",
  10: "Absolute",
};

const getConvictionColor = (value: number): string => {
  if (value <= 2) return "text-slate-400";
  if (value <= 4) return "text-blue-400";
  if (value <= 6) return "text-emerald-400";
  if (value <= 8) return "text-orange-400";
  return "text-rose-400";
};

const getBarColor = (value: number): string => {
  if (value <= 2) return "bg-slate-400";
  if (value <= 4) return "bg-blue-400";
  if (value <= 6) return "bg-emerald-400";
  if (value <= 8) return "bg-orange-400";
  return "bg-rose-400";
};

export function ConvictionSlider({
  value,
  onChange,
  disabled = false,
}: ConvictionSliderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Conviction Level</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn("text-lg font-bold", getConvictionColor(value))}
          >
            {value} — {convictionLabels[value]}
          </motion.span>
        </AnimatePresence>
      </div>

      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={0}
        max={10}
        step={1}
        disabled={disabled}
        className="w-full"
      />

      {/* Visual conviction bar */}
      <div className="flex gap-1 h-3">
        {Array.from({ length: 11 }).map((_, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              scale: i <= value ? 1 : 0.8,
              opacity: i <= value ? 1 : 0.3,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "flex-1 rounded-sm transition-colors",
              i <= value ? getBarColor(value) : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Neutral</span>
        <span>Absolute Conviction</span>
      </div>
    </div>
  );
}
