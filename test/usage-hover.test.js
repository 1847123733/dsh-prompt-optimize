import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'

async function loadClientStyles() {
  let registration
  let styleTag
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  const sandbox = {
    console,
    document: {
      querySelector: () => null,
      head: { appendChild(node) { styleTag = node } },
      createElement: () => ({ dataset: {}, textContent: '' }),
    },
    window: { __ModuleLoader__: { load(value) { registration = value } } },
  }

  vm.runInNewContext(source, sandbox)
  registration.factory(() => ({
    createElement() {},
    Fragment: Symbol('Fragment'),
    useEffect() {},
    useRef() {},
    useState() {},
  }))
  return styleTag.textContent
}

test('keeps the space between the usage pill and card inside the hover target', async (t) => {
  const browser = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  const htmlPath = join(tmpdir(), `dsh-usage-hover-${process.pid}.html`)
  const styles = await loadClientStyles()
  const html = `<!doctype html>
    <style>${styles}</style>
    <div class="po-usage">
      <section class="po-usage-card">Usage card</section>
      <button class="po-usage-pill">Usage pill</button>
    </div>
    <script>
      const usage = document.querySelector('.po-usage')
      const card = document.querySelector('.po-usage-card').getBoundingClientRect()
      const pill = document.querySelector('.po-usage-pill').getBoundingClientRect()
      const target = document.elementFromPoint(pill.left + pill.width / 2, (card.bottom + pill.top) / 2)
      document.body.dataset.gapOwner = target && target.closest('.po-usage') === usage ? 'usage' : 'outside'
    </script>`

  try {
    await writeFile(htmlPath, html)
    const output = execFileSync(browser, [
      '--headless',
      '--disable-gpu',
      '--no-first-run',
      '--dump-dom',
      new URL(`file:///${htmlPath.replaceAll('\\', '/')}`).href,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

    assert.match(output, /data-gap-owner="usage"/)
  } catch (error) {
    if (error.code === 'ENOENT') t.skip('Edge is not installed')
    else throw error
  } finally {
    await unlink(htmlPath).catch(() => {})
  }
})
