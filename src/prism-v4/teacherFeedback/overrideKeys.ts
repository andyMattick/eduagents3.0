export const INSTRUCTIONAL_UNIT_OVERRIDE_NAMESPACE = "instructional-unit";

export function buildInstructionalUnitOverrideId(sessionId: string, unitId: string) {
	return `${sessionId}::${INSTRUCTIONAL_UNIT_OVERRIDE_NAMESPACE}::${unitId}`;
}