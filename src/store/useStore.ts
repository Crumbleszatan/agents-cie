import { create } from "zustand";
import type {
  Project,
  UserStory,
  ChatMessage,
  ConversationContext,
  ViewMode,
  AppPhase,
  Subtask,
  AcceptanceCriterion,
  Capsule,
  Release,
  Epic,
  PinnedTag,
  DomModification,
  TrainingStatus,
} from "@/types";

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

interface AppState {
  // Project
  project: Project | null;
  setProject: (project: Project) => void;

  // App Phase (build → prioritize → ship)
  appPhase: AppPhase;
  setAppPhase: (phase: AppPhase) => void;

  // User Story (current being built)
  currentStory: UserStory;
  updateStory: (updates: Partial<UserStory>) => void;
  addSubtask: (subtask: Subtask) => void;
  updateSubtask: (id: string, updates: Partial<Subtask>) => void;
  removeSubtask: (id: string) => void;
  reorderSubtasks: (subtasks: Subtask[]) => void;
  addAcceptanceCriterion: (criterion: AcceptanceCriterion) => void;
  updateAcceptanceCriterion: (
    id: string,
    updates: Partial<AcceptanceCriterion>
  ) => void;
  removeAcceptanceCriterion: (id: string) => void;

  // Stories list (all built stories)
  stories: UserStory[];
  addStory: (story: UserStory) => void;
  updateStoryInList: (id: string, updates: Partial<UserStory>) => void;
  removeStory: (id: string) => void;
  saveCurrentStory: () => void;
  startNewStory: () => void;
  editStory: (id: string) => void;

  // Epics
  epics: Epic[];
  addEpic: (epic: Epic) => void;
  updateEpic: (id: string, updates: Partial<Epic>) => void;
  removeEpic: (id: string) => void;

  // Capsule
  capsule: Capsule | null;
  createCapsule: (name: string) => void;
  updateCapsule: (updates: Partial<Capsule>) => void;
  addRelease: (release: Release) => void;
  updateRelease: (id: string, updates: Partial<Release>) => void;
  removeRelease: (id: string) => void;

  // Matrix
  updateStoryMatrixPosition: (id: string, x: number, y: number) => void;
  setStoryProductionMode: (id: string, mode: "full-ai" | "engineer-ai") => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  isAiTyping: boolean;
  setAiTyping: (typing: boolean) => void;

  // Conversation
  context: ConversationContext;
  updateContext: (updates: Partial<ConversationContext>) => void;

  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedPageUrl: string;
  setSelectedPageUrl: (url: string) => void;
  highlightSelector: string | null;
  setHighlightSelector: (selector: string | null) => void;

  // Panel collapse / fullscreen
  centerPanelFullscreen: boolean;
  setCenterPanelFullscreen: (fullscreen: boolean) => void;
  rightPanelFullscreen: boolean;
  setRightPanelFullscreen: (fullscreen: boolean) => void;

  // Panels sizing
  leftPanelWidth: number;
  rightPanelWidth: number;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;

  // Training status
  trainingStatus: TrainingStatus;
  setTrainingStatus: (status: TrainingStatus) => void;

  // Live Tagging — pinned tags
  pinnedTags: PinnedTag[];
  addPinnedTag: (tag: PinnedTag) => void;
  removePinnedTag: (id: string) => void;
  clearPinnedTags: () => void;

  // IA Preview — DOM modifications
  domModifications: DomModification[];
  setDomModifications: (mods: DomModification[]) => void;
  addDomModification: (mod: DomModification) => void;
  clearDomModifications: () => void;

  // Story selection (Prioritize & Ship phases)
  selectedStoryId: string | null;
  setSelectedStoryId: (id: string | null) => void;
  selectStoryForEditing: (id: string | null) => void;

  // Shared filters (Prioritize & Ship phases)
  filterEpic: string;
  filterStatus: string;
  setFilterEpic: (epic: string) => void;
  setFilterStatus: (status: string) => void;

  // Onboarding
  isOnboarded: boolean;
  setOnboarded: (onboarded: boolean) => void;

  // DB identifiers (set after auth)
  currentOrgId: string | null;
  setCurrentOrgId: (id: string | null) => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;

  // Persistence callbacks (set by StorySyncProvider)
  _persistCreate: ((story: UserStory) => Promise<UserStory | null>) | null;
  _persistUpdate: ((id: string, updates: Partial<UserStory>) => Promise<UserStory | null>) | null;
  _persistDelete: ((id: string) => Promise<void>) | null;
  setPersistCallbacks: (cbs: {
    create: (story: UserStory) => Promise<UserStory | null>;
    update: (id: string, updates: Partial<UserStory>) => Promise<UserStory | null>;
    delete: (id: string) => Promise<void>;
  } | null) => void;

  // Bulk set stories from DB
  setStoriesFromDb: (stories: UserStory[]) => void;

  // Reset workspace when switching project
  resetForProjectSwitch: () => void;
}

function createDefaultStory(): UserStory {
  return {
    id: uuid(),
    title: "",
    asA: "",
    iWant: "",
    soThat: "",
    acceptanceCriteria: [],
    subtasks: [],
    storyPoints: null,
    priority: "medium",
    labels: [],
    affectedPages: [],
    affectedServices: [],
    definitionOfDone: [
      "Code reviewed and approved",
      "Unit tests written and passing",
      "Integration tests passing",
      "Deployed to staging",
      "QA validated",
      "Documentation updated",
    ],
    status: "draft",
    effort: 0,
    impact: 0,
    productionMode: "engineer-ai",
    productionStatus: "backlog",
    linesOfCode: 0,
    completionPercent: 0,
  };
}

const defaultContext: ConversationContext = {
  phase: "conversation",
  questionsAsked: 0,
  topicsExplored: [],
  currentFocus: "initial",
};

export const useStore = create<AppState>((set, get) => ({
  // Project
  project: null,
  setProject: (project) => set({ project }),

  // App Phase
  appPhase: "build",
  setAppPhase: (phase) => set({ appPhase: phase }),

  // User Story
  currentStory: createDefaultStory(),
  updateStory: (updates) =>
    set((state) => ({
      currentStory: { ...state.currentStory, ...updates },
    })),
  addSubtask: (subtask) =>
    set((state) => ({
      currentStory: {
        ...state.currentStory,
        subtasks: [...state.currentStory.subtasks, subtask],
      },
    })),
  updateSubtask: (id, updates) =>
    set((state) => ({
      currentStory: {
        ...state.currentStory,
        subtasks: state.currentStory.subtasks.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      },
    })),
  removeSubtask: (id) =>
    set((state) => ({
      currentStory: {
        ...state.currentStory,
        subtasks: state.currentStory.subtasks.filter((s) => s.id !== id),
      },
    })),
  reorderSubtasks: (subtasks) =>
    set((state) => ({
      currentStory: { ...state.currentStory, subtasks },
    })),
  addAcceptanceCriterion: (criterion) =>
    set((state) => ({
      currentStory: {
        ...state.currentStory,
        acceptanceCriteria: [
          ...state.currentStory.acceptanceCriteria,
          criterion,
        ],
      },
    })),
  updateAcceptanceCriterion: (id, updates) =>
    set((state) => ({
      currentStory: {
        ...state.currentStory,
        acceptanceCriteria: state.currentStory.acceptanceCriteria.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      },
    })),
  removeAcceptanceCriterion: (id) =>
    set((state) => ({
      currentStory: {
        ...state.currentStory,
        acceptanceCriteria: state.currentStory.acceptanceCriteria.filter(
          (c) => c.id !== id
        ),
      },
    })),

  // Stories list
  stories: [],
  addStory: (story) =>
    set((state) => ({ stories: [...state.stories, story] })),
  updateStoryInList: (id, updates) =>
    set((state) => ({
      stories: state.stories.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  removeStory: (id) => {
    set((state) => ({
      stories: state.stories.filter((s) => s.id !== id),
    }));
    const state = get();
    if (state._persistDelete) {
      state._persistDelete(id).catch(console.error);
    }
  },
  saveCurrentStory: () => {
    const state = get();
    const story = state.currentStory;
    if (!story.title) return;

    // Auto-calculate effort from story points
    const maxPoints = 21;
    const effort = story.storyPoints
      ? Math.min(100, Math.round((story.storyPoints / maxPoints) * 100))
      : 50;

    const storyWithEffort = { ...story, effort };

    const existing = state.stories.find((s) => s.id === story.id);
    if (existing) {
      // Update in Zustand
      set({
        stories: state.stories.map((s) =>
          s.id === story.id ? storyWithEffort : s
        ),
      });
      // Persist to DB
      if (state._persistUpdate) {
        state._persistUpdate(story.id, storyWithEffort).catch(console.error);
      }
    } else {
      // Add to Zustand
      set({ stories: [...state.stories, storyWithEffort] });
      // Persist to DB — use DB-generated ID if returned
      if (state._persistCreate) {
        state._persistCreate(storyWithEffort).then((dbStory) => {
          if (dbStory && dbStory.id !== storyWithEffort.id) {
            // Replace client-generated ID with DB ID
            set((s) => ({
              stories: s.stories.map((st) =>
                st.id === storyWithEffort.id ? { ...st, id: dbStory.id } : st
              ),
              currentStory:
                s.currentStory.id === storyWithEffort.id
                  ? { ...s.currentStory, id: dbStory.id }
                  : s.currentStory,
            }));
          }
        }).catch(console.error);
      }
    }
  },
  startNewStory: () => {
    const state = get();
    if (state.currentStory.title) {
      state.saveCurrentStory();
    }
    set({ currentStory: createDefaultStory() });
  },
  editStory: (id) => {
    const state = get();
    const story = state.stories.find((s) => s.id === id);
    if (story) {
      if (state.currentStory.title) {
        state.saveCurrentStory();
      }
      set({ currentStory: { ...story } });
    }
  },

  // Epics
  epics: [],
  addEpic: (epic) =>
    set((state) => ({ epics: [...state.epics, epic] })),
  updateEpic: (id, updates) =>
    set((state) => ({
      epics: state.epics.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),
  removeEpic: (id) =>
    set((state) => ({
      epics: state.epics.filter((e) => e.id !== id),
      // Also unset epicId on stories that belonged to this epic
      stories: state.stories.map((s) =>
        s.epicId === id ? { ...s, epicId: undefined } : s
      ),
    })),

  // Capsule
  capsule: null,
  createCapsule: (name) => {
    const state = get();
    const capsule: Capsule = {
      id: uuid(),
      name,
      stories: [...state.stories],
      status: "building",
      createdAt: new Date().toISOString(),
      totalEffort: state.stories.reduce((sum, s) => sum + s.effort, 0),
      totalLinesOfCode: 0,
      completionPercent: 0,
      releases: [],
    };
    set({ capsule });
  },
  updateCapsule: (updates) =>
    set((state) => ({
      capsule: state.capsule ? { ...state.capsule, ...updates } : null,
    })),
  addRelease: (release) =>
    set((state) => ({
      capsule: state.capsule
        ? {
            ...state.capsule,
            releases: [...state.capsule.releases, release],
          }
        : null,
    })),
  updateRelease: (id, updates) =>
    set((state) => ({
      capsule: state.capsule
        ? {
            ...state.capsule,
            releases: state.capsule.releases.map((r) =>
              r.id === id ? { ...r, ...updates } : r
            ),
          }
        : null,
    })),
  removeRelease: (id) =>
    set((state) => ({
      capsule: state.capsule
        ? {
            ...state.capsule,
            releases: state.capsule.releases.filter((r) => r.id !== id),
          }
        : null,
    })),

  // Matrix
  updateStoryMatrixPosition: (id, x, y) => {
    set((state) => ({
      stories: state.stories.map((s) =>
        s.id === id ? { ...s, matrixPosition: { x, y } } : s
      ),
    }));
    const state = get();
    if (state._persistUpdate) {
      state._persistUpdate(id, { matrixPosition: { x, y } }).catch(console.error);
    }
  },
  setStoryProductionMode: (id, mode) => {
    set((state) => ({
      stories: state.stories.map((s) =>
        s.id === id ? { ...s, productionMode: mode } : s
      ),
    }));
    const state = get();
    if (state._persistUpdate) {
      state._persistUpdate(id, { productionMode: mode }).catch(console.error);
    }
  },

  // Chat
  messages: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  isAiTyping: false,
  setAiTyping: (typing) => set({ isAiTyping: typing }),

  // Conversation
  context: defaultContext,
  updateContext: (updates) =>
    set((state) => ({
      context: { ...state.context, ...updates },
    })),

  // View
  viewMode: "live-tagging",
  setViewMode: (mode) => set({ viewMode: mode }),
  selectedPageUrl: "",
  setSelectedPageUrl: (url) => set({ selectedPageUrl: url }),
  highlightSelector: null,
  setHighlightSelector: (selector) => set({ highlightSelector: selector }),

  // Panel collapse / fullscreen
  centerPanelFullscreen: false,
  setCenterPanelFullscreen: (fullscreen) => set({ centerPanelFullscreen: fullscreen }),
  rightPanelFullscreen: false,
  setRightPanelFullscreen: (fullscreen) => set({ rightPanelFullscreen: fullscreen }),

  // Panels sizing
  leftPanelWidth: 420,
  rightPanelWidth: 380,
  setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),

  // Training status
  trainingStatus: "not_started",
  setTrainingStatus: (status) => set({ trainingStatus: status }),

  // Live Tagging — pinned tags
  pinnedTags: [],
  addPinnedTag: (tag) =>
    set((state) => ({ pinnedTags: [...state.pinnedTags, tag] })),
  removePinnedTag: (id) =>
    set((state) => ({
      pinnedTags: state.pinnedTags.filter((t) => t.id !== id),
    })),
  clearPinnedTags: () => set({ pinnedTags: [] }),

  // IA Preview — DOM modifications
  domModifications: [],
  setDomModifications: (mods) => set({ domModifications: mods }),
  addDomModification: (mod) =>
    set((state) => ({ domModifications: [...state.domModifications, mod] })),
  clearDomModifications: () => set({ domModifications: [] }),

  // Story selection (Prioritize & Ship)
  selectedStoryId: null,
  setSelectedStoryId: (id) => set({ selectedStoryId: id }),
  selectStoryForEditing: (id) => {
    if (id === null) {
      set({ selectedStoryId: null });
      return;
    }
    const state = get();
    // Save any pending edits first
    if (state.currentStory.title) {
      state.saveCurrentStory();
    }
    const story = state.stories.find((s) => s.id === id);
    if (story) {
      set({ selectedStoryId: id, currentStory: { ...story } });
    }
  },

  // Shared filters (Prioritize & Ship)
  filterEpic: "all",
  filterStatus: "all",
  setFilterEpic: (epic) => set({ filterEpic: epic }),
  setFilterStatus: (status) => set({ filterStatus: status }),

  // Onboarding
  isOnboarded: false,
  setOnboarded: (onboarded) => set({ isOnboarded: onboarded }),

  // DB identifiers
  currentOrgId: null,
  setCurrentOrgId: (id) => set({ currentOrgId: id }),
  currentProjectId: null,
  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  // Persistence callbacks (set by StorySyncProvider)
  _persistCreate: null,
  _persistUpdate: null,
  _persistDelete: null,
  setPersistCallbacks: (cbs) => {
    if (cbs) {
      set({ _persistCreate: cbs.create, _persistUpdate: cbs.update, _persistDelete: cbs.delete });
    } else {
      set({ _persistCreate: null, _persistUpdate: null, _persistDelete: null });
    }
  },

  // Bulk set stories from DB (used by StorySyncProvider on project load)
  setStoriesFromDb: (stories) => set({ stories }),

  // Reset workspace for project switch — clear all transient state
  resetForProjectSwitch: () =>
    set({
      messages: [],
      stories: [],
      currentStory: createDefaultStory(),
      context: defaultContext,
      appPhase: "build",
      capsule: null,
      isAiTyping: false,
      selectedPageUrl: "",
      highlightSelector: null,
      epics: [],
      pinnedTags: [],
      domModifications: [],
      trainingStatus: "not_started",
      centerPanelFullscreen: false,
      rightPanelFullscreen: false,
      viewMode: "live-tagging",
      selectedStoryId: null,
      filterEpic: "all",
      filterStatus: "all",
    }),
}));
