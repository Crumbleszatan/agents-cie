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

  // Panels
  leftPanelWidth: number;
  rightPanelWidth: number;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;

  // Onboarding
  isOnboarded: boolean;
  setOnboarded: (onboarded: boolean) => void;
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
  phase: "discovery",
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
  removeStory: (id) =>
    set((state) => ({
      stories: state.stories.filter((s) => s.id !== id),
    })),
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
      set({
        stories: state.stories.map((s) =>
          s.id === story.id ? storyWithEffort : s
        ),
      });
    } else {
      set({ stories: [...state.stories, storyWithEffort] });
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
  updateStoryMatrixPosition: (id, x, y) =>
    set((state) => ({
      stories: state.stories.map((s) =>
        s.id === id ? { ...s, matrixPosition: { x, y } } : s
      ),
    })),
  setStoryProductionMode: (id, mode) =>
    set((state) => ({
      stories: state.stories.map((s) =>
        s.id === id ? { ...s, productionMode: mode } : s
      ),
    })),

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
  viewMode: "website",
  setViewMode: (mode) => set({ viewMode: mode }),
  selectedPageUrl: "",
  setSelectedPageUrl: (url) => set({ selectedPageUrl: url }),
  highlightSelector: null,
  setHighlightSelector: (selector) => set({ highlightSelector: selector }),

  // Panels
  leftPanelWidth: 420,
  rightPanelWidth: 380,
  setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),

  // Onboarding
  isOnboarded: false,
  setOnboarded: (onboarded) => set({ isOnboarded: onboarded }),
}));
