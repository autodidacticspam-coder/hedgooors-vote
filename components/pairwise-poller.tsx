"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConvictionSlider } from "@/components/conviction-slider";
import { generateAllPairs, shuffleArray, type Pair } from "@/lib/pairs";
import { submitVote, markPollCompleted } from "@/app/actions/votes";
import { CheckCircle2, ArrowRight, Loader2, Trophy } from "lucide-react";
import type { Option, Vote } from "@/lib/types/database";
import Link from "next/link";

interface PairwisePollerProps {
  options: Option[];
  existingVotes: Vote[];
  pollId?: string;
  pollTitle?: string;
}

export function PairwisePoller({ options, existingVotes, pollId, pollTitle }: PairwisePollerProps) {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [conviction, setConviction] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  const [completedCount, setCompletedCount] = useState(0);
  const initialized = useRef(false);

  // Initialize pairs ONLY once on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const votedHashes = new Set(existingVotes.map((v) => v.pair_hash));
    const allPairs = generateAllPairs(options);
    const unvotedPairs = allPairs.filter((p) => !votedHashes.has(p.pairHash));
    setPairs(shuffleArray(unvotedPairs));
    setCompletedCount(existingVotes.length);
  }, [options, existingVotes]);

  const currentPair = pairs[currentIndex];
  const totalPairs = generateAllPairs(options).length;
  const progress = ((completedCount + currentIndex) / totalPairs) * 100;

  const handleSelect = useCallback((optionId: string) => {
    setSelectedWinner(optionId);
  }, []);

  const handleSubmit = async () => {
    if (!selectedWinner || !currentPair) return;

    setIsSubmitting(true);

    const winnerId = selectedWinner;
    const loserId =
      selectedWinner === currentPair.optionA.id
        ? currentPair.optionB.id
        : currentPair.optionA.id;

    const result = await submitVote(
      winnerId,
      loserId,
      conviction,
      currentPair.pairHash,
      pollId
    );

    setIsSubmitting(false);

    if (result.error) {
      console.error(result.error);
      return;
    }

    // Move to next pair
    setDirection(1);
    setSelectedWinner(null);
    setConviction(5);
    setCurrentIndex((prev) => prev + 1);
  };

  // Mark poll as completed when all pairs are done
  useEffect(() => {
    if (pollId && pairs.length > 0 && currentIndex >= pairs.length) {
      markPollCompleted(pollId);
    }
  }, [pollId, pairs.length, currentIndex]);

  // All pairs completed
  if (!currentPair || currentIndex >= pairs.length) {
    const resultsHref = pollId ? `/polls/${pollId}/results` : "/results";

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <Trophy className="w-20 h-20 mx-auto text-amber-400 mb-4" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">All Comparisons Complete!</h2>
        <p className="text-muted-foreground mb-6">
          You&apos;ve voted on all {totalPairs} pairs{pollTitle ? ` for "${pollTitle}"` : ""}. Your preferences have been
          recorded.
        </p>
        <Link href={resultsHref}>
          <Button size="lg">
            View Results <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </motion.div>
    );
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Comparison {completedCount + currentIndex + 1} of {totalPairs}
          </span>
          <span className="font-medium">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Pair comparison */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentPair.pairHash}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-lg">
                Which do you prefer?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                <OptionCard
                  option={currentPair.optionA}
                  isSelected={selectedWinner === currentPair.optionA.id}
                  onSelect={() => handleSelect(currentPair.optionA.id)}
                />
                <OptionCard
                  option={currentPair.optionB}
                  isSelected={selectedWinner === currentPair.optionB.id}
                  onSelect={() => handleSelect(currentPair.optionB.id)}
                />
              </div>

              {/* Conviction slider */}
              <AnimatePresence>
                {selectedWinner && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 border-t">
                      <ConvictionSlider
                        value={conviction}
                        onChange={setConviction}
                        disabled={isSubmitting}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={!selectedWinner || isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Vote
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface OptionCardProps {
  option: Option;
  isSelected: boolean;
  onSelect: () => void;
}

function OptionCard({ option, isSelected, onSelect }: OptionCardProps) {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative p-6 rounded-xl border-2 text-left transition-all
        ${
          isSelected
            ? "border-primary bg-primary/5 shadow-lg"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        }
      `}
    >
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-2 -right-2"
          >
            <CheckCircle2 className="w-6 h-6 text-primary fill-primary/20" />
          </motion.div>
        )}
      </AnimatePresence>

      {option.image_url && (
        <div className="w-full h-24 mb-4 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={option.image_url}
            alt={option.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <h3 className="font-semibold text-lg mb-1">{option.name}</h3>
      {option.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {option.description}
        </p>
      )}
    </motion.button>
  );
}
