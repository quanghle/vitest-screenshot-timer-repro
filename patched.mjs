// Applies the suggested fix to node_modules/@vitest/browser in place (clear the
// timer once the race settles), runs the same test, then restores the file.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const file = 'node_modules/@vitest/browser/dist/index.js'
const original = readFileSync(file, 'utf8')
const before = `function asyncTimeout(timeout) {
	return new Promise((resolve) => {
		if (timeout === 0) {
			resolve(null);
		} else {
			setTimeout(resolve, timeout, null);
		}
	});
}`
const after = `function asyncTimeout(timeout) {
	return new Promise((resolve) => {
		if (timeout === 0) {
			resolve(null);
		} else {
			// patched: unref, so a timer outliving the race can't hold the process open
			setTimeout(resolve, timeout, null).unref();
		}
	});
}`
if (!original.includes(before)) throw new Error('asyncTimeout not found: different @vitest/browser version?')
writeFileSync(file, original.replace(before, after))
try {
  console.log('\n$ npx vitest run   # with asyncTimeout patched (timer unref\'d)')
  const start = Date.now()
  const r = spawnSync('npx', ['vitest', 'run'], { stdio: 'inherit' })
  console.log(`--> patched: exit ${r.status}, ${((Date.now() - start) / 1000).toFixed(1)}s wall`)
} finally {
  writeFileSync(file, original)
}
