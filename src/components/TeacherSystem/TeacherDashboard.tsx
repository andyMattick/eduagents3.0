import React, { useState, useEffect } from 'react';
import { getTeacherAccount, listAssignments, getResourceLimitStatus, deleteAssignment, getAssessmentStats, createRewriteJob, createTrainWriterJob } from '../../services/teacherSystemService';
import { TeacherAccount, AssignmentSummary, ResourceLimitStatus, SUBSCRIPTION_TIERS, AssessmentStats } from '../../types/teacherSystem';
import { useUserFlow } from '../../hooks/useUserFlow';
import { AssessmentResults } from './AssessmentResults';
import './TeacherDashboard.css';

interface TeacherDashboardProps {
  teacherId: string;
  onNavigate: (page: string, data?: any) => void;
}

interface DeleteConfirmation {
  assignmentId: string;
  assignmentTitle: string;
}

interface AssessmentView {
  assignmentId: string;
  assignment: AssignmentSummary;
  stats: AssessmentStats;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacherId, onNavigate }) => {
  const [account, setAccount] = useState<TeacherAccount | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [limits, setLimits] = useState<ResourceLimitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'finalized'>('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [assessmentView, setAssessmentView] = useState<AssessmentView | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const { reset } = useUserFlow();

  useEffect(() => {
    loadDashboardData();
  }, [teacherId]);

  async function loadDashboardData() {
    try {
      setIsLoading(true);
      const [accountData, assignmentsData, limitsData] = await Promise.all([
        getTeacherAccount(teacherId),
        listAssignments(teacherId),
        getResourceLimitStatus(teacherId),
      ]);

      setAccount(accountData);
      setAssignments(assignmentsData);
      setLimits(limitsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteAssignment(assignmentId, teacherId);
      
      // Remove from local state
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      setDeleteConfirmation(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete assignment');
    } finally {
      setIsDeleting(false);
    }
  }

  function openDeleteConfirmation(assignmentId: string, assignmentTitle: string) {
    setDeleteConfirmation({ assignmentId, assignmentTitle });
    setDeleteError(null);
  }

  function closeDeleteConfirmation() {
    setDeleteConfirmation(null);
    setDeleteError(null);
  }

  async function viewAssessmentResults(assignment: AssignmentSummary) {
    try {
      setIsLoadingStats(true);
      const stats = await getAssessmentStats(assignment.id);
      setAssessmentView({
        assignmentId: assignment.id,
        assignment,
        stats,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment stats');
    } finally {
      setIsLoadingStats(false);
    }
  }

  function closeAssessmentView() {
    setAssessmentView(null);
  }

  async function handleRewriteAssessment() {
    if (!assessmentView) return;
    try {
      setIsLoadingStats(true);
      await createRewriteJob(assessmentView.assignmentId, teacherId, assessmentView.stats);
      setError(null);
      // Show success message - in production, would show a real notification
      alert('Rewrite job created! The system will generate an improved version of this assessment.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rewrite job');
    } finally {
      setIsLoadingStats(false);
    }
  }

  async function handleTrainWriter() {
    if (!assessmentView) return;
    try {
      setIsLoadingStats(true);
      await createTrainWriterJob(assessmentView.assignmentId, teacherId, assessmentView.stats);
      setError(null);
      // Show success message
      alert('Training job created! The system will learn from this assessment data.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create training job');
    } finally {
      setIsLoadingStats(false);
    }
  }

  if (isLoading) {
    return <div className="dashboard-container loading">Loading your dashboard...</div>;
  }

  // Show assessment results view if selected
  if (assessmentView) {
    return (
      <div className="dashboard-container">
        <button
          onClick={closeAssessmentView}
          className="btn-back"
          style={{ marginBottom: '1rem' }}
        >
          ← Back to Dashboard
        </button>
        <AssessmentResults
          assignment={assessmentView.assignment}
          stats={assessmentView.stats}
          onRewriteAssessment={handleRewriteAssessment}
          onTrainWriter={handleTrainWriter}
          isLoading={isLoadingStats}
        />
      </div>
    );
  }

  if (error || !account || !limits) {
    return (
      <div className="dashboard-container error">
        <h2>Error Loading Dashboard</h2>
        <p>{error || 'Failed to load dashboard data'}</p>
        <button onClick={loadDashboardData} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const filteredAssignments =
    activeTab === 'all' ? assignments : assignments.filter(a => a.status === activeTab);

  const tierConfig = SUBSCRIPTION_TIERS[account.subscription.tier];
  const apiUsagePercent = limits.apiCallLimit.percentageUsed;
  const assignmentUsagePercent = limits.assignmentLimit.percentageUsed;
  const canCreateAssignment = limits.assignmentLimit.canCreate;
  const canCallApi = limits.apiCallLimit.canCall;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-welcome">
          <h1>Welcome, {account.profile.name}</h1>
          <p className="school-name">{account.profile.schoolName || 'No school added'}</p>
        </div>
        <div className="header-tier">
          <span className="subscription-badge">{tierConfig.displayName} Plan</span>
          <button
            onClick={() => onNavigate('upgrade')}
            className="btn-link"
          >
            Upgrade
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{assignments.length}</div>
            <div className="stat-label">Assignments</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <div className="stat-value">{account.questionBankCount}</div>
            <div className="stat-label">Saved Questions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">{account.apiUsage.callsRemaining || 0}</div>
            <div className="stat-label">API Calls Remaining</div>
          </div>
        </div>
      </section>

      {/* API Usage Bar */}
      <section className="usage-section">
        <div className="usage-header">
          <h2>API Usage This Month</h2>
          <p className="usage-period">
            {Math.floor(apiUsagePercent)}% of {tierConfig.monthlyApiLimit} calls used
          </p>
        </div>
        <div className="usage-bar">
          <div
            className={`usage-fill ${apiUsagePercent > 90 ? 'critical' : apiUsagePercent > 70 ? 'warning' : ''}`}
            style={{ width: `${Math.min(apiUsagePercent, 100)}%` }}
          />
        </div>
        <div className="usage-details">
          <div className="usage-stat">
            <span className="label">Calls Used:</span>
            <span className="value">{limits.apiCallLimit.current}</span>
          </div>
          <div className="usage-stat">
            <span className="label">Calls Remaining:</span>
            <span className="value" style={{ color: canCallApi ? '#4CAF50' : '#f44336' }}>
              {account.apiUsage.callsRemaining}
            </span>
          </div>
          <div className="usage-stat">
            <span className="label">Resets:</span>
            <span className="value">{new Date(account.apiUsage.resetDate).toLocaleDateString()}</span>
          </div>
        </div>

        {!canCallApi && (
          <div className="warning-banner">
            <strong>⚠️ API Quota Exhausted</strong>
            <p>You've reached your monthly API limit. AI features are temporarily disabled.</p>
            <button onClick={() => onNavigate('upgrade')} className="btn-secondary">
              Upgrade Subscription
            </button>
          </div>
        )}

        {apiUsagePercent > 70 && canCallApi && (
          <div className="info-banner">
            <strong>ℹ️ Approaching API Limit</strong>
            <p>You're using {Math.floor(apiUsagePercent)}% of your monthly quota.</p>
          </div>
        )}
      </section>

      {/* Assignments Section */}
      <section className="assignments-section">
        <div className="assignments-header">
          <div>
            <h2>Your Assignments</h2>
            <p className="assignment-count">
              {limits.assignmentLimit.current} of {limits.assignmentLimit.max} assignments
            </p>
          </div>
          <button
            onClick={() => {
              reset();
              onNavigate('pipeline');
            }}
            className="btn-primary"
            disabled={!canCreateAssignment}
            title={!canCreateAssignment ? `Assignment limit of ${tierConfig.maxAssignments} reached` : ''}
          >
            + Create New
          </button>
        </div>

        {!canCreateAssignment && (
          <div className="warning-banner">
            <strong>⚠️ Assignment Limit Reached</strong>
            <p>You've reached your assignment limit of {tierConfig.maxAssignments}.</p>
            <button onClick={() => onNavigate('upgrade')} className="btn-secondary">
              Upgrade for More
            </button>
          </div>
        )}

        {/* Tab Filter */}
        <div className="tab-filter">
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({assignments.length})
          </button>
          <button
            className={`tab ${activeTab === 'draft' ? 'active' : ''}`}
            onClick={() => setActiveTab('draft')}
          >
            Drafts ({assignments.filter(a => a.status === 'draft').length})
          </button>
          <button
            className={`tab ${activeTab === 'finalized' ? 'active' : ''}`}
            onClick={() => setActiveTab('finalized')}
          >
            Finalized ({assignments.filter(a => a.status === 'finalized').length})
          </button>
        </div>

        {/* Assignments List */}
        {filteredAssignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>No {activeTab !== 'all' ? activeTab : ''} assignments yet</h3>
            <p>Create your first assignment to get started with AI-powered assessment design.</p>
            <button
              onClick={() => onNavigate('create-assignment')}
              className="btn-primary"
              disabled={!canCreateAssignment}
            >
              Create Your First Assignment
            </button>
          </div>
        ) : (
          <div className="assignments-grid">
            {filteredAssignments.map(assignment => (
              <div key={assignment.id} className="assignment-card">
                <div className="card-header">
                  <h3>{assignment.title}</h3>
                  <span className={`status-badge status-${assignment.status}`}>
                    {assignment.status}
                  </span>
                </div>
                <div className="card-meta">
                  <div className="meta-item">
                    <span className="label">Subject:</span>
                    <span className="value">{assignment.subject}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Grade:</span>
                    <span className="value">{assignment.gradeLevel}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Type:</span>
                    <span className="value">{assignment.assignmentType}</span>
                  </div>
                </div>
                <div className="card-stats">
                  <div className="stat">
                    <span className="icon">❓</span>
                    <span>{assignment.problemCount} questions</span>
                  </div>
                  <div className="stat">
                    <span className="icon">⏱️</span>
                    <span>{assignment.estimatedTimeMinutes} min</span>
                  </div>
                </div>
                <div className="card-footer">
                  <small>Updated {new Date(assignment.updatedAt).toLocaleDateString()}</small>
                </div>
                <div className="card-actions">
                  {assignment.status === 'finalized' && (
                    <button
                      onClick={() => viewAssessmentResults(assignment)}
                      className="btn-secondary btn-sm btn-results"
                      title="View assessment results and stats"
                    >
                      📊 Results
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate('edit-assignment', { assignmentId: assignment.id })}
                    className="btn-secondary btn-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onNavigate('clone-assignment', { assignmentId: assignment.id })}
                    className="btn-secondary btn-sm"
                  >
                    Clone
                  </button>
                  <button
                    onClick={() => onNavigate('view-assignment', { assignmentId: assignment.id })}
                    className="btn-secondary btn-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openDeleteConfirmation(assignment.id, assignment.title)}
                    className="btn-secondary btn-sm btn-delete"
                    title="Delete this assignment"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="quick-links">
        <h2>Quick Actions</h2>
        <div className="links-grid">
          <button
            onClick={() => onNavigate('analytics')}
            className="quick-link"
            disabled={!tierConfig.advancedAnalyticsEnabled}
            title={!tierConfig.advancedAnalyticsEnabled ? 'Available on Pro and above' : ''}
          >
            <div className="link-icon">📈</div>
            <div className="link-text">Analytics</div>
          </button>
          <button
            onClick={() => onNavigate('account-settings')}
            className="quick-link"
          >
            <div className="link-icon">⚙️</div>
            <div className="link-text">Settings</div>
          </button>
          <button
            onClick={() => onNavigate('help')}
            className="quick-link"
          >
            <div className="link-icon">❓</div>
            <div className="link-text">Help & Support</div>
          </button>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="modal-overlay" onClick={closeDeleteConfirmation}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Assignment?</h2>
            <p>
              Are you sure you want to delete <strong>{deleteConfirmation.assignmentTitle}</strong>? This action cannot be undone.
            </p>
            {deleteError && (
              <div className="error-message">
                <p>Error: {deleteError}</p>
              </div>
            )}
            <div className="modal-actions">
              <button
                onClick={closeDeleteConfirmation}
                className="btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAssignment(deleteConfirmation.assignmentId)}
                className="btn-danger"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
