"use client";

import { useStore } from "@/store/useStore";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  List,
  Bot,
  Wrench,
  Circle,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  Star,
  Layers,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const statusConfig: Record<string, { label: string; icon: typeof Circle; color: string; bg: string }> = {
  backlog: { label: "Backlog", icon: Circle, color: "text-gray-400", bg: "bg-gray-50" },
  planned: { label: "Planned", icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
  "in-progress": { label: "In Progress", icon: Play, color: "text-amber-500", bg: "bg-amber-50" },
  review: { label: "Review", icon: Pause, color: "text-purple-500", bg: "bg-purple-50" },
  done: { label: "Done", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
};

export function StoryListPanel() {
  const stories = useStore((s) => s.stories);
  const epics = useStore((s) => s.epics);
  const filterEpic = useStore((s) => s.filterEpic);
  const filterStatus = useStore((s) => s.filterStatus);
  const setFilterEpic = useStore((s) => s.setFilterEpic);
  const setFilterStatus = useStore((s) => s.setFilterStatus);
  const selectedStoryId = useStore((s) => s.selectedStoryId);
  const selectStoryForEditing = useStore((s) => s.selectStoryForEditing);

  const [groupByEpic, setGroupByEpic] = useState(false);
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set());

  const toggleEpicCollapse = (epicId: string) => {
    setCollapsedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) next.delete(epicId);
      else next.add(epicId);
      return next;
    });
  };

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      if (filterEpic !== "all" && story.epicId !== filterEpic) return false;
      if (filterStatus !== "all" && story.productionStatus !== filterStatus) return false;
      return true;
    });
  }, [stories, filterEpic, filterStatus]);

  const groupedStories = useMemo(() => {
    if (!groupByEpic) return null;
    const groups: { epic: typeof epics[number] | null; stories: typeof filteredStories }[] = [];
    const epicMap = new Map<string, typeof filteredStories>();
    const noEpic: typeof filteredStories = [];

    for (const story of filteredStories) {
      if (story.epicId) {
        const list = epicMap.get(story.epicId) || [];
        list.push(story);
        epicMap.set(story.epicId, list);
      } else {
        noEpic.push(story);
      }
    }

    // Maintain epic order
    for (const epic of epics) {
      const epicStories = epicMap.get(epic.id);
      if (epicStories && epicStories.length > 0) {
        groups.push({ epic, stories: epicStories });
      }
    }
    if (noEpic.length > 0) {
      groups.push({ epic: null, stories: noEpic });
    }

    return groups;
  }, [groupByEpic, filteredStories, epics]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">User Stories</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setGroupByEpic(!groupByEpic)}
              className={`p-1 rounded-md transition-colors ${
                groupByEpic
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={groupByEpic ? "Vue liste" : "Grouper par Epic"}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] px-2 py-0.5 bg-muted rounded-md text-muted-foreground font-medium">
              {filteredStories.length}/{stories.length}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterEpic}
            onChange={(e) => setFilterEpic(e.target.value)}
            className="flex-1 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-muted border-0 outline-none cursor-pointer text-foreground"
          >
            <option value="all">Tous les Epics</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.title}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-muted border-0 outline-none cursor-pointer text-foreground"
          >
            <option value="all">Tous les statuts</option>
            <option value="backlog">Backlog</option>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      {/* Story List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredStories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <List className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs">Aucune US trouvée</p>
            {(filterEpic !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setFilterEpic("all");
                  setFilterStatus("all");
                }}
                className="text-[11px] text-foreground font-medium mt-1 hover:underline"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : groupByEpic && groupedStories ? (
          <div className="p-2 space-y-1">
            {groupedStories.map((group) => {
              const epicId = group.epic?.id || "__no_epic__";
              const isCollapsed = collapsedEpics.has(epicId);
              const groupPoints = group.stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);

              return (
                <div key={epicId}>
                  {/* Epic header */}
                  <button
                    onClick={() => toggleEpicCollapse(epicId)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    )}
                    {group.epic ? (
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: group.epic.color }}
                      />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-200" />
                    )}
                    <span className="flex-1 text-[11px] font-semibold truncate text-left">
                      {group.epic?.title || "Sans Epic"}
                    </span>
                    <span className="text-[9px] text-muted-foreground flex-shrink-0">
                      {group.stories.length} US · {groupPoints} pts
                    </span>
                  </button>

                  {/* Stories under this epic */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-3 space-y-1 pb-1">
                          {group.stories.map((story, i) => {
                            const isSelected = selectedStoryId === story.id;
                            const isFullAi = story.productionMode === "full-ai";
                            const status = statusConfig[story.productionStatus] || statusConfig.backlog;
                            const StatusIcon = status.icon;

                            return (
                              <motion.button
                                key={story.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.02 }}
                                onClick={() => selectStoryForEditing(story.id)}
                                className={`w-full text-left px-3 py-2 rounded-xl border transition-all group ${
                                  isSelected
                                    ? "bg-foreground/5 border-foreground/20 shadow-sm"
                                    : "bg-white border-border-light hover:border-border hover:shadow-sm"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="flex-1 text-xs font-medium truncate">
                                    {story.storyNumber && (
                                      <span className="text-muted-foreground font-mono mr-1">US-{story.storyNumber}</span>
                                    )}
                                    {story.title || "Sans titre"}
                                  </span>
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
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${status.bg}`}>
                                    <StatusIcon className={`w-2.5 h-2.5 ${status.color}`} />
                                    <span className={`text-[9px] font-medium ${status.color}`}>{status.label}</span>
                                  </div>
                                  {story.storyPoints !== null && (
                                    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                      <Star className="w-2.5 h-2.5" />
                                      {story.storyPoints} pts
                                    </div>
                                  )}
                                  {story.priority === "critical" && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 font-medium">Critical</span>
                                  )}
                                  {story.priority === "high" && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 font-medium">High</span>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredStories.map((story, i) => {
              const isSelected = selectedStoryId === story.id;
              const epic = story.epicId ? epics.find((e) => e.id === story.epicId) : null;
              const isFullAi = story.productionMode === "full-ai";
              const status = statusConfig[story.productionStatus] || statusConfig.backlog;
              const StatusIcon = status.icon;

              return (
                <motion.button
                  key={story.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => selectStoryForEditing(story.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all group ${
                    isSelected
                      ? "bg-foreground/5 border-foreground/20 shadow-sm"
                      : "bg-white border-border-light hover:border-border hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {epic ? (
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: epic.color }}
                      />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-200" />
                    )}
                    <span className="flex-1 text-xs font-medium truncate">
                      {story.storyNumber && (
                        <span className="text-muted-foreground font-mono mr-1">US-{story.storyNumber}</span>
                      )}
                      {story.title || "Sans titre"}
                    </span>
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
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 ml-[18px]">
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${status.bg}`}>
                      <StatusIcon className={`w-2.5 h-2.5 ${status.color}`} />
                      <span className={`text-[9px] font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    {story.storyPoints !== null && (
                      <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Star className="w-2.5 h-2.5" />
                        {story.storyPoints} pts
                      </div>
                    )}
                    {story.priority === "critical" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 font-medium">Critical</span>
                    )}
                    {story.priority === "high" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 font-medium">High</span>
                    )}
                    {epic && (
                      <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{epic.title}</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="px-4 py-2 border-t border-border-light">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)} pts total
          </span>
          <span>
            {stories.filter((s) => s.productionStatus === "done").length}/{stories.length} terminées
          </span>
        </div>
      </div>
    </div>
  );
}
