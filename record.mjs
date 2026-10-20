// Records `npm run repro` + `npm run repro:patched` as an asciinema v2 cast (repro.cast).
// Output is emitted line by line, and any line that names this folder's absolute
// path shows ~/vitest-screenshot-timer-repro instead, so the recording doesn't
// reveal where it was made.
import { spawn } from 'node:child_process'
import { realpathSync, writeFileSync } from 'node:fs'

const SHOWN = '~/vitest-screenshot-timer-repro'
const paths = [...new Set([process.cwd(), realpathSync(process.cwd())])].sort((a, b) => b.length - a.length)
const ANSI = /\x1b\[[0-9;]*m/g
const redact = (line) => {
  const plain = line.replace(ANSI, '')
  if (!paths.some((p) => plain.includes(p))) return line
  return paths.reduce((s, p) => s.split(p).join(SHOWN), plain)
}

const events = []
const t0 = Date.now()
const emit = (s) => events.push([(Date.now() - t0) / 1000, 'o', s])
const sh = (cmd) =>
  new Promise((resolve) => {
    emit(`\x1b[1;32m$\x1b[0m ${cmd}\r\n`)
    const p = spawn('sh', ['-c', cmd], { env: { ...process.env, FORCE_COLOR: '1', npm_config_loglevel: 'warn' } })
    let pending = ''
    const onData = (d) => {
      pending += d.toString()
      const lines = pending.split('\n')
      pending = lines.pop()
      if (lines.length) emit(lines.map((l) => redact(l) + '\r\n').join(''))
    }
    p.stdout.on('data', onData)
    p.stderr.on('data', onData)
    p.on('close', () => {
      if (pending) emit(redact(pending) + '\r\n')
      resolve()
    })
  })
await sh('npm run --silent repro')
await sh('npm run --silent repro:patched')
const header = { version: 2, width: 120, height: 30, title: 'vitest toMatchScreenshot timer leak' }
writeFileSync('repro.cast', [JSON.stringify(header), ...events.map((e) => JSON.stringify(e))].join('\n') + '\n')
console.log(`wrote repro.cast (${events.length} events, ${((Date.now() - t0) / 1000).toFixed(1)}s)`)
