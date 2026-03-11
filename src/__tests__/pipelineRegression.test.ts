import { describe, it, expect } from 'vitest';
import {
  normalizeItem,
  normalizeItems,
  getPrompt,
  getAnswer,
  getOptions,
  getPassage,
} from '@/pipeline/utils/itemNormalizer';

describe('pipeline regression hardening', () => {
  it('normalizes legacy item fields in non-strict mode', () => {
    const normalized = normalizeItem({
      slotId: 's1',
      questionType: 'multipleChoice',
      problemText: 'What is 2 + 2?',
      correctAnswer: 'B. 4',
      options: ['A. 3', 'B. 4', 'C. 5', 'D. 6'],
    });

    expect(normalized.prompt).toBe('What is 2 + 2?');
    expect(normalized.answer).toBe('B. 4');
    expect(Array.isArray(normalized.options)).toBe(true);
    expect(normalized.metadata).toBeTruthy();
  });

  it('throws in strict mode when legacy fields are present', () => {
    expect(() =>
      normalizeItem(
        {
          slotId: 's1',
          questionType: 'shortAnswer',
          problemText: 'Legacy shape',
        },
        { strict: true }
      )
    ).toThrow(/legacy fields/i);
  });

  it('throws in strict mode when MCQ answer does not match options', () => {
    expect(() =>
      normalizeItem(
        {
          slotId: 's2',
          questionType: 'multipleChoice',
          prompt: 'Pick one',
          answer: 'B. 2',
          options: ['A. 1', 'B. two', 'C. 3', 'D. 4'],
          metadata: {},
        },
        { strict: true }
      )
    ).toThrow(/must exactly match one options entry/i);
  });

  it('accessors prefer metadata and never require flat fields', () => {
    const item = {
      slotId: 's3',
      questionType: 'passageBased',
      metadata: {
        prompt: 'Metadata prompt',
        answer: 'Metadata answer',
        options: ['A. x', 'B. y'],
        passage: 'Metadata passage',
      },
    };

    expect(getPrompt(item)).toBe('Metadata prompt');
    expect(getAnswer(item)).toBe('Metadata answer');
    expect(getOptions(item)).toEqual(['A. x', 'B. y']);
    expect(getPassage(item)).toBe('Metadata passage');
  });

  it('supports mixed-generation batch normalization', () => {
    const items = normalizeItems([
      {
        slotId: 'template_slot_1',
        questionType: 'multipleChoice',
        prompt: 'Template item',
        answer: 'A. yes',
        options: ['A. yes', 'B. no', 'C. maybe', 'D. none'],
        metadata: { generationMethod: 'template' },
      },
      {
        slotId: 'diagram_slot_1',
        questionType: 'graphInterpretation',
        problemText: 'Interpret this graph',
        correctAnswer: 'Increasing trend',
        metadata: { generationMethod: 'diagram', diagramType: 'line_graph' },
      },
      {
        slotId: 'image_slot_1',
        questionType: 'shortAnswer',
        prompt: 'Describe the image',
        answer: 'An ecosystem',
        metadata: { generationMethod: 'image', imageReferenceId: 'img_1' },
      },
      {
        slotId: 'llm_slot_1',
        questionType: 'constructedResponse',
        prompt: 'Explain your reasoning',
        answer: 'Step-by-step analysis',
        metadata: { generationMethod: 'llm' },
      },
    ]);

    expect(items).toHaveLength(4);
    expect(items[1].prompt).toBe('Interpret this graph');
    expect(items[1].answer).toBe('Increasing trend');
    expect(items.every((it) => !!it.metadata)).toBe(true);
  });
});
