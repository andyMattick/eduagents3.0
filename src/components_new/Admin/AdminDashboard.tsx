import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../services/teacherSystemService';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '../../types/teacherSystem';
import './AdminDashboard.css';

interface TeacherSummary {
  id: string;
  email: string;
  name: string;
  school_name?: string;
  subscription_tier: string;
  assignment_count: number;
  last_login?: string;
  is_verified: boolean;
}

interface AssignmentPreview {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherSummary | null>(null);
  const [selectedTeacherAssignments, setSelectedTeacherAssignments] = useState<AssignmentPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setIsLoading(true);
      const db = getSupabase();
      
      const { data, error: err } = await db
        .from('teacher_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) {
        // Gracefully handle CORS/network errors
        console.debug('loadTeachers error:', err);
        setTeachers([]);
        setError(null);
        return;
      }
      
      setTeachers(data || []);
      setError(null);
    } catch (err) {
      // Gracefully handle CORS/network errors
      console.debug('loadTeachers network error:', err);
      setTeachers([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeacherAssignments = async (teacherId: string) => {
    try {
      setIsLoadingAssignments(true);
      const db = getSupabase();
      
      const { data, error: err } = await db
        .from('assignments')
        .select('id, title, description, status, created_at')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (err) {
        // Gracefully handle CORS/network errors
        console.debug('loadTeacherAssignments error:', err);
        setSelectedTeacherAssignments([]);
        return;
      }
      
      setSelectedTeacherAssignments(data || []);
    } catch (err) {
      // Gracefully handle CORS/network errors
      console.debug('loadTeacherAssignments network error:', err);
      setSelectedTeacherAssignments([]);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const handleSelectTeacher = (teacher: TeacherSummary) => {
    setSelectedTeacher(teacher);
    loadTeacherAssignments(teacher.id);
  };

  const totalAssignments = teachers.reduce((sum, t) => sum + (t.assignment_count || 0), 0);
  const verifiedTeachers = teachers.filter(t => t.is_verified).length;

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1>👨‍💼 Admin Dashboard</h1>
            <p>Teacher Management & System Overview</p>
          </div>
          <button onClick={onLogout} className="logout-button">
            Sign Out
          </button>
        </div>
      </header>

      <div className="admin-container">
        {/* Quick Stats */}
        <section className="admin-stats">
          <div className="stat-card">
            <div className="stat-number">{teachers.length}</div>
            <div className="stat-label">Total Teachers</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{verifiedTeachers}</div>
            <div className="stat-label">Verified Teachers</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalAssignments}</div>
            <div className="stat-label">Total Assignments</div>
          </div>
        </section>

        <div className="admin-content-layout">
          {/* Teachers Table */}
          <section className="admin-teachers">
            <div className="section-header">
              <h2>Teachers</h2>
              <button onClick={loadTeachers} className="refresh-button">
                🔄 Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="loading">Loading teachers...</div>
            ) : error ? (
              <div className="error">
                <p>{error}</p>
                <button onClick={loadTeachers}>Retry</button>
              </div>
            ) : teachers.length === 0 ? (
              <div className="empty">No teachers yet</div>
            ) : (
              <table className="teachers-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>School</th>
                    <th>Plan</th>
                    <th>Assignments</th>
                    <th>Status</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => {
                    const tierConfig = SUBSCRIPTION_TIERS[teacher.subscription_tier as SubscriptionTier] || { displayName: teacher.subscription_tier };
                    const isSelected = selectedTeacher?.id === teacher.id;
                    return (
                      <tr 
                        key={teacher.id}
                        className={`teacher-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectTeacher(teacher)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="name">{teacher.name}</td>
                        <td className="email">{teacher.email}</td>
                        <td>{teacher.school_name || '—'}</td>
                        <td>
                          <span className={`badge badge-${teacher.subscription_tier}`}>
                            {tierConfig?.displayName || teacher.subscription_tier}
                          </span>
                        </td>
                        <td className="center">{teacher.assignment_count || 0}</td>
                        <td>
                          <span className={`status ${teacher.is_verified ? 'verified' : 'unverified'}`}>
                            {teacher.is_verified ? '✓ Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="date">
                          {teacher.last_login
                            ? new Date(teacher.last_login).toLocaleDateString()
                            : 'Never'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Teacher Detail Panel */}
          {selectedTeacher && (
            <section className="admin-teacher-detail">
              <div className="detail-header">
                <h2>{selectedTeacher.name}'s Assignments</h2>
                <button 
                  className="close-button"
                  onClick={() => {
                    setSelectedTeacher(null);
                    setSelectedTeacherAssignments([]);
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="detail-info">
                <p><strong>Email:</strong> {selectedTeacher.email}</p>
                <p><strong>School:</strong> {selectedTeacher.school_name || 'Not specified'}</p>
                <p><strong>Plan:</strong> {selectedTeacher.subscription_tier}</p>
              </div>

              {isLoadingAssignments ? (
                <div className="loading">Loading assignments...</div>
              ) : selectedTeacherAssignments.length === 0 ? (
                <div className="empty">No assignments yet</div>
              ) : (
                <div className="assignments-list">
                  {selectedTeacherAssignments.map((assignment) => (
                    <div key={assignment.id} className="assignment-item">
                      <div className="assignment-title">{assignment.title || 'Untitled'}</div>
                      {assignment.description && (
                        <div className="assignment-description">{assignment.description}</div>
                      )}
                      <div className="assignment-meta">
                        <span className={`status-badge ${assignment.status}`}>
                          {assignment.status}
                        </span>
                        <span className="assignment-date">
                          {new Date(assignment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
