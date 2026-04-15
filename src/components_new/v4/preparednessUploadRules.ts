export function getPreparednessUploadError(prepFile: File | null, assessmentFile: File | null): string | null {
	if (!prepFile) {
		return "Please upload the prep / study material.";
	}

	if (!assessmentFile) {
		return "Please upload the assessment file.";
	}

	return null;
}