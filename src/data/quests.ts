import type { CategoryId } from "./categories";

export interface McqQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface QuestBase {
  id: string;
  title: string;
  subtitle: string;
  category: CategoryId;
  reward: number;
  difficulty: "Easy" | "Medium" | "Hard";
  minutes: number;
}

export interface QuizQuest extends QuestBase {
  type: "quiz";
  questions: McqQuestion[];
}

export interface MysteryQuest extends QuestBase {
  type: "mystery";
  premise: string;
  clues: string[];
  final: McqQuestion;
}

export interface ChallengeQuest extends QuestBase {
  type: "challenge";
  mode: "write" | "watch";
  prompt: string;
  minChars?: number;
  watchTarget?: number;
}

export type Quest = QuizQuest | MysteryQuest | ChallengeQuest;

export const QUESTS: Quest[] = [
  {
    id: "mona-lisa",
    type: "mystery",
    title: "The Vanishing Mona Lisa",
    subtitle: "Paris, 1911. The world's most famous painting is gone.",
    category: "history",
    reward: 120,
    difficulty: "Hard",
    minutes: 4,
    premise:
      "On a Tuesday morning in August 1911, a painter arrives at the Louvre to sketch the Mona Lisa. Only four iron pegs remain on the wall. Who took it?",
    clues: [
      "The museum was closed on Monday. Whoever did it had all day inside without crowds.",
      "The thief hid in a storage closet overnight, then walked out wearing a white worker's smock.",
      "He had once worked at the Louvre, fitting protective glass over famous paintings.",
      "He believed the painting belonged in Italy. Two years later he was caught trying to sell it in Florence.",
    ],
    final: {
      question: "Who stole the Mona Lisa?",
      options: [
        "Pablo Picasso",
        "Guillaume Apollinaire",
        "Vincenzo Peruggia",
        "Eduardo de Valfierno",
      ],
      answer: 2,
      explanation:
        "Vincenzo Peruggia, an Italian handyman, kept it in a trunk for two years. Picasso and the poet Apollinaire were both questioned, but innocent.",
    },
  },
  {
    id: "cosmic-scale",
    type: "quiz",
    title: "Cosmic Scale",
    subtitle: "How well do you know the universe?",
    category: "science",
    reward: 80,
    difficulty: "Medium",
    minutes: 3,
    questions: [
      {
        question: "Roughly how much would a teaspoon of neutron star weigh on Earth?",
        options: ["1 ton", "1,000 tons", "A billion tons", "As much as Earth"],
        answer: 2,
        explanation:
          "Neutron star matter is so dense that a teaspoon weighs around a billion tons.",
      },
      {
        question: "How long does sunlight take to reach Earth?",
        options: ["8 seconds", "8 minutes", "8 hours", "8 days"],
        answer: 1,
        explanation:
          "About 8 minutes and 20 seconds. You always see the Sun as it was in the past.",
      },
      {
        question: "Which animal survived direct exposure to outer space?",
        options: ["Cockroach", "Tardigrade", "Jellyfish", "Ant"],
        answer: 1,
        explanation: "Tardigrades survived open vacuum and radiation on a 2007 satellite mission.",
      },
      {
        question: "About how many Earths could fit inside the Sun?",
        options: ["1,300", "13,000", "1.3 million", "1.3 billion"],
        answer: 2,
        explanation: "Around 1.3 million Earths would fit inside the Sun's volume.",
      },
    ],
  },
  {
    id: "feynman-sprint",
    type: "challenge",
    mode: "write",
    title: "Feynman Sprint",
    subtitle: "Teach it simply to truly learn it.",
    category: "creativity",
    reward: 50,
    difficulty: "Easy",
    minutes: 2,
    prompt:
      "Pick one idea you learned today. Explain it as if to a curious 12-year-old, in three short sentences. No jargon allowed.",
    minChars: 80,
  },
  {
    id: "bugs-bits",
    type: "quiz",
    title: "Bugs, Bits & Breakthroughs",
    subtitle: "Computing history in four questions.",
    category: "technology",
    reward: 80,
    difficulty: "Medium",
    minutes: 3,
    questions: [
      {
        question: "What was the first logged “computer bug” in 1947?",
        options: ["A typo in code", "A moth in a relay", "A blown fuse", "A mouse in the wiring"],
        answer: 1,
        explanation:
          "Grace Hopper's team found a moth in the Harvard Mark II and taped it into the log.",
      },
      {
        question: "Why do GPS satellite clocks need constant correction?",
        options: ["Solar wind", "Einstein's relativity", "Battery drift", "Earth's magnetic field"],
        answer: 1,
        explanation:
          "Speed and weaker gravity make their clocks run about 38 microseconds a day fast.",
      },
      {
        question: "What does HTTP stand for?",
        options: [
          "HyperText Transfer Protocol",
          "High Traffic Transit Path",
          "Hosted Text Transfer Program",
          "HyperTool Terminal Protocol",
        ],
        answer: 0,
        explanation: "HyperText Transfer Protocol, the language browsers and servers speak.",
      },
      {
        question: "Roughly how much memory did the Apollo 11 guidance computer have?",
        options: ["4 KB", "4 MB", "64 MB", "1 GB"],
        answer: 0,
        explanation: "About 4 KB of erasable memory. It landed humans on the Moon.",
      },
    ],
  },
  {
    id: "penicillin",
    type: "mystery",
    title: "The Messy Lab",
    subtitle: "London, 1928. A forgotten dish changes medicine.",
    category: "science",
    reward: 100,
    difficulty: "Medium",
    minutes: 3,
    premise:
      "A scientist returns from a two-week holiday to find his lab bench cluttered with old culture dishes. One of them looks strange. What did he discover?",
    clues: [
      "He studied Staphylococcus, the bacteria behind many infections.",
      "A fuzzy blue-green mould had landed on one dish through an open window.",
      "Around the mould, there was a clear ring where the bacteria had died.",
    ],
    final: {
      question: "What did Alexander Fleming discover?",
      options: ["X-rays", "Penicillin", "Insulin", "The smallpox vaccine"],
      answer: 1,
      explanation:
        "Penicillin, the first true antibiotic. It went on to save an estimated 200 million lives.",
    },
  },
  {
    id: "price-psychology",
    type: "quiz",
    title: "Price Psychology",
    subtitle: "The hidden tricks behind every price tag.",
    category: "business",
    reward: 70,
    difficulty: "Easy",
    minutes: 2,
    questions: [
      {
        question:
          "The Economist offered web $59, print $125, print + web $125. Why include print-only?",
        options: [
          "Legal requirement",
          "A decoy to make the bundle look better",
          "For older readers",
          "A pricing mistake",
        ],
        answer: 1,
        explanation: "It's a decoy. It makes print + web feel like getting web for free.",
      },
      {
        question: "Prices like $9.99 work mainly because of the…",
        options: ["Left-digit effect", "Halo effect", "Endowment effect", "Placebo effect"],
        answer: 0,
        explanation: "We anchor on the first digit, so $9.99 feels much closer to $9 than $10.",
      },
      {
        question: "In 2000, Netflix offered to sell itself to Blockbuster for…",
        options: ["$5 million", "$50 million", "$500 million", "$5 billion"],
        answer: 1,
        explanation: "$50 million. Blockbuster declined and went bankrupt in 2010.",
      },
    ],
  },
  {
    id: "curiosity-streak",
    type: "challenge",
    mode: "watch",
    title: "Curiosity Streak",
    subtitle: "Finish 3 Discover cards to claim your reward.",
    category: "psychology",
    reward: 40,
    difficulty: "Easy",
    minutes: 3,
    prompt: "Watch 3 cards in Discover all the way to the end. Each finished card counts.",
    watchTarget: 3,
  },
  {
    id: "mind-tricks",
    type: "quiz",
    title: "Mind Tricks",
    subtitle: "Spot the biases running your brain.",
    category: "psychology",
    reward: 60,
    difficulty: "Easy",
    minutes: 2,
    questions: [
      {
        question:
          "Students wearing an embarrassing T-shirt guessed 50% of peers noticed. How many actually did?",
        options: ["8%", "23%", "51%", "74%"],
        answer: 1,
        explanation: "About 23%. That's the spotlight effect.",
      },
      {
        question: "Why do unfinished tasks keep popping into your head?",
        options: ["Dunning–Kruger effect", "Zeigarnik effect", "Placebo effect", "Halo effect"],
        answer: 1,
        explanation: "The Zeigarnik effect keeps incomplete tasks active in memory.",
      },
      {
        question: "Which bias makes us assume attractive people are also smart and kind?",
        options: ["Anchoring", "Halo effect", "Confirmation bias", "Sunk cost"],
        answer: 1,
        explanation: "The halo effect: one good trait colors how we judge everything else.",
      },
    ],
  },
];

export function getQuest(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}
