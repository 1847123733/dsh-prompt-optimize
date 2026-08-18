import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

async function loadClientExports() {
  let registration
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  const sandbox = {
    console,
    document: {
      querySelector: () => ({}),
      head: { appendChild() {} },
      createElement: () => ({ dataset: {} }),
    },
    window: {
      __ModuleLoader__: {
        load(value) {
          registration = value
        },
      },
    },
  }

  vm.runInNewContext(source, sandbox)

  const react = {
    createElement() {},
    useEffect() {},
    useRef() {},
    useState() {},
  }
  return registration.factory((name) => {
    assert.equal(name, 'react')
    return react
  })
}

function snapshotWith(nodes) {
  const byKey = new Map(nodes.map((node) => [node.key, node]))
  return {
    chat: {
      order: nodes.map((node) => node.key),
      nodes: { get: (key) => byKey.get(key) },
    },
  }
}

test('collects user-authored questions in transcript order', async () => {
  const { collectUserQuestions } = await loadClientExports()
  const snapshot = snapshotWith([
    {
      key: 'user:1',
      kind: 'user',
      data: {
        seq: 11,
        content: [
          { type: 'text', text: '第一行' },
          { type: 'image', id: 'image-1' },
          { type: 'text', text: '第二行' },
        ],
      },
    },
    {
      key: 'assistant:1',
      kind: 'assistant-step',
      data: { content: [{ type: 'text', text: '回答' }] },
    },
    {
      key: 'steering:1',
      kind: 'steering',
      data: { seq: 12, content: [{ type: 'text', text: '补充要求' }] },
    },
    {
      key: 'user:2',
      kind: 'user',
      data: { seq: 21, content: [{ type: 'image', id: 'image-2' }] },
    },
  ])

  const questions = JSON.parse(JSON.stringify(collectUserQuestions(snapshot)))
  assert.deepEqual(questions, [
    {
      key: 'user:1',
      seq: 11,
      text: '第一行\n第二行',
      label: '第一行 第二行',
    },
    {
      key: 'steering:1',
      seq: 12,
      text: '补充要求',
      label: '补充要求',
    },
    {
      key: 'user:2',
      seq: 21,
      text: '图片提问',
      label: '图片提问',
    },
  ])
})

test('finds an anchor by exact stable key without interpolating a selector', async () => {
  const { findQuestionAnchor } = await loadClientExports()
  const rows = [
    { dataset: { chatAnchorKey: 'user:1' } },
    { dataset: { chatAnchorKey: 'user:2[quoted]' } },
  ]
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '[data-chat-anchor-key]')
      return rows
    },
  }

  assert.equal(findQuestionAnchor(root, 'user:2[quoted]'), rows[1])
  assert.equal(findQuestionAnchor(root, 'missing'), null)
})
