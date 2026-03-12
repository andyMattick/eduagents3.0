import { ArithmeticFluencyProblemType } from "./MathProblems/arithmeticFluency";
import { AlgebraicFluencyProblemType } from "./MathProblems/algebraicFluency";
import { FractionsProblemType } from "./MathProblems/fractions";
import { LinearEquationProblemType } from "./MathProblems/linearEquation";
import { PolynomialOperationsProblemType } from "./MathProblems/polynomialEquation";
import { GraphInterpretationProblemType } from "./MathProblems/graphInterpretation";
import { ForeignLanguageProblemType } from "./foreignLanguage";

export const ProblemTypesRegistry = {
  arithmetic_fluency: ArithmeticFluencyProblemType,
  algebraic_fluency: AlgebraicFluencyProblemType,
  fractions: FractionsProblemType,
  linear_equation: LinearEquationProblemType,
  polynomial_operations: PolynomialOperationsProblemType,
  graph_interpretation: GraphInterpretationProblemType,
  foreign_language: ForeignLanguageProblemType,
};

export type ProblemTypeId = keyof typeof ProblemTypesRegistry;
