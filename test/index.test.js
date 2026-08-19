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

test('returns balance and cost periods for the configured DeepSeek API key', async () => {
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
    const requestUrl = new URL(String(url))
    const end = Number(requestUrl.searchParams.get('end'))
    return new Response(JSON.stringify({
      code: 0,
      msg: '',
      data: {
        biz_code: 0,
        biz_msg: '',
        biz_data: {
          start: Number(requestUrl.searchParams.get('start')),
          end,
          bucket: 86400,
          models: ['deepseek-v4-flash'],
          data: [{
            currency: 'CNY',
            series: [
              {
                api_key: {
                  tracking_id: 'matching-key',
                  name: '测试-harness',
                  sensitive_id: 'sk-12345****************abcd',
                  valid: true,
                },
                model: 'deepseek-v4-flash',
                buckets: [
                  { time: end - 86400, cost: '1.25' },
                  { time: end - 172800, cost: '2.50' },
                  { time: end - 259200, cost: '3.75' },
                ],
              },
              {
                api_key: {
                  tracking_id: 'other-key',
                  name: '其他',
                  sensitive_id: 'sk-other****************0000',
                  valid: true,
                },
                model: 'deepseek-v4-flash',
                buckets: [{ time: end - 86400, cost: '999' }],
              },
            ],
          }],
        },
      },
    }), { status: 200 })
  }

  try {
    const ctx = {
      credentials: {
        resolve: async (ref) => ({
          value: {
            DEEPSEEK_API_KEY: 'sk-1234567890abcd',
            DEEPSEEK_PLATFORM_TOKEN: 'platform-token',
          }[ref],
        }),
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
    })

    const req = createRequest({})
    req.method = 'GET'
    const res = createResponse()
    await routes.get('/api/prompt-optimize/deepseek-usage')(req, res)
    await res.completed

    const body = JSON.parse(res.body)
    assert.equal(res.status, 200)
    assert.equal(body.key, 'sk-••••••••abcd')
    assert.deepEqual(body.keyUsage, {
      currency: 'CNY',
      trackingId: 'matching-key',
      name: '测试-harness',
      today: 1.25,
      yesterday: 2.5,
      last7Days: 7.5,
    })
    assert.equal(calls.length, 2)
    assert.match(calls[1].url, /\/api\/v0\/usage\/by_api_key\/cost\?/)
    const usageUrl = new URL(calls[1].url)
    assert.equal(
      Number(usageUrl.searchParams.get('end')) -
        Number(usageUrl.searchParams.get('start')),
      7 * 86400,
    )
    assert.equal(usageUrl.searchParams.get('tz'), '28800')
    assert.equal(calls[0].options.headers.authorization, 'Bearer sk-1234567890abcd')
    assert.equal(calls[1].options.headers.authorization, 'Bearer platform-token')
    assert.equal('cookie' in calls[1].options.headers, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})
