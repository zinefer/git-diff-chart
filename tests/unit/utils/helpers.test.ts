import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import fs from 'fs';
import { execSync } from 'child_process';

import {
  runGitDiff,
  parseGitDiffNumstat,
  applyIgnorePatterns,
  groupByPathLevel,
  filterEntries,
  calculateMetric,
  combineSmallSlices,
  createReadableLabel,
  GitDiffEntry
} from '../../../src/utils/helpers';

// Mock dependencies
vi.mock('fs');
vi.mock('child_process');

const mockFs = vi.mocked(fs);
const mockExecSync = vi.mocked(execSync);

describe('Git Diff Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runGitDiff', () => {
    it('should read from stdin when not in TTY mode', () => {
      // Mock stdin not being a TTY
      vi.stubGlobal('process', {
        ...process,
        stdin: { isTTY: false }
      });
      
      const mockStdinData = '10\t5\tsrc/file.ts\n20\t15\tsrc/other.ts\n';
      mockFs.readFileSync.mockReturnValue(mockStdinData);

      const result = runGitDiff('main');

      expect(mockFs.readFileSync).toHaveBeenCalledWith(0, 'utf-8');
      expect(result).toBe(mockStdinData);
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should run git diff command when in TTY mode', () => {
      // Mock stdin being a TTY
      vi.stubGlobal('process', {
        ...process,
        stdin: { isTTY: true }
      });

      const mockGitOutput = '10\t5\tsrc/file.ts\n20\t15\tsrc/other.ts\n';
      mockExecSync.mockReturnValue(mockGitOutput);

      const result = runGitDiff('main');

      expect(mockExecSync).toHaveBeenCalledWith('git diff main --numstat', { encoding: 'utf-8' });
      expect(result).toBe(mockGitOutput);
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should exit with error code 1 when git command fails', () => {
      vi.stubGlobal('process', {
        ...process,
        stdin: { isTTY: true },
        exit: vi.fn()
      });

      const mockError = new Error('git command failed');
      mockExecSync.mockImplementation(() => {
        throw mockError;
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      runGitDiff('main');

      expect(consoleSpy).toHaveBeenCalledWith(`Error running git diff: ${mockError}`);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('parseGitDiffNumstat', () => {
    it('should parse valid git diff numstat output', () => {
      const diffOutput = '10\t5\tsrc/file.ts\n20\t15\ttest/other.spec.ts\n';
      
      const result = parseGitDiffNumstat(diffOutput);

      expect(result).toEqual([
        { additions: 10, deletions: 5, filename: 'src/file.ts' },
        { additions: 20, deletions: 15, filename: 'test/other.spec.ts' }
      ]);
    });

    it('should handle files with spaces in names', () => {
      const diffOutput = '5\t3\tsrc/file with spaces.ts\n';
      
      const result = parseGitDiffNumstat(diffOutput);

      expect(result).toEqual([
        { additions: 5, deletions: 3, filename: 'src/file with spaces.ts' }
      ]);
    });

    it('should handle binary files (- for additions/deletions)', () => {
      const diffOutput = '-\t-\timage.png\n10\t5\tsrc/file.ts\n';
      
      const result = parseGitDiffNumstat(diffOutput);

      expect(result).toEqual([
        { additions: 0, deletions: 0, filename: 'image.png' },
        { additions: 10, deletions: 5, filename: 'src/file.ts' }
      ]);
    });

    it('should handle empty input', () => {
      const result = parseGitDiffNumstat('');
      expect(result).toEqual([]);
    });

    it('should filter out empty lines', () => {
      const diffOutput = '10\t5\tsrc/file.ts\n\n20\t15\ttest/other.spec.ts\n\n';
      
      const result = parseGitDiffNumstat(diffOutput);

      expect(result).toEqual([
        { additions: 10, deletions: 5, filename: 'src/file.ts' },
        { additions: 20, deletions: 15, filename: 'test/other.spec.ts' }
      ]);
    });
  });

  describe('applyIgnorePatterns', () => {
    const sampleEntries: GitDiffEntry[] = [
      { additions: 10, deletions: 5, filename: 'src/components/Button.tsx' },
      { additions: 20, deletions: 15, filename: 'src/utils/helper.ts' },
      { additions: 5, deletions: 2, filename: 'test/Button.test.tsx' },
      { additions: 8, deletions: 3, filename: 'dist/bundle.js' },
      { additions: 12, deletions: 7, filename: 'node_modules/package/index.js' }
    ];

    it('should filter out files matching ignore patterns', () => {
      const ignorePatterns = ['^test/', '^dist/', 'node_modules'];
      
      const result = applyIgnorePatterns(sampleEntries, ignorePatterns);

      expect(result).toEqual([
        { additions: 10, deletions: 5, filename: 'src/components/Button.tsx' },
        { additions: 20, deletions: 15, filename: 'src/utils/helper.ts' }
      ]);
    });

    it('should return all entries when no patterns match', () => {
      const ignorePatterns = ['^build/', '\\.log$'];
      
      const result = applyIgnorePatterns(sampleEntries, ignorePatterns);

      expect(result).toEqual(sampleEntries);
    });

    it('should handle empty ignore patterns', () => {
      const result = applyIgnorePatterns(sampleEntries, []);
      expect(result).toEqual(sampleEntries);
    });

    it('should handle complex regex patterns', () => {
      const ignorePatterns = ['\\.test\\.(ts|tsx)$', '\\.(js|css)$'];
      
      const result = applyIgnorePatterns(sampleEntries, ignorePatterns);

      expect(result).toEqual([
        { additions: 10, deletions: 5, filename: 'src/components/Button.tsx' },
        { additions: 20, deletions: 15, filename: 'src/utils/helper.ts' }
      ]);
    });
  });

  describe('groupByPathLevel', () => {
    const sampleEntries: GitDiffEntry[] = [
      { additions: 10, deletions: 5, filename: 'src/components/Button.tsx' },
      { additions: 20, deletions: 15, filename: 'src/components/Input.tsx' },
      { additions: 8, deletions: 3, filename: 'src/utils/helper.ts' },
      { additions: 5, deletions: 2, filename: 'test/unit/Button.test.tsx' },
      { additions: 12, deletions: 7, filename: 'README.md' }
    ];

    it('should group by first level (directories)', () => {
      const result = groupByPathLevel(sampleEntries, 0);

      expect(result.size).toBe(3);
      expect(result.get('src')).toEqual([
        { additions: 10, deletions: 5, filename: 'src/components/Button.tsx' },
        { additions: 20, deletions: 15, filename: 'src/components/Input.tsx' },
        { additions: 8, deletions: 3, filename: 'src/utils/helper.ts' }
      ]);
      expect(result.get('test')).toEqual([
        { additions: 5, deletions: 2, filename: 'test/unit/Button.test.tsx' }
      ]);
      expect(result.get('README.md')).toEqual([
        { additions: 12, deletions: 7, filename: 'README.md' }
      ]);
    });

    it('should group by second level (subdirectories)', () => {
      const result = groupByPathLevel(sampleEntries, 1);

      expect(result.size).toBe(4);
      expect(result.get('src/components')).toEqual([
        { additions: 10, deletions: 5, filename: 'src/components/Button.tsx' },
        { additions: 20, deletions: 15, filename: 'src/components/Input.tsx' }
      ]);
      expect(result.get('src/utils')).toEqual([
        { additions: 8, deletions: 3, filename: 'src/utils/helper.ts' }
      ]);
      expect(result.get('test/unit')).toEqual([
        { additions: 5, deletions: 2, filename: 'test/unit/Button.test.tsx' }
      ]);
    });

    it('should handle level beyond file depth', () => {
      const result = groupByPathLevel(sampleEntries, 10);

      expect(result.size).toBe(5);
      sampleEntries.forEach(entry => {
        expect(result.get(entry.filename)).toEqual([entry]);
      });
    });
  });

  describe('filterEntries', () => {
    const sampleEntries: GitDiffEntry[] = [
      { additions: 10, deletions: 5, filename: 'src/components/Button.tsx' },
      { additions: 20, deletions: 15, filename: 'src/utils/helper.ts' },
      { additions: 5, deletions: 2, filename: 'test/Button.test.tsx' },
      { additions: 8, deletions: 3, filename: 'dist/bundle.js' }
    ];

    it('should filter entries by regex pattern', () => {
      const result = filterEntries(sampleEntries, '\\.tsx$');

      expect(result).toEqual([
        { additions: 10, deletions: 5, filename: 'src/components/Button.tsx' },
        { additions: 5, deletions: 2, filename: 'test/Button.test.tsx' }
      ]);
    });

    it('should filter entries by directory pattern', () => {
      const result = filterEntries(sampleEntries, '^src/');

      expect(result).toEqual([
        { additions: 10, deletions: 5, filename: 'src/components/Button.tsx' },
        { additions: 20, deletions: 15, filename: 'src/utils/helper.ts' }
      ]);
    });

    it('should return empty array when no matches', () => {
      const result = filterEntries(sampleEntries, '\\.py$');
      expect(result).toEqual([]);
    });

    it('should return all entries when pattern matches all', () => {
      const result = filterEntries(sampleEntries, '.*');
      expect(result).toEqual(sampleEntries);
    });
  });

  describe('calculateMetric', () => {
    const sampleEntries: GitDiffEntry[] = [
      { additions: 10, deletions: 5, filename: 'file1.ts' },
      { additions: 20, deletions: 15, filename: 'file2.ts' },
      { additions: 8, deletions: 3, filename: 'file3.ts' }
    ];

    it('should calculate total additions', () => {
      const result = calculateMetric(sampleEntries, 'additions');
      expect(result).toBe(38); // 10 + 20 + 8
    });

    it('should calculate total deletions', () => {
      const result = calculateMetric(sampleEntries, 'deletions');
      expect(result).toBe(23); // 5 + 15 + 3
    });

    it('should calculate total changes', () => {
      const result = calculateMetric(sampleEntries, 'total');
      expect(result).toBe(61); // 38 + 23
    });

    it('should return 0 for empty array', () => {
      expect(calculateMetric([], 'additions')).toBe(0);
      expect(calculateMetric([], 'deletions')).toBe(0);
      expect(calculateMetric([], 'total')).toBe(0);
    });

    it('should handle invalid metric type', () => {
      // @ts-expect-error Testing invalid metric type
      const result = calculateMetric(sampleEntries, 'invalid');
      expect(result).toBe(0);
    });
  });

  describe('combineSmallSlices', () => {
    const sampleData = [
      { label: 'Large Item 1', value: 100 },
      { label: 'Large Item 2', value: 80 },
      { label: 'Medium Item', value: 50 },
      { label: 'Small Item 1', value: 10 },
      { label: 'Small Item 2', value: 7 },
      { label: 'Small Item 3', value: 3 }
    ];

    it('should combine small slices below threshold', () => {
      const result = combineSmallSlices(sampleData, 5); // 5% threshold
      
      // Total value is 250, so 5% threshold is 12.5
      expect(result).toEqual([
        { label: 'Large Item 1', value: 100 },
        { label: 'Large Item 2', value: 80 },
        { label: 'Medium Item', value: 50 },
        { label: 'Other (3 items)', value: 20 } // 10 + 7 + 3
      ]);
    });

    it('should not combine when all items are above threshold', () => {
      const result = combineSmallSlices(sampleData, 1); // 1% threshold
      
      // All items are above 2.5 (1% of 250)
      expect(result).toEqual(sampleData);
    });

    it('should handle empty small slices', () => {
      const largeData = [
        { label: 'Large Item 1', value: 100 },
        { label: 'Large Item 2', value: 80 }
      ];
      
      const result = combineSmallSlices(largeData, 10);
      expect(result).toEqual(largeData);
    });

    it('should handle zero threshold', () => {
      const result = combineSmallSlices(sampleData, 0);
      expect(result).toEqual(sampleData);
    });

    it('should handle 100% threshold', () => {
      const result = combineSmallSlices(sampleData, 100);
      
      expect(result).toEqual([
        { label: 'Other (6 items)', value: 250 }
      ]);
    });
  });

  describe('createReadableLabel', () => {
    it('should create readable label with percentage', () => {
      const result = createReadableLabel('src/components', 50, 200);
      expect(result).toBe('src/components (50 - 25.0%)');
    });

    it('should truncate long labels', () => {
      const longLabel = 'src/very/long/path/to/some/component/file.tsx';
      const result = createReadableLabel(longLabel, 30, 100);
      expect(result).toBe('src/very/long/pat... (30 - 30.0%)');
    });

    it('should not truncate short labels', () => {
      const shortLabel = 'src/file.ts';
      const result = createReadableLabel(shortLabel, 25, 100);
      expect(result).toBe('src/file.ts (25 - 25.0%)');
    });

    it('should handle zero values', () => {
      const result = createReadableLabel('test', 0, 100);
      expect(result).toBe('test (0 - 0.0%)');
    });

    it('should handle 100% values', () => {
      const result = createReadableLabel('all', 100, 100);
      expect(result).toBe('all (100 - 100.0%)');
    });

    it('should round percentage to one decimal place', () => {
      const result = createReadableLabel('test', 33, 100);
      expect(result).toBe('test (33 - 33.0%)');
      
      const result2 = createReadableLabel('test', 1, 3);
      expect(result2).toBe('test (1 - 33.3%)');
    });
  });
});
