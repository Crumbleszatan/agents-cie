export interface Project {
  id: string;
  name: string;
  websiteUrl: string;
  brandContext: BrandContext;
  integrations: Integrations;
  architecture: ArchitectureGraph;
}

export interface BrandContext {
  name: string;
  industry: string;
  tone: string;
  colors: string[];
  logoUrl?: string;
  description: string;
}

export interface Integrations {
  jira?: JiraConfig;
  git?: GitConfig;
  website?: WebsiteConfig;
}

export interface JiraConfig {
  connected: boolean;
  projectKey: string;
  baseUrl: string;
  backlogItems: JiraTicket[];
}

export interface GitConfig {
  connected: boolean;
  provider: "github" | "gitlab" | "bitbucket";
  repoUrl: string;
  defaultBranch: string;
}

export interface WebsiteConfig {
  connected: boolean;
  url: string;
  screenshotUrl?: string;
  sitemapPages: string[];
}

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  type: "story" | "bug" | "task" | "epic";
  priority: string;
}

export interface UserStory {
  id: string;
  storyNumber?: number; // Auto-increment display ID (US-1, US-2...)
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: AcceptanceCriterion[];
  subtasks: Subtask[];
  storyPoints: number | null;
  estimatedHours: number | null; // alternative to SP when project uses hours
  priority: "low" | "medium" | "high" | "critical";
  labels: string[];
  affectedPages: string[];
  affectedServices: string[];
  definitionOfDone: string[];
  status: "draft" | "refining" | "ready";
  epicId?: string; // optional epic grouping
  // Matrix positioning
  matrixPosition?: { x: number; y: number }; // x = effort, y = impact (0-100)
  effort: number;  // 0-100, auto-calculated from story points
  impact: number;  // 0-100, auto-calculated by AI
  // Production
  productionMode: "full-ai" | "engineer-ai"; // auto-determined by AI
  productionStatus: "backlog" | "planned" | "in-progress" | "review" | "done";
  release?: string; // release name/version
  startDate?: string; // ISO date
  endDate?: string;   // ISO date (deadline)
  linesOfCode: number;
  jiraKey?: string;
  gitBranch?: string;
  completionPercent: number; // 0-100
}

export interface AcceptanceCriterion {
  id: string;
  given: string;
  when: string;
  then: string;
  completed: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  type: "frontend" | "backend" | "design" | "qa" | "devops";
  storyPoints: number | null;
  description: string;
  order: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  type: "text" | "question" | "suggestion" | "preview" | "architecture";
  storyId?: string; // links message to a UserStory
  metadata?: {
    questionType?: string;
    options?: string[];
    selectionMode?: "single" | "multiple";
    affectedArea?: string;
  };
  optionsAnswered?: boolean;
}

export interface ConversationContext {
  phase: "conversation"; // simplified — no sub-phases
  questionsAsked: number;
  topicsExplored: string[];
  currentFocus: string;
}

export interface ArchitectureGraph {
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export interface ArchNode {
  id: string;
  type: "service" | "api" | "database" | "frontend" | "external" | "queue";
  label: string;
  description: string;
  position: { x: number; y: number };
  impacted: boolean;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: "rest" | "graphql" | "grpc" | "event" | "database";
  impacted: boolean;
}

// ─── Capsule (a collection of US ready to ship) ───
export interface Capsule {
  id: string;
  name: string;
  stories: UserStory[];
  status: "draft" | "prioritizing" | "building" | "shipping" | "done";
  createdAt: string;
  deadline?: string;
  totalEffort: number;
  totalLinesOfCode: number;
  completionPercent: number;
  releases: Release[];
}

export interface Release {
  id: string;
  name: string;
  storyIds: string[];
  plannedDate: string;
  status: "planned" | "in-progress" | "shipped";
}

export type ViewMode = "live-tagging" | "ia-preview" | "architecture";
export type AppPhase = "build" | "prioritize" | "ship" | "release";

// ─── Team & Capacity Configuration ───

export type TeamProfile =
  | "dev-front"
  | "dev-back"
  | "fullstack"
  | "qa"
  | "devops"
  | "chef-de-projet";

export type ExperienceLevel = "junior" | "confirme" | "senior";

export const EXPERIENCE_COEFFICIENTS: Record<ExperienceLevel, number> = {
  junior: 0.7,
  confirme: 1.0,
  senior: 1.3,
};

/** Base velocity in SP/day by profile category */
export const BASE_VELOCITY: Record<"dev" | "qa", number> = {
  dev: 2,
  qa: 4,
};

/** Maps profiles to their velocity category */
export const PROFILE_VELOCITY_CATEGORY: Record<TeamProfile, "dev" | "qa" | null> = {
  "dev-front": "dev",
  "dev-back": "dev",
  fullstack: "dev",
  qa: "qa",
  devops: null,
  "chef-de-projet": null,
};

/** Maps profiles to which phases they contribute to */
export const PROFILE_PHASE_MAP: Record<TeamProfile, string[]> = {
  "dev-front": ["Dev", "Build"],
  "dev-back": ["Dev", "Build"],
  fullstack: ["Dev", "Build"],
  qa: ["Testing", "Recette"],
  devops: ["Deploy Recette", "Deploy Prod", "MEP"],
  "chef-de-projet": [],
};

export interface TeamMember {
  id: string;
  name: string;
  profile: TeamProfile;
  experienceLevel: ExperienceLevel;
  availability: number; // 0.0 to 1.0
}

export type EstimationUnit = "sp" | "hours";

export interface ProjectConfig {
  estimationUnit: EstimationUnit;
  spToHoursRatio: number;     // default 4 (1 SP = 4h)
  hoursPerDay: number;        // default 7
  holidayCountry: string;     // ISO code, e.g. "FR"
  testingRatio: number;       // default 0.30 for human releases
  recetteRatio: number;       // default 0.20 for human releases
  fibonacciScale: number[];   // [1, 2, 3, 5, 8, 13, 21]
}

// ─── Confidence Interval ───

export type ConfidenceLevel = "optimistic" | "realistic" | "pessimistic";

export const CONFIDENCE_MULTIPLIERS: Record<ConfidenceLevel, number> = {
  optimistic: 0.8,
  realistic: 1.0,
  pessimistic: 1.4,
};

export interface ConfidenceDates {
  optimistic: string;  // ISO date
  realistic: string;   // ISO date
  pessimistic: string; // ISO date
}

// ─── Release Planning ───

export interface ReleasePhaseSegment {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  durationOptimistic?: number;
  durationPessimistic?: number;
  status: "pending" | "in-progress" | "completed";
  color: string;
}

export interface ReleaseTimeline {
  id: string;
  name: string;
  storyIds: string[];
  releaseType: "instant" | "human";
  totalStoryPoints: number;
  totalHours?: number;
  phases: ReleasePhaseSegment[];
  startDate: string;
  endDate: string;
  confidenceDates?: ConfidenceDates;
  status: "upcoming" | "in-progress" | "completed";
  createdAt: string;
  mepDeadline?: string;
  alertDatePast?: boolean;
}
export type TrainingStatus = "not_started" | "in_progress" | "complete";

// ─── Epic (group of related user stories) ───
export interface Epic {
  id: string;
  title: string;
  description: string;
  color: string;
  storyIds: string[];
  createdAt: string;
}

// ─── Live Tagging — pinned tags on the preview ───
export interface PinnedTag {
  id: string;
  selector: string;
  tagName: string;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  pageUrl: string;
}

// ─── IA Preview — DOM modifications generated by AI ───
export interface DomModification {
  id: string;
  selector: string;
  type: "text" | "style" | "add" | "remove";
  property?: string;
  value?: string;
  description: string;
}
