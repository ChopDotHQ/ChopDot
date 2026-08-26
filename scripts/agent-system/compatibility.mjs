import { access, lstat, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function probeKnownsCompatibility(root, options = {}) {
  const exactRoot = path.resolve(root);
  const tasksPath = path.join(exactRoot, '.knowns', 'tasks');
  let info;
  try { info = await lstat(tasksPath); } catch (error) {
    return { compatible: false, root: exactRoot, tasks_path: tasksPath, tasks_kind: 'missing', code: error.code ?? 'ENOENT', runner_dependency: false };
  }
  const kind = info.isFile() ? 'generated_file' : info.isDirectory() ? 'directory' : 'unsupported';
  const toolExpects = options.toolExpects ?? 'file';
  const compatible = (toolExpects === 'file' && info.isFile()) || (toolExpects === 'directory' && info.isDirectory());
  return {
    compatible,
    root: exactRoot,
    tasks_path: tasksPath,
    tasks_kind: kind,
    tool_expects: toolExpects,
    code: compatible ? null : toolExpects === 'directory' && info.isFile() ? 'ENOTDIR' : 'TYPE_MISMATCH',
    runner_dependency: false,
  };
}

const REQUIRED_AGENT_REFERENCES = [
  'PRODUCT_TRUTH.md', 'docs/CHOPDOT_OPERATING_LOOPS.md', 'docs/CHOPDOT_LOOP_RUNNER.md',
  'product/cards.md', 'product/decisions.md', 'product/decision-contracts.md', 'product/roadmap.md',
];

const REQUIRED_COMMANDS = [
  'agent:validate', 'agent:contract:new', 'agent:run:start', 'agent:run:resume',
  'agent:run:status', 'agent:run:cancel', 'agent:run:terminate',
  'agent:evaluate', 'agent:outcome:promote', 'agent:continuation:promote',
  'agent:knowledge:preflight', 'agent:knowledge:record', 'agent:knowledge:verify',
  'agent:eval', 'agent:ci',
];

export async function validateInstructionSurfaces(root) {
  const exactRoot = path.resolve(root);
  const issues = [];
  let agents = '';
  let claude = '';
  let packageJson = null;
  try { agents = await readFile(path.join(exactRoot, 'AGENTS.md'), 'utf8'); } catch (error) { issues.push({ surface: 'AGENTS.md', code: error.code, message: 'missing' }); }
  try { claude = await readFile(path.join(exactRoot, 'CLAUDE.md'), 'utf8'); } catch (error) { issues.push({ surface: 'CLAUDE.md', code: error.code, message: 'missing' }); }
  try { packageJson = JSON.parse(await readFile(path.join(exactRoot, 'package.json'), 'utf8')); } catch (error) { issues.push({ surface: 'package.json', code: error.code, message: 'missing_or_invalid' }); }
  for (const reference of REQUIRED_AGENT_REFERENCES) if (agents && !agents.includes(reference)) issues.push({ surface: 'AGENTS.md', code: 'MISSING_REFERENCE', message: reference });
  if (claude && !/AGENTS\.md/.test(claude)) issues.push({ surface: 'CLAUDE.md', code: 'NO_DEFERENCE', message: 'CLAUDE.md must defer to AGENTS.md' });
  for (const term of ['Supabase', 'Prisma', 'PostgreSQL']) if (claude && new RegExp(`\\b${term}\\b`, 'i').test(claude)) issues.push({ surface: 'CLAUDE.md', code: 'INDEPENDENT_STACK_CLAIM', message: term });
  for (const command of REQUIRED_COMMANDS) if (packageJson && !packageJson.scripts?.[command]) issues.push({ surface: 'package.json', code: 'MISSING_COMMAND', message: command });
  return { valid: issues.length === 0, root: exactRoot, issues, checked: { agent_references: REQUIRED_AGENT_REFERENCES.length, commands: REQUIRED_COMMANDS.length } };
}
