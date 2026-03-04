/**
 * templates/index.ts — Barrel export + auto-registration for all template plugins.
 */

import { registerPlugin } from "../../services/pluginRegistry";
import { LinearEquationPlugin } from "./linearEquation";
import { ArithmeticFluencyPlugin } from "./arithmeticFluency";
import { FractionsPlugin } from "./fractions";

// Auto-register on import
registerPlugin(LinearEquationPlugin);
registerPlugin(ArithmeticFluencyPlugin);
registerPlugin(FractionsPlugin);

export { LinearEquationPlugin, ArithmeticFluencyPlugin, FractionsPlugin };
