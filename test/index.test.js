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
  assert.equal(result.value.usageDays, 30)
})

test('returns masked DeepSeek key, balance, and aggregated usage', async () => {
  const routes = new Map()
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options })
    if (String(url).includes('/user/balance')) {
      return new Response(
        JSON.stringify({
          is_available: true,
          balance_infos: [
            {
              currency: 'CNY',
              total_balance: '88.50',
              granted_balance: '8.50',
              topped_up_balance: '80.00',
            },
          ],
        }),
        { status: 200 },
      )
    }
    return new Response(
      JSON.stringify({
        data: [
          {
            total_tokens: 1200,
            request_count: 3,
            cost_by_currency: { CNY: 1.25 },
          },
          {
            total_tokens: 800,
            request_count: 2,
            cost_by_currency: { CNY: 0.75 },
          },
        ],
      }),
      { status: 200 },
    )
  }

  try {
    const ctx = {
      credentials: {
        resolve: async () => ({ value: 'sk-1234567890abcd' }),
      },
      llm: { listProviders: () => [] },
      effect(register) {
        register()
      },
      webServer: {
        register(route) {
          routes.set(route.path, route.handler)
        },
      },
    }
    apply(ctx, {
      provider: 'deepseek-official',
      model: 'deepseek-v4-flash',
      maxInputChars: 24_000,
      maxOutputTokens: 1024,
      temperature: 0.3,
      usageDays: 30,
    })

    const req = createRequest({})
    req.method = 'GET'
    const res = createResponse()
    await routes.get('/api/prompt-optimize/deepseek-usage')(req, res)
    await res.completed

    const body = JSON.parse(res.body)
    assert.equal(res.status, 200)
    assert.equal(body.key, 'sk-••••••••abcd')
    assert.equal(body.usage.costs.CNY, 2)
    assert.equal(body.usage.tokens, 2000)
    assert.equal(body.usage.requests, 5)
    assert.equal(calls.length, 2)
    assert.match(calls[1].url, /\/v1\/usage\?/)
    assert.equal(calls[0].options.headers.authorization, 'Bearer sk-1234567890abcd')
  } finally {
    globalThis.fetch = originalFetch
  }
})
