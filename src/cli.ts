import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Command } from 'commander';

import { barCommand } from './commands/bar.js';
import { pieCommand } from './commands/pie.js';
import { ChartOptions } from './types.js';


const program = new Command();

// Shared option definitions
const commonOptions = [
  ['-b, --base <branch>',    'Base branch to compare against', 'main'],
  ['-l, --level <number>',   'Path level to group by', '1'],
  ['-f, --filter <pattern>', 'Filter files by regex pattern'],
  ['-m, --metric <type>',    'Metric to chart: additions, deletions, total', 'total'],
  ['-t, --title <title>',    'Custom chart title']
];

// Helper function to add common options to a command
function addCommonOptions(command: Command): Command {
  // Add regular options
  commonOptions.forEach(([flags, description, defaultValue]) => {
    command.option(flags, description, defaultValue);
  });
  
  // Add the special ignore option separately
  command.option('-i, --ignore <pattern>', 'Add ignore pattern', (val: string, acc: string[]) => { 
    acc.push(val); 
    return acc; 
  }, []);
  
  return command;
}

// Helper function to parse common options
function parseCommonOptions(opts: Record<string, any>): Partial<ChartOptions> {
  return {
    level: parseInt(opts.level),
    filter: opts.filter,
    metric: opts.metric,
    title: opts.title,
    baseBranch: opts.base,
    ignorePatterns: opts.ignore || [],
  };
}

// Chart command configuration
interface ChartCommandConfig {
  name: string;
  description: string;
  specificOptions?: Array<[string, string, string?]>;
  handler: (options: ChartOptions) => void;
  defaultOptions: Partial<ChartOptions>;
}

const chartCommands: ChartCommandConfig[] = [
  {
    name: 'bar',
    description: 'Generate a bar chart from git diff data',
    specificOptions: [
      ['--max-items <number>', 'Maximum number of items to show', '20']
    ],
    handler: barCommand,
    defaultOptions: {
      chartType: 'bar',
      otherThreshold: 5,
      maxItems: 20
    }
  },
  {
    name: 'pie',
    description: 'Generate a pie chart from git diff data',
    specificOptions: [
      ['--other-threshold <percent>', 'Threshold for combining small slices into "Other"', '5']
    ],
    handler: pieCommand,
    defaultOptions: {
      chartType: 'pie',
      otherThreshold: 5,
      maxItems: 20
    }
  }
];

const pkg = require('../package.json');

program
  .name('git-diff-chart')
  .description('Generate Mermaid charts from git diff data')
  .version(pkg.version);

// Register chart commands
chartCommands.forEach(({ name, description, specificOptions, handler, defaultOptions }) => {
  let command = program
    .command(name)
    .description(description);

  // Add common options
  command = addCommonOptions(command);

  // Add specific options
  if (specificOptions) {
    specificOptions.forEach(([flags, desc, defaultValue]) => {
      command.option(flags, desc, defaultValue);
    });
  }

  // Add action handler
  command.action((opts: Record<string, any>) => {
    const commonOpts = parseCommonOptions(opts);
    
    // Parse specific options based on command
    const specificOpts: Partial<ChartOptions> = {};
    if (name === 'bar' && opts.maxItems) {
      specificOpts.maxItems = parseInt(opts.maxItems);

      if (isNaN(specificOpts.maxItems) || specificOpts.maxItems < 1) {
        console.error(`Invalid max-items: ${opts.maxItems}. Must be a positive integer.`);
        process.exit(1);
      }
    } else if (name === 'pie' && opts.otherThreshold) {
      specificOpts.otherThreshold = parseFloat(opts.otherThreshold);

      if (isNaN(specificOpts.otherThreshold) || specificOpts.otherThreshold < 0) {
        console.error(`Invalid other-threshold: ${opts.otherThreshold}. Must be a non-negative number.`);
        process.exit(1);
      }
    }

    const options: ChartOptions = {
      ...defaultOptions,
      ...commonOpts,
      ...specificOpts,
    } as ChartOptions;

    // Validate metric
    const validMetrics = ['total', 'additions', 'deletions'];
    if (!validMetrics.includes(options.metric)) {
      console.error(`Invalid metric: ${options.metric}`);
      process.exit(1);
    }

    // Validate level
    if (!Number.isInteger(options.level) || options.level < 1) {
      console.error(`Invalid level: ${options.level}. Level must be a positive integer.`);
      process.exit(1);
    }

    handler(options);
  });
});

program.parse(process.argv);