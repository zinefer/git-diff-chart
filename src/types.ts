// Type definitions extracted from PoC

export interface GitDiffEntry {
  additions: number;
  deletions: number;
  filename: string;
}

export interface ChartOptions {
  level: number;
  filter?: string;
  metric: 'additions' | 'deletions' | 'total';
  title?: string;
  baseBranch: string;
  ignorePatterns: string[];
  otherThreshold: number;
  chartType: 'pie' | 'bar';
  maxItems: number;
}
