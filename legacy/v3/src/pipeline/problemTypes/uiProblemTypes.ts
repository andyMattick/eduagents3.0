export interface UIProblemType {
  id: string;
  label: string;
  description: string;
  category: string;
  supports: string[];
  example: string; // NEW
}

export const UI_PROBLEM_TYPES: UIProblemType[] = [
  // -------------------------
  // SELECT
  // -------------------------
  {
    id: "multipleChoice",
    label: "Multiple Choice",
    description: "Students select one correct answer from several options.",
    category: "Select",
    supports: ["mcq"],
    example: "Which sentence best states the main idea of the passage?"
  },
  {
    id: "trueFalse",
    label: "True / False",
    description: "Students determine whether a statement is correct.",
    category: "Select",
    supports: ["trueFalse"],
    example: "True or False: Photosynthesis requires sunlight."
  },
  {
    id: "multiSelect",
    label: "Multi-Select",
    description: "Students choose all correct answers from a list.",
    category: "Select",
    supports: ["multiSelect"],
    example: "Select all statements that describe renewable energy sources."
  },
  

  {
  id: "matching",
  label: "Matching",
  description: "Students match terms to definitions or items to categories.",
  category: "Select",
  supports: ["matching"],
  example: "Match each organ to its primary function."
},


  // -------------------------
  // PRODUCE
  // -------------------------
  {
    id: "shortAnswer",
    label: "Short Answer",
    description: "Students write a brief response.",
    category: "Produce",
    supports: ["shortAnswer"],
    example: "Explain why the character decided to leave the village."
  },
  {
    id: "fillBlank",
    label: "Fill in the Blank",
    description: "Students supply a missing word, phrase, or number.",
    category: "Produce",
    supports: ["fillBlank"],
    example: "The capital of France is ________."
  },
  {
    id: "numericEntry",
    label: "Numeric Entry",
    description: "Students enter a number.",
    category: "Produce",
    supports: ["numericEntry"],
    example: "Solve: 3x + 5 = 20. Enter the value of x."
  },
  {
    id: "tableCompletion",
    label: "Table Completion",
    description: "Students fill in missing values in a table.",
    category: "Produce",
    supports: ["tableCompletion"],
    example: "Complete the table showing the input–output rule."
  },
  {
    id: "equationConstruction",
    label: "Equation Construction",
    description: "Students build an equation or inequality from a scenario.",
    category: "Produce",
    supports: ["equationConstruction"],
    example: "Write an equation that represents the total cost of t tickets at $12 each."
  },

  // -------------------------
  // ANALYZE
  // -------------------------
  {
    id: "errorAnalysis",
    label: "Error Analysis",
    description: "Students identify and correct a mistake in a worked example.",
    category: "Analyze",
    supports: ["errorAnalysis"],
    example: "A student solved 4×(3+2)=20. Identify the error and correct it."
  },
  {
    id: "dataInterpretation",
    label: "Data Interpretation",
    description: "Students analyze charts, tables, or experiment results.",
    category: "Analyze",
    supports: ["dataInterpretation"],
    example: "Based on the graph, which month had the highest rainfall?"
  },
  {
    id: "graphInterpretation",
    label: "Graph Interpretation",
    description: "Students interpret or analyze graphs.",
    category: "Analyze",
    supports: ["graphInterpretation"],
    example: "What does the slope of the line represent in this context?"
  },
  {
    id: "sequencing",
    label: "Sequencing",
    description: "Students order steps, events, or processes.",
    category: "Analyze",
    supports: ["sequencing"],
    example: "Place the events of the water cycle in the correct order."
  },
  {
    id: "classification",
    label: "Classification",
    description: "Students sort items into groups based on rules.",
    category: "Analyze",
    supports: ["classification"],
    example: "Sort each organism as a producer, consumer, or decomposer."
  },
  {
    id: "causeEffect",
    label: "Cause and Effect",
    description: "Students identify causal relationships.",
    category: "Analyze",
    supports: ["causeEffect"],
    example: "What was the main cause of the population increase?"
  },
  {
    id: "sourceComparison",
    label: "Source Comparison",
    description: "Students compare two texts, charts, or media sources.",
    category: "Analyze",
    supports: ["pairedPassage", "sourceComparison"],
    example: "How do the two authors differ in their views on renewable energy?"
  },

  // -------------------------
  // CREATE
  // -------------------------
  {
    id: "extendedResponse",
    label: "Extended Response",
    description: "Students write a paragraph-length explanation.",
    category: "Create",
    supports: ["extendedResponse"],
    example: "Explain how the setting influences the plot."
  },
  {
    id: "essay",
    label: "Essay",
    description: "Students write a multi-paragraph response.",
    category: "Create",
    supports: ["essay"],
    example: "Write an essay arguing whether school uniforms should be required."
  },
  {
    id: "passageExtendedResponse",
    label: "Passage-Based Extended Response",
    description: "Students read a passage and respond with analysis.",
    category: "Create",
    supports: ["passageBased", "extendedResponse"],
    example: "Using evidence from the passage, explain the author's purpose."
  },
  {
    id: "cer",
    label: "Claim–Evidence–Reasoning (CER)",
    description: "Students construct an argument using evidence.",
    category: "Create",
    supports: ["evidence", "cer", "extendedResponse"],
    example: "Make a claim about which material is the best insulator and support it with data."
  },
  {
    id: "experimentalDesign",
    label: "Experimental Design",
    description: "Students design an experiment or critique one.",
    category: "Create",
    supports: ["experimentalDesign"],
    example: "Design an experiment to test how light affects plant growth."
  },
  {
    id: "roleWriting",
    label: "Role-Based Writing",
    description: "Students write from a disciplinary perspective.",
    category: "Create",
    supports: ["roleWriting"],
    example: "Write a letter as a historian explaining the significance of the event."
  },
  {
    id: "designTask",
    label: "Design Task",
    description: "Students propose a model, solution, or system.",
    category: "Create",
    supports: ["engineeringDesign", "modeling"],
    example: "Propose a design for a water filtration system using common materials."
  },

  // -------------------------
  // PERFORM
  // -------------------------
  {
    id: "performanceTask",
    label: "Performance Task",
    description: "Students complete a multi-step, authentic task requiring synthesis.",
    category: "Perform",
    supports: ["performanceTask"],
    example: "Create a plan to reduce waste in your school and present your recommendations."
  },
  {
    id: "scenarioDecision",
    label: "Scenario-Based Decision Making",
    description: "Students choose actions in a realistic scenario and justify them.",
    category: "Perform",
    supports: ["scenarioDecision"],
    example: "You are the team leader during a storm evacuation. Choose the safest route and justify your decision."
  },
  {
    id: "simulation",
    label: "Interactive Simulation",
    description: "Students manipulate variables and answer questions about outcomes.",
    category: "Perform",
    supports: ["simulation"],
    example: "Adjust the temperature and pressure to see how gas volume changes, then explain the result."
  }
];
