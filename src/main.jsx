import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installProtectedProjectStorageGuard } from './security/protectedProjectStorage.js'

const RECOVERY_ATTEMPT_KEY = 'constructorRecoveryAttempted:v1'
const RECOVERABLE_STORAGE_KEYS = new Set([
  'constructorProjectData',
  'constructorAtmospaceLandingArtifacts',
  'constructorPrelandingVisualMemoryV2',
  'constructorPrelandingDesignRotationIndexV2',
  'constructorPrelandingVisualRotationIndexV2',
])

function clearRecoverableConstructorState() {
  try {
    const keys = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key) keys.push(key)
    }

    keys.forEach((key) => {
      if (RECOVERABLE_STORAGE_KEYS.has(key) || key.startsWith('constructorProjectData:')) {
        window.localStorage.removeItem(key)
      }
    })
  } catch {
    // The visible recovery action remains available when storage is blocked.
  }
}

class ConstructorRecoveryBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('[Constructor] React render failed.', error)

    try {
      if (window.sessionStorage.getItem(RECOVERY_ATTEMPT_KEY) !== '1') {
        window.sessionStorage.setItem(RECOVERY_ATTEMPT_KEY, '1')
        clearRecoverableConstructorState()
        window.location.reload()
      }
    } catch {
      // Fall through to the visible recovery screen.
    }
  }

  recover = () => {
    clearRecoverableConstructorState()
    try {
      window.sessionStorage.removeItem(RECOVERY_ATTEMPT_KEY)
    } catch {
      // Reload is still useful when session storage is unavailable.
    }
    window.location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="min-h-screen bg-slate-950 px-5 py-16 text-white">
        <section className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <h1 className="text-2xl font-black">Конструктор восстанавливает интерфейс</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            В браузере остались данные от прежней версии. Сбросьте только кеш сборки и откройте актуальный конструктор заново.
          </p>
          <button
            type="button"
            onClick={this.recover}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500"
          >
            Восстановить конструктор
          </button>
        </section>
      </main>
    )
  }
}

installProtectedProjectStorageGuard()

const root = document.getElementById('root')

if (!root) {
  throw new Error('Constructor root element is missing.')
}

createRoot(root).render(
  <StrictMode>
    <ConstructorRecoveryBoundary>
      <App />
    </ConstructorRecoveryBoundary>
  </StrictMode>,
)
