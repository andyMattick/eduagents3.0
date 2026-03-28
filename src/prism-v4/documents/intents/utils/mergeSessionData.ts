import type { AnalyzedDocument, DocumentCollectionAnalysis, InstructionalUnit } from "../../../schema/semantic";

function unique<T>(values: T[]) {
    return [...new Set(values)];
}

export function mergeAnalyzedDocuments(docs: AnalyzedDocument[]): AnalyzedDocument[] {
    const byId = new Map<string, AnalyzedDocument>();

    for (const doc of docs) {
        const id = doc.document.id;
        const existing = byId.get(id);
        if (!existing) {
            // clone shallowly so we can mutate safely
            byId.set(id, {
                ...doc,
                problems: [...doc.problems],
                fragments: [...doc.fragments],
                insights: {
                    ...doc.insights,
                    concepts: [...doc.insights.concepts],
                },
            });
            continue;
        }
                // merge problems by stable ID
        const mergedProblems = [...existing.problems, ...doc.problems];
        const dedupedProblems = Array.from(
            new Map(mergedProblems.map((p) => [p.id, p])).values()
        );

        // merge fragments by fragment ID
        const mergedFragments = [...existing.fragments, ...doc.fragments];
        const dedupedFragments = Array.from(
            new Map(mergedFragments.map((f) => [f.id, f])).values()
        );

        // merge concepts
        const mergedConcepts = unique([
            ...existing.insights.concepts,
            ...doc.insights.concepts,
        ]);
        existing.problems = dedupedProblems;
        existing.fragments = dedupedFragments;
        existing.insights.concepts = mergedConcepts;
    }
    return [...byId.values()];
}

export function mergeInstructionalUnits(units: InstructionalUnit[]): InstructionalUnit[] {
    const byId = new Map<string, InstructionalUnit>();

    for (const unit of units) {
        const existing = byId.get(unit.unitId);
        if (!existing) {
            byId.set(unit.unitId, {
                ...unit,
                fragments: [...unit.fragments],
            });
            continue;
        }
        const mergedFragments = [...existing.fragments, ...unit.fragments];
        const dedupedFragments = Array.from(
            new Map(mergedFragments.map((f) => [f.id, f])).values()
        );
        existing.fragments = dedupedFragments;
    }

    return [...byId.values()];
}

export function mergeCollectionAnalysis(
    base: DocumentCollectionAnalysis,
    analyzedDocuments: AnalyzedDocument[] = [],
): DocumentCollectionAnalysis {
    if (analyzedDocuments.length === 0) {
        return base;
    }

    const conceptToDocs = new Map<string, Set<string>>();

    // seed from base
    for (const [concept, docs] of Object.entries(base.conceptToDocumentMap)) {
        conceptToDocs.set(concept, new Set(docs));
    }

    // merge from analyzed docs
    for (const analyzed of analyzedDocuments) {
        for (const concept of analyzed.insights.concepts) {
            if (!conceptToDocs.has(concept)) conceptToDocs.set(concept, new Set());
            conceptToDocs.get(concept)!.add(analyzed.document.id);
        }
    }

    return {
        ...base,
        conceptToDocumentMap: Object.fromEntries(
            [...conceptToDocs.entries()].map(([c, set]) => [c, [...set]])
        ),
    };
}

