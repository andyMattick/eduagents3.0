/**
 * Student Profile Generation Logic
 * 
 * Generates StudentProfile objects with realistic trait distributions
 * based on Bloom comfort levels, accessibility overlays, and narrative tags
 */

import {
  StudentProfile,
  BloomComfortProfile,
  StudentTraits,
  STANDARD_BLOOM_DISTRIBUTION,
  BLOOM_LEVELS,
  ACCESSIBILITY_OVERLAYS,
  NARRATIVE_TAGS,
  BloomLevelType,
} from '../../types/classroomProfiles';

/**
 * Generate a normal distribution value centered around a mean
 * @param mean Center of the distribution (0.0–1.0)
 * @param stdDev Standard deviation (default 0.15)
 * @returns Number between 0.0 and 1.0
 */
function gaussianRandom(mean = 0.65, stdDev = 0.15): number {
  let u1 = Math.random();
  let u2 = Math.random();
  
  // Box-Muller transform
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mean + z0 * stdDev;
  
  // Clamp to 0.0–1.0
  return Math.max(0.0, Math.min(1.0, value));
}

/**
 * Generate a Bloom comfort profile for a single student
 * given their Bloom ceiling level
 * 
 * @param bloomLevel Student's Bloom ceiling (1–6)
 * @returns BloomComfortProfile with appropriate confidence levels
 */
function generateBloomComfortProfile(bloomLevel: number): BloomComfortProfile {
  const profile: BloomComfortProfile = {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  };

  // For levels <= ceiling: high confidence (0.75–0.95)
  // For levels > ceiling: low confidence (0.1–0.4)
  const highRange = [0.75, 0.95];
  const lowRange = [0.1, 0.4];

  for (let i = 1; i <= 6; i++) {
    const level = BLOOM_LEVELS[i - 1] as BloomLevelType;
    
    if (i <= bloomLevel) {
      // Comfortable with this level
      profile[level] = highRange[0] + Math.random() * (highRange[1] - highRange[0]);
    } else {
      // Struggling with this level
      profile[level] = lowRange[0] + Math.random() * (lowRange[1] - lowRange[0]);
    }
  }

  return profile;
}

/**
 * Generate student traits with normal distribution
 * @returns StudentTraits with realistic values
 */
function generateStudentTraits(): StudentTraits {
  return {
    ReadingLevel: gaussianRandom(0.65, 0.15),
    MathFluency: gaussianRandom(0.60, 0.2),
    CreativityAffinity: gaussianRandom(0.55, 0.25),
    ThemeAffinity: gaussianRandom(0.60, 0.2),
  };
}

/**
 * Select random overlays for a student (0–2 overlays)
 * @returns Array of accessibility overlays
 */
function selectRandomOverlays(): string[] {
  const overlayCount = Math.floor(Math.random() * 3); // 0, 1, or 2
  const selectedOverlays: string[] = [];

  for (let i = 0; i < overlayCount; i++) {
    const randomOverlay = ACCESSIBILITY_OVERLAYS[
      Math.floor(Math.random() * ACCESSIBILITY_OVERLAYS.length)
    ];
    
    // Avoid duplicates
    if (!selectedOverlays.includes(randomOverlay)) {
      selectedOverlays.push(randomOverlay);
    }
  }

  return selectedOverlays;
}

/**
 * Select random narrative tags (optional flavor descriptors)
 * @returns Array of narrative tags (0–3 tags)
 */
function selectRandomNarrativeTags(): string[] {
  const tagCount = Math.floor(Math.random() * 4); // 0–3 tags
  const selectedTags: string[] = [];

  for (let i = 0; i < tagCount; i++) {
    const randomTag = NARRATIVE_TAGS[
      Math.floor(Math.random() * NARRATIVE_TAGS.length)
    ];
    
    // Avoid duplicates
    if (!selectedTags.includes(randomTag)) {
      selectedTags.push(randomTag);
    }
  }

  return selectedTags;
}

/**
 * Generate a single student profile with given ID and Bloom level
 * @param studentId Unique identifier for the student
 * @param bloomLevel Bloom comfort ceiling (1–6)
 * @returns Complete StudentProfile object
 */
export function generateStudentProfile(
  studentId: string,
  bloomLevel: number
): StudentProfile {
  return {
    StudentId: studentId,
    BloomComfortProfile: generateBloomComfortProfile(bloomLevel),
    Traits: generateStudentTraits(),
    Overlays: selectRandomOverlays(),
    NarrativeTags: selectRandomNarrativeTags(),
  };
}

/**
 * Generate a full classroom of students using the standard distribution
 * @returns Array of StudentProfile objects following STANDARD_BLOOM_DISTRIBUTION
 */
export function generateClassroom(): StudentProfile[] {
  const students: StudentProfile[] = [];
  let studentId = 1;

  // Iterate through Bloom levels (1–6)
  for (let bloomLevel = 1; bloomLevel <= 6; bloomLevel++) {
    const count = STANDARD_BLOOM_DISTRIBUTION[bloomLevel as keyof typeof STANDARD_BLOOM_DISTRIBUTION];
    
    // Generate `count` students for this Bloom level
    for (let i = 0; i < count; i++) {
      const profile = generateStudentProfile(
        `student_${studentId}`,
        bloomLevel
      );
      students.push(profile);
      studentId++;
    }
  }

  return students;
}

/**
 * Generate a custom classroom with specified total count
 * Distributes students evenly across Bloom levels
 * @param totalStudents Total number of students to generate
 * @returns Array of StudentProfile objects
 */
export function generateCustomClassroom(totalStudents: number): StudentProfile[] {
  const students: StudentProfile[] = [];
  
  for (let i = 1; i <= totalStudents; i++) {
    // Distribute students evenly across Bloom levels 1–6
    const bloomLevel = ((i - 1) % 6) + 1;
    
    const profile = generateStudentProfile(`student_${i}`, bloomLevel);
    students.push(profile);
  }

  return students;
}
