/**
 * Observatory Screen – Simulation Summary
 *
 * Displays a high-level summary of Space Camp simulation results before diving
 * into detailed feedback. Creates a gateway view showing:
 * - Confusion hotspots (key takeaways)
 * - Fatigue curve summary
 * - Overall success rate
 * - Number of at-risk personas
 *
 * Teachers get the executive summary here, with option to see detailed feedback.
 */

import React, { useState } from 'react';
import './ObservatoryScreen.css';

interface ConfusionHotspot {
  problemId: string;
  problemText: string;
  confusionScore: number; // 0-1
  affectedPersonas: string[];
}

interface ObservatoryScreenProps {
  /** High-level confusion summary (top 3-5 problems) */
  confusionHotspots: ConfusionHotspot[];

  /** Fatigue summary text */
  fatigueSummary: string;

  /** Overall success rate across all personas (0-1) */
  successRate: number;

  /** Number of at-risk personas */
  atRiskCount: number;

  /** Total number of personas simulated */
  totalPersonas: number;

  /** Estimated time to completion */
  avgCompletionMinutes?: number;

  /** Is the system loading the detailed feedback? */
  isLoading?: boolean;

  /** Called when teacher wants to see detailed feedback */
  onViewDetails: () => void;

  /** Optional: Called if teacher wants to re-run simulation */
  onRerun?: () => void;
}

export function ObservatoryScreen({
  confusionHotspots,
  fatigueSummary,
  successRate,
  atRiskCount,
  totalPersonas,
  avgCompletionMinutes,
  isLoading = false,
  onViewDetails,
  onRerun,
}: ObservatoryScreenProps) {
  const riskLevel = atRiskCount >= totalPersonas * 0.4 ? 'high' : atRiskCount >= totalPersonas * 0.2 ? 'medium' : 'low';
  const riskColor = riskLevel === 'high' ? '#d32f2f' : riskLevel === 'medium' ? '#f57c00' : '#388e3c';

  const successPercentage = Math.round(successRate * 100);
  const atRiskPercentage = Math.round((atRiskCount / totalPersonas) * 100);

  return (
    <div className="observatory-screen">
      <div className="obs-header">
        <h2>🔭 Observatory — Initial Analysis</h2>
        <p className="obs-subtitle">
          Space Camp has completed the simulation. Here's the high-level summary.
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="obs-metrics-grid">
        {/* Success Rate Card */}
        <div className="obs-metric-card obs-metric-success">
          <div className="obs-metric-icon">📈</div>
          <div className="obs-metric-content">
            <div className="obs-metric-label">Expected Success Rate</div>
            <div className="obs-metric-value">{successPercentage}%</div>
            <div className="obs-metric-description">
              {successPercentage >= 80
                ? '✅ Strong performance expected'
                : successPercentage >= 60
                ? '⚠️ Moderate performance'
                : '🚨 Improvement recommended'}
            </div>
          </div>
        </div>

        {/* At-Risk Personas Card */}
        <div className="obs-metric-card obs-metric-risk" style={{ borderLeftColor: riskColor }}>
          <div className="obs-metric-icon">⚠️</div>
          <div className="obs-metric-content">
            <div className="obs-metric-label">At-Risk Personas</div>
            <div className="obs-metric-value" style={{ color: riskColor }}>
              {atRiskCount}/{totalPersonas}
            </div>
            <div className="obs-metric-description">
              {riskLevel === 'high' && '🔴 High risk — needs attention'}
              {riskLevel === 'medium' && '🟡 Moderate risk — some issues'}
              {riskLevel === 'low' && '🟢 Low risk — most personas OK'}
            </div>
          </div>
        </div>

        {/* Completion Time Card */}
        {avgCompletionMinutes && (
          <div className="obs-metric-card obs-metric-time">
            <div className="obs-metric-icon">⏱️</div>
            <div className="obs-metric-content">
              <div className="obs-metric-label">Avg Completion Time</div>
              <div className="obs-metric-value">{Math.round(avgCompletionMinutes)} min</div>
              <div className="obs-metric-description">
                {avgCompletionMinutes <= 30
                  ? '✅ Quick assignment'
                  : avgCompletionMinutes <= 60
                  ? '✓ Standard length'
                  : '⚠️ May be time-intensive'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confusion Hotspots */}
      {confusionHotspots.length > 0 && (
        <div className="obs-section">
          <h3>🚨 Confusion Hotspots</h3>
          <p className="obs-section-subtitle">
            These problems may confuse students. Review details below for context.
          </p>

          <div className="obs-hotspots-list">
            {confusionHotspots.slice(0, 5).map((hotspot, idx) => (
              <div key={hotspot.problemId} className="obs-hotspot-item">
                <div className="obs-hotspot-rank">#{idx + 1}</div>
                <div className="obs-hotspot-content">
                  <div className="obs-hotspot-text">
                    <strong>Problem {hotspot.problemId}:</strong>{' '}
                    {hotspot.problemText.substring(0, 80)}
                    {hotspot.problemText.length > 80 ? '...' : ''}
                  </div>
                  <div className="obs-hotspot-stats">
                    <span
                      className="obs-hotspot-confusion"
                      style={{
                        backgroundColor: `rgba(${Math.round(hotspot.confusionScore * 255)}, ${
                          Math.round((1 - hotspot.confusionScore) * 255)
                        }, 0, 0.2)`,
                      }}
                    >
                      Confusion: {Math.round(hotspot.confusionScore * 100)}%
                    </span>
                    <span className="obs-hotspot-personas">
                      Affects {hotspot.affectedPersonas.length} persona
                      {hotspot.affectedPersonas.length !== 1 ? 's' : ''}:
                      {' '}
                      {hotspot.affectedPersonas.join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {confusionHotspots.length > 5 && (
            <div className="obs-more-info">
              +{confusionHotspots.length - 5} more hotspots (see detailed feedback)
            </div>
          )}
        </div>
      )}

      {/* Fatigue Summary */}
      <div className="obs-section">
        <h3>😴 Fatigue & Pacing</h3>
        <div className="obs-fatigue-box">{fatigueSummary}</div>
      </div>

      {/* Recommendations */}
      <div className="obs-recommendations-box">
        <h3>💡 Quick Recommendations</h3>
        <ul>
          {atRiskCount > 0 && (
            <li>
              {atRiskCount} persona{atRiskCount !== 1 ? 's' : ''} at risk — see detailed feedback to understand why
            </li>
          )}
          {confusionHotspots.length > 0 && (
            <li>
              {confusionHotspots.length} confusion hotspots identified — {confusionHotspots[0].problemId} is the most
              problematic
            </li>
          )}
          {successPercentage < 70 && <li>Consider rewriting for better clarity</li>}
          {avgCompletionMinutes && avgCompletionMinutes > 60 && <li>Assignment may be too long for some educators</li>}
          <li>Click "View detailed feedback" below to see specifics and AI suggestions</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="obs-actions">
        <button
          onClick={onViewDetails}
          disabled={isLoading}
          className="obs-btn obs-btn-primary"
        >
          {isLoading ? '🔄 Loading...' : '👁️ View Detailed Feedback'}
        </button>

        {onRerun && (
          <button
            onClick={onRerun}
            disabled={isLoading}
            className="obs-btn obs-btn-secondary"
            title="Re-run Space Camp simulation"
          >
            🔄 Re-run Simulation
          </button>
        )}
      </div>

      {/* Explanation Box */}
      <div className="obs-explanation" style={{
        backgroundColor: '#fffbea',
        border: '1px solid #ffe082',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '20px',
        fontSize: '13px',
        color: '#664d00',
      }}>
        <strong>What is this?</strong> The Observatory shows a summary of how your assignment performed in simulation.
        <br />
        The next screen (Philosophers) will provide ranked feedback and visual analytics to help you improve the
        assignment.
      </div>
    </div>
  );
}
