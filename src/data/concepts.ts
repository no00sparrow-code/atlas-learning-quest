import type { CategoryId } from "./categories";

/**
 * The concept graph behind the knowledge map, adaptive review and recommendations.
 * Content links tie every concept to the lessons that teach it.
 */

export interface Concept {
  id: string;
  name: string;
  category: CategoryId;
  summary: string;
  /** Why this idea is useful outside the app */
  why: string;
  requires: string[];
  related: string[];
  difficulty: 1 | 2 | 3;
  cardIds: string[];
  episodeIds: string[];
  questIds: string[];
}

export const CONCEPTS: Concept[] = [
  /* ------------------------------------------------------------ psychology */
  {
    id: "spotlight-effect",
    name: "The spotlight effect",
    category: "psychology",
    summary:
      "We overestimate how much other people notice us. In the famous T-shirt study, students guessed 50% of peers noticed; only about 23% did.",
    why: "Most social embarrassment is louder in your head than in the room.",
    requires: [],
    related: ["halo-effect"],
    difficulty: 1,
    cardIds: ["spotlight-effect"],
    episodeIds: ["mem-4"],
    questIds: ["mind-tricks"],
  },
  {
    id: "zeigarnik-effect",
    name: "Open loops",
    category: "psychology",
    summary:
      "Unfinished tasks stay active in memory and keep demanding attention. Writing down a plan can quiet the loop.",
    why: "Start something to remember it; plan it to stop ruminating.",
    requires: ["memory-reconstruction"],
    related: ["spaced-repetition"],
    difficulty: 1,
    cardIds: ["zeigarnik"],
    episodeIds: ["mem-2"],
    questIds: ["mind-tricks"],
  },
  {
    id: "halo-effect",
    name: "The halo effect",
    category: "psychology",
    summary:
      "One positive trait, such as attractiveness, colours unrelated judgements like intelligence or kindness.",
    why: "It shapes hiring, first impressions and how we judge people we like.",
    requires: [],
    related: ["spotlight-effect"],
    difficulty: 1,
    cardIds: [],
    episodeIds: [],
    questIds: ["mind-tricks"],
  },
  {
    id: "memory-reconstruction",
    name: "Memory is reconstructive",
    category: "psychology",
    summary:
      "Remembering is not playback. The brain rebuilds an event from fragments, which is why vivid memories can still be wrong.",
    why: "Confidence is not the same as accuracy — in yourself and in witnesses.",
    requires: [],
    related: ["spaced-repetition", "zeigarnik-effect"],
    difficulty: 2,
    cardIds: [],
    episodeIds: ["mem-1"],
    questIds: [],
  },
  {
    id: "spaced-repetition",
    name: "Spaced repetition",
    category: "psychology",
    summary:
      "Reviewing material just before you would forget it beats cramming. Interleaving related topics makes knowledge more flexible.",
    why: "A two-week spaced schedule outperforms an all-nighter you barely remember.",
    requires: ["memory-reconstruction"],
    related: ["zeigarnik-effect"],
    difficulty: 2,
    cardIds: [],
    episodeIds: ["mem-3"],
    questIds: [],
  },

  /* --------------------------------------------------------------- science */
  {
    id: "cosmic-scale",
    name: "Cosmic scale",
    category: "science",
    summary:
      "The observable universe is about 93 billion light years across, and roughly 1.3 million Earths would fit inside the Sun.",
    why: "Scale gives every other fact about space its meaning.",
    requires: [],
    related: ["cosmic-background", "dark-matter"],
    difficulty: 1,
    cardIds: ["neutron-star"],
    episodeIds: ["uni-1"],
    questIds: ["cosmic-scale"],
  },
  {
    id: "cosmic-background",
    name: "The first light",
    category: "science",
    summary:
      "The cosmic microwave background is relic light from 380,000 years after the Big Bang, when the universe stopped being a glowing fog.",
    why: "It is the oldest photograph we have, and it seeded every galaxy.",
    requires: ["cosmic-scale"],
    related: ["dark-matter"],
    difficulty: 2,
    cardIds: [],
    episodeIds: ["uni-2"],
    questIds: ["cosmic-scale"],
  },
  {
    id: "dark-matter",
    name: "Dark matter",
    category: "science",
    summary:
      "Galaxies rotate as if they contain far more mass than their stars account for. Dark matter is the name for the missing mass.",
    why: "Most of the universe is something we still cannot identify.",
    requires: ["cosmic-scale"],
    related: ["cosmic-background"],
    difficulty: 3,
    cardIds: [],
    episodeIds: ["uni-3"],
    questIds: ["cosmic-scale"],
  },
  {
    id: "extremophiles",
    name: "Extremophiles",
    category: "science",
    summary:
      "Tardigrades survived open space by drying into a 'tun' state that nearly pauses metabolism.",
    why: "Life's limits are wider than we assume, which matters for astrobiology.",
    requires: [],
    related: ["cosmic-scale"],
    difficulty: 1,
    cardIds: ["tardigrades"],
    episodeIds: [],
    questIds: ["cosmic-scale"],
  },

  /* --------------------------------------------------------------- history */
  {
    id: "ancient-scale",
    name: "Ancient scale",
    category: "history",
    summary:
      "The Great Pyramid was already about 2,500 years old when Cleopatra was born. Ancient history had its own ancient history.",
    why: "Timelines stop us flattening thousands of years into 'long ago'.",
    requires: [],
    related: ["art-provenance", "roman-engineering"],
    difficulty: 1,
    cardIds: ["cleopatra-timeline"],
    episodeIds: [],
    questIds: [],
  },
  {
    id: "art-provenance",
    name: "Art and provenance",
    category: "history",
    summary:
      "The 1911 theft of the Mona Lisa made an admired painting into a global icon. Provenance is the record of where an object has been.",
    why: "Ownership history explains both value and controversy in art.",
    requires: ["ancient-scale"],
    related: ["ancient-scale"],
    difficulty: 2,
    cardIds: [],
    episodeIds: [],
    questIds: ["mona-lisa"],
  },
  {
    id: "roman-engineering",
    name: "Roman engineering",
    category: "history",
    summary:
      "Roman concrete self-heals because quicklime clumps recrystallise when water enters a crack. Harbours have survived two millennia.",
    why: "Ancient materials science is still teaching modern engineers.",
    requires: ["ancient-scale"],
    related: ["empire-decline"],
    difficulty: 2,
    cardIds: ["roman-concrete"],
    episodeIds: ["his-1"],
    questIds: [],
  },
  {
    id: "empire-decline",
    name: "How empires end",
    category: "history",
    summary:
      "Collapse is usually transformation: fragmentation, fiscal strain and outsourcing violence, not one dramatic invasion.",
    why: "Institutions outlive governments, which is where continuity really lives.",
    requires: ["roman-engineering"],
    related: ["ancient-scale"],
    difficulty: 3,
    cardIds: [],
    episodeIds: ["his-3"],
    questIds: [],
  },

  /* ------------------------------------------------------------ technology */
  {
    id: "relativity-gps",
    name: "Relativity in your pocket",
    category: "technology",
    summary:
      "GPS satellite clocks gain about 38 microseconds a day relative to Earth. Without correction, positions would drift kilometres daily.",
    why: "Abstract physics quietly powers everyday navigation.",
    requires: [],
    related: ["cosmic-scale", "computing-history"],
    difficulty: 2,
    cardIds: ["gps-einstein"],
    episodeIds: [],
    questIds: ["bugs-bits"],
  },
  {
    id: "computing-history",
    name: "Computing lore",
    category: "technology",
    summary:
      "In 1947 a moth in a Harvard Mark II relay was taped into the logbook as the first 'actual case of bug being found'.",
    why: "The stories we tell about computing shape how we imagine its future.",
    requires: [],
    related: ["internet-stack", "neural-networks"],
    difficulty: 1,
    cardIds: ["first-bug"],
    episodeIds: ["ai-1"],
    questIds: ["bugs-bits"],
  },
  {
    id: "internet-stack",
    name: "The internet stack",
    category: "technology",
    summary:
      "HTTP is the protocol browsers and servers speak; requests and responses are layered on top of TCP/IP and DNS.",
    why: "Knowing the layers makes debugging and security far less mysterious.",
    requires: ["computing-history"],
    related: ["neural-networks"],
    difficulty: 2,
    cardIds: [],
    episodeIds: [],
    questIds: ["bugs-bits"],
  },
  {
    id: "neural-networks",
    name: "Neural networks",
    category: "technology",
    summary:
      "A perceptron learns by nudging weights after mistakes. Single layers cannot represent non-linear boundaries, but stacked layers can.",
    why: "Almost every modern AI system is built from this basic learning loop.",
    requires: ["computing-history"],
    related: ["transformer-attention"],
    difficulty: 2,
    cardIds: [],
    episodeIds: ["ai-1"],
    questIds: [],
  },
  {
    id: "transformer-attention",
    name: "Attention",
    category: "technology",
    summary:
      "Transformers replaced recurrence with attention, letting every token weigh every other token and training in parallel.",
    why: "This is the architecture behind the models people talk to today.",
    requires: ["neural-networks"],
    related: ["model-hallucination"],
    difficulty: 3,
    cardIds: [],
    episodeIds: ["ai-2"],
    questIds: [],
  },
  {
    id: "model-hallucination",
    name: "Why models hallucinate",
    category: "technology",
    summary:
      "Language models are optimised for plausible next tokens, not verified facts, so fluent answers can be confidently wrong.",
    why: "Knowing this is the difference between using AI and trusting it blindly.",
    requires: ["transformer-attention"],
    related: ["internet-stack"],
    difficulty: 3,
    cardIds: [],
    episodeIds: ["ai-3"],
    questIds: [],
  },

  /* ------------------------------------------------------------ creativity */
  {
    id: "creative-constraints",
    name: "Constraints as fuel",
    category: "creativity",
    summary:
      "Tight, arbitrary constraints remove easy exits and force novel combinations. Dr. Seuss's 50-word bet produced Green Eggs and Ham.",
    why: "A ten-minute constraint sprint often beats an hour of open brainstorming.",
    requires: [],
    related: ["incubation", "remixing"],
    difficulty: 1,
    cardIds: ["constraints"],
    episodeIds: ["cre-2"],
    questIds: [],
  },
  {
    id: "incubation",
    name: "Incubation",
    category: "creativity",
    summary:
      "After hard focus, stepping away lets the mind link distant memories. Ideas often surface during low-effort activity.",
    why: "Rest is part of the work, not a reward for finishing it.",
    requires: [],
    related: ["creative-constraints"],
    difficulty: 1,
    cardIds: ["incubation"],
    episodeIds: ["cre-1"],
    questIds: [],
  },
  {
    id: "feynman-technique",
    name: "Explain it simply",
    category: "creativity",
    summary:
      "Explaining an idea in plain language exposes exactly where your understanding has holes.",
    why: "If you cannot explain it to a curious twelve-year-old, you do not know it yet.",
    requires: [],
    related: ["spaced-repetition"],
    difficulty: 1,
    cardIds: [],
    episodeIds: [],
    questIds: ["feynman-sprint"],
  },
  {
    id: "remixing",
    name: "Remixing",
    category: "creativity",
    summary:
      "Most innovation transfers a proven structure from one domain into another. Originality is judged after shipping, not while drafting.",
    why: "Collect structures, not just facts, and you always have material to combine.",
    requires: ["creative-constraints"],
    related: ["incubation"],
    difficulty: 2,
    cardIds: [],
    episodeIds: ["cre-3"],
    questIds: [],
  },

  /* -------------------------------------------------------------- business */
  {
    id: "decoy-effect",
    name: "The decoy effect",
    category: "business",
    summary:
      "An inferior option makes the intended option look like a bargain. The Economist's print-only price existed to sell the bundle.",
    why: "Every menu is a piece of choice architecture.",
    requires: [],
    related: ["anchoring", "market-disruption"],
    difficulty: 1,
    cardIds: ["decoy-effect"],
    episodeIds: ["biz-2"],
    questIds: ["price-psychology"],
  },
  {
    id: "anchoring",
    name: "Anchoring",
    category: "business",
    summary:
      "The first number you see becomes the ruler for every number after it, even when it is arbitrary.",
    why: "Discounts, salaries and negotiations all run on reference prices.",
    requires: ["decoy-effect"],
    related: ["value-pricing"],
    difficulty: 2,
    cardIds: [],
    episodeIds: ["biz-1"],
    questIds: ["price-psychology"],
  },
  {
    id: "market-disruption",
    name: "Disruption",
    category: "business",
    summary:
      "Incumbents dismiss small entrants until the entrant's model becomes the default. Blockbuster passed on buying Netflix for $50 million in 2000.",
    why: "What looks like a niche today can be the operating model tomorrow.",
    requires: [],
    related: ["decoy-effect"],
    difficulty: 2,
    cardIds: ["netflix-blockbuster"],
    episodeIds: [],
    questIds: ["price-psychology"],
  },
  {
    id: "value-pricing",
    name: "Value-based pricing",
    category: "business",
    summary:
      "Costs set a floor; perceived value sets the ceiling. Packaging captures different willingness to pay.",
    why: "Cost-plus pricing leaves money and positioning on the table.",
    requires: ["anchoring"],
    related: ["market-disruption"],
    difficulty: 3,
    cardIds: [],
    episodeIds: ["biz-3"],
    questIds: [],
  },
];

export function getConcept(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}

export function conceptsForCategory(category: CategoryId): Concept[] {
  return CONCEPTS.filter((c) => c.category === category);
}

export function conceptsForContent(kind: "short" | "episode", id: string): Concept[] {
  return CONCEPTS.filter((c) =>
    kind === "short" ? c.cardIds.includes(id) : c.episodeIds.includes(id),
  );
}

export function relatedConcepts(id: string): Concept[] {
  const concept = getConcept(id);
  if (!concept) return [];
  return [...new Set([...concept.related, ...concept.requires])]
    .map((relatedId) => getConcept(relatedId))
    .filter((value): value is Concept => Boolean(value) && value?.id !== id);
}

/** Quiz questions mapped to the concept they demonstrate, by question index. */
export const QUEST_QUESTION_CONCEPTS: Record<string, (string | null)[]> = {
  "mind-tricks": ["spotlight-effect", "zeigarnik-effect", "halo-effect"],
  "cosmic-scale": ["cosmic-scale", "cosmic-scale", "extremophiles", "cosmic-scale"],
  "bugs-bits": ["computing-history", "relativity-gps", "internet-stack", "computing-history"],
  "price-psychology": ["decoy-effect", "anchoring", "market-disruption"],
};

/** Final-answer concepts for mystery quests. */
export const QUEST_FINAL_CONCEPTS: Record<string, string> = {
  "mona-lisa": "art-provenance",
};

export function questQuestionConcept(questId: string, index: number): string | undefined {
  const conceptId = QUEST_QUESTION_CONCEPTS[questId]?.[index];
  return conceptId ?? undefined;
}
