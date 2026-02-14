/**
 * Visualization Generators for Phase 3
 *
 * Generates visual analytics (heat maps, scatter plots, charts, etc.)
 * All outputs are deterministic, base64, or SVG strings suitable for embedding in HTML.
 *
 * Key Principle: No external storage, no API calls. All generation is local and synchronous.
 */

/**
 * Generate a cluster heat map showing student groupings by problem difficulty
 * Returns SVG string displaying student performance clusters
 *
 * @param simulations - Array of student simulations
 * @param problems - Array of problems
 * @returns SVG string
 */
export function generateClusterHeatMap(simulations: any[], problems: any[]): string {
  try {
    if (!simulations || simulations.length === 0 || !problems || problems.length === 0) {
      return generatePlaceholderChart('Cluster Heat Map', 'No simulation data available');
    }

    // Build a matrix: students x problems with success rates
    const width = 600;
    const height = 400;
    const padding = 60;

    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;
    const cellWidth = plotWidth / Math.max(problems.length, 1);
    const cellHeight = plotHeight / Math.max(simulations.length, 1);

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += '<style>';
    svg += 'text { font-family: Arial, sans-serif; font-size: 12px; }';
    svg += '.title { font-size: 16px; font-weight: bold; }';
    svg += '.axis-label { font-size: 11px; }';
    svg += '</style>';

    // Title
    svg += `<text x="${width / 2}" y="25" text-anchor="middle" class="title">Cluster Heat Map: Student Performance</text>`;

    // Legend
    svg += '<text x="' + padding + '" y="50" class="axis-label">Green = Success | Yellow = Mixed | Red = Struggling</text>';

    // Draw heat map cells
    simulations.forEach((sim, studentIdx) => {
      problems.forEach((problem, problemIdx) => {
        const x = padding + problemIdx * cellWidth;
        const y = padding + studentIdx * cellHeight;

        // Estimate success rate based on confusion signals
        const confusionRate = (sim.confusionSignals || 0) / Math.max(problems.length, 1);
        const successRate = Math.max(0, 1 - confusionRate);

        // Color gradient: green (success) to red (struggling)
        let color = '#90EE90'; // Green
        if (successRate < 0.7) color = '#FFD700'; // Yellow
        if (successRate < 0.4) color = '#FF6B6B'; // Red

        svg += `<rect x="${x}" y="${y}" width="${cellWidth - 1}" height="${cellHeight - 1}" fill="${color}" stroke="#999" stroke-width="1"/>`;
        svg += `<text x="${x + cellWidth / 2}" y="${y + cellHeight / 2 + 5}" text-anchor="middle" class="axis-label" font-size="10">${Math.round(successRate * 100)}%</text>`;
      });
    });

    // Axes labels
    svg += `<text x="${padding - 10}" y="${height - padding + 20}" text-anchor="end" class="axis-label">Students</text>`;
    svg += `<text x="${width / 2}" y="${height - 10}" text-anchor="middle" class="axis-label">Problems</text>`;

    svg += '</svg>';
    return svg;
  } catch (error) {
    console.error('Error generating cluster heat map:', error);
    return generatePlaceholderChart('Cluster Heat Map', 'Error generating chart');
  }
}

/**
 * Generate a scatter plot of Bloom level vs. linguistic complexity
 * Returns SVG string
 *
 * @param problems - Array of problems with BloomLevel and linguisticComplexity
 * @returns SVG string
 */
export function generateBloomComplexityScatter(problems: any[]): string {
  try {
    if (!problems || problems.length === 0) {
      return generatePlaceholderChart('Bloom-Complexity Scatter', 'No problems to analyze');
    }

    const width = 600;
    const height = 400;
    const padding = 60;

    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += '<style>';
    svg += 'text { font-family: Arial, sans-serif; font-size: 12px; }';
    svg += '.title { font-size: 16px; font-weight: bold; }';
    svg += '.axis-label { font-size: 11px; }';
    svg += '.dot { opacity: 0.8; }';
    svg += '</style>';

    // Title
    svg += `<text x="${width / 2}" y="25" text-anchor="middle" class="title">Bloom Level vs. Linguistic Complexity</text>`;

    // Axes
    svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>`;
    svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>`;

    // Axis labels
    svg += `<text x="${width - 20}" y="${height - padding + 20}" class="axis-label">Complexity →</text>`;
    svg += `<text x="${padding - 30}" y="${padding - 10}" class="axis-label">Bloom Level ↑</text>`;

    // Grid lines and axis labels
    for (let i = 0; i <= 5; i++) {
      const x = padding + (plotWidth * i) / 5;
      const y = height - padding - (plotHeight * i) / 5;

      // X-axis
      svg += `<line x1="${x}" y1="${height - padding}" x2="${x}" y2="${height - padding + 5}" stroke="#999" stroke-width="1"/>`;
      svg += `<text x="${x}" y="${height - padding + 20}" text-anchor="middle" class="axis-label">${(i * 0.2).toFixed(1)}</text>`;

      // Y-axis
      svg += `<line x1="${padding - 5}" y1="${y}" x2="${padding}" y2="${y}" stroke="#999" stroke-width="1"/>`;
      svg += `<text x="${padding - 10}" y="${y + 5}" text-anchor="end" class="axis-label">${i}</text>`;
    }

    // Plot data points
    const bloomLevelMap: Record<string, number> = {
      'Remember': 1,
      'Understand': 2,
      'Apply': 3,
      'Analyze': 4,
      'Evaluate': 5,
      'Create': 6,
    };

    problems.forEach((problem, idx) => {
      const bloomLevel = bloomLevelMap[problem.bloomLevel] || 3;
      const complexity = (problem.linguisticComplexity || 0.5);

      const x = padding + (complexity * plotWidth);
      const y = height - padding - ((bloomLevel / 6) * plotHeight);

      const color = ['#FF6B6B', '#FF9999', '#FFD700', '#90EE90', '#6BB6FF', '#6B5BFF'][bloomLevel - 1] || '#999';

      svg += `<circle cx="${x}" cy="${y}" r="5" fill="${color}" class="dot" stroke="#333" stroke-width="1"/>`;

      // Tooltip on hover (title attribute in SVG)
      svg += `<title>${problem.text ? problem.text.substring(0, 50) : `Problem ${idx + 1}`}</title>`;
    });

    // Legend
    svg += `<text x="${padding}" y="40" class="axis-label" font-style="italic">Each circle = 1 problem</text>`;

    svg += '</svg>';
    return svg;
  } catch (error) {
    console.error('Error generating Bloom-Complexity scatter:', error);
    return generatePlaceholderChart('Bloom-Complexity Scatter', 'Error generating chart');
  }
}

/**
 * Generate a confusion density map showing problem hotspots
 * Returns SVG string
 *
 * @param simulations - Array of student simulations with confusion signals
 * @returns SVG string
 */
export function generateConfusionDensityMap(simulations: any[]): string {
  try {
    if (!simulations || simulations.length === 0) {
      return generatePlaceholderChart('Confusion Hotspots', 'No simulation data available');
    }

    const width = 600;
    const height = 400;
    const padding = 60;

    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += '<style>';
    svg += 'text { font-family: Arial, sans-serif; font-size: 12px; }';
    svg += '.title { font-size: 16px; font-weight: bold; }';
    svg += '.axis-label { font-size: 11px; }';
    svg += '</style>';

    // Title
    svg += `<text x="${width / 2}" y="25" text-anchor="middle" class="title">Confusion Density Map</text>`;

    // Legend
    svg += '<text x="' + padding + '" y="50" class="axis-label">Darker = Higher confusion rates</text>';

    // Calculate confusion distribution
    const maxConfusion = Math.max(...simulations.map((s: any) => s.confusionSignals || 0));
    const avgConfusion = simulations.reduce((sum: number, s: any) => sum + (s.confusionSignals || 0), 0) / simulations.length;

    // Draw density bars (simplified histogram)
    const barWidth = plotWidth / Math.max(simulations.length, 1);
    simulations.forEach((sim, idx) => {
      const confusionIntensity = sim.confusionSignals || 0;
      const normalized = maxConfusion > 0 ? confusionIntensity / maxConfusion : 0;

      const x = padding + idx * barWidth;
      const barHeight = normalized * plotHeight;
      const y = height - padding - barHeight;

      // Color intensity
      const hue = Math.round(120 * (1 - normalized)); // Red (0) to Green (120)
      const saturation = Math.round(100 * normalized); // Increase saturation with intensity
      const color = `hsl(${hue}, ${saturation}%, 50%)`;

      svg += `<rect x="${x}" y="${y}" width="${barWidth - 1}" height="${barHeight}" fill="${color}" stroke="#999" stroke-width="1"/>`;
      svg += `<text x="${x + barWidth / 2}" y="${height - padding + 20}" text-anchor="middle" class="axis-label" font-size="9">S${idx + 1}</text>`;
    });

    // Axes labels
    svg += `<text x="${width / 2}" y="${height - 10}" text-anchor="middle" class="axis-label">Student Personas</text>`;
    svg += `<text x="${padding - 40}" y="${height / 2}" text-anchor="middle" class="axis-label" transform="rotate(-90 ${padding - 40} ${height / 2})">Confusion Signals</text>`;

    svg += '</svg>';
    return svg;
  } catch (error) {
    console.error('Error generating confusion density map:', error);
    return generatePlaceholderChart('Confusion Hotspots', 'Error generating chart');
  }
}

/**
 * Generate a cumulative fatigue curve
 * Returns SVG string showing mental load progression
 *
 * @param simulations - Array of student simulations
 * @returns SVG string
 */
export function generateFatigueCurve(simulations: any[]): string {
  try {
    if (!simulations || simulations.length === 0) {
      return generatePlaceholderChart('Cumulative Fatigue', 'No simulation data available');
    }

    const width = 600;
    const height = 400;
    const padding = 60;

    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += '<style>';
    svg += 'text { font-family: Arial, sans-serif; font-size: 12px; }';
    svg += '.title { font-size: 16px; font-weight: bold; }';
    svg += '.axis-label { font-size: 11px; }';
    svg += '.line { fill: none; stroke-width: 2; }';
    svg += '</style>';

    // Title
    svg += `<text x="${width / 2}" y="25" text-anchor="middle" class="title">Cumulative Fatigue Curve</text>`;

    // Axes
    svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>`;
    svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>`;

    // Axis labels
    svg += `<text x="${width - 20}" y="${height - padding + 20}" class="axis-label">Problem Sequence →</text>`;
    svg += `<text x="${padding - 50}" y="${padding - 10}" class="axis-label">Cumulative Fatigue ↑</text>`;

    // Draw curves for multiple personas
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
    simulations.slice(0, 4).forEach((sim, personaIdx) => {
      let pathData = '';

      // Simulate cumulative fatigue progression
      for (let i = 0; i <= 10; i++) {
        const progress = i / 10;
        // Cumulative fatigue increases with progress (simplified model)
        const baseFatigue = progress;
        const boostFromConfusion = ((sim.confusionSignals || 0) / 50) * progress;
        const cumulativeFatigue = Math.min(1, baseFatigue + boostFromConfusion);

        const x = padding + progress * plotWidth;
        const y = height - padding - cumulativeFatigue * plotHeight;

        pathData += (i === 0 ? 'M' : 'L') + ` ${x} ${y}`;
      }

      svg += `<path d="${pathData}" class="line" stroke="${colors[personaIdx]}" stroke-linecap="round"/>`;
    });

    // Legend
    simulations.slice(0, 4).forEach((sim, idx) => {
      const y = 60 + idx * 18;
      svg += `<rect x="${padding + 200}" y="${y - 10}" width="12" height="12" fill="${colors[idx]}"/>`;
      svg += `<text x="${padding + 220}" y="${y}" class="axis-label">${sim.studentId || `Persona ${idx + 1}`}</text>`;
    });

    svg += '</svg>';
    return svg;
  } catch (error) {
    console.error('Error generating fatigue curve:', error);
    return generatePlaceholderChart('Cumulative Fatigue', 'Error generating chart');
  }
}

/**
 * Generate a radar chart showing topic coverage by Bloom taxonomy
 * Returns SVG string
 *
 * @param problems - Array of problems with Bloom classification
 * @returns SVG string
 */
export function generateTopicRadarChart(problems: any[]): string {
  try {
    if (!problems || problems.length === 0) {
      return generatePlaceholderChart('Topic Radar', 'No problems to analyze');
    }

    const width = 500;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 120;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += '<style>';
    svg += 'text { font-family: Arial, sans-serif; font-size: 12px; }';
    svg += '.title { font-size: 16px; font-weight: bold; }';
    svg += '.axis-label { font-size: 11px; }';
    svg += '.radar-line { fill: none; stroke-width: 2; }';
    svg += '.radar-fill { fill-opacity: 0.3; stroke-width: 2; }';
    svg += '</style>';

    // Title
    svg += `<text x="${width / 2}" y="25" text-anchor="middle" class="title">Topic Coverage by Bloom Level</text>`;

    // Bloom levels for radar axes
    const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
    const bloomLevelMap: Record<string, number> = {
      'Remember': 1,
      'Understand': 2,
      'Apply': 3,
      'Analyze': 4,
      'Evaluate': 5,
      'Create': 6,
    };

    // Count problems at each Bloom level
    const bloomCounts = new Array(6).fill(0);
    problems.forEach((problem) => {
      const bloomIdx = bloomLevelMap[problem.bloomLevel] - 1;
      if (bloomIdx >= 0 && bloomIdx < 6) {
        bloomCounts[bloomIdx]++;
      }
    });

    const maxCount = Math.max(...bloomCounts, 1);

    // Draw radar grid
    for (let i = 1; i <= 3; i++) {
      const circleRadius = (radius / 3) * i;
      svg += `<circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" fill="none" stroke="#ddd" stroke-width="1"/>`;
      if (i === 3) {
        svg += `<text x="${centerX}" y="${centerY - circleRadius - 5}" text-anchor="middle" class="axis-label">${(i * (maxCount / 3)).toFixed(0)}</text>`;
      }
    }

    // Draw axes and labels
    bloomLevels.forEach((level, idx) => {
      const angle = (idx * 360) / 6 - 90;
      const radians = (angle * Math.PI) / 180;
      const x = centerX + Math.cos(radians) * radius;
      const y = centerY + Math.sin(radians) * radius;

      // Axis line
      svg += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#999" stroke-width="1"/>`;

      // Label
      const labelRadius = radius + 25;
      const labelX = centerX + Math.cos(radians) * labelRadius;
      const labelY = centerY + Math.sin(radians) * labelRadius;
      svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" class="axis-label">${level}</text>`;
    });

    // Draw data polygon
    let polygonPoints = '';
    bloomCounts.forEach((count, idx) => {
      const angle = (idx * 360) / 6 - 90;
      const radians = (angle * Math.PI) / 180;
      const normalizedCount = (count / maxCount) * radius;
      const x = centerX + Math.cos(radians) * normalizedCount;
      const y = centerY + Math.sin(radians) * normalizedCount;
      polygonPoints += (idx === 0 ? '' : ' ') + `${x},${y}`;
    });

    svg += `<polygon points="${polygonPoints}" class="radar-fill" fill="#45B7D1" stroke="#2196F3"/>`;

    svg += '</svg>';
    return svg;
  } catch (error) {
    console.error('Error generating topic radar chart:', error);
    return generatePlaceholderChart('Topic Radar', 'Error generating chart');
  }
}

/**
 * Generate a section risk matrix (time vs. confusion)
 * Returns SVG string with 2D risk assessment
 *
 * @param simulations - Array of student simulations
 * @param problems - Array of problems
 * @returns SVG string
 */
export function generateSectionRiskMatrix(simulations: any[], problems: any[]): string {
  try {
    if (!simulations || simulations.length === 0 || !problems || problems.length === 0) {
      return generatePlaceholderChart('Section Risk Matrix', 'No data available');
    }

    const width = 600;
    const height = 500;
    const padding = 80;

    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += '<style>';
    svg += 'text { font-family: Arial, sans-serif; font-size: 12px; }';
    svg += '.title { font-size: 16px; font-weight: bold; }';
    svg += '.axis-label { font-size: 11px; }';
    svg += '.risk-zone { opacity: 0.2; }';
    svg += '</style>';

    // Title
    svg += `<text x="${width / 2}" y="25" text-anchor="middle" class="title">Section Risk Assessment (Time vs. Confusion)</text>`;

    // Risk zones (diagonal, upper-right is danger)
    svg += `<rect x="${padding}" y="${padding}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#333" stroke-width="2"/>`;

    // Risk background zones
    svg += `<rect x="${padding}" y="${padding}" width="${plotWidth / 2}" height="${plotHeight / 2}" class="risk-zone" fill="#90EE90"/>`;
    svg += `<rect x="${padding + plotWidth / 2}" y="${padding}" width="${plotWidth / 2}" height="${plotHeight / 2}" class="risk-zone" fill="#FFD700"/>`;
    svg += `<rect x="${padding}" y="${padding + plotHeight / 2}" width="${plotWidth / 2}" height="${plotHeight / 2}" class="risk-zone" fill="#FFD700"/>`;
    svg += `<rect x="${padding + plotWidth / 2}" y="${padding + plotHeight / 2}" width="${plotWidth / 2}" height="${plotHeight / 2}" class="risk-zone" fill="#FF6B6B"/>`;

    // Axes
    svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>`;
    svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>`;

    // Axis labels
    svg += `<text x="${width - 20}" y="${height - padding + 20}" class="axis-label">Problem Complexity →</text>`;
    svg += `<text x="${padding - 60}" y="${padding - 10}" class="axis-label">Fatigue Level ↑</text>`;

    // Grid
    for (let i = 0; i <= 5; i++) {
      const x = padding + (plotWidth * i) / 5;
      const y = height - padding - (plotHeight * i) / 5;

      svg += `<line x1="${x}" y1="${height - padding}" x2="${x}" y2="${height - padding + 5}" stroke="#999" stroke-width="1"/>`;
      svg += `<text x="${x}" y="${height - padding + 20}" text-anchor="middle" class="axis-label" font-size="10">${i}</text>`;

      svg += `<line x1="${padding - 5}" y1="${y}" x2="${padding}" y2="${y}" stroke="#999" stroke-width="1"/>`;
      svg += `<text x="${padding - 10}" y="${y + 5}" text-anchor="end" class="axis-label" font-size="10">${i}</text>`;
    }

    // Plot sections (each problem as a dot)
    problems.forEach((problem, problemIdx) => {
      const complexity = (problem.linguisticComplexity || 0.5);
      const correspondingSim = simulations[Math.floor((problemIdx / problems.length) * simulations.length)];
      const fatigue = (correspondingSim?.fatigueIndex || 0);

      const x = padding + complexity * plotWidth;
      const y = height - padding - fatigue * plotHeight;

      // Color based on risk
      let color = '#90EE90'; // Green (low risk)
      const riskScore = complexity + fatigue;
      if (riskScore > 1.2) color = '#FF6B6B'; // Red (high risk)
      else if (riskScore > 0.8) color = '#FFD700'; // Yellow (medium risk)

      svg += `<circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="#333" stroke-width="1" opacity="0.8"/>`;
      svg += `<title>Problem ${problemIdx + 1}: Complexity ${complexity.toFixed(1)}, Fatigue ${fatigue.toFixed(1)}</title>`;
    });

    // Legend
    svg += `<rect x="${padding}" y="${padding - 50}" width="12" height="12" fill="#90EE90"/>`;
    svg += `<text x="${padding + 20}" y="${padding - 38}" class="axis-label">Safe (Low Risk)</text>`;

    svg += `<rect x="${padding + 150}" y="${padding - 50}" width="12" height="12" fill="#FFD700"/>`;
    svg += `<text x="${padding + 170}" y="${padding - 38}" class="axis-label">Caution (Medium Risk)</text>`;

    svg += `<rect x="${padding + 380}" y="${padding - 50}" width="12" height="12" fill="#FF6B6B"/>`;
    svg += `<text x="${padding + 400}" y="${padding - 38}" class="axis-label">Danger (High Risk)</text>`;

    svg += '</svg>';
    return svg;
  } catch (error) {
    console.error('Error generating section risk matrix:', error);
    return generatePlaceholderChart('Section Risk Matrix', 'Error generating chart');
  }
}

/**
 * Helper: Generate a placeholder chart for error states
 */
function generatePlaceholderChart(title: string, message: string): string {
  return `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
    <style>
      text { font-family: Arial, sans-serif; font-size: 14px; }
      .title { font-size: 16px; font-weight: bold; }
      .message { font-size: 12px; fill: #666; }
    </style>
    <rect width="600" height="400" fill="#f5f5f5" stroke="#ddd" stroke-width="1"/>
    <text x="300" y="180" text-anchor="middle" class="title">${title}</text>
    <text x="300" y="210" text-anchor="middle" class="message">${message}</text>
  </svg>`;
}
