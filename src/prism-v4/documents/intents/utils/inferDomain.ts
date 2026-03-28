import type { AnalyzedDocument, InstructionalUnit, DocumentCollectionAnalysis } from "../../../schema/semantic";

function normalize(text: string) {
    return text.toLowerCase();
}

function guessDomainFromConcepts(concepts: string[]): string | null {
    const joined = normalize(concepts.join(" "));

    if (joined.match(/\bcell\b|\bmitochondria\b|\bnucleus\b|\borganelles?\b/)) {
        return "Life Science";
    }
    if (joined.match(/\bfraction\b|\brate\b|\bslope\b|\bequation\b|\balgebra\b/)) {
        return "Mathematics";
    }
    if (joined.match(/\bconstitution\b|\brevolution\b|\bwar\b|\bcivil\b|\bgovernment\b/)) {
        return "Social Studies";
    }
    if (joined.match(/\btheme\b|\bcharacter\b|\bplot\b|\btext evidence\b/)) {
        return "ELA";
    }

    return null;
}

export function inferDomainMerged(
    conceptToDocumentMap: DocumentCollectionAnalysis["conceptToDocumentMap"],
    analyzedDocuments: AnalyzedDocument[],
    instructionalUnits: InstructionalUnit[],
): string {
    const conceptKeys = Object.keys(conceptToDocumentMap);
    const unitConcepts = instructionalUnits.flatMap((u) => u.concepts);
    const docConcepts = analyzedDocuments.flatMap((d) => d.insights.concepts);

    const allConcepts = [...conceptKeys, ...unitConcepts, ...docConcepts];

    const fromConcepts = guessDomainFromConcepts(allConcepts);
    if (fromConcepts) return fromConcepts;

    // Fallback: coarse buckets
    const text = normalize(allConcepts.join(" "));
    if (text.includes("cell") || text.includes("organism")) return "Science";
    if (text.includes("equation") || text.includes("fraction") || text.includes("number")) return "Mathematics";
    if (text.includes("character") || text.includes("story")) return "ELA";

    // Final fallback: generic but not "general.comprehension"
    return "General Instruction";
}
