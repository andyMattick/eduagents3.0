import React, { useState } from 'react';
import {
  AssignmentMetadata,
  AssignmentType,
  GradeLevel,
  DifficultyLevel,
} from '../../agents/shared/assignmentMetadata';
import { generateAssignment } from '../../agents/shared/generateAssignment';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph } from 'docx';

interface PromptBuilderProps {
  onAssignmentGenerated: (content: string, metadata: AssignmentMetadata) => void;
  isLoading?: boolean;
}

interface AssignmentPart {
  id: string;
  title: string;
  instructions: string;
  includesFormula: boolean;
  formula?: string;
  includesTable: boolean;
  tableData?: Array<{ outcome: string; probability: string; payout: string }>;
}

interface RubricCriterion {
  id: string;
  name: string;
  points: number;
}

interface AssessmentQuestion {
  id: string;
  bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  text: string;
}

const COMMON_SUBJECTS = [
  'Mathematics',
  'Science',
  'English Language Arts',
  'History',
  'Social Studies',
  'Biology',
  'Chemistry',
  'Physics',
  'Statistics',
  'Algebra',
];

const COMMON_OBJECTIVES = [
  'Critical Thinking',
  'Data Analysis',
  'Probability & Statistics',
  'Communication',
  'Research Skills',
  'Mathematical Modeling',
  'Problem Solving',
  'Collaboration',
  'Creativity',
  'Technical Skills',
];

const COMMON_CRITERIA = [
  'Clarity',
  'Accuracy',
  'Creativity',
  'Use of Data',
  'Organization',
  'Technical Execution',
  'Communication',
  'Depth of Analysis',
];

const GRADE_LEVELS_NUMERIC = [6, 7, 8, 9, 10, 11, 12];

const GRADE_BANDS = {
  'Elementary': [3, 4, 5],
  'Middle School': [6, 7, 8],
  'High School': [9, 10, 11, 12],
};

// Bloom's Taxonomy verbs for each level
const BLOOMS_VERBS = {
  Remember: ['define', 'list', 'recall', 'identify', 'name', 'state', 'label'],
  Understand: ['explain', 'describe', 'summarize', 'paraphrase', 'interpret', 'discuss', 'classify'],
  Apply: ['calculate', 'apply', 'use', 'demonstrate', 'solve', 'illustrate', 'complete'],
  Analyze: ['compare', 'analyze', 'distinguish', 'examine', 'categorize', 'organize', 'differentiate'],
  Evaluate: ['evaluate', 'justify', 'assess', 'critique', 'judge', 'defend', 'argue'],
  Create: ['design', 'create', 'develop', 'propose', 'construct', 'generate', 'plan'],
};

export function PromptBuilder({ onAssignmentGenerated, isLoading = false }: PromptBuilderProps) {
  // Step 1: Assignment Metadata
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState<number[]>([9]);
  const [totalPoints, setTotalPoints] = useState(100);
  const [dueDate, setDueDate] = useState('');

  // Step 2: Learning Objectives
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [customObjective, setCustomObjective] = useState('');

  // Step 3: Assignment Parts
  const [parts, setParts] = useState<AssignmentPart[]>([
    { id: '1', title: '', instructions: '', includesFormula: false, includesTable: false },
  ]);

  // Step 4: Rubric
  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    { id: '1', name: '', points: 0 },
  ]);

  // Step 5: Assessment Questions
  const [assessmentTopic, setAssessmentTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<'teacher' | 'student'>('teacher');



  const validateStep = (step: number): string[] => {
    const errors: string[] = [];
    
    if (step === 1) {
      const finalSubject = subject === 'Other' ? customSubject : subject;
      if (!finalSubject.trim()) errors.push('Subject is required');
      if (!title.trim()) errors.push('Title is required');
      if (!dueDate) errors.push('Due date is required');
    }
    
    if (step === 2) {
      if (learningObjectives.filter(o => o.trim()).length === 0) {
        errors.push('At least one learning objective is required');
      }
    }
    
    if (step === 3) {
      if (parts.some(p => !p.title.trim() || !p.instructions.trim())) {
        errors.push('All parts must have a title and instructions');
      }
    }
    
    if (step === 4) {
      if (criteria.some(c => !c.name.trim() || c.points <= 0)) {
        errors.push('All criteria must have a name and positive points');
      }
      const totalRubricPoints = criteria.reduce((sum, c) => sum + c.points, 0);
      if (totalRubricPoints !== totalPoints) {
        errors.push(`Rubric points (${totalRubricPoints}) must equal total points (${totalPoints})`);
      }
    }
    
    return errors;
  };

  // Generate questions with Bloom's Taxonomy distribution
  const generateBloomsQuestions = (topic: string, count: number): AssessmentQuestion[] => {
    // Calculate distribution: 50-60% lower, 30-40% mid, 10% higher
    const lowerCount = Math.ceil(count * 0.55); // Remember + Understand
    const midCount = Math.ceil(count * 0.35); // Apply + Analyze
    const higherCount = Math.max(1, Math.floor(count * 0.1)); // Evaluate + Create
    
    const questions: AssessmentQuestion[] = [];
    let questionId = 1;

    // Remember (25-30% of total)
    const rememberCount = Math.ceil(lowerCount * 0.5);
    for (let i = 0; i < rememberCount; i++) {
      const verb = BLOOMS_VERBS.Remember[Math.floor(Math.random() * BLOOMS_VERBS.Remember.length)];
      questions.push({
        id: questionId.toString(),
        bloomLevel: 'Remember',
        text: `${verb.charAt(0).toUpperCase() + verb.slice(1)} the key concepts related to ${topic}.`,
      });
      questionId++;
    }

    // Understand (25-30% of total)
    const understandCount = lowerCount - rememberCount;
    for (let i = 0; i < understandCount; i++) {
      const verb = BLOOMS_VERBS.Understand[Math.floor(Math.random() * BLOOMS_VERBS.Understand.length)];
      questions.push({
        id: questionId.toString(),
        bloomLevel: 'Understand',
        text: `${verb.charAt(0).toUpperCase() + verb.slice(1)} how ${topic} works and why it matters.`,
      });
      questionId++;
    }

    // Apply (15-20% of total)
    const applyCount = Math.ceil(midCount * 0.5);
    for (let i = 0; i < applyCount; i++) {
      const verb = BLOOMS_VERBS.Apply[Math.floor(Math.random() * BLOOMS_VERBS.Apply.length)];
      questions.push({
        id: questionId.toString(),
        bloomLevel: 'Apply',
        text: `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${topic} to solve a real-world problem.`,
      });
      questionId++;
    }

    // Analyze (15-20% of total)
    const analyzeCount = midCount - applyCount;
    for (let i = 0; i < analyzeCount; i++) {
      const verb = BLOOMS_VERBS.Analyze[Math.floor(Math.random() * BLOOMS_VERBS.Analyze.length)];
      questions.push({
        id: questionId.toString(),
        bloomLevel: 'Analyze',
        text: `${verb.charAt(0).toUpperCase() + verb.slice(1)} the components and relationships within ${topic}.`,
      });
      questionId++;
    }

    // Evaluate (5% of total)
    const evaluateCount = Math.ceil(higherCount * 0.5);
    for (let i = 0; i < evaluateCount; i++) {
      const verb = BLOOMS_VERBS.Evaluate[Math.floor(Math.random() * BLOOMS_VERBS.Evaluate.length)];
      questions.push({
        id: questionId.toString(),
        bloomLevel: 'Evaluate',
        text: `${verb.charAt(0).toUpperCase() + verb.slice(1)} the validity and effectiveness of different approaches to ${topic}.`,
      });
      questionId++;
    }

    // Create (5% of total)
    const createCount = higherCount - evaluateCount;
    for (let i = 0; i < createCount; i++) {
      const verb = BLOOMS_VERBS.Create[Math.floor(Math.random() * BLOOMS_VERBS.Create.length)];
      questions.push({
        id: questionId.toString(),
        bloomLevel: 'Create',
        text: `${verb.charAt(0).toUpperCase() + verb.slice(1)} an original solution or approach to ${topic}.`,
      });
      questionId++;
    }

    return questions.slice(0, count);
  };

  const handleGenerateQuestions = async () => {
    if (!assessmentTopic.trim()) {
      alert('Please enter a topic for assessment questions');
      return;
    }
    if (numQuestions < 1 || numQuestions > 50) {
      alert('Number of questions must be between 1 and 50');
      return;
    }

    setGeneratingQuestions(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const questions = generateBloomsQuestions(assessmentTopic, numQuestions);
      setAssessmentQuestions(questions);
    } catch (err) {
      alert('Failed to generate questions');
      console.error(err);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleRemoveQuestion = (id: string) => {
    setAssessmentQuestions(assessmentQuestions.filter(q => q.id !== id));
  };

  const handleNextStep = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      alert('Please fix the following issues:\n\n' + errors.join('\n'));
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleAddObjective = () => {
    if (customObjective.trim()) {
      setLearningObjectives([...learningObjectives, customObjective]);
      setCustomObjective('');
    }
  };

  const handleRemoveObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const handleAddPart = () => {
    const newId = Math.max(...parts.map(p => parseInt(p.id) || 0), 0) + 1;
    setParts([...parts, { id: newId.toString(), title: '', instructions: '', includesFormula: false, includesTable: false }]);
  };

  const handleRemovePart = (id: string) => {
    if (parts.length > 1) {
      setParts(parts.filter(p => p.id !== id));
    }
  };

  const handleUpdatePart = (id: string, updates: Partial<AssignmentPart>) => {
    setParts(parts.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleAddCriterion = () => {
    const newId = Math.max(...criteria.map(c => parseInt(c.id) || 0), 0) + 1;
    setCriteria([...criteria, { id: newId.toString(), name: '', points: 0 }]);
  };

  const handleRemoveCriterion = (id: string) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter(c => c.id !== id));
    }
  };

  const handleUpdateCriterion = (id: string, updates: Partial<RubricCriterion>) => {
    setCriteria(criteria.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  // Export to PDF
  const exportToPDF = () => {
    const finalSubject = subject === 'Other' ? customSubject : subject;
    const doc = new jsPDF();
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - 2 * margin;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPosition);
    yPosition += 12;

    // Metadata
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subject: ${finalSubject}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Grade Level(s): ${gradeLevel.map(g => `${g}th`).join(', ')}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total Points: ${totalPoints}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Due Date: ${dueDate || 'TBD'}`, margin, yPosition);
    yPosition += 12;

    // Learning Objectives
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Learning Objectives', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    learningObjectives.forEach(obj => {
      const lines = doc.splitTextToSize(`• ${obj}`, maxWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 5;
    });
    yPosition += 4;

    // Assignment Parts
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Assignment Instructions', margin, yPosition);
    yPosition += 8;

    parts.forEach((part, idx) => {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Part ${idx + 1}: ${part.title}`, margin, yPosition);
      yPosition += 6;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const instructionLines = doc.splitTextToSize(part.instructions, maxWidth);
      doc.text(instructionLines, margin, yPosition);
      yPosition += instructionLines.length * 5;

      if (part.includesFormula && part.formula) {
        doc.setFont('helvetica', 'bold');
        doc.text('Formula:', margin, yPosition);
        yPosition += 4;
        doc.setFont('helvetica', 'normal');
        const formulaLines = doc.splitTextToSize(part.formula, maxWidth);
        doc.text(formulaLines, margin, yPosition);
        yPosition += formulaLines.length * 4;
      }

      yPosition += 4;

      // Check if we need a new page
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
    });

    // Grading Rubric
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Grading Rubric', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.text(`This assignment is worth ${totalPoints} points total.`, margin, yPosition);
    yPosition += 8;

    // Create rubric table
    doc.setFont('helvetica', 'bold');
    doc.text('Criterion', margin, yPosition);
    doc.text('Points', margin + maxWidth - 40, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    criteria.forEach(c => {
      doc.text(c.name, margin, yPosition);
      doc.text(c.points.toString(), margin + maxWidth - 40, yPosition);
      yPosition += 5;
    });

    doc.setFont('helvetica', 'bold');
    doc.text('Total', margin, yPosition);
    doc.text(totalPoints.toString(), margin + maxWidth - 40, yPosition);
    yPosition += 8;

    // Assessment Questions
    if (assessmentQuestions.length > 0) {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Assessment Questions', margin, yPosition);
      yPosition += 8;

      assessmentQuestions.forEach((q, idx) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. [${q.bloomLevel}]`, margin, yPosition);
        yPosition += 5;

        doc.setFont('helvetica', 'normal');
        const questionLines = doc.splitTextToSize(q.text, maxWidth - 10);
        doc.text(questionLines, margin + 5, yPosition);
        yPosition += questionLines.length * 4;
        yPosition += 3;

        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
      });
    }

    // Save PDF
    doc.save(`${title.replace(/\s+/g, '_')}_assignment.pdf`);
  };

  // Export to Word - simplified using text paragraphs
  const exportToWord = async () => {
    const finalSubject = subject === 'Other' ? customSubject : subject;

    const docElements: Paragraph[] = [];

    // Title
    docElements.push(new Paragraph({ text: title }));
    docElements.push(new Paragraph({ text: '' }));

    // Metadata
    docElements.push(new Paragraph({ text: `Subject: ${finalSubject}` }));
    docElements.push(new Paragraph({ text: `Grade Level(s): ${gradeLevel.map(g => `${g}th`).join(', ')}` }));
    docElements.push(new Paragraph({ text: `Total Points: ${totalPoints}` }));
    docElements.push(new Paragraph({ text: `Due Date: ${dueDate || 'TBD'}` }));
    docElements.push(new Paragraph({ text: '' }));

    // Learning Objectives
    docElements.push(new Paragraph({ text: 'Learning Objectives' }));
    learningObjectives.forEach(obj => {
      docElements.push(new Paragraph({ text: `• ${obj}` }));
    });
    docElements.push(new Paragraph({ text: '' }));

    // Assignment Parts
    docElements.push(new Paragraph({ text: 'Assignment Instructions' }));
    docElements.push(new Paragraph({ text: '' }));

    parts.forEach((part, idx) => {
      docElements.push(new Paragraph({ text: `Part ${idx + 1}: ${part.title}` }));
      docElements.push(new Paragraph({ text: part.instructions }));
      
      if (part.includesFormula && part.formula) {
        docElements.push(new Paragraph({ text: `Formula: ${part.formula}` }));
      }
      docElements.push(new Paragraph({ text: '' }));
    });

    // Grading Rubric
    docElements.push(new Paragraph({ text: 'Grading Rubric' }));
    docElements.push(new Paragraph({ text: `This assignment is worth ${totalPoints} points total.` }));
    docElements.push(new Paragraph({ text: '' }));

    // Rubric as formatted text
    docElements.push(new Paragraph({ text: 'Criterion | Points' }));
    docElements.push(new Paragraph({ text: '-----------|----------' }));
    criteria.forEach(c => {
      docElements.push(new Paragraph({ text: `${c.name} | ${c.points}` }));
    });
    docElements.push(new Paragraph({ text: `Total | ${totalPoints}` }));
    docElements.push(new Paragraph({ text: '' }));

    // Assessment Questions
    if (assessmentQuestions.length > 0) {
      docElements.push(new Paragraph({ text: 'Assessment Questions' }));
      assessmentQuestions.forEach((q, idx) => {
        docElements.push(new Paragraph({ text: `${idx + 1}. [${q.bloomLevel}] ${q.text}` }));
      });
    }

    const doc = new Document({
      sections: [
        {
          children: docElements,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_assignment.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateAssignment = async () => {
    const errors = validateStep(4);
    if (errors.length > 0) {
      alert('Please fix the following issues:\n\n' + errors.join('\n'));
      return;
    }

    setGenerating(true);
    try {
      const finalSubject = subject === 'Other' ? customSubject : subject;
      
      // Build description from parts
      const partsDescription = parts
        .map(p => `${p.title}: ${p.instructions}`)
        .join('\n\n');

      // Map numeric grades to grade level band
      const mapGradeLevelBand = (): typeof GradeLevel[keyof typeof GradeLevel] => {
        const minGrade = Math.min(...gradeLevel);
        if (minGrade <= 5) return GradeLevel.ELEMENTARY;
        if (minGrade <= 8) return GradeLevel.MIDDLE_SCHOOL;
        return GradeLevel.HIGH_SCHOOL;
      };

      const metadata: AssignmentMetadata = {
        subject: finalSubject,
        title,
        description: partsDescription,
        topic: title,
        assignmentType: AssignmentType.PROJECT,
        gradeLevel: mapGradeLevelBand(),
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        estimatedTimeMinutes: 0,
        learningObjectives,
        requiredElements: [],
        assessmentCriteria: criteria.map(c => `${c.name} (${c.points} pts)`),
        prerequisites: [],
        additionalNotes: `Due Date: ${dueDate}`,
      };

      const result = await generateAssignment(metadata);
      onAssignmentGenerated(result.content, result.metadata);
    } catch (err) {
      alert('Failed to generate assignment');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  };

  const stepIndicatorStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    justifyContent: 'center',
  };

  const stepButtonStyle = (step: number): React.CSSProperties => ({
    padding: '10px 16px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: currentStep === step ? '#007bff' : currentStep > step ? '#28a745' : '#ddd',
    color: currentStep === step || currentStep > step ? 'white' : '#666',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: currentStep === step ? 'bold' : 'normal',
  });

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '16px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
    marginBottom: '8px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#333',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 16px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '8px',
  };

  const buttonSmallStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#28a745',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '4px',
  };

  const deleteButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#dc3545',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ marginTop: 0 }}>🎓 Multi-Step Assignment Builder</h2>
      
      {/* Step Indicator */}
      <div style={stepIndicatorStyle}>
        {[1, 2, 3, 4, 5].map(step => (
          <button key={step} style={stepButtonStyle(step)} disabled>
            Step {step}
          </button>
        ))}
      </div>

      <div style={cardStyle}>
        {/* STEP 1: Assignment Metadata */}
        {currentStep === 1 && (
          <>
            <h3>📋 Step 1: Assignment Metadata</h3>
            
            {/* Subject */}
            <label style={labelStyle}>Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select a subject...</option>
              {COMMON_SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="Other">Other (specify below)</option>
            </select>
            {subject === 'Other' && (
              <>
                <label style={labelStyle}>Custom Subject</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Enter custom subject"
                  style={inputStyle}
                />
              </>
            )}

            {/* Title */}
            <label style={labelStyle}>Assignment Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., On-Level Statistics Casino Project"
              style={inputStyle}
            />

            {/* Grade Levels - Multi-select */}
            <label style={labelStyle}>Grade Levels (Select one or more)</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              marginBottom: '16px'
            }}>
              {/* Grade Band Buttons */}
              {Object.entries(GRADE_BANDS).map(([band, grades]) => (
                <button
                  key={band}
                  onClick={() => {
                    // Toggle entire band
                    const allSelected = grades.every(g => gradeLevel.includes(g));
                    if (allSelected) {
                      setGradeLevel(gradeLevel.filter(g => !grades.includes(g)));
                    } else {
                      setGradeLevel(Array.from(new Set([...gradeLevel, ...grades])).sort((a, b) => a - b));
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: grades.every(g => gradeLevel.includes(g)) ? '#007bff' : '#e0e0e0',
                    color: grades.every(g => gradeLevel.includes(g)) ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {band}
                </button>
              ))}
            </div>

            {/* Individual Grade Level Checkboxes */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              {GRADE_LEVELS_NUMERIC.map(g => (
                <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={gradeLevel.includes(g)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setGradeLevel(Array.from(new Set([...gradeLevel, g])).sort((a, b) => a - b));
                      } else {
                        setGradeLevel(gradeLevel.filter(gl => gl !== g));
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px' }}>{g}th</span>
                </label>
              ))}
            </div>

            {/* Total Points */}
            <label style={labelStyle}>Total Points</label>
            <input
              type="number"
              value={totalPoints}
              onChange={(e) => setTotalPoints(parseInt(e.target.value) || 0)}
              min="0"
              style={inputStyle}
            />

            {/* Due Date */}
            <label style={labelStyle}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={inputStyle}
            />
          </>
        )}

        {/* STEP 2: Learning Objectives */}
        {currentStep === 2 && (
          <>
            <h3>🎯 Step 2: Learning Objectives</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Select or add learning objectives for this assignment.</p>

            <label style={labelStyle}>Select Learning Objectives</label>
            <select
              onChange={(e) => {
                if (e.target.value && !learningObjectives.includes(e.target.value)) {
                  setLearningObjectives([...learningObjectives, e.target.value]);
                }
                e.target.value = '';
              }}
              style={inputStyle}
            >
              <option value="">+ Add an objective...</option>
              {COMMON_OBJECTIVES.filter(obj => !learningObjectives.includes(obj)).map(obj => (
                <option key={obj} value={obj}>{obj}</option>
              ))}
            </select>

            {/* Custom Objective */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                value={customObjective}
                onChange={(e) => setCustomObjective(e.target.value)}
                placeholder="Enter custom objective"
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              />
              <button onClick={handleAddObjective} style={buttonSmallStyle}>
                Add Custom
              </button>
            </div>

            {/* Display Selected Objectives */}
            {learningObjectives.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <strong>Selected Objectives:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {learningObjectives.map((obj, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#e7f3ff',
                        border: '1px solid #007bff',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {obj}
                      <button
                        onClick={() => handleRemoveObjective(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007bff',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* STEP 3: Assignment Parts */}
        {currentStep === 3 && (
          <>
            <h3>📝 Step 3: Assignment Parts</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Break down your assignment into parts or sections.</p>

            {parts.map((part, idx) => (
              <div key={part.id} style={{ marginBottom: '20px', border: '1px solid #ddd', padding: '12px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong>Part {idx + 1}</strong>
                  {parts.length > 1 && (
                    <button
                      onClick={() => handleRemovePart(part.id)}
                      style={deleteButtonStyle}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label style={labelStyle}>Part Title</label>
                <input
                  type="text"
                  value={part.title}
                  onChange={(e) => handleUpdatePart(part.id, { title: e.target.value })}
                  placeholder="e.g., Create a Simple Casino Game"
                  style={inputStyle}
                />

                <label style={labelStyle}>Instructions</label>
                <textarea
                  value={part.instructions}
                  onChange={(e) => handleUpdatePart(part.id, { instructions: e.target.value })}
                  placeholder="Detailed instructions for this part..."
                  rows={3}
                  style={inputStyle}
                />

                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    checked={part.includesFormula}
                    onChange={(e) => handleUpdatePart(part.id, { includesFormula: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  This part includes a formula
                </label>

                {part.includesFormula && (
                  <>
                    <label style={labelStyle}>Formula (LaTeX)</label>
                    <textarea
                      value={part.formula || ''}
                      onChange={(e) => handleUpdatePart(part.id, { formula: e.target.value })}
                      placeholder="e.g., P(X) = \\frac{favorable}{total}"
                      rows={2}
                      style={inputStyle}
                    />
                  </>
                )}

                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    checked={part.includesTable}
                    onChange={(e) => handleUpdatePart(part.id, { includesTable: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  This part includes a table
                </label>
              </div>
            ))}

            <button onClick={handleAddPart} style={buttonSmallStyle}>
              + Add Another Part
            </button>
          </>
        )}

        {/* STEP 4: Rubric & Criteria */}
        {currentStep === 4 && (
          <>
            <h3>⭐ Step 4: Grading Rubric</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Define grading criteria. Total must equal {totalPoints} points.</p>

            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <strong>Total Points Available: {totalPoints}</strong>
              <div>
                Rubric Total: <span style={{ color: criteria.reduce((s, c) => s + c.points, 0) === totalPoints ? '#28a745' : '#dc3545' }}>
                  {criteria.reduce((s, c) => s + c.points, 0)} pts
                </span>
              </div>
            </div>

            {criteria.map((criterion, _idx) => (
              <div key={criterion.id} style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>Criterion Name</label>
                  <select
                    value={criterion.name}
                    onChange={(e) => handleUpdateCriterion(criterion.id, { name: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">Select criterion...</option>
                    {COMMON_CRITERIA.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="custom">+ Add Custom</option>
                  </select>
                  {criterion.name === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom criterion name"
                      onChange={(e) => handleUpdateCriterion(criterion.id, { name: e.target.value })}
                      style={inputStyle}
                    />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Points</label>
                  <input
                    type="number"
                    value={criterion.points}
                    onChange={(e) => handleUpdateCriterion(criterion.id, { points: parseInt(e.target.value) || 0 })}
                    min="0"
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </div>

                {criteria.length > 1 && (
                  <button
                    onClick={() => handleRemoveCriterion(criterion.id)}
                    style={deleteButtonStyle}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button onClick={handleAddCriterion} style={buttonSmallStyle}>
              + Add Another Criterion
            </button>
          </>
        )}

        {/* STEP 5: Assessment Questions with Bloom's Taxonomy */}
        {currentStep === 5 && (
          <>
            <h3>❓ Step 5: Assessment Questions (Optional)</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Generate assessment questions balanced across Bloom's Taxonomy levels: 
              50–60% Remember/Understand, 30–40% Apply/Analyze, 10% Evaluate/Create.
            </p>

            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
              <strong>📊 Distribution Guide:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '13px', color: '#666' }}>
                <li>🔵 <strong>50–60%</strong> Lower-order: Remember, Understand</li>
                <li>🟢 <strong>30–40%</strong> Mid-tier: Apply, Analyze</li>
                <li>🟠 <strong>10%</strong> Higher-order: Evaluate, Create</li>
              </ul>
            </div>

            {/* Topic Input */}
            <label style={labelStyle}>Assessment Topic</label>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '8px' }}>
              What topic or concept should the questions focus on? (e.g., "Expected Value in Probability")
            </p>
            <input
              type="text"
              value={assessmentTopic}
              onChange={(e) => setAssessmentTopic(e.target.value)}
              placeholder="e.g., Expected Value in Probability, Causes of the Civil War"
              style={inputStyle}
            />

            {/* Number of Questions */}
            <label style={labelStyle}>Number of Questions</label>
            <input
              type="number"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              min="1"
              max="50"
              style={inputStyle}
            />

            {/* Generate Questions Button */}
            <button
              onClick={handleGenerateQuestions}
              disabled={generatingQuestions}
              style={{
                ...buttonStyle,
                backgroundColor: generatingQuestions ? '#ccc' : '#007bff',
                cursor: generatingQuestions ? 'not-allowed' : 'pointer',
                width: '100%',
                marginBottom: '16px',
              }}
            >
              {generatingQuestions ? 'Generating Questions...' : '✨ Generate Questions'}
            </button>

            {/* Display Generated Questions */}
            {assessmentQuestions.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4>Generated Assessment Questions ({assessmentQuestions.length})</h4>
                
                {/* Bloom Level Legend */}
                <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
                  <div style={{ padding: '4px 8px', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
                    <strong style={{ color: '#1976d2' }}>Remember</strong>
                  </div>
                  <div style={{ padding: '4px 8px', backgroundColor: '#f3e5f5', borderRadius: '4px', border: '1px solid #9c27b0' }}>
                    <strong style={{ color: '#7b1fa2' }}>Understand</strong>
                  </div>
                  <div style={{ padding: '4px 8px', backgroundColor: '#e8f5e9', borderRadius: '4px', border: '1px solid #4caf50' }}>
                    <strong style={{ color: '#2e7d32' }}>Apply</strong>
                  </div>
                  <div style={{ padding: '4px 8px', backgroundColor: '#fff3e0', borderRadius: '4px', border: '1px solid #ff9800' }}>
                    <strong style={{ color: '#e65100' }}>Analyze</strong>
                  </div>
                  <div style={{ padding: '4px 8px', backgroundColor: '#fce4ec', borderRadius: '4px', border: '1px solid #e91e63' }}>
                    <strong style={{ color: '#ad1457' }}>Evaluate</strong>
                  </div>
                  <div style={{ padding: '4px 8px', backgroundColor: '#ede7f6', borderRadius: '4px', border: '1px solid #673ab7' }}>
                    <strong style={{ color: '#512da8' }}>Create</strong>
                  </div>
                </div>

                {/* Questions List */}
                <div style={{ marginBottom: '16px' }}>
                  {assessmentQuestions.map((question, idx) => {
                    const bloomColors = {
                      Remember: { bg: '#e3f2fd', border: '#2196f3', text: '#1976d2' },
                      Understand: { bg: '#f3e5f5', border: '#9c27b0', text: '#7b1fa2' },
                      Apply: { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },
                      Analyze: { bg: '#fff3e0', border: '#ff9800', text: '#e65100' },
                      Evaluate: { bg: '#fce4ec', border: '#e91e63', text: '#ad1457' },
                      Create: { bg: '#ede7f6', border: '#673ab7', text: '#512da8' },
                    };
                    const color = bloomColors[question.bloomLevel];

                    return (
                      <div
                        key={question.id}
                        style={{
                          marginBottom: '12px',
                          padding: '12px',
                          backgroundColor: color.bg,
                          border: `1px solid ${color.border}`,
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ marginBottom: '4px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                backgroundColor: color.border,
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                marginRight: '8px',
                              }}
                            >
                              {question.bloomLevel}
                            </span>
                            <span style={{ fontWeight: 'bold', color: color.text }}>Q{idx + 1}</span>
                          </div>
                          <p style={{ margin: '8px 0 0 0', color: '#333', lineHeight: '1.4' }}>
                            {question.text}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveQuestion(question.id)}
                          style={{
                            ...deleteButtonStyle,
                            flexShrink: 0,
                            marginTop: '4px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Distribution Summary */}
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                  <strong>Distribution Summary:</strong>
                  <div style={{ fontSize: '12px', marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map(level => {
                      const count = assessmentQuestions.filter(q => q.bloomLevel === level).length;
                      const percentage = ((count / assessmentQuestions.length) * 100).toFixed(1);
                      return (
                        <div key={level} style={{ color: '#666' }}>
                          <strong>{level}:</strong> {count} ({percentage}%)
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '900px',
            width: '90%',
            maxHeight: '85vh',
            overflow: 'auto',
            padding: 0,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}>
            {/* Preview Header */}
            <div style={{
              backgroundColor: '#f5f5f5',
              borderBottom: '1px solid #ddd',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <h3 style={{ margin: 0 }}>📋 Assignment Preview</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={exportToPDF}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                >
                  📥 PDF
                </button>
                <button
                  onClick={exportToWord}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#0d6efd',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                >
                  📄 Word
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0 8px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tab Selection */}
            <div style={{
              borderBottom: '1px solid #ddd',
              padding: '12px 20px',
              display: 'flex',
              gap: '16px',
            }}>
              <button
                onClick={() => setPreviewTab('teacher')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: previewTab === 'teacher' ? 'bold' : 'normal',
                  color: previewTab === 'teacher' ? '#007bff' : '#666',
                  borderBottom: previewTab === 'teacher' ? '3px solid #007bff' : 'none',
                  cursor: 'pointer',
                }}
              >
                👨‍🏫 Teacher View
              </button>
              <button
                onClick={() => setPreviewTab('student')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: previewTab === 'student' ? 'bold' : 'normal',
                  color: previewTab === 'student' ? '#007bff' : '#666',
                  borderBottom: previewTab === 'student' ? '3px solid #007bff' : 'none',
                  cursor: 'pointer',
                }}
              >
                👨‍🎓 Student View
              </button>
            </div>

            {/* Preview Content */}
            <div style={{
              padding: '20px',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#333',
            }}>
              {previewTab === 'teacher' && (
                <div>
                  <h2>{title}</h2>
                  <hr style={{ margin: '16px 0', borderColor: '#ddd' }} />
                  
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                    <strong>Assignment Metadata:</strong>
                    <table style={{ width: '100%', marginTop: '8px', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '6px', fontWeight: 'bold' }}>Subject:</td>
                          <td style={{ padding: '6px' }}>{subject === 'Other' ? customSubject : subject}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '6px', fontWeight: 'bold' }}>Grade Level(s):</td>
                          <td style={{ padding: '6px' }}>{gradeLevel.map(g => `${g}th`).join(', ')}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '6px', fontWeight: 'bold' }}>Due Date:</td>
                          <td style={{ padding: '6px' }}>{dueDate || 'Not specified'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '6px', fontWeight: 'bold' }}>Total Points:</td>
                          <td style={{ padding: '6px' }}>{totalPoints}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3>Learning Objectives</h3>
                  <ul>
                    {learningObjectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>

                  <h3>Assignment Parts</h3>
                  {parts.map((part, idx) => (
                    <div key={part.id} style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                      <h4>Part {idx + 1}: {part.title}</h4>
                      <p>{part.instructions}</p>
                      {part.includesFormula && part.formula && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e8f4f8', borderRadius: '3px' }}>
                          <strong>Formula:</strong> {part.formula}
                        </div>
                      )}
                    </div>
                  ))}

                  <h3>Grading Rubric</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Criterion</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criteria.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px' }}>{c.name}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{c.points}</td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                        <td style={{ padding: '8px' }}>Total</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{totalPoints}</td>
                      </tr>
                    </tbody>
                  </table>

                  {assessmentQuestions.length > 0 && (
                    <>
                      <h3 style={{ marginTop: '20px' }}>Assessment Questions</h3>
                      <ol>
                        {assessmentQuestions.map(q => (
                          <li key={q.id} style={{ marginBottom: '8px', color: '#555' }}>
                            <span style={{ fontSize: '12px', backgroundColor: '#e8f4f8', padding: '2px 6px', borderRadius: '3px', marginRight: '8px' }}>
                              {q.bloomLevel}
                            </span>
                            {q.text}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              )}

              {previewTab === 'student' && (
                <div>
                  <h2>{title}</h2>
                  <hr style={{ margin: '16px 0', borderColor: '#ddd' }} />
                  
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                    <strong>📌 Assignment Information</strong>
                    <div style={{ marginTop: '8px', fontSize: '13px' }}>
                      <div><strong>Subject:</strong> {subject === 'Other' ? customSubject : subject}</div>
                      <div><strong>Grade Level(s):</strong> {gradeLevel.map(g => `${g}th`).join(', ')}</div>
                      <div><strong>Due Date:</strong> {dueDate || 'Check with your teacher'}</div>
                      <div><strong>Points Possible:</strong> {totalPoints}</div>
                    </div>
                  </div>

                  <h3>What You'll Learn</h3>
                  <p>By completing this assignment, you will:</p>
                  <ul>
                    {learningObjectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>

                  <h3>Your Assignment</h3>
                  {parts.map((part, idx) => (
                    <div key={part.id} style={{ marginBottom: '16px' }}>
                      <h4>Part {idx + 1}: {part.title}</h4>
                      <p style={{ backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '4px' }}>
                        {part.instructions}
                      </p>
                      {part.includesFormula && part.formula && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff3e0', borderRadius: '3px', fontSize: '13px' }}>
                          <strong>You'll use this formula:</strong> {part.formula}
                        </div>
                      )}
                    </div>
                  ))}

                  <h3>How You'll Be Graded</h3>
                  <p>Your work will be evaluated on these criteria (out of {totalPoints} points):</p>
                  <ul>
                    {criteria.map(c => (
                      <li key={c.id}>
                        <strong>{c.name}</strong> ({c.points} points)
                      </li>
                    ))}
                  </ul>

                  <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                    <strong>💡 Tips for Success:</strong>
                    <ul style={{ marginTop: '8px', fontSize: '13px' }}>
                      <li>Start early and break the assignment into smaller steps</li>
                      <li>Review the learning objectives frequently as you work</li>
                      <li>Use the grading criteria to make sure you're on track</li>
                      <li>Ask for help if you get stuck</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {currentStep > 1 && (
          <button onClick={handlePreviousStep} style={buttonStyle}>
            ← Previous Step
          </button>
        )}
        {currentStep >= 4 && (
          <button
            onClick={() => setShowPreview(true)}
            style={{
              ...buttonStyle,
              backgroundColor: '#6c757d',
            }}
          >
            👁️ Preview Assignment
          </button>
        )}
        {currentStep < 5 && (
          <button onClick={handleNextStep} style={buttonStyle}>
            Next Step →
          </button>
        )}
        {currentStep === 5 && (
          <button
            onClick={handleGenerateAssignment}
            disabled={generating || isLoading}
            style={{
              ...buttonStyle,
              backgroundColor: generating || isLoading ? '#ccc' : '#28a745',
              cursor: generating || isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {generating || isLoading ? 'Generating...' : '✨ Generate Assignment'}
          </button>
        )}
      </div>
    </div>
  );
}
