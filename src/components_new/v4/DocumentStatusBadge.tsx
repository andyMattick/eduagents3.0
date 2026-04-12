import { useEffect, useState } from "react";

import type { DocumentStatus } from "../../lib/documentStatusApi";
import { getDocumentStatus } from "../../lib/documentStatusApi";

type Props = {
	documentId: string;
};

export function DocumentStatusBadge({ documentId }: Props) {
	const [status, setStatus] = useState<DocumentStatus | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		setError(null);
		void getDocumentStatus(documentId)
			.then((payload) => {
				if (isMounted) {
					setStatus(payload);
				}
			})
			.catch((statusError) => {
				if (isMounted) {
					setError(statusError instanceof Error ? statusError.message : "Status unavailable");
				}
			});

		return () => {
			isMounted = false;
		};
	}, [documentId]);

	if (error) {
		return <p className="v4-body-copy" style={{ marginTop: "0.5rem" }}>Status unavailable</p>;
	}

	if (!status) {
		return <p className="v4-body-copy" style={{ marginTop: "0.5rem" }}>Loading ingestion status...</p>;
	}

	return (
		<div className="v4-status-badge">
			<span>Document Type: {formatDocKind(status.docType)}</span>
			<span>Analysis: {status.analysisAvailable ? "Ready" : "Unavailable"}</span>
			<span>Rewrite: {status.rewriteEligible ? "Enabled" : "Unavailable"}</span>
		</div>
	);
}

function formatDocKind(docType: DocumentStatus["docType"]): string {
	if (docType === "notes") return "Notes";
	if (docType === "assessment") return "Assessment";
	if (docType === "assignment") return "Assignment";
	if (docType === "mixed") return "Mixed";
	return "Unknown";
}
