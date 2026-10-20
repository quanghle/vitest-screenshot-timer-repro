// One command: create the reference, re-encode it, then time a normal run.
import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const run = (label, cmd, args, env = {}) => {
  console.log(`\n$ ${[...Object.entries(env).map(([k, v]) => `${k}=${v}`), cmd, ...args].join(' ')}`)
  const start = Date.now()
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } })
  console.log(`--> ${label}: exit ${r.status}, ${((Date.now() - start) / 1000).toFixed(1)}s wall`)
  return r
}

rmSync('test/__screenshots__', { recursive: true, force: true })
run('create reference', 'npx', ['vitest', 'run', '--update'])
run('re-encode reference', 'node', ['reencode.mjs'])
run('bug: 20s screenshot timeout', 'npx', ['vitest', 'run'])
run('control: 4s screenshot timeout', 'npx', ['vitest', 'run'], { SCREENSHOT_TIMEOUT: '4000' })
