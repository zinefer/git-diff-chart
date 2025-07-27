import { runGitDiff, parseGitDiffNumstat } from '../utils/helpers.js';
import { generateMermaidPieChart } from '../utils/chart.js';
import { ChartOptions } from '../types.js';

export function pieCommand(options: ChartOptions) {
  const diffOutput = runGitDiff(options.baseBranch);
  const entries = parseGitDiffNumstat(diffOutput);
  if (!entries || entries.length === 0) {
    console.error('No input data');
    process.exit(1);
  }
  const chart = generateMermaidPieChart(entries, options);
  console.log(chart);
}
