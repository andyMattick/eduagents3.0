/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UploadPanelV4 } from "../UploadPanelV4";
import { getPreparednessUploadError } from "../preparednessUploadRules.ts";

function makeFile(name: string, type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
	return new File(["example"], name, { type });
}

describe("preparedness upload rules", () => {
	it("requires exactly one prep file and one assessment file", () => {
		expect(getPreparednessUploadError(null, null)).toBe("Please upload the prep / study material.");
		expect(getPreparednessUploadError(makeFile("prep.docx"), null)).toBe("Please upload the assessment file.");
		expect(getPreparednessUploadError(makeFile("prep.docx"), makeFile("test.docx"))).toBeNull();
	});

	it("renders preparedness uploads as single-file inputs", () => {
		const primaryRef = { current: null };
		const secondaryRef = { current: null };
		const { container } = render(
			<UploadPanelV4
				goal="preparedness"
				title="Teacher Studio"
				subtitle="Upload exactly one prep file and one assessment file."
				primaryFile={null}
				secondaryFile={null}
				primaryDragging={false}
				secondaryDragging={false}
				primaryAccept=".pdf,.doc,.docx,.ppt,.pptx"
				secondaryAccept=".txt,.doc,.docx,.rtf"
				primaryRef={primaryRef}
				secondaryRef={secondaryRef}
				uploadedSources={[]}
				canRun={false}
				ctaLabel="Build Instructional Blueprint"
				usageCount={0}
				usageLimit={10}
				error={null}
				onPrimaryDragOver={vi.fn()}
				onPrimaryDragLeave={vi.fn()}
				onPrimaryDrop={vi.fn()}
				onSecondaryDragOver={vi.fn()}
				onSecondaryDragLeave={vi.fn()}
				onSecondaryDrop={vi.fn()}
				onPrimaryChange={vi.fn()}
				onSecondaryChange={vi.fn()}
				onClearPrimary={vi.fn()}
				onClearSecondary={vi.fn()}
				onRun={vi.fn()}
				onBack={vi.fn()}
			/>
		);

		expect(screen.getByText("Upload the prep and assessment")).toBeInTheDocument();
		expect(screen.getByText("One prep file only: notes, a review sheet, or the study material students used. (.txt, .doc, .docx, .rtf)")).toBeInTheDocument();
		expect(screen.getByText("One assessment file only: the test students will take.")).toBeInTheDocument();

		const fileInputs = Array.from(container.querySelectorAll('input[type="file"]'));
		expect(fileInputs).toHaveLength(2);
		expect(fileInputs.every((input) => !input.hasAttribute("multiple"))).toBe(true);
	});
});