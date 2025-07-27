import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateMermaidBarChart, 
  generateMermaidPieChart 
} from '../../../src/utils/chart.js';

// Mock the helpers module
vi.mock('../../../src/utils/helpers.js', () => ({
  applyIgnorePatterns: vi.fn(),
  filterEntries: vi.fn(),
  groupByPathLevel: vi.fn(),
  calculateMetric: vi.fn(),
  combineSmallSlices: vi.fn(),
  createReadableLabel: vi.fn(),
}));

// Import mocked functions
import { 
  applyIgnorePatterns, 
  filterEntries, 
  groupByPathLevel, 
  calculateMetric, 
  combineSmallSlices, 
  createReadableLabel 
} from '../../../src/utils/helpers.js';

// Mock GitDiffEntry type for testing
interface GitDiffEntry {
  filename: string;
  additions: number;
  deletions: number;
}

describe('Chart Generation Functions', () => {
  const mockEntries: GitDiffEntry[] = [
    { filename: 'src/components/Button.tsx', additions: 10, deletions: 5 },
    { filename: 'src/utils/helper.ts', additions: 8, deletions: 2 },
    { filename: 'tests/unit/button.test.ts', additions: 15, deletions: 0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(applyIgnorePatterns).mockImplementation((entries) => entries);
    vi.mocked(filterEntries).mockImplementation((entries) => entries);
    vi.mocked(groupByPathLevel).mockReturnValue(new Map([
      ['src', mockEntries.slice(0, 2)],
      ['tests', mockEntries.slice(2)],
    ]));
    vi.mocked(calculateMetric).mockReturnValue(15);
    vi.mocked(combineSmallSlices).mockImplementation((data) => data);
    vi.mocked(createReadableLabel).mockImplementation((label, value, total) => 
      `${label} (${Math.round((value / total) * 100)}%)`
    );
  });

  describe('generateMermaidBarChart', () => {
    it('should generate a basic bar chart', () => {
      const options = {
        level: 1,
        metric: 'total' as const,
      };

      const result = generateMermaidBarChart(mockEntries, options);

      expect(result).toContain('xychart-beta');
      expect(result).toContain('title "Git Diff Total Changes"');
      expect(result).toContain('x-axis ["src", "tests"]');
      expect(result).toContain('y-axis "Total Changes"');
      expect(result).toContain('bar [15, 15]');
    });

    it('should apply ignore patterns', () => {
      const options = {
        level: 1,
        metric: 'total' as const,
        ignorePatterns: ['*.test.ts'],
      };

      generateMermaidBarChart(mockEntries, options);

      expect(applyIgnorePatterns).toHaveBeenCalledWith(mockEntries, ['*.test.ts']);
    });

    it('should apply filters when provided', () => {
      const options = {
        level: 1,
        metric: 'total' as const,
        filter: 'src',
      };

      generateMermaidBarChart(mockEntries, options);

      expect(filterEntries).toHaveBeenCalledWith(mockEntries, 'src');
    });

    it('should use custom title when provided', () => {
      const options = {
        level: 1,
        metric: 'total' as const,
        title: 'Custom Chart Title',
      };

      const result = generateMermaidBarChart(mockEntries, options);

      expect(result).toContain('title "Custom Chart Title"');
    });

    it('should limit items based on maxItems', () => {
      vi.mocked(groupByPathLevel).mockReturnValue(new Map([
        ['src', mockEntries.slice(0, 1)],
        ['tests', mockEntries.slice(1, 2)],
        ['docs', mockEntries.slice(2)],
      ]));

      const options = {
        level: 1,
        metric: 'total' as const,
        maxItems: 2,
      };

      const result = generateMermaidBarChart(mockEntries, options);

      // Should only contain first 2 items
      expect(result).toContain('x-axis ["src", "tests"]');
      expect(result).not.toContain('docs');
    });

    it('should handle different metrics', () => {
      const options = {
        level: 1,
        metric: 'additions' as const,
      };

      const result = generateMermaidBarChart(mockEntries, options);

      expect(result).toContain('y-axis "Additions"');
      expect(calculateMetric).toHaveBeenCalledWith(expect.any(Array), 'additions');
    });

    it('should handle deletions metric', () => {
      const options = {
        level: 1,
        metric: 'deletions' as const,
      };

      const result = generateMermaidBarChart(mockEntries, options);

      expect(result).toContain('y-axis "Deletions"');
      expect(calculateMetric).toHaveBeenCalledWith(expect.any(Array), 'deletions');
    });

    it('should return no data chart when no entries', () => {
      vi.mocked(groupByPathLevel).mockReturnValue(new Map());

      const options = {
        level: 1,
        metric: 'total' as const,
      };

      const result = generateMermaidBarChart([], options);

      expect(result).toContain('title "No Changes Found"');
      expect(result).toContain('x-axis ["No data"]');
      expect(result).toContain('bar [1]');
    });

    it('should exclude groups with zero values', () => {
      vi.mocked(calculateMetric)
        .mockReturnValueOnce(15) // src group
        .mockReturnValueOnce(0); // tests group (should be excluded)

      const options = {
        level: 1,
        metric: 'total' as const,
      };

      const result = generateMermaidBarChart(mockEntries, options);

      expect(result).toContain('x-axis ["src"]');
      expect(result).toContain('bar [15]');
    });


    it('should calculate appropriate y-axis maximum', () => {
      vi.mocked(calculateMetric).mockReturnValue(100);

      const options = {
        level: 1,
        metric: 'total' as const,
      };

      const result = generateMermaidBarChart(mockEntries, options);

      // Should be 111 (100 * 1.1 ceil)
      expect(result).toContain('0 --> 111');
    });
  });

  describe('generateMermaidPieChart', () => {
    beforeEach(() => {
      // Reset mock to return chart data format for pie charts
      vi.mocked(combineSmallSlices).mockReturnValue([
        { label: 'src', value: 18 },
        { label: 'tests', value: 15 },
      ]);
    });

    it('should generate a basic pie chart', () => {
      const options = {
        level: 1,
        metric: 'total' as const,
      };

      const result = generateMermaidPieChart(mockEntries, options);

      expect(result).toContain('pie title Git Diff Total Changes');
      expect(result).toContain('"src (55%)" : 18');
      expect(result).toContain('"tests (45%)" : 15');
    });

    it('should use custom title when provided', () => {
      const options = {
        level: 1,
        metric: 'total' as const,
        title: 'Custom Pie Chart',
      };

      const result = generateMermaidPieChart(mockEntries, options);

      expect(result).toContain('pie title Custom Pie Chart');
    });

    it('should apply otherThreshold for combining small slices', () => {
      const options = {
        level: 1,
        metric: 'total' as const,
        otherThreshold: 10,
      };

      generateMermaidPieChart(mockEntries, options);

      expect(combineSmallSlices).toHaveBeenCalledWith(
        expect.any(Array),
        10
      );
    });

    it('should handle no data scenario', () => {
      vi.mocked(combineSmallSlices).mockReturnValue([]);

      const options = {
        level: 1,
        metric: 'total' as const,
      };

      const result = generateMermaidPieChart(mockEntries, options);

      expect(result).toContain('pie title No Changes Found');
      expect(result).toContain('"No data" : 1');
    });

    it('should clean labels by replacing special characters', () => {
      vi.mocked(createReadableLabel).mockReturnValue('test:label"with:quotes');
      vi.mocked(combineSmallSlices).mockReturnValue([
        { label: 'test', value: 10 },
      ]);

      const options = {
        level: 1,
        metric: 'total' as const,
      };

      const result = generateMermaidPieChart(mockEntries, options);

      expect(result).toContain('"test_label_with_quotes" : 10');
    });

    it('should handle different metrics', () => {
      const options = {
        level: 1,
        metric: 'additions' as const,
      };

      const result = generateMermaidPieChart(mockEntries, options);

      expect(result).toContain('pie title Git Diff Additions');
      expect(calculateMetric).toHaveBeenCalledWith(expect.any(Array), 'additions');
    });

    it('should use createReadableLabel with correct parameters', () => {
      vi.mocked(combineSmallSlices).mockReturnValue([
        { label: 'src', value: 20 },
        { label: 'tests', value: 30 },
      ]);

      const options = {
        level: 1,
        metric: 'total' as const,
      };

      generateMermaidPieChart(mockEntries, options);

      expect(createReadableLabel).toHaveBeenCalledWith('src', 20, 50);
      expect(createReadableLabel).toHaveBeenCalledWith('tests', 30, 50);
    });
  });

  describe('Helper Functions', () => {
    describe('getMetricDisplayName (indirectly tested)', () => {
      it('should return correct display names for each metric', () => {
        const totalOptions = { level: 1, metric: 'total' as const };
        const additionsOptions = { level: 1, metric: 'additions' as const };
        const deletionsOptions = { level: 1, metric: 'deletions' as const };

        const totalResult = generateMermaidBarChart(mockEntries, totalOptions);
        const additionsResult = generateMermaidBarChart(mockEntries, additionsOptions);
        const deletionsResult = generateMermaidBarChart(mockEntries, deletionsOptions);

        expect(totalResult).toContain('y-axis "Total Changes"');
        expect(additionsResult).toContain('y-axis "Additions"');
        expect(deletionsResult).toContain('y-axis "Deletions"');
      });
    });
  });

  describe('Integration with helpers', () => {
    it('should call all helper functions in correct order for bar chart', () => {
      const options = {
        level: 2,
        metric: 'additions' as const,
        filter: 'src',
        ignorePatterns: ['*.test.ts'],
      };

      generateMermaidBarChart(mockEntries, options);

      expect(applyIgnorePatterns).toHaveBeenCalledWith(mockEntries, ['*.test.ts']);
      expect(filterEntries).toHaveBeenCalledWith(mockEntries, 'src');
      expect(groupByPathLevel).toHaveBeenCalledWith(mockEntries, 2);
      expect(calculateMetric).toHaveBeenCalledWith(expect.any(Array), 'additions');
    });

    it('should call all helper functions in correct order for pie chart', () => {
      const options = {
        level: 1,
        metric: 'deletions' as const,
        otherThreshold: 5,
      };

      generateMermaidPieChart(mockEntries, options);

      expect(applyIgnorePatterns).toHaveBeenCalledWith(mockEntries, []);
      expect(groupByPathLevel).toHaveBeenCalledWith(mockEntries, 1);
      expect(calculateMetric).toHaveBeenCalledWith(expect.any(Array), 'deletions');
      expect(combineSmallSlices).toHaveBeenCalledWith(expect.any(Array), 5);
      expect(createReadableLabel).toHaveBeenCalled();
    });
  });
});