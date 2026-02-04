/**
 * Student Profile Card Component
 * 
 * Interactive card displaying student traits, overlays, and bloom comfort profile
 * Visual trait bars, overlay badges, and toggle include/exclude functionality
 */

import React, { useState } from 'react';
import { StudentProfile } from '../../types/classroomProfiles';
import './StudentProfileCard.css';

interface StudentProfileCardProps {
  student: StudentProfile;
  isSelected: boolean;
  onToggle: (studentId: string) => void;
  onViewDetails?: (student: StudentProfile) => void;
}

export const StudentProfileCard: React.FC<StudentProfileCardProps> = ({
  student,
  isSelected,
  onToggle,
  onViewDetails,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const overlayColors: Record<string, string> = {
    'adhd': '#ff922b',
    'dyslexic': '#5b7cfa',
    'gifted': '#51cf66',
    'esl': '#a78bfa',
    'fatigue_sensitive': '#ffd43b',
    'anxiety_prone': '#ff6b6b',
    'visual_impairment': '#868e96',
    'hearing_impairment': '#748ffc',
  };

  const narrativeEmojis: Record<string, string> = {
    'quiet': '🤐',
    'resilient': '💪',
    'curious': '🔍',
    'focused': '🎯',
    'creative': '🎨',
    'collaborative': '👥',
    'reflective': '💭',
    'adventurous': '🚀',
  };

  // Find the highest bloom level the student is comfortable with
  const highestBloomLevel = Object.entries(student.BloomComfortProfile)
    .filter(([_, comfort]) => comfort > 0.5)
    .sort(([_, a], [__, b]) => b - a)[0]?.[0] || 'Remember';

  // Calculate average trait
  const avgTrait =
    (student.Traits.ReadingLevel +
      student.Traits.MathFluency +
      student.Traits.CreativityAffinity +
      student.Traits.ThemeAffinity) /
    4;

  const traitColor = (value: number) => {
    if (value < 0.33) return '#ff6b6b';
    if (value < 0.66) return '#ffa94d';
    return '#51cf66';
  };

  return (
    <div className={`student-card ${isSelected ? 'selected' : ''}`}>
      {/* Header with Checkbox */}
      <div className="student-card-header">
        <label className="student-card-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(student.StudentId)}
          />
          <span className="checkbox-mark"></span>
        </label>

        <div className="student-card-name">
          <h4>{student.StudentId}</h4>
          <span className="student-card-bloom" style={{ backgroundColor: traitColor(avgTrait) }}>
            {highestBloomLevel}
          </span>
        </div>

        <button
          className="student-card-expand"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Summary Row */}
      <div className="student-card-summary">
        <div className="trait-bar-small">
          <div
            className="trait-bar-fill"
            style={{
              width: `${student.Traits.ReadingLevel * 100}%`,
              backgroundColor: '#5b7cfa',
            }}
            title={`Reading: ${(student.Traits.ReadingLevel * 100).toFixed(0)}%`}
          ></div>
        </div>
        <div className="trait-bar-small">
          <div
            className="trait-bar-fill"
            style={{
              width: `${student.Traits.MathFluency * 100}%`,
              backgroundColor: '#ff922b',
            }}
            title={`Math: ${(student.Traits.MathFluency * 100).toFixed(0)}%`}
          ></div>
        </div>
        <div className="trait-bar-small">
          <div
            className="trait-bar-fill"
            style={{
              width: `${student.Traits.CreativityAffinity * 100}%`,
              backgroundColor: '#51cf66',
            }}
            title={`Creativity: ${(student.Traits.CreativityAffinity * 100).toFixed(0)}%`}
          ></div>
        </div>
      </div>

      {/* Overlays & Tags */}
      {(student.Overlays.length > 0 || student.NarrativeTags.length > 0) && (
        <div className="student-card-badges">
          {student.Overlays.map((overlay) => (
            <span
              key={overlay}
              className="badge-overlay"
              style={{ backgroundColor: overlayColors[overlay] || '#868e96' }}
            >
              {overlay}
            </span>
          ))}
          {student.NarrativeTags.map((tag) => (
            <span key={tag} className="badge-narrative">
              {narrativeEmojis[tag] || '🏷️'} {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="student-card-details">
          <div className="details-section">
            <h5>Bloom Comfort Profile</h5>
            <div className="bloom-grid">
              {Object.entries(student.BloomComfortProfile).map(([level, comfort]) => (
                <div key={level} className="bloom-item">
                  <div className="bloom-level">{level}</div>
                  <div
                    className="bloom-bar"
                    style={{
                      height: `${comfort * 100}%`,
                      backgroundColor: traitColor(comfort),
                    }}
                  ></div>
                  <div className="bloom-value">{(comfort * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="details-section">
            <h5>Trait Profile</h5>
            <div className="traits-list">
              <div className="trait-item">
                <span className="trait-name">Reading Level</span>
                <div className="trait-bar">
                  <div
                    className="trait-fill"
                    style={{ width: `${student.Traits.ReadingLevel * 100}%` }}
                  ></div>
                </div>
                <span className="trait-pct">{(student.Traits.ReadingLevel * 100).toFixed(0)}%</span>
              </div>

              <div className="trait-item">
                <span className="trait-name">Math Fluency</span>
                <div className="trait-bar">
                  <div
                    className="trait-fill"
                    style={{ width: `${student.Traits.MathFluency * 100}%` }}
                  ></div>
                </div>
                <span className="trait-pct">{(student.Traits.MathFluency * 100).toFixed(0)}%</span>
              </div>

              <div className="trait-item">
                <span className="trait-name">Creativity</span>
                <div className="trait-bar">
                  <div
                    className="trait-fill"
                    style={{ width: `${student.Traits.CreativityAffinity * 100}%` }}
                  ></div>
                </div>
                <span className="trait-pct">{(student.Traits.CreativityAffinity * 100).toFixed(0)}%</span>
              </div>

              <div className="trait-item">
                <span className="trait-name">Theme Affinity</span>
                <div className="trait-bar">
                  <div
                    className="trait-fill"
                    style={{ width: `${student.Traits.ThemeAffinity * 100}%` }}
                  ></div>
                </div>
                <span className="trait-pct">{(student.Traits.ThemeAffinity * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Details Footer */}
          {onViewDetails && (
            <button onClick={() => onViewDetails(student)} className="student-card-details-btn">
              📊 Full Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
};
