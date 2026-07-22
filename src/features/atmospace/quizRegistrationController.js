import { initializeAtmospaceLanding } from './runtimeClient.js'
import {
  answerQuizQuestion,
  createQuizOutcome,
  createQuizState,
  normalizeQuizDefinition,
} from './quizEngine.js'

const INITIAL_RUNTIME_STATE = Object.freeze({
  status: 'idle',
  registrationUrl: null,
  message: null,
  retryable: false,
})

export function createQuizRegistrationController({
  quizDefinition,
  runtimeOptions,
  runtimeInitializer = initializeAtmospaceLanding,
} = {}) {
  const quiz = normalizeQuizDefinition(quizDefinition)
  let quizState = createQuizState(quiz)
  let runtimeState = INITIAL_RUNTIME_STATE
  let initializationPromise = null
  const subscribers = new Set()

  function snapshot() {
    return Object.freeze({
      quiz: Object.freeze({
        state: quizState,
        outcome: createQuizOutcome(quiz, quizState),
      }),
      runtime: runtimeState,
      canContinueToRegistration: Boolean(
        quizState.completed
        && runtimeState.status === 'ready'
        && runtimeState.registrationUrl,
      ),
    })
  }

  function publish() {
    const currentSnapshot = snapshot()
    for (const subscriber of subscribers) {
      subscriber(currentSnapshot)
    }
    return currentSnapshot
  }

  async function initialize({ force = false } = {}) {
    if (initializationPromise && !force) {
      return initializationPromise
    }

    if (runtimeState.status === 'ready' && !force) {
      return snapshot()
    }

    runtimeState = Object.freeze({
      status: 'loading',
      registrationUrl: null,
      message: null,
      retryable: false,
    })
    publish()

    initializationPromise = Promise.resolve()
      .then(() => runtimeInitializer(runtimeOptions))
      .then((runtime) => {
        runtimeState = Object.freeze({
          status: 'ready',
          registrationUrl: runtime.registrationUrl,
          message: null,
          retryable: false,
        })
        return publish()
      })
      .catch((error) => {
        runtimeState = Object.freeze({
          status: 'error',
          registrationUrl: null,
          message: error?.publicMessage
            ?? 'Регистрация временно недоступна. Попробуйте ещё раз.',
          retryable: error?.retryable === true,
        })
        return publish()
      })
      .finally(() => {
        initializationPromise = null
      })

    return initializationPromise
  }

  function answer(answerInput) {
    quizState = answerQuizQuestion(quiz, quizState, answerInput)
    return publish()
  }

  function resetQuiz() {
    quizState = createQuizState(quiz)
    return publish()
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== 'function') {
      throw new TypeError('subscriber must be a function')
    }

    subscribers.add(subscriber)
    subscriber(snapshot())

    return () => subscribers.delete(subscriber)
  }

  function getRegistrationUrl() {
    const currentSnapshot = snapshot()
    return currentSnapshot.canContinueToRegistration
      ? currentSnapshot.runtime.registrationUrl
      : null
  }

  return Object.freeze({
    answer,
    getRegistrationUrl,
    getSnapshot: snapshot,
    initialize,
    resetQuiz,
    subscribe,
  })
}
