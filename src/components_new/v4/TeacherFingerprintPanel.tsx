import { useEffect, useState } from "react";

import type { TeacherFingerprintModel } from "../../types/v4/InstructionalSession";

const BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;
const ITEM_MODES = ["identify", "state", "interpret", "compare", "apply", "analyze", "evaluate", "explain", "construct"] as const;
const SCENARIO_TYPES = ["real-world", "simulation", "data-table", "graphical", "abstract-symbolic"] as const;

type TeacherFingerprintPanelProps = {
	teacherId?: string | null;
	initialFingerprint?: TeacherFingerprintModel | null;
	onFingerprintChange?: ((fingerprint: TeacherFingerprintModel) => void) | null;
};

function buildEmptyFingerprint(teacherId: string): TeacherFingerprintModel {
	return {
		teacherId,
		modePreferences: [],
		scenarioPreferences: [],
		bloomPreferences: [],
		difficultyPreferences: [],
		rawFingerprint: null,
	};
}

function updateCount<T extends string, K extends string>(
	entries: Array<Record<K, T> & { count: number }>,
	key: K,
	value: T,
	nextCount: number,
) {
	const normalizedCount = Math.max(0, Math.floor(nextCount));
	const nextEntries = entries.filter((entry) => entry[key] !== value);
	if (normalizedCount <= 0) {
		return nextEntries;
	}
	return [...nextEntries, { [key]: value, count: normalizedCount } as Record<K, T> & { count: number }];
}

function getCount<T extends string, K extends string>(entries: Array<Record<K, T> & { count: number }>, key: K, value: T) {
	return entries.find((entry) => entry[key] === value)?.count ?? 0;
}

export function TeacherFingerprintPanel(props: TeacherFingerprintPanelProps) {
	const { teacherId, initialFingerprint = null, onFingerprintChange = null } = props;
	const [fingerprint, setFingerprint] = useState<TeacherFingerprintModel | null>(initialFingerprint);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [status, setStatus] = useState<string | null>(null);

	useEffect(() => {
		setFingerprint(initialFingerprint);
	}, [initialFingerprint]);

	useEffect(() => {
		if (!teacherId) {
			return;
		}

		let isCancelled = false;

		async function loadFingerprint() {
			setIsLoading(true);
			setStatus(null);
			try {
				const response = await fetch(`/api/v4/teachers/${encodeURIComponent(teacherId)}/fingerprint`);
				const payload = await response.json().catch(() => ({}));
				if (!response.ok) {
					throw new Error(payload?.error ?? "Failed to load teacher fingerprint.");
				}
				if (!isCancelled) {
					setFingerprint(payload.fingerprint as TeacherFingerprintModel);
				}
			} catch (error) {
				if (!isCancelled) {
					setFingerprint(buildEmptyFingerprint(teacherId));
					setStatus(error instanceof Error ? error.message : "Failed to load teacher fingerprint.");
				}
			} finally {
				if (!isCancelled) {
					setIsLoading(false);
				}
			}
		}

		void loadFingerprint();
		return () => {
			isCancelled = true;
		};
	}, [teacherId]);

	if (!teacherId) {
		return (
			<div className="v4-product-card">
				<h3>Teacher Fingerprint</h3>
				<p className="v4-body-copy">No teacher identity is linked to this assessment session yet.</p>
			</div>
		);
	}

	const activeFingerprint = fingerprint ?? buildEmptyFingerprint(teacherId);

	async function saveFingerprint() {
		setIsSaving(true);
		setStatus(null);
		try {
			const response = await fetch(`/api/v4/teachers/${encodeURIComponent(teacherId)}/fingerprint`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(activeFingerprint),
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(payload?.error ?? "Failed to save teacher fingerprint.");
			}
			setFingerprint(payload.fingerprint as TeacherFingerprintModel);
			onFingerprintChange?.(payload.fingerprint as TeacherFingerprintModel);
			setStatus("Teacher fingerprint saved.");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to save teacher fingerprint.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="v4-product-grid">
			<div className="v4-product-card v4-product-span">
				<div className="v4-document-card-header">
					<div>
						<h3>Teacher Fingerprint</h3>
						<p className="v4-body-copy">Persistent teacher preferences for Bloom demand, item modes, and scenario choices.</p>
					</div>
					<button className="v4-button v4-button-secondary" type="button" onClick={() => void saveFingerprint()} disabled={isLoading || isSaving}>
						{isSaving ? "Saving..." : "Save Fingerprint"}
					</button>
				</div>
				{status ? <p className="v4-upload-name">{status}</p> : null}
			</div>
			<div className="v4-product-card">
				<h3>Bloom Preferences</h3>
				<div className="v4-fingerprint-grid">
					{BLOOM_LEVELS.map((level) => (
						<label key={level} className="v4-upload-field">
							<span>{level}</span>
							<input
								aria-label={`Teacher bloom ${level}`}
								type="number"
								min={0}
								value={getCount(activeFingerprint.bloomPreferences, "level", level)}
								onChange={(event) => setFingerprint((current) => ({
									...(current ?? buildEmptyFingerprint(teacherId)),
									bloomPreferences: updateCount((current ?? buildEmptyFingerprint(teacherId)).bloomPreferences, "level", level, Number(event.target.value)),
								}))}
								disabled={isLoading || isSaving}
							/>
						</label>
					))}
				</div>
			</div>
			<div className="v4-product-card">
				<h3>Item Modes</h3>
				<div className="v4-fingerprint-grid">
					{ITEM_MODES.map((mode) => (
						<label key={mode} className="v4-upload-field">
							<span>{mode}</span>
							<input
								aria-label={`Teacher mode ${mode}`}
								type="number"
								min={0}
								value={getCount(activeFingerprint.modePreferences, "mode", mode)}
								onChange={(event) => setFingerprint((current) => ({
									...(current ?? buildEmptyFingerprint(teacherId)),
									modePreferences: updateCount((current ?? buildEmptyFingerprint(teacherId)).modePreferences, "mode", mode, Number(event.target.value)),
								}))}
								disabled={isLoading || isSaving}
							/>
						</label>
					))}
				</div>
			</div>
			<div className="v4-product-card v4-product-span">
				<h3>Scenario Preferences</h3>
				<div className="v4-fingerprint-grid">
					{SCENARIO_TYPES.map((scenario) => (
						<label key={scenario} className="v4-upload-field">
							<span>{scenario}</span>
							<input
								aria-label={`Teacher scenario ${scenario}`}
								type="number"
								min={0}
								value={getCount(activeFingerprint.scenarioPreferences, "scenario", scenario)}
								onChange={(event) => setFingerprint((current) => ({
									...(current ?? buildEmptyFingerprint(teacherId)),
									scenarioPreferences: updateCount((current ?? buildEmptyFingerprint(teacherId)).scenarioPreferences, "scenario", scenario, Number(event.target.value)),
								}))}
								disabled={isLoading || isSaving}
							/>
						</label>
					))}
				</div>
			</div>
		</div>
	);
}