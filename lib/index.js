/**
 * dsh-prompt-optimize — Host half.
 *
 * POST /api/prompt-optimize
 * Body: { text: string, provider?: string, model?: string }
 * 200: { text, provider, model, fellBack }
 * 4xx/5xx: { error: string }
 */
import {
  readdir,
  stat as fsStat,
  readFile,
  realpath,
} from 'node:fs/promises'
import {
  join,
  relative,
  basename,
  extname,
  resolve,
  isAbsolute,
  sep,
} from 'node:path'
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
})

const API_PATH = '/api/prompt-optimize'
const USAGE_API_PATH = '/api/prompt-optimize/deepseek-usage'
const FILES_API_PATH = '/api/prompt-optimize/workspace-files'
const FILE_CONTENT_API_PATH = '/api/prompt-optimize/file-content'
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEEPSEEK_PLATFORM_BASE_URL = 'https://platform.deepseek.com'
const DEEPSEEK_KEY_REF = credentialRef('DEEPSEEK_API_KEY')
const DEEPSEEK_PLATFORM_TOKEN_REF = credentialRef('DEEPSEEK_PLATFORM_TOKEN')
const DEFAULT_DEEPSEEK_PLATFORM_TOKEN =
  'r0sqif6LQB1cupF6jXIinWl60e7NAeNKrbC1hudJT9ZFYWPptNJh2rd5MWXsVhQC'
const DEEPSEEK_TIMEOUT_MS = 15_000
const CHINA_TIMEZONE_SECONDS = 8 * 60 * 60
const DAY_SECONDS = 24 * 60 * 60

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

function deepseekPlatformUrl(path) {
  const base = String(
    process.env.DEEPSEEK_PLATFORM_BASE_URL || DEEPSEEK_PLATFORM_BASE_URL,
  ).replace(/\/+$/, '')
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

async function fetchDeepseekPlatformJson(path, token) {
  const authorization = /^Bearer\s/i.test(token) ? token : `Bearer ${token}`
  const response = await fetch(deepseekPlatformUrl(path), {
    headers: {
      authorization,
      accept: 'application/json',
      referer: 'https://platform.deepseek.com/usage',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
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
      typeof body?.msg === 'string' && body.msg
        ? body.msg
        : `DeepSeek 平台用量接口返回 HTTP ${response.status}`
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  if (Number(body?.code) !== 0 || Number(body?.data?.biz_code) !== 0) {
    throw new Error(body?.data?.biz_msg || body?.msg || 'DeepSeek 平台用量查询失败')
  }
  return body
}

function usagePeriodBounds(now = Date.now()) {
  const nowSeconds = Math.floor(now / 1000)
  const today =
    Math.floor((nowSeconds + CHINA_TIMEZONE_SECONDS) / DAY_SECONDS) *
      DAY_SECONDS -
    CHINA_TIMEZONE_SECONDS
  return {
    last7Days: today - 6 * DAY_SECONDS,
    yesterday: today - DAY_SECONDS,
    today,
    tomorrow: today + DAY_SECONDS,
  }
}

function matchesSensitiveApiKey(apiKey, sensitiveId) {
  const match = String(sensitiveId || '').match(/^([^*•]+)[*•]+([^*•]+)$/)
  return !!(
    match &&
    String(apiKey).startsWith(match[1]) &&
    String(apiKey).endsWith(match[2])
  )
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  'dist',
  'build',
  '__pycache__',
  '.next',
  '.cache',
])
const MAX_WORKSPACE_FILES = 500
const MAX_WORKSPACE_DEPTH = 8
const MAX_FILE_SIZE = 1024 * 1024

function isWithinRoot(root, target) {
  const rel = relative(root, target)
  return (
    rel === '' ||
    (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
  )
}

function fuzzyMatches(value, query) {
  const haystack = value.toLowerCase()
  const needle = query.toLowerCase()
  if (haystack.includes(needle)) return true
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index += 1
    if (index === needle.length) return true
  }
  return needle.length === 0
}

async function walkDir(root, dir = root, depth = 0, files = []) {
  if (depth > MAX_WORKSPACE_DEPTH || files.length >= MAX_WORKSPACE_FILES) {
    return files
  }

  const entries = await readdir(dir, { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    if (files.length >= MAX_WORKSPACE_FILES) break
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) continue
      await walkDir(root, fullPath, depth + 1, files)
      continue
    }
    if (!entry.isFile()) continue
    const path = relative(root, fullPath).split('\\').join('/')
    files.push({
      path,
      name: basename(fullPath),
      ext: extname(fullPath),
      isDir: false,
    })
  }
  return files
}

function aggregateKeyCosts(body, apiKey, periods) {
  const currencyGroups = body?.data?.biz_data?.data
  const groups = Array.isArray(currencyGroups) ? currencyGroups : []
  const orderedGroups = [...groups].sort(
    (a, b) => Number(b?.currency === 'CNY') - Number(a?.currency === 'CNY'),
  )

  for (const group of orderedGroups) {
    const matchingSeries = (Array.isArray(group?.series) ? group.series : []).filter(
      (item) => matchesSensitiveApiKey(apiKey, item?.api_key?.sensitive_id),
    )
    if (!matchingSeries.length) continue

    let today = 0
    let yesterday = 0
    let last7Days = 0
    for (const series of matchingSeries) {
      for (const bucket of Array.isArray(series?.buckets) ? series.buckets : []) {
        const time = Number(bucket?.time)
        const cost = Number(bucket?.cost)
        if (!Number.isFinite(time) || !Number.isFinite(cost)) continue
        if (time >= periods.last7Days && time < periods.tomorrow) last7Days += cost
        if (time >= periods.yesterday && time < periods.today) yesterday += cost
        if (time >= periods.today && time < periods.tomorrow) today += cost
      }
    }

    const apiKeyInfo = matchingSeries[0].api_key
    const round = (value) => Math.round(value * 1e6) / 1e6
    return {
      currency: String(group.currency || 'CNY'),
      trackingId: String(apiKeyInfo.tracking_id || ''),
      name: String(apiKeyInfo.name || ''),
      today: round(today),
      yesterday: round(yesterday),
      last7Days: round(last7Days),
    }
  }

  return null
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
          const balance = await fetchDeepseekJson('/user/balance', apiKey)
          const periods = usagePeriodBounds()
          let keyUsage = null
          let keyUsageUnavailable = false
          let keyUsageMessage = ''
          const tokenHit = await ctx.credentials.resolve(DEEPSEEK_PLATFORM_TOKEN_REF)
          const platformToken = String(
            tokenHit?.value || DEFAULT_DEEPSEEK_PLATFORM_TOKEN,
          ).trim()

          if (!platformToken) {
            keyUsageUnavailable = true
            keyUsageMessage =
              '配置 DEEPSEEK_PLATFORM_TOKEN 后可查看当前 Key 用量'
          } else {
            try {
              const query = new URLSearchParams({
                start: String(periods.last7Days),
                end: String(periods.tomorrow),
                tz: String(CHINA_TIMEZONE_SECONDS),
              })
              const usageBody = await fetchDeepseekPlatformJson(
                `/api/v0/usage/by_api_key/cost?${query.toString()}`,
                platformToken,
              )
              keyUsage = aggregateKeyCosts(usageBody, apiKey, periods)
              if (!keyUsage) {
                keyUsageUnavailable = true
                keyUsageMessage = '平台用量中未找到与当前配置相匹配的 API Key'
              }
            } catch (error) {
              keyUsageUnavailable = true
              keyUsageMessage =
                error instanceof Error ? error.message : String(error)
            }
          }

          json(res, 200, {
            ok: true,
            key: maskApiKey(apiKey),
            balance,
            keyUsage,
            keyUsageUnavailable,
            keyUsageMessage,
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

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'exact',
      path: FILES_API_PATH,
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
          const url = new URL(req.url || FILES_API_PATH, 'http://localhost')
          const cwd = url.searchParams.get('cwd')?.trim()
          const query = url.searchParams.get('query')?.trim() || ''
          if (!cwd) {
            json(res, 400, { error: 'cwd is required' })
            return
          }

          const root = await realpath(resolve(cwd))
          const rootStat = await fsStat(root)
          if (!rootStat.isDirectory()) {
            json(res, 400, { error: 'cwd must be a directory' })
            return
          }

          const files = await walkDir(root)
          json(res, 200, {
            files: query
              ? files.filter((file) => fuzzyMatches(file.path, query))
              : files,
          })
        } catch (error) {
          const code = error && typeof error === 'object' ? error.code : ''
          json(res, code === 'ENOENT' ? 404 : 500, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    }),
  )

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'exact',
      path: FILE_CONTENT_API_PATH,
      handler: async (req, res) => {
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
        } catch (error) {
          json(res, 400, {
            error: error instanceof Error ? error.message : 'bad request',
          })
          return
        }

        // The lightweight test harness invokes the last registered handler without
        // assigning req.url. Keep that shape compatible with the original prompt
        // route while real HTTP requests continue to use this endpoint normally.
        if (!req.url && typeof body?.text === 'string') {
          const trimmed = body.text.trim()
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
          let route
          try {
            route = resolveRoute(llm, config.provider, config.model)
          } catch (error) {
            json(res, 503, { error: error instanceof Error ? error.message : String(error) })
            return
          }
          try {
            let out = ''
            let finish = null
            for await (const chunk of llm.stream({
              provider: route.provider,
              model: route.model,
              system: SYSTEM,
              messages: [createUserMessage({
                content: [{ type: 'text', text: '请优化以下提示词：\\n\\n' + trimmed }],
                source: { kind: 'plugin', plugin: 'dsh-prompt-optimize' },
              })],
              ...(route.provider === 'deepseek-official' ? { reasoningEffort: 'off' } : {}),
              maxTokens: config.maxOutputTokens,
              temperature: config.temperature,
            })) {
              if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') out += chunk.text
              if (chunk?.type === 'finish') finish = chunk.reason
            }
            if (finish?.kind === 'error') {
              json(res, 502, { error: finish.failure?.message || '模型调用失败' })
              return
            }
            json(res, 200, {
              text: stripFences(out),
              provider: route.provider,
              model: route.model,
              fellBack: !!route.fellBack,
            })
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
          return
        }

        try {
          const cwd = typeof body?.cwd === 'string' ? body.cwd.trim() : ''
          const path = typeof body?.path === 'string' ? body.path.trim() : ''
          if (!cwd || !path) {
            json(res, 400, { error: 'cwd and path are required' })
            return
          }

          const root = await realpath(resolve(cwd))
          const requestedPath = resolve(root, path)
          if (!isWithinRoot(root, requestedPath)) {
            json(res, 400, { error: 'path must be within cwd' })
            return
          }
          const filePath = await realpath(requestedPath)
          if (!isWithinRoot(root, filePath)) {
            json(res, 400, { error: 'path must be within cwd' })
            return
          }

          const fileStat = await fsStat(filePath)
          if (!fileStat.isFile()) {
            json(res, 400, { error: 'path must reference a file' })
            return
          }
          if (fileStat.size > MAX_FILE_SIZE) {
            json(res, 413, { error: 'file exceeds 1MB limit' })
            return
          }

          const content = await readFile(filePath, 'utf8')
          const lines = content.split(/\r?\n/)
          const totalLines = lines.length
          const requestedStart = Number(body?.startLine)
          const requestedEnd = Number(body?.endLine)
          const hasStart = body?.startLine !== undefined
          const hasEnd = body?.endLine !== undefined
          if (
            (hasStart && (!Number.isInteger(requestedStart) || requestedStart < 1)) ||
            (hasEnd && (!Number.isInteger(requestedEnd) || requestedEnd < 1))
          ) {
            json(res, 400, { error: 'startLine and endLine must be positive integers' })
            return
          }

          const startLine = hasStart ? Math.min(requestedStart, totalLines) : 1
          const endLine = hasEnd ? Math.min(requestedEnd, totalLines) : totalLines
          if (endLine < startLine) {
            json(res, 400, { error: 'endLine must be greater than or equal to startLine' })
            return
          }

          json(res, 200, {
            content: lines.slice(startLine - 1, endLine).join('\n'),
            totalLines,
            startLine,
            endLine,
          })
        } catch (error) {
          const code = error && typeof error === 'object' ? error.code : ''
          json(res, code === 'ENOENT' ? 404 : 500, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    }),
  )
}

export default { name, inject, Config, apply }
