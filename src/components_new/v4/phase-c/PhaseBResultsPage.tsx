import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getSimulationViewApi, runSimulationUnifiedApi } from "../../../lib/phaseCApi";

type Props = {
  simulationId: string;
  navigate: (path: string) => void;
};

type PhaseBItem = {
  itemId: string;
  itemNumber?: number;
  groupId?: string;
  partIndex?: number;
  logicalLabel?: string;
  isParent?: boolean;
  traits?: {
    bloomLevel?: number;
    linguisticLoad?: number;
    cognitiveLoad?: number;
    representationLoad?: number;
    vocabDensity?: number;
    symbolDensity?: number;
    steps?: number;
  };
  bloomLevel?: number;
  linguisticLoad?: number;
  cognitiveLoad?: number;
  representationLoad?: number;
  symbolDensity?: number;
};

type OrderedItem = PhaseBItem & {
  displayLabel: string;
  sortGroupId: string;
  sortPartIndex: number;
  sortItemNumber: number;
};

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeItems(items: PhaseBItem[]): OrderedItem[] {
  return items
    .filter((item) => !item.isParent)
    .map((item, index) => {
      const itemNumber = asFiniteNumber(item.itemNumber) ?? index + 1;
      const partIndex = asFiniteNumber(item.partIndex) ?? 0;
      const groupId = item.groupId ?? String(itemNumber);
      return {
        ...item,
        displayLabel: item.logicalLabel ?? (partIndex > 0 ? `${groupId}${String.fromCharCode(96 + partIndex)}` : String(itemNumber)),
        sortGroupId: groupId,
        sortPartIndex: partIndex,
        sortItemNumber: itemNumber,
      };
    });
}

function sortItems(items: OrderedItem[]): OrderedItem[] {
  return [...items].sort((a, b) => {
    if (a.sortGroupId !== b.sortGroupId) {
      return a.sortGroupId.localeCompare(b.sortGroupId, undefined, { numeric: true });
    }

    if (a.sortPartIndex !== b.sortPartIndex) {
      return a.sortPartIndex - b.sortPartIndex;
    }

    return a.sortItemNumber - b.sortItemNumber;
  });
}

function hasAnyPhaseBTrait(item: OrderedItem): boolean {
  const traits = item.traits;
  return asFiniteNumber(item.bloomLevel ?? traits?.bloomLevel) !== undefined
    || asFiniteNumber(item.linguisticLoad ?? traits?.linguisticLoad) !== undefined
    || asFiniteNumber(item.cognitiveLoad ?? traits?.cognitiveLoad) !== undefined
    || asFiniteNumber(item.representationLoad ?? traits?.representationLoad) !== undefined;
}

export function PhaseBResultsPage({ simulationId, navigate }: Props) {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PhaseBItem[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSimulationViewApi(simulationId, "phase-b");
        setItems((data.items ?? []) as PhaseBItem[]);
        setClassId(data.classId ?? null);
        setDocumentId(data.documentId ?? null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed loading Phase B results");
      } finally {
        setLoading(false);
      }
    })();
  }, [simulationId]);

  async function handleRunClassSimulation() {
    if (!classId || !documentId) {
      setError("Class or document context is missing for this simulation run.");
      return;
    }

    setRunning(true);
    setError(null);
    try {
      const output = await runSimulationUnifiedApi({
        classId,
        documentId,
        selectedProfileIds: [],
        mode: "class",
      });
      navigate(`/simulations/${encodeURIComponent(output.simulationId)}/phase-b`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to run class simulation.");
    } finally {
      setRunning(false);
    }
  }

  const orderedItems = useMemo(() => sortItems(normalizeItems(items)), [items]);
  const chartData = useMemo(() => orderedItems.filter(hasAnyPhaseBTrait).map((item) => {
    const traits = item.traits;
    return {
      itemId: item.itemId,
      displayLabel: item.displayLabel,
      bloomLevel: asFiniteNumber(item.bloomLevel ?? traits?.bloomLevel) ?? 0,
      linguisticLoad: asFiniteNumber(item.linguisticLoad ?? traits?.linguisticLoad) ?? 0,
      cognitiveLoad: asFiniteNumber(item.cognitiveLoad ?? traits?.cognitiveLoad) ?? 0,
      representationLoad: asFiniteNumber(item.representationLoad ?? traits?.representationLoad) ?? 0,
      symbolDensity: asFiniteNumber(item.symbolDensity ?? traits?.symbolDensity) ?? 0,
      vocabDensity: asFiniteNumber(traits?.vocabDensity) ?? 0,
      steps: asFiniteNumber(traits?.steps) ?? 0,
    };
  }), [orderedItems]);

  function renderBar(title: string, keyName: "bloomLevel" | "linguisticLoad" | "cognitiveLoad" | "representationLoad" | "symbolDensity" | "vocabDensity") {
    const maxY = keyName === "bloomLevel" ? 6 : 1;
    return (
      <div style={{ marginTop: "1rem" }}>
        <h4 style={{ margin: "0 0 0.35rem" }}>{title}</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="displayLabel" label={{ value: "Item", position: "insideBottom", offset: -4 }} />
            <YAxis domain={[0, maxY]} />
            <Tooltip formatter={(value: number) => value.toFixed(3)} />
            <Bar dataKey={keyName} fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (loading) {
    return <div className="phasec-shell"><p>Loading Phase B item traits...</p></div>;
  }

  return (
    <div className="phasec-shell">
      <div className="phasec-head">
        <p className="phasec-kicker">Simulation</p>
        <h2>{simulationId}</h2>
      </div>

      <div className="phasec-tabs">
        <button className="active" onClick={() => navigate(`/simulations/${encodeURIComponent(simulationId)}/phase-b`)}>Phase B: Item Traits</button>
        <button onClick={() => navigate(`/simulations/${encodeURIComponent(simulationId)}/phase-c`)}>Phase C: Student Simulation</button>
      </div>

      <div className="phasec-row">
        <button className="phasec-button" onClick={() => void handleRunClassSimulation()} disabled={running || !classId || !documentId}>
          {running ? "Running..." : "Run Simulation (Class)"}
        </button>
      </div>

      {error && <p className="phasec-error">{error}</p>}

      <div className="phasec-card">
        <h3>Phase B Item Structure</h3>
        {orderedItems.length === 0 ? (
          <p className="phasec-empty">No Phase B item data is available for this simulation.</p>
        ) : (
          <ul className="phasec-kv-list">
            {orderedItems.map((item) => (
              <li key={item.itemId}>
                <span className="phasec-kv-key">{item.displayLabel}</span>
                <span className="phasec-kv-value">group {item.groupId ?? "-"} · part {item.partIndex ?? 0}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="phasec-card">
        <h3>Phase B Traits</h3>
        {chartData.length === 0 ? (
          <p className="phasec-empty">Phase B trait graphs are hidden because trait values are unavailable on normalized items.</p>
        ) : (
          <>
            {renderBar("A. Bloom Level per Item", "bloomLevel")}
            {renderBar("B. Linguistic Load per Item", "linguisticLoad")}
            {renderBar("C. Cognitive Load per Item", "cognitiveLoad")}
            {renderBar("D. Representation Load per Item", "representationLoad")}
            {chartData.some((row) => row.symbolDensity > 0) && renderBar("E. Symbol Density per Item", "symbolDensity")}
            {chartData.some((row) => row.vocabDensity > 0) && renderBar("F. Vocab Density per Item", "vocabDensity")}

            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ margin: "0 0 0.35rem" }}>G. Optional Steps Signal</h4>
              {chartData.some((row) => row.steps > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="displayLabel" label={{ value: "Item", position: "insideBottom", offset: -4 }} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toFixed(3)} />
                    <Legend />
                    <Bar dataKey="steps" fill="#16a34a" name="Steps" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="phasec-empty">No steps signal was found for this simulation.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
