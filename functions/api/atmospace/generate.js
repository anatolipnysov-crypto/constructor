/* eslint-disable react-refresh/only-export-components */

const DEFAULT_ATMOSPACE_API_BASE_URL = 'https://api.atmospace.pro'
const GENERATE_PATH = '/api/landing-runtime/generate'
const MAX_REQUEST_BYTES = 64 * 1024
const REQUEST_TIMEOUT_MS = 15_000

const PUBLIC_MESSAGES = Object.freeze({
  invalid_request: 'Проверьте заполненные данные и попробуйте ещё раз.',
  origin_not_allowed: 'Не удалось выполнить действие с этой страницы.',
  payload_too_large: 'Слишком большой объём данных. Сократите значения и повторите.',
  service_unavailable: 'Сервис временно недоступен. Попробуйте ещё раз.',
})

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  })
}

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  return normalized.slice(0, maxLength)
}

function normalizeApiBaseUrl(value) {
  const url = new URL(
    normalizeText(value, 2048) ?? DEFAULT_ATMOSPACE_API_BASE_URL,
  )

  if (url.protocol !== 'https:') {
    throw new TypeError('Atmospace API must use HTTPS')
  }

  url.pathname = url.pathname.replace(/\/+$/, '')
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

function isSameOriginRequest(request) {
  const origin = request.headers.get('origin')
  if (!origin) {
    return false
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return { ok: false, error: 'payload_too_large' }
  }

  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return { ok: false, error: 'payload_too_large' }
  }

  try {
    return { ok: true, body: JSON.parse(rawBody) }
  } catch {
    return { ok: false, error: 'invalid_request' }
  }
}

function normalizeGenerateRequest(body) {
  const landingName = normalizeText(body?.landingName, 512)
  const landingCode = normalizeText(body?.landingCode, 512)
  const counterId = normalizeText(body?.counterId, 128)
  const adGoalCredential = normalizeText(body?.adGoalCredential, 4096)

  if (!landingName || !landingCode || !counterId || !adGoalCredential) {
    return { ok: false }
  }

  return {
    ok: true,
    payload: {
      landing_name: landingName,
      landing_code: landingCode,
      counter_id: counterId,
      server_only_ad_goal_credential: adGoalCredential,
    },
  }
}

function normalizeSafeGenerateResponse(payload) {
  const publicLandingKey = normalizeText(payload?.data?.publicLandingKey, 1024)
  const embedCode = normalizeText(payload?.data?.embedCode, 1_000_000)
  const landingName = normalizeText(payload?.data?.landingName, 512)

  if (payload?.ok !== true || !publicLandingKey || !embedCode || !landingName) {
    return null
  }

  return {
    ok: true,
    data: {
      publicLandingKey,
      embedCode,
      landingName,
    },
  }
}

export function createGenerateHandler({ fetchImpl = globalThis.fetch } = {}) {
  return async function handleGenerate({ request, env = {} }) {
    if (!isSameOriginRequest(request)) {
      return json({
        ok: false,
        message: PUBLIC_MESSAGES.origin_not_allowed,
      }, 403)
    }

    const parsedBody = await readJsonBody(request)
    if (!parsedBody.ok) {
      const status = parsedBody.error === 'payload_too_large' ? 413 : 400
      return json({
        ok: false,
        message: PUBLIC_MESSAGES[parsedBody.error],
      }, status)
    }

    const normalizedRequest = normalizeGenerateRequest(parsedBody.body)
    if (!normalizedRequest.ok) {
      return json({
        ok: false,
        message: PUBLIC_MESSAGES.invalid_request,
      }, 400)
    }

    let endpoint
    try {
      endpoint = `${normalizeApiBaseUrl(env.ATMOSPACE_API_BASE_URL)}${GENERATE_PATH}`
    } catch {
      return json({
        ok: false,
        message: PUBLIC_MESSAGES.service_unavailable,
      }, 503)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const upstreamResponse = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(normalizedRequest.payload),
        signal: controller.signal,
      })
      const upstreamPayload = await upstreamResponse.json().catch(() => null)
      const safeResponse = normalizeSafeGenerateResponse(upstreamPayload)

      if (!upstreamResponse.ok || !safeResponse) {
        return json({
          ok: false,
          message: upstreamResponse.status >= 500
            ? PUBLIC_MESSAGES.service_unavailable
            : PUBLIC_MESSAGES.invalid_request,
        }, upstreamResponse.status >= 500 ? 503 : 400)
      }

      return json(safeResponse)
    } catch {
      return json({
        ok: false,
        message: PUBLIC_MESSAGES.service_unavailable,
      }, 503)
    } finally {
      clearTimeout(timeout)
    }
  }
}

export const onRequestPost = createGenerateHandler()
