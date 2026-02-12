/**
 * Teacher System API Service
 * 
 * Bridge between frontend and Supabase backend for:
 * - Teacher accounts and authentication
 * - Assignment storage and management
 * - Question bank operations
 * - API usage tracking
 * - Subscription management
 * - Universal Problem storage and versioning
 * - Astronaut (student profile) management
 * - Simulation result tracking
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  TeacherAccount,
  AssignmentSummary,
  AssignmentDetail,
  QuestionBankEntry,
  QuestionBankFilter,
  SubscriptionTier,
  ResourceLimitStatus,
  SUBSCRIPTION_TIERS,
  SavedAstronautProfile,
  AstronautFilter,
  AssignmentSimulationResult,
  SimulationHistory,
} from '../types/teacherSystem';
import {
  UniversalProblem,
  Astronaut,
  StudentProblemInput,
  StudentProblemOutput,
  StudentAssignmentSimulation,
  AssignmentSimulationBatch,
  validateProblemInvariants,
} from '../types/universalPayloads';

// ============================================================================
// SUPABASE CLIENT SINGLETON
// ============================================================================

let supabase: SupabaseClient | null = null;

export function initializeSupabase(): SupabaseClient {
  if (supabase) return supabase;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);
  return supabase;
}

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    return initializeSupabase();
  }
  return supabase;
}

// ============================================================================
// TEACHER ACCOUNT OPERATIONS
// ============================================================================

export async function createTeacherAccount(
  userId: string,
  email: string,
  name: string,
  schoolName?: string
): Promise<TeacherAccount> {
  const db = getSupabase();

  // Create account directly in teacher_accounts (consolidated schema - no separate profiles)
  const { data: account, error: accountError } = await db
    .from('teacher_accounts')
    .insert({
      user_id: userId,
      email,
      name,
      school_name: schoolName,
      subscription_tier: 'free',
      api_calls_remaining: SUBSCRIPTION_TIERS.free.monthlyApiLimit,
      is_verified: false,
    })
    .select()
    .single();

  if (accountError) throw accountError;

  return mapTeacherAccount(account);
}

export async function getTeacherAccount(userId: string): Promise<TeacherAccount | null> {
  const db = getSupabase();

  // Query by user_id from teacher_accounts directly (consolidated schema)
  const { data, error } = await db
    .from('teacher_accounts')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return mapTeacherAccount(data);
}

export async function updateSubscriptionTier(
  userId: string,
  newTier: SubscriptionTier,
  paymentMethodId?: string
): Promise<TeacherAccount> {
  const db = getSupabase();
  const tierConfig = SUBSCRIPTION_TIERS[newTier];

  // Log subscription change
  await db.from('subscription_changes').insert({
    teacher_id: userId,
    new_tier: newTier,
    reason: 'upgrade', // Simplified; could be dynamic
  });

  // Update account (using user_id)
  const { data: account, error } = await db
    .from('teacher_accounts')
    .update({
      subscription_tier: newTier,
      api_calls_remaining: tierConfig.monthlyApiLimit,
      payment_method_id: paymentMethodId,
      subscription_renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return mapTeacherAccount(account);
}

// ============================================================================
// HELPER: Save Individual Problems to Question Bank
// ============================================================================

async function saveProblemsToQuestionBank(
  db: any,
  teacherId: string,
  assignmentId: string,
  sections: any[],
  subject: string,
  gradeLevel: string
): Promise<void> {
  const problemsToInsert: any[] = [];
  
  sections.forEach((section, sectionIdx) => {
    if (!section.problems) return;
    
    section.problems.forEach((problem: any) => {
      const problemTags: string[] = [];
      
      // Extract tags from problem metadata
      if (problem.format) problemTags.push(problem.format);
      if (problem.bloomLevel) problemTags.push(problem.bloomLevel);
      if (problem.multiPart) problemTags.push('multi-part');
      
      problemsToInsert.push({
        teacher_id: teacherId,
        assignment_id: assignmentId,
        section_id: section.id || `section_${sectionIdx}`,
        problem: {
          // Transform the problem to have a 'text' field that QuestionBank expects
          text: problem.problemText || problem.question || '',
          ...problem,
          // Include full payload information
          __payload: {
            bloomLevel: problem.bloomLevel,
            linguisticComplexity: problem.linguisticComplexity,
            similarityToPrevious: problem.similarityToPrevious,
            noveltyScore: problem.noveltyScore,
            format: problem.format,
            multiPart: problem.multiPart,
            problemLength: problem.problemLength,
          },
        },
        bloom_level: problem.bloomLevel || 'Unknown',
        subject: subject,
        grade: gradeLevel,
        tags: problemTags,
        usage_count: 0,
        is_favorite: false,
      });
    });
  });

  // Batch insert all problems if any exist
  if (problemsToInsert.length > 0) {
    const { error } = await db.from('question_bank').insert(problemsToInsert);
    if (error && error.code !== 'PGRST204') {
      console.error('Error saving problems to question bank:', error);
      // Don't throw - let the assignment save succeed even if problem bank fails
    }
  }
}

// ============================================================================
// ASSIGNMENT OPERATIONS
// ============================================================================

export async function saveAssignment(
  teacherId: string,
  assignment: Omit<AssignmentDetail, 'id'> & { id?: string }
): Promise<AssignmentDetail> {
  const db = getSupabase();
  const isNew = !assignment.id;

  // Check assignment limits (skip in dev mode, for admin, or for demo account)
  if (isNew) {
    const account = await getTeacherAccount(teacherId);
    if (!account) throw new Error('Teacher account not found');

    const isDevMode = import.meta.env.DEV;
    const isDemoAccount = account.email === 'teacher@example.com';
    const tierConfig = SUBSCRIPTION_TIERS[account.subscription.tier];
    
    // Skip limit check in dev mode, for admin users, or for demo account
    if (!isDevMode && !account.isAdmin && !isDemoAccount && account.assignmentCount >= tierConfig.maxAssignments) {
      throw new Error(
        `Assignment limit of ${tierConfig.maxAssignments} reached. Upgrade your subscription to create more.`
      );
    }
  }

  const assignmentData = {
    teacher_id: teacherId,
    title: assignment.title,
    subject: assignment.subject,
    grade_level: assignment.gradeLevel,
    assignment_type: assignment.assignmentType,
    status: assignment.status,
    content: assignment,
    specifications: assignment.specifications,
    problem_count: assignment.sections.reduce((sum, s) => sum + s.problems.length, 0),
    estimated_time_minutes: assignment.estimatedTimeMinutes,
    version: assignment.version || 1,
    is_template: assignment.isTemplate,
    source_file_name: assignment.sourceFileName,
    tags: assignment.tags,
    bloom_distribution: assignment.metadata?.bloomDistribution,
  };

  if (isNew) {
    const { data, error } = await db
      .from('assignments')
      .insert(assignmentData)
      .select()
      .single();

    if (error) throw error;

    // Save individual problems to question_bank
    await saveProblemsToQuestionBank(db, teacherId, data.id, assignment.sections, assignment.subject, assignment.gradeLevel || '9-12');

    // Increment assignment count
    await db
      .from('teacher_accounts')
      .update({ assignment_count: (await db.from('assignments').select('id').eq('teacher_id', teacherId)).data?.length || 1 })
      .eq('user_id', teacherId);

    return mapAssignmentDetail(data);
  } else {
    const { data, error } = await db
      .from('assignments')
      .update(assignmentData)
      .eq('id', assignment.id)
      .select()
      .single();

    if (error) throw error;

    // Update individual problems in question_bank
    // First delete old problems for this assignment
    await db.from('question_bank').delete().eq('assignment_id', assignment.id!);
    
    // Then save updated problems
    await saveProblemsToQuestionBank(db, teacherId, assignment.id!, assignment.sections, assignment.subject, (assignment.gradeLevel || '9-12') as string);

    return mapAssignmentDetail(data);
  }
}

export async function getAssignment(assignmentId: string, teacherId: string): Promise<AssignmentDetail | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from('assignments')
    .select('*')
    .eq('id', assignmentId)
    .eq('teacher_id', teacherId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return mapAssignmentDetail(data);
}

export async function listAssignments(teacherId: string, status?: string): Promise<AssignmentSummary[]> {
  const db = getSupabase();

  let query = db.from('assignments').select('*').eq('teacher_id', teacherId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) throw error;

  return data.map(mapAssignmentSummary);
}

export async function deleteAssignment(assignmentId: string, teacherId: string): Promise<void> {
  const db = getSupabase();

  const { error } = await db
    .from('assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('teacher_id', teacherId);

  if (error) throw error;
}

export async function cloneAssignment(
  sourceAssignmentId: string,
  teacherId: string,
  newTitle: string
): Promise<AssignmentDetail> {
  // Get source assignment
  const source = await getAssignment(sourceAssignmentId, teacherId);
  if (!source) throw new Error('Source assignment not found');

  // Create new assignment based on source
  const cloned: Omit<AssignmentDetail, 'id'> = {
    ...source,
    title: newTitle,
    version: 1,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return saveAssignment(teacherId, cloned as any);
}

// ============================================================================
// QUESTION BANK OPERATIONS
// ============================================================================

export async function addToQuestionBank(
  teacherId: string,
  assignmentId: string | null,
  sectionId: string | null,
  problem: any,
  tags: string[],
  notes?: string
): Promise<QuestionBankEntry> {
  const db = getSupabase();

  // Check question bank limits
  const account = await getTeacherAccount(teacherId);
  if (!account) throw new Error('Teacher account not found');

  const tierConfig = SUBSCRIPTION_TIERS[account.subscription.tier];
  if (!tierConfig.questionBankEnabled) {
    throw new Error('Question bank is not available on your subscription tier.');
  }

  const { data, error } = await db
    .from('question_bank')
    .insert({
      teacher_id: teacherId,
      assignment_id: assignmentId,
      section_id: sectionId,
      problem,
      bloom_level: problem.bloomLevel,
      subject: problem.subject || 'General',
      grade: problem.grade || 'All',
      tags,
      notes,
    })
    .select()
    .single();

  if (error) throw error;

  // Increment question bank count
  await db
    .from('teacher_accounts')
    .update({
      question_bank_count: (
        await db.from('question_bank').select('id').eq('teacher_id', teacherId)
      ).data?.length || 1,
    })
    .eq('user_id', teacherId);

  return mapQuestionBankEntry(data);
}

export async function searchQuestionBank(
  teacherId: string,
  filters?: QuestionBankFilter
): Promise<QuestionBankEntry[]> {
  const db = getSupabase();

  let query = db.from('question_bank').select('*').eq('teacher_id', teacherId);

  if (filters?.bloomLevels?.length) {
    query = query.in('bloom_level', filters.bloomLevels);
  }
  if (filters?.subjects?.length) {
    query = query.in('subject', filters.subjects);
  }
  if (filters?.grades?.length) {
    query = query.in('grade', filters.grades);
  }
  if (filters?.isFavorite) {
    query = query.eq('is_favorite', true);
  }
  if (filters?.searchText) {
    query = query.ilike('problem->text', `%${filters.searchText}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(mapQuestionBankEntry);
}

export async function updateQuestionBankEntry(
  entryId: string,
  teacherId: string,
  updates: Partial<QuestionBankEntry>
): Promise<QuestionBankEntry> {
  const db = getSupabase();

  const { data, error } = await db
    .from('question_bank')
    .update(updates)
    .eq('id', entryId)
    .eq('teacher_id', teacherId)
    .select()
    .single();

  if (error) throw error;

  return mapQuestionBankEntry(data);
}

// ============================================================================
// API USAGE TRACKING
// ============================================================================

export async function logApiCall(
  teacherId: string,
  action: string,
  cost: number = 1,
  assignmentId?: string,
  status: string = 'success',
  errorMessage?: string
): Promise<void> {
  const db = getSupabase();

  // Log the call
  await db.from('api_call_logs').insert({
    teacher_id: teacherId,
    action,
    cost,
    assignment_id: assignmentId,
    status,
    error_message: errorMessage,
  });

  // Update teacher account usage
  if (status === 'success') {
    const { data: account } = await db
      .from('teacher_accounts')
      .select('*')
      .eq('user_id', teacherId)
      .single();

    await db
      .from('teacher_accounts')
      .update({
        api_calls_total: (account?.api_calls_total || 0) + cost,
        api_calls_remaining: Math.max(0, (account?.api_calls_remaining || 0) - cost),
        api_calls_used_today: (account?.api_calls_used_today || 0) + cost,
      })
      .eq('user_id', teacherId);
  }
}

export async function getResourceLimitStatus(teacherId: string): Promise<ResourceLimitStatus> {
  const db = getSupabase();

  const account = await getTeacherAccount(teacherId);
  if (!account) throw new Error('Teacher account not found');

  const tierConfig = SUBSCRIPTION_TIERS[account.subscription.tier];

  // Get counts
  const assignments = await db
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacherId);

  const questions = await db
    .from('question_bank')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacherId);

  // Check if limits should be ignored
  const isDevMode = import.meta.env.DEV;
  const isDemoAccount = account.email === 'teacher@example.com';
  const shouldIgnoreLimits = isDevMode || account.isAdmin || isDemoAccount;

  return {
    tier: account.subscription.tier,
    assignmentLimit: {
      current: assignments.count || 0,
      max: tierConfig.maxAssignments,
      percentageUsed: ((assignments.count || 0) / tierConfig.maxAssignments) * 100,
      canCreate: shouldIgnoreLimits || (assignments.count || 0) < tierConfig.maxAssignments,
    },
    apiCallLimit: {
      current: account.apiUsage.totalCalls,
      max: tierConfig.monthlyApiLimit,
      percentageUsed: (account.apiUsage.totalCalls / tierConfig.monthlyApiLimit) * 100,
      canCall: shouldIgnoreLimits || account.apiUsage.callsRemaining > 0,
    },
    questionBankLimit: tierConfig.questionBankEnabled
      ? {
          current: questions.count || 0,
          max: null, // Unlimited for question bank
          percentageUsed: 0,
          canAdd: true,
        }
      : undefined,
  };
}

// ============================================================================
// HELPER FUNCTIONS (MAPPERS)
// ============================================================================

function mapTeacherAccount(accountData: any): TeacherAccount {
  return {
    id: accountData.id,
    profile: {
      id: accountData.user_id,
      email: accountData.email,
      name: accountData.name,
      schoolName: accountData.school_name,
      department: accountData.department,
      profilePhotoUrl: accountData.profile_photo_url,
      createdAt: accountData.created_at,
      updatedAt: accountData.updated_at,
    },
    email: accountData.email,
    subscription: {
      tier: accountData.subscription_tier,
      startDate: accountData.subscription_start_date,
      renewalDate: accountData.subscription_renewal_date,
      isActive: accountData.subscription_is_active,
      paymentMethodId: accountData.payment_method_id,
    },
    apiUsage: {
      totalCalls: accountData.api_calls_total,
      callsRemaining: accountData.api_calls_remaining,
      callsUsedToday: accountData.api_calls_used_today,
      resetDate: accountData.api_usage_reset_date,
      lastResetDate: accountData.last_api_reset_date,
    },
    assignmentCount: accountData.assignment_count,
    questionBankCount: accountData.question_bank_count,
    lastLogin: accountData.last_login,
    isVerified: accountData.is_verified,
    isAdmin: accountData.is_admin,
  };
}

function mapAssignmentSummary(data: any): AssignmentSummary {
  return {
    id: data.id,
    teacherId: data.teacher_id,
    title: data.title,
    subject: data.subject,
    gradeLevel: data.grade_level,
    assignmentType: data.assignment_type,
    status: data.status,
    problemCount: data.problem_count,
    estimatedTimeMinutes: data.estimated_time_minutes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    sourceFileName: data.source_file_name,
    version: data.version,
    isTemplate: data.is_template,
    tags: data.tags || [],
  };
}

function mapAssignmentDetail(data: any): AssignmentDetail {
  const content = data.content || {};
  return {
    id: data.id,
    teacherId: data.teacher_id,
    title: data.title,
    subject: data.subject,
    gradeLevel: data.grade_level,
    assignmentType: data.assignment_type,
    status: data.status,
    problemCount: data.problem_count,
    estimatedTimeMinutes: data.estimated_time_minutes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    sourceFileName: data.source_file_name,
    version: data.version,
    isTemplate: data.is_template,
    tags: data.tags || [],
    specifications: data.specifications || {
      title: data.title,
      instructions: '',
      subject: data.subject,
      gradeLevel: data.grade_level,
      assignmentType: data.assignment_type,
      assessmentType: 'general',
      estimatedTime: data.estimated_time_minutes,
      difficulty: 'medium',
    },
    sections: content.sections || [],
    metadata: {
      bloomDistribution: data.bloom_distribution,
      sourceFile: data.source_file_name,
    },
    // Preserve the full GeneratedAssignment in content field
    content: content,
  };
}

function mapQuestionBankEntry(data: any): QuestionBankEntry {
  return {
    id: data.id,
    teacherId: data.teacher_id,
    problem: data.problem,
    assignmentId: data.assignment_id,
    sectionId: data.section_id,
    tags: data.tags || [],
    bloomLevel: data.bloom_level,
    subject: data.subject,
    grade: data.grade,
    createdAt: data.created_at,
    lastUsed: data.last_used,
    usageCount: data.usage_count,
    isFavorite: data.is_favorite,
    notes: data.notes,
    similarQuestionIds: data.similar_question_ids,
  };
}

// ============================================================================
// UNIVERSAL PROBLEM OPERATIONS
// ============================================================================

export async function saveUniversalProblem(
  teacherId: string,
  problem: UniversalProblem,
  assignmentId?: string
): Promise<UniversalProblem> {
  const db = getSupabase();

  const data = {
    problem_id: problem.problemId,
    document_id: problem.documentId,
    subject: problem.subject,
    section_id: problem.sectionId,
    parent_problem_id: problem.parentProblemId,
    content: problem.content,
    cognitive: problem.cognitive,
    classification: problem.classification,
    structure: problem.structure,
    analysis: problem.analysis,
    version: problem.version || '1.0',
    assignment_id: assignmentId,
    teacher_id: teacherId,
  };

  const { data: saved, error } = await db
    .from('universal_problems')
    .insert(data)
    .select()
    .single();

  if (error) throw error;

  return mapUniversalProblem(saved);
}

export async function getUniversalProblem(problemId: string): Promise<UniversalProblem | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from('universal_problems')
    .select('*')
    .eq('problem_id', problemId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapUniversalProblem(data) : null;
}

export async function updateUniversalProblemContent(
  problemId: string,
  newContent: string,
  newVersion: string,
  teacherId: string
): Promise<UniversalProblem> {
  const db = getSupabase();

  // Get current problem
  const current = await getUniversalProblem(problemId);
  if (!current) throw new Error(`Problem ${problemId} not found`);

  // Update content and version
  const { data, error } = await db
    .from('universal_problems')
    .update({
      content: newContent,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('problem_id', problemId)
    .select()
    .single();

  if (error) throw error;

  // Log version change
  await logProblemVersion(current.problemId, newVersion, newContent, teacherId, 'rewriter', 'Content updated');

  return mapUniversalProblem(data);
}

async function logProblemVersion(
  problemId: string,
  version: string,
  content: string,
  createdBy: string,
  createdType: string,
  changeDescription: string
): Promise<void> {
  const db = getSupabase();

  // Get universal_problem_id
  const { data: problem } = await db
    .from('universal_problems')
    .select('id')
    .eq('problem_id', problemId)
    .single();

  if (!problem) return;

  const { error } = await db.from('problem_versions').insert({
    universal_problem_id: problem.id,
    version_number: version,
    created_by: createdType,
    change_description: changeDescription,
    problem_snapshot: { problemId, content, version },
    immutable_fields_locked: true,
  });

  if (error) console.error('Failed to log problem version:', error);
}

// ============================================================================
// ASTRONAUT OPERATIONS
// ============================================================================

export async function saveAstronautProfile(
  teacherId: string,
  astronaut: Astronaut,
  isTemplate: boolean = false
): Promise<SavedAstronautProfile> {
  const db = getSupabase();

  const data = {
    student_id: astronaut.studentId,
    persona_name: astronaut.personaName,
    teacher_id: teacherId,
    is_template: isTemplate,
    overlays: astronaut.overlays,
    narrative_tags: astronaut.narrativeTags,
    profile_traits: astronaut.profileTraits,
    grade_level: astronaut.gradeLevel,
    is_accessibility_profile: astronaut.isAccessibilityProfile,
  };

  const { data: saved, error } = await db
    .from('astronauts')
    .insert(data)
    .select()
    .single();

  if (error) throw error;

  return mapSavedAstronautProfile(saved);
}

export async function getAstronautProfile(id: string): Promise<SavedAstronautProfile | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from('astronauts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSavedAstronautProfile(data) : null;
}

export async function listAstronauts(
  teacherId: string,
  filters?: AstronautFilter
): Promise<SavedAstronautProfile[]> {
  const db = getSupabase();

  let query = db.from('astronauts').select('*').eq('teacher_id', teacherId);

  if (filters?.overlays?.length) {
    query = query.contains('overlays', filters.overlays);
  }
  if (filters?.gradeLevel) {
    query = query.eq('grade_level', filters.gradeLevel);
  }
  if (filters?.isAccessibilityProfile !== undefined) {
    query = query.eq('is_accessibility_profile', filters.isAccessibilityProfile);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapSavedAstronautProfile);
}

export async function deleteAstronautProfile(id: string): Promise<void> {
  const db = getSupabase();

  const { error } = await db.from('astronauts').delete().eq('id', id);

  if (error) throw error;
}

// ============================================================================
// SIMULATION OPERATIONS
// ============================================================================

export async function saveSimulationBatch(
  assignmentId: string,
  teacherId: string,
  batch: AssignmentSimulationBatch
): Promise<AssignmentSimulationResult> {
  const db = getSupabase();

  // Create simulation batch record
  const { data: batchData, error: batchError } = await db
    .from('simulation_batches')
    .insert({
      assignment_id: assignmentId,
      teacher_id: teacherId,
      batch_name: `Simulation ${new Date().toISOString()}`,
      timestamp: batch.timestamp,
      astronaut_ids: batch.studentSimulations.map((s) => s.studentId),
      results_summary: batch.classSummary,
    })
    .select()
    .single();

  if (batchError) throw batchError;

  // Save individual student simulations
  for (const studentSim of batch.studentSimulations) {
    const { error: simError } = await db.from('student_assignment_simulations').insert({
      simulation_batch_id: batchData.id,
      astronaut_id: studentSim.studentId, // Must match astronaut ID
      assignment_id: assignmentId,
      simulation_results: studentSim,
      total_time_minutes: studentSim.totalTimeMinutes,
      estimated_score: studentSim.estimatedScore,
      estimated_grade: studentSim.estimatedGrade,
      at_risk: studentSim.atRisk,
    });

    if (simError) console.error('Failed to save student simulation:', simError);
  }

  return {
    id: batchData.id,
    assignmentId,
    teacherId,
    simulationBatch: batch,
    createdAt: new Date().toISOString(),
  };
}

export async function getSimulationHistory(
  assignmentId: string,
  teacherId: string
): Promise<SimulationHistory> {
  const db = getSupabase();

  const { data, error } = await db
    .from('simulation_batches')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const simulations = (data || []).map((batch) => ({
    id: batch.id,
    assignmentId: batch.assignment_id,
    teacherId: batch.teacher_id,
    simulationBatch: {
      assignmentId: batch.assignment_id,
      timestamp: batch.timestamp,
      studentSimulations: [],
      classSummary: batch.results_summary,
    },
    createdAt: batch.created_at,
  }));

  return {
    assignmentId,
    simulations,
  };
}

export async function getLatestSimulation(assignmentId: string): Promise<AssignmentSimulationResult | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from('simulation_batches')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    assignmentId: data.assignment_id,
    teacherId: data.teacher_id,
    simulationBatch: {
      assignmentId: data.assignment_id,
      timestamp: data.timestamp,
      studentSimulations: [],
      classSummary: data.results_summary,
    },
    createdAt: data.created_at,
  };
}

// ============================================================================
// INVARIANT ENFORCEMENT
// ============================================================================

export async function validateAndEnforceInvariants(
  original: UniversalProblem,
  updated: UniversalProblem
): Promise<{ valid: boolean; violations: string[] }> {
  const result = validateProblemInvariants(original, updated);

  if (!result.valid) {
    const db = getSupabase();
    // Log violation
    await db.from('invariant_violations').insert({
      problem_id: original.problemId,
      violation_type: 'immutable_field_changed',
      violation_description: result.violations.join('; '),
      original_value: original,
      attempted_value: updated,
      detected_by: 'system',
    });
  }

  return result;
}

// ============================================================================
// MAPPING FUNCTIONS
// ============================================================================

function mapUniversalProblem(data: any): UniversalProblem {
  return {
    problemId: data.problem_id,
    documentId: data.document_id,
    subject: data.subject,
    sectionId: data.section_id,
    parentProblemId: data.parent_problem_id,
    content: data.content,
    cognitive: data.cognitive,
    classification: data.classification,
    structure: data.structure,
    analysis: data.analysis,
    version: data.version,
  };
}

function mapSavedAstronautProfile(data: any): SavedAstronautProfile {
  return {
    id: data.id,
    teacherId: data.teacher_id,
    astronaut: {
      studentId: data.student_id,
      personaName: data.persona_name,
      overlays: data.overlays || [],
      narrativeTags: data.narrative_tags || [],
      profileTraits: data.profile_traits,
      gradeLevel: data.grade_level,
      isAccessibilityProfile: data.is_accessibility_profile,
    },
    isTemplate: data.is_template,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    usageCount: data.usage_count,
  };
}

// ============================================================================
// PROBLEM BANK OPERATIONS (Full UniversalProblem Storage)
// ============================================================================
// These functions handle storage of complete UniversalProblem objects with
// immutable field locking to prevent schema drift and ID instability.

export async function saveToProblemBank(
  teacherId: string,
  problem: UniversalProblem,
  isFavorite: boolean = false,
  sourceAssignmentId?: string
): Promise<string> {
  const db = getSupabase();

  // Validate problem before storing
  const validation = validateProblemInvariants(problem);
  if (!validation.isValid) {
    throw new Error(`Problem validation failed: ${validation.errors.join(', ')}`);
  }

  const { data, error } = await db
    .from('problem_bank')
    .insert({
      teacher_id: teacherId,
      problem: problem,
      is_favorite: isFavorite,
      usage_count: 0,
      used_in_assignment_ids: [],
      source_assignment_id: sourceAssignmentId,
      immutable_lock: {
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
        lockedLayers: {
          cognitive: false,
          classification: false,
          structure: false,
        },
      },
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Upsert problem to problem_bank, avoiding duplicates across rewrites.
 * If problem already exists (same teacher + document + problemId), updates it.
 * Otherwise creates new entry.
 * 
 * Only the latest version is kept per (teacher_id, source_document_id, original_problem_id).
 */
export async function upsertProblemToProblemBank(
  teacherId: string,
  problem: UniversalProblem,
  sourceDocumentId: string,
  sourceAssignmentId: string,
  createdBy: string
): Promise<string> {
  const db = getSupabase();

  // Validate problem before storing
  const validation = validateProblemInvariants(problem);
  if (!validation.isValid) {
    throw new Error(`Problem validation failed: ${validation.errors.join(', ')}`);
  }

  const problemId = problem.problemId;

  // Upsert: use ON CONFLICT to update if already exists
  const { data, error } = await db
    .from('problem_bank')
    .upsert(
      {
        teacher_id: teacherId,
        problem: problem,
        original_problem_id: problemId,
        source_document_id: sourceDocumentId,
        source_assignment_id: sourceAssignmentId,
        created_by: createdBy,
        is_favorite: false,
        usage_count: 0,
        used_in_assignment_ids: [],
        immutable_lock: {
          isLocked: false,
          lockedAt: null,
          lockedReason: null,
          lockedLayers: {
            cognitive: false,
            classification: false,
            structure: false,
          },
        },
      },
      {
        onConflict: 'unique_problem_per_document',
        ignoreDuplicates: false,
      }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getProblemBankEntry(
  entryId: string,
  teacherId?: string
): Promise<any | null> {
  const db = getSupabase();

  let query = db
    .from('problem_bank')
    .select('*')
    .eq('id', entryId);

  if (teacherId) {
    query = query.eq('teacher_id', teacherId);
  }

  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  return data || null;
}

interface ProblemBankFilter {
  isFavoriteOnly?: boolean;
  subject?: string;
  gradeLevel?: number;
  bloomLevel?: string;
}

export async function searchProblemBank(
  teacherId: string,
  filters?: ProblemBankFilter,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  const db = getSupabase();

  let query = db
    .from('problem_bank')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.isFavoriteOnly) {
    query = query.eq('is_favorite', true);
  }

  if (filters?.subject) {
    query = query.eq('problem->>subject', filters.subject);
  }

  if (filters?.bloomLevel) {
    query = query.eq('problem->cognitive->>bloomLevel', filters.bloomLevel);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function assembleProblemForAssignment(
  entryId: string,
  newProblemId: string,
  newSectionId: string,
  newAssignmentId: string,
  teacherId?: string
): Promise<UniversalProblem> {
  const db = getSupabase();

  // Fetch the problem bank entry
  const entry = await getProblemBankEntry(entryId, teacherId);
  if (!entry) {
    throw new Error(`Problem bank entry ${entryId} not found`);
  }

  const originalProblem = entry.problem as UniversalProblem;

  // Create re-sequenced problem (preserve cognitive/classification, update IDs)
  const resequencedProblem: UniversalProblem = {
    ...originalProblem,
    problemId: newProblemId,
    sectionId: newSectionId,
  };

  // Log the assembly operation
  const { data: assemblyRecord, error: assemblyError } = await db
    .from('problem_bank_assembly')
    .insert({
      teacher_id: teacherId,
      problem_bank_entry_id: entryId,
      original_problem_id: originalProblem.problemId,
      new_problem_id: newProblemId,
      new_section_id: newSectionId,
      assignment_id: newAssignmentId,
      resequencing_map: {
        oldProblemId: originalProblem.problemId,
        newProblemId: newProblemId,
        oldSectionId: originalProblem.sectionId,
        newSectionId: newSectionId,
      },
      validation_status: 'passed',
    })
    .select('id')
    .single();

  if (assemblyError) throw assemblyError;

  // Update problem bank entry usage
  const { error: updateError } = await db
    .from('problem_bank')
    .update({
      usage_count: entry.usage_count + 1,
      used_in_assignment_ids: [...(entry.used_in_assignment_ids || []), newAssignmentId],
      last_used: new Date().toISOString(),
    })
    .eq('id', entryId);

  if (updateError) throw updateError;

  return resequencedProblem;
}

export async function lockProblemAsImmutable(
  entryId: string,
  reason: string = 'Analyzer completed'
): Promise<void> {
  const db = getSupabase();

  const { error } = await db
    .from('problem_bank')
    .update({
      immutable_lock: {
        isLocked: true,
        lockedAt: new Date().toISOString(),
        lockedReason: reason,
        lockedLayers: {
          cognitive: true,
          classification: true,
          structure: true,
        },
      },
    })
    .eq('id', entryId);

  if (error) throw error;
}

export async function logImmutabilityViolation(
  entryId: string,
  fieldName: string,
  attemptedValue: any,
  reason: string,
  teacherId: string
): Promise<void> {
  const db = getSupabase();

  const { error } = await db
    .from('immutability_violations')
    .insert({
      teacher_id: teacherId,
      problem_bank_entry_id: entryId,
      field_name: fieldName,
      attempted_value: attemptedValue,
      reason: reason,
    });

  if (error) throw error;
}

export async function getProblemBankAssemblyHistory(
  entryId: string,
  limit: number = 50
): Promise<any[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from('problem_bank_assembly')
    .select('*')
    .eq('problem_bank_entry_id', entryId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================================================
// ASSESSMENT POST-ANALYSIS
// ============================================================================

export async function submitAssessmentResults(
  teacherId: string,
  assignmentId: string,
  submission: any
): Promise<void> {
  const db = getSupabase();

  const { error } = await db
    .from('assessment_submissions')
    .insert({
      teacher_id: teacherId,
      assignment_id: assignmentId,
      student_id: submission.studentId,
      student_name: submission.studentName,
      submitted_at: new Date().toISOString(),
      completion_time_minutes: submission.completionTimeMinutes,
      total_score: submission.totalScore,
      correct_count: submission.correctCount,
      total_problems: submission.totalProblems,
      problem_results: submission.problemResults,
    });

  if (error) throw error;
}

export async function getAssessmentStats(
  assignmentId: string
): Promise<any> {
  // Mock implementation - in production, this would aggregate real submission data
  // For now, returns a sample stats structure
  return {
    assignmentId,
    totalSubmissions: 0,
    scoreRange: {
      min: 0,
      max: 100,
      average: 0,
      median: 0,
    },
    timeRange: {
      minMinutes: 0,
      maxMinutes: 0,
      averageMinutes: 0,
      medianMinutes: 0,
    },
    problemStats: [],
    bloomPerformance: {},
    recommendations: {
      problemsNeedingRework: [],
      bloomLevelsNeedingRebalance: [],
      suggestedActions: [],
    },
  };
}

export async function createRewriteJob(
  assignmentId: string,
  teacherId: string,
  stats: any
): Promise<void> {
  const db = getSupabase();

  const { error } = await db
    .from('assessment_analysis_jobs')
    .insert({
      assignment_id: assignmentId,
      teacher_id: teacherId,
      job_type: 'rewrite-assessment',
      stats,
      status: 'queued',
      created_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function createTrainWriterJob(
  assignmentId: string,
  teacherId: string,
  stats: any
): Promise<void> {
  const db = getSupabase();

  const { error } = await db
    .from('assessment_analysis_jobs')
    .insert({
      assignment_id: assignmentId,
      teacher_id: teacherId,
      job_type: 'train-writer',
      stats,
      status: 'queued',
      created_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export default {
  initializeSupabase,
  getSupabase,
  createTeacherAccount,
  getTeacherAccount,
  updateSubscriptionTier,
  saveAssignment,
  getAssignment,
  listAssignments,
  deleteAssignment,
  cloneAssignment,
  addToQuestionBank,
  searchQuestionBank,
  updateQuestionBankEntry,
  logApiCall,
  getResourceLimitStatus,
  // Universal Problems
  saveUniversalProblem,
  getUniversalProblem,
  updateUniversalProblemContent,
  // Astronauts
  saveAstronautProfile,
  getAstronautProfile,
  listAstronauts,
  deleteAstronautProfile,
  // Simulations
  saveSimulationBatch,
  getSimulationHistory,
  getLatestSimulation,
  // Invariant Enforcement
  validateAndEnforceInvariants,
  // Problem Bank (Full UniversalProblem Storage)
  saveToProblemBank,
  upsertProblemToProblemBank,
  getProblemBankEntry,
  searchProblemBank,
  assembleProblemForAssignment,
  lockProblemAsImmutable,
  logImmutabilityViolation,
  getProblemBankAssemblyHistory,
  // Assessment Post-Analysis
  submitAssessmentResults,
  getAssessmentStats,
  createRewriteJob,
  createTrainWriterJob,
};
