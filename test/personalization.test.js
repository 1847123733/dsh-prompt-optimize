import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

function textContent(node) {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return (node.children || []).map(textContent).join(' ')
}

test('registers a personalization settings section with custom instructions editor', async () => {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  let registration
  let sectionMeta
  let Section
  const react = {
    createElement(type, props, ...children) {
      return { type, props: props || {}, children }
    },
    useEffect() {},
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}]
    },
  }
  const sandbox = {
    AbortController,
    URLSearchParams,
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
    sessions: {},
    slots: {
      inject(_name, register) { return register() },
      register(meta, component) {
        if (meta.id === 'personalization') {
          sectionMeta = meta
          Section = component
        }
        return () => {}
      },
    },
  })

  assert.equal(sectionMeta.name, 'settings.section')
  assert.equal(sectionMeta.label, '个性化')
  assert.equal(sectionMeta.order, 30)

  const tree = Section()
  const text = textContent(tree)
  assert.match(text, /自定义指令/)
  assert.match(text, /此主机上的所有任务/)
  assert.match(text, /保存后会自动注入系统上下文/)
})
