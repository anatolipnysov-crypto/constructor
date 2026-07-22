export const ATMOSPACE_RESULT_LIBRARY = [
  {
    key: 'clarity',
    title: 'Ваш первый фокус — ясность',
    body: 'Похоже, вы давно чувствуете необходимость перемен, но пока не видите конкретного направления. Вам сейчас нужен не новый список задач, а ясное понимание, что действительно важно и какой шаг даст ощущение движения.',
  },
  {
    key: 'rhythm',
    title: 'Ваш первый фокус — восстановление ритма',
    body: 'Сейчас почти все силы уходят на обязательные дела. Добавлять ещё больше нагрузки бессмысленно. Начать стоит с небольшого изменения, которое вернёт энергию и не разрушится через несколько дней.',
  },
  {
    key: 'action',
    title: 'Ваш первый фокус — переход к действию',
    body: 'Вы уже многое понимаете и, возможно, не раз составляли планы. Главная задача сейчас — перестать ждать идеального момента и выбрать действие, которое можно выполнить в ближайшие сутки.',
  },
  {
    key: 'system',
    title: 'Ваш первый фокус — устойчивая система',
    body: 'Вы умеете начинать, но изменения пока держатся на силе воли. Вам нужна система, которая переживает занятые дни, снижение мотивации и небольшие срывы.',
  },
  {
    key: 'support',
    title: 'Ваш первый фокус — внутренняя опора',
    body: 'Похоже, значительную часть нагрузки вы несёте один. Первый шаг — не заставить себя стать ещё сильнее, а понять, где нужна поддержка, честный разговор или более бережная рамка движения.',
  },
]

export const ATMOSPACE_QUESTION_LIBRARY = [
  {
    id: 'main-pressure',
    title: 'Что сейчас больше всего забирает у вас силы?',
    description: 'Выберите вариант, который точнее всего описывает вашу ситуацию.',
    options: [
      { id: 'stuck', label: 'Работаю много, но не чувствую движения вперёд.', resultKey: 'clarity' },
      { id: 'cannot-start', label: 'Понимаю, что пора менять жизнь, но не могу начать.', resultKey: 'action' },
      { id: 'only-obligations', label: 'Сил хватает только на обязательные дела.', resultKey: 'rhythm' },
      { id: 'lost-interest', label: 'Потерял интерес и не понимаю, чего хочу.', resultKey: 'clarity' },
      { id: 'far-from-family', label: 'Стал дальше от близких и чаще держу всё в себе.', resultKey: 'support' },
      { id: 'health', label: 'Запустил здоровье, сон или физическую форму.', resultKey: 'rhythm' },
      { id: 'work-money', label: 'Работа и деньги постоянно держат в напряжении.', resultKey: 'system' },
      { id: 'not-my-life', label: 'Внешне всё нормально, но внутри есть ощущение, что живу не свою жизнь.', resultKey: 'clarity' },
    ],
  },
  {
    id: 'weekly-pattern',
    title: 'Как это обычно проявляется в течение недели?',
    description: 'Здесь нет правильных ответов. Важно увидеть привычный сценарий.',
    options: [
      { id: 'delay', label: 'Откладываю важное до последнего.', resultKey: 'action' },
      { id: 'many-things', label: 'Хватаюсь за несколько дел и ничего не довожу.', resultKey: 'system' },
      { id: 'willpower', label: 'Держусь на силе воли, а потом полностью выдыхаюсь.', resultKey: 'rhythm' },
      { id: 'think-not-do', label: 'Много думаю и планирую, но мало делаю.', resultKey: 'action' },
      { id: 'irritation', label: 'Раздражаюсь и срываюсь на близких.', resultKey: 'support' },
      { id: 'escape', label: 'Ухожу в телефон, еду, сериалы или другие способы отвлечься.', resultKey: 'rhythm' },
      { id: 'bursts', label: 'Действую рывками: несколько продуктивных дней, а потом откат.', resultKey: 'system' },
      { id: 'duties-only', label: 'Просто выполняю обязанности и ничего не меняю.', resultKey: 'clarity' },
    ],
  },
  {
    id: 'past-attempts',
    title: 'Что вы уже пробовали?',
    description: 'Выберите попытку, которая лучше всего показывает ваш прошлый опыт.',
    options: [
      { id: 'plans', label: 'Ставил цели и составлял планы.', resultKey: 'system' },
      { id: 'sport', label: 'Начинал заниматься спортом или менять режим.', resultKey: 'rhythm' },
      { id: 'content', label: 'Читал книги, смотрел видео, проходил курсы.', resultKey: 'action' },
      { id: 'specialist', label: 'Работал с психологом, наставником или коучем.', resultKey: 'support' },
      { id: 'career', label: 'Пытался поменять работу или запустить свой проект.', resultKey: 'clarity' },
      { id: 'talked', label: 'Обсуждал проблему с близкими.', resultKey: 'support' },
      { id: 'control', label: 'Пытался просто сильнее себя контролировать.', resultKey: 'system' },
      { id: 'nothing-systematic', label: 'Пока ничего системного не пробовал.', resultKey: 'action' },
      { id: 'many-short-results', label: 'Пробовал многое, но результат держался недолго.', resultKey: 'system' },
    ],
  },
  {
    id: 'main-obstacle',
    title: 'Что чаще всего мешает продолжать?',
    description: 'Выберите главную причину, а не ту, которая звучит правильнее.',
    options: [
      { id: 'first-step', label: 'Не понимаю, с какого конкретного действия начать.', resultKey: 'clarity' },
      { id: 'too-big', label: 'Ставлю слишком большую задачу.', resultKey: 'system' },
      { id: 'no-energy', label: 'Не хватает времени и энергии.', resultKey: 'rhythm' },
      { id: 'lose-interest', label: 'Быстро теряю интерес.', resultKey: 'system' },
      { id: 'one-slip', label: 'После одного срыва бросаю всё.', resultKey: 'system' },
      { id: 'no-person', label: 'Нет человека, который поможет не свернуть.', resultKey: 'support' },
      { id: 'responsibilities', label: 'Работа и семейные обязанности постоянно вытесняют мои планы.', resultKey: 'rhythm' },
      { id: 'perfect-plan', label: 'Хочу сначала всё идеально продумать.', resultKey: 'action' },
      { id: 'do-not-believe', label: 'Не верю, что очередная попытка будет отличаться от предыдущих.', resultKey: 'support' },
    ],
  },
  {
    id: 'month-result',
    title: 'Какой результат через месяц был бы для вас действительно важен?',
    description: 'Выберите один результат, который сейчас важнее остальных.',
    options: [
      { id: 'direction', label: 'Понять, куда я двигаюсь и чего хочу.', resultKey: 'clarity' },
      { id: 'time-control', label: 'Вернуть контроль над временем и делами.', resultKey: 'system' },
      { id: 'regular-action', label: 'Начать регулярно двигаться к важной цели.', resultKey: 'action' },
      { id: 'calm-energy', label: 'Стать спокойнее и вернуть энергию.', resultKey: 'rhythm' },
      { id: 'health-result', label: 'Наладить сон, режим или физическую форму.', resultKey: 'rhythm' },
      { id: 'relationships', label: 'Улучшить отношения с близкими.', resultKey: 'support' },
      { id: 'work-progress', label: 'Сдвинуться в работе, доходе или собственном проекте.', resultKey: 'action' },
      { id: 'confidence', label: 'Снова почувствовать уверенность в себе.', resultKey: 'support' },
      { id: 'real-result', label: 'Увидеть первый реальный результат, а не очередной план.', resultKey: 'system' },
    ],
  },
  {
    id: 'support-format',
    title: 'Какая помощь сейчас была бы для вас полезнее?',
    description: 'Это поможет подобрать более подходящий способ движения.',
    options: [
      { id: 'clear-plan', label: 'Понятный план без лишней теории.', resultKey: 'clarity' },
      { id: 'small-step', label: 'Один небольшой шаг на каждый день.', resultKey: 'action' },
      { id: 'reminders', label: 'Регулярные напоминания и контроль ритма.', resultKey: 'system' },
      { id: 'energy-first', label: 'Сначала восстановить силы и режим.', resultKey: 'rhythm' },
      { id: 'honest-support', label: 'Честный разговор и поддержка без осуждения.', resultKey: 'support' },
    ],
  },
  {
    id: 'readiness',
    title: 'На какой шаг вы готовы в ближайшие сутки?',
    description: 'Не идеальный шаг — тот, который реально можно выполнить.',
    options: [
      { id: 'write-goal', label: 'Сформулировать одну главную цель.', resultKey: 'clarity' },
      { id: 'calendar-step', label: 'Поставить конкретное действие в календарь.', resultKey: 'action' },
      { id: 'remove-extra', label: 'Убрать одну лишнюю нагрузку.', resultKey: 'rhythm' },
      { id: 'repeat-action', label: 'Выбрать действие, которое повторю несколько дней.', resultKey: 'system' },
      { id: 'talk', label: 'Поговорить с человеком, которому доверяю.', resultKey: 'support' },
    ],
  },
]

export const ATMOSPACE_MEN_RESTART_PRESET = {
  id: 'men-30-60-restart',
  name: 'Мужчины 30–60: точка перезапуска',
  eyebrow: 'Персональная точка старта',
  title: 'Что сейчас мешает вам двигаться вперёд?',
  subtitle: 'Ответьте на несколько коротких вопросов. В конце вы увидите, на чём лучше сосредоточиться в первую очередь.',
  intro: 'Это не тест личности и не диагноз. Квиз помогает спокойно посмотреть на текущую ситуацию и выбрать понятный следующий шаг.',
  resultLead: 'На основе ваших ответов мы определили направление, с которого разумнее начать.',
  registrationText: 'Создайте аккаунт — и Атмосфера поможет определить первое конкретное действие с учётом вашей ситуации.',
  registrationButtonText: 'Получить первый персональный шаг',
  questions: ATMOSPACE_QUESTION_LIBRARY.slice(0, 5),
  results: ATMOSPACE_RESULT_LIBRARY,
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function createAtmospaceMenRestartPreset() {
  return clone(ATMOSPACE_MEN_RESTART_PRESET)
}

export function createBlankQuizQuestion(index = 1) {
  return {
    id: `question-${Date.now()}-${index}`,
    title: `Новый вопрос ${index}`,
    description: 'Добавьте короткое пояснение, если оно помогает человеку ответить.',
    options: [
      { id: `option-${Date.now()}-${index}-1`, label: 'Первый вариант ответа', resultKey: 'clarity' },
      { id: `option-${Date.now()}-${index}-2`, label: 'Второй вариант ответа', resultKey: 'action' },
    ],
  }
}

export function cloneQuestionFromLibrary(questionId) {
  const question = ATMOSPACE_QUESTION_LIBRARY.find((item) => item.id === questionId)
  return question ? clone(question) : null
}
