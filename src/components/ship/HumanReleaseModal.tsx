"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  Calendar,
  ArrowRight,
  AlertTriangle,
  Code2,
  TestTubes,
  ClipboardCheck,
  Rocket,
  TrendingUp,
} from "lucide-react";
import type { UserStory } from "@/types";
import {
  computeHumanPhasesRetro,
  computeConfidenceDates,
  computePhaseCapacity,
  formatDateFull,
  HUMAN_PHASE_COLORS,
} from "@/components/release/releaseUtils";

interface HumanReleaseModalProps {
  stories: UserStory[];
  onConfirm: (mepDeadline: string) => void;
  onClose: () => void;
}

export function HumanReleaseModal({ stories, onConfirm, onClose }: HumanReleaseModalProps) {
  const projectConfig = useStore((s) => s.projectConfig);
  const teamMembers = useStore((s) => s.teamMembers);

  // Default MEP: 4 weeks from now
  const defaultMep = new Date();
  defaultMep.setDate(defaultMep.getDate() + 28);
  const defaultMepStr = defaultMep.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const [mepDate, setMepDate] = useState(defaultMepStr);

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

  // Compute retro-planned phases from MEP deadline
  const computed = useMemo(() => {
    const deadline = new Date(mepDate);
    const result = computeHumanPhasesRetro(totalSP, deadline, teamMembers, projectConfig);
    const totalDays = result.phases.reduce((s, p) => s + p.durationDays, 0);
    const endDate = result.phases[result.phases.length - 1].endDate;
    const confidenceDates = computeConfidenceDates(new Date(endDate), totalDays, projectConfig);

    return {
      ...result,
      totalDays,
      confidenceDates,
    };
  }, [mepDate, totalSP, teamMembers, projectConfig]);

  const handleConfirm = () => {
    onConfirm(mepDate);
  };

  const phaseIcons: { [key: string]: typeof Code2 } = {
    Dev: Code2,
    Testing: TestTubes,
    Recette: ClipboardCheck,
    MEP: Rocket,
  };

  const phaseDescriptions: { [key: string]: string } = {
    Dev: "Développement par l'équipe",
    Testing: "Tests QA internes",
    Recette: "Validation client",
    MEP: "Mise en production",
  };

  // Phase formulas for display
  const phaseFormulas: { [key: string]: string } = useMemo(() => {
    const devPhase = computed.phases.find((p) => p.name === "Dev");
    const testingPhase = computed.phases.find((p) => p.name === "Testing");
    const recettePhase = computed.phases.find((p) => p.name === "Recette");

    return {
      Dev: `${totalSP} SP / ${capacityInfo.devCapacity.toFixed(1)} SP/j = ${devPhase?.durationDays ?? 0}j`,
      Testing: `${totalSP} × ${projectConfig.testingRatio} / ${capacityInfo.qaCapacity.toFixed(1)} = ${testingPhase?.durationDays ?? 0}j`,
      Recette: `${devPhase?.durationDays ?? 0}j × ${projectConfig.recetteRatio} = ${recettePhase?.durationDays ?? 0}j (min 2j)`,
      MEP: "Fixe 1j",
    };
  }, [computed.phases, totalSP, capacityInfo, projectConfig]);

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
          className="bg-white rounded-2xl shadow-xl border border-border-light w-[560px] max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light bg-amber-50/30">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold">Planifier la Release Human</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {stories.length} US · {totalSP} SP · Dev : {capacityInfo.devCapacity.toFixed(1)} SP/j · QA : {capacityInfo.qaCapacity.toFixed(1)} SP/j
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
            {/* MEP date input */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Calendar className="w-3 h-3" />
                Date de mise en production (MEP)
              </label>
              <input
                type="date"
                value={mepDate}
                onChange={(e) => setMepDate(e.target.value)}
                min={todayStr}
                className="w-full px-3 py-2 rounded-lg border border-border-light bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Le planning sera rétro-calculé à partir de cette date.
              </p>
            </div>

            {/* Alert if dev start is in the past */}
            {computed.alertPast && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-red-700">
                    Date de début dans le passé !
                  </p>
                  <p className="text-[11px] text-red-600 mt-0.5">
                    Le développement devrait commencer le{" "}
                    {formatDateFull(computed.devStartDate)} pour respecter cette deadline.
                    Repoussez la date de MEP ou augmentez la capacité de l&apos;équipe.
                  </p>
                </div>
              </div>
            )}

            {/* Retro-planned timeline */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Rétro-planning
              </p>

              <div className="space-y-2">
                {computed.phases.map((phase) => {
                  const Icon = phaseIcons[phase.name] || Code2;
                  const desc = phaseDescriptions[phase.name] || "";
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold">{phase.name}</span>
                          <span className="text-[10px] text-amber-500 font-medium">
                            {phase.durationDays}j
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {desc}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDateFull(new Date(phase.startDate))}
                          <ArrowRight className="w-2.5 h-2.5 inline mx-1" />
                          {formatDateFull(new Date(phase.endDate))}
                        </p>
                      </div>
                      <span className="text-[9px] font-medium text-amber-400 bg-amber-100/50 px-2 py-0.5 rounded flex-shrink-0">
                        {formula}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Total summary */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
                <div>
                  <span className="text-[11px] text-muted-foreground">Durée totale</span>
                  <span className="text-[11px] text-muted-foreground ml-2">
                    (début dev : {formatDateFull(computed.devStartDate)})
                  </span>
                </div>
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
              disabled={computed.alertPast}
              className={`px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors ${
                computed.alertPast
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Créer la Release
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
