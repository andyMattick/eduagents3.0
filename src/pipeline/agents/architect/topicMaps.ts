export const ARITHMETIC_FLUENCY_KEYWORDS = [
  "arithmetic", "fluency", "math facts", "addition", "subtraction",
  "multiplication", "division", "times tables", "basic facts", "number sense"
];

export const ARITHMETIC_FLUENCY_TEMPLATE = "arithmetic_fluency_template";

export const FRACTIONS_KEYWORDS = [
  "fraction", "fractions", "numerator", "denominator",
  "equivalent fractions", "simplify fractions",
  "mixed number", "improper fraction"
];

export const FRACTIONS_TEMPLATE = "fractions_template";

export const LINEAR_EQUATION_KEYWORDS = [
  "equation", "linear equation", "solve for x", "variable",
  "two-step equation", "multi-step equation", "algebra",
  "expression", "inequality"
];

export const LINEAR_EQUATION_TEMPLATE = "linear_equation_template";

export const GENERIC_CONTENT_KEYWORDS = [
  "history", "historical", "war", "battle", "revolution", "empire",
  "napoleon", "civil war", "world war", "ancient", "medieval",
  "timeline", "event", "cause", "effect",
  "character", "theme", "plot", "setting", "author", "poem",
  "literature", "novel", "story", "text evidence",
  "biology", "cell", "ecosystem", "energy", "force", "motion",
  "chemistry", "atom", "molecule", "reaction", "physics",
  "government", "civics", "economics", "geography", "culture"
];

export const GENERIC_TEMPLATE = "generic_content_template";

export const TEMPLATE_TOPIC_MAP: Record<string, string> = {
  // Arithmetic fluency (stems)
  "add": ARITHMETIC_FLUENCY_TEMPLATE,
  "subtr": ARITHMETIC_FLUENCY_TEMPLATE,
  "multipl": ARITHMETIC_FLUENCY_TEMPLATE,
  "divi": ARITHMETIC_FLUENCY_TEMPLATE,

  // General arithmetic concepts
  "arithmetic": ARITHMETIC_FLUENCY_TEMPLATE,
  "math facts": ARITHMETIC_FLUENCY_TEMPLATE,
  "basic facts": ARITHMETIC_FLUENCY_TEMPLATE,
  "number sense": ARITHMETIC_FLUENCY_TEMPLATE,
  "times tables": ARITHMETIC_FLUENCY_TEMPLATE,

  // Fractions
  "fraction": FRACTIONS_TEMPLATE,
  "numerator": FRACTIONS_TEMPLATE,
  "denominator": FRACTIONS_TEMPLATE,

  // Linear equations / algebra
  "equation": LINEAR_EQUATION_TEMPLATE,
  
  "expression": "algebraic_fluency_template",
  "variable": "algebraic_fluency_template",
  "poly": "algebraic_fluency_template",
  "term": "algebraic_fluency_template",
  "coefficient": "algebraic_fluency_template",
  "exponent": "algebraic_fluency_template",
  "power": "algebraic_fluency_template",

};

export const DIAGRAM_TOPIC_MAP: Record<string, string> = {
  triangle: "triangle",
  coordinate: "coordinate_graph",
  bar: "bar_chart",
  numberline: "number_line",
  angle: "geometry_angle",
  scatter: "scatter_plot",
};
