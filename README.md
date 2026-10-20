# toMatchScreenshot leaves its stability timeout running

Minimal reproduction for `@vitest/browser` 5.0.4 (also present in 5.0.5 and 5.1.0-beta.1).

`waitForStableScreenshot` races the stable-screenshot loop against `asyncTimeout(timeout)`. When the screenshot wins, the `setTimeout` inside `asyncTimeout` is never cleared or unref'd, so it keeps the process alive for the rest of `timeout`. This path runs whenever the first capture is not byte-identical to the reference. That happens regularly: the pixels match, but the bytes differ because of re-encoding, load or anti-aliasing. It also runs when no reference exists yet (`--update`).

With `toMatchScreenshot.timeout` above `teardownTimeout` (10s), every such run ends like this:

```
close timed out after 10000ms
Tests closed successfully but something prevents Vite server from exiting
```

The run then force-exits up to 10s late.

## Run it in GitHub Codespaces

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/quanghle/vitest-screenshot-timer-repro)

Open the repository in a codespace (the button above, or Code → Codespaces → Create). `.devcontainer/devcontainer.json` installs the dependencies and Playwright's Chromium with its Linux libraries, so once setup finishes you only run:

```sh
npm run repro
npm run repro:patched
```

## Run it locally

```sh
npm install
npx playwright install chromium   # if not installed yet
npm run repro          # create reference, re-encode it, time the bug and a control
npm run repro:patched  # same test with asyncTimeout's timer unref'd
```

`reencode.mjs` re-writes the reference PNG with different zlib settings. The pixels stay identical and only the bytes change, so the test passes but skips the byte-identical fast path.

## Results (macOS, Chromium, Node 26)

| Run | Test duration | Wall time | Message |
|---|---|---|---|
| `timeout: 20_000` (bug) | 1.1–1.8s | 11.3–16.0s | yes |
| `timeout: 4_000` (control) | ~1.1s | 5.4–7.1s | no, but it still waits for the 4s timer |
| `timeout: 20_000`, timer unref'd (patched) | ~1s | 1.4–2.6s | no |

On Linux (Node 22, the same image the codespace uses) one run gave 11.3s wall for the bug run, 5.0s for the control and 1.7s patched, with the same message.

Ranges cover three runs on the same machine. `repro.cast` is a terminal recording of one of them (`node record.mjs` makes a new one, with this folder's absolute path shown as `~/vitest-screenshot-timer-repro`).

`--reporter=hanging-process`:

```
# Timeout
node_modules/@vitest/browser/dist/index.js:1828 - setTimeout(resolve, timeout, null);
node_modules/@vitest/browser/dist/index.js:1824 - return new Promise((resolve) => {
node_modules/@vitest/browser/dist/index.js:2091 - const result = await (timeout === 0 ? stableScreenshot : Promise.race([stableScreenshot, asyncTimeout(timeout).finally(() => abortController.abort())]));
```

## Suggested fix

Clear the timer once the race settles. For example, keep the id and `clearTimeout` it when `stableScreenshot` resolves, or pass the existing `AbortController`'s signal to `setTimeout` from `node:timers/promises`. At minimum, `unref()` the timer (that is what `repro:patched` does).
