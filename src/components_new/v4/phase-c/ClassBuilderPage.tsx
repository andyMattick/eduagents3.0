import { useMemo, useState } from "react";

import { createClassApi, type ClassLevel, type ClassOverlays, type PresenceLevel } from "../../../lib/phaseCApi";

type Props = {
  navigate: (path: string) => void;
};

type Step = 1 | 2 | 3 | 4;

function currentSchoolYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

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
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());

  const [composition, setComposition] = useState<{
    ell: PresenceLevel;
    sped: PresenceLevel;
    gifted: PresenceLevel;
    attentionChallenges: PresenceLevel;
    readingChallenges: PresenceLevel;
  }>({
    ell: "None",
    sped: "None",
    gifted: "None",
    attentionChallenges: "None",
    readingChallenges: "None",
  });

  const [tendencies, setTendencies] = useState({
    manyFastWorkers: false,
    manySlowAndCareful: false,
    manyDetailOriented: false,
    manyTestAnxious: false,
    manyMathConfident: false,
    manyStruggleReading: false,
    manyEasilyDistracted: false,
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

  const overlays: ClassOverlays = {
    composition,
    tendencies,
  };

  async function handleGeneratePreview() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await createClassApi({
        name: name.trim(),
        level,
        gradeBand,
        schoolYear,
        overlays,
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
      setStep(4);
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

      <div className="phasec-stepper">Step {step} of 4</div>

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

          <label>School year</label>
          <input value={schoolYear} onChange={(event) => setSchoolYear(event.target.value)} />

          <div className="phasec-row">
            <button className="phasec-button-secondary" onClick={() => navigate("/")}>Cancel</button>
            <button className="phasec-button" disabled={!name.trim()} onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="phasec-card">
          <h3>Class composition</h3>
          <p className="phasec-copy">Tell us about the learner mix. We use this to generate 20 representative students.</p>

          {([
            ["ell", "English learners (ELL)"],
            ["sped", "Students with IEP/504 (SPED)"],
            ["gifted", "Gifted / advanced learners"],
            ["attentionChallenges", "Attention / focus challenges"],
            ["readingChallenges", "Reading challenges"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label>{label}</label>
              <select value={composition[key]} onChange={(event) => setComposition((prev) => ({ ...prev, [key]: event.target.value as PresenceLevel }))}>
                <option>None</option>
                <option>A few</option>
                <option>Some</option>
                <option>Many</option>
              </select>
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
          <h3>Class tendencies</h3>
          <p className="phasec-copy">These toggles raise probability for related traits across synthetic students.</p>

          {([
            ["manyFastWorkers", "Many students work quickly"],
            ["manySlowAndCareful", "Many students are careful but slow"],
            ["manyDetailOriented", "Many students are detail-oriented"],
            ["manyTestAnxious", "Many students get anxious on tests"],
            ["manyMathConfident", "Many students are confident in math"],
            ["manyStruggleReading", "Many students struggle with reading"],
            ["manyEasilyDistracted", "Many students are easily distracted"],
          ] as const).map(([key, label]) => (
            <label key={key} className="phasec-check-row">
              <input
                type="checkbox"
                checked={Boolean(tendencies[key])}
                onChange={(event) => setTendencies((prev) => ({ ...prev, [key]: event.target.checked }))}
              />
              <span>{label}</span>
            </label>
          ))}

          {error && <p className="phasec-error">{error}</p>}

          <div className="phasec-row">
            <button className="phasec-button-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="phasec-button" disabled={submitting} onClick={() => void handleGeneratePreview()}>
              {submitting ? "Generating..." : "Generate class"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && previewStudents && (
        <div className="phasec-card">
          <h3>Your class: {name}</h3>
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
        </div>
      )}
    </div>
  );
}
