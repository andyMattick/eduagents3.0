import { useState, useEffect } from 'react';
//import './AssignmentIntentForm.css';
import { useUserFlow, GeneratedAssignment, GeneratedSection } from '../../hooks/useUserFlow';
import { SectionBuilder, CustomSection } from './SectionBuilder';
import { selectAppropriateFormat, validateProblemBloomAlignment, formatValidationReport } from '../../agents/analysis/bloomConstraints';

/**
 * Assignment Intent Form
 * Collects assignment specifications when creating from source documents
 * (Used when goal === "create" AND hasSourceDocs === true)
 */

// Helper function to convert AI-generated problems into assignment structure
function generateAssignmentPreviewFromAI(
  assignmentType: string,
  questionCount: number,
  estimatedTime: number,
  sectionStrategy: 'manual' | 'ai-generated',
  customSections: CustomSection[],
  topic: string,
  sourceFile: { name?: string; type?: string } | undefined,
  aiProblems: Array<{
    text: string;
    bloomLevel: string;
    questionType?: string;
    complexity?: number;
    novelty?: number;
    tipText?: string | null;
    hasTips?: boolean;
  }>,
  customTitle?: string
): GeneratedAssignment {
  const bloomDistribution: Record<string, number> = {
    'Remember': 0,
    'Understand': 0,
    'Apply': 0,
    'Analyze': 0,
    'Evaluate': 0,
    'Create': 0,
  };

  // Map bloom string to number
  const bloomStringToNumber = (bloomStr: string): 1 | 2 | 3 | 4 | 5 | 6 => {
    const bloomMap: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
      'Remember': 1,
      'Understand': 2,
      'Apply': 3,
      'Analyze': 4,
      'Evaluate': 5,
      'Create': 6,
    };
    return bloomMap[bloomStr] || 3;
  };

  // Map complexity score to complexity label
  const complexityToLabel = (score?: number): 'low' | 'medium' | 'high' => {
    if (!score && score !== 0) return 'medium';
    if (score < 0.33) return 'low';
    if (score < 0.67) return 'medium';
    return 'high';
  };

  // Map novelty score to novelty label
  const noveltyToLabel = (score?: number): 'low' | 'medium' | 'high' => {
    if (!score && score !== 0) return 'medium';
    if (score < 0.4) return 'low';
    if (score < 0.7) return 'medium';
    return 'high';
  };

  // Convert AI problems to question format
  const problems = aiProblems.slice(0, questionCount).map((problem, i) => {
    const bloomLevel = bloomStringToNumber(problem.bloomLevel);
    bloomDistribution[problem.bloomLevel] = (bloomDistribution[problem.bloomLevel] || 0) + 1;

    // Use actual question type from AI, or default format
    const questionFormatMap: Record<string, any> = {
      'multiple-choice': 'multiple-choice',
      'true-false': 'true-false',
      'short-answer': 'short-answer',
      'essay': 'free-response',
      'matching': 'fill-blank',
    };
    const questionFormat = (questionFormatMap[problem.questionType?.toLowerCase() || ''] ||
      (['multiple-choice', 'true-false', 'short-answer', 'free-response', 'fill-blank'] as const)[i % 5]) as any;

    const wordCount = problem.text.split(/\s+/).length;
    const complexityLabel = complexityToLabel(problem.complexity);

    return {
      id: `q${i + 1}`,
      sectionId: `section-${problem.questionType?.toLowerCase() || 'other'}`,
      problemText: problem.text,
      bloomLevel,
      questionFormat,
      tipText: problem.hasTips && problem.tipText ? problem.tipText : undefined,
      hasTip: !!(problem.hasTips && problem.tipText),
      problemType: complexityLabel,
      complexity: complexityLabel,
      novelty: noveltyToLabel(problem.novelty),
      estimatedTime: Math.round(3 + (problem.complexity || 0.5) * 7 + wordCount / 50),
      problemLength: wordCount,
      rawComplexity: problem.complexity,
      rawNovelty: problem.novelty,
      tags: [problem.bloomLevel, complexityLabel, questionFormat.replace('-', ' ')],
    } as any;
  });

  // Group problems by question type into sections
  const questionTypeMap = new Map<string, typeof problems>();
  const questionTypeOrder = ['multiple-choice', 'true-false', 'short-answer', 'matching', 'essay', 'free-response'];

  problems.forEach(problem => {
    const type = problem.questionFormat;
    if (!questionTypeMap.has(type)) {
      questionTypeMap.set(type, []);
    }
    questionTypeMap.get(type)!.push(problem);
  });

  // Create sections organized by question type
  const sections: GeneratedSection[] = Array.from(questionTypeMap.entries())
    .sort((a, b) => {
      const aIdx = questionTypeOrder.indexOf(a[0]);
      const bIdx = questionTypeOrder.indexOf(b[0]);
      return aIdx - bIdx;
    })
    .map(([type, typeProblems]) => ({
      sectionId: `section-${type}`,
      sectionName: `${type.replace('-', ' ').charAt(0).toUpperCase() + type.replace('-', ' ').slice(1)} Questions`,
      instructions: `Answer the following ${type.replace('-', ' ')} questions`,
      problemType: type,
      problems: typeProblems.map(p => ({ ...p, sectionId: `section-${type}` })) as any,
      includeTips: true,
    }));

  // Bloom distribution counts (no percentages - just raw counts)
  const totalQuestions = problems.length;

  const rawAssignment: GeneratedAssignment = {
    assignmentId: `assignment-${Date.now()}`,
    assignmentType,
    title: customTitle || `${assignmentType}: ${topic}`,
    topic,
    estimatedTime,
    questionCount: totalQuestions,
    assessmentType: 'formative',
    sourceFile: sourceFile ? { name: sourceFile.name, type: sourceFile.type } : undefined,
    sections,
    bloomDistribution,
    organizationMode: sectionStrategy,
    timestamp: new Date().toISOString(),
  };

  console.log('📦 generateAssignmentPreviewFromAI returning:', {
    title: rawAssignment.title,
    sections: rawAssignment.sections.length,
    problems: rawAssignment.sections.flatMap(s => s.problems).length,
  });
  return enrichAssignmentMetadata(rawAssignment);
}

// Helper function to generate mock assignment data based on form inputs
function generateAssignmentPreview(
  assignmentType: string,
  questionCount: number,
  estimatedTime: number,
  sectionStrategy: 'manual' | 'ai-generated',
  customSections: CustomSection[],
  topic: string = 'Course Material',
  sourceFile?: { name?: string; type?: string },
  customTitle?: string
): GeneratedAssignment {
  console.log('📦 generateAssignmentPreview called with:', {
    assignmentType,
    questionCount,
    estimatedTime,
    sectionStrategy,
    topic,
    customTitle,
    sourceFile
  });
  // Generate mock Bloom distribution
  const bloomDistribution: Record<string, number> = {
    'Remember': Math.ceil(questionCount * 0.20),
    'Understand': Math.ceil(questionCount * 0.25),
    'Apply': Math.ceil(questionCount * 0.25),
    'Analyze': Math.ceil(questionCount * 0.20),
    'Evaluate': Math.ceil(questionCount * 0.07),
    'Create': Math.floor(questionCount * 0.03),
  };

  let sections: GeneratedSection[] = [];

  // Helper function to map Bloom string to numeric level
  const bloomStringToNumber = (bloomStr: string): 1 | 2 | 3 | 4 | 5 | 6 => {
    const bloomMap: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
      'Remember': 1,
      'Understand': 2,
      'Apply': 3,
      'Analyze': 4,
      'Evaluate': 5,
      'Create': 6,
    };
    return bloomMap[bloomStr] || 3;
  };

  // Helper function to generate realistic problem text by Bloom level
  const generateProblemText = (bloomLevel: string, topicStr: string): string => {
    const templates: Record<string, string[]> = {
      'Remember': [
        `What is the definition of ${topicStr}?`,
        `Identify the main characteristics of ${topicStr}.`,
        `List the key facts about ${topicStr}.`,
        `Name the important elements in ${topicStr}.`,
        `What is the primary concept of ${topicStr}?`,
      ],
      'Understand': [
        `Explain what ${topicStr} means in your own words.`,
        `Describe how ${topicStr} relates to common knowledge.`,
        `Summarize the main ideas about ${topicStr}.`,
        `What is the significance of ${topicStr}?`,
        `How would you describe ${topicStr} to someone unfamiliar with it?`,
      ],
      'Apply': [
        `How would you apply ${topicStr} to solve a real-world problem?`,
        `Use the principles of ${topicStr} to analyze this scenario.`,
        `Demonstrate how ${topicStr} can be used in practice.`,
        `Apply your understanding of ${topicStr} to create a solution.`,
        `In what practical situations would ${topicStr} be applicable?`,
      ],
      'Analyze': [
        `Compare and contrast different aspects of ${topicStr}.`,
        `Break down ${topicStr} into its component parts.`,
        `Analyze the causes and effects related to ${topicStr}.`,
        `What patterns do you notice when examining ${topicStr}?`,
        `How do the elements of ${topicStr} relate to each other?`,
      ],
      'Evaluate': [
        `Evaluate the effectiveness of different approaches to ${topicStr}.`,
        `Judge the validity of claims about ${topicStr}.`,
        `Assess the strengths and weaknesses of ${topicStr}.`,
        `What is your informed opinion about ${topicStr}?`,
        `Critique the following approach to ${topicStr}.`,
      ],
      'Create': [
        `Design a new approach to ${topicStr}.`,
        `Compose an original solution that addresses ${topicStr}.`,
        `Create a unique perspective on ${topicStr}.`,
        `Develop a novel method for understanding ${topicStr}.`,
        `Synthesize your knowledge to propose new ideas about ${topicStr}.`,
      ]
    };
    const bloomTemplates = templates[bloomLevel] || templates['Remember'];
    return bloomTemplates[Math.floor(Math.random() * bloomTemplates.length)];
  };

  if (sectionStrategy === 'ai-generated') {
    // Generate single section with all questions
    const problems = Array.from({ length: questionCount }, (_, i) => {
      const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
      const currentBloomLevel = bloomLevels[i % 6];
      const problemText = generateProblemText(currentBloomLevel, topic);
      const bloomNum = bloomStringToNumber(currentBloomLevel);
      // Use constraint-aware format selection
      const preferredFormat = (['multiple-choice', 'true-false', 'short-answer', 'free-response', 'fill-blank'] as const)[i % 5];
      const approvedFormat = selectAppropriateFormat(currentBloomLevel as any, preferredFormat);
      
      return {
        id: `q${i + 1}`,
        sectionId: 'section-0',
        problemText,
        bloomLevel: bloomNum,
        questionFormat: approvedFormat as any,
        tipText: i % 3 === 0 ? `Consider the relationship between these concepts.` : undefined,
        hasTip: i % 3 === 0,
        problemType: (['procedural', 'conceptual', 'application'] as const)[i % 3] as any,
        complexity: 'medium' as const,
        novelty: 'medium' as const,
        estimatedTime: 5,
        problemLength: problemText.trim().split(/\s+/).length,
      };
    });

    // Validate Bloom-format alignment
    const bloomLevelNames = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
    const validationReport = validateProblemBloomAlignment(
      problems.map((p) => ({
        bloomLevel: bloomLevelNames[p.bloomLevel - 1] as any,
        questionFormat: p.questionFormat,
        problemText: p.problemText,
      }))
    );
    if (!validationReport.valid) {
      console.warn('🚨 Bloom Constraint Violations:\n' + formatValidationReport(validationReport));
    } else {
      console.log('✅ ' + formatValidationReport(validationReport));
    }

    sections = [
      {
        sectionId: 'section-0',
        sectionName: 'Assignment Questions',
        instructions: topic,
        problemType: 'ai-decide',
        problems,
        includeTips: true,
      },
    ];
  } else {
    // Generate sections from custom sections
    let questionIndex = 0;
    sections = customSections.map((section, sectionIdx) => {
      const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
      const sectionProblems = Array.from({ length: section.questionCount }, (_, i) => {
        const hasTip = section.includeTips;
        const currentBloomLevel = bloomLevels[i % 6];
        const bloomNum = bloomStringToNumber(currentBloomLevel);
        const problemText = generateProblemText(currentBloomLevel, section.problemType);
        // Use constraint-aware format selection
        const preferredFormat = (['multiple-choice', 'true-false', 'short-answer', 'free-response', 'fill-blank'] as const)[i % 5];
        const approvedFormat = selectAppropriateFormat(currentBloomLevel as any, preferredFormat);
        
        return {
          id: `q${questionIndex + i + 1}`,
          sectionId: `section-${sectionIdx}`,
          problemText,
          bloomLevel: bloomNum,
          questionFormat: approvedFormat as any,
          tipText: hasTip ? `Here's a helpful tip for this ${section.problemType} question.` : undefined,
          hasTip,
          problemType: section.problemType as any,
          complexity: 'medium' as const,
          novelty: 'medium' as const,
          estimatedTime: 5,
          problemLength: problemText.trim().split(/\s+/).length,
          tags: [currentBloomLevel, 'medium', approvedFormat.replace('-', ' ')],
        };
      });
      
      // Validate Bloom-format alignment for this section
      const bloomLevelNames = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
      const validationReport = validateProblemBloomAlignment(
        sectionProblems.map((p) => ({
          bloomLevel: bloomLevelNames[p.bloomLevel - 1] as any,
          questionFormat: p.questionFormat,
          problemText: p.problemText,
        }))
      );
      if (!validationReport.valid) {
        console.warn(`🚨 Section "${section.sectionName}" has Bloom violations:\n` + formatValidationReport(validationReport));
      }
      
      questionIndex += section.questionCount;
      return {
        sectionId: `section-${sectionIdx}`,
        sectionName: section.sectionName,
        instructions: section.topic,
        problemType: section.problemType,
        problems: sectionProblems,
        includeTips: section.includeTips,
      };
    });
  }

  const rawAssignment: GeneratedAssignment = {
    assignmentId: `assignment-${Date.now()}`,
    assignmentType,
    title: customTitle || `${assignmentType}: ${topic}`,
    topic,
    estimatedTime,
    questionCount,
    assessmentType: 'formative',
    sourceFile: sourceFile ? { name: sourceFile.name, type: sourceFile.type } : undefined,
    sections,
    bloomDistribution,
    organizationMode: sectionStrategy,
    timestamp: new Date().toISOString(),
  };

  console.log('📦 generateAssignmentPreview returning:', {
    title: rawAssignment.title,
    sections: rawAssignment.sections.length,
    problems: rawAssignment.sections.flatMap(s => s.problems).length,
  });
  // Enrich the assignment with detailed metadata (complexity, novelty, rubrics, etc.)
  return enrichAssignmentMetadata(rawAssignment);
}

export function AssignmentIntentForm() {
  const { setSourceAwareIntentData, setGeneratedAssignment, sourceFile, generatedAssignment } = useUserFlow();
  
  console.log('🟢 AssignmentIntentForm rendered', {
    hasSourceFile: !!sourceFile,
    hasGeneratedAssignment: !!generatedAssignment,
  });

  const [formData, setFormData] = useState({
    assignmentType: 'Quiz' as 'Test' | 'Quiz' | 'Warm-up' | 'Exit Ticket' | 'Practice Set' | 'Project' | 'Other',
    otherAssignmentType: '',
    estimatedTime: 30,
    customQuestionCount: null as number | null, // null = use auto-calculated
    customAssessmentType: null as 'formative' | 'summative' | null, // null = use auto-calculated
    sectionStrategy: 'ai-generated' as 'manual' | 'ai-generated',
    customSections: [] as CustomSection[],
    optionalFeedback: '',
    assignmentTitle: '', // Custom title (optional)
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  // Watch for assignment generation and show success state
  useEffect(() => {
    console.log('AssignmentIntentForm: useEffect triggered', {
      generatedAssignment: !!generatedAssignment,
      isSubmitting,
    });
    if (generatedAssignment && isSubmitting) {
      console.log('✅ Assignment generated! Setting isGenerated to true');
      setIsSubmitting(false);
      setIsGenerated(true);
      // Scroll to top to show the "View Preview" message
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  }, [generatedAssignment, isSubmitting]);

  const assignmentTypes = ['Test', 'Quiz', 'Warm-up', 'Exit Ticket', 'Practice Set', 'Project', 'Other'] as const;

  // Auto-calculate settings based on assignment type and time
  const calculateAutoSettings = () => {
    const type = formData.assignmentType === 'Other' ? formData.otherAssignmentType : formData.assignmentType;
    const time = formData.estimatedTime;
    
    // Default: ~3 minutes per question
    let questionCount = formData.customQuestionCount !== null ? formData.customQuestionCount : Math.max(1, Math.round(time / 3));
    
    // Most types default to summative; only a few are formative
    // But allow override with customAssessmentType
    let assessmentType: 'formative' | 'summative' = formData.customAssessmentType !== null ? formData.customAssessmentType : 'summative';
    
    // Set defaults if not overridden
    if (formData.customAssessmentType === null) {
      switch (type) {
        case 'Quiz':
        case 'Warm-up':
        case 'Exit Ticket':
        case 'Practice Set':
          assessmentType = 'formative';
          break;
        default:
          assessmentType = 'summative';
          break;
      }
    }

    // Type-specific question count adjustments
    if (formData.customQuestionCount === null) {
      switch (type) {
        case 'Quiz':
          questionCount = Math.max(5, Math.min(20, questionCount));
          break;
        case 'Test':
          questionCount = Math.max(5, Math.min(30, questionCount));
          break;
        case 'Warm-up':
          questionCount = Math.min(5, questionCount);
          break;
        case 'Exit Ticket':
          questionCount = Math.min(3, questionCount);
          break;
        case 'Project':
          questionCount = 1;
          break;
        case 'Practice Set':
          questionCount = Math.max(10, questionCount);
          break;
      }
    }
    
    return { questionCount, assessmentType };
  };

  const { questionCount, assessmentType } = calculateAutoSettings();

  const handleAssignmentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      assignmentType: e.target.value as typeof formData.assignmentType,
    });
  };

  const handleOtherTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      otherAssignmentType: e.target.value,
    });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim();
    
    // Allow empty input (user still typing)
    if (value === '') {
      setFormData({ ...formData, estimatedTime: 0 });
      return;
    }
    
    // Parse as integer
    const numValue = parseInt(value, 10);
    
    // Only update if it's a valid number
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(5, Math.min(480, numValue));
      setFormData({ ...formData, estimatedTime: clampedValue });
    }
  };

  const handleCustomQuestionCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || null;
    setFormData({ ...formData, customQuestionCount: value !== null && value > 0 ? value : null });
  };

  const handleAssessmentTypeToggle = (type: 'formative' | 'summative') => {
    setFormData({ 
      ...formData, 
      customAssessmentType: formData.customAssessmentType === type ? null : type 
    });
  };

  const handleSectionStrategyChange = (strategy: 'manual' | 'ai-generated') => {
    setFormData({
      ...formData,
      sectionStrategy: strategy,
    });
  };

  const handleCustomSectionsChange = (sections: CustomSection[]) => {
    setFormData({
      ...formData,
      customSections: sections,
    });
  };

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, optionalFeedback: e.target.value });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, assignmentTitle: e.target.value });
  };

  const handleSubmit = async () => {
    console.log('🔵 handleSubmit called');
    const newErrors: string[] = [];

    if (formData.assignmentType === 'Other' && !formData.otherAssignmentType.trim()) {
      newErrors.push("Please specify what type of assignment this is");
    }

    if (!formData.estimatedTime || formData.estimatedTime < 5) {
      newErrors.push("Please enter an estimated time (at least 5 minutes)");
    }

    if (newErrors.length > 0) {
      console.log('❌ Form errors:', newErrors);
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);
    console.log('⏳ isSubmitting set to true');

    try {
      const { questionCount: autoQuestionCount, assessmentType: autoAssessmentType } = calculateAutoSettings();
      const finalQuestionCount = formData.customQuestionCount !== null ? formData.customQuestionCount : autoQuestionCount;
      const finalAssessmentType = formData.customAssessmentType !== null ? formData.customAssessmentType : autoAssessmentType;
      
      const intentData = {
        assignmentType: formData.assignmentType === 'Other' ? formData.otherAssignmentType : formData.assignmentType,
        questionCount: finalQuestionCount,
        estimatedTime: formData.estimatedTime,
        assessmentType: finalAssessmentType,
        sectionStrategy: formData.sectionStrategy,
        ...(formData.sectionStrategy === 'manual' && formData.customSections.length > 0 && {
          customSections: formData.customSections,
        }),
        ...(formData.optionalFeedback && {
          skillsAndStandards: formData.optionalFeedback
            .split('\n')
            .map(s => s.trim())
            .filter(s => s),
        }),
      };

      console.log('📝 Setting sourceAwareIntentData (auto-configured):', intentData);
      setSourceAwareIntentData(intentData);

      // Read source file content if available
      let sourceText: string | undefined;
      if (sourceFile) {
        console.log('📄 Reading source file:', sourceFile.name);
        try {
          sourceText = await sourceFile.text();
          console.log(`📄 Source file read successfully (${sourceText.length} chars)`);
        } catch (readError) {
          console.warn('⚠️ Failed to read source file:', readError);
        }
      }

      // Try to generate real assignment with AI if enabled
      let generatedAssignment;
      
      // DEBUG: Check if real AI is enabled
      
      if (isRealAI) {
        console.log('🤖 Using Gemini API to generate questions...');
        try {
          const writer = getWriterService();
          console.log('🔍 DEBUG: writer service =', writer);
          const topic = sourceFile?.name || 'Course Material';
          
          const response = await (writer as any).generate(
            topic,
            { Apply: 0.3, Analyze: 0.2, Create: 0.2, Understand: 0.2, Remember: 0.1 }, // Bloom goals
            finalQuestionCount,
            sourceText // Pass the source material content!
          );

          console.log('✅ Gemini API generated problems:', response);

          // Convert AI response to GeneratedSection format
          generatedAssignment = generateAssignmentPreviewFromAI(
            intentData.assignmentType,
            finalQuestionCount,
            formData.estimatedTime,
            formData.sectionStrategy,
            formData.customSections,
            topic,
            sourceFile ? { name: sourceFile.name, type: sourceFile.type } : undefined,
            response.problems,
            formData.assignmentTitle
          );
        } catch (aiError) {
          console.error('❌ Gemini API generation FAILED:', aiError);
          console.error('Full error:', aiError);
          generatedAssignment = generateAssignmentPreview(
            intentData.assignmentType,
            finalQuestionCount,
            formData.estimatedTime,
            formData.sectionStrategy,
            formData.customSections,
            sourceFile?.name || 'Course Material',
            sourceFile ? { name: sourceFile.name, type: sourceFile.type } : undefined,
            formData.assignmentTitle
          );
        }
      } else {
        console.log('✨ Generating with Gemini API');
        // Use mock generation
        generatedAssignment = generateAssignmentPreview(
          intentData.assignmentType,
          finalQuestionCount,
          formData.estimatedTime,
          formData.sectionStrategy,
          formData.customSections,
          sourceFile?.name || 'Course Material',
          sourceFile ? { name: sourceFile.name, type: sourceFile.type } : undefined,
          formData.assignmentTitle
        );
      }

      console.log('📋 Generated assignment:', generatedAssignment);
      console.log('🚀 Calling setGeneratedAssignment with:', {
        title: generatedAssignment?.title,
        sections: generatedAssignment?.sections.length,
        problems: generatedAssignment?.sections?.flatMap(s => s.problems).length
      });
      setGeneratedAssignment(generatedAssignment);
      console.log('✅ setGeneratedAssignment called successfully');
      
      // Show brief success toast
      if (window.top === window) {
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: #28a745;
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
          font-weight: 600;
        `;
        successMsg.textContent = '✅ Assignment generated successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      }
      
      // Scroll to show preview
      setTimeout(() => {
        const previewElement = document.querySelector('.assignment-preview');
        if (previewElement) {
          previewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="assignment-intent-form">
      {/* Loading Overlay */}
      {isSubmitting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333333',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '1rem',
              animation: 'spin 2s linear infinite',
            }}>⏳</div>
            <div style={{ fontSize: '14px', color: '#aaaaaa' }}>
              This may take a moment. Please don't close the page.
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      <div className="form-container">
        {/* Header */}
        <div className="form-header">
          <h1>📋 What Kind of Assignment?</h1>
          <p>Just tell us the type and how long it should take. We'll handle the rest.</p>
          {sourceFile && <p className="source-hint">Using: <strong>{sourceFile.name}</strong></p>}
        </div>

        <div className="form-content">
          {/* Assignment Type - REQUIRED */}
          <div className="form-field">
            <label htmlFor="assignmentType">
              <span className="label-text">Assignment Type</span>
              <span className="required">*</span>
            </label>
            <select
              id="assignmentType"
              value={formData.assignmentType}
              onChange={handleAssignmentTypeChange}
              className="select-input"
            >
              {assignmentTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {formData.assignmentType === 'Other' && (
              <input
                type="text"
                value={formData.otherAssignmentType}
                onChange={handleOtherTypeChange}
                placeholder="What kind of assignment are you envisioning?"
                className="text-input"
              />
            )}
          </div>

          {/* Assignment Title - OPTIONAL */}
          <div className="form-field">
            <label htmlFor="assignmentTitle">
              <span className="label-text">Title (optional - leave blank for auto-generated)</span>
            </label>
            <input
              id="assignmentTitle"
              type="text"
              value={formData.assignmentTitle}
              onChange={handleTitleChange}
              placeholder={`e.g., "Chapter 5: The Renaissance Assessment"`}
              className="text-input"
            />
          </div>

          {/* Estimated Time - REQUIRED */}
          <div className="form-field">
            <label htmlFor="estimatedTime">
              <span className="label-text">Estimated Time</span>
              <span className="required">*</span>
            </label>
            <div className="input-with-unit">
              <input
                id="estimatedTime"
                type="text"
                inputMode="numeric"
                min="5"
                max="480"
                value={formData.estimatedTime || ''}
                onChange={handleTimeChange}
                className="number-input"
                placeholder="30"
              />
              <span className="unit-label">minutes</span>
            </div>
            <p className="helper-text">
              💡 With {formData.estimatedTime} minutes, we'll generate approximately <strong>{questionCount} questions</strong> ({assessmentType === 'summative' ? 'summative test' : 'formative assessment'})
            </p>
          </div>

          {/* Optional: Custom Question Count */}
          <div className="form-field">
            <label htmlFor="customQuestionCount">
              <span className="label-text">Optional: Override number of questions</span>
            </label>
            <div className="input-with-unit">
              <input
                id="customQuestionCount"
                type="number"
                min="1"
                max="100"
                placeholder={`Default: ${questionCount}`}
                value={formData.customQuestionCount !== null ? formData.customQuestionCount : ''}
                onChange={handleCustomQuestionCountChange}
                className="number-input"
              />
              <span className="unit-label">questions</span>
            </div>
            <p className="helper-text">
              Leave empty for AI-optimized defaults. The AI will organize questions into different problem types and difficulty levels to best match your students' learning needs.
            </p>
          </div>

          {/* Optional: Assessment Type Toggle */}
          <div className="form-field">
            <label>
              <span className="label-text">Optional: Assessment type</span>
            </label>
            <div className="section-strategy-options">
              <button
                type="button"
                className={`strategy-option ${formData.customAssessmentType === 'formative' ? 'selected' : ''}`}
                onClick={() => handleAssessmentTypeToggle('formative')}
              >
                <div className="strategy-icon">📝</div>
                <div className="strategy-content">
                  <strong>Formative</strong>
                  <p>Checking for understanding</p>
                </div>
              </button>
              <button
                type="button"
                className={`strategy-option ${formData.customAssessmentType === 'summative' ? 'selected' : ''}`}
                onClick={() => handleAssessmentTypeToggle('summative')}
              >
                <div className="strategy-icon">✅</div>
                <div className="strategy-content">
                  <strong>Summative</strong>
                  <p>Assessing mastery</p>
                </div>
              </button>
            </div>
            <p className="helper-text">
              Leave unselected to use defaults based on assignment type. Currently set to: <strong>{assessmentType}</strong>
            </p>
          </div>

          {/* Optional: Section Organization */}
          <div className="form-field">
            <label>
              <span className="label-text">Optional: Organize into sections</span>
            </label>
            <div className="section-strategy-options">
              <button
                type="button"
                className={`strategy-option ${formData.sectionStrategy === 'ai-generated' ? 'selected' : ''}`}
                onClick={() => handleSectionStrategyChange('ai-generated')}
              >
                <div className="strategy-icon">🤖</div>
                <div className="strategy-content">
                  <strong>AI Organizes Sections</strong>
                  <p>AI decides problem types and distribution</p>
                </div>
              </button>
              <button
                type="button"
                className={`strategy-option ${formData.sectionStrategy === 'manual' ? 'selected' : ''}`}
                onClick={() => handleSectionStrategyChange('manual')}
              >
                <div className="strategy-icon">✏️</div>
                <div className="strategy-content">
                  <strong>I'll Organize Sections</strong>
                  <p>Specify problem types and questions per section</p>
                </div>
              </button>
            </div>
          </div>

          {/* Section Builder - Shows when "I'll Organize Sections" is selected */}
          {formData.sectionStrategy === 'manual' && (
            <SectionBuilder
              onSectionsChange={handleCustomSectionsChange}
              availableTopics={[]}
            />
          )}

          {/* Optional Feedback/Notes */}
          <div className="form-field">
            <label htmlFor="optionalFeedback">
              <span className="label-text">Optional: Any specific preferences or constraints?</span>
            </label>
            <textarea
              id="optionalFeedback"
              value={formData.optionalFeedback}
              onChange={handleFeedbackChange}
              placeholder="Optional: Add any specific skills, standards, learning objectives, or other preferences (one per line)"
              rows={3}
              className="textarea-input"
            />
            <p className="helper-text">Leave empty for AI-optimized defaults. Without feedback, the AI will create a balanced mix of question types and difficulty levels to support diverse learners.</p>
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <div className="error-list">
                {errors.map((error, idx) => (
                  <p key={idx}>{error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {isGenerated && (
            <div className="success-container">
              <div className="success-icon">✅</div>
              <div className="success-message">
                <p><strong>Assignment generated successfully!</strong></p>
                <p>Your {formData.assignmentType} is ready with {formData.customQuestionCount !== null ? formData.customQuestionCount : questionCount} {(formData.customQuestionCount !== null ? formData.customQuestionCount : questionCount) === 1 ? 'question' : 'questions'} ({assessmentType}).</p>
              </div>
            </div>
          )}

          {/* Generated Assignment Preview - Shows all questions with tags */}
          {isGenerated && generatedAssignment && (
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                📋 Generated Questions Preview ({generatedAssignment.questionCount} total)
              </h3>
              
              {/* Bloom Distribution Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.8rem',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
              }}>
                {Object.entries(generatedAssignment.bloomDistribution).map(([level, count]) => (
                  <div key={level} style={{
                    padding: '0.6rem',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    textAlign: 'center',
                    color: 'var(--color-text-primary)',
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{count}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{level}</div>
                  </div>
                ))}
              </div>

              {/* Problems by Section */}
              {generatedAssignment.sections.map((section, sIdx) => (
                <div key={sIdx} style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{
                    margin: '0 0 0.8rem 0',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    {section.sectionName} ({section.problems.length} problems)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {section.problems.map((problem, pIdx) => (
                      <div key={pIdx} style={{
                        padding: '0.8rem',
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        color: 'var(--color-text-primary)',
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <span>Q{section.problems.length > 1 ? `${sIdx + 1}.${pIdx + 1}` : pIdx + 1}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            Level {problem.bloomLevel} • {problem.questionFormat.replace('-', ' ')}
                          </span>
                        </div>
                        <p style={{ margin: '0.3rem 0', lineHeight: '1.4' }}>
                          {problem.problemText.substring(0, 120)}
                          {problem.problemText.length > 120 ? '...' : ''}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                          {problem.complexity && (
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.4rem',
                              background: 'rgba(0,0,0,0.1)',
                              borderRadius: '3px',
                            }}>
                              Complexity: {typeof problem.complexity === 'string' ? problem.complexity : (problem.complexity || 0).toFixed(2)}
                            </span>
                          )}
                          {problem.novelty && (
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.4rem',
                              background: 'rgba(0,0,0,0.1)',
                              borderRadius: '3px',
                            }}>
                              Novelty: {typeof problem.novelty === 'string' ? problem.novelty : (problem.novelty || 0).toFixed(2)}
                            </span>
                          )}
                          {problem.hasTip && (
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.4rem',
                              background: 'rgba(255, 193, 7, 0.2)',
                              borderRadius: '3px',
                              color: 'var(--color-text-primary)',
                            }}>
                              💡 Has tip
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="form-actions">
            <button 
              className="button-secondary" 
              onClick={() => window.history.back()}
              disabled={isSubmitting}
            >
              ← Back
            </button>
            {!isGenerated ? (
              <button 
                className="button-primary" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ 🤖 Generating with Gemini API...' : 'Generate Assignment →'}
              </button>
            ) : (
              <button 
                className="button-primary" 
                onClick={() => {
                  // State has been updated, router will automatically show preview on next render
                  // Trigger a small visual feedback by scrolling to top
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                View Preview & Analyze →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Debug output */}
      {isGenerated && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          padding: '1.5rem',
          backgroundColor: '#4caf50',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '16px',
          fontWeight: '600',
          zIndex: 1000,
          animation: 'slideIn 0.4s ease-out',
          maxWidth: '300px',
        }}>
          <div style={{ marginBottom: '0.5rem' }}>✅ Assignment Generated!</div>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '1rem' }}>
            {generatedAssignment?.title}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {generatedAssignment?.sections.length || 0} sections • {generatedAssignment?.sections?.flatMap(s => s.problems).length || 0} questions
          </div>
        </div>
      )}

      {/* Add keyframe animation to document */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
