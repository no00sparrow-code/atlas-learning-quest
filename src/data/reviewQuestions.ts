import type { CategoryId } from "./categories";
import { getConcept } from "./concepts";

/** Retrieval-practice question bank. One or more per concept. */
export interface ReviewQuestion {
  id: string;
  conceptId: string;
  category: CategoryId;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: 1 | 2 | 3;
}

function question(
  conceptId: string,
  prompt: string,
  options: string[],
  answer: number,
  explanation: string,
): ReviewQuestion {
  const concept = getConcept(conceptId);
  if (!concept) throw new Error(`Unknown concept ${conceptId}`);
  return {
    id: `q-${conceptId}`,
    conceptId,
    category: concept.category,
    prompt,
    options,
    answer,
    explanation,
    difficulty: concept.difficulty,
  };
}

export const REVIEW_QUESTIONS: ReviewQuestion[] = [
  question(
    "spotlight-effect",
    "In the Cornell 'embarrassing T-shirt' study, how many peers actually noticed?",
    ["About 8%", "About 23%", "About 51%", "About 74%"],
    1,
    "Only around 23% noticed, while the wearers guessed about 50%. That gap is the spotlight effect.",
  ),
  question(
    "zeigarnik-effect",
    "Which effect explains why unfinished tasks keep intruding on your thoughts?",
    ["Halo effect", "Zeigarnik effect", "Anchoring", "Dunning–Kruger"],
    1,
    "The Zeigarnik effect keeps incomplete tasks active in memory until they are closed or planned.",
  ),
  question(
    "halo-effect",
    "Assuming an attractive person is also kind and intelligent is an example of…",
    ["Anchoring", "The halo effect", "Confirmation bias", "Sunk cost"],
    1,
    "The halo effect lets one positive trait colour unrelated judgements.",
  ),
  question(
    "memory-reconstruction",
    "Which description best matches how human memory works?",
    [
      "A video recording replayed exactly",
      "A reconstruction rebuilt from fragments",
      "A searchable database of exact files",
      "A photograph stored once and never changed",
    ],
    1,
    "Recall rebuilds an event from fragments, filling gaps with expectations. That is why confidence and accuracy can diverge.",
  ),
  question(
    "spaced-repetition",
    "Which study pattern usually produces the strongest long-term retention?",
    [
      "One long cramming session the night before",
      "Short reviews spread across several days",
      "Rereading the same page ten times in a row",
      "Highlighting everything once",
    ],
    1,
    "Spacing reviews just before forgetting produces more durable memory than massed practice.",
  ),
  question(
    "cosmic-scale",
    "Roughly how many Earths would fit inside the Sun?",
    ["1,300", "13,000", "1.3 million", "1.3 billion"],
    2,
    "Around 1.3 million Earths would fit inside the Sun's volume. Scale is the key intuition.",
  ),
  question(
    "cosmic-background",
    "What is the cosmic microwave background?",
    [
      "Light from the first stars",
      "Relic light from 380,000 years after the Big Bang",
      "Radiation emitted by black holes",
      "The glow of the Milky Way's centre",
    ],
    1,
    "It is the afterglow of the young universe, released when space became transparent.",
  ),
  question(
    "dark-matter",
    "What is the strongest evidence that galaxies contain dark matter?",
    [
      "Their colour is slightly blue-shifted",
      "They rotate as if they contain far more mass than their stars",
      "They emit no visible light at all",
      "They are all moving away from us",
    ],
    1,
    "Galaxy rotation curves imply unseen mass holding them together.",
  ),
  question(
    "extremophiles",
    "Which animal survived direct exposure to open space in 2007?",
    ["Cockroach", "Tardigrade", "Jellyfish", "Ant"],
    1,
    "Tardigrades survived vacuum and radiation by entering a dried-out 'tun' state.",
  ),
  question(
    "ancient-scale",
    "About how long before Cleopatra was the Great Pyramid built?",
    ["250 years", "2,500 years", "25,000 years", "It was built during her reign"],
    1,
    "The pyramid was finished around 2560 BC, roughly 2,500 years before Cleopatra was born.",
  ),
  question(
    "art-provenance",
    "Who stole the Mona Lisa from the Louvre in 1911?",
    ["Pablo Picasso", "Guillaume Apollinaire", "Vincenzo Peruggia", "Eduardo de Valfierno"],
    2,
    "Vincenzo Peruggia, a former Louvre handyman, kept it for two years before trying to sell it in Florence.",
  ),
  question(
    "roman-engineering",
    "Why does Roman concrete appear to heal its own cracks?",
    [
      "It contains living bacteria",
      "Lime clumps recrystallise when water enters a crack",
      "It expands when it freezes",
      "The surface is coated in a modern sealant",
    ],
    1,
    "Water dissolves reactive lime clumps, which recrystallise and seal the gap.",
  ),
  question(
    "empire-decline",
    "Modern historians tend to describe the end of Rome as…",
    [
      "A single decisive invasion",
      "A gradual fragmentation and transformation",
      "A sudden natural disaster",
      "A peaceful handover of power",
    ],
    1,
    "Fragmentation, fiscal strain and outsourcing violence matter more than one dramatic 'fall'.",
  ),
  question(
    "relativity-gps",
    "Without relativity corrections, roughly how far would GPS positions drift per day?",
    ["A few centimetres", "A few metres", "About 10 kilometres", "About 1,000 kilometres"],
    2,
    "Satellite clocks run about 38 microseconds per day fast relative to Earth; uncorrected, positions would drift by kilometres daily.",
  ),
  question(
    "computing-history",
    "What was the 'bug' found in the Harvard Mark II in 1947?",
    ["A typo in code", "A moth in a relay", "A blown fuse", "A mouse in the wiring"],
    1,
    "Engineers found a moth in a relay and taped it into the logbook.",
  ),
  question(
    "internet-stack",
    "What does HTTP stand for?",
    [
      "HyperText Transfer Protocol",
      "High Traffic Transit Path",
      "Hosted Text Transfer Program",
      "HyperTool Terminal Protocol",
    ],
    0,
    "HTTP is the application-layer protocol browsers and servers use to exchange requests and responses.",
  ),
  question(
    "neural-networks",
    "Why did single-layer perceptrons stall?",
    [
      "They could not represent non-linear boundaries like XOR",
      "They required too much memory to store",
      "They could only process images",
      "They needed quantum hardware",
    ],
    0,
    "Stacking layers lets a network compose simple features into non-linear decisions.",
  ),
  question(
    "transformer-attention",
    "What did the transformer architecture replace as the core sequence mechanism?",
    ["Recurrence", "Convolution", "Binary search", "Random forests"],
    0,
    "Attention replaced recurrence, allowing every token to weigh every other token in parallel.",
  ),
  question(
    "model-hallucination",
    "Why do language models hallucinate?",
    [
      "They are trained to predict plausible next tokens, not verified facts",
      "They deliberately lie when unsure",
      "They lack enough storage for facts",
      "They only memorise Wikipedia",
    ],
    0,
    "Next-token prediction rewards fluency. Without grounding, a model has no built-in signal for 'I do not know'.",
  ),
  question(
    "creative-constraints",
    "Dr. Seuss's bet to write a book with only 50 different words produced…",
    [
      "The Cat in the Hat",
      "Green Eggs and Ham",
      "How the Grinch Stole Christmas",
      "Horton Hears a Who!",
    ],
    1,
    "Green Eggs and Ham came from the bet with publisher Bennett Cerf and became one of the best-selling children's books ever.",
  ),
  question(
    "incubation",
    "What is the most effective way to use the incubation effect?",
    [
      "Avoid thinking about the problem entirely",
      "Work hard on the problem, then step away",
      "Only work when inspiration strikes",
      "Repeat the problem aloud for hours",
    ],
    1,
    "Incubation works after focused effort: low-effort activity lets the mind link distant ideas.",
  ),
  question(
    "feynman-technique",
    "What is the core move of the Feynman technique?",
    [
      "Memorising the exact textbook wording",
      "Explaining the idea in plain language and finding the gaps",
      "Reading as many sources as possible",
      "Recording yourself reciting definitions",
    ],
    1,
    "Simple explanation exposes exactly where understanding breaks down.",
  ),
  question(
    "remixing",
    "The remix method is best described as…",
    [
      "Copying a competitor's product",
      "Transferring a proven structure from one domain to another",
      "Waiting for a completely original idea",
      "Combining random words until something works",
    ],
    1,
    "Most innovation reuses structures across domains; originality is judged after shipping.",
  ),
  question(
    "decoy-effect",
    "Why did The Economist include a print-only option priced the same as print + web?",
    [
      "A legal requirement",
      "To make the bundle look like better value",
      "For older readers",
      "It was a pricing error",
    ],
    1,
    "The print-only option is a decoy: it makes print + web feel like getting web for free.",
  ),
  question(
    "anchoring",
    "Prices ending in .99 work mainly because of…",
    ["The left-digit effect", "The halo effect", "The endowment effect", "The placebo effect"],
    0,
    "We anchor on the first digit, so $9.99 feels much closer to $9 than $10.",
  ),
  question(
    "market-disruption",
    "In 2000, Netflix offered to sell itself to Blockbuster for…",
    ["$5 million", "$50 million", "$500 million", "$5 billion"],
    1,
    "$50 million. Blockbuster declined and filed for bankruptcy ten years later.",
  ),
  question(
    "value-pricing",
    "Value-based pricing starts from…",
    [
      "The cost of production",
      "The customer's outcome and willingness to pay",
      "The competitor's price list",
      "A random number with a 9 at the end",
    ],
    1,
    "Costs set a floor, but perceived value and willingness to pay set the price.",
  ),
];

export function questionsForConcept(conceptId: string): ReviewQuestion[] {
  return REVIEW_QUESTIONS.filter((q) => q.conceptId === conceptId);
}
