type ReasoningPanelProps = {
	teacherReasons?: string[];
	studentReasons?: string[];
	misconceptionTag?: string;
};

export function ReasoningPanel(props: ReasoningPanelProps) {
	const { teacherReasons = [], studentReasons = [], misconceptionTag } = props;
	if (teacherReasons.length === 0 && studentReasons.length === 0 && !misconceptionTag) {
		return null;
	}

	return (
		<div className="v4-reasoning-panel">
			{teacherReasons.length > 0 ? (
				<div>
					<h4>Teacher Reasons</h4>
					<ul className="v4-ranked-list">
						{teacherReasons.map((reason) => <li key={reason}><span>{reason}</span></li>)}
					</ul>
				</div>
			) : null}
			{studentReasons.length > 0 ? (
				<div>
					<h4>Student Reasons</h4>
					<ul className="v4-ranked-list">
						{studentReasons.map((reason) => <li key={reason}><span>{reason}</span></li>)}
					</ul>
				</div>
			) : null}
			{misconceptionTag ? <p className="v4-body-copy"><strong>Misconception target:</strong> {misconceptionTag}</p> : null}
		</div>
	);
}