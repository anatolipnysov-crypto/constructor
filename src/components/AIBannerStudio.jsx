import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CarFront,
  Check,
  Download,
  House,
  Image as ImageIcon,
  Mountain,
  RefreshCw,
  Shuffle,
  Sparkles,
  TentTree,
  Waves
} from 'lucide-react';
import { buildCampaignLandingLogic, pickCampaignVisualDirection, resolveCampaignSemanticProfile } from '../data/campaignSemantics';

const SIZES = {
  square: { w: 1080, h: 1080, label: '1:1 основной баннер' },
  vertical: { w: 900, h: 1200, label: '3:4' },
  wide: { w: 1200, h: 675, label: '16:9 широкий' }
};

const AI_GENERATION_TIMEOUT_MS = 190000;
const AI_GENERATION_PROGRESS_SEC = 180;

const PALETTES = {
  yellow: { bg1: '#f7d34c', bg2: '#fff4c7', ink: '#111827', cta: '#111827' },
  green: { bg1: '#d9f2df', bg2: '#fffaf0', ink: '#102019', cta: '#0f766e' },
  blue: { bg1: '#dbeafe', bg2: '#ffffff', ink: '#0f172a', cta: '#1d4ed8' },
  dark: { bg1: '#111827', bg2: '#273447', ink: '#ffffff', cta: '#f5b800' }
};

const STYLE_PRESETS = {
  editorialGold: {
    label: 'Белый + золото',
    accent: '#b18a3d',
    second: '#061325',
    panel: '#fffaf0',
    ink: '#061325',
    photoSide: 'right',
    light: true,
    shape: 'curve',
    font: 'condensed'
  },
  greenSystem: {
    label: 'Белый + зелёный',
    accent: '#2f7d28',
    second: '#092414',
    panel: '#fbfff8',
    ink: '#0b1d16',
    photoSide: 'left',
    light: true,
    shape: 'curve',
    font: 'condensed'
  },
  darkYellow: {
    label: 'Чёрный + жёлтый',
    accent: '#ffc21f',
    second: '#ffffff',
    panel: '#05070b',
    ink: '#ffffff',
    photoSide: 'right',
    light: false,
    shape: 'diagonal',
    font: 'impact'
  },
  darkOrange: {
    label: 'Чёрный + оранжевый',
    accent: '#ff7a10',
    second: '#ffffff',
    panel: '#050b16',
    ink: '#ffffff',
    photoSide: 'left',
    light: false,
    shape: 'diagonal',
    font: 'impact'
  },
  blackRed: {
    label: 'Чёрный + красный',
    accent: '#f0141e',
    second: '#ffffff',
    panel: '#070707',
    ink: '#ffffff',
    photoSide: 'right',
    light: false,
    shape: 'brush',
    font: 'impact'
  },
  purple: {
    label: 'Чёрный + фиолетовый',
    accent: '#8b5cf6',
    second: '#ffffff',
    panel: '#05050a',
    ink: '#ffffff',
    photoSide: 'right',
    light: false,
    shape: 'diagonal',
    font: 'impact'
  },
  blueTrust: {
    label: 'Синий доверительный',
    accent: '#2f6df6',
    second: '#ffffff',
    panel: '#061325',
    ink: '#ffffff',
    photoSide: 'right',
    light: false,
    shape: 'curve',
    font: 'condensed'
  },
  whiteGoldPremium: {
    label: 'Белый премиум + золото',
    accent: '#b18a3d',
    second: '#061325',
    panel: '#fffdf6',
    ink: '#061325',
    photoSide: 'left',
    light: true,
    shape: 'curve',
    font: 'serif'
  },
  greenDark: {
    label: 'Тёмный + зелёный',
    accent: '#22c55e',
    second: '#ffffff',
    panel: '#06130c',
    ink: '#ffffff',
    photoSide: 'right',
    light: false,
    shape: 'diagonal',
    font: 'condensed'
  },
  redWhite: {
    label: 'Белый + красный удар',
    accent: '#ef111a',
    second: '#061325',
    panel: '#fffafa',
    ink: '#061325',
    photoSide: 'right',
    light: true,
    shape: 'brush',
    font: 'impact'
  },
  moneyProof: {
    label: 'Деньги / чек / результат',
    accent: '#22c55e',
    second: '#ffffff',
    panel: '#07110b',
    ink: '#ffffff',
    photoSide: 'left',
    light: false,
    shape: 'brush',
    font: 'impact'
  },
  splitBeforeAfter: {
    label: 'До / после',
    accent: '#ffc21f',
    second: '#ffffff',
    panel: '#05070b',
    ink: '#ffffff',
    photoSide: 'left',
    light: false,
    shape: 'diagonal',
    font: 'impact'
  },
  cleanSystem: {
    label: 'Чистая система',
    accent: '#2563eb',
    second: '#0f172a',
    panel: '#f8fafc',
    ink: '#0f172a',
    photoSide: 'right',
    light: true,
    shape: 'curve',
    font: 'system'
  },
  outdoorFreedom: {
    label: 'Свобода / природа',
    accent: '#2f7d28',
    second: '#061325',
    panel: '#fffaf0',
    ink: '#061325',
    photoSide: 'left',
    light: true,
    shape: 'curve',
    font: 'serif'
  },
  documentaryNoir: {
    label: 'Документально / честно',
    accent: '#ffffff',
    second: '#f5b800',
    panel: '#111111',
    ink: '#ffffff',
    photoSide: 'right',
    light: false,
    shape: 'diagonal',
    font: 'documentary'
  },
  newspaperShock: {
    label: 'Газетный шок',
    accent: '#111827',
    second: '#facc15',
    panel: '#fff7d6',
    ink: '#111827',
    photoSide: 'right',
    light: true,
    shape: 'brush',
    font: 'impact'
  },
  fintechRed: {
    label: 'Финтех / красный',
    accent: '#ef111a',
    second: '#ffffff',
    panel: '#050505',
    ink: '#ffffff',
    photoSide: 'left',
    light: false,
    shape: 'brush',
    font: 'impact'
  },
  glassPremium: {
    label: 'Стеклянный премиум',
    accent: '#38bdf8',
    second: '#f8fafc',
    panel: '#08111f',
    ink: '#ffffff',
    photoSide: 'right',
    light: false,
    shape: 'curve',
    font: 'system'
  },
  cosmicMetaphor: {
    label: 'Космическая метафора',
    accent: '#a855f7',
    second: '#facc15',
    panel: '#050510',
    ink: '#ffffff',
    photoSide: 'right',
    light: false,
    shape: 'diagonal',
    font: 'impact'
  },
  animalMetaphor: {
    label: 'Живая метафора',
    accent: '#22c55e',
    second: '#facc15',
    panel: '#07110b',
    ink: '#ffffff',
    photoSide: 'left',
    light: false,
    shape: 'curve',
    font: 'condensed'
  }
};

const VISUAL_STYLE_OPTIONS = [
  { value: 'auto', label: 'Авто: сам подберёт' },
  { value: 'darkYellow', label: 'Чёрно-жёлтый удар' },
  { value: 'blackRed', label: 'Чёрно-красный напор' },
  { value: 'greenSystem', label: 'Белый + зелёный' },
  { value: 'blueTrust', label: 'Синий доверительный' },
  { value: 'whiteGoldPremium', label: 'Бело-золотой премиум' },
  { value: 'purple', label: 'Фиолетовый разрыв' },
  { value: 'darkOrange', label: 'Чёрно-оранжевый' },
  { value: 'redWhite', label: 'Белый + красный' },
  { value: 'cleanSystem', label: 'Чистая система' },
  { value: 'outdoorFreedom', label: 'Свобода / природа' },
  { value: 'documentaryNoir', label: 'Документальный noir' },
  { value: 'newspaperShock', label: 'Газетный шок' },
  { value: 'fintechRed', label: 'Финтех / красный' },
  { value: 'glassPremium', label: 'Стеклянный премиум' },
  { value: 'cosmicMetaphor', label: 'Космическая метафора' },
  { value: 'animalMetaphor', label: 'Живая метафора' }
];

const VISUAL_WORLD_OPTIONS = [
  {
    value: 'auto',
    label: 'AI по смыслу',
    description: 'Читает заголовок и текст, затем выбирает действие, метафору и сцену',
    icon: Shuffle
  },
  {
    value: 'cityMomentum',
    label: 'Город и движение',
    description: 'Архитектура, улица и живой ритм',
    icon: Building2
  },
  {
    value: 'premiumDrive',
    label: 'Премиум и авто',
    description: 'Костюм, автомобиль и статус без показухи',
    icon: CarFront
  },
  {
    value: 'seaEscape',
    label: 'Море и курорт',
    description: 'Берег, марина, свет и свобода',
    icon: Waves
  },
  {
    value: 'offroadAdventure',
    label: 'Джип и кемпинг',
    description: 'Внедорожник, палатка и активная жизнь',
    icon: TentTree
  },
  {
    value: 'cozyHome',
    label: 'Дом и спокойствие',
    description: 'Светлый интерьер и настоящая жизнь',
    icon: House
  },
  {
    value: 'nature',
    label: 'Горы и свобода',
    description: 'Горизонт, тропа и природная сила',
    icon: Mountain
  }
];

const COLOR_TEST_OPTIONS = [
  { value: 'auto', label: 'Авто-микс', colors: ['#2563eb', '#ef4444', '#16a34a'] },
  { value: 'blueTrust', label: 'Синий', colors: ['#0f172a', '#2563eb', '#ffffff'] },
  { value: 'redWhite', label: 'Красный', colors: ['#ef111a', '#ffffff', '#111827'] },
  { value: 'greenSystem', label: 'Зелёный', colors: ['#15803d', '#84cc16', '#ffffff'] },
  { value: 'whiteGoldPremium', label: 'Золото', colors: ['#111827', '#b18a3d', '#fffaf0'] }
];

const VISUAL_WORLD_STYLE_HINTS = {
  cityMomentum: ['redWhite', 'blueTrust', 'blackRed', 'cleanSystem'],
  premiumDrive: ['whiteGoldPremium', 'blackRed', 'glassPremium', 'redWhite'],
  seaEscape: ['redWhite', 'blueTrust', 'whiteGoldPremium', 'cleanSystem'],
  offroadAdventure: ['greenSystem', 'outdoorFreedom', 'darkOrange', 'blackRed'],
  cozyHome: ['greenSystem', 'whiteGoldPremium', 'redWhite', 'cleanSystem'],
  nature: ['greenSystem', 'outdoorFreedom', 'darkYellow', 'blueTrust']
};

const SCENE_THEME_OPTIONS = [
  { value: 'auto', label: 'Авто по заголовку' },
  { value: 'cityMomentum', label: 'Город и движение' },
  { value: 'premiumDrive', label: 'Премиум и авто' },
  { value: 'seaEscape', label: 'Море и курорт' },
  { value: 'offroadAdventure', label: 'Джип и кемпинг' },
  { value: 'office', label: 'Работа / кабинет / ноутбук' },
  { value: 'cozyHome', label: 'Уют / дом / спокойствие' },
  { value: 'cityLifestyle', label: 'Город / кафе / lifestyle' },
  { value: 'nature', label: 'Горы / природа / свобода' },
  { value: 'travel', label: 'Путь / дорога / движение' },
  { value: 'pets', label: 'Питомцы / тёплая сцена' },
  { value: 'hobby', label: 'Хобби / дело для себя' },
  { value: 'craft', label: 'Мастерская / ручная работа' }
];

const ANGLE_PRESETS = {
  custom: {
    label: 'По вашему заголовку',
    short: 'Своя идея',
    headline: 'Введите заголовок баннера',
    decoration: 'Введите текст баннера',
    adTitle: 'Ваш заголовок',
    adText: 'Ваш текст',
    visualPrompt: 'Строй сцену строго по смыслу введённых заголовка и текста. Не добавляй отдельные маркетинговые темы.'
  },
  courses: {
    label: 'Курсы сожрали деньги',
    short: 'Анти-курсы',
    headline: 'Хватит покупать курсы. Денег от них нет.',
    decoration: 'Смотри, где реально ломается заработок',
    adTitle: 'Хватит покупать курсы без денег',
    adText: 'Разбор другого подхода для тех, кто устал учиться без результата.',
    visualPrompt: 'Современный живой человек 32-48 в светлом городе, кафе или рабочем пространстве, без образа пожилой женщины у окна, без тёмной мастерской и без стопки конспектов как главного сюжета. Реалистичная рекламная фотография, энергия решения, цельная сцена без деления кадра на две половины.'
  },
  eternalStudent: {
    label: 'Вечный ученик',
    short: 'Вечный ученик',
    headline: 'Всё знаешь, но всё равно не зарабатываешь?',
    decoration: 'Пора менять не курс, а сам подход',
    adTitle: 'Всё знаешь, а дохода нет?',
    adText: 'Посмотрите метод без вечной учёбы и бесконечных конспектов.',
    visualPrompt: 'Человек 32-48 в живой среде: город, кафе, светлая студия или путь, рядом может быть блокнот как малая деталь, но не учебная парта. Ощущение: старый сценарий надоел, появился понятный выход. Цельный широкий кадр с одной непрерывной средой.'
  },
  noProduct: {
    label: 'Деньги без продукта',
    short: 'Без продукта',
    headline: 'Не нужен свой продукт, блог или команда.',
    decoration: 'Есть готовая система, в которую можно войти',
    adTitle: 'Без продукта, блога и команды',
    adText: 'Смотрите, как устроен другой путь к онлайн-доходу.',
    visualPrompt: 'Уверенный взрослый человек 30-48 в светлом интерьере, кафе или городской среде, спокойная энергия, без роскоши, ощущение простоты и готового решения, чистая цельная композиция без пустой половины кадра.'
  },
  noSocial: {
    label: 'Без соцсетей и контента',
    short: 'Без сторис',
    headline: 'Не умеешь вести соцсети? И не надо.',
    decoration: 'Способ не держится на сторис и эфирах',
    adTitle: 'Доход без сторис и эфиров',
    adText: 'Разбор метода без роли блогера и ежедневного контента.',
    visualPrompt: 'Взрослый человек 30-48 убирает телефон в сторону, светлая современная среда, выражение облегчения, живой lifestyle-кадр без мрачного стола и без старого офисного шаблона.'
  },
  firstMoney: {
    label: 'Первые деньги',
    short: 'Первые деньги',
    headline: 'Хочешь деньги, а не тетрадку с конспектами?',
    decoration: 'Начни с практики, а не с очередной лекции',
    adTitle: 'Хочешь деньги, а не конспекты?',
    adText: 'Практический разбор для тех, кто устал слушать без результата.',
    visualPrompt: 'Смартфон как малая деталь, человек 30-48 в светлой городской или домашней сцене, фокус на ощущении первого понятного шага, без банковских брендов, без тёмного кабинета, реалистичное фото.'
  },
  jobTrap: {
    label: 'Устал от найма',
    short: 'Найм достал',
    headline: 'Работа забирает жизнь, а денег всё равно мало?',
    decoration: 'Посмотри, как выйти из старого сценария',
    adTitle: 'Работа забирает жизнь?',
    adText: 'Для тех, кто устал жить от зарплаты до зарплаты.',
    visualPrompt: 'Современный человек 32-50 после рабочего дня в светлой городской, домашней или прогулочной сцене, взгляд внимательный и живой, есть ощущение решения, не мрачный вечер у ноутбука.'
  },
  whyItWorked: {
    label: 'Почему у него получилось',
    short: 'Почему получилось',
    headline: 'Постоянно учились, а жизнь так и не менялась?',
    decoration: 'Пора менять не усилия, а сам подход',
    adTitle: 'Учились, а жизнь не менялась?',
    adText: 'Смотрите, что меняется, когда меняется сама схема.',
    visualPrompt: 'Мужчина или женщина 32-50 в момент осознания: город, кафе, светлая студия или открытое пространство, контрастный рекламный кадр, цельная сцена с глубиной и единым светом, без грустного окна и тёмной мастерской.'
  },
  doneForYou: {
    label: 'Под ключ / не самому',
    short: 'Не самому',
    headline: 'Не обязательно разбираться во всём самому.',
    decoration: 'Есть система и сопровождение на каждом этапе',
    adTitle: 'Не делайте всё в одиночку',
    adText: 'Посмотрите подход, где не нужно тащить всё самому.',
    visualPrompt: 'Взрослый человек 32-50 с живой эмоцией облегчения, светлая среда, ощущение поддержки и понятного пути, реалистичное фото без стоковой пенсионной постановки.'
  },
  courseDrain: {
    label: 'Слил деньги на обучение',
    short: 'Слил деньги',
    headline: 'Сколько ещё платить за курсы без результата?',
    decoration: 'Пора увидеть, где деньги реально появляются',
    adTitle: 'Хватит платить за курсы впустую',
    adText: 'Если учеба не дала денег, посмотрите другой подход.',
    visualPrompt: 'Мужчина или женщина 32-50 в светлой жизненной сцене понимает, что старый подход не сработал: город, кафе, дом или путь, эмоция узнавания без уныния, реалистичное фото, цельный живой кадр без отдельной текстовой половины.'
  },
  someoneGets: {
    label: 'Пока одни учатся',
    short: 'Кто-то получает',
    headline: 'Пока одни проходят курсы, другие уже получают деньги.',
    decoration: 'Разница не в мотивации, а в схеме',
    adTitle: 'Пока вы учитесь, кто-то получает',
    adText: 'Разберите схему, где не нужно годами готовиться.',
    visualPrompt: 'Спокойный взрослый человек 30-50 с телефоном как деталью, светлая реальная сцена, без роскоши, ощущение результата и пути, единый кадр с живой средой и воздухом.'
  },
  notExpert: {
    label: 'Не надо быть экспертом',
    short: 'Не эксперт',
    headline: 'Чтобы начать зарабатывать, не нужно становиться экспертом.',
    decoration: 'Достаточно понять простой путь',
    adTitle: 'Не нужно становиться экспертом',
    adText: 'Подход для обычных людей без роли блогера и наставника.',
    visualPrompt: 'Женщина или мужчина 30-50 в городе с телефоном или кофе как деталью, спокойная уверенность, нет пафоса, современная рекламная фотография, цельная lifestyle-сцена без пустой панели.'
  },
  after40: {
    label: 'После 40',
    short: 'После 40',
    headline: 'После 40 можно начать иначе, без вечной учёбы.',
    decoration: 'Не поздно. Просто нужен другой подход',
    adTitle: 'После 40 можно начать иначе',
    adText: 'Без блога, сложных схем и очередного марафона.',
    visualPrompt: 'Живая женщина или мужчина 32-50 в мягком дневном свете: дом, кафе, город или природа, лицо с надеждой и спокойствием, реалистичный кадр, цельная светлая сцена без деления изображения.'
  },
  financialPit: {
    label: 'Финансовая яма',
    short: 'Долги / яма',
    headline: 'Долги и кредиты давят? Нужен не курс, а выход.',
    decoration: 'Посмотрите метод, который меняет саму схему',
    adTitle: 'Долги и кредиты давят?',
    adText: 'Короткий разбор выхода без очередной бесполезной учебы.',
    visualPrompt: 'Руки и предметы взрослого человека 30-50 как часть светлой сцены решения: блокнот, телефон, чашка, окно, город или рабочее место, напряжение без истерики, живой свет, единый кадр без шаблонной текстовой зоны.'
  },
  noMarketing: {
    label: 'Без маркетинга и соцсетей',
    short: 'Без маркетинга',
    headline: 'Не хотите воронки, сторис и маркетинг? И не надо.',
    decoration: 'Смотрите, как можно зайти проще',
    adTitle: 'Без сторис, воронок и маркетинга',
    adText: 'Для тех, кто хочет результат без роли блогера.',
    visualPrompt: 'Взрослый человек 30-50 закрывает лишний шум на телефоне или ноутбуке, рядом светлая среда, облегчение и чистый первый шаг, реалистичная рекламная фотография.'
  },
  operatorMode: {
    label: 'Оператор системы',
    short: 'Оператор',
    headline: 'Не тащить всё на себе. Управлять готовой системой.',
    decoration: 'Ваша задача — запустить и контролировать',
    adTitle: 'Не тащите всё на себе',
    adText: 'Показываем подход, где не нужно всё собирать самому.',
    visualPrompt: 'Мужчина или женщина 30-50 спокойно управляет процессом за кадром: светлая рабочая или городская сцена, уверенность без пафоса, современный реализм, без тёмного кабинета.'
  },
  sideJobOperator: {
    label: 'Подработка за кадром',
    short: 'Подработка',
    headline: 'Предлагаю подработку к твоей основной работе!',
    decoration: 'Управляйте процессом «за кадром». Смотрите простую инструкцию',
    adTitle: 'Подработка к основной работе',
    adText: 'Управляйте процессом «за кадром». Смотрите простую инструкцию.',
    visualPrompt: 'Взрослый человек 35-55 управляет процессом за кадром: ноутбук, мессенджер, схема заявок, спокойное рабочее место или городское кафе, без публичности, без блогинга, без сцены инфобизнеса, ощущение простой дополнительной занятости рядом с основной работой.',
    stylePreset: 'blueTrust',
    persona: 'mixed',
    minimal: true
  },
  firstStep: {
    label: 'Первый шаг сегодня',
    short: 'Первый шаг',
    headline: 'Хватит готовиться. Первый шаг можно сделать сегодня.',
    decoration: 'Понятный план важнее ещё одного курса',
    adTitle: 'Хватит готовиться годами',
    adText: 'Посмотрите практический путь вместо очередной подготовки.',
    visualPrompt: 'Взрослый человек 30-50 выходит из дома, идёт по городу или начинает день в светлой сцене, ощущение старта и решения, реалистичный кадр, цельная сцена движения и нового пути.'
  },
  quietMoney: {
    label: 'Тихий доход',
    short: 'Тихий доход',
    headline: 'Тихий доход без сторис, эфиров и показухи.',
    decoration: 'Жить для себя, а не для лайков',
    adTitle: 'Тихий доход без сторис',
    adText: 'Смотрите систему для обычных людей без публичности.',
    visualPrompt: 'Человек 30-50 в светлой домашней, городской или природной сцене, спокойная жизнь без роскоши, тёплый реалистичный кадр под текст, без грустного окна как главного сюжета.'
  },
  wrongPath: {
    label: 'Шёл сложным путём',
    short: 'Сложный путь',
    headline: 'Постоянно учишься, а жизнь не меняется?',
    decoration: 'Пришло время менять не курс, а подход',
    adTitle: 'Учитесь, а жизнь не меняется?',
    adText: 'Коротко покажем, почему старая тактика не давала денег.',
    visualPrompt: 'Взрослый человек 30-50 в живом пространстве смотрит в сторону, ощущение инсайта и развилки, контрастный реалистичный кадр без мрачной учебной постановки.'
  },
  approvedBusinessResult: {
    label: 'Пока одни строят бизнес',
    short: 'Строят бизнес',
    headline: 'Пока одни строят «бизнес» — другие просто получают результат.',
    decoration: '',
    adTitle: 'Другие уже получают результат',
    adText: 'Посмотрите подход без лишней подготовки и сложных схем.',
    visualPrompt: 'Мужчина и женщина 40-55 спокойные и довольные на фоне природы или города, не люкс, реальная приятная жизнь, сильный контрастный рекламный баннер, цельная широкая сцена без визуального шва.',
    stylePreset: 'blackRed',
    persona: 'mixed',
    minimal: true
  },
  approvedOnlineSimple: {
    label: 'Онлайн-доход проще',
    short: 'Проще',
    headline: 'Большинство слишком усложняет онлайн-заработок.',
    decoration: '',
    adTitle: 'Онлайн-доход проще, чем кажется',
    adText: 'Без сложных схем и бесконечного обучения. Смотрите разбор.',
    visualPrompt: 'Взрослый мужчина 40-55 с ноутбуком на террасе или у окна, спокойная улыбка, чистый светлый рекламный стиль, единая сцена без пустой текстовой панели.',
    stylePreset: 'blueTrust',
    persona: 'man',
    minimal: true
  },
  approvedOvercomplicate: {
    label: 'Слишком усложняют',
    short: 'Усложняют',
    headline: 'Большинство слишком усложняет онлайн-заработок.',
    decoration: '',
    adTitle: 'Онлайн-заработок усложняют',
    adText: 'На самом деле путь может быть понятнее. Посмотрите как.',
    visualPrompt: 'Женщина 40-55 в машине или на прогулке, ощущение свободы и облегчения, бело-золотой рекламный баннер, единый живой кадр с дорогим lifestyle-ощущением.',
    stylePreset: 'whiteGoldPremium',
    persona: 'woman',
    minimal: true
  },
  approvedNotExpert: {
    label: 'Не нужно быть экспертом',
    short: 'Не эксперт',
    headline: 'Чтобы начать зарабатывать — не нужно становиться экспертом.',
    decoration: '',
    adTitle: 'Не нужно становиться экспертом',
    adText: 'Показываем простой старт без роли гуру и долгой подготовки.',
    visualPrompt: 'Мужчина 40-55 с телефоном и кофе в городе, спокойная уверенность, бело-золотая композиция, цельная городская сцена с воздухом и глубиной.',
    stylePreset: 'whiteGoldPremium',
    persona: 'man',
    minimal: true
  },
  approvedNotAlone: {
    label: 'Не всё самому',
    short: 'Не самому',
    headline: 'Не обязательно разбираться во всём самому.',
    decoration: '',
    adTitle: 'Не обязательно всё самому',
    adText: 'Есть понятная система и поддержка на каждом этапе.',
    visualPrompt: 'Женщина 40-55 с ноутбуком и чашкой, зелёный чистый рекламный стиль, спокойная радость, цельная живая сцена без разрезания кадра.',
    stylePreset: 'greenSystem',
    persona: 'woman',
    minimal: true
  },
  approvedNoProduct: {
    label: 'Не нужен продукт',
    short: 'Без продукта',
    headline: 'Вам не нужен свой продукт, блог или команда.',
    decoration: '',
    adTitle: 'Без продукта, блога и команды',
    adText: 'Смотрите, как можно зайти в готовую систему проще.',
    visualPrompt: 'Взрослая женщина 40-55 с ноутбуком на террасе, живое лицо, бело-золотой рекламный стиль, цельная теплая сцена с естественной глубиной.',
    stylePreset: 'whiteGoldPremium',
    persona: 'woman',
    minimal: true
  },
  approvedYearsWasted: {
    label: 'Годами учатся лишнему',
    short: 'Годы зря',
    headline: 'Люди годами учатся тому, что можно было не делать.',
    decoration: '',
    adTitle: 'Годами учатся лишнему',
    adText: 'Не тратьте годы на сложное. Посмотрите другой путь.',
    visualPrompt: 'Женщина 40-55 с кофе на фоне дороги или природы, мысль о потерянном времени и новом пути, бело-золотой рекламный стиль.',
    stylePreset: 'whiteGoldPremium',
    persona: 'woman',
    minimal: true
  },
  approvedNoYearsTraining: {
    label: 'Курсы забирают годы',
    short: 'Годы',
    headline: 'Курсы забирают годы, а деньги всё равно не приходят.',
    decoration: '',
    adTitle: 'Курсы забирают годы?',
    adText: 'Посмотрите другой вход без вечной роли ученика.',
    visualPrompt: 'Мужчина или женщина 30-50 в светлой жизненной сцене, старые курсы/конспекты только как малая деталь, энергия выхода из учебного круга, яркий современный рекламный стиль, цельный кадр без текстовой половины.',
    stylePreset: 'darkOrange',
    persona: 'mixed',
    minimal: true
  },
  approvedHardPath: {
    label: 'Учёба без сдвига',
    short: 'Учишься',
    headline: 'Постоянно учитесь, а жизнь не меняется?',
    decoration: '',
    adTitle: 'Учитесь, а жизнь не меняется?',
    adText: 'Пора менять не курс, а саму схему действий.',
    visualPrompt: 'Мужчина или женщина 30-50 в живой сцене решения: город, кафе, дом или путь, без стопки обучений как центра, честный рекламный стиль, цельная сцена с глубиной, фактурой и одним миром.',
    stylePreset: 'darkYellow',
    persona: 'mixed',
    minimal: true
  },
  approvedBeforeReady: {
    label: 'Пока готовитесь',
    short: 'Делают',
    headline: 'Пока вы проходите курсы — кто-то уже получает комиссионные.',
    decoration: '',
    adTitle: 'Пока вы только изучаете, другие уже берут и делают',
    adText: 'Метод партнёрских заявок: разбор механики получения комиссионных.',
    visualPrompt: 'Мужчина или женщина 30-50 в живом движении: собирает сумку, делает заметки, открывает путь или рабочую схему, яркий реалистичный рекламный стиль, цельный энергичный кадр без пустой колонки.',
    stylePreset: 'darkYellow',
    persona: 'mixed',
    minimal: true
  },
  approvedSpendOnline: {
    label: 'Тратишь деньги онлайн',
    short: 'Тратишь',
    headline: 'Пытаешься заработать онлайн, но только тратишь деньги?',
    decoration: '',
    adTitle: 'Онлайн только забирает деньги?',
    adText: 'Если курсы не дали результата, посмотрите другой подход.',
    visualPrompt: 'Современный человек 30-50 в светлой городской или домашней сцене, реальная усталость без глянца, но с ощущением выхода, вертикальный или квадратный баннер, крупный читаемый заголовок.',
    stylePreset: 'redWhite',
    persona: 'woman',
    minimal: true
  },
  approvedNeedSupport: {
    label: 'Нужна опора',
    short: 'Опора',
    headline: 'Когда вокруг нестабильно — нужна финансовая опора.',
    decoration: '',
    adTitle: 'Нужна финансовая опора',
    adText: 'Система, на которую можно опереться сегодня и завтра.',
    visualPrompt: 'Женщина или мужчина 32-50 в светлом доме, городе или кафе, тёплый живой свет, спокойный сине-золотой рекламный стиль, цельная сцена без разрезанного фона.',
    stylePreset: 'editorialGold',
    persona: 'woman',
    minimal: true
  },
  approvedSalaryFear: {
    label: 'Зависеть от зарплаты',
    short: 'Зарплата',
    headline: 'Страшно зависеть только от зарплаты?',
    decoration: '',
    adTitle: 'Страшно зависеть от зарплаты?',
    adText: 'Посмотрите спокойный путь к дополнительной опоре.',
    visualPrompt: 'Женщина или мужчина 32-50 в светлой современной среде, ноутбук может быть малой деталью, мягкий дневной свет, бело-синий баннер, крупная типографика.',
    stylePreset: 'editorialGold',
    persona: 'woman',
    minimal: true
  },
  approvedMoneyAnxiety: {
    label: 'Тревога из-за денег',
    short: 'Тревога',
    headline: 'Устали жить в постоянной тревоге из-за денег?',
    decoration: '',
    adTitle: 'Тревога из-за денег выматывает',
    adText: 'Посмотрите понятный способ вернуть себе опору.',
    visualPrompt: 'Женщина или мужчина 32-50 в светлой живой сцене: дом, кафе, природа или город, спокойствие и ясность, зелёный акцент, рекламный баннер с крупным текстом.',
    stylePreset: 'greenSystem',
    persona: 'woman',
    minimal: true
  },
  approvedNoSalaryLife: {
    label: 'Не от зарплаты',
    short: 'Не зарплата',
    headline: 'Есть люди, которые больше не живут от зарплаты до зарплаты.',
    decoration: '',
    adTitle: 'Не жить от зарплаты до зарплаты',
    adText: 'Смотрите, как они пришли к другой системе.',
    visualPrompt: 'Мужчина 32-50 на природе, в светлом городе или комнате, спокойная уверенность, зелёно-белый баннер, крупный текст.',
    stylePreset: 'outdoorFreedom',
    persona: 'man',
    minimal: true
  },
  approvedOneDeal: {
    label: '29 000 с продажи',
    short: '29 000',
    headline: 'Мне платят 29 000 ₽ с каждой продажи.',
    decoration: '',
    adTitle: 'Мне платят 29 000 ₽ с продажи',
    adText: 'Показываю, как устроена партнёрская система выплат.',
    visualPrompt: 'Женщина или мужчина 30-50 с телефоном в городе, кафе или светлом рабочем пространстве, яркий контрастный баннер, акцент на партнёрской модели без банковских брендов и без слова сделка.',
    stylePreset: 'blackRed',
    persona: 'woman',
    minimal: true
  },
  approvedCommissions: {
    label: 'Курсы и комиссионные',
    short: 'Комиссионные',
    headline: 'Пока вы проходите курсы — кто-то уже получает комиссионные.',
    decoration: '',
    adTitle: 'Пока вы только изучаете, другие уже берут и делают',
    adText: 'Метод партнёрских заявок: разбор механики получения комиссионных.',
    visualPrompt: 'Мужчина или женщина 30-50 в дороге, городе, природе или светлом рабочем пространстве, энергия действия вместо вечной учёбы, тёплый реалистичный кадр, яркий рекламный стиль.',
    stylePreset: 'darkYellow',
    persona: 'man',
    minimal: true
  },
  approvedLifeNotChanging: {
    label: 'Жизнь не меняется',
    short: 'Учишься',
    headline: 'Постоянно учишься, а жизнь не меняется?',
    decoration: '',
    adTitle: 'Учитесь, а жизнь не меняется?',
    adText: 'Пора менять не курс, а сам подход.',
    visualPrompt: 'Мужчина 30-48 в живой светлой среде, тетради/ноутбук только как малая деталь, крупный заголовок, реальная эмоция и ощущение выхода, без тёмного учебного стола.',
    stylePreset: 'darkYellow',
    persona: 'man',
    minimal: true
  }
};

const DEFAULT_IDEA = {
  angle: ANGLE_PRESETS.custom.label,
  headline: ANGLE_PRESETS.custom.headline,
  decoration: ANGLE_PRESETS.custom.decoration,
  adTitle: ANGLE_PRESETS.custom.adTitle,
  adText: ANGLE_PRESETS.custom.adText,
  directAngleKey: 'custom',
  visualPrompt: ANGLE_PRESETS.custom.visualPrompt
};

const BASE_GROUPS = [
  {
    name: 'Группа 1: курсы без результата',
    key: 'courses',
    source: ['courses', 'courseDrain', 'eternalStudent']
  },
  {
    name: 'Группа 2: другой способ / не всё самому',
    key: 'system',
    source: ['sideJobOperator', 'noProduct', 'operatorMode']
  }
];

function ideaFromPreset(key) {
  const preset = ANGLE_PRESETS[key] || ANGLE_PRESETS.custom;
  return {
    angle: preset.label,
    headline: preset.headline,
    decoration: preset.decoration,
    adTitle: preset.adTitle,
    adText: preset.adText,
    directAngleKey: directAngleKeyForHeadline(preset.headline),
    visualPrompt: preset.visualPrompt,
    minimal: Boolean(preset.minimal)
  };
}

function buildCampaignGroups(ideas) {
  const cleanIdeas = (ideas || []).filter((idea) => idea?.headline && idea?.adTitle);
  return BASE_GROUPS.map((group, groupIndex) => {
    const backup = group.source.map(ideaFromPreset);
    const ads = groupIndex === 0
      ? [...cleanIdeas, ...backup].slice(0, 3)
      : backup.slice(0, 3);
    return { ...group, ads };
  });
}

function campaignText(groups) {
  return groups.map((group) => {
    const ads = group.ads.map((ad, index) => [
      `Объявление ${index + 1}`,
      `Баннер: ${ad.headline}`,
      `Заголовок Директ: ${ad.adTitle}`,
      `Текст: ${ad.adText}`,
      `Первый экран предленда: ${ad.decoration}`
    ].join('\n')).join('\n\n');
    return `${group.name}\n${ads}`;
  }).join('\n\n---\n\n');
}

function copyText(text) {
  if (!text) return Promise.resolve(false);
  if (navigator?.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve(ok);
  } catch {
    return Promise.resolve(false);
  }
}

function wrapText(ctx, text, maxWidth, font) {
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitHeadline(ctx, text, maxWidth, maxLines, start, min) {
  for (let size = start; size >= min; size -= 3) {
    const font = `950 ${size}px Arial, sans-serif`;
    const lines = wrapText(ctx, text.toUpperCase(), maxWidth, font);
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = min;
  return {
    size,
    lines: wrapText(ctx, text.toUpperCase(), maxWidth, `950 ${size}px Arial, sans-serif`).slice(0, maxLines)
  };
}

function coverImage(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function containImage(ctx, img, x, y, w, h, fill = '#0b1020') {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);

  const coverScale = Math.max(w / img.width, h / img.height);
  const coverW = w / coverScale;
  const coverH = h / coverScale;
  const coverX = (img.width - coverW) / 2;
  const coverY = (img.height - coverH) / 2;
  ctx.globalAlpha = 0.34;
  ctx.filter = 'blur(18px)';
  ctx.drawImage(img, coverX, coverY, coverW, coverH, x - 24, y - 24, w + 48, h + 48);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;

  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function fillPolygon(ctx, points, fillStyle) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
}

function clipPolygon(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.clip();
}

function drawCorner(ctx, x, y, w, h, color, flipX = false, flipY = false) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
  ctx.beginPath();
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  ctx.moveTo(x, y + sy * h * 0.34);
  ctx.lineTo(x, y);
  ctx.lineTo(x + sx * w * 0.34, y);
  ctx.stroke();
  ctx.restore();
}

function drawBrush(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.02, y + h * 0.25);
  ctx.bezierCurveTo(x + w * 0.24, y - h * 0.05, x + w * 0.72, y + h * 0.06, x + w * 0.98, y + h * 0.16);
  ctx.lineTo(x + w * 0.93, y + h * 0.84);
  ctx.bezierCurveTo(x + w * 0.62, y + h * 1.05, x + w * 0.22, y + h * 0.92, x, y + h * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getCtaText(idea, style) {
  if (idea?.decoration) return idea.decoration;
  if (style === 'blackRed') return 'Достаточно понятного плана и первого шага уже сегодня';
  if (style === 'greenSystem') return 'Не нужно знать всё. Достаточно начать.';
  return 'Посмотрите, как это устроено внутри.';
}

function drawSmallButton(ctx, text, x, y, preset, compact = false) {
  const label = (text || 'Узнать подробности').toUpperCase();
  const fontSize = compact ? 23 : 28;
  ctx.save();
  ctx.font = `900 ${fontSize}px Arial, sans-serif`;
  const width = Math.min(compact ? 300 : 360, Math.max(compact ? 210 : 260, ctx.measureText(label).width + 58));
  const height = compact ? 54 : 62;
  ctx.fillStyle = preset.accent;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = preset.light ? '#ffffff' : '#080b12';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + width / 2, y + height / 2 + 1);
  ctx.restore();
}

function drawDecorationText(ctx, text, x, y, maxWidth, preset, compact = false) {
  const copy = String(text || 'Посмотрите, как это устроено внутри.').trim();
  const fontSize = compact ? 30 : 34;
  ctx.save();
  ctx.font = `850 ${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = preset.light ? preset.ink : 'rgba(255,255,255,.92)';
  const lines = wrapText(ctx, copy.toUpperCase(), maxWidth, ctx.font).slice(0, 2);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * fontSize * 1.18);
  });
  ctx.restore();
  return lines.length * fontSize * 1.18;
}

function headlineFont(preset, size) {
  const mode = preset?.font || 'condensed';
  if (mode === 'impact') return `900 ${size}px Impact, "Arial Black", Arial, sans-serif`;
  if (mode === 'serif') return `900 ${size}px Georgia, "Times New Roman", serif`;
  if (mode === 'system') return `950 ${size}px Arial, sans-serif`;
  if (mode === 'documentary') return `900 ${size}px "Arial Black", Arial, sans-serif`;
  return `900 italic ${size}px "Arial Narrow", Impact, Arial, sans-serif`;
}

function drawSquarePremium(ctx, {
  idea,
  preset,
  pal,
  persona,
  generatedImage,
  heroImage,
  photoMode,
  w,
  h
}) {
  const img = generatedImage || (heroImage && photoMode === 'direct' ? heroImage : null);
  const textOnLeft = preset.photoSide !== 'left';
  const panelW = w * 0.56;
  const panelX = textOnLeft ? 0 : w - panelW;
  const panelY = 0;
  const panelH = h;
  const panelPadX = w * 0.07;

  ctx.fillStyle = preset.light ? '#f7f2e8' : '#030712';
  ctx.fillRect(0, 0, w, h);

  const photoX = textOnLeft ? w * 0.50 : 0;
  const photoW = w * 0.50;
  if (img) {
    if (generatedImage) {
      coverImage(ctx, img, 0, 0, w, h);
    } else {
      ctx.save();
      ctx.beginPath();
      if (textOnLeft) {
        ctx.moveTo(photoX + w * 0.04, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(photoX - w * 0.05, h);
      } else {
        ctx.moveTo(0, 0);
        ctx.lineTo(photoW + w * 0.05, 0);
        ctx.lineTo(photoW - w * 0.04, h);
        ctx.lineTo(0, h);
      }
      ctx.closePath();
      ctx.clip();
      if (heroImage && photoMode === 'direct') {
        containImage(ctx, img, photoX, 0, photoW, h, preset.light ? '#f5efe5' : '#070b13');
      } else {
        coverImage(ctx, img, photoX, 0, photoW, h);
      }
      ctx.restore();
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, pal.bg2);
    grad.addColorStop(1, pal.bg1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    drawFallbackPerson(ctx, w, h, persona, pal);
  }

  const imageShade = ctx.createLinearGradient(0, 0, w, 0);
  if (textOnLeft) {
    imageShade.addColorStop(0, preset.light ? 'rgba(255,255,255,.98)' : 'rgba(0,0,0,.88)');
    imageShade.addColorStop(0.5, preset.light ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.35)');
    imageShade.addColorStop(1, 'rgba(0,0,0,.04)');
  } else {
    imageShade.addColorStop(0, 'rgba(0,0,0,.04)');
    imageShade.addColorStop(0.5, preset.light ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.35)');
    imageShade.addColorStop(1, preset.light ? 'rgba(255,255,255,.98)' : 'rgba(0,0,0,.88)');
  }
  ctx.fillStyle = imageShade;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.fillStyle = preset.light ? 'rgba(255,255,255,.98)' : 'rgba(3,7,18,.97)';
  ctx.shadowColor = 'rgba(0,0,0,.25)';
  ctx.shadowBlur = preset.shape === 'brush' ? 0 : 28;
  ctx.shadowOffsetY = preset.shape === 'brush' ? 0 : 14;
  ctx.beginPath();
  if (preset.shape === 'curve') {
    if (textOnLeft) {
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.58, 0);
      ctx.quadraticCurveTo(w * 0.50, h * 0.5, w * 0.57, h);
      ctx.lineTo(0, h);
    } else {
      ctx.moveTo(w, 0);
      ctx.lineTo(w * 0.42, 0);
      ctx.quadraticCurveTo(w * 0.50, h * 0.5, w * 0.43, h);
      ctx.lineTo(w, h);
    }
  } else {
    if (textOnLeft) {
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.58, 0);
      ctx.lineTo(w * 0.50, h);
      ctx.lineTo(0, h);
    } else {
      ctx.moveTo(w, 0);
      ctx.lineTo(w * 0.42, 0);
      ctx.lineTo(w * 0.50, h);
      ctx.lineTo(w, h);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (preset.shape === 'brush') {
    drawBrush(ctx, textOnLeft ? w * 0.49 : w * 0.39, -h * 0.04, w * 0.16, h * 0.96, preset.accent);
  } else {
    ctx.save();
    ctx.strokeStyle = preset.accent;
    ctx.lineWidth = Math.max(6, w * 0.008);
    ctx.beginPath();
    if (textOnLeft) {
      ctx.moveTo(w * 0.56, 0);
      ctx.quadraticCurveTo(w * 0.49, h * 0.5, w * 0.55, h);
    } else {
      ctx.moveTo(w * 0.44, 0);
      ctx.quadraticCurveTo(w * 0.51, h * 0.5, w * 0.45, h);
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = preset.accent;
  ctx.beginPath();
  ctx.roundRect(textOnLeft ? panelPadX * 0.6 : w - panelPadX * 0.6 - 12, h * 0.10, 12, h * 0.72, 8);
  ctx.fill();
  ctx.restore();

  const textX = textOnLeft ? panelPadX + w * 0.01 : w * 0.50;
  const textY = h * 0.12;
  const textW = w * 0.42;
  const headline = drawPremiumHeadline(
    ctx,
    idea.headline,
    textX,
    textY,
    textW,
    6,
    preset.font === 'serif' ? 70 : 78,
    preset.accent,
    preset.light ? preset.ink : '#ffffff',
    'left',
    preset
  );

  const lineY = textY + headline.height + h * 0.035;
  ctx.save();
  ctx.strokeStyle = preset.accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(textX, lineY);
  ctx.lineTo(textX + textW * 0.74, lineY);
  ctx.stroke();
  ctx.restore();

  const decorY = lineY + h * 0.04;
  const minimalBanner = Boolean(idea?.minimal);
  const decorH = minimalBanner ? 0 : drawDecorationText(ctx, getCtaText(idea, 'square'), textX, decorY, textW, preset, true);
  drawSmallButton(ctx, 'Узнать подробности', textX, minimalBanner ? Math.min(panelY + panelH - 86, decorY + h * 0.02) : Math.min(panelY + panelH - 86, decorY + decorH + h * 0.035), preset, true);
}

function drawPremiumHeadline(ctx, text, x, y, maxWidth, maxLines, baseSize, accent, ink, align = 'left', preset = null) {
  const fitted = fitHeadline(ctx, text, maxWidth, maxLines, baseSize, Math.max(34, baseSize * 0.5));
  const lineH = fitted.size * 1.08;
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  ctx.font = headlineFont(preset, fitted.size);
  const anchorX = align === 'center' ? x + maxWidth / 2 : x;
  fitted.lines.forEach((line, index) => {
    const isAccent = index >= Math.max(1, fitted.lines.length - 2);
    ctx.fillStyle = isAccent ? accent : ink;
    ctx.fillText(line, anchorX, y + index * lineH);
  });
  ctx.restore();
  return { height: fitted.lines.length * lineH, lines: fitted.lines, size: fitted.size };
}

function getPhotoGeometry(w, h, preset) {
  const side = preset.photoSide;
  const panelW = preset.shape === 'curve' ? w * 0.53 : w * 0.56;
  if (side === 'left') {
    return {
      photo: { x: 0, y: 0, w: w * 0.48, h },
      text: { x: w * 0.51, y: h * 0.12, w: w * 0.42, h: h * 0.78 },
      panel: [[w * 0.39, 0], [w, 0], [w, h], [w * 0.5, h], [w * 0.43, h * 0.58]]
    };
  }
  return {
    photo: { x: w * 0.52, y: 0, w: w * 0.48, h },
    text: { x: w * 0.07, y: h * 0.13, w: w * 0.43, h: h * 0.78 },
    panel: [[0, 0], [panelW, 0], [w * 0.49, h], [0, h]]
  };
}

function drawPhotoArea(ctx, img, geom, preset, persona, pal, generatedImage, heroImage, photoMode, w, h) {
  ctx.save();
  if (preset.shape === 'curve') {
    ctx.beginPath();
    if (preset.photoSide === 'left') {
      ctx.rect(0, 0, w * 0.52, h);
    } else {
      ctx.rect(w * 0.48, 0, w * 0.52, h);
    }
    ctx.clip();
  } else {
    clipPolygon(ctx, preset.photoSide === 'left'
      ? [[0, 0], [w * 0.48, 0], [w * 0.4, h], [0, h]]
      : [[w * 0.52, 0], [w, 0], [w, h], [w * 0.45, h]]
    );
  }
  if (img) coverImage(ctx, img, geom.photo.x, geom.photo.y, geom.photo.w, geom.photo.h);
  else {
    const grad = ctx.createLinearGradient(geom.photo.x, 0, geom.photo.x + geom.photo.w, h);
    grad.addColorStop(0, pal.bg2);
    grad.addColorStop(1, pal.bg1);
    ctx.fillStyle = grad;
    ctx.fillRect(geom.photo.x, 0, geom.photo.w, h);
    drawFallbackPerson(ctx, w, h, persona, pal);
  }
  if (generatedImage || (heroImage && photoMode === 'direct')) {
    const shade = ctx.createLinearGradient(geom.photo.x, 0, geom.photo.x + geom.photo.w, 0);
    shade.addColorStop(0, preset.photoSide === 'left' ? 'rgba(0,0,0,.04)' : 'rgba(0,0,0,.18)');
    shade.addColorStop(1, preset.photoSide === 'left' ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.04)');
    ctx.fillStyle = shade;
    ctx.fillRect(geom.photo.x, 0, geom.photo.w, h);
  }
  ctx.restore();
}

function drawFallbackPerson(ctx, w, h, persona, pal) {
  const x = w * 0.74;
  const y = h * 0.38;
  const head = Math.min(w, h) * 0.075;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.26)';
  ctx.beginPath();
  ctx.ellipse(x, h * 0.52, w * 0.24, h * 0.38, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = persona === 'man' ? '#c79a76' : '#d9aa82';
  ctx.beginPath();
  ctx.arc(x, y, head, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = persona === 'man' ? '#2f3642' : '#5b3a2e';
  ctx.beginPath();
  ctx.ellipse(x - head * 0.08, y - head * 0.28, head * 0.9, head * 0.48, -0.18, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = persona === 'man' ? '#263548' : '#eee0cf';
  ctx.beginPath();
  ctx.roundRect(x - head * 1.6, y + head * 1.05, head * 3.2, head * 4.2, head * 0.55);
  ctx.fill();

  ctx.fillStyle = '#101827';
  ctx.beginPath();
  ctx.roundRect(w * 0.61, h * 0.69, w * 0.26, h * 0.075, 12);
  ctx.fill();
  ctx.fillStyle = pal.cta;
  ctx.beginPath();
  ctx.roundRect(w * 0.63, h * 0.715, w * 0.22, h * 0.018, 4);
  ctx.fill();
  ctx.restore();
}

function drawBanner({
  canvas,
  idea,
  format,
  palette,
  stylePreset,
  persona,
  generatedImage,
  heroImage,
  photoMode,
  compositionSide
}) {
  if (!canvas || !idea) return;
  const ctx = canvas.getContext('2d');
  const size = SIZES[format];
  const pal = PALETTES[palette];
  const basePreset = STYLE_PRESETS[stylePreset] || STYLE_PRESETS.editorialGold;
  const preset = {
    ...basePreset,
    photoSide: compositionSide && compositionSide !== 'auto' ? compositionSide : basePreset.photoSide
  };
  canvas.width = size.w;
  canvas.height = size.h;
  const { w, h } = size;
  const img = generatedImage || (heroImage && photoMode === 'direct' ? heroImage : null);

  if (generatedImage && idea?.aiFullBanner) {
    coverImage(ctx, generatedImage, 0, 0, w, h);
    return;
  }

  const isLegacy = stylePreset === 'classic';
  if (!isLegacy) {
    if (format === 'square') {
      drawSquarePremium(ctx, {
        idea,
        preset,
        pal,
        persona,
        generatedImage,
        heroImage,
        photoMode,
        w,
        h
      });
      return;
    }

    const geom = getPhotoGeometry(w, h, preset);
    ctx.fillStyle = preset.light ? preset.panel : preset.panel;
    ctx.fillRect(0, 0, w, h);
    drawPhotoArea(ctx, img, geom, preset, persona, pal, generatedImage, heroImage, photoMode, w, h);

    if (preset.shape === 'curve') {
      ctx.save();
      ctx.fillStyle = preset.panel;
      ctx.beginPath();
      if (preset.photoSide === 'left') {
        ctx.moveTo(w * 0.42, 0);
        ctx.quadraticCurveTo(w * 0.36, h * 0.5, w * 0.47, h);
        ctx.lineTo(w, h);
        ctx.lineTo(w, 0);
      } else {
        ctx.moveTo(0, 0);
        ctx.lineTo(w * 0.55, 0);
        ctx.quadraticCurveTo(w * 0.43, h * 0.5, w * 0.52, h);
        ctx.lineTo(0, h);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = preset.accent;
      ctx.lineWidth = Math.max(7, w * 0.008);
      ctx.beginPath();
      if (preset.photoSide === 'left') ctx.moveTo(w * 0.43, 0), ctx.quadraticCurveTo(w * 0.37, h * 0.5, w * 0.48, h);
      else ctx.moveTo(w * 0.55, 0), ctx.quadraticCurveTo(w * 0.43, h * 0.5, w * 0.52, h);
      ctx.stroke();
      ctx.restore();
    } else {
      fillPolygon(ctx, geom.panel, preset.panel);
      const lineX = preset.photoSide === 'left' ? w * 0.46 : w * 0.53;
      ctx.save();
      ctx.strokeStyle = preset.accent;
      ctx.lineWidth = Math.max(9, w * 0.01);
      ctx.beginPath();
      ctx.moveTo(lineX, -20);
      ctx.lineTo(preset.photoSide === 'left' ? w * 0.4 : w * 0.47, h + 20);
      ctx.stroke();
      if (preset.shape === 'brush') {
        ctx.globalAlpha = 0.85;
        drawBrush(ctx, lineX - w * 0.05, -20, w * 0.12, h * 0.92, preset.accent);
      }
      ctx.restore();
    }

    const textBox = geom.text;
    drawCorner(ctx, preset.photoSide === 'left' ? w * 0.94 : w * 0.2, h * 0.06, w * 0.22, h * 0.18, preset.accent, preset.photoSide !== 'left', false);
    const compact = format !== 'wide';
    const headline = drawPremiumHeadline(
      ctx,
      idea.headline,
      textBox.x,
      textBox.y,
      textBox.w,
      compact ? 6 : 5,
      compact ? Math.min(72, w * 0.078) : Math.min(76, w * 0.052),
      preset.accent,
      preset.ink
    );
    ctx.save();
    ctx.strokeStyle = preset.accent;
    ctx.lineWidth = Math.max(3, h * 0.006);
    ctx.beginPath();
    ctx.moveTo(textBox.x, textBox.y + headline.height + h * 0.025);
    ctx.lineTo(textBox.x + textBox.w * 0.72, textBox.y + headline.height + h * 0.025);
    ctx.stroke();
    ctx.restore();

    const decorY = textBox.y + headline.height + h * 0.065;
    const minimalBanner = Boolean(idea?.minimal);
    const decorH = minimalBanner ? 0 : drawDecorationText(ctx, getCtaText(idea, stylePreset).toUpperCase(), textBox.x, decorY, textBox.w, preset, compact || preset.shape !== 'brush');
    drawSmallButton(ctx, 'Узнать подробности', textBox.x, minimalBanner ? Math.min(h - 86, decorY + h * 0.02) : Math.min(h - 86, decorY + decorH + h * 0.05), preset, compact);
    return;
  }

  if (heroImage && photoMode === 'direct') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, pal.bg1);
    grad.addColorStop(1, pal.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const photoW = w * 0.42;
    const photoH = h * 0.72;
    const photoX = w * 0.58;
    const photoY = h * 0.13;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(photoX, photoY, photoW, photoH, 28);
    ctx.clip();
    coverImage(ctx, heroImage, photoX, photoY, photoW, photoH);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.24)';
    ctx.beginPath();
    ctx.ellipse(w * 0.78, h * 0.5, w * 0.27, h * 0.42, -0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (generatedImage) {
    ctx.drawImage(generatedImage, 0, 0, w, h);
    const shade = ctx.createLinearGradient(0, 0, w, 0);
    shade.addColorStop(0, 'rgba(0,0,0,.64)');
    shade.addColorStop(0.55, 'rgba(0,0,0,.12)');
    shade.addColorStop(1, 'rgba(0,0,0,.02)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, pal.bg1);
    grad.addColorStop(1, pal.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.36)';
    ctx.beginPath();
    ctx.ellipse(w * 0.78, h * 0.5, w * 0.24, h * 0.44, -0.18, 0, Math.PI * 2);
    ctx.fill();
    drawFallbackPerson(ctx, w, h, persona, pal);
  }

  const isWide = format === 'wide';
  const isVertical = format === 'vertical';
  const left = w * 0.07;
  const top = isVertical ? h * 0.09 : h * 0.11;
  const maxWidth = isWide ? w * 0.58 : w * 0.78;
  const startSize = isVertical ? 78 : isWide ? 66 : 76;
  const fitted = fitHeadline(ctx, idea.headline, maxWidth, isWide ? 4 : 5, startSize, 42);
  const lineH = fitted.size * 1.06;
  const glass = palette === 'dark' || generatedImage ? 'rgba(17,24,39,.72)' : 'rgba(255,255,255,.78)';

  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.roundRect(left - 28, top - 30, maxWidth + 56, fitted.lines.length * lineH + 155, 22);
  ctx.fill();

  ctx.fillStyle = palette === 'dark' || generatedImage ? '#ffffff' : pal.ink;
  ctx.font = `950 ${fitted.size}px Arial, sans-serif`;
  ctx.textBaseline = 'top';
  fitted.lines.forEach((line, index) => {
    ctx.fillText(line, left, top + index * lineH);
  });

  const ctaText = idea.decoration || 'Узнать подробности';
  const ctaY = top + fitted.lines.length * lineH + 28;
  ctx.font = '900 30px Arial, sans-serif';
  const ctaW = Math.min(maxWidth, Math.max(280, ctx.measureText(ctaText).width + 62));
  ctx.fillStyle = palette === 'yellow' ? '#111827' : pal.cta;
  ctx.beginPath();
  ctx.roundRect(left, ctaY, ctaW, 62, 20);
  ctx.fill();
  ctx.fillStyle = palette === 'yellow' || palette === 'green' ? '#fff' : '#111827';
  ctx.textBaseline = 'middle';
  ctx.fillText(ctaText, left + 31, ctaY + 32);
}

function slugify(text) {
  return (text || 'banner')
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'banner';
}

function compactImageDataUrl(img, maxSide = 720, quality = 0.72) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function compactCanvasDataUrl(sourceCanvas) {
  if (!sourceCanvas) return '';
  const canvas = document.createElement('canvas');
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(sourceCanvas.width, sourceCanvas.height));
  canvas.width = Math.round(sourceCanvas.width * scale);
  canvas.height = Math.round(sourceCanvas.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function loadGeneratedImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('картинка пришла, но браузер не смог загрузить её в превью'));
    img.src = src;
  });
}

function imageByteEstimate(dataUrl = '') {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  return Math.round(base64.length * 0.75);
}

function imageSharpnessScore(img) {
  const maxSide = 480;
  const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(32, Math.round((img.width || 1) * scale));
  const height = Math.max(32, Math.round((img.height || 1) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  let total = 0;
  let samples = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = (y * width + x) * 4;
      const r = (y * width + x + 1) * 4;
      const b = ((y + 1) * width + x) * 4;
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const lumRight = data[r] * 0.299 + data[r + 1] * 0.587 + data[r + 2] * 0.114;
      const lumBottom = data[b] * 0.299 + data[b + 1] * 0.587 + data[b + 2] * 0.114;
      total += Math.abs(lum - lumRight) + Math.abs(lum - lumBottom);
      samples += 2;
    }
  }
  return samples ? total / samples : 0;
}

function imageLumaContrastScore(img) {
  const maxSide = 260;
  const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(24, Math.round((img.width || 1) * scale));
  const height = Math.max(24, Math.round((img.height || 1) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  let total = 0;
  let totalSq = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 16) {
    const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    total += lum;
    totalSq += lum * lum;
    count += 1;
  }
  if (!count) return 0;
  const mean = total / count;
  return Math.sqrt(Math.max(0, totalSq / count - mean * mean));
}

function imageZoneStats(img, zone = {}) {
  const maxSide = 260;
  const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(24, Math.round((img.width || 1) * scale));
  const height = Math.max(24, Math.round((img.height || 1) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { mean: 0, contrast: 0, sharpness: 0 };
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const x1 = Math.max(0, Math.floor((zone.x1 ?? 0) * width));
  const x2 = Math.min(width - 2, Math.ceil((zone.x2 ?? 1) * width));
  const y1 = Math.max(0, Math.floor((zone.y1 ?? 0) * height));
  const y2 = Math.min(height - 2, Math.ceil((zone.y2 ?? 1) * height));
  let total = 0;
  let totalSq = 0;
  let edge = 0;
  let count = 0;
  for (let y = y1; y <= y2; y += 2) {
    for (let x = x1; x <= x2; x += 2) {
      const i = (y * width + x) * 4;
      const r = (y * width + x + 1) * 4;
      const b = ((y + 1) * width + x) * 4;
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const lumRight = data[r] * 0.299 + data[r + 1] * 0.587 + data[r + 2] * 0.114;
      const lumBottom = data[b] * 0.299 + data[b + 1] * 0.587 + data[b + 2] * 0.114;
      total += lum;
      totalSq += lum * lum;
      edge += Math.abs(lum - lumRight) + Math.abs(lum - lumBottom);
      count += 1;
    }
  }
  if (!count) return { mean: 0, contrast: 0, sharpness: 0 };
  const mean = total / count;
  return {
    mean,
    contrast: Math.sqrt(Math.max(0, totalSq / count - mean * mean)),
    sharpness: edge / Math.max(1, count * 2)
  };
}

function inspectPrelandingSceneImage(img) {
  const width = img.width || 0;
  const height = img.height || 0;
  const ratio = height ? width / height : 0;
  const sharpness = imageSharpnessScore(img);
  const contrast = imageLumaContrastScore(img);
  const fullZone = imageZoneStats(img, { x1: 0, x2: 1, y1: 0, y2: 1 });
  const visualZone = imageZoneStats(img, { x1: 0.44, x2: 0.86, y1: 0.10, y2: 0.74 });
  const mobileTopZone = imageZoneStats(img, { x1: 0.28, x2: 0.76, y1: 0.08, y2: 0.58 });
  const issues = [];
  if (width < 1500 || height < 950) issues.push(`маленькое разрешение ${width}x${height}`);
  if (ratio < 1.35 || ratio > 1.7) issues.push(`не wide-формат ${width}x${height}`);
  if (sharpness < 8.4) issues.push(`слишком мягкая картинка, sharpness ${sharpness.toFixed(1)}`);
  if (contrast < 28) issues.push(`низкий контраст фотоосновы, contrast ${contrast.toFixed(1)}`);
  if (fullZone.mean < 56) issues.push(`слишком тёмная hero-сцена, luma ${fullZone.mean.toFixed(1)}`);
  if (visualZone.contrast < 20 || visualZone.sharpness < 6.2) issues.push(`центрально-правая visual-zone пустая/мыльная, contrast ${visualZone.contrast.toFixed(1)}, sharpness ${visualZone.sharpness.toFixed(1)}`);
  if (mobileTopZone.mean < 56 || mobileTopZone.contrast < 20) issues.push(`верх mobile-зоны слабый, luma ${mobileTopZone.mean.toFixed(1)}, contrast ${mobileTopZone.contrast.toFixed(1)}`);
  return {
    ok: issues.length === 0,
    width,
    height,
    ratio,
    sharpness,
    contrast,
    fullZone,
    visualZone,
    mobileTopZone,
    issues
  };
}

function accentHeadline(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 3) return text;
  const splitIndex = Math.max(words.length - 2, 1);
  return `${words.slice(0, splitIndex).join(' ')} <span>${words.slice(splitIndex).join(' ')}</span>`;
}

function buildPills(headline) {
  const source = String(headline || '').toLowerCase();
  if (source.includes('подработ') || source.includes('за кадр') || source.includes('основной работе')) return ['Подработка', 'За кадром', 'Простая инструкция'];
  if (source.includes('курс')) return ['Без новых курсов', 'Без роли эксперта', 'С готовой системой'];
  if (source.includes('комис') || source.includes('29')) return ['Партнёрские выплаты', 'Без своего продукта', 'С понятным разбором'];
  if (source.includes('самостоятель')) return ['Без хаоса', 'С поддержкой', 'Не надо всё тащить'];
  return ['Без долгой раскачки', 'С понятным разбором', 'По шагам'];
}

function methodNameForHeadline(headline) {
  const source = String(headline || '').toLowerCase();
  if (source.includes('подработ') || source.includes('за кадр') || source.includes('основной работе')) return 'Простая инструкция для подработки за кадром';
  if (source.includes('изуч') && source.includes('дела')) return 'Разбор входа без лишней теории';
  if (source.includes('курс') || source.includes('обуч') || source.includes('учит')) return 'Разбор модели входа без бесконечного обучения';
  if (source.includes('комис') || source.includes('сделк') || source.includes('29') || source.includes('5000')) return 'Партнёрская модель с понятным разбором шагов';
  if (source.includes('сам') || source.includes('разбират') || source.includes('продукт') || source.includes('блог')) return 'Готовая система входа без роли эксперта';
  if (source.includes('сложн') || source.includes('путь') || source.includes('готов')) return 'Короткий разбор пути без лишних кругов';
  if (source.includes('найм') || source.includes('зарплат') || source.includes('работ')) return 'Формат запасного пути через готовую систему';
  if (source.includes('тревог') || source.includes('опор') || source.includes('деньг')) return 'Система финансовой опоры с понятным путём';
  return 'Кардинально другой формат входа в систему';
}

function methodTextForIdea(headline, customText = '') {
  const clean = String(customText || '').replace(/\s+/g, ' ').trim();
  return clean || methodNameForHeadline(headline);
}

function prelandingKickerForHeadline(headline) {
  const source = String(headline || '').toLowerCase();
  if (source.includes('подработ') || source.includes('за кадр') || source.includes('основной работе')) return 'подработка за кадром';
  if (source.includes('курс') || source.includes('обуч') || source.includes('учит')) return 'не ещё один курс';
  if (source.includes('комис') || source.includes('сделк') || source.includes('29') || source.includes('5000')) return 'партнёрская механика';
  if (source.includes('зарплат') || source.includes('найм') || source.includes('работ')) return 'запасной путь';
  if (source.includes('тревог') || source.includes('опор') || source.includes('деньг')) return 'меньше хаоса с деньгами';
  if (source.includes('сам') || source.includes('продукт') || source.includes('блог')) return 'без всего с нуля';
  return 'короткий разбор без лишней теории';
}

function trimDirectText(value, max = 81) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 48 ? cut.slice(0, lastSpace) : clean.slice(0, max)).trim();
}

const DIRECT_MODERATION_BANK = {
  commission: [
    ['Разбор партнёрской модели заявок', 'Показываем, как устроены заявка, воронка и роль участника.'],
    ['Партнёрская программа без своего курса', 'Короткий разбор механики: трафик, заявка и следующий шаг.'],
    ['Как устроена модель партнёрских заявок', 'Смотрите понятную схему без обещаний и громких формулировок.'],
    ['Сначала разбор связки, потом решение', 'Показываем путь клиента и роль участника в партнёрской программе.'],
    ['Партнёрская связка без сложного запуска', 'Разбор структуры: вход, заявка, путь и обработка обращения.'],
    ['Модель заявок без своего продукта', 'Посмотрите, как устроен путь через готовую партнёрскую программу.'],
    ['Партнёрская программа по шагам', 'Коротко показываем, из чего состоит связка и где роль участника.'],
    ['Разберите механику до запуска', 'Показываем процесс без обещаний и лишней мотивации.'],
    ['Понятная схема партнёрских заявок', 'Разбор формата: что делает участник и куда ведёт первый шаг.'],
    ['Готовая связка вместо своего курса', 'Смотрите разбор пути без создания продукта с нуля.'],
    ['Как работает партнёрская воронка', 'Коротко показываем логику заявки, перехода и следующего действия.'],
    ['Путь партнёрской программы', 'Разбор без давления: структура, роли и последовательность шагов.']
  ],
  courses: [
    ['Хватит постоянно учиться', 'За короткий разбор покажу, что менять в подходе. Смотри.'],
    ['Не очередной курс, а схема', 'Коротко покажу модель входа без долгого обучения. Жми.'],
    ['Учёбы много, ясности мало?', 'Разберём простой путь: что делать и куда вести человека.'],
    ['Онлайн-обучения стало слишком много?', 'Разбор формата, где сначала показывают механику входа.'],
    ['После курсов хочется ясной схемы?', 'Посмотрите путь без очередного круга длинной теории.'],
    ['Курсов много, а ясности мало?', 'Короткий разбор системы, где важны шаги и понятный вход.'],
    ['Пора менять не курс, а подход', 'Разбор для тех, кто хочет увидеть структуру перед стартом.'],
    ['Снова обучение вместо пути?', 'Посмотрите формат, где сначала разбирают путь и роли.'],
    ['Хватит покупать курсы вслепую', 'Короткий разбор другого входа без бесконечной подготовки.'],
    ['Учёбы много, ясности мало?', 'Показываем путь без очередного марафона и сложных ролей.'],
    ['Не ещё один курс, а разбор системы', 'Посмотрите, как устроен вход без долгого обучения с нуля.'],
    ['Курсы не обязаны быть единственным путём', 'Разбор альтернативного пути без роли вечного ученика.'],
    ['Вы уже достаточно учились?', 'Коротко покажем другой подход: меньше теории, больше структуры.'],
    ['Онлайн-обучение снова не помогло?', 'Посмотрите спокойный разбор пути без нового курса.'],
    ['Вместо курса посмотрите механику', 'Разбор системы, где важны шаги, связка и понятный вход.']
  ],
  salary: [
    ['Тянешь от аванса до аванса?', 'Есть способ проще. За короткий разбор увидишь выход. Расскажу как есть. Жми.'],
    ['Живёшь по одному сценарию?', 'Покажу запасной путь без блога и сложного запуска.'],
    ['Хочется выбраться из найма?', 'Смотри короткий разбор: как устроен вход через готовую связку.'],
    ['Нужен запасной путь действий?', 'Разбор готовой системы без создания продукта и личных продаж.'],
    ['Один источник кажется хрупким?', 'Формат запасного пути через готовую партнёрскую связку.'],
    ['Хотите понять альтернативный формат?', 'Посмотрите спокойный разбор роли участника в системе.'],
    ['Нужен путь рядом с работой?', 'Разбор системы, где первый шаг понятен без новой профессии.'],
    ['Когда хочется понятной схемы', 'Короткий разбор запасного пути без громких обещаний.'],
    ['Хочется второй точки внимания?', 'Посмотрите систему входа без своего продукта и сложного запуска.'],
    ['Разберите запасной онлайн-путь', 'Показываем структуру первого шага и готовой связки.'],
    ['Один сценарий стал слишком узким?', 'Спокойный вход в систему без смены профессии и резких шагов.'],
    ['Путь не только через найм', 'Коротко разбираем путь, где не нужно всё строить одному.'],
    ['Нужна понятная схема входа?', 'Посмотрите формат с первым шагом и готовой связкой.'],
    ['Запасной путь без хаоса', 'Разбор системы без блогинга, продукта и сложного запуска.'],
    ['Если хочется больше вариантов', 'Посмотрите спокойный разбор дополнительного пути.']
  ],
  anxiety: [
    ['Устал от хаоса вокруг?', 'Покажу спокойный путь: что делать сначала и куда вести человека.'],
    ['Хочется понятный план?', 'Короткий разбор готовой связки без блога и сложного запуска.'],
    ['Когда хочется меньше хаоса', 'Онлайн-система, где запуск и техническую часть берёт команда.'],
    ['Нужен понятный путь без давления?', 'Разбор подхода, где важны структура и первый шаг.'],
    ['Хочется больше ясности в действиях?', 'Короткий разбор системы без хаоса, лишних ролей и новой профессии.'],
    ['Когда нет опоры, нужен понятный путь', 'Посмотрите разбор системы, с которой проще сделать первый шаг.'],
    ['Меньше хаоса, больше структуры', 'Посмотрите спокойный разбор пути без новой профессии.'],
    ['Когда нужен понятный первый шаг', 'Коротко показываем систему, где путь становится яснее.'],
    ['Нужна понятная точка входа?', 'Разбор входа без обещаний, давления и лишней теории.'],
    ['Когда вокруг нестабильно', 'Посмотрите путь, который помогает увидеть следующий шаг.'],
    ['Хочется вернуть порядок в действиях?', 'Разбор системы без хаоса, блогинга и сложных запусков.'],
    ['Когда перегружает неопределённость', 'Короткий разбор спокойного входа через готовую связку.'],
    ['Если не хватает устойчивого плана', 'Посмотрите формат, где сначала разбирают путь и роли.'],
    ['Опора начинается с понятной схемы', 'Разбор системы без лишней мотивации и громких обещаний.']
  ],
  noProduct: [
    ['Не изобретай свой оффер', 'Покажу модель входа через готовую связку. Без лишней теории.'],
    ['Без продукта, блога и команды', 'Разберём, что делает участник и куда ведёт первый шаг.'],
    ['Не надо собирать всё самому', 'Покажу готовую связку: вход, заявка и следующий шаг.'],
    ['Без продукта, блога и команды', 'Разбор готовой системы: без своего продукта и перегруза лишними ролями.'],
    ['Не нужно становиться экспертом', 'Показываем простой старт без роли гуру и долгой подготовки.'],
    ['Не обязательно всё собирать самому', 'Есть понятная система и поддержка на каждом этапе.'],
    ['Не тащите всё на себе', 'Посмотрите подход, где не нужно собирать продукт и воронку одному.'],
    ['Не нужен свой продукт для старта', 'Разбор входа в готовую систему без сборки всего с нуля.'],
    ['Без команды и сложного запуска', 'Посмотрите путь, где не нужно закрывать все роли самому.'],
    ['Не хотите делать продукт с нуля?', 'Короткий разбор системы, где уже есть готовая связка.'],
    ['Старт без роли эксперта', 'Показываем путь без личного бренда, курса и команды.'],
    ['Не обязательно быть продюсером', 'Разбор модели, где вход начинается с понятной роли.'],
    ['Готовая система вместо своего продукта', 'Посмотрите, как устроен вход без перегруза задачами.'],
    ['Без блога, продукта и отдела продаж', 'Разбор пути, где не нужно строить всё самому.'],
    ['Сначала войти в систему, не строить бизнес', 'Короткий разбор роли участника без своего продукта.']
  ],
  sideJob: [
    ['Можно без блога и сторис', 'Покажу формат за кадром: что делать и куда ведёт первый шаг.'],
    ['Не светиться, а вести процесс', 'Короткий разбор роли оператора в готовой связке.'],
    ['Нужна понятная роль онлайн?', 'Смотри инструкцию: без продукта, команды и сложного запуска.'],
    ['Формат рядом с основной работой', 'Управляйте процессом за кадром. Смотрите простую инструкцию.'],
    ['Онлайн-формат без публичности', 'Разбор формата: управлять связкой за кадром без блога и продукта.'],
    ['Формат без роли блогера', 'Посмотрите простую инструкцию и понятный первый шаг.'],
    ['Управляйте процессом за кадром', 'Онлайн-формат рядом с основной работой, без сложного запуска.'],
    ['Не вторая работа, а понятная роль', 'Разбор системы, где не нужно всё делать самому.'],
    ['Без своего продукта и блога', 'Смотрите, как устроен вход через готовую связку и мессенджер.'],
    ['Свободное время можно использовать иначе', 'Короткая инструкция для тех, кто хочет понятный запасной путь.'],
    ['Процесс идёт за кадром', 'Разбор формата без публичности, сторис и личных продаж.'],
    ['Спокойный онлайн-формат', 'Увидите, как управлять процессом без блога и сложных ролей.'],
    ['За кадром, но по понятной схеме', 'Смотрите инструкцию: что делать и куда ведёт первый шаг.'],
    ['Формат рядом с основной работой', 'Разбор без увольнения, блога и своего продукта.'],
    ['Вести процесс, не светиться', 'Коротко показываем роль оператора в готовой системе.']
  ],
  noSocial: [
    ['Без сторис и ежедневного контента', 'Разбор метода без роли блогера и постоянной публичности.'],
    ['Не умеете вести соцсети? Это нормально', 'Смотрите подход без ежедневного контента, эфиров и сторис.'],
    ['Онлайн-формат без роли блогера', 'Разбор системы, где не нужно становиться публичным экспертом.'],
    ['Контент не должен держать всё на себе', 'Посмотрите другой вход без ежедневной гонки за постами.'],
    ['Не хотите жить в сторис?', 'Разбор пути без ежедневной публичности и личного бренда.'],
    ['Без эфиров, прогревов и постов каждый день', 'Посмотрите вход в систему без роли блогера.'],
    ['Соцсети не должны быть вашей работой', 'Короткий разбор подхода без постоянного контента.'],
    ['Если не хочется вести блог', 'Показываем путь, где публичность не главный инструмент.'],
    ['Не нужно становиться медиа', 'Разбор системы без сторис, эфиров и контентной гонки.'],
    ['Вход не обязан начинаться с блога', 'Посмотрите понятный путь без ежедневного контента.'],
    ['Контентная гонка надоела?', 'Короткий разбор пути без роли публичного эксперта.'],
    ['Без личного бренда и постоянных эфиров', 'Посмотрите систему, где вход строится иначе.']
  ],
  firstMoney: [
    ['Партнёрская модель без своего продукта', 'Короткий разбор модели, где понятен путь участника.'],
    ['Как устроены партнёрские заявки', 'Показываем механику входа без создания продукта с нуля.'],
    ['Первый шаг начинается со схемы', 'Разбор пути: заявки, связка и партнёрская модель.'],
    ['Без продукта, но с понятной моделью', 'Посмотрите, как устроена партнёрская программа.'],
    ['Первый шаг начинается не с курса', 'Разбор пути без долгой подготовки и своего продукта.'],
    ['С чего начинается партнёрский вход?', 'Показываем механику заявки, связки и роли участника.'],
    ['Не тетрадка, а первый понятный шаг', 'Короткий разбор входа в партнёрскую модель.'],
    ['Заявки идут через систему', 'Посмотрите, как связаны заявка, путь и партнёрская программа.'],
    ['Понятный путь участника', 'Разбор без обещаний: что делает человек и где его роль.'],
    ['Начать можно с готовой модели', 'Посмотрите партнёрский путь без создания продукта.'],
    ['Не нужно изобретать свой оффер', 'Коротко показываем модель входа через готовую систему.'],
    ['Первый шаг без своего продукта', 'Разбор партнёрской модели и понятной связки действий.']
  ],
  general: [
    ['Старый путь больше не работает?', 'Короткий разбор подхода: что это за система и с чего начинается вход.'],
    ['Есть другой вход в онлайн-систему', 'Посмотрите разбор без лишней теории, хаоса и сложных ролей.'],
    ['Понятный путь вместо хаоса', 'Разбор системы для тех, кто хочет увидеть следующий шаг.'],
    ['Сначала разбор, потом решение', 'Показываем, как устроен вход и почему он отличается от обычного обучения.'],
    ['Посмотрите путь до решения', 'Короткий разбор системы без давления и громких обещаний.'],
    ['Другой формат входа в онлайн', 'Показываем систему без хаоса, лишних ролей и долгой подготовки.'],
    ['Не усложняйте первый шаг', 'Разбор пути, где сначала становится понятно, что делать.'],
    ['Вход проще, когда видна схема', 'Посмотрите короткий разбор системы и следующего шага.'],
    ['Сначала понять связку', 'Коротко показываем, из чего состоит путь входа.'],
    ['Без лишней теории и хаоса', 'Разбор понятного пути для спокойного первого шага.'],
    ['Путь важнее мотивации', 'Посмотрите систему, где шаги и роли разложены заранее.'],
    ['Проверьте другой способ входа', 'Короткий разбор без марафона, давления и сложной терминологии.']
  ]
};

const DIRECT_RISKY_PATTERN = /(деньг|доход|зарплат|выплат|комисс|заработ|обогащ|прибыл|кредит|долги|долгов|финанс|контроль|успешн|гарант|безопасн|сделк|результат|оффер|подработ|годами)/i;

function directRowHasModerationRisk(row) {
  return DIRECT_RISKY_PATTERN.test(`${row?.[0] || ''} ${row?.[1] || ''}`);
}

function pickDirectModerationRow(pool = [], seed = '') {
  const safePool = pool.filter((row) => !directRowHasModerationRisk(row));
  const sourcePool = safePool.length ? safePool : DIRECT_MODERATION_BANK.general.filter((row) => !directRowHasModerationRisk(row));
  return pickHashed(seed, sourcePool.length ? sourcePool : DIRECT_MODERATION_BANK.general) || DIRECT_MODERATION_BANK.general[0];
}

function normalizeDirectPair(pair, headline = '', variantKey = '', angleKey = 'general') {
  const raw = {
    adTitle: trimDirectTitle(pair?.adTitle || ''),
    adText: trimDirectText(pair?.adText || ''),
    angleKey: pair?.angleKey || angleKey || 'general'
  };
  if (raw.adTitle && raw.adText && !DIRECT_RISKY_PATTERN.test(`${raw.adTitle} ${raw.adText}`)) return raw;
  return directModerationPairForAngle(angleKey || raw.angleKey || 'general', `${variantKey}|safe`, headline);
}

function directPairFromUserInput(headline = '', supportText = '', fallback = {}, angleKey = 'general') {
  const sourceHeadline = trimDirectTitle(headline || fallback?.adTitle || fallback?.headline || '');
  const sourceText = trimDirectText(
    supportText ||
    fallback?.decoration ||
    fallback?.adText ||
    methodTextForIdea(headline, '')
  );
  if (sourceHeadline && sourceText) {
    return {
      adTitle: sourceHeadline,
      adText: sourceText,
      angleKey: angleKey || fallback?.directAngleKey || directAngleKeyForHeadline(sourceHeadline)
    };
  }
  return directModerationPairForAngle(angleKey || directAngleKeyForHeadline(headline), 'manual-fallback', headline);
}

function directAngleKeyForHeadline(headline) {
  const source = String(headline || '').toLowerCase();
  if (source.includes('подработ') || source.includes('за кадр') || source.includes('основной работе')) return 'sideJob';
  if (source.includes('комис') || source.includes('изуч') && source.includes('дела')) return 'commission';
  if (source.includes('сделк') || source.includes('29') || source.includes('5000') || source.includes('выплат')) return 'firstMoney';
  if (source.includes('курс') || source.includes('обуч') || source.includes('учит') || source.includes('пробовал')) return 'courses';
  if (source.includes('сторис') || source.includes('соцсет') || source.includes('контент')) return 'noSocial';
  if (source.includes('сам') || source.includes('разбират') || source.includes('продукт') || source.includes('блог') || source.includes('команд')) return 'noProduct';
  if (source.includes('зарплат') || source.includes('найм') || source.includes('работ')) return 'salary';
  if (source.includes('тревог') || source.includes('опор') || source.includes('деньг')) return 'anxiety';
  return 'general';
}

function directModerationPairForAngle(angleKey = 'general', variantKey = '', headline = '') {
  const key = DIRECT_MODERATION_BANK[angleKey] ? angleKey : directAngleKeyForHeadline(headline);
  const pool = DIRECT_MODERATION_BANK[key] || DIRECT_MODERATION_BANK.general;
  const picked = pickDirectModerationRow(pool, `${headline}|${key}|${variantKey}`) || pool[0];
  return {
    adTitle: trimDirectTitle(picked[0]),
    adText: trimDirectText(picked[1]),
    angleKey: key
  };
}

function directModerationPairForHeadline(headline, variantKey = '') {
  return directModerationPairForAngle(directAngleKeyForHeadline(headline), variantKey, headline);
}

function buildDirectCampaignVariants(headline, variantKey = '', primaryAngleKey = '') {
  const cleanHeadline = String(headline || '').trim();
  const primary = DIRECT_MODERATION_BANK[primaryAngleKey] ? primaryAngleKey : directAngleKeyForHeadline(cleanHeadline);
  const pool = DIRECT_MODERATION_BANK[primary] || DIRECT_MODERATION_BANK.general;
  const seen = new Set();
  const offset = hashText(`${cleanHeadline}|${variantKey}|${primary}|direct-matrix`) % pool.length;
  const rows = pool
    .map((_, index) => pool[(offset + index) % pool.length])
    .map((picked, index) => {
      if (directRowHasModerationRisk(picked)) return null;
      const adTitle = trimDirectTitle(picked?.[0]);
      const adText = trimDirectText(picked?.[1]);
      const uniqueKey = `${adTitle.toLowerCase()}|${adText.toLowerCase()}`;
      if (!adTitle || !adText || seen.has(uniqueKey)) return null;
      seen.add(uniqueKey);
      return {
        id: `${primary}-${index}`,
        angleKey: primary,
        adTitle,
        adText
      };
    })
    .filter(Boolean);

  return rows;
}

function formatDirectCampaignVariants(variants = []) {
  return variants
    .map((variant, index) => [
      `Вариант ${index + 1}`,
      `Заголовок: ${variant.adTitle}`,
      `Текст: ${variant.adText}`
    ].join('\n'))
    .join('\n\n');
}

function adTextForHeadline(headline, variantKey = '') {
  return directModerationPairForHeadline(headline, variantKey).adText;
}

function buildPrelandingPainItems(headline) {
  const source = String(headline || '').toLowerCase();
  if (source.includes('подработ') || source.includes('за кадр') || source.includes('основной работе')) {
    return [
      'Не хочется уходить с основной работы вслепую',
      'Нужна роль без публичности и сложного запуска',
      'Важно понять процесс до первого шага'
    ];
  }
  if (source.includes('курс') || source.includes('обуч') || source.includes('учит')) {
    return [
      'Покупаете обучение, но деньги не приходят',
      'Готовитесь месяцами вместо нормального старта',
      'Нужен не ещё один курс, а рабочая схема'
    ];
  }
  if (source.includes('комис') || source.includes('сделк') || source.includes('29') || source.includes('5000')) {
    return [
      'Не хочется городить свой продукт с нуля',
      'Нужен понятный путь к первым выплатам',
      'Важно видеть, за что именно приходят деньги'
    ];
  }
  if (source.includes('сам') || source.includes('разбират') || source.includes('продукт') || source.includes('блог')) {
    return [
      'Не хочется тащить маркетинг, контент и продажи одному',
      'Нужен путь, где уже есть готовая система',
      'Важно не усложнять там, где можно зайти проще'
    ];
  }
  if (source.includes('найм') || source.includes('зарплат') || source.includes('работ')) {
    return [
      'Один источник дохода постоянно держит в напряжении',
      'Свободного времени мало, а сил на сложные схемы нет',
      'Нужен запасной путь, который можно понять быстро'
    ];
  }
  if (source.includes('тревог') || source.includes('опор') || source.includes('деньг')) {
    return [
      'Деньги постоянно давят и забирают внимание',
      'Хочется не мотивации, а нормальной опоры',
      'Нужен понятный следующий шаг без хаоса'
    ];
  }
  return [
    'Старый способ уже не даёт спокойного результата',
    'Времени на очередной круг подготовки больше нет',
    'Нужен короткий вход в понятную рабочую систему'
  ];
}

function buildPrelandingValueItems(headline) {
  const source = String(headline || '').toLowerCase();
  if (source.includes('подработ') || source.includes('за кадр') || source.includes('основной работе')) {
    return [
      'Как выглядит роль оператора за кадром',
      'Что именно нужно контролировать в процессе',
      'Как перейти к инструкции через мессенджер'
    ];
  }
  if (source.includes('курс') || source.includes('обуч') || source.includes('учит')) {
    return [
      'Почему учеба без схемы не превращается в доход',
      'Как устроен вход в готовую систему без роли эксперта',
      'Что делать дальше, чтобы не уйти ещё в один круг подготовки'
    ];
  }
  if (source.includes('комис') || source.includes('сделк') || source.includes('29') || source.includes('5000')) {
    return [
      'Откуда берутся партнёрские выплаты и за что они приходят',
      'Почему тут не нужен свой продукт и долгий запуск',
      'Как быстро понять механику входа'
    ];
  }
  if (source.includes('сам') || source.includes('разбират') || source.includes('продукт') || source.includes('блог')) {
    return [
      'Что в этой схеме уже собрано вместо вас',
      'Почему тут не нужно быть блогером или экспертом',
      'Как быстро понять механику и перейти к следующему шагу'
    ];
  }
  if (source.includes('найм') || source.includes('зарплат') || source.includes('работ')) {
    return [
      'Как выглядит запасной путь без новой профессии',
      'Почему здесь не нужно годами перестраивать всю жизнь',
      'Где посмотреть разбор и понять следующий шаг'
    ];
  }
  if (source.includes('тревог') || source.includes('опор') || source.includes('деньг')) {
    return [
      'Как собрать финансовую опору без хаоса и перегруза',
      'Почему здесь важна схема, а не вдохновляющие обещания',
      'Где посмотреть разбор и понять следующий шаг'
    ];
  }
  return [
    'Что именно человек должен понять за первые минуты',
    'Почему этот вход отличается от обычного обучения',
    'Как перейти к следующему шагу без лишних кругов'
  ];
}

function buildPrelandingFinalTitle(headline) {
  return '';
}

function buildPrelandingFinalCopy(headline) {
  return '';
}

function pickThreeCards(seed, pool) {
  const left = [...pool];
  const result = [];
  for (let index = 0; index < 3 && left.length; index += 1) {
    const picked = pickHashed(`${seed}|card|${index}`, left);
    result.push(picked);
    left.splice(left.indexOf(picked), 1);
  }
  return result;
}

function buildPrelandingStoryCards(headline, variantKey = '') {
  const source = String(headline || '').toLowerCase();
  const seed = `${headline}|${variantKey || Date.now()}`;
  if (source.includes('курс') || source.includes('обуч') || source.includes('учит')) {
    return pickThreeCards(seed, [
      { title: 'Без новых курсов', text: 'Сначала механика и путь, а не ещё одна папка с уроками.' },
      { title: 'Есть готовая связка', text: 'Баннер, посадочная и бот работают как один вход.' },
      { title: 'Понятно, куда идти', text: 'Видно, что делать дальше, без догадок и лишних кругов.' },
      { title: 'Не ещё один урок', text: 'Сначала понятный вход, потом действие.' },
      { title: 'Выход из учебного круга', text: 'Без вечной подготовки ради подготовки.' },
      { title: 'Меньше теории', text: 'Разбор собран вокруг следующего шага.' }
    ]);
  }
  if (source.includes('комис') || source.includes('сделк') || source.includes('29') || source.includes('5000') || source.includes('выплат')) {
    return pickThreeCards(seed, [
      { title: 'Без своего продукта', text: 'Не нужно собирать запуск и воронку с нуля.' },
      { title: 'Есть понятная связка', text: 'Показываем, как соединены посадочная и бот.' },
      { title: 'Легче начать', text: 'Первый шаг открывается сразу после выбора мессенджера.' },
      { title: 'Без запуска с нуля', text: 'Вход не завязан на своём продукте.' },
      { title: 'Путь виден', text: 'Понятно, куда идти после клика.' },
      { title: 'Связка готова', text: 'Посадочная и бот работают вместе.' }
    ]);
  }
  if (source.includes('сторис') || source.includes('соцсет') || source.includes('контент')) {
    return pickThreeCards(seed, [
      { title: 'Без ежедневных сторис', text: 'Система работает без публичной роли и постов каждый день.' },
      { title: 'Есть готовая система', text: 'Не нужно строить личный бренд с нуля.' },
      { title: 'Понятный вход', text: 'Первое действие — разбор в мессенджере без лишних шагов.' },
      { title: 'Без роли блогера', text: 'Не нужно жить в контенте каждый день.' },
      { title: 'Система вместо постов', text: 'Упор на связку, а не на ленту.' },
      { title: 'Первый шаг ясен', text: 'Разбор открывается в мессенджере.' }
    ]);
  }
  if (source.includes('сам') || source.includes('разбират') || source.includes('продукт') || source.includes('блог')) {
    return pickThreeCards(seed, [
      { title: 'Не одному', text: 'Разбор ведёт по шагам, без одиночного блуждания.' },
      { title: 'Есть путь', text: 'Убираем лишние варианты и оставляем рабочую последовательность.' },
      { title: 'Понятный вход', text: 'Первое действие открывается сразу после выбора мессенджера.' },
      { title: 'Без хаоса', text: 'Не надо собирать всё из разных кусков.' },
      { title: 'Связка готова', text: 'Есть понятный первый экран и следующий шаг.' },
      { title: 'Дальше понятно', text: 'Меньше догадок, больше пути.' }
    ]);
  }
  if (source.includes('найм') || source.includes('зарплат') || source.includes('работ')) {
    return pickThreeCards(seed, [
      { title: 'Не только зарплата', text: 'Не вместо жизни, а как запасной путь к действиям.' },
      { title: 'Есть запасной путь', text: 'Видно, что делать дальше, без переучивания с нуля.' },
      { title: 'С чего начать', text: 'Старт через короткий разбор в выбранном мессенджере.' },
      { title: 'Без новой профессии', text: 'Вход не требует годами перестраивать жизнь.' },
      { title: 'Путь рядом', text: 'Понятно, куда смотреть первым.' },
      { title: 'Меньше зависимости', text: 'Не всё упирается в один источник.' }
    ]);
  }
  if (source.includes('тревог') || source.includes('опор') || source.includes('деньг')) {
    return pickThreeCards(seed, [
      { title: 'Меньше хаоса', text: 'Деньги перестают быть набором случайных попыток.' },
      { title: 'Есть спокойный путь', text: 'Видно, куда идти и что проверять первым.' },
      { title: 'Первый шаг понятен', text: 'Старт через короткий разбор в мессенджере.' },
      { title: 'Больше опоры', text: 'Фокус на пути, а не на панике.' },
      { title: 'Без суеты', text: 'Короткий вход вместо долгой подготовки.' },
      { title: 'Система видна', text: 'Понятно, как устроен следующий шаг.' }
    ]);
  }
  return pickThreeCards(seed, [
    { title: 'Не одному', text: 'Разбор ведёт по шагам, без одиночного блуждания.' },
    { title: 'Есть путь', text: 'Без хаоса и догадок — видно следующий шаг.' },
    { title: 'Понятный вход', text: 'Первое действие открывается сразу в мессенджере.' },
    { title: 'Связка готова', text: 'Старт без сборки всего с нуля.' },
    { title: 'Меньше лишнего', text: 'Оставляем только то, что ведёт дальше.' },
    { title: 'Первый шаг ясен', text: 'Разбор открывается после выбора мессенджера.' }
  ]);
}

function buildPrelandingCtaLead(headline, methodName) {
  const source = String(headline || '').toLowerCase();
  if (source.includes('курс') || source.includes('обуч') || source.includes('учит')) {
    return 'Короткий разбор для тех, кто устал от очередного курса: показываем, как устроен другой вход — без бесконечной подготовки, без роли эксперта и без хаоса на старте.';
  }
  if (source.includes('комис') || source.includes('сделк') || source.includes('29') || source.includes('5000') || source.includes('выплат')) {
    return 'Показываем механику партнёрских выплат: как это работает без своего продукта, без долгого запуска и без продаж в лоб. Первый разбор открывается в выбранном мессенджере.';
  }
  if (source.includes('сторис') || source.includes('соцсет') || source.includes('контент')) {
    return 'Смотрите, как устроена система без ежедневного контента и роли публичного эксперта. Разбор открывается за одно нажатие без лишних регистраций.';
  }
  if (source.includes('сам') || source.includes('разбират') || source.includes('продукт') || source.includes('блог')) {
    return 'Смотрите, как устроена готовая система без роли эксперта, ежедневного контента и самостоятельной сборки воронки с нуля. Разбор открывается за одно нажатие.';
  }
  if (source.includes('найм') || source.includes('зарплат') || source.includes('работ')) {
    return 'Формат запасного пути: не новая профессия, не сложная схема, а понятный вход в готовую систему. Разбор занимает короткий разбор — смотрите в любом мессенджере.';
  }
  if (source.includes('тревог') || source.includes('опор') || source.includes('деньг')) {
    return 'Разбор для тех, кому нужна финансовая опора, а не мотивационные обещания: покажем путь без хаоса и лишних ролей, с понятным первым шагом.';
  }
  return 'Собрали короткий путь без лишней теории: сначала понять механику, потом перейти к следующему шагу в выбранном мессенджере.';
}

function buildPrelandingProofItems(headline, methodName = '', variantKey = '') {
  const source = `${String(headline || '')} ${String(methodName || '')}`.toLowerCase();
  const seed = `${headline}|${methodName}|${variantKey || Date.now()}|proof`;
  if (source.includes('курс') || source.includes('обуч') || source.includes('учит') || source.includes('покуп')) {
    return pickThreeCards(seed, [
      { value: 'Без курса', label: 'сначала механика' },
      { value: 'Путь', label: 'без учебного круга' },
      { value: 'Связка', label: 'вместо разрозненных уроков' },
      { value: 'Вход', label: 'через короткий разбор' },
      { value: 'короткий разбор', label: 'понять суть' },
      { value: 'Метод', label: 'без бесконечной подготовки' }
    ]);
  }
  if (source.includes('комис') || source.includes('сделк') || source.includes('29') || source.includes('5000') || source.includes('выплат') || source.includes('партн')) {
    return pickThreeCards(seed, [
      { value: 'Без продукта', label: 'не нужен свой запуск' },
      { value: 'Связка', label: 'посадочная и бот вместе' },
      { value: 'Партнерка', label: 'понятная механика выплат' },
      { value: 'Бот', label: 'следующий шаг внутри' },
      { value: 'Вход', label: 'без продаж в лоб' },
      { value: 'Разбор', label: 'коротко и по делу' }
    ]);
  }
  if (source.includes('сторис') || source.includes('соцсет') || source.includes('контент') || source.includes('блог')) {
    return pickThreeCards(seed, [
      { value: 'Без сторис', label: 'не жить в контенте' },
      { value: 'Без блога', label: 'без публичной роли' },
      { value: 'Система', label: 'вместо ежедневных постов' },
      { value: 'Связка', label: 'не личный бренд с нуля' },
      { value: 'Вход', label: 'через мессенджер' },
      { value: 'Бот', label: 'покажет следующий шаг' }
    ]);
  }
  if (source.includes('найм') || source.includes('зарплат') || source.includes('работ')) {
    return pickThreeCards(seed, [
      { value: 'Не найм', label: 'без новой профессии' },
      { value: 'Опора', label: 'не один источник' },
      { value: 'Путь', label: 'видно куда идти' },
      { value: 'Запасной', label: 'параллельный путь' },
      { value: 'Вход', label: 'понятный старт' },
      { value: 'короткий разбор', label: 'первый разбор' }
    ]);
  }
  if (source.includes('тревог') || source.includes('опор') || source.includes('деньг') || source.includes('хаос') || source.includes('доход')) {
    return pickThreeCards(seed, [
      { value: 'Опора', label: 'меньше хаоса' },
      { value: 'Путь', label: 'что делать дальше' },
      { value: 'Система', label: 'не случайные попытки' },
      { value: 'Спокойнее', label: 'без мотивационного шума' },
      { value: 'Вход', label: 'через короткий разбор' },
      { value: 'короткий разбор', label: 'понять механику' }
    ]);
  }
  return pickThreeCards(seed, [
    { value: 'Суть', label: 'без лишней теории' },
    { value: 'Путь', label: 'понятный следующий шаг' },
    { value: 'Вход', label: 'через мессенджер' },
    { value: 'Метод', label: 'что работает внутри' },
    { value: 'Логика', label: 'без догадок' },
    { value: 'Разбор', label: 'коротко и по делу' }
  ]);
}

const PRELANDING_SEMANTIC_MATRIX = {
  course_fatigue: {
    cards: [
      { title: 'Без новых курсов', text: 'Сначала механика и путь, а не ещё одна папка с уроками.' },
      { title: 'Связка вместо уроков', text: 'Показываем, как посадочная и бот ведут к следующему шагу.' },
      { title: 'Выход из круга', text: 'Не готовиться бесконечно, а понять первый вход.' },
      { title: 'Меньше теории', text: 'Разбор собран вокруг действия, а не конспекта.' },
      { title: 'Понятный путь', text: 'Видно, что делать дальше без догадок.' },
      { title: 'Старт сегодня', text: 'Короткий разбор открывается в мессенджере.' }
    ],
    proofItems: [
      { value: 'Без курса', label: 'сначала механика' },
      { value: 'Связка', label: 'вместо уроков' },
      { value: 'Путь', label: 'куда идти дальше' },
      { value: 'Вход', label: 'через разбор' },
      { value: 'Метод', label: 'без учебного круга' },
      { value: 'короткий разбор', label: 'понять суть' }
    ]
  },
  salary_dependency: {
    cards: [
      { title: 'Альтернатива найму', text: 'Сначала проверить путь, не ломая текущую работу.' },
      { title: 'Запасной путь', text: 'Понятно, куда смотреть помимо привычного графика.' },
      { title: 'Без новой профессии', text: 'Вход не требует годами переучиваться.' },
      { title: 'Меньше зависимости', text: 'Не всё держится на одном рабочем сценарии.' },
      { title: 'Проверить сначала', text: 'Короткий разбор до любых резких решений.' },
      { title: 'Первый шаг ясен', text: 'Разбор открывается после выбора мессенджера.' }
    ],
    proofItems: [
      { value: 'Не найм', label: 'есть другой путь' },
      { value: 'Запасной', label: 'параллельный путь' },
      { value: 'Проверка', label: 'до резких решений' },
      { value: 'Путь', label: 'понятный вход' },
      { value: 'Вход', label: 'без новой профессии' },
      { value: 'короткий разбор', label: 'первый разбор' }
    ]
  },
  money_anxiety: {
    cards: [
      { title: 'Меньше хаоса', text: 'Деньги перестают быть набором случайных попыток.' },
      { title: 'Финансовая опора', text: 'Сначала понятный путь, а не обещания и давление.' },
      { title: 'Понятный первый шаг', text: 'Видно, что проверить первым.' },
      { title: 'Без паники', text: 'Короткий разбор возвращает порядок в действия.' },
      { title: 'Путь виден', text: 'Не нужно собирать решение по разным кускам.' },
      { title: 'Спокойнее с деньгами', text: 'Фокус на системе, а не на тревоге.' }
    ],
    proofItems: [
      { value: 'Опора', label: 'меньше хаоса' },
      { value: 'Путь', label: 'что делать дальше' },
      { value: 'Порядок', label: 'вместо паники' },
      { value: 'Система', label: 'не случайные попытки' },
      { value: 'Вход', label: 'через короткий разбор' },
      { value: 'короткий разбор', label: 'понять механику' }
    ]
  },
  remote_freedom: {
    cards: [
      { title: 'Без офиса', text: 'Путь можно изучить из любого удобного места.' },
      { title: 'Свой ритм', text: 'Сначала короткий разбор, без жёсткой привязки к графику.' },
      { title: 'Доступ рядом', text: 'Первый шаг открывается прямо в мессенджере.' },
      { title: 'Из дома тоже можно', text: 'Важна связка, а не место за рабочим столом.' },
      { title: 'Без лишней дороги', text: 'Смотрите механику там, где удобно.' },
      { title: 'Понятный формат', text: 'Не нужно перестраивать весь день ради первого шага.' }
    ],
    proofItems: [
      { value: 'Без офиса', label: 'не привязано к месту' },
      { value: 'Ритм', label: 'удобный формат' },
      { value: 'Доступ', label: 'в мессенджере' },
      { value: 'Путь', label: 'видно дальше' },
      { value: 'Связка', label: 'работает вместе' },
      { value: 'Вход', label: 'первый шаг' }
    ]
  },
  no_product_commissions: {
    cards: [
      { title: 'Без своего продукта', text: 'Не нужно собирать запуск и оффер с нуля.' },
      { title: 'Понятная связка', text: 'Посадочная и бот ведут человека по одному пути.' },
      { title: 'Механика выплат', text: 'Сначала принцип, потом следующий шаг.' },
      { title: 'Без продаж в лоб', text: 'Вход строится через короткий разбор.' },
      { title: 'Путь собран', text: 'Меньше ручной сборки и случайных действий.' },
      { title: 'Старт проще', text: 'Первое действие открывается в мессенджере.' }
    ],
    proofItems: [
      { value: 'Без продукта', label: 'не нужен свой запуск' },
      { value: 'Связка', label: 'посадочная и бот' },
      { value: 'Партнерка', label: 'логика выплат' },
      { value: 'Бот', label: 'следующий шаг' },
      { value: 'Вход', label: 'без продаж в лоб' },
      { value: 'Разбор', label: 'коротко и по делу' }
    ]
  },
  no_public_role: {
    cards: [
      { title: 'Без роли блогера', text: 'Не нужно жить в сторис каждый день.' },
      { title: 'Без публичности', text: 'Фокус на связке, а не на личной витрине.' },
      { title: 'Система вместо постов', text: 'Показываем путь без контентной гонки.' },
      { title: 'Не надо светить лицо', text: 'Первый вход не держится на публичной роли.' },
      { title: 'Связка работает', text: 'Посадочная и бот берут на себя путь.' },
      { title: 'Первый шаг ясен', text: 'Разбор открывается в выбранном мессенджере.' }
    ],
    proofItems: [
      { value: 'Без сторис', label: 'не жить в контенте' },
      { value: 'Без блога', label: 'без публичной роли' },
      { value: 'Система', label: 'вместо постов' },
      { value: 'Инкогнито', label: 'без лишней витрины' },
      { value: 'Связка', label: 'не личный бренд' },
      { value: 'Вход', label: 'через мессенджер' }
    ]
  },
  system_blueprint: {
    cards: [
      { title: 'Механика видна', text: 'Понятно, как части соединяются в один путь.' },
      { title: 'Без хаоса', text: 'Убираем лишние варианты и оставляем последовательность.' },
      { title: 'Связка в сборе', text: 'Баннер, посадочная и бот работают вместе.' },
      { title: 'Логика понятна', text: 'Сначала принцип, потом следующий шаг.' },
      { title: 'Путь собран', text: 'Не нужно искать куски по разным местам.' },
      { title: 'Старт проще', text: 'Переход открывает короткий разбор.' }
    ],
    proofItems: [
      { value: 'Механика', label: 'как устроен вход' },
      { value: 'Связка', label: 'всё в одном пути' },
      { value: 'Путь', label: 'без догадок' },
      { value: 'Система', label: 'в сборе' },
      { value: 'Логика', label: 'что за чем' },
      { value: 'Вход', label: 'следующий шаг' }
    ]
  },
  direct_reset: {
    cards: [
      { title: 'Хватит ждать', text: 'Сначала проверить механику, потом решать.' },
      { title: 'Без обещаний', text: 'Смотрим на путь, а не на мотивационный шум.' },
      { title: 'Старый круг виден', text: 'Понятно, почему прежний сценарий не двигает дальше.' },
      { title: 'Факты вместо тумана', text: 'Короткий разбор показывает суть.' },
      { title: 'Проверить вход', text: 'Следующий шаг открывается в мессенджере.' },
      { title: 'Решение рядом', text: 'Не через год, а после первого разбора.' }
    ],
    proofItems: [
      { value: 'Стоп', label: 'старому кругу' },
      { value: 'Факты', label: 'без тумана' },
      { value: 'Действие', label: 'сейчас' },
      { value: 'Вход', label: 'проверить путь' },
      { value: 'Разбор', label: 'короткий формат' },
      { value: 'Решение', label: 'после проверки' }
    ]
  },
  messenger_native: {
    cards: [
      { title: 'Сразу в мессенджер', text: 'Не нужно проходить лишние формы и регистрации.' },
      { title: 'Бот ведёт дальше', text: 'Следующий шаг открывается внутри выбранного канала.' },
      { title: 'Короткий вход', text: 'Разбор без длинной подготовки.' },
      { title: 'Путь в одном месте', text: 'Не нужно искать продолжение вручную.' },
      { title: 'Без суеты', text: 'Клик ведёт к первому понятному действию.' },
      { title: 'Понятно дальше', text: 'После перехода человек видит следующий шаг.' }
    ],
    proofItems: [
      { value: 'Бот', label: 'ведёт дальше' },
      { value: 'Вход', label: 'в один клик' },
      { value: 'Разбор', label: 'в мессенджере' },
      { value: 'Путь', label: 'без лишних форм' },
      { value: 'Старт', label: 'сразу открыт' },
      { value: 'Связка', label: 'посадочная и бот' }
    ]
  },
  default_route: {
    cards: [
      { title: 'Суть без шума', text: 'Короткий разбор вместо лишней теории.' },
      { title: 'Есть путь', text: 'Понятно, что смотреть первым.' },
      { title: 'Понятный вход', text: 'Следующий шаг открывается в мессенджере.' },
      { title: 'Меньше лишнего', text: 'Оставляем только то, что ведёт дальше.' },
      { title: 'Связка готова', text: 'Старт без сборки всего с нуля.' },
      { title: 'Дальше ясно', text: 'Без догадок и хаоса на старте.' }
    ],
    proofItems: [
      { value: 'Суть', label: 'без лишней теории' },
      { value: 'Путь', label: 'понятный шаг' },
      { value: 'Вход', label: 'через мессенджер' },
      { value: 'Метод', label: 'что внутри' },
      { value: 'Логика', label: 'без догадок' },
      { value: 'Разбор', label: 'коротко' }
    ]
  }
};

function pickPrelandingSemanticToken({ headline = '', methodName = '', concept = null, visualMode = '' } = {}) {
  const source = `${String(headline || '')} ${String(methodName || '')} ${String(concept?.id || '')} ${String(concept?.label || '')}`.toLowerCase();
  if (/курс|обуч|учишь|урок|инфобиз|покуп/.test(source)) return 'course_fatigue';
  if (/комис|выплат|партн|сделк|продаж|продукт/.test(source)) return 'no_product_commissions';
  if (/соцсет|сторис|контент|блог|лиц|публич|эксперт/.test(source) || visualMode === 'noPerson' || visualMode === 'metaphor') return 'no_public_role';
  if (/удален|удалён|фриланс|из дома|дома|домашн|свободн|график|офис/.test(source)) return 'remote_freedom';
  if (/найм|зарплат|работ|начальник|смен[ау]|график/.test(source)) return 'salary_dependency';
  if (/тревог|деньг|доход|опор|хаос|кредит|долг|минус|не хватает/.test(source)) return 'money_anxiety';
  if (/blueprint|terminal|behind|system|механ|систем|связк|воронк/.test(source)) return 'system_blueprint';
  if (/brutal|ultimatum|fomo|shock|strike|манифест|ультимат/.test(source)) return 'direct_reset';
  if (/diary|messenger|native|бот|мессендж/.test(source)) return 'messenger_native';
  return 'default_route';
}

function buildPrelandingSemanticContent({ headline = '', methodName = '', concept = null, variantKey = '', visualMode = '' } = {}) {
  const semanticConceptId = pickPrelandingSemanticToken({ headline, methodName, concept, visualMode });
  const safeGroup = PRELANDING_SEMANTIC_MATRIX[semanticConceptId] || PRELANDING_SEMANTIC_MATRIX.default_route;
  const seed = `${headline}|${methodName}|${concept?.id || ''}|${variantKey || Date.now()}|${semanticConceptId}`;
  return {
    semanticConceptId,
    cards: pickThreeCards(`${seed}|cards`, safeGroup.cards),
    proofItems: pickThreeCards(`${seed}|proof`, safeGroup.proofItems)
  };
}

function trimDirectTitle(value, max = 56) {
  const clean = String(value || '').replace(/[—–]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 32 ? cut.slice(0, lastSpace) : clean.slice(0, max)).trim()}`;
}

function humanizeImageWarning(warning) {
  const text = String(warning || '');
  if (!text) return '';
  if (text.includes('429') || text.includes('1015') || /rate|limit/i.test(text)) {
    return 'OpenAI временно ограничил генерацию картинки. Подожди 30-60 секунд и нажми “Повторить генерацию”. Скачивание и воронка откроются только после готовой AI-картинки.';
  }
  return text;
}

function directTitleForHeadline(headline, variantKey = '') {
  return directModerationPairForHeadline(headline, variantKey).adTitle;
}

function buildPrelandingSync(idea, prelandingConcept = null) {
  const methodName = methodTextForIdea(idea.headline, idea.decoration);
  const templateId = (hashText(`${idea.variantKey || ''}|${idea.headline || ''}|prelanding-template`) % 3) + 1;
  const campaignLanding = buildCampaignLandingLogic({
    title: idea.headline,
    text: methodName,
    mode: 'heroBlocks'
  });
  const semanticContent = buildPrelandingSemanticContent({
    headline: idea.headline,
    methodName,
    concept: prelandingConcept,
    variantKey: idea.variantKey || '',
    visualMode: idea.resolvedVisualMode || ''
  });
  const cards = campaignLanding.cards?.length
    ? campaignLanding.cards
    : semanticContent.cards?.length
      ? semanticContent.cards
      : buildPrelandingStoryCards(idea.headline, idea.variantKey || '');
  const proofItems = semanticContent.proofItems?.length
    ? semanticContent.proofItems
    : buildPrelandingProofItems(idea.headline, methodName, idea.variantKey || '');
  const ctaLead = buildPrelandingCtaLead(idea.headline, methodName);
  return {
    fromBanner: true,
    templateId,
    badge: campaignLanding.badge,
    titleHtml: accentHeadline(idea.headline),
    pills: [],
    painTitle: campaignLanding.label,
    painItems: campaignLanding.painItems,
    painAlert: methodName,
    trustTitle: methodName,
    trustSmall: campaignLanding.trustSmall,
    valueTitle: campaignLanding.valueTitle,
    valueItems: campaignLanding.valueItems,
    methodName: campaignLanding.methodName,
    actionTitle: campaignLanding.actionTitle,
    actionSubtitle: campaignLanding.actionSubtitle,
    ctaLead: campaignLanding.ctaLead || ctaLead,
    ctaSub: '',
    ribbon: prelandingKickerForHeadline(idea.headline),
    finalTitle: buildPrelandingFinalTitle(idea.headline),
    finalCopy: '',
    cards,
    flowItems: cards,
    proofItems,
    semanticConceptId: campaignLanding.semanticId || semanticContent.semanticConceptId,
    telegramLabel: 'Начать разбор в Telegram',
    maxLabel: 'Начать разбор в MAX'
  };
}

function buildCoreMethodPrelandingSync(templateId) {
  const safeTemplateId = [1, 2, 3].includes(Number(templateId)) ? Number(templateId) : 1;
  return {
    fromBanner: false,
    prelandingMode: 'coreMethod',
    templateId: safeTemplateId,
    telegramLabel: 'Начать разбор в Telegram',
    maxLabel: 'Начать разбор в MAX'
  };
}

function hashText(value = '') {
  return Array.from(String(value)).reduce((hash, char) => {
    hash ^= char.charCodeAt(0);
    return Math.imul(hash, 16777619);
  }, 2166136261) >>> 0;
}

function pickHashed(headline, options) {
  if (!options?.length) return undefined;
  return options[Math.abs(hashText(headline)) % options.length] || options[0];
}

function makeGenerationVariantKey(prefix = 'variant') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const VISUAL_MEMORY_KEY = 'constructorVisualMemory';
const VISUAL_ROTATION_KEY = 'constructorVisualRotationIndex';
const PRELANDING_VISUAL_ROTATION_KEY = 'constructorPrelandingVisualRotationIndex';

const BANNER_VISUAL_SEQUENCE = [
  { persona: 'man', visualMode: 'generatedPerson', sceneTheme: 'premiumDrive', styleHints: ['whiteGoldPremium', 'blackRed', 'redWhite', 'glassPremium'], label: 'мужчина в костюме у премиального автомобиля' },
  { persona: 'woman', visualMode: 'generatedPerson', sceneTheme: 'seaEscape', styleHints: ['redWhite', 'whiteGoldPremium', 'blueTrust', 'cleanSystem'], label: 'женщина у моря или на светлой марине' },
  { persona: 'man', visualMode: 'generatedPerson', sceneTheme: 'offroadAdventure', styleHints: ['greenSystem', 'outdoorFreedom', 'darkOrange', 'blackRed'], label: 'мужчина у внедорожника и лагеря' },
  { persona: 'woman', visualMode: 'generatedPerson', sceneTheme: 'cityMomentum', styleHints: ['redWhite', 'blueTrust', 'blackRed', 'cleanSystem'], label: 'женщина в энергичном городском движении' },
  { persona: 'mixed', visualMode: 'noPerson', sceneTheme: 'seaEscape', styleHints: ['blueTrust', 'whiteGoldPremium', 'redWhite'], label: 'морской визуал без человека' },
  { persona: 'man', visualMode: 'generatedPerson', sceneTheme: 'cozyHome', styleHints: ['greenSystem', 'redWhite', 'whiteGoldPremium'], label: 'мужчина в светлом доме' },
  { persona: 'woman', visualMode: 'generatedPerson', sceneTheme: 'premiumDrive', styleHints: ['blackRed', 'whiteGoldPremium', 'glassPremium'], label: 'женщина в премиальном городском кадре' },
  { persona: 'man', visualMode: 'generatedPerson', sceneTheme: 'nature', styleHints: ['greenSystem', 'darkYellow', 'outdoorFreedom'], label: 'мужчина в природном приключении' },
  { persona: 'mixed', visualMode: 'metaphor', sceneTheme: 'cityMomentum', styleHints: ['blackRed', 'redWhite', 'glassPremium'], label: 'городская динамика без портретного клише' },
  { persona: 'woman', visualMode: 'generatedPerson', sceneTheme: 'offroadAdventure', styleHints: ['greenSystem', 'outdoorFreedom', 'darkOrange'], label: 'женщина в outdoor-сцене' },
  { persona: 'man', visualMode: 'generatedPerson', sceneTheme: 'seaEscape', styleHints: ['blueTrust', 'redWhite', 'whiteGoldPremium'], label: 'мужчина на море' },
  { persona: 'mixed', visualMode: 'generatedPerson', sceneTheme: 'premiumDrive', styleHints: ['blackRed', 'whiteGoldPremium', 'greenSystem'], label: 'премиальная сцена другого визуального кода' }
];

const PRELANDING_VISUAL_SEQUENCE = [
  { persona: 'man', visualMode: 'generatedPerson', sceneTheme: 'cityLifestyle', styleHints: ['blueTrust', 'cleanSystem', 'whiteGoldPremium'], label: 'мужчина в городе, движение и свет' },
  { persona: 'woman', visualMode: 'generatedPerson', sceneTheme: 'nature', styleHints: ['outdoorFreedom', 'whiteGoldPremium', 'greenSystem'], label: 'женщина на природе, воздух и опора' },
  { persona: 'mixed', visualMode: 'noPerson', sceneTheme: 'office', styleHints: ['blueprintTech', 'cleanSystem', 'glassPremium'], label: 'система без лица, предметная механика' },
  { persona: 'man', visualMode: 'generatedPerson', sceneTheme: 'travel', styleHints: ['outdoorFreedom', 'blueTrust', 'whiteGoldPremium'], label: 'мужчина в пути, путь и решение' },
  { persona: 'woman', visualMode: 'generatedPerson', sceneTheme: 'cityLifestyle', styleHints: ['redWhite', 'cleanSystem', 'whiteGoldPremium'], label: 'женщина в светлом городе или кафе' },
  { persona: 'mixed', visualMode: 'metaphor', sceneTheme: 'nature', styleHints: ['outdoorFreedom', 'glassPremium', 'kineticColor'], label: 'метафора выхода без портрета' },
  { persona: 'man', visualMode: 'generatedPerson', sceneTheme: 'cityLifestyle', styleHints: ['whiteGoldPremium', 'greenSystem', 'cleanSystem'], label: 'мужчина в светлом городе, спокойствие и ясность' },
  { persona: 'woman', visualMode: 'generatedPerson', sceneTheme: 'travel', styleHints: ['outdoorFreedom', 'blueTrust', 'whiteGoldPremium'], label: 'женщина в движении и новом пути' },
  { persona: 'mixed', visualMode: 'noPerson', sceneTheme: 'travel', styleHints: ['glassPremium', 'cleanSystem', 'blueTrust'], label: 'путь, дверь или путь без человека' },
  { persona: 'man', visualMode: 'generatedPerson', sceneTheme: 'cityLifestyle', styleHints: ['blueTrust', 'greenSystem', 'cleanSystem'], label: 'мужчина в живом деле без тёмной мастерской' },
  { persona: 'woman', visualMode: 'generatedPerson', sceneTheme: 'pets', styleHints: ['greenSystem', 'whiteGoldPremium', 'messengerNative'], label: 'женщина в тёплой сцене с питомцем' },
  { persona: 'mixed', visualMode: 'generatedPerson', sceneTheme: 'office', styleHints: ['blueTrust', 'cleanSystem', 'glassPremium'], label: 'рабочая сцена без старой мастерской' },
  { persona: 'man', visualMode: 'generatedPerson', sceneTheme: 'nature', styleHints: ['outdoorFreedom', 'whiteGoldPremium', 'greenSystem'], label: 'мужчина на природе, широкий горизонт' },
  { persona: 'woman', visualMode: 'generatedPerson', sceneTheme: 'cityLifestyle', styleHints: ['editorialGold', 'premiumCalm', 'whiteGoldPremium'], label: 'женщина 32-48 в светлом городе, активная сцена без образа бабушки' },
  { persona: 'mixed', visualMode: 'noPerson', sceneTheme: 'hobby', styleHints: ['editorialShock', 'cleanSystem', 'outdoorFreedom'], label: 'хобби или дело без портрета' }
];

const PRELANDING_STATIC_FALLBACK_IMAGES = [
  'https://optim.tildacdn.com/tild3437-6266-4237-b766-353235633165/-/format/webp/hero_people_scene.webp',
  'https://optim.tildacdn.com/tild3530-3561-4962-b737-386532656234/-/format/webp/value_people_scene.webp',
  'https://optim.tildacdn.com/tild3461-3763-4737-a164-356365303561/-/resize/740x/-/format/webp/cta_people_scene.webp',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=82',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=82',
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=82',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82',
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1600&q=82',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=82',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=82'
];

function pickStaticPrelandingFallback(seed = '', offset = 0) {
  if (!PRELANDING_STATIC_FALLBACK_IMAGES.length) return '';
  const index = (hashText(seed) + offset) % PRELANDING_STATIC_FALLBACK_IMAGES.length;
  return PRELANDING_STATIC_FALLBACK_IMAGES[index] || PRELANDING_STATIC_FALLBACK_IMAGES[0];
}

function normalizeVisualKey(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (/\/api\/image-proxy/i.test(parsed.pathname)) {
      return normalizeVisualKey(parsed.searchParams.get('url') || '');
    }
    parsed.hash = '';
    if (/images\.unsplash\.com/i.test(parsed.hostname)) parsed.search = '';
    return parsed.toString().toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function pickDistinctStaticPrelandingFallback(seed = '', offsets = [0], used = new Set()) {
  const safeOffsets = offsets.length ? offsets : [0];
  for (const offset of safeOffsets) {
    const picked = pickStaticPrelandingFallback(seed, offset);
    const key = normalizeVisualKey(picked);
    if (picked && key && !used.has(key)) {
      used.add(key);
      return picked;
    }
  }
  const fallback = pickStaticPrelandingFallback(seed, safeOffsets[0] || 0);
  const key = normalizeVisualKey(fallback);
  if (key) used.add(key);
  return fallback;
}

function readVisualMemory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VISUAL_MEMORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function rememberVisualMemory(entry) {
  try {
    const next = [entry, ...readVisualMemory()]
      .filter(Boolean)
      .slice(0, 8);
    localStorage.setItem(VISUAL_MEMORY_KEY, JSON.stringify(next));
  } catch {
    // Visual memory only improves variety; generation still works without storage.
  }
}

function nextVisualRoute({ hasReference = false, requestedVisualMode = 'auto', manualSceneTheme = 'auto', styleChoice = 'auto', variantKey = '', headline = '', supportText = '' } = {}) {
  if (hasReference && requestedVisualMode === 'reference') {
    return {
      persona: 'mixed',
      visualMode: 'reference',
      sceneTheme: manualSceneTheme,
      styleHint: styleChoice,
      label: 'по загруженному фото'
    };
  }

  let index = 0;
  try {
    index = Number(localStorage.getItem(VISUAL_ROTATION_KEY)) || 0;
    localStorage.setItem(VISUAL_ROTATION_KEY, String(index + 1));
  } catch {
    index = Math.floor(Date.now() / 1000);
  }
  const routeIndex = Math.abs(index) % BANNER_VISUAL_SEQUENCE.length;
  const route = BANNER_VISUAL_SEQUENCE[routeIndex] || BANNER_VISUAL_SEQUENCE[0];
  const semanticProfile = resolveCampaignSemanticProfile(headline, supportText);
  const semanticDirection = pickCampaignVisualDirection(semanticProfile, `${headline}|${supportText}|${variantKey}`, index);
  const hasManualSceneTheme = Boolean(manualSceneTheme && manualSceneTheme !== 'auto');
  const autoStylePool = hasManualSceneTheme
    ? VISUAL_WORLD_STYLE_HINTS[manualSceneTheme] || route.styleHints
    : route.styleHints;
  const styleHint = styleChoice !== 'auto'
    ? styleChoice
    : semanticDirection.styleHint || pickHashed(`${route.label}|${index}|${variantKey}|${Date.now()}|${Math.random()}|style`, autoStylePool || ['redWhite', 'greenSystem', 'blueTrust']);
  const hasExplicitVisualMode = ['generatedPerson', 'noPerson', 'metaphor'].includes(requestedVisualMode);
  const resolvedSceneTheme = hasManualSceneTheme
    ? manualSceneTheme
    : semanticDirection.sceneTheme || route.sceneTheme;
  const resolvedVisualMode = hasExplicitVisualMode
    ? requestedVisualMode
    : semanticDirection.visualMode || route.visualMode || 'noPerson';
  const isPersonless = resolvedVisualMode === 'noPerson' || resolvedVisualMode === 'metaphor';
  return {
    ...route,
    persona: isPersonless ? 'mixed' : semanticDirection.persona || route.persona,
    visualMode: resolvedVisualMode,
    sceneTheme: resolvedSceneTheme,
    styleHint,
    semanticId: semanticProfile.id,
    semanticPriority: !hasManualSceneTheme,
    semanticSceneLine: semanticDirection.sceneLine,
    semanticCompositionLine: semanticDirection.compositionLine,
    label: hasManualSceneTheme
      ? `${route.label}. Ручной мир: ${manualSceneTheme}. Смысл: ${semanticProfile.label}`
      : `AI по смыслу: ${semanticProfile.label}`
  };
}

function nextPrelandingVisualRoute({ hasReference = false, requestedVisualMode = 'generatedPerson', manualSceneTheme = 'auto', styleChoice = 'auto', variantKey = '' } = {}) {
  if (hasReference && requestedVisualMode === 'reference') {
    return {
      persona: 'mixed',
      visualMode: 'reference',
      sceneTheme: manualSceneTheme,
      styleHint: styleChoice,
      label: 'по загруженному фото'
    };
  }

  let index = 0;
  try {
    index = Number(localStorage.getItem(PRELANDING_VISUAL_ROTATION_KEY)) || 0;
    localStorage.setItem(PRELANDING_VISUAL_ROTATION_KEY, String(index + 1));
  } catch {
    index = Math.floor(Date.now() / 1000);
  }
  const routeIndex = Math.abs(index) % PRELANDING_VISUAL_SEQUENCE.length;
  const route = PRELANDING_VISUAL_SEQUENCE[routeIndex] || PRELANDING_VISUAL_SEQUENCE[0];
  const styleHint = styleChoice !== 'auto'
    ? styleChoice
    : pickHashed(`${route.label}|prelanding|${index}|${variantKey}|${Date.now()}|${Math.random()}|style`, route.styleHints || ['editorialGold', 'greenSystem', 'blueTrust']);
  return {
    ...route,
    visualMode: requestedVisualMode === 'noPerson' || requestedVisualMode === 'metaphor' ? requestedVisualMode : route.visualMode,
    sceneTheme: manualSceneTheme && manualSceneTheme !== 'auto' ? manualSceneTheme : route.sceneTheme,
    styleHint
  };
}

function buildVisualMemoryAvoidanceLine(memory = []) {
  const compact = memory
    .map((item) => [item?.person, item?.scene, item?.theme, item?.style].filter(Boolean).join(' / '))
    .filter(Boolean)
    .slice(0, 5);
  if (!compact.length) return '';
  return `В этой сессии уже были похожие визуалы: ${compact.join('; ')}. Сейчас обязательно выбери другой визуальный код: новый типаж, другое место, другой свет, другую одежду, другой ракурс и другую композицию. Не повторяй прошлые лица, “мужика справа”, стандартного мужчину 40-55 с сединой/щетиной, пожилую женщину в тёмной мастерской у окна, окно/ноутбук/чашку как основной шаблон.`;
}

function normalizeVisualPromptForPersona(prompt, persona) {
  const raw = String(prompt || '');
  if (persona === 'man') {
    return raw
      .replace(/жив(?:ая|ую|ой)?\s+женщин[а-я]*/gi, 'живой мужчина')
      .replace(/уверенн(?:ая|ую|ой)?\s+женщин[а-я]*/gi, 'уверенный мужчина')
      .replace(/взросл(?:ая|ую|ой)?\s+женщин[а-я]*/gi, 'взрослый мужчина')
      .replace(/женщин[а-я]*/gi, 'мужчина')
      .replace(/девушк[а-я]*/gi, 'мужчина')
      .replace(/женск[а-я]*/gi, 'мужской');
  }
  if (persona === 'woman') {
    return raw
      .replace(/жив(?:ой|ого|ому)?\s+мужчин[а-я]*/gi, 'живая женщина')
      .replace(/уверенн(?:ый|ого|ому)?\s+мужчин[а-я]*/gi, 'уверенная женщина')
      .replace(/взросл(?:ый|ого|ому)?\s+мужчин[а-я]*/gi, 'взрослая женщина')
      .replace(/мужчин[а-я]*/gi, 'женщина')
      .replace(/парен[а-я]*/gi, 'женщина')
      .replace(/мужск[а-я]*/gi, 'женский');
  }
  return raw;
}

const METAPHOR_STYLE_VALUES = new Set(['cosmicMetaphor', 'animalMetaphor']);

const SCENE_THEME_LOCKS = {
  cityMomentum: 'динамичный город: современная архитектура, переход, терраса, деловой квартал или набережная, движение и свет; не статичный офисный стол',
  premiumDrive: 'премиальный городской lifestyle с современным автомобилем без логотипа, костюмом, пальто или smart casual и взрослой уверенностью; статус без показной роскоши',
  seaEscape: 'море, берег, курортная архитектура, марина, светлая набережная или терраса; ощущение свободы без туристической открытки',
  offroadAdventure: 'современный внедорожник без логотипа, палатка или кемпинг, лес, озеро или горы, практичная outdoor-одежда; активная жизнь без милитари',
  office: 'рабочая среда, кабинет, коворкинг, переговорка или стол с ноутбуком; это единственный режим, где офисные предметы могут быть центром кадра',
  cozyHome: 'дом, кухня-гостиная, кресло, окно, спокойствие, уют и живой бытовой свет',
  cityLifestyle: 'город, кафе, улица, стекло, движение, lifestyle и ощущение реальной городской жизни',
  nature: 'горы, лес, озеро, тропа, обзорная точка, широкий горизонт, воздух, свобода и природный свет',
  travel: 'путь, движение, станция, чемодан, рюкзак, смотровая точка, светлая улица или архитектура пути; машина и серая дорога не должны быть главным кадром',
  pets: 'тёплая сцена с котом или собакой как естественной частью жизни, доверие и человечность',
  hobby: 'рыбалка, сад, велосипед, спорт, прогулка, шитьё, фото, дело для себя или отдых с фактурой жизни',
  craft: 'мастерская, материалы, дерево, ткань, инструменты, руки в деле и ремесленная фактура'
};

const SCENE_THEME_FORBIDDEN = {
  cityMomentum: 'Запрещены как главный визуал: статичный офисный стол, одинокий человек у ноутбука, пустой коридор и одинаковая синяя рубашка.',
  premiumDrive: 'Запрещены логотипы марок, автосалон, ключи крупным планом, пачки денег, спорткар как фетиш и демонстративная роскошь.',
  seaEscape: 'Запрещены статусная яхта как фетиш, блогерская поза, пересыщенный тропический китч и одинаковый горный пейзаж из прошлых баннеров.',
  offroadAdventure: 'Запрещены логотипы, оружие, грязевые гонки, военная или тактическая стилистика и опасное вождение.',
  nature: 'Запрещены как главный визуал: учебный стол, тетради, конспекты, стопки книг, школьные принадлежности, офисный ноутбук, кабинет и интерьерная сцена.',
  travel: 'Запрещены как главный визуал: учебный стол, тетради, конспекты, стопки книг, офисный ноутбук, статичный кабинет, мыльная трасса, машина вдалеке, остановка и серый городской проезд.',
  cityLifestyle: 'Запрещены как главный визуал: тетради, конспекты, учебный стол и кабинетная сцена, если они не являются маленькой второстепенной деталью.',
  cozyHome: 'Запрещены как главный визуал: офисный стол, учебные тетради и конспекты как основной сюжет.',
  pets: 'Запрещены как главный визуал: офисный стол, учебные тетради и конспекты как основной сюжет.',
  hobby: 'Запрещены как главный визуал: офисный ноутбук, учебные тетради и конспекты вместо выбранного хобби.',
  craft: 'Не превращай мастерскую в школьные тетради: нужны материалы, фактура и процесс, а не учебная парта.'
};

function optionLabel(options, value) {
  return options.find((item) => item.value === value)?.label || value || '';
}

function isMetaphorStyle(style) {
  return METAPHOR_STYLE_VALUES.has(style);
}

function visualSceneLockPrompt(sceneTheme) {
  if (!sceneTheme || sceneTheme === 'auto') return '';
  const label = optionLabel(SCENE_THEME_OPTIONS, sceneTheme);
  const lock = SCENE_THEME_LOCKS[sceneTheme] || label;
  const forbidden = SCENE_THEME_FORBIDDEN[sceneTheme] || '';
  return [
    `ЖЁСТКИЙ LOCK СЮЖЕТА: ${lock}. Это только режиссёрская инструкция. Никогда не печатай название режима или визуального мира на баннере.`,
    'Если старый рекламный вариант или пресет просит другую сцену, игнорируй старую сцену и сохраняй только смысл боли/обещания.',
    forbidden
  ].filter(Boolean).join(' ');
}

function visualStyleLockPrompt(stylePreset, styleMap = {}) {
  if (!stylePreset || stylePreset === 'auto') return '';
  const label = optionLabel(VISUAL_STYLE_OPTIONS, stylePreset);
  const styleLine = styleMap[stylePreset] || label;
  return `ЖЁСТКИЙ LOCK СТИЛЯ: ${styleLine}. Это только инструкция оформления. Не печатай название стиля, палитры, режима или элемента управления. Не уходи самовольно в стандартный сине-зелёный тёмный шаблон.`;
}

const VISUAL_PERSON_VARIANTS = {
  man: [
    'мужчина 34-46 в хорошо сидящем костюме или пальто рядом с современным автомобилем, взрослый premium lifestyle без логотипов и позёрства',
    'мужчина 32-44 в льняной рубашке или светлом smart casual у моря, на марине или курортной террасе, свободный и живой',
    'мужчина 35-48 в технической outdoor-куртке рядом с внедорожником, палаткой или лагерем, естественный момент действия',
    'мужчина 30-42 в городском пальто или бомбере на современной улице, переходе или террасе, заметное движение в кадре',
    'мужчина 36-50 в светлом доме, свитере или футболке, естественные руки и лицо, без ноутбука как обязательного центра',
    'мужчина 38-52 в природной сцене, функциональная одежда, полный рост или полурост, широкий горизонт и внутренняя сила',
    'мужчина 33-47 в вечернем городе, тёмный жакет и выразительный боковой свет, без синей casual-рубашки и офисного стока',
    'мужчина 35-50 в светлом костюме на архитектурной террасе, расслабленная уверенность, не глянцевый бизнесмен'
  ],
  woman: [
    'женщина 32-46 в лаконичном костюме или пальто рядом с современным автомобилем, уверенность без показной роскоши',
    'женщина 30-44 в светлом resort casual у моря, на набережной или марине, живой ветер и свободная поза',
    'женщина 34-48 в функциональной outdoor-одежде у внедорожника, палатки или тропы, реальная активная сцена',
    'женщина 31-43 в городском движении, пальто или жакет, архитектура и люди на фоне, не статичный портрет',
    'женщина 36-50 в светлом доме или на террасе, мягкий живой свет, настоящая фактура лица и спокойная сила',
    'женщина 35-50 в природной сцене, полный рост или полурост, широкий горизонт, без образа пожилой бабушки',
    'женщина 32-46 в вечернем городе, выразительная красная или нейтральная деталь одежды, дорогой editorial-свет',
    'женщина 34-48 на архитектурной террасе или в лобби, взрослая уверенность, без модельной пластики'
  ],
  mixed: [
    'взрослый герой 32-48 в премиальном городском lifestyle, новая одежда и новый типаж, без глянцевой позы',
    'взрослый герой 34-50 в морской, outdoor или динамичной городской сцене, полный рост или полурост, настоящее действие',
    'пара или один герой 34-50 в естественной ситуации у автомобиля, на террасе или в пути, не рекламная улыбка',
    'человек 32-50 в светлом доме или природе, одежда и палитра явно отличаются от предыдущего баннера',
    'герой 35-52 в живой сцене без обязательного ноутбука, с воздухом, фактурой и понятной эмоцией'
  ]
};

const VISUAL_SCENE_VARIANTS = {
  cityMomentum: [
    'современный деловой квартал, стеклянная архитектура и переход; герой идёт, городской ритм читается в глубине кадра',
    'светлая городская набережная или терраса, ветер, движение людей и транспорта далеко на фоне, чистая зона под текст',
    'вечерний город с тёплыми огнями и отражениями в стекле, герой в движении, дорогой editorial-свет без неона ради неона',
    'архитектурное лобби или улица у современного здания, диагональная перспектива, действие вместо статичного портрета'
  ],
  premiumDrive: [
    'современный премиальный автомобиль без логотипа у архитектурной виллы или делового квартала, герой рядом, машина не перекрывает смысл',
    'герой выходит из автомобиля или стоит рядом на светлой городской террасе, костюм или smart casual, статус без демонстрации денег',
    'лаконичный салон автомобиля или открытая дверь как часть lifestyle-сцены, лицо и фигура читаются, никаких ключей крупным планом',
    'вечерняя парковка у современной архитектуры, спокойный дорогой свет, автомобиль как контекст выбора и свободы, а не рекламируемый товар'
  ],
  seaEscape: [
    'светлая морская набережная или марина, герой идёт вдоль воды, ветер и простор, никаких логотипов и постановочной роскоши',
    'современная курортная терраса с видом на море, естественный дневной свет, герой в полурост, чистая зона под заголовок',
    'берег или каменная дорожка у моря на рассвете, движение и свобода, не типичная открытка с пальмами',
    'светлая архитектура у воды, балкон или променад, выразительный синий/коралловый цветовой акцент и живая перспектива'
  ],
  offroadAdventure: [
    'современный внедорожник без логотипа у озера или гор, рядом аккуратный лагерь и палатка, герой готовит маршрут',
    'лесная площадка с внедорожником, рюкзаком и походным столом, естественное действие без военной стилистики',
    'горная тропа и припаркованный внедорожник в глубине, герой в полный рост, широкий воздух и чистое место под текст',
    'современный кемпинг на рассвете: палатка, термос, автомобиль сбоку, герой смотрит на маршрут, зелёно-земляная палитра'
  ],
  office: [
    'небанальная рабочая сцена: переговорная с дневным светом, доска/бумаги/стол, но без скучного офисного стока',
    'рабочее пространство у окна, город на фоне, герой не приклеен к ноутбуку, есть глубина и движение',
    'кафе-коворкинг или библиотека, открытый блокнот, чашка, живой свет, ощущение выбора нового пути',
    'современный кабинет с фактурными предметами, герой в полурост, свободная зона под крупный текст'
  ],
  cozyHome: [
    'светлый дом, кухня-гостиная, кресло, чай, мягкий боковой свет, ощущение выдоха после хаоса',
    'утро у окна, плед, книги, растение, спокойный момент перед решением, без рекламной постановки',
    'живой домашний стол, блокнот, чашка, питомец может быть частью кадра, тёплая человечность',
    'балкон или веранда, лёгкий ветер, домашний уют и ощущение простора'
  ],
  cityLifestyle: [
    'городской lifestyle: улица, стекло, кафе, движение людей на фоне, чистый дневной свет, герой в естественном моменте',
    'яркое светлое кафе или городская терраса, динамичная глубина, герой смотрит в сторону, не в камеру',
    'современный двор/терраса/городское окно, ощущение жизни за пределами работы, воздух и заметный свет',
    'street editorial: пешеходный переход, витрина, кофе на вынос, живой рекламный кадр, не мрачная офисная сцена'
  ],
  nature: [
    'горы или озеро, обзорная точка, герой в полный рост или полурост, воздух и широкий горизонт',
    'лесная тропа, утренний свет, рюкзак или куртка, ощущение выхода из старого сценария',
    'берег реки/озера, спокойная вода, фактурный свет, герой не закрывает весь кадр',
    'зелёная терраса или сад, природный свет, свобода без туристической открытки'
  ],
  travel: [
    'смотровая площадка, город или горы внизу, герой повернут боком, пространство для типографики, чистая резкая оптика',
    'современный вокзал или аэропорт без логотипов: архитектура, свет, герой с сумкой, ощущение выбора пути, без серой трассы и случайной машины',
    'широкий lifestyle-кадр движения: человек идёт по светлой улице или набережной, глубокая перспектива, дорогой рекламный свет',
    'премиальная сцена пути без авто в центре: рюкзак, куртка, обзорная точка, движение, воздух и ясный главный объект'
  ],
  pets: [
    'уютная сцена с собакой или котом как естественной частью жизни, без мемности и детскости',
    'светлый дом, человек с питомцем рядом, мягкая эмоция доверия и спокойствия',
    'утреннее кафе/терраса с собакой, живой lifestyle, дорогой свет без пафоса',
    'домашний стол, кот рядом с блокнотом, ощущение настоящей жизни'
  ],
  hobby: [
    'рыбалка, сад, прогулка, велосипед, спорт или светлое дело для себя как символ живой жизни',
    'человек на улице, в саду, кафе или светлой студии занимается делом, которое любит, без офисной постановки и без тёмной мастерской',
    'сцена отдыха с глубиной: лес, лодка, рюкзак, садовые инструменты, но без карикатуры',
    'хобби-пространство: сад, фотоаппарат, прогулка, спорт, светлая студия, естественные руки в деле'
  ],
  craft: [
    'мастерская с тканями, деревом, инструментами или блокнотом, фактура, руки в деле, тёплый свет',
    'рабочий стол ремесленника, детали, материалы, живой процесс, герой не позирует как модель',
    'светлая студия ручной работы, аккуратный творческий хаос, ощущение настоящего дела',
    'человек у рабочего стола с материалами, полурост, чистая зона под крупную типографику'
  ]
};

const VISUAL_CAMERA_VARIANTS = [
  'ракурс 35mm cinematic, полурост, лёгкая перспектива, герой не плоский и не как аватар',
  'широкий lifestyle-кадр, герой в среде, много воздуха, безопасное кадрирование лица',
  'editorial portrait в движении: взгляд в сторону, руки естественные, фон с глубиной',
  'низкий или боковой ракурс без искажений, герой и окружение выглядят как единая история',
  'средний план с видимыми плечами и частью пространства, лицо полностью в кадре',
  'полный рост или почти полный рост, если сцена путь/природа/город, без обрезанной головы'
];

const VISUAL_DESIGN_VARIANTS = [
  'дизайн должен отличаться от предыдущих: новая палитра, другая плотность текста, другая форма плашек, другой свет',
  'сделай рекламный постер как дорогой editorial/lifestyle, но с читаемой типографикой и без шаблонного клише',
  'добавь живую деталь сцены вместо одинакового ноутбука: дорога, растение, книга, собака, ткань, инструмент, окно, город',
  'пусть композиция пробивает баннерную слепоту: неожиданный ракурс, простор, эмоция, но без визуального мусора',
  'сочетай живую фотографию и сильную типографику, не повторяй один и тот же чёрно-жёлтый макет'
];

const VISUAL_COMPOSITION_VARIANTS = [
  'композиция: герой или объект слева, крупный текст справа, но без перекрытия лица и рук',
  'композиция: герой или объект справа, крупный текст слева, с живым фоном под текстом',
  'композиция: диагональный постер, текст сверху/сбоку, герой в противоположной трети кадра',
  'композиция: lifestyle-сцена на весь кадр, текст встроен в свободную зону, не как отдельная чёрная колонка',
  'композиция: крупная среда и герой в полурост, текст компактнее, акцентные слова выделены цветом',
  'композиция: светлая сцена с большим воздухом, текст не обязан стоять в том же месте, что раньше'
];

function buildVisualVariation({ headline, persona, sceneTheme, stylePreset, visualMode, variantKey = '', fullBanner = false, semanticPriority = false, semanticSceneLine = '', semanticCompositionLine = '' }) {
  const theme = sceneTheme && sceneTheme !== 'auto' ? sceneTheme : 'cityLifestyle';
  const seed = `${headline}|${persona}|${theme}|${stylePreset}|${visualMode}|${variantKey}`;
  const personPool = VISUAL_PERSON_VARIANTS[persona] || VISUAL_PERSON_VARIANTS.mixed;
  const scenePool = VISUAL_SCENE_VARIANTS[theme] || VISUAL_SCENE_VARIANTS.cityLifestyle;
  const compositionPool = fullBanner
    ? VISUAL_COMPOSITION_VARIANTS
    : VISUAL_COMPOSITION_VARIANTS.filter((item) => !item.includes('крупный текст справа') && !item.includes('крупный текст слева'));
  const routedSceneLine = pickHashed(`${seed}|scene`, scenePool);
  const routedCompositionLine = pickHashed(`${seed}|composition`, compositionPool.length ? compositionPool : VISUAL_COMPOSITION_VARIANTS);
  return {
    personLine: pickHashed(`${seed}|person`, personPool),
    sceneLine: semanticPriority && semanticSceneLine
      ? `Главная смысловая сцена: ${semanticSceneLine}. Она определяет действие героя и смысл изображения. Поддерживающее окружение: ${routedSceneLine}. Не заменяй действие случайной красивой локацией.`
      : [
          routedSceneLine,
          semanticSceneLine ? `Смысловая деталь: ${semanticSceneLine}. Встрой её внутрь выбранного вручную визуального мира, сохранив действие и конфликт.` : ''
        ].filter(Boolean).join(' '),
    cameraLine: pickHashed(`${seed}|camera`, VISUAL_CAMERA_VARIANTS),
    designLine: pickHashed(`${seed}|design`, VISUAL_DESIGN_VARIANTS),
    compositionLine: semanticPriority && semanticCompositionLine
      ? `Главная смысловая композиция: ${semanticCompositionLine}. Дополнительная вариативность: ${routedCompositionLine}. Сначала обеспечь читаемость смысла, затем меняй макет.`
      : [
          routedCompositionLine,
          semanticCompositionLine ? `Смысловая подача: ${semanticCompositionLine}. Адаптируй её к выбранной вручную композиции и визуальному миру.` : ''
        ].filter(Boolean).join(' '),
    antiRepeatLine: 'Новая генерация обязана менять героя, одежду, визуальный мир, палитру, композицию и свет. Не повторяй мужчину 35-45 в светло-синей рубашке, одну и ту же гору с озером, кафе или офис. Не клонируй лицо, позу и фон прошлых креативов.'
  };
}

function companionPrelandingStyle(bannerStyle, headline, variantKey = '') {
  const variedPremiumPool = [
    'blueTrust',
    'cleanSystem',
    'glassPremium',
    'whiteGoldPremium',
    'redWhite',
    'greenSystem',
    'outdoorFreedom',
    'messengerNative',
    'premiumCalm'
  ];
  const byStyle = {
    darkYellow: ['blueTrust', 'cleanSystem', 'whiteGoldPremium', 'outdoorFreedom', 'glassPremium'],
    darkOrange: ['whiteGoldPremium', 'cleanSystem', 'redWhite', 'blueTrust', 'outdoorFreedom'],
    blackRed: ['redWhite', 'cleanSystem', 'blueTrust', 'whiteGoldPremium', 'glassPremium'],
    fintechRed: ['redWhite', 'cleanSystem', 'blueTrust', 'whiteGoldPremium', 'glassPremium'],
    greenSystem: ['greenSystem', 'outdoorFreedom', 'cleanSystem', 'blueTrust', 'whiteGoldPremium'],
    greenDark: ['greenSystem', 'outdoorFreedom', 'cleanSystem', 'blueTrust', 'whiteGoldPremium'],
    blueTrust: ['blueTrust', 'glassPremium', 'cleanSystem', 'whiteGoldPremium', 'outdoorFreedom'],
    cleanSystem: ['cleanSystem', 'blueTrust', 'redWhite', 'glassPremium', 'whiteGoldPremium'],
    editorialGold: ['whiteGoldPremium', 'cleanSystem', 'blueTrust', 'outdoorFreedom', 'premiumCalm'],
    newspaperShock: ['cleanSystem', 'redWhite', 'blueTrust', 'whiteGoldPremium', 'outdoorFreedom'],
    whiteGoldPremium: ['whiteGoldPremium', 'cleanSystem', 'blueTrust', 'outdoorFreedom', 'glassPremium'],
    outdoorFreedom: ['outdoorFreedom', 'greenSystem', 'whiteGoldPremium', 'blueTrust', 'cleanSystem'],
    purple: ['glassPremium', 'blueTrust', 'cleanSystem', 'whiteGoldPremium', 'redWhite'],
    glassPremium: ['glassPremium', 'blueTrust', 'cleanSystem', 'whiteGoldPremium', 'outdoorFreedom'],
    cosmicMetaphor: ['glassPremium', 'blueTrust', 'cleanSystem', 'outdoorFreedom', 'whiteGoldPremium'],
    animalMetaphor: ['outdoorFreedom', 'greenSystem', 'whiteGoldPremium', 'glassPremium', 'cleanSystem']
  };
  return pickHashed(`${headline}-${bannerStyle}-${variantKey}-${Date.now()}-${Math.random()}`, byStyle[bannerStyle] || variedPremiumPool);
}

const PRELANDING_CONCEPTS = [
  {
    id: 'documentary-realism',
    label: 'Светлый документальный реализм',
    themeStyle: 'premiumCalm',
    designFamily: 'split-premium',
    landingVariant: 'tf-v-editorial',
    typeMode: 'modern',
    sceneThemes: ['cityLifestyle', 'nature', 'office', 'travel'],
    ribbon: 'строго по делу',
    promptLine: 'Светлый документальный реализм: живая 35mm-фотография, чистый дневной свет, фактура реальной жизни, без глянца, без мрачной мастерской и без постановки успешного успеха.',
    cards: [
      { title: 'Без иллюзий', text: 'Показываем механику без рекламного тумана.' },
      { title: 'Реальная механика', text: 'Сначала принцип, потом первый шаг.' },
      { title: 'Для тех, кто пашет', text: 'Без сказок про лёгкий рывок.' }
    ],
    proofItems: [
      { value: 'Факты', label: 'без мотивационного шума' },
      { value: 'Механика', label: 'как устроен вход' },
      { value: 'короткий разбор', label: 'быстро понять суть' }
    ]
  },
  {
    id: 'reality-diary',
    label: 'Дневник трансформации',
    themeStyle: 'messengerNative',
    designFamily: 'split-premium',
    landingVariant: 'tf-v-motion',
    typeMode: 'modern',
    sceneThemes: ['cityLifestyle', 'nature', 'travel', 'office'],
    ribbon: 'первый шаг без витрины',
    promptLine: 'Формат реалити-дневника: ощущение личного наблюдения за процессом, живой человек, телефон/заметки/движение, без фальшивой глянцевой истории.',
    cards: [
      { title: 'День 1', text: 'Сначала смотрим, как устроен вход.' },
      { title: 'Личный опыт', text: 'Без лекции на три часа.' },
      { title: 'Шаг за шагом', text: 'Следующий шаг в мессенджере.' }
    ],
    proofItems: [
      { value: 'Старт', label: 'без длинной подготовки' },
      { value: 'Процесс', label: 'видно следующий шаг' },
      { value: 'Разбор', label: 'коротко и по делу' }
    ]
  },
  {
    id: 'time-compression',
    label: 'Сжатие времени',
    themeStyle: 'terminalLime',
    designFamily: 'object-stage',
    landingVariant: 'tf-v-aurora',
    typeMode: 'modern',
    sceneThemes: ['office', 'cityLifestyle', 'nature'],
    ribbon: 'время работает иначе',
    promptLine: 'Техно-прагматизм: ощущение ускорения, неоновые линии света в реальной сцене, графики как настроение системы, но без фейковых интерфейсов и букв.',
    cards: [
      { title: 'Быстрее к сути', text: 'Не тратить месяцы на хаос.' },
      { title: 'Скрытые рычаги', text: 'Смотреть связку целиком.' },
      { title: 'Без лишнего круга', text: 'Первый шаг сразу открыт.' }
    ],
    proofItems: [
      { value: 'Х3', label: 'к скорости понимания' },
      { value: 'Система', label: 'не случайные попытки' },
      { value: 'короткий разбор', label: 'на первый разбор' }
    ]
  },
  {
    id: 'blueprint-system',
    label: 'Архитектура системы',
    themeStyle: 'blueprintTech',
    designFamily: 'object-stage',
    landingVariant: 'tf-v-briefing',
    typeMode: 'modern',
    sceneThemes: ['office', 'cityLifestyle', 'travel'],
    ribbon: 'механизм в сборе',
    promptLine: 'Blueprint-система: ощущение чертежа, сборки механизма, рабочей панели и понятной архитектуры, но в основе должна быть качественная фото-сцена без текста.',
    cards: [
      { title: 'Меньше хаоса', text: 'Сначала убираем лишние варианты.' },
      { title: 'Есть путь', text: 'Видно, что проверять первым.' },
      { title: 'Первый шаг', text: 'Разбор открывается в мессенджере.' }
    ],
    proofItems: [
      { value: 'Опора', label: 'без хаоса с деньгами' },
      { value: 'Путь', label: 'что делать дальше' },
      { value: 'короткий разбор', label: 'короткий разбор' }
    ]
  },
  {
    id: 'editorial-minimal',
    label: 'Журнальный минимализм',
    themeStyle: 'premiumCalm',
    designFamily: 'split-premium',
    landingVariant: 'tf-v-editorial',
    typeMode: 'editorial',
    sceneThemes: ['cityLifestyle', 'nature', 'office', 'travel'],
    ribbon: 'спокойный разбор',
    promptLine: 'Журнальный минимализм: дорогая спокойная фотография, много воздуха, чистый свет, взрослая аудитория, без рекламной истерики.',
    cards: [
      { title: 'Смена фокуса', text: 'Не ещё один рывок через силу.' },
      { title: 'Новая логика', text: 'Смотреть систему целиком.' },
      { title: 'Без суеты', text: 'Коротко и спокойно.' }
    ],
    proofItems: [
      { value: 'Аналитика', label: 'без давления' },
      { value: 'Фокус', label: 'на механике' },
      { value: 'Вход', label: 'через разбор' }
    ]
  },
  {
    id: 'cinematic-noir',
    label: 'Кинематографичный контраст',
    themeStyle: 'blueTrust',
    designFamily: 'object-stage',
    landingVariant: 'tf-v-motion',
    typeMode: 'condensed',
    sceneThemes: ['cityLifestyle', 'travel', 'nature', 'office'],
    ribbon: 'за кулисами системы',
    promptLine: 'Кинематографичный контраст: яркий герой, световые акценты, движение и ощущение скрытого входа, но без глухого чёрного фона и без грязного нуара.',
    cards: [
      { title: 'Не для всех', text: 'Без массовой витрины.' },
      { title: 'За кулисами', text: 'Показываем внутреннюю механику.' },
      { title: 'Скрытый вход', text: 'Первый шаг в мессенджере.' }
    ],
    proofItems: [
      { value: 'Кулисы', label: 'что обычно не видно' },
      { value: 'Вход', label: 'не через шум' },
      { value: 'Разбор', label: 'короткий формат' }
    ]
  },
  {
    id: 'brutal-manifest',
    label: 'Брутализм-манифест',
    themeStyle: 'neoBrutal',
    designFamily: 'editorial-strike',
    landingVariant: 'tf-v-spotlight',
    typeMode: 'condensed',
    sceneThemes: ['cityLifestyle', 'office', 'nature'],
    ribbon: 'хватит ждать',
    promptLine: 'Бруталистский манифест: крупная рубленая энергия, высокий контраст, фактурная реальная сцена, стоп-эффект без мусорного коллажа.',
    cards: [
      { title: 'Хватит ждать', text: 'Сначала действие, потом сомнения.' },
      { title: 'Факты', text: 'Без мотивационного тумана.' },
      { title: 'Сломать круг', text: 'Посмотреть другой вход.' }
    ],
    proofItems: [
      { value: 'Стоп', label: 'старому сценарию' },
      { value: 'Факты', label: 'вместо обещаний' },
      { value: 'Действие', label: 'прямо сейчас' }
    ]
  },
  {
    id: 'behind-scenes',
    label: 'Прямое включение',
    themeStyle: 'glassPremium',
    designFamily: 'object-stage',
    landingVariant: 'tf-v-motion',
    typeMode: 'modern',
    sceneThemes: ['office', 'cityLifestyle', 'nature', 'travel'],
    ribbon: 'изнутри, без монтажа',
    promptLine: 'Behind the scenes: ощущение живого рабочего процесса, экран/кабинет/стол могут быть размытым фоном, но без читаемых интерфейсов, логотипов, цифр и букв.',
    cards: [
      { title: 'Live-логика', text: 'Не теория ради теории.' },
      { title: 'Изнутри', text: 'Смотреть механику связки.' },
      { title: 'Без монтажа', text: 'Понятно, что делать дальше.' }
    ],
    proofItems: [
      { value: 'Демо', label: 'как работает связка' },
      { value: 'Бот', label: 'следующий шаг' },
      { value: 'Воронка', label: 'собрана в один путь' }
    ]
  },
  {
    id: 'anti-infobiz',
    label: 'Анти-инфобиз',
    themeStyle: 'newspaperShock',
    designFamily: 'editorial-strike',
    landingVariant: 'tf-v-contrast',
    typeMode: 'condensed',
    sceneThemes: ['cityLifestyle', 'office', 'nature', 'travel'],
    ribbon: 'без очередного курса',
    promptLine: 'Анти-инфобиз: ироничный честный кадр, рабочий стол/ноутбук/кофе/реальная среда, без пальм, машин, пачек денег и клише успешного успеха.',
    cards: [
      { title: 'Без воды', text: 'Только механика входа.' },
      { title: 'Без кураторов', text: 'Не покупка ещё одного курса.' },
      { title: 'Только связка', text: 'Посадочная и бот работают вместе.' }
    ],
    proofItems: [
      { value: 'Не курс', label: 'без бесконечных уроков' },
      { value: 'Связка', label: 'собранный путь' },
      { value: 'короткий разбор', label: 'чтобы понять суть' }
    ]
  },
  {
    id: 'terminal-system',
    label: 'Интерактивный терминал',
    themeStyle: 'cleanSystem',
    designFamily: 'object-stage',
    landingVariant: 'tf-v-briefing',
    typeMode: 'modern',
    sceneThemes: ['office', 'cityLifestyle', 'travel'],
    ribbon: 'system check',
    promptLine: 'Системная эстетика: чистый светлый техно-кадр, голубые/зелёные акценты, ощущение запуска системы, но без чёрного терминала, букв, команд, UI и цифр.',
    cards: [
      { title: 'System check', text: 'Проверяем путь.' },
      { title: 'Run', text: 'Открываем первый шаг.' },
      { title: 'Bypass', text: 'Обходим лишний хаос.' }
    ],
    proofItems: [
      { value: 'RUN', label: 'запустить разбор' },
      { value: 'CHECK', label: 'понять механику' },
      { value: 'NEXT', label: 'получить шаг' }
    ]
  },
  {
    id: 'life-calculator',
    label: 'Калькулятор жизни',
    themeStyle: 'cleanSystem',
    designFamily: 'price-signal',
    landingVariant: 'tf-v-briefing',
    typeMode: 'modern',
    sceneThemes: ['office', 'cityLifestyle'],
    ribbon: 'посчитайте иначе',
    promptLine: 'Аналитический калькулятор жизни: взрослая деловая сцена, ощущение расчёта, инфографика только как абстрактная световая фактура, без читаемых цифр и интерфейсов.',
    cards: [
      { title: '40 лет стажа', text: 'Старый путь слишком длинный.' },
      { title: '8 часов в день', text: 'Цена времени становится видна.' },
      { title: 'Альтернатива', text: 'Сначала короткий разбор.' }
    ],
    proofItems: [
      { value: 'Время', label: 'главный ресурс' },
      { value: 'Расчёт', label: 'без эмоций' },
      { value: 'Выход', label: 'через систему' }
    ]
  },
  {
    id: 'ultimatum-fomo',
    label: 'Ультиматум',
    themeStyle: 'fomoHeat',
    designFamily: 'editorial-strike',
    landingVariant: 'tf-v-voltage',
    typeMode: 'condensed',
    sceneThemes: ['cityLifestyle', 'office', 'travel'],
    ribbon: 'жёсткая правда',
    promptLine: 'Ультиматум/FOMO: напряжённая динамика, красно-оранжевые акценты, чувство выбора и энергии, но без дешёвого страха и без визуальной грязи.',
    cards: [
      { title: 'Окно открыто', text: 'Не откладывать ещё на год.' },
      { title: 'Выбор за вами', text: 'Остаться или проверить систему.' },
      { title: 'Жёсткая правда', text: 'Старый путь сам не меняется.' }
    ],
    proofItems: [
      { value: 'Сейчас', label: 'не когда-нибудь' },
      { value: 'Выбор', label: 'без иллюзий' },
      { value: 'Решение', label: 'в мессенджере' }
    ]
  },
  {
    id: 'clean-checklist',
    label: 'Лаконичный чек-лист',
    themeStyle: 'cleanSystem',
    designFamily: 'split-premium',
    landingVariant: 'tf-v-briefing',
    typeMode: 'modern',
    sceneThemes: ['cityLifestyle', 'office', 'nature', 'travel'],
    ribbon: 'три элемента входа',
    promptLine: 'Лаконичный чек-лист: светлая чистая сцена, порядок, ясность, ощущение Notion/бумаги/плана, но изображение остаётся фото без текста.',
    cards: [
      { title: 'Убрать хаос', text: 'Сначала оставить только рабочую последовательность.' },
      { title: 'Понять связку', text: 'Увидеть, как посадочная и бот ведут дальше.' },
      { title: 'Открыть вход', text: 'Перейти в мессенджер без лишних действий.' }
    ],
    proofItems: [
      { value: 'Порядок', label: 'вместо хаоса' },
      { value: 'Связка', label: 'видно как работает' },
      { value: 'Вход', label: 'следующий шаг' }
    ]
  },
  {
    id: 'underground-club',
    label: 'Закрытый светлый доступ',
    themeStyle: 'glassPremium',
    designFamily: 'split-premium',
    landingVariant: 'tf-v-aurora',
    typeMode: 'condensed',
    sceneThemes: ['cityLifestyle', 'office', 'travel'],
    ribbon: 'доступ по ссылке',
    promptLine: 'Закрытый доступ: современная светлая городская или рабочая сцена, стекло, воздух, ощущение входа для своих, без тёмного клуба, пафоса и логотипов.',
    cards: [
      { title: 'Без лишних', text: 'Короткий вход для тех, кто готов.' },
      { title: 'Проверенный путь', text: 'Смотреть механику, не легенды.' },
      { title: 'Доступ по ссылке', text: 'Следующий шаг в мессенджере.' }
    ],
    proofItems: [
      { value: 'Доступ', label: 'через мессенджер' },
      { value: 'Свои', label: 'без публичного шума' },
      { value: 'Вход', label: 'короткий формат' }
    ]
  },
  {
    id: 'incognito-system',
    label: 'Механика без лица',
    themeStyle: 'glassPremium',
    designFamily: 'object-stage',
    landingVariant: 'tf-v-aurora',
    typeMode: 'modern',
    sceneThemes: ['office', 'cityLifestyle', 'nature', 'travel'],
    ribbon: 'без публичной роли',
    promptLine: 'Инкогнито/механика без лица: размытые силуэты, предметы, система, дверь, механизм или рабочая среда; можно без лица, без соцсетей и без публичной позы.',
    cards: [
      { title: 'Без лица', text: 'Не нужно становиться блогером.' },
      { title: 'Без соцсетей', text: 'Смотреть систему, а не витрину.' },
      { title: 'Только механизм', text: 'Первый шаг в мессенджере.' }
    ],
    proofItems: [
      { value: 'Инкогнито', label: 'без публичности' },
      { value: 'Механика', label: 'работает как система' },
      { value: 'Вход', label: 'без лишних ролей' }
    ]
  }
];

function findPrelandingConcept(id) {
  return PRELANDING_CONCEPTS.find((item) => item.id === id) || null;
}

function uniquePrelandingConcepts(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function pickPrelandingConcept({ headline = '', themeStyle = '', sceneTheme = 'auto', visualMode = 'generatedPerson', variantKey = '' } = {}) {
  const source = `${headline} ${themeStyle} ${sceneTheme} ${visualMode}`.toLowerCase();
  const brightDefaultConceptIds = [
    'reality-diary',
    'editorial-minimal',
    'blueprint-system',
    'clean-checklist',
    'behind-scenes',
    'life-calculator',
    'documentary-realism',
    'incognito-system',
    'time-compression',
    'brutal-manifest',
    'anti-infobiz'
  ];
  const preferred = [];
  const add = (...ids) => {
    ids.forEach((id) => {
      const concept = findPrelandingConcept(id);
      if (concept) preferred.push(concept);
    });
  };

  if (/курс|обуч|учишь|урок|инфобиз|покуп/.test(source)) {
    add('anti-infobiz', 'brutal-manifest', 'clean-checklist', 'editorial-minimal', 'documentary-realism');
  }
  if (/зарплат|деньг|доход|опор|тревог|хаос|найм|работ/.test(source)) {
    add('life-calculator', 'editorial-minimal', 'blueprint-system', 'reality-diary', 'clean-checklist');
  }
  if (/комис|выплат|партн|сделк|бот|воронк|связк/.test(source)) {
    add('behind-scenes', 'blueprint-system', 'clean-checklist', 'anti-infobiz', 'time-compression');
  }
  if (/подработ|за кадр|основной работе|процесс/.test(source)) {
    add('behind-scenes', 'blueprint-system', 'clean-checklist', 'reality-diary', 'incognito-system');
  }
  if (/соцсет|сторис|блог|лиц|публич|эксперт/.test(source) || visualMode === 'noPerson' || visualMode === 'metaphor') {
    add('incognito-system', 'anti-infobiz', 'blueprint-system', 'clean-checklist', 'behind-scenes');
  }
  if (/travel|nature|outdoor|путь|свобод/.test(source)) {
    add('reality-diary', 'editorial-minimal', 'life-calculator', 'documentary-realism', 'clean-checklist');
  }
  if (/red|fomo|heat|voltage|blackred/.test(source)) {
    add('ultimatum-fomo', 'brutal-manifest', 'anti-infobiz');
  }
  if (/terminal|lime|trading|system/.test(source)) {
    add('blueprint-system', 'terminal-system', 'clean-checklist', 'time-compression');
  }
  if (/premium|gold|white|editorial|calm/.test(source)) {
    add('editorial-minimal', 'clean-checklist', 'documentary-realism');
  }

  const preferredUnique = uniquePrelandingConcepts(preferred);
  const fallbackConcepts = brightDefaultConceptIds
    .map(findPrelandingConcept)
    .filter(Boolean);
  const pool = preferredUnique.length ? preferredUnique : fallbackConcepts;
  return pickHashed(`${source}|${variantKey}|prelanding-concept`, pool) || PRELANDING_CONCEPTS[0];
}

function pickPrelandingLayoutMode({ headline, sceneTheme = 'auto', themeStyle = 'blueTrust', variantKey = '', conceptId = '' }) {
  const combined = `${headline}-${sceneTheme}-${themeStyle}-${conceptId}-${variantKey}`.toLowerCase();
  const byConcept = {
    'documentary-realism': ['full-bleed-center', 'hero-compact-center', 'hero-float-bottom'],
    'reality-diary': ['hero-compact-center', 'hero-float-bottom', 'story-poster'],
    'time-compression': ['hero-float-bottom', 'full-bleed-center', 'hero-compact-center'],
    'blueprint-system': ['hero-compact-center', 'story-poster', 'hero-float-bottom'],
    'editorial-minimal': ['full-bleed-center', 'hero-compact-center', 'hero-float-bottom'],
    'cinematic-noir': ['hero-float-bottom', 'full-bleed-center', 'hero-compact-center'],
    'brutal-manifest': ['story-poster', 'hero-float-bottom', 'hero-compact-center'],
    'behind-scenes': ['hero-compact-center', 'full-bleed-center', 'hero-float-bottom'],
    'anti-infobiz': ['story-poster', 'hero-float-bottom', 'hero-compact-center'],
    'terminal-system': ['hero-compact-center', 'story-poster', 'hero-float-bottom'],
    'life-calculator': ['hero-float-bottom', 'full-bleed-center', 'story-poster'],
    'ultimatum-fomo': ['story-poster', 'hero-float-bottom', 'hero-compact-center'],
    'clean-checklist': ['hero-compact-center', 'full-bleed-center', 'story-poster'],
    'underground-club': ['full-bleed-center', 'story-poster', 'hero-float-bottom'],
    'incognito-system': ['full-bleed-center', 'hero-compact-center', 'story-poster']
  };
  if (conceptId && byConcept[conceptId]) {
    return pickHashed(combined, byConcept[conceptId]);
  }
  const byTheme = {
    office: ['hero-compact-center', 'full-bleed-center', 'story-poster'],
    cozyHome: ['full-bleed-center', 'hero-float-bottom', 'story-poster'],
    cityLifestyle: ['full-bleed-center', 'hero-compact-center', 'story-poster'],
    nature: ['full-bleed-center', 'hero-float-bottom', 'story-poster', 'hero-compact-center'],
    travel: ['full-bleed-center', 'hero-float-bottom', 'story-poster', 'hero-compact-center'],
    pets: ['hero-compact-center', 'hero-float-bottom', 'story-poster'],
    hobby: ['hero-compact-center', 'hero-float-bottom', 'story-poster'],
    craft: ['hero-compact-center', 'hero-float-bottom', 'story-poster']
  };
  if (sceneTheme && sceneTheme !== 'auto' && byTheme[sceneTheme]) {
    return pickHashed(combined, byTheme[sceneTheme]);
  }
  if (combined.includes('путь') || combined.includes('путь') || combined.includes('дорог') || combined.includes('свобод')) {
    return pickHashed(combined, ['full-bleed-center', 'hero-float-bottom', 'story-poster', 'hero-compact-center']);
  }
  if (combined.includes('уют') || combined.includes('дом') || combined.includes('спокой') || combined.includes('тревог')) {
    return pickHashed(combined, ['full-bleed-center', 'hero-compact-center', 'story-poster', 'hero-float-bottom']);
  }
  return pickHashed(combined, ['full-bleed-center', 'hero-compact-center', 'story-poster', 'hero-float-bottom']);
}

function pickPrelandingLandingVariant({ headline, themeStyle = 'blueTrust', variantKey = '' }) {
  const key = String(themeStyle || '').toLowerCase();
  const pools = [
    [/mint|green|outdoor|nature|travel/, ['tf-v-motion', 'tf-v-signal', 'tf-v-aurora', 'tf-v-mint', 'tf-v-cinema']],
    [/orange|yellow/, ['tf-v-atlas', 'tf-v-cinema', 'tf-v-editorial', 'tf-v-motion', 'tf-v-contrast']],
    [/red|shock/, ['tf-v-spotlight', 'tf-v-voltage', 'tf-v-contrast', 'tf-v-cinema', 'tf-v-briefing']],
    [/blue|glass/, ['tf-v-briefing', 'tf-v-motion', 'tf-v-signal', 'tf-v-aurora', 'tf-v-contrast']],
    [/premium|gold|white|editorial/, ['tf-v-editorial', 'tf-v-cinema', 'tf-v-atlas', 'tf-v-briefing', 'tf-v-aurora']],
    [/cosmic|purple|cyber/, ['tf-v-aurora', 'tf-v-voltage', 'tf-v-motion', 'tf-v-spotlight', 'tf-v-briefing']]
  ];
  const matched = pools.find(([pattern]) => pattern.test(key));
  const fallback = ['tf-v-cinema', 'tf-v-briefing', 'tf-v-motion', 'tf-v-signal', 'tf-v-aurora', 'tf-v-editorial', 'tf-v-atlas', 'tf-v-spotlight', 'tf-v-voltage', 'tf-v-contrast', 'tf-v-mint'];
  return pickHashed(`${headline}|${themeStyle}|${variantKey}|landing-variant`, matched ? matched[1] : fallback);
}

function pickPrelandingDesignFamily({ headline, themeStyle = 'blueTrust', sceneTheme = 'auto', visualMode = 'generatedPerson', variantKey = '' }) {
  const key = `${headline} ${themeStyle} ${sceneTheme} ${visualMode}`.toLowerCase();
  if (visualMode === 'noPerson' || visualMode === 'metaphor' || /cosmic|animal|object|метафор/.test(key)) {
    return pickHashed(`${key}|${variantKey}|design`, ['cinematic', 'object-stage', 'split-premium', 'editorial-strike', 'price-signal']);
  }
  if (/курс|обуч|учишь|покуп|результат/.test(key)) {
    return pickHashed(`${key}|${variantKey}|design`, ['cinematic', 'split-premium', 'object-stage', 'editorial-strike', 'price-signal']);
  }
  if (/деньг|комис|доход|опор|зарплат|найм/.test(key)) {
    return pickHashed(`${key}|${variantKey}|design`, ['cinematic', 'price-signal', 'split-premium', 'object-stage', 'editorial-strike']);
  }
  if (/white|gold|premium|clean|editorial|outdoor|nature|travel/.test(key)) {
    return pickHashed(`${key}|${variantKey}|design`, ['cinematic', 'split-premium', 'object-stage', 'editorial-strike', 'price-signal']);
  }
  return pickHashed(`${key}|${variantKey}|design`, ['cinematic', 'split-premium', 'object-stage', 'price-signal', 'editorial-strike']);
}

function pickPrelandingTypeMode({ headline, layoutMode = 'hero-compact-center', themeStyle = 'blueTrust', variantKey = '' }) {
  const text = `${headline}-${layoutMode}-${themeStyle}-${variantKey}`.toLowerCase();
  if (layoutMode === 'hero-float-right') return pickHashed(text, ['poster', 'condensed', 'modern']);
  if (layoutMode === 'hero-float-left') return pickHashed(text, ['poster', 'condensed', 'modern']);
  if (layoutMode === 'story-poster') return pickHashed(text, ['poster', 'condensed', 'modern']);
  if (layoutMode === 'hero-float-bottom') return pickHashed(text, ['poster', 'condensed', 'modern']);
  return pickHashed(text, ['poster', 'condensed']);
}

function pickCompanionPrelandingSceneTheme(bannerSceneTheme = 'auto', headline = '', variantKey = '') {
  const alternatives = {
    office: ['cityLifestyle', 'nature', 'travel', 'office'],
    cozyHome: ['cityLifestyle', 'nature', 'hobby', 'office'],
    cityLifestyle: ['nature', 'travel', 'office', 'cityLifestyle'],
    nature: ['nature', 'hobby', 'cityLifestyle', 'travel'],
    travel: ['nature', 'cityLifestyle', 'travel', 'office'],
    pets: ['cityLifestyle', 'hobby', 'nature', 'pets'],
    hobby: ['hobby', 'nature', 'cityLifestyle', 'travel'],
    craft: ['cityLifestyle', 'nature', 'hobby', 'travel'],
    auto: ['cityLifestyle', 'nature', 'travel', 'office']
  };
  const pool = alternatives[bannerSceneTheme] || alternatives.auto;
  const picked = pickHashed(`${headline}|${bannerSceneTheme}|prelanding|${variantKey}`, pool) || 'cityLifestyle';
  const canKeepOriginalScene = ['nature', 'hobby', 'craft', 'pets'].includes(bannerSceneTheme);
  return picked === bannerSceneTheme && !canKeepOriginalScene ? (pool.find((item) => item !== bannerSceneTheme) || picked) : picked;
}

function pickAutoSceneTheme(headline, angle = '', visualMode = 'generatedPerson', stylePreset = '', variantKey = '') {
  const text = String(headline || '').toLowerCase();
  const angleText = String(angle || '').toLowerCase();
  const style = String(stylePreset || '').toLowerCase();
  const combined = `${text} ${angleText} ${style} ${variantKey}`;
  if (visualMode === 'noPerson') return pickHashed(combined, ['seaEscape', 'cityMomentum', 'nature', 'offroadAdventure']);
  if (visualMode === 'metaphor') return pickHashed(combined, ['cityMomentum', 'seaEscape', 'nature', 'premiumDrive']);
  if (combined.includes('рыбал') || combined.includes('охот') || combined.includes('шить') || combined.includes('вяз') || combined.includes('сад') || combined.includes('мастер')) {
    return pickHashed(combined, ['offroadAdventure', 'hobby', 'craft', 'nature']);
  }
  if (combined.includes('кот') || combined.includes('собак') || combined.includes('питом')) {
    return pickHashed(combined, ['pets', 'cityLifestyle', 'nature']);
  }
  if (combined.includes('подработ') || combined.includes('за кадр') || combined.includes('основной работе') || combined.includes('процесс')) {
    return pickHashed(combined, ['cityMomentum', 'premiumDrive', 'seaEscape', 'offroadAdventure']);
  }
  if (combined.includes('путь') || combined.includes('путь') || combined.includes('выйти') || combined.includes('вышли') || combined.includes('свобод')) {
    return pickHashed(combined, ['seaEscape', 'offroadAdventure', 'cityMomentum', 'nature']);
  }
  if (combined.includes('зарплат') || combined.includes('найм') || combined.includes('работ') || combined.includes('офис')) {
    return pickHashed(combined, ['premiumDrive', 'cityMomentum', 'seaEscape', 'offroadAdventure']);
  }
  if (combined.includes('тревог') || combined.includes('хаос') || combined.includes('устал') || combined.includes('спокой')) {
    return pickHashed(combined, ['seaEscape', 'nature', 'cozyHome', 'offroadAdventure']);
  }
  if (combined.includes('доход') || combined.includes('деньг') || combined.includes('комис') || combined.includes('результат')) {
    return pickHashed(combined, ['premiumDrive', 'seaEscape', 'cityMomentum', 'offroadAdventure']);
  }
  return pickHashed(combined, ['cityMomentum', 'premiumDrive', 'seaEscape', 'offroadAdventure', 'cozyHome', 'nature']);
}

function pickAutoStyle(headline, persona, sceneTheme = 'auto', variantKey = '') {
  const text = String(headline || '').toLowerCase();
  if (sceneTheme !== 'auto') {
    const byTheme = {
      office: ['blueTrust', 'cleanSystem', 'glassPremium', 'whiteGoldPremium'],
      cozyHome: ['greenSystem', 'whiteGoldPremium', 'editorialGold'],
      cityLifestyle: ['blueTrust', 'glassPremium', 'whiteGoldPremium', 'messengerNative', 'editorialGold'],
      nature: ['outdoorFreedom', 'greenSystem', 'whiteGoldPremium', 'editorialGold'],
      travel: ['outdoorFreedom', 'blueTrust', 'whiteGoldPremium', 'greenSystem'],
      pets: ['greenSystem', 'whiteGoldPremium', 'editorialGold'],
      hobby: ['outdoorFreedom', 'greenSystem', 'whiteGoldPremium', 'editorialGold'],
      craft: ['editorialGold', 'greenSystem', 'whiteGoldPremium', 'cleanSystem']
    };
    const themePool = VISUAL_WORLD_STYLE_HINTS[sceneTheme] || byTheme[sceneTheme] || ['redWhite', 'greenSystem', 'blueTrust'];
    return pickHashed(`${sceneTheme}-${persona}-${text}-${variantKey}`, themePool);
  }
  if (text.includes('курс') || text.includes('обуч') || text.includes('пробовать') || text.includes('результат')) {
    return pickHashed(`${text}-${variantKey}`, ['blueTrust', 'greenSystem', 'whiteGoldPremium', 'cleanSystem', 'editorialGold']);
  }
  if (text.includes('сам') || text.includes('разбираться') || text.includes('готов') || text.includes('систем')) {
    return pickHashed(`${text}-${variantKey}`, ['greenSystem', 'blueTrust', 'glassPremium', 'cleanSystem', 'whiteGoldPremium']);
  }
  if (text.includes('сложн') || text.includes('путь') || text.includes('год')) {
    return pickHashed(`${text}-${variantKey}`, ['whiteGoldPremium', 'blueTrust', 'editorialGold', 'outdoorFreedom']);
  }
  if (text.includes('деньг') || text.includes('комис') || text.includes('доход') || text.includes('сделк')) {
    return pickHashed(`${text}-${variantKey}`, ['blueTrust', 'moneyProof', 'whiteGoldPremium', 'greenSystem', 'glassPremium']);
  }
  if (text.includes('найм') || text.includes('зарплат') || text.includes('работ')) {
    return pickHashed(`${text}-${variantKey}`, ['outdoorFreedom', 'blueTrust', 'greenSystem', 'editorialGold']);
  }
  return pickHashed(`${persona}-${text}-${variantKey}`, ['blueTrust', 'editorialGold', 'greenSystem', 'whiteGoldPremium', 'outdoorFreedom', 'glassPremium']);
}

function sceneThemePrompt(sceneTheme, { noPerson = false, metaphor = false } = {}) {
  const map = {
    cityMomentum: 'Сцена городского движения: современная архитектура, улица, переход, терраса или набережная, уверенный ритм и дорогой естественный свет. Не превращай её в статичный офисный портрет.',
    premiumDrive: 'Сцена взрослого премиального lifestyle: современный автомобиль без логотипа, городская архитектура, костюм, пальто или smart casual. Статус считывается через качество кадра, а не через показную роскошь.',
    seaEscape: 'Сцена у моря: берег, светлая марина, курортная архитектура, терраса или набережная. Нужны воздух, свобода и взрослый lifestyle без туристического китча.',
    offroadAdventure: 'Сцена активной жизни: современный внедорожник без логотипа, палатка или лагерь, лес, озеро либо горы. Практичная outdoor-одежда, никаких военных и гоночных клише.',
    office: 'Сцена современная рабочая: кабинет, стол, ноутбук, переговорка, окно, вечерний или дневной свет. Не делай кадр скучным стоком.',
    cozyHome: 'Сцена тёплая, домашняя и живая: мягкий свет, кресло, кухня-гостиная, чай, плед, ощущение спокойствия и выдоха после хаоса.',
    cityLifestyle: 'Сцена современного lifestyle: кафе, город, светлое пространство, стекло, улица, движение жизни, приятная дорогая подача без глянцевой фальши.',
    nature: 'Сцена с простором и воздухом: горы, лес, обзорная точка, озеро, утро, естественный свет, ощущение свободы и нового уровня.',
    travel: 'Сцена движения и пути: светлая улица, станция, чемодан, смотровая точка, шаг вперёд, ощущение смены сценария. Не делай главным кадром серую трассу, случайную машину или остановку.',
    pets: 'Сцена тёплая и эмоциональная: кот или собака как естественная часть кадра, уют, жизнь, спокойствие, человечность, без мемности.',
    hobby: 'Сцена вокруг дела для себя: рыбалка, шитьё, сад, прогулка, ремесло, спорт, мастерство, занятие, которое даёт ощущение живой жизни.',
    craft: 'Сцена мастерской или ручной работы: ткани, дерево, инструменты, блокнот, руки в деле, фактура, внимательность, настоящее ремесло.'
  };
  const themeLine = map[sceneTheme] || '';
  const extra = noPerson
    ? 'Можно вообще без человека: пусть главный объект и окружение сами держат смысл и эмоцию.'
    : metaphor
      ? 'Можно собрать сцену через сильный образ и окружение, не обязательно с классическим портретом в лоб.'
      : 'Не загоняй композицию в один и тот же шаблон "человек у ноутбука": можно полурост, полный рост, движение, взгляд в сторону, естественная поза.';
  return [themeLine, extra].filter(Boolean).join(' ');
}

function rewriteHeadlineVariant(headline) {
  const source = String(headline || '').trim();
  if (!source) return '';
  const variants = [
    source.replace(/^пока вы/i, 'Пока одни').replace(/курсы/i, 'курсы и схемы'),
    source.replace(/постоянно/i, 'Снова').replace(/не меняется/i, 'стоит на месте'),
    source.replace(/пытаешься/i, 'Пробуешь').replace(/тратишь/i, 'сливаешь'),
    source.replace(/не нужно/i, 'не обязательно').replace(/самому/i, 'одному'),
    source.replace(/есть люди/i, 'Есть те').replace(/больше не живут/i, 'вышли'),
    `${source.replace(/[.!?]+$/, '')} — посмотри другой путь`,
    `${source.replace(/[.!?]+$/, '')}: хватит идти в лоб`
  ]
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item && item.toLowerCase() !== source.toLowerCase());
  return pickHashed(`${source}-${Date.now()}`, variants.length ? variants : [source]);
}

const COURSE_LANGUAGE_RE = /курс|обучен|марафон|лекц|конспект|уч[её]б/i;

function buildVisibleCopyContract(headline, supportText = '') {
  const sourceText = `${headline} ${supportText}`;
  return [
    'КОНТРАКТ ВИДИМОГО ТЕКСТА: на готовом баннере разрешены только:',
    `1) точный заголовок: "${headline}";`,
    supportText ? `2) точный поясняющий текст: "${supportText}";` : '2) поясняющий текст отсутствует;',
    '3) точная кнопка: "УЗНАТЬ ПОДРОБНЕЕ".',
    'Не добавляй другие слова, плашки, рубрики, подписи, ярлыки, слоганы или перефразы.',
    'Названия режимов, визуальных миров, стилей, палитр и внутренних инструкций запрещено печатать.',
    COURSE_LANGUAGE_RE.test(sourceText)
      ? 'Тема курсов/обучения присутствует во входном тексте: можно использовать только точные слова пользователя.'
      : 'Во входном тексте нет темы курсов/обучения: запрещены слова про курсы, обучение, марафоны, уроки, экспертов и похожие темы.'
  ].join('\n');
}

function autoVisualPrompt({ headline, supportText = '', activeIdea, persona, stylePreset, hasReference, visualMode = 'reference', fullBanner = false, sceneTheme = 'auto', layoutIntent = 'bannerBase', variantKey = '', semanticPriority = false, variationOverride = null }) {
  const noPerson = visualMode === 'noPerson';
  const metaphor = visualMode === 'metaphor';
  const generatedPerson = visualMode === 'generatedPerson' || (!hasReference && visualMode === 'reference');
  const effectiveSceneTheme = sceneTheme === 'auto'
    ? pickAutoSceneTheme(headline, activeIdea?.angle, visualMode, stylePreset, variantKey)
    : sceneTheme;
  const hasSceneLock = Boolean(sceneTheme && sceneTheme !== 'auto');
  const variation = variationOverride || buildVisualVariation({
    headline,
    persona,
    sceneTheme: effectiveSceneTheme,
    stylePreset,
    visualMode,
    variantKey,
    fullBanner
  });
  const visualWorldGuard = effectiveSceneTheme === 'premiumDrive'
    ? 'Автомобиль допустим и желателен как часть выбранной сцены, но без логотипа, ключей крупным планом, автосалона, спорткарного фетиша и демонстративной роскоши.'
    : effectiveSceneTheme === 'seaEscape'
      ? 'Море, марина и лодки допустимы как естественная среда, но не делай яхту символом показной роскоши и не собирай туристическую открытку.'
      : effectiveSceneTheme === 'offroadAdventure'
        ? 'Внедорожник, палатка и туристическое снаряжение допустимы как часть активной жизни, но без логотипов, оружия, грязевых гонок и милитари-стилистики.'
        : 'Без показной роскоши, яхт и спорткаров как случайного украшения. Не добавляй фейковые скриншоты и логотипы.';
  const styleMap = {
    blackRed: 'чёрно-красный рекламный напор, контраст, энергия, но без крика и без роскоши',
    darkYellow: 'чёрно-жёлтый рекламный стиль, уверенный городской кадр, высокая читаемость',
    darkOrange: 'чёрно-оранжевый рекламный стиль, сильный контраст, живой городской кадр',
    greenSystem: 'бело-зелёный стиль понятной системы, чисто, спокойно, уверенно',
    heroBright: 'светлый hero-лендинг: чистый дневной свет, насыщенная картинка, контрастные мятно-синие акценты, без темноты и без пустой белой плиты',
    blueTrust: 'сине-белый доверительный стиль, аккуратно и профессионально',
    whiteGoldPremium: 'бело-золотой премиум, светлый воздух, живое лицо, без пафоса',
    editorialGold: 'светлый редакционный премиум, белый и золото, жизненно и дорого без понтов',
    purple: 'тёмный фиолетовый разрыв шаблона, глубокий фон, осознание и поворот',
    redWhite: 'белый фон с красным акцентом, чистый рекламный удар, крупный контрастный заголовок',
    cleanSystem: 'чистый современный SaaS-премиум, белый фон, синий акцент, дорогая типографика без шума',
    outdoorFreedom: 'светлый лайфстайл на природе или у окна, зелёные/земляные акценты, ощущение свободы без роскоши',
    documentaryNoir: 'документальный noir, тёмный честный кадр, фактурный свет, ощущение реальной истории',
    newspaperShock: 'газетный шок: белый верх, жёлтые маркерные подложки, крупный чёрный текст, простая жизненная фотография',
    fintechRed: 'тёмный финтех с красным акцентом, ощущение выплаты и системы, без банковских логотипов',
    glassPremium: 'стеклянный премиум: тёмно-синий фон, световые блики, чистые панели, современно и дорого без пафоса',
    cosmicMetaphor: 'космическая метафора: орбита, тёмный фон, световой разрыв, ощущение выхода из хаоса в систему',
    animalMetaphor: 'живая метафора без человека: сильный символический образ, путь, ловушка или спокойная сила, но без детскости',
    blueprintTech: 'blueprint tech: сине-белая архитектура системы, ощущение чертежа и сборки механизма, аккуратные световые линии без читаемых букв и интерфейсов',
    terminalLime: 'тёмный fintech/trading terminal: чёрный фон, мятно-зелёные сигналы, цифры как ощущение системы, но без фейковых интерфейсов и логотипов',
    fomoHeat: 'FOMO heat: оранжево-красная энергия, ощущение срочного входа, высокий контраст, но без дешёвого крика',
    neoBrutal: 'neo-brutal ad poster: жёсткие формы, красный/жёлтый удар, крупная типографика, эффект стоп-скролла без визуального мусора',
    editorialShock: 'editorial shock: газетно-журнальный стиль, светлая фактура, контрастный заголовок, маркерные акценты и настоящий lifestyle',
    premiumCalm: 'premium calm: светлый дорогой минимализм, золото/чёрный/воздух, доверие и взрослая аудитория',
    messengerNative: 'messenger native: ощущение живого перехода в Telegram/MAX, чистые голубые/мятные акценты, дружелюбная плотная подача',
    kineticColor: 'kinetic color: яркая динамика, диагонали, движение и цветовой разрыв шаблона, но текстовая зона остаётся чистой'
  };
  const sourceVisualPrompt = String(activeIdea?.visualPrompt || '');
  const normalizedSourceVisualPrompt = normalizeVisualPromptForPersona(sourceVisualPrompt, persona);
  const shouldIgnorePresetScene = semanticPriority || hasSceneLock || !['office', 'cozyHome', 'craft'].includes(effectiveSceneTheme);
  const meaningLine = shouldIgnorePresetScene
    ? `Смысл баннера задают только заголовок «${headline}» и пояснение «${supportText}». Не добавляй отдельный маркетинговый угол или тему, которых нет в этих двух полях. Старую сцену из пресета не копируй.`
    : normalizedSourceVisualPrompt
    ? `Базовый смысл баннера: ${normalizedSourceVisualPrompt}. Не копируй этот сюжет буквально; возьми конфликт, боль и обещание, но смени героя, место, одежду, ракурс, свет, палитру и композицию.`
    : '';
  const semanticDirectorLine = semanticPriority
    ? `Режиссёрский приоритет: прочитай вместе заголовок «${headline}» и пояснение «${supportText}». Изображение должно показывать действие, выбор или конфликт из этой пары. Локация служит смыслу и не может быть случайным курортом, автомобилем, офисом или красивым портретом.`
    : 'Ручной визуальный мир зафиксирован пользователем. Сохрани его, но действие героя и детали всё равно должны объяснять заголовок и пояснение.';
  const subjectLine = noPerson
    ? 'Без человека в кадре: предметная или символическая сцена, например дверь, система, механизм, мастерская, окно, рюкзак, обзорная точка, свет в конце хаоса. Не добавляй случайных людей.'
    : metaphor
      ? 'Можно использовать сильную метафору вместо человека: животное, космический разрыв, лабиринт, механизм, дверь, путь или предметный символ. Если человек не нужен по композиции — не рисуй его.'
      : generatedPerson
        ? `Главный герой: ${variation.personLine}. Лицо живое, не модельное, без пластика. Это новый человек и новый типаж, не повторяй прежнее лицо.`
        : 'Главный герой — человек на загруженной фотографии. Сохрани пол, возрастной типаж и узнаваемые черты с фотографии, не заменяй его случайной женщиной или мужчиной, но сделай кадр как сильную рекламную фотографию.';
  const common = [
    visualSceneLockPrompt(effectiveSceneTheme),
    visualStyleLockPrompt(stylePreset, styleMap),
    'Общее настроение кадра: светлее, свежее, дороже и живее. Не делай хмурый тёмный баннер, грустное лицо, мрачную мастерскую, грязный контраст или однотипный драматичный noir, если это не было явно выбрано вручную.',
    'Жёсткий запрет на уставшие и возрастные клише: не рисуй пожилую бабушку, грустную пенсионерку, серого усталого человека у окна, сутулую позу, пустой взгляд, тёмную мастерскую и зелёно-чёрный свет. Если герой старше 45, он всё равно должен выглядеть энергично, современно и живо.',
    'Фото должно быть ярче обычного рекламного превью: чистый дневной свет, читаемое лицо/фигура, ясный передний план, без мутной темноты и без ощущения скриншота из подвала.',
    'Если пользователь не дал своё фото, не делай серую стоковую сцену. Покажи сильный смысловой объект, действие, среду, метафору или человека только когда он реально нужен.',
    generatedPerson || noPerson || metaphor ? variation.sceneLine : '',
    subjectLine,
    semanticDirectorLine,
    meaningLine,
    variation.cameraLine,
    variation.compositionLine,
    variation.designLine,
    variation.antiRepeatLine,
    generatedPerson && persona === 'woman'
      ? 'Особенно важно: не рисуй одиночного мужчину 40-55 с аккуратной сединой на улице/в кафе. Такой типаж уже надоел и запрещён для этой генерации.'
      : '',
    noPerson || metaphor
      ? 'Не подсовывай случайный портрет человека для красоты. Главный кадр держат объект, действие, среда, путь, фактура или сильный символ.'
      : '',
    buildVisualMemoryAvoidanceLine(readVisualMemory()),
    styleMap[stylePreset] || styleMap.editorialGold,
    sceneThemePrompt(effectiveSceneTheme, { noPerson, metaphor }),
    noPerson || metaphor ? 'Если выбран формат без героя, не подставляй случайную женщину или мужчину просто для красоты.' : 'Если приложена фотография мужчины — рисуй мужчину. Если приложена фотография женщины — рисуй женщину. Не меняй пол и не подставляй случайного персонажа.',
    noPerson || metaphor ? 'Главный объект не обрезать и не закрывать плашками.' : 'Лицо не обрезать, не закрывать плашками, руки не искажать, взгляд живой.',
    visualWorldGuard,
    buildVisibleCopyContract(headline, supportText)
  ];

  if (fullBanner) {
    return [
      `Сделай готовый рекламный баннер 1:1 с крупным русским заголовком: "${headline}".`,
      ...common,
      noPerson || metaphor
        ? 'Композиция как у сильного ChatGPT image banner: главный символ/сцена может быть слева, справа, сверху или по диагонали; текст крупно и читаемо встроен в свободную зону, без визуального мусора.'
        : 'Композиция как у сильного ChatGPT image banner: герой может быть слева, справа, в движении, в полурост или в полный рост; текст крупно и читаемо в свободной зоне, без перекрытия лица.',
      `Сделай баннер бодрым, ярким и кликабельным. Строго держи выбранный цветовой код: ${styleMap[stylePreset] || styleMap.editorialGold}. Не своди каждый вариант к синей рубашке и синему фону.`,
      'Изображение не должно выглядеть тёмным после наложения текста. Осветли лицо, одежду и фон заранее, оставь хороший контраст и насыщенность.',
      'Не повторяй один и тот же чёрно-жёлтый макет, одного и того же мужчину, одно и то же кафе/офис/ноутбук/чашку. Каждый новый баннер должен ощущаться как новая рекламная идея.',
      'Типографика: жирный сжатый русский шрифт, высокий контраст, 2-4 строки. Ключевые слова выделяй цветом текущей палитры, не используй жёлтый по умолчанию.',
      'Можно добавить одну простую графическую форму без текста. Любой дополнительный видимый текст запрещён.'
    ].filter(Boolean).join('\n');
  }

  return [
    `Сделай премиальную фотооснову для рекламного баннера 1:1 под заголовок: "${headline}".`,
    ...common,
    layoutIntent === 'immersiveHero'
      ? 'Композиция: один непрерывный full-bleed сюжет на весь кадр. Главный герой или объект может быть справа, слева или ближе к центру, но лицо не должно попадать в будущую зону крупного заголовка. Оставь спокойную часть той же сцены под текст: свет, интерьер, фактура, перспектива, воздух, но не глухую панель и не пустую заливку. Запрещены split-screen, вертикальный шов, отдельный приклеенный портрет и две несвязанные половины.'
      : noPerson || metaphor
        ? 'Композиция: предметный или метафоричный главный объект занимает одну сторону кадра, на другой стороне много чистого места под крупный русский заголовок.'
        : 'Композиция: герой занимает одну сторону кадра, на другой стороне много чистого свободного места под крупный русский заголовок.',
    'Не повторяй одну и ту же фотосцену. Для каждой новой генерации меняй типаж, свет, место, одежду, позу, расстояние камеры и предметы в кадре.',
    'Сцена современная и дорогая без понтов. Подбирай окружение по смыслу и выбранному сюжету: город, дом, путь, природа, хобби, питомцы, светлая студия или рабочая сцена.',
    'Важно: НЕ рисуй текст, буквы, цифры, логотипы, кнопки, иконки и рамки внутри изображения. Только качественная фотооснова.'
  ].filter(Boolean).join('\n');
}

function buildPrelandingScenePrompt({ headline, activeIdea, persona, stylePreset, hasReference, visualMode = 'generatedPerson', sceneTheme = 'auto', layoutMode = 'hero-compact-center', variantKey = '', visualVariation = null, visualLock = '', prelandingConcept = null }) {
  const layoutPromptMap = {
    'hero-float-left': 'Для будущего HTML компактная карточка с заголовком будет стоять в левой части кадра. Лицо, глаза и главный визуальный контакт держи правее, примерно 54-76% ширины, не у самой кромки. В зоне под текстом не нужна пустая тёмная плита: там должна продолжаться живая сцена, просто спокойнее по деталям.',
    'hero-float-right': 'Для будущего HTML компактная карточка с заголовком будет стоять в правой части кадра. Лицо, глаза и главный визуальный контакт держи левее, примерно 12-42% ширины. В зоне под текстом не нужна пустая тёмная плита: там должна продолжаться живая сцена, просто спокойнее по деталям.',
    'hero-compact-center': 'Для будущего HTML компактная карточка будет слегка заходить на нижнюю часть изображения. Сверху и в центре нужна сильная живая фотография, а не пустое поле под огромный текст. Главный объект держи так, чтобы карточка не резала лицо.',
    'full-bleed-center': 'Для будущего HTML текст будет компактнее и не должен съедать весь кадр. Нужна единая светлая full-bleed сцена с воздухом, героем, объектом или перспективой, но без лица прямо под будущей карточкой.',
    'hero-float-bottom': 'Для будущего HTML текстовая карточка и кнопки будут ближе к низу. Верх кадра должен работать как самостоятельная яркая фотография, а лицо/объект держи с запасом воздуха и без обрезки.',
    'story-poster': 'Для будущего HTML текст будет в компактной постерной карточке. Выбери живую диагональную композицию, где герой/объект и среда связаны светом и перспективой, без пустой чёрной половины.'
  };
  const layoutPrompt = layoutPromptMap[layoutMode] || layoutPromptMap['hero-compact-center'];
  const base = autoVisualPrompt({
    headline,
    activeIdea,
    persona,
    stylePreset,
    hasReference,
    visualMode,
    fullBanner: false,
    sceneTheme,
    layoutIntent: 'immersiveHero',
    variantKey,
    variationOverride: visualVariation
  });
  const travelGuard = sceneTheme === 'travel'
    ? 'Если выбран сюжет движения/пути, не делай дешёвую серую дорогу с машиной вдалеке. Нужен премиальный живой кадр: человек, архитектура, свет, точка решения, резкий foreground, без мыльной трассы, остановки, случайного авто и вида из окна.'
    : 'Не используй дальний вид на дорогу, машину, остановку, платформу, вокзал, серый городской проезд или дождливую трассу как основной кадр. Такие сцены выглядят как случайный фон и запрещены для предлендинга, если пользователь прямо не выбрал сюжет дороги.';
  const conceptLine = prelandingConcept?.promptLine
    ? `Режиссёрская концепция этого прелендинга: ${prelandingConcept.promptLine}`
    : '';
  return [
    base,
    conceptLine,
    layoutPrompt,
    visualLock ? `Сохрани смысловую связку выбранного баннера: ${visualLock}. Но не копируй баннер буквально: сделай новый кадр, другой ракурс, другой свет и другое ощущение первого экрана. Если нет референс-фото клиента, не повторяй то же лицо и ту же позу.` : '',
    'Это не баннер и не карточка товара. Это hero-сцена для сильного одноэкранного прелендинга.',
    'Сцена должна быть яркой, продающей и контрастной: чистый дневной свет, заметный цветовой акцент, ощущение энергии и следующего шага. Не делай тусклый серо-чёрный фон, мутную комнату, грязный офисный полумрак или унылую стоковую драму.',
    'Сделай картинку достаточно светлой и выразительной, чтобы после HTML-затемнения она всё равно читалась на desktop и mobile: лицо/объект не должен тонуть в темноте, фон должен иметь заметные световые пятна, глубину и живой цвет.',
    'Герой не должен выглядеть как случайный грустный пенсионер, усталый стоковый бизнесмен, пожилая женщина из мрачной мастерской или сгенерированный манекен. Нужен живой активный человек с ясным взглядом, нормальной кожей, естественной позой и ощущением решения.',
    'Жёсткий анти-повтор: не используй снова пожилую женщину в тёмной мастерской, у большого окна, с ремесленными материалами и зелёно-чёрным светом. Такой визуал уже был слишком много раз. Если текущий путь не требует мастерскую вручную, выбери другой мир: город, природу, путь, дом, предметную систему, хобби, питомца или светлое рабочее пространство.',
    'Кадр должен вызывать желание нажать кнопку: больше света, движения, воздуха, пути, современной среды и визуального контраста.',
    'Формат изображения: landscape 1536x1024, широкий рекламный hero, не квадрат и не портрет. Думай как под премиальный минималистичный первый экран: HTML положит отдельные аккуратные блоки текста и кнопок поверх сцены, поэтому картинка должна оставаться цельной, живой и красивой сама по себе.',
    'HTML-оверлей на desktop занимает левую нижне-среднюю safe-zone: примерно x=5-40% ширины и y=22-74% высоты. В этой зоне НЕЛЬЗЯ размещать лицо, голову, глаза, главный объект, важные руки или силуэт героя. Там должна быть спокойная часть той же сцены: архитектура, воздух, свет, фактура, но без пустой заливки.',
    'Главный человек/лицо для desktop держи в центрально-правой визуальной зоне, примерно x=54-76% ширины и y=18-62% высоты, не у самой кромки, чтобы mobile cover-crop тоже поймал героя. Это не split-screen: фон, перспектива и свет должны связывать левую и правую часть в одну фотографию.',
    'Для mobile safe-zone другая: HTML-карточка будет ниже верхней фотографии, кнопки и короткие пункты снизу. Поэтому лицо/главный объект не ставь вплотную к верхним 18% и нижним 22% кадра; лучший вариант — человек в центрально-правой средней зоне x=44-72%, с воздухом вокруг и без обрезки головы.',
    'Запрещено генерировать пустой город, пустую набережную, пустой офис, случайную улицу или кадр, где герой почти полностью спрятан за будущей карточкой. В кадре должен быть ясный эмоциональный главный объект, но не в зоне будущего текста.',
    'Жёсткий запрет: внутри hero-сцены не должно быть надписей, букв, цифр, логотипов, кнопок, интерфейсных плашек, водяных знаков или фрагментов готового баннера. Только чистая фото-сцена, весь текст добавит HTML.',
    'Качество обязательно как у хорошей рекламной фотографии: резкий главный объект, чистая оптика, без мыла, без артефактов, без странных кружков, линий, декоративных UI-элементов, рамок, схем, букв, водяных знаков и псевдо-интерфейсов внутри картинки.',
    'Запрещено: размытый апскейл, low-resolution stock, мыльное лицо, дешёвый фотобанк, фронтальный паспортный портрет, человек в лоб по центру, странные руки, пластиковая кожа, мутные глаза. Нужна дорогая резкая рекламная фотография.',
    'Запрещена сильная размытость фона как главный художественный приём. Не делай bokeh/soft focus/смазанную комнату/мутное окно. Hero-сцена должна держать детализацию на большом desktop-экране: фактура ткани, мебели, лица, рук, предметов и пространства должна читаться.',
    'Если кадр без человека, в нём всё равно нужен ясный главный объект или символ: дверь, свет, система, предмет, действие, путь. Не делай пустую комнату, пустое кресло, просто окно со шторами или интерьер без события.',
    travelGuard,
    'Не делай кадр так, будто он снят из окна машины, с регистратора, дешёвого телефона или камеры наблюдения. Нужна постановочная рекламная фотография с ясным главным объектом, глубиной, светом и дорогой оптикой.',
    'Если в кадре человек, он не должен занимать половину всего экрана крупным лицом. Лучше средний/широкий план, человек встроен в среду, лицо резкое, но не залезает под будущий текст.',
    'Не рисуй отдельные графические плашки, круги, стрелки, линии, орбиты и значки в самой сцене. Всё текстовое и кнопочное будет добавлено HTML-версткой поверх, поэтому изображение должно быть только фотоосновой.',
    'Сделай дорогой живой full-bleed кадр с воздухом, глубиной и эмоцией. Это должен быть цельный широкий cinematic/lifestyle кадр на весь экран, как заставка сильного одностраничного сайта, а не левая текстовая половина плюс отдельная правая фотография.',
    'Герой или главный объект может жить в левой, правой или центральной зоне кадра, если композиция выглядит цельной. Лицо и главный визуальный контакт не должны попадать под будущий заголовок. Под текстом нужна спокойная часть той же сцены: свет, интерьер, фактура, глубина, но без глухой чёрной панели.',
    'Мобильный приоритет: верхние 48-55% кадра должны сами выглядеть как сильная живая фотография для первого экрана телефона. Не делай там пустую тёмную зону под текст. Герой, среда, свет или главный объект должны читаться сразу; нижние 18-26% кадра можно оставить спокойнее, потому что HTML-карточка с заголовком слегка зайдёт на низ изображения.',
    'Мобильная верстка будет состоять из компактных блоков: карточка заголовка, плашка метода, кнопки и короткие смысловые карточки. Поэтому картинка должна давать живую сцену и свет на весь экран, а не имитировать весь лендинг внутри изображения. Оставь безопасные зоны: вверху и снизу не ставь лицо, важные руки или главный объект вплотную к краям.',
    'Кадрируй героя безопасно для full-bleed HTML: лицо должно быть видно целиком, лоб/волосы/подбородок не обрезаны, над головой оставь 10-16% воздуха. Не ставь лицо вплотную к верхнему краю. Предпочитай средний план, полурост или полный рост, чтобы при cover-обрезке сайта человек всё равно оставался в кадре.',
    'Самое важное: не ставь лицо в центр будущего заголовка. Если герой слева — оставь справа чистую живую зону под текст. Если герой справа — оставь слева чистую живую зону под текст. Если герой в центре — сделай его ниже, выше или сильно в сторону, чтобы надпись не резала лицо.',
    'Если есть сомнение в композиции, всегда выбирай единый широкий киношный кадр, где герой, среда, свет и предметы живут в одной непрерывной сцене, а не разъезжаются по двум половинам. Формат ощущения — hero-image для премиального лендинга, а не постер из двух блоков.',
    'Главный герой или главный объект должен смотреться естественно, не как бейджик и не как квадратный аватар. Предпочитай средний или широкий план, полурост, полный рост, движение, работу, путь, lifestyle, природу, хобби, уютную домашнюю сцену, кафе, светлую студию или живой момент в пространстве.',
    'Лучше цельный большой герой внутри среды, чем отдельный портрет справа. Ещё лучше — когда герой, интерьер, свет, предметы и перспектива пересекают центральную ось кадра и собирают композицию в одну картину.',
    'Текст и кнопки будут накладываться потом поверх готовой сцены. Не делай пустую тёмную колонку слева, не ставь модель отдельно у правой кромки и не режь сцену на два несвязанных куска. Левый и правый край должны принадлежать одному миру и одной сцене.',
    'Композиция обязательно должна пересекать центральную ось кадра: свет, предметы, линии среды или сам герой должны визуально связывать левую и правую часть. Допустима левая, правая или центральная визуальная доминанта, но без ощущения "макет с текстом отдельно / портрет отдельно".',
    'Важно: оставь живой фон и фактуру также под будущим заголовком. Слева не должно быть глухой чёрной стены или пустой дизайнерской заливки; там должна продолжаться сцена, пусть и более спокойная по деталям.',
    'Не используй популярную постановку "человек у окна или за столом строго справа, а слева просто тёмная плоскость". Такой вариант запрещён. Если герой сидит или стоит, он должен быть встроен в пространство так, чтобы весь кадр воспринимался как одна фотография, а не как макет под текст.',
    'На desktop тоже запрещён эффект разделительной полосы: не дели сцену на левую и правую половины, не делай тёмный блок под текст с резкой вертикальной границей, не уводи весь смысл вправо. Должна быть одна цельная фотография с общей перспективой, светом и воздухом.',
    'Запрещено: split-screen, вертикальный шов по центру, отдельный портрет на правом краю, пустой фон под надписи, студийный бьюти-портрет, обрезанная макушка, лицо вплотную к верхней границе, фоновая фотография как открытка с вставленным человеком.',
    'Нельзя создавать ощущение, что кадр состоит из двух разных половин. Никакой тёмной панели слева и отдельной фотографии справа: только одна непрерывная сцена, один свет, одна глубина, один мир.',
    'Избегай студийного портрета на нейтральном фоне. Нужна именно среда, контекст, глубина, свет, атмосфера и цельная композиция без ощущения конструктора на две половины.',
    'Сцена должна усиливать боль и обещание из заголовка: тревога, тупик, усталость от попыток, а затем ощущение выхода, пути, ясности, спокойной силы.'
  ].filter(Boolean).join('\n');
}

async function imageToPublishedAsset({ src, postJsonFn, loadImageFn, preloadedImage = null }) {
  if (!src) return { url: '', fallback: '' };
  if (/^https?:\/\//i.test(src)) return { url: src, fallback: '' };
  const img = preloadedImage || await loadImageFn(src);
  const fallback = '';
  if (/^data:image\/png;base64,/i.test(src) && imageByteEstimate(src) <= 9 * 1024 * 1024) {
    const data = await postJsonFn('/api/publish-image', { imageDataUrl: src }, { timeoutMs: 65000 });
    if (!data?.imageUrl) throw new Error('Сервис не вернул ссылку на сцену для предлендинга.');
    return { url: data.imageUrl, fallback };
  }
  const canvas = document.createElement('canvas');
  const maxSide = 2400;
  const ratio = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
  canvas.width = Math.max(1, Math.round((img.width || 1) * ratio));
  canvas.height = Math.max(1, Math.round((img.height || 1) * ratio));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageDataUrl = canvas.toDataURL('image/jpeg', 0.96);
  const data = await postJsonFn('/api/publish-image', { imageDataUrl }, { timeoutMs: 65000 });
  if (!data?.imageUrl) throw new Error('Сервис не вернул ссылку на сцену для предлендинга.');
  return { url: data.imageUrl, fallback };
}

function enforceUserHeadline(idea, headline, variantKey = '', supportText = '') {
  const finalHeadline = String(headline || '').trim();
  if (!finalHeadline) return idea;
  const ideaHeadline = String(idea?.headline || '').trim();
  const headlineChanged = finalHeadline.toLowerCase() !== ideaHeadline.toLowerCase();
  const refreshAngleKey = headlineChanged
    ? directAngleKeyForHeadline(finalHeadline)
    : idea?.directAngleKey || directAngleKeyForHeadline(finalHeadline);
  let directPair;

  if (idea?.directManual && !variantKey && !headlineChanged) {
    directPair = {
      adTitle: trimDirectTitle(idea.adTitle),
      adText: trimDirectText(idea.adText),
      angleKey: refreshAngleKey
    };
  } else if (variantKey || (!headlineChanged && idea?.directVariantKey)) {
    directPair = directModerationPairForAngle(
      refreshAngleKey,
      variantKey || idea?.directVariantKey || idea?.variantKey || idea?.angle || idea?.headline || '',
      finalHeadline
    );
  } else {
    directPair = directPairFromUserInput(finalHeadline, supportText, idea, refreshAngleKey);
  }

  return {
    ...idea,
    headline: finalHeadline,
    adTitle: directPair.adTitle,
    adText: directPair.adText,
    directAngleKey: directPair.angleKey,
    decoration: methodTextForIdea(finalHeadline, supportText || (!headlineChanged ? idea?.decoration : ''))
  };
}

function TinyCopy({ text, dark, label = 'Копировать' }) {
  const [done, setDone] = useState(false);
  const onClick = async () => {
    const ok = await copyText(text);
    setDone(ok);
    window.setTimeout(() => setDone(false), 1400);
  };
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-xs font-black border transition-all ${
        done
          ? 'bg-emerald-500 text-white border-emerald-500'
          : dark
            ? 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {done ? 'Скопировано' : label}
    </button>
  );
}

export default function AIBannerStudio({
  dark,
  seedHeadline,
  seedAdText = '',
  onHeadlineChange,
  onAdTextChange,
  currentPhoto,
  onPhotoPicked,
  onApplyIdea,
  quota,
  onConsumeBanner
}) {
  const canvasRef = useRef(null);
  const [headline, setHeadline] = useState(seedHeadline || DEFAULT_IDEA.headline);
  const [supportText, setSupportText] = useState(methodTextForIdea(seedHeadline || DEFAULT_IDEA.headline, seedAdText || DEFAULT_IDEA.decoration));
  const [angleMode] = useState('custom');
  const [personaChoice, setPersona] = useState('auto');
  const persona = personaChoice === 'woman' || personaChoice === 'man' ? personaChoice : 'mixed';
  const [intensity, setIntensity] = useState('strong');
  const [format, setFormat] = useState('square');
  const [palette, setPalette] = useState('yellow');
  const [stylePreset, setStylePreset] = useState('editorialGold');
  const [styleChoice, setStyleChoice] = useState('auto');
  const [sceneTheme, setSceneTheme] = useState('auto');
  const [photoMode, setPhotoMode] = useState('auto');
  const [compositionSide, setCompositionSide] = useState('auto');
  const [status, setStatus] = useState('Выберите пример или впишите свой заголовок. Фото не обязательно: по умолчанию AI сам собирает человека, сцену и дизайн.');
  const [ideas, setIdeas] = useState([DEFAULT_IDEA]);
  const [selected, setSelected] = useState(0);
  const [heroPreview, setHeroPreview] = useState(null);
  const [heroDataUrl, setHeroDataUrl] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isImaging, setIsImaging] = useState(false);
  const [generationStartedAt, setGenerationStartedAt] = useState(null);
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const [lastGenerateOptions, setLastGenerateOptions] = useState({ visualMode: 'auto' });
  const [canRetryGeneration, setCanRetryGeneration] = useState(false);

  function updateSupportText(value) {
    const next = String(value || '').replace(/\s+/g, ' ').trimStart();
    setSupportText(next);
    onAdTextChange?.(next);
  }

  function updateHeadline(value) {
    setHeadline(value);
    onHeadlineChange?.(value);
  }

  useEffect(() => {
    if (!seedHeadline || seedHeadline === headline) return;
    const timer = window.setTimeout(() => setHeadline(seedHeadline), 0);
    return () => window.clearTimeout(timer);
  }, [seedHeadline, headline]);

  useEffect(() => {
    const nextText = methodTextForIdea(seedHeadline || headline || DEFAULT_IDEA.headline, seedAdText);
    if (nextText === supportText) return undefined;
    const timer = window.setTimeout(() => setSupportText(nextText), 0);
    return () => window.clearTimeout(timer);
  }, [seedAdText, seedHeadline, headline, supportText]);

  useEffect(() => {
    if (currentPhoto && typeof currentPhoto === 'string' && currentPhoto.startsWith('data:image/') && currentPhoto !== heroDataUrl) {
      const img = new Image();
      img.onload = () => {
        setHeroPreview(img);
        setHeroDataUrl(currentPhoto);
      };
      img.src = currentPhoto;
    }
  }, [currentPhoto, heroDataUrl]);

  useEffect(() => {
    if (!isImaging || !generationStartedAt) return undefined;
    setGenerationElapsed(0);
    const timer = window.setInterval(() => {
      setGenerationElapsed(Math.max(0, Math.floor((Date.now() - generationStartedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isImaging, generationStartedAt]);

  const activeIdea = useMemo(
    () => enforceUserHeadline(ideas[selected] || DEFAULT_IDEA, headline || DEFAULT_IDEA.headline, '', supportText),
    [ideas, selected, headline, supportText]
  );
  const hasDirectModerationRisk = DIRECT_RISKY_PATTERN.test(`${activeIdea?.adTitle || ''} ${activeIdea?.adText || ''}`);
  const activeDirectAngleKey = activeIdea?.directAngleKey || directAngleKeyForHeadline(activeIdea?.headline || headline || DEFAULT_IDEA.headline);
  const directCampaignVariants = useMemo(
    () => buildDirectCampaignVariants(
      activeIdea?.headline || headline || DEFAULT_IDEA.headline,
      activeIdea?.directVariantKey || activeIdea?.variantKey || activeIdea?.angle || '',
      activeDirectAngleKey
    ),
    [activeIdea?.headline, activeIdea?.directVariantKey, activeIdea?.variantKey, activeIdea?.angle, activeDirectAngleKey, headline]
  );
  const directCampaignCopyText = useMemo(
    () => formatDirectCampaignVariants(directCampaignVariants),
    [directCampaignVariants]
  );
  useEffect(() => {
    drawBanner({
      canvas: canvasRef.current,
      idea: activeIdea,
      format,
      palette,
      stylePreset,
      persona,
      generatedImage,
      heroImage: heroPreview,
      photoMode,
      compositionSide
    });
  }, [activeIdea, format, palette, stylePreset, persona, generatedImage, heroPreview, photoMode, compositionSide]);

  async function postJson(url, body, options = {}) {
    const timeoutMs = options.timeoutMs || 0;
    const controller = timeoutMs ? new AbortController() : null;
    const timeoutId = timeoutMs
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller?.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
        throw new Error('OpenAI отвечает дольше обычного. Конструктор перезапустит попытку.');
    }
    throw error;
  } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }

    const contentType = res.headers.get('content-type') || '';
    const raw = await res.text();
    let data = null;
    if (contentType.includes('application/json') && raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const friendly = data?.message || data?.error || (raw.includes('<html') || raw.includes('<!DOCTYPE')
        ? 'Сервис вернул HTML-ошибку Cloudflare. Я уже не вывожу её полотном: попробуйте повторить действие.'
        : raw.slice(0, 300));
      throw new Error(friendly);
    }
    if (data) return data;
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error('Сервис вернул не JSON. Попробуйте повторить действие.');
    }
  }

  function isRetryableImageIssue(message = '') {
    const text = String(message || '').toLowerCase();
    return !text
      || text.includes('429')
      || text.includes('1015')
      || text.includes('rate')
      || text.includes('tempor')
      || text.includes('timeout')
      || text.includes('дольше обычного')
      || text.includes('перезапуст')
      || text.includes('не успел')
      || text.includes('network')
      || text.includes('failed to fetch')
      || text.includes('no image');
  }

  async function requestGeneratedImage(payload, labels = {}) {
    const maxAttempts = labels.maxAttempts || 3;
    const timeoutMs = labels.timeoutMs || AI_GENERATION_TIMEOUT_MS;
    let lastWarning = '';
    let lastError = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (attempt > 1) {
        setStatus(labels.retryStatus || `Перезапускаю генерацию, попытка ${attempt}/${maxAttempts}...`);
        await new Promise((resolve) => window.setTimeout(resolve, 3500));
      }
      try {
        const data = await postJson('/api/generate-image', payload, { timeoutMs });
        if (data.image) return data;
        lastWarning = humanizeImageWarning(data.warning) || 'AI вернул пустой ответ.';
        if (attempt === maxAttempts || !isRetryableImageIssue(lastWarning)) return data;
      } catch (error) {
        lastError = String(error?.message || error);
        if (attempt === maxAttempts || !isRetryableImageIssue(lastError)) throw error;
      }
    }
    if (lastError) throw new Error(lastError);
    return { image: null, warning: lastWarning || 'AI не вернул картинку.' };
  }

  async function publishCanvasForPrelanding(sourceCanvas) {
    if (!sourceCanvas?.toDataURL) {
      throw new Error('Не удалось подготовить баннер для предлендинга.');
    }
    const imageDataUrl = sourceCanvas.toDataURL('image/png');
    const data = await postJson('/api/publish-image', { imageDataUrl }, { timeoutMs: 65000 });
    if (!data?.imageUrl) {
      throw new Error('Сервис не вернул ссылку на баннер для Tilda.');
    }
    return data.imageUrl;
  }

  async function handleIdeate() {
    if (!headline.trim()) {
      setStatus('Сначала впиши заголовок, от которого отталкиваемся.');
      return;
    }
    setIsThinking(true);
    setStatus('Думаю варианты баннера и объявления, добиваю формулировки под Директ...');
    try {
      const data = await postJson('/api/ideate', { headline, persona, intensity, angleMode, angleLabel: ANGLE_PRESETS[angleMode]?.label });
      const sourceIdeas = data.ideas?.length ? data.ideas : [DEFAULT_IDEA];
      setIdeas(sourceIdeas.map((item) => enforceUserHeadline(item, headline, '', supportText)));
      setSelected(0);
      setGeneratedImage(null);
      setStatus(data.warning || `Готово. Нашёл ${data.ideas?.length || 0} вариантов, можно выбирать.`);
    } catch (error) {
      setStatus(`Не получилось сходить в AI: ${error.message}`);
    } finally {
      setIsThinking(false);
    }
  }

  async function handleGenerateImage() {
    if (!activeIdea?.visualPrompt) {
      setStatus('Сначала выбери пример или впиши заголовок, чтобы было по чему рисовать сцену.');
      return;
    }
    setIsImaging(true);
    setGenerationStartedAt(Date.now());
    setGenerationElapsed(0);
    setGeneratedImage(null);
    setStatus('Собираю живую сцену под баннер...');
    const useReference = photoMode === 'reference' && Boolean(heroDataUrl);
    try {
      const data = await requestGeneratedImage({
        visualPrompt: activeIdea.visualPrompt,
        stylePreset,
        persona,
        visualMode: photoMode,
        heroImage: useReference ? heroDataUrl : null
      }, {
        retryStatus: 'AI не отдал фон с первого раза. Повторяю запрос автоматически...'
      });
      if (!data.image) {
        setGeneratedImage(null);
        setStatus(humanizeImageWarning(data.warning) || 'AI-картинка не пришла, оставил шаблонный фон.');
        return;
      }
      setStatus('AI-картинка пришла, загружаю её в превью...');
      const img = await loadGeneratedImage(data.image);
      setGeneratedImage(img);
      setStatus('Фон готов. Заголовок наложен отдельно и читается нормально.');
    } catch (error) {
      setStatus(`Не удалось собрать фон: ${error.message}`);
    } finally {
      setIsImaging(false);
      setGenerationStartedAt(null);
    }
  }

  async function handleAutoGenerate(options = {}) {
    const finalHeadline = headline.trim();
    if (!finalHeadline) {
      setStatus('Сначала впишите заголовок. Он будет на баннере без переписывания.');
      return;
    }
    if (quota?.bannerBlocked) {
      setStatus(`Лимит AI-баннеров для этого профиля исчерпан: ${bannerLimitText}.`);
      return;
    }
    const finalSupportText = methodTextForIdea(finalHeadline, supportText);

    const requestedVisualMode = options.visualMode || photoMode || 'auto';
    const variantKey = makeGenerationVariantKey('banner');
    const hasReference = requestedVisualMode === 'reference' && Boolean(heroDataUrl);
    const visualRoute = nextVisualRoute({
      hasReference,
      requestedVisualMode,
      manualSceneTheme: sceneTheme,
      styleChoice,
      variantKey,
      headline: finalHeadline,
      supportText: finalSupportText
    });
    const lockedPersona = personaChoice === 'woman' || personaChoice === 'man' ? personaChoice : '';
    const routeVisualMode = visualRoute.visualMode || requestedVisualMode;
    const genderLockedMode = Boolean(lockedPersona && !hasReference && !['metaphor', 'noPerson', 'reference'].includes(requestedVisualMode));
    const forceChosenPersona = Boolean(lockedPersona && !hasReference && (requestedVisualMode === 'generatedPerson' || genderLockedMode));
    const visualModeToUse = forceChosenPersona
      ? 'generatedPerson'
      : !hasReference && isMetaphorStyle(styleChoice) ? 'metaphor' : routeVisualMode;
    const personaToUse = hasReference
      ? persona
      : forceChosenPersona
        ? lockedPersona
      : visualModeToUse === 'metaphor' || visualModeToUse === 'noPerson'
        ? 'mixed'
        : visualRoute.persona || 'mixed';
    const nextGenerateOptions = { visualMode: requestedVisualMode };
    const baseIdea = enforceUserHeadline(activeIdea || ideaFromPreset(angleMode), finalHeadline, variantKey, finalSupportText);
    const directPair = directPairFromUserInput(
      finalHeadline,
      finalSupportText,
      baseIdea,
      baseIdea?.directAngleKey || directAngleKeyForHeadline(finalHeadline)
    );
    const resolvedSceneTheme = visualRoute.sceneTheme && visualRoute.sceneTheme !== 'auto'
      ? visualRoute.sceneTheme
      : pickAutoSceneTheme(finalHeadline, baseIdea?.angle, visualModeToUse, stylePreset, variantKey);
    const styleToUse = visualRoute.styleHint && visualRoute.styleHint !== 'auto'
      ? visualRoute.styleHint
      : pickAutoStyle(finalHeadline, personaToUse, resolvedSceneTheme, variantKey);
    const bannerVariation = buildVisualVariation({
      headline: finalHeadline,
      persona: personaToUse,
      sceneTheme: resolvedSceneTheme,
      stylePreset: styleToUse,
      visualMode: visualModeToUse,
      variantKey,
      fullBanner: true,
      semanticPriority: visualRoute.semanticPriority,
      semanticSceneLine: visualRoute.semanticSceneLine,
      semanticCompositionLine: visualRoute.semanticCompositionLine
    });
    const visualLock = [
      visualModeToUse === 'generatedPerson' || visualModeToUse === 'reference' ? bannerVariation.personLine : '',
      bannerVariation.sceneLine,
      bannerVariation.compositionLine
    ].filter(Boolean).join(' ');
    const useReference = visualModeToUse === 'reference' && Boolean(heroDataUrl);
    const prompt = autoVisualPrompt({
      headline: finalHeadline,
      supportText: finalSupportText,
      activeIdea: baseIdea,
      persona: personaToUse,
      stylePreset: styleToUse,
      hasReference: useReference,
      visualMode: visualModeToUse,
      fullBanner: true,
      sceneTheme: resolvedSceneTheme,
      variantKey,
      semanticPriority: visualRoute.semanticPriority,
      variationOverride: bannerVariation
    });

    setPhotoMode(requestedVisualMode);
    setLastGenerateOptions(nextGenerateOptions);
    setCanRetryGeneration(false);
    setStylePreset(styleToUse);
    setCompositionSide('auto');
    setGeneratedImage(null);
    setIdeas([{
      ...baseIdea,
      headline: finalHeadline,
      visualPrompt: prompt,
      decoration: finalSupportText,
      adTitle: directPair.adTitle,
      adText: directPair.adText,
      directAngleKey: directPair.angleKey,
      minimal: true,
      aiFullBanner: true,
      variantKey,
      visualVariation: bannerVariation,
      visualLock,
      resolvedPersona: personaToUse,
      visualRouteLabel: visualRoute.label,
      resolvedSceneTheme,
      resolvedVisualMode: visualModeToUse,
      resolvedStylePreset: styleToUse
    }]);
    setSelected(0);
    setIsImaging(true);
    setGenerationStartedAt(Date.now());
    setGenerationElapsed(0);
    setStatus('Генерирую готовый баннер через AI: фото, дизайн и заголовок собираются одной картинкой.');

    try {
      const data = await requestGeneratedImage({
        visualPrompt: prompt,
        headline: finalHeadline,
        methodName: finalSupportText,
        fullBanner: true,
        stylePreset: styleToUse,
        persona: personaToUse,
        visualMode: visualModeToUse,
        variationKey: variantKey,
        imagePurpose: 'banner',
        imageSize: format === 'wide'
          ? '1536x1024'
          : format === 'vertical'
            ? '1024x1536'
            : '1024x1024',
        heroImage: useReference ? heroDataUrl : null
      }, {
        retryStatus: 'AI не отдал баннер с первого раза. Перезапускаю генерацию автоматически...'
      });
      if (!data.image) {
        setGeneratedImage(null);
        setCanRetryGeneration(true);
        setStatus(humanizeImageWarning(data.warning) || 'AI-картинка не пришла. Нажмите “Повторить генерацию”: скачивание старой заглушки заблокировано.');
        return;
      }
      setStatus('AI-картинка пришла, вставляю её в превью...');
      const img = await loadGeneratedImage(data.image);
      setGeneratedImage(img);
      rememberVisualMemory({
        kind: 'banner',
        headline: finalHeadline,
        person: visualModeToUse === 'noPerson' ? 'без человека' : visualModeToUse === 'metaphor' ? 'метафоричный кадр' : bannerVariation.personLine,
        scene: bannerVariation.sceneLine,
        theme: resolvedSceneTheme,
        style: styleToUse,
        createdAt: new Date().toISOString()
      });
      onConsumeBanner?.();
      const sceneLabel = optionLabel(SCENE_THEME_OPTIONS, resolvedSceneTheme);
      const styleLabel = optionLabel(VISUAL_STYLE_OPTIONS, styleToUse);
      setStatus(`AI-баннер готов: ${sceneLabel} + ${styleLabel}. Проверьте текст и скачайте PNG.`);
    } catch (error) {
      setGeneratedImage(null);
      const message = String(error.message || '');
      const isRateLimit = message.includes('429') || message.includes('1015') || message.toLowerCase().includes('rate');
      setCanRetryGeneration(true);
      setStatus(isRateLimit
        ? humanizeImageWarning(message)
        : `AI не собрал картинку: ${message}. Нажмите “Повторить генерацию”; скачивание старой заглушки заблокировано.`
      );
    } finally {
      setIsImaging(false);
      setGenerationStartedAt(null);
    }
  }

  function handleRefreshPreview() {
    drawBanner({
      canvas: canvasRef.current,
      idea: activeIdea,
      format,
      palette,
      stylePreset,
      persona,
      generatedImage,
      heroImage: heroPreview,
      photoMode,
      compositionSide
    });
    setStatus(generatedImage
      ? 'Превью обновлено: AI-картинка на месте.'
      : 'Превью обновлено: AI-картинки пока нет, показана локальная сборка.'
    );
  }

  function handleRewriteHeadline() {
    const next = rewriteHeadlineVariant(headline);
    if (!next) {
      setStatus('Сначала выберите пример или впишите заголовок, потом можно сделать рерайт.');
      return;
    }
    updateHeadline(next);
    setGeneratedImage(null);
    setStatus('Заголовок переформулирован. Если смысл подходит — жмите генерацию без фото или с фото.');
  }

  function handleRotateDirectPair() {
    const finalHeadline = String(activeIdea?.headline || headline || '').trim();
    if (!finalHeadline) {
      setStatus('Сначала впишите или выберите баннерный заголовок.');
      return;
    }
    let variantKey = makeGenerationVariantKey('direct');
    let pair = directModerationPairForAngle(activeDirectAngleKey, variantKey, finalHeadline);
    for (let attempt = 0; attempt < 8 && pair.adTitle === activeIdea?.adTitle && pair.adText === activeIdea?.adText; attempt += 1) {
      variantKey = makeGenerationVariantKey(`direct-${attempt}`);
      pair = directModerationPairForAngle(activeDirectAngleKey, variantKey, finalHeadline);
    }
    setIdeas((current) => {
      const next = current.length ? [...current] : [activeIdea || DEFAULT_IDEA];
      next[selected] = {
        ...(next[selected] || activeIdea || DEFAULT_IDEA),
        headline: finalHeadline,
        adTitle: pair.adTitle,
        adText: pair.adText,
        directAngleKey: pair.angleKey,
        directVariantKey: variantKey,
        directManual: false
      };
      return next;
    });
    updateHeadline(finalHeadline);
    setStatus('Поменял заголовок и текст Директа под текущий заголовок. Баннерный заголовок и креатив не тронуты.');
  }

  function handleDirectFieldChange(field, value) {
    const finalHeadline = String(activeIdea?.headline || headline || '').trim();
    setIdeas((current) => {
      const next = current.length ? [...current] : [activeIdea || DEFAULT_IDEA];
      next[selected] = {
        ...(next[selected] || activeIdea || DEFAULT_IDEA),
        headline: finalHeadline,
        adTitle: field === 'adTitle' ? String(value || '').replace(/[—–]+/g, ' ').slice(0, 56) : activeIdea.adTitle,
        adText: field === 'adText' ? String(value || '').slice(0, 81) : activeIdea.adText,
        directAngleKey: activeIdea?.directAngleKey || directAngleKeyForHeadline(finalHeadline),
        directVariantKey: '',
        directManual: true
      };
      return next;
    });
    updateHeadline(finalHeadline);
    if (DIRECT_RISKY_PATTERN.test(String(value || ''))) {
      setStatus('В поле Директа есть рискованные слова для модерации. Баннер можно оставить дерзким, а тут лучше нажать “Другой вариант”.');
    }
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const compactForAi = compactImageDataUrl(img, 720, 0.72);
        const compactForBotHelp = compactImageDataUrl(img, 640, 0.72);
        setHeroPreview(img);
        setHeroDataUrl(compactForAi);
        setGeneratedImage(null);
        onPhotoPicked?.(compactForBotHelp);
        setStatus('Фото загружено: AI будет держать пол и типаж героя, для предлендинга оставил нормальное качество лица.');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  const needsAiBanner = Boolean(activeIdea?.aiFullBanner);
  const finalAiMissing = needsAiBanner && !generatedImage;
  const canExportBanner = !isImaging && !finalAiMissing;
  const bannerLimitText = quota?.unlimited ? 'безлимит' : `${quota?.bannersUsed || 0}/${quota?.bannerLimit || 0}`;
  const progressPercent = Math.min(100, Math.round((generationElapsed / AI_GENERATION_PROGRESS_SEC) * 100));

  function handleDownload() {
    if (isImaging) {
      setStatus('Дождитесь окончания AI-генерации. Пока идёт таймер, старую заглушку скачать нельзя.');
      return;
    }
    if (finalAiMissing) {
      setStatus('Сначала нужна готовая AI-картинка. Нажмите “Повторить генерацию” или запустите “Без фото / С фото героя” заново.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${slugify(activeIdea.headline)}-${SIZES[format].label}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div className={`relative overflow-hidden border rounded-3xl p-6 shadow-xl ${dark ? 'bg-[radial-gradient(circle_at_88%_8%,rgba(234,179,8,.18),transparent_28%),linear-gradient(135deg,#020617,#0f172a)] border-slate-800' : 'bg-[radial-gradient(circle_at_88%_8%,rgba(234,179,8,.16),transparent_28%),linear-gradient(135deg,#ffffff,#f8fafc)] border-slate-200'}`}>
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-5">
        <div>
          <h3 className={`text-xl font-black flex items-center gap-2 ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Sparkles className="w-5 h-5 text-yellow-500" />
            AI-студия баннеров
          </h3>
        </div>
        <div className={`text-xs rounded-xl px-3 py-2 ${dark ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
          Основной формат: 1:1.
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className="space-y-4">
          <div className="grid gap-3">
            <label className="block">
              <div className={`text-sm font-black mb-1.5 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>Ручной заголовок</div>
              <textarea
                rows={2}
                value={headline}
                onChange={(event) => updateHeadline(event.target.value)}
                placeholder="Например: Хватит покупать курсы. Денег от них нет."
                className={`w-full px-4 py-3 rounded-2xl border-2 resize-y ${
                  dark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRewriteHeadline}
                  className={`px-3 py-2 rounded-xl text-xs font-black border ${dark ? 'bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  Рерайт заголовка
                </button>
                <button
                  type="button"
                  onClick={() => updateHeadline((ideas[selected] || DEFAULT_IDEA).headline || headline)}
                  className={`px-3 py-2 rounded-xl text-xs font-black border ${dark ? 'bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  Вернуть выбранный пример
                </button>
              </div>
            </label>

            <label className="block">
              <div className={`text-sm font-black mb-1.5 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>Ручной текст</div>
              <textarea
                rows={2}
                value={supportText}
                onChange={(event) => updateSupportText(event.target.value)}
                placeholder="Например: Управляйте процессом «за кадром». Смотрите простую инструкцию"
                className={`w-full px-4 py-3 rounded-2xl border-2 resize-y ${
                  dark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
              <div className={`mt-1 text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                Эта фраза пойдёт в AI-баннер вместе с заголовком выше.
              </div>
            </label>

            <div className="grid md:grid-cols-2 gap-2">
              {[
                ['auto', 'AI решает', 'Человек, предметная сцена или метафора по смыслу'],
                ['none', 'Без человека', 'Предметы, действие, среда или символ'],
                ['woman', 'Женщина', 'Женщина только когда нужна по смыслу'],
                ['man', 'Мужчина', 'Мужчина только когда нужен по смыслу']
              ].map(([id, label, description]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setPersona(id);
                    setPhotoMode(id === 'auto' ? 'auto' : id === 'none' ? 'noPerson' : 'generatedPerson');
                  }}
                  className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-black transition ${
                    personaChoice === id
                      ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : dark
                        ? 'border-slate-700 bg-slate-900 text-slate-100 hover:border-blue-500'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-blue-400'
                  }`}
                >
                  <span className="block">{label}</span>
                  <span className={`block mt-1 text-[11px] leading-4 font-semibold ${personaChoice === id ? 'text-blue-100' : dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {description}
                  </span>
                </button>
              ))}
            </div>

            <div>
              <div className={`text-sm font-black mb-2 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>Визуальный мир</div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {VISUAL_WORLD_OPTIONS.map((option) => {
                  const WorldIcon = option.icon;
                  const isActive = sceneTheme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      title={option.description}
                      onClick={() => setSceneTheme(option.value)}
                      className={`min-h-[92px] rounded-2xl border-2 px-3 py-3 text-left transition ${
                        isActive
                          ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                          : dark
                            ? 'border-slate-700 bg-slate-900 text-slate-100 hover:border-blue-500'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-blue-400'
                      }`}
                    >
                      <WorldIcon className={`w-5 h-5 mb-2 ${isActive ? 'text-white' : 'text-blue-500'}`} />
                      <span className="block text-sm font-black">{option.label}</span>
                      <span className={`block mt-1 text-[11px] leading-4 ${isActive ? 'text-blue-100' : dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className={`text-sm font-black mb-2 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>Цветовой A/B-тест</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                {COLOR_TEST_OPTIONS.map((option) => {
                  const isActive = styleChoice === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStyleChoice(option.value)}
                      className={`min-h-[64px] rounded-2xl border-2 px-3 py-2 text-left transition ${
                        isActive
                          ? dark
                            ? 'border-white bg-slate-800 text-white'
                            : 'border-slate-900 bg-slate-100 text-slate-950'
                          : dark
                            ? 'border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <span className="flex gap-1 mb-1.5" aria-hidden="true">
                        {option.colors.map((color) => (
                          <span key={color} className="h-3 flex-1 rounded-sm border border-black/10" style={{ backgroundColor: color }} />
                        ))}
                      </span>
                      <span className="block text-xs font-black">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={`rounded-2xl border p-3 text-xs ${dark ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              В режиме «AI по смыслу» заголовок и описание читаются вместе: сначала конфликт и желаемый поворот, затем действие героя, метафора и сцена. Ручной мир фиксирует окружение, но действие всё равно раскрывает смысл.
            </div>

            <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-end">
              <label className="block">
                <div className={`text-sm font-black mb-1.5 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>Фото / лицо героя</div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoChange}
                  className={`w-full px-4 py-3 rounded-2xl border-2 file:mr-3 file:rounded-xl file:border-0 file:px-3 file:py-2 file:font-black ${
                    dark
                      ? 'bg-slate-900 border-slate-700 text-slate-200 file:bg-slate-800 file:text-slate-100'
                      : 'bg-white border-slate-200 text-slate-700 file:bg-slate-100 file:text-slate-900'
                  }`}
                />
              </label>
              <button
                onClick={() => handleAutoGenerate({ visualMode: photoMode || 'auto' })}
                disabled={isImaging}
                className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black flex items-center justify-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isImaging ? 'animate-pulse' : ''}`} />
                Следующий визуал
              </button>
              <button
                onClick={() => handleAutoGenerate({ visualMode: heroDataUrl ? 'reference' : photoMode || 'auto' })}
                disabled={isImaging}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black flex items-center justify-center gap-2"
              >
                <ImageIcon className={`w-4 h-4 ${isImaging ? 'animate-pulse' : ''}`} />
                {heroDataUrl ? 'С фото героя' : 'AI по смыслу'}
              </button>
            </div>

          </div>

          <div className={`rounded-2xl border p-3 ${dark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <div className="text-xs font-black uppercase tracking-wide mb-1">Статус</div>
            <div className="text-sm">{status}</div>
            {isImaging && (
              <div className={`mt-3 rounded-xl border p-3 ${dark ? 'border-blue-900 bg-blue-500/10 text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
                <div className="flex items-center justify-between gap-3 text-xs font-black uppercase">
                  <span>AI-генерация идёт</span>
                  <span>{generationElapsed} сек</span>
                </div>
                <div className={`mt-2 h-2 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-white'}`}>
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-2 text-xs opacity-80">Ждём до 180 секунд. Пока картинка не пришла, скачать старую заглушку нельзя.</div>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRefreshPreview}
                className={`px-3 py-2 rounded-xl text-xs font-black border ${dark ? 'bg-slate-950 border-slate-700 text-slate-100 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                Обновить превью
              </button>
              {canRetryGeneration && (
                <button
                  type="button"
                  onClick={() => handleAutoGenerate(lastGenerateOptions)}
                  disabled={isImaging}
                  className="px-3 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white"
                >
                  Повторить генерацию
                </button>
              )}
            </div>
          </div>

          <details className={`${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl p-4`}>
            <summary className={`cursor-pointer text-sm font-black ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
              Черновые альтернативы заголовка и текста
            </summary>
            <div className={`mt-2 text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Это подсказки, а не готовая истина. Они собираются от текущего заголовка и текста выше, чтобы быстро переписать формулировку под объявление и модерацию.
            </div>
            <div className="mt-3 flex justify-end">
              <TinyCopy dark={dark} text={directCampaignCopyText} label="Копировать все" />
            </div>
            <textarea
              readOnly
              rows={8}
              value={directCampaignCopyText}
              onFocus={(event) => event.target.select()}
              className={`mt-3 w-full resize-y rounded-xl border px-3 py-2 text-xs font-bold outline-none ${
                dark
                  ? 'border-slate-700 bg-slate-950 text-slate-100'
                  : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            />
          </details>

        </div>

        <div className="space-y-4">
          <div className={`${dark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-3xl p-4`}>
            <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
              <div className={`font-black ${dark ? 'text-slate-100' : 'text-slate-900'}`}>Превью баннера</div>
              <div className="flex flex-wrap gap-2">
                <div className={`px-3 py-2 rounded-xl border text-xs font-black ${dark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-700'}`}>
                  1:1 основной баннер
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              <canvas ref={canvasRef} className="w-full block bg-white" />
              {isImaging && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-950/82 px-6 text-center text-white backdrop-blur-sm">
                  <Sparkles className="w-9 h-9 animate-pulse text-yellow-300" />
                  <div className="text-lg font-black uppercase">AI рисует финальный баннер</div>
                  <div className="w-full max-w-sm">
                    <div className="mb-2 flex items-center justify-between text-xs font-black uppercase text-white/80">
                      <span>Ожидание</span>
                      <span>{generationElapsed} / {AI_GENERATION_PROGRESS_SEC} сек</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  <div className="max-w-md text-sm text-white/75">
                    После загрузки картинка сама появится здесь. До этого скачивание заблокировано.
                  </div>
                </div>
              )}
              {!isImaging && finalAiMissing && (
                <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl bg-rose-600/92 px-4 py-3 text-center text-sm font-black text-white shadow-lg">
                  AI-картинка ещё не готова. Нажмите “Повторить генерацию”, чтобы не скачать заглушку.
                </div>
              )}
              {!isImaging && generatedImage && activeIdea?.aiFullBanner && (
                <div className="absolute right-3 top-3 z-10 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black uppercase text-white shadow-lg">
                  AI готов
                </div>
              )}
            </div>
            <div className={`mt-3 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Здесь проверяем именно картинку: читается ли заголовок, не мешает ли лицо, хватает ли воздуха. Технический промпт скрыт, он нужен только AI внутри.
            </div>

            <div className="grid md:grid-cols-2 gap-2 mt-4">
              {generatedImage ? (
                <button onClick={() => setGeneratedImage(null)} disabled={isImaging} className={`px-3 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 ${dark ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
                  <RefreshCw className="w-4 h-4" />
                  Убрать AI-картинку
                </button>
              ) : (
                <button onClick={handleRefreshPreview} disabled={isImaging} className={`px-3 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 ${dark ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
                  <RefreshCw className="w-4 h-4" />
                  Обновить превью
                </button>
              )}
              <button onClick={handleDownload} disabled={!canExportBanner} className="px-3 py-3 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                {canExportBanner ? 'Скачать PNG' : 'Ждём AI'}
              </button>
            </div>
          </div>


          <div className="grid gap-3">
            <div className={`rounded-2xl border p-3 text-xs font-bold ${dark ? 'border-amber-500/40 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              Эти поля можно и нужно править руками. По умолчанию сюда подставляется ваш заголовок и текст креатива, а “Другой вариант” даёт только черновую подсказку, не гарантию модерации.
            </div>
            <div className={`${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl p-4`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <div className={`font-black ${dark ? 'text-slate-100' : 'text-slate-900'}`}>Заголовок в Директ</div>
                  <div className={`text-[11px] mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Можно выделить, переписать и скопировать вручную</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRotateDirectPair}
                    className={`px-3 py-2 rounded-xl text-xs font-black border ${dark ? 'bg-slate-950 border-slate-700 text-slate-100 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'}`}
                  >
                    Другой вариант
                  </button>
                  <TinyCopy dark={dark} text={activeIdea.adTitle} />
                </div>
              </div>
              <textarea
                rows={2}
                value={activeIdea.adTitle || ''}
                onChange={(event) => handleDirectFieldChange('adTitle', event.target.value)}
                className={`w-full resize-y rounded-xl border px-3 py-2 text-sm font-bold outline-none ${
                  dark
                    ? 'border-slate-700 bg-slate-950 text-slate-100 focus:border-blue-500'
                    : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-500'
                }`}
              />
              <div className={`text-[11px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{activeIdea.adTitle?.length || 0}/56</div>
            </div>

            <div className={`${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl p-4`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <div className={`font-black ${dark ? 'text-slate-100' : 'text-slate-900'}`}>Текст объявления</div>
                  <div className={`text-[11px] mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Модерационный, до 81 символа</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRotateDirectPair}
                    className={`px-3 py-2 rounded-xl text-xs font-black border ${dark ? 'bg-slate-950 border-slate-700 text-slate-100 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'}`}
                  >
                    Другой вариант
                  </button>
                  <TinyCopy dark={dark} text={activeIdea.adText} />
                </div>
              </div>
              <textarea
                rows={2}
                value={activeIdea.adText || ''}
                onChange={(event) => handleDirectFieldChange('adText', event.target.value)}
                className={`w-full resize-y rounded-xl border px-3 py-2 text-sm font-bold outline-none ${
                  dark
                    ? 'border-slate-700 bg-slate-950 text-slate-100 focus:border-blue-500'
                    : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-500'
                }`}
              />
              <div className={`text-[11px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{activeIdea.adText?.length || 0}/81</div>
            </div>

            <div className={`rounded-2xl border p-3 text-xs ${dark ? 'border-emerald-900 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
              Если Директ ругается на заголовок или текст, жми “Другой вариант” или поправь поле вручную. Меняются только эти два поля, баннерный текст и картинка остаются прежними.
            </div>
            {hasDirectModerationRisk && (
              <div className={`rounded-2xl border p-3 text-xs font-bold ${dark ? 'border-amber-500/40 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                В полях Директа есть рискованные слова для модерации. Баннер можно оставить дерзким, а здесь лучше нажать “Другой вариант”.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
