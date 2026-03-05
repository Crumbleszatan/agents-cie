import type {
  ReleasePhaseSegment,
  TeamMember,
  ProjectConfig,
  ConfidenceDates,
  UserStory,
  EstimationUnit,
} from "@/types";
import {
  EXPERIENCE_COEFFICIENTS,
  BASE_VELOCITY,
  PROFILE_VELOCITY_CATEGORY,
  CONFIDENCE_MULTIPLIERS,
} from "@/types";
import { getHolidaysForYear, isNonWorkingDay } from "@/lib/holidays";

// ─── Date utilities ───

export function daysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function formatDateFull(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Phase color configs ───

export const INSTANT_PHASE_COLORS: Record<string, string> = {
  Build: "#c4b5fd",   // violet-300
  Review: "#a78bfa",  // violet-400
  Recette: "#7c3aed", // violet-600
};

export const HUMAN_PHASE_COLORS: Record<string, string> = {
  Dev: "#fcd34d",     // amber-300
  Testing: "#fbbf24", // amber-400
  Recette: "#f59e0b", // amber-500
  MEP: "#d97706",     // amber-600
};

// ─── UUID helper ───

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// ─── Holiday-aware working day functions ───

/** Add working days (skip weekends + holidays). Handles year boundary. */
export function addWorkingDays(
  from: Date,
  days: number,
  holidayCountry: string = "FR"
): Date {
  const result = new Date(from);
  if (days <= 0) return result;
  let currentYear = result.getFullYear();
  let holidays = getHolidaysForYear(currentYear, holidayCountry);
  let added = 0;
  const wholeDays = Math.ceil(days);
  while (added < wholeDays) {
    result.setDate(result.getDate() + 1);
    // Reload holidays if we crossed a year boundary
    if (result.getFullYear() !== currentYear) {
      currentYear = result.getFullYear();
      holidays = getHolidaysForYear(currentYear, holidayCountry);
    }
    if (!isNonWorkingDay(result, holidays)) added++;
  }
  return result;
}

/** Subtract working days (for retro-planning from a deadline). */
export function subtractWorkingDays(
  from: Date,
  days: number,
  holidayCountry: string = "FR"
): Date {
  const result = new Date(from);
  if (days <= 0) return result;
  let currentYear = result.getFullYear();
  let holidays = getHolidaysForYear(currentYear, holidayCountry);
  let subtracted = 0;
  const wholeDays = Math.ceil(days);
  while (subtracted < wholeDays) {
    result.setDate(result.getDate() - 1);
    if (result.getFullYear() !== currentYear) {
      currentYear = result.getFullYear();
      holidays = getHolidaysForYear(currentYear, holidayCountry);
    }
    if (!isNonWorkingDay(result, holidays)) subtracted++;
  }
  return result;
}

// ─── Capacity Computation ───

export interface PhaseCapacity {
  devCapacity: number;   // effective SP/day for dev profiles
  qaCapacity: number;    // effective SP/day for QA profiles
}

/**
 * Compute effective team capacity per phase category.
 * @param team - list of team members
 * @param allocationFactor - 0-1, for proportional split when releases overlap (default 1.0)
 * @returns { devCapacity, qaCapacity } in SP/day
 */
export function computePhaseCapacity(
  team: TeamMember[],
  allocationFactor: number = 1.0
): PhaseCapacity {
  // Fallback: if no team configured, assume 1 confirmed dev at 100%
  if (team.length === 0) {
    return {
      devCapacity: BASE_VELOCITY.dev * 1.0 * 1.0 * allocationFactor, // 2 SP/day
      qaCapacity: 0,
    };
  }

  let devCapacity = 0;
  let qaCapacity = 0;

  for (const member of team) {
    const category = PROFILE_VELOCITY_CATEGORY[member.profile];
    if (!category) continue;
    const baseVel = BASE_VELOCITY[category];
    const coeff = EXPERIENCE_COEFFICIENTS[member.experienceLevel];
    const effective = baseVel * coeff * member.availability * allocationFactor;
    if (category === "dev") devCapacity += effective;
    else qaCapacity += effective;
  }

  return { devCapacity, qaCapacity };
}

// ─── Phase builder helper ───

function makePhase(
  name: string,
  start: Date,
  end: Date,
  days: number,
  color: string
): ReleasePhaseSegment {
  return {
    id: uuid(),
    name,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    durationDays: days,
    durationOptimistic: Math.max(1, Math.ceil(days * CONFIDENCE_MULTIPLIERS.optimistic)),
    durationPessimistic: Math.ceil(days * CONFIDENCE_MULTIPLIERS.pessimistic),
    status: "pending",
    color,
  };
}

// ─── Instant Release Phase Computation ───

/**
 * Compute Instant Release phases: Build (AI) → Review (AI) → Recette (human)
 * Deploy steps are instantaneous (CI/CD) and not shown as segments.
 */
export function computeInstantPhases(
  totalSP: number,
  startDate: Date,
  team: TeamMember[],
  config: ProjectConfig
): ReleasePhaseSegment[] {
  const { qaCapacity } = computePhaseCapacity(team);
  const country = config.holidayCountry;

  // Build: AI-driven, duration = SP × 0.3 days (min 1)
  const buildDays = Math.max(1, Math.ceil(totalSP * 0.3));

  // Review: AI determines duration in hours, converted to days (min 1)
  const reviewHours = Math.max(1, Math.ceil(totalSP * 0.1));
  const reviewDays = Math.max(1, Math.ceil(reviewHours / config.hoursPerDay));

  // Recette: Human validates. Duration = SP × 0.15 / QA capacity (min 1)
  const recetteDays = Math.max(
    1,
    qaCapacity > 0
      ? Math.ceil((totalSP * 0.15) / qaCapacity)
      : Math.ceil(totalSP * 0.15)
  );

  // Chain dates forward
  const buildStart = new Date(startDate);
  const buildEnd = addWorkingDays(buildStart, buildDays, country);
  const reviewStart = new Date(buildEnd);
  const reviewEnd = addWorkingDays(reviewStart, reviewDays, country);
  const recetteStart = new Date(reviewEnd);
  const recetteEnd = addWorkingDays(recetteStart, recetteDays, country);

  return [
    makePhase("Build", buildStart, buildEnd, buildDays, INSTANT_PHASE_COLORS.Build),
    makePhase("Review", reviewStart, reviewEnd, reviewDays, INSTANT_PHASE_COLORS.Review),
    makePhase("Recette", recetteStart, recetteEnd, recetteDays, INSTANT_PHASE_COLORS.Recette),
  ];
}

// ─── Human Release Phase Computation (retro-planning from MEP deadline) ───

export interface HumanPhasesResult {
  phases: ReleasePhaseSegment[];
  devStartDate: Date;
  alertPast: boolean;
}

/**
 * Compute Human Release phases retro-planned from a MEP deadline.
 * Flow: Dev → Testing → Recette (client) → MEP
 */
export function computeHumanPhasesRetro(
  totalSP: number,
  mepDeadline: Date,
  team: TeamMember[],
  config: ProjectConfig
): HumanPhasesResult {
  const { devCapacity, qaCapacity } = computePhaseCapacity(team);
  const country = config.holidayCountry;

  // MEP: 1 day fixed
  const mepDays = 1;

  // Dev: ceil(total_SP / devCapacity) days
  const devDays = devCapacity > 0
    ? Math.ceil(totalSP / devCapacity)
    : Math.max(2, Math.ceil(totalSP * 1.2)); // fallback without team

  // Testing: ceil(SP × testingRatio / qaCapacity)
  const testingDays = qaCapacity > 0
    ? Math.max(1, Math.ceil((totalSP * config.testingRatio) / qaCapacity))
    : Math.max(1, Math.ceil(totalSP * config.testingRatio));

  // Recette: max(2, ceil(devDays × recetteRatio)) — done by client
  const recetteDays = Math.max(2, Math.ceil(devDays * config.recetteRatio));

  // Retro-calculate from MEP deadline
  const mepEnd = new Date(mepDeadline);
  const mepStart = subtractWorkingDays(mepEnd, mepDays, country);

  const recetteEnd = new Date(mepStart);
  const recetteStart = subtractWorkingDays(recetteEnd, recetteDays, country);

  const testingEnd = new Date(recetteStart);
  const testingStart = subtractWorkingDays(testingEnd, testingDays, country);

  const devEnd = new Date(testingStart);
  const devStart = subtractWorkingDays(devEnd, devDays, country);

  const alertPast = devStart < new Date();

  return {
    phases: [
      makePhase("Dev", devStart, devEnd, devDays, HUMAN_PHASE_COLORS.Dev),
      makePhase("Testing", testingStart, testingEnd, testingDays, HUMAN_PHASE_COLORS.Testing),
      makePhase("Recette", recetteStart, recetteEnd, recetteDays, HUMAN_PHASE_COLORS.Recette),
      makePhase("MEP", mepStart, mepEnd, mepDays, HUMAN_PHASE_COLORS.MEP),
    ],
    devStartDate: devStart,
    alertPast,
  };
}

// ─── Hours-based computation ───

/**
 * Compute dev days from total hours and team capacity.
 */
export function computeDevDaysFromHours(
  totalHours: number,
  config: ProjectConfig,
  team: TeamMember[]
): number {
  const devMembers = team.filter((m) => {
    const cat = PROFILE_VELOCITY_CATEGORY[m.profile];
    return cat === "dev";
  });
  const effectiveETP = devMembers.length > 0
    ? devMembers.reduce((sum, m) => {
        return sum + EXPERIENCE_COEFFICIENTS[m.experienceLevel] * m.availability;
      }, 0)
    : 1; // fallback to 1 ETP
  return Math.ceil(totalHours / (config.hoursPerDay * effectiveETP));
}

// ─── Confidence Dates ───

/**
 * Compute optimistic / realistic / pessimistic end dates.
 */
export function computeConfidenceDates(
  realisticEndDate: Date,
  totalDurationDays: number,
  config: ProjectConfig
): ConfidenceDates {
  const country = config.holidayCountry;

  // Work backward from realistic end to find the start
  const startDate = subtractWorkingDays(realisticEndDate, totalDurationDays, country);

  const optimisticDays = Math.max(1, Math.ceil(totalDurationDays * CONFIDENCE_MULTIPLIERS.optimistic));
  const pessimisticDays = Math.ceil(totalDurationDays * CONFIDENCE_MULTIPLIERS.pessimistic);

  return {
    optimistic: addWorkingDays(startDate, optimisticDays, country).toISOString(),
    realistic: realisticEndDate.toISOString(),
    pessimistic: addWorkingDays(startDate, pessimisticDays, country).toISOString(),
  };
}

// ─── Validation ───

/**
 * Validate that stories have estimates before shipping.
 * Returns valid (shippable) and blocked (missing estimates) stories.
 */
export function validateStoriesForShipping(
  stories: UserStory[],
  estimationUnit: EstimationUnit
): { valid: UserStory[]; blocked: UserStory[] } {
  const valid: UserStory[] = [];
  const blocked: UserStory[] = [];

  for (const s of stories) {
    if (estimationUnit === "sp") {
      if (s.storyPoints === null || s.storyPoints <= 0) {
        blocked.push(s);
      } else {
        valid.push(s);
      }
    } else {
      if (s.estimatedHours === null || s.estimatedHours <= 0) {
        blocked.push(s);
      } else {
        valid.push(s);
      }
    }
  }

  return { valid, blocked };
}
