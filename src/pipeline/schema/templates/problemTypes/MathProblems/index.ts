import { withTemplate } from "../templateCarrier";
import { ArithmeticFluencyProblemType } from "./arithmeticFluency";
import { AlgebraicFluencyProblemType } from "./algebraicFluency";
import { FractionsProblemType } from "./fractions";
import { LinearEquationProblemType } from "./linearEquation";
import { PolynomialOperationsProblemType } from "./polynomialEquation";
import { GraphInterpretationProblemType } from "./graphInterpretation";

const rawMathProblemTypes = [
  ArithmeticFluencyProblemType,
  AlgebraicFluencyProblemType,
  FractionsProblemType,
  LinearEquationProblemType,
  PolynomialOperationsProblemType,
  GraphInterpretationProblemType,
] as const;

export const mathProblemTypes = rawMathProblemTypes.map((problemType) =>
  withTemplate(problemType, "Math")
);
