import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Code2,
  Copy,
  Download,
  LoaderCircle,
  ShieldCheck,
  X,
} from 'lucide-react'

import {
  buildStandaloneQuizHtml,
  buildTildaQuizEmbedCode,
} from './embedCode.js'
import { generateAtmospaceLanding } from './generationClient.js'
import { validateLongQuizProject } from './longQuizBuilder.js'
import {
  deserializeQuizPublishConfig,
  QUIZ_PUBLISH_STORAGE_KEY,
  serializeQuizPublishConfig,
} from './publishedQuiz.js'

const QUIZ_PROJECT_STORAGE_KEY = 'atmospaceLongQuizProjectV1'

function loadJson(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

function loadPreparedConfig() {
  try {
    return deserializeQuizPublishConfig(
      window.localStorage.getItem(QUIZ_PUBLISH_STORAGE_KEY) || '',
    )
  } catch {
    return {}
  }
}

function downloadHtml(filename, content) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) {
    throw new Error('copy_failed')
  }
}

function Field({ label, value, onChange, placeholder, type = 'text', help }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
      />
      {help && <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-500">{help}</span>}
    </label>
  )
}

export default function QuizPublishPanel() {
  const initialConfig = useMemo(loadPreparedConfig, [])
  const initialQuiz = useMemo(() => loadJson(QUIZ_PROJECT_STORAGE_KEY), [])
  const [open, setOpen] = useState(false)
  const [landingName, setLandingName] = useState(
    initialConfig.landingName || initialQuiz.name || 'Персональный квиз Атмосферы',
  )
  const [landingCode, setLandingCode] = useState(initialConfig.landingCode || '')
  const [counterId, setCounterId] = useState(initialConfig.counterId || '')
  const [credential, setCredential] = useState('')
  const [preparedConfig, setPreparedConfig] = useState(initialConfig)
  const [embedCode, setEmbedCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const prepared = Boolean(
    preparedConfig.publicLandingKey
    && preparedConfig.counterId,
  )
  const busy = status === 'preparing' || status === 'copying'

  function buildReadyAssets(config = preparedConfig) {
    const project = loadJson(QUIZ_PROJECT_STORAGE_KEY)
    const validation = validateLongQuizProject(project)
    if (!validation.ok) {
      throw new Error(validation.errors[0] || 'Сначала заполните квиз.')
    }

    return {
      project: validation.project,
      embedCode: buildTildaQuizEmbedCode(validation.project, config),
      standaloneHtml: buildStandaloneQuizHtml(validation.project, config),
    }
  }

  function openPanel() {
    setOpen(true)
    if (!prepared) return

    try {
      setEmbedCode(buildReadyAssets().embedCode)
    } catch {
      setEmbedCode('')
    }
  }

  async function prepareCode() {
    setStatus('preparing')
    setMessage('Подготавливаем код квиза…')

    try {
      const result = await generateAtmospaceLanding({
        landingName,
        landingCode,
        counterId,
        adGoalCredential: credential,
      })

      const nextConfig = {
        publicLandingKey: result.publicLandingKey,
        landingName: result.landingName || landingName,
        landingCode,
        counterId,
      }
      const readyAssets = buildReadyAssets(nextConfig)

      window.localStorage.setItem(
        QUIZ_PUBLISH_STORAGE_KEY,
        serializeQuizPublishConfig(nextConfig),
      )
      setPreparedConfig(nextConfig)
      setEmbedCode(readyAssets.embedCode)
      setCredential('')
      setStatus('ready')
      setMessage('Код готов. Скопируйте его целиком и вставьте в HTML-блок своего сайта.')
    } catch (error) {
      setStatus('error')
      setMessage(
        error?.publicMessage
          || error?.message
          || 'Не удалось подготовить код. Проверьте данные и попробуйте ещё раз.',
      )
    }
  }

  async function copyEmbedCode() {
    setStatus('copying')
    setMessage('Копируем готовый код…')

    try {
      const readyAssets = buildReadyAssets()
      await copyText(readyAssets.embedCode)
      setEmbedCode(readyAssets.embedCode)
      setStatus('ready')
      setMessage('Код скопирован. Вставьте его целиком в блок T123 «HTML-код» или в HTML-блок другого сайта.')
    } catch (error) {
      setStatus('error')
      setMessage(
        error instanceof Error && error.message !== 'copy_failed'
          ? error.message
          : 'Не удалось скопировать код автоматически. Выделите его в поле ниже и скопируйте вручную.',
      )
    }
  }

  function downloadStandaloneQuiz() {
    try {
      const readyAssets = buildReadyAssets()
      downloadHtml(
        `${readyAssets.project.id || 'atmospace-quiz'}-ready.html`,
        readyAssets.standaloneHtml,
      )
      setStatus('ready')
      setMessage('HTML-файл скачан. Его можно разместить на своём хостинге или передать разработчику.')
    } catch (error) {
      setStatus('error')
      setMessage(
        error instanceof Error
          ? error.message
          : 'Не удалось подготовить файл. Попробуйте ещё раз.',
      )
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-5 left-5 z-[60] inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-300"
      >
        <Code2 className="h-5 w-5" />
        Получить код квиза
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
          <section className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur md:p-6">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                  <ShieldCheck className="h-4 w-4" /> Готовый код для вашего сайта
                </div>
                <h2 className="text-2xl font-black text-slate-900">Свяжите квиз с Атмосферой и Метрикой</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Конструктор создаёт переносимый код. Страницу вы размещаете на своём сайте — в Tilda, на собственном хостинге или в другой системе с HTML-блоком.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" aria-label="Закрыть">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-5 p-5 md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Field
                    label="Название страницы"
                    value={landingName}
                    onChange={setLandingName}
                    placeholder="Мужчины 30–60: точка перезапуска"
                    help="Название будет использоваться в аналитике, чтобы отличать этот квиз от других страниц."
                  />
                </div>
                <Field
                  label="Код из партнёрского кабинета"
                  value={landingCode}
                  onChange={setLandingCode}
                  placeholder="Вставьте код страницы"
                  help="Он связывает будущие регистрации и оплаты с нужным партнёром."
                />
                <Field
                  label="Номер счётчика Метрики"
                  value={counterId}
                  onChange={setCounterId}
                  placeholder="12345678"
                  help="В этом счётчике будут видны посещение, ответы, завершение квиза и переход к регистрации."
                />
                <div className="md:col-span-2">
                  <Field
                    label="Разрешение Метрики на настройку целей"
                    type="password"
                    value={credential}
                    onChange={setCredential}
                    placeholder="Вставьте значение только на время подготовки"
                    help="Оно передаётся защищённому серверу один раз, не сохраняется в браузере и не попадает в готовый код."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
                <strong>Как использовать:</strong> в Tilda добавьте блок T123 «HTML-код», вставьте код целиком и опубликуйте страницу. На другом сайте вставьте его в обычный HTML-блок. Картинки остаются по исходным HTTPS-ссылкам и загружаются с медиасервера — конструктор их не переносит и не размещает.
              </div>

              {message && (
                <div className={`rounded-2xl border p-4 text-sm font-bold ${
                  status === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}>
                  {message}
                </div>
              )}

              {prepared && (
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-black text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Готовый код
                  </span>
                  <textarea
                    value={embedCode}
                    onChange={() => {}}
                    readOnly
                    spellCheck="false"
                    rows={12}
                    className="w-full resize-y rounded-2xl border-2 border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:border-blue-500"
                  />
                </label>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={prepareCode}
                  disabled={busy || !landingName.trim() || !landingCode.trim() || !counterId.trim() || !credential.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'preparing' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  {status === 'preparing' ? 'Подготавливаем…' : 'Подготовить код'}
                </button>
                <button
                  type="button"
                  onClick={copyEmbedCode}
                  disabled={!prepared || busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'copying' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Copy className="h-5 w-5" />}
                  {status === 'copying' ? 'Копируем…' : 'Скопировать код'}
                </button>
                <button
                  type="button"
                  onClick={downloadStandaloneQuiz}
                  disabled={!prepared || busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-4 text-sm font-black text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-5 w-5" />
                  Скачать HTML
                </button>
              </div>

              <p className="text-center text-xs leading-relaxed text-slate-500">
                CAPTCHA, создание аккаунта, подключение уведомлений, платежи и серверные цели остаются на стороне Атмосферы.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
