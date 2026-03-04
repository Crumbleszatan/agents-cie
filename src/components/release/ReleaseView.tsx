"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Clock,
  CheckCircle2,
  TrendingUp,
  CalendarCheck,
  Zap,
  Loader2,
  BarChart3,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { formatDateFull, VELOCITY_PER_SPRINT, SPRINT_DAYS } from "./releaseUtils";
import { ReleaseGantt } from "./ReleaseGantt";

/* ── KPI Card ── */
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-foreground",
  delay = 0,
}: {
  icon: typeof Layers;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white rounded-xl border border-border-light p-3.5 flex items-start gap-3 shadow-sm"
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-lg font-bold leading-tight">{value}</p>
        {sub && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
        )}
      </div>
    </motion.div>
  );
}

export function ReleaseView() {
  const releaseTimelines = useStore((s) => s.releaseTimelines);
  const stories = useStore((s) => s.stories);

  /* ── KPIs computed from timelines ── */
  const kpis = useMemo(() => {
    const total = releaseTimelines.length;
    const instant = releaseTimelines.filter((r) => r.releaseType === "instant");
    const human = releaseTimelines.filter((r) => r.releaseType === "human");
    const inProgress = releaseTimelines.filter((r) => r.status === "in-progress").length;
    const completed = releaseTimelines.filter((r) => r.status === "completed").length;
    const upcoming = releaseTimelines.filter((r) => r.status === "upcoming").length;
    const totalSP = releaseTimelines.reduce((sum, r) => sum + r.totalStoryPoints, 0);

    // Next MEP/Deploy date (earliest endDate of non-completed)
    const activeDates = releaseTimelines
      .filter((r) => r.status !== "completed")
      .map((r) => new Date(r.endDate))
      .sort((a, b) => a.getTime() - b.getTime());
    const nextDelivery = activeDates.length > 0 ? activeDates[0] : null;

    // Velocity estimation
    const sprints = totalSP > 0 ? Math.ceil(totalSP / VELOCITY_PER_SPRINT) : 0;
    const velocity = `${VELOCITY_PER_SPRINT} SP/sprint`;

    return {
      total,
      instantCount: instant.length,
      humanCount: human.length,
      inProgress,
      completed,
      upcoming,
      totalSP,
      nextDelivery,
      sprints,
      velocity,
    };
  }, [releaseTimelines]);

  const isEmpty = releaseTimelines.length === 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── KPI Header ── */}
      <div className="p-4 pb-2">
        <div className="grid grid-cols-6 gap-3">
          <KpiCard
            icon={Layers}
            label="Total Releases"
            value={kpis.total}
            sub={`${kpis.instantCount} instant · ${kpis.humanCount} human`}
            color="text-foreground"
            delay={0}
          />
          <KpiCard
            icon={Loader2}
            label="En cours"
            value={kpis.inProgress}
            sub={`${kpis.upcoming} à venir`}
            color="text-blue-500"
            delay={0.05}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Terminées"
            value={kpis.completed}
            color="text-green-500"
            delay={0.1}
          />
          <KpiCard
            icon={TrendingUp}
            label="Story Points"
            value={kpis.totalSP}
            sub={`${kpis.sprints} sprint${kpis.sprints > 1 ? "s" : ""}`}
            color="text-violet-500"
            delay={0.15}
          />
          <KpiCard
            icon={CalendarCheck}
            label="Prochaine livraison"
            value={kpis.nextDelivery ? formatDateFull(kpis.nextDelivery) : "—"}
            color="text-amber-500"
            delay={0.2}
          />
          <KpiCard
            icon={BarChart3}
            label="Vélocité"
            value={kpis.velocity}
            sub={`${SPRINT_DAYS}j / sprint`}
            color="text-foreground"
            delay={0.25}
          />
        </div>
      </div>

      {/* ── Gantt ── */}
      <div className="flex-1 overflow-hidden px-4 pb-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50">
            <Zap className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium">Aucune release</p>
            <p className="text-xs mt-1">
              Les releases sont créées automatiquement depuis les stories shippées.
            </p>
          </div>
        ) : (
          <ReleaseGantt timelines={releaseTimelines} stories={stories} />
        )}
      </div>
    </div>
  );
}
