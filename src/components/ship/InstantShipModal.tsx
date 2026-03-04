"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Zap,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Hammer,
  Eye,
  MessageSquare,
} from "lucide-react";
import type { UserStory } from "@/types";
import { addWorkingDays, formatDateFull, INSTANT_PHASE_COLORS } from "@/components/release/releaseUtils";

interface InstantShipModalProps {
  stories: UserStory[];
  onConfirm: (buildDate: string, buildTime: string, mepDate: string) => void;
  onClose: () => void;
}

export function InstantShipModal({ stories, onConfirm, onClose }: InstantShipModalProps) {
  // Default build: now
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [buildDate, setBuildDate] = useState(todayStr);
  const [buildTime, setBuildTime] = useState(nowTime);

  // Total story points
  const totalSP = useMemo(
    () => stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0),
    [stories]
  );

  // Auto-computed phases based on build date + volume
  const phases = useMemo(() => {
    const start = new Date(`${buildDate}T${buildTime}`);

    // Build: instantaneous for instant ship, but we model it as SP * 0.3 days (min 1)
    const buildDays = Math.max(1, Math.round(totalSP * 0.3));

    // Review technique: always 1 day
    const reviewDays = 1;

    // Recette & retours: auto-calculated based on volume
    // Base: 1 day for small releases, scales with SP
    const recetteDays = Math.max(1, Math.round(totalSP * 0.15));

    const buildStart = new Date(start);
    const buildEnd = addWorkingDays(buildStart, buildDays);

    const reviewStart = new Date(buildEnd);
    const reviewEnd = addWorkingDays(reviewStart, reviewDays);

    const recetteStart = new Date(reviewEnd);
    const recetteEnd = addWorkingDays(recetteStart, recetteDays);

    return {
      build: { start: buildStart, end: buildEnd, days: buildDays },
      review: { start: reviewStart, end: reviewEnd, days: reviewDays },
      recette: { start: recetteStart, end: recetteEnd, days: recetteDays },
      mepDate: recetteEnd,
      totalDays: buildDays + reviewDays + recetteDays,
    };
  }, [buildDate, buildTime, totalSP]);

  // User can override the desired MEP date
  const defaultMepStr = phases.mepDate.toISOString().split("T")[0];
  const [mepDate, setMepDate] = useState(defaultMepStr);

  // Recalculate if MEP date differs from auto
  const mepAdjusted = useMemo(() => {
    const autoMep = phases.mepDate.toISOString().split("T")[0];
    if (mepDate === autoMep) return null;

    const desiredMep = new Date(mepDate);
    const autoMepDate = phases.mepDate;
    const diffDays = Math.round((desiredMep.getTime() - autoMepDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return { status: "extended" as const, days: diffDays };
    } else if (diffDays < 0) {
      return { status: "compressed" as const, days: Math.abs(diffDays) };
    }
    return null;
  }, [mepDate, phases.mepDate]);

  // Update default MEP when phases change
  useMemo(() => {
    const newDefault = phases.mepDate.toISOString().split("T")[0];
    if (mepDate === defaultMepStr || mepDate < buildDate) {
      setMepDate(newDefault);
    }
  }, [phases.mepDate]);

  const handleConfirm = () => {
    onConfirm(buildDate, buildTime, mepDate);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-white rounded-2xl shadow-xl border border-border-light w-[520px] max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light bg-violet-50/30">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold">Planifier l&apos;Instant Release</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {stories.length} US · {totalSP} story points
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Date inputs */}
            <div className="grid grid-cols-2 gap-4">
              {/* Build date & time */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3 h-3" />
                  Date du Build
                </label>
                <input
                  type="date"
                  value={buildDate}
                  onChange={(e) => setBuildDate(e.target.value)}
                  min={todayStr}
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all"
                />
                <div className="mt-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3 h-3" />
                    Heure
                  </label>
                  <input
                    type="time"
                    value={buildTime}
                    onChange={(e) => setBuildTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-light bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all"
                  />
                </div>
              </div>

              {/* Desired MEP date */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3 h-3" />
                  Date souhaitée de MEP
                </label>
                <input
                  type="date"
                  value={mepDate}
                  onChange={(e) => setMepDate(e.target.value)}
                  min={buildDate}
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all"
                />
                {mepAdjusted && (
                  <p className={`text-[10px] mt-1.5 font-medium flex items-center gap-1 ${
                    mepAdjusted.status === "compressed" ? "text-amber-600" : "text-green-600"
                  }`}>
                    {mepAdjusted.status === "compressed" ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        {mepAdjusted.days}j plus tôt que le calcul auto
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        {mepAdjusted.days}j de marge ajoutée
                      </>
                    )}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  Calculé auto : {formatDateFull(phases.mepDate)}
                </p>
              </div>
            </div>

            {/* Timeline preview */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Planning auto-calculé
              </p>

              <div className="space-y-2">
                {/* Build phase */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-50/50 border border-violet-100">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: INSTANT_PHASE_COLORS.Build }}
                  >
                    <Hammer className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold">Build</span>
                      <span className="text-[10px] text-violet-500 font-medium">
                        {phases.build.days}j
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateFull(phases.build.start)}
                      <ArrowRight className="w-2.5 h-2.5 inline mx-1" />
                      {formatDateFull(phases.build.end)}
                    </p>
                  </div>
                  <span className="text-[9px] font-medium text-violet-400 bg-violet-100 px-2 py-0.5 rounded">
                    {totalSP} × 0.3 = {phases.build.days}j
                  </span>
                </div>

                {/* Review phase */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-50/30 border border-violet-100/60">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: INSTANT_PHASE_COLORS.Review }}
                  >
                    <Eye className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold">Review Technique</span>
                      <span className="text-[10px] text-violet-500 font-medium">
                        {phases.review.days}j
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateFull(phases.review.start)}
                      <ArrowRight className="w-2.5 h-2.5 inline mx-1" />
                      {formatDateFull(phases.review.end)}
                    </p>
                  </div>
                  <span className="text-[9px] font-medium text-violet-400 bg-violet-100/60 px-2 py-0.5 rounded">
                    Fixe 1j
                  </span>
                </div>

                {/* Recette phase */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-50/20 border border-violet-100/40">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: INSTANT_PHASE_COLORS.Deploy }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold">Recette & Retours</span>
                      <span className="text-[10px] text-violet-500 font-medium">
                        {phases.recette.days}j
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateFull(phases.recette.start)}
                      <ArrowRight className="w-2.5 h-2.5 inline mx-1" />
                      {formatDateFull(phases.recette.end)}
                    </p>
                  </div>
                  <span className="text-[9px] font-medium text-violet-400 bg-violet-100/40 px-2 py-0.5 rounded">
                    {totalSP} × 0.15 = {phases.recette.days}j
                  </span>
                </div>
              </div>

              {/* Total summary */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
                <span className="text-[11px] text-muted-foreground">
                  Durée totale estimée
                </span>
                <span className="text-sm font-bold">
                  {phases.totalDays} jours ouvrés
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-light bg-muted/20">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              Lancer le Build
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
