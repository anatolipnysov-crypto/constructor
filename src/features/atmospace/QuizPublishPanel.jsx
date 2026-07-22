import { useMemo, useState } from 'react'
import {
  Download,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Rocket,
  ShieldCheck,
  X,
} from 'lucide-react'

import { generateAtmospaceLanding } from './generationClient.js'
import { validateLongQuizProject } from './longQuizBuilder.js'
import {
  buildPublishedLongQuizHtml,
  deserializeQuizPublishConfig,
  QUIZ_PUBLISH_STORAGE_KEY,
  serializeQuizPublishConfig,
} from './publishedQuiz.js'
import { publishPreparedQuiz } from './publishingClient.js'

const QUIZ_PROJECT_STORAGE_KEY = 'atmospaceLongQuizProjectV1'
const QUIZ_PUBLISHED_PAGE_STORAGE_KEY = 'atmospaceQuizPublishedPageV1'

function loadJson(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

function loadPublishConfig() {
  try {
    return deserializeQuizPublishConfig(
      window.localStorage.getItem(QUIZ_PUBLISH_STORAGE_KEY) || '',
    )
  } catch {
    return {}
  }
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
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
  const initialConfig = useMemo(loadPublishConfig, [])
  const initialQuiz = useMemo(() => loadJson(QUIZ_PROJECT_STORAGE_KEY), [])
  const initialPublishedPage = useMemo(
    () => loadJson(QUIZ_PUBLISHED_PAGE_STORAGE_KEY),
    [],
  )
  const [open, setOpen] = useState(false)
  const [landingName, setLandingName] = useState(
    initialConfig.landingName || initialQuiz.name || 'Персональный квиз Атмосферы',
  )
  const [landingCode, setLandingCode] = useState(initialConfig.landingCode || '')
  const [counterId, setCounterId] = useState(initialConfig.counterId || '')
  const [credential, setCredential] = useState('')
  const [pageSlug, setPageSlug] = useState(
    initialPublishedPage.slug || normalizeSlug(initialQuiz.id) || 'personal-plan',
  )
  const [publishedPage, setPublishedPage] = useState(initialPublishedPage)
  const [publishConfig, setPublishConfig] = useState(initialConfig)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const prepared = Boolean(
    publishConfig.publicLandingKey
    && publishConfig.counterId,
  )

  function buildReadyPage() {
    const project = loadJson(QUIZ_PROJECT_STORAGE_KEY)
    const validation = validateLongQuizProject(project)
    if (!validation.ok) {
      throw new Error(validation.errors[0] || 'Сначала заполните квиз.')
    }

    return {
      project: validation.project,
      html: buildPublishedLongQuizHtml(
        validation.project,
        publishConfig,
      ),
    }
  }

  async function preparePage() {
    setStatus('preparing')
    setMessage('Подготавливаем страницу…')

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

      window.localStorage.setItem(
        QUIZ_PUBLISH_STORAGE_KEY,
        serializeQuizPublishConfig(nextConfig),
      )
      setPublishConfig(nextConfig)
      setCredential('')
      setStatus('ready')
      setMessage('Страница подготовлена. Теперь её можно опубликовать или скачать файлом.')
    } catch (error) {
      setStatus('error')
      setMessage(
        error?.publicMessage
          || 'Не удалось подготовить страницу. Проверьте данные и попробуйте ещё раз.',
      )
    }
  }

  async function publishPage() {
    setStatus('publishing')
    setMessage('Публикуем страницу…')

    try {
      const readyPage = buildReadyPage()
      const result = await publishPreparedQuiz({
        slug: pageSlug,
        title: readyPage.project.name || landingName,
        html: readyPage.html,
      })

      const nextPublishedPage = {
        slug: result.slug,
        publicUrl: result.publicUrl,
        version: result.version,
        updatedAt: result.updatedAt,
      }
      window.localStorage.setItem(
        QUIZ_PUBLISHED_PAGE_STORAGE_KEY,
        JSON.stringify(nextPublishedPage),
      )
      setPublishedPage(nextPublishedPage)
      setPageSlug(result.slug)
      setStatus('ready')
      setMessage('Страница опубликована. Ссылку можно использовать в рекламе.')
    } catch (error) {
      setStatus('error')
      setMessage(
        error?.publicMessage
          || error?.message
          || 'Не удалось опубликовать страницу. Скачайте готовый файл или попробуйте позже.',
      )
    }
  }

  function downloadPublishedQuiz() {
    try {
      const readyPage = buildReadyPage()
      downloadHtml(`${readyPage.project.id || 'atmospace-quiz'}-ready.html`, readyPage.html)
      setStatus('ready')
      setMessage('Готовая страница скачана. Опубликуйте этот файл на выбранном домене.')
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
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-[60] inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-300"
      >
        <Rocket className="h-5 w-5" />
        Подготовить публикацию
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
          <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur md:p-6">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                  <ShieldCheck className="h-4 w-4" /> Безопасная подготовка страницы
                </div>
                <h2 className="text-2xl font-black text-slate-900">Свяжите квиз с Атмосферой и Метрикой</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Код из кабинета закрепляет страницу за партнёром. Номер счётчика принимает онлайн-цели квиза, а результаты регистрации, подключения уведомлений и оплаты отправляются сервером.
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
                  label="Код для рекламного лендинга"
                  value={landingCode}
                  onChange={setLandingCode}
                  placeholder="Код из партнёрского кабинета"
                  help="Скопируйте значение из раздела партнёрской программы в кабинете Атмосферы."
                />
                <Field
                  label="Номер счётчика Метрики"
                  value={counterId}
                  onChange={setCounterId}
                  placeholder="12345678"
                  help="В этом счётчике будут видны посещение, прохождение вопросов и переход к регистрации."
                />
                <div className="md:col-span-2">
                  <Field
                    label="Разрешение Метрики на отправку результатов"
                    type="password"
                    value={credential}
                    onChange={setCredential}
                    placeholder="Вставьте значение только на время подготовки"
                    help="Значение передаётся защищённому серверу один раз, не сохраняется в браузере и не попадает в готовую страницу."
                  />
                </div>
                <div className="md:col-span-2">
                  <Field
                    label="Адрес страницы"
                    value={pageSlug}
                    onChange={(value) => setPageSlug(normalizeSlug(value))}
                    placeholder="personal-plan"
                    help="Используйте латинские буквы, цифры и дефисы. После публикации получится ссылка вида /q/personal-plan."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
                На готовой странице будут работать цели: посещение, первый ответ на каждый вопрос, завершение квиза и переход к регистрации. В адрес регистрации не попадут открыто код партнёра, рекламные параметры или внутренние данные.
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

              {publishedPage.publicUrl && (
                <a
                  href={publishedPage.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800 hover:bg-emerald-100"
                >
                  <span className="min-w-0 truncate">{publishedPage.publicUrl}</span>
                  <ExternalLink className="h-5 w-5 shrink-0" />
                </a>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={preparePage}
                  disabled={status === 'preparing' || status === 'publishing' || !landingName.trim() || !landingCode.trim() || !counterId.trim() || !credential.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'preparing' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  {status === 'preparing' ? 'Подготавливаем…' : 'Подготовить'}
                </button>
                <button
                  type="button"
                  onClick={publishPage}
                  disabled={!prepared || status === 'preparing' || status === 'publishing' || pageSlug.length < 3}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'publishing' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Globe2 className="h-5 w-5" />}
                  {status === 'publishing' ? 'Публикуем…' : 'Опубликовать'}
                </button>
                <button
                  type="button"
                  onClick={downloadPublishedQuiz}
                  disabled={!prepared || status === 'preparing' || status === 'publishing'}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-4 text-sm font-black text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-5 w-5" />
                  Скачать файл
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
