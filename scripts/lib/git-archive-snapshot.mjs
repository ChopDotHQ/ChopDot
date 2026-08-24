import {spawn} from 'node:child_process';
import {pipeline} from 'node:stream/promises';

const MAX_STDERR_CHARS = 32_768;

function processResult(child, label) {
  let stderr = '';
  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (chunk) => {
    if (stderr.length < MAX_STDERR_CHARS) {
      stderr += chunk.slice(0, MAX_STDERR_CHARS - stderr.length);
    }
  });
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (${signal ?? code}): ${stderr.trim()}`));
    });
  });
}

export async function extractGitArchive({source, destination, ref = 'HEAD'}) {
  const archive = spawn('git', ['archive', '--format=tar', ref], {
    cwd: source,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const extractor = spawn('tar', ['-xf', '-', '-C', destination], {
    stdio: ['pipe', 'ignore', 'pipe'],
  });
  await Promise.all([
    processResult(archive, 'git archive'),
    processResult(extractor, 'tar extraction'),
    pipeline(archive.stdout, extractor.stdin),
  ]);
}
