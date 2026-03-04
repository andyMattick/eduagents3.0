/**
 * diagrams/index.ts — Barrel export + auto-registration for all diagram plugins.
 */

import { registerPlugin } from "../../services/pluginRegistry";
import { TriangleDiagramPlugin } from "./triangleDiagram";
import { CoordinateGraphPlugin } from "./coordinateGraphDiagram";
import { BarChartPlugin } from "./barChartDiagram";
import { NumberLinePlugin } from "./numberLineDiagram";
import { AngleDiagramPlugin } from "./angleDiagram";
import { ScatterPlotPlugin } from "./scatterPlotDiagram";

// Auto-register on import
registerPlugin(TriangleDiagramPlugin);
registerPlugin(CoordinateGraphPlugin);
registerPlugin(BarChartPlugin);
registerPlugin(NumberLinePlugin);
registerPlugin(AngleDiagramPlugin);
registerPlugin(ScatterPlotPlugin);

export {
  TriangleDiagramPlugin,
  CoordinateGraphPlugin,
  BarChartPlugin,
  NumberLinePlugin,
  AngleDiagramPlugin,
  ScatterPlotPlugin,
};
