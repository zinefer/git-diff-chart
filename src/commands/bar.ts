// CLI command for generating a bar chart from git diff data
import { runGitDiff, parseGitDiffNumstat, wrapInMarkdown } from '../utils/helpers.js';
import { generateMermaidBarChart, ChartOptions } from '../utils/chart.js';

export function barCommand(options: ChartOptions) {
  const diffOutput = runGitDiff(options.baseBranch);
  const entries = parseGitDiffNumstat(diffOutput);
  if (!entries || entries.length === 0) {
    console.error('No input data');
    process.exit(1);
  }
  const chart = generateMermaidBarChart(entries, options);
  console.log(wrapInMarkdown(chart));
}
