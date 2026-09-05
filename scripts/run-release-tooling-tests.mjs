import {spawnSync} from 'node:child_process';
import process from 'node:process';

const result = spawnSync(process.execPath, ['--test', 'scripts/release-evidence.test.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});
const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const count = (name) => Number(output.match(new RegExp(`(?:^|\\n)[^0-9a-z]*${name}\\s+(\\d+)`, 'i'))?.[1] ?? -1);
const summary = {tests: count('tests'), pass: count('pass'), fail: count('fail')};
if (result.status !== 0 || summary.tests < 0 || summary.pass !== summary.tests || summary.fail !== 0) {
  console.error(JSON.stringify({status: 'fail', ...summary, childExitCode: result.status, outputBase64: Buffer.from(output).toString('base64')}));
  process.exit(1);
}
console.log(JSON.stringify({status: 'pass', ...summary}));
