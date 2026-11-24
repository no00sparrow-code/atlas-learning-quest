import type { CategoryId } from "./categories";

/**
 * Long-form learning: multi-episode deep dives with chapters and takeaways.
 * Content is data, not markup, so new series can be added without touching the UI.
 */

export interface Chapter {
  /** Seconds from the start of the episode */
  at: number;
  label: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  number: number;
  title: string;
  summary: string;
  seconds: number;
  chapters: Chapter[];
  takeaways: string[];
}

export interface Series {
  id: string;
  category: CategoryId;
  title: string;
  subtitle: string;
  blurb: string;
  creator: string;
  creatorName: string;
  /** Player level needed to start this deep dive */
  unlockLevel: number;
  level: "Starter" | "Core" | "Advanced";
  /** CSS object-position so series sharing art feel distinct */
  focus: string;
  relatedQuest?: string;
  episodes: Episode[];
}

const min = (m: number, s = 0) => m * 60 + s;

function episode(
  seriesId: string,
  number: number,
  id: string,
  title: string,
  summary: string,
  seconds: number,
  chapters: Chapter[],
  takeaways: string[],
): Episode {
  return { id, seriesId, number, title, summary, seconds, chapters, takeaways };
}

export const SERIES: Series[] = [
  {
    id: "memory-machine",
    category: "psychology",
    title: "The Memory Machine",
    subtitle: "How your brain builds, bends and rebuilds the past",
    blurb:
      "A four-part deep dive into the least reliable camera you own. You will leave knowing why confidence is not accuracy, and how to learn in a way that survives a week.",
    creator: "@mindlab.lena",
    creatorName: "Dr. Lena Ortiz",
    unlockLevel: 1,
    level: "Core",
    focus: "45% 35%",
    relatedQuest: "mind-tricks",
    episodes: [
      episode(
        "memory-machine",
        1,
        "mem-1",
        "Your brain is not a camera",
        "Every time you remember something, you rebuild it from fragments. That reconstruction is why memory feels vivid and still goes wrong.",
        min(18),
        [
          { at: 0, label: "The camera myth" },
          { at: min(4), label: "Reconstruction, not replay" },
          { at: min(9), label: "The misinformation effect" },
          { at: min(14), label: "Living with a rebuilt past" },
        ],
        [
          "Memory is reconstructive: details are filled in at the moment of recall.",
          "Confidence and accuracy are only loosely related.",
          "Leading questions can quietly edit what someone swears happened.",
        ],
      ),
      episode(
        "memory-machine",
        2,
        "mem-2",
        "Why forgetting is a feature",
        "Forgetting looks like failure, but it is the filter that keeps your brain usable. The trick is deciding what deserves to stay.",
        min(21),
        [
          { at: 0, label: "The forgetting curve" },
          { at: min(5), label: "Interference" },
          { at: min(11), label: "What survival needs" },
          { at: min(16), label: "Designing for retention" },
        ],
        [
          "Most of the forgetting curve happens in the first 24 hours.",
          "Old and new memories compete; sleep helps sort them.",
          "Retrieval, not rereading, is what signals importance to the brain.",
        ],
      ),
      episode(
        "memory-machine",
        3,
        "mem-3",
        "The 20-minute rule",
        "Spacing beats cramming by a wide margin, and the schedule can be almost insultingly simple. This episode walks through a two-week study plan you can copy.",
        min(16),
        [
          { at: 0, label: "Massed vs spaced" },
          { at: min(4), label: "The forgetting curve, again" },
          { at: min(9), label: "A two-week schedule" },
          { at: min(13), label: "Interleaving" },
        ],
        [
          "Short, spaced reviews beat long cramming sessions for durable memory.",
          "A review right before you would forget is the most efficient one.",
          "Mixing related topics (interleaving) builds flexible knowledge.",
        ],
      ),
      episode(
        "memory-machine",
        4,
        "mem-4",
        "Rewrite your learning story",
        "The stories you tell about your own ability become the limits you live inside. Learn to spot a fixed story and replace it with a usable one.",
        min(24),
        [
          { at: 0, label: "The story you repeat" },
          { at: min(6), label: "Fixed vs growth frames" },
          { at: min(12), label: "The failure file" },
          { at: min(18), label: "A new script" },
        ],
        [
          "Beliefs about ability change which strategies people are willing to try.",
          "Keeping a failure file normalises the iterations behind every skill.",
          "Specific stories ('I am learning X') beat vague ones ('I am smart').",
        ],
      ),
    ],
  },
  {
    id: "deep-universe",
    category: "science",
    title: "Edge of the Universe",
    subtitle: "Three episodes on scale, light and everything we cannot see",
    blurb:
      "From the size of a proton to the afterglow of the Big Bang, this series builds cosmic intuition in layers, ending with the dark matter and dark energy that make up 95% of everything.",
    creator: "@cosmic.kai",
    creatorName: "Kai Andersen",
    unlockLevel: 1,
    level: "Core",
    focus: "60% 45%",
    relatedQuest: "cosmic-scale",
    episodes: [
      episode(
        "deep-universe",
        1,
        "uni-1",
        "How big is big?",
        "Numbers like '93 billion light years' mean nothing until you build a ladder of scale from the room you are in to the edge of what we can observe.",
        min(22),
        [
          { at: 0, label: "A ladder of scale" },
          { at: min(6), label: "Powers of ten" },
          { at: min(12), label: "The observable horizon" },
          { at: min(17), label: "Why the edge moves" },
        ],
        [
          "The observable universe is about 93 billion light years across.",
          "Space itself expanded; light did not simply race outward.",
          "Every scale step hides a different physical law taking over.",
        ],
      ),
      episode(
        "deep-universe",
        2,
        "uni-2",
        "The first light",
        "For 380,000 years the universe was a glowing fog. When it cleared, the oldest light in existence started travelling, and we photographed it.",
        min(26),
        [
          { at: 0, label: "A fog of plasma" },
          { at: min(7), label: "Recombination" },
          { at: min(14), label: "The cosmic microwave background" },
          { at: min(20), label: "What the blotches tell us" },
        ],
        [
          "The cosmic microwave background is a snapshot of the universe at 380,000 years old.",
          "Tiny temperature ripples seeded every galaxy we see today.",
          "Measuring that light pinned down the universe's age and composition.",
        ],
      ),
      episode(
        "deep-universe",
        3,
        "uni-3",
        "Dark everything",
        "Everything we can see is a rounding error. This episode explains the evidence for dark matter and dark energy without hand-waving either one.",
        min(19),
        [
          { at: 0, label: "The missing mass" },
          { at: min(5), label: "Galaxy rotation curves" },
          { at: min(11), label: "Accelerating expansion" },
          { at: min(16), label: "What we still do not know" },
        ],
        [
          "Galaxies rotate as if they contain far more mass than their stars account for.",
          "Dark energy is the name for whatever is accelerating cosmic expansion.",
          "Roughly 95% of the universe is invisible to every telescope we have.",
        ],
      ),
    ],
  },
  {
    id: "machines-that-learn",
    category: "technology",
    title: "Machines That Learn",
    subtitle: "From a 1958 perceptron to the models you talk to today",
    blurb:
      "A tour of how systems go from pattern detectors to language models, including the uncomfortable parts: why they invent facts and why alignment is a design problem, not a bug list.",
    creator: "@bytesized.ana",
    creatorName: "Ana Ribeiro",
    unlockLevel: 1,
    level: "Advanced",
    focus: "40% 55%",
    relatedQuest: "bugs-bits",
    episodes: [
      episode(
        "machines-that-learn",
        1,
        "ai-1",
        "The perceptron's promise",
        "In 1958 a machine that learned from examples looked like magic. Its limits were exposed within a decade, and the fix took another twenty years.",
        min(17),
        [
          { at: 0, label: "A machine that adjusts" },
          { at: min(4), label: "Weights and errors" },
          { at: min(9), label: "The XOR problem" },
          { at: min(13), label: "Layers change everything" },
        ],
        [
          "A perceptron learns by nudging weights after each mistake.",
          "Single-layer networks cannot represent non-linear boundaries like XOR.",
          "Stacking layers lets models compose simple features into complex ones.",
        ],
      ),
      episode(
        "machines-that-learn",
        2,
        "ai-2",
        "Attention is all you need",
        "The 2017 transformer paper replaced recurrence with attention and unlocked modern AI. Here is the idea, minus the matrix algebra.",
        min(26),
        [
          { at: 0, label: "The sequence problem" },
          { at: min(7), label: "Attention as a spotlight" },
          { at: min(13), label: "Parallel by design" },
          { at: min(20), label: "Why scale worked" },
        ],
        [
          "Attention lets every token weigh every other token directly.",
          "Parallel training on GPUs made far larger models practical.",
          "Scale plus attention produced capabilities nobody explicitly programmed.",
        ],
      ),
      episode(
        "machines-that-learn",
        3,
        "ai-3",
        "Why models hallucinate",
        "A language model is optimised to produce plausible text, not true text. Once you see that gap, hallucinations stop looking random.",
        min(20),
        [
          { at: 0, label: "Plausible, not verified" },
          { at: min(5), label: "The next-token objective" },
          { at: min(11), label: "Confident nonsense" },
          { at: min(16), label: "Grounding and tools" },
        ],
        [
          "Next-token prediction rewards fluency, not factual accuracy.",
          "Models lack a built-in signal for 'I do not know'.",
          "Retrieval, tool use and citations reduce but do not remove errors.",
        ],
      ),
      episode(
        "machines-that-learn",
        4,
        "ai-4",
        "The alignment problem",
        "An optimiser will happily satisfy the letter of what you asked. The hard part is specifying what you actually meant.",
        min(24),
        [
          { at: 0, label: "Specification gaming" },
          { at: min(7), label: "Reward hacking" },
          { at: min(13), label: "Human feedback" },
          { at: min(19), label: "Designing guardrails" },
        ],
        [
          "Objectives are proxies; optimisers exploit the gap between proxy and goal.",
          "Human feedback shapes behaviour but inherits human inconsistencies.",
          "Layered evaluation, monitoring and access control matter as much as training.",
        ],
      ),
    ],
  },
  {
    id: "invention-engine",
    category: "creativity",
    title: "The Invention Engine",
    subtitle: "Where ideas come from and how to make more of them",
    blurb:
      "Creativity is not a lightning strike. It is a repeatable process of collecting, constraining and recombining, and this series gives you the workflow.",
    creator: "@studio.noor",
    creatorName: "Noor Haddad",
    unlockLevel: 4,
    level: "Starter",
    focus: "50% 65%",
    relatedQuest: "feynman-sprint",
    episodes: [
      episode(
        "invention-engine",
        1,
        "cre-1",
        "Where ideas hide",
        "Most 'new' ideas are old ideas in a new room. Learn to build a personal collection system that feeds your future work.",
        min(15),
        [
          { at: 0, label: "The myth of the spark" },
          { at: min(4), label: "Collecting, not deciding" },
          { at: min(8), label: "The adjacency habit" },
          { at: min(12), label: "A 10-minute practice" },
        ],
        [
          "Ideas are combinations of existing mental material.",
          "Collecting without judging keeps the raw material flowing.",
          "Adjacent fields supply the metaphors your own field is missing.",
        ],
      ),
      episode(
        "invention-engine",
        2,
        "cre-2",
        "Constraints as fuel",
        "Dr. Seuss wrote a classic on a 50-word bet. Constraints force divergent thinking by removing the easy exits.",
        min(18),
        [
          { at: 0, label: "The 50-word bet" },
          { at: min(4), label: "Why limits help" },
          { at: min(9), label: "Designing a constraint" },
          { at: min(14), label: "Constraint sprint" },
        ],
        [
          "Tight constraints reduce decision fatigue and force novel combinations.",
          "Useful constraints are arbitrary, specific and temporary.",
          "A 10-minute constraint sprint beats an hour of open-ended brainstorming.",
        ],
      ),
      episode(
        "invention-engine",
        3,
        "cre-3",
        "The remix method",
        "Take a proven structure from one domain and apply it to a problem in another. This is how most innovation actually happens.",
        min(21),
        [
          { at: 0, label: "Nothing starts from zero" },
          { at: min(5), label: "Structures travel" },
          { at: min(10), label: "The remix grid" },
          { at: min(16), label: "Shipping the remix" },
        ],
        [
          "Transferring a structure across domains produces genuinely new work.",
          "A remix grid (two axes of inspiration) makes combinations explicit.",
          "Originality is judged after shipping, not during drafting.",
        ],
      ),
    ],
  },
  {
    id: "empire-blueprint",
    category: "history",
    title: "Empires: A User's Manual",
    subtitle: "The logistics, taxes and choices behind the rise and fall",
    blurb:
      "Forget the statues. This series looks at empires as systems: how they fed cities, collected money and decided whether to adapt or double down.",
    creator: "@timeline.theo",
    creatorName: "Theo Marsh",
    unlockLevel: 3,
    level: "Core",
    focus: "35% 45%",
    relatedQuest: "mona-lisa",
    episodes: [
      episode(
        "empire-blueprint",
        1,
        "his-1",
        "How Rome fed a million people",
        "A city of a million is a logistics problem wearing a toga. Rome solved it with grain fleets, warehouses and a very political bread supply.",
        min(23),
        [
          { at: 0, label: "A million mouths" },
          { at: min(6), label: "The grain fleet" },
          { at: min(12), label: "Bread and politics" },
          { at: min(18), label: "Fragility by design" },
        ],
        [
          "Rome depended on imported grain from Egypt and North Africa.",
          "Free bread was a stability tool as much as a welfare policy.",
          "A single disrupted shipping lane could threaten the whole city.",
        ],
      ),
      episode(
        "empire-blueprint",
        2,
        "his-2",
        "The tax that broke an empire",
        "Tax systems reveal what a state actually values. When collection costs more than it raises, the machine starts eating itself.",
        min(19),
        [
          { at: 0, label: "Tax as an operating system" },
          { at: min(5), label: "Farmers and collectors" },
          { at: min(11), label: "Debasement" },
          { at: min(16), label: "The death spiral" },
        ],
        [
          "Tax farming let states raise cash fast at the cost of long-term trust.",
          "Currency debasement is an invisible tax that compounds.",
          "Fiscal failure usually arrives before military failure.",
        ],
      ),
      episode(
        "empire-blueprint",
        3,
        "his-3",
        "Collapse is a choice",
        "Historians now avoid the word 'collapse'. Empires usually transform: they fragment, outsource and adapt. The interesting question is who chose what.",
        min(24),
        [
          { at: 0, label: "The fall narrative" },
          { at: min(6), label: "Fragmentation" },
          { at: min(12), label: "Outsourcing defence" },
          { at: min(18), label: "What actually ends" },
        ],
        [
          "Political fragmentation often matters more than a single invasion.",
          "States that outsource violence lose control of it.",
          "Institutions outlive governments; that is where the real continuity sits.",
        ],
      ),
    ],
  },
  {
    id: "pricing-playbook",
    category: "business",
    title: "The Pricing Playbook",
    subtitle: "Anchors, decoys and the psychology of a price tag",
    blurb:
      "Prices are arguments, not arithmetic. Three episodes on the cognitive tricks behind menus, subscriptions and the number you decide is fair.",
    creator: "@marginnotes",
    creatorName: "Sam Okafor",
    unlockLevel: 5,
    level: "Starter",
    focus: "45% 40%",
    relatedQuest: "price-psychology",
    episodes: [
      episode(
        "pricing-playbook",
        1,
        "biz-1",
        "Anchors everywhere",
        "The first number you see becomes the ruler for every number after it. This is why 'was £120' feels like information even when it is decoration.",
        min(16),
        [
          { at: 0, label: "The first number wins" },
          { at: min(4), label: "Anchoring in menus" },
          { at: min(9), label: "Why discounts work" },
          { at: min(13), label: "Ethics of anchors" },
        ],
        [
          "Anchors bias estimates even when people are warned about them.",
          "Reference prices make discounts legible, not necessarily real.",
          "Anchors are legal, common and easy to abuse.",
        ],
      ),
      episode(
        "pricing-playbook",
        2,
        "biz-2",
        "Decoys and defaults",
        "The medium popcorn exists to sell you the large. Decoys and defaults shape choices without restricting them.",
        min(18),
        [
          { at: 0, label: "The Economist problem" },
          { at: min(5), label: "Asymmetric dominance" },
          { at: min(10), label: "The power of default" },
          { at: min(15), label: "Designing the menu" },
        ],
        [
          "A decoy option makes the intended option look obviously better.",
          "Defaults are the strongest nudge because they require no action.",
          "Choice architecture is unavoidable; only its intent is optional.",
        ],
      ),
      episode(
        "pricing-playbook",
        3,
        "biz-3",
        "Charge what it's worth",
        "Cost-plus pricing is safe and usually wrong. Value-based pricing starts with the outcome the customer gets.",
        min(20),
        [
          { at: 0, label: "Cost-plus trap" },
          { at: min(6), label: "Value and willingness to pay" },
          { at: min(12), label: "Packaging" },
          { at: min(17), label: "Raising prices" },
        ],
        [
          "Costs set a floor; perceived value sets the ceiling.",
          "Packaging (good/better/best) captures different willingness to pay.",
          "Price increases need a story, a timeline and a reason to stay.",
        ],
      ),
    ],
  },
];

export const ALL_EPISODES: Episode[] = SERIES.flatMap((s) => s.episodes);

export function getSeries(id: string): Series | undefined {
  return SERIES.find((s) => s.id === id);
}

export function getEpisode(id: string): { episode: Episode; series: Series } | undefined {
  for (const series of SERIES) {
    const episode = series.episodes.find((e) => e.id === id);
    if (episode) return { episode, series };
  }
  return undefined;
}

export function seriesMinutes(series: Series): number {
  return Math.round(series.episodes.reduce((total, e) => total + e.seconds, 0) / 60);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** Long-form watching is worth more XP than a short, scaled by length and capped. */
export function episodeXp(seconds: number): number {
  return Math.max(20, Math.min(80, Math.round((seconds / 60) * 2.5)));
}
