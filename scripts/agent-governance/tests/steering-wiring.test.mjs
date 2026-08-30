import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../../..');

const paths = {
  agents: 'AGENTS.md',
  package: 'package.json',
  prePush: '.githooks/pre-push',
  pullRequestWorkflow: '.github/workflows/agent-governance.yml',
  scheduledWorkflow: '.github/workflows/agent-steering-monitor.yml',
};

function readRequired(relativePath) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  assert.ok(fs.existsSync(absolutePath), `required steering-wiring surface is missing: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function indentation(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function yamlBlock(source, key, requiredIndent = undefined) {
  const lines = source.split(/\r?\n/);
  const keyPattern = new RegExp(`^(\\s*)${escapeRegularExpression(key)}:\\s*(?:#.*)?$`);
  const start = lines.findIndex((line) => {
    const match = line.match(keyPattern);
    return match && (requiredIndent === undefined || match[1].length === requiredIndent);
  });

  assert.notEqual(start, -1, `YAML block is missing: ${key}`);
  const baseIndent = indentation(lines[start]);
  let end = start + 1;

  while (end < lines.length) {
    const line = lines[end];
    if (line.trim() !== '' && !line.trimStart().startsWith('#') && indentation(line) <= baseIndent) {
      break;
    }
    end += 1;
  }

  return lines.slice(start, end).join('\n');
}

function yamlStepBlocks(jobSource) {
  const lines = jobSource.split(/\r?\n/);
  const stepsLine = lines.findIndex((line) => /^\s*steps:\s*$/.test(line));
  assert.notEqual(stepsLine, -1, 'workflow job has no steps block');

  const itemIndent = indentation(lines[stepsLine]) + 2;
  const itemPattern = new RegExp(`^\\s{${itemIndent}}-\\s+`);
  const starts = [];

  for (let index = stepsLine + 1; index < lines.length; index += 1) {
    if (itemPattern.test(lines[index])) starts.push(index);
  }

  assert.ok(starts.length > 0, 'workflow job has no step items');
  return starts.map((start, index) => {
    const nextStart = starts[index + 1] ?? lines.length;
    let end = nextStart;
    for (let cursor = start + 1; cursor < nextStart; cursor += 1) {
      const line = lines[cursor];
      if (line.trim() !== '' && indentation(line) < itemIndent) {
        end = cursor;
        break;
      }
    }
    return lines.slice(start, end).join('\n');
  });
}

function packageScripts() {
  const packageDocument = JSON.parse(readRequired(paths.package));
  assert.equal(typeof packageDocument.scripts, 'object', 'package.json has no scripts object');
  return packageDocument.scripts;
}

function isStrictSteeringScript(command) {
  const normalized = normalizeWhitespace(command);
  return (
    /(?:^|\s)node\s+scripts\/agent-governance\/steering-surfaces\.mjs\s+check\b/.test(normalized)
    && /(?:^|\s)--require-promoted(?:\s|$)/.test(normalized)
  );
}

function hasStrictSteeringInvocation(source, scripts) {
  const normalized = normalizeWhitespace(source);
  const directInvocation = (
    /node\s+scripts\/agent-governance\/steering-surfaces\.mjs\s+check\b/.test(normalized)
    && /--require-promoted\b/.test(normalized)
  );
  const packageInvocation = /npm\s+run\s+agent:steering:check\b/.test(normalized)
    && isStrictSteeringScript(scripts['agent:steering:check'] ?? '');
  return directInvocation || packageInvocation;
}

function findStep(steps, predicate, description) {
  const step = steps.find(predicate);
  assert.ok(step, `workflow is missing ${description}`);
  return step;
}

test('pre-push runs the strict steering gate before the adoption guard', () => {
  const prePush = readRequired(paths.prePush);
  const executableLines = prePush
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));

  const steeringIndex = executableLines.findIndex(isStrictSteeringScript);
  const adoptionIndex = executableLines.findIndex((line) => (
    /\bnode\s+scripts\/agent-governance\/adoption-guard\.mjs\s+push\b/.test(line)
  ));

  assert.notEqual(steeringIndex, -1, 'pre-push omits the strict promoted steering check');
  assert.notEqual(adoptionIndex, -1, 'pre-push omits the push adoption guard');
  assert.ok(steeringIndex < adoptionIndex, 'pre-push must run steering validation before adoption validation');
});

test('PR repo-governance binds the candidate and preserves strict steering JSON evidence', () => {
  const workflow = readRequired(paths.pullRequestWorkflow);
  const scripts = packageScripts();
  const job = yamlBlock(workflow, 'repo-governance', 2);
  const steps = yamlStepBlocks(job);

  const checkoutStep = findStep(
    steps,
    (step) => /actions\/checkout@/.test(step),
    'an exact-candidate checkout step',
  );
  assert.match(checkoutStep, /ref:\s*\$\{\{\s*env\.EXPECTED_SHA\s*\}\}/, 'checkout is not pinned to EXPECTED_SHA');

  assert.ok(
    steps.some((step) => /assert-exact-head\.mjs\b/.test(step)),
    'repo-governance never proves that HEAD equals the selected candidate',
  );

  const steeringStep = findStep(
    steps,
    (step) => /steering-surfaces\.mjs\s+check\b|npm\s+run\s+agent:steering:check\b/.test(normalizeWhitespace(step)),
    'a steering check step',
  );
  assert.ok(hasStrictSteeringInvocation(steeringStep, scripts), 'PR steering check is not strict/promoted');
  assert.match(
    normalizeWhitespace(steeringStep),
    /--json-out(?:=|\s+)["']?[^"'\s]*steering[^"'\s]*\.json/,
    'PR steering check does not emit a steering JSON artifact',
  );

  const uploadStep = findStep(
    steps,
    (step) => /actions\/upload-artifact@/.test(step),
    'an evidence upload step',
  );
  assert.match(uploadStep, /if:\s*always\(\)/, 'PR evidence upload is not preserved after a failed check');
  assert.match(uploadStep, /GOVERNANCE_REPORT_ROOT/, 'PR upload path does not contain the steering JSON report root');
});

test('scheduled steering monitor remains scheduled/manual and read-only', () => {
  const workflow = readRequired(paths.scheduledWorkflow);
  const scripts = packageScripts();
  const triggerBlock = yamlBlock(workflow, 'on', 0);

  assert.match(triggerBlock, /^\s*schedule:\s*$/m, 'steering monitor has no schedule trigger');
  assert.match(triggerBlock, /^\s*workflow_dispatch:\s*$/m, 'steering monitor cannot be run manually');
  assert.doesNotMatch(triggerBlock, /^\s*pull_request(?:_target)?:\s*$/m, 'scheduled steering monitor must not become a pull-request workflow');

  assert.doesNotMatch(workflow, /npm\s+run\s+agent:steering:(?:build|report)\b/, 'scheduled monitor invokes a mutating/generated-output command');
  assert.doesNotMatch(workflow, /steering-surfaces\.mjs\s+(?:build|report)\b/, 'scheduled monitor directly invokes build/report instead of check');
  assert.ok(hasStrictSteeringInvocation(workflow, scripts), 'scheduled monitor omits the strict steering check');

  assert.match(workflow, /EXPECTED_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/, 'scheduled monitor does not bind EXPECTED_SHA to the selected commit');
  const job = yamlBlock(workflow, 'steering-surface-monitor', 2);
  const steps = yamlStepBlocks(job);
  const checkoutStep = findStep(steps, (step) => /actions\/checkout@/.test(step), 'an exact-SHA checkout step');
  assert.match(checkoutStep, /ref:\s*\$\{\{\s*env\.EXPECTED_SHA\s*\}\}/, 'scheduled checkout is not pinned to EXPECTED_SHA');
  assert.ok(
    steps.some((step) => /git\s+rev-parse\s+HEAD/.test(normalizeWhitespace(step)) || /assert-exact-head\.mjs/.test(step)),
    'scheduled workflow never verifies the checked-out HEAD',
  );
});

test('scheduled steering monitor always summarizes and uploads its JSON verdict', () => {
  const workflow = readRequired(paths.scheduledWorkflow);
  const job = yamlBlock(workflow, 'steering-surface-monitor', 2);
  const steps = yamlStepBlocks(job);

  const checkStep = findStep(
    steps,
    (step) => /agent:steering:check\b|steering-surfaces\.mjs\s+check\b/.test(normalizeWhitespace(step)),
    'a steering check step',
  );
  assert.match(normalizeWhitespace(checkStep), /--json-out(?:=|\s+)["']?[^"'\s]*steering[^"'\s]*\.json/, 'scheduled check does not write its JSON verdict');

  const summaryStep = findStep(steps, (step) => /GITHUB_STEP_SUMMARY/.test(step), 'a job summary step');
  assert.match(summaryStep, /if:\s*always\(\)/, 'scheduled summary is skipped after monitor failure');
  assert.match(summaryStep, /steering-surfaces\.json/, 'scheduled summary does not consume the JSON verdict');

  const uploadStep = findStep(steps, (step) => /actions\/upload-artifact@/.test(step), 'a JSON evidence upload step');
  assert.match(uploadStep, /if:\s*always\(\)/, 'scheduled evidence upload is skipped after monitor failure');
  assert.match(uploadStep, /path:[^\n]*steering-surfaces\.json/, 'scheduled upload is not limited to the JSON verdict path');
  assert.match(uploadStep, /if-no-files-found:\s*error/, 'missing scheduled JSON evidence does not fail the upload');
});

test('package scripts expose the full steering lifecycle', () => {
  const scripts = packageScripts();
  const required = ['build', 'check', 'report', 'test'];

  for (const operation of required) {
    const key = `agent:steering:${operation}`;
    assert.equal(typeof scripts[key], 'string', `package scripts omit ${key}`);
    assert.notEqual(scripts[key].trim(), '', `package script ${key} is empty`);
  }

  assert.match(scripts['agent:steering:build'], /steering-surfaces\.mjs\s+build\b/, 'build script does not build the steering catalog');
  assert.ok(isStrictSteeringScript(scripts['agent:steering:check']), 'check script is not the strict promoted gate');
  assert.match(scripts['agent:steering:report'], /steering-surfaces\.mjs\s+report\b/, 'report script does not report steering health');
  assert.match(scripts['agent:steering:test'], /\bnode\s+--test\b/, 'test script does not use the Node test runner');
  assert.match(scripts['agent:steering:test'], /steering/i, 'test script is not scoped to steering governance');
});

test('AGENTS requires the steering preflight without granting it product or release authority', () => {
  const agents = readRequired(paths.agents);
  const commandPattern = /npm\s+run\s+agent:steering:check\b/;
  const commandMatch = commandPattern.exec(agents);
  assert.ok(commandMatch, 'AGENTS omits the steering preflight command');

  const beforeCommand = agents.slice(Math.max(0, commandMatch.index - 600), commandMatch.index);
  assert.match(beforeCommand, /(?:before|preflight|read[- ]order|gate)/i, 'AGENTS does not place steering validation before governed work');

  const contextValidationIndex = agents.indexOf('npm run context:validate', commandMatch.index);
  assert.notEqual(contextValidationIndex, -1, 'AGENTS omits the context validation that follows steering validation');
  assert.ok(commandMatch.index < contextValidationIndex, 'AGENTS runs context validation before the steering preflight');

  const authorityWindow = agents.slice(Math.max(0, commandMatch.index - 300), commandMatch.index + 1_800);
  assert.match(authorityWindow, /(?:not\s+(?:a\s+)?proof|cannot|must\s+not|never)/i, 'AGENTS does not limit the monitor\'s authority');
  assert.match(authorityWindow, /\bproduct\b/i, 'AGENTS does not deny product authority to the monitor');
  assert.match(authorityWindow, /\b(?:release|deploy(?:ment|ed)?|approval)\b/i, 'AGENTS does not deny release/deployment authority to the monitor');
});
