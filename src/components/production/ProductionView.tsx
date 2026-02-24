"use client";

import { useStore } from "@/store/useStore";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Calendar,
  GitBranch,
  Code2,
  Clock,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  Bot,
  Wrench,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Package,
  Layers,
  Timer,
} from "lucide-react";
import type { UserStory } from "@/types";

// Simulated timeline: each story starts on a staggered date
function generateGanttData(stories: UserStory[]) {
  const today = new Date();
  let currentDate = new Date(today);

  return stories.map((story, i) => {
    const points = story.storyPoints || 3;
    // Full AI stories take ~40% of the time
    const daysNeeded =
      story.productionMode === "full-ai"
        ? Math.ceil(points * 0.5)
        : Math.ceil(points * 1.2);

    const start = new Date(currentDate);
    const end = new Date(currentDate);
    end.setDate(end.getDate() + daysNeeded);

    // Overlap a little with next story
    currentDate.setDate(currentDate.getDate() + Math.max(1, daysNeeded - 1));

    return {
      ...story,
      ganttStart: start,
      ganttEnd: end,
      daysNeeded,
    };
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function ProductionView() {
  const capsule = useStore((s) => s.capsule);
  const stories = useStore((s) => s.stories);
  const setAppPhase = useStore((s) => s.setAppPhase);
  const updateStoryInList = useStore((s) => s.updateStoryInList);

  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"gantt" | "list">("gantt");

  // Use capsule stories or fallback to store stories
  const activeStories = capsule?.stories || stories;

  const ganttData = useMemo(() => generateGanttData(activeStories), [activeStories]);

  const totalPoints = activeStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  const totalLoc = activeStories.reduce((sum, s) => sum + s.linesOfCode, 0);
  const doneCount = activeStories.filter((s) => s.productionStatus === "done").length;
  const completionPercent =
    activeStories.length > 0 ? Math.round((doneCount / activeStories.length) * 100) : 0;
  const fullAiStories = activeStories.filter((s) => s.productionMode === "full-ai");
  const engineerStories = activeStories.filter((s) => s.productionMode === "engineer-ai");

  // Timeline range
  const timelineStart = ganttData.length > 0 ? ganttData[0].ganttStart : new Date();
  const timelineEnd =
    ganttData.length > 0
      ? ganttData.reduce((max, s) => (s.ganttEnd > max ? s.ganttEnd : max), ganttData[0].ganttEnd)
      : new Date();
  const totalDays = Math.max(1, daysBetween(timelineStart, timelineEnd));

  // Auto-calculated deadline
  const deadline = timelineEnd;

  const statusColors: Record<string, { bg: string; text: string; icon: typeof Circle }> = {
    backlog: { bg: "bg-gray-100", text: "text-gray-500", icon: Circle },
    planned: { bg: "bg-blue-50", text: "text-blue-600", icon: Clock },
    "in-progress": { bg: "bg-amber-50", text: "text-amber-600", icon: Play },
    review: { bg: "bg-purple-50", text: "text-purple-600", icon: Pause },
    done: { bg: "bg-green-50", text: "text-green-600", icon: CheckCircle2 },
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Rocket className="w-3.5 h-3.5" />
              {capsule?.name || "Production"}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Séquencement et suivi de production
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewTab("gantt")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewTab === "gantt" ? "bg-white shadow-sm" : "text-muted-foreground"
              }`}
            >
              Gantt
            </button>
            <button
              onClick={() => setViewTab("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewTab === "list" ? "bg-white shadow-sm" : "text-muted-foreground"
              }`}
            >
              Liste
            </button>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <KpiCard
            icon={<Layers className="w-3.5 h-3.5" />}
            label="User Stories"
            value={String(activeStories.length)}
            sub={`${totalPoints} pts · ${totalLoc.toLocaleString()} LOC`}
          />
          <KpiCard
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            label="Avancement"
            value={`${completionPercent}%`}
            sub={`${doneCount}/${activeStories.length} terminées`}
            highlight
          />
          <KpiCard
            icon={<Timer className="w-3.5 h-3.5" />}
            label="Deadline"
            value={formatDate(deadline)}
            sub={`${totalDays}j · ${capsule?.releases?.length || 1} release(s)`}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {viewTab === "gantt" ? (
          <GanttView
            ganttData={ganttData}
            timelineStart={timelineStart}
            totalDays={totalDays}
            statusColors={statusColors}
          />
        ) : (
          <ListView
            stories={activeStories}
            fullAiStories={fullAiStories}
            engineerStories={engineerStories}
            statusColors={statusColors}
          />
        )}
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 border-t border-border-light">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">
            Progression globale
          </span>
          <span className="text-xs font-semibold">{completionPercent}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-foreground rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3 h-3 text-violet-600" />
              <span className="text-[10px] text-muted-foreground">
                {fullAiStories.length} Full IA — auto-produites &amp; revues par un architecte
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wrench className="w-3 h-3 text-amber-600" />
              <span className="text-[10px] text-muted-foreground">
                {engineerStories.length} Engineer + IA — conçues par experts
              </span>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">
            Deadline: {formatDate(deadline)}
          </span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        highlight ? "bg-foreground text-white border-foreground" : "bg-white border-border-light"
      }`}
    >
      <div className={`flex items-center gap-1.5 mb-1 ${highlight ? "text-white/60" : "text-muted-foreground"}`}>
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className={`text-[10px] mt-0.5 ${highlight ? "text-white/50" : "text-muted-foreground"}`}>{sub}</p>
    </div>
  );
}

function GanttView({
  ganttData,
  timelineStart,
  totalDays,
  statusColors,
}: {
  ganttData: ReturnType<typeof generateGanttData>;
  timelineStart: Date;
  totalDays: number;
  statusColors: Record<string, { bg: string; text: string; icon: typeof Circle }>;
}) {
  // Generate day markers
  const dayMarkers: { day: number; date: Date }[] = [];
  for (let i = 0; i <= totalDays; i += Math.max(1, Math.floor(totalDays / 10))) {
    const d = new Date(timelineStart);
    d.setDate(d.getDate() + i);
    dayMarkers.push({ day: i, date: d });
  }

  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      <div className="min-w-[600px] p-4">
        {/* Timeline header */}
        <div className="flex items-center h-8 mb-2 ml-[180px] relative border-b border-border-light">
          {dayMarkers.map((marker) => (
            <div
              key={marker.day}
              className="absolute text-[9px] text-muted-foreground font-mono"
              style={{ left: `${(marker.day / totalDays) * 100}%` }}
            >
              <div className="w-px h-3 bg-border-light mb-0.5" />
              {formatDate(marker.date)}
            </div>
          ))}
        </div>

        {/* Gantt rows */}
        <div className="space-y-1.5">
          {ganttData.map((story, i) => {
            const startOffset = daysBetween(timelineStart, story.ganttStart);
            const duration = story.daysNeeded;
            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = (duration / totalDays) * 100;
            const isFullAi = story.productionMode === "full-ai";
            const status = statusColors[story.productionStatus] || statusColors.backlog;
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center h-10 group"
              >
                {/* Label */}
                <div className="w-[220px] flex-shrink-0 flex items-center gap-2 pr-3">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                      isFullAi ? "bg-violet-50" : "bg-amber-50"
                    }`}
                  >
                    {isFullAi ? (
                      <Bot className="w-3 h-3 text-violet-600" />
                    ) : (
                      <Wrench className="w-3 h-3 text-amber-600" />
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">
                    {story.title || "Sans titre"}
                  </span>
                </div>

                {/* Bar area */}
                <div className="flex-1 relative h-full">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex">
                    {dayMarkers.map((m) => (
                      <div
                        key={m.day}
                        className="absolute top-0 bottom-0 w-px bg-border-light/50"
                        style={{ left: `${(m.day / totalDays) * 100}%` }}
                      />
                    ))}
                  </div>

                  {/* Bar */}
                  <motion.div
                    className={`absolute top-1.5 h-7 rounded-lg flex items-center px-2 gap-1.5 cursor-pointer transition-all hover:shadow-sm ${
                      isFullAi
                        ? "bg-violet-100 border border-violet-200"
                        : "bg-amber-100 border border-amber-200"
                    }`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 3)}%`,
                    }}
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.05 + 0.2, duration: 0.4 }}
                  >
                    <StatusIcon className={`w-3 h-3 flex-shrink-0 ${status.text}`} />
                    <span className="text-[10px] font-medium truncate">
                      {story.storyPoints || "?"}pts
                    </span>
                    {story.completionPercent > 0 && (
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        {story.completionPercent}%
                      </span>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Today marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
          style={{ left: `calc(220px + 0%)` }}
        />
      </div>
    </div>
  );
}

function ListView({
  stories,
  fullAiStories,
  engineerStories,
  statusColors,
}: {
  stories: UserStory[];
  fullAiStories: UserStory[];
  engineerStories: UserStory[];
  statusColors: Record<string, { bg: string; text: string; icon: typeof Circle }>;
}) {
  const [expandAi, setExpandAi] = useState(true);
  const [expandEngineer, setExpandEngineer] = useState(true);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
      {/* Full AI Section */}
      <div>
        <button
          onClick={() => setExpandAi(!expandAi)}
          className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {expandAi ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <Bot className="w-3.5 h-3.5 text-violet-600" />
          Full IA — Auto-produites &amp; revues par un architecte
          <span className="tag text-[10px] ml-1">{fullAiStories.length}</span>
        </button>
        <AnimatePresence>
          {expandAi && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-1.5 ml-5"
            >
              {fullAiStories.map((story) => (
                <StoryListItem key={story.id} story={story} statusColors={statusColors} />
              ))}
              {fullAiStories.length === 0 && (
                <p className="text-xs text-muted-foreground/50 py-2">Aucune US Full IA</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Engineer Section */}
      <div>
        <button
          onClick={() => setExpandEngineer(!expandEngineer)}
          className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {expandEngineer ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <Wrench className="w-3.5 h-3.5 text-amber-600" />
          Engineer + IA — Conçues par nos experts
          <span className="tag text-[10px] ml-1">{engineerStories.length}</span>
        </button>
        <AnimatePresence>
          {expandEngineer && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-1.5 ml-5"
            >
              {engineerStories.map((story) => (
                <StoryListItem key={story.id} story={story} statusColors={statusColors} />
              ))}
              {engineerStories.length === 0 && (
                <p className="text-xs text-muted-foreground/50 py-2">Aucune US Engineer + IA</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StoryListItem({
  story,
  statusColors,
}: {
  story: UserStory;
  statusColors: Record<string, { bg: string; text: string; icon: typeof Circle }>;
}) {
  const status = statusColors[story.productionStatus] || statusColors.backlog;
  const StatusIcon = status.icon;
  const isFullAi = story.productionMode === "full-ai";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border-light hover:shadow-sm transition-all group">
      <div className={`p-1 rounded-md ${status.bg}`}>
        <StatusIcon className={`w-3.5 h-3.5 ${status.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{story.title || "Sans titre"}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
          <span>{story.storyPoints || "?"} pts</span>
          {story.jiraKey && (
            <>
              <span>&middot;</span>
              <span className="font-mono">{story.jiraKey}</span>
            </>
          )}
          {story.gitBranch && (
            <>
              <span>&middot;</span>
              <span className="flex items-center gap-0.5">
                <GitBranch className="w-2.5 h-2.5" />
                {story.gitBranch}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {story.linesOfCode > 0 && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Code2 className="w-3 h-3" />
            {story.linesOfCode.toLocaleString()}
          </span>
        )}
        <div className="w-16">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isFullAi ? "bg-violet-400" : "bg-amber-400"}`}
              style={{ width: `${story.completionPercent}%` }}
            />
          </div>
          <p className="text-[9px] text-muted-foreground text-right mt-0.5">
            {story.completionPercent}%
          </p>
        </div>
      </div>
    </div>
  );
}
