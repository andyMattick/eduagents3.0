export type ProfileStudentRollup = {
  studentId: string;
  displayName: string;
  personaId: string;
  subtraits: string[];
  pCorrect: number;
  timeSeconds: number;
};

type Props = {
  students: ProfileStudentRollup[];
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatMinutes(value: number): string {
  return `${Math.max(0, Math.round(value / 60))} min`;
}

export function StudentSummaryCard({ students }: Props) {
  if (students.length === 0) {
    return null;
  }

  const sortedStudents = [...students].sort((left, right) => left.pCorrect - right.pCorrect);
  const pCorrectValues = sortedStudents.map((student) => student.pCorrect);
  const timeValues = sortedStudents.map((student) => student.timeSeconds);

  const minScore = Math.min(...pCorrectValues);
  const maxScore = Math.max(...pCorrectValues);
  const minTime = Math.min(...timeValues);
  const maxTime = Math.max(...timeValues);

  return (
    <div className="v4-shortcircuit-result-card">
      <h3 className="v4-shortcircuit-tree-title">Predicted Student Range</h3>
      <p className="phasec-copy" style={{ marginTop: "0.35rem" }}>
        Score: {formatPercent(minScore)} - {formatPercent(maxScore)}
      </p>
      <p className="phasec-copy" style={{ marginTop: "0.35rem" }}>
        Time: {formatMinutes(minTime)} - {formatMinutes(maxTime)}
      </p>

      <table className="phasec-table" style={{ marginTop: "0.7rem" }}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Predicted score</th>
            <th>Predicted time</th>
          </tr>
        </thead>
        <tbody>
          {sortedStudents.map((student) => (
            <tr key={student.studentId}>
              <td>
                <span
                  title={`Profile: ${student.personaId}\nSubtraits: ${student.subtraits.length > 0 ? student.subtraits.join(", ") : "None"}`}
                >
                  {student.displayName}
                </span>
              </td>
              <td>{formatPercent(student.pCorrect)}</td>
              <td>{Math.max(0, Math.round(student.timeSeconds))} s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
