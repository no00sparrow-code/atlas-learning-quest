/**
 * Further reading for each lesson. These are reference links, not formal
 * citations: they are where a curious learner (or reviewer) can verify the
 * claims. Content should be re-checked before publication.
 */
export interface Source {
  label: string;
  url: string;
}

export const SOURCES: Record<string, Source[]> = {
  "spotlight-effect": [
    {
      label: "Spotlight effect — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Spotlight_effect",
    },
  ],
  "neutron-star": [
    { label: "Neutron star — Wikipedia", url: "https://en.wikipedia.org/wiki/Neutron_star" },
  ],
  "cleopatra-timeline": [
    { label: "Cleopatra — Wikipedia", url: "https://en.wikipedia.org/wiki/Cleopatra" },
  ],
  "first-bug": [
    {
      label: "Software bug history — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Software_bug",
    },
  ],
  constraints: [
    {
      label: "Green Eggs and Ham — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Green_Eggs_and_Ham",
    },
  ],
  "decoy-effect": [
    { label: "Decoy effect — Wikipedia", url: "https://en.wikipedia.org/wiki/Decoy_effect" },
  ],
  zeigarnik: [
    {
      label: "Zeigarnik effect — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Zeigarnik_effect",
    },
  ],
  tardigrades: [
    { label: "Tardigrade — Wikipedia", url: "https://en.wikipedia.org/wiki/Tardigrade" },
  ],
  "roman-concrete": [
    { label: "Roman concrete — Wikipedia", url: "https://en.wikipedia.org/wiki/Roman_concrete" },
  ],
  "gps-einstein": [
    {
      label: "GPS and relativity — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Error_analysis_for_the_Global_Positioning_System",
    },
  ],
  incubation: [
    {
      label: "Incubation (psychology) — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Incubation_(psychology)",
    },
  ],
  "netflix-blockbuster": [
    { label: "Blockbuster LLC — Wikipedia", url: "https://en.wikipedia.org/wiki/Blockbuster_LLC" },
  ],
  "mem-1": [
    {
      label: "Reconstructive memory — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Reconstructive_memory",
    },
  ],
  "mem-2": [
    {
      label: "Forgetting curve — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Forgetting_curve",
    },
  ],
  "mem-3": [
    {
      label: "Spaced repetition — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Spaced_repetition",
    },
  ],
  "mem-4": [
    { label: "Growth mindset — Wikipedia", url: "https://en.wikipedia.org/wiki/Growth_mindset" },
  ],
  "uni-1": [
    {
      label: "Observable universe — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Observable_universe",
    },
  ],
  "uni-2": [
    {
      label: "Cosmic microwave background — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Cosmic_microwave_background",
    },
  ],
  "uni-3": [{ label: "Dark matter — Wikipedia", url: "https://en.wikipedia.org/wiki/Dark_matter" }],
  "ai-1": [{ label: "Perceptron — Wikipedia", url: "https://en.wikipedia.org/wiki/Perceptron" }],
  "ai-2": [
    {
      label: "Transformer architecture — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)",
    },
  ],
  "ai-3": [
    {
      label: "Hallucination in AI — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Hallucination_(artificial_intelligence)",
    },
  ],
  "ai-4": [
    { label: "AI alignment — Wikipedia", url: "https://en.wikipedia.org/wiki/AI_alignment" },
  ],
  "cre-1": [{ label: "Creativity — Wikipedia", url: "https://en.wikipedia.org/wiki/Creativity" }],
  "cre-2": [
    {
      label: "Green Eggs and Ham — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Green_Eggs_and_Ham",
    },
  ],
  "cre-3": [{ label: "Remix — Wikipedia", url: "https://en.wikipedia.org/wiki/Remix" }],
  "his-1": [
    {
      label: "Cura annonae (grain supply) — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Cura_annonae",
    },
  ],
  "his-2": [
    { label: "Roman economy — Wikipedia", url: "https://en.wikipedia.org/wiki/Roman_economy" },
  ],
  "his-3": [
    {
      label: "Fall of the Western Roman Empire — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Fall_of_the_Western_Roman_Empire",
    },
  ],
  "biz-1": [
    {
      label: "Anchoring effect — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Anchoring_effect",
    },
  ],
  "biz-2": [
    { label: "Decoy effect — Wikipedia", url: "https://en.wikipedia.org/wiki/Decoy_effect" },
  ],
  "biz-3": [
    {
      label: "Value-based pricing — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Value-based_pricing",
    },
  ],
};

export function sourcesFor(id: string): Source[] {
  return SOURCES[id] ?? [];
}
