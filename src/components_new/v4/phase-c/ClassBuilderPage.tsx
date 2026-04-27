import { useMemo, useState } from "react";

import { createClassApi, type ClassLevel, type ProfilePercentages } from "../../../lib/phaseCApi";

type Props = {
  navigate: (path: string) => void;
};

type Step = 1 | 2 | 3;

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

export function ClassBuilderPage({ navigate }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClassId, setCreatedClassId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [level, setLevel] = useState<ClassLevel>("AP");
  const [gradeBand, setGradeBand] = useState<"9-10" | "11-12" | "Mixed">("11-12");

  const [profilePercentages, setProfilePercentages] = useState<ProfilePercentages>({
    ell: 0,
    sped: 0,
    adhd: 0,
    dyslexia: 0,
    gifted: 0,
    attention504: 0,
  });

  const [previewStudents, setPreviewStudents] = useState<Array<{ profiles: string[]; positiveTraits: string[]; traits: { readingLevel: number; mathLevel: number; writingLevel: number } }> | null>(null);

  const profileBreakdown = useMemo(() => {
    if (!previewStudents) return {};
    return countBy(previewStudents.flatMap((student) => student.profiles));
  }, [previewStudents]);

  const positiveBreakdown = useMemo(() => {
    if (!previewStudents) return {};
    return countBy(previewStudents.flatMap((student) => student.positiveTraits));
  }, [previewStudents]);

  const traitAverages = useMemo(() => {
    if (!previewStudents || previewStudents.length === 0) {
      return { readingLevel: 0, mathLevel: 0, writingLevel: 0 };
    }
    const total = previewStudents.length;
    const sums = previewStudents.reduce((accumulator, student) => {
      accumulator.readingLevel += student.traits.readingLevel;
      accumulator.mathLevel += student.traits.mathLevel;
      accumulator.writingLevel += student.traits.writingLevel;
      return accumulator;
    }, { readingLevel: 0, mathLevel: 0, writingLevel: 0 });

    return {
      readingLevel: sums.readingLevel / total,
      mathLevel: sums.mathLevel / total,
      writingLevel: sums.writingLevel / total,
    };
  }, [previewStudents]);

  async function handleCreateClass() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await createClassApi({
        className: name.trim(),
        classLevel: level,
        gradeBand,
        profilePercentages,
      });
      setCreatedClassId(response.class.id);
      setPreviewStudents(response.students.map((student) => ({
        profiles: student.profiles,
        positiveTraits: student.positiveTraits,
        traits: {
          readingLevel: student.traits.readingLevel,
          mathLevel: student.traits.mathLevel,
          writingLevel: student.traits.writingLevel,
        },
      })));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Class generation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="phasec-shell">
      <div className="phasec-head">
        <p className="phasec-kicker">Classes</p>
        <h2>Create Class</h2>
      </div>

      <div className="phasec-stepper">Step {step} of 3</div>

      {step === 1 && (
        <div className="phasec-card">
          <label>Class name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g., Period 3 - AP Statistics" />

          <label>Class level</label>
          <select value={level} onChange={(event) => setLevel(event.target.value as ClassLevel)}>
            <option>AP</option>
            <option>Honors</option>
            <option>Standard</option>
            <option>Remedial</option>
          </select>

          <label>Grade band</label>
          <select value={gradeBand} onChange={(event) => setGradeBand(event.target.value as "9-10" | "11-12" | "Mixed")}>
            <option value="9-10">9-10</option>
            <option value="11-12">11-12</option>
            <option value="Mixed">Mixed</option>
          </select>

          <div className="phasec-row">
            <button className="phasec-button-secondary" onClick={() => navigate("/")}>Cancel</button>
            <button className="phasec-button" disabled={!name.trim()} onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="phasec-card">
          <h3>Class composition</h3>
          <p className="phasec-copy">Set estimated profile percentages for this class. Values are used to generate 20 representative students.</p>

          {([
            ["ell", "ELL %"],
            ["sped", "SPED %"],
            ["adhd", "ADHD %"],
            ["dyslexia", "Dyslexia %"],
            ["gifted", "Gifted %"],
            ["attention504", "504 / attention challenges %"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label>{label}</label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={profilePercentages[key]}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  const clamped = Number.isFinite(next) ? Math.min(100, Math.max(0, next)) : 0;
                  setProfilePercentages((prev) => ({ ...prev, [key]: clamped }));
                }}
              />
            </div>
          ))}

          <div className="phasec-row">
            <button className="phasec-button-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="phasec-button" onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="phasec-card">
          <h3>Summary</h3>
          <p className="phasec-copy">Review class composition and create your synthetic class.</p>

          <div className="phasec-grid-2">
            <div>
              <h4>Profile breakdown (input)</h4>
              <ul className="phasec-kv-list">
                {Object.entries(profilePercentages).map(([label, value]) => (
                  <li key={label}>
                    <span className="phasec-kv-key">{label}</span>
                    <span className="phasec-kv-value">{value}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Expected trait ranges</h4>
              <p className="phasec-copy">Reading, math, and writing levels are generated with profile deltas plus deterministic jitter.</p>
              <h4>Positive trait distribution</h4>
              <p className="phasec-copy">Positive traits are assigned probabilistically per student to keep cohorts varied.</p>
            </div>
          </div>

          {error && <p className="phasec-error">{error}</p>}

          <div className="phasec-row">
            <button className="phasec-button-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="phasec-button" disabled={submitting} onClick={() => void handleCreateClass()}>
              {submitting ? "Creating..." : "Create Class"}
            </button>
          </div>
          {previewStudents && (
            <>
              <hr className="phasec-divider" />
              <h4>Generated class preview</h4>
              <p className="phasec-copy">{previewStudents.length} representative students generated.</p>

              <div className="phasec-grid-3">
                <div>
                  <strong>Reading avg</strong>
                  <p>{traitAverages.readingLevel.toFixed(2)}</p>
                </div>
                <div>
                  <strong>Math avg</strong>
                  <p>{traitAverages.mathLevel.toFixed(2)}</p>
                </div>
                <div>
                  <strong>Writing avg</strong>
                  <p>{traitAverages.writingLevel.toFixed(2)}</p>
                </div>
              </div>

              <div className="phasec-grid-2">
                <div>
                  <h4>Profile breakdown</h4>
                  <ul>{Object.entries(profileBreakdown).map(([label, count]) => <li key={label}>{label}: {count}</li>)}</ul>
                </div>
                <div>
                  <h4>Positive traits</h4>
                  <ul>{Object.entries(positiveBreakdown).map(([label, count]) => <li key={label}>{label}: {count}</li>)}</ul>
                </div>
              </div>

              <div className="phasec-row">
                <button className="phasec-button-secondary" onClick={() => navigate("/")}>Done</button>
                <button className="phasec-button" disabled={!createdClassId} onClick={() => createdClassId && navigate(`/classes/${createdClassId}`)}>
                  Open class
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
