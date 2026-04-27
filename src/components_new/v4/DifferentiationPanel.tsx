type Props = {
	value: string;
	onChange: (value: string) => void;
	onGenerate?: (() => void) | null;
	isLoading?: boolean;
};

const OPTIONS = ["", "ELL", "ADHD", "Dyslexia", "Low confidence", "High anxiety", "Gifted"];

export function DifferentiationPanel({ value, onChange, onGenerate = null, isLoading = false }: Props) {
	return (
		<div style={{ marginTop: "1rem" }}>
			<p className="v4-kicker" style={{ marginBottom: "0.45rem" }}>Differentiated Version</p>
			<select
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="v4-item-count-input"
				style={{ maxWidth: "280px" }}
			>
				{OPTIONS.map((option) => (
					<option key={option || "none"} value={option}>
						{option || "No profile selected"}
					</option>
				))}
			</select>
			{onGenerate ? (
				<div style={{ marginTop: "0.75rem", display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
					<button
						type="button"
						className="v4-button v4-button-secondary v4-button-sm"
						onClick={onGenerate}
						disabled={isLoading || !value}
					>
						{isLoading ? "Generating..." : "Generate Differentiated Version"}
					</button>
					{value ? (
						<p className="v4-body-copy" style={{ margin: 0 }}>Preview profile: {value}</p>
					) : null}
				</div>
			) : null}
		</div>
	);
}
