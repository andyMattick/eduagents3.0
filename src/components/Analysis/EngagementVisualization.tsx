/**
 * Engagement Visualization Component (Phase 7)
 *
 * Displays student engagement across problem sequences with:
 * - Engagement trend line chart
 * - Engagement score distribution
 * - Fatigue impact visualization
 * - Novelty impact analysis
 * - Trend indicators (improving/declining/stable/volatile)
 * 
 * DARK MODE SUPPORT: Uses useTheme hook for automatic light/dark color adaptation
 */

import React, { useMemo } from 'react';
import { StudentEngagementArc, ProblemEngagementMetrics } from '../../types/engagementModel';
import { useTheme } from '../../hooks/useTheme';

/**
 * Helper to get theme-aware colors
 */
function getThemeColors(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    return {
      // Fatigue colors (dark mode)
      fatigueSignificantBg: '#3a1a1a',
      fatigueSignificantText: '#ff6b6b',
      fatigueSafetyBg: '#1a3a2e',
      fatigueSafetyText: '#51cf66',
      
      // Novelty colors (dark mode)
      noveltyHighBg: '#1a3a4a',
      noveltyHighText: '#4dabf7',
      noveltyLowBg: '#3a2a4a',
      noveltyLowText: '#da77f2',
      
      // General colors (dark mode)
      cardBg: '#252525',
      neutralCardBg: '#2f2f2f',
      textPrimary: '#f0f0f0',
      textSecondary: '#b0b0b0',
      textTertiary: '#808080',
      borderColor: '#3a3a3a',
      gridBg: '#1f1f1f',
      
      // Chart colors (dark mode)
      chartGrid: '#404040',
      chartAxis: '#808080',
      chartLine: '#4dabf7',
      chartPoint: '#90caf9',
    };
  } else {
    return {
      // Fatigue colors (light mode)
      fatigueSignificantBg: '#fee2e2',
      fatigueSignificantText: '#991b1b',
      fatigueSafetyBg: '#f0fdf4',
      fatigueSafetyText: '#166534',
      
      // Novelty colors (light mode)
      noveltyHighBg: '#dbeafe',
      noveltyHighText: '#0c4a6e',
      noveltyLowBg: '#f3e8ff',
      noveltyLowText: '#581c87',
      
      // General colors (light mode)
      cardBg: '#ffffff',
      neutralCardBg: '#f9fafb',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      textTertiary: '#9ca3af',
      borderColor: '#e5e7eb',
      gridBg: '#f9fafb',
      
      // Chart colors (light mode)
      chartGrid: '#e5e7eb',
      chartAxis: '#333333',
      chartLine: '#2563eb',
      chartPoint: '#60a5fa',
    };
  }
}

interface EngagementVisualizationProps {
  arc: StudentEngagementArc;
  showDetailedBreakdown?: boolean;
  highlightTrend?: boolean;
}

/**
 * Simple SVG-based chart for engagement trend
 */
const EngagementTrendChart: React.FC<{
  metrics: ProblemEngagementMetrics[];
  width?: number;
  height?: number;
  colors?: ReturnType<typeof getThemeColors>;
}> = ({
  metrics,
  width = 600,
  height = 300,
  colors,
}) => {
  const defaultColors = getThemeColors('light');
  const chartColors = colors || defaultColors;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const scores = metrics.map(m => m.engagementScore);
  const maxScore = Math.max(...scores, 1);
  const minScore = Math.min(...scores, 0);
  const scoreRange = maxScore - minScore || 1;

  // Calculate points for line chart
  const points = metrics.map((m, idx) => {
    const x = padding + (idx / (metrics.length - 1 || 1)) * chartWidth;
    const normalizedScore = (m.engagementScore - minScore) / scoreRange;
    const y = padding + chartHeight - normalizedScore * chartHeight;
    return { x, y, score: m.engagementScore };
  });

  const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="engagement-chart-container" style={{ marginBottom: '20px' }}>
      <h4 style={{ marginBottom: '10px', color: chartColors.textPrimary }}>Engagement Trend</h4>
      <svg width={width} height={height} style={{ border: `1px solid ${chartColors.borderColor}`, borderRadius: '4px' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, idx) => {
          const y = padding + (1 - tick) * chartHeight;
          const score = minScore + scoreRange * tick;
          return (
            <g key={`grid-${idx}`}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke={chartColors.chartGrid} strokeWidth="1" />
              <text x={padding - 5} y={y + 5} fontSize="12" textAnchor="end" fill={chartColors.textTertiary}>
                {score.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={chartColors.chartAxis} strokeWidth="2" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={chartColors.chartAxis} strokeWidth="2" />

        {/* Trend line */}
        <polyline points={pointsString} fill="none" stroke={chartColors.chartLine} strokeWidth="2" />

        {/* Data points */}
        {points.map((p, idx) => (
          <circle key={`point-${idx}`} cx={p.x} cy={p.y} r="4" fill={chartColors.chartPoint} opacity="0.7" />
        ))}

        {/* X-axis labels */}
        {metrics.map((m, idx) => (
          <text
            key={`label-${idx}`}
            x={points[idx].x}
            y={height - padding + 20}
            fontSize="12"
            textAnchor="middle"
            fill={chartColors.textTertiary}
          >
            {idx}
          </text>
        ))}

        {/* Axis labels */}
        <text x={width / 2} y={height - 5} fontSize="14" textAnchor="middle" fontWeight="bold" fill={chartColors.textPrimary}>
          Problem Sequence
        </text>
        <text x={20} y={height / 2} fontSize="14" textAnchor="middle" fontWeight="bold" fill={chartColors.textPrimary} transform={`rotate(-90 20 ${height / 2})`}>
          Engagement Score
        </text>
      </svg>
    </div>
  );
};

/**
 * Fatigue impact visualization
 */
const FatigueImpactDisplay: React.FC<{ arc: StudentEngagementArc; colors: ReturnType<typeof getThemeColors> }> = ({ arc, colors }) => {
  const { fatigueImpact } = arc;
  const declinePercent = fatigueImpact.declinePercent;
  const isSignificant = declinePercent >= 5;

  return (
    <div
      className="fatigue-impact"
      style={{
        padding: '12px',
        backgroundColor: isSignificant ? colors.fatigueSignificantBg : colors.fatigueSafetyBg,
        borderLeft: `4px solid ${isSignificant ? colors.fatigueSignificantText : colors.fatigueSafetyText}`,
        borderRadius: '4px',
        marginBottom: '15px',
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', color: isSignificant ? colors.fatigueSignificantText : colors.fatigueSafetyText }}>
        Fatigue Impact: {declinePercent.toFixed(1)}% Decline
      </h4>
      <div style={{ fontSize: '14px', color: colors.textSecondary }}>
        <p style={{ margin: '4px 0' }}>
          <strong>Start:</strong> {fatigueImpact.engagementAtStart.toFixed(2)} → <strong>End:</strong> {fatigueImpact.engagementAtEnd.toFixed(2)}
        </p>
        {isSignificant ? (
          <p style={{ margin: '4px 0', color: colors.fatigueSignificantText }}>⚠️ Significant fatigue-driven engagement decline detected</p>
        ) : (
          <p style={{ margin: '4px 0', color: colors.fatigueSafetyText }}>✓ Fatigue impact within acceptable range</p>
        )}
      </div>
    </div>
  );
};

/**
 * Novelty impact analysis
 */
const NoveltyImpactDisplay: React.FC<{ metrics: ProblemEngagementMetrics[]; colors: ReturnType<typeof getThemeColors> }> = ({ metrics, colors }) => {
  const analysis = useMemo(() => {
    const novelProblems = metrics.filter(m => m.breakdown.noveltyBoost > 1.2);
    const repetitiveProblems = metrics.filter(m => m.breakdown.noveltyBoost <= 1.05);

    const novelAvg = novelProblems.length > 0 ? novelProblems.reduce((sum, m) => sum + m.engagementScore, 0) / novelProblems.length : 0;
    const repetitiveAvg = repetitiveProblems.length > 0 ? repetitiveProblems.reduce((sum, m) => sum + m.engagementScore, 0) / repetitiveProblems.length : 0;

    return {
      novelCount: novelProblems.length,
      repetitiveCount: repetitiveProblems.length,
      novelAvg,
      repetitiveAvg,
      noveltyBoosted: novelAvg > repetitiveAvg,
    };
  }, [metrics]);

  if (analysis.novelCount === 0 || analysis.repetitiveCount === 0) {
    return (
      <div style={{ padding: '12px', backgroundColor: colors.neutralCardBg, borderRadius: '4px', marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0' }}>Novelty Impact</h4>
        <p style={{ margin: '0', fontSize: '14px', color: colors.textSecondary }}>Insufficient novelty variance to analyze</p>
      </div>
    );
  }

  return (
    <div
      className="novelty-impact"
      style={{
        padding: '12px',
        backgroundColor: analysis.noveltyBoosted ? colors.noveltyHighBg : colors.noveltyLowBg,
        borderLeft: `4px solid ${analysis.noveltyBoosted ? colors.noveltyHighText : colors.noveltyLowText}`,
        borderRadius: '4px',
        marginBottom: '15px',
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', color: analysis.noveltyBoosted ? colors.noveltyHighText : colors.noveltyLowText }}>
        Novelty Impact Analysis
      </h4>
      <div style={{ fontSize: '14px', color: colors.textSecondary }}>
        <p style={{ margin: '4px 0' }}>
          <strong>Novel Problems:</strong> {analysis.novelCount} (avg {analysis.novelAvg.toFixed(2)})
        </p>
        <p style={{ margin: '4px 0' }}>
          <strong>Repetitive Problems:</strong> {analysis.repetitiveCount} (avg {analysis.repetitiveAvg.toFixed(2)})
        </p>
        {analysis.noveltyBoosted ? (
          <p style={{ margin: '4px 0', color: colors.noveltyHighText, fontWeight: 'bold' }}>✓ Novel problems drive higher engagement</p>
        ) : (
          <p style={{ margin: '4px 0', color: colors.noveltyLowText }}>📊 Similar engagement levels - good variety maintenance</p>
        )}
      </div>
    </div>
  );
};

/**
 * Trend indicator badge
 */
const TrendBadge: React.FC<{ trend: string; colors: ReturnType<typeof getThemeColors> }> = ({ trend, colors }) => {
  // Determine if dark mode by checking if text color is light
  const isDark = colors.textPrimary === '#f0f0f0';

  const colorMap: Record<string, { bg: string; text: string; emoji: string }> = isDark
    ? {
        improving: { bg: '#1a3a2e', text: '#51cf66', emoji: '↗️' },
        declining: { bg: '#3a1a1a', text: '#ff6b6b', emoji: '↘️' },
        stable: { bg: '#1a3a4a', text: '#4dabf7', emoji: '→' },
        volatile: { bg: '#3a3a1a', text: '#ffd43b', emoji: '↔️' },
      }
    : {
        improving: { bg: '#dcfce7', text: '#166534', emoji: '↗️' },
        declining: { bg: '#fee2e2', text: '#991b1b', emoji: '↘️' },
        stable: { bg: '#dbeafe', text: '#0c4a6e', emoji: '→' },
        volatile: { bg: '#fef08a', text: '#854d0e', emoji: '↔️' },
      };

  const style = colorMap[trend] || colorMap.stable;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: style.bg,
        color: style.text,
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 'bold',
        marginRight: '8px',
      }}
    >
      {style.emoji} {trend.charAt(0).toUpperCase() + trend.slice(1)}
    </span>
  );
};

/**
 * Main Engagement Visualization Component
 */
export const EngagementVisualization: React.FC<EngagementVisualizationProps> = ({
  arc,
  showDetailedBreakdown = true,
  highlightTrend = true,
}) => {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  
  const { metrics, averageEngagement, engagementTrend, minEngagement, maxEngagement, studentLevel, totalProblems } = arc;

  return (
    <div className="engagement-visualization" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', borderBottom: `2px solid ${colors.borderColor}`, paddingBottom: '15px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: colors.textPrimary }}>Student Engagement Analysis</h2>
        <p style={{ margin: '0', fontSize: '14px', color: colors.textSecondary }}>
          Level: <strong>{studentLevel}</strong> • Problems: <strong>{totalProblems}</strong> • Avg Engagement: <strong>{averageEngagement.toFixed(2)}</strong>
        </p>
      </div>

      {/* Trend Summary */}
      {highlightTrend && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: colors.textPrimary }}>Trend Analysis</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <TrendBadge trend={engagementTrend} colors={colors} />
            <span style={{ fontSize: '14px', color: colors.textSecondary, alignSelf: 'center' }}>
              Range: {minEngagement.toFixed(2)} → {maxEngagement.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Engagement Trend Chart */}
      <EngagementTrendChart metrics={metrics} colors={colors} />

      {/* Fatigue Impact */}
      <FatigueImpactDisplay arc={arc} colors={colors} />

      {/* Novelty Impact */}
      <NoveltyImpactDisplay metrics={metrics} colors={colors} />

      {/* Detailed Breakdown (Optional) */}
      {showDetailedBreakdown && (
        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: `1px solid ${colors.borderColor}` }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: colors.textPrimary }}>Problem-Level Breakdown</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {metrics.map((m, idx) => (
              <div
                key={m.problemId}
                style={{
                  padding: '10px',
                  backgroundColor: colors.neutralCardBg,
                  borderRadius: '4px',
                  borderLeft: `4px solid ${m.engagementScore > 0.65 ? '#22c55e' : m.engagementScore > 0.4 ? '#f59e0b' : '#ef4444'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: colors.textPrimary }}>
                      Problem {idx}: {m.problemId}
                    </p>
                    <p style={{ margin: '0', fontSize: '12px', color: colors.textSecondary }}>{m.breakdown.reasoning}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: colors.chartLine }}>
                      {m.engagementScore.toFixed(2)}
                    </p>
                    <p style={{ margin: '0', fontSize: '11px', color: colors.textTertiary }}>Novelty: {m.breakdown.noveltyBoost.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: colors.neutralCardBg,
          borderRadius: '4px',
          fontSize: '13px',
          color: colors.textSecondary,
        }}
      >
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: colors.textPrimary }}>Summary</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <p style={{ margin: '4px 0', color: colors.textPrimary }}>
              <strong>Average:</strong> {averageEngagement.toFixed(3)}
            </p>
            <p style={{ margin: '4px 0', color: colors.textPrimary }}>
              <strong>Min:</strong> {minEngagement.toFixed(3)}
            </p>
          </div>
          <div>
            <p style={{ margin: '4px 0', color: colors.textPrimary }}>
              <strong>Max:</strong> {maxEngagement.toFixed(3)}
            </p>
            <p style={{ margin: '4px 0', color: colors.textPrimary }}>
              <strong>Trend:</strong> {engagementTrend}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngagementVisualization;
