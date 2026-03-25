import React from "react";
import type { MathFormat } from "@/utils/mathFormatters";

export const MATH_FORMAT_OPTIONS: {
  id: MathFormat;
  label: string;
  example: string;
}[] = [
  {
    id: "unicode",
    label: "Pretty Math (default)",
    example: "√(x + 7),  x²,  (4x − 5)/(x + 2)",
  },
  {
    id: "plain",
    label: "Plain Text",
    example: "sqrt(x + 7),  x^2,  (4x - 5)/(x + 2)",
  },
  {
    id: "latex",
    label: "LaTeX",
    example: "\\sqrt{x + 7},  x^{2},  \\frac{4x-5}{x+2}",
  },
];

interface Props {
  value: MathFormat;
  onChange: (value: MathFormat) => void;
}

export const MathFormatSelector: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div>
      <label
        style={{
          fontSize: "0.82rem",
          fontWeight: 600,
          display: "block",
          marginBottom: "0.45rem",
        }}
      >
        Math display format
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {MATH_FORMAT_OPTIONS.map(opt => (
          <label
            key={opt.id}
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
              cursor: "pointer",
              fontSize: "0.84rem",
              padding: "0.3rem 0",
            }}
          >
            <input
              type="radio"
              name="mathFormat"
              value={opt.id}
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
              style={{ marginTop: "0.18rem", flexShrink: 0 }}
            />
            <span>
              <strong>{opt.label}</strong>
              <span
                style={{
                  marginLeft: "0.45rem",
                  color: "#6b7280",
                  fontFamily: "monospace",
                  fontSize: "0.76rem",
                }}
              >
                {opt.example}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};
