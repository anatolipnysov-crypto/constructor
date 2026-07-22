const METRIKA_MANAGEMENT_BASE_URL = 'https://api-metrika.yandex.net/management/v1'

export const ATMOSPACE_METRIKA_GOALS = Object.freeze([
  { target: 'landing_view', name: 'Квиз — посещение' },
  { target: 'quiz_question_1_answered', name: 'Квиз — ответ на вопрос 1' },
  { target: 'quiz_question_2_answered', name: 'Квиз — ответ на вопрос 2' },
  { target: 'quiz_question_3_answered', name: 'Квиз — ответ на вопрос 3' },
  { target: 'quiz_question_4_answered', name: 'Квиз — ответ на вопрос 4' },
  { target: 'quiz_question_5_answered', name: 'Квиз — ответ на вопрос 5' },
  { target: 'quiz_question_6_answered', name: 'Квиз — ответ на вопрос 6' },
  { target: 'quiz_question_7_answered', name: 'Квиз — ответ на вопрос 7' },
  { target: 'quiz_completed', name: 'Квиз — завершён' },
  { target: 'registration_click', name: 'Квиз — переход к регистрации' },
  { target: 'registration_success', name: 'Регистрация завершена' },
  { target: 'notifications_connected', name: 'Уведомления подключены' },
  { target: 'payment_success', name: 'Оплата подтверждена' },
])

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function normalizeCounterId(value) {
  const normalized = normalizeText(value, 128)
  return normalized && /^\d+$/.test(normalized)
    ? normalized
    : null
}

function buildHeaders(credential) {
  return {
    accept: 'application/json',
    authorization: `OAuth ${credential}`,
    'content-type': 'application/json',
  }
}

function readActionGoalTarget(goal) {
  if (goal?.type !== 'action' || !Array.isArray(goal.conditions)) {
    return null
  }

  for (const condition of goal.conditions) {
    if (
      (condition?.type === 'exact' || condition?.type === 'action')
      && typeof condition?.url === 'string'
      && condition.url.trim()
    ) {
      return condition.url.trim()
    }
  }

  return null
}

async function readJson(response) {
  return response.json().catch(() => null)
}

async function runWithConcurrency(items, limit, worker) {
  const queue = [...items]
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift()
        if (item) {
          await worker(item)
        }
      }
    },
  )

  await Promise.all(workers)
}

export function buildMetrikaActionGoalBody(goal) {
  return {
    goal: {
      name: goal.name,
      type: 'action',
      conditions: [
        {
          type: 'exact',
          url: goal.target,
        },
      ],
    },
  }
}

export async function ensureAtmospaceMetrikaGoals({
  counterId,
  credential,
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  const normalizedCounterId = normalizeCounterId(counterId)
  const normalizedCredential = normalizeText(credential, 4096)

  if (
    !normalizedCounterId
    || !normalizedCredential
    || typeof fetchImpl !== 'function'
  ) {
    throw new Error('metrika_goal_configuration_invalid')
  }

  const endpoint = `${METRIKA_MANAGEMENT_BASE_URL}/counter/${normalizedCounterId}/goals`
  const headers = buildHeaders(normalizedCredential)
  const listResponse = await fetchImpl(endpoint, {
    method: 'GET',
    headers,
    signal,
  })
  const listPayload = await readJson(listResponse)

  if (!listResponse.ok || !Array.isArray(listPayload?.goals)) {
    throw new Error('metrika_goal_list_failed')
  }

  const existingTargets = new Set(
    listPayload.goals
      .map(readActionGoalTarget)
      .filter(Boolean),
  )
  const missingGoals = ATMOSPACE_METRIKA_GOALS.filter(
    (goal) => !existingTargets.has(goal.target),
  )

  await runWithConcurrency(missingGoals, 4, async (goal) => {
    const createResponse = await fetchImpl(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildMetrikaActionGoalBody(goal)),
      signal,
    })

    if (!createResponse.ok) {
      throw new Error('metrika_goal_create_failed')
    }
  })

  return {
    ok: true,
    totalRequired: ATMOSPACE_METRIKA_GOALS.length,
    existingCount: ATMOSPACE_METRIKA_GOALS.length - missingGoals.length,
    createdCount: missingGoals.length,
  }
}
