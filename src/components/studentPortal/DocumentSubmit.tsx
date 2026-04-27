import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import { useInstructionalSession } from "../../hooks/useInstructionalSession";

type Props = {
	sessionId: string;
};

export function DocumentSubmit({ sessionId }: Props) {
	const [text, setText] = useState("");
	const [assignmentName, setAssignmentName] = useState("");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { submitStudentPortalDocument } = useInstructionalSession();

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0] ?? null;
		setSelectedFile(file);
		setStatus(null);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!text.trim() && !selectedFile) {
			setStatus("Please add text or choose a file before submitting.");
			return;
		}

		setIsSubmitting(true);
		setStatus(null);
		try {
			if (selectedFile) {
				const buffer = await selectedFile.arrayBuffer();
				const response = await fetch("/api/v4/documents/upload", {
					method: "POST",
					headers: {
						"Content-Type": selectedFile.type || "application/octet-stream",
						"x-file-name": selectedFile.name,
						"x-session-id": sessionId,
					},
					body: buffer,
				});
				if (!response.ok) {
					const payload = await response.json().catch(() => ({ error: "Submission failed." }));
					throw new Error(typeof payload.error === "string" ? payload.error : "Submission failed.");
				}
			} else {
				await submitStudentPortalDocument(sessionId, text, {
					submittedBy: "student",
					assignmentName: assignmentName.trim() || undefined,
				});
			}
			setText("");
			setAssignmentName("");
			setSelectedFile(null);
			setStatus("Submitted successfully.");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Submission failed.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<section className="v4-panel" aria-label="Student portal submission">
			<p className="v4-kicker">Student Portal</p>
			<h2>Submit Your Work</h2>
			<form className="v4-upload-form" onSubmit={handleSubmit}>
				<label className="v4-upload-field" htmlFor="student-assignment-name">
					<span>Assignment name (optional)</span>
					<input
						id="student-assignment-name"
						type="text"
						value={assignmentName}
						onChange={(event) => setAssignmentName(event.target.value)}
						placeholder="Unit 3 Review"
					/>
				</label>
				<label className="v4-upload-field" htmlFor="student-submission-text">
					<span>Your response</span>
					<textarea
						id="student-submission-text"
						rows={8}
						value={text}
						onChange={(event) => setText(event.target.value)}
						placeholder="Paste or type your submission here..."
					/>
				</label>
				<label className="v4-upload-field" htmlFor="student-submission-file">
					<span>Upload file (optional: PDF, DOCX)</span>
					<input
						id="student-submission-file"
						type="file"
						accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
						onChange={handleFileChange}
					/>
					{selectedFile ? <p className="v4-body-copy" style={{ marginTop: "0.45rem" }}>{selectedFile.name}</p> : null}
				</label>
				<div className="v4-upload-actions">
					<button className="v4-button" type="submit" disabled={isSubmitting || !sessionId}>
						{isSubmitting ? "Submitting..." : "Submit Work"}
					</button>
				</div>
				{status ? <p className={status.includes("success") ? "v4-body-copy" : "v4-error"}>{status}</p> : null}
			</form>
		</section>
	);
}
