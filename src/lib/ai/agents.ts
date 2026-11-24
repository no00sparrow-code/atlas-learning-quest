export type AtlasAgentId =
  | "research"
  | "source-verification"
  | "script"
  | "quality"
  | "narration"
  | "visuals"
  | "subtitles"
  | "render"
  | "categorisation"
  | "recommendations"
  | "guide";

export type AgentMode = "local" | "local-model" | "none";
export type AgentStatus = "available" | "model-gated" | "not-implemented";

export interface AtlasAgentDefinition {
  id: AtlasAgentId;
  name: string;
  responsibility: string;
  mode: AgentMode;
  status: AgentStatus;
  /** What is actually implemented, including honest limits. */
  note: string;
  requires: string[];
}

/**
 * Atlas's agent catalog. A status here is a capability statement, not a
 * marketing claim: every "available" agent has a local implementation in this
 * repository. None of them silently calls a hosted service.
 */
export const ATLAS_AGENTS: AtlasAgentDefinition[] = [
  {
    id: "research",
    name: "Research",
    responsibility: "Gather notes and reference material for a topic.",
    mode: "none",
    status: "not-implemented",
    note: "Live web research is not connected. The Studio reuses the reviewed Atlas lesson notes.",
    requires: ["A web-research provider with attribution and rate limits"],
  },
  {
    id: "source-verification",
    name: "Source verification",
    responsibility: "Check that references exist, are well formed and are attached.",
    mode: "local",
    status: "available",
    note: "Structural URL and completeness checks run locally. This is not factual verification.",
    requires: ["Human factual review", "Optional server-side link checker"],
  },
  {
    id: "script",
    name: "Script writing",
    responsibility: "Turn lesson notes into an editable slide script.",
    mode: "local",
    status: "available",
    note: "Deterministic template assembly from existing lesson copy. No model authors the script.",
    requires: ["Optional local model adapter for rewriting"],
  },
  {
    id: "quality",
    name: "Quality and accuracy review",
    responsibility: "Check structure, copy length, references and captions.",
    mode: "local",
    status: "available",
    note: "Structural QC only. Factual accuracy still requires a human reviewer.",
    requires: ["Human factual review"],
  },
  {
    id: "narration",
    name: "Narration",
    responsibility: "Generate a voice track.",
    mode: "none",
    status: "not-implemented",
    note: "No TTS engine is configured. Studio renders are intentionally silent.",
    requires: ["A local TTS engine or approved hosted voice service"],
  },
  {
    id: "visuals",
    name: "Visuals",
    responsibility: "Create visual material for each beat.",
    mode: "local",
    status: "available",
    note: "Text-led slides, accents and lower thirds only. There is no generative image model.",
    requires: ["Licensed imagery or an approved image model"],
  },
  {
    id: "subtitles",
    name: "Subtitles",
    responsibility: "Create accessible captions.",
    mode: "local",
    status: "available",
    note: "A WebVTT sidecar and burned-in lower-third captions are generated from slide copy.",
    requires: ["Narration timing if a voice track is added"],
  },
  {
    id: "render",
    name: "Video rendering",
    responsibility: "Render a playable video file.",
    mode: "local",
    status: "available",
    note: "Canvas + MediaRecorder render a real silent WebM in the browser.",
    requires: ["Chromium-family browser", "Explicit user consent"],
  },
  {
    id: "categorisation",
    name: "Categorisation",
    responsibility: "Assign a category and searchable tags.",
    mode: "local",
    status: "available",
    note: "Deterministic category assignment from reviewed lesson metadata.",
    requires: ["Reviewed taxonomy changes"],
  },
  {
    id: "recommendations",
    name: "Recommendations",
    responsibility: "Choose useful next lessons and reviews.",
    mode: "local",
    status: "available",
    note: "Local scoring from interests, progress, memory strength and due reviews.",
    requires: [],
  },
  {
    id: "guide",
    name: "Atlas Guide",
    responsibility: "Explain, question and tutor with learner context.",
    mode: "local-model",
    status: "model-gated",
    note: "The model path supports local providers. Without a model it falls back to library-grounded answers.",
    requires: ["Ollama, a local OpenAI-compatible server, or a browser on-device model"],
  },
];

export function atlasAgent(id: AtlasAgentId): AtlasAgentDefinition {
  const found = ATLAS_AGENTS.find((agent) => agent.id === id);
  if (!found) throw new Error(`Unknown Atlas agent: ${id}`);
  return found;
}
