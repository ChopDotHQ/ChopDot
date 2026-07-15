#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'docs/wiki/08-context-intake');

function usage() {
  console.error(`Usage:
  npm run wiki:ingest-thread -- --thread-id=THREAD --title="Title" --summary="Summary" [options]

Options:
  --status=current|draft|stale|blocked|archived
  --source-type="Codex thread"
  --fact="Fact line"                 repeatable
  --inference="Inference line"       repeatable
  --assumption="Assumption line"     repeatable
  --routing-impact="Routing line"    repeatable
  --limitation="Limitation line"     repeatable
  --next-action="Next action"
  --related-doc=PATH                 repeatable
  --related-code=PATH                repeatable
  --tag=TAG                          repeatable
  --dry-run
`);
}

function parseArgs(argv) {
  const args = {
    status: 'draft',
    sourceType: 'Codex thread',
    facts: [],
    inferences: [],
    assumptions: [],
    routingImpact: [],
    limitations: [],
    relatedDocs: ['docs/wiki/08-context-intake/context-intake.md'],
    relatedCode: [],
    tags: ['context-intake', 'codex-thread'],
    dryRun: false,
  };

  for (const raw of argv) {
    if (raw === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (!match) {
      throw new Error(`Invalid argument: ${raw}`);
    }
    const key = match[1];
    const value = match[2];
    if (key === 'thread-id') args.threadId = value;
    else if (key === 'title') args.title = value;
    else if (key === 'summary') args.summary = value;
    else if (key === 'status') args.status = value;
    else if (key === 'source-type') args.sourceType = value;
    else if (key === 'fact') args.facts.push(value);
    else if (key === 'inference') args.inferences.push(value);
    else if (key === 'assumption') args.assumptions.push(value);
    else if (key === 'routing-impact') args.routingImpact.push(value);
    else if (key === 'limitation') args.limitations.push(value);
    else if (key === 'next-action') args.nextAction = value;
    else if (key === 'related-doc') args.relatedDocs.push(value);
    else if (key === 'related-code') args.relatedCode.push(value);
    else if (key === 'tag') args.tags.push(value);
    else throw new Error(`Unknown argument: ${key}`);
  }

  if (!args.threadId) throw new Error('--thread-id is required');
  if (!args.title) throw new Error('--title is required');
  if (!args.summary) throw new Error('--summary is required');
  if (!args.nextAction) args.nextAction = 'Review the source thread and decide whether this changes product cards, journey reviews, wiki pages, or ADRs.';

  return args;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function yamlArray(values) {
  if (!values.length) return ' []';
  return `\n${values.map((value) => `  - ${value}`).join('\n')}`;
}

function bullets(values, fallback) {
  const lines = values.length ? values : [fallback];
  return lines.map((value) => `- ${value}`).join('\n');
}

function validateRelatedPaths(args) {
  const missing = [];
  for (const ref of [...args.relatedDocs, ...args.relatedCode]) {
    if (!existsSync(path.resolve(root, ref))) missing.push(ref);
  }
  return missing;
}

function render(args) {
  const date = today();
  return `---
title: ${args.title}
status: ${args.status}
owner: Dev
last_reviewed: ${date}
review_frequency: weekly
source_of_truth: false
related_code:${yamlArray(args.relatedCode)}
related_docs:${yamlArray(args.relatedDocs)}
tags:${yamlArray([...new Set(args.tags)])}
---

# ${args.title}

## Source

- Source type: ${args.sourceType}
- Source id: \`${args.threadId}\`
- Imported: ${date}
- Import method: manual or Codex-tool-assisted summary into repo-native context

## Summary

${args.summary}

## Facts

${bullets(args.facts, 'No facts recorded yet.')}

## Inferences

${bullets(args.inferences, 'No inferences recorded yet.')}

## Assumptions

${bullets(args.assumptions, 'No assumptions recorded yet.')}

## Routing Impact

${bullets(args.routingImpact, 'No routing impact recorded yet.')}

## Source Limitations

${bullets(args.limitations, 'This page is a summary and must be verified against source artifacts before use.')}

## Next Action

${args.nextAction}
`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const missing = validateRelatedPaths(args);
  if (missing.length) {
    throw new Error(`Related path(s) missing: ${missing.join(', ')}`);
  }

  const file = path.join(outDir, `${today()}-${slugify(args.threadId)}-${slugify(args.title)}.md`);
  const markdown = render(args);

  if (args.dryRun) {
    console.log(markdown);
  } else {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(file, markdown);
    console.log(`Wrote ${path.relative(root, file)}`);
    console.log('Next: npm run wiki:generate && npm run wiki:validate');
  }
} catch (error) {
  usage();
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
