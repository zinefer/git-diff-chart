import fs from 'fs';
import { execSync } from 'child_process';

export interface GitDiffEntry {
  additions: number;
  deletions: number;
  filename: string;
}

export function runGitDiff(baseBranch?: string): string {
  try {
    if (!process.stdin.isTTY) {
      // Read from STDIN if piped
      return fs.readFileSync(0, 'utf-8');
    } else {
      const command = baseBranch ? `git diff ${baseBranch} --numstat` : 'git diff --numstat';
      return execSync(command, { encoding: 'utf-8' });
    }
  } catch (error) {
    console.error(`Error running git diff: ${error}`);
    process.exit(1);
  }
}

export function parseGitDiffNumstat(diffOutput: string): GitDiffEntry[] {
  return diffOutput
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const additions = parseInt(parts[0]) || 0;
      const deletions = parseInt(parts[1]) || 0;
      const filename = parts.slice(2).join(' ');
      return { additions, deletions, filename };
    });
}

export function applyIgnorePatterns(entries: GitDiffEntry[], ignorePatterns: string[]): GitDiffEntry[] {
  return entries.filter((entry) => {
    return !ignorePatterns.some((pattern) => {
      const regex = new RegExp(pattern);
      return regex.test(entry.filename);
    });
  });
}

export function groupByPathLevel(entries: GitDiffEntry[], level: number): Map<string, GitDiffEntry[]> {
  const groups = new Map<string, GitDiffEntry[]>();
  for (const entry of entries) {
    const pathParts = entry.filename.split('/');
    const groupKey = level < pathParts.length ? pathParts.slice(0, level + 1).join('/') : entry.filename;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(entry);
  }

  return groups;
}

export function filterEntries(entries: GitDiffEntry[], filter: string): GitDiffEntry[] {
  const pattern = new RegExp(filter);
  return entries.filter((entry) => pattern.test(entry.filename));
}

export function calculateMetric(entries: GitDiffEntry[], metric: 'additions' | 'deletions' | 'total'): number {
  return entries.reduce((sum, entry) => {
    switch (metric) {
      case 'additions':
        return sum + entry.additions;
      case 'deletions':
        return sum + entry.deletions;
      case 'total':
        return sum + entry.additions + entry.deletions;
      default:
        return sum;
    }
  }, 0);
}

export function combineSmallSlices(chartData: Array<{ label: string; value: number }>, threshold: number): Array<{ label: string; value: number }> {
  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);
  const minValue = (totalValue * threshold) / 100;

  const largeSlices = chartData.filter((item) => item.value >= minValue);

  const smallSlices = chartData.filter((item) => item.value < minValue);
  if (smallSlices.length === 0) {
    return largeSlices;
  }
  
  const result = [...largeSlices];

  const otherValue = smallSlices.reduce((sum, item) => sum + item.value, 0);
  if (otherValue > 0) {
    result.push({ label: `Other (${smallSlices.length} items)`, value: otherValue });
  }

  return result;
}

export function createReadableLabel(label: string, value: number, totalValue: number): string {
  const percentage = ((value / totalValue) * 100).toFixed(1);
  const shortLabel = label.length > 20 ? label.substring(0, 17) + '...' : label;
  return `${shortLabel} (${value} - ${percentage}%)`;
}
