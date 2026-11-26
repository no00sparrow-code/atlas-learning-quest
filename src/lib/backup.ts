import { CATEGORIES } from "@/data/categories";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every(isNonNegativeNumber);
}

function isProgressRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (item) =>
        isRecord(item) &&
        typeof item["position"] === "number" &&
        Number.isFinite(item["position"]) &&
        item["position"] >= 0 &&
        item["position"] <= 1 &&
        typeof item["completed"] === "boolean" &&
        isNonNegativeNumber(item["updatedAt"]),
    )
  );
}

function isQuestRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (item) =>
        isRecord(item) &&
        isNonNegativeNumber(item["xp"]) &&
        (item["score"] === undefined || typeof item["score"] === "string"),
    )
  );
}

function isMemoryRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (item) =>
        isRecord(item) &&
        isNonNegativeNumber(item["attempts"]) &&
        Number.isInteger(item["attempts"]) &&
        isNonNegativeNumber(item["correct"]) &&
        Number.isInteger(item["correct"]) &&
        item["correct"] <= item["attempts"] &&
        typeof item["strength"] === "number" &&
        Number.isFinite(item["strength"]) &&
        item["strength"] >= 0 &&
        item["strength"] <= 1 &&
        typeof item["ease"] === "number" &&
        Number.isFinite(item["ease"]) &&
        item["ease"] > 0 &&
        isNonNegativeNumber(item["interval"]) &&
        typeof item["dueDay"] === "string" &&
        typeof item["lastSeen"] === "string",
    )
  );
}

/** Validate imported JSON before it is allowed to replace a learner's local progress. */
export function isAtlasBackup(value: unknown): boolean {
  if (!isRecord(value) || value["version"] !== 2) return false;

  return (
    typeof value["onboarded"] === "boolean" &&
    typeof value["name"] === "string" &&
    typeof value["handle"] === "string" &&
    isNonNegativeNumber(value["xp"]) &&
    isNonNegativeNumber(value["streak"]) &&
    isNonNegativeNumber(value["bestStreak"]) &&
    typeof value["lastActiveDay"] === "string" &&
    isNumberRecord(value["xpByDay"]) &&
    isStringArray(value["watched"]) &&
    isStringArray(value["liked"]) &&
    isStringArray(value["saved"]) &&
    isProgressRecord(value["shorts"]) &&
    isProgressRecord(value["episodes"]) &&
    Array.isArray(value["history"]) &&
    value["history"].every(
      (item) =>
        isRecord(item) &&
        (item["kind"] === "short" || item["kind"] === "episode") &&
        typeof item["id"] === "string" &&
        isNonNegativeNumber(item["at"]),
    ) &&
    isQuestRecord(value["completedQuests"]) &&
    isStringArray(value["unlockedSkills"]) &&
    isNumberRecord(value["achievements"]) &&
    isStringArray(value["claimedGoals"]) &&
    Array.isArray(value["interests"]) &&
    value["interests"].every((id) => CATEGORIES.some((category) => category.id === id)) &&
    isStringArray(value["ambitions"]) &&
    isMemoryRecord(value["memory"]) &&
    Array.isArray(value["reviewLog"]) &&
    value["reviewLog"].every(
      (item) =>
        isRecord(item) &&
        isNonNegativeNumber(item["at"]) &&
        typeof item["conceptId"] === "string" &&
        typeof item["correct"] === "boolean" &&
        (item["source"] === "review" || item["source"] === "quiz"),
    ) &&
    isNumberRecord(value["reviewXpByDay"])
  );
}
