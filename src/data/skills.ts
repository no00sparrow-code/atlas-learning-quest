import type { CategoryId } from "./categories";

export interface SkillNode {
  id: string;
  category: CategoryId;
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  perk: string;
  requires: string[];
  /** Extra levels above the realm's unlock level */
  levelOffset: number;
}

type Def = [name: string, description: string, perk: string];

function realm(category: CategoryId, defs: [Def, Def, Def, Def]): SkillNode[] {
  const [a, b, c, d] = defs;
  const p = category.slice(0, 3);
  return [
    {
      id: `${p}-1`,
      category,
      tier: 1,
      name: a[0],
      description: a[1],
      perk: a[2],
      requires: [],
      levelOffset: 0,
    },
    {
      id: `${p}-2a`,
      category,
      tier: 2,
      name: b[0],
      description: b[1],
      perk: b[2],
      requires: [`${p}-1`],
      levelOffset: 1,
    },
    {
      id: `${p}-2b`,
      category,
      tier: 2,
      name: c[0],
      description: c[1],
      perk: c[2],
      requires: [`${p}-1`],
      levelOffset: 1,
    },
    {
      id: `${p}-3`,
      category,
      tier: 3,
      name: d[0],
      description: d[1],
      perk: d[2],
      requires: [`${p}-2a`, `${p}-2b`],
      levelOffset: 3,
    },
  ];
}

export const SKILLS: SkillNode[] = [
  ...realm("psychology", [
    [
      "Cognitive Biases",
      "The mental shortcuts that quietly bend every decision.",
      "Unlocks bias-spotting cards",
    ],
    ["Memory & Learning", "How memories form, fade and get rewritten.", "Spaced-review reminders"],
    ["Motivation", "Dopamine, habits and why rewards backfire.", "Habit-loop challenges"],
    [
      "Behavior Design",
      "Shape environments so good choices become easy.",
      "Capstone: Mind Architect title",
    ],
  ]),
  ...realm("science", [
    ["The Cosmos", "Stars, black holes and the scale of everything.", "Unlocks deep-space series"],
    [
      "Quantum Weirdness",
      "Superposition, entanglement and spooky action.",
      "Thought-experiment quests",
    ],
    [
      "Life's Extremes",
      "Organisms that survive where nothing should.",
      "Extremophile mystery pack",
    ],
    ["Unified Theories", "The hunt for one theory to explain it all.", "Capstone: Stargazer title"],
  ]),
  ...realm("technology", [
    [
      "How Computers Think",
      "Bits, logic gates and the birth of software.",
      "Unlocks retro-computing cards",
    ],
    ["The Internet Stack", "What really happens when you hit enter.", "Packet-tracing challenge"],
    ["Artificial Intelligence", "From perceptrons to large language models.", "AI ethics debates"],
    ["Future Systems", "Quantum chips, brain interfaces and beyond.", "Capstone: Architect title"],
  ]),
  ...realm("history", [
    ["Ancient Empires", "Rome, Egypt, Persia and how they held power.", "Unlocks empire timelines"],
    ["Lost Inventions", "Technologies that vanished, then returned.", "Artifact mysteries"],
    ["Turning Points", "Moments where history could have gone either way.", "What-if scenarios"],
    [
      "Patterns of History",
      "The cycles that repeat across centuries.",
      "Capstone: Chronicler title",
    ],
  ]),
  ...realm("creativity", [
    ["Creative Constraints", "Why limits make better work.", "Unlocks constraint sprints"],
    ["Incubation", "Letting ideas brew while you rest.", "Idea-journal prompts"],
    ["Storytelling", "Structures that make ideas stick.", "Story-building quests"],
    ["Original Thinking", "Combining distant ideas into new ones.", "Capstone: Visionary title"],
  ]),
  ...realm("business", [
    [
      "Behavioral Pricing",
      "Anchors, decoys and the psychology of price.",
      "Unlocks pricing teardowns",
    ],
    ["Startup Lore", "The pivots and near-deaths behind giants.", "Founder case files"],
    ["Negotiation", "Leverage, framing and walking away.", "Negotiation duels"],
    ["Strategy Mastery", "Moats, flywheels and long games.", "Capstone: Strategist title"],
  ]),
];

export function skillsFor(category: CategoryId): SkillNode[] {
  return SKILLS.filter((s) => s.category === category);
}
