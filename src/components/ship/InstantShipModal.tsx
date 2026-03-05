"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
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
  TrendingUp,
} from "lucide-react";
import type { UserStory } from "@/types";
import {
  computeInstantPhases,
  computeConfidenceDates,
  computePhaseCapacity,
  formatDateFull,
  addWorkingDays,
  INSTANT_PHASE_COLORS,
} from "@/components/release/releaseUtils";

interface InstantShipModalProps {
  stories: UserStory[];
  onConfirm: (buildDate: string, buildTime: string, mepDate: string) => void;
  onClose: () => void;
}

export function InstantShipModal({ stories, onConfirm, onClose }: InstantShipModalProps) {
  const projectConfig = useStore((s) => s.projectConfig);
  const teamMembers = useStore((s) => s.teamMembers);

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

  // Team capacity info
  const capacityInfo = useMemo(
    () => computePhaseCapacity(teamMembers),
    [teamMembers]
  );

  // Compute phases using the capacity-driven engine
  const computed = useMemo(() => {
    const start = new Date(`${buildDate}T${buildTime}`);
    const phases = computeInstantPhases(totalSP, start, teamMembers, projectConfig);
    const totalDays = phases.reduce((s, p) => s + p.durationDays, 0);
    const endDate = phases[phases.length - 1].endDate;
    const mepDate = new Date(endDate);
    const confidenceDates = computeConfidenceDates(mepDate, totalDays, projectConfig);

    return { phases, totalDays, mepDate, confidenceDates };
  }, [buildDate, buildTime, totalSP, teamMembers, projectConfig]);

  // User can override the desired MEP date
  const defaultMepStr = computed.mepDate.toISOString().split("T")[0];
  const [mepDate, setMepDate] = useState(defaultMepStr);

  // Recalculate if MEP date differs from auto
  const mepAdjusted = useMemo(() => {
    const autoMep = computed.mepDate.toISOString().split("T")[0];
    if (mepDate === autoMep) return null;

    const desiredMep = new Date(mepDate);
    const diffDays = Math.round((desiredMep.getTime() - computed.mepDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return { status: "extended" as const, days: diffDays };
    } else if (diffDays < 0) {
      return { status: "compressed" as const, days: Math.abs(diffDays) };
    }
    return null;
  }, [mepDate, computed.mepDate]);

  // Update default MEP when phases change
  useMemo(() => {
    const newDefault = computed.mepDate.toISOString().split("T")[0];
    if (mepDate === defaultMepStr || mepDate < buildDate) {
      setMepDate(newDefault);
    }
  }, [computed.mepDate]);

  const handleConfirm = () => {
    onConfirm(buildDate, buildTime, mepDate);
  };

  const phaseIcons: Record<string, typeof Hammer> = {
    Build: Hammer,
    Review: Eye,
    Recette: MessageSquare,
  };

  const phaseFormulas: Record<string, string> = {
    Build: `${totalSP} SP × 0.3 = ${computed.phases[0]?.durationDays ?? 0}j`,
    Review: `${totalSP} SP × 0.1 / ${projectConfig.hoursPerDay}h = ${computed.phases[1]?.durationDays ?? 0}j`,
    Recette: `${totalSP} SP × 0.15 / ${capacityInfo.qaCapacity.toFixed(1)} QA = ${computed.phases[2]?.durationDays ?? 0}j`,
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
          className="bg-white rounded-2xl shadow-xl border border-border-light w-[540px] max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light bg-violet-50/30">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold">Planifier l&apos;Instant Release</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {stories.length} US · {totalSP} SP · Capacité QA : {capacityInfo.qaCapacity.toFixed(1)} SP/j
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
                  Calculé auto : {formatDateFull(computed.mepDate)}
                </p>
              </div>
            </div>

            {/* Timeline preview */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Planning auto-calculé
              </p>

              <div className="space-y-2">
                {computed.phases.map((phase, i) => {
                  const Icon = phaseIcons[phase.name] || Hammer;
                  const formula = phaseFormulas[phase.name] || "";
                  return (
                    <div
                      key={phase.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                      style={{
                        backgroundColor: `${phase.color}08`,
                        borderColor: `${phase.color}25`,
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: phase.color }}
                      >
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold">{phase.name}</span>
                          <span className="text-[10px] text-violet-500 font-medium">
                            {phase.durationDays}j
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDateFull(new Date(phase.startDate))}
                          <ArrowRight className="w-2.5 h-2.5 inline mx-1" />
                          {formatDateFull(new Date(phase.endDate))}
                        </p>
                      </div>
                      <span className="text-[9px] font-medium text-violet-400 bg-violet-100/50 px-2 py-0.5 rounded">
                        {formula}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Total summary */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
                <span className="text-[11px] text-muted-foreground">
                  Durée totale estimée
                </span>
                <span className="text-sm font-bold">
                  {computed.totalDays} jours ouvrés
                </span>
              </div>
            </div>

            {/* Confidence dates */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <TrendingUp className="w-3 h-3" />
                Intervalle de confiance
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-[9px] font-semibold text-emerald-600 uppercase">Optimiste</p>
                  <p className="text-[12px] font-bold text-emerald-700 mt-0.5">
                    {formatDateFull(new Date(computed.confidenceDates.optimistic))}
                  </p>
                  <p className="text-[9px] text-emerald-500">×0.8</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-center">
                  <p className="text-[9px] font-semibold text-blue-600 uppercase">Réaliste</p>
                  <p className="text-[12px] font-bold text-blue-700 mt-0.5">
                    {formatDateFull(new Date(computed.confidenceDates.realistic))}
                  </p>
                  <p className="text-[9px] text-blue-500">×1.0</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-center">
                  <p className="text-[9px] font-semibold text-amber-600 uppercase">Pessimiste</p>
                  <p className="text-[12px] font-bold text-amber-700 mt-0.5">
                    {formatDateFull(new Date(computed.confidenceDates.pessimistic))}
                  </p>
                  <p className="text-[9px] text-amber-500">×1.4</p>
                </div>
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
