"use client";

import { useStore } from "@/store/useStore";
import { uuid } from "@/lib/utils";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  Check,
  Code,
  Palette,
  Server,
  TestTube,
  Cloud,
  Edit3,
  Star,
  X,
} from "lucide-react";
import type { Subtask, AcceptanceCriterion } from "@/types";

const subtaskTypeConfig = {
  frontend: { icon: Code, color: "text-blue-600", bg: "bg-blue-50", label: "Front" },
  backend: { icon: Server, color: "text-green-600", bg: "bg-green-50", label: "Back" },
  design: { icon: Palette, color: "text-purple-600", bg: "bg-purple-50", label: "Design" },
  qa: { icon: TestTube, color: "text-orange-600", bg: "bg-orange-50", label: "QA" },
  devops: { icon: Cloud, color: "text-cyan-600", bg: "bg-cyan-50", label: "DevOps" },
};

const EPIC_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

interface StoryEditFormProps {
  showEpicsSection?: boolean;
}

export function StoryEditForm({ showEpicsSection = true }: StoryEditFormProps) {
  const currentStory = useStore((s) => s.currentStory);
  const updateStory = useStore((s) => s.updateStory);
  const addSubtask = useStore((s) => s.addSubtask);
  const updateSubtask = useStore((s) => s.updateSubtask);
  const removeSubtask = useStore((s) => s.removeSubtask);
  const reorderSubtasks = useStore((s) => s.reorderSubtasks);
  const addAcceptanceCriterion = useStore((s) => s.addAcceptanceCriterion);
  const removeAcceptanceCriterion = useStore((s) => s.removeAcceptanceCriterion);
  const updateAcceptanceCriterion = useStore((s) => s.updateAcceptanceCriterion);
  const epics = useStore((s) => s.epics);
  const stories = useStore((s) => s.stories);
  const addEpic = useStore((s) => s.addEpic);
  const removeEpic = useStore((s) => s.removeEpic);

  const currentEpic = currentStory.epicId ? epics.find((e) => e.id === currentStory.epicId) : null;

  const [expandedSections, setExpandedSections] = useState({
    story: true,
    acceptance: true,
    subtasks: true,
    dod: false,
    epics: false,
  });
  const [newEpicTitle, setNewEpicTitle] = useState("");
  const [showNewEpic, setShowNewEpic] = useState(false);
  const [showInlineNewEpic, setShowInlineNewEpic] = useState(false);
  const [inlineEpicTitle, setInlineEpicTitle] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((s) => ({ ...s, [key]: !s[key] }));
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-50 text-blue-600",
    high: "bg-orange-50 text-orange-600",
    critical: "bg-red-50 text-red-600",
  };

  const handleAddSubtask = () => {
    addSubtask({
      id: uuid(),
      title: "Nouvelle sous-tâche",
      type: "frontend",
      storyPoints: null,
      description: "",
      order: currentStory.subtasks.length,
    });
  };

  const handleAddCriterion = () => {
    addAcceptanceCriterion({
      id: uuid(),
      given: "",
      when: "",
      then: "",
      completed: false,
    });
  };

  return (
    <div className="space-y-3">
      {/* Title & Priority */}
      <div>
        <input
          value={currentStory.title}
          onChange={(e) => updateStory({ title: e.target.value })}
          placeholder="Titre de la User Story"
          className="w-full text-base font-semibold bg-transparent outline-none placeholder:text-muted-foreground/40"
        />
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <select
            value={currentStory.priority}
            onChange={(e) =>
              updateStory({ priority: e.target.value as "low" | "medium" | "high" | "critical" })
            }
            className={`text-[11px] font-medium px-2 py-1 rounded-md border-0 outline-none cursor-pointer ${priorityColors[currentStory.priority]}`}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {/* Epic assignment: chip when assigned, dropdown when not */}
          {showInlineNewEpic ? (
            <div className="flex items-center gap-1">
              <input
                value={inlineEpicTitle}
                onChange={(e) => setInlineEpicTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inlineEpicTitle.trim()) {
                    const epic = {
                      id: uuid(),
                      title: inlineEpicTitle.trim(),
                      description: "",
                      color: EPIC_COLORS[epics.length % EPIC_COLORS.length],
                      storyIds: [],
                      createdAt: new Date().toISOString(),
                    };
                    addEpic(epic);
                    updateStory({ epicId: epic.id });
                    setInlineEpicTitle("");
                    setShowInlineNewEpic(false);
                  }
                  if (e.key === "Escape") {
                    setInlineEpicTitle("");
                    setShowInlineNewEpic(false);
                  }
                }}
                placeholder="Nom du nouvel epic..."
                className="text-[11px] px-2 py-1 rounded-md border border-violet-300 outline-none bg-white w-[140px]"
                autoFocus
              />
              <button
                onClick={() => {
                  if (inlineEpicTitle.trim()) {
                    const epic = {
                      id: uuid(),
                      title: inlineEpicTitle.trim(),
                      description: "",
                      color: EPIC_COLORS[epics.length % EPIC_COLORS.length],
                      storyIds: [],
                      createdAt: new Date().toISOString(),
                    };
                    addEpic(epic);
                    updateStory({ epicId: epic.id });
                    setInlineEpicTitle("");
                    setShowInlineNewEpic(false);
                  }
                }}
                disabled={!inlineEpicTitle.trim()}
                className="p-1 rounded-md bg-violet-600 text-white disabled:opacity-30"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : currentEpic ? (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium cursor-default"
              style={{ backgroundColor: currentEpic.color + "18", color: currentEpic.color }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentEpic.color }}
              />
              <span className="truncate max-w-[100px]">{currentEpic.title}</span>
              <button
                onClick={() => updateStory({ epicId: undefined })}
                className="p-0.5 rounded hover:bg-black/10 transition-colors -mr-0.5"
                title="Retirer de l'epic"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowInlineNewEpic(true);
                } else if (e.target.value) {
                  updateStory({ epicId: e.target.value });
                }
              }}
              className="text-[11px] font-medium px-2 py-1 rounded-md border-0 outline-none cursor-pointer bg-muted text-muted-foreground"
            >
              <option value="">Associer un Epic</option>
              {epics.map((epic) => (
                <option key={epic.id} value={epic.id}>
                  {epic.title}
                </option>
              ))}
              <option value="__new__">+ Cr&eacute;er un epic</option>
            </select>
          )}
          {currentStory.storyPoints !== null && (
            <div className="flex items-center gap-1 tag">
              <Star className="w-3 h-3" />
              <span>{currentStory.storyPoints} pts</span>
              <span className="text-[9px] text-muted-foreground/60 ml-1">
                (à valider par l&apos;équipe)
              </span>
            </div>
          )}
          {currentStory.labels.map((label) => (
            <span key={label} className="tag tag-info">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* User Story Format */}
      <SectionHeader
        title="Story"
        expanded={expandedSections.story}
        onToggle={() => toggleSection("story")}
      />
      <AnimatePresence>
        {expandedSections.story && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 panel-inset p-3">
              <StoryField
                label="En tant que"
                value={currentStory.asA}
                onChange={(v) => updateStory({ asA: v })}
                placeholder="type d'utilisateur..."
                editing={editingField === "asA"}
                onEdit={() => setEditingField("asA")}
                onBlur={() => setEditingField(null)}
              />
              <StoryField
                label="Je veux"
                value={currentStory.iWant}
                onChange={(v) => updateStory({ iWant: v })}
                placeholder="action ou fonctionnalité..."
                editing={editingField === "iWant"}
                onEdit={() => setEditingField("iWant")}
                onBlur={() => setEditingField(null)}
              />
              <StoryField
                label="Afin de"
                value={currentStory.soThat}
                onChange={(v) => updateStory({ soThat: v })}
                placeholder="bénéfice attendu..."
                editing={editingField === "soThat"}
                onEdit={() => setEditingField("soThat")}
                onBlur={() => setEditingField(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Acceptance Criteria */}
      <SectionHeader
        title="Critères d'acceptance"
        count={currentStory.acceptanceCriteria.length}
        expanded={expandedSections.acceptance}
        onToggle={() => toggleSection("acceptance")}
        onAdd={handleAddCriterion}
      />
      <AnimatePresence>
        {expandedSections.acceptance && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              {currentStory.acceptanceCriteria.map((criterion, i) => (
                <CriterionCard
                  key={criterion.id}
                  criterion={criterion}
                  index={i}
                  onUpdate={(updates) =>
                    updateAcceptanceCriterion(criterion.id, updates)
                  }
                  onRemove={() => removeAcceptanceCriterion(criterion.id)}
                />
              ))}
              {currentStory.acceptanceCriteria.length === 0 && (
                <p className="text-xs text-muted-foreground/50 text-center py-3">
                  Les critères seront générés automatiquement
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtasks */}
      <SectionHeader
        title="Sous-tâches"
        count={currentStory.subtasks.length}
        expanded={expandedSections.subtasks}
        onToggle={() => toggleSection("subtasks")}
        onAdd={handleAddSubtask}
      />
      <AnimatePresence>
        {expandedSections.subtasks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {currentStory.subtasks.length > 0 ? (
              <Reorder.Group
                values={currentStory.subtasks}
                onReorder={reorderSubtasks}
                className="space-y-1.5"
              >
                {currentStory.subtasks.map((subtask) => (
                  <SubtaskCard
                    key={subtask.id}
                    subtask={subtask}
                    onUpdate={(updates) =>
                      updateSubtask(subtask.id, updates)
                    }
                    onRemove={() => removeSubtask(subtask.id)}
                  />
                ))}
              </Reorder.Group>
            ) : (
              <p className="text-xs text-muted-foreground/50 text-center py-3">
                Les sous-tâches seront générées automatiquement
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Definition of Done */}
      <SectionHeader
        title="Definition of Done"
        count={currentStory.definitionOfDone.length}
        expanded={expandedSections.dod}
        onToggle={() => toggleSection("dod")}
      />
      <AnimatePresence>
        {expandedSections.dod && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="panel-inset p-3 space-y-1.5">
              {currentStory.definitionOfDone.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Check className="w-3 h-3 text-success flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Epics overview — shows all project epics with US counts */}
      {showEpicsSection && epics.length > 0 && (
        <>
          <SectionHeader
            title="Epics du projet"
            count={epics.length}
            expanded={expandedSections.epics}
            onToggle={() => toggleSection("epics")}
            onAdd={() => setShowNewEpic(true)}
          />
          <AnimatePresence>
            {expandedSections.epics && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5">
                  {epics.map((epic) => {
                    const storyCount = stories.filter((s) => s.epicId === epic.id).length;
                    const isActive = currentStory.epicId === epic.id;
                    return (
                      <button
                        key={epic.id}
                        onClick={() => updateStory({ epicId: isActive ? undefined : epic.id })}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all group text-left ${
                          isActive
                            ? "border-foreground/20 bg-foreground/5 shadow-sm"
                            : "border-border-light bg-white hover:shadow-sm"
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: epic.color }}
                        />
                        <span className="flex-1 text-xs font-medium truncate">{epic.title}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {storyCount} US
                        </span>
                        {isActive && (
                          <Check className="w-3 h-3 text-foreground flex-shrink-0" />
                        )}
                        <div
                          onClick={(e) => { e.stopPropagation(); removeEpic(epic.id); }}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </div>
                      </button>
                    );
                  })}

                  {/* New epic inline form */}
                  <AnimatePresence>
                    {showNewEpic && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 p-2 rounded-xl border border-border-light bg-white">
                          <input
                            value={newEpicTitle}
                            onChange={(e) => setNewEpicTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newEpicTitle.trim()) {
                                addEpic({
                                  id: uuid(),
                                  title: newEpicTitle.trim(),
                                  description: "",
                                  color: EPIC_COLORS[epics.length % EPIC_COLORS.length],
                                  storyIds: [],
                                  createdAt: new Date().toISOString(),
                                });
                                setNewEpicTitle("");
                                setShowNewEpic(false);
                              }
                              if (e.key === "Escape") {
                                setNewEpicTitle("");
                                setShowNewEpic(false);
                              }
                            }}
                            placeholder="Nom de l'epic..."
                            className="flex-1 text-xs bg-transparent outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              if (newEpicTitle.trim()) {
                                addEpic({
                                  id: uuid(),
                                  title: newEpicTitle.trim(),
                                  description: "",
                                  color: EPIC_COLORS[epics.length % EPIC_COLORS.length],
                                  storyIds: [],
                                  createdAt: new Date().toISOString(),
                                });
                                setNewEpicTitle("");
                                setShowNewEpic(false);
                              }
                            }}
                            disabled={!newEpicTitle.trim()}
                            className="p-1 rounded-md bg-foreground text-white disabled:opacity-30"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───

function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
  onAdd,
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  onAdd?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        {title}
        {count !== undefined && (
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md">
            {count}
          </span>
        )}
      </button>
      {onAdd && (
        <button
          onClick={onAdd}
          className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function StoryField({
  label,
  value,
  onChange,
  placeholder,
  editing,
  onEdit,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  editing: boolean;
  onEdit: () => void;
  onBlur: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[70px] pt-1">
        {label}
      </span>
      {editing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="flex-1 text-xs bg-white px-2 py-1 rounded-md border border-border outline-none focus:border-foreground"
          autoFocus
        />
      ) : (
        <button
          onClick={onEdit}
          className="flex-1 text-xs text-left py-1 group flex items-center gap-1"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground/40"}>
            {value || placeholder}
          </span>
          <Edit3 className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
}

function CriterionCard({
  criterion,
  index,
  onUpdate,
  onRemove,
}: {
  criterion: AcceptanceCriterion;
  index: number;
  onUpdate: (updates: Partial<AcceptanceCriterion>) => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      className="panel-inset p-3 space-y-1.5 group"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground">
          AC-{index + 1}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onUpdate({ completed: !criterion.completed })}
            className={`p-1 rounded ${
              criterion.completed
                ? "bg-success/10 text-success"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <CriterionField
          label="GIVEN"
          value={criterion.given}
          onChange={(v) => onUpdate({ given: v })}
        />
        <CriterionField
          label="WHEN"
          value={criterion.when}
          onChange={(v) => onUpdate({ when: v })}
        />
        <CriterionField
          label="THEN"
          value={criterion.then}
          onChange={(v) => onUpdate({ then: v })}
        />
      </div>
    </motion.div>
  );
}

function CriterionField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono font-bold text-muted-foreground/60 min-w-[40px]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="..."
        className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-muted-foreground/30"
      />
    </div>
  );
}

function SubtaskCard({
  subtask,
  onUpdate,
  onRemove,
}: {
  subtask: Subtask;
  onUpdate: (updates: Partial<Subtask>) => void;
  onRemove: () => void;
}) {
  const config = subtaskTypeConfig[subtask.type];
  const Icon = config.icon;

  return (
    <Reorder.Item
      value={subtask}
      className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white border border-border-light group hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
      <div
        className={`w-6 h-6 rounded-md ${config.bg} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className={`w-3 h-3 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <input
          value={subtask.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full text-xs font-medium bg-transparent outline-none"
        />
      </div>
      <select
        value={subtask.type}
        onChange={(e) =>
          onUpdate({ type: e.target.value as Subtask["type"] })
        }
        className="text-[10px] bg-transparent outline-none text-muted-foreground cursor-pointer"
      >
        <option value="frontend">Front</option>
        <option value="backend">Back</option>
        <option value="design">Design</option>
        <option value="qa">QA</option>
        <option value="devops">DevOps</option>
      </select>
      {subtask.storyPoints !== null && (
        <span className="text-[10px] text-muted-foreground font-mono">
          {subtask.storyPoints}p
        </span>
      )}
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </Reorder.Item>
  );
}
