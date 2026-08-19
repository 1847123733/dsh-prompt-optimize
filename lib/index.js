/**
 * dsh-prompt-optimize — Host half.
 *
 * POST /api/prompt-optimize
 * Body: { text: string, provider?: string, model?: string }
 * 200: { text, provider, model, fellBack }
 * 4xx/5xx: { error: string }
 */
import z from '@deepseek-ai/schemastery'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

export const name = 'prompt-optimize'

export const inject = ['credentials', 'llm', 'webServer']

export const Config = z.object({
  /** Preferred LLM provider id (falls back to first available). */
  provider: z.string().default('deepseek-official'),
  /** Preferred model id. */
  model: z.string().default('deepseek-v4-flash'),
  /** Reject inputs longer than this. */
  maxInputChars: z.number().default(24_000),
  /** maxTokens for the rewrite call. */
  maxOutputTokens: z.number().default(1024),
  /** Sampling temperature. */
  temperature: z.number().default(0.3),
  /** Number of calendar days included in the floating usage card. */
  usageDays: z.number().min(1).max(90).default(30),
})

const API_PATH = '/api/prompt-optimize'
const USAGE_API_PATH = '/api/prompt-optimize/deepseek-usage'
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEEPSEEK_KEY_REF = credentialRef('DEEPSEEK_API_KEY')
const DEEPSEEK_TIMEOUT_MS = 15_000

const SYSTEM = [
  '你是提示词优化助手。用户会给出一段原始提示词（可能不完整或含糊）。',
  '请改写成更清晰、可执行、结构更好的提示词，供另一个 AI 直接执行。',
  '',
  '要求：',
  '1. 完整保留用户原意、约束、语气偏好与领域术语；不要擅自改变目标。',
  '2. 在不编造事实的前提下，补全：目标、上下文、约束、步骤/验收标准、期望输出格式。',
  '3. 表述具体、可执行；去掉空话，避免重复。',
  '4. 若原文是中文则输出中文；若原文主要是英文则输出英文。',
  '5. 只输出优化后的提示词正文本身：不要标题、不要解释、不要前后缀、不要用 markdown 代码围栏包裹全文。',
].join('\n')

function json(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-cache',
  })
  res.end(body)
}

/** Loopback or Host listed in webRuntime.trustedHosts. */
function isTrusted(ctx, req) {
  const remote = String(req.socket?.remoteAddress ?? '')
  if (
    remote === '127.0.0.1' ||
    remote === '::1' ||
    remote === '::ffff:127.0.0.1'
  ) {
    return true
  }
  const host = String(req.headers.host ?? '')
  const trusted = ctx.get('webRuntime')?.trustedHosts
  if (!Array.isArray(trusted)) return false
  return trusted.some(
    (candidate) => host === candidate || host.startsWith(`${candidate}:`),
  )
}

function readJsonBody(req, limitBytes = 512 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', (chunk) => {
      total += chunk.length
      if (total > limitBytes) {
        reject(new Error('request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function stripFences(text) {
  let t = String(text || '').trim()
  const m = t.match(/^```(?:[\w-]+)?\s*\n([\s\S]*?)\n```\s*$/)
  if (m) t = m[1].trim()
  return t
}

function resolveRoute(llm, preferredProvider, preferredModel) {
  const providers =
    typeof llm.listProviders === 'function' ? llm.listProviders() : []
  const ids = providers.map((p) => p && p.id).filter(Boolean)
  const provider = ids.includes(preferredProvider)
    ? preferredProvider
    : ids[0] || preferredProvider
  if (!ids.includes(provider)) {
    throw new Error(
      '没有可用的 LLM 提供方。请先在设置中配置模型（例如 DeepSeek），再试优化提示词。',
    )
  }
  return {
    provider,
    model: preferredModel,
    fellBack: provider !== preferredProvider,
  }
}

function dateOnly(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function maskApiKey(key) {
  const value = String(key || '').trim()
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 3)}••••••••${value.slice(-4)}`
}

function deepseekUrl(path) {
  const base = String(process.env.DEEPSEEK_BASE_URL || DEEPSEEK_BASE_URL).replace(
    /\/+$/,
    '',
  )
  return `${base}${path}`
}

async function fetchDeepseekJson(path, apiKey) {
  const response = await fetch(deepseekUrl(path), {
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
  })
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!response.ok) {
    const message =
      body?.error && typeof body.error.message === 'string'
        ? body.error.message
        : `DeepSeek 接口返回 HTTP ${response.status}`
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return body
}

function aggregateUsage(records) {
  const totals = {}
  let tokens = 0
  let requests = 0
  for (const record of Array.isArray(records) ? records : []) {
    if (!record || typeof record !== 'object') continue
    const recordTokens = Number(record.total_tokens)
    const recordRequests = Number(record.request_count)
    if (Number.isFinite(recordTokens)) tokens += recordTokens
    if (Number.isFinite(recordRequests)) requests += recordRequests
    const costs = record.cost_by_currency
    if (costs && typeof costs === 'object') {
      for (const [currency, raw] of Object.entries(costs)) {
        const amount = Number(raw)
        if (!Number.isFinite(amount)) continue
        totals[currency] = (totals[currency] || 0) + amount
      }
      continue
    }
    const cents = Number(record.cost_in_cents)
    if (Number.isFinite(cents)) {
      const currency = String(record.currency || 'CNY')
      totals[currency] = (totals[currency] || 0) + cents / 100
    }
  }
  for (const currency of Object.keys(totals)) {
    totals[currency] = Math.round(totals[currency] * 1e6) / 1e6
  }
  return { costs: totals, tokens, requests }
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {z.infer<typeof Config>} config
 */
export function apply(ctx, config) {
  const llm = ctx.llm

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'exact',
      path: USAGE_API_PATH,
      handler: async (req, res) => {
        if (req.method !== 'GET') {
          json(res, 405, { error: 'method-not-allowed' })
          return
        }
        if (!isTrusted(ctx, req)) {
          json(res, 403, { error: 'forbidden' })
          return
        }

        try {
          const hit = await ctx.credentials.resolve(DEEPSEEK_KEY_REF)
          if (!hit || typeof hit.value !== 'string' || !hit.value.trim()) {
            json(res, 503, {
              error: 'no-api-key',
              message: '请先在设置 → 模型中配置 DeepSeek API Key。',
            })
            return
          }

          const apiKey = hit.value.trim()
          const end = new Date()
          const start = new Date(end)
          start.setDate(start.getDate() - (config.usageDays - 1))
          const startDate = dateOnly(start)
          const endDate = dateOnly(end)

          const balance = await fetchDeepseekJson('/user/balance', apiKey)
          let usage = null
          let usageUnavailable = false
          let usageMessage = ''
          try {
            const query = new URLSearchParams({
              start_date: startDate,
              end_date: endDate,
            })
            const usageBody = await fetchDeepseekJson(
              `/v1/usage?${query.toString()}`,
              apiKey,
            )
            usage = aggregateUsage(usageBody?.data)
          } catch (error) {
            usageUnavailable = true
            usageMessage =
              error?.status === 404
                ? 'DeepSeek 暂未向此账号开放用量查询接口'
                : error instanceof Error
                  ? error.message
                  : String(error)
          }

          json(res, 200, {
            ok: true,
            key: maskApiKey(apiKey),
            range: { days: config.usageDays, startDate, endDate },
            balance,
            usage,
            usageUnavailable,
            usageMessage,
          })
        } catch (error) {
          json(res, Number(error?.status) || 502, {
            error: 'deepseek-request-failed',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      },
    }),
  )

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'exact',
      path: API_PATH,
      handler: async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'content-type',
          })
          res.end()
          return
        }
        if (req.method !== 'POST') {
          json(res, 405, { error: 'method-not-allowed' })
          return
        }
        if (!isTrusted(ctx, req)) {
          json(res, 403, { error: 'forbidden' })
          return
        }

        let body
        try {
          body = await readJsonBody(req)
        } catch (e) {
          json(res, 400, {
            error: e instanceof Error ? e.message : 'bad request',
          })
          return
        }

        const text = typeof body?.text === 'string' ? body.text : ''
        const trimmed = text.trim()
        if (!trimmed) {
          json(res, 400, { error: '输入为空，请先写一点提示词再优化。' })
          return
        }
        if (trimmed.length > config.maxInputChars) {
          json(res, 400, {
            error: `提示词过长（超过 ${config.maxInputChars} 字符），请缩短后再试。`,
          })
          return
        }

        const preferredProvider =
          typeof body.provider === 'string' && body.provider.trim()
            ? body.provider.trim()
            : config.provider
        const preferredModel =
          typeof body.model === 'string' && body.model.trim()
            ? body.model.trim()
            : config.model

        let route
        try {
          route = resolveRoute(llm, preferredProvider, preferredModel)
        } catch (e) {
          json(res, 503, {
            error: e instanceof Error ? e.message : String(e),
          })
          return
        }

        const messages = [
          createUserMessage({
            content: [
              {
                type: 'text',
                text: '请优化以下提示词：\n\n' + trimmed,
              },
            ],
            source: {
              kind: 'plugin',
              plugin: 'dsh-prompt-optimize',
            },
          }),
        ]

        try {
          let out = ''
          let finish = null

          for await (const chunk of llm.stream({
            provider: route.provider,
            model: route.model,
            system: SYSTEM,
            messages,
            ...(route.provider === 'deepseek-official'
              ? { reasoningEffort: 'off' }
              : {}),
            maxTokens: config.maxOutputTokens,
            temperature: config.temperature,
          })) {
            if (
              chunk &&
              chunk.type === 'text-delta' &&
              typeof chunk.text === 'string'
            ) {
              out += chunk.text
            }
            if (chunk && chunk.type === 'finish') {
              finish = chunk.reason
            }
          }

          if (finish && finish.kind === 'error') {
            const msg =
              finish.failure && finish.failure.message
                ? finish.failure.message
                : '模型调用失败'
            json(res, 502, { error: msg })
            return
          }
          if (finish && finish.kind === 'aborted') {
            json(res, 499, { error: '优化已取消' })
            return
          }

          const optimized = stripFences(out)
          if (!optimized) {
            json(res, 502, { error: '模型没有返回可用文本，请重试。' })
            return
          }

          json(res, 200, {
            text: optimized,
            provider: route.provider,
            model: route.model,
            fellBack: !!route.fellBack,
          })
        } catch (e) {
          json(res, 500, {
            error: e instanceof Error ? e.message : String(e),
          })
        }
      },
    }),
  )
}

export default { name, inject, Config, apply }
