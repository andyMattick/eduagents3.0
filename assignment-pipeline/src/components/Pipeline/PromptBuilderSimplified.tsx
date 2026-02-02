import React, { useState } from 'react';
import {
  AssignmentMetadata,
  AssignmentType,
  GradeLevel,
  DifficultyLevel,
  ASSIGNMENT_TYPE_LABELS,
  GRADE_LEVEL_LABELS,
  DIFFICULTY_LABELS,
} from '../../agents/shared/assignmentMetadata';
import { generateAssignment } from '../../agents/shared/generateAssignment';

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

const SUBMISSION_FORMATS = [
  'Google Doc',
  'PDF',
  'Printed Copy',
  'LMS Upload',
  'Email',
];

const GRADE_LEVELS_NUMERIC = [6, 7, 8, 9, 10, 11, 12];

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
  const [gradeLevel, setGradeLevel] = useState(9);
  const [totalPoints, setTotalPoints] = useState(100);
  const [dueDate, setDueDate] = useState('');
  const [submissionFormats, setSubmissionFormats] = useState<string[]>([]);

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

  const validateStep = (step: number): string[] => {
    const errors: string[] = [];
    
    if (step === 1) {
      const finalSubject = subject === 'Other' ? customSubject : subject;
      if (!finalSubject.trim()) errors.push('Subject is required');
      if (!title.trim()) errors.push('Title is required');
      if (!dueDate) errors.push('Due date is required');
      if (submissionFormats.length === 0) errors.push('At least one submission format is required');
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
    const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'] as const;
    
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

  const handleToggleSubmissionFormat = (format: string) => {
    setSubmissionFormats(prev =>
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
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

      const metadata: AssignmentMetadata = {
        subject: finalSubject,
        title,
        description: partsDescription,
        topic: title,
        assignmentType: AssignmentType.PROJECT,
        gradeLevel: GradeLevel.HIGH_SCHOOL,
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        estimatedTimeMinutes: 0,
        learningObjectives,
        requiredElements: [],
        assessmentCriteria: criteria.map(c => `${c.name} (${c.points} pts)`),
        prerequisites: [],
        additionalNotes: `Due Date: ${dueDate}\nSubmission Format: ${submissionFormats.join(', ')}`,
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

            {/* Grade Level */}
            <label style={labelStyle}>Grade Level</label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(parseInt(e.target.value))}
              style={inputStyle}
            >
              {GRADE_LEVELS_NUMERIC.map(g => (
                <option key={g} value={g}>{g}th Grade</option>
              ))}
            </select>

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

            {/* Submission Formats */}
            <label style={labelStyle}>Submission Format (select all that apply)</label>
            <div style={{ marginBottom: '16px' }}>
              {SUBMISSION_FORMATS.map(format => (
                <div key={format} style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal' }}>
                    <input
                      type="checkbox"
                      checked={submissionFormats.includes(format)}
                      onChange={() => handleToggleSubmissionFormat(format)}
                      style={{ marginRight: '8px' }}
                    />
                    {format}
                  </label>
                </div>
              ))}
            </div>
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

            {criteria.map((criterion, idx) => (
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

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {currentStep > 1 && (
          <button onClick={handlePreviousStep} style={buttonStyle}>
            ← Previous Step
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
