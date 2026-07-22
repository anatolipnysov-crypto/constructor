function normalizeIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${fieldName} is required`)
  }

  return value.trim().slice(0, 128)
}

function normalizeWeight(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function normalizeQuizDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('quiz definition is required')
  }

  const id = normalizeIdentifier(definition.id, 'quiz.id')
  const version = normalizeIdentifier(definition.version ?? '1', 'quiz.version')
  const rawResults = Array.isArray(definition.results) ? definition.results : []
  const rawQuestions = Array.isArray(definition.questions) ? definition.questions : []

  if (rawResults.length === 0) {
    throw new TypeError('quiz.results must contain at least one result')
  }

  if (rawQuestions.length === 0) {
    throw new TypeError('quiz.questions must contain at least one question')
  }

  const results = rawResults.map((result, index) => Object.freeze({
    key: normalizeIdentifier(result?.key, `quiz.results[${index}].key`),
    priority: Number.isFinite(Number(result?.priority))
      ? Number(result.priority)
      : index,
  }))

  const resultKeys = new Set(results.map((result) => result.key))
  if (resultKeys.size !== results.length) {
    throw new TypeError('quiz result keys must be unique')
  }

  const questionIds = new Set()
  const questions = rawQuestions.map((question, questionIndex) => {
    const questionId = normalizeIdentifier(
      question?.id,
      `quiz.questions[${questionIndex}].id`,
    )
    if (questionIds.has(questionId)) {
      throw new TypeError('quiz question ids must be unique')
    }
    questionIds.add(questionId)

    const rawOptions = Array.isArray(question?.options) ? question.options : []
    if (rawOptions.length < 2) {
      throw new TypeError(`quiz question ${questionId} must contain at least two options`)
    }

    const optionIds = new Set()
    const options = rawOptions.map((option, optionIndex) => {
      const optionId = normalizeIdentifier(
        option?.id,
        `quiz.questions[${questionIndex}].options[${optionIndex}].id`,
      )
      if (optionIds.has(optionId)) {
        throw new TypeError(`quiz option ids must be unique within ${questionId}`)
      }
      optionIds.add(optionId)

      const weights = {}
      for (const [resultKey, rawWeight] of Object.entries(option?.weights ?? {})) {
        if (!resultKeys.has(resultKey)) {
          throw new TypeError(`quiz option ${optionId} references unknown result ${resultKey}`)
        }
        weights[resultKey] = normalizeWeight(rawWeight)
      }

      return Object.freeze({
        id: optionId,
        weights: Object.freeze(weights),
      })
    })

    return Object.freeze({
      id: questionId,
      options: Object.freeze(options),
    })
  })

  return Object.freeze({
    id,
    version,
    questions: Object.freeze(questions),
    results: Object.freeze(results),
  })
}

export function createQuizState(definition) {
  const quiz = normalizeQuizDefinition(definition)

  return Object.freeze({
    quizId: quiz.id,
    quizVersion: quiz.version,
    currentQuestionIndex: 0,
    answers: Object.freeze({}),
    completed: false,
    resultKey: null,
  })
}

export function resolveQuizResult(definition, answers) {
  const quiz = normalizeQuizDefinition(definition)
  const scores = Object.fromEntries(quiz.results.map((result) => [result.key, 0]))

  for (const question of quiz.questions) {
    const selectedOptionId = answers?.[question.id]
    const selectedOption = question.options.find((option) => option.id === selectedOptionId)
    if (!selectedOption) {
      continue
    }

    for (const [resultKey, weight] of Object.entries(selectedOption.weights)) {
      scores[resultKey] += weight
    }
  }

  return [...quiz.results]
    .sort((left, right) => {
      const scoreDifference = scores[right.key] - scores[left.key]
      return scoreDifference !== 0
        ? scoreDifference
        : left.priority - right.priority
    })[0].key
}

export function answerQuizQuestion(definition, state, {
  questionId,
  optionId,
}) {
  const quiz = normalizeQuizDefinition(definition)
  const currentState = state?.quizId === quiz.id
    ? state
    : createQuizState(quiz)

  const normalizedQuestionId = normalizeIdentifier(questionId, 'questionId')
  const normalizedOptionId = normalizeIdentifier(optionId, 'optionId')
  const questionIndex = quiz.questions.findIndex(
    (question) => question.id === normalizedQuestionId,
  )
  const question = quiz.questions[questionIndex]

  if (!question) {
    throw new RangeError('unknown quiz question')
  }

  if (!question.options.some((option) => option.id === normalizedOptionId)) {
    throw new RangeError('unknown quiz option')
  }

  const answers = Object.freeze({
    ...currentState.answers,
    [normalizedQuestionId]: normalizedOptionId,
  })
  const answeredCount = Object.keys(answers).length
  const completed = answeredCount === quiz.questions.length
  const nextUnansweredIndex = quiz.questions.findIndex(
    (candidate) => !answers[candidate.id],
  )
  const currentQuestionIndex = completed
    ? quiz.questions.length - 1
    : nextUnansweredIndex >= 0
      ? nextUnansweredIndex
      : Math.min(questionIndex + 1, quiz.questions.length - 1)

  return Object.freeze({
    quizId: quiz.id,
    quizVersion: quiz.version,
    currentQuestionIndex,
    answers,
    completed,
    resultKey: completed ? resolveQuizResult(quiz, answers) : null,
  })
}

export function createQuizOutcome(definition, state) {
  const quiz = normalizeQuizDefinition(definition)
  const answers = state?.answers ?? {}
  const answeredCount = Object.keys(answers).length
  const completed = answeredCount === quiz.questions.length

  return Object.freeze({
    quizId: quiz.id,
    quizVersion: quiz.version,
    answeredCount,
    completed,
    resultKey: completed
      ? state?.resultKey ?? resolveQuizResult(quiz, answers)
      : null,
  })
}
