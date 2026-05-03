import type { ReactNode } from "react";

import type { SyntheticStudent } from "../../../lib/phaseCApi";

type Props = {
  student: SyntheticStudent;
  children: ReactNode;
};

function joinLabels(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "-";
}

export function StudentProfileTooltip({ student, children }: Props) {
  return (
    <span className="phasec-student-tooltip">
      <span className="phasec-student-tooltip-trigger">{children}</span>
      <span className="phasec-student-tooltip-panel" role="tooltip">
        <strong>{student.displayName}</strong>
        <span>
          <strong>Profiles:</strong> {joinLabels(student.profiles)}
        </span>
        <span>
          <strong>Positive traits:</strong> {joinLabels(student.positiveTraits)}
        </span>
        <span>
          <strong>Summary:</strong> {student.profileSummaryLabel || "-"}
        </span>
      </span>
    </span>
  );
}