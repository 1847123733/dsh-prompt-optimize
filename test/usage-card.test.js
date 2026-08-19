import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

async function renderUsageCard(data) {
  let registration
  let UsageCard
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  const Fragment = Symbol('Fragment')
  const react = {
    Fragment,
    createElement(type, props, ...children) {
      return { type, props: props || {}, children }
    },
    useEffect() {},
    useRef() { return { current: null } },
    useState(initial) {
      if (initial === false) return [true, () => {}]
      if (initial === 'loading') return ['ready', () => {}]
      if (initial === null) return [data, () => {}]
      return [initial, () => {}]
    },
  }
  const sandbox = {
    console,
    document: { querySelector: () => ({}) },
    fetch() {},
    setInterval() {},
    clearInterval() {},
    window: { __ModuleLoader__: { load(value) { registration = value } } },
  }

  vm.runInNewContext(source, sandbox)
  const exports = registration.factory(() => react)
  exports.apply({
    effect(register) { register() },
    slots: {
      inject(_name, register) { return register() },
      register(meta, component) {
        if (meta.id === 'prompt-deepseek-usage') UsageCard = component
        return () => {}
      },
    },
  })
  return UsageCard()
}

function textContent(node) {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return (node.children || []).map(textContent).join(' ')
}

test('shows today, yesterday, and seven-day costs for the configured key', async () => {
  const card = await renderUsageCard({
    key: 'sk-••••••••abcd',
    balance: {
      balance_infos: [{ currency: 'CNY', total_balance: '88.50' }],
    },
    keyUsage: {
      currency: 'CNY',
      name: '测试-harness',
      today: 1.25,
      yesterday: 2.5,
      last7Days: 7.5,
    },
  })
  const text = textContent(card)

  assert.match(text, /测试-harness · sk-••••••••abcd/)
  assert.match(text, /今天消费\s+¥1\.25/)
  assert.match(text, /昨天消费\s+¥2\.50/)
  assert.match(text, /最近 7 天\s+¥7\.50/)
  assert.match(text, /账号当前余额\s+¥88\.50/)
})
