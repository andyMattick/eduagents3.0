import type { TemplateOutput, WriterTemplateSlot } from "../types";

export function generateMCQ(slot: WriterTemplateSlot): TemplateOutput {
  const domain = String(slot.domain ?? "general").toLowerCase();
  const taskType = String(slot.metadata?.taskType ?? "concept");
  const grade = String(slot.grade ?? "current grade band");
  const topic = String(slot.topic ?? "the topic");
  const micro = String(slot.sharedContext ?? "a focused detail");

  switch (domain) {
    case "ela":
      return mcqELA(taskType, topic, micro, grade);
    case "history":
      return mcqHistory(taskType, topic, micro, grade);
    case "science":
      return mcqScience(taskType, topic, micro, grade);
    case "math":
      return mcqMath(taskType, topic, micro, grade);
    case "stem":
      return mcqSTEM(taskType, topic, micro, grade);
    default:
      return mcqGeneral(taskType, topic, micro, grade);
  }
}

/* ---------------- ELA ---------------- */

function mcqELA(taskType: string, topic: string, micro: string, grade: string): TemplateOutput {
  return {
    prompt: `Write a grade-${grade} ${taskType} multiple-choice question about ${micro} in ${topic}. Include one correct answer and three distractors.`,
    answer: null,
    options: null,
    metadata: {
      generationMethod: "template",
      templateId: "mcq-ela",
      questionType: "mcq"
    }
  };
}

/* ---------------- HISTORY ---------------- */

function mcqHistory(taskType: string, topic: string, micro: string, grade: string): TemplateOutput {
  return {
    prompt: `Write a grade-${grade} ${taskType} multiple-choice question about ${topic}, using the document or detail: ${micro}. Include one correct answer and three distractors.`,
    answer: null,
    options: null,
    metadata: {
      generationMethod: "template",
      templateId: "mcq-history",
      questionType: "mcq"
    }
  };
}

/* ---------------- SCIENCE ---------------- */

function mcqScience(taskType: string, topic: string, micro: string, grade: string): TemplateOutput {
  return {
    prompt: `Write a grade-${grade} ${taskType} multiple-choice question about the phenomenon: ${topic}, using the data: ${micro}. Include one correct answer and three distractors.`,
    answer: null,
    options: null,
    metadata: {
      generationMethod: "template",
      templateId: "mcq-science",
      questionType: "mcq"
    }
  };
}

/* ---------------- MATH ---------------- */

function mcqMath(taskType: string, topic: string, micro: string, grade: string): TemplateOutput {
  return {
    prompt: `Write a grade-${grade} ${taskType} multiple-choice question assessing the skill: ${topic}, aligned to ${micro}. Include one correct answer and three distractors.`,
    answer: null,
    options: null,
    metadata: {
      generationMethod: "template",
      templateId: "mcq-math",
      questionType: "mcq"
    }
  };
}

/* ---------------- STEM ---------------- */

function mcqSTEM(taskType: string, topic: string, micro: string, grade: string): TemplateOutput {
  return {
    prompt: `Write a grade-${grade} ${taskType} multiple-choice question about the subsystem: ${topic}, focusing on the function or behavior: ${micro}. Include one correct answer and three distractors.`,
    answer: null,
    options: null,
    metadata: {
      generationMethod: "template",
      templateId: "mcq-stem",
      questionType: "mcq"
    }
  };
}

/* ---------------- GENERAL ---------------- */

function mcqGeneral(taskType: string, topic: string, micro: string, grade: string): TemplateOutput {
  return {
    prompt: `Write a grade-${grade} ${taskType} multiple-choice question about the scenario: ${topic}, using the detail: ${micro}. Include one correct answer and three distractors.`,
    answer: null,
    options: null,
    metadata: {
      generationMethod: "template",
      templateId: "mcq-general",
      questionType: "mcq"
    }
  };
}
