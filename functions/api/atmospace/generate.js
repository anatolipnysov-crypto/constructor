/* eslint-disable react-refresh/only-export-components */

import { ensureAtmospaceMetrikaGoals } from './metrikaGoals.js'

const DEFAULT_ATMOSPACE_API_BASE_URL = 'https://api.atmospace.pro'
const GENERATE_PATH = '/api/landing-runtime/generate'
const HEALTH_PATH = '/health'
const MAX_REQUEST_BYTES = 64 * 1024
const REQUEST_TIMEOUT_MS = 30_000
const MODERNISTO_START_RUNTIME_PROFILE = 'modernisto-start-external-v1'

const PUBLIC_MESSAGES = Object.freeze({
  invalid_request: 'Проверьте заполненные данные и попробуйте ещё раз.',
  origin_not_allowed: 'Не удалось выполнить действие с этой страницы.',
  payload_too_large: 'Слишком большой объём данных. Сократите значения и повторите.',
  metrika_unavailable: 'Не удалось подготовить цели Метрики. Проверьте номер счётчика и доступ к нему.',
  service_unavailable: 'Сервис временно недоступен. Попробуйте ещё раз.',
  landing_code_invalid: 'Код рекламного лендинга не найден. Создайте новый код в Atmospace и попробуйте ещё раз.',
  landing_code_expired: 'Срок действия кода рекламного лендинга закончился. Создайте новый код в Atmospace.',
  landing_code_disabled: 'Этот код рекламного лендинга больше не активен. Создайте новый код в Atmospace.',
})

const SAFE_UPSTREAM_REASONS = Object.freeze({
  landing_name_required: 'landing_data_rejected',
  landing_code_required: 'landing_data_rejected',
  counter_id_required: 'landing_data_rejected',
  ad_goal_credential_required: 'landing_data_rejected',
  landing_code_invalid: 'landing_code_rejected',
  landing_not_found: 'landing_code_rejected',
  landing_disabled: 'landing_code_rejected',
  landing_expired: 'landing_code_rejected',
  landing_code_disabled: 'landing_code_rejected',
  landing_code_expired: 'landing_code_rejected',
  partner_unavailable: 'landing_code_rejected',
  credential_storage_not_configured: 'atmospace_not_ready',
  database_not_configured: 'atmospace_not_ready',
  database_unreachable: 'atmospace_not_ready',
  internal_error: 'atmospace_not_ready',
})

const SAFE_METRIKA_REASONS = Object.freeze({
  metrika_goal_configuration_invalid: 'metrika_configuration_rejected',
  metrika_goal_list_failed: 'metrika_access_rejected',
  metrika_goal_create_failed: 'metrika_goal_setup_rejected',
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

function safeFailure({ stage, reason, message, status }) {
  return json({
    ok: false,
    stage,
    reason,
    message,
  }, status)
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
  const adGoalCredential = normalizeText(
    body?.serverOnlyAdGoalCredential ?? body?.adGoalCredential,
    4096,
  )
  const runtimeProfile = normalizeText(body?.runtimeProfile, 128) ?? ''

  if (
    !landingName
    || !landingCode
    || !counterId
    || !adGoalCredential
    || (runtimeProfile && runtimeProfile !== MODERNISTO_START_RUNTIME_PROFILE)
    || (runtimeProfile === MODERNISTO_START_RUNTIME_PROFILE && !/^\d{5,20}$/.test(counterId))
  ) {
    return { ok: false }
  }

  return {
    ok: true,
    credential: adGoalCredential,
    counterId,
    landingName,
    runtimeProfile,
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

function normalizeModernistoStartGenerateResponse(payload, binding) {
  const publicLandingKey = normalizeText(payload?.data?.publicLandingKey, 1024)
  const upstreamCounterValue = payload?.data?.counterId ?? payload?.data?.counter_id
  const hasUpstreamCounterId = payload?.data?.counterId !== undefined
    || payload?.data?.counter_id !== undefined
  const upstreamCounterId = upstreamCounterValue === undefined || upstreamCounterValue === null
    ? null
    : normalizeText(String(upstreamCounterValue), 128)
  const status = normalizeText(payload?.data?.status, 128) ?? 'generated'

  if (
    payload?.ok !== true
    || !publicLandingKey
    || !/^\d{5,20}$/.test(binding.counterId)
    || (hasUpstreamCounterId && upstreamCounterId !== binding.counterId)
  ) {
    return null
  }

  return {
    ok: true,
    data: {
      publicLandingKey,
      counterId: binding.counterId,
      landingName: normalizeText(payload?.data?.landingName, 512) ?? binding.landingName,
      status,
    },
  }
}

function safeMetrikaReason(error) {
  const code = error instanceof Error ? error.message : ''
  return SAFE_METRIKA_REASONS[code] ?? 'metrika_request_failed'
}

function safeUpstreamFailure(payload, status) {
  const upstreamCode = normalizeText(payload?.error, 128)
  const reason = SAFE_UPSTREAM_REASONS[upstreamCode]
    ?? (status >= 500 ? 'atmospace_not_ready' : 'atmospace_request_rejected')
  const serverFailure = status >= 500 || reason === 'atmospace_not_ready'
  const productMessage = upstreamCode ? PUBLIC_MESSAGES[upstreamCode] : null

  return safeFailure({
    stage: 'atmospace',
    reason,
    message: serverFailure
      ? PUBLIC_MESSAGES.service_unavailable
      : productMessage ?? PUBLIC_MESSAGES.invalid_request,
    status: serverFailure ? 503 : 400,
  })
}

export function createGenerateHandler({
  fetchImpl = globalThis.fetch,
  ensureGoals = ensureAtmospaceMetrikaGoals,
} = {}) {
  return async function handleGenerate({ request, env = {} }) {
    if (!isSameOriginRequest(request)) {
      return safeFailure({
        stage: 'constructor',
        reason: 'origin_not_allowed',
        message: PUBLIC_MESSAGES.origin_not_allowed,
        status: 403,
      })
    }

    const parsedBody = await readJsonBody(request)
    if (!parsedBody.ok) {
      const status = parsedBody.error === 'payload_too_large' ? 413 : 400
      return safeFailure({
        stage: 'constructor',
        reason: parsedBody.error,
        message: PUBLIC_MESSAGES[parsedBody.error],
        status,
      })
    }

    const normalizedRequest = normalizeGenerateRequest(parsedBody.body)
    if (!normalizedRequest.ok) {
      return safeFailure({
        stage: 'constructor',
        reason: 'invalid_request',
        message: PUBLIC_MESSAGES.invalid_request,
        status: 400,
      })
    }

    let apiBaseUrl
    try {
      apiBaseUrl = normalizeApiBaseUrl(env.ATMOSPACE_API_BASE_URL)
    } catch {
      return safeFailure({
        stage: 'constructor',
        reason: 'api_configuration_invalid',
        message: PUBLIC_MESSAGES.service_unavailable,
        status: 503,
      })
    }

    const endpoint = `${apiBaseUrl}${GENERATE_PATH}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      try {
        await ensureGoals({
          counterId: normalizedRequest.counterId,
          credential: normalizedRequest.credential,
          fetchImpl,
          signal: controller.signal,
        })
      } catch (error) {
        return safeFailure({
          stage: 'metrika',
          reason: safeMetrikaReason(error),
          message: PUBLIC_MESSAGES.metrika_unavailable,
          status: 400,
        })
      }

      const upstreamResponse = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(normalizedRequest.payload),
        signal: controller.signal,
      })
      const upstreamPayload = await upstreamResponse.json().catch(() => null)

      if (normalizedRequest.runtimeProfile === MODERNISTO_START_RUNTIME_PROFILE) {
        if (!upstreamResponse.ok) {
          return safeUpstreamFailure(upstreamPayload, upstreamResponse.status)
        }

        const safeExternalResponse = normalizeModernistoStartGenerateResponse(
          upstreamPayload,
          normalizedRequest,
        )
        if (!safeExternalResponse) {
          const error = 'atmospace_external_runtime_contract_failed'
          return json({
            ok: false,
            stage: 'atmospace',
            reason: error,
            error,
            message: PUBLIC_MESSAGES.service_unavailable,
          }, 502)
        }

        return json(safeExternalResponse)
      }

      const safeResponse = normalizeSafeGenerateResponse(upstreamPayload)

      if (!upstreamResponse.ok || !safeResponse) {
        return safeUpstreamFailure(upstreamPayload, upstreamResponse.status)
      }

      return json(safeResponse)
    } catch {
      return safeFailure({
        stage: 'atmospace',
        reason: controller.signal.aborted ? 'atmospace_timeout' : 'atmospace_unreachable',
        message: PUBLIC_MESSAGES.service_unavailable,
        status: 503,
      })
    } finally {
      clearTimeout(timeout)
    }
  }
}

export function createHealthHandler({ fetchImpl = globalThis.fetch } = {}) {
  return async function handleHealth({ env = {} } = {}) {
    let endpoint
    try {
      endpoint = `${normalizeApiBaseUrl(env.ATMOSPACE_API_BASE_URL)}${HEALTH_PATH}`
    } catch {
      return safeFailure({
        stage: 'constructor',
        reason: 'api_configuration_invalid',
        message: PUBLIC_MESSAGES.service_unavailable,
        status: 503,
      })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
      const response = await fetchImpl(endpoint, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.ok !== true) {
        return safeFailure({
          stage: 'atmospace',
          reason: 'atmospace_health_failed',
          message: PUBLIC_MESSAGES.service_unavailable,
          status: 503,
        })
      }

      return json({
        ok: true,
        service: 'constructor-atmospace-bridge',
        data: {
          atmospace: 'ready',
          contract: 'landing-runtime-generate-v1',
        },
      })
    } catch {
      return safeFailure({
        stage: 'atmospace',
        reason: controller.signal.aborted ? 'atmospace_timeout' : 'atmospace_unreachable',
        message: PUBLIC_MESSAGES.service_unavailable,
        status: 503,
      })
    } finally {
      clearTimeout(timeout)
    }
  }
}

export const onRequestGet = createHealthHandler()
export const onRequestPost = createGenerateHandler()
