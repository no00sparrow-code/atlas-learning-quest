import { describe, expect, it } from "vitest";
import { FEED } from "./cards";
import { CONCEPTS, QUEST_QUESTION_CONCEPTS, relatedConcepts } from "./concepts";
import { QUESTS } from "./quests";
import { SERIES } from "./series";

const conceptIds = new Set(CONCEPTS.map((concept) => concept.id));
const cardIds = new Set(FEED.map((card) => card.id));
const episodeIds = new Set(
  SERIES.flatMap((series) => series.episodes.map((episode) => episode.id)),
);
const questIds = new Set(QUESTS.map((quest) => quest.id));

describe("knowledge graph integrity", () => {
  it("uses unique concept IDs and valid prerequisite and related edges", () => {
    expect(conceptIds.size).toBe(CONCEPTS.length);

    for (const concept of CONCEPTS) {
      expect(new Set(concept.requires).size).toBe(concept.requires.length);
      expect(new Set(concept.related).size).toBe(concept.related.length);
      for (const id of [...concept.requires, ...concept.related]) {
        expect(id).not.toBe(concept.id);
        expect(conceptIds.has(id)).toBe(true);
      }
    }
  });

  it("keeps prerequisite edges acyclic", () => {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (id: string): boolean => {
      if (visiting.has(id)) return false;
      if (visited.has(id)) return true;
      visiting.add(id);

      const concept = CONCEPTS.find((entry) => entry.id === id);
      if (!concept) return false;
      for (const prerequisite of concept.requires) {
        if (!visit(prerequisite)) return false;
      }

      visiting.delete(id);
      visited.add(id);
      return true;
    };

    for (const concept of CONCEPTS) {
      expect(visit(concept.id), `Prerequisite cycle involving ${concept.id}`).toBe(true);
    }
  });

  it("links every concept to existing feed cards, episodes and quests", () => {
    for (const concept of CONCEPTS) {
      for (const id of concept.cardIds) expect(cardIds.has(id)).toBe(true);
      for (const id of concept.episodeIds) expect(episodeIds.has(id)).toBe(true);
      for (const id of concept.questIds) expect(questIds.has(id)).toBe(true);
    }
  });

  it("maps quiz question concepts to existing quests and concepts", () => {
    for (const [questId, mappedConcepts] of Object.entries(QUEST_QUESTION_CONCEPTS)) {
      const quest = QUESTS.find((entry) => entry.id === questId);
      expect(quest?.type).toBe("quiz");
      if (quest?.type !== "quiz") continue;
      expect(mappedConcepts).toHaveLength(quest.questions.length);
      for (const id of mappedConcepts) {
        if (id !== null) expect(conceptIds.has(id)).toBe(true);
      }
    }
  });

  it("returns unique, known related concepts without including the selected concept", () => {
    for (const concept of CONCEPTS) {
      const related = relatedConcepts(concept.id);
      const ids = related.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).not.toContain(concept.id);
      expect(ids.every((id) => conceptIds.has(id))).toBe(true);
    }
    expect(relatedConcepts("missing-concept")).toEqual([]);
  });
});
