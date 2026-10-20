// Re-encodes every reference PNG with different zlib settings: the pixels stay
// identical, the bytes change. toMatchScreenshot then misses its byte-identical
// fast path and goes through waitForStableScreenshot, which arms the timer.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.png') ? [join(dir, e.name)] : [],
  )
for (const file of walk('test/__screenshots__')) {
  const png = PNG.sync.read(readFileSync(file))
  writeFileSync(file, PNG.sync.write(png, { deflateLevel: 1, filterType: 0 }))
  console.log(`re-encoded ${file} (same pixels, different bytes)`)
}
