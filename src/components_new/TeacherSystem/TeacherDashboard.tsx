// src/components_new/TeacherSystem/TeacherDashboard.tsx

import React, { useEffect } from "react";
import "./TeacherDashboard.css";
import { useUserFlow } from "../../hooks/useUserFlow";

interface TeacherDashboardProps {
  teacherId: string;
  teacherName?: string;
  onNavigate: (page: string, data?: any) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherId,
  teacherName,
  onNavigate,
}) => {
  const { reset } = useUserFlow();

  // When a teacher lands on the dashboard, reset any in‑progress flows
  useEffect(() => {
    reset();
  }, [reset, teacherId]);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-welcome">
          <h1>Teacher Dashboard</h1>
          <p className="school-name">
            Welcome back{teacherName ? `, ${teacherName}` : ""}!
          </p>
        </div>
        <div className="header-tier">
          <span className="subscription-badge">Beta Workspace</span>
        </div>
      </header>

      {/* Primary actions */}
      <section className="quick-actions">
        <h2>What would you like to do?</h2>
        <div className="quick-actions-grid">
          <button
            className="btn-primary"
            onClick={() => onNavigate("createAssessment")}
          >
            Create a new assessment
          </button>

          <button
            className="btn-secondary"
            onClick={() => onNavigate("viewAssessments")}
          >
            View recent assessments
          </button>

          <button
            className="btn-secondary"
            onClick={() => onNavigate("viewAgentsBySubject")}
          >
            View my agents
          </button>
        </div>
      </section>

      {/* Analysis & improvement flows */}
      <section className="dashboard-section">
        <h2>Analyze and improve assessments</h2>
        <p className="section-description">
          Use these tools to compare predicted vs actual performance, improve
          future writing, and generate new versions.
        </p>
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Compare predicted vs actual</h3>
            <p>
              Explore how your students actually performed versus what the
              system predicted.
            </p>
            <button
              className="btn-link"
              onClick={() => onNavigate("comparePredictedActual")}
            >
              Go to comparison
            </button>
          </div>

          <div className="dashboard-card">
            <h3>Improve future writing</h3>
            <p>
              Use past assessments to refine prompts and instructions for next
              time.
            </p>
            <button
              className="btn-link"
              onClick={() => onNavigate("improveFutureWriting")}
            >
              Improve future writing
            </button>
          </div>

          <div className="dashboard-card">
            <h3>Generate a new version</h3>
            <p>
              Spin up a new version of an assessment while keeping what worked.
            </p>
            <button
              className="btn-link"
              onClick={() => onNavigate("generateNewVersion")}
            >
              Generate new version
            </button>
          </div>
        </div>
      </section>

      {/* Placeholder for future API usage / limits */}
      <section className="dashboard-section">
        <h2>API usage & limits</h2>
        <p className="section-description">
          API usage, limits, and subscription details will appear here as the
          new system wiring is completed.
        </p>
      </section>
    </div>
  );
};
