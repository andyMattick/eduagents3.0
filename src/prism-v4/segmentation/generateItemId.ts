export function generateItemId(parentNumber: string, letter?: string): string {
	return letter
		? `item-${parentNumber}${letter.toLowerCase()}`
		: `item-${parentNumber}`;
}
