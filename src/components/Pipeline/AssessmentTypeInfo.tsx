import { ASSESSMENT_TYPES } from "./assessmentTypes";
import styles from "./assessmentTypeInfo.module.css";

export function AssessmentTypeInfo({ type }: { type: string }) {
  const info = ASSESSMENT_TYPES[type];
  if (!info) return null;

  return (
    <div className={styles.infoBox}>
      <h3>{info.label} — What to Expect</h3>

      <p><strong>Purpose:</strong> {info.purpose}</p>
      <p>
        <strong>Time:</strong> {info.recommendedTime.min}–{info.recommendedTime.max} minutes
      </p>
      <p><strong>Typical Length:</strong> {info.typicalLength}</p>

      <p><strong>Problem Types:</strong></p>
      <ul>
        {info.problemTypes.map((pt) => (
          <li key={pt}>{pt}</li>
        ))}
      </ul>

      {info.prohibitions.length > 0 && (
        <>
          <p><strong>Will NOT include:</strong></p>
          <ul>
            {info.prohibitions.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}

      <p><strong>Best Additional Details:</strong> {info.additionalDetailsHint}</p>
    </div>
  );
}
