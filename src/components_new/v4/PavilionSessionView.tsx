import { useEffect, useMemo, useState } from "react";

import type { IntentRequestOptions } from "../../prism-v4/schema/integration/ConceptBlueprint";
import type { IntentType } from "../../prism-v4/schema/integration/IntentRequest";
import type { IntentProduct } from "../../prism-v4/schema/integration/IntentProduct";
import type { InstructionalIntelligenceSession, InstructionalSessionWorkspace, TeacherFingerprintModel } from "../../types/v4/InstructionalSession";
import { AnalysisPanel } from "./AnalysisPanel";
import { AssessmentPreview } from "./AssessmentPreview";
import { BlueprintPanel } from "./BlueprintPanel";
import { BuilderPlanView } from "./BuilderPlanView";
import { ClassDifferentiator } from "./ClassDifferentiator";
import { ConceptMap } from "./ConceptMap";
import { StudentProfilePanel } from "./StudentProfilePanel";
import { TeacherFingerprintPanel } from "./TeacherFingerprintPanel";
import { ViewerSurface } from "./viewer/ViewerSurface";
import { useViewerSelection } from "./viewer/useViewerSelection";
import { buildViewerData } from "../../prism-v4/viewer";
import { InstructionalIntelligenceSurface } from "./intelligence/InstructionalIntelligenceSurface";

type IntentConfig = {
	label: string;
	description: string;
	numericOption?: {
		key: string;
		label: string;
		defaultValue: number;
	};
};

const STUDIO_INTENTS: IntentType[] = [
	"build-test",
	"build-lesson",
	"build-review",
	"build-unit",
	"build-instructional-map",
	"build-sequence",
	"curriculum-alignment",
	"compare-documents",
	"merge-documents",
	"extract-problems",
	"extract-concepts",
	"summarize",
];

const INTENT_CONFIG: Record<IntentType, IntentConfig> = {
	"build-unit": { label: "Unit Plan", description: "Generate a multi-day unit sequence from the active workspace." },
	"build-lesson": { label: "Lesson", description: "Generate a ready-to-teach lesson from the active workspace." },
	"build-instructional-map": { label: "Instructional Map", description: "Generate the concept-and-anchor view for the current workspace." },
	"curriculum-alignment": { label: "Curriculum Alignment", description: "Generate a standards and gap view for the current materials." },
	"compare-documents": { label: "Compare Materials", description: "Generate a comparison across the current materials." },
	"merge-documents": { label: "Merge Materials", description: "Generate a merged synthesis of the current materials." },
	"build-sequence": { label: "Teaching Sequence", description: "Generate a recommended instructional order for the current materials." },
	"build-review": { label: "Review Plan", description: "Generate a review plan for the current materials.", numericOption: { key: "maxSections", label: "Sections", defaultValue: 3 } },
	"build-test": { label: "Assessment", description: "Generate an assessment draft and unlock the adaptive pavilion tabs.", numericOption: { key: "itemCount", label: "Questions", defaultValue: 5 } },
	"extract-problems": { label: "Questions From Your Materials", description: "Extract authored questions from the current materials.", numericOption: { key: "maxItems", label: "Max questions", defaultValue: 10 } },
	"extract-concepts": { label: "Key Ideas", description: "Extract the strongest concepts from the current materials.", numericOption: { key: "maxConcepts", label: "Max ideas", defaultValue: 8 } },
	"summarize": { label: "Summary", description: "Generate a concise teacher-facing summary." },
	"build-practice-set": { label: "Build Practice Set", description: "Not surfaced in the pavilion yet." },
	"rewrite": { label: "Rewrite", description: "Not surfaced in the pavilion yet." },
	"student-handout": { label: "Student Handout", description: "Not surfaced in the pavilion yet." },
	"teacher-guide": { label: "Teacher Guide", description: "Not surfaced in the pavilion yet." },
	"build-test-from-review": { label: "Build Test From Review", description: "Not surfaced in the pavilion yet." },
	"build-review-from-test": { label: "Build Review From Test", description: "Not surfaced in the pavilion yet." },
};

type PavilionSessionViewProps = {
	sessionId: string;
	instructionalSession: InstructionalIntelligenceSession | null;
	products: IntentProduct[];
	teacherId?: string | null;
	onGenerateProduct: (args: {
		intentType: IntentType;
		options?: IntentRequestOptions;
		studentId?: string;
		enableAdaptiveConditioning?: boolean;
	}) => Promise<IntentProduct | null>;
	renderProduct: (product: IntentProduct) => JSX.Element;
	loadBlueprint: (sessionId: string) => Promise<unknown>;
	loadTeacherFingerprint: (teacherId: string) => Promise<TeacherFingerprintModel | null | void>;
	updateTeacherFingerprint: (teacherId: string, patch: Partial<TeacherFingerprintModel>) => Promise<TeacherFingerprintModel | null | void>;
	loadStudentProfile: (studentId: string) => Promise<unknown>;
	loadClassProfile: (classId: string) => Promise<unknown>;
	loadDifferentiatedBuild: (classId: string) => Promise<unknown>;
	loadBuilderPlan: (sessionId: string, studentId?: string) => Promise<unknown>;
	loadAssessmentPreview: (sessionId: string, studentId?: string) => Promise<unknown>;
	workspace?: InstructionalSessionWorkspace | null;
};

function getIntentConfig(intentType: IntentType) {
	return INTENT_CONFIG[intentType];
}

function resolveProductTitle(product: IntentProduct) {
	const payload = product.payload as { title?: string; kind?: string };
	if (typeof payload.title === "string" && payload.title.trim()) {
		return payload.title;
	}
	return INTENT_CONFIG[product.intentType]?.label ?? payload.kind ?? product.intentType;
}

function sortProductsNewestFirst(products: IntentProduct[]) {
	return [...products].sort((left, right) => new Date(right.createdAt ?? right.payload.generatedAt ?? 0).getTime() - new Date(left.createdAt ?? left.payload.generatedAt ?? 0).getTime());
}

export function PavilionSessionView(props: PavilionSessionViewProps) {
	const {
		sessionId,
		instructionalSession,
		products,
		teacherId = null,
		onGenerateProduct,
		renderProduct,
		loadBlueprint,
		loadTeacherFingerprint,
		updateTeacherFingerprint,
		loadStudentProfile,
		loadClassProfile,
		loadDifferentiatedBuild,
		loadBuilderPlan,
		loadAssessmentPreview,
		workspace = null,
	} = props;
	const viewerSelection = useViewerSelection();
	const viewerData = useMemo(() => (workspace ? buildViewerData(workspace) : null), [workspace]);
	const [activeTab, setActiveTab] = useState<"gallery" | "blueprint" | "concept-map" | "fingerprint" | "student" | "plan" | "preview" | "class" | "viewer" | "intelligence">("gallery");
	const [selectedIntent, setSelectedIntent] = useState<IntentType>("build-test");
	const [compareDocsMode, setCompareDocsMode] = useState<"all" | "prep" | "practice">("all");
	const [focus, setFocus] = useState("");
	const [numericOptionValue, setNumericOptionValue] = useState(String(getIntentConfig("build-test").numericOption?.defaultValue ?? 5));
	const [unitId, setUnitId] = useState("");
	const [studentIdDraft, setStudentIdDraft] = useState("");
	const [adaptiveConditioningEnabled, setAdaptiveConditioningEnabled] = useState(true);
	const [isGenerating, setIsGenerating] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

	const sortedProducts = useMemo(() => sortProductsNewestFirst(products), [products]);
	const chronologicalProducts = useMemo(
		() => [...products].sort((left, right) => new Date(left.createdAt ?? left.payload.generatedAt ?? 0).getTime() - new Date(right.createdAt ?? right.payload.generatedAt ?? 0).getTime()),
		[products],
	);
	const draftNumbers = useMemo(() => new Map(chronologicalProducts.map((product, index) => [product.productId, index + 1])), [chronologicalProducts]);
	const selectedProduct = sortedProducts.find((product) => product.productId === selectedProductId) ?? sortedProducts[0] ?? null;
	const assessmentDraft = selectedProduct?.intentType === "build-test"
		? selectedProduct
		: sortedProducts.find((product) => product.intentType === "build-test") ?? null;
	const hasDraft = Boolean(selectedProduct);
	const hasAssessmentDraft = Boolean(assessmentDraft);
	const currentIntentConfig = getIntentConfig(selectedIntent);

	function getDraftLabel(product: IntentProduct | null) {
		if (!product) {
			return "Draft";
		}
		return `Draft ${draftNumbers.get(product.productId) ?? 1}`;
	}

	useEffect(() => {
		if (!sortedProducts.length) {
			setSelectedProductId(null);
			return;
		}
		if (!selectedProductId || !sortedProducts.some((product) => product.productId === selectedProductId)) {
			setSelectedProductId(sortedProducts[0]?.productId ?? null);
		}
	}, [selectedProductId, sortedProducts]);

	useEffect(() => {
		setNumericOptionValue(String(currentIntentConfig.numericOption?.defaultValue ?? 5));
	}, [selectedIntent, currentIntentConfig.numericOption?.defaultValue]);

	useEffect(() => {
		if (!hasDraft) {
			setActiveTab("gallery");
			return;
		}

		if (!hasAssessmentDraft) {
			if (activeTab !== "gallery" && activeTab !== "viewer") {
				setActiveTab("gallery");
			}
			return;
		}

		if (selectedProduct?.intentType === "build-test" && activeTab === "gallery") {
			setActiveTab("plan");
		}
	}, [activeTab, hasAssessmentDraft, hasDraft, selectedProduct?.intentType]);

	useEffect(() => {
		if (hasAssessmentDraft && activeTab === "blueprint" && !instructionalSession?.blueprint) {
			void loadBlueprint(sessionId);
		}
	}, [activeTab, hasAssessmentDraft, instructionalSession?.blueprint, loadBlueprint, sessionId]);

	useEffect(() => {
		if (hasAssessmentDraft && activeTab === "fingerprint" && teacherId && !instructionalSession?.teacherFingerprint) {
			void loadTeacherFingerprint(teacherId);
		}
	}, [activeTab, hasAssessmentDraft, instructionalSession?.teacherFingerprint, loadTeacherFingerprint, teacherId]);

	useEffect(() => {
		if (hasAssessmentDraft && activeTab === "plan" && !instructionalSession?.builderPlan) {
			void loadBuilderPlan(sessionId, instructionalSession?.activeStudentId);
		}
	}, [activeTab, hasAssessmentDraft, instructionalSession?.activeStudentId, instructionalSession?.builderPlan, loadBuilderPlan, sessionId]);

	useEffect(() => {
		if (hasAssessmentDraft && (activeTab === "plan" || activeTab === "preview") && !instructionalSession?.assessmentPreview) {
			void loadAssessmentPreview(sessionId, instructionalSession?.activeStudentId);
		}
	}, [activeTab, hasAssessmentDraft, instructionalSession?.activeStudentId, instructionalSession?.assessmentPreview, loadAssessmentPreview, sessionId]);

	async function handleGenerateProduct() {
		setIsGenerating(true);
		setStatus(null);
		try {
			const options: IntentRequestOptions = {};
			if (focus.trim()) {
				options.focus = focus.trim();
			}
			if (currentIntentConfig.numericOption) {
				const parsed = Number(numericOptionValue);
				if (Number.isFinite(parsed) && parsed > 0) {
					options[currentIntentConfig.numericOption.key] = Math.floor(parsed);
				}
			}
			if (selectedIntent === "build-test") {
				if (teacherId) {
					options.teacherId = teacherId;
				}
				if (unitId.trim()) {
					options.unitId = unitId.trim();
				}
			}
			if (selectedIntent === "compare-documents") {
				options.mode = compareDocsMode;
			}

			const product = await onGenerateProduct({
				intentType: selectedIntent,
				options: Object.keys(options).length > 0 ? options : undefined,
				studentId: selectedIntent === "build-test" && studentIdDraft.trim() ? studentIdDraft.trim() : undefined,
				enableAdaptiveConditioning: selectedIntent === "build-test" ? adaptiveConditioningEnabled : undefined,
			});
			if (!product) {
				setStatus("Pavilion generation did not return a draft.");
				return;
			}

			setSelectedProductId(product.productId);
			setStatus(`${getDraftLabel(product)} is live in the pavilion.`);
			if (product.intentType === "build-test") {
				setActiveTab("plan");
				void loadBlueprint(sessionId);
				void loadBuilderPlan(sessionId, studentIdDraft.trim() ? studentIdDraft.trim() : undefined);
				void loadAssessmentPreview(sessionId, studentIdDraft.trim() ? studentIdDraft.trim() : undefined);
			} else {
				setActiveTab("gallery");
			}
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to generate pavilion output.");
		} finally {
			setIsGenerating(false);
		}
	}

	function renderSelectedOutput() {
		if (!selectedProduct) {
			return <p className="v4-body-copy">No pavilion output is selected yet.</p>;
		}

		if (selectedProduct.intentType === "build-test") {
			const payload = selectedProduct.payload as { title?: string; overview?: string; totalItemCount?: number };
			return (
				<div className="v4-product-grid">
					<div className="v4-product-card v4-product-span">
						<div className="v4-document-card-header">
							<div>
								<h3>{getDraftLabel(selectedProduct)}</h3>
								<p className="v4-body-copy">The adaptive assessment studio is active. Use Builder Plan, Blueprint, Living Assessment, Student, and Class to reshape this draft.</p>
							</div>
							<span className="v4-pill">{payload.totalItemCount ?? 0} items</span>
						</div>
						<p className="v4-body-copy">{payload.title ?? "Assessment Draft"}</p>
						{payload.overview ? <p className="v4-body-copy">{payload.overview}</p> : null}
					</div>
				</div>
			);
		}

		return renderProduct(selectedProduct);
	}

	return (
		<div className="v4-product-grid">
			{!hasDraft ? (
				<>
					<div className="v4-product-span">
						<AnalysisPanel analysis={instructionalSession?.analysis ?? null} />
					</div>
					<div className="v4-product-card v4-product-span">
						<div className="v4-section-heading">
							<div>
								<p className="v4-kicker">Pavilion Studio</p>
								<h2>Generate the first pavilion draft</h2>
							</div>
							<span className="v4-pill">Act 1 only</span>
						</div>
						<div className="v4-intent-grid">
							<label className="v4-upload-field">
								<span>Build surface</span>
								<select aria-label="Build surface" value={selectedIntent} onChange={(event) => setSelectedIntent(event.target.value as IntentType)}>
									{STUDIO_INTENTS.map((intent) => <option key={intent} value={intent}>{getIntentConfig(intent).label}</option>)}
								</select>
							</label>
							<label className="v4-upload-field">
								<span>Pavilion focus</span>
								<input aria-label="Pavilion focus" value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="fractions, misconceptions, synthesis..." />
							</label>
							{currentIntentConfig.numericOption ? (
								<label className="v4-upload-field">
									<span>{currentIntentConfig.numericOption.label}</span>
									<input aria-label={currentIntentConfig.numericOption.label} type="number" min={1} value={numericOptionValue} onChange={(event) => setNumericOptionValue(event.target.value)} />
								</label>
							) : null}
							{selectedIntent === "compare-documents" ? (
								<label className="v4-upload-field">
									<span>Compare</span>
									<select aria-label="Compare mode" value={compareDocsMode} onChange={(event) => setCompareDocsMode(event.target.value as "all" | "prep" | "practice")}>
										<option value="all">Everything</option>
										<option value="prep">Prep Notes Only</option>
										<option value="practice">Practice Items Only</option>
									</select>
								</label>
							) : null}
							{selectedIntent === "build-test" ? (
								<>
									<label className="v4-upload-field">
										<span>Unit ID</span>
										<input aria-label="Unit ID" value={unitId} onChange={(event) => setUnitId(event.target.value)} placeholder="Optional assessment unit scope" />
									</label>
									<label className="v4-upload-field">
										<span>Student ID</span>
										<input aria-label="Student ID" value={studentIdDraft} onChange={(event) => setStudentIdDraft(event.target.value)} placeholder="Optional learner profile" />
									</label>
									<label className="v4-upload-field">
										<span>Adaptive conditioning</span>
										<input aria-label="Adaptive conditioning" type="checkbox" checked={adaptiveConditioningEnabled} onChange={(event) => setAdaptiveConditioningEnabled(event.target.checked)} />
									</label>
								</>
							) : null}
						</div>
						<p className="v4-body-copy">{currentIntentConfig.description}</p>
						<div className="v4-upload-actions">
							<button className="v4-button" type="button" onClick={() => void handleGenerateProduct()} disabled={isGenerating}>
								{isGenerating ? "Generating..." : "Generate in Pavilion"}
							</button>
						</div>
						{status ? <p className="v4-upload-name">{status}</p> : null}
					</div>
				</>
			) : null}

			{hasDraft ? (
				<>
					<div className="v4-product-card v4-product-span v4-pavilion-reveal">
						<div className="v4-section-heading">
							<div>
								<p className="v4-kicker">Pavilion Reveal</p>
								<h2>{hasAssessmentDraft ? "The adaptive studio is live" : "Your first pavilion surface is live"}</h2>
							</div>
							<span className="v4-pill">{getDraftLabel(selectedProduct)}</span>
						</div>
						<p className="v4-body-copy">
							{hasAssessmentDraft
								? "Builder plan, preview, blueprint, student conditioning, fingerprint alignment, and class differentiation are now unlocked."
								: "The first pavilion output is ready. Use the gallery to inspect it or generate an assessment draft to unlock the adaptive workbench."}
						</p>
						{status ? <p className="v4-upload-name">{status}</p> : null}
					</div>
					<div className="v4-product-card v4-product-span v4-pavilion-reveal">
						<div className="v4-tab-strip" role="tablist" aria-label="Pavilion tabs">
							<button className={`v4-tab-button ${activeTab === "gallery" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "gallery"} onClick={() => setActiveTab("gallery")}>Output Gallery</button>
							{hasAssessmentDraft ? <button className={`v4-tab-button ${activeTab === "blueprint" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "blueprint"} onClick={() => setActiveTab("blueprint")}>Blueprint</button> : null}
							{hasAssessmentDraft ? <button className={`v4-tab-button ${activeTab === "concept-map" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "concept-map"} onClick={() => setActiveTab("concept-map")}>Concept Map</button> : null}
							{hasAssessmentDraft ? <button className={`v4-tab-button ${activeTab === "fingerprint" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "fingerprint"} onClick={() => setActiveTab("fingerprint")}>Teacher Fingerprint</button> : null}
							{hasAssessmentDraft ? <button className={`v4-tab-button ${activeTab === "student" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "student"} onClick={() => setActiveTab("student")}>Student</button> : null}
							{hasAssessmentDraft ? <button className={`v4-tab-button ${activeTab === "plan" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "plan"} onClick={() => setActiveTab("plan")}>Builder Plan</button> : null}
							{hasAssessmentDraft ? <button className={`v4-tab-button ${activeTab === "preview" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "preview"} onClick={() => setActiveTab("preview")}>Living Assessment</button> : null}
							{hasAssessmentDraft ? <button className={`v4-tab-button ${activeTab === "class" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "class"} onClick={() => setActiveTab("class")}>Class</button> : null}
							{workspace ? <button className={`v4-tab-button ${activeTab === "viewer" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "viewer"} onClick={() => setActiveTab("viewer")}>Document Viewer</button> : null}						{workspace ? <button className={`v4-tab-button ${activeTab === "intelligence" ? "v4-tab-button-active" : ""}`} type="button" role="tab" aria-selected={activeTab === "intelligence"} onClick={() => setActiveTab("intelligence")}>Instructional Intelligence</button> : null}						</div>
					</div>

					{activeTab === "gallery" ? (
						<>
							<div className="v4-product-card">
								<h3>Output Gallery</h3>
								<ul className="v4-history-list">
									{sortedProducts.map((product) => (
										<li key={product.productId}>
											<button className={`v4-history-item ${selectedProduct?.productId === product.productId ? "v4-history-item-active" : ""}`} type="button" onClick={() => setSelectedProductId(product.productId)}>
												<div>
													<strong>{getDraftLabel(product)}</strong>
													<span>{resolveProductTitle(product)}</span>
												</div>
												<span>{new Date(product.createdAt ?? product.payload.generatedAt ?? Date.now()).toLocaleDateString()}</span>
											</button>
										</li>
									))}
								</ul>
							</div>
							<div className="v4-product-card">
								<div className="v4-section-heading">
									<div>
										<p className="v4-kicker">Pavilion Studio</p>
										<h3>Generate the next surface</h3>
									</div>
									<span className="v4-pill">{sortedProducts.length} drafts</span>
								</div>
								<div className="v4-intent-grid">
									<label className="v4-upload-field">
										<span>Build surface</span>
										<select aria-label="Build surface" value={selectedIntent} onChange={(event) => setSelectedIntent(event.target.value as IntentType)}>
											{STUDIO_INTENTS.map((intent) => <option key={intent} value={intent}>{getIntentConfig(intent).label}</option>)}
										</select>
									</label>
									<label className="v4-upload-field">
										<span>Pavilion focus</span>
										<input aria-label="Pavilion focus" value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="fractions, misconceptions, synthesis..." />
									</label>
									{currentIntentConfig.numericOption ? (
										<label className="v4-upload-field">
											<span>{currentIntentConfig.numericOption.label}</span>
											<input aria-label={currentIntentConfig.numericOption.label} type="number" min={1} value={numericOptionValue} onChange={(event) => setNumericOptionValue(event.target.value)} />
										</label>
									) : null}
									{selectedIntent === "compare-documents" ? (
										<label className="v4-upload-field">
											<span>Compare</span>
											<select aria-label="Compare mode" value={compareDocsMode} onChange={(event) => setCompareDocsMode(event.target.value as "all" | "prep" | "practice")}>
												<option value="all">Everything</option>
												<option value="prep">Prep Notes Only</option>
												<option value="practice">Practice Items Only</option>
											</select>
										</label>
									) : null}
									{selectedIntent === "build-test" ? (
										<>
											<label className="v4-upload-field">
												<span>Unit ID</span>
												<input aria-label="Unit ID" value={unitId} onChange={(event) => setUnitId(event.target.value)} placeholder="Optional assessment unit scope" />
											</label>
											<label className="v4-upload-field">
												<span>Student ID</span>
												<input aria-label="Student ID" value={studentIdDraft} onChange={(event) => setStudentIdDraft(event.target.value)} placeholder="Optional learner profile" />
											</label>
											<label className="v4-upload-field">
												<span>Adaptive conditioning</span>
												<input aria-label="Adaptive conditioning" type="checkbox" checked={adaptiveConditioningEnabled} onChange={(event) => setAdaptiveConditioningEnabled(event.target.checked)} />
											</label>
										</>
									) : null}
								</div>
								<p className="v4-body-copy">{currentIntentConfig.description}</p>
								<div className="v4-upload-actions">
									<button className="v4-button" type="button" onClick={() => void handleGenerateProduct()} disabled={isGenerating}>
										{isGenerating ? "Generating..." : "Generate in Pavilion"}
									</button>
								</div>
							</div>
							<div className="v4-product-card v4-product-span">
								<h3>Selected Output</h3>
								{renderSelectedOutput()}
							</div>
						</>
					) : null}
					{activeTab === "blueprint" ? <BlueprintPanel blueprint={instructionalSession?.blueprint ?? null} conceptMap={instructionalSession?.conceptMap ?? null} /> : null}
					{activeTab === "concept-map" ? <ConceptMap conceptMap={instructionalSession?.conceptMap ?? null} studentProfile={instructionalSession?.studentProfile ?? null} /> : null}
					{activeTab === "fingerprint" ? (
				<TeacherFingerprintPanel
					teacherId={teacherId}
					initialFingerprint={instructionalSession?.teacherFingerprint ?? null}
					onLoadFingerprint={loadTeacherFingerprint}
					onSaveFingerprint={updateTeacherFingerprint}
				/>
					) : null}
					{activeTab === "student" ? (
				<StudentProfilePanel
					activeStudentId={instructionalSession?.activeStudentId ?? studentIdDraft ?? null}
					profile={instructionalSession?.studentProfile ?? null}
					misconceptions={instructionalSession?.studentMisconceptions ?? []}
					exposureTimeline={instructionalSession?.studentExposureTimeline ?? []}
					responseTimes={instructionalSession?.studentResponseTimes ?? []}
					onStudentChange={(studentId) => setStudentIdDraft(studentId)}
					onLoadStudent={(studentId) => { void loadStudentProfile(studentId); }}
				/>
					) : null}
					{activeTab === "plan" ? (
						<div className="v4-product-grid v4-pavilion-workbench-stage">
							<div className="v4-pavilion-two-up">
								<div className="v4-pavilion-column">
									<BuilderPlanView plan={instructionalSession?.builderPlan ?? null} onRefresh={() => { void loadBuilderPlan(sessionId, instructionalSession?.activeStudentId); }} />
								</div>
								<div className="v4-pavilion-column">
									<AssessmentPreview preview={instructionalSession?.assessmentPreview ?? null} onRefresh={() => { void loadAssessmentPreview(sessionId, instructionalSession?.activeStudentId); }} />
								</div>
							</div>
						</div>
					) : null}
					{activeTab === "preview" ? <AssessmentPreview preview={instructionalSession?.assessmentPreview ?? null} onRefresh={() => { void loadAssessmentPreview(sessionId, instructionalSession?.activeStudentId); }} /> : null}
					{activeTab === "class" ? (
				<ClassDifferentiator
					classId={sessionId}
					classProfile={instructionalSession?.classProfile ?? null}
					differentiatedBuild={instructionalSession?.differentiatedBuild ?? null}
					onLoadClassProfile={loadClassProfile}
					onLoadDifferentiatedBuild={loadDifferentiatedBuild}
				/>
					) : null}
					{activeTab === "viewer" && viewerData ? (
						<ViewerSurface
							data={viewerData}
							selectedGroupKey={viewerSelection.selectedGroupKey}
							selectedConcept={viewerSelection.selectedConcept}
							selectedPreviewItem={viewerSelection.selectedPreviewItem}
							onSelectGroup={viewerSelection.selectGroup}
							onSelectConcept={viewerSelection.selectConcept}
							onSelectPreviewItem={viewerSelection.selectPreviewItem}
						/>
					) : null}
					{activeTab === "intelligence" && viewerData ? (
						<InstructionalIntelligenceSurface
							data={viewerData}
							selectedGroupKey={viewerSelection.selectedGroupKey}
							selectedConcept={viewerSelection.selectedConcept}
							selectedPreviewItem={viewerSelection.selectedPreviewItem}
							onSelectGroup={viewerSelection.selectGroup}
							onSelectConcept={viewerSelection.selectConcept}
							onSelectPreviewItem={viewerSelection.selectPreviewItem}
						/>
					) : null}
				</>
			) : null}
		</div>
	);
}