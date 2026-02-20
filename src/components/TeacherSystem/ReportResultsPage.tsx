import { useState } from "react";
import { ReportResultsModal } from "@/components/dashboard/ReportResultsModal";

export function ReportResultsPage({ assignmentId }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="page-container">
      <h1 className="page-title">Report Classroom Results</h1>

      <p className="mt-4">
        Enter how students performed on Assessment #{assignmentId}. These results
        help the system understand how the assessment functioned in the real world.
      </p>

      <p className="mt-2 text-muted-foreground">
        After submitting results, you’ll be able to compare predicted vs actual
        performance and improve future assessment generation.
      </p>

      <ReportResultsModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={() => console.log("Submitting classroom results…")}
        problems={[]}
      />
    </div>
  );
}
