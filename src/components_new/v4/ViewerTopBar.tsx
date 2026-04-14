import React from "react";

export type DifficultyTuning = "easier" | "same" | "harder";
export type ReadingLoadTuning = "less" | "same" | "more";
export type LengthTuning = "fewer" | "standard" | "more";

interface ViewerTopBarProps {
  profileOptions: readonly string[];
  teacherProfileLabel: string;
  lengthTuning: LengthTuning;
  onProfileChange: (profile: string) => void;
  onLengthChange: (value: LengthTuning) => void;
}

export function ViewerTopBar(props: ViewerTopBarProps) {
  const {
    profileOptions,
    teacherProfileLabel,
    lengthTuning,
    onProfileChange,
    onLengthChange,
  } = props;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.6rem" }}>
      <label style={{ fontSize: "0.78rem", color: "#6b5040" }}>
        Profile
        <select value={teacherProfileLabel} onChange={(e) => onProfileChange(e.target.value)} style={{ width: "100%", marginTop: "0.2rem" }}>
          {profileOptions.map((profileOption) => (
            <option key={profileOption} value={profileOption}>{profileOption}</option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: "0.78rem", color: "#6b5040" }}>
        Length
        <select
          value={lengthTuning}
          onChange={(e) => onLengthChange(e.target.value as LengthTuning)}
          style={{ width: "100%", marginTop: "0.2rem" }}
        >
          <option value="fewer">Fewer</option>
          <option value="standard">Standard</option>
          <option value="more">More Items</option>
        </select>
      </label>
    </div>
  );
}
