/**
 * Teacher System API Service
 * 
 * Bridge between frontend and Supabase backend for:
 * - Teacher accounts and authentication
 * - Assignment storage and management
 * - Question bank operations
 * - API usage tracking
 * - Subscription management
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
} from '../types/teacherSystem';

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

  // Check assignment limits
  if (isNew) {
    const account = await getTeacherAccount(teacherId);
    if (!account) throw new Error('Teacher account not found');

    const tierConfig = SUBSCRIPTION_TIERS[account.subscription.tier];
    if (account.assignmentCount >= tierConfig.maxAssignments) {
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
      .eq('profile_id', teacherId);

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
    await db.from('question_bank').delete().eq('assignment_id', assignment.id);
    
    // Then save updated problems
    await saveProblemsToQuestionBank(db, teacherId, assignment.id, assignment.sections, assignment.subject, assignment.gradeLevel || '9-12');

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
    .eq('profile_id', teacherId);

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
      .eq('profile_id', teacherId)
      .single();

    await db
      .from('teacher_accounts')
      .update({
        api_calls_total: (account?.api_calls_total || 0) + cost,
        api_calls_remaining: Math.max(0, (account?.api_calls_remaining || 0) - cost),
        api_calls_used_today: (account?.api_calls_used_today || 0) + cost,
      })
      .eq('profile_id', teacherId);
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

  return {
    tier: account.subscription.tier,
    assignmentLimit: {
      current: assignments.count || 0,
      max: tierConfig.maxAssignments,
      percentageUsed: ((assignments.count || 0) / tierConfig.maxAssignments) * 100,
      canCreate: (assignments.count || 0) < tierConfig.maxAssignments,
    },
    apiCallLimit: {
      current: account.apiUsage.totalCalls,
      max: tierConfig.monthlyApiLimit,
      percentageUsed: (account.apiUsage.totalCalls / tierConfig.monthlyApiLimit) * 100,
      canCall: account.apiUsage.callsRemaining > 0,
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
};
