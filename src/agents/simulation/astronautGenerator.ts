/**
 * Astronaut Generator: Creates student profiles with learning traits and accessibility needs
 */

import { Astronaut } from '../../types/simulation';

/**
 * Predefined learner personas with profile traits
 */
export const PREDEFINED_ASTRONAUTS: Record<string, Astronaut> = {
  // Standard learners
  strong_reader: {
    StudentId: 'astronaut_strong_reader',
    PersonaName: '📚 Strong Reader',
    Overlays: [],
    NarrativeTags: ['analytical', 'detail-oriented', 'focused', 'organized'],
    ProfileTraits: {
      ReadingLevel: 0.9,
      MathFluency: 0.7,
      AttentionSpan: 0.85,
      Confidence: 0.85,
    },
    GradeLevel: '6-12',
  },

  visual_learner: {
    StudentId: 'astronaut_visual_learner',
    PersonaName: '🎨 Visual Learner',
    Overlays: [],
    NarrativeTags: ['visual', 'spatial', 'creative', 'intuitive'],
    ProfileTraits: {
      ReadingLevel: 0.65,
      MathFluency: 0.75,
      AttentionSpan: 0.7,
      Confidence: 0.7,
    },
    GradeLevel: '6-12',
  },

  hands_on_learner: {
    StudentId: 'astronaut_hands_on',
    PersonaName: '🔧 Hands-On Learner',
    Overlays: [],
    NarrativeTags: ['practical', 'experiential', 'kinesthetic', 'applied'],
    ProfileTraits: {
      ReadingLevel: 0.6,
      MathFluency: 0.8,
      AttentionSpan: 0.65,
      Confidence: 0.75,
    },
    GradeLevel: '6-12',
  },

  collaborative_learner: {
    StudentId: 'astronaut_collaborative',
    PersonaName: '👥 Collaborative Learner',
    Overlays: [],
    NarrativeTags: ['social', 'collaborative', 'communicative', 'empathetic'],
    ProfileTraits: {
      ReadingLevel: 0.7,
      MathFluency: 0.65,
      AttentionSpan: 0.75,
      Confidence: 0.8,
    },
    GradeLevel: '6-12',
  },

  struggling_learner: {
    StudentId: 'astronaut_struggling',
    PersonaName: '📕 Struggling Learner',
    Overlays: [],
    NarrativeTags: ['needs-support', 'persistent', 'effort-based', 'resilient'],
    ProfileTraits: {
      ReadingLevel: 0.45,
      MathFluency: 0.4,
      AttentionSpan: 0.5,
      Confidence: 0.4,
    },
    GradeLevel: '6-12',
  },

  gifted_learner: {
    StudentId: 'astronaut_gifted',
    PersonaName: '⭐ Gifted Learner',
    Overlays: [],
    NarrativeTags: ['advanced', 'curious', 'independent', 'creative'],
    ProfileTraits: {
      ReadingLevel: 0.95,
      MathFluency: 0.9,
      AttentionSpan: 0.95,
      Confidence: 0.9,
    },
    GradeLevel: '6-12',
  },

  // Accessibility profiles
  dyslexic: {
    StudentId: 'astronaut_dyslexic',
    PersonaName: '📖 Dyslexic Learner',
    Overlays: ['dyslexic'],
    NarrativeTags: ['visual-spatial', 'creative', 'big-picture-thinker', 'verbal'],
    ProfileTraits: {
      ReadingLevel: 0.45,
      MathFluency: 0.7,
      AttentionSpan: 0.65,
      Confidence: 0.55,
    },
    GradeLevel: '6-12',
    IsAccessibilityProfile: true,
  },

  adhd: {
    StudentId: 'astronaut_adhd',
    PersonaName: '⚡ ADHD Learner',
    Overlays: ['adhd'],
    NarrativeTags: ['creative', 'hyperfocus-capable', 'energetic', 'big-picture-thinker'],
    ProfileTraits: {
      ReadingLevel: 0.65,
      MathFluency: 0.6,
      AttentionSpan: 0.4,
      Confidence: 0.65,
    },
    GradeLevel: '6-12',
    IsAccessibilityProfile: true,
  },

  fatigue_sensitive: {
    StudentId: 'astronaut_fatigue_sensitive',
    PersonaName: '😴 Fatigue-Sensitive Learner',
    Overlays: ['fatigue_sensitive'],
    NarrativeTags: ['needs-breaks', 'energy-conscious', 'paced', 'strategic'],
    ProfileTraits: {
      ReadingLevel: 0.7,
      MathFluency: 0.7,
      AttentionSpan: 0.5,
      Confidence: 0.7,
    },
    GradeLevel: '6-12',
    IsAccessibilityProfile: true,
  },

  anxiety_prone: {
    StudentId: 'astronaut_anxiety',
    PersonaName: '😰 Anxiety-Prone Learner',
    Overlays: ['anxiety_prone'],
    NarrativeTags: ['perfectionist', 'cautious', 'thoughtful', 'thorough'],
    ProfileTraits: {
      ReadingLevel: 0.75,
      MathFluency: 0.65,
      AttentionSpan: 0.8,
      Confidence: 0.4,
    },
    GradeLevel: '6-12',
    IsAccessibilityProfile: true,
  },

  esl_learner: {
    StudentId: 'astronaut_esl',
    PersonaName: '🌍 ESL Learner',
    Overlays: ['esl'],
    NarrativeTags: ['multilingual', 'translating-concepts', 'cultural-bridge', 'determined'],
    ProfileTraits: {
      ReadingLevel: 0.5,
      MathFluency: 0.7,
      AttentionSpan: 0.75,
      Confidence: 0.55,
    },
    GradeLevel: '6-12',
    IsAccessibilityProfile: true,
  },
};

/**
 * Get all predefined Astronauts
 */
export function getAllAstronauts(): Astronaut[] {
  return Object.values(PREDEFINED_ASTRONAUTS);
}

/**
 * Get Astronauts by filter (e.g., only accessibility profiles, or specific tag)
 */
export function filterAstronauts(predicate: (a: Astronaut) => boolean): Astronaut[] {
  return getAllAstronauts().filter(predicate);
}

/**
 * Get accessibility profile Astronauts only
 */
export function getAccessibilityProfileAstronauts(): Astronaut[] {
  return filterAstronauts(a => a.IsAccessibilityProfile === true);
}

/**
 * Get standard learner personas only (non-accessibility)
 */
export function getStandardLearnerAstronauts(): Astronaut[] {
  return filterAstronauts(a => a.IsAccessibilityProfile !== true);
}

/**
 * Create a custom Astronaut from user input
 */
export function createCustomAstronaut(
  studentId: string,
  personaName: string,
  traits: {
    readingLevel: number;
    mathFluency: number;
    attentionSpan: number;
    confidence: number;
  },
  options?: {
    overlays?: string[];
    narrativeTags?: string[];
    gradeLevel?: string;
  },
): Astronaut {
  return {
    StudentId: studentId,
    PersonaName: personaName,
    Overlays: options?.overlays || [],
    NarrativeTags: options?.narrativeTags || [],
    ProfileTraits: {
      ReadingLevel: Math.min(1, Math.max(0, traits.readingLevel)),
      MathFluency: Math.min(1, Math.max(0, traits.mathFluency)),
      AttentionSpan: Math.min(1, Math.max(0, traits.attentionSpan)),
      Confidence: Math.min(1, Math.max(0, traits.confidence)),
    },
    GradeLevel: options?.gradeLevel,
  };
}
