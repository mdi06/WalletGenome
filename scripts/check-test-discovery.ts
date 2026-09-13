import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

function scanFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return scanFiles(file);
    return entry.isFile() ? [file] : [];
  });
}

function listedFiles(command: string, args: string[]): string[] {
  return execFileSync(command, args, { encoding: 'utf8' })
    .split('\n')
    .map(file => file.trim())
    .filter(Boolean);
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: { test?: string };
};
const testCommand = packageJson.scripts?.test ?? '';
const trackedTestFiles = listedFiles('git', ['ls-files', 'src'])
  .filter(file => /\.test\.tsx?$/.test(file));
const discoveredTestFiles = scanFiles('src')
  .filter(file => /\.test\.tsx?$/.test(file));
const missingFromDiscovery = trackedTestFiles.filter(file => !discoveredTestFiles.includes(file));
const commandCoversFile = (file: string): boolean => file.endsWith('.test.tsx')
  ? testCommand.includes('.test.tsx')
  : testCommand.includes('.test.ts');
const missingFromCommand = trackedTestFiles.filter(file => !commandCoversFile(file));

if (missingFromDiscovery.length > 0 || missingFromCommand.length > 0) {
  const details = [
    ...missingFromDiscovery.map(file => `not found by file scan: ${file}`),
    ...missingFromCommand.map(file => `not covered by npm test patterns: ${file}`),
  ];
  throw new Error(`Test discovery check failed:\n${details.join('\n')}`);
}

console.log(`Test discovery check passed for ${trackedTestFiles.length} tracked test files.`);
