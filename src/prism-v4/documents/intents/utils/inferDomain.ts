import type { AnalyzedDocument, InstructionalUnit, DocumentCollectionAnalysis } from "../../../schema/semantic";

type DomainName = "Mathematics" | "Life Science" | "Social Studies" | "ELA";

interface DomainSignals {
    problemsPerDomain: Record<DomainName, number>;
    conceptsPerDomain: Record<DomainName, number>;
    lexicalHitsPerDomain: Record<DomainName, number>;
    representationHitsPerDomain: Record<DomainName, number>;
}

interface DomainLexicon {
    conceptPatterns: RegExp[];
    lexicalPatterns: RegExp[];
    representations: string[];
}

const DOMAIN_ORDER: DomainName[] = ["Mathematics", "Life Science", "Social Studies", "ELA"];
const LOW_CONFIDENCE_THRESHOLD = 2;

const DOMAIN_LEXICONS: Record<DomainName, DomainLexicon> = {
    "Mathematics": {
        conceptPatterns: [
            /\bfraction(s)?\b/,
            /\bequivalent fraction(s)?\b/,
            /\bdecimal(s)?\b/,
            /\bratio(s)?\b/,
            /\bproportional( reasoning| relationship(s)?)?\b/,
            /\bslope\b/,
            /\balgebra\b/,
            /\bequation(s)?\b/,
            /\bgeometry\b/,
            /\barea\b/,
            /\bperimeter\b/,
            /\boperation(s)?\b/,
        ],
        lexicalPatterns: [
            /\bsolve\b/,
            /\bcalculate\b/,
            /\bgraph\b/,
            /\bnumber line\b/,
            /\bcoordinate plane\b/,
            /\bshow your reasoning\b/,
        ],
        representations: ["graph", "equation", "table", "diagram"],
    },
    "Life Science": {
        conceptPatterns: [
            /\becosystem(s)?\b/,
            /\bproducer(s)?\b/,
            /\bconsumer(s)?\b/,
            /\bdecomposer(s)?\b/,
            /\bcell(s)?\b/,
            /\bphotosynthesis\b/,
            /\bchloroplast(s)?\b/,
            /\bforces?\b/,
            /\bhabitat(s)?\b/,
            /\bfood web(s)?\b/,
        ],
        lexicalPatterns: [
            /\borganism(s)?\b/,
            /\benergy transfer\b/,
            /\blife cycle\b/,
            /\badaptation(s)?\b/,
            /\bexperiment\b/,
            /\blab\b/,
        ],
        representations: ["diagram", "experiment", "table"],
    },
    "Social Studies": {
        conceptPatterns: [
            /\bgovernment\b/,
            /\bculture\b/,
            /\bhistorical period(s)?\b/,
            /\bgeography\b/,
            /\bconstitution\b/,
            /\bdemocracy\b/,
            /\bcitizenship\b/,
            /\btimeline(s)?\b/,
            /\bprimary source(s)?\b/,
        ],
        lexicalPatterns: [
            /\bshogun\b/,
            /\bfeudal\b/,
            /\bsamurai\b/,
            /\brevolution\b/,
            /\bcivilization\b/,
            /\bmap\b/,
        ],
        representations: ["timeline", "map", "primarysource"],
    },
    "ELA": {
        conceptPatterns: [
            /\btheme\b/,
            /\bcharacter\b/,
            /\bplot\b/,
            /\btext evidence\b/,
            /\bmain idea\b/,
            /\breading comprehension\b/,
            /\bauthor['’]s purpose\b/,
            /\bfigurative language\b/,
        ],
        lexicalPatterns: [
            /\binfer\b/,
            /\bcite evidence\b/,
            /\banalyze the passage\b/,
            /\bsummary\b/,
            /\bparagraph\b/,
        ],
        representations: ["paragraph", "primarysource"],
    },
};

function normalize(value: string) {
    return value.toLowerCase().replace(/[._-]+/g, " ").trim();
}

function emptySignals(): DomainSignals {
    return {
        problemsPerDomain: Object.fromEntries(DOMAIN_ORDER.map((domain) => [domain, 0])) as DomainSignals["problemsPerDomain"],
        conceptsPerDomain: Object.fromEntries(DOMAIN_ORDER.map((domain) => [domain, 0])) as DomainSignals["conceptsPerDomain"],
        lexicalHitsPerDomain: Object.fromEntries(DOMAIN_ORDER.map((domain) => [domain, 0])) as DomainSignals["lexicalHitsPerDomain"],
        representationHitsPerDomain: Object.fromEntries(DOMAIN_ORDER.map((domain) => [domain, 0])) as DomainSignals["representationHitsPerDomain"],
    };
}

function countPatternHits(text: string, patterns: RegExp[]) {
    let hits = 0;
    for (const pattern of patterns) {
        if (pattern.test(text)) {
            hits += 1;
        }
        pattern.lastIndex = 0;
    }
    return hits;
}

function addConceptSignals(signals: DomainSignals, concepts: string[]) {
    for (const concept of concepts) {
        const normalizedConcept = normalize(concept);
        for (const domain of DOMAIN_ORDER) {
            const lexicon = DOMAIN_LEXICONS[domain];
            const conceptHits = countPatternHits(normalizedConcept, lexicon.conceptPatterns);
            if (conceptHits > 0) {
                signals.conceptsPerDomain[domain] += conceptHits;
                signals.lexicalHitsPerDomain[domain] += conceptHits;
            }
        }
    }
}

function addRepresentationSignals(signals: DomainSignals, representations: string[]) {
    for (const representation of representations.map(normalize)) {
        for (const domain of DOMAIN_ORDER) {
            if (DOMAIN_LEXICONS[domain].representations.includes(representation)) {
                signals.representationHitsPerDomain[domain] += 1;
            }
        }
    }
}

function addProblemSignals(signals: DomainSignals, analyzedDocuments: AnalyzedDocument[]) {
    for (const analyzed of analyzedDocuments) {
        for (const problem of analyzed.problems) {
            const text = normalize([problem.text, ...problem.concepts, ...problem.representations].join(" "));
            for (const domain of DOMAIN_ORDER) {
                const lexicon = DOMAIN_LEXICONS[domain];
                const lexicalHits = countPatternHits(text, [...lexicon.conceptPatterns, ...lexicon.lexicalPatterns]);
                const representationHits = problem.representations.filter((representation) => lexicon.representations.includes(normalize(representation))).length;
                if (lexicalHits > 0 || representationHits > 0) {
                    signals.problemsPerDomain[domain] += 1;
                    signals.lexicalHitsPerDomain[domain] += lexicalHits;
                    signals.representationHitsPerDomain[domain] += representationHits;
                }
            }
        }
    }
}

function scoreDomain(signals: DomainSignals, domain: DomainName) {
    return (signals.problemsPerDomain[domain] * 3)
        + (signals.conceptsPerDomain[domain] * 2)
        + signals.lexicalHitsPerDomain[domain]
        + (signals.representationHitsPerDomain[domain] * 1.5);
}

export function inferDomainMerged(
    conceptToDocumentMap: DocumentCollectionAnalysis["conceptToDocumentMap"],
    analyzedDocuments: AnalyzedDocument[],
    instructionalUnits: InstructionalUnit[],
): string {
    const signals = emptySignals();
    const conceptKeys = Object.keys(conceptToDocumentMap);
    const weightedConcepts = [
        ...conceptKeys.flatMap((concept) => Array.from({ length: Math.max(1, conceptToDocumentMap[concept]?.length ?? 1) }, () => concept)),
        ...instructionalUnits.flatMap((unit) => unit.concepts),
        ...analyzedDocuments.flatMap((document) => document.insights.concepts),
    ];
    addConceptSignals(signals, weightedConcepts);
    addProblemSignals(signals, analyzedDocuments);
    addRepresentationSignals(signals, analyzedDocuments.flatMap((document) => document.insights.representations));

    const scoredDomains = DOMAIN_ORDER
        .map((domain) => ({ domain, score: scoreDomain(signals, domain) }))
        .sort((left, right) => right.score - left.score);
    const best = scoredDomains[0];

    if (!best || best.score <= LOW_CONFIDENCE_THRESHOLD) {
        return "General Instruction";
    }

    return best.domain;
}
