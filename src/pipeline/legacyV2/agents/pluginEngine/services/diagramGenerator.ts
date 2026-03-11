/**
 * diagramGenerator.ts — Deterministic SVG diagram generation service.
 *
 * Supported diagram types (per Master Spec §9.1):
 *   triangle, coordinate_graph, scatter_plot, bar_chart, number_line, geometry_angle
 *
 * All output is deterministic — no LLM calls.
 */

import type { GeneratedDiagram, DiagramType } from "../interfaces/problemPlugin";
import { randInt, shuffle } from "./problemPlugins/templates/mathUtils";

// ─── Triangle ──────────────────────────────────────────────────────────────

export interface TriangleData {
  a: number; b: number; c: number;
  ax: number; ay: number;
  bx: number; by: number;
  cx: number; cy: number;
  ac: number;
}

export function generateTriangle(): TriangleData {
  // Right triangle with integer sides (Pythagorean triple)
  const triples = [[3,4,5],[5,12,13],[8,15,17],[6,8,10]];
  const [a, b, c] = triples[randInt(0, triples.length - 1)];
  const scale = randInt(1, 3);
  return {
    a: a * scale, b: b * scale, c: c * scale,
    ax: 50, ay: 250,
    bx: 50 + b * scale * 15, by: 250,
    cx: 50, cy: 250 - a * scale * 15,
    ac: a * scale,
  };
}

export function renderTriangleSVG(t: TriangleData): GeneratedDiagram {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <polygon points="${t.ax},${t.ay} ${t.bx},${t.by} ${t.cx},${t.cy}" fill="none" stroke="#333" stroke-width="2"/>
  <text x="${(t.ax + t.bx) / 2}" y="${t.ay + 20}" text-anchor="middle" font-size="14">${t.b}</text>
  <text x="${t.ax - 20}" y="${(t.ay + t.cy) / 2}" text-anchor="middle" font-size="14">${t.a}</text>
  <text x="${(t.bx + t.cx) / 2 + 10}" y="${(t.by + t.cy) / 2}" text-anchor="middle" font-size="14">?</text>
  <text x="${t.ax}" y="${t.ay + 20}" text-anchor="middle" font-size="12" fill="#666">A</text>
  <text x="${t.bx + 10}" y="${t.by + 20}" text-anchor="middle" font-size="12" fill="#666">B</text>
  <text x="${t.cx - 10}" y="${t.cy - 5}" text-anchor="middle" font-size="12" fill="#666">C</text>
</svg>`;

  return {
    id: `triangle_${Date.now()}`,
    diagramType: "triangle",
    svg,
    metadata: { sides: { a: t.a, b: t.b, c: t.c }, labeledSide: "AC" },
  };
}

// ─── Coordinate Graph ──────────────────────────────────────────────────────

export function renderCoordinateGraphSVG(
  points: [number, number][],
  options?: { title?: string; xLabel?: string; yLabel?: string }
): GeneratedDiagram {
  const W = 400, H = 300, P = 40;
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const xMin = Math.min(...xs, 0), xMax = Math.max(...xs, 10);
  const yMin = Math.min(...ys, 0), yMax = Math.max(...ys, 10);

  const scaleX = (x: number) => P + ((x - xMin) / (xMax - xMin)) * (W - 2 * P);
  const scaleY = (y: number) => H - P - ((y - yMin) / (yMax - yMin)) * (H - 2 * P);

  const pointsSvg = points.map(([x, y]) =>
    `<circle cx="${scaleX(x)}" cy="${scaleY(y)}" r="4" fill="#2563eb"/>`
  ).join("\n  ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="#333" stroke-width="1"/>
  <line x1="${P}" y1="${P}" x2="${P}" y2="${H - P}" stroke="#333" stroke-width="1"/>
  ${pointsSvg}
  ${options?.xLabel ? `<text x="${W / 2}" y="${H - 5}" text-anchor="middle" font-size="12">${options.xLabel}</text>` : ""}
  ${options?.yLabel ? `<text x="10" y="${H / 2}" text-anchor="middle" font-size="12" transform="rotate(-90 10 ${H / 2})">${options.yLabel}</text>` : ""}
  ${options?.title ? `<text x="${W / 2}" y="15" text-anchor="middle" font-size="14" font-weight="bold">${options.title}</text>` : ""}
</svg>`;

  return {
    id: `coord_graph_${Date.now()}`,
    diagramType: "coordinate_graph",
    svg,
    metadata: { points, xRange: [xMin, xMax], yRange: [yMin, yMax] },
  };
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────

export function renderBarChartSVG(
  data: { label: string; value: number }[],
  options?: { title?: string }
): GeneratedDiagram {
  const W = 400, H = 300, P = 50;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(40, (W - 2 * P) / data.length - 10);

  const bars = data.map((d, i) => {
    const x = P + i * ((W - 2 * P) / data.length) + 5;
    const barH = (d.value / maxVal) * (H - 2 * P);
    const y = H - P - barH;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#3b82f6"/>
  <text x="${x + barW / 2}" y="${H - P + 15}" text-anchor="middle" font-size="10">${d.label}</text>
  <text x="${x + barW / 2}" y="${y - 5}" text-anchor="middle" font-size="10">${d.value}</text>`;
  }).join("\n  ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="#333"/>
  <line x1="${P}" y1="${P}" x2="${P}" y2="${H - P}" stroke="#333"/>
  ${bars}
  ${options?.title ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="14" font-weight="bold">${options.title}</text>` : ""}
</svg>`;

  return {
    id: `bar_chart_${Date.now()}`,
    diagramType: "bar_chart",
    svg,
    metadata: { data },
  };
}

// ─── Number Line ───────────────────────────────────────────────────────────

export function renderNumberLineSVG(
  marks: number[],
  options?: { min?: number; max?: number; highlight?: number }
): GeneratedDiagram {
  const W = 400, H = 80, P = 40;
  const min = options?.min ?? Math.min(...marks, 0);
  const max = options?.max ?? Math.max(...marks, 10);
  const scale = (v: number) => P + ((v - min) / (max - min)) * (W - 2 * P);

  const ticks = marks.map(m =>
    `<line x1="${scale(m)}" y1="30" x2="${scale(m)}" y2="50" stroke="#333" stroke-width="1.5"/>
  <text x="${scale(m)}" y="65" text-anchor="middle" font-size="11">${m}</text>`
  ).join("\n  ");

  const highlight = options?.highlight !== undefined
    ? `<circle cx="${scale(options.highlight)}" cy="40" r="6" fill="#ef4444"/>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <line x1="${P}" y1="40" x2="${W - P}" y2="40" stroke="#333" stroke-width="2"/>
  <polygon points="${W - P},35 ${W - P + 10},40 ${W - P},45" fill="#333"/>
  ${ticks}
  ${highlight}
</svg>`;

  return {
    id: `number_line_${Date.now()}`,
    diagramType: "number_line",
    svg,
    metadata: { marks, min, max, highlight: options?.highlight },
  };
}

// ─── Scatter Plot ──────────────────────────────────────────────────────────

export function renderScatterPlotSVG(
  points: [number, number][],
  options?: { title?: string; xLabel?: string; yLabel?: string }
): GeneratedDiagram {
  // Scatter plot re-uses coordinate graph rendering with a different id and type
  const diagram = renderCoordinateGraphSVG(points, options);
  return { ...diagram, id: `scatter_${Date.now()}`, diagramType: "scatter_plot" };
}

// ─── Geometry Angle ────────────────────────────────────────────────────────

export function renderAngleSVG(
  angleDeg: number,
  options?: { label?: string }
): GeneratedDiagram {
  const cx = 200, cy = 200, r = 120;
  const rad = (angleDeg * Math.PI) / 180;
  const ex = cx + r * Math.cos(-rad);
  const ey = cy + r * Math.sin(-rad);
  const largeArc = angleDeg > 180 ? 1 : 0;
  const arcR = 40;
  const arcEx = cx + arcR * Math.cos(-rad);
  const arcEy = cy + arcR * Math.sin(-rad);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#333" stroke-width="2"/>
  <line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="#333" stroke-width="2"/>
  <path d="M ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEx} ${arcEy}" fill="none" stroke="#2563eb" stroke-width="1.5"/>
  <text x="${cx + arcR + 10}" y="${cy - 10}" font-size="14" fill="#2563eb">${options?.label ?? `${angleDeg}°`}</text>
</svg>`;

  return {
    id: `angle_${Date.now()}`,
    diagramType: "geometry_angle",
    svg,
    metadata: { angleDeg },
  };
}

// ─── Dispatcher ────────────────────────────────────────────────────────────

/**
 * generateDiagram — create a diagram by type.
 * Returns a GeneratedDiagram with embedded SVG.
 */
export function generateDiagram(type: DiagramType): GeneratedDiagram {
  switch (type) {
    case "triangle": {
      const t = generateTriangle();
      return renderTriangleSVG(t);
    }
    case "coordinate_graph": {
      const pts: [number, number][] = Array.from({ length: randInt(4, 8) }, () => [randInt(0, 10), randInt(0, 10)]);
      return renderCoordinateGraphSVG(pts);
    }
    case "scatter_plot": {
      const pts: [number, number][] = Array.from({ length: randInt(6, 12) }, () => [randInt(0, 20), randInt(0, 20)]);
      return renderScatterPlotSVG(pts);
    }
    case "bar_chart": {
      const labels = shuffle(["Mon", "Tue", "Wed", "Thu", "Fri"]).slice(0, randInt(3, 5));
      const data = labels.map(l => ({ label: l, value: randInt(5, 50) }));
      return renderBarChartSVG(data);
    }
    case "number_line": {
      const marks = Array.from({ length: randInt(4, 8) }, () => randInt(-5, 15));
      return renderNumberLineSVG([...new Set(marks)].sort((a, b) => a - b));
    }
    case "geometry_angle": {
      const angle = randInt(15, 165);
      return renderAngleSVG(angle, { label: "?" });
    }
    default:
      throw new Error(`[DiagramGenerator] Unsupported diagram type: ${type}`);
  }
}
