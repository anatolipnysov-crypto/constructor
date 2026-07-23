import { useEffect, useState } from 'react'
import { ListChecks } from 'lucide-react'

import Constructor from './App.jsx'
import LongQuizEditor from './features/atmospace/LongQuizEditor.jsx'
import QuizPublishPanel from './features/atmospace/QuizPublishPanel.jsx'
import { installProtectedProjectStorageGuard } from './security/protectedProjectStorage.js'

const QUIZ_TOOL_VALUE = 'atmosphere-quiz'

installProtectedProjectStorageGuard()

function readToolFromLocation() {
  if (typeof window === 'undefined') {
    return 'constructor'
  }

  const url = new URL(window.location.href)
  return url.searchParams.get('tool') === QUIZ_TOOL_VALUE
    ? QUIZ_TOOL_VALUE
    : 'constructor'
}

function writeToolToLocation(tool) {
  const url = new URL(window.location.href)

  if (tool === QUIZ_TOOL_VALUE) {
    url.searchParams.set('tool', QUIZ_TOOL_VALUE)
  } else {
    url.searchParams.delete('tool')
  }

  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export default function ConstructorRouter() {
  const [tool, setTool] = useState(readToolFromLocation)

  useEffect(() => {
    const handlePopState = () => setTool(readToolFromLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const openQuiz = () => {
    writeToolToLocation(QUIZ_TOOL_VALUE)
    setTool(QUIZ_TOOL_VALUE)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openConstructor = () => {
    writeToolToLocation('constructor')
    setTool('constructor')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (tool === QUIZ_TOOL_VALUE) {
    return (
      <>
        <LongQuizEditor onBack={openConstructor} />
        <QuizPublishPanel />
      </>
    )
  }

  return (
    <>
      <Constructor />
      <button
        type="button"
        onClick={openQuiz}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-300"
        aria-label="Открыть конструктор длинного квиза Атмосферы"
      >
        <ListChecks className="h-5 w-5" />
        Квиз Атмосферы
      </button>
    </>
  )
}
