import { 
  applyIgnorePatterns, 
  filterEntries, 
  groupByPathLevel, 
  calculateMetric, 
  combineSmallSlices, 
  createReadableLabel, 
  GitDiffEntry
} from './helpers.js';

export interface ChartOptions {
  level: number;
  filter?: string;
  metric: 'total' | 'additions' | 'deletions';
  title?: string;
  ignorePatterns?: string[];
  maxItems?: number;
  otherThreshold?: number;
  baseBranch?: string;
}

interface ChartData {
  label: string;
  value: number;
}

// Shared data processing logic
function processChartData(entries: GitDiffEntry[], options: ChartOptions): ChartData[] {
  const { level, filter, metric, ignorePatterns } = options;
  
  let filteredEntries = applyIgnorePatterns(entries, ignorePatterns || []);
  if (filter) {
    filteredEntries = filterEntries(filteredEntries, filter);
  }
  
  const groups = groupByPathLevel(filteredEntries, level);
  const chartData: ChartData[] = [];
  
  groups.forEach((groupEntries: GitDiffEntry[], groupKey: string) => {
    const value = calculateMetric(groupEntries, metric);
    if (value > 0) {
      chartData.push({ label: groupKey, value });
    }
  });
  
  return chartData.sort((a, b) => b.value - a.value);
}

// Helper to get metric display name
function getMetricDisplayName(metric: string): string {
  switch (metric) {
    case 'total': return 'Total Changes';
    case 'additions': return 'Additions';
    case 'deletions': return 'Deletions';
    default: return metric;
  }
}

// Helper to generate chart title
function generateChartTitle(title: string | undefined, metric: string): string {
  return title || `Git Diff ${getMetricDisplayName(metric)}`;
}


export function generateMermaidBarChart(
  entries: GitDiffEntry[],
  options: ChartOptions,
): string {
  const { maxItems = Infinity } = options;
  
  let chartData = processChartData(entries, options);
  chartData = chartData.slice(0, maxItems);
  
  if (chartData.length === 0) {
    return `xychart-beta
    title "No Changes Found"
    x-axis ["No data"]
    y-axis "Changes" 0 --> 1
    bar [1]`;
  }
  
  const metricName = getMetricDisplayName(options.metric);
  const chartTitle = generateChartTitle(options.title, options.metric);
  
  const labels = chartData.map(item => `"${item.label}"`);
  const values = chartData.map(item => item.value);
  const maxValue = Math.max(...values);
  const yAxisMax = Math.ceil(maxValue * 1.1);
  
  return `xychart-beta
    title "${chartTitle}"
    x-axis [${labels.join(', ')}]
    y-axis "${metricName}" 0 --> ${yAxisMax}
    bar [${values.join(', ')}]`;
}

export function generateMermaidPieChart(
  entries: GitDiffEntry[],
  options: ChartOptions,
): string {
  const { otherThreshold = 0 } = options;
  
  let chartData = processChartData(entries, options);
  chartData = combineSmallSlices(chartData, otherThreshold);
  
  if (chartData.length === 0) {
    return `pie title No Changes Found
    "No data" : 1`;
  }
  
  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);
  const chartTitle = generateChartTitle(options.title, options.metric);
  
  let mermaidChart = `pie title ${chartTitle}\n`;
  
  for (const { label, value } of chartData) {
    const readableLabel = createReadableLabel(label, value, totalValue);
    const cleanLabel = readableLabel.replace(/[:"]/g, '_');
    mermaidChart += `    "${cleanLabel}" : ${value}\n`;
  }
  
  return mermaidChart;
}