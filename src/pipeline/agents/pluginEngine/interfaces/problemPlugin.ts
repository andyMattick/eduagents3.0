/**
 * problemPlugin.ts — Core plugin interface for the Plugin-Based Instruction Engine.
 *
 * Every problem generator (template, diagram, image, LLM) must implement this
 * interface. The ProblemGeneratorRouter uses it to dispatch slots to the
 * correct plugin.
 *
 * Cross-phase invariant: LLM is one plugin, not the system.
 */

// ─── Slot Model (Architect Output) ─────────────────────────────────────────

/**
 * ProblemSlot — the Architect's output for a single assessment item.
 * Architect must output slots only, never content.
 *
 * Routing rules:
 *   template_id         → template plugin
 *   diagram_type         → diagram plugin
 *   image_reference_id   → image plugin
 *   else                 → LLM plugin (fallback)
 */
export interface ProblemSlot {
  /** Unique slot identifier (e.g. "S1", "S2") */
  slot_id: string;

  /** Determines which plugin class handles this slot */
  problem_source: "template" | "diagram" | "image_analysis" | "llm";

  /** The kind of problem (mcq, short_answer, constructed_response, etc.) */
  problem_type: string;

  /** When problem_source = "template", this MUST be set */
  template_id?: string;

  /** When problem_source = "diagram", this MUST be set */
  diagram_type?: DiagramType;

  /** When problem_source = "image_analysis", this MUST be set */
  image_reference_id?: string;

  /** Subject-area topic */
  topic: string;

  /** Narrower topic within the main topic */
  subtopic?: string;

  /** Difficulty band */
  difficulty: "easy" | "medium" | "hard";

  /** Expected pacing in seconds */
  pacing_seconds?: number;

  /** Desired question format (e.g. "mcq", "open_response", "fill_in_blank") */
  question_format?: string;

  /** Bloom's taxonomy level */
  cognitive_demand?:
    | "remember"
    | "understand"
    | "apply"
    | "analyze"
    | "evaluate"
    | "create";

  /** Extensible metadata */
  [key: string]: any;
}

// ─── Diagram Types ─────────────────────────────────────────────────────────

export type DiagramType =
  | "triangle"
  | "coordinate_graph"
  | "scatter_plot"
  | "bar_chart"
  | "number_line"
  | "geometry_angle";

// ─── Generated Output Schemas ──────────────────────────────────────────────

export interface GeneratedDiagram {
  id: string;
  diagramType: string;
  svg: string;
  metadata: Record<string, any>;
}

export interface GeneratedProblem {
  prompt: string;
  answer: any;
  diagram?: GeneratedDiagram;
  image_reference_id?: string;
  /** Concept Graph tags — every problem MUST include these */
  concepts?: string[];
  skills?: string[];
  standards?: string[];
  metadata?: Record<string, any>;
}

// ─── Generation Context ────────────────────────────────────────────────────

export interface GenerationContext {
  /** Grade level(s) */
  gradeLevels: string[];
  /** Course / subject */
  course: string;
  /** Teacher-provided topic */
  topic: string;
  /** Additional teacher notes */
  additionalDetails?: string;
  /** Document Intelligence summary (when available) */
  documentSummary?: {
    concepts: string[];
    vocabulary: string[];
    questionAngles: string[];
    difficulty: string;
  };
  /** Extensible */
  [key: string]: any;
}

// ─── Validation ────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Plugin Interface ──────────────────────────────────────────────────────

export type GenerationType = "LLM" | "TEMPLATE" | "DIAGRAM" | "IMAGE_ANALYSIS";

export interface ProblemPlugin {
  /** Unique plugin identifier (e.g. "linear_equation_template", "triangle_diagram", "llm_default") */
  id: string;

  /** The type of generation this plugin performs */
  generationType: GenerationType;

  /** Topics this plugin can handle (empty = all topics) */
  supportedTopics: string[];

  /** Generate a problem for the given slot */
  generate(slot: ProblemSlot, context: GenerationContext): Promise<GeneratedProblem>;

  /** Optional: plugin-level validation before Gatekeeper */
  validate?: (problem: GeneratedProblem, slot: ProblemSlot) => ValidationResult;
}
