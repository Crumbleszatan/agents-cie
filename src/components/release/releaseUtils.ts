import type { ReleasePhaseSegment } from "@/types";

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

/** Add working days (skip weekends) */
export function addWorkingDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  const wholeDays = Math.ceil(days);
  while (added < wholeDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

// ─── Phase color configs ───

export const INSTANT_PHASE_COLORS: Record<string, string> = {
  Build: "#c4b5fd",   // violet-300
  Review: "#a78bfa",  // violet-400
  Deploy: "#7c3aed",  // violet-600
};

export const HUMAN_PHASE_COLORS: Record<string, string> = {
  Prod: "#fcd34d",      // amber-300
  Testing: "#fbbf24",   // amber-400
  Recette: "#f59e0b",   // amber-500
  MEP: "#d97706",       // amber-600
};

// ─── Velocity / Duration constants ───

export const VELOCITY_PER_SPRINT = 18;
export const SPRINT_DAYS = 10;

// ─── Phase computation ───

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/** Compute Instant Release phases: Build → Review → Deploy */
export function computeInstantPhases(
  totalSP: number,
  startDate: Date
): ReleasePhaseSegment[] {
  const buildDays = Math.max(1, Math.round(totalSP * 0.3));
  const reviewDays = 1;
  const deployDays = 1;

  const buildStart = new Date(startDate);
  const buildEnd = addWorkingDays(buildStart, buildDays);

  const reviewStart = new Date(buildEnd);
  const reviewEnd = addWorkingDays(reviewStart, reviewDays);

  const deployStart = new Date(reviewEnd);
  const deployEnd = addWorkingDays(deployStart, deployDays);

  return [
    {
      id: uuid(),
      name: "Build",
      startDate: buildStart.toISOString(),
      endDate: buildEnd.toISOString(),
      durationDays: buildDays,
      status: "pending",
      color: INSTANT_PHASE_COLORS.Build,
    },
    {
      id: uuid(),
      name: "Review",
      startDate: reviewStart.toISOString(),
      endDate: reviewEnd.toISOString(),
      durationDays: reviewDays,
      status: "pending",
      color: INSTANT_PHASE_COLORS.Review,
    },
    {
      id: uuid(),
      name: "Deploy",
      startDate: deployStart.toISOString(),
      endDate: deployEnd.toISOString(),
      durationDays: deployDays,
      status: "pending",
      color: INSTANT_PHASE_COLORS.Deploy,
    },
  ];
}

/** Compute Human Release phases: Prod → Testing → Recette → MEP */
export function computeHumanPhases(
  totalSP: number,
  startDate: Date
): ReleasePhaseSegment[] {
  const prodDays = Math.max(2, Math.round(totalSP * 1.2));
  const testingDays = Math.max(1, Math.round(prodDays * 0.3));
  const recetteDays = Math.max(1, Math.round(prodDays * 0.2));
  const mepDays = totalSP > 13 ? 2 : 1;

  const prodStart = new Date(startDate);
  const prodEnd = addWorkingDays(prodStart, prodDays);

  const testingStart = new Date(prodEnd);
  const testingEnd = addWorkingDays(testingStart, testingDays);

  const recetteStart = new Date(testingEnd);
  const recetteEnd = addWorkingDays(recetteStart, recetteDays);

  const mepStart = new Date(recetteEnd);
  const mepEnd = addWorkingDays(mepStart, mepDays);

  return [
    {
      id: uuid(),
      name: "Prod",
      startDate: prodStart.toISOString(),
      endDate: prodEnd.toISOString(),
      durationDays: prodDays,
      status: "pending",
      color: HUMAN_PHASE_COLORS.Prod,
    },
    {
      id: uuid(),
      name: "Testing",
      startDate: testingStart.toISOString(),
      endDate: testingEnd.toISOString(),
      durationDays: testingDays,
      status: "pending",
      color: HUMAN_PHASE_COLORS.Testing,
    },
    {
      id: uuid(),
      name: "Recette",
      startDate: recetteStart.toISOString(),
      endDate: recetteEnd.toISOString(),
      durationDays: recetteDays,
      status: "pending",
      color: HUMAN_PHASE_COLORS.Recette,
    },
    {
      id: uuid(),
      name: "MEP",
      startDate: mepStart.toISOString(),
      endDate: mepEnd.toISOString(),
      durationDays: mepDays,
      status: "pending",
      color: HUMAN_PHASE_COLORS.MEP,
    },
  ];
}
