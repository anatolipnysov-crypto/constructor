import { useState, useMemo, useEffect } from 'react';
import { Copy, Check, Wand2, AlertCircle, ChevronDown, RotateCcw, Eye, Sun, Moon, Sparkles, Lightbulb, ShieldCheck } from 'lucide-react';
import AIBannerStudio from './components/AIBannerStudio';
import { buildCampaignLandingLogic, resolveCampaignSemanticProfile } from './data/campaignSemantics';
import { getAtmospaceGenerateErrorMessage, validateAtmospaceLandingInput } from './utils/atmospaceLandingInput';

/* ================== УТИЛИТЫ ================== */
async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text); return true;
    }
  } catch {
    // Fallback below handles blocked Clipboard API.
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta); return ok;
  } catch { return false; }
}

function readAtmospaceLandingArtifacts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ATMOSPACE_LANDING_ARTIFACTS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item?.embedCode).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveAtmospaceLandingArtifact(artifact) {
  if (!artifact?.embedCode) return [];
  const safeArtifact = {
    artifactId: String(artifact.artifactId || ''),
    inputKey: String(artifact.inputKey || ''),
    landingName: String(artifact.landingName || ''),
    landingCode: String(artifact.landingCode || ''),
    counterId: String(artifact.counterId || ''),
    publicLandingKey: String(artifact.publicLandingKey || ''),
    embedCode: String(artifact.embedCode || ''),
    generatedAt: String(artifact.generatedAt || new Date().toISOString()),
    status: String(artifact.status || 'generated'),
    runtimeStatus: String(artifact.runtimeStatus || '')
  };
  const next = [
    safeArtifact,
    ...readAtmospaceLandingArtifacts().filter((item) => (
      item.publicLandingKey !== safeArtifact.publicLandingKey
      || item.landingCode !== safeArtifact.landingCode
    ))
  ].slice(0, 12);
  try {
    localStorage.setItem(ATMOSPACE_LANDING_ARTIFACTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The current generated HTML remains available even if browser storage is blocked.
  }
  return next;
}

function buildAtmospaceRuntimeInputKey(input = {}) {
  return [
    String(input.landingName || '').trim(),
    String(input.landingCode || '').trim(),
    String(input.counterId || '').trim()
  ].join('|');
}

function safeAtmospaceFilename(name = 'landing') {
  const slug = String(name || 'landing')
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${slug || 'landing'}-index.html`;
}

const AUTH_STORAGE_KEY = 'constructorAuthorizedClient';
const REGISTERED_ACCOUNTS_STORAGE_KEY = 'constructorRegisteredAccounts';
const PENDING_ACCESS_STORAGE_KEY = 'constructorPendingAccessRequest';
const USAGE_STORAGE_KEY_PREFIX = 'constructorUsage:';
const LEGACY_PROJECT_STORAGE_KEY = 'constructorProjectData';
const PROJECT_STORAGE_KEY_PREFIX = 'constructorProjectData:';
const ATMOSPACE_LANDING_ARTIFACTS_STORAGE_KEY = 'constructorAtmospaceLandingArtifacts';
const ATMOSPACE_GENERATE_ENDPOINT = '/api/atmospace/generate';
const ATMOSPACE_PUBLIC_API_BASE_URL = 'https://api.atmospace.pro';
const ATMOSPACE_INIT_ENDPOINT = `${ATMOSPACE_PUBLIC_API_BASE_URL}/api/landing-runtime/init`;
const ATMOSPACE_CLICK_ENDPOINT = `${ATMOSPACE_PUBLIC_API_BASE_URL}/api/landing-runtime/click`;
const ATMOSPACE_GENERATED_RUNTIME_VERSION = 'sergey-constructor-atmospace-v1';
const DEFAULT_CLIENT_LIMITS = { banners: 12, prelandings: 4 };
const TILDA_PRELAND_BUILD_VERSION = '20260601-modernisto-control-v2';
const CONSTRUCTOR_ACCESS_MODE = 'owner_only';
const OWNER_LOGIN = 'admin';
const OWNER_PASSWORD = 'admin';
const CONSTRUCTOR_TOOL_VALUES = new Set(['creative', 'pre']);

function readConstructorTabFromLocation() {
  if (typeof window === 'undefined') return 'creative';
  try {
    const requestedTool = new URL(window.location.href).searchParams.get('tool');
    return CONSTRUCTOR_TOOL_VALUES.has(requestedTool) ? requestedTool : 'creative';
  } catch {
    return 'creative';
  }
}

function writeConstructorTabToLocation(tab) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tool', CONSTRUCTOR_TOOL_VALUES.has(tab) ? tab : 'creative');
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function projectStorageKey(account) {
  return account?.login ? `${PROJECT_STORAGE_KEY_PREFIX}${account.login}` : LEGACY_PROJECT_STORAGE_KEY;
}

function normalizeLogin(value) {
  return String(value || '').trim().toLowerCase();
}

function isOwnerOnlyMode() {
  return CONSTRUCTOR_ACCESS_MODE === 'owner_only';
}

function isOwnerAccount(account) {
  return account?.role === 'admin' && normalizeLogin(account.login) === OWNER_LOGIN;
}

function normalizeEmail(value) {
  return normalizeLogin(value);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || '').trim());
}

function readRegisteredAccounts() {
  if (isOwnerOnlyMode()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(REGISTERED_ACCOUNTS_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((account) => {
        const login = normalizeEmail(account?.email || account?.login);
        if (!login) return null;
        const label = String(account?.label || account?.clientName || login).trim();
        return {
          ...account,
          email: login,
          login,
          password: String(account?.password || ''),
          role: 'client',
          label,
          clientId: account?.clientId || makeClientId(readNextClientNumber(), label),
          metrikaId: String(account?.metrikaId || ''),
          metrikaToken: String(account?.metrikaToken || ''),
          getcourseLink: String(account?.getcourseLink || ''),
          partnerCode: String(account?.partnerCode || ''),
          limits: { ...DEFAULT_CLIENT_LIMITS, ...(account?.limits || {}) }
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function saveRegisteredAccounts(accounts) {
  try {
    localStorage.setItem(REGISTERED_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // If storage is blocked, registration still fails gracefully with the visible error.
  }
}

function rememberApprovedAccount(account) {
  if (!account?.login) return;
  const accounts = readRegisteredAccounts();
  const normalized = normalizeLogin(account.login);
  const next = [
    ...accounts.filter((item) => normalizeLogin(item.login) !== normalized),
    {
      ...account,
      role: account.role || 'client',
      label: account.label || account.clientName || account.login,
      limits: { ...DEFAULT_CLIENT_LIMITS, ...(account.limits || {}) }
    }
  ];
  saveRegisteredAccounts(next);
}

function readPendingAccessRequest() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_ACCESS_STORAGE_KEY) || 'null');
    return parsed?.requestId && parsed?.requestToken ? parsed : null;
  } catch {
    return null;
  }
}

function savePendingAccessRequest(request) {
  try {
    localStorage.setItem(PENDING_ACCESS_STORAGE_KEY, JSON.stringify(request));
  } catch {
    // Pending approval still works in memory while the page is open.
  }
}

function clearPendingAccessRequest() {
  try {
    localStorage.removeItem(PENDING_ACCESS_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function findClientAccount(login) {
  const normalized = normalizeLogin(login);
  if (!normalized) return null;
  const builtInAccount = CLIENT_ACCOUNTS.find((account) => normalizeLogin(account.login) === normalized);
  if (isOwnerOnlyMode()) return builtInAccount && isOwnerAccount(builtInAccount) ? builtInAccount : null;
  if (builtInAccount) return builtInAccount;
  return readRegisteredAccounts().find((account) => normalizeLogin(account.login) === normalized || normalizeEmail(account.email) === normalized) || null;
}

function readAuthorizedClient() {
  try {
    const account = findClientAccount(localStorage.getItem(AUTH_STORAGE_KEY));
    if (isOwnerOnlyMode() && !isOwnerAccount(account)) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      clearPendingAccessRequest();
      return null;
    }
    return account;
  } catch {
    return null;
  }
}

function isUnlimitedAccount(account) {
  return account?.role === 'admin' || account?.limits?.unlimited === true;
}

function accountUsageKey(account) {
  return `${USAGE_STORAGE_KEY_PREFIX}${account?.login || 'guest'}`;
}

function readAccountUsage(account) {
  try {
    const saved = JSON.parse(localStorage.getItem(accountUsageKey(account)) || '{}');
    return {
      banners: Math.max(0, Number(saved.banners) || 0),
      prelandings: Math.max(0, Number(saved.prelandings) || 0)
    };
  } catch {
    return { banners: 0, prelandings: 0 };
  }
}

function saveAccountUsage(account, usage) {
  try {
    localStorage.setItem(accountUsageKey(account), JSON.stringify({
      banners: Math.max(0, Number(usage?.banners) || 0),
      prelandings: Math.max(0, Number(usage?.prelandings) || 0)
    }));
  } catch {
    // Local limits are still shown for the current session even if storage is blocked.
  }
}

function getAccountLimit(account, key) {
  if (isUnlimitedAccount(account)) return Infinity;
  return Number(account?.limits?.[key]) || DEFAULT_CLIENT_LIMITS[key] || 0;
}

function withAccountDefaults(account, data = {}) {
  const next = { ...PROJECT_DEFAULTS, ...data };
  if (!account) return next;
  const forceAccountIdentity = !isUnlimitedAccount(account) && String(account.login || '').startsWith('access:');
  return {
    ...next,
    clientCode: forceAccountIdentity ? (account.clientId || next.clientCode || '') : next.clientCode || (isUnlimitedAccount(account) ? '' : account.clientId),
    clientDisplayName: forceAccountIdentity ? (account.label || next.clientDisplayName || '') : next.clientDisplayName || account.label || '',
    metrikaId: next.metrikaId || account.metrikaId || '',
    metrikaToken: next.metrikaToken || account.metrikaToken || '',
    getcourseLink: next.getcourseLink || account.getcourseLink || '',
    partnerCode: next.partnerCode || account.partnerCode || ''
  };
}

function normalizeProjectOwnerValue(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function savedProjectBelongsToAnotherClient(saved = {}, account) {
  if (!account || isUnlimitedAccount(account)) return false;
  const savedAccountLogin = normalizeLogin(saved.__accountLogin);
  const savedAccountClientId = String(saved.__accountClientId || '').trim();
  if (savedAccountLogin && savedAccountLogin !== normalizeLogin(account.login)) return true;
  if (savedAccountClientId && savedAccountClientId !== String(account.clientId || '').trim()) return true;
  const savedName = normalizeProjectOwnerValue(saved.clientDisplayName);
  const accountName = normalizeProjectOwnerValue(account.label);
  const savedClientCode = String(saved.clientCode || '').trim();
  const accountClientCode = String(account.clientId || '').trim();
  if (savedName && accountName && savedName !== accountName) return true;
  if (savedClientCode && accountClientCode && savedClientCode !== accountClientCode) {
    const accountSlug = slugifyClientName(account.label || '');
    if (accountSlug && !savedClientCode.toLowerCase().includes(accountSlug)) return true;
  }
  return false;
}

function loadSavedProject(account) {
  try {
    const storageKey = projectStorageKey(account);
    const accountProjectRaw = account?.login ? localStorage.getItem(storageKey) : '';
    if (accountProjectRaw) {
      const saved = JSON.parse(accountProjectRaw);
      if (!savedProjectBelongsToAnotherClient(saved, account)) {
        return withAccountDefaults(account, saved);
      }
      localStorage.removeItem(storageKey);
    }

    if (!account || isUnlimitedAccount(account)) {
      const legacyRaw = localStorage.getItem(LEGACY_PROJECT_STORAGE_KEY);
      if (legacyRaw) return withAccountDefaults(account, JSON.parse(legacyRaw));
    }

    return withAccountDefaults(account, PROJECT_DEFAULTS);
  } catch {
    return withAccountDefaults(account, PROJECT_DEFAULTS);
  }
}

function saveProjectForAccount(account, data) {
  try {
    const payload = withAccountDefaults(account, data);
    if (account?.login) {
      payload.__accountLogin = account.login;
      payload.__accountClientId = account.clientId || '';
      payload.__accountLabel = account.label || '';
    }
    localStorage.setItem(projectStorageKey(account), JSON.stringify(payload));
  } catch {
    // localStorage can be blocked in private mode; the current session still works.
  }
}

const CLIENT_ID_COUNTER_KEY = 'constructorClientIdNextNumber';
const CLIENT_ID_START_NUMBER = 101;

const RU_TO_LATIN = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya'
};

function transliterateRu(value = '') {
  return String(value)
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      const converted = RU_TO_LATIN[lower] ?? char;
      return char === lower ? converted : converted.toUpperCase();
    })
    .join('');
}

function slugifyClientName(value = '') {
  const slug = transliterateRu(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 54);
  return slug || 'client';
}

function parseClientIdNumber(clientId = '') {
  const match = String(clientId).match(/^client[_-](\d{1,6})/i);
  return match ? Number(match[1]) : 0;
}

function readNextClientNumber() {
  try {
    const saved = Number(localStorage.getItem(CLIENT_ID_COUNTER_KEY));
    return Number.isFinite(saved) && saved >= CLIENT_ID_START_NUMBER ? saved : CLIENT_ID_START_NUMBER;
  } catch {
    return CLIENT_ID_START_NUMBER;
  }
}

function reserveNextClientNumber(number) {
  try {
    localStorage.setItem(CLIENT_ID_COUNTER_KEY, String(number + 1));
  } catch {
    // localStorage can be blocked in private mode; generation still works for the current click.
  }
}

function makeClientId(number, displayName) {
  return `client_${String(Math.max(1, number)).padStart(3, '0')}_${slugifyClientName(displayName)}`;
}

/* ================== ТЕКСТЫ ПРЕДЛЕНДИНГА ================== */
const CLIENT_PRELANDING_CORE_TEXT = `Каркас предлендинга строится вокруг заголовка и текста клиента.

Это не брендовый лендинг и не страница с готовой легендой. Конструктор берёт смысл объявления, выбирает один из шести форматов и собирает короткую посадочную страницу с мини-тестом и защищённой регистрацией Atmospace.

Узнаете сценарий
1. Человек видит знакомую боль или желание
2. Сразу понимает, зачем смотреть разбор
3. Получает 2-3 сильных мини-оффера без лишней теории
4. Проходит четыре вопроса и открывает защищённую регистрацию

Главная задача: не добавить отсебятину, а усилить введённый заголовок, описание и выбранную структуру.`;

const TPL = [
  {
    id: 1,
    t: 'Жёсткий разрыв',
    a: 'Боль и разворот',
    c: 'from-red-500 to-orange-500',
    h: 'Старый подход больше не работает? Посмотрите другой маршрут',
    p: ['Боль', 'Причина', 'Первый шаг'],
    txt: CLIENT_PRELANDING_CORE_TEXT
  },
  {
    id: 2,
    t: 'Снятие возражений',
    a: 'Доверительный вход',
    c: 'from-blue-500 to-cyan-500',
    h: 'Сначала короткий разбор — потом понятный первый шаг',
    p: ['Сценарий', 'Три ответа', 'CTA'],
    txt: `Формат для аудитории, которой важно сначала разобраться.

Лендинг показывает не обещание чуда, а спокойную логику: что человек увидит, почему это отличается от старого подхода и что станет понятно после четырёх вопросов.

Страница должна работать как мост между объявлением и регистрацией: без бренда, без лишних деталей, без фантазий поверх заголовка клиента.`
  },
  {
    id: 3,
    t: 'Доверие и ясность',
    a: 'Чистый маршрут',
    c: 'from-emerald-500 to-green-500',
    h: 'Покажите человеку понятный путь без перегруза',
    p: ['Контекст', 'Разбор', 'Решение'],
    txt: `Формат для чистой, спокойной подачи.

Он не спорит с человеком и не давит. Он показывает: вот проблема, вот короткий разбор, вот что станет понятнее, вот кнопка перехода.

Вся конкретика берётся из заголовка, описания и выбранного сценария.`
  }
];

const PRELANDING_CONTENT = {
  1: {
    badge: 'Короткий практический разбор',
    titleHtml: 'Старый подход больше <span>не даёт результата?</span>',
    pills: ['Без своего продукта', 'Без долгого запуска', 'Без продаж в лоб'],
    painTitle: 'Узнаёте ситуацию?',
    painItems: [
      'Пробовали старый путь, но он снова не даёт нужного результата',
      'Есть желание двигаться дальше, но непонятно, с чего начать',
      'Не хочется снова покупать теорию и месяцами готовиться',
      'Нужен короткий разбор и понятный первый шаг'
    ],
    painAlert: 'Смысл страницы — быстро показать другой маршрут и перевести человека к следующему шагу без перегруза.',
    trustTitle: 'Сначала понятный разбор, потом первый шаг.',
    trustSmall: 'Человек видит связку: проблема, новый подход, четыре вопроса и защищённая регистрация.',
    valueTitle: 'Что человек увидит внутри',
    valueItems: [
      'почему старый подход мог не сработать именно в его ситуации',
      'какой новый маршрут можно рассмотреть без долгой подготовки',
      'какой первый шаг подходит ему по результату мини-теста'
    ],
    actionTitle: 'Откройте короткий разбор',
    actionSubtitle: 'Ответьте на четыре вопроса, получите результат и откройте защищённую регистрацию.'
  },
  2: {
    badge: 'Спокойный вход без давления',
    titleHtml: 'Сначала разберитесь, <span>почему старое не сработало</span>',
    pills: ['Короткий разбор', 'Понятный маршрут', 'Первый шаг'],
    painTitle: 'Почему человек не идёт дальше?',
    painItems: [
      'Он уже видел много обещаний и не верит громким словам',
      'Ему нужен не шум, а понятная логика следующего действия',
      'Он хочет увидеть смысл до того, как что-то покупать или оставлять заявку',
      'Ему проще перейти, когда страница говорит коротко и конкретно'
    ],
    painAlert: 'Этот формат снимает сопротивление: без давления, без обещаний результата, без лишней истории.',
    trustTitle: 'Показываем человеку смысл до клика.',
    trustSmall: 'Три коротких блока объясняют, почему стоит открыть разбор и что человек получит после перехода.',
    valueTitle: 'Что станет понятнее после разбора',
    valueItems: [
      'где именно ломается старый путь или привычная модель действий',
      'какой первый шаг можно сделать без лишней подготовки',
      'какой результат мини-теста ведёт к следующему шагу'
    ],
    actionTitle: 'Перейти к разбору',
    actionSubtitle: 'Пройдите четыре вопроса и продолжите через защищённую регистрацию Atmospace.'
  },
  3: {
    badge: 'Чистый маршрут вместо хаоса',
    titleHtml: 'Нужен не новый шум, а <span>понятный следующий шаг</span>',
    pills: ['Ясная логика', 'Без перегруза', 'CTA сразу'],
    painTitle: 'Когда информации много, а решения нет',
    painItems: [
      'Человек устал от длинных объяснений и общих обещаний',
      'Ему нужно быстро понять, что изменится после клика',
      'Текст должен вести к действию, а не расплываться в теорию',
      'Визуал должен усиливать смысл, а не спорить с ним'
    ],
    painAlert: 'Страница работает как короткий мост: заголовок, смысл, три мини-оффера и CTA.',
    trustTitle: 'Минимум лишнего, максимум ясности.',
    trustSmall: 'Дизайн и текст подстраиваются под введённый заголовок и описание клиента.',
    valueTitle: 'Что усиливает переход',
    valueItems: [
      'сильный первый экран с понятным обещанием разбора',
      'мини-офферы, которые раскрывают выгоды без повторов',
      'финальный CTA, который ведёт к мини-тесту и регистрации без разрыва сценария'
    ],
    actionTitle: 'Открыть первый шаг',
    actionSubtitle: 'Ответьте на четыре вопроса и откройте персональный следующий шаг.'
  }
};

const CLIENT_PRELANDING_RULES = [
  'лендинг не должен продавать продукт в лоб',
  'не добавляем бренды, названия систем и внутренние термины без ввода пользователя',
  'не обещаем гарантированный доход, быстрый результат или лёгкие деньги',
  'используем заголовок, описание клиента и выбранную структуру как главный источник смысла',
  'убираем повторы: если смысл уже есть в карточках, не дублируем его отдельными плашками',
  'главная цель страницы — довести человека от смысла объявления до четырёх вопросов и защищённой регистрации'
];

const CLIENT_PRELANDING_MARKETING_ANGLES = [
  {
    id: 'old-way-break',
    label: 'Старый подход не работает',
    badge: 'Короткий практический разбор',
    trigger: ['устал', 'надоело', 'курс', 'обуч', 'не работает', 'не получилось', 'результат', 'опор', 'риск', 'доход'],
    defaultTitle: 'Старый подход больше не даёт результата?',
    defaultText: 'Короткий разбор показывает, какой другой маршрут можно рассмотреть без долгой подготовки и продаж в лоб.',
    methodName: 'Другой маршрут без старой перегрузки',
    trustSmall: 'Человек видит, зачем смотреть разбор, и получает понятный следующий шаг без давления.',
    valueTitle: 'Что человек поймёт после перехода',
    painItems: [
      'старый способ уже не даёт нужной опоры',
      'человек хочет больше ясности перед следующим шагом',
      'не хочется снова входить в долгую подготовку',
      'нужен короткий маршрут без лишнего шума'
    ],
    cards: [
      { title: 'Вторая опора', text: 'Разбор показывает, как не зависеть только от одного источника денег или одного сценария.' },
      { title: 'Вход без продукта', text: 'Не нужно сначала придумывать товар, собирать запуск и месяцами готовиться.' },
      { title: 'Без продаж в лоб', text: 'Человек сначала видит механику и сам понимает, зачем идти дальше.' }
    ],
    valueItems: [
      'почему текущий подход мог упереться в потолок',
      'как выглядит первый шаг без своего продукта и долгого запуска',
      'какой следующий шаг подойдёт после четырёх ответов'
    ],
    actionTitle: 'Откройте разбор и заберите первый шаг',
    actionSubtitle: 'Разбор откроется в новой вкладке, а лендинг останется доступным.'
  },
  {
    id: 'first-step-clarity',
    label: 'Нужен понятный первый шаг',
    badge: 'Понятный маршрут',
    trigger: ['первый шаг', 'маршрут', 'с чего начать', 'понятно', 'план', 'система', 'хаос', 'старт'],
    defaultTitle: 'Непонятно, с чего начать дальше?',
    defaultText: 'Покажем короткую последовательность: что мешает, какой смысл за первым шагом и куда перейти дальше.',
    methodName: 'Сначала ясность, потом действие',
    trustSmall: 'Лендинг не перегружает деталями. Он даёт человеку причину открыть разбор.',
    valueTitle: 'Что станет яснее внутри',
    painItems: [
      'много вариантов, но нет простого решения',
      'сложно понять, какой шаг делать первым',
      'не хочется тратить время на длинную теорию',
      'нужен спокойный переход без давления'
    ],
    cards: [
      { title: 'Смысл перед кликом', text: 'На первом экране человек сразу понимает, зачем смотреть разбор.' },
      { title: 'Короткий маршрут', text: 'Сначала смысл, затем четыре вопроса, результат и защищённая регистрация.' },
      { title: 'Без давления', text: 'Посадочная не продаёт в лоб и сохраняет доверие до перехода.' }
    ],
    valueItems: [
      'как быстро понять главный смысл предложения',
      'почему первый шаг не требует долгой подготовки',
      'какой переход логично сделать после первого экрана'
    ],
    actionTitle: 'Перейти к первому шагу',
    actionSubtitle: 'Пройдите мини-тест и откройте следующий шаг через защищённую регистрацию.'
  },
  {
    id: 'extra-support',
    label: 'Нужна дополнительная опора',
    badge: 'Финансовая опора без схем',
    trigger: ['финанс', 'деньг', 'зарплат', 'опора', 'ресурс', 'доход', 'потолок', 'больше', 'уровень'],
    defaultTitle: 'Один доход — это риск. Нужна дополнительная опора?',
    defaultText: 'Узнайте, как создать дополнительную финансовую опору без своего продукта, долгого запуска и продаж в лоб.',
    methodName: 'Опора без обещаний лёгких денег',
    trustSmall: 'Страница не обещает доход. Она объясняет, какой разбор стоит открыть и почему.',
    valueTitle: 'Что покажем внутри',
    painItems: [
      'один источник денег больше не даёт спокойствия',
      'хочется вырасти, но без авантюр и быстрых схем',
      'не хочется начинать с продукта, упаковки и сложного запуска',
      'нужен понятный первый шаг, а не очередная теория'
    ],
    cards: [
      { title: 'Вторая опора', text: 'Как смотреть на дополнительный доход без иллюзии лёгких денег.' },
      { title: 'Без долгого запуска', text: 'Первый шаг открывается через короткий разбор, а не через месяцы подготовки.' },
      { title: 'Без продаж в лоб', text: 'Сначала человек видит механику и понимает, зачем двигаться дальше.' }
    ],
    valueItems: [
      'как зайти без своего продукта и долгой подготовки',
      'почему человеку не нужно продавать в лоб на первом касании',
      'какой следующий шаг подходит по результату мини-теста'
    ],
    actionTitle: 'Откройте разбор и заберите первый шаг',
    actionSubtitle: 'Ответьте на четыре вопроса и перейдите к защищённой регистрации.'
  },
  {
    id: 'higher-level',
    label: 'Хочу выйти на следующий уровень',
    badge: 'Следующий уровень без перегруза',
    trigger: ['уровень', 'больше', 'рост', 'потолок', 'зарабатыва', 'хочу', 'развиваться', 'масштаб'],
    defaultTitle: 'Доход есть, но финансовый потолок уже чувствуется?',
    defaultText: 'Посмотрите метод, который показывает, как выйти на следующий уровень без смены профессии и лишней суеты.',
    methodName: 'Рост через понятный маршрут',
    trustSmall: 'Фокус не на громких обещаниях, а на понятном переходе от интереса к первому действию.',
    valueTitle: 'Что человек увидит внутри',
    painItems: [
      'текущий доход есть, но роста уже не хватает',
      'не хочется менять всё с нуля ради следующего уровня',
      'нужен спокойный путь без давления и хаоса',
      'важно увидеть механику до принятия решения'
    ],
    cards: [
      { title: 'Потолок виден', text: 'Человек узнаёт свою ситуацию и понимает, почему прежний путь мог замедлиться.' },
      { title: 'Маршрут короче', text: 'Разбор показывает не всю систему сразу, а ближайший шаг к следующему уровню.' },
      { title: 'Решение без давления', text: 'Человек отвечает на четыре вопроса и сам решает, продолжать ли регистрацию.' }
    ],
    valueItems: [
      'почему текущий доход может упираться в потолок',
      'какой первый шаг не требует смены профессии',
      'как продолжить разбор без закрытия лендинга'
    ],
    actionTitle: 'Посмотреть первый шаг',
    actionSubtitle: 'Мини-тест покажет результат и откроет защищённую регистрацию Atmospace.'
  }
];

const PROJECT_FIELDS = [
  ['clientDisplayName', 'Название лендинга', 'Лендинг клиента'],
  ['partnerCode', 'Код для рекламного лендинга', 'cabinet_code'],
  ['metrikaId', 'Номер рекламного счётчика', '12345678'],
  ['metrikaToken', 'Защищённый ключ отправки целей', 'AQAAAA...', 'password']
];

const PROJECT_DEFAULTS = PROJECT_FIELDS.reduce((acc, [key]) => ({ ...acc, [key]: '' }), {});
const YANDEX_DIRECT_URL_PARAMS = 'utm_source=yandex&utm_medium=cpc&utm_campaign={campaign_id}&utm_content={ad_id}&utm_term={keyword}&yd_campaign_id={campaign_id}&yd_ad_id={ad_id}&yd_group_id={gbid}&yd_creative_id={creative_id}&yd_source={source}&yd_source_type={source_type}&yd_device={device_type}&yd_region_id={region_id}&yclid={yclid}';

async function requestConstructorAccess(payload) {
  const response = await fetch('/api/request-access', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.message || data.error || 'Не удалось отправить заявку.');
  }
  return data;
}

async function fetchConstructorAccessStatus(pending) {
  const params = new URLSearchParams({
    request_id: pending?.requestId || '',
    token: pending?.requestToken || ''
  });
  const response = await fetch(`/api/access-status?${params.toString()}`, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.message || data.error || 'Не удалось проверить статус.');
  }
  return data;
}

const CLIENT_ACCOUNTS = [
  {
    login: 'mihail',
    password: '',
    role: 'client',
    label: 'Михаил Кузнецов',
    clientId: 'client_101_mihail_kuznetsov',
    metrikaId: '109150890',
    metrikaToken: '',
    getcourseLink: 'https://voronkapodkluch.getcourse.ru/page2?gcao=54688&gcpc=1b9f5',
    partnerCode: '1b9f5',
    limits: DEFAULT_CLIENT_LIMITS
  },
  {
    login: 'admin',
    password: '',
    role: 'admin',
    label: 'Администратор',
    clientId: 'client_admin',
    metrikaId: '',
    metrikaToken: '',
    getcourseLink: '',
    partnerCode: '',
    limits: { unlimited: true }
  }
];

const PUBLIC_ASSET_BASE = 'https://constructoratmosfera.com';
function safeInlineJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/* ================== РАБОЧИЕ СТИЛИ ДЛЯ ПРЕДЛЕНДИНГА ================== */
const STYLES = [
  ['glassmorphism', 'Glassmorphism', '🪟', 'Стекло, размытие, прозрачность'],
  ['saas', 'SaaS Dashboard', '📊', 'Чистый интерфейс, табличные блоки, бейджи'],
  ['planner', 'Launch Planner', '🗂️', 'Чек-листы, шаги, дорожная карта'],
  ['clean-ads', 'AdTech Clean', '🎯', 'Стиль рекламного кабинета, аккуратные метрики'],
  ['premium-light', 'Premium Light', '🤍', 'Светлый премиум, тонкие рамки, воздух'],
  ['documentary', 'Documentary', '🎥', 'Живые фото, подписи, честный репортаж'],
  ['banner-black-yellow', 'Баннерный чёрно-жёлтый', '🟡', 'Как сильный рекламный баннер: чёрный фон, жёлтый удар, крупная типографика'],
  ['banner-black-red', 'Баннерный чёрно-красный', '🔴', 'Максимальный контраст, боль, разрыв шаблона'],
  ['banner-green', 'Баннерный зелёный', '🟢', 'Система, спокойствие, понятный путь, но без вялости'],
  ['banner-blue', 'Баннерный синий', '🔷', 'Доверие, ясная логика, аккуратный первый экран'],
  ['banner-white-gold', 'Бело-золотой баннер', '🥇', 'Светлый премиум с крупной фразой и фото клиента'],
  ['client-story', 'Живая история клиента', '👤', 'Первый экран от лица клиента: я нашёл/нашла способ у ребят']
];

/* ================== ЭФФЕКТЫ ================== */
const EFFECTS = [
  ['micro', '✨ Микроанимации при наведении'],
  ['fadein', '🪂 Плавное появление при скролле'],
  ['pulse', '💓 Пульсирующая главная кнопка'],
  ['glow', '💡 Свечение элементов (glow)'],
  ['sticky-cta', '📌 Липкий CTA-блок'],
  ['progress', '🧭 Прогресс по шагам'],
  ['soft-reveal', '🌫️ Мягкое проявление карточек']
];

/* ================== ПАЛИТРЫ ================== */
const PALETTES = [
  ['red-energy', 'Красная энергия', '🔴', ['#ef4444', '#f97316', '#fbbf24']],
  ['blue-trust', 'Синее доверие', '🔵', ['#2563eb', '#06b6d4', '#0ea5e9']],
  ['green-money', 'Зелёные деньги', '🟢', ['#10b981', '#22c55e', '#84cc16']],
  ['ocean', 'Океан', '🌊', ['#0c4a6e', '#0891b2', '#67e8f9']],
  ['mint-fresh', 'Мятная свежесть', '🌿', ['#14b8a6', '#22d3ee', '#fef3c7']],
  ['trust-coral', 'Синий и коралл', '🪸', ['#1d4ed8', '#fb7185', '#f8fafc']],
  ['clean-product', 'Чистый продукт', '🧊', ['#0f172a', '#e2e8f0', '#2563eb']],
  ['black-red-ad', 'Чёрный и красный', '🔴', ['#ef111a', '#ffffff', '#050505']],
  ['black-yellow-ad', 'Чёрный и жёлтый', '🟡', ['#ffd200', '#ffffff', '#050505']],
  ['black-green-ad', 'Чёрный и зелёный', '🟢', ['#22c55e', '#ffffff', '#06130c']],
  ['white-gold-ad', 'Белый и золото', '🥇', ['#b18a3d', '#061325', '#fffaf0']],
  ['deep-blue-ad', 'Глубокий синий', '🔷', ['#2563eb', '#f8fafc', '#061325']]
];

const TYPOS = [
  ['manrope', 'Manrope', 'Современный геометрический'],
  ['inter', 'Inter', 'Универсальный'],
  ['unbounded', 'Unbounded', 'Жирный, премиальный'],
  ['onest', 'Onest / Gilroy', 'Чистый, профессиональный'],
  ['playfair', 'Playfair + Inter', 'Журнальный премиум']
];

const LAYOUTS = [
  ['classic', 'Классический', '📐 Hero → Пилюли → Боль → Ценность → CTA'],
  ['split', 'Split-screen', '⚔️ Текст слева, визуал справа'],
  ['cards', 'Стопка карточек', '🃏 Все блоки карточками'],
  ['timeline', 'Таймлайн', '🧭 Путь клиента по шагам']
];

/* ================== ПРЕСЕТЫ (ОДИН КЛИК) ================== */
const PRESETS = [
  { id: 'bannerBlackYellow', name: 'Чёрно-жёлтый удар', emoji: '🟡', desc: 'Сильный контраст, крупная фраза, быстрый клик', tpl: 1, style: 'banner-black-yellow', palette: 'black-yellow-ad', typo: 'unbounded', layout: 'split', effects: ['fadein', 'pulse', 'glow'] },
  { id: 'bannerBlackRed', name: 'Чёрно-красный напор', emoji: '🔴', desc: 'Жёсткий заход по боли курсов и денег', tpl: 1, style: 'banner-black-red', palette: 'black-red-ad', typo: 'unbounded', layout: 'split', effects: ['fadein', 'pulse'] },
  { id: 'bannerGreen', name: 'Зелёная система', emoji: '🟢', desc: 'Система, спокойствие, понятный путь', tpl: 2, style: 'banner-green', palette: 'black-green-ad', typo: 'manrope', layout: 'classic', effects: ['fadein', 'micro', 'glow'] },
  { id: 'bannerBlue', name: 'Синий доверительный', emoji: '🔷', desc: 'Для осторожной аудитории: чисто и понятно', tpl: 2, style: 'banner-blue', palette: 'deep-blue-ad', typo: 'manrope', layout: 'classic', effects: ['fadein', 'micro'] },
  { id: 'bannerWhiteGold', name: 'Бело-золотой премиум', emoji: '🥇', desc: 'Светлый дорогой вид, фото и крупная фраза', tpl: 2, style: 'banner-white-gold', palette: 'white-gold-ad', typo: 'playfair', layout: 'split', effects: ['fadein', 'micro'] },
  { id: 'clientStory', name: 'Живая история', emoji: '👤', desc: 'Честный тон от лица клиента, без лишнего пафоса', tpl: 1, style: 'client-story', palette: 'blue-trust', typo: 'manrope', layout: 'classic', effects: ['fadein', 'micro'] },
  { id: 'plannerSteps', name: 'Пошаговая система', emoji: '🗂️', desc: 'Маршрут и понятные шаги вместо хаоса', tpl: 2, style: 'planner', palette: 'blue-trust', typo: 'inter', layout: 'timeline', effects: ['fadein', 'progress'] },
  { id: 'adtechRoute', name: 'Чистый запуск', emoji: '🎯', desc: 'Рекламный кабинет, метки, предлендинг, оффер', tpl: 2, style: 'clean-ads', palette: 'trust-coral', typo: 'inter', layout: 'cards', effects: ['fadein', 'micro'] }
];

const HERO_BLOCKS_PRESETS = [
  { id: 'heroSceneLive', name: 'Светлый первый шаг', emoji: '✨', desc: 'Большой hero, сильный заголовок, смысл заголовка и CTA сразу', tpl: 1, style: 'premium-light', palette: 'blue-trust', typo: 'manrope', layout: 'split', effects: ['fadein', 'micro'] },
  { id: 'heroThreeBlocks', name: 'Цель → маршрут → действие', emoji: '🧩', desc: 'Первый экран, три офферные карточки и спокойный переход к действию', tpl: 1, style: 'clean-ads', palette: 'trust-coral', typo: 'inter', layout: 'classic', effects: ['fadein', 'micro'] },
  { id: 'heroPremiumStory', name: 'Премиальный первый экран', emoji: '🥇', desc: 'Дорогой светлый вид: крупный оффер, фото и чистые блоки', tpl: 1, style: 'banner-white-gold', palette: 'white-gold-ad', typo: 'manrope', layout: 'cards', effects: ['fadein'] }
];

const NATURE_EDITORIAL_PRESETS = [
  { id: 'natureSagePaper', name: 'Sage paper', emoji: '🌿', desc: 'Тёплый editorial: бумага, олива, спокойная премиальность', tpl: 1, style: 'nature-sage-paper', palette: 'white-gold-ad', typo: 'playfair', layout: 'split', effects: ['fadein', 'micro'] },
  { id: 'natureTerraFocus', name: 'Terra focus', emoji: '🍂', desc: 'Бежево-терракотовый заход: личная история и первый шаг', tpl: 1, style: 'nature-terra-focus', palette: 'trust-coral', typo: 'playfair', layout: 'classic', effects: ['fadein'] },
  { id: 'natureForestTrust', name: 'Forest trust', emoji: '🪴', desc: 'Доверительный зелёный маршрут: меньше шума, больше смысла', tpl: 1, style: 'nature-forest-trust', palette: 'green-money', typo: 'playfair', layout: 'cards', effects: ['fadein', 'micro'] }
];

const MINIMAL_COMPARE_PRESETS = [
  { id: 'minimalNoir', name: 'Тихий noir', emoji: '⚫', desc: 'Тёмный минимализм: внутренний конфликт, воздух и две CTA-кнопки', tpl: 1, style: 'minimal-noir', palette: 'black-yellow-ad', typo: 'inter', layout: 'minimal', effects: ['fadein'] },
  { id: 'minimalGraphite', name: 'Графит и белый', emoji: '◼️', desc: 'Строгий графитовый экран: честный текст без визуального шума', tpl: 1, style: 'minimal-graphite', palette: 'clean-product', typo: 'inter', layout: 'minimal', effects: ['fadein'] },
  { id: 'minimalBlue', name: 'Синий полутон', emoji: '🔹', desc: 'Холодный доверительный вариант: спокойный контраст и короткий CTA', tpl: 1, style: 'minimal-blue', palette: 'deep-blue-ad', typo: 'inter', layout: 'minimal', effects: ['fadein'] }
];

const CORE_METHOD_PRESETS = [
  { id: 'coreHardBreak', name: 'Откат назад', emoji: '🔥', desc: 'Яркий дизайн под боль: начинал, но снова возвращался назад', tpl: 1, style: 'heroBright', palette: 'red-energy', typo: 'manrope', layout: 'classic', effects: ['fadein', 'micro'] },
  { id: 'coreBlueTrust', name: 'Цель без движения', emoji: '🔷', desc: 'Светлый синий дизайн: цель есть, но нужна система регулярности', tpl: 2, style: 'blueTrust', palette: 'blue-trust', typo: 'manrope', layout: 'classic', effects: ['fadein', 'micro'] },
  { id: 'coreGreenClarity', name: 'Доверие и ясность', emoji: '🟢', desc: 'Зелёная системность: спокойный маршрут и понятный первый шаг', tpl: 3, style: 'greenSystem', palette: 'green-money', typo: 'manrope', layout: 'classic', effects: ['fadein'] }
];

const DIRECTION_QUIZ_PRESETS = [
  { id: 'directionQuizNavy', name: 'Ночной синий маршрут', emoji: '🧭', desc: 'Честная диагностика и понятный первый шаг', tpl: 1, style: 'direction-quiz-navy', palette: 'deep-blue-ad', typo: 'manrope', layout: 'quiz', effects: ['fadein', 'micro'] },
  { id: 'directionQuizGold', name: 'Тёмное золото', emoji: '✦', desc: 'Контрастный маршрут с тёплым акцентом', tpl: 1, style: 'direction-quiz-gold', palette: 'black-yellow-ad', typo: 'manrope', layout: 'quiz', effects: ['fadein'] },
  { id: 'directionQuizForest', name: 'Лесная ясность', emoji: '🌿', desc: 'Спокойная зелёная точка опоры', tpl: 1, style: 'direction-quiz-forest', palette: 'green-money', typo: 'manrope', layout: 'quiz', effects: ['fadein', 'micro'] }
];

const PERSONAL_ROUTE_QUIZ_PRESETS = [
  { id: 'personalRouteCoral', name: 'Коралл и ночь', emoji: '◉', desc: 'Живой личный маршрут без лишнего давления', tpl: 1, style: 'personal-route-coral', palette: 'trust-coral', typo: 'manrope', layout: 'quiz', effects: ['fadein', 'micro'] },
  { id: 'personalRouteAmber', name: 'Янтарная точка', emoji: '◇', desc: 'Тёплая премиальная диагностика', tpl: 1, style: 'personal-route-amber', palette: 'white-gold-ad', typo: 'manrope', layout: 'quiz', effects: ['fadein'] },
  { id: 'personalRouteViolet', name: 'Фиолетовый фокус', emoji: '◈', desc: 'Глубокий контраст и ясный следующий шаг', tpl: 1, style: 'personal-route-violet', palette: 'deep-blue-ad', typo: 'manrope', layout: 'quiz', effects: ['fadein', 'micro'] }
];

const BARRIER_PROFILE_QUIZ_PRESETS = [
  { id: 'barrierProfileEmber', name: 'Тёплый разрыв', emoji: '◐', desc: 'Честный разбор повторяющегося сбоя с тёплым акцентом', tpl: 1, style: 'barrier-profile-ember', palette: 'trust-coral', typo: 'manrope', layout: 'quiz', effects: ['fadein', 'micro'] },
  { id: 'barrierProfileTeal', name: 'Бирюзовая ясность', emoji: '◇', desc: 'Спокойная диагностика барьера и реалистичный первый шаг', tpl: 1, style: 'barrier-profile-teal', palette: 'green-money', typo: 'manrope', layout: 'quiz', effects: ['fadein'] },
  { id: 'barrierProfileBlue', name: 'Глубокий синий', emoji: '◈', desc: 'Строгий премиальный профиль без давления и громких обещаний', tpl: 1, style: 'barrier-profile-blue', palette: 'deep-blue-ad', typo: 'manrope', layout: 'quiz', effects: ['fadein', 'micro'] }
];

/* ================== ГЕНЕРАЦИЯ ПРОМТА ================== */
function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function mergePrelandingContent(content, overrides = {}) {
  if (!content) return null;
  if (overrides?.lockTemplateCopy && !overrides?.fromBanner) {
    return { ...content };
  }
  const hasOverride = (key) => Object.prototype.hasOwnProperty.call(overrides, key);
  return {
    ...content,
    ...overrides,
    badge: overrides.badge || content.badge,
    title: overrides.title || content.title,
    titleHtml: overrides.titleHtml || (overrides.title ? esc(overrides.title) : content.titleHtml),
    pills: hasOverride('pills') ? (Array.isArray(overrides.pills) ? overrides.pills : []) : content.pills,
    painTitle: overrides.painTitle || content.painTitle,
    painItems: hasOverride('painItems') ? (Array.isArray(overrides.painItems) ? overrides.painItems : []) : content.painItems,
    painAlert: overrides.painAlert || content.painAlert,
    trustTitle: hasOverride('trustTitle') ? overrides.trustTitle : content.trustTitle,
    trustSmall: hasOverride('trustSmall') ? overrides.trustSmall : content.trustSmall,
    valueTitle: overrides.valueTitle || content.valueTitle,
    valueItems: hasOverride('valueItems') ? (Array.isArray(overrides.valueItems) ? overrides.valueItems : []) : content.valueItems,
    actionTitle: overrides.actionTitle || content.actionTitle,
    actionSubtitle: hasOverride('actionSubtitle') ? overrides.actionSubtitle : content.actionSubtitle,
    methodName: hasOverride('methodName') ? overrides.methodName : content.methodName,
    cards: hasOverride('cards') ? (Array.isArray(overrides.cards) ? overrides.cards : []) : content.cards,
    proofItems: hasOverride('proofItems') ? (Array.isArray(overrides.proofItems) ? overrides.proofItems : []) : content.proofItems,
    liveNote: hasOverride('liveNote') ? overrides.liveNote : content.liveNote,
    ctaLead: hasOverride('ctaLead') ? overrides.ctaLead : content.ctaLead
  };
}

function detectClientGender(name = '') {
  const value = String(name).trim().toLowerCase();
  if (!value) return 'neutral';
  const first = value.split(/\s+/)[0] || '';
  const femaleNames = ['людмила', 'марина', 'наталья', 'ольга', 'елена', 'светлана', 'ирина', 'татьяна', 'оксана', 'анна', 'екатерина', 'юлия', 'галина', 'лариса', 'надежда', 'валентина', 'нина', 'любовь'];
  const maleNames = ['павел', 'михаил', 'сергей', 'андрей', 'антон', 'иван', 'алексей', 'дмитрий', 'владимир', 'николай', 'евгений', 'александр', 'игорь', 'олег', 'юрий'];
  if (femaleNames.includes(first) || /(ова|ева|ёва|ина|ская|цкая|ая)$/.test(first) || /(овна|евна|ична)$/.test(value)) return 'female';
  if (maleNames.includes(first) || /(ов|ев|ёв|ин|ский|цкий|ой)$/.test(first) || /(ович|евич|ич)$/.test(value)) return 'male';
  return 'neutral';
}

function getClientFirstName(name = '') {
  return String(name).trim().split(/\s+/).filter(Boolean)[0] || 'герой';
}

function buildAtmospaceLandingConfig({ projectData, ...fallback } = {}) {
  const publicLandingKey = String(fallback.publicLandingKey || '').trim();
  const counterId = String(fallback.counterId || fallback.metrikaCounterId || projectData?.metrikaId || '').trim();
  const landingName = String(fallback.landingName || projectData?.clientDisplayName || projectData?.clientName || 'Лендинг').trim();
  const landingCode = String(fallback.landingCode || projectData?.partnerCode || '').trim();
  return {
    runtimeVersion: ATMOSPACE_GENERATED_RUNTIME_VERSION,
    apiBaseUrl: ATMOSPACE_PUBLIC_API_BASE_URL,
    initEndpoint: ATMOSPACE_INIT_ENDPOINT,
    clickEndpoint: ATMOSPACE_CLICK_ENDPOINT,
    publicLandingKey,
    counterId,
    landingName,
    landingCode
  };
}

const ATMOSPACE_MINI_QUIZ = Object.freeze([
  {
    title: 'Сколько лет ты уже говоришь себе: «Ща,-ща, ещё немного — и всё изменится»?',
    options: ['Меньше 1 года', '1-3 года', '3-5 лет', 'Больше 5 лет']
  },
  {
    title: 'Если завтра тебя не станет, что самое неприятное про себя слышать?',
    options: [
      'Мда, он так много хотел, но так ничего и не сделал.',
      'Обещал-обещал семье другое будущее, но так и не вывез.',
      'Он не оставил семье ничего кроме долгов.',
      'Он так и не стал тем, кем всегда хотел быть.'
    ]
  },
  {
    title: 'Представь прошло 5 лет. Ничего не изменилось. Что тяжелее всего признать?',
    options: [
      'Я так и не смог ничего добиться, просто сдался и смирился.',
      'Я всё также работаю на других и обслуживаю чужую жизнь за зарплату.',
      'Ребёнок вырос, но видит во мне НЕ авторитета, а уставшего пузатого скуфа, обиженного на жизнь.',
      'Я вижу как другие живут так как хотел я, а у меня больше нет сил на новые попытки. Осталась только боль и обида, которую я каждый вечер заливаю пивом.'
    ]
  },
  {
    title: 'Каким мужчиной ты себя видишь прямо сейчас?',
    options: [
      'Всё норм, я не сдался, я знаю что смогу. Я действую.',
      'Ходячая папка с планами, которые не реализовались и хрен знает реализуются ли.',
      'Во мне есть силы, есть потенциал, но из-за кучи провалов я стал терять веру в себя.',
      'Остались только обещания себе и семье, которые я так и не выполнил.'
    ]
  }
]);

function renderAtmospaceQuizButton(className, label = 'Пройти мини-тест') {
  return `<a href="#atmospace-mini-quiz" data-atmospace-quiz-link data-atmospace-state="ready" class="${esc(className)}" style="grid-column:1 / -1"><span>${esc(label)}</span></a>`;
}

function renderAtmospaceRegistrationButton(className, label = 'Перейти к форме заявки') {
  return `<a href="#" data-atmospace-registration-link data-atmospace-state="loading" aria-disabled="true" class="${esc(className)}" style="grid-column:1 / -1"><span>${esc(label)}</span></a>`;
}

function buildAtmospaceHeadConfig({ projectData, ...fallback } = {}) {
  const config = buildAtmospaceLandingConfig({ projectData, ...fallback });
  return `<script>
window.ATMOSPACE_LANDING_CONFIG = Object.freeze(${safeInlineJson(config)});
</script>`;
}

function buildLegacyAtmospacePrelandingTrackingScript() {
  return `<script>
(function () {
  'use strict';

  var cfg = window.ATMOSPACE_LANDING_CONFIG || {};
  var runtimeVersion = cfg.runtimeVersion || ${JSON.stringify(ATMOSPACE_GENERATED_RUNTIME_VERSION)};
  var initEndpoint = cfg.initEndpoint || ${JSON.stringify(ATMOSPACE_INIT_ENDPOINT)};
  var clickEndpoint = cfg.clickEndpoint || ${JSON.stringify(ATMOSPACE_CLICK_ENDPOINT)};
  var DIRECT_PARAM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICK_ID_KEYS = ['yclid', 'gclid', 'fbclid', 'msclkid', 'dclid'];
  var questions = ${safeInlineJson(ATMOSPACE_MINI_QUIZ)};
  var registrationUrl = '';
  var landingOpenedSent = false;
  var answeredGoalIndexes = {};
  var quizCompletedSent = false;
  var registrationNavigationStarted = false;
  var RUNTIME_ERROR_MESSAGE = 'Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.';

  function getParam(name) {
    try {
      return new URL(window.location.href).searchParams.get(name) || '';
    } catch (error) {
      return '';
    }
  }

  function makePageInstanceId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'page_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }
  var pageInstanceId = makePageInstanceId();

  function collectUtm() {
    var result = {};
    DIRECT_PARAM_KEYS.forEach(function (key) {
      result[key] = getParam(key) || null;
    });
    return result;
  }

  function collectClickIds() {
    var result = {};
    CLICK_ID_KEYS.forEach(function (key) {
      var value = getParam(key);
      if (value) result[key] = value;
    });
    return result;
  }

  function isLocalPreview() {
    return window.location.protocol === 'file:'
      || window.location.hostname === 'localhost'
      || window.location.hostname === '127.0.0.1';
  }

  function getQuizButtons() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-atmospace-quiz-link]'));
  }

  function getRegistrationButtons() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-atmospace-registration-link]'));
  }

  function setQuizButtonsState(state) {
    getQuizButtons().forEach(function (button) {
      button.setAttribute('data-atmospace-state', state);
      button.removeAttribute('aria-disabled');
      button.setAttribute('href', '#atmospace-mini-quiz');
    });
  }

  function setRegistrationButtonsState(state) {
    getRegistrationButtons().forEach(function (button) {
      button.setAttribute('data-atmospace-state', state);
      if (state === 'ready' && registrationUrl) {
        button.removeAttribute('aria-disabled');
        button.setAttribute('href', registrationUrl);
      } else {
        button.setAttribute('aria-disabled', 'true');
        button.setAttribute('href', '#');
      }
    });
  }

  function getRuntimeMessageNode() {
    var existing = document.querySelector('[data-atmospace-runtime-message]');
    if (existing) return existing;
    var firstButton = getRegistrationButtons()[0] || getQuizButtons()[0];
    if (!firstButton) return null;
    var node = document.createElement('p');
    node.setAttribute('data-atmospace-runtime-message', '');
    node.hidden = true;
    node.style.cssText = 'display:none;margin:12px 0 0;color:#b91c1c;font-size:14px;line-height:1.45;font-weight:800;text-align:center;';
    var container = firstButton.parentElement || firstButton;
    container.insertAdjacentElement('afterend', node);
    return node;
  }

  function setRuntimeMessage(message) {
    var node = getRuntimeMessageNode();
    if (!node) return;
    node.textContent = message || '';
    node.hidden = !message;
    node.style.display = message ? 'block' : 'none';
  }

  function showRuntimeError() {
    registrationUrl = '';
    setRegistrationButtonsState('error');
    setRuntimeMessage(RUNTIME_ERROR_MESSAGE);
  }

  function isTrustedRegistrationUrl(value) {
    try {
      var url = new URL(String(value || ''));
      return url.protocol === 'https:' && (url.hostname === 'atmospace.pro' || url.hostname.endsWith('.atmospace.pro'));
    } catch (error) {
      return false;
    }
  }

  function applyRegistrationLink(links) {
    var candidate = links && links.registration;
    if (typeof candidate !== 'string') {
      showRuntimeError();
      return false;
    }
    if (!isTrustedRegistrationUrl(candidate)) {
      showRuntimeError();
      return false;
    }
    registrationUrl = candidate;
    setRuntimeMessage('');
    setRegistrationButtonsState('ready');
    document.dispatchEvent(new CustomEvent('atmospace:registration-ready', { detail: { registrationUrl: registrationUrl } }));
    return true;
  }

  function buildBasePayload() {
    var utm = collectUtm();
    return {
      public_landing_key: cfg.publicLandingKey || '',
      counter_id: cfg.counterId || '',
      landing_variant_code: cfg.landingCode || '',
      landing_variant_name: cfg.landingName || '',
      page_instance_id: pageInstanceId,
      page_url: window.location.href,
      referrer: document.referrer || null,
      runtime_version: runtimeVersion,
      browser_language: navigator.language || null,
      browser_client_time: new Date().toISOString(),
      advertising_click_ids: collectClickIds(),
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      utm_content: utm.utm_content,
      utm_term: utm.utm_term
    };
  }

  function postJson(url, payload, keepalive) {
    if (!url || typeof fetch !== 'function') return Promise.resolve(null);
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: Boolean(keepalive)
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (body) {
        return { ok: response.ok, body: body };
      });
    }).catch(function () {
      return null;
    });
  }

  function sendEvent(eventType) {
    var payload = {
      public_landing_key: cfg.publicLandingKey || '',
      counter_id: cfg.counterId || '',
      event_type: eventType,
      page_instance_id: pageInstanceId,
      page_url: window.location.href,
      referrer: document.referrer || null,
      runtime_version: runtimeVersion,
      client_time: new Date().toISOString()
    };
    var body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(clickEndpoint, blob)) return;
      } catch (error) {
        // A fetch fallback below keeps analytics from blocking navigation.
      }
    }
    postJson(clickEndpoint, payload, true);
  }

  function sendLandingOpenedOnce() {
    if (landingOpenedSent) return;
    landingOpenedSent = true;
    sendEvent('landing_opened');
  }

  var metrikaCounterId = (function () {
    var value = Number.parseInt(String(cfg.counterId || ''), 10);
    return Number.isInteger(value) && value > 0 ? value : null;
  })();
  var pendingMetrikaGoals = [];
  var metrikaFlushScheduled = false;

  function finishPendingMetrikaGoals() {
    while (pendingMetrikaGoals.length) {
      var item = pendingMetrikaGoals.shift();
      item.done();
    }
  }

  function flushPendingMetrikaGoals() {
    if (!metrikaCounterId || typeof window.ym !== 'function') return false;
    while (pendingMetrikaGoals.length) {
      var item = pendingMetrikaGoals.shift();
      try {
        window.ym(metrikaCounterId, 'reachGoal', item.goalName, {}, item.done);
      } catch (error) {
        item.done();
      }
    }
    return true;
  }

  function scheduleMetrikaFlush() {
    if (metrikaFlushScheduled || !pendingMetrikaGoals.length) return;
    metrikaFlushScheduled = true;
    var attempts = 0;
    function tick() {
      if (flushPendingMetrikaGoals()) {
        metrikaFlushScheduled = false;
        return;
      }
      attempts += 1;
      if (attempts >= 40) {
        finishPendingMetrikaGoals();
        metrikaFlushScheduled = false;
        return;
      }
      window.setTimeout(tick, 250);
    }
    if (document.readyState === 'complete') tick();
    else window.addEventListener('load', tick, { once: true });
  }

  function reachGoal(goalName, callback) {
    var callbackCalled = false;
    function done() {
      if (callbackCalled) return;
      callbackCalled = true;
      if (typeof callback === 'function') callback();
    }
    if (!metrikaCounterId || isLocalPreview()) {
      done();
      return;
    }
    pendingMetrikaGoals.push({ goalName: goalName, done: done });
    scheduleMetrikaFlush();
  }

  function ensureMiniQuiz() {
    var existing = document.querySelector('[data-atmospace-mini-quiz]');
    if (existing) return existing;
    var style = document.createElement('style');
    style.textContent = '[data-atmospace-mini-quiz]{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(5,10,20,.84);font-family:Manrope,Inter,system-ui,sans-serif;color:#f8fafc}[data-atmospace-mini-quiz][hidden]{display:none!important}.atm-qz-dialog{position:relative;width:min(820px,100%);max-height:calc(100svh - 40px);overflow:auto;border:1px solid rgba(148,163,184,.24);border-radius:8px;background:#0b1424;box-shadow:0 28px 90px rgba(0,0,0,.46)}.atm-qz-body{padding:clamp(24px,5vw,48px)}.atm-qz-close{position:absolute;top:14px;right:14px;width:42px;height:42px;border:1px solid rgba(148,163,184,.25);border-radius:50%;background:#111e32;color:#fff;cursor:pointer;font-size:24px;line-height:1}.atm-qz-kicker{margin:0 52px 14px 0;color:#63b3ff;font-size:12px;font-weight:900;text-transform:uppercase}.atm-qz-title{margin:0 0 18px;font-size:clamp(30px,5vw,48px);line-height:1.08}.atm-qz-note{margin:7px 0;color:#cbd5e1;font-size:16px;line-height:1.5}.atm-qz-note strong{color:#fff}.atm-qz-action,.atm-qz-registration{display:flex;align-items:center;justify-content:center;width:100%;min-height:62px;margin-top:28px;padding:14px 22px;border:0;border-radius:8px;background:#2f80ed;color:#fff!important;text-decoration:none!important;cursor:pointer;font-size:17px;font-weight:900}.atm-qz-progress-row{display:flex;align-items:center;gap:14px;margin-bottom:28px;color:#94a3b8;font-size:13px;font-weight:800}.atm-qz-progress{height:7px;flex:1;overflow:hidden;border-radius:999px;background:#1b2a40}.atm-qz-progress span{display:block;height:100%;background:#38bdf8;transition:width .2s ease}.atm-qz-question{margin:0 0 26px;font-size:clamp(26px,4vw,38px);line-height:1.18}.atm-qz-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.atm-qz-option{min-height:76px;padding:17px;border:1px solid rgba(148,163,184,.24);border-radius:8px;background:#111e32;color:#f8fafc;cursor:pointer;text-align:left;font-size:15px;line-height:1.45;font-weight:750}.atm-qz-option:hover,.atm-qz-option:focus-visible{border-color:#38bdf8;outline:none}.atm-qz-back{margin-top:20px;border:0;background:transparent;color:#94a3b8;cursor:pointer;font-weight:800}.atm-qz-result{text-align:center}.atm-qz-result p{color:#cbd5e1;font-size:18px;line-height:1.55}.atm-qz-status{margin:12px 0 0;color:#fca5a5;font-size:13px;font-weight:800}.atm-qz-registration[aria-disabled=true]{pointer-events:none;opacity:.58}@media(max-width:640px){[data-atmospace-mini-quiz]{padding:0}.atm-qz-dialog{width:100%;max-height:100svh;min-height:100svh;border:0;border-radius:0}.atm-qz-body{padding:64px 16px 24px}.atm-qz-options{grid-template-columns:1fr}.atm-qz-option{min-height:64px}.atm-qz-close{position:fixed}}';
    document.head.appendChild(style);
    var modal = document.createElement('div');
    modal.setAttribute('data-atmospace-mini-quiz', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Мини-тест');
    modal.hidden = true;
    modal.innerHTML = '<div class="atm-qz-dialog"><button class="atm-qz-close" type="button" data-atm-qz-close aria-label="Закрыть">×</button><div class="atm-qz-body"><section data-atm-qz-intro><p class="atm-qz-kicker">Мини-тест</p><h2 class="atm-qz-title">Здесь нет правильных ответов.</h2><p class="atm-qz-note"><strong>Их никто не сохраняет и не оценивает - кроме тебя.</strong></p><p class="atm-qz-note">Просто будь честен с самим собой.</p><button class="atm-qz-action" type="button" data-atm-qz-start>Начать мини-тест</button></section><section data-atm-qz-questions hidden><div class="atm-qz-progress-row"><span data-atm-qz-counter></span><div class="atm-qz-progress"><span data-atm-qz-progress></span></div></div><h2 class="atm-qz-question" data-atm-qz-question></h2><div class="atm-qz-options" data-atm-qz-options></div><button class="atm-qz-back" type="button" data-atm-qz-back>Назад</button></section><section class="atm-qz-result" data-atm-qz-result hidden><p class="atm-qz-kicker">Мини-тест пройден</p><h2 class="atm-qz-title">Спасибо за честные ответы.</h2><p>Перейдите к форме заявки, чтобы продолжить.</p><a class="atm-qz-registration" href="#" data-atmospace-registration-link data-atmospace-state="loading" aria-disabled="true">Перейти к форме заявки</a><p class="atm-qz-status" data-atm-qz-status></p></section></div></div>';
    document.body.appendChild(modal);
    var intro = modal.querySelector('[data-atm-qz-intro]');
    var questionView = modal.querySelector('[data-atm-qz-questions]');
    var resultView = modal.querySelector('[data-atm-qz-result]');
    var counter = modal.querySelector('[data-atm-qz-counter]');
    var progress = modal.querySelector('[data-atm-qz-progress]');
    var questionNode = modal.querySelector('[data-atm-qz-question]');
    var optionsNode = modal.querySelector('[data-atm-qz-options]');
    var back = modal.querySelector('[data-atm-qz-back]');
    var index = 0;
    var answers = [];

    function renderQuestion() {
      var current = questions[index];
      if (!current) {
        questionView.hidden = true;
        resultView.hidden = false;
        if (!quizCompletedSent) {
          quizCompletedSent = true;
          reachGoal('quiz_completed');
        }
        setRegistrationButtonsState(registrationUrl ? 'ready' : 'error');
        var status = modal.querySelector('[data-atm-qz-status]');
        if (status) status.textContent = registrationUrl ? '' : (isLocalPreview() ? 'В локальном превью переход к форме отключён.' : RUNTIME_ERROR_MESSAGE);
        return;
      }
      counter.textContent = String(index + 1) + ' / ' + String(questions.length);
      progress.style.width = String(((index + 1) / questions.length) * 100) + '%';
      questionNode.textContent = current.title;
      back.disabled = index === 0;
      back.style.opacity = index === 0 ? '.45' : '1';
      optionsNode.replaceChildren();
      current.options.forEach(function (label, optionIndex) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'atm-qz-option';
        button.textContent = label;
        button.addEventListener('click', function () {
          answers[index] = optionIndex;
          if (!answeredGoalIndexes[index]) {
            answeredGoalIndexes[index] = true;
            reachGoal('quiz_question_' + String(index + 1) + '_answered');
          }
          index += 1;
          renderQuestion();
        });
        optionsNode.appendChild(button);
      });
    }

    function closeModal() {
      modal.hidden = true;
      document.documentElement.style.overflow = '';
    }

    modal.querySelector('[data-atm-qz-close]').addEventListener('click', closeModal);
    modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
    modal.querySelector('[data-atm-qz-start]').addEventListener('click', function () {
      intro.hidden = true;
      questionView.hidden = false;
      index = 0;
      answers = [];
      renderQuestion();
    });
    back.addEventListener('click', function () {
      if (index <= 0) return;
      index -= 1;
      renderQuestion();
    });
    return modal;
  }

  function openMiniQuiz() {
    var modal = ensureMiniQuiz();
    setRegistrationButtonsState(registrationUrl ? 'ready' : 'loading');
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  }

  function initRuntime() {
    setQuizButtonsState('ready');
    ensureMiniQuiz();
    reachGoal('landing_view');
    if (!cfg.publicLandingKey || !cfg.counterId) {
      showRuntimeError();
      console.error('[Atmospace] publicLandingKey/counterId missing');
      return;
    }
    setRegistrationButtonsState(isLocalPreview() ? 'preview' : 'loading');
    if (isLocalPreview()) {
      setRuntimeMessage('');
      console.info('[Atmospace] Local preview: runtime API calls disabled.');
      return;
    }
    postJson(initEndpoint, buildBasePayload(), false).then(function (result) {
      var responseBody = result && result.body ? result.body : null;
      var data = responseBody && responseBody.ok && responseBody.data ? responseBody.data : null;
      var links = data && data.links ? data.links : null;
      if (!result || !result.ok || !links || !links.registration) {
        showRuntimeError();
        return;
      }
      if (!applyRegistrationLink(links)) return;
      sendLandingOpenedOnce();
    });
  }

  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('[data-atmospace-quiz-link]') : null;
    if (!button) return;
    event.preventDefault();
    sendEvent('quiz_start_click');
    reachGoal('quiz_start_click');
    openMiniQuiz();
  }, true);

  document.addEventListener('atmospace:quiz-start', function () {
    sendEvent('quiz_start_click');
    reachGoal('quiz_start_click');
  });
  document.addEventListener('atmospace:quiz-answer', function (event) {
    var questionNumber = Number(event && event.detail ? event.detail.questionNumber : 0);
    if (!questionNumber || answeredGoalIndexes[questionNumber - 1]) return;
    answeredGoalIndexes[questionNumber - 1] = true;
    reachGoal('quiz_question_' + String(questionNumber) + '_answered');
  });
  document.addEventListener('atmospace:quiz-complete', function () {
    if (quizCompletedSent) return;
    quizCompletedSent = true;
    reachGoal('quiz_completed');
  });
  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('[data-atmospace-registration-link]') : null;
    if (!button) return;
    if (!registrationUrl || button.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
      return;
    }
    if (registrationNavigationStarted) return;
    registrationNavigationStarted = true;
    event.preventDefault();
    var navigated = false;
    function navigate() {
      if (navigated) return;
      navigated = true;
      window.location.assign(registrationUrl);
    }
    window.setTimeout(navigate, 800);
    reachGoal('registration_started', navigate);
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRuntime);
  } else {
    initRuntime();
  }
})();
</script>`;
}

function buildAtmospacePrelandingTrackingScript() {
  return `<script>
(function () {
  'use strict';

  var cfg = window.ATMOSPACE_LANDING_CONFIG || {};
  var runtimeVersion = cfg.runtimeVersion || ${JSON.stringify(ATMOSPACE_GENERATED_RUNTIME_VERSION)};
  var initEndpoint = cfg.initEndpoint || ${JSON.stringify(ATMOSPACE_INIT_ENDPOINT)};
  var clickEndpoint = cfg.clickEndpoint || ${JSON.stringify(ATMOSPACE_CLICK_ENDPOINT)};
  var questions = ${safeInlineJson(ATMOSPACE_MINI_QUIZ)};
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICK_ID_KEYS = ['yclid', 'gclid', 'fbclid', 'msclkid', 'dclid'];
  var registrationUrl = '';
  var quizStartSent = false;
  var quizCompleted = false;
  var registrationNavigationStarted = false;
  var answeredGoalIndexes = {};
  var initInFlight = false;
  var initCompleted = false;
  var landingOpenedSent = false;
  var landingViewSent = false;
  var METRIKA_SCRIPT_URL = 'https://mc.yandex.ru/metrika/tag.js';
  var RUNTIME_ERROR_MESSAGE = 'Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.';

  function getParam(name) {
    try { return new URL(window.location.href).searchParams.get(name) || ''; }
    catch (error) { return ''; }
  }

  function makePageInstanceId() {
    try {
      var bytes = new Uint8Array(10);
      window.crypto.getRandomValues(bytes);
      return 'pi_' + Array.prototype.map.call(bytes, function (byte) {
        return byte.toString(16).padStart(2, '0');
      }).join('');
    } catch (error) {
      return 'pi_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    }
  }
  var pageInstanceId = makePageInstanceId();

  function isLocalPreview() {
    return window.location.protocol === 'file:'
      || window.location.hostname === 'localhost'
      || window.location.hostname === '127.0.0.1';
  }

  function collectAttribution() {
    var clickIds = {};
    CLICK_ID_KEYS.forEach(function (key) {
      var value = getParam(key);
      if (value) clickIds[key] = value;
    });
    var result = { advertising_click_ids: clickIds };
    UTM_KEYS.forEach(function (key) { result[key] = getParam(key) || null; });
    return result;
  }

  function buildBasePayload() {
    var attribution = collectAttribution();
    return {
      public_landing_key: cfg.publicLandingKey || '',
      counter_id: cfg.counterId || '',
      landing_variant_code: cfg.landingCode || '',
      landing_variant_name: cfg.landingName || '',
      page_instance_id: pageInstanceId,
      page_url: window.location.href,
      referrer: document.referrer || null,
      runtime_version: runtimeVersion,
      browser_language: navigator.language || null,
      browser_client_time: new Date().toISOString(),
      advertising_click_ids: attribution.advertising_click_ids,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term
    };
  }

  function postJson(url, payload, keepalive) {
    if (!url || typeof fetch !== 'function') return Promise.resolve(null);
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: Boolean(keepalive)
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (body) {
        return { ok: response.ok, body: body };
      });
    }).catch(function () { return null; });
  }

  function sendEvent(eventType) {
    if (eventType !== 'landing_opened' && eventType !== 'quiz_start_click') return;
    var payload = buildBasePayload();
    payload.event_type = eventType;
    payload.client_time = new Date().toISOString();
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(clickEndpoint, blob)) return;
      } catch (error) {
        // Fetch below is the non-blocking fallback.
      }
    }
    postJson(clickEndpoint, payload, true);
  }

  var metrikaCounterId = (function () {
    var value = Number.parseInt(String(cfg.counterId || ''), 10);
    return Number.isInteger(value) && value > 0 ? value : null;
  })();
  var pendingMetrikaGoals = [];
  var metrikaReadyPromise = null;

  function flushPendingMetrikaGoals() {
    if (!metrikaCounterId || typeof window.ym !== 'function') return false;
    while (pendingMetrikaGoals.length) {
      var item = pendingMetrikaGoals.shift();
      try { window.ym(metrikaCounterId, 'reachGoal', item.goalName, item.params || {}, item.done); }
      catch (error) { item.done(); }
    }
    return true;
  }

  function ensureMetrikaReady() {
    if (!metrikaCounterId || isLocalPreview()) return Promise.resolve(false);
    if (metrikaReadyPromise) return metrikaReadyPromise;

    metrikaReadyPromise = new Promise(function (resolve) {
      window.ym = window.ym || function () {
        (window.ym.a = window.ym.a || []).push(arguments);
      };
      window.ym.l = window.ym.l || 1 * new Date();
      window.__atmospaceMetrikaInited = window.__atmospaceMetrikaInited || {};
      if (!window.__atmospaceMetrikaInited[metrikaCounterId]) {
        window.__atmospaceMetrikaInited[metrikaCounterId] = true;
        window.ym(metrikaCounterId, 'init', {
          clickmap: true,
          trackLinks: true,
          accurateTrackBounce: true,
          webvisor: true
        });
      }

      var existing = document.querySelector('script[src="' + METRIKA_SCRIPT_URL + '"]');
      if (existing) {
        if (existing.getAttribute('data-atmospace-loaded') === 'true') {
          resolve(true);
          return;
        }
        existing.addEventListener('load', function () { resolve(true); }, { once: true });
        existing.addEventListener('error', function () { resolve(false); }, { once: true });
        window.setTimeout(function () { resolve(typeof window.ym === 'function'); }, 2500);
        return;
      }

      var script = document.createElement('script');
      script.async = true;
      script.src = METRIKA_SCRIPT_URL;
      script.setAttribute('data-atmospace-metrika', '');
      script.addEventListener('load', function () {
        script.setAttribute('data-atmospace-loaded', 'true');
        resolve(true);
      }, { once: true });
      script.addEventListener('error', function () { resolve(false); }, { once: true });
      document.head.appendChild(script);
    }).then(function (ready) {
      flushPendingMetrikaGoals();
      return ready;
    });

    return metrikaReadyPromise;
  }

  function reachGoal(goalName, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = {};
    }
    var called = false;
    function done() {
      if (called) return;
      called = true;
      if (typeof callback === 'function') callback();
    }
    if (!metrikaCounterId || isLocalPreview()) {
      done();
      return;
    }
    pendingMetrikaGoals.push({ goalName: goalName, params: params || {}, done: done });
    ensureMetrikaReady();
    window.setTimeout(done, 1200);
  }

  function getQuizLinks() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-atmospace-quiz-link]'));
  }

  function getRegistrationLinks() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-atmospace-registration-link]'));
  }

  function setRegistrationState(state) {
    getRegistrationLinks().forEach(function (link) {
      link.setAttribute('data-atmospace-state', state);
      if (state === 'ready' && registrationUrl) {
        link.setAttribute('href', registrationUrl);
        link.removeAttribute('aria-disabled');
      } else {
        link.setAttribute('href', '#');
        link.setAttribute('aria-disabled', 'true');
      }
    });
  }

  function runtimeMessageNode() {
    var node = document.querySelector('[data-atmospace-runtime-message]');
    if (node) return node;
    var firstLink = getRegistrationLinks()[0] || getQuizLinks()[0];
    if (!firstLink) return null;
    node = document.createElement('p');
    node.setAttribute('data-atmospace-runtime-message', '');
    node.hidden = true;
    node.style.cssText = 'display:none;margin:12px 0 0;color:#b91c1c;font-size:14px;line-height:1.45;font-weight:800;text-align:center;';
    firstLink.insertAdjacentElement('afterend', node);
    return node;
  }

  function setRuntimeMessage(message) {
    var node = runtimeMessageNode();
    if (!node) return;
    node.textContent = message || '';
    node.hidden = !message;
    node.style.display = message ? 'block' : 'none';
  }

  function runtimeRetryButton() {
    var existing = document.querySelector('[data-atmospace-runtime-retry]');
    if (existing) return existing;
    var message = runtimeMessageNode();
    if (!message) return null;
    var button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-atmospace-runtime-retry', '');
    button.hidden = true;
    button.textContent = 'Попробовать ещё раз';
    button.style.cssText = 'display:none;min-height:46px;margin:12px auto 0;padding:10px 18px;border:0;border-radius:8px;background:#2563eb;color:#fff;font:inherit;font-weight:900;cursor:pointer;';
    message.insertAdjacentElement('afterend', button);
    button.addEventListener('click', function () { requestRegistration(); });
    return button;
  }

  function setRetryVisible(isVisible) {
    var button = runtimeRetryButton();
    if (!button) return;
    button.hidden = !isVisible;
    button.style.display = isVisible ? 'block' : 'none';
  }

  function isTrustedRegistrationUrl(value) {
    try {
      var url = new URL(String(value || ''));
      return url.protocol === 'https:'
        && (url.hostname === 'atmospace.pro' || url.hostname.endsWith('.atmospace.pro'));
    } catch (error) {
      return false;
    }
  }

  function applyRegistrationLink(links) {
    var candidate = links && links.registration;
    if (typeof candidate !== 'string') return false;
    if (!isTrustedRegistrationUrl(candidate)) return false;
    registrationUrl = candidate;
    setRegistrationState('ready');
    setRuntimeMessage('');
    document.dispatchEvent(new CustomEvent('atmospace:registration-ready', {
      detail: { registrationUrl: registrationUrl }
    }));
    return true;
  }

  function markQuizStarted() {
    if (quizStartSent) return;
    quizStartSent = true;
    sendEvent('quiz_start_click');
    reachGoal('quiz_start_click');
  }

  function markQuestionAnswered(index) {
    if (answeredGoalIndexes[index]) return;
    answeredGoalIndexes[index] = true;
    reachGoal('question_answered', { questionNumber: index + 1 });
  }

  function markQuizCompleted() {
    if (quizCompleted) return;
    quizCompleted = true;
    reachGoal('quiz_completed');
  }

  document.addEventListener('atmospace:quiz-start', markQuizStarted);
  document.addEventListener('atmospace:quiz-answer', function (event) {
    var questionNumber = Number(event && event.detail ? event.detail.questionNumber : 0);
    if (questionNumber > 0) markQuestionAnswered(questionNumber - 1);
  });
  document.addEventListener('atmospace:quiz-complete', function () {
    markQuizCompleted();
    revealOffer();
  });

  function revealOffer() {
    Array.prototype.slice.call(document.querySelectorAll('[data-atmospace-offer], [data-atmospace-registration-section]')).forEach(function (node) {
      node.hidden = false;
    });
  }

  function setupInlineQuiz(root) {
    var panels = Array.prototype.slice.call(root.querySelectorAll('[data-atmospace-question]'));
    var counter = root.querySelector('[data-atmospace-quiz-counter]');
    var progress = root.querySelector('[data-atmospace-quiz-progress]');
    var result = root.querySelector('[data-atmospace-inline-result]');
    var index = 0;

    function showQuestion(nextIndex) {
      index = Math.max(0, Math.min(nextIndex, panels.length - 1));
      panels.forEach(function (panel, panelIndex) { panel.hidden = panelIndex !== index; });
      if (counter) counter.textContent = String(index + 1) + ' / ' + String(panels.length);
      if (progress) progress.style.width = String(((index + 1) / panels.length) * 100) + '%';
      root.setAttribute('data-atmospace-quiz-active', 'true');
    }

    root.addEventListener('click', function (event) {
      var option = event.target && event.target.closest ? event.target.closest('[data-atmospace-option]') : null;
      if (!option || !root.contains(option)) return;
      event.preventDefault();
      markQuestionAnswered(index);
      if (index + 1 < panels.length) {
        showQuestion(index + 1);
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      panels.forEach(function (panel) { panel.hidden = true; });
      if (result) result.hidden = false;
      if (counter) counter.textContent = String(panels.length) + ' / ' + String(panels.length);
      if (progress) progress.style.width = '100%';
      markQuizCompleted();
      revealOffer();
    });

    root.addEventListener('click', function (event) {
      var back = event.target && event.target.closest ? event.target.closest('[data-atmospace-quiz-back]') : null;
      if (!back || !root.contains(back)) return;
      event.preventDefault();
      if (index > 0) showQuestion(index - 1);
    });

    root.__atmospaceStart = function () {
      if (result) result.hidden = true;
      showQuestion(0);
    };
  }

  function ensureFallbackQuiz() {
    var existing = document.querySelector('[data-atmospace-fallback-quiz]');
    if (existing) return existing;
    var modal = document.createElement('div');
    modal.setAttribute('data-atmospace-fallback-quiz', '');
    modal.hidden = true;
    modal.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(4,10,20,.86);font-family:Manrope,Inter,system-ui,sans-serif;color:#fff';
    modal.innerHTML = '<div style="position:relative;width:min(780px,100%);max-height:calc(100svh - 36px);overflow:auto;padding:clamp(24px,5vw,48px);border:1px solid rgba(148,163,184,.24);border-radius:8px;background:#0b1424"><button type="button" data-atmospace-fallback-close aria-label="Закрыть" style="position:absolute;top:12px;right:12px;width:42px;height:42px;border:1px solid #334155;border-radius:50%;background:#111e32;color:#fff;font-size:24px;cursor:pointer">×</button><p style="margin:0 50px 10px 0;color:#67e8f9;font-size:12px;font-weight:900;text-transform:uppercase">Мини-тест</p><p data-atmospace-fallback-counter style="color:#94a3b8;font-weight:800"></p><h2 data-atmospace-fallback-title style="margin:18px 0;font-size:clamp(26px,5vw,42px);line-height:1.14"></h2><div data-atmospace-fallback-options style="display:grid;gap:10px"></div><div data-atmospace-fallback-result hidden><h2 style="font-size:clamp(30px,5vw,48px)">Спасибо за честные ответы.</h2><p style="color:#cbd5e1;font-size:18px;line-height:1.55">Откройте настоящую форму регистрации и продолжите на защищённой странице Атмосферы.</p><a href="#" data-atmospace-registration-link data-atmospace-state="loading" aria-disabled="true" style="display:flex;align-items:center;justify-content:center;min-height:62px;margin-top:24px;padding:14px 22px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none;font-weight:900">Перейти к регистрации</a></div></div>';
    document.body.appendChild(modal);
    var title = modal.querySelector('[data-atmospace-fallback-title]');
    var counter = modal.querySelector('[data-atmospace-fallback-counter]');
    var options = modal.querySelector('[data-atmospace-fallback-options]');
    var result = modal.querySelector('[data-atmospace-fallback-result]');
    var index = 0;
    function renderQuestion() {
      var current = questions[index];
      if (!current) {
        title.hidden = true;
        counter.hidden = true;
        options.hidden = true;
        result.hidden = false;
        markQuizCompleted();
        setRegistrationState(registrationUrl ? 'ready' : 'error');
        return;
      }
      title.hidden = false;
      counter.hidden = false;
      options.hidden = false;
      result.hidden = true;
      counter.textContent = String(index + 1) + ' / ' + String(questions.length);
      title.textContent = current.title;
      options.replaceChildren();
      current.options.forEach(function (label) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.style.cssText = 'min-height:64px;padding:15px;border:1px solid #334155;border-radius:8px;background:#111e32;color:#fff;text-align:left;font:inherit;font-weight:750;cursor:pointer';
        button.addEventListener('click', function () {
          markQuestionAnswered(index);
          index += 1;
          renderQuestion();
        });
        options.appendChild(button);
      });
    }
    modal.__atmospaceOpen = function () {
      index = 0;
      modal.hidden = false;
      modal.style.display = 'grid';
      document.documentElement.style.overflow = 'hidden';
      renderQuestion();
    };
    modal.querySelector('[data-atmospace-fallback-close]').addEventListener('click', function () {
      modal.hidden = true;
      modal.style.display = 'none';
      document.documentElement.style.overflow = '';
    });
    return modal;
  }

  function startQuiz() {
    markQuizStarted();
    var inlineQuiz = document.querySelector('[data-atmospace-inline-quiz]');
    if (inlineQuiz) {
      if (typeof inlineQuiz.__atmospaceStart === 'function') inlineQuiz.__atmospaceStart();
      inlineQuiz.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var fallback = ensureFallbackQuiz();
    if (fallback && typeof fallback.__atmospaceOpen === 'function') fallback.__atmospaceOpen();
  }

  document.addEventListener('click', function (event) {
    var quizLink = event.target && event.target.closest ? event.target.closest('[data-atmospace-quiz-link]') : null;
    if (quizLink) {
      event.preventDefault();
      startQuiz();
      return;
    }
    var scrollLink = event.target && event.target.closest ? event.target.closest('[data-atmospace-registration-scroll]') : null;
    if (scrollLink) {
      event.preventDefault();
      var target = document.querySelector('[data-atmospace-registration-section]');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var offerLink = event.target && event.target.closest ? event.target.closest('[data-atmospace-offer-scroll]') : null;
    if (offerLink) {
      event.preventDefault();
      var offer = document.querySelector('[data-atmospace-offer]');
      if (offer) offer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var registrationLink = event.target && event.target.closest ? event.target.closest('[data-atmospace-registration-link]') : null;
    if (!registrationLink) return;
    event.preventDefault();
    if (!registrationUrl || registrationNavigationStarted) {
      setRuntimeMessage(registrationUrl ? '' : RUNTIME_ERROR_MESSAGE);
      return;
    }
    registrationNavigationStarted = true;
    reachGoal('registration_started');
    window.setTimeout(function () {
      window.location.assign(registrationUrl);
    }, 180);
  }, true);

  function sendLandingOpenedOnce() {
    if (landingOpenedSent) return;
    landingOpenedSent = true;
    sendEvent('landing_opened');
  }

  function requestRegistration() {
    if (initInFlight || initCompleted) return Promise.resolve();
    if (isLocalPreview()) {
      setRetryVisible(false);
      setRuntimeMessage('После публикации страница автоматически подготовит безопасный переход к регистрации.');
      return Promise.resolve();
    }
    if (!cfg.publicLandingKey || !cfg.counterId) {
      setRegistrationState('error');
      setRetryVisible(false);
      setRuntimeMessage(RUNTIME_ERROR_MESSAGE);
      return Promise.resolve();
    }

    initInFlight = true;
    setRegistrationState('loading');
    setRuntimeMessage('');
    setRetryVisible(false);
    sendLandingOpenedOnce();

    return postJson(initEndpoint, buildBasePayload(), false).then(function (result) {
      var responseBody = result && result.body ? result.body : null;
      var data = responseBody && responseBody.ok && responseBody.data ? responseBody.data : null;
      var links = data && data.links ? data.links : null;
      if (!result || !result.ok || !applyRegistrationLink(links)) throw new Error('landing_not_ready');
      initCompleted = true;
      initInFlight = false;
      setRetryVisible(false);
    }).catch(function () {
      initInFlight = false;
      setRegistrationState('error');
      setRuntimeMessage(RUNTIME_ERROR_MESSAGE);
      setRetryVisible(true);
    });
  }

  function initRuntime() {
    getQuizLinks().forEach(function (link) {
      link.setAttribute('href', '#atmospace-mini-quiz');
      link.setAttribute('data-atmospace-state', 'ready');
      link.removeAttribute('aria-disabled');
    });
    setRegistrationState('loading');
    var inlineQuiz = document.querySelector('[data-atmospace-inline-quiz]');
    if (inlineQuiz) setupInlineQuiz(inlineQuiz);
    ensureMetrikaReady();
    if (!landingViewSent) {
      landingViewSent = true;
      reachGoal('landing_view');
    }
    requestRegistration();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initRuntime);
  else initRuntime();
})();
</script>`;
}

function stripHtml(text) {
  return String(text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function hashText(value = '') {
  return Array.from(String(value)).reduce((hash, char) => {
    hash ^= char.charCodeAt(0);
    return Math.imul(hash, 16777619);
  }, 2166136261) >>> 0;
}

function pickHashed(value, options) {
  if (!options?.length) return undefined;
  return options[Math.abs(hashText(value)) % options.length] || options[0];
}

function cleanVariantToken(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'variant';
}

function prelandingModeTitle(mode = '') {
  if (mode === 'heroBlocks') return 'Формат 2 / Hero-картинка + блоки';
  if (mode === 'natureEditorial') return 'Формат 3 / Nature editorial';
  if (mode === 'minimalCompare') return 'Формат 4 / Тихое сравнение';
  if (mode === 'directionQuiz') return 'Формат 5 / Маршрут действия';
  if (mode === 'barrierProfileQuiz') return 'Формат 6 / Профиль барьера';
  if (mode === 'personalRouteQuiz') return 'Сохранённый формат / Личный маршрут без квиза';
  return 'Формат 1 / Мини-тест + разбор';
}

function makePrelandingVariantMeta({ projectData = {}, mode = '', templateId = 1, style = '', palette = '', title = '', text = '', routeId = '' } = {}) {
  const clientId = cleanVariantToken(projectData.clientCode || 'client_unknown');
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('');
  const random = Math.random().toString(36).slice(2, 8);
  const modeToken = cleanVariantToken(mode || 'individual');
  const routeToken = cleanVariantToken(routeId || style || palette || `tpl_${templateId}`);
  const hash = hashText(`${title}|${text}|${templateId}|${style}|${palette}|${stamp}|${random}`).toString(36).slice(0, 5);
  return {
    landingVariant: `${clientId}__${modeToken}__${routeToken}__${stamp}_${hash}_${random}`,
    landingName: `${prelandingModeTitle(mode)} / шаблон ${templateId} / ${routeId || style || palette || 'design'}`,
    generatorBuild: ATMOSPACE_GENERATED_RUNTIME_VERSION
  };
}

const PRELANDING_FALLBACK_IMAGES = [];

function pickStaticPrelandingFallback(seed, offset = 0) {
  if (!PRELANDING_FALLBACK_IMAGES.length) return '';
  const index = (hashText(seed) + offset) % PRELANDING_FALLBACK_IMAGES.length;
  return PRELANDING_FALLBACK_IMAGES[index] || PRELANDING_FALLBACK_IMAGES[0];
}

function normalizeImageUrl(value) {
  const raw = String(value || '')
    .trim()
    .replace(/^["'«]+|["'»]+$/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, '');

  if (!raw) return '';
  if (raw.startsWith('data:image/')) return raw;
  if (!/^https?:\/\//i.test(raw)) return raw;

  try {
    return encodeURI(raw).replace(/%25([0-9A-F]{2})/gi, '%$1');
  } catch {
    return raw;
  }
}

function bothelpImageSrc(value) {
  const normalized = normalizeImageUrl(value);
  if (!normalized || normalized.startsWith('data:image/')) return normalized;
  if (!/^https?:\/\//i.test(normalized)) return normalized;
  try {
    const parsed = new URL(normalized);
    if (/\/api\/image-proxy/i.test(parsed.pathname)) {
      const inner = normalizeImageUrl(parsed.searchParams.get('url') || '');
      if (/\/api\/published-image/i.test(inner)) return inner;
    }
  } catch {
    // Keep the normalized value below.
  }
  if (/\/api\/image-proxy/i.test(normalized)) return normalized;
  if (/\/api\/published-image/i.test(normalized)) return normalized;
  if (/storage\d*\.bothelp\.io/i.test(normalized) || /\.(png|jpe?g|webp|gif|avif)(?:[?#].*)?$/i.test(normalized)) return normalized;
  return `https://constructoratmosfera.com/api/image-proxy?url=${encodeURIComponent(normalized)}&v=${Date.now()}`;
}

function isProbablyImageUrl(value) {
  const normalized = normalizeImageUrl(value);
  if (!normalized) return false;
  if (normalized.startsWith('data:image/')) return normalized.length < 6000000;
  if (!/^https?:\/\//i.test(normalized)) return false;
  return true;
}

function pickPrelandingImageUrl(...values) {
  for (const value of values) {
    const normalized = normalizeImageUrl(value);
    if (isProbablyImageUrl(normalized)) return normalized;
  }
  return '';
}

function comparableImageUrl(value) {
  const normalized = normalizeImageUrl(value);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized);
    if (/\/api\/image-proxy/i.test(parsed.pathname)) {
      return comparableImageUrl(parsed.searchParams.get('url') || '');
    }
    parsed.hash = '';
    if (/images\.unsplash\.com/i.test(parsed.hostname)) {
      parsed.search = '';
    }
    return parsed.toString().toLowerCase();
  } catch {
    return normalized.toLowerCase();
  }
}

function pickDistinctPrelandingImage(seed, offsets = [0], used = new Set(), ...values) {
  for (const value of values) {
    const picked = pickPrelandingImageUrl(value);
    const key = comparableImageUrl(picked);
    if (picked && key && !used.has(key)) {
      used.add(key);
      return picked;
    }
  }
  const safeOffsets = offsets.length ? offsets : [0];
  for (const offset of safeOffsets) {
    const picked = pickStaticPrelandingFallback(seed, offset);
    const key = comparableImageUrl(picked);
    if (picked && key && !used.has(key)) {
      used.add(key);
      return picked;
    }
  }
  const fallback = pickStaticPrelandingFallback(seed, safeOffsets[0] || 0);
  const key = comparableImageUrl(fallback);
  if (key) used.add(key);
  return fallback;
}

async function postJsonWithTimeout(url, body, options = {}) {
  const timeoutMs = options.timeoutMs || 0;
  const timeoutLabel = options.timeoutLabel || 'Сервис';
  const controller = timeoutMs ? new AbortController() : null;
  const timeoutId = timeoutMs
    ? window.setTimeout(() => controller.abort(), timeoutMs)
    : null;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller?.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${timeoutLabel} отвечает дольше обычного. Конструктор перезапустит попытку.`, { cause: error });
    }
    throw error;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }

  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  let data = null;
  if (contentType.includes('application/json') && raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const rawFallback = raw.includes('<html') || raw.includes('<!DOCTYPE')
      ? 'Сервис вернул HTML-ошибку Cloudflare. Попробуйте повторить генерацию.'
      : raw.slice(0, 300);
    const friendly = url === ATMOSPACE_GENERATE_ENDPOINT
      ? getAtmospaceGenerateErrorMessage(data?.error, response.status, data?.message || rawFallback)
      : data?.message || data?.error || rawFallback;
    const requestRef = String(data?.requestId || data?.request_id || '').trim();
    const error = new Error(requestRef ? `${friendly} Номер проверки: ${requestRef}.` : friendly);
    error.code = String(data?.error || 'request_failed');
    error.status = response.status;
    error.requestId = requestRef;
    throw error;
  }
  if (data) return data;
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error('Сервис вернул не JSON. Попробуйте повторить действие.');
  }
}

function normalizeAtmospaceGenerateResult(response = {}, fallback = {}) {
  const data = response?.data && typeof response.data === 'object' ? response.data : response;
  const publicLandingKey = String(data?.publicLandingKey || data?.public_landing_key || '').trim();
  if (!publicLandingKey) {
    throw new Error('Сервер Atmospace не вернул publicLandingKey. Генерация остановлена.');
  }
  const landingName = String(data?.landingName || data?.landing_name || fallback.landingName || '').trim();
  const landingCode = String(fallback.landingCode || '').trim();
  const counterId = String(data?.counterId || data?.counter_id || fallback.counterId || '').trim();
  const inputKey = buildAtmospaceRuntimeInputKey({ landingName, landingCode, counterId });

  return {
    artifactId: `${publicLandingKey}:${Date.now()}`,
    inputKey,
    landingName,
    landingCode,
    counterId,
    publicLandingKey,
    embedCode: String(data?.embedCode || data?.embed_code || ''),
    status: String(data?.status || 'generated'),
    runtimeStatus: String(data?.status || 'generated'),
    generatedAt: new Date().toISOString()
  };
}

function isRetryablePrelandingImageIssue(message = '') {
  const text = String(message || '').toLowerCase();
  return !text
    || text.includes('429')
    || text.includes('1015')
    || text.includes('503')
    || text.includes('504')
    || text.includes('rate')
    || text.includes('tempor')
    || text.includes('timeout')
    || text.includes('gateway')
    || text.includes('service unavailable')
    || text.includes('network')
    || text.includes('abort')
    || text.includes('failed to fetch')
    || text.includes('no image')
    || text.includes('не успел')
    || text.includes('дольше обычного')
    || text.includes('перезапуст')
    || text.includes('отдать картинку')
    || text.includes('не вернул')
    || text.includes('не загруз')
    || text.includes('не открывается')
    || text.includes('временно');
}

const PRELANDING_IMAGE_ATTEMPTS = 3;
const PRELANDING_IMAGE_TIMEOUT_MS = 300000;
const PRELANDING_IMAGE_RETRY_DELAY_MS = 5000;
const PRELANDING_PUBLISH_TIMEOUT_MS = 90000;
const PRELANDING_IMAGE_LOAD_TIMEOUT_MS = 18000;

function waitForImageLoad(src, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    if (!src || typeof Image === 'undefined') {
      resolve();
      return;
    }
    const img = new Image();
    let done = false;
    const finish = (error) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = window.setTimeout(() => finish(new Error('Опубликованная AI-картинка не загрузилась за контрольное время.')), timeoutMs);
    img.onload = () => finish();
    img.onerror = () => finish(new Error('Опубликованная AI-картинка не открывается. Генерация остановлена, чтобы не выдать пустой блок.'));
    img.src = src;
  });
}

async function generatePrelandingImage(spec, options = {}) {
  const maxAttempts = options.maxAttempts || PRELANDING_IMAGE_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs || PRELANDING_IMAGE_RETRY_DELAY_MS;
  const onAttempt = typeof options.onAttempt === 'function' ? options.onAttempt : null;
  let lastError = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      onAttempt?.({ spec, attempt, maxAttempts, phase: 'generate' });
      const data = await postJsonWithTimeout('/api/generate-image', {
        visualPrompt: spec.visualPrompt,
        headline: spec.headline || '',
        methodName: spec.methodName || '',
        fullBanner: false,
        stylePreset: spec.stylePreset || 'whiteGoldPremium',
        persona: spec.persona || 'mixed',
        visualMode: spec.visualMode || 'generatedPerson',
        imagePurpose: 'prelandingHero',
        imageSize: spec.imageSize || '1536x1024',
        imageQuality: spec.imageQuality || 'high',
        variationKey: spec.variationKey || ''
      }, {
        timeoutMs: options.timeoutMs || PRELANDING_IMAGE_TIMEOUT_MS,
        timeoutLabel: 'OpenAI'
      });

      if (!data?.image) {
        const warning = data?.warning || 'AI не вернул картинку.';
        if (attempt < maxAttempts && isRetryablePrelandingImageIssue(warning)) {
          lastError = warning;
          onAttempt?.({ spec, attempt, maxAttempts, phase: 'retry', error: warning });
          await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));
          continue;
        }
        throw new Error(warning);
      }

      const published = await postJsonWithTimeout('/api/publish-image', {
        imageDataUrl: data.image
      }, {
        timeoutMs: options.publishTimeoutMs || PRELANDING_PUBLISH_TIMEOUT_MS,
        timeoutLabel: 'Публикация картинки'
      });

      if (!published?.imageUrl) {
        throw new Error('Сервис не вернул ссылку на AI-картинку для Tilda.');
      }

      await waitForImageLoad(published.imageUrl, options.imageLoadTimeoutMs || PRELANDING_IMAGE_LOAD_TIMEOUT_MS);

      return published.imageUrl;
    } catch (error) {
      lastError = String(error?.message || error);
      if (attempt >= maxAttempts || !isRetryablePrelandingImageIssue(lastError)) {
        throw new Error(lastError, { cause: error });
      }
      onAttempt?.({ spec, attempt, maxAttempts, phase: 'retry', error: lastError });
      await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));
    }
  }
  throw new Error(lastError || 'OpenAI долго не возвращает AI-картинку. Запустите генерацию ещё раз, конструктор продолжит дожимать кадры.');
}

function prelandingImageStylePreset(style, palette) {
  const key = `${style || ''} ${palette || ''}`.toLowerCase();
  if (key.includes('gold') || key.includes('premium') || key.includes('white')) return 'whiteGoldPremium';
  if (key.includes('green') || key.includes('mint')) return 'greenSystem';
  if (key.includes('red') || key.includes('coral')) return 'redWhite';
  if (key.includes('clean') || key.includes('adtech') || key.includes('saas') || key.includes('blue')) return 'blueTrust';
  if (key.includes('story') || key.includes('documentary')) return 'editorialGold';
  return 'whiteGoldPremium';
}

const PRELANDING_DESIGN_ROTATION_KEY = 'constructorPrelandingDesignRotationIndexV2';
const PRELANDING_VISUAL_ROTATION_KEY = 'constructorPrelandingVisualRotationIndexV2';
const PRELANDING_VISUAL_MEMORY_KEY = 'constructorPrelandingVisualMemoryV2';

const HERO_BLOCKS_DESIGN_ROUTES = [
  { id: 'hero-air-blue', label: 'Светлый синий hero', style: 'premium-light', palette: 'blue-trust', layout: 'split', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'blueTrust', visualMood: 'clean bright blue trust, white cards, clear CTA, not dark' },
  { id: 'hero-white-gold', label: 'Бело-золотой премиум', style: 'banner-white-gold', palette: 'white-gold-ad', layout: 'cards', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'whiteGoldPremium', visualMood: 'warm premium white and gold, editorial lifestyle, expensive but not luxury cliche' },
  { id: 'hero-mint-system', label: 'Мятная система', style: 'client-story', palette: 'mint-fresh', layout: 'classic', typo: 'inter', effects: ['fadein'], imageStylePreset: 'greenSystem', visualMood: 'fresh mint-green clarity, system and route feeling, calm confident first screen' },
  { id: 'hero-coral-action', label: 'Синий и коралл', style: 'clean-ads', palette: 'trust-coral', layout: 'split', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'redWhite', visualMood: 'white background with coral energy accents, short punchy offer blocks, strong ad-like CTA' }
];

const NATURE_EDITORIAL_DESIGN_ROUTES = [
  { id: 'nature-sage-paper', label: 'Nature sage paper', style: 'nature-sage-paper', palette: 'white-gold-ad', layout: 'split', typo: 'playfair', effects: ['fadein', 'micro'], imageStylePreset: 'whiteGoldPremium', visualMood: 'warm paper editorial, sage olive accents, soft premium nature-inspired composition, airy magazine landing' },
  { id: 'nature-terra-focus', label: 'Nature terra focus', style: 'nature-terra-focus', palette: 'trust-coral', layout: 'classic', typo: 'playfair', effects: ['fadein'], imageStylePreset: 'editorialGold', visualMood: 'beige and terracotta editorial story, human warmth, calm focused premium prelanding' },
  { id: 'nature-forest-trust', label: 'Nature forest trust', style: 'nature-forest-trust', palette: 'green-money', layout: 'cards', typo: 'playfair', effects: ['fadein', 'micro'], imageStylePreset: 'greenSystem', visualMood: 'olive forest trust, natural daylight, paper cards, practical route and first step, no dark colors' }
];

const MINIMAL_COMPARE_DESIGN_ROUTES = [
  { id: 'minimal-noir-signal', label: 'Noir signal', style: 'minimal-noir', palette: 'black-yellow-ad', layout: 'minimal', typo: 'inter', effects: ['fadein'], visualMood: 'dark premium text-first quiet comparison landing, no photo, minimal lines and high contrast' },
  { id: 'minimal-graphite-white', label: 'Graphite white', style: 'minimal-graphite', palette: 'clean-product', layout: 'minimal', typo: 'inter', effects: ['fadein'], visualMood: 'graphite and white strict minimal landing, calm comparison, lots of negative space, no photo' },
  { id: 'minimal-blue-quiet', label: 'Blue quiet', style: 'minimal-blue', palette: 'deep-blue-ad', layout: 'minimal', typo: 'inter', effects: ['fadein'], visualMood: 'dark blue quiet premium landing, internal comparison and first step, no photo' }
];

const CORE_METHOD_DESIGN_ROUTES = [
  { id: 'core-orange-break', label: 'Жёсткий разрыв', coreDesignClass: 'fh-theme-ember', themeStyle: 'heroBright', palette: 'red-energy', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'redWhite', visualMood: 'bright warm orange-red accent, clean white cards, feeling of breaking old course habits' },
  { id: 'core-blue-proof', label: 'Снятие возражений', coreDesignClass: 'fh-theme-sky', themeStyle: 'blueTrust', palette: 'blue-trust', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'blueTrust', visualMood: 'trusted blue, clean premium, calm proof and clear route' },
  { id: 'core-green-route', label: 'Доверие и ясность', coreDesignClass: 'fh-theme-lime', themeStyle: 'greenSystem', palette: 'green-money', typo: 'manrope', effects: ['fadein'], imageStylePreset: 'greenSystem', visualMood: 'green route/system clarity, safe entry, less pressure, more step-by-step logic' }
];

const DIRECTION_QUIZ_DESIGN_ROUTES = [
  { id: 'direction-quiz-navy', label: 'Ночной синий маршрут', style: 'direction-quiz-navy', palette: 'deep-blue-ad', layout: 'quiz', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'blueTrust', visualMood: 'deep navy editorial quiz, restrained blue signal, premium honest diagnostic' },
  { id: 'direction-quiz-gold', label: 'Тёмное золото', style: 'direction-quiz-gold', palette: 'black-yellow-ad', layout: 'quiz', typo: 'manrope', effects: ['fadein'], imageStylePreset: 'whiteGoldPremium', visualMood: 'dark premium route with warm gold signal, honest direction and calm confidence' },
  { id: 'direction-quiz-forest', label: 'Лесная ясность', style: 'direction-quiz-forest', palette: 'green-money', layout: 'quiz', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'greenSystem', visualMood: 'deep green editorial quiz, natural clarity and a realistic first step' }
];

const PERSONAL_ROUTE_QUIZ_DESIGN_ROUTES = [
  { id: 'personal-route-coral', label: 'Коралл и ночь', style: 'personal-route-coral', palette: 'trust-coral', layout: 'quiz', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'redWhite', visualMood: 'deep plum and coral personal route quiz, human warmth, restrained cinematic contrast' },
  { id: 'personal-route-amber', label: 'Янтарная точка', style: 'personal-route-amber', palette: 'white-gold-ad', layout: 'quiz', typo: 'manrope', effects: ['fadein'], imageStylePreset: 'whiteGoldPremium', visualMood: 'dark amber premium personal route quiz, warm light and honest self-reflection' },
  { id: 'personal-route-violet', label: 'Фиолетовый фокус', style: 'personal-route-violet', palette: 'deep-blue-ad', layout: 'quiz', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'blueTrust', visualMood: 'dark violet and blue diagnostic quiz, clear focus and modern premium mood' }
];

const BARRIER_PROFILE_QUIZ_DESIGN_ROUTES = [
  { id: 'barrier-profile-ember', label: 'Тёплый разрыв', style: 'barrier-profile-ember', palette: 'trust-coral', layout: 'quiz', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'redWhite', visualMood: 'deep graphite and restrained coral barrier profile quiz, honest self-observation, cinematic human tension without melodrama' },
  { id: 'barrier-profile-teal', label: 'Бирюзовая ясность', style: 'barrier-profile-teal', palette: 'green-money', layout: 'quiz', typo: 'manrope', effects: ['fadein'], imageStylePreset: 'greenSystem', visualMood: 'dark teal premium diagnostic, calm clarity, realistic pace and a concrete first step' },
  { id: 'barrier-profile-blue', label: 'Глубокий синий', style: 'barrier-profile-blue', palette: 'deep-blue-ad', layout: 'quiz', typo: 'manrope', effects: ['fadein', 'micro'], imageStylePreset: 'blueTrust', visualMood: 'deep navy barrier profile quiz, precise editorial contrast, focus and measured confidence' }
];

const PRELANDING_VISUAL_ROUTES = [
  {
    id: 'woman-terrace-coral',
    label: 'женщина на светлой террасе',
    personas: ['woman', 'man', 'mixed'],
    scenes: [
      'confident woman 38-46 in a coral or soft peach shirt, bright terrace or modern balcony workspace, plants and city light, natural smile, not the same brunette office portrait',
      'different adult man 35-48 planning at a wooden table with notebook and phone, warm daylight, cafe terrace depth, no readable screens',
      'mixed working scene with two adults discussing a simple route on paper in a bright room, hands and faces natural, no corporate stock pose'
    ],
    negative: 'avoid blue blouse by window, avoid close-up hands under chin, avoid identical brunette face, avoid sterile white wall'
  },
  {
    id: 'man-cafe-blue',
    label: 'мужчина в кафе',
    personas: ['man', 'woman', 'man'],
    scenes: [
      'confident man 36-50 in navy jacket and white t-shirt sitting in a bright modern cafe, phone on table, relaxed direct gaze, clean blue trust mood',
      'different woman 35-48 reviewing a simple checklist on paper near a large window, visible room depth, calm professional expression',
      'same general campaign mood but different male person with phone near cafe window, ready for next step, no logos'
    ],
    negative: 'avoid female portrait dominating every generation, avoid laptop-only empty office, avoid dark background'
  },
  {
    id: 'woman-short-hair-mint',
    label: 'короткая стрижка и мятный свет',
    personas: ['woman', 'mixed', 'woman'],
    scenes: [
      'woman 42-55 with short hair in a mint shirt, bright kitchen or home office, real daylight, laptop closed or aside, open space for text',
      'two adults looking at a simple route diagram on a table, mint-green details, practical calm atmosphere',
      'different woman using smartphone in a bright home workspace, friendly messenger feeling without logos, clear face but not a close-up'
    ],
    negative: 'avoid same long-haired model, avoid overexposed white background, avoid empty staged stock photo'
  },
  {
    id: 'standing-office-gold',
    label: 'премиальный светлый офис',
    personas: ['woman', 'man', 'woman'],
    scenes: [
      'confident woman 35-47 standing in a bright premium office or studio, beige/white blazer, warm gold accents, visible depth, not luxury cliche',
      'different man 40-52 near planning board with notebook, warm white-gold editorial light, no readable text',
      'woman 38-50 with phone at a clean desk, soft gold daylight, decision moment, calm smile'
    ],
    negative: 'avoid repeated sofa/window portrait, avoid washed-out face, avoid banking symbols or money'
  },
  {
    id: 'no-portrait-route',
    label: 'маршрут без портретного клише',
    personas: ['mixed', 'woman', 'man'],
    scenes: [
      'wide lifestyle scene with a person seen naturally in a bright coworking space, not a centered portrait, route/checklist objects in foreground, plenty of text space',
      'close editorial scene of notebook, phone, coffee and hands drawing a simple path, no readable words, warm daylight, human presence but no face focus',
      'adult person walking out of a bright cafe with phone in hand, sense of next step, airy city background'
    ],
    negative: 'avoid single centered smiling woman, avoid identical face, avoid generic stock business handshake'
  },
  {
    id: 'family-table-trust',
    label: 'домашняя доверительная сцена',
    personas: ['woman', 'man', 'mixed'],
    scenes: [
      'adult woman 40-52 at a bright dining table with phone and notebook, home comfort, honest trust mood, not glamorous',
      'adult man 38-50 in a cozy home office reviewing a short plan, plant and daylight, no dark screen',
      'mixed family-like but professional table scene, two adults reviewing a simple path, no children focus, no private data'
    ],
    negative: 'avoid corporate boardroom, avoid dark neon, avoid the same woman model'
  }
];

function readRotationIndex(key) {
  try {
    return Number(localStorage.getItem(key) || '0') || 0;
  } catch {
    return 0;
  }
}

function bumpRotationIndex(key, next) {
  try {
    localStorage.setItem(key, String(next));
  } catch {
    // Rotation still works for the current click through Math.random fallback.
  }
}

function nextFromRotation(key, items) {
  if (!items.length) return null;
  const index = readRotationIndex(key);
  bumpRotationIndex(key, index + 1);
  return items[index % items.length];
}

function nextPrelandingDesignRoute(mode) {
  const routes = mode === 'heroBlocks'
    ? HERO_BLOCKS_DESIGN_ROUTES
    : mode === 'natureEditorial'
      ? NATURE_EDITORIAL_DESIGN_ROUTES
      : mode === 'minimalCompare'
        ? MINIMAL_COMPARE_DESIGN_ROUTES
        : mode === 'directionQuiz'
          ? DIRECTION_QUIZ_DESIGN_ROUTES
          : mode === 'personalRouteQuiz'
            ? PERSONAL_ROUTE_QUIZ_DESIGN_ROUTES
            : mode === 'barrierProfileQuiz'
              ? BARRIER_PROFILE_QUIZ_DESIGN_ROUTES
            : CORE_METHOD_DESIGN_ROUTES;
  return nextFromRotation(PRELANDING_DESIGN_ROTATION_KEY, routes) || routes[0];
}

function readPrelandingVisualMemory() {
  try {
    const raw = localStorage.getItem(PRELANDING_VISUAL_MEMORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-8) : [];
  } catch {
    return [];
  }
}

function rememberPrelandingVisualRoute(route) {
  if (!route?.id) return;
  try {
    const memory = readPrelandingVisualMemory();
    const next = [...memory, {
      id: route.id,
      label: route.label,
      at: new Date().toISOString()
    }].slice(-8);
    localStorage.setItem(PRELANDING_VISUAL_MEMORY_KEY, JSON.stringify(next));
  } catch {
    // Visual memory is a nice-to-have; generation continues without storage.
  }
}

function nextPrelandingVisualRoute() {
  const route = nextFromRotation(PRELANDING_VISUAL_ROTATION_KEY, PRELANDING_VISUAL_ROUTES) || PRELANDING_VISUAL_ROUTES[0];
  rememberPrelandingVisualRoute(route);
  return route;
}

function buildPrelandingMemoryLine(memory = []) {
  if (!memory.length) return 'No previous visual memory yet; still make this generation visually unique.';
  const labels = memory.map(item => item.label || item.id).filter(Boolean).join(', ');
  return `Recent generated visual routes: ${labels}. Do not repeat their dominant person type, hair/clothes, place, pose, camera angle or color mood.`;
}

function buildPrelandingImageSpecs({ mode, templateId, style, palette, headline, text, projectData, designRoute, visualRoute, visualMemory }) {
  const content = PRELANDING_CONTENT[templateId] || PRELANDING_CONTENT[1];
  const title = stripHtml(headline || content.titleHtml || 'Откройте короткий разбор и первый понятный шаг');
  const subtitle = stripHtml(text || content.trustTitle || content.valueTitle || 'Короткий разбор показывает механику и следующий шаг без долгой подготовки');
  const landingLogic = resolveClientPrelandingLogic(title, subtitle, mode);
  const clientName = projectData?.clientDisplayName || projectData?.clientName || '';
  const route = visualRoute || PRELANDING_VISUAL_ROUTES[0];
  const memoryLine = buildPrelandingMemoryLine(visualMemory || readPrelandingVisualMemory());
  const semanticPersonas = landingLogic.bannerPersonas?.length
    ? landingLogic.bannerPersonas
    : route.personas || ['woman', 'man', 'mixed'];
  const semanticRotation = Math.abs(hashText(`${route.id || ''}|${designRoute?.id || ''}|${title}|${Date.now()}|${Math.random()}`));
  const rotateItems = (items, offset) => items.map((_, index) => items[(index + offset) % items.length]);
  const semanticSceneSets = Array.isArray(landingLogic.prelandingVisualSceneSets)
    ? landingLogic.prelandingVisualSceneSets.filter(set => Array.isArray(set) && set.length >= 3)
    : [];
  const selectedSceneSet = semanticSceneSets.length
    ? semanticSceneSets[semanticRotation % semanticSceneSets.length]
    : null;
  const semanticScenes = selectedSceneSet || (landingLogic.prelandingVisualScenes?.length
    ? landingLogic.prelandingVisualScenes
    : []);
  const fallbackRouteScenes = route.scenes || [];
  const routeScenes = semanticScenes.length
    ? semanticScenes.slice(0, 3)
    : rotateItems(fallbackRouteScenes, fallbackRouteScenes.length ? semanticRotation % fallbackRouteScenes.length : 0).slice(0, 3);
  const routePersonas = rotateItems(semanticPersonas, semanticPersonas.length ? semanticRotation % semanticPersonas.length : 0);
  const designMood = designRoute?.visualMood || 'clean premium light prelanding design';
  const modeDescription = mode === 'heroBlocks'
    ? 'client prelanding from headline and subtitle, bright hero scene with white blocks'
    : mode === 'natureEditorial'
      ? 'Nature editorial prelanding, warm paper/sage/olive visual language, magazine-like premium layout with collage and calm first step'
      : 'client prelanding, light premium product page';
  const baseContext = [
    `Landing headline: ${title}`,
    `Landing subtitle / meaning: ${subtitle}`,
    `Marketing semantic: ${landingLogic.semanticId || 'problem-route'}; angle: ${landingLogic.label}`,
    `Bot transition logic: ${landingLogic.actionSubtitle}`,
    `Core offer cards: ${landingLogic.cards.map(item => `${item.title}: ${item.text}`).join(' | ')}`,
    `Client context: ${clientName || 'generic client'}`,
    `Mode: ${modeDescription}`,
    `Design route: ${designRoute?.label || style || 'clean premium'}; palette: ${palette || 'soft bright'}; visual mood: ${designMood}`,
    `Current visual route: ${route.label || route.id || 'new route'}.`,
    memoryLine,
    'No text, no letters, no numbers, no logos, no UI screenshots, no bank cards, no money stacks.',
    `Landing rules: ${CLIENT_PRELANDING_RULES.join('; ')}.`,
    'Visual story must literally support the exact problem in the landing headline and subtitle. Do not replace a salary problem, family choice, overwork or broken appliance with a generic successful person walking in a city.',
    'Do not add any brand, internal product name, readable UI or unrelated mythology.',
    'Bright clean premium lifestyle photography for a modern Russian ad landing, not gloomy, not dark, not stock-like.',
    'The person must look alive and modern, age 32-50, visible face and natural emotion, not elderly, not tired, not overexposed.',
    'Avoid washed-out white backgrounds and blown highlights: keep readable skin tone, natural contrast, real room/cafe/city depth, vivid daylight, crisp focus.',
    'Keep the face and upper body comfortably framed, never cropped at the edge; leave safe negative space for text without making the whole image empty white.',
    'Every image must be a different scene, different camera angle, different background, different clothes and different composition.',
    'Three-image story contract: hero shows one concrete triggering event; value shows its consequence or changed choice in another location; CTA shows relief, direction and the next step after the problem.',
    'Across all three images never repeat the same person, room, focal object, problem object, pose, clothes, camera angle or narrative moment. A different person beside the same appliance still counts as repetition and is forbidden.',
    'Only the hero may feature the broken object. The value and CTA images must not contain that object, its room, a repair counter, repair tools or another version of the same breakdown.',
    route.negative ? `Negative visual repetition: ${route.negative}.` : ''
  ].join('\n');
  const imageStylePreset = designRoute?.imageStylePreset || prelandingImageStylePreset(style, palette);
  const variantSeed = `${mode}|${templateId}|${style}|${palette}|${title}|${subtitle}|${Date.now()}|${Math.random().toString(36).slice(2, 8)}`;
  if (mode === 'directionQuiz' || mode === 'personalRouteQuiz' || mode === 'barrierProfileQuiz') {
    const routeLabel = mode === 'directionQuiz'
      ? 'static direction and first-step landing'
      : mode === 'personalRouteQuiz'
        ? 'static personal route landing'
        : 'static barrier profile landing about a repeating failure pattern and a realistic first step';
    const semanticScene = routeScenes[0]
      || 'one meaningful editorial scene or visual metaphor that directly expresses the headline, with a real person only when the story needs one';
    const routeContext = [
      `Landing headline: ${title}`,
      `Landing subtitle / meaning: ${subtitle}`,
      `Landing format: ${routeLabel}`,
      `Marketing semantic: ${landingLogic.semanticId || 'problem-route'}; angle: ${landingLogic.label}`,
      `Client context: ${clientName || 'generic client'}`,
      `Design route: ${designRoute?.label || style || 'premium insight'}; palette: ${palette || 'deep restrained'}; visual mood: ${designMood}`,
      memoryLine,
      `Semantic scene: ${semanticScene}`,
      'Create one premium cinematic editorial hero photo that literally supports the headline and the promised first step.',
      'Use a person only when the headline needs a person; otherwise use a concrete place, object, route, doorway, map, desk, road, landscape or another clear metaphor.',
      'Place the main visual subject on the right half and leave calm, textured negative space on the left for HTML text.',
      'No text, no letters, no numbers, no logos, no UI, no split poster, no blank white studio, no generic stock success pose.',
      'Natural contrast, deep but readable shadows, crisp focus, realistic materials and modern premium Russian advertising mood.'
    ].join('\n');
    return [{
      slot: 'hero',
      headline: title,
      methodName: subtitle,
      persona: 'semantic',
      visualMode: 'generatedPerson',
      stylePreset: imageStylePreset,
      variationKey: `${variantSeed}|insight-hero`,
      visualPrompt: routeContext
    }];
  }
  const heroSubject = mode === 'natureEditorial'
    ? `hero collage image: ${routeScenes[0] || 'one thoughtful adult person in a warm bright home studio, books/notebook/plant details, natural premium editorial mood'}, enough negative space for a serif headline, soft paper colors, no stock cliche`
    : mode === 'heroBlocks'
    ? `hero image: ${routeScenes[0] || 'one confident adult person in a bright modern apartment, cafe terrace or city workspace'}, face clearly visible, expressive but calm, subject on the right third, clean open space on the left for headline, premium ad photography, feeling of a person ready to return to action`
    : `hero image: ${routeScenes[0] || 'ordinary confident adult person 35-55 in a bright modern home office or city cafe'}, calm but energetic, open white/blue/pastel atmosphere, subtle sense of route and first step`;
  const valueSubject = mode === 'natureEditorial'
    ? `story section image: ${routeScenes[1] || 'different editorial scene with books, notebook, tea/coffee and a person making a simple plan'}, warm beige/sage palette, tactile paper feeling, no readable text`
    : mode === 'heroBlocks'
    ? `middle section image: ${routeScenes[1] || 'different live scene with a person and simple planning objects'}, laptop/phone/notebook as details only, warm daylight, visible depth, no blank white wall, no readable screens, atmosphere of testing and movement map`
    : `middle section image: ${routeScenes[1] || 'different scene, practical route/system metaphor, desk with notebook and phone, person reviewing a simple path'}, high-key editorial light, first-step mood without text`;
  const ctaSubject = mode === 'natureEditorial'
    ? `final CTA image: ${routeScenes[2] || 'different adult person with phone near plants or a bright cafe window, ready to open messenger'}, warm natural light, premium calm trust, no logos`
    : mode === 'heroBlocks'
    ? `CTA image: ${routeScenes[2] || 'different scene, person choosing next step on phone in a bright cafe/city/home environment'}, friendly messenger-like feeling without logos, clear face or hands, energetic but trustworthy`
    : `CTA image: ${routeScenes[2] || 'different scene, confident person after decision, phone in hand, airy premium room'}, energetic but trustworthy, no luxury cliches`;

  return [
    {
      slot: 'hero',
      headline: title,
      methodName: subtitle,
      persona: routePersonas[0] || 'woman',
      visualMode: 'generatedPerson',
      stylePreset: imageStylePreset,
      variationKey: `${variantSeed}|hero`,
      visualPrompt: `${baseContext}\n\nROLE 1 — TRIGGERING EVENT. ${heroSubject}\nShow one clear focal problem object only. Composition: wide horizontal premium hero photo, cinematic 35mm lifestyle look, subject on the right side, generous clean space on the left, no text.`
    },
    {
      slot: 'value',
      headline: title,
      methodName: subtitle,
      persona: routePersonas[1] || 'man',
      visualMode: 'generatedPerson',
      stylePreset: imageStylePreset,
      variationKey: `${variantSeed}|value`,
      visualPrompt: `${baseContext}\n\nROLE 2 — CONSEQUENCE OR CHANGED CHOICE. ${valueSubject}\nHard exclusion: do not show the hero problem object, washing machine, laundry room, broken appliance, repair counter, repair tools or repair estimate. Composition: horizontal editorial photo for a white rounded content section, different person, location, focal object and camera angle from hero, no text.`
    },
    {
      slot: 'cta',
      headline: title,
      methodName: subtitle,
      persona: routePersonas[2] || 'mixed',
      visualMode: 'generatedPerson',
      stylePreset: imageStylePreset,
      variationKey: `${variantSeed}|cta`,
      visualPrompt: `${baseContext}\n\nROLE 3 — RELIEF AND NEXT STEP. ${ctaSubject}\nHard exclusion: no broken object, no washing machine, no laundry room, no appliance, no car breakdown, no repair counter, no repair tools and no location used in hero or value. Composition: horizontal CTA photo, close but uncluttered, different person, place, action and camera angle from hero and value, no text.`
    }
  ];
}

function prelandingThemeForStyle(style, palette) {
  const key = `${style || ''} ${palette || ''}`.toLowerCase();
  if (key.includes('premium-light') || key.includes('white-gold') || key.includes('banner-white-gold')) {
    return {
      cls: 'pl-theme-luxe-light',
      accent: '#b18a3d',
      accent2: '#2563eb',
      bg: 'radial-gradient(circle at 78% 12%,rgba(177,138,61,.18),transparent 28%),radial-gradient(circle at 18% 86%,rgba(37,99,235,.10),transparent 32%),linear-gradient(135deg,#fffdf7 0%,#f8fbff 52%,#f1f5fb 100%)',
      light: true,
      btnMain1: '#d8b15a',
      btnMain2: '#f8d26a',
      btnAlt1: '#061325',
      btnAlt2: '#2563eb'
    };
  }
  if (key.includes('client-story') || key.includes('documentary')) {
    return {
      cls: 'pl-theme-story-light',
      accent: '#0f766e',
      accent2: '#2563eb',
      bg: 'radial-gradient(circle at 80% 12%,rgba(15,118,110,.15),transparent 28%),radial-gradient(circle at 14% 86%,rgba(37,99,235,.12),transparent 30%),linear-gradient(135deg,#f9fffd 0%,#f3f8ff 52%,#eef7f3 100%)',
      light: true,
      btnMain1: '#0f766e',
      btnMain2: '#22c55e',
      btnAlt1: '#2563eb',
      btnAlt2: '#7c3aed'
    };
  }
  if (key.includes('planner')) {
    return {
      cls: 'pl-theme-planner-light',
      accent: '#2563eb',
      accent2: '#14b8a6',
      bg: 'radial-gradient(circle at 80% 12%,rgba(37,99,235,.16),transparent 28%),radial-gradient(circle at 16% 88%,rgba(20,184,166,.14),transparent 32%),linear-gradient(135deg,#f8fbff 0%,#eef7ff 52%,#f7fffb 100%)',
      light: true,
      btnMain1: '#2563eb',
      btnMain2: '#14b8a6',
      btnAlt1: '#111827',
      btnAlt2: '#0f766e'
    };
  }
  if (key.includes('terminal') || key.includes('trading') || key.includes('lime') || key.includes('mint')) {
    return {
      cls: 'pl-theme-terminal',
      accent: '#31f58b',
      accent2: '#b8ff4d',
      bg: 'radial-gradient(circle at 78% 14%,rgba(49,245,139,.22),transparent 30%),radial-gradient(circle at 18% 86%,rgba(56,189,248,.16),transparent 28%),linear-gradient(135deg,#010807 0%,#031411 48%,#071f18 100%)',
      btnMain1: '#31f58b',
      btnMain2: '#b8ff4d',
      btnAlt1: '#07111f',
      btnAlt2: '#00a3ff'
    };
  }
  if (key.includes('blueprint') || key.includes('blueprinttech') || key.includes('schema')) {
    return {
      cls: 'pl-theme-blueprint',
      accent: '#38bdf8',
      accent2: '#facc15',
      bg: 'radial-gradient(circle at 82% 12%,rgba(56,189,248,.24),transparent 28%),radial-gradient(circle at 18% 84%,rgba(250,204,21,.12),transparent 30%),linear-gradient(135deg,#020617 0%,#07152d 50%,#0b1f3a 100%)',
      btnMain1: '#38bdf8',
      btnMain2: '#facc15',
      btnAlt1: '#0f172a',
      btnAlt2: '#1d4ed8'
    };
  }
  if (key.includes('fomo') || key.includes('urgency') || key.includes('heat')) {
    return {
      cls: 'pl-theme-fomo',
      accent: '#ff7a18',
      accent2: '#ffdd35',
      bg: 'radial-gradient(circle at 82% 12%,rgba(255,122,24,.3),transparent 28%),radial-gradient(circle at 18% 78%,rgba(239,68,68,.22),transparent 28%),linear-gradient(135deg,#090302 0%,#1b0705 48%,#341007 100%)',
      btnMain1: '#ff7a18',
      btnMain2: '#ffdd35',
      btnAlt1: '#7f1d1d',
      btnAlt2: '#ef4444'
    };
  }
  if (key.includes('editorialshock') || key.includes('newspapershock')) {
    return {
      cls: 'pl-theme-editorial-shock',
      accent: '#111827',
      accent2: '#ffde3b',
      bg: 'radial-gradient(circle at 82% 12%,rgba(255,222,59,.2),transparent 28%),linear-gradient(135deg,#fffdf5 0%,#f8fafc 48%,#ffe2e2 100%)',
      light: true,
      btnMain1: '#111827',
      btnMain2: '#ffde3b',
      btnAlt1: '#7f1d1d',
      btnAlt2: '#ef4444'
    };
  }
  if (key.includes('brutal') || key.includes('shock') || key.includes('impact')) {
    return {
      cls: 'pl-theme-brutal',
      accent: '#ff2d2d',
      accent2: '#ffde3b',
      bg: 'radial-gradient(circle at 82% 12%,rgba(255,45,45,.22),transparent 28%),linear-gradient(135deg,#050505 0%,#120506 48%,#220708 100%)',
      btnMain1: '#ff2d2d',
      btnMain2: '#ffde3b',
      btnAlt1: '#050505',
      btnAlt2: '#2563eb'
    };
  }
  if (key.includes('native') || key.includes('messenger') || key.includes('telegram')) {
    return {
      cls: 'pl-theme-native',
      accent: '#2dd4bf',
      accent2: '#53d5ff',
      bg: 'radial-gradient(circle at 82% 12%,rgba(45,212,191,.22),transparent 28%),radial-gradient(circle at 18% 84%,rgba(79,70,229,.18),transparent 30%),linear-gradient(135deg,#020617 0%,#07132a 48%,#122348 100%)',
      btnMain1: '#2dd4bf',
      btnMain2: '#53d5ff',
      btnAlt1: '#172554',
      btnAlt2: '#4f46e5'
    };
  }
  if (key.includes('calm') || key.includes('luxe')) {
    return {
      cls: 'pl-theme-luxe',
      accent: '#d8b15a',
      accent2: '#fff7de',
      bg: 'radial-gradient(circle at 78% 12%,rgba(216,177,90,.2),transparent 28%),linear-gradient(135deg,#fbfaf6 0%,#f6f0df 52%,#e6d2a4 100%)',
      light: true,
      btnMain1: '#f8d26a',
      btnMain2: '#ffffff',
      btnAlt1: '#061325',
      btnAlt2: '#c79b3f'
    };
  }
  if (key.includes('herobright') || key.includes('brightmint') || key.includes('lightblocks')) {
    return {
      cls: 'pl-theme-hero-bright',
      accent: '#10b981',
      accent2: '#2563eb',
      bg: 'radial-gradient(circle at 82% 12%,rgba(16,185,129,.18),transparent 28%),radial-gradient(circle at 12% 88%,rgba(37,99,235,.14),transparent 30%),linear-gradient(135deg,#fbfffd 0%,#f3fbff 48%,#eef7f0 100%)',
      light: true,
      btnMain1: '#22d3ee',
      btnMain2: '#2563eb',
      btnAlt1: '#8b5cf6',
      btnAlt2: '#db2777'
    };
  }
  if (key.includes('cosmic') || key.includes('purple') || key.includes('cyber')) {
    return {
      cls: 'pl-theme-cosmic',
      accent: '#a855f7',
      accent2: '#facc15',
      bg: 'radial-gradient(circle at 74% 16%,rgba(168,85,247,.34),transparent 30%),radial-gradient(circle at 24% 72%,rgba(250,204,21,.18),transparent 28%),linear-gradient(135deg,#05030f 0%,#12091f 48%,#2a0f3f 100%)',
      btnMain1: '#f97316',
      btnMain2: '#facc15',
      btnAlt1: '#4c1d95',
      btnAlt2: '#db2777'
    };
  }
  if (key.includes('newspaper') || key.includes('editorial')) {
    return {
      cls: 'pl-theme-editorial',
      accent: '#111827',
      accent2: '#facc15',
      bg: 'radial-gradient(circle at 82% 12%,rgba(250,204,21,.18),transparent 28%),linear-gradient(135deg,#fffdf5 0%,#f6efe0 48%,#e8d7aa 100%)',
      light: true,
      btnMain1: '#111827',
      btnMain2: '#facc15',
      btnAlt1: '#7f1d1d',
      btnAlt2: '#ef4444'
    };
  }
  if (key.includes('outdoor') || key.includes('nature') || key.includes('travel')) {
    return {
      cls: 'pl-theme-outdoor',
      accent: '#0f766e',
      accent2: '#f59e0b',
      bg: 'radial-gradient(circle at 78% 10%,rgba(15,118,110,.18),transparent 28%),radial-gradient(circle at 18% 88%,rgba(245,158,11,.2),transparent 34%),linear-gradient(135deg,#f7fbf5 0%,#eaf3dd 48%,#cfe2b0 100%)',
      light: true,
      btnMain1: '#f59e0b',
      btnMain2: '#ef4444',
      btnAlt1: '#0f766e',
      btnAlt2: '#111827'
    };
  }
  if (key.includes('darkorange') || key.includes('orange') || key.includes('darkyellow') || key.includes('yellow')) {
    return {
      cls: 'pl-theme-orange',
      accent: '#f97316',
      accent2: '#facc15',
      bg: 'radial-gradient(circle at 78% 14%,rgba(249,115,22,.3),transparent 28%),linear-gradient(135deg,#080403 0%,#1b0b04 46%,#341407 100%)',
      btnMain1: '#f97316',
      btnMain2: '#facc15',
      btnAlt1: '#111827',
      btnAlt2: '#ef4444'
    };
  }
  if (key.includes('redwhite') || key.includes('clean')) {
    return {
      cls: 'pl-theme-clean-red',
      accent: '#ef4444',
      accent2: '#111827',
      bg: 'radial-gradient(circle at 82% 12%,rgba(239,68,68,.16),transparent 28%),linear-gradient(135deg,#ffffff 0%,#f8fafc 50%,#fee2e2 100%)',
      light: true,
      btnMain1: '#ef4444',
      btnMain2: '#f97316',
      btnAlt1: '#111827',
      btnAlt2: '#374151'
    };
  }
  if (key.includes('green')) {
    return {
      cls: 'pl-theme-green',
      accent: '#31a24c',
      accent2: '#b7f36b',
      bg: 'radial-gradient(circle at 82% 12%,rgba(49,162,76,.26),transparent 28%),linear-gradient(135deg,#04130b 0%,#07140d 46%,#132316 100%)',
      btnMain1: '#22c55e',
      btnMain2: '#a3e635',
      btnAlt1: '#111827',
      btnAlt2: '#f59e0b'
    };
  }
  if (key.includes('blue') || key.includes('glass') || key.includes('saas')) {
    return {
      cls: 'pl-theme-blue',
      accent: '#38bdf8',
      accent2: '#1d4ed8',
      bg: 'radial-gradient(circle at 82% 12%,rgba(56,189,248,.22),transparent 28%),linear-gradient(135deg,#020617 0%,#07132a 48%,#0f2547 100%)',
      btnMain1: '#38bdf8',
      btnMain2: '#facc15',
      btnAlt1: '#111827',
      btnAlt2: '#8b5cf6'
    };
  }
  if (key.includes('red') || key.includes('brutal')) {
    return {
      cls: 'pl-theme-red',
      accent: '#ef111a',
      accent2: '#ff8a00',
      bg: 'radial-gradient(circle at 82% 12%,rgba(239,17,26,.24),transparent 28%),linear-gradient(135deg,#070707 0%,#130607 46%,#24080a 100%)',
      btnMain1: '#ef4444',
      btnMain2: '#f97316',
      btnAlt1: '#111827',
      btnAlt2: '#facc15'
    };
  }
  if (key.includes('white') || key.includes('gold') || key.includes('premium') || key.includes('outdoor')) {
    return {
      cls: 'pl-theme-gold',
      accent: '#c79b3f',
      accent2: '#061325',
      bg: 'radial-gradient(circle at 82% 12%,rgba(199,155,63,.22),transparent 28%),linear-gradient(135deg,#fbfaf6 0%,#f6f0df 48%,#e8d7aa 100%)',
      light: true,
      btnMain1: '#c79b3f',
      btnMain2: '#f8d26a',
      btnAlt1: '#111827',
      btnAlt2: '#ef4444'
    };
  }
  return {
    cls: 'pl-theme-yellow',
    accent: '#ffd200',
    accent2: '#f6b400',
    bg: 'radial-gradient(circle at 82% 12%,rgba(255,210,0,.22),transparent 28%),linear-gradient(135deg,#050505 0%,#15120a 48%,#2d2103 100%)',
    btnMain1: '#ffd200',
    btnMain2: '#f97316',
    btnAlt1: '#0f172a',
    btnAlt2: '#2563eb'
  };
}

function prelandingHexToRgb(value) {
  const hex = String(value || '').trim().replace(/^#/, '');
  if (!/^[\da-f]{3}$|^[\da-f]{6}$/i.test(hex)) return null;
  const normalized = hex.length === 3
    ? hex.split('').map((char) => char + char).join('')
    : hex;
  const int = Number.parseInt(normalized, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function prelandingColorLuminance(value) {
  const rgb = prelandingHexToRgb(value);
  if (!rgb) return 0;
  const toLinear = (channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

function readablePrelandingTitleAccent(theme) {
  const candidates = [
    theme?.accent,
    theme?.accent2,
    theme?.btnMain1,
    theme?.btnMain2,
    '#facc15',
    '#38bdf8',
    '#ffffff'
  ].filter(Boolean);
  const seen = new Set();
  const unique = candidates.filter((color) => {
    const key = String(color).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.find((color) => prelandingColorLuminance(color) >= 0.34) || '#facc15';
}

function renderPersonalBannerPrelanding({ style, palette, photo, overrides, projectData }) {
  const content = mergePrelandingContent(PRELANDING_CONTENT[1], overrides);
  const theme = prelandingThemeForStyle(style, palette);
  const title = stripHtml(content.titleHtml || overrides?.painTitle || 'Постоянно учились, а жизнь так и не менялась?');
  const words = title.split(/\s+/).filter(Boolean);
  const first = words.slice(0, Math.max(1, Math.ceil(words.length / 2))).join(' ');
  const second = words.slice(Math.max(1, Math.ceil(words.length / 2))).join(' ');
  const cleanPhoto = pickPrelandingImageUrl(overrides?.bannerImage, overrides?.heroImage, photo);
  const bothelpPhoto = bothelpImageSrc(cleanPhoto);
  const isBannerVisual = overrides?.visualSource === 'banner';
  const method = content.methodName || content.actionTitle || 'Среда движения без очередного курса и давления';
  const clientName = projectData?.clientDisplayName || projectData?.clientName || 'Герой этой истории';
  const clientGender = detectClientGender(clientName);
  const selfSaw = clientGender === 'female' ? 'увидела' : clientGender === 'male' ? 'увидел' : 'увидел(а)';
  const selfUnderstood = clientGender === 'female' ? 'поняла' : clientGender === 'male' ? 'понял' : 'понял(а)';
  const selfFound = clientGender === 'female' ? 'нашла' : clientGender === 'male' ? 'нашёл' : 'нашёл(ла)';
  const selfTried = clientGender === 'female' ? 'пыталась' : clientGender === 'male' ? 'пытался' : 'пытался(лась)';
  const aloneWord = clientGender === 'female' ? 'одной' : 'одному';
  const personRole = 'человек нашёл другой подход';
  const preloadPhoto = cleanPhoto ? `<link rel="preload" as="image" href="${esc(bothelpPhoto)}">` : '';
  const photoHtml = cleanPhoto
    ? `<div class="pl-person-card ${isBannerVisual ? 'pl-person-card--banner' : ''}">
        <img src="${esc(bothelpPhoto)}" alt="${isBannerVisual ? 'Баннер креатива' : 'Фото героя'}" referrerpolicy="no-referrer" loading="eager" decoding="sync" fetchpriority="high" style="width:100%;height:100%;object-fit:cover;object-position:center center;display:block;border:0;margin:0;padding:0;">
      </div>`
    : `<div class="pl-person-card pl-person-card--empty"><div>Визуал баннера<br>появится после генерации</div></div>`;
  const pills = (content.pills || ['Без долгой раскачки', 'С понятным разбором', 'По шагам'])
    .slice(0, 3)
    .map((item, index) => `<div class="pl-point"><b>0${index + 1}</b><span>${esc(item)}</span></div>`)
    .join('');

  return `${preloadPhoto}<style>
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Russo+One&display=swap');
.wh-landing-powered-by{display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}
.wh-landing-buttons{width:min(720px,calc(100% - 26px))!important;margin:0 auto 34px!important;padding:18px!important;border-radius:28px!important;background:${theme.light ? '#ffffff' : '#111'}!important;border:1px solid rgba(255,210,0,.32)!important;box-shadow:0 24px 70px rgba(0,0,0,.35)!important}
.wh-landing-buttons a,.wh-landing-buttons button{min-height:62px!important;border-radius:18px!important;font-family:Oswald,Arial,sans-serif!important;font-size:20px!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:.03em!important}
.wh-mini-landing-policy{width:min(720px,calc(100% - 26px))!important;margin:14px auto 34px!important;padding:18px!important;border-radius:22px!important;background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.12)!important}
body{margin:0!important;background:${theme.light ? '#fbfaf6' : '#050505'}!important;overflow-x:hidden!important}
.pavel-system-landing,.pavel-system-landing *{box-sizing:border-box}
.pavel-system-landing{--pl-yellow:${theme.accent};--pl-yellow-2:${theme.accent2};--pl-white:${theme.light ? '#07111f' : '#fff'};--pl-muted:${theme.light ? 'rgba(6,19,37,.72)' : 'rgba(255,255,255,.74)'};width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);position:relative;overflow:hidden;color:var(--pl-white);background:${theme.bg};font-family:Oswald,Impact,'Arial Narrow',Arial,sans-serif;letter-spacing:.01em}
.pavel-system-landing:before{content:'';position:absolute;inset:0;opacity:.14;background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:42px 42px;pointer-events:none}
.pl-wrap{width:min(1120px,calc(100% - 32px));margin:0 auto}
.pl-hero{min-height:760px;padding:42px 0 58px;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:34px;align-items:center;position:relative}
.pl-tag{display:inline-flex;padding:9px 14px;border:1px solid rgba(255,210,0,.28);border-radius:999px;background:rgba(255,210,0,.08);color:var(--pl-yellow);font-size:14px;font-weight:700;text-transform:uppercase;margin-bottom:20px}
.pl-title{margin:0;max-width:680px;text-transform:uppercase;line-height:1.02;font-size:clamp(38px,5.2vw,76px);font-weight:700;text-shadow:0 10px 28px rgba(0,0,0,.45);overflow-wrap:anywhere}
.pl-title .yellow{display:block;color:var(--pl-yellow)}
.pl-subline{margin:22px 0 0;width:fit-content;max-width:650px;padding:14px 20px 16px;transform:rotate(-1.2deg);background:linear-gradient(90deg,var(--pl-yellow),var(--pl-yellow-2));color:#050505;text-transform:uppercase;font-size:clamp(24px,3.3vw,42px);line-height:.98;font-weight:700;box-shadow:12px 14px 0 rgba(0,0,0,.42)}
.pl-hero-points{margin:34px 0 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:690px}
.pl-point{min-height:94px;padding:15px 14px;border:1px solid rgba(255,210,0,.24);background:rgba(255,255,255,.055);border-radius:18px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.035),0 18px 36px rgba(0,0,0,.22)}
.pl-point b{display:block;color:var(--pl-yellow);font-size:29px;line-height:1;margin-bottom:8px}.pl-point span{display:block;font-size:18px;line-height:1.08;text-transform:uppercase;font-weight:700}
.pl-person-zone{position:relative;min-height:650px}.pl-yellow-wall{position:absolute;top:22px;right:0;width:74%;height:330px;border-radius:26px;overflow:hidden;background:linear-gradient(rgba(0,0,0,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.08) 1px,transparent 1px),linear-gradient(135deg,#f8d400,#b88900);background-size:34px 34px,34px 34px,auto;box-shadow:inset 0 0 70px rgba(0,0,0,.22),0 24px 70px rgba(0,0,0,.45)}
.pl-yellow-wall:after{content:'ОЧЕРЕДНОЙ\\A КУРС';white-space:pre;position:absolute;top:42px;right:44px;color:rgba(0,0,0,.75);font-size:25px;line-height:.9;transform:rotate(-10deg);font-family:Russo One,Arial,sans-serif}
.pl-person-card{position:absolute;right:22px;bottom:126px;width:min(400px,82%);height:494px;border-radius:32px;overflow:hidden;background:#111;border:2px solid rgba(255,210,0,.25);box-shadow:0 30px 90px rgba(0,0,0,.72);transform:rotate(.8deg)}
.pl-person-card img{width:100%;height:100%;object-fit:cover;object-position:50% 35%;display:block;filter:contrast(1.04) saturate(.94) brightness(.96);transform:scale(1.03)}
.pl-person-card--banner{width:min(456px,90%);border-color:rgba(255,210,0,.42)}
.pl-person-card--banner img{object-position:50% 50%;filter:contrast(1.02) saturate(1);transform:none}
.pl-person-card--empty{display:grid;place-items:center;text-align:center;color:rgba(255,255,255,.72);font-size:22px;font-weight:700;text-transform:uppercase;padding:24px}
.pl-name-plate{position:absolute;left:50%;right:auto;bottom:0;z-index:8;width:min(760px,100%);transform:translateX(-50%);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:center;padding:18px 24px;border-radius:24px;background:linear-gradient(90deg,var(--pl-yellow),#f4ba00);color:#050505;box-shadow:0 24px 60px rgba(0,0,0,.58);overflow:hidden}
.pl-logo-line,.pl-person-line{display:flex;align-items:center;gap:14px;min-width:0}.pl-logo-mark{width:60px;height:60px;flex:0 0 auto;display:grid;place-items:center;border:5px solid #0a0a0a;border-radius:18px;font-family:Russo One,Arial,sans-serif;font-size:34px}.pl-logo-text,.pl-person-text{text-transform:uppercase;line-height:.98;font-weight:700;min-width:0}.pl-logo-text strong,.pl-person-text strong{display:block;font-size:clamp(20px,2.45vw,31px);letter-spacing:.04em;white-space:normal;overflow-wrap:anywhere;word-break:break-word}.pl-logo-text span,.pl-person-text span{display:block;margin-top:5px;font-size:14px;letter-spacing:.01em}.pl-person-line{border-left:1px solid rgba(0,0,0,.35);padding-left:20px}
.pl-section{padding:48px 0;position:relative}.pl-section-title{margin:0 0 26px;text-transform:uppercase;line-height:.95;font-size:clamp(38px,5.4vw,74px);font-weight:700}.pl-section-title .yellow{color:var(--pl-yellow)}.pl-section-lead{margin:-8px 0 30px;max-width:780px;color:var(--pl-muted);font-family:Arial,sans-serif;font-size:20px;line-height:1.42}
.pl-problems,.pl-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.pl-steps{grid-template-columns:repeat(3,minmax(0,1fr))}
.pl-card{position:relative;min-height:220px;overflow:hidden;padding:24px 18px 20px;border-radius:24px;background:linear-gradient(160deg,rgba(255,255,255,.075),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.1);box-shadow:0 24px 48px rgba(0,0,0,.22)}.pl-card b{display:inline-grid;place-items:center;width:54px;height:54px;margin-bottom:18px;border-radius:16px;background:var(--pl-yellow);color:#050505;font-size:26px}.pl-card h3{margin:0 0 10px;text-transform:uppercase;font-size:25px;line-height:1.03}.pl-card p{margin:0;color:var(--pl-muted);font-family:Arial,sans-serif;font-size:16px;line-height:1.35}
.pl-big-switch{margin-top:42px;position:relative;overflow:hidden;border-radius:34px;background:linear-gradient(135deg,rgba(255,210,0,.96),rgba(241,170,0,.96));color:#050505;padding:34px clamp(24px,4vw,54px);box-shadow:0 34px 80px rgba(0,0,0,.48)}.pl-big-switch h2{margin:0;max-width:860px;text-transform:uppercase;font-size:clamp(38px,5.2vw,74px);line-height:.94;font-weight:700}.pl-big-switch p{margin:18px 0 0;max-width:760px;font-family:Arial,sans-serif;font-size:21px;line-height:1.36;font-weight:700}
.pl-final{padding:54px 0 66px;text-align:center}.pl-final-box{position:relative;overflow:hidden;padding:clamp(30px,5vw,62px) 22px;border-radius:36px;background:linear-gradient(rgba(0,0,0,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.14) 1px,transparent 1px),linear-gradient(135deg,var(--pl-yellow),#f3ad00);background-size:34px 34px,34px 34px,auto;color:#050505;box-shadow:0 36px 90px rgba(0,0,0,.5)}.pl-final-box h2{margin:0 auto;max-width:880px;text-transform:uppercase;font-size:clamp(38px,5.7vw,82px);line-height:.9;font-weight:700}.pl-final-box p{margin:20px auto 0;max-width:720px;font-family:Arial,sans-serif;font-size:22px;line-height:1.34;font-weight:700}
@media(max-width:980px){.pl-hero{grid-template-columns:1fr;min-height:auto}.pl-person-zone{min-height:610px}.pl-person-card{right:50%;transform:translateX(50%) rotate(.6deg)}.pl-yellow-wall{right:50%;transform:translateX(50%);width:min(520px,92%)}.pl-name-plate{width:min(620px,100%)}.pl-problems{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){.pl-wrap{width:min(100% - 22px,1120px)}.pl-title{font-size:clamp(34px,11.2vw,54px)}.pl-hero-points,.pl-problems,.pl-steps{grid-template-columns:1fr}.pl-person-zone{min-height:580px}.pl-person-card{width:min(332px,88%);height:410px}.pl-name-plate{grid-template-columns:1fr;width:min(340px,100%);padding:15px 16px}.pl-person-line{border-left:0;border-top:1px solid rgba(0,0,0,.32);padding:12px 0 0}.pl-section{padding:34px 0}}
</style>
<div class="pavel-system-landing ${theme.cls}">
  <section class="pl-hero pl-wrap">
    <div>
      <div class="pl-tag">не очередной курс — среда движения</div>
      <h1 class="pl-title">
        <span>${esc(first)}</span>
        ${second ? `<span class="yellow">${esc(second)}</span>` : ''}
      </h1>
      <div class="pl-subline">${esc(method)}</div>
      <div class="pl-hero-points">${pills}</div>
    </div>
    <div class="pl-person-zone">
      <div class="pl-yellow-wall"></div>
      ${photoHtml}
      <div class="pl-name-plate">
        <div class="pl-logo-line">
          <div class="pl-logo-mark">S</div>
          <div class="pl-logo-text"><strong>Система</strong><span>проверена на практике</span></div>
        </div>
        <div class="pl-person-line">
        <div class="pl-person-text"><strong>Личный опыт</strong><span>${esc(personRole)}</span></div>
        </div>
      </div>
    </div>
  </section>
  <section class="pl-section pl-wrap">
    <h2 class="pl-section-title">Я тоже <span class="yellow">${esc(selfTried)} разобраться</span></h2>
    <p class="pl-section-lead">Это не история про волшебный рывок и не красивая картинка ради картинки. Ситуация знакомая: решения, планы, попытки всё удержать ${aloneWord}, а движение всё время срывается.</p>
    <div class="pl-problems">
      <div class="pl-card"><b>1</b><h3>Много планов</h3><p>Есть цели, списки и решения, но они не превращаются в регулярное действие.</p></div>
      <div class="pl-card"><b>2</b><h3>Всё на силе воли</h3><p>Пока хватает эмоции - движение есть. Потом обычная неделя всё сбивает.</p></div>
      <div class="pl-card"><b>3</b><h3>Нет маршрута</h3><p>Когда нет ясного следующего шага, человек снова остаётся один на один с хаосом.</p></div>
      <div class="pl-card"><b>4</b><h3>Нет первого шага</h3><p>Главная проблема не интерес, а понятное действие после первого клика.</p></div>
    </div>
    <div class="pl-big-switch">
      <h2>Потом я ${esc(selfFound)} формат, где движение держится не на мотивации.</h2>
      <p>Не ещё одна длинная теория, где снова нужно всё додумывать самому. А короткий разбор: что мешает, какой маршрут выбрать и какой первый шаг сделать дальше.</p>
    </div>
  </section>
  <section class="pl-section pl-wrap">
    <h2 class="pl-section-title">Что я ${selfUnderstood}, когда ${selfSaw} <span class="yellow">понятный маршрут</span></h2>
    <div class="pl-steps">
      <div class="pl-card"><b>✓</b><h3>Ситуация</h3><p>Сначала понятно, какая проблема или желание ведёт человека на разбор.</p></div>
      <div class="pl-card"><b>✓</b><h3>Маршрут</h3><p>Понятно, какой смысл раскрыть и куда вести человека дальше.</p></div>
      <div class="pl-card"><b>✓</b><h3>Первый шаг</h3><p>Без лишней подготовки: человек проходит четыре вопроса и получает следующий шаг.</p></div>
    </div>
  </section>
  <section class="pl-final pl-wrap">
    <div class="pl-final-box">
      <h2>${esc(title)}</h2>
      <p>${esc(method)}.</p>
    </div>
  </section>
</div>
`;
}

function resolveClientPrelandingAngle(title, method = '') {
  return resolveCampaignSemanticProfile(title, method) || CLIENT_PRELANDING_MARKETING_ANGLES[0];
}

function resolveClientPrelandingLogic(title, method = '', mode = 'templateStage') {
  const profile = resolveClientPrelandingAngle(title, method);
  const angle = buildCampaignLandingLogic({ title, text: method, mode });
  return {
    ...profile,
    ...angle,
    titleHtml: esc(angle.title)
  };
}

function buildTildaStoryCards(title, method = '', mode = 'templateStage') {
  return resolveClientPrelandingLogic(title, method, mode).cards;
}

function buildTildaCtaLead(title, method, mode = 'templateStage') {
  return resolveClientPrelandingLogic(title, method, mode).ctaLead;
}

const CORE_PRELANDING_THEME_STYLES = {
  1: 'heroBright',
  2: 'whiteGoldPremium',
  3: 'greenSystem'
};

const CORE_PRELANDING_VARIANTS = {
  1: 'tf-v-spotlight',
  2: 'tf-v-editorial',
  3: 'tf-v-motion'
};

const MANUAL_PRELANDING_MODES = [
  {
    id: 'templateStage',
    title: 'Формат 1 / Мини-тест + разбор',
    desc: 'Компактный Tilda-блок: сильный первый экран, три смысловых блока, мини-тест и регистрация.'
  },
  {
    id: 'heroBlocks',
    title: 'Формат 2 / Hero-картинка + блоки',
    desc: 'Большая hero-сцена по заголовку и тексту, офферные карточки и заметные CTA.'
  },
  {
    id: 'natureEditorial',
    title: 'Формат 3 / Nature editorial',
    desc: 'Мягкий editorial-лендинг: тёплая бумажная палитра, коллаж фото, сценарий, механика и финальный CTA.'
  },
  {
    id: 'minimalCompare',
    title: 'Формат 4 / Тихое сравнение',
    desc: 'Тёмный минималистичный Tilda-блок без фото: внутренний конфликт, 3 микро-смысла и регистрация.'
  },
  {
    id: 'directionQuiz',
    title: 'Формат 5 / Маршрут действия',
    desc: 'Динамичный одностраничник: конфликт, маршрут, три смысловые опоры и прямая форма регистрации.'
  },
  {
    id: 'barrierProfileQuiz',
    title: 'Формат 6 / Профиль барьера',
    desc: 'Контрастный профиль проблемы: повторяющийся сценарий, три признака и прямая форма регистрации.'
  }
];

function prelandingClassToken(value = '') {
  return String(value || 'default')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default';
}

function renderHeroSceneBlocksPrelanding({
  content,
  projectData,
  landingMeta,
  sceneImage,
  valueImage,
  ctaImage,
  style,
  palette,
  layout,
  typo,
  effects,
  theme,
  accent,
  accent2
}) {
  const selectedStyle = style || 'premium-light';
  const selectedPalette = PALETTES.find(item => item[0] === palette) || PALETTES.find(item => item[0] === 'blue-trust') || PALETTES[0];
  const paletteColors = selectedPalette?.[3] || ['#2563eb', '#06b6d4', '#f8fafc'];
  const themeData = theme || prelandingThemeForStyle(selectedStyle, selectedPalette?.[0]);
  const primary = accent || themeData?.accent || paletteColors[0] || '#2563eb';
  const secondary = accent2 || themeData?.accent2 || paletteColors[1] || '#7c3aed';
  const soft = paletteColors[2] || '#f8fafc';
  const titleText = stripHtml(content.titleHtml || content.title || 'Откройте короткий разбор и посмотрите, как это работает');
  const titleWords = titleText.split(/\s+/).filter(Boolean);
  const accentWord = titleWords.length > 1 ? titleWords[titleWords.length - 1] : '';
  const titleMain = accentWord ? titleWords.slice(0, -1).join(' ') : titleText;
  const titleHtml = /<span[\s>]/i.test(content.titleHtml || '')
    ? content.titleHtml
    : accentWord
      ? `${esc(titleMain)} <span>${esc(accentWord)}</span>`
      : esc(titleText);
  const leadText = content.trustTitle || content.valueTitle || 'Короткий разбор покажет, что делать дальше без перегруза, долгого запуска и продаж в лоб.';
  const methodText = content.methodName || '';
  const badge = content.badge || 'Короткий практический разбор';
  const cards = (content.cards?.length ? content.cards : buildTildaStoryCards(titleText)).slice(0, 3);
  const valueItems = (content.valueItems?.length ? content.valueItems : [
    'как понять механику без длинной теории и лишних шагов',
    'почему первый контакт лучше вести через короткий разбор',
    'что открыть человеку дальше, чтобы он не потерялся после клика'
  ]).slice(0, 3);
  const proofItems = (content.proofItems?.length ? content.proofItems : [])
    .slice(0, 3)
    .map(item => typeof item === 'string' ? item : item?.value || item?.title || item?.label || 'Без лишнего шага');
  const images = [
    bothelpImageSrc(sceneImage || PRELANDING_FALLBACK_IMAGES[0]),
    bothelpImageSrc(valueImage || PRELANDING_FALLBACK_IMAGES[1]),
    bothelpImageSrc(ctaImage || PRELANDING_FALLBACK_IMAGES[2])
  ];
  const safeLayout = ['classic', 'split', 'cards', 'timeline'].includes(layout) ? layout : 'split';
  const safeTypo = ['manrope', 'inter', 'unbounded', 'onest', 'playfair'].includes(typo) ? typo : 'unbounded';
  const effectList = Array.isArray(effects) ? effects : [];
  const rootClass = [
    'fh-hero-blocks',
    'fh-hb-scene-poster',
    `fh-hb-style-${prelandingClassToken(selectedStyle)}`,
    `fh-hb-palette-${prelandingClassToken(selectedPalette?.[0])}`,
    `fh-hb-layout-${safeLayout}`,
    `fh-hb-typo-${safeTypo}`,
    ...effectList.map(item => `fh-hb-effect-${prelandingClassToken(item)}`)
  ].filter(Boolean).join(' ');
  const rootStyle = [
    `--hb-accent:${primary}`,
    `--hb-accent2:${secondary}`,
    `--hb-soft:${soft}`,
    `--hb-btn1:${themeData?.btnMain1 || primary}`,
    `--hb-btn2:${themeData?.btnMain2 || secondary}`,
    `--hb-alt1:${themeData?.btnAlt1 || secondary}`,
    `--hb-alt2:${themeData?.btnAlt2 || primary}`
  ].join(';');
  const cardsHtml = cards.map((item, index) => {
    const title = item?.title || proofItems[index] || `Шаг ${index + 1}`;
    const text = item?.text || item || valueItems[index] || 'Понятный следующий шаг без лишней теории.';
    return `<article class="fh-hb-story-card">
      <div class="fh-hb-card-check">${safeLayout === 'timeline' ? index + 1 : '✓'}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
    </article>`;
  }).join('');
  const proofHtml = proofItems.map(item => `<li>${esc(item)}</li>`).join('');
  const methodHtml = methodText ? `<div class="fh-hb-method">${esc(methodText)}</div>` : '';
  const proofListHtml = proofHtml ? `<ul class="fh-hb-proof" aria-label="Короткие условия">${proofHtml}</ul>` : '';
  const valueHtml = valueItems.map((item, index) => `<article class="fh-hb-value-card">
    <b>${String(index + 1).padStart(2, '0')}</b>
    <p>${esc(item)}</p>
  </article>`).join('');
  const actionNote = content.liveNote || '';
  const actionNoteHtml = actionNote ? `<div class="fh-hb-action-note">${esc(actionNote)}</div>` : '';
  const ctaTitle = content.actionTitle || 'Откройте разбор и заберите первый шаг';
  const ctaSubtitle = content.actionSubtitle || content.ctaLead || 'Ответьте на четыре вопроса и откройте защищённую форму регистрации Atmospace.';
  const heroImageHtml = images[0]
    ? `<img src="${esc(images[0])}" alt="" loading="eager" decoding="async" fetchpriority="high" onerror="var c=this.closest('.fh-hb-scene');if(c)c.classList.add('fh-image-failed');this.remove();">`
    : '';
  const valueMediaClass = images[1] ? 'fh-hb-media-card' : 'fh-hb-media-card fh-image-failed';
  const ctaMediaClass = images[2] ? 'fh-hb-media-card' : 'fh-hb-media-card fh-image-failed';
  const valueImageHtml = images[1]
    ? `<img src="${esc(images[1])}" alt="" loading="lazy" decoding="async" onerror="var c=this.closest('.fh-hb-media-card');if(c){c.classList.add('fh-image-failed');c.style.display='none';}this.remove();">`
    : '';
  const ctaImageHtml = images[2]
    ? `<img src="${esc(images[2])}" alt="" loading="lazy" decoding="async" onerror="var c=this.closest('.fh-hb-media-card');if(c){c.classList.add('fh-image-failed');c.style.display='none';}this.remove();">`
    : '';

  return `${buildAtmospaceHeadConfig({
  projectData,
  ...(landingMeta || {})
})}
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Manrope:wght@500;600;700;800;900&family=Onest:wght@500;600;700;800;900&family=Playfair+Display:wght@700;800;900&family=Unbounded:wght@600;700;800;900&display=swap');
#fh-preland-root.fh-hb-scene-poster,
#fh-preland-root.fh-hb-scene-poster *{box-sizing:border-box}
#fh-preland-root.fh-hb-scene-poster{
  --hb-ink:#070d1f;
  --hb-muted:#536178;
  --hb-line:rgba(22,34,57,.10);
  --hb-card:rgba(255,255,255,.72);
  --hb-font:'Unbounded','Manrope',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  width:100vw;
  min-height:100vh;
  margin-left:calc(50% - 50vw);
  margin-right:calc(50% - 50vw);
  color:var(--hb-ink);
  font-family:var(--hb-font);
  background:
    radial-gradient(circle at 8% 8%, color-mix(in srgb, var(--hb-accent) 20%, transparent), transparent 28vw),
    radial-gradient(circle at 92% 12%, color-mix(in srgb, var(--hb-accent2) 14%, transparent), transparent 30vw),
    linear-gradient(135deg,#f9fcff 0%,#f3f9ff 52%,color-mix(in srgb,var(--hb-soft) 44%,#ffffff) 100%);
  overflow:hidden;
  -webkit-font-smoothing:antialiased;
}
#fh-preland-root.fh-hb-typo-manrope{--hb-font:'Manrope',system-ui,sans-serif}
#fh-preland-root.fh-hb-typo-inter{--hb-font:'Inter',system-ui,sans-serif}
#fh-preland-root.fh-hb-typo-onest{--hb-font:'Onest',system-ui,sans-serif}
#fh-preland-root.fh-hb-typo-unbounded{--hb-font:'Unbounded','Manrope',system-ui,sans-serif}
#fh-preland-root.fh-hb-typo-playfair{--hb-font:'Inter',system-ui,sans-serif}
#fh-preland-root.fh-hb-typo-playfair .fh-hb-title,
#fh-preland-root.fh-hb-typo-playfair .fh-hb-section-title,
#fh-preland-root.fh-hb-typo-playfair .fh-hb-cta-title{font-family:'Playfair Display','Inter',serif;letter-spacing:-.04em;text-transform:none}
#fh-preland-root .fh-hb-stage{
  position:relative;
  min-height:100svh;
  overflow:hidden;
  isolation:isolate;
}
#fh-preland-root .fh-hb-stage:before{
  content:"";
  position:absolute;
  inset:0;
  z-index:1;
  pointer-events:none;
  background:
    linear-gradient(90deg,rgba(249,252,255,.96) 0%,rgba(249,252,255,.88) 25%,rgba(249,252,255,.38) 48%,rgba(249,252,255,.05) 64%,rgba(249,252,255,0) 100%),
    radial-gradient(circle at 18% 18%, color-mix(in srgb,var(--hb-accent) 12%, transparent), transparent 30%),
    linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.12));
}
#fh-preland-root.fh-hb-layout-classic .fh-hb-stage:before,
#fh-preland-root.fh-hb-layout-cards .fh-hb-stage:before{
  background:
    linear-gradient(90deg,rgba(249,252,255,.96) 0%,rgba(249,252,255,.84) 30%,rgba(249,252,255,.28) 56%,rgba(249,252,255,0) 100%),
    radial-gradient(circle at 22% 18%, color-mix(in srgb,var(--hb-accent) 13%, transparent), transparent 34%),
    linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.12));
}
#fh-preland-root .fh-hb-scene{
  position:absolute;
  inset:0;
  z-index:0;
  overflow:hidden;
  background:
    radial-gradient(circle at 76% 22%, color-mix(in srgb,var(--hb-accent2) 18%, transparent), transparent 24%),
    linear-gradient(135deg,#f8fbff,#eef7ff);
}
#fh-preland-root .fh-hb-scene img{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  object-position:72% 44%;
  display:block;
  filter:saturate(1.12) contrast(1.08) brightness(.96);
  transform:scale(1.012);
}
#fh-preland-root .fh-hb-scene:after{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.34;
  background-image:
    linear-gradient(rgba(79,96,130,.08) 1px,transparent 1px),
    linear-gradient(90deg,rgba(79,96,130,.08) 1px,transparent 1px);
  background-size:42px 42px;
  mask-image:linear-gradient(90deg,#000 0%,rgba(0,0,0,.78) 48%,transparent 100%);
}
#fh-preland-root .fh-hb-wrap{
  position:relative;
  z-index:2;
  width:min(1320px,calc(100% - 48px));
  margin:0 auto;
}
#fh-preland-root .fh-hb-hero{
  min-height:100svh;
  display:grid;
  grid-template-columns:minmax(0,.88fr) minmax(380px,1.12fr);
  grid-template-rows:1fr auto;
  gap:22px;
  align-items:center;
  padding:clamp(30px,5vh,64px) 0 28px;
  min-width:0;
}
#fh-preland-root.fh-hb-layout-classic .fh-hb-hero{grid-template-columns:minmax(0,.95fr) minmax(420px,1.05fr)}
#fh-preland-root.fh-hb-layout-cards .fh-hb-hero{grid-template-columns:minmax(0,1fr) minmax(360px,.82fr)}
#fh-preland-root.fh-hb-layout-timeline .fh-hb-hero{grid-template-columns:minmax(0,.88fr) minmax(420px,1.12fr)}
#fh-preland-root .fh-hb-copy{
  grid-column:1;
  width:100%;
  max-width:760px;
  min-width:0;
  padding:clamp(12px,1.6vw,22px) 0;
}
#fh-preland-root .fh-hb-kicker{
  display:inline-flex;
  align-items:center;
  gap:10px;
  max-width:min(620px,100%);
  padding:10px 16px;
  border-radius:999px;
  background:rgba(255,255,255,.70);
  border:1px solid color-mix(in srgb,var(--hb-accent) 26%,rgba(255,255,255,.5));
  color:color-mix(in srgb,var(--hb-accent) 72%,#102033);
  font:900 12px/1 var(--hb-font);
  text-transform:uppercase;
  letter-spacing:.05em;
  box-shadow:0 18px 42px rgba(30,54,92,.08);
  backdrop-filter:blur(12px);
}
#fh-preland-root .fh-hb-kicker:before{
  content:"";
  width:10px;
  height:10px;
  border-radius:50%;
  background:linear-gradient(135deg,var(--hb-accent),var(--hb-accent2));
  box-shadow:0 0 0 7px color-mix(in srgb,var(--hb-accent) 12%,transparent);
}
#fh-preland-root .fh-hb-title{
  margin:clamp(22px,3.2vh,34px) 0 18px;
  width:100%;
  max-width:780px;
  min-width:0;
  color:var(--hb-ink);
  font-family:var(--hb-font);
  font-size:clamp(40px,4.75vw,78px);
  line-height:.96;
  font-weight:950;
  letter-spacing:-.045em;
  text-transform:uppercase;
  text-wrap:balance;
  overflow-wrap:break-word;
  word-break:normal;
}
#fh-preland-root.fh-hb-typo-manrope .fh-hb-title,
#fh-preland-root.fh-hb-typo-inter .fh-hb-title,
#fh-preland-root.fh-hb-typo-onest .fh-hb-title{letter-spacing:-.045em}
#fh-preland-root .fh-hb-title span{
  color:transparent;
  background:linear-gradient(112deg,var(--hb-accent),var(--hb-accent2));
  -webkit-background-clip:text;
  background-clip:text;
}
#fh-preland-root .fh-hb-lead{
  margin:0;
  width:100%;
  max-width:650px;
  min-width:0;
  color:#172033;
  font:850 clamp(17px,1.45vw,23px)/1.35 'Inter','Manrope',system-ui,sans-serif;
  letter-spacing:-.02em;
}
#fh-preland-root .fh-hb-method{
  display:inline-flex;
  min-width:0;
  max-width:min(690px,100%);
  margin-top:22px;
  padding:12px 16px;
  border-radius:999px;
  background:linear-gradient(100deg,var(--hb-btn1),var(--hb-btn2));
  color:#ffffff;
  font:950 clamp(12px,1vw,16px)/1.1 'Inter','Manrope',system-ui,sans-serif;
  text-transform:uppercase;
  letter-spacing:.04em;
  box-shadow:0 16px 40px color-mix(in srgb,var(--hb-accent) 14%,rgba(30,54,92,.12)), inset 0 1px 0 rgba(255,255,255,.24);
  text-shadow:0 12px 28px rgba(0,0,0,.20);
  overflow-wrap:break-word;
}
#fh-preland-root .fh-hb-proof{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin:22px 0 0;
  padding:0;
  list-style:none;
}
#fh-preland-root .fh-hb-proof li{
  min-height:42px;
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:10px 14px;
  border-radius:999px;
  background:rgba(255,255,255,.78);
  border:1px solid rgba(22,34,57,.10);
  color:#121a2d;
  box-shadow:0 14px 32px rgba(30,54,92,.06);
  font:900 13px/1.1 'Inter','Manrope',system-ui,sans-serif;
}
#fh-preland-root .fh-hb-proof li:before{
  content:"×";
  display:grid;
  place-items:center;
  width:22px;
  height:22px;
  border-radius:50%;
  color:#fff;
  background:linear-gradient(135deg,var(--hb-accent),var(--hb-accent2));
}
#fh-preland-root .fh-hb-bottom{
  grid-column:1 / 3;
  width:min(1120px,88vw);
  min-width:0;
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(330px,.72fr);
  gap:14px;
  align-items:end;
}
#fh-preland-root .fh-hb-story-row{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
  min-width:0;
}
#fh-preland-root .fh-hb-story-card{
  min-height:112px;
  display:flex;
  flex-direction:column;
  justify-content:flex-start;
  gap:8px;
  padding:16px;
  border-radius:20px;
  background:rgba(255,255,255,.74);
  border:1px solid rgba(22,34,57,.12);
  box-shadow:0 22px 58px rgba(30,54,92,.12), inset 0 1px 0 rgba(255,255,255,.42);
  backdrop-filter:blur(14px) saturate(1.1);
}
#fh-preland-root .fh-hb-card-check{
  display:grid;
  place-items:center;
  width:30px;
  height:30px;
  border-radius:11px;
  background:linear-gradient(135deg,var(--hb-accent),var(--hb-accent2));
  color:#fff;
  font:950 16px/1 'Inter',system-ui,sans-serif;
}
#fh-preland-root .fh-hb-story-card h3{
  margin:0;
  color:#0d1629;
  font:950 clamp(14px,1.12vw,18px)/1.05 var(--hb-font);
  text-transform:uppercase;
  letter-spacing:-.025em;
}
#fh-preland-root .fh-hb-story-card p{
  margin:0;
  color:#5a667a;
  font:700 12px/1.35 'Inter','Manrope',system-ui,sans-serif;
}
#fh-preland-root .fh-hb-actions{
  display:flex;
  flex-direction:column;
  gap:10px;
}
#fh-preland-root .fh-hb-action-note{
  display:inline-flex;
  width:max-content;
  max-width:100%;
  padding:9px 12px;
  border-radius:999px;
  background:rgba(255,255,255,.74);
  border:1px solid rgba(22,34,57,.10);
  color:#526176;
  font:900 12px/1.25 'Inter','Manrope',system-ui,sans-serif;
  text-transform:uppercase;
  letter-spacing:.03em;
}
#fh-preland-root .fh-hb-buttons{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}
#fh-preland-root .fh-hb-btn{
  position:relative;
  min-height:76px;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:16px 20px;
  border-radius:20px;
  overflow:hidden;
  text-decoration:none!important;
  color:#fff!important;
  -webkit-text-fill-color:#fff!important;
  background:linear-gradient(135deg,#21c7ff,#2563eb);
  box-shadow:0 24px 64px rgba(30,54,92,.18), inset 0 1px 0 rgba(255,255,255,.25);
  font:950 clamp(15px,1.35vw,20px)/1 var(--hb-font);
  text-transform:uppercase;
  text-shadow:0 12px 30px rgba(0,0,0,.28);
  transition:transform .16s ease,filter .16s ease;
}
#fh-preland-root .fh-hb-btn:before{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(120deg,rgba(255,255,255,.30),transparent 42%);
  pointer-events:none;
}
#fh-preland-root .fh-hb-btn:hover{transform:translateY(-2px);filter:brightness(1.04)}
#fh-preland-root .fh-hb-btn span{position:relative;z-index:1}
#fh-preland-root .fh-hb-btn-max{background:linear-gradient(135deg,var(--hb-alt1),var(--hb-alt2))}
#fh-preland-root .fh-hb-section{
  position:relative;
  z-index:2;
  width:min(1320px,calc(100% - 48px));
  margin:28px auto 0;
  border-radius:38px;
  background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.78));
  border:1px solid rgba(255,255,255,.76);
  box-shadow:0 28px 86px rgba(30,54,92,.10);
  overflow:hidden;
}
#fh-preland-root .fh-hb-section-grid{
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(360px,520px);
  gap:clamp(24px,4vw,58px);
  align-items:center;
  padding:clamp(28px,4vw,56px);
}
#fh-preland-root .fh-hb-section-label{
  display:inline-flex;
  align-items:center;
  gap:9px;
  min-height:38px;
  margin-bottom:18px;
  padding:9px 14px;
  border-radius:999px;
  background:color-mix(in srgb,var(--hb-accent) 10%,#ffffff);
  border:1px solid color-mix(in srgb,var(--hb-accent) 18%,transparent);
  color:color-mix(in srgb,var(--hb-accent) 72%,#111827);
  font:950 12px/1 'Inter',system-ui,sans-serif;
  letter-spacing:.06em;
  text-transform:uppercase;
}
#fh-preland-root .fh-hb-section-title,
#fh-preland-root .fh-hb-cta-title{
  margin:0;
  color:#07111f;
  font-family:var(--hb-font);
  font-size:clamp(34px,4.5vw,68px);
  line-height:.98;
  font-weight:950;
  letter-spacing:-.055em;
  text-transform:uppercase;
}
#fh-preland-root .fh-hb-value-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:14px;
  padding:0 clamp(28px,4vw,56px) clamp(28px,4vw,56px);
}
#fh-preland-root .fh-hb-value-card{
  min-height:154px;
  padding:20px;
  border-radius:24px;
  background:rgba(255,255,255,.72);
  border:1px solid rgba(22,34,57,.10);
  box-shadow:0 18px 50px rgba(30,54,92,.07);
}
#fh-preland-root .fh-hb-value-card b{
  display:inline-flex;
  margin-bottom:16px;
  color:var(--hb-accent);
  font:950 32px/1 var(--hb-font);
}
#fh-preland-root .fh-hb-value-card p{
  margin:0;
  color:#536178;
  font:750 15px/1.48 'Inter','Manrope',system-ui,sans-serif;
}
#fh-preland-root .fh-hb-media-card{
  position:relative;
  overflow:hidden;
  min-height:320px;
  border-radius:30px;
  background:#fff;
  border:1px solid rgba(255,255,255,.82);
  box-shadow:0 26px 70px rgba(30,54,92,.13);
}
#fh-preland-root .fh-hb-media-card img{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
#fh-preland-root .fh-hb-media-card.fh-image-failed{display:none}
#fh-preland-root .fh-hb-section-grid:has(.fh-hb-media-card.fh-image-failed){grid-template-columns:1fr}
#fh-preland-root .fh-hb-cta{
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(300px,420px);
  gap:24px;
  align-items:center;
  padding:clamp(28px,4vw,56px);
  background:
    radial-gradient(circle at 0 0,color-mix(in srgb,var(--hb-accent) 14%,transparent),transparent 32%),
    radial-gradient(circle at 100% 0,color-mix(in srgb,var(--hb-accent2) 12%,transparent),transparent 30%),
    rgba(255,255,255,.86);
}
#fh-preland-root .fh-hb-cta-sub{
  max-width:720px;
  margin:18px 0 26px;
  color:#536178;
  font:700 18px/1.55 'Inter','Manrope',system-ui,sans-serif;
}
#fh-preland-root .fh-hb-legal,
#fh-preland-root .fh-hb-policy,
#fh-preland-root .fh-hb-policy-error{
  position:relative;
  z-index:2;
  width:min(920px,calc(100% - 48px));
  margin:18px auto 0;
}
#fh-preland-root .fh-hb-legal{color:rgba(83,97,120,.76);font:600 12px/1.5 'Inter',system-ui,sans-serif;text-align:center}
#fh-preland-root .fh-hb-policy{
  display:flex;
  gap:12px;
  align-items:flex-start;
  padding:16px 18px;
  border-radius:20px;
  background:rgba(255,255,255,.74);
  border:1px solid rgba(22,34,57,.10);
  box-shadow:0 14px 34px rgba(30,54,92,.06);
  color:#536178;
  font:650 13px/1.55 'Inter',system-ui,sans-serif;
}
#fh-preland-root .fh-hb-policy input{width:18px;height:18px;margin:2px 0 0;flex:0 0 18px;accent-color:var(--hb-accent)}
#fh-preland-root .fh-hb-policy a{color:#1d4ed8;font-weight:850;text-decoration:underline;text-underline-offset:2px}
#fh-preland-root .fh-hb-policy-error{display:none;color:#b91c1c;font:850 13px/1.4 'Inter',system-ui,sans-serif;text-align:center}
#fh-preland-root.fh-hb-style-banner-black-yellow .fh-hb-title,
#fh-preland-root.fh-hb-style-banner-black-red .fh-hb-title{letter-spacing:-.035em}
#fh-preland-root.fh-hb-style-banner-black-yellow .fh-hb-method{color:#07111f;text-shadow:none}
#fh-preland-root.fh-hb-style-banner-black-yellow .fh-hb-kicker{background:#07111f;color:#facc15;border-color:rgba(7,17,31,.16)}
#fh-preland-root.fh-hb-style-banner-black-red .fh-hb-kicker{background:#07111f;color:#fff;border-color:rgba(239,68,68,.20)}
#fh-preland-root.fh-hb-style-banner-black-red .fh-hb-method{background:linear-gradient(100deg,#ef4444,#111827)}
#fh-preland-root.fh-hb-style-banner-white-gold .fh-hb-stage:before,
#fh-preland-root.fh-hb-style-premium-light .fh-hb-stage:before{background:linear-gradient(90deg,rgba(255,253,247,.96) 0%,rgba(255,253,247,.84) 30%,rgba(255,253,247,.24) 56%,rgba(255,253,247,0) 100%),radial-gradient(circle at 20% 18%,rgba(177,138,61,.14),transparent 34%),linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.10))}
#fh-preland-root.fh-hb-style-clean-ads .fh-hb-story-card,
#fh-preland-root.fh-hb-style-saas .fh-hb-story-card{border-radius:14px}
#fh-preland-root.fh-hb-style-planner .fh-hb-story-card,
#fh-preland-root.fh-hb-layout-timeline .fh-hb-story-card{border-left:5px solid var(--hb-accent);border-radius:16px}
#fh-preland-root.fh-hb-layout-cards .fh-hb-bottom{grid-template-columns:1fr}
#fh-preland-root.fh-hb-layout-cards .fh-hb-actions{max-width:720px}
#fh-preland-root.fh-hb-effect-glow .fh-hb-btn,
#fh-preland-root.fh-hb-effect-glow .fh-hb-story-card,
#fh-preland-root.fh-hb-effect-glow .fh-hb-media-card{box-shadow:0 28px 76px color-mix(in srgb,var(--hb-accent) 16%,rgba(30,54,92,.12))}
#fh-preland-root.fh-hb-effect-pulse .fh-hb-btn-tg{animation:fhHbScenePulse 2.3s ease-in-out infinite}
#fh-preland-root.fh-hb-effect-fadein .fh-hb-copy,
#fh-preland-root.fh-hb-effect-fadein .fh-hb-bottom,
#fh-preland-root.fh-hb-effect-fadein .fh-hb-section{animation:fhHbSceneIn .55s ease both}
#fh-preland-root.fh-hb-effect-micro .fh-hb-story-card,
#fh-preland-root.fh-hb-effect-micro .fh-hb-value-card{transition:transform .2s ease,box-shadow .2s ease}
#fh-preland-root.fh-hb-effect-micro .fh-hb-story-card:hover,
#fh-preland-root.fh-hb-effect-micro .fh-hb-value-card:hover{transform:translateY(-3px)}
@keyframes fhHbScenePulse{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes fhHbSceneIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.wh-landing-buttons,.wh-widget{display:none!important}
@media(max-width:1100px){
  #fh-preland-root .fh-hb-hero,
  #fh-preland-root.fh-hb-layout-classic .fh-hb-hero,
  #fh-preland-root.fh-hb-layout-cards .fh-hb-hero,
  #fh-preland-root.fh-hb-layout-timeline .fh-hb-hero{grid-template-columns:1fr}
  #fh-preland-root .fh-hb-stage{min-height:auto;padding-top:clamp(270px,58vw,430px);background:linear-gradient(180deg,#f9fcff 0%,#f4f9ff 100%)}
  #fh-preland-root .fh-hb-stage:before{background:linear-gradient(180deg,rgba(249,252,255,.04) 0%,rgba(249,252,255,.50) 46%,rgba(249,252,255,.98) 100%)}
  #fh-preland-root .fh-hb-scene{bottom:auto;height:clamp(300px,64vw,480px);border-radius:0 0 28px 28px}
  #fh-preland-root .fh-hb-scene img{object-position:center 24%;filter:saturate(1.08) contrast(1.04) brightness(.98)}
  #fh-preland-root .fh-hb-scene:after{opacity:.16;mask-image:linear-gradient(180deg,#000 0%,rgba(0,0,0,.62) 48%,transparent 100%)}
  #fh-preland-root .fh-hb-bottom{grid-column:1;width:100%;grid-template-columns:1fr}
  #fh-preland-root .fh-hb-section-grid,
  #fh-preland-root .fh-hb-cta{grid-template-columns:1fr}
}
@media(max-width:820px){
  #fh-preland-root .fh-hb-wrap,
  #fh-preland-root .fh-hb-section,
  #fh-preland-root .fh-hb-legal,
  #fh-preland-root .fh-hb-policy,
  #fh-preland-root .fh-hb-policy-error{width:calc(100% - 24px)}
  #fh-preland-root .fh-hb-hero{padding:16px 0 18px;gap:12px}
  #fh-preland-root .fh-hb-copy{width:100%;max-width:100%;min-width:0;padding:16px;border-radius:24px;background:rgba(255,255,255,.86);border:1px solid rgba(22,34,57,.10);box-shadow:0 20px 54px rgba(30,54,92,.12);backdrop-filter:blur(10px)}
  #fh-preland-root .fh-hb-title{max-width:100%;font-size:clamp(28px,7.8vw,42px);line-height:1.02;letter-spacing:-.025em;overflow-wrap:anywhere;word-break:normal;text-wrap:wrap}
  #fh-preland-root .fh-hb-lead{max-width:100%;font-size:15px;overflow-wrap:anywhere}
  #fh-preland-root .fh-hb-method{width:100%;font-size:14px;border-radius:16px}
  #fh-preland-root .fh-hb-proof{display:grid;grid-template-columns:1fr;gap:7px}
  #fh-preland-root .fh-hb-proof li{width:100%;font-size:11px;padding:8px 10px}
  #fh-preland-root .fh-hb-story-row,
  #fh-preland-root .fh-hb-value-grid,
  #fh-preland-root .fh-hb-buttons{grid-template-columns:1fr}
  #fh-preland-root .fh-hb-story-card{min-height:auto}
  #fh-preland-root .fh-hb-section{border-radius:28px;margin-top:18px}
  #fh-preland-root .fh-hb-section-grid,
  #fh-preland-root .fh-hb-cta{padding:22px}
  #fh-preland-root .fh-hb-value-grid{padding:0 22px 22px}
  #fh-preland-root .fh-hb-section-title,
  #fh-preland-root .fh-hb-cta-title{font-size:clamp(32px,9vw,50px)}
  #fh-preland-root .fh-hb-media-card{min-height:260px}
  #fh-preland-root .fh-hb-btn{min-height:66px}
}
@media(max-width:520px){
  #fh-preland-root .fh-hb-stage{padding-top:clamp(250px,76vw,340px)}
  #fh-preland-root .fh-hb-scene{height:clamp(270px,84vw,360px)}
  #fh-preland-root .fh-hb-scene img{object-position:center 18%}
  #fh-preland-root .fh-hb-copy{padding:14px}
  #fh-preland-root .fh-hb-title{font-size:clamp(25px,7.2vw,34px);line-height:1.04}
  #fh-preland-root .fh-hb-method{margin-top:14px}
  #fh-preland-root .fh-hb-proof{margin-top:14px}
}
</style>
<div id="fh-preland-root" class="${rootClass}" style="${esc(rootStyle)}">
  <main class="fh-hb-stage">
    <div class="fh-hb-scene" aria-hidden="true">
      ${heroImageHtml}
    </div>
    <div class="fh-hb-wrap">
      <section class="fh-hb-hero" aria-label="Главный экран">
        <div class="fh-hb-copy">
          <div class="fh-hb-kicker">${esc(badge)}</div>
          <h1 class="fh-hb-title">${titleHtml}</h1>
          <p class="fh-hb-lead">${esc(leadText)}</p>
          ${methodHtml}
          ${proofListHtml}
        </div>
        <div class="fh-hb-bottom">
          <div class="fh-hb-story-row">${cardsHtml}</div>
          <div class="fh-hb-actions">
            ${actionNoteHtml}
            <div class="fh-hb-buttons" aria-label="Открыть форму регистрации">
              ${renderAtmospaceRegistrationButton('fh-hb-btn fh-hb-btn-tg')}
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>

  <section class="fh-hb-section" aria-label="Что внутри">
    <div class="fh-hb-section-grid">
      <div>
        <div class="fh-hb-section-label">Что покажем внутри</div>
        <h2 class="fh-hb-section-title">${esc(content.valueTitle || leadText)}</h2>
      </div>
      <div class="${valueMediaClass}" aria-hidden="true">
        ${valueImageHtml}
      </div>
    </div>
    <div class="fh-hb-value-grid">${valueHtml}</div>
  </section>

  <section class="fh-hb-section fh-hb-cta" aria-label="Финальный призыв">
    <div>
      <div class="fh-hb-section-label">Следующий шаг</div>
      <h2 class="fh-hb-cta-title">${esc(ctaTitle)}</h2>
      <p class="fh-hb-cta-sub">${esc(ctaSubtitle)}</p>
      <div class="fh-hb-buttons" aria-label="Открыть форму регистрации">
        ${renderAtmospaceRegistrationButton('fh-hb-btn fh-hb-btn-tg')}
      </div>
    </div>
    <div class="${ctaMediaClass}" aria-hidden="true">
      ${ctaImageHtml}
    </div>
  </section>
  <p class="fh-hb-legal">Регистрация, согласие и пароль обрабатываются только на защищённой странице Atmospace.</p>
</div>
${buildAtmospacePrelandingTrackingScript()}`;
}

function renderNatureEditorialPrelanding({ content, projectData, landingMeta, sceneImage, valueImage, ctaImage, style, palette, layout, effects }) {
  const selectedPalette = PALETTES.find(item => item[0] === palette) || PALETTES.find(item => item[0] === 'white-gold-ad') || PALETTES[0];
  const paletteColors = selectedPalette?.[3] || ['#6f7554', '#b96b4e', '#f7f4ed'];
  const titleText = stripHtml(content.titleHtml || content.title || 'Книги прочитаны. А жизнь всё ещё не меняется?');
  const titleWords = titleText.split(/\s+/).filter(Boolean);
  const accentCount = titleWords.length > 7 ? 4 : Math.max(1, Math.ceil(titleWords.length / 3));
  const titleHtml = titleWords.length > 2
    ? `${esc(titleWords.slice(0, -accentCount).join(' '))} <em>${esc(titleWords.slice(-accentCount).join(' '))}</em>`
    : `<em>${esc(titleText)}</em>`;
  const leadText = content.trustTitle || content.valueTitle || 'Короткий разбор показывает, почему знания, планы и желания не переходят в устойчивое действие.';
  const ctaLead = content.actionSubtitle || content.ctaLead || buildTildaCtaLead(titleText, leadText);
  const cards = (content.cards?.length ? content.cards : buildTildaStoryCards(titleText)).slice(0, 3);
  const valueItems = (content.valueItems?.length ? content.valueItems : cards.map(item => item.text)).slice(0, 3);
  const images = [
    bothelpImageSrc(sceneImage || PRELANDING_FALLBACK_IMAGES[0]),
    bothelpImageSrc(valueImage || PRELANDING_FALLBACK_IMAGES[1]),
    bothelpImageSrc(ctaImage || PRELANDING_FALLBACK_IMAGES[2])
  ];
  const theme = `${style || ''} ${palette || ''}`.toLowerCase();
  const rootTone = theme.includes('terra') || theme.includes('coral')
    ? 'fh-nd-tone-terra'
    : theme.includes('forest') || theme.includes('green')
      ? 'fh-nd-tone-forest'
      : 'fh-nd-tone-sage';
  const rootClass = [
    'fh-nd26',
    rootTone,
    `fh-nd-layout-${prelandingClassToken(layout || 'split')}`,
    ...(Array.isArray(effects) ? effects.map(item => `fh-nd-effect-${prelandingClassToken(item)}`) : [])
  ].filter(Boolean).join(' ');
  const rootStyle = [
    `--nd-olive:${paletteColors[0] || '#6f7554'}`,
    `--nd-terra:${paletteColors[1] || '#b96b4e'}`,
    `--nd-cloud:${paletteColors[2] || '#f7f4ed'}`
  ].join(';');
  const cssUrl = (url) => String(url || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const bg = (url, overlay = 'linear-gradient(180deg,rgba(37,35,30,.04),rgba(37,35,30,.18))') => (
    url
      ? `${overlay},url('${cssUrl(url)}')`
      : 'linear-gradient(135deg,rgba(111,117,84,.18),rgba(185,107,78,.12)),linear-gradient(135deg,#fbfaf6,#ede7dc)'
  );
  const cardsHtml = cards.map((item, index) => {
    const cardImage = images[index % images.length];
    return `<article class="fh-nd-card">
      <div class="fh-nd-photo" style="background-image:${esc(bg(cardImage))}"></div>
      <div class="fh-nd-num">${String(index + 1).padStart(2, '0')}</div>
      <h3>${esc(item?.title || `Смысл ${index + 1}`)}</h3>
      <p>${esc(item?.text || valueItems[index] || 'Понятный шаг без лишней теории.')}</p>
    </article>`;
  }).join('');
  const stepsHtml = valueItems.map((item, index) => `<div class="fh-nd-step">
    <i>${index + 1}</i>
    <div><b>${esc(cards[index]?.title || `Шаг ${index + 1}`)}</b><span>${esc(item)}</span></div>
  </div>`).join('');
  const heroNote = content.methodName || content.liveNote || 'Не ещё читать. Начать применять.';
  const badge = content.badge || 'Короткий практический разбор';
  const finalTitle = content.actionTitle || 'Начните с короткого разбора';
  const finalText = content.actionSubtitle || 'Ответьте на четыре вопроса и продолжите на защищённой странице регистрации Atmospace.';

  return `${buildAtmospaceHeadConfig({
  projectData,
  ...(landingMeta || {})
})}
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;700;800;900&display=swap');
#fh-preland-root.fh-nd26,
#fh-preland-root.fh-nd26 *{box-sizing:border-box}
#fh-preland-root.fh-nd26{
  --nd-paper:#fbfaf6;
  --nd-ink:#25231e;
  --nd-muted:#746e63;
  --nd-line:rgba(55,48,38,.15);
  --nd-sage:#a9b49b;
  --nd-shadow:0 28px 70px rgba(70,58,40,.13);
  width:100vw;
  min-height:100vh;
  margin-left:calc(50% - 50vw);
  margin-right:calc(50% - 50vw);
  color:var(--nd-ink);
  font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  background:
    radial-gradient(circle at 12% 14%,rgba(185,107,78,.16),transparent 28%),
    radial-gradient(circle at 86% 20%,rgba(111,117,84,.16),transparent 30%),
    linear-gradient(180deg,#f0eee9 0%,#f7f4ed 54%,#efeae1 100%);
  overflow:hidden;
  -webkit-font-smoothing:antialiased;
}
#fh-preland-root.fh-nd-tone-terra{--nd-olive:#7c6b46;--nd-terra:#c06445;--nd-cloud:#fff6ee}
#fh-preland-root.fh-nd-tone-forest{--nd-olive:#3f6b4a;--nd-terra:#9b7a35;--nd-cloud:#f2f8ef}
#fh-preland-root.fh-nd26 a{text-decoration:none;color:inherit}
#fh-preland-root.fh-nd26:before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  opacity:.28;
  background-image:radial-gradient(rgba(37,35,30,.12) .45px,transparent .45px),linear-gradient(90deg,rgba(37,35,30,.035) 1px,transparent 1px);
  background-size:5px 5px,64px 64px;
}
#fh-preland-root .fh-nd-wrap{width:min(1120px,calc(100% - 34px));margin:auto;position:relative;z-index:2}
#fh-preland-root .fh-nd-hero{min-height:100svh;padding:52px 0 68px;display:flex;align-items:center}
#fh-preland-root .fh-nd-grid{display:grid;grid-template-columns:1fr 1.02fr;gap:46px;align-items:center}
#fh-preland-root .fh-nd-kicker{display:inline-flex;align-items:center;gap:10px;font-size:11px;letter-spacing:.20em;text-transform:uppercase;color:var(--nd-muted);font-weight:900;margin-bottom:26px}
#fh-preland-root .fh-nd-kicker:before{content:"";width:10px;height:10px;border-radius:50%;background:var(--nd-olive);box-shadow:0 0 0 7px rgba(111,117,84,.10)}
#fh-preland-root .fh-nd-title{font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(52px,7.5vw,94px);line-height:.9;letter-spacing:-.045em;font-weight:600;margin:0 0 28px;text-wrap:balance}
#fh-preland-root .fh-nd-title em{font-style:normal;color:var(--nd-terra)}
#fh-preland-root .fh-nd-lead{font-size:19px;line-height:1.66;color:var(--nd-muted);max-width:560px;margin:0 0 30px}
#fh-preland-root .fh-nd-lead b{color:var(--nd-ink)}
#fh-preland-root .fh-nd-buttons{display:flex;gap:14px;flex-wrap:wrap;margin:0 0 24px}
#fh-preland-root .fh-nd-btn{min-height:64px;padding:0 24px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:12px;border:1px solid var(--nd-line);font-size:15px;font-weight:900;box-shadow:0 16px 40px rgba(70,58,40,.08);transition:transform .22s ease,filter .22s ease;text-decoration:none!important}
#fh-preland-root .fh-nd-btn:hover{transform:translateY(-3px);filter:brightness(1.03)}
#fh-preland-root .fh-nd-btn-tg{background:var(--nd-olive);color:#fff!important;-webkit-text-fill-color:#fff!important;border-color:var(--nd-olive)}
#fh-preland-root .fh-nd-btn-max{background:rgba(255,255,255,.62);backdrop-filter:blur(10px);color:var(--nd-ink)!important}
#fh-preland-root .fh-nd-note{display:flex;gap:10px;align-items:flex-start;color:var(--nd-muted);font-size:13px;line-height:1.45;max-width:520px}
#fh-preland-root .fh-nd-note i{font-style:normal;width:24px;height:24px;border-radius:50%;border:1px solid var(--nd-line);display:grid;place-items:center;flex:0 0 auto;background:rgba(255,255,255,.45)}
#fh-preland-root .fh-nd-art{min-height:650px;position:relative;border-radius:38px;background:var(--nd-paper);border:1px solid rgba(255,255,255,.72);box-shadow:var(--nd-shadow);overflow:hidden;padding:24px}
#fh-preland-root .fh-nd-big{position:absolute;right:24px;top:24px;width:62%;height:72%;border-radius:32px;overflow:hidden;background-size:cover;background-position:center;box-shadow:0 24px 60px rgba(70,58,40,.16);z-index:2}
#fh-preland-root .fh-nd-small{position:absolute;left:24px;bottom:28px;width:48%;height:42%;border-radius:30px;overflow:hidden;background-size:cover;background-position:center;box-shadow:0 22px 50px rgba(70,58,40,.15);z-index:3}
#fh-preland-root .fh-nd-paper{position:absolute;left:48px;top:70px;width:245px;padding:24px;border-radius:24px;background:rgba(255,255,255,.74);border:1px solid rgba(255,255,255,.76);backdrop-filter:blur(12px);box-shadow:0 18px 50px rgba(70,58,40,.12);z-index:4}
#fh-preland-root .fh-nd-paper b{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;line-height:.95;font-weight:700;margin-bottom:12px}
#fh-preland-root .fh-nd-paper span{display:block;color:var(--nd-muted);font-size:14px;line-height:1.45}
#fh-preland-root .fh-nd-quote{position:absolute;right:46px;bottom:52px;width:300px;padding:22px;border-radius:26px;background:rgba(240,238,233,.78);border:1px solid rgba(255,255,255,.70);backdrop-filter:blur(12px);box-shadow:0 18px 50px rgba(70,58,40,.12);z-index:5}
#fh-preland-root .fh-nd-quote small{display:block;text-transform:uppercase;letter-spacing:.18em;color:var(--nd-terra);font-size:10px;font-weight:900;margin-bottom:8px}
#fh-preland-root .fh-nd-quote p{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;line-height:1.05}
#fh-preland-root .fh-nd-leaf{position:absolute;left:36px;top:38%;width:150px;height:150px;border:1px solid rgba(80,87,61,.22);border-radius:80% 0 80% 0;transform:rotate(-24deg);z-index:2}
#fh-preland-root .fh-nd-section{padding:84px 0}
#fh-preland-root .fh-nd-head{text-align:center;max-width:800px;margin:0 auto 34px}
#fh-preland-root .fh-nd-head h2,#fh-preland-root .fh-nd-panel h2,#fh-preland-root .fh-nd-final h2{font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(42px,6vw,70px);line-height:.96;letter-spacing:-.035em;margin:0 0 16px;font-weight:600}
#fh-preland-root .fh-nd-head p,#fh-preland-root .fh-nd-panel p,#fh-preland-root .fh-nd-final p{margin:0;color:var(--nd-muted);font-size:18px;line-height:1.58}
#fh-preland-root .fh-nd-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
#fh-preland-root .fh-nd-card{background:rgba(255,255,255,.60);border:1px solid rgba(255,255,255,.72);border-radius:28px;padding:18px;box-shadow:0 18px 44px rgba(70,58,40,.08);backdrop-filter:blur(10px)}
#fh-preland-root .fh-nd-photo{height:178px;border-radius:22px;background-size:cover;background-position:center;margin-bottom:20px;position:relative;overflow:hidden}
#fh-preland-root .fh-nd-num{font-size:12px;letter-spacing:.20em;text-transform:uppercase;color:var(--nd-terra);font-weight:900;margin-bottom:10px}
#fh-preland-root .fh-nd-card h3{font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;line-height:1;margin:0 0 10px;font-weight:700}
#fh-preland-root .fh-nd-card p{color:var(--nd-muted);line-height:1.55;margin:0;font-size:15px}
#fh-preland-root .fh-nd-panel{border-radius:36px;padding:46px;background:rgba(255,255,255,.62);border:1px solid rgba(255,255,255,.78);box-shadow:var(--nd-shadow);backdrop-filter:blur(10px);display:grid;grid-template-columns:.94fr 1.06fr;gap:34px;align-items:center}
#fh-preland-root .fh-nd-panel h2 em{font-style:normal;color:var(--nd-terra)}
#fh-preland-root .fh-nd-steps{display:grid;gap:12px}
#fh-preland-root .fh-nd-step{padding:20px;border-radius:22px;background:var(--nd-paper);border:1px solid var(--nd-line);display:grid;grid-template-columns:46px 1fr;gap:14px;align-items:start}
#fh-preland-root .fh-nd-step i{width:46px;height:46px;border-radius:50%;border:1px solid var(--nd-line);display:grid;place-items:center;font-style:normal;color:var(--nd-olive);font-weight:900}
#fh-preland-root .fh-nd-step b{display:block;margin-bottom:6px;font-size:17px}
#fh-preland-root .fh-nd-step span{display:block;color:var(--nd-muted);font-size:14px;line-height:1.45}
#fh-preland-root .fh-nd-final{padding:0 0 94px}
#fh-preland-root .fh-nd-box{text-align:center;border-radius:36px;background:linear-gradient(135deg,rgba(111,117,84,.12),rgba(185,107,78,.09)),rgba(255,255,255,.60);border:1px solid rgba(255,255,255,.78);padding:48px 28px;box-shadow:var(--nd-shadow);backdrop-filter:blur(10px)}
#fh-preland-root .fh-nd-box p{margin:0 auto 26px;max-width:680px}
#fh-preland-root .fh-nd-box .fh-nd-buttons{justify-content:center}
#fh-preland-root .fh-nd-policy,#fh-preland-root .fh-nd-policy-error,#fh-preland-root .fh-nd-legal{width:min(920px,calc(100% - 48px));margin:18px auto 0;position:relative;z-index:2}
#fh-preland-root .fh-nd-policy{display:flex;gap:12px;align-items:flex-start;padding:16px 18px;border-radius:20px;background:rgba(255,255,255,.74);border:1px solid rgba(55,48,38,.12);box-shadow:0 14px 34px rgba(70,58,40,.06);color:var(--nd-muted);font:650 13px/1.55 'Inter',system-ui,sans-serif}
#fh-preland-root .fh-nd-policy input{width:18px;height:18px;margin:2px 0 0;flex:0 0 18px;accent-color:var(--nd-olive)}
#fh-preland-root .fh-nd-policy a{color:var(--nd-olive);font-weight:850;text-decoration:underline;text-underline-offset:2px}
#fh-preland-root .fh-nd-policy-error{display:none;color:#b45336;font:850 13px/1.4 'Inter',system-ui,sans-serif;text-align:center}
#fh-preland-root .fh-nd-legal{color:#8a8174;font:600 12px/1.5 'Inter',system-ui,sans-serif;text-align:center}
#fh-preland-root.fh-nd-effect-micro .fh-nd-card,#fh-preland-root.fh-nd-effect-micro .fh-nd-btn{transition:transform .22s ease,box-shadow .22s ease}
#fh-preland-root.fh-nd-effect-micro .fh-nd-card:hover{transform:translateY(-3px)}
#fh-preland-root.fh-nd-effect-fadein .fh-nd-copy,#fh-preland-root.fh-nd-effect-fadein .fh-nd-art,#fh-preland-root.fh-nd-effect-fadein .fh-nd-card,#fh-preland-root.fh-nd-effect-fadein .fh-nd-panel{animation:fhNdIn .55s ease both}
@keyframes fhNdIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.wh-landing-buttons,.wh-widget{display:none!important}
@media(max-width:940px){
  #fh-preland-root .fh-nd-grid,#fh-preland-root .fh-nd-cards,#fh-preland-root .fh-nd-panel{grid-template-columns:1fr}
  #fh-preland-root .fh-nd-hero{padding-top:44px}
  #fh-preland-root .fh-nd-art{min-height:560px}
  #fh-preland-root .fh-nd-big{width:68%}
}
@media(max-width:560px){
  #fh-preland-root .fh-nd-wrap{width:calc(100% - 24px)}
  #fh-preland-root .fh-nd-hero{min-height:auto;padding:32px 0 44px}
  #fh-preland-root .fh-nd-title{font-size:46px;line-height:.94}
  #fh-preland-root .fh-nd-lead{font-size:16px}
  #fh-preland-root .fh-nd-buttons{display:grid}
  #fh-preland-root .fh-nd-btn{width:100%;min-height:60px}
  #fh-preland-root .fh-nd-art{min-height:460px;border-radius:28px}
  #fh-preland-root .fh-nd-big{right:16px;top:16px;width:70%;height:62%;border-radius:24px}
  #fh-preland-root .fh-nd-small{left:16px;bottom:18px;width:58%;height:36%;border-radius:24px}
  #fh-preland-root .fh-nd-paper{left:18px;top:44px;width:190px;padding:18px}
  #fh-preland-root .fh-nd-paper b{font-size:27px}
  #fh-preland-root .fh-nd-quote{right:16px;bottom:38px;width:220px;padding:17px}
  #fh-preland-root .fh-nd-quote p{font-size:22px}
  #fh-preland-root .fh-nd-leaf{display:none}
  #fh-preland-root .fh-nd-section{padding:58px 0}
  #fh-preland-root .fh-nd-panel{padding:28px}
  #fh-preland-root .fh-nd-final{padding-bottom:52px}
}
</style>
<div id="fh-preland-root" class="${rootClass}" style="${esc(rootStyle)}">
  <section class="fh-nd-hero" aria-label="Главный экран">
    <div class="fh-nd-wrap fh-nd-grid">
      <div class="fh-nd-copy">
        <div class="fh-nd-kicker">${esc(badge)}</div>
        <h1 class="fh-nd-title">${titleHtml}</h1>
        <p class="fh-nd-lead">${esc(leadText)}</p>
        <div class="fh-nd-buttons" aria-label="Открыть форму регистрации">
          ${renderAtmospaceRegistrationButton('fh-nd-btn fh-nd-btn-tg')}
        </div>
        <div class="fh-nd-note"><i>✓</i><span>${esc(ctaLead)}</span></div>
      </div>

      <div class="fh-nd-art" aria-hidden="true">
        <div class="fh-nd-big" style="background-image:${esc(bg(images[0]))}"></div>
        <div class="fh-nd-small" style="background-image:${esc(bg(images[1]))}"></div>
        <div class="fh-nd-leaf"></div>
        <div class="fh-nd-paper"><b>${esc(cards[0]?.title || 'Знание ≠ движение')}</b><span>${esc(cards[0]?.text || 'Инсайт становится результатом только после внедрения в ежедневную систему.')}</span></div>
        <div class="fh-nd-quote"><small>точка входа</small><p>${esc(heroNote)}</p></div>
      </div>
    </div>
  </section>

  <section class="fh-nd-section" aria-label="Знакомый сценарий">
    <div class="fh-nd-wrap">
      <div class="fh-nd-head">
        <div class="fh-nd-kicker">Знакомый сценарий</div>
        <h2>${esc(content.painTitle || 'Когда желание есть, а движение не закрепляется')}</h2>
        <p>${esc(content.painAlert || 'Показываем человеку не ещё одну теорию, а понятный вход в действие через короткий разбор.')}</p>
      </div>
      <div class="fh-nd-cards">${cardsHtml}</div>
    </div>
  </section>

  <section class="fh-nd-section" aria-label="Механика">
    <div class="fh-nd-wrap">
      <div class="fh-nd-panel">
        <div>
          <div class="fh-nd-kicker">Суть проста</div>
          <h2>${esc(content.trustSmall || 'Смысл не в новой информации.')} <em>${esc(content.methodName || 'Смысл в первом действии.')}</em></h2>
          <p>${esc(content.valueTitle || 'Разбор переводит внимание человека из состояния “надо когда-нибудь” в понятный ближайший шаг.')}</p>
        </div>
        <div class="fh-nd-steps">${stepsHtml}</div>
      </div>
    </div>
  </section>

  <section class="fh-nd-final" aria-label="Финальный призыв">
    <div class="fh-nd-wrap">
      <div class="fh-nd-box">
        <h2>${esc(finalTitle)}</h2>
        <p>${esc(finalText)}</p>
        <div class="fh-nd-buttons" aria-label="Открыть форму регистрации">
          ${renderAtmospaceRegistrationButton('fh-nd-btn fh-nd-btn-tg')}
        </div>
      </div>
    </div>
  </section>
  <p class="fh-nd-legal">Регистрация и согласие выполняются на защищённой странице Atmospace.</p>
</div>
${buildAtmospacePrelandingTrackingScript()}`;
}

function renderMinimalComparePrelanding({ content, projectData, landingMeta, style, palette, layout, effects }) {
  const selectedStyle = style || 'minimal-noir';
  const selectedPalette = palette || 'black-yellow-ad';
  const titleText = stripHtml(content.titleHtml || content.title || 'Смотрю на других и думаю: почему у меня не так?');
  const titleWords = titleText.split(/\s+/).filter(Boolean);
  const accentCount = titleWords.length > 6 ? Math.max(2, Math.ceil(titleWords.length / 3)) : 2;
  const titleHtml = /<\/?[a-z][\s\S]*>/i.test(String(content.titleHtml || ''))
    ? content.titleHtml
    : titleWords.length > accentCount
      ? `${esc(titleWords.slice(0, -accentCount).join(' '))} <span>${esc(titleWords.slice(-accentCount).join(' '))}</span>`
      : `<span>${esc(titleText)}</span>`;
  const leadText = content.trustTitle || content.valueTitle || 'Это не зависть и не слабость. Часто чужая жизнь цепляет именно там, где ваша собственная давно стоит на паузе.';
  const miniItems = (content.valueItems?.length ? content.valueItems : [
    'Если кажется, что все вокруг уже движутся, а вы всё ещё ждёте подходящий момент.',
    'Если внутри есть ощущение: “я тоже хочу иначе”, но непонятно, с чего начать.',
    'Если хочется не мотивации на вечер, а понятного первого шага.'
  ]).slice(0, 3);
  const cards = (content.cards?.length ? content.cards : miniItems.map((text, index) => ({
    title: ['Сравнение', 'Пауза', 'Первый шаг'][index] || `Смысл ${index + 1}`,
    text
  }))).slice(0, 3);
  const rootTone = selectedStyle.includes('blue') || selectedPalette.includes('blue')
    ? 'fh-mc-tone-blue'
    : selectedStyle.includes('graphite') || selectedPalette.includes('clean')
      ? 'fh-mc-tone-graphite'
      : 'fh-mc-tone-noir';
  const rootClass = [
    'fh-mc26',
    rootTone,
    `fh-mc-layout-${prelandingClassToken(layout || 'minimal')}`,
    ...(Array.isArray(effects) ? effects.map(item => `fh-mc-effect-${prelandingClassToken(item)}`) : [])
  ].filter(Boolean).join(' ');
  const badge = content.badge || 'Тихое сравнение';
  const buttonLead = content.ctaLead || content.actionSubtitle || 'Следующий шаг откроется на защищённой странице регистрации Atmospace.';
  const miniHtml = miniItems.map((item) => `<div class="fh-mc-mini-item"><span class="fh-mc-mini-dot"></span><span>${esc(item)}</span></div>`).join('');
  const cardsHtml = cards.map((item, index) => `<article class="fh-mc-proof-card">
    <div class="fh-mc-proof-num">${String(index + 1).padStart(2, '0')}</div>
    <h3>${esc(item?.title || `Смысл ${index + 1}`)}</h3>
    <p>${esc(item?.text || miniItems[index] || 'Короткий смысл перед первым шагом.')}</p>
  </article>`).join('');

  return `${buildAtmospaceHeadConfig({
  projectData,
  ...(landingMeta || {})
})}
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&display=swap');
#fh-preland-root.fh-mc26,
#fh-preland-root.fh-mc26 *{box-sizing:border-box}
#fh-preland-root.fh-mc26{
  --mc-bg:#090909;
  --mc-bg2:#0d0d0d;
  --mc-text:#ffffff;
  --mc-muted:#8b8b8b;
  --mc-line:#252525;
  --mc-soft:#151515;
  --mc-accent:#ffffff;
  width:100vw;
  min-height:100vh;
  margin-left:calc(50% - 50vw);
  margin-right:calc(50% - 50vw);
  color:var(--mc-text);
  background:
    radial-gradient(circle at 82% 18%,rgba(255,255,255,.08),transparent 22%),
    radial-gradient(circle at 10% 90%,rgba(255,255,255,.06),transparent 26%),
    linear-gradient(180deg,var(--mc-bg) 0%,var(--mc-bg2) 56%,#070707 100%);
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  overflow:hidden;
  -webkit-font-smoothing:antialiased;
}
#fh-preland-root.fh-mc-tone-blue{--mc-bg:#06101f;--mc-bg2:#08182c;--mc-muted:#91a2bd;--mc-line:rgba(148,163,184,.22);--mc-soft:rgba(15,31,55,.72);--mc-accent:#73b8ff}
#fh-preland-root.fh-mc-tone-graphite{--mc-bg:#101114;--mc-bg2:#15171c;--mc-muted:#a3a7b0;--mc-line:rgba(255,255,255,.16);--mc-soft:rgba(255,255,255,.045);--mc-accent:#f3f4f6}
#fh-preland-root.fh-mc26 a{color:inherit;text-decoration:none}
#fh-preland-root .fh-mc-page{min-height:100vh;display:flex;align-items:center;padding:64px 0}
#fh-preland-root .fh-mc-container{width:min(680px,calc(100% - 44px));margin:0 auto}
#fh-preland-root .fh-mc-kicker{font-size:10px;letter-spacing:.30em;text-transform:uppercase;color:#5a5a5a;margin-bottom:24px;font-weight:800}
#fh-preland-root.fh-mc-tone-blue .fh-mc-kicker{color:#86a7d8}
#fh-preland-root .fh-mc-title{font-size:clamp(38px,7vw,64px);font-weight:850;line-height:1.04;margin:0 0 30px;letter-spacing:-.055em;text-wrap:balance}
#fh-preland-root .fh-mc-title span{color:var(--mc-accent)}
#fh-preland-root .fh-mc-description{font-size:16px;color:var(--mc-muted);line-height:1.68;margin:0 0 42px;max-width:590px}
#fh-preland-root .fh-mc-description strong{color:#fff;font-weight:750}
#fh-preland-root .fh-mc-divider{width:100%;height:1px;background:linear-gradient(90deg,var(--mc-line),transparent);margin:0 0 28px}
#fh-preland-root .fh-mc-mini{display:grid;gap:10px;margin:0 0 34px}
#fh-preland-root .fh-mc-mini-item{display:flex;gap:12px;align-items:flex-start;color:#777;font-size:13px;line-height:1.45}
#fh-preland-root.fh-mc-tone-blue .fh-mc-mini-item,#fh-preland-root.fh-mc-tone-graphite .fh-mc-mini-item{color:var(--mc-muted)}
#fh-preland-root .fh-mc-mini-dot{width:6px;height:6px;margin-top:7px;border-radius:50%;background:var(--mc-accent);opacity:.58;flex:0 0 auto}
#fh-preland-root .fh-mc-proof{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 34px}
#fh-preland-root .fh-mc-proof-card{min-height:148px;padding:18px;border:1px solid var(--mc-line);border-radius:6px;background:var(--mc-soft)}
#fh-preland-root .fh-mc-proof-num{font-size:10px;letter-spacing:.24em;color:#5a5a5a;font-weight:900;margin-bottom:16px}
#fh-preland-root .fh-mc-proof-card h3{margin:0 0 10px;color:#fff;font-size:16px;line-height:1.12;letter-spacing:-.02em;font-weight:850;text-transform:uppercase}
#fh-preland-root .fh-mc-proof-card p{margin:0;color:var(--mc-muted);font-size:12px;line-height:1.48;font-weight:500}
#fh-preland-root .fh-mc-btn-group{display:flex;flex-direction:column;gap:12px}
#fh-preland-root .fh-mc-btn{padding:18px 20px;border:1px solid var(--mc-line);border-radius:4px;text-align:center;text-decoration:none!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-size:14px;font-weight:500;transition:background .2s ease,color .2s ease,border-color .2s ease,transform .2s ease;cursor:pointer;background:transparent}
#fh-preland-root .fh-mc-btn:hover{transform:translateY(-1px);background:#fff;color:#000!important;-webkit-text-fill-color:#000!important;border-color:#fff}
#fh-preland-root .fh-mc-btn-primary{background:#fff;color:#000!important;-webkit-text-fill-color:#000!important;border-color:#fff;font-weight:800}
#fh-preland-root .fh-mc-btn-primary:hover{background:transparent;color:#fff!important;-webkit-text-fill-color:#fff!important}
#fh-preland-root.fh-mc-tone-blue .fh-mc-btn-primary{background:linear-gradient(135deg,#73b8ff,#2f6bff);border-color:rgba(115,184,255,.52);color:#fff!important;-webkit-text-fill-color:#fff!important}
#fh-preland-root .fh-mc-next{margin:14px 0 0;color:var(--mc-muted);font-size:11px;line-height:1.45}
#fh-preland-root .fh-mc-policy{margin-top:34px;font-size:10px;color:#555;line-height:1.5;display:flex;align-items:flex-start;gap:8px}
#fh-preland-root .fh-mc-policy input{width:14px;height:14px;margin:1px 0 0;accent-color:#fff;flex:0 0 auto}
#fh-preland-root .fh-mc-policy a{color:#777;text-decoration:underline;text-underline-offset:2px}
#fh-preland-root .fh-mc-error{display:none;margin-top:14px;font-size:12px;color:#c9c9c9}
#fh-preland-root .fh-mc-legal{margin:30px 0 0;color:#666;font-size:10px;line-height:1.55}
#fh-preland-root .fh-mc-legal a{color:#929292;text-decoration:underline;text-underline-offset:2px}
#fh-preland-root.fh-mc-effect-fadein .fh-mc-kicker,
#fh-preland-root.fh-mc-effect-fadein .fh-mc-title,
#fh-preland-root.fh-mc-effect-fadein .fh-mc-description,
#fh-preland-root.fh-mc-effect-fadein .fh-mc-mini,
#fh-preland-root.fh-mc-effect-fadein .fh-mc-proof,
#fh-preland-root.fh-mc-effect-fadein .fh-mc-btn-group{animation:fhMcIn .55s ease both}
#fh-preland-root.fh-mc-effect-fadein .fh-mc-title{animation-delay:.04s}
#fh-preland-root.fh-mc-effect-fadein .fh-mc-description{animation-delay:.08s}
#fh-preland-root.fh-mc-effect-fadein .fh-mc-mini{animation-delay:.12s}
#fh-preland-root.fh-mc-effect-fadein .fh-mc-proof{animation-delay:.16s}
#fh-preland-root.fh-mc-effect-fadein .fh-mc-btn-group{animation-delay:.20s}
@keyframes fhMcIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.wh-landing-buttons,.wh-widget{display:none!important}
@media(max-width:720px){
  #fh-preland-root .fh-mc-page{align-items:flex-start;padding:54px 0 42px}
  #fh-preland-root .fh-mc-container{width:calc(100% - 34px)}
  #fh-preland-root .fh-mc-title{font-size:clamp(32px,11vw,48px);letter-spacing:-.038em}
  #fh-preland-root .fh-mc-description{font-size:15px;margin-bottom:34px}
  #fh-preland-root .fh-mc-proof{grid-template-columns:1fr}
  #fh-preland-root .fh-mc-proof-card{min-height:auto}
  #fh-preland-root .fh-mc-btn{padding:17px 18px}
}
</style>
<div id="fh-preland-root" class="${rootClass}">
  <main class="fh-mc-page" aria-label="Тихий предлендинг">
    <div class="fh-mc-container">
      <div class="fh-mc-kicker">${esc(badge)}</div>
      <h1 class="fh-mc-title">${titleHtml}</h1>
      <p class="fh-mc-description">${esc(leadText)}</p>
      <div class="fh-mc-divider"></div>
      <div class="fh-mc-mini">${miniHtml}</div>
      <div class="fh-mc-proof" aria-label="Короткие смыслы">${cardsHtml}</div>
      <div class="fh-mc-btn-group" aria-label="Открыть форму регистрации">
        ${renderAtmospaceRegistrationButton('fh-mc-btn fh-mc-btn-primary')}
      </div>
      <p class="fh-mc-next">${esc(buttonLead)}</p>
      <p class="fh-mc-legal">Регистрация и согласие выполняются на защищённой странице Atmospace. <a href="https://modernisto.ru/politics" target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a>.</p>
    </div>
  </main>
</div>
${buildAtmospacePrelandingTrackingScript()}`;
}

function renderLegacyCoreMethodInlinePrelanding({ templateId, content, projectData, landingMeta, sceneImage, valueImage, ctaImage }) {
  const safeTemplateId = [1, 2, 3].includes(Number(templateId)) ? Number(templateId) : 1;
  const titleText = stripHtml(content.titleHtml || 'Откройте короткий разбор и первый понятный шаг');
  const titleHtml = content.titleHtml || esc(titleText);
  const images = [
    bothelpImageSrc(sceneImage || PRELANDING_FALLBACK_IMAGES[0]),
    bothelpImageSrc(valueImage || PRELANDING_FALLBACK_IMAGES[1]),
    bothelpImageSrc(ctaImage || PRELANDING_FALLBACK_IMAGES[2])
  ];
  const designClass = content.coreDesignClass || (safeTemplateId === 2 ? 'fh-theme-sky' : safeTemplateId === 3 ? 'fh-theme-lime' : 'fh-theme-ember');
  const heroLabel = safeTemplateId === 2 ? 'Цель → маршрут → действие' : safeTemplateId === 3 ? 'Доверие и ясность' : content.badge;
  const valueLabel = safeTemplateId === 2 ? 'Что человек увидит внутри' : safeTemplateId === 3 ? 'Почему это не очередная попытка' : 'Ключевая ценность';
  const ctaLead = content.actionSubtitle || 'Откройте короткий разбор и первый шаг.';
  const ctaTitle = content.actionTitle || 'ОТКРОЙТЕ ПЕРВЫЙ ШАГ';
  const pills = (content.pills || []).slice(0, 5).map(item => `<div class="pill"><span class="cross">✕</span>${esc(item)}</div>`).join('');
  const painRows = (content.painItems || []).slice(0, 4).map((item, index) => `<div class="scenario-row"><b>${index + 1}</b><span>${esc(item)}</span></div>`).join('');
  const benefits = (content.valueItems || []).slice(0, 3).map(item => `<li><div class="icon-arrow">➔</div><div>${esc(item)}</div></li>`).join('');
  return `${buildAtmospaceHeadConfig({
  projectData,
  ...(landingMeta || {})
})}
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap');
:root{
  --bg:#f4f7fb;
  --text:#0f172a;
  --muted:#475569;
  --blue:#2f6bff;
  --violet:#7c5cff;
  --pink:#ff4db8;
  --sun:#ffd54f;
  --green:#16a34a;
  --tg1:#00a3ff;
  --tg2:#0077ff;
  --max1:#ff1f5a;
  --max2:#e11d48;
  --shadow:0 24px 80px rgba(15,23,42,.08);
  --shadow2:0 18px 46px rgba(15,23,42,.08);
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  min-height:100vh;
  font-family:'Manrope',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  color:var(--text);
  background:
    radial-gradient(circle at 8% 12%,rgba(87,168,255,.22),transparent 28%),
    radial-gradient(circle at 92% 18%,rgba(255,77,184,.16),transparent 24%),
    radial-gradient(circle at 78% 82%,rgba(124,92,255,.14),transparent 22%),
    linear-gradient(180deg,#f8fbff 0%,#f4f7fb 44%,#eef4fb 100%);
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}
body:before{
  content:"";
  position:fixed;
  inset:0;
  background-image:
    linear-gradient(rgba(148,163,184,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(148,163,184,.05) 1px,transparent 1px);
  background-size:34px 34px;
  pointer-events:none;
  z-index:0;
}
.fh-theme-sky{--blue:#0ea5e9;--violet:#2563eb;--pink:#38bdf8;--sun:#facc15;--green:#0f766e}
.fh-theme-lime{--blue:#22c55e;--violet:#0f766e;--pink:#84cc16;--sun:#fde047;--green:#15803d}
.fh-theme-ember{--blue:#f97316;--violet:#ef4444;--pink:#facc15;--sun:#fde047;--green:#16a34a}
.page-shell{position:relative;z-index:1;width:100%;max-width:1180px;margin:0 auto;padding:28px 18px 56px}
.section-card{
  position:relative;
  overflow:hidden;
  background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.88));
  border:1px solid rgba(148,163,184,.18);
  border-radius:34px;
  box-shadow:var(--shadow);
  backdrop-filter:blur(16px);
}
.section-card:before{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.56),rgba(255,255,255,0));
  pointer-events:none;
}
.hero-card{padding:30px;margin-bottom:24px}
.hero-grid{position:relative;display:grid;grid-template-columns:minmax(0,1.04fr) minmax(360px,.96fr);gap:28px;align-items:center}
.fh-theme-sky .hero-grid{grid-template-columns:minmax(360px,.92fr) minmax(0,1.08fr)}
.fh-theme-sky .hero-copy{order:2}
.fh-theme-sky .hero-visual{order:1}
.hero-copy{position:relative;z-index:2;padding:12px 4px}
.top-badge,.card-label{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding:10px 18px;
  border-radius:999px;
  background:linear-gradient(135deg,rgba(124,92,255,.12),rgba(87,168,255,.14));
  border:1px solid rgba(124,92,255,.16);
  color:var(--violet);
  font-size:12px;
  font-weight:900;
  letter-spacing:.08em;
  text-transform:uppercase;
  margin-bottom:22px;
  box-shadow:0 10px 30px rgba(124,92,255,.08);
}
.top-badge:before,.card-label:before{
  content:"";
  width:8px;
  height:8px;
  border-radius:50%;
  background:linear-gradient(135deg,var(--blue),var(--pink));
  box-shadow:0 0 0 6px rgba(47,107,255,.08);
}
.hero-title{
  font-size:clamp(34px,5.5vw,58px);
  font-weight:900;
  line-height:1.04;
  letter-spacing:-.04em;
  margin-bottom:22px;
}
.hero-title span,.gradient-text{
  background:linear-gradient(135deg,var(--blue),var(--violet) 52%,var(--pink));
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}
.pills-container{display:flex;flex-wrap:wrap;gap:10px}
.pill{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding:12px 16px;
  background:rgba(255,255,255,.84);
  border-radius:999px;
  border:1px solid rgba(148,163,184,.16);
  box-shadow:0 10px 24px rgba(15,23,42,.04);
  color:var(--text);
  font-size:14px;
  font-weight:800;
}
.cross{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:24px;
  height:24px;
  border-radius:50%;
  background:linear-gradient(135deg,rgba(255,79,146,.12),rgba(255,112,176,.18));
  color:#ff4f92;
  font-size:14px;
  font-weight:900;
}
.photo-wrap{
  position:relative;
  z-index:2;
  width:100%;
  border-radius:32px;
  overflow:hidden;
  background:rgba(255,255,255,.74);
  border:1px solid rgba(148,163,184,.16);
  box-shadow:var(--shadow2);
  isolation:isolate;
}
.photo-wrap img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;filter:saturate(1.04) contrast(1.02);transform:scale(1.01)}
.photo-wrap:after{
  content:"";
  position:absolute;
  inset:0;
  z-index:1;
  background:
    radial-gradient(circle at 80% 18%,rgba(255,77,184,.13),transparent 34%),
    radial-gradient(circle at 12% 85%,rgba(87,168,255,.14),transparent 36%),
    linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.10));
  pointer-events:none;
}
.hero-visual{position:relative;min-height:470px;display:flex;align-items:center;justify-content:center}
.hero-visual:before{
  content:"";
  position:absolute;
  inset:28px 12px 18px;
  border-radius:36px;
  background:linear-gradient(180deg,rgba(255,255,255,.84),rgba(244,248,255,.92));
  border:1px solid rgba(148,163,184,.14);
}
.hero-photo{min-height:430px;transform:rotate(-1.5deg)}
.fh-theme-sky .hero-photo{transform:rotate(1.5deg)}
.fh-theme-lime .hero-photo{transform:none;border-radius:42px}
.scenario-card{padding:30px;margin-bottom:24px}
.scenario-grid{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);gap:22px;align-items:start}
.scenario-title{font-size:clamp(26px,3vw,40px);font-weight:900;line-height:1.05;letter-spacing:-.03em;margin-bottom:14px}
.scenario-alert{margin-top:18px;padding:18px 20px;border-radius:22px;background:linear-gradient(135deg,rgba(255,77,184,.10),rgba(47,107,255,.10));border:1px solid rgba(148,163,184,.18);font-size:18px;font-weight:850;line-height:1.32}
.scenario-list{display:grid;gap:12px}
.scenario-row{display:grid;grid-template-columns:46px minmax(0,1fr);gap:14px;align-items:center;padding:16px;border-radius:22px;background:rgba(255,255,255,.78);border:1px solid rgba(148,163,184,.16);box-shadow:0 10px 24px rgba(15,23,42,.04)}
.scenario-row b{width:46px;height:46px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,var(--blue),var(--violet));color:#fff;font-size:18px}
.scenario-row span{font-size:16px;font-weight:800;color:var(--muted);line-height:1.34}
.value-card{padding:34px;margin-bottom:24px}
.value-top{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(300px,.92fr);gap:24px;align-items:center;margin-bottom:26px}
.value-lead{font-size:clamp(20px,2.4vw,28px);font-weight:900;line-height:1.34;letter-spacing:-.02em;color:var(--text);max-width:720px}
.value-lead span{display:inline-block;padding:4px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(47,107,255,.10),rgba(124,92,255,.12));color:var(--blue);box-shadow:inset 0 0 0 1px rgba(47,107,255,.12);white-space:normal}
.info-visual{min-height:260px;border-radius:30px}
.benefits-list{position:relative;z-index:2;list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.benefits-list li{display:flex;align-items:flex-start;gap:14px;padding:22px 20px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,250,255,.92));border:1px solid rgba(148,163,184,.14);border-radius:22px;box-shadow:0 10px 26px rgba(15,23,42,.06)}
.icon-arrow{flex-shrink:0;width:42px;height:42px;border-radius:16px;background:linear-gradient(135deg,rgba(87,168,255,.18),rgba(124,92,255,.18));color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900}
.benefits-list li div:last-child{font-size:16px;font-weight:750;line-height:1.55;color:var(--muted)}
.cta-card{padding:34px}
.cta-shell{position:relative;z-index:2;overflow:hidden;padding:28px;border-radius:28px;background:radial-gradient(circle at 86% 18%,rgba(255,77,184,.12),transparent 24%),radial-gradient(circle at 12% 84%,rgba(87,168,255,.14),transparent 24%),linear-gradient(135deg,#f7fbff,#fff 48%,#f8f5ff);border:1px solid rgba(148,163,184,.12)}
.cta-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,420px);gap:26px;align-items:center;margin-bottom:26px}
.cta-subtitle{font-size:clamp(18px,2vw,24px);font-weight:800;line-height:1.35;color:var(--violet);margin-bottom:12px}
.cta-title{font-size:clamp(30px,4.1vw,46px);font-weight:900;line-height:1.08;letter-spacing:-.04em;color:var(--text);text-transform:uppercase}
.cta-visual{min-height:250px;border-radius:28px}
.buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;width:100%}
.btn{position:relative;display:flex;align-items:center;justify-content:center;width:100%;min-height:74px;padding:22px 24px;border-radius:22px;text-decoration:none!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-size:17px;font-weight:900;overflow:hidden;isolation:isolate;transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s ease}
.btn span{position:relative;z-index:2;color:#fff!important;-webkit-text-fill-color:#fff!important;text-decoration:none!important}
.btn:before{content:"";position:absolute;inset:1px;border-radius:21px;background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0));z-index:-1}
.btn:hover{transform:translateY(-3px)}
.btn-tg{background:linear-gradient(135deg,var(--tg1),var(--tg2));box-shadow:0 18px 34px rgba(0,119,255,.24)}
.btn-max{background:linear-gradient(135deg,var(--max1),var(--max2));box-shadow:0 18px 34px rgba(255,31,90,.22)}
.legal{margin-top:14px;color:#64748b;font-size:12px;line-height:1.42;text-align:center}
.policy-box{display:flex;align-items:flex-start;gap:12px;margin:18px auto 0;padding:16px 18px;border-radius:20px;background:rgba(255,255,255,.74);border:1px solid rgba(148,163,184,.16);box-shadow:0 14px 34px rgba(15,23,42,.06);color:#64748b;font-size:13px;line-height:1.55;text-align:left}
.policy-checkbox{width:18px;height:18px;margin:2px 0 0;flex:0 0 18px;accent-color:var(--blue);cursor:pointer}
.policy-box a{color:#1d4ed8;font-weight:850;text-decoration:underline;text-underline-offset:2px}
.policy-error{display:none;margin:8px auto 0;color:#b91c1c;font-size:13px;line-height:1.4;font-weight:850;text-align:center}
.wh-landing-buttons,.wh-widget{display:none!important}
@media(max-width:980px){
  .page-shell{max-width:860px}
  .hero-grid,.fh-theme-sky .hero-grid,.scenario-grid,.value-top,.cta-layout{grid-template-columns:1fr}
  .fh-theme-sky .hero-copy,.fh-theme-sky .hero-visual{order:initial}
  .hero-visual{min-height:390px}
  .benefits-list{grid-template-columns:1fr}
}
@media(max-width:767px){
  .page-shell{padding:16px 12px 38px}
  .hero-card,.scenario-card,.value-card,.cta-card{padding:18px}
  .cta-shell{padding:18px}
  .hero-title{font-size:clamp(30px,9vw,42px);line-height:1.08}
  .hero-visual{min-height:330px}
  .hero-photo{min-height:310px;transform:none!important}
  .info-visual{min-height:230px}
  .cta-visual{min-height:220px}
  .buttons{grid-template-columns:1fr}
  .btn{min-height:68px;font-size:16px}
  .benefits-list li{padding:18px}
  .value-lead{font-size:20px}
}
</style>
<div id="fh-preland-root" class="${designClass}">
  <div class="page-shell">
    <section class="section-card hero-card">
      <div class="hero-grid">
        <div class="hero-copy">
          <div class="top-badge">${esc(heroLabel)}</div>
          <h1 class="hero-title">${titleHtml}</h1>
          <div class="pills-container">${pills}</div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="photo-wrap hero-photo">
            <img src="${esc(images[0])}" alt="" loading="eager" decoding="async" fetchpriority="high">
          </div>
        </div>
      </div>
    </section>

    <section class="section-card scenario-card">
      <div class="scenario-grid">
        <div>
          <div class="card-label">${esc(content.painTitle || 'Узнаете сценарий?')}</div>
          <h2 class="scenario-title">${esc(content.trustTitle || 'Сначала понятный разбор, потом первый шаг.')}</h2>
          <div class="scenario-alert">${esc(content.painAlert || 'Посмотрите, как можно по-другому.')}</div>
        </div>
        <div class="scenario-list">${painRows}</div>
      </div>
    </section>

    <section class="section-card value-card">
      <div class="value-top">
        <div>
          <div class="card-label">${esc(valueLabel)}</div>
          <p class="value-lead">${esc(content.valueTitle || 'Короткий разбор помогает перейти от интереса к понятному действию.')}</p>
        </div>
        <div class="photo-wrap info-visual" aria-hidden="true">
          <img src="${esc(images[1])}" alt="" loading="lazy" decoding="async">
        </div>
      </div>
      <ul class="benefits-list">${benefits}</ul>
    </section>

    <section class="section-card cta-card">
      <div class="cta-shell">
        <div class="cta-layout">
          <div class="cta-wrapper">
            <div class="cta-subtitle">${esc(ctaLead)}</div>
            <div class="cta-title">Хватит.<br>${esc(ctaTitle)}</div>
          </div>
          <div class="photo-wrap cta-visual" aria-hidden="true">
            <img src="${esc(images[2])}" alt="" loading="lazy" decoding="async">
          </div>
        </div>
        <div class="buttons" aria-label="Начать мини-тест">
          ${renderAtmospaceQuizButton('btn btn-tg')}
        </div>
        <p class="legal">Ответы мини-теста не сохраняются и не оцениваются. После теста откроется форма заявки.</p>
      </div>
    </section>
  </div>
</div>
${buildAtmospacePrelandingTrackingScript()}`;
}

function renderCoreMethodMiniQuiz() {
  const questions = ATMOSPACE_MINI_QUIZ.map((question, questionIndex) => `
    <section class="atm-v1-question" data-atmospace-question="${questionIndex}" hidden>
      <p class="atm-v1-question-label">Вопрос ${questionIndex + 1}</p>
      <h3>${esc(question.title)}</h3>
      <div class="atm-v1-options">
        ${question.options.map((option) => `<button type="button" data-atmospace-option>${esc(option)}</button>`).join('')}
      </div>
      ${questionIndex > 0 ? '<button class="atm-v1-back" type="button" data-atmospace-quiz-back>Вернуться к предыдущему вопросу</button>' : ''}
    </section>`).join('');

  return `<section id="atmospace-mini-quiz" class="atm-v1-quiz-band" aria-labelledby="atm-v1-quiz-title">
    <div class="atm-v1-shell">
      <div class="atm-v1-quiz" data-atmospace-inline-quiz data-atmospace-embedded-quiz="true" data-atmospace-question-count="4">
        <div class="atm-v1-quiz-intro">
          <p class="atm-v1-kicker">Мини-тест</p>
          <h2 id="atm-v1-quiz-title">Здесь нет правильных ответов.</h2>
          <p><strong>Их никто не сохраняет и не оценивает - кроме тебя.</strong></p>
          <p>Просто будь честен с самим собой.</p>
        </div>
        <div class="atm-v1-progress" aria-hidden="true"><span data-atmospace-quiz-progress></span></div>
        <p class="atm-v1-counter" data-atmospace-quiz-counter>1 / ${ATMOSPACE_MINI_QUIZ.length}</p>
        <div class="atm-v1-questions">${questions}</div>
        <div class="atm-v1-quiz-result" data-atmospace-inline-result hidden>
          <p class="atm-v1-kicker">Мини-тест пройден</p>
          <h3>Спасибо за честные ответы.</h3>
          <p>Теперь посмотри, почему одних усилий недостаточно и что на самом деле удерживает тебя в прежней точке.</p>
          <a class="atm-v1-primary" href="#atm-v1-offer" data-atmospace-offer-scroll>Перейти к разбору</a>
        </div>
      </div>
    </div>
  </section>`;
}

function renderAtmospaceSharedInlineQuiz({
  accent = '#2563eb',
  accent2 = '#06b6d4',
  background = '#081426',
  panel = '#10213a',
  resultTitle = 'Спасибо за честные ответы.',
  resultText = 'Теперь откройте защищённую форму регистрации и продолжите на стороне Atmospace.'
} = {}) {
  const questions = ATMOSPACE_MINI_QUIZ.map((question, questionIndex) => `
    <section class="atm-shared-question" data-atmospace-question="${questionIndex}" hidden>
      <p class="atm-shared-label">Вопрос ${questionIndex + 1}</p>
      <h3>${esc(question.title)}</h3>
      <div class="atm-shared-options">
        ${question.options.map((option) => `<button type="button" data-atmospace-option>${esc(option)}</button>`).join('')}
      </div>
      ${questionIndex > 0 ? '<button class="atm-shared-back" type="button" data-atmospace-quiz-back>Назад</button>' : ''}
    </section>`).join('');

  return `<style>
.atm-shared-band,.atm-shared-band *{box-sizing:border-box}
.atm-shared-band{--atmq-accent:${esc(accent)};--atmq-accent2:${esc(accent2)};--atmq-bg:${esc(background)};--atmq-panel:${esc(panel)};padding:clamp(64px,9vw,112px) 0;background:var(--atmq-bg);color:#f8fafc;font-family:Manrope,Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.atm-shared-shell{width:min(920px,calc(100% - 40px));margin:0 auto}
.atm-shared-quiz{padding:clamp(24px,5vw,52px);border:1px solid rgba(255,255,255,.14);border-radius:8px;background:var(--atmq-panel);box-shadow:0 30px 80px rgba(0,0,0,.18)}
.atm-shared-kicker,.atm-shared-label{margin:0 0 12px;color:var(--atmq-accent2);font-size:12px;line-height:1.2;font-weight:900;text-transform:uppercase}
.atm-shared-intro{margin-bottom:30px}.atm-shared-intro h2{margin:0 0 14px;font-size:clamp(34px,6vw,62px);line-height:1.02;font-weight:900;letter-spacing:0}.atm-shared-intro p:not(.atm-shared-kicker){margin:6px 0;color:#cbd5e1;font-size:17px;line-height:1.5}
.atm-shared-progress{height:8px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.12)}.atm-shared-progress span{display:block;width:25%;height:100%;background:linear-gradient(90deg,var(--atmq-accent),var(--atmq-accent2));transition:width .2s ease}
.atm-shared-counter{margin:12px 0 24px;color:#94a3b8;font-size:13px;font-weight:900}
.atm-shared-question h3,.atm-shared-result h3{max-width:820px;margin:0 0 24px;font-size:clamp(27px,4.5vw,44px);line-height:1.16;font-weight:900;letter-spacing:0}
.atm-shared-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.atm-shared-options button{min-height:72px;padding:17px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(255,255,255,.055);color:#f8fafc;text-align:left;font:inherit;font-size:15px;line-height:1.42;font-weight:750;cursor:pointer}.atm-shared-options button:hover,.atm-shared-options button:focus-visible{border-color:var(--atmq-accent2);background:rgba(255,255,255,.10);outline:none}
.atm-shared-back{margin-top:18px;padding:0;border:0;background:transparent;color:#a8b5c7;font:inherit;font-weight:800;cursor:pointer}
.atm-shared-result{padding-top:26px}.atm-shared-result>p:not(.atm-shared-kicker){max-width:700px;margin:0;color:#cbd5e1;font-size:18px;line-height:1.55}.atm-shared-register{display:inline-flex;align-items:center;justify-content:center;min-height:64px;margin-top:26px;padding:17px 28px;border-radius:8px;background:linear-gradient(135deg,var(--atmq-accent),var(--atmq-accent2));color:#fff!important;text-decoration:none!important;font-size:17px;font-weight:900;box-shadow:0 18px 44px rgba(0,0,0,.22)}
@media(max-width:680px){.atm-shared-shell{width:calc(100% - 24px)}.atm-shared-quiz{padding:22px 16px}.atm-shared-options{grid-template-columns:1fr}.atm-shared-options button{min-height:64px}.atm-shared-register{width:100%;padding-inline:14px}}
</style>
<section id="atmospace-mini-quiz" class="atm-shared-band" aria-labelledby="atm-shared-quiz-title">
  <div class="atm-shared-shell">
    <div class="atm-shared-quiz" data-atmospace-inline-quiz data-atmospace-embedded-quiz="true" data-atmospace-question-count="4">
      <div class="atm-shared-intro">
        <p class="atm-shared-kicker">Мини-тест</p>
        <h2 id="atm-shared-quiz-title">Здесь нет правильных ответов.</h2>
        <p><strong>Их никто не сохраняет и не оценивает - кроме тебя.</strong></p>
        <p>Просто будь честен с самим собой.</p>
      </div>
      <div class="atm-shared-progress" aria-hidden="true"><span data-atmospace-quiz-progress></span></div>
      <p class="atm-shared-counter" data-atmospace-quiz-counter>1 / ${ATMOSPACE_MINI_QUIZ.length}</p>
      <div>${questions}</div>
      <div class="atm-shared-result" data-atmospace-inline-result data-atmospace-registration-section hidden>
        <p class="atm-shared-kicker">Мини-тест пройден</p>
        <h3>${esc(resultTitle)}</h3>
        <p>${esc(resultText)}</p>
        ${renderAtmospaceRegistrationButton('atm-shared-register', 'Открыть форму регистрации')}
        <p data-atmospace-runtime-message hidden></p>
      </div>
    </div>
  </div>
</section>`;
}

function renderCoreMethodFixedOffer({ valueImage, ctaImage }) {
  return `<div id="atm-v1-offer" data-atmospace-offer hidden>
    <section class="atm-v1-editorial atm-v1-editorial-dark">
      <div class="atm-v1-shell atm-v1-copy-grid">
        <div>
          <p class="atm-v1-kicker">Почему всё ещё не получилось</p>
          <h2>Ты не беспомощный. Не тупой. И умеешь решать сложные задачи.</h2>
        </div>
        <div class="atm-v1-prose">
          <p>Итак, почему ты не можешь реализовать лучший вариант своей жизни, при том что умеешь решать проблемы и разбираться в сложных вещах?</p>
          <p>Ты знаешь, что в тебе есть потенциал: заниматься своим делом, иметь хороший дом, ездить на машине, которая нравится, путешествовать с семьёй без надрыва для бюджета, иметь запас денег и быть независимым.</p>
          <p>Но сколько бы ты ни старался, в реальности происходит другое: деньги идут туго, семья не получает желаемого уровня жизни, своё дело не построено, свободы нет, накоплений недостаточно, время уходит, а очередная попытка снова не дала результата.</p>
        </div>
      </div>
    </section>

    <section class="atm-v1-editorial">
      <div class="atm-v1-shell atm-v1-copy-grid">
        <div class="atm-v1-sticky-title">
          <p class="atm-v1-kicker">Мысли, которые возвращаются</p>
          <h2>Почему другие смогли, а я нет?</h2>
        </div>
        <div class="atm-v1-quotes">
          <blockquote>«Может, я просто не такой способный, как о себе думаю?»</blockquote>
          <blockquote>«Почему я хорошо решаю чужие задачи, но не могу выстроить собственную жизнь?»</blockquote>
          <blockquote>«Сколько ещё попыток выдержу я сам и сколько выдержит моя семья?»</blockquote>
          <blockquote>«Что я скажу детям, если через пять лет всё останется так же?»</blockquote>
          <blockquote>«А вдруг мой сегодняшний уровень - это и есть мой предел?»</blockquote>
        </div>
      </div>
    </section>

    <section class="atm-v1-visual-break">
      <div class="atm-v1-shell">
        <img src="${esc(valueImage)}" alt="Человек в моменте честного переосмысления своей жизни" loading="lazy" decoding="async">
      </div>
    </section>

    <section class="atm-v1-editorial atm-v1-editorial-accent">
      <div class="atm-v1-shell atm-v1-copy-grid">
        <div>
          <p class="atm-v1-kicker">Можно сделать ещё 100+ попыток</p>
          <h2>Но так и не пробить свой уровень.</h2>
        </div>
        <div class="atm-v1-prose">
          <p>Найти наставника. Поймать тренд. Сменить направление, работу или нишу. Начать работать ещё больше.</p>
          <p><strong>Знаешь почему этого может снова оказаться недостаточно?</strong></p>
          <p>Потому что у проблемы есть одна причина - твоя психика. Слово знакомое, но спроси себя: «Я точно знаю, что это такое и как это работает?»</p>
        </div>
      </div>
    </section>

    <section class="atm-v1-editorial">
      <div class="atm-v1-shell atm-v1-copy-grid">
        <div class="atm-v1-sticky-title">
          <p class="atm-v1-kicker">Рассинхрон психики</p>
          <h2>Желаешь одно, а бессознательно воспроизводишь другое.</h2>
        </div>
        <div class="atm-v1-prose">
          <p>Работа психики проявляется в деньгах, отношениях, здоровье, хобби и работе. Главная причина, по которой мы желаем одно, а получаем другое, - рассинхрон психики.</p>
          <p>Рассинхрон - это состояние, при котором психика работает некорректно. Процесс происходит бессознательно, поэтому человек часто даже не замечает, что снова транслирует старый сценарий.</p>
          <p>Можно испробовать все направления, взять сильнейшего наставника и научиться управлять планами, но рассинхрон превращает усилия в развлечения, провалы и боль.</p>
          <div class="atm-v1-callout">Сейчас важно понять одну вещь: рассинхрон происходит именно в бессознательной части психики.</div>
        </div>
      </div>
    </section>

    <section class="atm-v1-editorial atm-v1-editorial-dark">
      <div class="atm-v1-shell atm-v1-copy-grid">
        <div>
          <p class="atm-v1-kicker">Бессознательные программы</p>
          <h2>Каждый результат опирается на уже сформированные нейронные связи.</h2>
        </div>
        <div class="atm-v1-prose">
          <p>Программа - это нейронные связи для выполнения задач. Когда мы осваиваем вождение, чтение, печать или приготовление еды, нейроны приходят в действие и образуют связи.</p>
          <p>За реализацию любой цели отвечают сформированные бессознательные программы: сколько ты зарабатываешь, как ведёшь себя в сложных ситуациях, сколько у тебя энергии, как работает дисциплина и доводишь ли ты дела до конца.</p>
          <p><strong>Чем мощнее психика, тем выше результат.</strong> Но программы, сформированные воспитанием и социумом, часто просто не соответствуют большим и амбициозным целям.</p>
          <p>Поэтому так сложно перескочить на другие рельсы и начать новый образ жизни. Но у нас есть свобода выбора: программы можно переписать на нужные.</p>
        </div>
      </div>
    </section>

    <section class="atm-v1-roadmap">
      <div class="atm-v1-shell">
        <p class="atm-v1-kicker">С чего мы начнём</p>
        <h2>Четыре шага к новому сценарию жизни</h2>
        <div class="atm-v1-roadmap-grid">
          <article><span>01</span><h3>Почему не получается</h3><p>Разберём конкретную причину, которая мешает заниматься своим делом, вырваться из нужды и реализовывать цели. Неудачи - лишь её следствия.</p></article>
          <article><span>02</span><h3>Смена программ</h3><p>Приведём в действие механизм замены старых программ на новые через практические ключи и действия, изменения от которых видно в реальности.</p></article>
          <article><span>03</span><h3>Базовый доход</h3><p>Уберём ситуацию, когда после рабочего марафона ты пытаешься строить новую жизнь на остатках сил, времени и энергии.</p></article>
          <article><span>04</span><h3>Живая движуха</h3><p>Встречи, активный отдых, путешествия, знакомства и совместные челленджи с людьми, которые тоже выбирают свой путь.</p></article>
        </div>
        <a class="atm-v1-primary atm-v1-primary-wide" href="#atmospace-registration" data-atmospace-registration-scroll>Перейти к регистрации</a>
      </div>
    </section>

    <section class="atm-v1-final-story">
      <div class="atm-v1-shell atm-v1-final-grid">
        <div>
          <p class="atm-v1-kicker">Ещё один год пройдёт в любом случае</p>
          <h2>Вопрос только один: ты готов?</h2>
          <p>Можно снова искать новую идею, смотреть ролики, сохранять полезные посты, обещать себе начать с понедельника.</p>
          <p>И через год обнаружить те же долги, тот же доход, ту же работу и те же вопросы к себе.</p>
          <p>А можно взять и разобраться, почему предыдущие попытки не давали результата.</p>
          <p><strong>В конце концов, что ты теряешь? В любой момент всё можно пересмотреть.</strong></p>
        </div>
        <img src="${esc(ctaImage)}" alt="Следующий шаг к осознанным изменениям" loading="lazy" decoding="async">
      </div>
    </section>
  </div>`;
}

function renderCoreMethodCompactOffer({ content, valueImage, ctaImage }) {
  const fallbackItems = [
    'увидеть повторяющийся сценарий, который незаметно возвращает в прежнюю точку',
    'отделить реальную причину от очередной попытки заставить себя работать ещё больше',
    'перейти к одному следующему шагу без нового рывка и перегруза'
  ];
  const sourceCards = Array.isArray(content?.cards) && content.cards.length
    ? content.cards
    : (Array.isArray(content?.valueItems) ? content.valueItems : fallbackItems);
  const cards = sourceCards.slice(0, 3).map((item, index) => {
    const title = typeof item === 'object' && item ? item.title : `Смысл ${index + 1}`;
    const text = typeof item === 'object' && item ? item.text : item;
    return `<article class="atm-v1-compact-card"><span>0${index + 1}</span><h3>${esc(title || `Смысл ${index + 1}`)}</h3><p>${esc(text || fallbackItems[index])}</p></article>`;
  }).join('');
  const offerTitle = stripHtml(content?.valueTitle || content?.actionTitle || 'Что станет понятнее после мини-теста');
  const offerLead = stripHtml(content?.trustSmall || content?.ctaLead || 'Короткий разбор помогает увидеть не новую теорию, а конкретный повторяющийся сценарий и первый реалистичный шаг.');
  const registrationTitle = stripHtml(content?.actionTitle || 'Продолжи на защищённой странице Atmospace');
  const registrationText = stripHtml(content?.actionSubtitle || 'Сервер уже подготовил персональную форму регистрации и сохранил рекламную атрибуцию.');

  return `<div id="atm-v1-offer" data-atmospace-offer hidden>
    <section class="atm-v1-compact">
      <div class="atm-v1-shell">
        <div class="atm-v1-compact-head">
          <div>
            <p class="atm-v1-kicker">После мини-теста</p>
            <h2>${esc(offerTitle)}</h2>
            <p>${esc(offerLead)}</p>
          </div>
          <img src="${esc(valueImage)}" alt="Смысловой кадр к короткому разбору" loading="lazy" decoding="async">
        </div>
        <div class="atm-v1-compact-cards">${cards}</div>
      </div>
    </section>

    <section id="atmospace-registration" class="atm-v1-registration" data-atmospace-registration-section aria-labelledby="atm-v1-registration-title">
      <div class="atm-v1-shell atm-v1-registration-panel atm-v1-registration-grid">
        <div>
          <p class="atm-v1-kicker">Следующий шаг</p>
          <h2 id="atm-v1-registration-title">${esc(registrationTitle)}</h2>
          <p>${esc(registrationText)}</p>
          ${renderAtmospaceRegistrationButton('atm-v1-register-button', 'Открыть форму регистрации')}
          <p class="atm-v1-secure">Ссылка приходит напрямую с сервера. Лендинг не собирает пароль и не изменяет адрес регистрации.</p>
          <p data-atmospace-runtime-message hidden></p>
        </div>
        <img src="${esc(ctaImage)}" alt="Следующий шаг после мини-теста" loading="lazy" decoding="async">
      </div>
    </section>
  </div>`;
}

function renderCoreMethodInlinePrelanding({ templateId, content, projectData, landingMeta, sceneImage, valueImage, ctaImage }) {
  const safeTemplateId = [1, 2, 3].includes(Number(templateId)) ? Number(templateId) : 1;
  const titleText = stripHtml(content?.titleHtml || content?.title || 'Как реализовать себя, когда тебе 30+ и куча провалов');
  const designClass = safeTemplateId === 2 ? 'atm-v1-blue' : safeTemplateId === 3 ? 'atm-v1-green' : 'atm-v1-ember';
  const heroImage = bothelpImageSrc(sceneImage || PRELANDING_FALLBACK_IMAGES[0]);
  const offerImage = bothelpImageSrc(valueImage || PRELANDING_FALLBACK_IMAGES[1]);
  const finalImage = bothelpImageSrc(ctaImage || PRELANDING_FALLBACK_IMAGES[2]);
  const heroLead = stripHtml(content?.trustTitle || content?.trustSmall || content?.ctaLead || 'Короткий мини-тест поможет увидеть повторяющийся сценарий и перейти к одному понятному следующему шагу.');
  const heroPoints = (Array.isArray(content?.pills) && content.pills.length
    ? content.pills
    : ['4 честных вопроса', 'Ответы не сохраняются', 'Защищённая регистрация'])
    .slice(0, 3);

  return `${buildAtmospaceHeadConfig({ projectData, ...(landingMeta || {}) })}
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap');
#fh-preland-root{--atm-bg:#f5f8fc;--atm-ink:#0b1324;--atm-muted:#526176;--atm-accent:#ef6c33;--atm-accent2:#f4b942;--atm-deep:#111d31;--atm-line:rgba(37,55,83,.14);width:100vw;min-height:100vh;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);overflow:hidden;background:var(--atm-bg);color:var(--atm-ink);font-family:'Manrope',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
#fh-preland-root.atm-v1-blue{--atm-accent:#2576f3;--atm-accent2:#39b7e8;--atm-deep:#0a1d39}
#fh-preland-root.atm-v1-green{--atm-accent:#168f68;--atm-accent2:#92c83e;--atm-deep:#0c2923}
#fh-preland-root *{box-sizing:border-box}
#fh-preland-root [hidden]{display:none!important}
.atm-v1-shell{width:min(1180px,calc(100% - 40px));margin:0 auto}
.atm-v1-hero{position:relative;min-height:min(900px,100svh);display:grid;align-items:center;padding:56px 0;background:linear-gradient(110deg,rgba(248,251,255,.98) 0%,rgba(248,251,255,.91) 48%,rgba(248,251,255,.18) 72%),url('${esc(heroImage)}') center right/cover no-repeat}
.atm-v1-hero-copy{max-width:700px}
.atm-v1-kicker{margin:0 0 18px;color:var(--atm-accent);font-size:13px;line-height:1.2;font-weight:900;text-transform:uppercase}
.atm-v1-hero h1{max-width:760px;margin:0 0 24px;font-size:clamp(48px,7vw,94px);line-height:.96;font-weight:900;letter-spacing:0;text-wrap:balance}
.atm-v1-lead{max-width:690px;margin:0 0 22px;color:#263449;font-size:clamp(18px,2vw,25px);line-height:1.48;font-weight:700}
.atm-v1-hero-chips{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 24px;padding:0;list-style:none}
.atm-v1-hero-chips li{display:inline-flex;align-items:center;min-height:40px;padding:9px 13px;border:1px solid var(--atm-line);border-radius:999px;background:rgba(255,255,255,.84);color:#263449;font-size:13px;line-height:1.3;font-weight:900}
.atm-v1-question-lead{max-width:670px;margin:26px 0 0;padding:20px 0 0;border-top:1px solid var(--atm-line);color:var(--atm-ink);font-size:20px;line-height:1.45;font-weight:900}
.atm-v1-primary{display:inline-flex;align-items:center;justify-content:center;min-height:64px;margin-top:26px;padding:17px 28px;border:0;border-radius:8px;background:linear-gradient(135deg,var(--atm-accent),var(--atm-accent2));box-shadow:0 18px 42px color-mix(in srgb,var(--atm-accent) 24%,transparent);color:#fff!important;text-decoration:none!important;font-size:17px;line-height:1.2;font-weight:900;cursor:pointer}
.atm-v1-primary-wide{width:100%;margin-top:30px}
.atm-v1-quiz-band{padding:clamp(64px,9vw,120px) 0;background:var(--atm-deep);color:#f8fafc}
.atm-v1-quiz{max-width:900px;margin:0 auto}
.atm-v1-quiz-intro{max-width:760px;margin-bottom:34px}
.atm-v1-quiz h2{margin:0 0 18px;font-size:clamp(38px,6vw,68px);line-height:1.02;font-weight:900;letter-spacing:0}
.atm-v1-quiz-intro p:not(.atm-v1-kicker){margin:8px 0;color:#c8d3e2;font-size:18px;line-height:1.55}
.atm-v1-progress{height:8px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.12)}
.atm-v1-progress span{display:block;width:25%;height:100%;background:linear-gradient(90deg,var(--atm-accent),var(--atm-accent2));transition:width .22s ease}
.atm-v1-counter{margin:13px 0 26px;color:#94a3b8;font-size:13px;font-weight:900}
.atm-v1-question-label{margin:0 0 12px;color:var(--atm-accent2);font-size:13px;font-weight:900;text-transform:uppercase}
.atm-v1-question h3,.atm-v1-quiz-result h3{max-width:820px;margin:0 0 26px;font-size:clamp(28px,4.5vw,46px);line-height:1.17;font-weight:900;letter-spacing:0}
.atm-v1-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.atm-v1-options button{min-height:78px;padding:18px;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:#17263c;color:#f8fafc;text-align:left;font:inherit;font-size:15px;line-height:1.45;font-weight:750;cursor:pointer;transition:border-color .18s ease,background .18s ease}
.atm-v1-options button:hover,.atm-v1-options button:focus-visible{border-color:var(--atm-accent2);background:#1d304b;outline:none}
.atm-v1-back{margin-top:18px;padding:0;border:0;background:transparent;color:#94a3b8;font:inherit;font-weight:800;cursor:pointer}
.atm-v1-quiz-result{padding:28px 0 0}
.atm-v1-quiz-result>p:not(.atm-v1-kicker){max-width:720px;color:#c8d3e2;font-size:19px;line-height:1.55}
.atm-v1-editorial{padding:clamp(72px,9vw,130px) 0;background:#fff}
.atm-v1-editorial-dark{background:var(--atm-deep);color:#f8fafc}
.atm-v1-editorial-accent{background:color-mix(in srgb,var(--atm-accent) 9%,#fff)}
.atm-v1-copy-grid{display:grid;grid-template-columns:minmax(0,.88fr) minmax(0,1.12fr);gap:clamp(36px,7vw,100px);align-items:start}
.atm-v1-copy-grid h2,.atm-v1-roadmap h2,.atm-v1-final-story h2{margin:0;font-size:clamp(38px,5.5vw,68px);line-height:1.03;font-weight:900;letter-spacing:0;text-wrap:balance}
.atm-v1-prose{display:grid;gap:18px;color:var(--atm-muted);font-size:18px;line-height:1.72}
.atm-v1-prose p{margin:0}
.atm-v1-editorial-dark .atm-v1-prose{color:#c8d3e2}
.atm-v1-sticky-title{position:sticky;top:30px}
.atm-v1-quotes{display:grid;gap:12px}
.atm-v1-quotes blockquote{margin:0;padding:22px;border-left:4px solid var(--atm-accent);background:#f3f6fa;color:#263449;font-size:18px;line-height:1.55;font-weight:750}
.atm-v1-callout{padding:24px;border:1px solid color-mix(in srgb,var(--atm-accent) 30%,transparent);border-radius:8px;background:color-mix(in srgb,var(--atm-accent) 8%,#fff);color:var(--atm-ink);font-weight:900}
.atm-v1-visual-break{padding:34px 0;background:#fff}
.atm-v1-visual-break img{display:block;width:100%;max-height:650px;object-fit:cover;border-radius:8px}
.atm-v1-roadmap{padding:clamp(72px,9vw,130px) 0;background:#edf3f8}
.atm-v1-roadmap>div>h2{max-width:860px}
.atm-v1-roadmap-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:42px}
.atm-v1-roadmap article{min-height:270px;padding:28px;border:1px solid var(--atm-line);border-radius:8px;background:#fff}
.atm-v1-roadmap article span{display:block;margin-bottom:26px;color:var(--atm-accent);font-size:34px;font-weight:900}
.atm-v1-roadmap article h3{margin:0 0 12px;font-size:25px;line-height:1.2}
.atm-v1-roadmap article p{margin:0;color:var(--atm-muted);font-size:16px;line-height:1.6}
.atm-v1-final-story{padding:clamp(72px,9vw,130px) 0;background:#fff}
.atm-v1-final-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.75fr);gap:clamp(36px,7vw,90px);align-items:center}
.atm-v1-final-grid p:not(.atm-v1-kicker){margin:18px 0 0;color:var(--atm-muted);font-size:18px;line-height:1.65}
.atm-v1-final-grid img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:8px}
.atm-v1-registration{padding:clamp(70px,9vw,120px) 0;background:var(--atm-deep);color:#fff}
.atm-v1-registration-panel{max-width:880px;margin:0 auto;text-align:center}
.atm-v1-registration h2{margin:0 0 18px;font-size:clamp(40px,6vw,72px);line-height:1.02;font-weight:900;letter-spacing:0}
.atm-v1-registration p{max-width:700px;margin:0 auto;color:#c8d3e2;font-size:18px;line-height:1.6}
.atm-v1-compact{padding:clamp(68px,9vw,118px) 0;background:#fff}
.atm-v1-compact-head{display:grid;grid-template-columns:minmax(0,.9fr) minmax(300px,.65fr);gap:clamp(30px,6vw,78px);align-items:center}
.atm-v1-compact-head h2{margin:0;font-size:clamp(38px,5.6vw,68px);line-height:1.03;font-weight:900;letter-spacing:0;text-wrap:balance}
.atm-v1-compact-head img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px}
.atm-v1-compact-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:38px}
.atm-v1-compact-card{min-height:190px;padding:24px;border:1px solid var(--atm-line);border-radius:8px;background:#f4f7fb}
.atm-v1-compact-card span{display:block;margin-bottom:18px;color:var(--atm-accent);font-size:26px;font-weight:900}
.atm-v1-compact-card h3{margin:0 0 10px;font-size:21px;line-height:1.25}
.atm-v1-compact-card p{margin:0;color:var(--atm-muted);font-size:15px;line-height:1.55}
.atm-v1-registration-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.55fr);gap:clamp(30px,6vw,72px);align-items:center;text-align:left}
.atm-v1-registration-grid img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:8px}
.atm-v1-registration-grid .atm-v1-register-button{margin-left:0}
.atm-v1-registration-grid .atm-v1-secure{margin-left:0!important}
.atm-v1-register-button{display:flex;align-items:center;justify-content:center;width:min(520px,100%);min-height:68px;margin:30px auto 0;padding:18px 24px;border-radius:8px;background:linear-gradient(135deg,var(--atm-accent),var(--atm-accent2));color:#fff!important;text-decoration:none!important;font-size:18px;font-weight:900}
.atm-v1-register-button[aria-disabled=true]{pointer-events:none;opacity:.58}
.atm-v1-secure{margin-top:14px!important;color:#94a3b8!important;font-size:13px!important}
.atm-v1-footer{padding:26px 0;border-top:1px solid rgba(255,255,255,.14);background:var(--atm-deep);color:#94a3b8}
.atm-v1-footer-inner{display:flex;align-items:center;justify-content:space-between;gap:18px;font-size:12px;line-height:1.5}
.atm-v1-footer-links{display:flex;flex-wrap:wrap;gap:18px}
.atm-v1-footer a{color:#c8d3e2;text-decoration:underline;text-underline-offset:3px}
@media(max-width:800px){.atm-v1-shell{width:min(100% - 28px,1180px)}.atm-v1-hero{min-height:auto;padding:360px 0 46px;background:linear-gradient(180deg,rgba(248,251,255,.05) 0%,rgba(248,251,255,.88) 42%,#f8fbff 58%),url('${esc(heroImage)}') 64% top/auto 430px no-repeat,#f8fbff}.atm-v1-hero h1{font-size:clamp(40px,12vw,58px)}.atm-v1-lead{font-size:17px}.atm-v1-copy-grid,.atm-v1-final-grid,.atm-v1-compact-head,.atm-v1-registration-grid{grid-template-columns:1fr}.atm-v1-sticky-title{position:static}.atm-v1-options,.atm-v1-roadmap-grid,.atm-v1-compact-cards{grid-template-columns:1fr}.atm-v1-roadmap article,.atm-v1-compact-card{min-height:auto}.atm-v1-final-grid img,.atm-v1-compact-head img,.atm-v1-registration-grid img{aspect-ratio:16/10}.atm-v1-footer-inner{align-items:flex-start;flex-direction:column}.atm-v1-question h3{font-size:27px}}
@media(max-width:420px){.atm-v1-shell{width:calc(100% - 22px)}.atm-v1-hero{padding-top:320px;background-size:auto 380px}.atm-v1-hero h1{font-size:39px}.atm-v1-primary{width:100%;padding-inline:16px}.atm-v1-options button{min-height:66px;padding:15px}.atm-v1-editorial,.atm-v1-roadmap,.atm-v1-final-story,.atm-v1-registration{padding:58px 0}}
</style>
<div id="fh-preland-root" class="${designClass}">
  <main>
    <section class="atm-v1-hero" aria-labelledby="atm-v1-title">
      <div class="atm-v1-shell">
        <div class="atm-v1-hero-copy">
          <p class="atm-v1-kicker">Короткий мини-тест</p>
          <h1 id="atm-v1-title">${esc(titleText)}</h1>
          <p class="atm-v1-lead">${esc(heroLead)}</p>
          <ul class="atm-v1-hero-chips">${heroPoints.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
          <div class="atm-v1-question-lead">Ответь честно на четыре вопроса. Результат увидишь сразу, ответы не сохраняются.</div>
          ${renderAtmospaceQuizButton('atm-v1-primary')}
        </div>
      </div>
    </section>

    ${renderCoreMethodMiniQuiz()}
    ${renderCoreMethodCompactOffer({ content, valueImage: offerImage, ctaImage: finalImage })}
    <footer class="atm-v1-footer">
      <div class="atm-v1-shell atm-v1-footer-inner">
        <span>Материал носит информационный характер. Результат зависит от действий участника.</span>
        <nav class="atm-v1-footer-links" aria-label="Юридическая информация">
          <a href="https://modernisto.ru/politics" target="_blank" rel="noopener noreferrer">Политика конфиденциальности</a>
          <a href="https://modernisto.ru/approval" target="_blank" rel="noopener noreferrer">Согласие на обработку данных</a>
        </nav>
      </div>
    </footer>
  </main>
</div>
${buildAtmospacePrelandingTrackingScript()}`;
}

function staticLandingSlug(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'e')
    .replace(/а/g, 'a')
    .replace(/б/g, 'b')
    .replace(/в/g, 'v')
    .replace(/г/g, 'g')
    .replace(/д/g, 'd')
    .replace(/е/g, 'e')
    .replace(/ж/g, 'zh')
    .replace(/з/g, 'z')
    .replace(/и/g, 'i')
    .replace(/й/g, 'y')
    .replace(/к/g, 'k')
    .replace(/л/g, 'l')
    .replace(/м/g, 'm')
    .replace(/н/g, 'n')
    .replace(/о/g, 'o')
    .replace(/п/g, 'p')
    .replace(/р/g, 'r')
    .replace(/с/g, 's')
    .replace(/т/g, 't')
    .replace(/у/g, 'u')
    .replace(/ф/g, 'f')
    .replace(/х/g, 'h')
    .replace(/ц/g, 'c')
    .replace(/ч/g, 'ch')
    .replace(/ш/g, 'sh')
    .replace(/щ/g, 'sch')
    .replace(/ы/g, 'y')
    .replace(/э/g, 'e')
    .replace(/ю/g, 'yu')
    .replace(/я/g, 'ya')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'landing';
}

function buildStaticLandingConfig(projectData = {}, content = {}) {
  const clientName = String(projectData.clientDisplayName || projectData.clientName || '').trim();
  const landingName = stripHtml(content.title || content.titleHtml || 'Лендинг');
  const landingSlug = staticLandingSlug(`${clientName || 'client'} ${landingName}`);
  return {
    clientName,
    landingName,
    landingSlug,
    ctaText: 'Начать',
    ctaMode: 'placeholder',
    ctaUrl: '#'
  };
}

function buildStaticLandingConfigScript(projectData, content) {
  return `<script>
  window.LANDING_CONFIG = ${safeInlineJson(buildStaticLandingConfig(projectData, content))};
</script>`;
}

function renderStaticLandingCta(extraClass = '') {
  const className = ['cta-button', extraClass].filter(Boolean).join(' ');
  return `<a href="#" class="${esc(className)}" data-atmosfera-cta data-cta-mode="placeholder">Начать</a>`;
}

function buildStaticLandingPlaceholderScript() {
  return `<script>
  document.querySelectorAll("[data-atmosfera-cta]").forEach(function (button) {
    button.addEventListener("click", function (event) {
      if (button.getAttribute("data-cta-mode") === "placeholder") {
        event.preventDefault();
      }
    });
  });
</script>`;
}

function normalizeStaticLandingItems(items, fallback) {
  const source = Array.isArray(items) && items.length ? items : fallback;
  return source
    .map(item => typeof item === 'string' ? item : item?.text || item?.title || item?.value || '')
    .filter(Boolean)
    .slice(0, 6);
}

function renderStaticLandingV1({
  content,
  projectData,
  sceneImage,
  valueImage,
  ctaImage,
  style,
  palette,
  accent,
  accent2
}) {
  const config = buildStaticLandingConfig(projectData, content);
  const title = stripHtml(content.titleHtml || content.title || 'Откройте короткий разбор');
  const titleHtml = /<span[\s>]/i.test(content.titleHtml || '')
    ? content.titleHtml
    : esc(title);
  const lead = content.actionSubtitle || content.trustSmall || content.valueTitle || 'Короткий разбор помогает перейти от интереса к первому понятному действию.';
  const problemItems = normalizeStaticLandingItems(content.painItems, [
    'Старый подход уже не даёт нужного результата.',
    'Есть интерес, но непонятно, какой шаг делать первым.',
    'Не хочется снова тратить время на длинную теорию.',
    'Нужен короткий разбор и понятный переход дальше.'
  ]).slice(0, 4);
  const promiseItems = normalizeStaticLandingItems(content.valueItems, [
    'почему старый подход мог не сработать',
    'какой новый маршрут можно рассмотреть без долгой подготовки',
    'какой первый шаг подходит после четырёх ответов'
  ]).slice(0, 3);
  const audienceItems = normalizeStaticLandingItems(content.pills, [
    'Для тех, кто узнаёт проблему в заголовке',
    'Для тех, кому нужен короткий разбор перед решением',
    'Для тех, кто хочет понятный первый шаг без давления'
  ]).slice(0, 3);
  const benefits = normalizeStaticLandingItems(content.proofItems, [
    'Не продаём в лоб: сначала показываем смысл и первый шаг.',
    'Страница объясняет выгоды коротко, без лишней легенды.',
    'CTA подготовлены к будущему подключению через один компонент.'
  ]).slice(0, 3);
  const storyCards = (content.cards?.length ? content.cards : buildTildaStoryCards(title)).slice(0, 3);
  const primary = accent || '#2563eb';
  const secondary = accent2 || '#0ea5e9';
  const themeClass = `static-${prelandingClassToken(style || 'premium-light')}-${prelandingClassToken(palette || 'blue-trust')}`;
  const images = {
    hero: bothelpImageSrc(sceneImage || content.heroImage || content.sceneImage || PRELANDING_FALLBACK_IMAGES[0]),
    value: bothelpImageSrc(valueImage || content.valueImage || PRELANDING_FALLBACK_IMAGES[1]),
    cta: bothelpImageSrc(ctaImage || content.ctaImage || PRELANDING_FALLBACK_IMAGES[2])
  };
  const problemHtml = problemItems.map((item, index) => `<li><b>${index + 1}</b><span>${esc(item)}</span></li>`).join('');
  const promiseHtml = promiseItems.map((item, index) => `<article><b>0${index + 1}</b><p>${esc(item)}</p></article>`).join('');
  const audienceHtml = audienceItems.map(item => `<li>${esc(item)}</li>`).join('');
  const benefitHtml = benefits.map(item => `<article><span>✓</span><p>${esc(item)}</p></article>`).join('');
  const stepsHtml = storyCards.map((item, index) => `<article><b>${index + 1}</b><h3>${esc(item.title || `Шаг ${index + 1}`)}</h3><p>${esc(item.text || promiseItems[index] || 'Понятный шаг без лишней теории.')}</p></article>`).join('');
  const factsHtml = [
    'Главная ранняя метрика: человек понял смысл и начал мини-тест.',
    'Все CTA ведут в единый сценарий из четырёх вопросов.',
    'После результата открывается серверная защищённая регистрация Atmospace.'
  ].map(item => `<li>${esc(item)}</li>`).join('');
  const faqHtml = [
    ['Это готовая продажа продукта?', 'Нет. Предлендинг делает короткий прогрев: показывает смысл, выгоды и переводит человека к следующему шагу.'],
    ['Можно ли обещать доход?', 'Нет. Лендинг не обещает гарантированный доход или быстрый результат. Формулировки остаются осторожными и проверяемыми.'],
    ['Кнопки уже рабочие?', 'Визуально да. Сейчас это заглушка: клик не ломает страницу и не уводит человека на внешний сервис.'],
    ['Можно ли заменить ссылку позже?', 'Да. Все CTA собраны через один компонент и общий LANDING_CONFIG.']
  ].map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="format-detection" content="telephone=no">
<title>${esc(config.landingName)}</title>
${buildStaticLandingConfigScript(projectData, content)}
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&family=Manrope:wght@500;600;700;800;900&display=swap');
:root{
  --sl-bg:#f5f8ff;
  --sl-card:rgba(255,255,255,.86);
  --sl-text:#091226;
  --sl-muted:#526174;
  --sl-line:rgba(24,38,65,.10);
  --sl-accent:${primary};
  --sl-accent2:${secondary};
  --sl-shadow:0 28px 86px rgba(28,48,86,.12);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:radial-gradient(circle at 6% 4%,color-mix(in srgb,var(--sl-accent) 18%,transparent),transparent 28vw),radial-gradient(circle at 94% 8%,color-mix(in srgb,var(--sl-accent2) 14%,transparent),transparent 30vw),linear-gradient(180deg,#fbfdff 0%,var(--sl-bg) 48%,#eef6ff 100%);color:var(--sl-text);font-family:Manrope,Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.landing-root{min-height:100vh}
.wrap{width:min(1180px,calc(100% - 40px));margin:0 auto}
.section{padding:76px 0}
.hero{min-height:92vh;display:grid;align-items:center;padding:42px 0}
.hero-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.88fr);gap:42px;align-items:center}
.badge{display:inline-flex;align-items:center;gap:10px;width:max-content;max-width:100%;padding:10px 16px;border-radius:999px;background:rgba(255,255,255,.76);border:1px solid var(--sl-line);box-shadow:0 16px 44px rgba(30,54,92,.08);color:color-mix(in srgb,var(--sl-accent) 76%,#111827);font-size:12px;font-weight:950;letter-spacing:.07em;text-transform:uppercase}
.badge:before{content:"";width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,var(--sl-accent),var(--sl-accent2));box-shadow:0 0 0 7px color-mix(in srgb,var(--sl-accent) 12%,transparent)}
h1,h2,h3,p{margin-top:0}
h1{max-width:720px;margin:24px 0 18px;font-size:clamp(42px,6vw,82px);line-height:.94;letter-spacing:-.055em;font-weight:950;text-transform:uppercase;text-wrap:balance}
h1 span,.accent{color:transparent;background:linear-gradient(112deg,var(--sl-accent),var(--sl-accent2));-webkit-background-clip:text;background-clip:text}
.lead{max-width:660px;margin-bottom:26px;color:#172033;font:850 clamp(18px,1.8vw,24px)/1.38 Inter,Manrope,system-ui,sans-serif}
.hero-card,.image-card,.panel{background:var(--sl-card);border:1px solid rgba(255,255,255,.78);border-radius:34px;box-shadow:var(--sl-shadow);backdrop-filter:blur(16px)}
.image-card{position:relative;overflow:hidden;min-height:440px}
.image-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.image-card:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.10));pointer-events:none}
.cta-button{display:inline-flex;align-items:center;justify-content:center;min-height:66px;padding:0 34px;border-radius:22px;background:linear-gradient(135deg,var(--sl-accent),var(--sl-accent2));color:#fff!important;font:950 18px/1 Inter,Manrope,system-ui,sans-serif;box-shadow:0 22px 54px color-mix(in srgb,var(--sl-accent) 26%,rgba(30,54,92,.15));transition:transform .18s ease,filter .18s ease}
.cta-button:hover{transform:translateY(-2px);filter:brightness(1.04)}
.cta-row{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.micro{color:var(--sl-muted);font:800 13px/1.45 Inter,system-ui,sans-serif}
.panel{padding:clamp(24px,4vw,48px)}
.split{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.8fr);gap:34px;align-items:center}
h2{font-size:clamp(34px,4.6vw,64px);line-height:1;letter-spacing:-.052em;font-weight:950;text-transform:uppercase}
.problem-list,.audience-list,.facts-list{display:grid;gap:12px;margin:22px 0 0;padding:0;list-style:none}
.problem-list li{display:grid;grid-template-columns:48px minmax(0,1fr);gap:14px;align-items:center;padding:16px;border-radius:20px;background:rgba(255,255,255,.70);border:1px solid var(--sl-line)}
.problem-list b,.steps b{display:grid;place-items:center;width:48px;height:48px;border-radius:16px;background:linear-gradient(135deg,var(--sl-accent),var(--sl-accent2));color:#fff;font:950 18px/1 Inter,system-ui,sans-serif}
.problem-list span,.card-grid p,.steps p,.facts-list li,.faq p{color:var(--sl-muted);font:750 16px/1.5 Inter,Manrope,system-ui,sans-serif}
.card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.card-grid article,.steps article,.faq details{padding:22px;border-radius:24px;background:rgba(255,255,255,.76);border:1px solid var(--sl-line);box-shadow:0 18px 50px rgba(30,54,92,.07)}
.card-grid b{display:inline-block;margin-bottom:16px;color:var(--sl-accent);font:950 34px/1 Inter,system-ui,sans-serif}
.audience-list{grid-template-columns:repeat(3,minmax(0,1fr))}
.audience-list li{padding:18px 20px;border-radius:20px;background:rgba(255,255,255,.72);border:1px solid var(--sl-line);font:900 16px/1.35 Inter,system-ui,sans-serif}
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:24px}
.steps h3{margin:14px 0 8px;font-size:20px;line-height:1.15}
.center-cta{margin-top:26px;text-align:center}
.benefit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:24px}
.benefit-grid article{min-height:170px}
.benefit-grid span{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,var(--sl-accent),var(--sl-accent2));color:#fff;font-weight:950;margin-bottom:14px}
.proof{display:grid;grid-template-columns:minmax(0,.86fr) minmax(320px,1fr);gap:30px;align-items:center}
.facts-list li{padding:16px 18px;border-radius:18px;background:rgba(255,255,255,.68);border:1px solid var(--sl-line)}
.faq{display:grid;gap:12px}
.faq summary{cursor:pointer;font:950 18px/1.3 Inter,system-ui,sans-serif}
.faq p{margin:12px 0 0}
.final{text-align:center}
.final p{max-width:680px;margin:0 auto 24px;color:var(--sl-muted);font:750 18px/1.55 Inter,system-ui,sans-serif}
.legal-footer{padding:32px 0 44px;color:var(--sl-muted);font:700 13px/1.5 Inter,system-ui,sans-serif}
.legal-footer .wrap{display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;border-top:1px solid var(--sl-line);padding-top:22px}
.footer-links{display:flex;flex-wrap:wrap;gap:14px}
.footer-links a{text-decoration:underline;text-underline-offset:3px}
@media(max-width:900px){
  .wrap{width:min(100% - 24px,1180px)}
  .hero{min-height:auto;padding:22px 0 34px}
  .hero-grid,.split,.proof{grid-template-columns:1fr}
  .image-card{min-height:320px}
  .card-grid,.audience-list,.steps,.benefit-grid{grid-template-columns:1fr}
  h1{font-size:clamp(38px,12vw,58px)}
  h2{font-size:clamp(32px,10vw,48px)}
  .section{padding:46px 0}
  .cta-button{width:100%}
}
</style>
</head>
<body>
<div class="landing-root ${esc(themeClass)}">
  <main class="hero" data-landing-section="hero">
    <div class="wrap hero-grid">
      <div>
        <div class="badge">${esc(content.badge || 'Короткий первый шаг')}</div>
        <h1>${titleHtml}</h1>
        <p class="lead">${esc(lead)}</p>
        <div class="cta-row">${renderStaticLandingCta('hero-cta')}<span class="micro">Пока заглушка. Позже подключим рабочий вход.</span></div>
      </div>
      <div class="image-card" aria-hidden="true"><img src="${esc(images.hero)}" alt="" loading="eager" decoding="async"></div>
    </div>
  </main>

  <section class="section" data-landing-section="problem">
    <div class="wrap panel split">
      <div>
        <div class="badge">Проблема клиента</div>
        <h2>${esc(content.painTitle || 'Почему человек снова возвращается назад')}</h2>
        <p class="lead">${esc(content.painAlert || 'Сначала показываем знакомую ситуацию, потом переводим человека к короткому разбору и первому шагу.')}</p>
      </div>
      <ul class="problem-list">${problemHtml}</ul>
    </div>
  </section>

  <section class="section" data-landing-section="promise">
    <div class="wrap panel">
      <div class="split">
        <div>
          <div class="badge">Обещание результата</div>
          <h2>${esc(content.trustTitle || 'Сначала смысл, потом действие')}</h2>
          <p class="lead">${esc(content.trustSmall || 'Человек видит не набор обещаний, а понятную причину открыть разбор и перейти дальше.')}</p>
        </div>
        <div class="image-card" aria-hidden="true"><img src="${esc(images.value)}" alt="" loading="lazy" decoding="async"></div>
      </div>
      <div class="card-grid">${promiseHtml}</div>
    </div>
  </section>

  <section class="section" data-landing-section="for-whom">
    <div class="wrap panel">
      <div class="badge">Для кого продукт</div>
      <h2>Кому подходит этот разбор</h2>
      <ul class="audience-list">${audienceHtml}</ul>
    </div>
  </section>

  <section class="section" data-landing-section="how-it-works">
    <div class="wrap panel">
      <div class="badge">Как это работает</div>
      <h2>Как человек попадает в движение</h2>
      <div class="steps">${stepsHtml}</div>
      <div class="center-cta">${renderStaticLandingCta('how-cta')}</div>
    </div>
  </section>

  <section class="section" data-landing-section="what-get">
    <div class="wrap panel split">
      <div>
        <div class="badge">Что получит человек</div>
        <h2>${esc(content.valueTitle || 'Что человек увидит внутри')}</h2>
      </div>
      <div class="image-card" aria-hidden="true"><img src="${esc(images.cta)}" alt="" loading="lazy" decoding="async"></div>
    </div>
  </section>

  <section class="section" data-landing-section="benefits">
    <div class="wrap panel">
      <div class="badge">Преимущества</div>
      <h2>Почему это не выглядит как очередной курс</h2>
      <div class="benefit-grid">${benefitHtml}</div>
      <div class="center-cta">${renderStaticLandingCta('benefits-cta')}</div>
    </div>
  </section>

  <section class="section" data-landing-section="proof">
    <div class="wrap panel proof">
      <div>
        <div class="badge">Социальное доказательство</div>
        <h2>Что важно для запуска рекламы</h2>
        <ul class="facts-list">${factsHtml}</ul>
        <div class="center-cta">${renderStaticLandingCta('proof-cta')}</div>
      </div>
      <div class="image-card" aria-hidden="true"><img src="${esc(images.hero)}" alt="" loading="lazy" decoding="async"></div>
    </div>
  </section>

  <section class="section" data-landing-section="faq">
    <div class="wrap panel">
      <div class="badge">FAQ</div>
      <h2>Частые вопросы</h2>
      <div class="faq">${faqHtml}</div>
    </div>
  </section>

  <section class="section final" data-landing-section="final-cta">
    <div class="wrap panel">
      <div class="badge">Финальный CTA</div>
      <h2>${esc(content.actionTitle || 'Откройте первый шаг')}</h2>
      <p>${esc(content.actionSubtitle || 'Сейчас кнопка безопасно стоит на заглушке. После подключения рабочая ссылка заменится централизованно.')}</p>
      ${renderStaticLandingCta('final-cta')}
    </div>
  </section>

  <footer class="legal-footer" data-landing-section="legal-footer">
    <div class="wrap">
      <span>© ${new Date().getFullYear()} ${esc(config.clientName || config.landingName)}</span>
      <nav class="footer-links" aria-label="Юридические ссылки">
        <a href="#">Политика конфиденциальности</a>
        <a href="#">Оферта</a>
        <a href="#">Контакты</a>
      </nav>
    </div>
  </footer>
</div>
${buildStaticLandingPlaceholderScript()}
</body>
</html>`;
}

function renderInteractiveQuizPrelanding({
  mode,
  content,
  projectData,
  landingMeta,
  sceneImage,
  style,
  palette,
  designRoute
}) {
  const isPersonalRoute = mode === 'personalRouteQuiz';
  const isBarrierProfile = mode === 'barrierProfileQuiz';
  const rootModeClass = isBarrierProfile ? 'fh-bpq26' : isPersonalRoute ? 'fh-prq26' : 'fh-dq26';
  const title = stripHtml(content?.titleHtml || content?.title || 'Откройте короткий разбор и найдите первый понятный шаг');
  const subtitle = stripHtml(
    content?.trustSmall
      || content?.actionSubtitle
      || content?.valueTitle
      || 'Ответьте на несколько коротких вопросов и получите ориентир без лишнего давления.'
  );
  const heroImage = bothelpImageSrc(sceneImage || content?.sceneImage || content?.heroImage || PRELANDING_FALLBACK_IMAGES[0]);
  const styleKey = `${style || ''} ${palette || ''} ${designRoute?.id || ''}`.toLowerCase();
  const theme = isBarrierProfile
    ? styleKey.includes('teal') || styleKey.includes('green')
      ? { bg: '#071512', panel: '#0d221d', soft: '#143129', accent: '#2dd4a0', accent2: '#8ce8c9', text: '#f4fff9', muted: '#bdd6cc', line: 'rgba(45,212,160,.24)' }
      : styleKey.includes('blue') || styleKey.includes('navy')
        ? { bg: '#07101c', panel: '#0d1a2d', soft: '#142641', accent: '#4f8cff', accent2: '#83c9ff', text: '#f4f8ff', muted: '#b8c8dc', line: 'rgba(79,140,255,.25)' }
        : { bg: '#120d10', panel: '#201418', soft: '#2b1b20', accent: '#ff765f', accent2: '#ffb08e', text: '#fff7f4', muted: '#d8c5c8', line: 'rgba(255,118,95,.25)' }
    : isPersonalRoute
    ? styleKey.includes('amber') || styleKey.includes('gold')
      ? { bg: '#130f08', panel: '#1c160d', soft: '#261d10', accent: '#f5b642', accent2: '#ffd77a', text: '#fffaf0', muted: '#d4c8b5', line: 'rgba(245,182,66,.24)' }
      : styleKey.includes('violet') || styleKey.includes('blue')
        ? { bg: '#0c0b18', panel: '#15132a', soft: '#1d1a36', accent: '#9b7bff', accent2: '#5fa9ff', text: '#f7f5ff', muted: '#c5c0db', line: 'rgba(155,123,255,.25)' }
        : { bg: '#140b13', panel: '#21101d', soft: '#2b1525', accent: '#ff6f61', accent2: '#ffad86', text: '#fff6f4', muted: '#d8c2cd', line: 'rgba(255,111,97,.25)' }
    : styleKey.includes('gold') || styleKey.includes('yellow')
      ? { bg: '#100e09', panel: '#1a170e', soft: '#242014', accent: '#f6c453', accent2: '#ffe49a', text: '#fffaf0', muted: '#d2c8ae', line: 'rgba(246,196,83,.25)' }
      : styleKey.includes('forest') || styleKey.includes('green')
        ? { bg: '#07140f', panel: '#0d2118', soft: '#123021', accent: '#41c78a', accent2: '#9ae8bd', text: '#f3fff8', muted: '#bad5c6', line: 'rgba(65,199,138,.24)' }
        : { bg: '#07101d', panel: '#0c1b2e', soft: '#112844', accent: '#4f8cff', accent2: '#77c8ff', text: '#f4f8ff', muted: '#b6c6da', line: 'rgba(79,140,255,.25)' };
  const directionQuestions = [
    {
      eyebrow: 'ТОЧКА НАПРЯЖЕНИЯ',
      title: 'Что в текущем деле забирает у тебя больше всего сил?',
      hint: 'Выберите ответ, который ближе к реальности сейчас.',
      options: [
        'Работаю много, но смысла почти не чувствую',
        'Держит стабильность, страшно что-то менять',
        'Понимаю, что хочу другого, но не вижу старта',
        'Не работа, а весь ритм жизни стал чужим'
      ]
    },
    {
      eyebrow: 'ПОВТОРЯЮЩИЙСЯ СЦЕНАРИЙ',
      title: 'Когда появляется мысль «надо что-то менять», что происходит потом?',
      hint: 'Важен привычный сценарий, а не редкое исключение.',
      options: [
        'Откладываю до подходящего момента',
        'Пробую, но быстро распыляюсь',
        'Ищу ещё информацию, чтобы не ошибиться',
        'Делаю шаг и возвращаюсь назад после первого сбоя'
      ]
    },
    {
      eyebrow: 'НЕДОСТАЮЩАЯ ОПОРА',
      title: 'Чего сейчас не хватает, чтобы сдвинуться?',
      hint: 'Ответ поможет определить не идеальный, а реальный первый шаг.',
      options: [
        'Одного ясного направления',
        'Реалистичного плана без героизма',
        'Опоры, чтобы не бросить после старта',
        'Разрешения наконец выбрать себя'
      ]
    },
    {
      eyebrow: 'ЧЕСТНЫЙ РЕЗУЛЬТАТ',
      title: 'Какой первый результат был бы для тебя честным?',
      hint: 'Не максимум. То, что действительно изменит ближайший месяц.',
      options: [
        'Понять, чего я хочу на самом деле',
        'Выбрать одну главную цель',
        'Собрать первые действия на ближайший месяц',
        'Перестать жить и работать на автопилоте'
      ]
    }
  ];
  const personalRouteQuestions = [
    {
      eyebrow: 'ТВОЙ СЦЕНАРИЙ',
      title: 'Что чаще всего сбивает тебя с выбранного курса?',
      hint: 'Выбери ответ, который больше похож на правду — не на правильную версию себя.',
      options: [
        'Начинаю мощно, но быстро выдыхаюсь',
        'Долго готовлюсь и откладываю первый шаг',
        'Перегружаю себя и срываюсь',
        'Не понимаю, куда именно двигаться'
      ]
    },
    {
      eyebrow: 'ПОСЛЕ СБОЯ',
      title: 'Что ты обычно делаешь, когда снова не получилось?',
      hint: 'Здесь нет плохого ответа. Важно увидеть повторяющийся сценарий.',
      options: [
        'Ругаю себя и обещаю начать заново',
        'Ищу новый метод, курс или систему',
        'Возвращаюсь в привычный ритм',
        'Стараюсь вообще об этом не думать'
      ]
    },
    {
      eyebrow: 'УСТОЙЧИВОСТЬ',
      title: 'Как долго обычно держатся твои изменения?',
      hint: 'Не считай исключения — вспомни, как происходит чаще всего.',
      options: [
        'Несколько дней',
        'Одну–две недели',
        'До первого сложного периода',
        'Я чаще не начинаю, чем срываюсь'
      ]
    },
    {
      eyebrow: 'ТОЧКА ОПОРЫ',
      title: 'Чего тебе сейчас не хватает больше всего?',
      hint: 'Это станет основой твоего личного маршрута.',
      options: [
        'Понятной точки старта',
        'Реалистичного маршрута',
        'Системы без перегруза',
        'Поддержки и обратной связи'
      ]
    }
  ];
  const barrierProfileQuestions = [
    {
      eyebrow: 'ТОЧКА СБОЯ',
      title: 'Как обычно начинается очередная попытка что-то изменить?',
      hint: 'Выберите не красивый ответ, а наиболее частый сценарий. Именно он определяет профиль барьера.',
      options: [
        { label: 'Начинаю слишком резко и быстро выдыхаюсь', value: 'overdrive' },
        { label: 'Долго откладываю, ожидая полной уверенности', value: 'freeze' },
        { label: 'Беру на себя слишком много и срываюсь', value: 'overload' },
        { label: 'Меняю направление, не успев проверить прежнее', value: 'drift' }
      ]
    },
    {
      eyebrow: 'ПОСЛЕ НЕУДАЧИ',
      title: 'Что происходит сразу после очередного сбоя?',
      hint: 'Здесь проявляется не слабость характера, а автоматическая реакция, которую можно изменить.',
      options: [
        { label: 'Обещаю себе новый мощный старт', value: 'overdrive' },
        { label: 'Замираю и стараюсь об этом не думать', value: 'freeze' },
        { label: 'Добавляю ещё задач и контроля', value: 'overload' },
        { label: 'Ищу новый способ или новую систему', value: 'drift' }
      ]
    },
    {
      eyebrow: 'ДЛИНА ИЗМЕНЕНИЯ',
      title: 'Как долго обычно держится выбранный курс?',
      hint: 'Не вспоминайте редкое исключение — оцените привычный ритм за последние месяцы.',
      options: [
        { label: 'До нескольких дней', value: 'overdrive' },
        { label: 'Часто вообще не дохожу до старта', value: 'freeze' },
        { label: 'До первого перегруженного периода', value: 'overload' },
        { label: 'Пока новая идея не вытеснит прежнюю', value: 'drift' }
      ]
    },
    {
      eyebrow: 'НЕДОСТАЮЩАЯ ОПОРА',
      title: 'Что помогло бы не повторить тот же круг?',
      hint: 'Ответ станет основой первого шага, а не очередного большого обещания себе.',
      options: [
        { label: 'Спокойный темп без нового рывка', value: 'overdrive' },
        { label: 'Безопасное маленькое первое действие', value: 'freeze' },
        { label: 'Жёсткое ограничение числа задач', value: 'overload' },
        { label: 'Одно ясное направление без метаний', value: 'drift' }
      ]
    }
  ];
  const questions = isBarrierProfile
    ? barrierProfileQuestions
    : isPersonalRoute
      ? personalRouteQuestions
      : directionQuestions;
  const heroLabel = isBarrierProfile ? 'Профиль барьера' : isPersonalRoute ? 'Личный маршрут' : 'Короткий разбор';
  const heroButton = isBarrierProfile ? 'Увидеть свой профиль' : isPersonalRoute ? 'Определить свой маршрут' : 'Начать разбор';
  const resultTitle = isBarrierProfile
    ? 'Ваш профиль барьера определён'
    : isPersonalRoute
      ? 'Ваш личный маршрут собран'
      : 'Ваш первый маршрут уже виден';
  const resultText = isBarrierProfile
    ? 'Ответы покажут не общую мотивацию, а конкретный повторяющийся сценарий и первый шаг, который можно выдержать в обычной неделе.'
    : isPersonalRoute
    ? 'Ответы показали, где сейчас находится главная точка опоры. Перейдите к защищённой форме регистрации и заберите следующий шаг.'
    : 'Вы уже отделили реальную точку старта от лишнего шума. Перейдите к защищённой форме регистрации и заберите первый шаг без нового рывка.';

  return `${buildAtmospaceHeadConfig({
  projectData,
  ...(landingMeta || {})
})}
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800;900&display=swap');
#fh-preland-root.${rootModeClass},#fh-preland-root.${rootModeClass} *{box-sizing:border-box}
#fh-preland-root.${rootModeClass}{
  --fhq-bg:${theme.bg};--fhq-panel:${theme.panel};--fhq-soft:${theme.soft};--fhq-accent:${theme.accent};--fhq-accent2:${theme.accent2};--fhq-text:${theme.text};--fhq-muted:${theme.muted};--fhq-line:${theme.line};
  width:100vw;min-height:100svh;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);overflow:hidden;background:var(--fhq-bg);color:var(--fhq-text);font-family:'Manrope',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:0
}
#fh-preland-root.${rootModeClass} [hidden]{display:none!important}
#fh-preland-root.${rootModeClass} button,#fh-preland-root.${rootModeClass} a,#fh-preland-root.${rootModeClass} input{font:inherit}
#fh-preland-root.${rootModeClass} button,#fh-preland-root.${rootModeClass} a{letter-spacing:0}
#fh-preland-root.${rootModeClass} .fhq-shell{width:min(1180px,calc(100% - 32px));margin:0 auto}
#fh-preland-root.${rootModeClass} .fhq-hero{min-height:100svh;display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,.92fr);gap:54px;align-items:center;padding:52px 0}
#fh-preland-root.${rootModeClass} .fhq-copy{position:relative;z-index:2}
#fh-preland-root.${rootModeClass} .fhq-kicker{display:inline-flex;align-items:center;gap:10px;margin-bottom:24px;padding:10px 14px;border:1px solid var(--fhq-line);border-radius:999px;background:var(--fhq-soft);color:var(--fhq-accent2);font-size:12px;font-weight:900;text-transform:uppercase}
#fh-preland-root.${rootModeClass} .fhq-kicker:before{content:'';width:9px;height:9px;border-radius:50%;background:var(--fhq-accent)}
#fh-preland-root.${rootModeClass} h1,#fh-preland-root.${rootModeClass} h2,#fh-preland-root.${rootModeClass} p{margin-top:0}
#fh-preland-root.${rootModeClass} h1{max-width:690px;margin-bottom:24px;font-size:64px;line-height:1.02;font-weight:900;letter-spacing:0;text-wrap:balance}
#fh-preland-root.${rootModeClass} .fhq-lead{max-width:660px;margin-bottom:30px;color:var(--fhq-muted);font-size:20px;line-height:1.55;font-weight:600}
#fh-preland-root.${rootModeClass} .fhq-start,#fh-preland-root.${rootModeClass} .fhq-back,#fh-preland-root.${rootModeClass} .fhq-restart{border:0;border-radius:8px;cursor:pointer;font-weight:900}
#fh-preland-root.${rootModeClass} .fhq-start{min-height:64px;padding:0 28px;background:var(--fhq-accent);color:#07101a;font-size:17px;box-shadow:0 18px 50px rgba(0,0,0,.28)}
#fh-preland-root.${rootModeClass} .fhq-image{position:relative;min-height:570px;overflow:hidden;border:1px solid var(--fhq-line);border-radius:8px;background:var(--fhq-panel);box-shadow:0 28px 80px rgba(0,0,0,.34)}
#fh-preland-root.${rootModeClass} .fhq-image img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
#fh-preland-root.${rootModeClass} .fhq-image:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(0,0,0,.48));pointer-events:none}
#fh-preland-root.${rootModeClass} .fhq-stage{min-height:100svh;display:grid;align-items:center;padding:54px 0}
#fh-preland-root.${rootModeClass} .fhq-panel{width:min(900px,100%);margin:0 auto;padding:42px;border:1px solid var(--fhq-line);border-radius:8px;background:var(--fhq-panel);box-shadow:0 28px 80px rgba(0,0,0,.30)}
#fh-preland-root.${rootModeClass} .fhq-progress-row{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:32px;color:var(--fhq-muted);font-size:13px;font-weight:800}
#fh-preland-root.${rootModeClass} .fhq-progress{height:7px;flex:1;overflow:hidden;border-radius:999px;background:var(--fhq-soft)}
#fh-preland-root.${rootModeClass} .fhq-progress span{display:block;width:0;height:100%;border-radius:inherit;background:var(--fhq-accent);transition:width .25s ease}
#fh-preland-root.${rootModeClass} .fhq-eyebrow{margin-bottom:14px;color:var(--fhq-accent2);font-size:12px;font-weight:900;text-transform:uppercase}
#fh-preland-root.${rootModeClass} .fhq-question{margin-bottom:12px;font-size:38px;line-height:1.15;font-weight:900;letter-spacing:0;text-wrap:balance}
#fh-preland-root.${rootModeClass} .fhq-hint{margin-bottom:28px;color:var(--fhq-muted);font-size:16px;line-height:1.5}
#fh-preland-root.${rootModeClass} .fhq-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
#fh-preland-root.${rootModeClass} .fhq-option{min-height:82px;padding:18px;border:1px solid var(--fhq-line);border-radius:8px;background:var(--fhq-soft);color:var(--fhq-text);cursor:pointer;text-align:left;font-size:15px;line-height:1.42;font-weight:800;transition:border-color .18s ease,transform .18s ease,background .18s ease}
#fh-preland-root.${rootModeClass} .fhq-option:hover,#fh-preland-root.${rootModeClass} .fhq-option:focus-visible{border-color:var(--fhq-accent);background:var(--fhq-bg);transform:translateY(-2px);outline:none}
#fh-preland-root.${rootModeClass} .fhq-nav{display:flex;justify-content:flex-start;margin-top:24px}
#fh-preland-root.${rootModeClass} .fhq-back,#fh-preland-root.${rootModeClass} .fhq-restart{min-height:44px;padding:0 16px;background:transparent;color:var(--fhq-muted);border:1px solid var(--fhq-line)}
#fh-preland-root.${rootModeClass} .fhq-result{text-align:center}
#fh-preland-root.${rootModeClass} .fhq-result h2{max-width:740px;margin:0 auto 18px;font-size:48px;line-height:1.08;font-weight:900;letter-spacing:0;text-wrap:balance}
#fh-preland-root.${rootModeClass} .fhq-result-copy{max-width:700px;margin:0 auto 28px;color:var(--fhq-muted);font-size:18px;line-height:1.55}
#fh-preland-root.${rootModeClass} .fhq-registration{max-width:720px;margin:0 auto}
#fh-preland-root.${rootModeClass} .fhq-cta{display:flex;align-items:center;justify-content:center;min-height:66px;padding:16px;border-radius:8px;color:#fff!important;text-decoration:none!important;font-size:16px;font-weight:900}
#fh-preland-root.${rootModeClass} .fhq-cta{background:var(--fhq-accent);color:#07101a!important}
#fh-preland-root.${rootModeClass} .fhq-cta[aria-disabled=true]{pointer-events:none;opacity:.58}
#fh-preland-root.${rootModeClass} .fhq-restart{margin-top:16px}
#fh-preland-root.${rootModeClass}.fh-prq26 .fhq-hero,#fh-preland-root.${rootModeClass}.fh-bpq26 .fhq-hero{grid-template-columns:minmax(0,.86fr) minmax(460px,1.14fr)}
#fh-preland-root.${rootModeClass}.fh-prq26 .fhq-image,#fh-preland-root.${rootModeClass}.fh-bpq26 .fhq-image{min-height:620px}
@media(max-width:900px){
  #fh-preland-root.${rootModeClass} .fhq-hero,#fh-preland-root.${rootModeClass}.fh-prq26 .fhq-hero,#fh-preland-root.${rootModeClass}.fh-bpq26 .fhq-hero{min-height:auto;grid-template-columns:1fr;gap:28px;padding:36px 0}
  #fh-preland-root.${rootModeClass} h1{font-size:48px}
  #fh-preland-root.${rootModeClass} .fhq-image,#fh-preland-root.${rootModeClass}.fh-prq26 .fhq-image,#fh-preland-root.${rootModeClass}.fh-bpq26 .fhq-image{min-height:0;aspect-ratio:16/10}
}
@media(max-width:640px){
  #fh-preland-root.${rootModeClass} .fhq-shell{width:calc(100% - 24px)}
  #fh-preland-root.${rootModeClass} .fhq-hero{padding:24px 0 34px}
  #fh-preland-root.${rootModeClass} h1{font-size:36px;line-height:1.08}
  #fh-preland-root.${rootModeClass} .fhq-lead{font-size:17px}
  #fh-preland-root.${rootModeClass} .fhq-start{width:100%}
  #fh-preland-root.${rootModeClass} .fhq-image,#fh-preland-root.${rootModeClass}.fh-prq26 .fhq-image,#fh-preland-root.${rootModeClass}.fh-bpq26 .fhq-image{aspect-ratio:4/3}
  #fh-preland-root.${rootModeClass} .fhq-stage{padding:24px 0}
  #fh-preland-root.${rootModeClass} .fhq-panel{padding:22px 16px}
  #fh-preland-root.${rootModeClass} .fhq-question{font-size:28px}
  #fh-preland-root.${rootModeClass} .fhq-options{grid-template-columns:1fr}
  #fh-preland-root.${rootModeClass} .fhq-option{min-height:70px}
  #fh-preland-root.${rootModeClass} .fhq-result h2{font-size:34px}
}
</style>
<div id="fh-preland-root" class="fhq-root ${rootModeClass} ${esc(prelandingClassToken(style || designRoute?.id || 'default'))}" data-atmospace-embedded-quiz="true" data-atmospace-question-count="4">
  <main class="fhq-shell">
    <section class="fhq-hero" data-quiz-hero>
      <div class="fhq-copy">
        <div class="fhq-kicker">${esc(heroLabel)}</div>
        <h1>${esc(title)}</h1>
        <p class="fhq-lead">${esc(subtitle)}</p>
        <button class="fhq-start" type="button" data-quiz-start>${esc(heroButton)}</button>
      </div>
      <div class="fhq-image" aria-hidden="true">
        <img src="${esc(heroImage)}" alt="" loading="eager" decoding="async" fetchpriority="high">
      </div>
    </section>

    <section class="fhq-stage" data-quiz-stage hidden>
      <div class="fhq-panel">
        <div data-quiz-form>
          <div class="fhq-progress-row"><span data-quiz-counter>1 / ${questions.length}</span><div class="fhq-progress"><span data-quiz-progress></span></div></div>
          <div class="fhq-eyebrow" data-quiz-eyebrow></div>
          <h2 class="fhq-question" data-quiz-question></h2>
          <p class="fhq-hint" data-quiz-hint></p>
          <div class="fhq-options" data-quiz-options></div>
          <div class="fhq-nav"><button class="fhq-back" type="button" data-quiz-back>Назад</button></div>
        </div>

        <div class="fhq-result" data-quiz-result hidden>
          <div class="fhq-kicker">Результат готов</div>
          <h2 data-quiz-result-title>${esc(resultTitle)}</h2>
          <p class="fhq-result-copy" data-quiz-result-copy>${esc(resultText)}</p>
          <div class="fhq-registration" data-atmospace-registration-section>
            <a href="#" data-atmospace-registration-link data-atmospace-state="loading" aria-disabled="true" class="fhq-cta">Перейти к форме регистрации</a>
          </div>
          <button class="fhq-restart" type="button" data-quiz-restart>Пройти заново</button>
        </div>
      </div>
    </section>
  </main>
</div>
<script>
(function(){
  'use strict';
  var root=document.getElementById('fh-preland-root');
  if(!root)return;
  var questions=${safeInlineJson(questions)};
  var isPersonal=${isPersonalRoute ? 'true' : 'false'};
  var isBarrier=${isBarrierProfile ? 'true' : 'false'};
  var hero=root.querySelector('[data-quiz-hero]');
  var stage=root.querySelector('[data-quiz-stage]');
  var form=root.querySelector('[data-quiz-form]');
  var result=root.querySelector('[data-quiz-result]');
  var resultTitle=root.querySelector('[data-quiz-result-title]');
  var resultCopy=root.querySelector('[data-quiz-result-copy]');
  var defaultResultTitle=${safeInlineJson(resultTitle)};
  var defaultResultText=${safeInlineJson(resultText)};
  var eyebrow=root.querySelector('[data-quiz-eyebrow]');
  var questionTitle=root.querySelector('[data-quiz-question]');
  var hint=root.querySelector('[data-quiz-hint]');
  var options=root.querySelector('[data-quiz-options]');
  var counter=root.querySelector('[data-quiz-counter]');
  var progress=root.querySelector('[data-quiz-progress]');
  var back=root.querySelector('[data-quiz-back]');
  var index=0;
  var answers=[];

  function moveTo(node){
    if(node&&typeof node.scrollIntoView==='function')node.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderQuestion(){
    var current=questions[index];
    if(!current){showResult();return;}
    eyebrow.textContent=current.eyebrow||'';
    questionTitle.textContent=current.title||'';
    hint.textContent=current.hint||'';
    counter.textContent=String(index+1)+' / '+String(questions.length);
    progress.style.width=String(((index+1)/questions.length)*100)+'%';
    back.disabled=index===0;
    back.style.opacity=index===0?'.45':'1';
    options.replaceChildren();
    current.options.forEach(function(option,optionIndex){
      var item=typeof option==='string'?{label:option,value:''}:option;
      var button=document.createElement('button');
      button.type='button';
      button.className='fhq-option';
      button.textContent=item.label;
      button.addEventListener('click',function(){
        answers[index]={label:item.label,value:item.value||'',optionIndex:optionIndex};
        document.dispatchEvent(new CustomEvent('atmospace:quiz-answer',{detail:{questionNumber:index+1}}));
        index+=1;
        if(index>=questions.length){showResult();return;}
        renderQuestion();
      });
      options.appendChild(button);
    });
  }

  var barrierProfiles={
    overdrive:{
      title:'Твой барьер — рывок вместо устойчивого ритма',
      text:'Ты начинаешь сильнее, чем может выдержать обычная неделя. Первый шаг — не новый марафон, а выбранный ритм: '
    },
    freeze:{
      title:'Твой барьер — ожидание полной уверенности',
      text:'Старт откладывается до момента, когда исчезнут сомнения. Первый шаг должен быть маленьким и безопасным: '
    },
    overload:{
      title:'Твой барьер — перегруз вместо приоритета',
      text:'Ты пытаешься удержать слишком много сразу, и система ломается под собственной тяжестью. Первый шаг — ограничить нагрузку: '
    },
    drift:{
      title:'Твой барьер — смена направления до проверки',
      text:'Новая идея вытесняет прежнюю раньше, чем появляется честный результат. Первый шаг — зафиксировать один маршрут: '
    }
  };

  function getBarrierProfile(){
    var scores={overdrive:0,freeze:0,overload:0,drift:0};
    var order=['overdrive','freeze','overload','drift'];
    answers.slice(0,4).forEach(function(answer){
      if(answer&&Object.prototype.hasOwnProperty.call(scores,answer.value))scores[answer.value]+=1;
    });
    var winner=order[0];
    order.slice(1).forEach(function(key){
      if(scores[key]>scores[winner])winner=key;
    });
    return barrierProfiles[winner];
  }

  function showResult(){
    form.hidden=true;
    result.hidden=false;
    resultTitle.textContent=defaultResultTitle;
    resultCopy.textContent=defaultResultText;
    if(isBarrier){
      var profile=getBarrierProfile();
      var pace=answers[3]&&answers[3].label?answers[3].label:'один небольшой шаг, который можно повторить';
      resultTitle.textContent=profile.title;
      resultCopy.textContent=profile.text+pace+'. Продолжи на защищённой странице регистрации Atmospace.';
    }else if(isPersonal){
      var support=answers[3]&&answers[3].label?answers[3].label:'';
      var title='Твоя точка старта — устойчивый ритм без перегруза';
      if(support.indexOf('Поддержки')!==-1)title='Твоя точка старта — опора, а не ещё больше контроля';
      else if(support.indexOf('Понятной')!==-1)title='Твоя точка старта — ясность вместо нового рывка';
      else if(support.indexOf('Реалистичного')!==-1)title='Твоя точка старта — маршрут, который выдержит реальность';
      resultTitle.textContent=title;
    }
    document.dispatchEvent(new CustomEvent('atmospace:quiz-complete'));
    moveTo(stage);
  }

  root.querySelector('[data-quiz-start]').addEventListener('click',function(){
    document.dispatchEvent(new CustomEvent('atmospace:quiz-start'));
    hero.hidden=true;
    stage.hidden=false;
    form.hidden=false;
    result.hidden=true;
    index=0;
    answers=[];
    renderQuestion();
    moveTo(stage);
  });

  back.addEventListener('click',function(){
    if(index===0){
      stage.hidden=true;
      hero.hidden=false;
      moveTo(hero);
      return;
    }
    index-=1;
    renderQuestion();
  });

  root.querySelector('[data-quiz-restart]').addEventListener('click',function(){
    index=0;
    answers=[];
    form.hidden=false;
    result.hidden=true;
    renderQuestion();
    moveTo(stage);
  });
})();
</script>
${buildAtmospacePrelandingTrackingScript()}`;
}

function renderStaticInsightPrelanding({
  mode,
  content,
  projectData,
  landingMeta,
  sceneImage,
  style,
  palette,
  designRoute
}) {
  const isBarrier = mode === 'barrierProfileQuiz';
  const isPersonal = mode === 'personalRouteQuiz';
  const title = stripHtml(content?.titleHtml || content?.title || 'Откройте короткий разбор и первый понятный шаг');
  const lead = stripHtml(
    content?.trustTitle
      || content?.trustSmall
      || content?.valueTitle
      || 'Короткий разбор показывает повторяющийся сценарий и понятный следующий шаг.'
  );
  const cards = (content?.cards?.length
    ? content.cards
    : (content?.valueItems || []).map((text, index) => ({
        title: ['Что удерживает', 'Что меняется', 'С чего начать'][index] || `Шаг ${index + 1}`,
        text
      })))
    .slice(0, 3);
  while (cards.length < 3) {
    cards.push({
      title: ['Точка старта', 'Понятный маршрут', 'Следующий шаг'][cards.length],
      text: 'Без нового рывка: один смысл, который можно проверить в реальной жизни.'
    });
  }
  const scene = bothelpImageSrc(sceneImage || content?.sceneImage || content?.heroImage || PRELANDING_FALLBACK_IMAGES[0]);
  const styleKey = `${style || ''} ${palette || ''} ${designRoute?.id || ''}`.toLowerCase();
  const theme = isBarrier
    ? styleKey.includes('teal') || styleKey.includes('green')
      ? { bg: '#061713', panel: '#0d251e', soft: '#12352a', accent: '#32d39a', accent2: '#a6f0d2', text: '#f4fff9', muted: '#b9d7cc', line: 'rgba(50,211,154,.24)' }
      : { bg: '#180c0b', panel: '#261311', soft: '#361c18', accent: '#ff785f', accent2: '#ffc19f', text: '#fff8f5', muted: '#dfc5bd', line: 'rgba(255,120,95,.25)' }
    : isPersonal
      ? { bg: '#130d1d', panel: '#1d152b', soft: '#2b1f3e', accent: '#a884ff', accent2: '#6cc9ff', text: '#fbf8ff', muted: '#cdc4df', line: 'rgba(168,132,255,.25)' }
      : styleKey.includes('gold') || styleKey.includes('yellow')
        ? { bg: '#120f08', panel: '#1e190d', soft: '#2c2411', accent: '#f6c453', accent2: '#ffe8a5', text: '#fffaf0', muted: '#d8cdb3', line: 'rgba(246,196,83,.25)' }
        : styleKey.includes('forest') || styleKey.includes('green')
          ? { bg: '#071610', panel: '#0d2419', soft: '#143423', accent: '#46cf8e', accent2: '#9bedbc', text: '#f4fff8', muted: '#bdd9c9', line: 'rgba(70,207,142,.25)' }
          : { bg: '#07111f', panel: '#0d1e34', soft: '#132b49', accent: '#57a0ff', accent2: '#83d3ff', text: '#f5f9ff', muted: '#bdcce0', line: 'rgba(87,160,255,.25)' };
  const kicker = isBarrier ? 'Профиль повторяющегося барьера' : isPersonal ? 'Личный маршрут' : 'Маршрут действия';
  const sectionTitle = isBarrier
    ? 'Увидьте, где именно ломается привычный сценарий'
    : 'Разложите задачу на три понятные опоры';
  const finalTitle = content?.actionTitle || (isBarrier ? 'Откройте разбор своего сценария' : 'Заберите первый понятный шаг');
  const finalText = content?.actionSubtitle || content?.ctaLead || 'Продолжение откроется на защищённой странице регистрации Atmospace.';
  const cardsHtml = cards.map((card, index) => `<article class="fh-si-card">
    <span>${String(index + 1).padStart(2, '0')}</span>
    <h3>${esc(card?.title || `Смысл ${index + 1}`)}</h3>
    <p>${esc(card?.text || '')}</p>
  </article>`).join('');

  return `${buildAtmospaceHeadConfig({
  projectData,
  ...(landingMeta || {})
})}
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800;900&display=swap');
#fh-preland-root.fh-si26,#fh-preland-root.fh-si26 *{box-sizing:border-box}
#fh-preland-root.fh-si26{
  --si-bg:${theme.bg};--si-panel:${theme.panel};--si-soft:${theme.soft};--si-accent:${theme.accent};--si-accent2:${theme.accent2};--si-text:${theme.text};--si-muted:${theme.muted};--si-line:${theme.line};
  width:100vw;min-height:100svh;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);overflow:hidden;background:var(--si-bg);color:var(--si-text);font-family:'Manrope',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:0
}
#fh-preland-root.fh-si26 a{color:inherit;text-decoration:none}
#fh-preland-root .fh-si-shell{width:min(1180px,calc(100% - 32px));margin:0 auto}
#fh-preland-root .fh-si-hero{min-height:100svh;display:grid;grid-template-columns:minmax(0,1fr) minmax(390px,.86fr);gap:46px;align-items:center;padding:46px 0}
#fh-preland-root .fh-si-kicker{display:inline-flex;align-items:center;gap:9px;margin-bottom:22px;padding:9px 13px;border:1px solid var(--si-line);border-radius:999px;background:var(--si-soft);color:var(--si-accent2);font-size:12px;font-weight:900;text-transform:uppercase}
#fh-preland-root .fh-si-kicker:before{content:'';width:8px;height:8px;border-radius:50%;background:var(--si-accent)}
#fh-preland-root .fh-si-title{max-width:720px;margin:0 0 22px;font-size:clamp(44px,6vw,78px);line-height:1.02;font-weight:900;letter-spacing:0;text-wrap:balance}
#fh-preland-root .fh-si-lead{max-width:680px;margin:0 0 28px;color:var(--si-muted);font-size:19px;line-height:1.55;font-weight:650}
#fh-preland-root .fh-si-cta{display:flex;align-items:center;justify-content:center;width:min(420px,100%);min-height:66px;padding:16px 22px;border-radius:8px;background:var(--si-accent);color:#071019!important;font-size:17px;font-weight:900;box-shadow:0 18px 44px rgba(0,0,0,.24)}
#fh-preland-root .fh-si-cta[aria-disabled=true]{pointer-events:none;opacity:.58}
#fh-preland-root .fh-si-media{position:relative;min-height:590px;overflow:hidden;border:1px solid var(--si-line);border-radius:8px;background:var(--si-panel);box-shadow:0 28px 74px rgba(0,0,0,.34)}
#fh-preland-root .fh-si-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
#fh-preland-root .fh-si-media:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 52%,rgba(0,0,0,.42));pointer-events:none}
#fh-preland-root .fh-si-section{padding:82px 0;background:var(--si-panel);border-top:1px solid var(--si-line);border-bottom:1px solid var(--si-line)}
#fh-preland-root .fh-si-section h2{max-width:820px;margin:0 0 34px;font-size:clamp(34px,4.7vw,58px);line-height:1.08;font-weight:900;letter-spacing:0;text-wrap:balance}
#fh-preland-root .fh-si-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
#fh-preland-root .fh-si-card{min-height:230px;padding:24px;border:1px solid var(--si-line);border-radius:8px;background:var(--si-soft)}
#fh-preland-root .fh-si-card>span{display:block;margin-bottom:28px;color:var(--si-accent);font-size:13px;font-weight:900}
#fh-preland-root .fh-si-card h3{margin:0 0 12px;font-size:21px;line-height:1.18;font-weight:900}
#fh-preland-root .fh-si-card p{margin:0;color:var(--si-muted);font-size:15px;line-height:1.52;font-weight:600}
#fh-preland-root .fh-si-final{padding:84px 0}
#fh-preland-root .fh-si-final-inner{display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,420px);gap:34px;align-items:end;padding:38px;border:1px solid var(--si-line);border-radius:8px;background:linear-gradient(135deg,var(--si-panel),var(--si-soft))}
#fh-preland-root .fh-si-final h2{margin:0 0 14px;font-size:clamp(34px,4.4vw,58px);line-height:1.06;font-weight:900;letter-spacing:0;text-wrap:balance}
#fh-preland-root .fh-si-final p{margin:0;color:var(--si-muted);font-size:17px;line-height:1.55;font-weight:600}
#fh-preland-root .fh-si-legal{margin:18px auto 0;color:var(--si-muted);font-size:11px;line-height:1.5;text-align:center}
@media(max-width:900px){
  #fh-preland-root .fh-si-hero,#fh-preland-root .fh-si-final-inner{grid-template-columns:1fr}
  #fh-preland-root .fh-si-hero{min-height:auto;padding:34px 0}
  #fh-preland-root .fh-si-media{min-height:0;aspect-ratio:16/10}
}
@media(max-width:640px){
  #fh-preland-root .fh-si-shell{width:calc(100% - 24px)}
  #fh-preland-root .fh-si-title{font-size:clamp(36px,11vw,50px);line-height:1.05}
  #fh-preland-root .fh-si-lead{font-size:16px}
  #fh-preland-root .fh-si-media{aspect-ratio:4/3}
  #fh-preland-root .fh-si-section,#fh-preland-root .fh-si-final{padding:54px 0}
  #fh-preland-root .fh-si-cards{grid-template-columns:1fr}
  #fh-preland-root .fh-si-card{min-height:auto}
  #fh-preland-root .fh-si-final-inner{padding:24px}
}
</style>
<div id="fh-preland-root" class="fh-si26 ${isBarrier ? 'fh-si-barrier' : isPersonal ? 'fh-si-personal' : 'fh-si-direction'}">
  <main class="fh-si-shell fh-si-hero" aria-label="Главный экран">
    <div>
      <div class="fh-si-kicker">${esc(kicker)}</div>
      <h1 class="fh-si-title">${esc(title)}</h1>
      <p class="fh-si-lead">${esc(lead)}</p>
      <div data-atmospace-registration-section>${renderAtmospaceRegistrationButton('fh-si-cta')}</div>
    </div>
    <div class="fh-si-media" aria-hidden="true"><img src="${esc(scene)}" alt="" loading="eager" decoding="async" fetchpriority="high"></div>
  </main>
  <section class="fh-si-section" aria-label="Ключевые смыслы">
    <div class="fh-si-shell">
      <div class="fh-si-kicker">Ключевые смыслы</div>
      <h2>${esc(sectionTitle)}</h2>
      <div class="fh-si-cards">${cardsHtml}</div>
    </div>
  </section>
  <section class="fh-si-final" aria-label="Форма регистрации">
    <div class="fh-si-shell fh-si-final-inner">
      <div><h2>${esc(finalTitle)}</h2><p>${esc(finalText)}</p></div>
      <div data-atmospace-registration-section>${renderAtmospaceRegistrationButton('fh-si-cta')}</div>
    </div>
    <p class="fh-si-legal">Регистрация и согласие выполняются на защищённой странице Atmospace.</p>
  </section>
</div>
${buildAtmospacePrelandingTrackingScript()}`;
}

function renderDirectionQuizPrelanding(props) {
  return renderStaticInsightPrelanding({ ...props, mode: 'directionQuiz' });
}

function renderPersonalRouteQuizPrelanding(props) {
  return renderStaticInsightPrelanding({ ...props, mode: 'personalRouteQuiz' });
}

function renderBarrierProfileQuizPrelanding(props) {
  return renderStaticInsightPrelanding({ ...props, mode: 'barrierProfileQuiz' });
}

function renderPrelandingHtml({ tpl, style, palette, photo, overrides, projectData, landingMeta, layout = 'split', typo = 'manrope', effects = [] }) {
  const isCoreMethod = overrides?.prelandingMode === 'coreMethod' || overrides?.prelandingMode === 'core-method';
  const isHeroBlocks = overrides?.prelandingMode === 'heroBlocks' || overrides?.prelandingMode === 'hero-blocks';
  const isNatureEditorial = overrides?.prelandingMode === 'natureEditorial' || overrides?.prelandingMode === 'nature-editorial';
  const isMinimalCompare = overrides?.prelandingMode === 'minimalCompare' || overrides?.prelandingMode === 'minimal-compare';
  const isDirectionQuiz = overrides?.prelandingMode === 'directionQuiz' || overrides?.prelandingMode === 'direction-quiz';
  const isPersonalRouteQuiz = overrides?.prelandingMode === 'personalRouteQuiz' || overrides?.prelandingMode === 'personal-route-quiz';
  const isBarrierProfileQuiz = overrides?.prelandingMode === 'barrierProfileQuiz' || overrides?.prelandingMode === 'barrier-profile-quiz';
  const overrideTemplateId = Number(overrides?.templateId);
  const baseTemplateId = [1, 2, 3].includes(Number(tpl)) ? Number(tpl) : 1;
  const templateId = isCoreMethod
    ? [1, 2, 3].includes(overrideTemplateId)
      ? overrideTemplateId
      : baseTemplateId
    : (overrides?.fromBanner || overrides?.lockTemplateCopy) && [1, 2, 3].includes(overrideTemplateId)
      ? overrideTemplateId
      : baseTemplateId;
  const content = mergePrelandingContent(
    PRELANDING_CONTENT[templateId] || PRELANDING_CONTENT[1],
    overrides
  );
  if (!content) return '';

  const paletteKey = PALETTES.some(x => x[0] === palette) ? palette : 'blue-trust';
  const paletteData = PALETTES.find(x => x[0] === paletteKey) || PALETTES[0];
  const [paletteAccent, paletteAccent2, paletteBg = '#050505'] = paletteData[3];
  const resolvedCoreStyle = CORE_PRELANDING_THEME_STYLES[templateId] || 'darkYellow';
  const themeStyle = isCoreMethod
    ? (overrides?.themeStyle || resolvedCoreStyle)
    : (overrides?.themeStyle || style || (
      isHeroBlocks ? 'premium-light'
        : isNatureEditorial ? 'nature-sage-paper'
          : isMinimalCompare ? 'minimal-noir'
            : isDirectionQuiz ? 'direction-quiz-navy'
              : isPersonalRouteQuiz ? 'personal-route-coral'
                : isBarrierProfileQuiz ? 'barrier-profile-ember'
                  : 'glassmorphism'
    ));
  const theme = prelandingThemeForStyle(themeStyle, paletteKey);
  const title = stripHtml(content.titleHtml || '');
  const activeMode = isHeroBlocks
    ? 'heroBlocks'
    : isNatureEditorial
      ? 'natureEditorial'
      : isMinimalCompare
        ? 'minimalCompare'
        : isDirectionQuiz
          ? 'directionQuiz'
          : isPersonalRouteQuiz
            ? 'personalRouteQuiz'
            : isBarrierProfileQuiz
              ? 'barrierProfileQuiz'
              : 'templateStage';
  const landingLogic = resolveClientPrelandingLogic(title, content.trustTitle || content.methodName || content.actionSubtitle || '', activeMode);
  const fallbackSeed = `${templateId}|${style || ''}|${paletteKey}|${overrides?.variantKey || overrides?.conceptId || ''}|${title}`;
  const usedPrelandingImages = new Set();
  const rawSceneImage = pickDistinctPrelandingImage(fallbackSeed, [0, 3, 6, 9], usedPrelandingImages,
    overrides?.sceneImage,
    overrides?.bannerImage,
    overrides?.heroImage,
    photo,
    pickStaticPrelandingFallback(fallbackSeed, 0)
  );
  const rawSceneFallback = pickDistinctPrelandingImage(fallbackSeed, [1, 4, 7], usedPrelandingImages,
    overrides?.sceneFallback,
    overrides?.bannerFallback,
    overrides?.heroImage,
    photo,
    pickStaticPrelandingFallback(fallbackSeed, 1)
  );
  const rawValueImage = pickDistinctPrelandingImage(fallbackSeed, [2, 5, 8], usedPrelandingImages,
    overrides?.valueImage,
    overrides?.sceneFallback,
    overrides?.bannerFallback,
    pickStaticPrelandingFallback(fallbackSeed, 1)
  );
  const rawCtaImage = pickDistinctPrelandingImage(fallbackSeed, [4, 6, 9], usedPrelandingImages,
    overrides?.ctaImage,
    overrides?.bannerFallback,
    overrides?.sceneFallback,
    pickStaticPrelandingFallback(fallbackSeed, 2)
  );
  const sceneImage = bothelpImageSrc(rawSceneImage);
  const sceneFallback = bothelpImageSrc(rawSceneFallback);
  const valueImage = bothelpImageSrc(rawValueImage);
  const ctaImage = bothelpImageSrc(rawCtaImage);
  const source = `${style || ''} ${paletteKey} ${overrides?.themeStyle || ''} ${title}`.toLowerCase();
  const designFamily = isCoreMethod ? 'core-method' : overrides?.designFamily || (
    isDirectionQuiz ? 'direction-quiz'
      : isPersonalRouteQuiz ? 'personal-route-quiz'
      : isBarrierProfileQuiz ? 'barrier-profile-quiz'
        : isMinimalCompare ? 'minimal-compare'
      :
    isNatureEditorial ? 'nature-editorial'
      :
    isHeroBlocks ? 'hero-bright'
      : source.includes('red') || source.includes('shock') || source.includes('brutal') ? 'editorial-strike'
      : source.includes('green') || source.includes('money') || source.includes('terminal') ? 'price-signal'
        : source.includes('dark') || source.includes('noir') || source.includes('black') ? 'noir-focus'
          : source.includes('premium') || source.includes('gold') || source.includes('editorial') ? 'split-premium'
            : 'object-stage'
  );
  const variant = isCoreMethod ? (overrides?.landingVariant || CORE_PRELANDING_VARIANTS[templateId] || 'tf-v-spotlight') : overrides?.landingVariant || (
    isDirectionQuiz ? 'tf-v-direction-quiz'
      : isPersonalRouteQuiz ? 'tf-v-personal-route-quiz'
      : isBarrierProfileQuiz ? 'tf-v-barrier-profile-quiz'
        : isMinimalCompare ? 'tf-v-minimal-compare'
      :
    isNatureEditorial ? 'tf-v-nature-editorial'
      :
    isHeroBlocks ? 'tf-v-mint'
      : source.includes('green') || source.includes('terminal') ? 'tf-v-aurora'
      : source.includes('red') || source.includes('shock') ? 'tf-v-spotlight'
        : source.includes('gold') || source.includes('premium') ? 'tf-v-editorial'
          : source.includes('blue') || source.includes('glass') ? 'tf-v-motion'
            : 'tf-v-cinema'
  );
  const accent = readablePrelandingTitleAccent({
    accent: theme?.accent,
    accent2: theme?.accent2,
    btnMain1: theme?.btnMain1,
    btnMain2: theme?.btnMain2
  }) || paletteAccent;
  const accent2 = theme?.accent2 || paletteAccent2 || '#f97316';
  const themeVars = [
    `--tf-accent:${accent}`,
    `--tf-accent2:${accent2}`,
    `--tf-title-accent:${accent}`,
    `--tf-btn-main-1:${theme?.btnMain1 || accent}`,
    `--tf-btn-main-2:${theme?.btnMain2 || accent2}`,
    `--tf-btn-alt-1:${theme?.btnAlt1 || '#111827'}`,
    `--tf-btn-alt-2:${theme?.btnAlt2 || paletteBg || '#2563eb'}`
  ].join(';');
  const prelandConfig = {
    templateId,
    renderMode: isCoreMethod ? 'classicText' : (overrides?.renderMode || (
      isDirectionQuiz ? 'directionQuiz'
        : isPersonalRouteQuiz ? 'personalRouteQuiz'
          : isBarrierProfileQuiz ? 'barrierProfileQuiz'
            : isMinimalCompare ? 'minimalCompare'
            : isHeroBlocks ? 'bannerMatched'
              : isNatureEditorial ? 'natureEditorial'
                : 'immersiveStage'
    )),
    variant,
    designFamily,
    layoutMode: overrides?.layoutMode || '',
    typeMode: overrides?.typeMode || '',
    mobileMode: overrides?.mobileMode || '',
    coreDesignClass: overrides?.coreDesignClass || '',
    variantSeed: overrides?.variantKey || overrides?.conceptId || `${templateId}-${style || ''}-${paletteKey}-${hashText(title)}`,
    visualSource: sceneImage ? (overrides?.visualSource || 'scene') : '',
    themeVars,
    sceneImage,
    sceneFallback,
    bannerImage: bothelpImageSrc(pickPrelandingImageUrl(overrides?.bannerImage)),
    bannerFallback: bothelpImageSrc(pickPrelandingImageUrl(overrides?.bannerFallback)),
    heroImage: sceneImage,
    valueImage,
    ctaImage,
    badge: content.badge || landingLogic.badge,
    title,
    titleHtml: content.titleHtml || title,
    pills: content.pills || [],
    painTitle: content.painTitle || landingLogic.label,
    painItems: content.painItems || [],
    painAlert: content.painAlert || landingLogic.defaultText,
    trustTitle: content.trustTitle || landingLogic.trustTitle,
    trustSmall: content.trustSmall || landingLogic.trustSmall,
    methodName: Object.prototype.hasOwnProperty.call(overrides || {}, 'methodName') ? overrides.methodName : (content.methodName || landingLogic.methodName),
    valueTitle: content.valueTitle || landingLogic.valueTitle,
    valueItems: content.valueItems || landingLogic.valueItems,
    cards: overrides?.cards || content.cards || landingLogic.cards,
    proofItems: overrides?.proofItems || content.proofItems || [],
    liveNote: Object.prototype.hasOwnProperty.call(overrides || {}, 'liveNote') ? overrides.liveNote : landingLogic.botTransition,
    copy: overrides?.copy || content.copy || '',
    ctaLead: overrides?.ctaLead || content.ctaLead || landingLogic.ctaLead,
    ctaSub: overrides?.ctaSub || content.ctaSub || '',
    actionTitle: content.actionTitle || landingLogic.actionTitle,
    actionSubtitle: content.actionSubtitle || landingLogic.ctaLead,
    adAngleTitle: content.methodName || overrides?.adAngleTitle || content.actionTitle || landingLogic.actionTitle,
    quizLabel: 'Пройти мини-тест',
    registrationLabel: 'Продолжить регистрацию'
  };
  if (isCoreMethod) {
    return renderCoreMethodInlinePrelanding({
      templateId,
      content: prelandConfig,
      projectData,
      landingMeta,
      sceneImage,
      valueImage,
      ctaImage
    });
  }
  if (isDirectionQuiz) {
    return renderDirectionQuizPrelanding({
      content: prelandConfig,
      projectData,
      landingMeta,
      sceneImage,
      style: themeStyle,
      palette: paletteKey,
      designRoute: overrides?.designRoute || {
        id: overrides?.designRouteId || themeStyle,
        style: themeStyle,
        palette: paletteKey
      }
    });
  }
  if (isPersonalRouteQuiz) {
    return renderPersonalRouteQuizPrelanding({
      content: prelandConfig,
      projectData,
      landingMeta,
      sceneImage,
      style: themeStyle,
      palette: paletteKey,
      designRoute: overrides?.designRoute || {
        id: overrides?.designRouteId || themeStyle,
        style: themeStyle,
        palette: paletteKey
      }
    });
  }
  if (isBarrierProfileQuiz) {
    return renderBarrierProfileQuizPrelanding({
      content: prelandConfig,
      projectData,
      landingMeta,
      sceneImage,
      style: themeStyle,
      palette: paletteKey,
      designRoute: overrides?.designRoute || {
        id: overrides?.designRouteId || themeStyle,
        style: themeStyle,
        palette: paletteKey
      }
    });
  }
  if (isNatureEditorial) {
    return renderNatureEditorialPrelanding({
      content: prelandConfig,
      projectData,
      landingMeta,
      sceneImage,
      valueImage,
      ctaImage,
      style: themeStyle,
      palette: paletteKey,
      layout: overrides?.layoutMode || layout,
      effects: overrides?.effects || effects
    });
  }
  if (isMinimalCompare) {
    return renderMinimalComparePrelanding({
      content: prelandConfig,
      projectData,
      landingMeta,
      style: themeStyle,
      palette: paletteKey,
      layout: overrides?.layoutMode || layout,
      effects: overrides?.effects || effects
    });
  }

  return renderHeroSceneBlocksPrelanding({
    content: prelandConfig,
    projectData,
    landingMeta,
    sceneImage,
    valueImage,
    ctaImage,
    style: themeStyle,
    palette: paletteKey,
    layout: overrides?.layoutMode || layout,
    typo: overrides?.typeMode || typo,
    effects: overrides?.effects || effects,
    theme,
    accent,
    accent2
  });
}

function countMatches(text, pattern) {
  return (String(text || '').match(pattern) || []).length;
}

function validateAtmospaceTildaHtml(html = '', config = {}, options = {}) {
  const source = String(html || '');
  const errors = [];
  const warnings = [];
  const quizRequired = options.quizRequired === true;
  const marker = (...parts) => parts.join('');
  const patternFrom = (...parts) => new RegExp(parts.join(''), 'i');
  const requiredConfig = [
    ['publicLandingKey', 'public_landing_key'],
    ['counterId', 'counter_id'],
    ['landingName', 'landing_name'],
    ['landingCode', 'landing_variant_code'],
    ['apiBaseUrl', 'api_base_url'],
    ['initEndpoint', 'init_endpoint'],
    ['clickEndpoint', 'click_endpoint']
  ];

  if (!source.trim()) errors.push('HTML ещё не собран.');
  if (/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(source)) errors.push('HTML для Tilda не должен быть полноценным документом с html/head/body.');

  [
    [patternFrom('window\\.', 'FH_', 'CONFIG'), 'старый объект FH'],
    [patternFrom('window\\.', 'FUNNEL_', 'CONFIG'), 'старый объект FUNNEL'],
    [patternFrom('smart', '-', 'endpoint'), 'старый smart endpoint'],
    [patternFrom('supabase\\.co\\/', 'functions\\/v1'), 'старая прямая Supabase-ссылка'],
    [patternFrom('landing', '-', 'attribution'), 'старый endpoint атрибуции'],
    [patternFrom('r\\.bothelp\\.', 'io'), 'прямая ссылка BotHelp'],
    [patternFrom('data-', 'fh-', 'messenger'), 'старый messenger-атрибут'],
    [patternFrom('data-', 'atmospace-', 'messenger'), 'старый Atmospace messenger-атрибут'],
    [patternFrom('messenger', '_button_', 'clicked'), 'старое messenger-событие'],
    [patternFrom('links\\.', 'telegram', '|links\\.', 'max'), 'старые messenger-ссылки'],
    [patternFrom('build', 'Quiz', 'Url'), 'ручная переделка серверной ссылки регистрации'],
    [patternFrom('pathname\\s*=\\s*[\'\"]', '\\/quiz', '[\'\"]'), 'подмена серверной регистрации маршрутом /quiz'],
    [patternFrom('lead', '_', 'static'), 'старый статический lead'],
    [patternFrom('order', '_url_', '990', '|', 'order', 'Url', '990'), 'старое поле регистрации'],
    [patternFrom('purchase', '_url_', '990', '|', 'purchase', 'Url', '990'), 'старое поле покупки'],
    [patternFrom('serverOnly', 'AdGoal', 'Credential'), 'серверный токен'],
    [patternFrom('metrika', 'Token', '|', 'yandex', '_oauth_', 'token'), 'токен Яндекс.Метрики'],
    [patternFrom('\\b', 'client', '_', 'id', '\\b'), 'старый технический идентификатор'],
    [patternFrom('data:', 'image'), 'встроенное base64-изображение'],
    [patternFrom('DIRECTION', '_CONFIG'), 'сторонний объект конфигурации квиза'],
    [patternFrom('webhook', 'Url', '|webhook', '_url', '|quiz[-_ ]?webhook'), 'сторонний webhook квиза'],
    [patternFrom('lichnyy-marshrut\\.gayvoronskyluka\\.chatgpt\\.site'), 'сторонний сервер личного маршрута'],
    [patternFrom('\\/api\\/', 'register'), 'сторонний endpoint регистрации'],
    [patternFrom('registration_', 'success'), 'серверная цель успешной регистрации в браузере'],
    [patternFrom('notifications_', 'connected'), 'серверная цель подключения уведомлений в браузере'],
    [patternFrom('payment_', 'success'), 'серверная цель успешной оплаты в браузере'],
    [patternFrom('registration_', 'click'), 'устаревшая браузерная цель регистрации']
  ].forEach(([pattern, label]) => {
    if (pattern.test(source)) errors.push(`В Tilda HTML найден запрещённый фрагмент: ${label}.`);
  });

  [
    marker('window.', 'ATMOSPACE_LANDING_CONFIG'),
    'Object.freeze(',
    ATMOSPACE_GENERATED_RUNTIME_VERSION,
    ATMOSPACE_PUBLIC_API_BASE_URL,
    '/api/landing-runtime/init',
    '/api/landing-runtime/click',
    'data-atmospace-registration-link',
    'data-atmospace-state',
    'data-atmospace-runtime-retry',
    'aria-disabled="true"',
    'landing_opened',
    'landing_view',
    'registration_started',
    'links.registration',
    'registrationUrl = candidate',
    'window.location.assign(registrationUrl)',
    'isTrustedRegistrationUrl',
    'requestRegistration',
    'https://mc.yandex.ru/metrika/tag.js',
    'window.__atmospaceMetrikaInited',
    'landing_variant_code',
    'landing_variant_name',
    'page_instance_id',
    'browser_language',
    'browser_client_time',
    'advertising_click_ids',
    'yclid',
    'gclid',
    'fbclid',
    'msclkid',
    'dclid',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'result && result.body',
    'var pageInstanceId = makePageInstanceId();',
    'Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.',
    'href="#"',
    'public_landing_key',
    'counter_id'
  ].forEach((marker) => {
    if (!source.includes(marker)) errors.push(`В Atmospace HTML не найден обязательный маркер: ${marker}.`);
  });

  const quizMarkers = [
    'data-atmospace-quiz-link',
    'data-atmospace-embedded-quiz="true"',
    'data-atmospace-question-count="4"',
    'quiz_start_click',
    'question_answered',
    'questionNumber',
    'quiz_completed'
  ];
  if (quizRequired) {
    quizMarkers.forEach((quizMarker) => {
      if (!source.includes(quizMarker)) errors.push(`В формате с мини-тестом не найден обязательный маркер: ${quizMarker}.`);
    });
  } else if (/<[^>]+\sdata-atmospace-(?:quiz-link|inline-quiz|embedded-quiz|question-count)(?:[\s=>])/i.test(source)) {
    errors.push('В формате без мини-теста найдена видимая квиз-разметка. Используйте прямую регистрацию Atmospace.');
  }

  if (countMatches(source, /window\.ATMOSPACE_LANDING_CONFIG\s*=/g) !== 1) {
    errors.push('В HTML должен быть ровно один объект window.ATMOSPACE_LANDING_CONFIG.');
  }
  if (countMatches(source, /var pageInstanceId = makePageInstanceId\(\);/g) !== 1) {
    errors.push('page_instance_id должен создаваться ровно один раз при каждой загрузке страницы.');
  }
  if (source.includes('sessionStorage')) {
    errors.push('page_instance_id не должен сохраняться в sessionStorage.');
  }
  if (countMatches(source, /window\.ym\(metrikaCounterId,\s*['"]init['"]/g) !== 1) {
    errors.push('Счётчик Метрики должен инициализироваться ровно один раз защитным ядром лендинга.');
  }
  if (/\blanding_name\s*:\s*cfg\.landingName/.test(source)) {
    errors.push('Используйте landing_variant_name вместо устаревшего landing_name.');
  }
  if (/\byclid\s*:\s*getParam\(/.test(source)) {
    errors.push('yclid должен передаваться только внутри advertising_click_ids.');
  }
  if (source.includes('https://web.telegram.org/k/#')) {
    errors.push('В HTML найдена запрещённая прямая ссылка Telegram Web.');
  }
  if (/(?:Telegram|BotHelp|мессенджер|Перейти в MAX|Начать в MAX)/i.test(source)) {
    errors.push('В боевом лендинге найден устаревший переход в Telegram/MAX или мессенджер.');
  }
  if (quizRequired && /data-atmospace-question-count=["'](?!4["'])\d+["']/i.test(source)) {
    errors.push('В формате с мини-тестом должно быть ровно четыре вопроса.');
  }

  requiredConfig.forEach(([key, label]) => {
    if (!String(config[key] || '').trim()) errors.push(`В конфиге не заполнено ${label}.`);
  });

  if (config.runtimeVersion && config.runtimeVersion !== ATMOSPACE_GENERATED_RUNTIME_VERSION) {
    errors.push(`runtimeVersion должен быть ${ATMOSPACE_GENERATED_RUNTIME_VERSION}.`);
  }
  if (config.apiBaseUrl && config.apiBaseUrl !== ATMOSPACE_PUBLIC_API_BASE_URL) {
    errors.push('apiBaseUrl должен вести на https://api.atmospace.pro.');
  }
  if (config.initEndpoint && config.initEndpoint !== ATMOSPACE_INIT_ENDPOINT) {
    errors.push('initEndpoint должен вести на /api/landing-runtime/init.');
  }
  if (config.clickEndpoint && config.clickEndpoint !== ATMOSPACE_CLICK_ENDPOINT) {
    errors.push('clickEndpoint должен вести на /api/landing-runtime/click.');
  }
  if (config.publicLandingKey && !source.includes(String(config.publicLandingKey))) {
    errors.push('В HTML не найден текущий publicLandingKey.');
  }
  if (config.counterId && !source.includes(String(config.counterId))) {
    errors.push('В HTML не найден текущий counterId.');
  }
  if (config.landingCode && !source.includes(String(config.landingCode))) {
    errors.push('В HTML не найден текущий landingCode.');
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

/* ================== UI КОМПОНЕНТЫ ================== */
function CopyBtn({ text, label = 'Скопировать', big = false, dark = false }) {
  const [s, setS] = useState('idle');
  const onClick = async () => {
    setS('copying');
    const ok = await copyToClipboard(text);
    setS(ok ? 'done' : 'error');
    setTimeout(() => setS('idle'), 2200);
  };
  const cls = s === 'done' ? 'bg-emerald-500 text-white' : s === 'error' ? 'bg-red-500 text-white' : dark ? 'bg-slate-900 hover:bg-slate-800 text-yellow-400' : 'bg-yellow-400 hover:bg-yellow-300 text-slate-900';
  return (
    <button onClick={onClick} className={`${cls} ${big ? 'py-5 text-lg' : 'py-3 text-sm'} font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg w-full px-5 hover:scale-[1.01] active:scale-[0.99]`}>
      {s === 'done' ? <><Check className="w-5 h-5" /> Скопировано!</> : s === 'error' ? <><AlertCircle className="w-5 h-5" /> Не удалось — выдели вручную</> : <><Copy className="w-5 h-5" /> {label}</>}
    </button>
  );
}

function Tab({ active, onClick, icon: Icon, children, dark }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${active ? (dark ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'bg-slate-900 text-white shadow-lg') : (dark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200')}`}>
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  );
}

function Field({ label, hint, value, onChange, placeholder, dark, type = 'text', autoComplete = 'off' }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className={`text-sm font-black ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{label}</span>
        {hint && <span className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{hint}</span>}
      </div>
      <input type={type} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-medium ${dark ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400'}`} />
    </label>
  );
}

function TextArea({ label, hint, value, onChange, placeholder, rows = 6, dark }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className={`text-sm font-black ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{label}</span>
        {hint && <span className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{hint}</span>}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-medium resize-y ${dark ? 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400'}`} />
    </label>
  );
}

function AtmospaceLandingConstructor({ dark, value, onChange }) {
  const card = dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const panel = dark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';
  const text = dark ? 'text-white' : 'text-slate-900';
  const textMuted = dark ? 'text-slate-400' : 'text-slate-500';
  const emptyForm = {
    landingName: '',
    landingCode: '',
    counterId: '',
    serverOnlyAdGoalCredential: ''
  };
  const [localForm, setLocalForm] = useState(emptyForm);
  const form = value || localForm;

  const updateForm = (updater) => {
    const applyUpdate = (prevValue) => {
      const prev = { ...emptyForm, ...(prevValue || {}) };
      return typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
    };

    if (onChange) {
      onChange(applyUpdate);
      return;
    }

    setLocalForm(applyUpdate);
  };
  const setFormValue = (key, value) => updateForm((prev) => ({ ...prev, [key]: value }));

  return (
    <section className={`${card} rounded-3xl border p-6 shadow-sm`}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black uppercase text-white">
            Данные лендинга
          </div>
          <h2 className={`text-2xl font-black ${text}`}>Настройки для HTML</h2>
          <p className={`mt-1 max-w-3xl text-sm ${textMuted}`}>
            Заполните четыре поля из кабинета Atmospace. Заголовок, текст и один из шести форматов выбираются ниже; готовый Tilda HTML появится в зелёном блоке.
          </p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-xs ${panel}`}>
          <div className={`font-black ${text}`}>Защищённый ключ</div>
          <div className={textMuted}>Отправляется только на сервер генерации. В Tilda HTML не вставляется.</div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Field
          label="Название лендинга"
          value={form.landingName}
          onChange={(value) => setFormValue('landingName', value)}
          placeholder="Например: Тест 15 июня / клиент Иван"
          dark={dark}
        />
        <Field
          label="Код для рекламного лендинга"
          hint="не gcpc и не partner_code"
          value={form.landingCode}
          onChange={(value) => setFormValue('landingCode', value)}
          placeholder="Полный код из кнопки «Скопировать код»"
          dark={dark}
        />
        <Field
          label="Номер рекламного счётчика"
          value={form.counterId}
          onChange={(value) => setFormValue('counterId', value)}
          placeholder="109000000"
          dark={dark}
        />
        <Field
          label="Защищённый ключ отправки целей"
          hint="актуальный ключ этого кабинета"
          value={form.serverOnlyAdGoalCredential}
          onChange={(value) => setFormValue('serverOnlyAdGoalCredential', value)}
          placeholder="Вставьте ключ полностью, без маскировки"
          type="password"
          autoComplete="new-password"
          dark={dark}
        />
      </div>

      <div className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold ${dark ? 'border-amber-900/70 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        Код берите только из кнопки «Сгенерировать код» → «Скопировать код» в кабинете Atmospace. Старый GetCourse-код, partner_code, сокращённое значение с «...» и ключ другого кабинета не подойдут.
      </div>

      <div className={`mt-4 rounded-2xl border p-4 text-xs font-bold ${panel}`}>
        <div className={`mb-1 font-black ${text}`}>Дальше</div>
        <div className={textMuted}>
          Введите заголовок и текст ниже, выберите формат лендинга и нажмите генерацию. Конструктор отправит эти четыре поля на сервер Atmospace и получит безопасный HTML.
        </div>
      </div>
    </section>
  );
}

function LoginGate({ dark, onLogin }) {
  const [fullName, setFullName] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [contactChannel, setContactChannel] = useState('telegram');
  const [contactValue, setContactValue] = useState('');
  const [pendingAccess, setPendingAccess] = useState(() => (isOwnerOnlyMode() ? null : readPendingAccessRequest()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(pendingAccess ? 'Заявка отправлена. Ждём подтверждения.' : '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOwnerOnlyMode()) return undefined;
    if (!pendingAccess?.requestId || !pendingAccess?.requestToken) return undefined;
    let cancelled = false;

    const check = async () => {
      try {
        const data = await fetchConstructorAccessStatus(pendingAccess);
        if (cancelled) return;
        if (data.status === 'approved' && data.account) {
          rememberApprovedAccount(data.account);
          clearPendingAccessRequest();
          setPendingAccess(null);
          setNotice('');
          setError('');
          onLogin(data.account);
          return;
        }
        if (data.status === 'rejected') {
          clearPendingAccessRequest();
          setPendingAccess(null);
          setNotice('');
          setError(data.message || 'Заявка отклонена.');
        }
      } catch (statusError) {
        if (!cancelled) setNotice(statusError?.message || 'Проверяю статус заявки...');
      }
    };

    check();
    const timer = window.setInterval(check, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pendingAccess, onLogin]);

  const submit = async (event) => {
    event.preventDefault();
    const normalizedName = normalizeLogin(fullName);
    const adminAccount = normalizedName === OWNER_LOGIN || normalizedName === 'админ'
      ? findClientAccount(OWNER_LOGIN)
      : null;

    if (isOwnerOnlyMode()) {
      if (!adminAccount) {
        setNotice('');
        setError('Вход закрыт. Сейчас доступен только владелец конструктора.');
        return;
      }
      if (ownerPassword !== OWNER_PASSWORD) {
        setNotice('');
        setError('Неверный пароль владельца.');
        return;
      }
      setError('');
      setNotice('');
      onLogin(adminAccount);
      return;
    }

    if (adminAccount) {
      setError('');
      onLogin(adminAccount);
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      const data = await requestConstructorAccess({
        full_name: fullName,
        contact_channel: contactChannel,
        contact_value: contactValue
      });
      const pending = {
        requestId: data.requestId,
        requestToken: data.requestToken,
        clientId: data.clientId,
        fullName,
        contactChannel,
        contactValue,
        createdAt: new Date().toISOString()
      };
      savePendingAccessRequest(pending);
      setPendingAccess(pending);
      setNotice(data.notification?.sent
        ? 'Заявка отправлена. Подтверждение придёт администратору в Telegram.'
        : 'Заявка создана, но уведомление администратору пока не настроено.'
      );
    } catch (loginError) {
      setError(loginError?.message || 'Не получилось войти.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPending = () => {
    clearPendingAccessRequest();
    setPendingAccess(null);
    setNotice('');
    setError('');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 p-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,.34),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(16,185,129,.24),transparent_30%),linear-gradient(135deg,#020617,#0f172a_48%,#07111f)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <form onSubmit={submit} className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/15 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase text-white">
          <ShieldCheck className="h-3.5 w-3.5" /> Вход
        </div>
        <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-blue-300">Landing Constructor OS</div>
        <h1 className="mb-5 text-3xl font-black leading-tight text-white drop-shadow-[0_10px_28px_rgba(0,0,0,.55)]">Конструктор</h1>

        <div className={`mb-4 rounded-2xl border-2 p-4 ${dark ? 'border-amber-500 bg-amber-950/70 text-amber-50' : 'border-amber-400 bg-amber-50 text-amber-950'}`}>
          <div className="text-base font-black uppercase leading-tight">Админ-вход открыт</div>
          <div className="mt-2 text-sm font-black leading-snug">
            Вход доступен только администратору. Клиентские заявки сейчас отключены.
          </div>
        </div>

        <label className="mb-3 block">
          <span className={`mb-1 block text-xs font-black uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{isOwnerOnlyMode() ? 'Логин владельца' : 'Имя и фамилия'}</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete={isOwnerOnlyMode() ? 'username' : 'name'}
            className={`w-full rounded-xl border px-4 py-3 text-base font-bold outline-none ${dark ? 'border-slate-700 bg-slate-950 text-white focus:border-blue-500' : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500'}`}
            placeholder={isOwnerOnlyMode() ? 'admin' : 'Антон Иванов'}
          />
        </label>

        {isOwnerOnlyMode() && (
          <label className="mb-3 block">
            <span className={`mb-1 block text-xs font-black uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Пароль владельца</span>
            <input
              type="password"
              value={ownerPassword}
              onChange={(event) => setOwnerPassword(event.target.value)}
              autoComplete="current-password"
              className={`w-full rounded-xl border px-4 py-3 text-base font-bold outline-none ${dark ? 'border-slate-700 bg-slate-950 text-white focus:border-blue-500' : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500'}`}
              placeholder="Введите пароль"
            />
          </label>
        )}

        {!isOwnerOnlyMode() && (
        <div className="mb-3 grid grid-cols-[124px_1fr] gap-2">
          <label className="block">
            <span className={`mb-1 block text-xs font-black uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Куда писать</span>
            <select
              value={contactChannel}
              onChange={(event) => setContactChannel(event.target.value)}
              className={`w-full rounded-xl border px-3 py-3 text-base font-bold outline-none ${dark ? 'border-slate-700 bg-slate-950 text-white focus:border-blue-500' : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500'}`}
            >
              <option value="telegram">Telegram</option>
              <option value="max">MAX</option>
            </select>
          </label>
          <label className="block">
            <span className={`mb-1 block text-xs font-black uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Username или ссылка</span>
            <input
              type="text"
              value={contactValue}
              onChange={(event) => setContactValue(event.target.value)}
              autoComplete="username"
              className={`w-full rounded-xl border px-4 py-3 text-base font-bold outline-none ${dark ? 'border-slate-700 bg-slate-950 text-white focus:border-blue-500' : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500'}`}
              placeholder="@username"
            />
          </label>
        </div>
        )}

        {!isOwnerOnlyMode() && pendingAccess && (
          <div className={`mb-3 rounded-xl border p-3 text-sm font-bold ${dark ? 'border-amber-800 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            Заявка ждёт подтверждения. Код доступа уже закреплён: {pendingAccess.clientId || 'создаётся'}.
            <button type="button" onClick={resetPending} className={`mt-2 block text-xs font-black underline ${dark ? 'text-amber-200' : 'text-amber-700'}`}>
              Заполнить заново
            </button>
          </div>
        )}

        {notice && !error && (
          <div className={`mb-3 rounded-xl border p-3 text-sm font-bold ${dark ? 'border-blue-900 bg-blue-500/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
            {notice}
          </div>
        )}

        {error && (
          <div className={`mb-3 rounded-xl border p-3 text-sm font-bold ${dark ? 'border-red-900 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || Boolean(pendingAccess)} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
          {isOwnerOnlyMode() ? 'Войти владельцу' : pendingAccess ? 'Ожидает подтверждения' : isSubmitting ? 'Отправляю заявку...' : 'Запросить доступ'}
        </button>
      </form>
    </div>
  );
}

/* ================== ОСНОВНОЙ КОМПОНЕНТ ================== */
export default function Constructor() {
  const [authorizedClient, setAuthorizedClient] = useState(readAuthorizedClient);
  const initialProjectRef = useState(() => loadSavedProject(authorizedClient))[0];
  const [usage, setUsage] = useState(() => readAccountUsage(authorizedClient));
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState(readConstructorTabFromLocation);
  const [projectData, setProjectData] = useState(initialProjectRef);
  const [landingRuntimeData, setLandingRuntimeData] = useState({
    landingName: initialProjectRef.clientDisplayName || '',
    landingCode: '',
    counterId: initialProjectRef.metrikaId || '',
    serverOnlyAdGoalCredential: ''
  });
  const [landingRuntimeArtifact, setLandingRuntimeArtifact] = useState(null);

  const initialCoreMethodPreset = CORE_METHOD_PRESETS[0];
  const [tpl, setTpl] = useState(initialCoreMethodPreset.tpl);
  const [style, setStyle] = useState(initialCoreMethodPreset.style);
  const [palette, setPalette] = useState(initialCoreMethodPreset.palette);
  const [typo, setTypo] = useState(initialCoreMethodPreset.typo);
  const [layout, setLayout] = useState(initialCoreMethodPreset.layout);
  const [effects, setEffects] = useState(initialCoreMethodPreset.effects);
  const [activePresetId, setActivePresetId] = useState(initialCoreMethodPreset.id);

  const [gender, setGender] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [shortName, setShortName] = useState('');
  const [photo, setPhoto] = useState('');

  // Generator состояния
  const [adProduct, setAdProduct] = useState('');
  const [adAudience, setAdAudience] = useState('');
  const [adPain, setAdPain] = useState('');
  const [adBenefit, setAdBenefit] = useState('');
  const [adNiche, setAdNiche] = useState('');
  const [generatedHeadlines, setGeneratedHeadlines] = useState('');
  const [generatedTexts, setGeneratedTexts] = useState('');
  const [generatedQuickLinks, setGeneratedQuickLinks] = useState('');
  const [finalHeadlines, setFinalHeadlines] = useState('');
  const [creativeHeadline, setCreativeHeadline] = useState('');
  const [creativeAudience, setCreativeAudience] = useState('');
  const [creativeMethod, setCreativeMethod] = useState('');
  const [creativeVisual, setCreativeVisual] = useState('');
  const [creativeDecor, setCreativeDecor] = useState('');
  const [creativeTone, setCreativeTone] = useState('');
  const [prelandingSync, setPrelandingSync] = useState(null);
  const [manualPrelandingMode, setManualPrelandingMode] = useState('templateStage');
  const [isAiPrelandingBuilding, setIsAiPrelandingBuilding] = useState(false);
  const [isAiPrelandingInvalidated, setIsAiPrelandingInvalidated] = useState(false);
  const [prelandingAiImages, setPrelandingAiImages] = useState(null);
  const [prelandingAiStatus, setPrelandingAiStatus] = useState('');
  const [prelandingAiError, setPrelandingAiError] = useState('');

  const applyAuthorizedClientProject = (account) => {
    const nextProject = loadSavedProject(account);
    const displayName = nextProject.clientDisplayName || account?.label || '';
    setProjectData(nextProject);
    setUsage(readAccountUsage(account));
    if (account && !isUnlimitedAccount(account)) {
      setName(displayName);
      const firstName = String(displayName || '').trim().split(/\s+/)[0] || '';
      if (firstName) setShortName(firstName);
    }
    setAuthorizedClient(account);
  };

  useEffect(() => {
    if (isOwnerOnlyMode()) return;
    const params = new URLSearchParams(window.location.search);
    const wantsAdmin = params.get('admin') === '1' || params.get('owner') === 'admin';
    if (!wantsAdmin) return;
    const adminAccount = findClientAccount('admin');
    if (!adminAccount) return;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, adminAccount.login);
      window.history.replaceState(null, '', window.location.pathname || '/');
    } catch {
      // State switch below is enough for the current tab.
    }
    applyAuthorizedClientProject(adminAccount);
  }, []);

  useEffect(() => {
    if (!authorizedClient) return;
    saveProjectForAccount(authorizedClient, projectData);
    if (!isUnlimitedAccount(authorizedClient)) return;
    try {
      localStorage.setItem(LEGACY_PROJECT_STORAGE_KEY, JSON.stringify(projectData));
    } catch {
      // The current session still works if localStorage is blocked.
    }
  }, [projectData, authorizedClient]);

  useEffect(() => {
    if (!authorizedClient) return;
    const nextProject = loadSavedProject(authorizedClient);
    setProjectData(nextProject);
    setUsage(readAccountUsage(authorizedClient));
    if (!isUnlimitedAccount(authorizedClient)) {
      const displayName = nextProject.clientDisplayName || authorizedClient?.label || '';
      setName(displayName);
      const firstName = String(displayName || '').trim().split(/\s+/)[0] || '';
      if (firstName) setShortName(firstName);
    }
  }, [authorizedClient]);

  const bannerLimit = getAccountLimit(authorizedClient, 'banners');
  const prelandingLimit = getAccountLimit(authorizedClient, 'prelandings');
  const quota = {
    unlimited: isUnlimitedAccount(authorizedClient),
    bannersUsed: usage.banners,
    prelandingsUsed: usage.prelandings,
    bannerLimit,
    prelandingLimit,
    bannerBlocked: !isUnlimitedAccount(authorizedClient) && usage.banners >= bannerLimit,
    prelandingBlocked: !isUnlimitedAccount(authorizedClient) && usage.prelandings >= prelandingLimit
  };
  const prelandingRuntimeProjectData = useMemo(() => {
    const landingName = String(landingRuntimeData.landingName || projectData.clientDisplayName || creativeHeadline || 'Лендинг').trim();
    const landingCode = String(landingRuntimeData.landingCode || '').trim();
    const codeToken = cleanVariantToken(landingCode || landingName || 'landing');
    const derivedClientId = `landing_${codeToken}`;

    return {
      ...projectData,
      clientDisplayName: landingName,
      clientName: landingName,
      clientCode: derivedClientId,
      partnerCode: landingCode || codeToken,
      metrikaId: String(landingRuntimeData.counterId || projectData.metrikaId || '').trim(),
      prelandingLink: ''
    };
  }, [projectData, landingRuntimeData, creativeHeadline]);
  const landingRuntimeInputKey = useMemo(
    () => buildAtmospaceRuntimeInputKey(landingRuntimeData),
    [landingRuntimeData]
  );
  const activeLandingRuntimeArtifact = useMemo(() => {
    if (!landingRuntimeArtifact?.publicLandingKey) return null;
    if (landingRuntimeArtifact.inputKey && landingRuntimeArtifact.inputKey !== landingRuntimeInputKey) return null;
    return landingRuntimeArtifact;
  }, [landingRuntimeArtifact, landingRuntimeInputKey]);
  const landingRuntimeMeta = useMemo(() => {
    const landingName = String(landingRuntimeData.landingName || prelandingRuntimeProjectData.clientDisplayName || creativeHeadline || 'Лендинг').trim();

    return {
      runtimeVersion: ATMOSPACE_GENERATED_RUNTIME_VERSION,
      apiBaseUrl: ATMOSPACE_PUBLIC_API_BASE_URL,
      initEndpoint: ATMOSPACE_INIT_ENDPOINT,
      clickEndpoint: ATMOSPACE_CLICK_ENDPOINT,
      publicLandingKey: activeLandingRuntimeArtifact?.publicLandingKey || '',
      counterId: activeLandingRuntimeArtifact?.counterId || String(landingRuntimeData.counterId || '').trim(),
      landingName,
      landingCode: activeLandingRuntimeArtifact?.landingCode || String(landingRuntimeData.landingCode || '').trim()
    };
  }, [landingRuntimeData, activeLandingRuntimeArtifact, prelandingRuntimeProjectData, creativeHeadline]);
  const prelandingRuntimeValidation = useMemo(() => validateAtmospaceLandingInput({
    ...landingRuntimeData,
    serverOnlyAdGoalCredential: activeLandingRuntimeArtifact?.publicLandingKey
      ? landingRuntimeData.serverOnlyAdGoalCredential || 'already-verified'
      : landingRuntimeData.serverOnlyAdGoalCredential
  }), [landingRuntimeData, activeLandingRuntimeArtifact]);
  const prelandingRuntimeMissing = useMemo(() => {
    if (activeLandingRuntimeArtifact?.publicLandingKey) return [];
    return prelandingRuntimeValidation.errors.map((error) => error.message);
  }, [prelandingRuntimeValidation, activeLandingRuntimeArtifact]);
  const prelandingConfigReady = prelandingRuntimeMissing.length === 0;
  const hasPrelandingKeys = prelandingConfigReady;
  const consumeQuota = (key) => {
    if (!authorizedClient || isUnlimitedAccount(authorizedClient)) return true;
    const limit = getAccountLimit(authorizedClient, key);
    const current = readAccountUsage(authorizedClient);
    if ((current[key] || 0) >= limit) return false;
    const next = { ...current, [key]: (current[key] || 0) + 1 };
    saveAccountUsage(authorizedClient, next);
    setUsage(next);
    return true;
  };
  const consumeBannerQuota = () => consumeQuota('banners');
  const consumePrelandingQuota = () => consumeQuota('prelandings');
  const selectedPrelandingTemplateId = [1, 2, 3].includes(Number(tpl)) ? Number(tpl) : 1;
  const prelandingImageBuildKey = useMemo(() => [
    manualPrelandingMode,
    selectedPrelandingTemplateId,
    activePresetId || '',
    style || '',
    palette || '',
    layout || '',
    typo || '',
    Array.isArray(effects) ? effects.join(',') : '',
    String(creativeHeadline || '').trim(),
    String(creativeMethod || '').trim(),
    landingRuntimeInputKey
  ].join('|'), [
    manualPrelandingMode,
    selectedPrelandingTemplateId,
    activePresetId,
    style,
    palette,
    layout,
    typo,
    effects,
    creativeHeadline,
    creativeMethod,
    landingRuntimeInputKey
  ]);
  const currentPrelandingAiImages = prelandingAiImages?.key === prelandingImageBuildKey
    ? prelandingAiImages.images
    : null;
  const currentPrelandingDesignRoute = prelandingAiImages?.key === prelandingImageBuildKey
    ? prelandingAiImages.designRoute
    : null;
  const currentPrelandingVariantMeta = prelandingAiImages?.key === prelandingImageBuildKey
    ? prelandingAiImages.meta
    : null;
  const effectivePrelandingVariantMeta = useMemo(() => ({
    ...(currentPrelandingVariantMeta || {}),
    ...landingRuntimeMeta,
    designVariant: currentPrelandingVariantMeta?.landingVariant || '',
    generatorBuild: currentPrelandingVariantMeta?.generatorBuild || ''
  }), [currentPrelandingVariantMeta, landingRuntimeMeta]);
  const isSingleImagePrelandingMode = manualPrelandingMode === 'directionQuiz'
    || manualPrelandingMode === 'personalRouteQuiz'
    || manualPrelandingMode === 'barrierProfileQuiz';
  const prelandingAiImagesReady = manualPrelandingMode === 'minimalCompare'
    ? Boolean(prelandingAiImages?.key === prelandingImageBuildKey)
    : isSingleImagePrelandingMode
      ? Boolean(prelandingAiImages?.key === prelandingImageBuildKey && currentPrelandingAiImages?.sceneImage)
      : Boolean(
        currentPrelandingAiImages?.sceneImage
        && currentPrelandingAiImages?.valueImage
        && currentPrelandingAiImages?.ctaImage
      );
  const prelandingNeedsTemplate = manualPrelandingMode === 'templateStage';
  const prelandingTemplateReady = !prelandingNeedsTemplate || Boolean(tpl);
  const canGeneratePrelandingAi = Boolean(
    hasPrelandingKeys
    && prelandingTemplateReady
    && style
    && palette
    && !isAiPrelandingBuilding
    && !quota.prelandingBlocked
  );

  useEffect(() => {
    if (prelandingAiImages?.key === prelandingImageBuildKey) return;
    setPrelandingAiError('');
    setPrelandingAiStatus('');
  }, [prelandingImageBuildKey, prelandingAiImages?.key]);

  const handleGeneratePrelandingAiImages = async () => {
    if (!hasPrelandingKeys) {
      setPrelandingAiError(prelandingRuntimeMissing[0] || 'Проверьте четыре поля серверной сборки.');
      return;
    }
    if (!(prelandingTemplateReady && style && palette)) {
      setPrelandingAiError(prelandingNeedsTemplate
        ? 'Сначала выберите один из 3 шаблонов, стиль и палитру предлендинга.'
        : 'Сначала выберите стиль и палитру предлендинга.');
      return;
    }
    if (quota.prelandingBlocked) {
      setPrelandingAiError(`Лимит AI-предлендингов для этого профиля исчерпан: ${quota.prelandingsUsed || 0}/${quota.prelandingLimit || 0}.`);
      return;
    }

    const buildKey = prelandingImageBuildKey;
    const resumableAiState = prelandingAiImages?.key === buildKey && !prelandingAiImagesReady
      ? prelandingAiImages
      : null;
    const designRoute = resumableAiState?.designRoute || nextPrelandingDesignRoute(manualPrelandingMode);
    const visualMemory = readPrelandingVisualMemory();
    const visualRoute = resumableAiState?.visualRoute || nextPrelandingVisualRoute();
    const effectiveTemplateId = manualPrelandingMode === 'templateStage'
      ? selectedPrelandingTemplateId
      : 1;
    const effectiveStyle = designRoute?.style || style;
    const effectivePalette = designRoute?.palette || palette;
    const variantMeta = resumableAiState?.meta || makePrelandingVariantMeta({
        projectData: prelandingRuntimeProjectData,
        mode: manualPrelandingMode,
        templateId: effectiveTemplateId,
        style: effectiveStyle,
        palette: effectivePalette,
        title: creativeHeadline,
        text: creativeMethod,
        routeId: `${designRoute?.id || 'design'}-${visualRoute?.id || 'visual'}`
      });
    const specs = buildPrelandingImageSpecs({
      mode: manualPrelandingMode,
      templateId: effectiveTemplateId,
      style: effectiveStyle,
      palette: effectivePalette,
      headline: creativeHeadline,
      text: creativeMethod,
      projectData: prelandingRuntimeProjectData,
      designRoute,
      visualRoute,
      visualMemory
    });
    const expectedImageCount = specs.length;

    setIsAiPrelandingBuilding(true);
    setIsAiPrelandingInvalidated(false);
    setPrelandingSync(null);
    if (!resumableAiState) setPrelandingAiImages(null);
    setPrelandingAiError('');
    setPrelandingAiStatus(resumableAiState
      ? 'Продолжаю сборку: готовые кадры сохранены, генерирую только недостающие.'
      : manualPrelandingMode === 'minimalCompare'
      ? 'Собираю минималистичный Tilda HTML без AI-картинок.'
      : isSingleImagePrelandingMode
        ? 'OpenAI генерирует одну смысловую hero-картинку для одностраничника. Если ответ зависнет, конструктор сам перезапустит попытку.'
        : 'OpenAI генерирует 3 разные картинки для предлендинга. Если ответ зависнет, конструктор сам перезапустит попытку.');

    const cachedImages = resumableAiState?.images || {};
    let readyImageCount = Object.values(cachedImages).filter(Boolean).length;

    try {
      let runtimeArtifact = activeLandingRuntimeArtifact;
      if (!runtimeArtifact?.publicLandingKey) {
        const runtimePayload = prelandingRuntimeValidation.value;
        setPrelandingAiStatus('Создаю серверный лендинг Atmospace и получаю publicLandingKey. Токен в HTML не попадёт.');
        const runtimeResponse = await postJsonWithTimeout(ATMOSPACE_GENERATE_ENDPOINT, runtimePayload, {
          timeoutMs: 45000,
          timeoutLabel: 'Atmospace'
        });
        runtimeArtifact = normalizeAtmospaceGenerateResult(runtimeResponse, runtimePayload);
        setLandingRuntimeArtifact(runtimeArtifact);
        saveAtmospaceLandingArtifact(runtimeArtifact);
        setLandingRuntimeData((prev) => ({
          ...prev,
          serverOnlyAdGoalCredential: ''
        }));
      }

      if (manualPrelandingMode === 'minimalCompare') {
        setPrelandingAiImages({
          key: buildKey,
          images: {
            sceneImage: '',
            valueImage: '',
            ctaImage: ''
          },
          designRoute,
          visualRoute: null,
          meta: variantMeta,
          createdAt: new Date().toISOString()
        });
        setPrelandingAiStatus(`Формат 4 готов: ${designRoute?.label || 'тихий минимализм'}. HTML можно копировать.`);
        consumePrelandingQuota();
        return;
      }
      const slotLabels = {
        hero: 'hero-картинка',
        value: 'блок ценности',
        cta: 'CTA-блок'
      };
      const stateKeyBySlot = {
        hero: 'sceneImage',
        value: 'valueImage',
        cta: 'ctaImage'
      };
      const generationProgress = new Map(specs.map((spec) => [spec.slot, {
        label: slotLabels[spec.slot] || spec.slot,
        attempt: 0,
        maxAttempts: PRELANDING_IMAGE_ATTEMPTS,
        phase: cachedImages[stateKeyBySlot[spec.slot]] ? 'done' : 'queued',
        done: Boolean(cachedImages[stateKeyBySlot[spec.slot]])
      }]));
      const specsToGenerate = specs.filter((spec) => !cachedImages[stateKeyBySlot[spec.slot]]);
      const updateParallelGenerationStatus = () => {
        const states = Array.from(generationProgress.values());
        const doneCount = states.filter((state) => state.done).length;
        const activeSummary = states
          .filter((state) => !state.done)
          .map((state) => `${state.label}: ${state.attempt ? `попытка ${state.attempt}/${state.maxAttempts}` : 'запуск'}`)
          .join(' · ');
        setPrelandingAiStatus(doneCount === states.length
          ? `Готово ${doneCount}/${states.length}. Собираю HTML...`
          : states.length === 1
            ? `Генерирую смысловую hero-картинку. ${activeSummary}`
            : `Одновременно генерирую ${states.length} AI-картинки. Готово ${doneCount}/${states.length}. ${activeSummary}`);
      };

      updateParallelGenerationStatus();
      const settledResults = await Promise.allSettled(specsToGenerate.map(async (spec) => {
        const progress = generationProgress.get(spec.slot);
        const imageUrl = await generatePrelandingImage(spec, {
          maxAttempts: PRELANDING_IMAGE_ATTEMPTS,
          timeoutMs: PRELANDING_IMAGE_TIMEOUT_MS,
          retryDelayMs: PRELANDING_IMAGE_RETRY_DELAY_MS,
          imageLoadTimeoutMs: PRELANDING_IMAGE_LOAD_TIMEOUT_MS,
          onAttempt: ({ attempt, maxAttempts, phase }) => {
            Object.assign(progress, { attempt, maxAttempts, phase });
            updateParallelGenerationStatus();
          }
        });
        Object.assign(progress, { done: true, phase: 'done' });
        updateParallelGenerationStatus();
        return [spec.slot, imageUrl];
      }));
      const successfulResults = settledResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      const generatedImages = Object.fromEntries(successfulResults);
      const mergedImages = {
        sceneImage: cachedImages.sceneImage || generatedImages.hero || '',
        valueImage: cachedImages.valueImage || generatedImages.value || '',
        ctaImage: cachedImages.ctaImage || generatedImages.cta || ''
      };
      readyImageCount = Object.values(mergedImages).filter(Boolean).length;
      setPrelandingAiImages({
        key: buildKey,
        images: mergedImages,
        designRoute,
        visualRoute,
        meta: variantMeta,
        createdAt: resumableAiState?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const failedResult = settledResults.find((result) => result.status === 'rejected');
      if (failedResult) throw failedResult.reason;
      setPrelandingAiStatus(`${expectedImageCount === 1 ? 'AI-картинка и дизайн готовы' : 'AI-картинки и дизайн готовы'}: ${designRoute?.label || 'дизайн'} + ${visualRoute?.label || 'визуальный маршрут'}. HTML можно копировать.`);
      consumePrelandingQuota();
    } catch (error) {
      setPrelandingAiError(String(error?.message || error || 'OpenAI долго не возвращает картинку. Запустите генерацию ещё раз, конструктор продолжит дожимать кадры.'));
      setPrelandingAiStatus(readyImageCount
        ? `Сохранено готовых кадров: ${readyImageCount}/${expectedImageCount}. Повторите генерацию — конструктор продолжит только с недостающих.`
        : 'Кадры пока не готовы. Повторите генерацию: конструктор перезапустит запрос.');
    } finally {
      setIsAiPrelandingBuilding(false);
    }
  };
  const handleLogin = (account) => {
    if (isOwnerOnlyMode() && !isOwnerAccount(account)) {
      setAuthorizedClient(null);
      return;
    }
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, account.login);
    } catch {
      // The authorized state in React is enough for the current browser session.
    }
    applyAuthorizedClientProject(account);
  };
  const handleLogout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore storage errors; state reset below is enough for the current session.
    }
    setAuthorizedClient(null);
    setUsage({ banners: 0, prelandings: 0 });
  };

  const openTab = (nextTab) => {
    const safeTab = CONSTRUCTOR_TOOL_VALUES.has(nextTab) ? nextTab : 'creative';
    writeConstructorTabToLocation(safeTab);
    setTab(safeTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => setTab(readConstructorTabFromLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleEf = (id) => setEffects(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const applyPreset = (preset) => {
    setTpl(preset.tpl || 1); setStyle(preset.style); setPalette(preset.palette);
    setTypo(preset.typo); setLayout(preset.layout); setEffects(preset.effects);
    setActivePresetId(preset.id);
  };

  const applyCoreMethodTemplate = (templateId) => {
    const preset = CORE_METHOD_PRESETS.find((item) => item.tpl === Number(templateId)) || CORE_METHOD_PRESETS[0];
    applyPreset(preset);
  };

  const visiblePrelandingPresets = manualPrelandingMode === 'heroBlocks'
    ? HERO_BLOCKS_PRESETS
    : manualPrelandingMode === 'natureEditorial'
      ? NATURE_EDITORIAL_PRESETS
      : manualPrelandingMode === 'minimalCompare'
        ? MINIMAL_COMPARE_PRESETS
        : manualPrelandingMode === 'directionQuiz'
          ? DIRECTION_QUIZ_PRESETS
          : manualPrelandingMode === 'personalRouteQuiz'
            ? PERSONAL_ROUTE_QUIZ_PRESETS
            : manualPrelandingMode === 'barrierProfileQuiz'
              ? BARRIER_PROFILE_QUIZ_PRESETS
              : CORE_METHOD_PRESETS;

  const resetAll = () => {
    if (manualPrelandingMode === 'heroBlocks') {
      applyPreset(HERO_BLOCKS_PRESETS[0]);
      return;
    }
    if (manualPrelandingMode === 'natureEditorial') {
      applyPreset(NATURE_EDITORIAL_PRESETS[0]);
      return;
    }
    if (manualPrelandingMode === 'minimalCompare') {
      applyPreset(MINIMAL_COMPARE_PRESETS[0]);
      return;
    }
    if (manualPrelandingMode === 'directionQuiz') {
      applyPreset(DIRECTION_QUIZ_PRESETS[0]);
      return;
    }
    if (manualPrelandingMode === 'personalRouteQuiz') {
      applyPreset(PERSONAL_ROUTE_QUIZ_PRESETS[0]);
      return;
    }
    if (manualPrelandingMode === 'barrierProfileQuiz') {
      applyPreset(BARRIER_PROFILE_QUIZ_PRESETS[0]);
      return;
    }
    applyCoreMethodTemplate(1);
  };

  const prelandingOutputLocked = isAiPrelandingBuilding || isAiPrelandingInvalidated;
  const canPre = Boolean(!prelandingOutputLocked && prelandingTemplateReady && style && palette && hasPrelandingKeys && activeLandingRuntimeArtifact?.publicLandingKey && prelandingAiImagesReady);
  const prelandingHtml = useMemo(() => {
    if (prelandingOutputLocked) return '';
    if (!hasPrelandingKeys) return '';
    if (!activeLandingRuntimeArtifact?.publicLandingKey) return '';
    const enteredHeadline = String(creativeHeadline || '').trim();
    const enteredText = String(creativeMethod || '').trim();
    if (!(prelandingTemplateReady && style && palette)) return '';
    if (!prelandingAiImagesReady) return '';
    if (prelandingSync?.fromBanner) {
      return renderPrelandingHtml({
          tpl: tpl || 1,
          style: 'glassmorphism',
          palette: palette || 'blue-trust',
          photo,
          layout,
          typo,
          effects,
          overrides: {
            ...prelandingSync,
            sceneImage: currentPrelandingAiImages.sceneImage,
            valueImage: currentPrelandingAiImages.valueImage,
            ctaImage: currentPrelandingAiImages.ctaImage
          },
          projectData: prelandingRuntimeProjectData,
          landingMeta: effectivePrelandingVariantMeta
      });
    }
    if (manualPrelandingMode === 'templateStage') {
      const selectedTemplateId = [1, 2, 3].includes(Number(tpl)) ? Number(tpl) : 1;
      const baseContent = PRELANDING_CONTENT[selectedTemplateId] || PRELANDING_CONTENT[1];
      const coreDesign = currentPrelandingDesignRoute || CORE_METHOD_DESIGN_ROUTES[(selectedTemplateId - 1 + CORE_METHOD_DESIGN_ROUTES.length) % CORE_METHOD_DESIGN_ROUTES.length];
      const title = enteredHeadline || stripHtml(baseContent.titleHtml || baseContent.title || 'Откройте короткий разбор и первый шаг');
      const landingLogic = resolveClientPrelandingLogic(title, enteredText || baseContent.trustTitle || baseContent.valueTitle, 'templateStage');
      const textLead = enteredText || landingLogic.lead;
      const corePainItems = landingLogic.painItems?.length
        ? landingLogic.painItems
        : landingLogic.cards.map((item) => `${item.title}: ${item.text}`);
      const imageSeed = `manual-core-${selectedTemplateId}-${coreDesign?.id || style}-${coreDesign?.palette || palette}-${title}-${textLead}`;
      return renderPrelandingHtml({
        tpl: selectedTemplateId,
        style: coreDesign?.themeStyle || style,
        palette: coreDesign?.palette || palette,
        photo,
        layout,
        typo: coreDesign?.typo || typo,
        effects: coreDesign?.effects || effects,
        overrides: {
          prelandingMode: 'coreMethod',
          renderMode: 'classicText',
          templateId: selectedTemplateId,
          themeStyle: coreDesign?.themeStyle || CORE_PRELANDING_THEME_STYLES[selectedTemplateId] || 'darkYellow',
          coreDesignClass: coreDesign?.coreDesignClass || '',
          landingVariant: CORE_PRELANDING_VARIANTS[selectedTemplateId] || 'tf-v-spotlight',
          designFamily: `core-method-${coreDesign?.id || 'default'}`,
          variantKey: imageSeed,
          visualSource: 'scene',
          badge: landingLogic.badge,
          title,
          titleHtml: esc(title),
          pills: [],
          painTitle: landingLogic.label,
          painItems: corePainItems,
          painAlert: landingLogic.defaultText,
          trustTitle: textLead,
          trustSmall: landingLogic.trustSmall,
          methodName: landingLogic.methodName,
          valueTitle: landingLogic.valueTitle,
          valueItems: landingLogic.valueItems,
          cards: landingLogic.cards,
          proofItems: landingLogic.proofItems,
          liveNote: landingLogic.botTransition,
          ctaLead: landingLogic.ctaLead,
          actionSubtitle: landingLogic.ctaLead,
          actionTitle: landingLogic.actionTitle,
          sceneImage: currentPrelandingAiImages.sceneImage,
          valueImage: currentPrelandingAiImages.valueImage,
          ctaImage: currentPrelandingAiImages.ctaImage
        },
        projectData: prelandingRuntimeProjectData,
        landingMeta: effectivePrelandingVariantMeta
      });
    }
    if (manualPrelandingMode === 'heroBlocks') {
      const heroPreset = HERO_BLOCKS_PRESETS.find((preset) => preset.id === activePresetId) || HERO_BLOCKS_PRESETS[0];
      const heroDesign = currentPrelandingDesignRoute || heroPreset;
      const heroTemplateId = 1;
      const heroStyle = heroDesign.style || heroPreset.style;
      const heroPalette = heroDesign.palette || heroPreset.palette;
      const heroLayout = heroDesign.layout || heroPreset.layout;
      const heroTypo = heroDesign.typo || heroPreset.typo;
      const heroEffects = heroDesign.effects || heroPreset.effects || [];
      const title = enteredHeadline || 'Начните движение к цели без очередного отката назад';
      const landingLogic = resolveClientPrelandingLogic(title, enteredText, 'heroBlocks');
      const textLead = enteredText || landingLogic.lead;
      const imageSeed = `manual-hero-blocks-${heroDesign.id || heroPreset.id}-${heroStyle}-${heroPalette}-${heroLayout}-${heroTypo}-${title}-${textLead}`;
      return renderPrelandingHtml({
        tpl: heroTemplateId,
        style: heroStyle,
        palette: heroPalette,
        photo,
        layout: heroLayout,
        typo: heroTypo,
        effects: heroEffects,
        overrides: {
          prelandingMode: 'heroBlocks',
          renderMode: 'bannerMatched',
          templateId: heroTemplateId,
          themeStyle: heroStyle,
          designFamily: `hero-blocks-${heroDesign.id || heroLayout || 'split'}`,
          landingVariant: `hb-${heroStyle || 'style'}-${heroLayout || 'split'}`,
          layoutMode: heroLayout,
          typeMode: heroTypo,
          effects: heroEffects,
          variantKey: imageSeed,
          visualSource: 'scene',
          badge: landingLogic.badge,
          title,
          titleHtml: esc(title),
          pills: [],
          painTitle: landingLogic.label,
          trustTitle: textLead,
          trustSmall: landingLogic.trustSmall,
          methodName: landingLogic.methodName,
          valueTitle: landingLogic.valueTitle,
          valueItems: landingLogic.valueItems,
          sceneImage: currentPrelandingAiImages.sceneImage,
          valueImage: currentPrelandingAiImages.valueImage,
          ctaImage: currentPrelandingAiImages.ctaImage,
          cards: landingLogic.cards,
          proofItems: landingLogic.proofItems,
          liveNote: landingLogic.botTransition,
          ctaLead: landingLogic.ctaLead,
          actionSubtitle: landingLogic.ctaLead,
          actionTitle: landingLogic.actionTitle,
          showProof: true,
          showProofGrid: true
        },
        projectData: prelandingRuntimeProjectData,
        landingMeta: effectivePrelandingVariantMeta
      });
    }
    if (manualPrelandingMode === 'natureEditorial') {
      const naturePreset = NATURE_EDITORIAL_PRESETS.find((preset) => preset.id === activePresetId) || NATURE_EDITORIAL_PRESETS[0];
      const natureDesign = currentPrelandingDesignRoute || naturePreset;
      const natureStyle = natureDesign.style || naturePreset.style;
      const naturePalette = natureDesign.palette || naturePreset.palette;
      const natureLayout = natureDesign.layout || naturePreset.layout;
      const natureTypo = natureDesign.typo || naturePreset.typo || 'playfair';
      const natureEffects = natureDesign.effects || naturePreset.effects || [];
      const title = enteredHeadline || 'Книги прочитаны. А жизнь всё ещё не меняется?';
      const landingLogic = resolveClientPrelandingLogic(title, enteredText, 'natureEditorial');
      const textLead = enteredText || landingLogic.lead;
      const storyCards = buildTildaStoryCards(title, textLead, 'natureEditorial');
      const imageSeed = `manual-nature-editorial-${natureDesign.id || naturePreset.id}-${natureStyle}-${naturePalette}-${natureLayout}-${title}-${textLead}`;
      return renderPrelandingHtml({
        tpl: 1,
        style: natureStyle,
        palette: naturePalette,
        photo,
        layout: natureLayout,
        typo: natureTypo,
        effects: natureEffects,
        overrides: {
          prelandingMode: 'natureEditorial',
          renderMode: 'natureEditorial',
          templateId: 1,
          themeStyle: natureStyle,
          designFamily: `nature-editorial-${natureDesign.id || naturePreset.id || 'sage'}`,
          landingVariant: `nd-${natureStyle || 'nature'}-${naturePalette || 'paper'}`,
          layoutMode: natureLayout,
          typeMode: natureTypo,
          effects: natureEffects,
          variantKey: imageSeed,
          visualSource: 'scene',
          badge: landingLogic.badge,
          title,
          titleHtml: esc(title),
          trustTitle: textLead,
          trustSmall: landingLogic.trustSmall,
          methodName: landingLogic.methodName,
          painTitle: landingLogic.label,
          painAlert: landingLogic.defaultText,
          valueTitle: landingLogic.valueTitle,
          valueItems: landingLogic.valueItems,
          cards: storyCards,
          proofItems: [],
          liveNote: landingLogic.botTransition,
          ctaLead: buildTildaCtaLead(title, textLead, 'natureEditorial'),
          actionSubtitle: landingLogic.ctaLead,
          actionTitle: landingLogic.actionTitle,
          sceneImage: currentPrelandingAiImages.sceneImage,
          valueImage: currentPrelandingAiImages.valueImage,
          ctaImage: currentPrelandingAiImages.ctaImage
        },
        projectData: prelandingRuntimeProjectData,
        landingMeta: effectivePrelandingVariantMeta
      });
    }
    if (manualPrelandingMode === 'directionQuiz'
      || manualPrelandingMode === 'personalRouteQuiz'
      || manualPrelandingMode === 'barrierProfileQuiz') {
      const isPersonalRoute = manualPrelandingMode === 'personalRouteQuiz';
      const isBarrierProfile = manualPrelandingMode === 'barrierProfileQuiz';
      const insightPresets = isBarrierProfile
        ? BARRIER_PROFILE_QUIZ_PRESETS
        : isPersonalRoute
          ? PERSONAL_ROUTE_QUIZ_PRESETS
          : DIRECTION_QUIZ_PRESETS;
      const fallbackPreset = insightPresets[0];
      const insightPreset = insightPresets.find((preset) => preset.id === activePresetId) || fallbackPreset;
      const insightDesign = currentPrelandingDesignRoute || insightPreset;
      const insightStyle = insightDesign.style || insightPreset.style;
      const insightPalette = insightDesign.palette || insightPreset.palette;
      const insightEffects = insightDesign.effects || insightPreset.effects || [];
      const title = enteredHeadline || (isBarrierProfile
        ? 'Почему в самый важный момент всё снова срывается?'
        : isPersonalRoute
          ? 'Как понять, что вы идёте не по своему маршруту?'
          : 'Как найти направление, которое подходит именно вам?');
      const landingLogic = resolveClientPrelandingLogic(title, enteredText, manualPrelandingMode);
      const textLead = enteredText || landingLogic.lead;
      const imageSeed = `manual-${manualPrelandingMode}-${insightDesign.id || insightPreset.id}-${insightStyle}-${insightPalette}-${title}-${textLead}`;
      return renderPrelandingHtml({
        tpl: 1,
        style: insightStyle,
        palette: insightPalette,
        photo,
        layout: 'insight',
        typo: 'manrope',
        effects: insightEffects,
        overrides: {
          prelandingMode: manualPrelandingMode,
          renderMode: isBarrierProfile
            ? 'barrierProfile'
            : isPersonalRoute
              ? 'personalRoute'
              : 'directionRoute',
          templateId: 1,
          themeStyle: insightStyle,
          designFamily: isBarrierProfile
            ? 'barrier-profile'
            : isPersonalRoute
              ? 'personal-route'
              : 'direction-route',
          landingVariant: isBarrierProfile
            ? `bp-${insightDesign.id || insightPreset.id}`
            : isPersonalRoute
              ? `pr-${insightDesign.id || insightPreset.id}`
              : `dr-${insightDesign.id || insightPreset.id}`,
          layoutMode: 'insight',
          typeMode: 'manrope',
          effects: insightEffects,
          variantKey: imageSeed,
          visualSource: 'scene',
          badge: landingLogic.badge,
          title,
          titleHtml: esc(title),
          painTitle: landingLogic.label,
          painAlert: landingLogic.defaultText,
          trustTitle: textLead,
          trustSmall: landingLogic.trustSmall,
          methodName: landingLogic.methodName,
          valueTitle: landingLogic.valueTitle,
          valueItems: landingLogic.valueItems,
          cards: landingLogic.cards,
          proofItems: [],
          liveNote: landingLogic.botTransition,
          ctaLead: landingLogic.ctaLead,
          actionSubtitle: landingLogic.ctaLead,
          actionTitle: landingLogic.actionTitle,
          sceneImage: currentPrelandingAiImages.sceneImage,
          valueImage: '',
          ctaImage: '',
          designRoute: insightDesign,
          designRouteId: insightDesign.id || insightPreset.id
        },
        projectData: prelandingRuntimeProjectData,
        landingMeta: effectivePrelandingVariantMeta
      });
    }
    if (manualPrelandingMode === 'minimalCompare') {
      const minimalPreset = MINIMAL_COMPARE_PRESETS.find((preset) => preset.id === activePresetId) || MINIMAL_COMPARE_PRESETS[0];
      const minimalDesign = currentPrelandingDesignRoute || minimalPreset;
      const minimalStyle = minimalDesign.style || minimalPreset.style;
      const minimalPalette = minimalDesign.palette || minimalPreset.palette;
      const minimalLayout = minimalDesign.layout || minimalPreset.layout || 'minimal';
      const minimalTypo = minimalDesign.typo || minimalPreset.typo || 'inter';
      const minimalEffects = minimalDesign.effects || minimalPreset.effects || ['fadein'];
      const title = enteredHeadline || 'Смотрю на других и думаю: почему у меня не так?';
      const landingLogic = resolveClientPrelandingLogic(title, enteredText, 'minimalCompare');
      const textLead = enteredText || landingLogic.lead;
      const imageSeed = `manual-minimal-compare-${minimalDesign.id || minimalPreset.id}-${minimalStyle}-${minimalPalette}-${title}-${textLead}`;
      return renderPrelandingHtml({
        tpl: 1,
        style: minimalStyle,
        palette: minimalPalette,
        photo,
        layout: minimalLayout,
        typo: minimalTypo,
        effects: minimalEffects,
        overrides: {
          prelandingMode: 'minimalCompare',
          renderMode: 'minimalCompare',
          templateId: 1,
          themeStyle: minimalStyle,
          designFamily: `minimal-compare-${minimalDesign.id || minimalPreset.id || 'noir'}`,
          landingVariant: `mc-${minimalStyle || 'minimal'}-${minimalPalette || 'dark'}`,
          layoutMode: minimalLayout,
          typeMode: minimalTypo,
          effects: minimalEffects,
          variantKey: imageSeed,
          visualSource: 'none',
          badge: landingLogic.badge,
          title,
          titleHtml: esc(title),
          trustTitle: textLead,
          trustSmall: landingLogic.trustSmall,
          methodName: landingLogic.methodName,
          valueTitle: landingLogic.valueTitle,
          valueItems: landingLogic.valueItems,
          cards: landingLogic.cards,
          proofItems: [],
          liveNote: landingLogic.botTransition,
          ctaLead: landingLogic.ctaLead,
          actionSubtitle: landingLogic.ctaLead,
          actionTitle: landingLogic.actionTitle
        },
        projectData: prelandingRuntimeProjectData,
        landingMeta: effectivePrelandingVariantMeta
      });
    }
    return renderPrelandingHtml({
      tpl: tpl || 1,
      style,
      palette,
      photo,
      layout,
      typo,
      effects,
      overrides: prelandingSync,
      projectData: prelandingRuntimeProjectData,
      landingMeta: effectivePrelandingVariantMeta
    });
  }, [tpl, style, palette, layout, typo, effects, photo, prelandingSync, prelandingRuntimeProjectData, hasPrelandingKeys, activeLandingRuntimeArtifact?.publicLandingKey, prelandingOutputLocked, manualPrelandingMode, activePresetId, creativeHeadline, creativeMethod, prelandingAiImagesReady, currentPrelandingAiImages, currentPrelandingDesignRoute, effectivePrelandingVariantMeta, prelandingTemplateReady]);
  const prelandingHtmlConfig = useMemo(
    () => buildAtmospaceLandingConfig({
      projectData: prelandingRuntimeProjectData,
      ...landingRuntimeMeta
    }),
    [prelandingRuntimeProjectData, landingRuntimeMeta]
  );
  const prelandingHtmlValidation = useMemo(
    () => validateAtmospaceTildaHtml(prelandingHtml, prelandingHtmlConfig, {
      quizRequired: manualPrelandingMode === 'templateStage'
    }),
    [prelandingHtml, prelandingHtmlConfig, manualPrelandingMode]
  );

  const prelandingPresetForBannerStyle = (bannerStyle) => {
    const map = {
      blackRed: 'bannerBlackRed',
      redWhite: 'bannerBlackRed',
      darkYellow: 'bannerBlackYellow',
      darkOrange: 'bannerBlackYellow',
      splitBeforeAfter: 'bannerBlackYellow',
      greenSystem: 'bannerGreen',
      greenDark: 'bannerGreen',
      moneyProof: 'bannerGreen',
      blueTrust: 'bannerBlue',
      cleanSystem: 'bannerBlue',
      editorialGold: 'bannerWhiteGold',
      whiteGoldPremium: 'bannerWhiteGold',
      outdoorFreedom: 'bannerWhiteGold',
      purple: 'purpleBreak',
      documentaryNoir: 'documentaryReal',
      newspaperShock: 'clientStory',
      fintechRed: 'bannerBlackRed',
      glassPremium: 'bannerBlue',
      cosmicMetaphor: 'purpleBreak',
      animalMetaphor: 'bannerGreen'
    };
    return PRESETS.find((preset) => preset.id === (map[bannerStyle] || 'clientStory')) || PRESETS[0];
  };

  const applyAiIdeaToFlow = (idea) => {
    setCreativeHeadline(idea.headline || '');
    setCreativeMethod(idea.decoration || idea.adText || '');
    setCreativeVisual(idea.visualPrompt || '');
    setCreativeDecor(idea.decoration || '');
    setCreativeTone('Хлестко, по-человечески, без воды и без инфоцыганщины');
    setIsAiPrelandingBuilding(false);
    setIsAiPrelandingInvalidated(false);
    setPrelandingSync(idea.prelandingSync || null);
    applyPreset(prelandingPresetForBannerStyle(idea.bannerStyle));
    if (idea.heroImage) setPhoto(idea.heroImage);
  };

  const handleAiPrelandingBuildStart = () => {
    setIsAiPrelandingBuilding(true);
    setIsAiPrelandingInvalidated(true);
    setPrelandingSync(null);
  };

  const handleAiPrelandingBuildEnd = () => {
    setIsAiPrelandingBuilding(false);
  };

  // Прогресс сборки лендинга
  const progress = useMemo(() => {
    let p = 0;
    if (landingRuntimeData.landingName) p += 15;
    if (landingRuntimeData.landingCode) p += 15;
    if (landingRuntimeData.counterId) p += 15;
    if (landingRuntimeData.serverOnlyAdGoalCredential) p += 15;
    if (creativeHeadline && creativeMethod) p += 20;
    if (canPre) p += 20;
    return Math.min(100, p);
  }, [canPre, landingRuntimeData, creativeHeadline, creativeMethod]);

  const bg = dark ? 'bg-slate-950' : 'bg-slate-50';
  const card = dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const text = dark ? 'text-white' : 'text-slate-900';
  const textMuted = dark ? 'text-slate-400' : 'text-slate-500';

  if (!authorizedClient) {
    return <LoginGate dark={dark} onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen ${bg} p-3 md:p-6 transition-colors`}>
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-5 md:p-8 text-white mb-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-400 rounded-full blur-3xl opacity-10"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-yellow-400 text-slate-900 px-3 py-1 rounded-full text-xs font-black uppercase mb-3">
                <Wand2 className="w-3 h-3" /> Конструктор лендингов
              </div>
              <h1 className="text-2xl md:text-4xl font-black mb-2 leading-tight">Конструктор <span className="text-yellow-400">лендингов</span></h1>
              {progress > 0 && (
                <div className="mt-4 bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur">
                  <div className="bg-gradient-to-r from-yellow-400 to-emerald-400 h-full transition-all" style={{ width: `${progress}%` }}></div>
                </div>
              )}
              {progress > 0 && <p className="text-xs text-slate-400 mt-1">Готовность лендинга: {progress}%</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <button onClick={() => setDark(!dark)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-colors backdrop-blur" title={dark ? 'Светлая тема' : 'Тёмная тема'}>
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-right text-xs text-slate-200 backdrop-blur">
                <div className="font-black">{authorizedClient.label || authorizedClient.login}</div>
                <div>{quota.unlimited ? 'Без лимитов' : `Баннеры ${usage.banners}/${bannerLimit}, предленды ${usage.prelandings}/${prelandingLimit}`}</div>
                <button type="button" onClick={handleLogout} className="mt-1 text-[11px] font-black text-yellow-300 hover:text-yellow-200">Выйти</button>
              </div>
            </div>
          </div>
        </div>

        <div className={`mb-4 sticky top-2 z-20 ${dark ? 'bg-slate-950/80' : 'bg-slate-50/80'} backdrop-blur p-2 -m-2 rounded-2xl`}>
          <div className="flex flex-wrap gap-2">
            <Tab active={tab === 'creative'} onClick={() => openTab('creative')} icon={Lightbulb} dark={dark}>Креативы</Tab>
            <Tab active={tab === 'pre'} onClick={() => openTab('pre')} icon={Wand2} dark={dark}>Лендинги</Tab>
          </div>
        </div>

        {/* === КРЕАТИВЫ === */}
        {tab === 'creative' && (
          <div>
            <AIBannerStudio
              dark={dark}
              seedHeadline={creativeHeadline}
              seedAdText={creativeMethod}
              onHeadlineChange={setCreativeHeadline}
              onAdTextChange={setCreativeMethod}
              currentPhoto={photo}
              onPhotoPicked={setPhoto}
              onApplyIdea={applyAiIdeaToFlow}
              preferredPersona={gender === 'female' ? 'woman' : gender === 'male' ? 'man' : 'mixed'}
            />
          </div>
        )}

        {/* === ПРЕДЛЕНДИНГ === */}
        {tab === 'pre' && (
          <div className="space-y-4">
            <AtmospaceLandingConstructor
              dark={dark}
              value={landingRuntimeData}
              onChange={(updater) => {
                setLandingRuntimeArtifact(null);
                setLandingRuntimeData(updater);
              }}
            />

            <div className={`${dark ? 'bg-red-500/10 border-red-500/40' : 'bg-red-50 border-red-300'} border-2 rounded-3xl p-6 shadow-sm`}>
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className={`text-xl font-black ${text}`}>Режим генерации предлендинга</h2>
                  <p className={`text-sm ${dark ? 'text-red-100' : 'text-red-900'}`}>
                    Доступны шесть форматов предлендинга. Каждый берёт заголовок и описание клиента как основу, собирает смысловые блоки без брендов и готовит HTML для вставки в Tilda.
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                {MANUAL_PRELANDING_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setManualPrelandingMode(mode.id);
                      const modePresets = mode.id === 'heroBlocks'
                        ? HERO_BLOCKS_PRESETS
                        : mode.id === 'natureEditorial'
                          ? NATURE_EDITORIAL_PRESETS
                          : mode.id === 'minimalCompare'
                            ? MINIMAL_COMPARE_PRESETS
                            : mode.id === 'directionQuiz'
                              ? DIRECTION_QUIZ_PRESETS
                              : mode.id === 'personalRouteQuiz'
                                ? PERSONAL_ROUTE_QUIZ_PRESETS
                                : mode.id === 'barrierProfileQuiz'
                                  ? BARRIER_PROFILE_QUIZ_PRESETS
                                  : CORE_METHOD_PRESETS;
                      const currentPresetStillFits = modePresets.some((preset) => preset.id === activePresetId);
                      if (!currentPresetStillFits) {
                        if (mode.id === 'templateStage') applyCoreMethodTemplate(1);
                        else applyPreset(modePresets[0]);
                      }
                      if (prelandingSync) setPrelandingSync(null);
                    }}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${
                      manualPrelandingMode === mode.id
                        ? 'border-red-500 bg-red-500 text-white shadow-lg'
                        : dark
                          ? 'border-slate-700 bg-slate-900 text-slate-100 hover:border-red-400'
                          : 'border-red-100 bg-white text-slate-900 hover:border-red-300'
                    }`}
                  >
                    <div className="font-black text-base mb-1">{mode.title}</div>
                    <div className={`text-xs leading-relaxed ${manualPrelandingMode === mode.id ? 'text-white/90' : textMuted}`}>{mode.desc}</div>
                  </button>
                ))}
              </div>
              <div className="mt-5 grid md:grid-cols-2 gap-3">
                <TextArea
                  label="Заголовок предлендинга"
                  hint="первый экран и смысл посадочной"
                  value={creativeHeadline}
                  onChange={setCreativeHeadline}
                  rows={2}
                  placeholder="Например: Зарплата пришла — а денег снова почти нет?"
                  dark={dark}
                />
                <TextArea
                  label="Текст / подзаголовок предлендинга"
                  hint="коротко: какой сценарий разбирает лендинг"
                  value={creativeMethod}
                  onChange={setCreativeMethod}
                  rows={2}
                  placeholder="Например: Разберитесь, почему деньги заканчиваются раньше срока и что каждый месяц возвращает вас к нулю."
                  dark={dark}
                />
              </div>
              <p className={`mt-3 text-xs font-bold ${dark ? 'text-red-100' : 'text-red-900'}`}>
                Все форматы сохраняют ваш заголовок и текст, определяют конкретный сценарий и собирают под него разные офферы, блоки и визуальные сцены. Общие заготовки поверх смысла не подставляются.
              </p>
            </div>

            {/* Шаг 1 */}
            {manualPrelandingMode === 'templateStage' && (
              <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
                <h2 className={`text-xl font-black mb-2 ${text}`}>Формат 1: мини-тест + разбор</h2>
                <p className={`text-sm ${textMuted} mb-4`}>Каждая карточка привязана к своему углу, дизайну, палитре, типографике и структуре. Выбрали сценарий → сгенерировали картинки и Tilda HTML.</p>
                <div className="grid md:grid-cols-3 gap-3">
                  {TPL.map((t) => {
                    const linkedPreset = CORE_METHOD_PRESETS.find((preset) => preset.tpl === t.id) || CORE_METHOD_PRESETS[0];
                    const isSelected = tpl === t.id;
                    return (
                    <button key={t.id} onClick={() => applyCoreMethodTemplate(t.id)} className={`text-left rounded-2xl p-4 border-2 ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : (dark ? 'border-slate-700 hover:border-slate-500 bg-slate-800' : 'border-slate-200 hover:border-slate-300 bg-white')}`}>
                      <div className={`inline-block bg-gradient-to-r ${t.c} text-white text-[10px] font-black uppercase px-2 py-0.5 rounded mb-2`}>{t.a}</div>
                      <h3 className={`font-black text-sm mb-2 ${isSelected ? 'text-slate-900' : text}`}>{t.t}</h3>
                      <div className={`mb-2 rounded-xl border px-3 py-2 text-[11px] font-bold ${isSelected ? 'border-blue-200 bg-white text-slate-700' : (dark ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-100 bg-slate-50 text-slate-600')}`}>
                        {linkedPreset.emoji} Дизайн: {linkedPreset.name}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {t.p.map((p, i) => <span key={i} className={`text-[10px] font-bold ${isSelected ? 'bg-white border-slate-300 text-slate-900' : (dark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-700')} border px-1.5 py-0.5 rounded-full`}>{p}</span>)}
                      </div>
                      {isSelected && <div className="mt-2 text-xs font-black text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Сценарий и дизайн выбраны</div>}
                    </button>
                  )})}
                </div>
              </div>
            )}

            {manualPrelandingMode !== 'templateStage' && (
            <div className={`${card} rounded-3xl p-6 shadow-sm border`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-xl font-black ${text} flex items-center gap-2`}>
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  {manualPrelandingMode === 'minimalCompare'
                    ? 'Формат 4: тихое сравнение'
                    : manualPrelandingMode === 'natureEditorial'
                      ? 'Формат 3: nature editorial'
                      : manualPrelandingMode === 'directionQuiz'
                        ? 'Формат 5: маршрут действия'
                        : manualPrelandingMode === 'personalRouteQuiz'
                          ? 'Сохранённый формат: личный маршрут'
                          : manualPrelandingMode === 'barrierProfileQuiz'
                            ? 'Формат 6: профиль барьера'
                            : 'Формат 2: hero-картинка + блоки'}
                </h2>
                <button onClick={resetAll} className={`text-xs font-bold ${textMuted} hover:underline flex items-center gap-1`}><RotateCcw className="w-3 h-3" /> Сброс</button>
              </div>
              <p className={`text-xs ${textMuted} mb-3`}>
                {manualPrelandingMode === 'minimalCompare'
                  ? 'Для этого режима оставлены 3 минималистичных варианта. HTML собирается без фото и без ожидания OpenAI-картинок: только текст, микро-смыслы и CTA.'
                  : manualPrelandingMode === 'natureEditorial'
                    ? 'Для этого режима оставлены 3 editorial-варианта. Каждый задаёт журнальную палитру, типографику, структуру и отдельный визуальный маршрут для AI-фото.'
                    : manualPrelandingMode === 'directionQuiz'
                      ? 'По заголовку и тексту собирается динамичный смысловой одностраничник, три опоры и прямая регистрация. Одна AI-сцена поддерживает первый экран.'
                      : manualPrelandingMode === 'personalRouteQuiz'
                        ? 'Сохранённый личный маршрут работает как смысловой одностраничник с прямой регистрацией и одной AI-сценой.'
                        : manualPrelandingMode === 'barrierProfileQuiz'
                          ? 'Повторяющийся сценарий раскрывается через три смысловых признака и один реалистичный первый шаг. Далее — прямая регистрация Atmospace.'
                          : 'Для этого режима оставлены только 3 рабочих варианта. Каждый сразу выставляет стиль, палитру, типографику, структуру и промпт для живых AI-фото.'}
              </p>
              <div className="grid md:grid-cols-3 gap-2">
                {visiblePrelandingPresets.map((p) => {
                  const isSelected = activePresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      className={`text-left rounded-xl p-3 border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-100'
                          : (dark ? 'border-slate-700 hover:border-slate-500 bg-slate-800' : 'border-slate-200 hover:border-slate-400 bg-white')
                      }`}
                    >
                      <div className="text-2xl mb-1">{p.emoji}</div>
                      <div className={`font-black text-xs mb-0.5 ${isSelected ? 'text-slate-900' : text}`}>{p.name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-slate-600' : textMuted} leading-tight`}>{p.desc}</div>
                      {isSelected && <div className="mt-2 text-[10px] font-black text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Выбран как база</div>}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl">
              <h2 className="text-xl font-black mb-3 flex items-center gap-2"><Copy className="w-5 h-5" /> Готовый HTML для Tilda</h2>
              {isAiPrelandingBuilding ? (
                <div className="bg-white/15 rounded-xl p-4 text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-200 animate-pulse" />
                  <p className="text-sm font-bold">{prelandingAiStatus || (manualPrelandingMode === 'minimalCompare'
                    ? 'Собираю минималистичный HTML. Старый код скрыт, чтобы его не вставить повторно.'
                    : isSingleImagePrelandingMode
                      ? 'OpenAI генерирует одну смысловую hero-картинку. Старый код скрыт, чтобы его не вставить повторно.'
                      : 'OpenAI генерирует 3 разные картинки. Старый код скрыт, чтобы его не вставить повторно.')}</p>
                  <p className="mt-2 text-xs text-white/80">{manualPrelandingMode === 'minimalCompare' ? 'HTML появится автоматически после подготовки варианта.' : 'После публикации изображений HTML появится автоматически.'}</p>
                </div>
              ) : isAiPrelandingInvalidated ? (
                <div className="bg-white/15 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-200" />
                  <p className="text-sm">Старый HTML очищен. Сгенерируйте новый код и дождитесь успешного завершения.</p>
                </div>
              ) : !hasPrelandingKeys ? (
                <div className="bg-white/15 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-200" />
                  <p className="text-sm">Заполните верхние поля сборки: {prelandingRuntimeMissing.join(', ')}.</p>
                </div>
              ) : !(prelandingTemplateReady && style && palette) ? (
                <div className="bg-white/15 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-200" />
                  <p className="text-sm">{prelandingNeedsTemplate ? 'Выберите один из 3 шаблонов, стиль и палитру. После этого запустите генерацию AI-картинок и HTML.' : 'Выберите стиль и палитру. После этого запустите генерацию AI-картинок и HTML.'}</p>
                </div>
              ) : !prelandingAiImagesReady ? (
                <div className="bg-white/15 rounded-xl p-4 text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-200" />
                  <p className="text-sm font-bold">{manualPrelandingMode === 'minimalCompare'
                    ? 'HTML появится после подготовки минималистичного формата. Картинки для этого режима не нужны.'
                    : isSingleImagePrelandingMode
                      ? 'HTML появится после публикации одной смысловой hero-картинки. Если OpenAI зависнет, конструктор сам перезапустит попытку.'
                      : 'HTML появится после публикации трёх AI-картинок: hero, блок ценности и CTA. Если OpenAI зависнет, конструктор сам перезапустит попытку.'}</p>
                  <button
                    type="button"
                    onClick={handleGeneratePrelandingAiImages}
                    disabled={!canGeneratePrelandingAi}
                    className="mt-4 rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualPrelandingMode === 'minimalCompare'
                      ? 'Собрать HTML'
                      : isSingleImagePrelandingMode
                        ? 'Сгенерировать hero-картинку и HTML'
                        : 'Сгенерировать AI-картинки и HTML'}
                  </button>
                  {quota.prelandingBlocked && (
                    <p className="mt-3 text-xs font-bold text-yellow-100">Лимит AI-предлендингов исчерпан: {quota.prelandingsUsed || 0}/{quota.prelandingLimit || 0}.</p>
                  )}
                  {prelandingAiError && (
                    <p className="mt-3 rounded-xl bg-red-500/25 p-3 text-xs font-bold text-white">{prelandingAiError}</p>
                  )}
                  {prelandingAiStatus && !prelandingAiError && (
                    <p className="mt-3 rounded-xl bg-white/10 p-3 text-xs font-bold text-white">{prelandingAiStatus}</p>
                  )}
                </div>
              ) : prelandingHtmlValidation.errors.length ? (
                <div className="bg-white/15 rounded-xl p-4">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-200" />
                  <p className="text-center text-sm font-black">HTML заблокирован автоматической проверкой.</p>
                  <div className="mt-3 space-y-2">
                    {prelandingHtmlValidation.errors.map((item, index) => (
                      <div key={index} className="rounded-lg bg-red-500/25 p-2 text-xs font-bold text-white">{item}</div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-xs text-white/80">Исправьте поля клиента или перегенерируйте код. Кнопка копирования появится только после чистой проверки.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prelandingAiStatus && (
                    <div className="rounded-xl bg-white/15 p-3 text-xs font-bold text-white">{prelandingAiStatus}</div>
                  )}
                  {prelandingHtmlValidation.warnings.length > 0 && (
                    <div className="rounded-xl bg-yellow-300/20 p-3 text-xs font-bold text-yellow-50">
                      <div className="mb-1 text-white">Предупреждения проверки:</div>
                      {prelandingHtmlValidation.warnings.map((item, index) => (
                        <div key={index}>• {item}</div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-xl bg-emerald-300/20 p-3 text-xs font-black text-white">
                    Проверка пройдена: Tilda HTML собран на Atmospace runtime, с publicLandingKey, /init, /click и безопасными CTA.
                  </div>
                  <div className="grid md:grid-cols-1 gap-2">
                    <CopyBtn text={prelandingHtml} label="Скопировать HTML-код" big />
                  </div>
                  <details className="bg-black/25 rounded-xl">
                    <summary className="cursor-pointer p-3 font-bold text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> Превью кода</span>
                      <ChevronDown className="w-4 h-4" />
                    </summary>
                    <pre className="p-3 text-[9px] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border-t border-white/10">{prelandingHtml}</pre>
                  </details>
                </div>
              )}
            </div>

            <details className={`${card} rounded-3xl border p-5 shadow-sm`}>
              <summary className={`cursor-pointer text-base font-black ${text}`}>Параметры URL для Яндекс Директа</summary>
              <p className={`mt-2 text-xs ${textMuted}`}>Добавьте эту строку к адресу лендинга на уровне кампании. Она передаёт рекламные UTM и параметры Директа без ручной переделки.</p>
              <div className={`mt-4 w-full overflow-x-auto whitespace-pre-wrap break-words rounded-xl p-4 font-mono text-[12px] leading-relaxed ${dark ? 'bg-slate-950/70 text-blue-100' : 'bg-slate-50 text-slate-800'}`}>{YANDEX_DIRECT_URL_PARAMS}</div>
              <div className="mt-4 max-w-sm">
                <CopyBtn text={YANDEX_DIRECT_URL_PARAMS} label="Скопировать URL-параметры" dark={dark} />
              </div>
            </details>
          </div>
        )}

        <div className={`text-center text-xs ${textMuted} mt-8 pb-4`}>Конструктор — Креативы → Лендинги</div>
      </div>
    </div>
  );
}
