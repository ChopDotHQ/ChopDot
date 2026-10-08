// Register the same assertions with the runner that actually owns this process.
// Node remains the dependency-free prototype runner; Vitest owns repo CI/coverage.
let test;
if (process.env.VITEST === 'true') {
  const runner = await import('vitest');
  test = (name, callback) => runner.test(name, context => callback({
    ...context, diagnostic: message => console.log(message),
  }));
  test.after = runner.afterAll;
} else {
  ({ default: test } = await import('node:test'));
}
export default test;
