import { getQuest } from "@/data/quests";

export interface ChallengeResponse {
  text: string;
  updatedAt: number;
}

/** Build a locally stored response only for a real, completed write challenge. */
export function buildChallengeResponse(
  questId: string,
  value: string,
  now = Date.now(),
): ChallengeResponse | null {
  const quest = getQuest(questId);
  if (quest?.type !== "challenge" || quest.mode !== "write") return null;

  const text = value.trim().slice(0, 5_000);
  if (text.length < (quest.minChars ?? 80)) return null;

  return { text, updatedAt: now };
}
