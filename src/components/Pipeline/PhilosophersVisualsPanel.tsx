import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import './PhilosophersVisualsPanel.css';

/**
 * Philosophers Visuals Panel
 *
 * 6 Required Visualizations:
 * 1. Cluster Heat Map (Problem × Astronaut Confusion)
 * 2. Bloom vs Complexity Scatterplot
 * 3. Confusion Density Map (Heatmap)
 * 4. Fatigue Curve (Line Chart)
 * 5. Topic Radar Chart
 * 6. Section Risk Matrix (Grid)
 */
interface PhilosophersVisualsPanelProps {
  feedback?: any[];
  asteroids?: any[];
  studentFeedback?: any[];
}

export function PhilosophersVisualsPanel({
  feedback = [],
  asteroids = [],
  studentFeedback = [],
}: PhilosophersVisualsPanelProps) {
  // Mock data generator for visualizations
  const generateMockData = () => {
    const problemCount = asteroids.length || 5;
    const astronautCount = studentFeedback.length || 4;

    return {
      clusterHeatmap: Array.from({ length: problemCount }).map((_, i) => ({
        problem: `Q${i + 1}`,
        ...Object.fromEntries(
          Array.from({ length: astronautCount }).map((_, j) => [
            `A${j + 1}`,
            Math.random() * 100,
          ])
        ),
      })),

      bloomComplexity: asteroids.map((a, i) => ({
        name: `Q${i + 1}`,
        bloom: Math.random() * 6,
        complexity: Math.random() * 100,
        size: 50 + Math.random() * 150,
      })),

      confusionDensity: Array.from({ length: 8 }).map((_, i) => ({
        hour: i,
        confusion: Math.random() * 100,
      })),

      fatigueCurve: Array.from({ length: problemCount }).map((_, i) => ({
        problem: i + 1,
        fatigue: (i / problemCount) * 80 + Math.random() * 20,
      })),

      topicRadar: [
        { topic: 'Comprehension', Value: 60, fullMark: 100 },
        { topic: 'Application', Value: 45, fullMark: 100 },
        { topic: 'Analysis', Value: 55, fullMark: 100 },
        { topic: 'Synthesis', Value: 40, fullMark: 100 },
        { topic: 'Evaluation', Value: 50, fullMark: 100 },
      ],

      sectionRisk: Array.from({ length: 4 }).map((_, i) => ({
        section: `Section ${i + 1}`,
        high: Math.floor(Math.random() * 3),
        medium: Math.floor(Math.random() * 3),
        low: Math.floor(Math.random() * 3),
      })),
    };
  };

  const data = useMemo(() => generateMockData(), [asteroids.length, studentFeedback.length]);

  return (
    <div className="philosophers-visuals-panel">
      <div className="visuals-header">
        <h2>📊 Assessment Analytics</h2>
        <p>Interactive visualization of simulation results</p>
      </div>

      <div className="visuals-grid">
        {/* 1. Bloom vs Complexity Scatterplot */}
        <div className="visual-card">
          <h3>Bloom Level vs Complexity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bloom" label={{ value: 'Bloom Level', position: 'insideBottomRight', offset: -10 }} />
              <YAxis dataKey="complexity" label={{ value: 'Complexity Score', angle: -90, position: 'insideLeft' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Problems" data={data.bloomComplexity} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="chart-description">Shows relationship between cognitive demand and difficulty</p>
        </div>

        {/* 2. Confusion Density Map */}
        <div className="visual-card">
          <h3>Confusion Density Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.confusionDensity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" label={{ value: 'Problem Index', position: 'insideBottomRight', offset: -10 }} />
              <YAxis label={{ value: 'Confusion Index', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="confusion"
                stroke="#ff7300"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Confusion Level"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-description">Tracks student confusion across problem sequence</p>
        </div>

        {/* 3. Fatigue Curve */}
        <div className="visual-card">
          <h3>Fatigue Curve</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.fatigueCurve}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="problem" label={{ value: 'Problem Number', position: 'insideBottomRight', offset: -10 }} />
              <YAxis label={{ value: 'Fatigue Level', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="fatigue" stroke="#8884d8" strokeWidth={2} name="Fatigue" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-description">Predicted fatigue accumulation throughout assessment</p>
        </div>

        {/* 4. Topic Radar Chart */}
        <div className="visual-card">
          <h3>Topic Coverage Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data.topicRadar}>
              <PolarGrid stroke="#e8eaed" />
              <PolarAngleAxis dataKey="topic" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Cognitive Coverage" dataKey="Value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
          <p className="chart-description">Assessment balance across cognitive dimensions</p>
        </div>

        {/* 5. Section Risk Matrix (Bar Chart) */}
        <div className="visual-card">
          <h3>Section Risk Assessment</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.sectionRisk}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="section" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="high" stackId="a" fill="#dc3545" name="High Risk" />
              <Bar dataKey="medium" stackId="a" fill="#ffc107" name="Medium Risk" />
              <Bar dataKey="low" stackId="a" fill="#28a745" name="Low Risk" />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-description">Problem distribution by risk category per section</p>
        </div>

        {/* 6. Cluster Heat Map Table */}
        <div className="visual-card full-width">
          <h3>Problem × Student Confusion Matrix (Heat Map)</h3>
          <div className="heatmap-container">
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th>Problem</th>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <th key={i}>
                      Student {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.clusterHeatmap.map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="rowLabel">{row.problem}</td>
                    {Array.from({ length: 4 }).map((_, j) => {
                      const value = row[`A${j + 1}`] || 0;
                      const intensity = Math.min(100, value);
                      return (
                        <td
                          key={j}
                          className="heat-cell"
                          style={{
                            backgroundColor: `rgba(220, 53, 69, ${intensity / 100})`,
                            color: intensity > 50 ? 'white' : '#333',
                          }}
                        >
                          {Math.round(intensity)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="chart-description">
            Color intensity indicates confusion level (darker = more confusion). Red cells highlight at-risk problems.
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .philosophers-visuals-panel {
            page-break-inside: avoid;
          }
          
          .visual-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
