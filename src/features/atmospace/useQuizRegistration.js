import { useCallback, useEffect, useMemo, useState } from 'react'

import { createQuizRegistrationController } from './quizRegistrationController.js'

export function useQuizRegistration({
  quizDefinition,
  runtimeOptions,
  autoInitialize = true,
} = {}) {
  const controller = useMemo(
    () => createQuizRegistrationController({
      quizDefinition,
      runtimeOptions,
    }),
    [quizDefinition, runtimeOptions],
  )
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot())

  useEffect(() => controller.subscribe(setSnapshot), [controller])

  useEffect(() => {
    if (autoInitialize) {
      controller.initialize()
    }
  }, [autoInitialize, controller])

  const answer = useCallback(
    (answerInput) => controller.answer(answerInput),
    [controller],
  )
  const retry = useCallback(
    () => controller.initialize({ force: true }),
    [controller],
  )
  const resetQuiz = useCallback(
    () => controller.resetQuiz(),
    [controller],
  )
  const continueToRegistration = useCallback(() => {
    const registrationUrl = controller.getRegistrationUrl()
    if (!registrationUrl) {
      return false
    }

    window.location.assign(registrationUrl)
    return true
  }, [controller])

  return Object.freeze({
    answer,
    continueToRegistration,
    resetQuiz,
    retry,
    snapshot,
  })
}
