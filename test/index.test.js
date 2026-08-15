import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'

import { apply, Config } from '../lib/index.js'

function createRequest(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))])
  req.method = 'POST'
  req.headers = { host: 'localhost' }
  req.socket = { remoteAddress: '127.0.0.1' }
  return req
}

function createResponse() {
  let resolve
  const completed = new Promise((done) => {
    resolve = done
  })
  return {
    status: null,
    body: '',
    completed,
    writeHead(status) {
      this.status = status
    },
    end(body = '') {
      this.body = body
      resolve()
    },
  }
}

test('disables reasoning for the DeepSeek prompt rewrite call', async () => {
  let handler
  let options
  const ctx = {
    llm: {
      listProviders: () => [{ id: 'deepseek-official' }],
      async *stream(received) {
        options = received
        yield { type: 'text-delta', text: '优化结果' }
        yield { type: 'finish', reason: { kind: 'stop' } }
      },
    },
    effect(register) {
      register()
    },
    webServer: {
      register(route) {
        handler = route.handler
      },
    },
  }

  apply(ctx, {
    provider: 'deepseek-official',
    model: 'deepseek-v4-flash',
    maxInputChars: 24_000,
    maxOutputTokens: 1024,
    temperature: 0.3,
  })

  const res = createResponse()
  await handler(createRequest({ text: '写一个登录页' }), res)
  await res.completed

  assert.equal(res.status, 200)
  assert.equal(options.reasoningEffort, 'off')
})

test('defaults prompt rewrites to a compact output budget', async () => {
  const result = await Config['~standard'].validate({})

  assert.equal(result.value.maxOutputTokens, 1024)
})
