import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'

import {
  answerQuizQuestion,
  createQuizState,
} from './quizEngine.js'
import {
  buildLongQuizLandingHtml,
  buildQuizEngineDefinition,
  LONG_QUIZ_MAX_QUESTIONS,
  LONG_QUIZ_MIN_QUESTIONS,
  validateLongQuizProject,
} from './longQuizBuilder.js'
import {
  ATMOSPACE_QUESTION_LIBRARY,
  cloneQuestionFromLibrary,
  createAtmospaceMenRestartPreset,
  createBlankQuizQuestion,
} from './quizPresets.js'

const STORAGE_KEY = 'atmospaceLongQuizProjectV1'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadProject() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : createAtmospaceMenRestartPreset()
  } catch {
    return createAtmospaceMenRestartPreset()
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

function makeUniqueQuestion(question, questionIndex) {
  const copy = clone(question)
  const suffix = `${Date.now()}-${questionIndex + 1}`
  copy.id = `${copy.id}-${suffix}`
  copy.options = copy.options.map((option, optionIndex) => ({
    ...option,
    id: `${option.id}-${suffix}-${optionIndex + 1}`,
  }))
  return copy
}

function Input({ label, value, onChange, placeholder, dark = false }) {
  return (
    <label className="block">
      <span className={`mb-1.5 block text-xs font-black ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium outline-none transition ${
          dark
            ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-600 focus:border-blue-500'
            : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
        }`}
      />
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder, rows = 3, dark = false }) {
  return (
    <label className="block">
      <span className={`mb-1.5 block text-xs font-black ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full resize-y rounded-xl border-2 px-4 py-3 text-sm font-medium outline-none transition ${
          dark
            ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-600 focus:border-blue-500'
            : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
        }`}
      />
    </label>
  )
}

function QuizPreview({ project, validation, dark }) {
  const quizDefinition = useMemo(
    () => validation.ok ? buildQuizEngineDefinition(validation.project) : null,
    [validation],
  )
  const [state, setState] = useState(() => quizDefinition ? createQuizState(quizDefinition) : null)

  useEffect(() => {
    setState(quizDefinition ? createQuizState(quizDefinition) : null)
  }, [quizDefinition])

  const selectedResult = validation.ok && state?.completed
    ? validation.project.results.find((result) => result.key === state.resultKey)
    : null

  if (!validation.ok) {
    return (
      <div className={`rounded-2xl border-2 border-dashed p-6 ${dark ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-300 bg-slate-50 text-slate-500'}`}>
        <div className="mb-2 flex items-center gap-2 font-black">
          <Eye className="h-5 w-5" /> Предпросмотр появится после заполнения
        </div>
        <ul className="space-y-1 text-sm">
          {validation.errors.map((error) => <li key={error}>• {error}</li>)}
        </ul>
      </div>
    )
  }

  const answeredCount = Object.keys(state?.answers ?? {}).length
  const progress = Math.round(answeredCount / validation.project.questions.length * 100)

  return (
    <div className={`overflow-hidden rounded-3xl border shadow-xl ${dark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 text-white">
        <div className="mb-3 inline-flex rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-900">
          {validation.project.eyebrow}
        </div>
        <h2 className="text-3xl font-black leading-tight tracking-tight">{validation.project.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-blue-100">{validation.project.subtitle}</p>
        {validation.project.intro && (
          <p className="mt-4 rounded-xl bg-white/10 p-3 text-xs leading-relaxed text-slate-200">
            {validation.project.intro}
          </p>
        )}
      </div>

      <div className={`sticky top-0 z-10 border-b p-3 ${dark ? 'border-slate-700 bg-slate-900/95' : 'border-slate-200 bg-white/95'} backdrop-blur`}>
        <div className="mb-1 flex items-center justify-between text-[11px] font-black">
          <span className={dark ? 'text-slate-300' : 'text-slate-600'}>Пройдено</span>
          <span className="text-blue-500">{answeredCount} из {validation.project.questions.length}</span>
        </div>
        <div className={`h-2 overflow-hidden rounded-full ${dark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-4 p-4">
        {validation.project.questions.map((question, questionIndex) => (
          <section key={question.id} className={`rounded-2xl border p-4 ${dark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <div className="mb-3 flex items-start gap-3">
              <div className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-blue-50 text-sm font-black text-blue-600">
                {questionIndex + 1}
              </div>
              <div>
                <h3 className={`font-black leading-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{question.title}</h3>
                {question.description && <p className={`mt-1 text-xs leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{question.description}</p>}
              </div>
            </div>
            <div className="space-y-2">
              {question.options.map((option) => {
                const checked = state?.answers?.[question.id] === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setState((current) => answerQuizQuestion(quizDefinition, current, {
                      questionId: question.id,
                      optionId: option.id,
                    }))}
                    className={`w-full rounded-xl border-2 p-3 text-left text-xs font-bold transition ${
                      checked
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : dark
                          ? 'border-slate-700 bg-slate-950 text-slate-300 hover:border-blue-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        {selectedResult && (
          <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Ваш персональный результат</div>
            <h3 className="mt-2 text-2xl font-black leading-tight text-slate-900">{selectedResult.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{validation.project.resultLead}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{selectedResult.body}</p>
            <div className="mt-5 border-t border-emerald-200 pt-4">
              <p className="mb-3 text-sm text-slate-700">{validation.project.registrationText}</p>
              <button type="button" className="w-full rounded-xl bg-blue-600 px-4 py-4 text-sm font-black text-white shadow-lg">
                {validation.project.registrationButtonText}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default function LongQuizEditor({ onBack }) {
  const [dark, setDark] = useState(false)
  const [project, setProject] = useState(loadProject)
  const [selectedLibraryQuestion, setSelectedLibraryQuestion] = useState(ATMOSPACE_QUESTION_LIBRARY[0]?.id ?? '')
  const [notice, setNotice] = useState('')
  const validation = useMemo(() => validateLongQuizProject(project), [project])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  }, [project])

  const updateProject = (key, value) => {
    setProject((current) => ({ ...current, [key]: value }))
  }

  const updateQuestion = (questionIndex, patch) => {
    setProject((current) => ({
      ...current,
      questions: current.questions.map((question, index) => index === questionIndex
        ? { ...question, ...patch }
        : question),
    }))
  }

  const updateOption = (questionIndex, optionIndex, patch) => {
    setProject((current) => ({
      ...current,
      questions: current.questions.map((question, index) => index === questionIndex
        ? {
            ...question,
            options: question.options.map((option, currentOptionIndex) => currentOptionIndex === optionIndex
              ? { ...option, ...patch }
              : option),
          }
        : question),
    }))
  }

  const addLibraryQuestion = () => {
    if (project.questions.length >= LONG_QUIZ_MAX_QUESTIONS) {
      setNotice(`В одном квизе можно оставить не больше ${LONG_QUIZ_MAX_QUESTIONS} вопросов.`)
      return
    }
    const selected = cloneQuestionFromLibrary(selectedLibraryQuestion)
    if (!selected) return
    setProject((current) => ({
      ...current,
      questions: [...current.questions, makeUniqueQuestion(selected, current.questions.length)],
    }))
    setNotice('Вопрос добавлен. Его можно отредактировать ниже.')
  }

  const addBlankQuestion = () => {
    if (project.questions.length >= LONG_QUIZ_MAX_QUESTIONS) {
      setNotice(`В одном квизе можно оставить не больше ${LONG_QUIZ_MAX_QUESTIONS} вопросов.`)
      return
    }
    setProject((current) => ({
      ...current,
      questions: [...current.questions, createBlankQuizQuestion(current.questions.length + 1)],
    }))
    setNotice('Пустой вопрос добавлен.')
  }

  const removeQuestion = (questionIndex) => {
    if (project.questions.length <= LONG_QUIZ_MIN_QUESTIONS) {
      setNotice(`Оставьте минимум ${LONG_QUIZ_MIN_QUESTIONS} вопроса.`)
      return
    }
    setProject((current) => ({
      ...current,
      questions: current.questions.filter((_, index) => index !== questionIndex),
    }))
  }

  const moveQuestion = (questionIndex, direction) => {
    setProject((current) => {
      const targetIndex = questionIndex + direction
      if (targetIndex < 0 || targetIndex >= current.questions.length) return current
      const questions = [...current.questions]
      const [question] = questions.splice(questionIndex, 1)
      questions.splice(targetIndex, 0, question)
      return { ...current, questions }
    })
  }

  const addOption = (questionIndex) => {
    setProject((current) => ({
      ...current,
      questions: current.questions.map((question, index) => index === questionIndex
        ? {
            ...question,
            options: [
              ...question.options,
              {
                id: `${question.id}-option-${Date.now()}`,
                label: 'Новый вариант ответа',
                resultKey: current.results[0]?.key ?? 'clarity',
              },
            ],
          }
        : question),
    }))
  }

  const removeOption = (questionIndex, optionIndex) => {
    const question = project.questions[questionIndex]
    if (!question || question.options.length <= 2) {
      setNotice('В каждом вопросе должно остаться минимум два ответа.')
      return
    }
    setProject((current) => ({
      ...current,
      questions: current.questions.map((item, index) => index === questionIndex
        ? { ...item, options: item.options.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex) }
        : item),
    }))
  }

  const updateResult = (resultIndex, patch) => {
    setProject((current) => ({
      ...current,
      results: current.results.map((result, index) => index === resultIndex
        ? { ...result, ...patch }
        : result),
    }))
  }

  const resetPreset = () => {
    setProject(createAtmospaceMenRestartPreset())
    setNotice('Готовый сценарий восстановлен.')
  }

  const saveProject = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
    setNotice('Квиз сохранён в этом браузере.')
  }

  const downloadProject = () => {
    if (!validation.ok) {
      setNotice(validation.errors[0] ?? 'Сначала заполните квиз.')
      return
    }
    const html = buildLongQuizLandingHtml(validation.project)
    downloadHtml(`${validation.project.id || 'atmospace-quiz'}.html`, html)
    setNotice('HTML-файл квиза подготовлен.')
  }

  const bg = dark ? 'bg-slate-950' : 'bg-slate-50'
  const card = dark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
  const text = dark ? 'text-white' : 'text-slate-900'
  const muted = dark ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={`min-h-screen ${bg} p-3 transition-colors md:p-6`}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-5 text-white shadow-2xl md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4" /> Вернуться к конструктору
              </button>
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-yellow-300">
                <ListChecks className="h-4 w-4" /> Длинный квиз Атмосферы
              </div>
              <h1 className="text-3xl font-black leading-tight md:text-5xl">Вопросы идут подряд — без кнопок «Далее»</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 md:text-base">
                Выберите готовые человеческие формулировки или напишите свои. Посетитель отвечает прямо на длинной странице, видит персональный итог и переходит к регистрации.
              </p>
            </div>
            <button type="button" onClick={() => setDark((value) => !value)} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-black hover:bg-white/20">
              {dark ? 'Светлая тема' : 'Тёмная тема'}
            </button>
          </div>
        </header>

        {notice && (
          <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold ${dark ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
            {notice}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,.75fr)]">
          <div className="space-y-4">
            <section className={`${card} rounded-3xl border p-5 shadow-sm md:p-6`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className={`text-xl font-black ${text}`}>Основные тексты страницы</h2>
                  <p className={`mt-1 text-xs ${muted}`}>Готовый сценарий можно полностью переписать под другую аудиторию.</p>
                </div>
                <button type="button" onClick={resetPreset} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white hover:bg-slate-800">
                  <RotateCcw className="h-4 w-4" /> Вернуть готовый сценарий
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Название проекта" value={project.name || ''} onChange={(value) => updateProject('name', value)} placeholder="Персональный квиз" dark={dark} />
                <Input label="Короткая надпись над заголовком" value={project.eyebrow || ''} onChange={(value) => updateProject('eyebrow', value)} placeholder="Персональная точка старта" dark={dark} />
                <div className="md:col-span-2"><Input label="Главный заголовок" value={project.title || ''} onChange={(value) => updateProject('title', value)} placeholder="Что сейчас мешает двигаться вперёд?" dark={dark} /></div>
                <div className="md:col-span-2"><TextArea label="Подзаголовок" value={project.subtitle || ''} onChange={(value) => updateProject('subtitle', value)} placeholder="Коротко объясните, зачем отвечать на вопросы." rows={2} dark={dark} /></div>
                <div className="md:col-span-2"><TextArea label="Спокойное пояснение перед вопросами" value={project.intro || ''} onChange={(value) => updateProject('intro', value)} placeholder="Без диагнозов и громких обещаний." rows={3} dark={dark} /></div>
              </div>
            </section>

            <section className={`${card} rounded-3xl border p-5 shadow-sm md:p-6`}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className={`text-xl font-black ${text}`}>Вопросы: {project.questions.length}</h2>
                  <p className={`mt-1 text-xs ${muted}`}>Рекомендуем 5. Допустимо от {LONG_QUIZ_MIN_QUESTIONS} до {LONG_QUIZ_MAX_QUESTIONS}.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={selectedLibraryQuestion} onChange={(event) => setSelectedLibraryQuestion(event.target.value)} className={`rounded-xl border-2 px-3 py-2 text-xs font-bold outline-none ${dark ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-800'}`}>
                    {ATMOSPACE_QUESTION_LIBRARY.map((question) => <option key={question.id} value={question.id}>{question.title}</option>)}
                  </select>
                  <button type="button" onClick={addLibraryQuestion} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500">
                    <Plus className="h-4 w-4" /> Добавить готовый
                  </button>
                  <button type="button" onClick={addBlankQuestion} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${dark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
                    <Plus className="h-4 w-4" /> Свой вопрос
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {project.questions.map((question, questionIndex) => (
                  <article key={question.id} className={`rounded-2xl border-2 p-4 ${dark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-black text-white">{questionIndex + 1}</span>
                        <span className={`text-xs font-black ${text}`}>Вопрос {questionIndex + 1}</span>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => moveQuestion(questionIndex, -1)} disabled={questionIndex === 0} className="rounded-lg bg-white p-2 text-slate-700 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                        <button type="button" onClick={() => moveQuestion(questionIndex, 1)} disabled={questionIndex === project.questions.length - 1} className="rounded-lg bg-white p-2 text-slate-700 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                        <button type="button" onClick={() => removeQuestion(questionIndex)} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Input label="Текст вопроса" value={question.title || ''} onChange={(value) => updateQuestion(questionIndex, { title: value })} placeholder="Напишите вопрос простым языком" dark={dark} />
                      <TextArea label="Пояснение" value={question.description || ''} onChange={(value) => updateQuestion(questionIndex, { description: value })} placeholder="Необязательное короткое пояснение" rows={2} dark={dark} />

                      <div>
                        <div className={`mb-2 text-xs font-black ${text}`}>Варианты ответов</div>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={option.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_190px_40px]">
                              <input type="text" value={option.label || ''} onChange={(event) => updateOption(questionIndex, optionIndex, { label: event.target.value })} className={`rounded-xl border-2 px-3 py-2.5 text-xs font-medium outline-none ${dark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'}`} />
                              <select value={option.resultKey || project.results[0]?.key} onChange={(event) => updateOption(questionIndex, optionIndex, { resultKey: event.target.value })} className={`rounded-xl border-2 px-3 py-2.5 text-xs font-bold outline-none ${dark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'}`}>
                                {project.results.map((result) => <option key={result.key} value={result.key}>{result.title}</option>)}
                              </select>
                              <button type="button" onClick={() => removeOption(questionIndex, optionIndex)} className="grid place-items-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => addOption(questionIndex)} className={`mt-2 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${dark ? 'bg-slate-800 text-white' : 'bg-white text-blue-700 shadow-sm'}`}>
                          <Plus className="h-4 w-4" /> Добавить ответ
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={`${card} rounded-3xl border p-5 shadow-sm md:p-6`}>
              <h2 className={`text-xl font-black ${text}`}>Персональные результаты</h2>
              <p className={`mb-4 mt-1 text-xs ${muted}`}>Не ставьте диагнозы и не обвиняйте человека. Покажите, с чего ему разумнее начать.</p>
              <div className="space-y-3">
                {project.results.map((result, resultIndex) => (
                  <div key={result.key} className={`rounded-2xl border p-4 ${dark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                    <Input label={`Название результата ${resultIndex + 1}`} value={result.title || ''} onChange={(value) => updateResult(resultIndex, { title: value })} placeholder="Ваш первый фокус — ясность" dark={dark} />
                    <div className="mt-3"><TextArea label="Что увидит человек" value={result.body || ''} onChange={(value) => updateResult(resultIndex, { body: value })} placeholder="Объясните результат спокойно и по делу." rows={4} dark={dark} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${card} rounded-3xl border p-5 shadow-sm md:p-6`}>
              <h2 className={`text-xl font-black ${text}`}>Финальный переход</h2>
              <div className="mt-4 space-y-3">
                <TextArea label="Пояснение перед кнопкой" value={project.registrationText || ''} onChange={(value) => updateProject('registrationText', value)} placeholder="Объясните, что человек получит после создания аккаунта." rows={3} dark={dark} />
                <Input label="Текст кнопки" value={project.registrationButtonText || ''} onChange={(value) => updateProject('registrationButtonText', value)} placeholder="Получить первый персональный шаг" dark={dark} />
              </div>
            </section>

            <section className={`${card} rounded-3xl border p-5 shadow-sm md:p-6`}>
              <div className="grid gap-2 md:grid-cols-2">
                <button type="button" onClick={saveProject} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-4 text-sm font-black text-white hover:bg-slate-800">
                  <Save className="h-5 w-5" /> Сохранить проект
                </button>
                <button type="button" onClick={downloadProject} disabled={!validation.ok} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
                  <Download className="h-5 w-5" /> Скачать HTML квиза
                </button>
              </div>
              {!validation.ok && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
                  {validation.errors[0]}
                </div>
              )}
            </section>
          </div>

          <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-black text-blue-600">
              <Eye className="h-5 w-5" /> Живой предпросмотр
            </div>
            <QuizPreview project={project} validation={validation} dark={dark} />
          </aside>
        </div>
      </div>
    </div>
  )
}
