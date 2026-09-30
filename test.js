const assert = require('node:assert/strict');
const { buildEvents, keys, metadata } = require('./sorts.js');

let failures = 0;
const errors = [];
const originalError = console.error;
console.error = (...args) => { failures++; errors.push(args); };

let seed = 0x51a7;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
}

for (const algorithm of keys) {
  for (let run = 0; run < 200; run++) {
    const size = 8 + Math.floor(random() * 25);
    const input = Array.from({ length: size }, () => 10 + Math.floor(random() * 90));
    const events = buildEvents(input, algorithm);
    const lastMutation = [...events].reverse().find(event => event.snapshot);
    const result = lastMutation ? lastMutation.snapshot : input;
    assert.equal(result.length, input.length, `${algorithm}: changed input length`);
    assert.ok(result.every((value, i) => i === 0 || result[i - 1] <= value), `${algorithm}: output is not sorted`);
    assert.deepEqual([...result].sort((a, b) => a - b), [...input].sort((a, b) => a - b), `${algorithm}: output is not a permutation`);
    assert.ok(events.at(-1).type === 'done', `${algorithm}: missing completion event`);
  }
  process.stdout.write(`${metadata[algorithm].name}: 200 random inputs passed\n`);
}

console.error = originalError;
if (failures) {
  for (const error of errors.slice(0, 10)) originalError(...error);
  process.stderr.write(`${failures} internal self-check failure(s)\n`);
  process.exit(1);
}
process.stdout.write(`All ${keys.length * 200} randomized sorting checks passed.\n`);
