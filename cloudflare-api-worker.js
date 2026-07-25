const TEXT_MODEL = 'gpt-5.4';
const IMAGE_TOOL_TEXT_MODEL = 'gpt-5';
const IMAGE_MODEL = 'gpt-image-2';

const audienceContext = `
Проект: единый конструктор баннеров, предлендингов, продающей истории и оффера для рекламной воронки.
Воронка: баннер → предлендинг → бот → продающая история → оффер. Баннер и первый экран предлендинга должны говорить одну и ту же мысль теми же словами.
Оффер: человеку не нужно снова учиться, становиться блогером, технарем, таргетологом или продавцом. Команда уже собрала экосистему и большую часть работы берет на себя.
ЦА: женщины и мужчины 35-60; Россия и СНГ; доход часто 40-150 тыс.; хотят 200-300 тыс.; устали от найма, кредитов, курсов, вебинаров, конспектов и ощущения "я стараюсь, а денег нет". В авто-режиме визуалы нужно чередовать: мужчины, женщины, пары, предметные сцены и метафоры, без перекоса в один типаж.
Главный принцип продукта: один смысл = одна группа = один баннер = один первый экран предлендинга. Нужны покупатели, а не просто дешевые клики.
Боевой язык: коротко, резко, конкретно, обычным русским. Заголовок должен звучать как мысль человека о себе: "да, это про меня".
Рабочие варианты баннера и объявления: курсы сожрали деньги; вечный студент; без продукта/блога/команды; без соцсетей и контента; первые деньги; устал от найма; человек шел самым сложным путем; не нужно все делать самому; подработка к основной работе за кадром.
Нельзя: роскошь, яхты, Дубай, Ламбо, банковские бренды, гарантии дохода, фейковые скриншоты, токсичное давление, абстрактные формулы типа "создайте спокойный доход".
Нужно: узнавание себя, логически завершенная мысль, разрыв шаблона "новый курс не нужен", короткое продолжение под заголовком и маленькая кнопка "Узнать подробности".
Формат баннера: один крупный заголовок, под ним короткое продолжение мысли, без иконок-шума и мелкой полезняшки.
`;
const fallbackIdeas = [
  {
    angle: 'курсы сожрали деньги',
    headline: 'Хватит покупать курсы. Денег от них нет.',
    decoration: 'Смотри, где реально ломается заработок',
    adTitle: 'Хватит покупать курсы без денег',
    adText: 'Разбор другого подхода для тех, кто устал учиться без результата.',
    visualPrompt: 'Живая женщина 45-60 за столом с ноутбуком, рядом блокноты и следы прошлых обучений, лицо с узнаваемым усталым вопросом, не глянец, реалистичная рекламная фотография, свободная зона под крупный текст.'
  },
  {
    angle: 'вечный ученик',
    headline: 'Всё знаешь, но всё равно не зарабатываешь?',
    decoration: 'Пора менять не курс, а сам подход',
    adTitle: 'Всё знаешь, а дохода нет?',
    adText: 'Посмотрите метод без вечной учёбы и бесконечных конспектов.',
    visualPrompt: 'Человек 40-60 с ноутбуком и стопкой конспектов, выражение усталости от бесконечной учебы, бытовой свет, реалистично, место для текста слева или справа.'
  },
  {
    angle: 'не нужно самому',
    headline: 'Не обязательно разбираться во всём самому.',
    decoration: 'Есть система и сопровождение на каждом этапе',
    adTitle: 'Не делайте всё в одиночку',
    adText: 'Посмотрите подход, где не нужно тащить всё самому.',
    visualPrompt: 'Взрослая женщина 40-60 с ноутбуком улыбается с облегчением, рабочее место стало спокойным и чистым, ощущение поддержки и понятной системы, реалистичное фото.'
  },
  {
    angle: 'без продукта и блога',
    headline: 'Не нужен свой продукт, блог или команда.',
    decoration: 'Есть готовая система, в которую можно войти',
    adTitle: 'Без продукта, блога и команды',
    adText: 'Смотрите, как устроен другой путь к онлайн-доходу.',
    visualPrompt: 'Уверенная женщина 40-60 с ноутбуком в светлом интерьере или кафе, спокойная энергия, без роскоши, ощущение простоты и готового решения, чистая композиция под текст.'
  }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

const DEFAULT_STORY_URL = 'https://promo-ii.ru/67';
const DEFAULT_OFFER_URL = 'https://promo-ii.ru/65';
const GETCOURSE_ORDER_BASE = 'https://voronkapodkluch.getcourse.ru/page2';
const ATMOSPACE_API_BASE_URL = 'https://api.atmospace.pro';
const ATMOSPACE_GENERATE_PATH = '/api/landing-runtime/generate';
const ATMOSPACE_INIT_PATH = '/api/landing-runtime/init';
const ATMOSPACE_CLICK_PATH = '/api/landing-runtime/click';
const ATMOSPACE_RUNTIME_VERSION = 'sergey-constructor-quiz-v1';
const PURCHASE_URL_MISSING_MESSAGE = 'База не вернула purchase_url_990. Генерация остановлена. Проверьте серверную логику автосоздания ссылки покупки 990.';
const DEFAULT_CLIENT_GOALS = {
  goal_bot_start: 'bot_start',
  goal_channel_joined: 'channel_joined',
  goal_offer_click: 'offer_click',
  goal_webinar_click: 'webinar_click',
  goal_webinar_registration: 'webinar_registration'
};

function cleanText(value, max = 400) {
  return String(value || '').trim().slice(0, max);
}

function isHttpsUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getQueryParamFromRaw(value, paramName) {
  const raw = String(value || '').trim();
  if (!raw || !paramName) return '';
  try {
    return new URL(raw).searchParams.get(paramName) || '';
  } catch {
    const match = raw.match(new RegExp(`[?&]${paramName}=([^&#]+)`, 'i'));
    return match ? decodeURIComponent(match[1]) : '';
  }
}

function parseGetCourseReferralUrl(value) {
  const raw = cleanText(value, 1000);
  const result = {
    raw,
    gcao: '',
    gcpc: '',
    input_path: '',
    order_url_990: '',
    errors: []
  };

  if (!raw) {
    result.errors.push('empty_getcourse_referral_url');
    return result;
  }

  let parsed = null;
  try {
    parsed = new URL(raw);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    result.errors.push('bad_getcourse_url');
  } else {
    result.input_path = parsed.pathname.replace(/\/+$/, '') || '/';
    if (parsed.protocol !== 'https:') result.errors.push('bad_getcourse_protocol');
    if (parsed.hostname !== 'voronkapodkluch.getcourse.ru') result.errors.push('bad_getcourse_host');
    if (result.input_path !== '/page2') result.errors.push('bad_getcourse_path');
  }

  result.gcao = cleanText(parsed?.searchParams.get('gcao') || getQueryParamFromRaw(raw, 'gcao'), 160);
  result.gcpc = cleanText(parsed?.searchParams.get('gcpc') || getQueryParamFromRaw(raw, 'gcpc'), 160);

  if (!result.gcao) result.errors.push('missing_gcao');
  if (!result.gcpc) result.errors.push('missing_gcpc');

  if (!result.errors.length) {
    const query = `gcao=${encodeURIComponent(result.gcao)}&gcpc=${encodeURIComponent(result.gcpc)}`;
    result.order_url_990 = `${GETCOURSE_ORDER_BASE}?${query}`;
  }

  return result;
}

function publicClientRecord(record = {}, fallback = {}) {
  const source = record && typeof record === 'object' && !Array.isArray(record) ? record : fallback;
  const safe = { ...(source || {}) };
  delete safe.yandex_oauth_token;
  return safe;
}

function normalizeClientRecord(input = {}) {
  const getcourseReferralUrl = cleanText(input.getcourse_referral_url || input.order_url_990, 1000);
  const getcourseParsed = parseGetCourseReferralUrl(getcourseReferralUrl);
  const bothelp = {
    telegram_domain: cleanText(input.telegram_domain, 180),
    telegram_start: cleanText(input.telegram_start, 220),
    max_domain: cleanText(input.max_domain, 180),
    max_start: cleanText(input.max_start, 220)
  };
  const record = {
    client_id: cleanText(input.client_id, 120),
    client_name: cleanText(input.client_name, 180),
    landing_url: cleanText(input.landing_url, 1000),
    story_url: cleanText(input.story_url || DEFAULT_STORY_URL, 1000),
    offer_url: cleanText(input.offer_url || DEFAULT_OFFER_URL, 1000),
    order_url_990: cleanText(input.order_url_990, 1000) || getcourseParsed.order_url_990,
    partner_code: cleanText(input.partner_code, 180),
    webinar_url: cleanText(input.webinar_url, 1000),
    metrika_counter_id: cleanText(input.metrika_counter_id, 80),
    yandex_oauth_token: cleanText(input.yandex_oauth_token, 1400),
    goal_bot_start: cleanText(input.goal_bot_start || DEFAULT_CLIENT_GOALS.goal_bot_start, 120),
    goal_channel_joined: cleanText(input.goal_channel_joined || DEFAULT_CLIENT_GOALS.goal_channel_joined, 120),
    goal_offer_click: cleanText(input.goal_offer_click || DEFAULT_CLIENT_GOALS.goal_offer_click, 120),
    goal_webinar_click: cleanText(input.goal_webinar_click || DEFAULT_CLIENT_GOALS.goal_webinar_click, 120),
    goal_webinar_registration: cleanText(input.goal_webinar_registration || DEFAULT_CLIENT_GOALS.goal_webinar_registration, 120),
    status: cleanText(input.status || 'paused', 80),
    comment: cleanText(input.comment || 'constructor_submit', 1000),
    updated_at: new Date().toISOString()
  };

  const missing = [];
  for (const [key, label] of [
    ['client_id', 'client_id'],
    ['client_name', 'client_name'],
    ['landing_url', 'landing_url'],
    ['story_url', 'story_url'],
    ['offer_url', 'offer_url'],
    ['order_url_990', 'order_url_990'],
    ['partner_code', 'partner_code'],
    ['webinar_url', 'webinar_url'],
    ['metrika_counter_id', 'metrika_counter_id'],
    ['yandex_oauth_token', 'yandex_oauth_token']
  ]) {
    if (!record[key]) missing.push(label);
  }
  for (const [key, label] of [
    ['telegram_domain', 'telegram_domain'],
    ['telegram_start', 'telegram_start'],
    ['max_domain', 'max_domain'],
    ['max_start', 'max_start']
  ]) {
    if (!bothelp[key]) missing.push(label);
  }

  for (const error of getcourseParsed.errors) {
    missing.push(error);
  }

  for (const [key, label] of [
    ['landing_url', 'landing_url'],
    ['story_url', 'story_url'],
    ['offer_url', 'offer_url'],
    ['order_url_990', 'order_url_990'],
    ['webinar_url', 'webinar_url']
  ]) {
    if (record[key] && !isHttpsUrl(record[key])) missing.push(`${label}_bad_url`);
  }

  if (record.client_id && !/^[a-zA-Z0-9_]+$/.test(record.client_id)) {
    missing.push('client_id_bad_format');
  }
  if (record.metrika_counter_id && !/^\d{5,20}$/.test(record.metrika_counter_id)) {
    missing.push('metrika_counter_id_bad_format');
  }
  if (record.yandex_oauth_token && record.yandex_oauth_token.length < 20) {
    missing.push('yandex_oauth_token_too_short');
  }
  if (record.status && !['active', 'paused', 'archived'].includes(record.status)) {
    missing.push('status_bad_value');
  }

  return { record, missing, bothelp };
}

function validateFreshClientRecord(freshRecord = {}, expected = {}) {
  const missing = [];
  if (!freshRecord || !freshRecord.client_id) missing.push('client_not_found_after_reload');
  for (const key of [
    'client_id',
    'client_name',
    'landing_url',
    'story_url',
    'offer_url',
    'order_url_990',
    'partner_code',
    'webinar_url',
    'metrika_counter_id'
  ]) {
    if (expected[key] && cleanText(freshRecord[key], 1000) !== cleanText(expected[key], 1000)) {
      missing.push(`${key}_mismatch_after_reload`);
    }
  }
  if (!cleanText(freshRecord.order_url_990, 1000)) missing.push('order_url_990_missing_after_reload');
  if (!cleanText(freshRecord.purchase_url_990, 1000)) missing.push('purchase_url_990_missing');
  if (freshRecord.purchase_url_990 && !isHttpsUrl(freshRecord.purchase_url_990)) missing.push('purchase_url_990_bad_url');
  if (freshRecord.order_url_990 && freshRecord.purchase_url_990 && freshRecord.order_url_990 === freshRecord.purchase_url_990) {
    missing.push('purchase_url_990_equals_order_url_990');
  }
  if (freshRecord.purchase_url_990 && !/Test_Drai/i.test(freshRecord.purchase_url_990)) {
    missing.push('purchase_url_990_not_test_drive');
  }
  return missing;
}

async function fetchPublicClientRecord({ supabaseUrl, supabaseKey, tableName, clientId }) {
  const endpoint = `${supabaseUrl}/rest/v1/${encodeURIComponent(tableName)}?client_id=eq.${encodeURIComponent(clientId)}&select=*`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
      accept: 'application/json'
    }
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      details: typeof data === 'string' ? data.slice(0, 500) : data
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, record: row || null };
}

async function fetchClientRowsByField({ supabaseUrl, supabaseKey, tableName, field, value }) {
  if (!value) return { ok: true, records: [] };
  const endpoint = `${supabaseUrl}/rest/v1/${encodeURIComponent(tableName)}?${encodeURIComponent(field)}=eq.${encodeURIComponent(value)}&select=client_id,partner_code,landing_url`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
      accept: 'application/json'
    }
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      details: typeof data === 'string' ? data.slice(0, 500) : data
    };
  }

  return { ok: true, records: Array.isArray(data) ? data : [] };
}

async function fetchClientConflicts({ supabaseUrl, supabaseKey, tableName, record }) {
  const checks = [
    ['partner_code', record.partner_code],
    ['landing_url', record.landing_url]
  ];
  const conflicts = [];

  for (const [field, value] of checks) {
    const result = await fetchClientRowsByField({ supabaseUrl, supabaseKey, tableName, field, value });
    if (!result.ok) return result;
    for (const row of result.records) {
      if (row?.client_id && row.client_id !== record.client_id) {
        conflicts.push({
          field,
          value,
          client_id: row.client_id
        });
      }
    }
  }

  return { ok: true, conflicts };
}

async function handleSubmitClient(env, request) {
  const supabaseUrl = cleanText(env.SUPABASE_URL, 300).replace(/\/+$/, '');
  const supabaseKey = cleanText(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY, 3000);
  const tableName = cleanText(env.SUPABASE_CLIENTS_TABLE || 'clients', 120);

  if (!supabaseUrl || !supabaseKey) {
    return json({
      ok: false,
      error: 'supabase_not_configured',
      message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set on the Worker.'
    }, 500);
  }

  const input = await request.json().catch(() => null);
  if (!input || typeof input !== 'object') {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  const { record, missing, bothelp } = normalizeClientRecord(input);
  if (missing.length) {
    return json({ ok: false, error: 'validation_failed', missing }, 400);
  }

  const conflicts = await fetchClientConflicts({
    supabaseUrl,
    supabaseKey,
    tableName,
    record
  });

  if (!conflicts.ok) {
    return json({
      ok: false,
      error: 'supabase_conflict_check_failed',
      status: conflicts.status,
      details: conflicts.details
    }, 502);
  }

  if (conflicts.conflicts.length) {
    return json({
      ok: false,
      error: 'client_conflict',
      message: 'partner_code или landing_url уже привязан к другому client_id.',
      conflicts: conflicts.conflicts
    }, 409);
  }

  const endpoint = `${supabaseUrl}/rest/v1/${encodeURIComponent(tableName)}?on_conflict=client_id`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(record)
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    return json({
      ok: false,
      error: 'supabase_upsert_failed',
      status: response.status,
      details: typeof data === 'string' ? data.slice(0, 500) : data
    }, 502);
  }

  const fresh = await fetchPublicClientRecord({
    supabaseUrl,
    supabaseKey,
    tableName,
    clientId: record.client_id
  });

  if (!fresh.ok) {
    return json({
      ok: false,
      error: 'supabase_select_failed',
      status: fresh.status,
      details: fresh.details
    }, 502);
  }

  const freshRecord = publicClientRecord(fresh.record, record);
  const freshMissing = validateFreshClientRecord(freshRecord, record);
  if (freshMissing.length) {
    return json({
      ok: false,
      error: freshMissing.includes('purchase_url_990_missing') ? 'purchase_url_990_missing' : 'fresh_client_validation_failed',
      message: freshMissing.includes('purchase_url_990_missing') ? PURCHASE_URL_MISSING_MESSAGE : 'Свежая строка public.clients не прошла проверку.',
      missing: freshMissing,
      record: freshRecord
    }, 409);
  }

  return json({
    ok: true,
    clientId: record.client_id,
    updated: true,
    record: freshRecord,
    client: freshRecord,
    bothelp,
    warnings: record.status !== 'active' ? ['client_status_is_not_active'] : []
  });
}

function randomToken(bytes = 24) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function accessStorage(env) {
  return env.CONSTRUCTOR_ACCESS || env.ACCESS_REQUESTS || null;
}

function accessRequestKey(requestId) {
  return `access:${requestId}`;
}

function publishedImageKey(imageId) {
  return `published-image:${imageId}`;
}

function atmospaceLandingKey(artifactId) {
  return `atmospace-landing:${artifactId}`;
}

function cleanAtmospaceGenerateInput(input = {}) {
  return {
    landingName: cleanText(input.landingName, 180),
    landingCode: cleanText(input.landingCode, 240),
    counterId: cleanText(input.counterId, 80),
    serverOnlyAdGoalCredential: cleanText(input.serverOnlyAdGoalCredential, 2000)
  };
}

function validateAtmospaceGenerateInput(payload) {
  const errors = [];
  const masked = (value) => /(?:\.\.\.|…|\*{3,})/.test(String(value || ''));
  Object.entries(payload).forEach(([key, value]) => {
    if (!String(value || '').trim()) errors.push({ field: key, code: `${key}_required` });
  });
  if (payload.landingCode) {
    if (masked(payload.landingCode)) errors.push({ field: 'landingCode', code: 'landing_code_masked' });
    else if (/^https?:\/\//i.test(payload.landingCode)) errors.push({ field: 'landingCode', code: 'landing_code_is_url' });
    else if (/(?:^|[?&])(gcpc|gcao)=|partner[_-]?code/i.test(payload.landingCode)) errors.push({ field: 'landingCode', code: 'legacy_partner_code' });
    else if (/\s/.test(payload.landingCode)) errors.push({ field: 'landingCode', code: 'landing_code_has_spaces' });
  }
  if (payload.counterId && !/^\d{5,20}$/.test(payload.counterId)) {
    errors.push({ field: 'counterId', code: 'counter_id_invalid' });
  }
  if (payload.serverOnlyAdGoalCredential && masked(payload.serverOnlyAdGoalCredential)) {
    errors.push({ field: 'serverOnlyAdGoalCredential', code: 'credential_masked' });
  }
  return errors;
}

function maskAtmospaceLogValue(value) {
  const source = cleanText(value, 240);
  if (!source) return '';
  if (source.length <= 8) return `${source.slice(0, 2)}***`;
  return `${source.slice(0, 4)}...${source.slice(-4)}`;
}

function safeAtmospaceGenerateMessage(error, status) {
  const code = String(error || '').toLowerCase();
  if (code === 'landing_name_required') return 'Введите название лендинга.';
  if (code === 'landing_code_required') return 'Вставьте полный код рекламного лендинга из кабинета Atmospace.';
  if (code === 'landing_code_invalid') {
    return 'Сервер Atmospace не нашёл этот код в боевой базе. В кабинете нажмите «Сгенерировать код» ещё раз и скопируйте код полностью.';
  }
  if (code === 'landing_code_masked') return 'Код лендинга скопирован не полностью. Вставьте код без точек и звёздочек.';
  if (code === 'landing_code_is_url') return 'В поле кода нужна не ссылка, а код рекламного лендинга из кабинета Atmospace.';
  if (code === 'legacy_partner_code') return 'Вставлен старый партнёрский параметр. Нужен новый код рекламного лендинга из кабинета Atmospace.';
  if (code === 'landing_code_has_spaces') return 'Код рекламного лендинга не должен содержать пробелы.';
  if (code === 'landing_code_expired') {
    return 'Срок действия кода закончился. Сгенерируйте новый код в кабинете Atmospace.';
  }
  if (code === 'landing_code_disabled') {
    return 'Этот код отключён в Atmospace. Создайте новый код рекламного лендинга.';
  }
  if (code === 'counter_id_required') return 'Укажите номер рекламного счётчика.';
  if (code === 'counter_id_invalid') return 'Номер рекламного счётчика должен состоять только из цифр.';
  if (code === 'ad_goal_credential_required') return 'Вставьте актуальный защищённый ключ отправки целей.';
  if (code === 'credential_masked') return 'Защищённый ключ скопирован не полностью. Скопируйте его из кабинета ещё раз.';
  if (code === 'credential_storage_not_configured') {
    return 'Хранилище защищённых ключей на сервере Atmospace не настроено. Сообщите команде проекта.';
  }
  if (status === 401 || status === 403 || code.includes('credential')) {
    return 'Защищённый ключ не принят сервером. Скопируйте актуальный ключ и повторите генерацию.';
  }
  if (status === 404 || code.includes('not_found')) {
    return 'Atmospace не нашёл данные для этого кода. Создайте новый код в боевом кабинете и скопируйте его полностью.';
  }
  if (status === 429 || code.includes('rate')) {
    return 'Сервер временно ограничил генерацию. Повторите через минуту.';
  }
  if (status >= 500 || code.includes('unavailable')) {
    return 'Не получилось подготовить лендинг. Попробуйте ещё раз позже.';
  }
  return 'Не удалось собрать лендинг. Проверьте четыре поля и повторите генерацию.';
}

function publicAtmospaceGenerateResult(data) {
  return {
    landingName: cleanText(data?.landingName, 180),
    landingCode: cleanText(data?.landingCode, 240),
    counterId: cleanText(data?.counterId, 80),
    publicLandingKey: cleanText(data?.publicLandingKey, 500),
    embedCode: String(data?.embedCode || ''),
    generatedAt: cleanText(data?.generatedAt, 80) || new Date().toISOString(),
    status: cleanText(data?.status || 'generated', 80),
    runtimeStatus: cleanText(data?.runtimeStatus || 'verified', 80)
  };
}

function safeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function extractAtmospaceRuntimeBlocks(source) {
  const blocks = [];
  const pattern = /<script\b[^>]*\bdata-atmospace-runtime=(["'])[^"']+\1[^>]*>[\s\S]*?<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(String(source || ''))) !== null) blocks.push(match[0]);
  return blocks;
}

function hasLegacyAtmospaceEmbed(source) {
  return /data-atmospace-messenger|data-fh-messenger|fh-(?:tg|max)-btn|window\.(?:FH_CONFIG|FUNNEL_CONFIG)|telegramDomain|maxDomain|buildBotLink|goToMessenger|messenger_button_clicked|links\.telegram|links\.max|r\.bothelp\.io|atmospace-policy-consent|registration_click/i.test(String(source || ''));
}

function hasAtmospaceRuntime(source) {
  const blocks = extractAtmospaceRuntimeBlocks(source);
  if (blocks.length !== 1) return false;
  const runtime = blocks[0];
  const requiredMarkers = [
    ATMOSPACE_RUNTIME_VERSION,
    ATMOSPACE_INIT_PATH,
    ATMOSPACE_CLICK_PATH,
    'https://mc.yandex.ru/metrika/tag.js',
    'public_landing_key',
    'counter_id',
    'landing_variant_code',
    'landing_variant_name',
    'browser_language',
    'browser_client_time',
    'advertising_click_ids',
    'gclid',
    'fbclid',
    'msclkid',
    'dclid',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'landing_opened',
    'quiz_start_click',
    'landing_view',
    'question_answered',
    'quiz_completed',
    'registration_started',
    'links.registration',
    'data-atmospace-registration-link',
    'data-atmospace-runtime-retry',
    'atmospace:quiz-start',
    'atmospace:quiz-answer',
    'atmospace:quiz-complete'
  ];
  const quizRewritePattern = /buildQuizUrl|pathname\s*=\s*["']\/quiz|replaceState\([^)]*["']\/quiz/i;
  return requiredMarkers.every((marker) => runtime.includes(marker))
    && runtime.includes('registrationUrl=candidate;')
    && runtime.includes('button.setAttribute("href",registrationUrl)')
    && runtime.includes('window.location.assign(registrationUrl)')
    && !hasLegacyAtmospaceEmbed(runtime)
    && !quizRewritePattern.test(runtime);
}

function buildAtmospaceRuntimeScript({ publicLandingKey, counterId, landingName, landingCode }) {
  const runtimeConfig = {
    publicLandingKey,
    counterId,
    landingName,
    landingCode,
    baseUrl: ATMOSPACE_API_BASE_URL,
    initPath: ATMOSPACE_INIT_PATH,
    clickPath: ATMOSPACE_CLICK_PATH,
    runtimeVersion: ATMOSPACE_RUNTIME_VERSION
  };

  return `<script data-atmospace-runtime="${ATMOSPACE_RUNTIME_VERSION}">
(function(){
  "use strict";
  var cfg=${safeScriptJson(runtimeConfig)};
  var clickEndpoint=cfg.baseUrl+cfg.clickPath;
  var pageInstanceId=makePageInstanceId();
  var registrationUrl="";
  var atmospaceReady=false;
  var quizCompleted=false;
  var registrationNavigationStarted=false;
  var quizStartSent=false;
  var quizCompletedSent=false;
  var landingOpenedSent=false;
  var landingViewSent=false;
  var initInFlight=false;
  var initFailed=false;
  var answeredQuestionNumbers={};
  var runtimeErrorMessage="Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.";
  var previewMessage="Сейчас продолжение недоступно. Откройте опубликованную страницу и повторите попытку.";
  var registrationSelector="[data-atmospace-registration-link],[data-atmospace-cta]";
  var quizSelector="[data-atmospace-quiz-link]";
  var pendingClickEvents=[];
  var AD_PARAM_KEYS=["yd_campaign_id","yd_ad_id","yd_group_id","yd_creative_id","yd_source","yd_source_type","yd_device","yd_region_id"];
  var ALLOWED_CLICK_EVENTS={landing_opened:true,quiz_start_click:true,question_answered:true,quiz_completed:true,registration_started:true};

  function makePageInstanceId(){
    try{
      if(window.crypto&&typeof window.crypto.randomUUID==="function")return window.crypto.randomUUID();
      var bytes=new Uint8Array(10);
      window.crypto.getRandomValues(bytes);
      return "pi_"+Array.from(bytes,function(byte){return byte.toString(16).padStart(2,"0");}).join("");
    }catch(error){
      return "pi_"+Date.now()+"_"+Math.random().toString(36).slice(2,10);
    }
  }

  function isLocalPreview(){
    return window.location.protocol==="file:"||window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1";
  }

  function getCounterId(){
    var value=Number.parseInt(String(cfg.counterId||""),10);
    return Number.isInteger(value)&&value>0?value:0;
  }

  function ensureMetrika(){
    if(isLocalPreview())return Promise.resolve(false);
    var counterId=getCounterId();
    if(!counterId)return Promise.resolve(false);

    window.__atmospaceMetrikaCounters=window.__atmospaceMetrikaCounters||{};
    if(typeof window.ym!=="function"){
      window.ym=function(){(window.ym.a=window.ym.a||[]).push(arguments);};
      window.ym.l=1*new Date();
    }

    if(!window.__atmospaceMetrikaLoaderStarted){
      window.__atmospaceMetrikaLoaderStarted=true;
      var existing=document.querySelector('script[src="https://mc.yandex.ru/metrika/tag.js"]');
      if(!existing){
        var script=document.createElement("script");
        script.async=true;
        script.src="https://mc.yandex.ru/metrika/tag.js";
        script.setAttribute("data-atmospace-metrika-loader","");
        (document.head||document.documentElement).appendChild(script);
      }
    }

    if(!window.__atmospaceMetrikaCounters[counterId]){
      window.__atmospaceMetrikaCounters[counterId]=true;
      window.ym(counterId,"init",{
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true,
        webvisor:true
      });
    }
    return Promise.resolve(true);
  }

  function reachGoal(goalName,params){
    if(isLocalPreview())return;
    var counterId=getCounterId();
    if(!counterId)return;
    ensureMetrika();
    try{
      if(typeof window.ym==="function"){
        window.ym(counterId,"reachGoal",goalName,params||{});
      }
    }catch(error){}
  }

  function sendLandingViewOnce(){
    if(landingViewSent)return;
    landingViewSent=true;
    reachGoal("landing_view");
  }

  function getParam(name){
    try{return new URL(window.location.href).searchParams.get(name)||"";}catch(error){return "";}
  }

  function collectAttribution(){
    var clickIds={};
    ["yclid","gclid","fbclid","msclkid","dclid"].forEach(function(key){
      var value=getParam(key);
      if(value)clickIds[key]=value;
    });
    var adParams={};
    AD_PARAM_KEYS.forEach(function(key){
      var value=getParam(key);
      if(value)adParams[key]=value;
    });
    return{
      utm_source:getParam("utm_source")||null,
      utm_medium:getParam("utm_medium")||null,
      utm_campaign:getParam("utm_campaign")||null,
      utm_content:getParam("utm_content")||null,
      utm_term:getParam("utm_term")||null,
      advertising_click_ids:clickIds,
      advertising_params:adParams
    };
  }

  function basePayload(){
    var attribution=collectAttribution();
    return{
      public_landing_key:cfg.publicLandingKey,
      counter_id:cfg.counterId,
      landing_variant_code:cfg.landingCode||"",
      landing_variant_name:cfg.landingName||"",
      page_instance_id:pageInstanceId,
      page_url:window.location.href,
      source_url:window.location.href,
      page_path:window.location.pathname,
      referrer:document.referrer||null,
      runtime_version:cfg.runtimeVersion,
      browser_language:navigator.language||null,
      browser_client_time:new Date().toISOString(),
      advertising_click_ids:attribution.advertising_click_ids,
      advertising_params:attribution.advertising_params,
      utm_source:attribution.utm_source,
      utm_medium:attribution.utm_medium,
      utm_campaign:attribution.utm_campaign,
      utm_content:attribution.utm_content,
      utm_term:attribution.utm_term
    };
  }

  function postJson(url,payload,keepalive){
    if(!url||typeof fetch!=="function")return Promise.resolve({ok:false,status:0,body:null});
    return fetch(url,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(payload),
      keepalive:Boolean(keepalive)
    }).then(function(response){
      return response.json().catch(function(){return null;}).then(function(body){return{ok:response.ok,status:response.status,body:body};});
    }).catch(function(){return{ok:false,status:0,body:null};});
  }

  function addSafeEventParams(payload,eventType,params){
    if(eventType!=="question_answered"||!params||typeof params!=="object")return payload;
    var questionIndex=Number(params.question_index);
    if(Number.isInteger(questionIndex)&&questionIndex>=1&&questionIndex<=100)payload.question_index=questionIndex;
    var eventRef=String(params.event_ref||"");
    if(/^[a-z0-9._:-]{1,80}$/.test(eventRef))payload.event_ref=eventRef;
    return payload;
  }

  function deliverClickEvent(payload){
    return postJson(clickEndpoint,payload,true).then(function(result){
      if(!result||!result.ok){
        console.error("[Atmospace] Event delivery failed.",{event_type:payload.event_type,status:result&&result.status?result.status:0});
      }
      return result;
    });
  }

  function flushPendingClickEvents(){
    if(!atmospaceReady)return;
    while(pendingClickEvents.length){
      deliverClickEvent(pendingClickEvents.shift());
    }
  }

  function sendEvent(eventType,params){
    if(!ALLOWED_CLICK_EVENTS[eventType])return;
    var payload=addSafeEventParams(basePayload(),eventType,params);
    payload.event_type=eventType;
    payload.client_time=new Date().toISOString();
    if(!atmospaceReady){
      pendingClickEvents.push(payload);
      return;
    }
    deliverClickEvent(payload);
  }

  function sendLandingOpenedOnce(){
    if(landingOpenedSent)return;
    landingOpenedSent=true;
    sendEvent("landing_opened");
  }

  function getRuntimeMessageNode(){
    var existing=document.querySelector("[data-atmospace-runtime-message]");
    if(existing)return existing;
    var firstButton=document.querySelector(registrationSelector)||document.querySelector(quizSelector);
    if(!firstButton)return null;
    var node=document.createElement("p");
    node.setAttribute("data-atmospace-runtime-message","");
    node.hidden=true;
    node.style.cssText="display:none;margin:12px 0 0;color:#991b1b;font-size:14px;line-height:1.45;font-weight:700;text-align:center;";
    firstButton.insertAdjacentElement("afterend",node);
    return node;
  }

  function getRetryButton(){
    var existing=document.querySelector("[data-atmospace-runtime-retry]");
    if(existing)return existing;
    var message=getRuntimeMessageNode();
    if(!message)return null;
    var button=document.createElement("button");
    button.type="button";
    button.setAttribute("data-atmospace-runtime-retry","");
    button.textContent="Повторить";
    button.hidden=true;
    button.style.cssText="display:none;margin:10px auto 0;padding:11px 18px;border:0;border-radius:12px;background:#2563eb;color:#fff;font:inherit;font-weight:800;cursor:pointer;";
    message.insertAdjacentElement("afterend",button);
    return button;
  }

  function setRuntimeMessage(message,canRetry){
    var node=getRuntimeMessageNode();
    if(node){
      node.textContent=message||"";
      node.hidden=!message;
      node.style.display=message?"block":"none";
    }
    var retry=getRetryButton();
    if(retry){
      retry.hidden=!canRetry;
      retry.style.display=canRetry?"block":"none";
      retry.disabled=initInFlight;
    }
  }

  function setRegistrationState(state){
    var canContinue=state==="ready"&&atmospaceReady&&quizCompleted&&registrationUrl;
    document.querySelectorAll(registrationSelector).forEach(function(button){
      button.setAttribute("data-atmospace-state",canContinue?"ready":state);
      if(canContinue){
        button.setAttribute("href",registrationUrl);
        button.removeAttribute("aria-disabled");
      }else{
        button.setAttribute("href","#");
        button.setAttribute("aria-disabled","true");
      }
    });
  }

  function syncRegistrationState(){
    if(atmospaceReady&&quizCompleted&&registrationUrl)setRegistrationState("ready");
    else if(initFailed)setRegistrationState("error");
    else if(atmospaceReady)setRegistrationState("waiting-quiz");
    else setRegistrationState("loading");
  }

  function isTrustedRegistrationUrl(value){
    try{
      var url=new URL(String(value||""));
      return url.protocol==="https:"&&(url.hostname==="atmospace.pro"||url.hostname.endsWith(".atmospace.pro"));
    }catch(error){return false;}
  }

  function applyRegistrationLink(links){
    var candidate=links&&links.registration;
    if(typeof candidate!=="string")return false;
    if(!isTrustedRegistrationUrl(candidate))return false;
    registrationUrl=candidate;
    atmospaceReady=true;
    initFailed=false;
    syncRegistrationState();
    setRuntimeMessage("",false);
    return true;
  }

  function markQuizStarted(){
    if(quizStartSent)return;
    quizStartSent=true;
    sendEvent("quiz_start_click");
    reachGoal("quiz_start_click");
  }

  function markQuestionAnswered(event){
    var questionIndex=Math.floor(Number(event&&event.detail?event.detail.questionIndex:0));
    if(questionIndex<1||questionIndex>100||answeredQuestionNumbers[questionIndex])return;
    answeredQuestionNumbers[questionIndex]=true;
    sendEvent("question_answered",{question_index:questionIndex,event_ref:"question-"+String(questionIndex)});
    reachGoal("question_answered",{question_index:questionIndex});
  }

  function markQuizCompleted(){
    if(quizCompletedSent)return;
    quizCompletedSent=true;
    quizCompleted=true;
    sendEvent("quiz_completed");
    reachGoal("quiz_completed");
    syncRegistrationState();
    if(initFailed)setRuntimeMessage(runtimeErrorMessage,true);
  }

  document.addEventListener("atmospace:quiz-start",markQuizStarted);
  document.addEventListener("atmospace:quiz-answer",markQuestionAnswered);
  document.addEventListener("atmospace:quiz-complete",markQuizCompleted);

  document.addEventListener("click",function(event){
    var retry=event.target&&event.target.closest?event.target.closest("[data-atmospace-runtime-retry]"):null;
    if(retry){
      event.preventDefault();
      initRuntime();
      return;
    }

    var quizLink=event.target&&event.target.closest?event.target.closest(quizSelector):null;
    if(quizLink)markQuizStarted();

    var registrationLink=event.target&&event.target.closest?event.target.closest(registrationSelector):null;
    if(!registrationLink)return;
    event.preventDefault();
    if(!registrationUrl||!atmospaceReady||!quizCompleted||registrationNavigationStarted){
      if(initFailed)setRuntimeMessage(runtimeErrorMessage,true);
      return;
    }

    registrationNavigationStarted=true;
    sendEvent("registration_started");
    reachGoal("registration_started");
    window.location.assign(registrationUrl);
  },true);

  function failInit(canRetry){
    initInFlight=false;
    initFailed=true;
    atmospaceReady=false;
    registrationUrl="";
    syncRegistrationState();
    setRuntimeMessage(runtimeErrorMessage,Boolean(canRetry));
  }

  function initRuntime(){
    if(initInFlight)return;
    initInFlight=true;
    initFailed=false;
    atmospaceReady=false;
    registrationUrl="";
    syncRegistrationState();
    setRuntimeMessage("",false);

    if(isLocalPreview()){
      initInFlight=false;
      initFailed=true;
      syncRegistrationState();
      setRuntimeMessage(previewMessage,false);
      return;
    }

    if(!cfg.publicLandingKey||!getCounterId()){
      failInit(false);
      return;
    }

    postJson(cfg.baseUrl+cfg.initPath,basePayload(),false).then(function(result){
      initInFlight=false;
      var responseBody=result&&result.body?result.body:null;
      var data=responseBody&&responseBody.ok===true&&responseBody.data?responseBody.data:null;
      var links=data&&data.links?data.links:null;
      if(!result||!result.ok||!data||data.status!=="ready"||!applyRegistrationLink(links)){
        failInit(true);
        return;
      }
      sendLandingOpenedOnce();
      flushPendingClickEvents();
    });
  }

  function startRuntime(){
    document.querySelectorAll(quizSelector).forEach(function(link){
      if(!link.getAttribute("href"))link.setAttribute("href","#atmospace-mini-quiz");
      link.setAttribute("data-atmospace-state","ready");
      link.removeAttribute("aria-disabled");
    });
    syncRegistrationState();
    ensureMetrika();
    sendLandingViewOnce();
    initRuntime();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startRuntime);
  else startRuntime();
})();
</script>`;
}

function stripAtmospaceRuntimeScripts(source) {
  return String(source || '').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, (block) => {
    const isAtmospaceRuntime = /data-atmospace-runtime=/i.test(block)
      || (block.includes(ATMOSPACE_INIT_PATH) && block.includes(ATMOSPACE_CLICK_PATH));
    return isAtmospaceRuntime ? '' : block;
  });
}

function ensureAtmospaceRuntimeEmbed(embedCode, publicLandingKey, counterId, landingName, landingCode) {
  const source = String(embedCode || '');
  if (!source) return source;

  const htmlSource = stripAtmospaceRuntimeScripts(source);
  const runtimeScript = buildAtmospaceRuntimeScript({ publicLandingKey, counterId, landingName, landingCode });
  if (hasLegacyAtmospaceEmbed(htmlSource)) {
    return runtimeScript;
  }
  if (/<\/body\s*>/i.test(htmlSource)) {
    return htmlSource.replace(/<\/body\s*>/i, `${runtimeScript}\n</body>`);
  }
  return `${htmlSource}\n${runtimeScript}`;
}

function validateAtmospaceEmbedCode({ embedCode, publicLandingKey, counterId, landingName, landingCode, protectedValue }) {
  const source = String(embedCode || '');
  const errors = [];
  const blocks = extractAtmospaceRuntimeBlocks(source);
  const runtime = blocks[0] || '';
  const requiredMarkers = [
    ATMOSPACE_RUNTIME_VERSION,
    ATMOSPACE_INIT_PATH,
    ATMOSPACE_CLICK_PATH,
    'https://mc.yandex.ru/metrika/tag.js',
    'public_landing_key',
    'counter_id',
    'landing_variant_code',
    'landing_variant_name',
    'browser_language',
    'browser_client_time',
    'advertising_click_ids',
    'advertising_params',
    'source_url',
    'page_path',
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
    'yd_campaign_id',
    'yd_ad_id',
    'yd_group_id',
    'yd_creative_id',
    'yd_source',
    'yd_source_type',
    'yd_device',
    'yd_region_id',
    'pendingClickEvents',
    'flushPendingClickEvents',
    'ALLOWED_CLICK_EVENTS',
    'landing_opened',
    'quiz_start_click',
    'landing_view',
    'question_answered',
    'question_index',
    'event_ref',
    'quiz_completed',
    'registration_started',
    'links.registration',
    'data-atmospace-registration-link',
    'data-atmospace-runtime-retry',
    'atmospace:quiz-start',
    'atmospace:quiz-answer',
    'atmospace:quiz-complete',
    'registrationUrl=candidate;',
    'button.setAttribute("href",registrationUrl)',
    'window.location.assign(registrationUrl)',
    'data.status!=="ready"',
    'Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.'
  ];

  if (!source.trim()) errors.push('embed_code_empty');
  if (blocks.length !== 1) errors.push('runtime_script_count_invalid');
  if (!publicLandingKey || !runtime.includes(safeScriptJson(String(publicLandingKey)).slice(1, -1))) errors.push('public_landing_key_missing');
  if (!counterId || !runtime.includes(safeScriptJson(String(counterId)).slice(1, -1))) errors.push('counter_id_missing');
  if (!landingName || !runtime.includes(safeScriptJson(String(landingName)).slice(1, -1))) errors.push('landing_name_missing');
  if (!landingCode || !runtime.includes(safeScriptJson(String(landingCode)).slice(1, -1))) errors.push('landing_code_missing');
  requiredMarkers.forEach((marker) => {
    if (!runtime.includes(marker)) errors.push(`runtime_marker_missing:${marker}`);
  });

  if ((runtime.match(/var pageInstanceId\s*=\s*makePageInstanceId\(\);/g) || []).length !== 1) {
    errors.push('page_instance_id_contract_invalid');
  }
  if ((runtime.match(/\bpageInstanceId\s*=/g) || []).length !== 1) {
    errors.push('page_instance_id_reassigned');
  }
  if (!/if\(retry\)\{[\s\S]{0,220}?initRuntime\(\);/.test(runtime)) {
    errors.push('init_retry_contract_invalid');
  }
  if (!/function startRuntime\(\)\{[\s\S]{0,700}?initRuntime\(\);/.test(runtime)) {
    errors.push('init_on_page_open_missing');
  }
  if (!runtime.includes('atmospaceReady&&quizCompleted&&registrationUrl')) {
    errors.push('registration_gate_contract_invalid');
  }
  if (runtime.includes('sessionStorage') || runtime.includes('localStorage')) {
    errors.push('browser_storage_forbidden');
  }
  if ((runtime.match(/document\.createElement\("script"\)/g) || []).length !== 1
    || (runtime.match(/data-atmospace-metrika-loader/g) || []).length !== 1
    || !runtime.includes('window.__atmospaceMetrikaLoaderStarted')) {
    errors.push('metrika_loader_contract_invalid');
  }
  if ((runtime.match(/window\.ym\(counterId,"init"/g) || []).length !== 1) {
    errors.push('metrika_init_contract_invalid');
  }

  const clickEvents = Array.from(runtime.matchAll(/sendEvent\("([^"]+)"(?:\s*,|\s*\))/g), (match) => match[1]);
  ['landing_opened', 'quiz_start_click', 'question_answered', 'quiz_completed', 'registration_started'].forEach((eventName) => {
    if (!clickEvents.includes(eventName)) errors.push(`runtime_click_event_missing:${eventName}`);
  });
  if (!runtime.includes('ALLOWED_CLICK_EVENTS')) errors.push('click_event_allowlist_missing');
  if (!runtime.includes('pendingClickEvents') || !runtime.includes('flushPendingClickEvents')) errors.push('click_event_queue_missing');
  if (!runtime.includes('advertising_params')) errors.push('advertising_params_missing');

  const requiredGoals = ['landing_view', 'quiz_start_click', 'question_answered', 'quiz_completed', 'registration_started'];
  requiredGoals.forEach((goalName) => {
    if (!runtime.includes(`reachGoal("${goalName}"`)) errors.push(`metrika_goal_missing:${goalName}`);
  });
  if (!/reachGoal\("question_answered",\{question_index:questionIndex\}\)/.test(runtime)) {
    errors.push('question_answered_params_invalid');
  }
  if (/\bquestionNumber\s*:|\bquestion_id\s*:/.test(runtime)) errors.push('question_answered_legacy_payload_forbidden');
  if (!/sendEvent\("question_answered",\{question_index:questionIndex,event_ref:"question-"\+String\(questionIndex\)\}\)/.test(runtime)) {
    errors.push('question_answered_contract_invalid');
  }

  if (hasLegacyAtmospaceEmbed(source)) errors.push('legacy_runtime_forbidden');
  if (/buildQuizUrl|pathname\s*=\s*["']\/quiz|replaceState\([^)]*["']\/quiz/i.test(source)) {
    errors.push('quiz_url_rewrite_forbidden');
  }
  if (/https:\/\/app\.atmospace\.pro\/auth\?mode=register/i.test(runtime)) {
    errors.push('static_registration_url_forbidden');
  }
  if (/registrationUrl\s*=\s*["']https?:|registrationUrl\s*\+=|new URL\(registrationUrl\)|registrationUrl[^;\n]*searchParams/i.test(runtime)) {
    errors.push('registration_url_mutation_forbidden');
  }
  if (!runtime.includes('var candidate=links&&links.registration;')
    || !runtime.includes('if(typeof candidate!=="string")return false;')
    || runtime.includes('String(links.registration)')) {
    errors.push('registration_link_passthrough_invalid');
  }
  if ((runtime.match(/cfg\.baseUrl\+cfg\.clickPath/g) || []).length !== 1) {
    errors.push('click_endpoint_contract_invalid');
  }
  if (/answer(?:Text|Index|Value)|quiz_answers?|selectedAnswer|score\s*:/i.test(runtime)) {
    errors.push('quiz_answer_payload_forbidden');
  }
  if (/invalid_public_landing_key|landing_disabled|database_not_configured|bot_platform_not_configured|internal_error|HTTP\s*500|stack\s*trace/i.test(source)) {
    errors.push('unsafe_user_error_copy_forbidden');
  }

  if (protectedValue) {
    const rawProtectedValue = String(protectedValue);
    const escapedProtectedValue = safeScriptJson(rawProtectedValue).slice(1, -1);
    if (source.includes(rawProtectedValue) || source.includes(escapedProtectedValue)) errors.push('protected_value_leaked');
  }
  [
    'serverOnlyAdGoalCredential',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'GITHUB_TOKEN',
    'ACCESS_APPROVAL_SECRET',
    'process.env'
  ].forEach((marker) => {
    if (source.includes(marker)) errors.push(`protected_field_name_leaked:${marker}`);
  });

  return Array.from(new Set(errors));
}

async function storeAtmospaceLandingArtifact(env, artifact) {
  const store = accessStorage(env);
  if (!store?.put) return '';
  const artifactId = crypto.randomUUID();
  await store.put(atmospaceLandingKey(artifactId), JSON.stringify(artifact), { expirationTtl: 60 * 60 * 24 * 30 });
  return artifactId;
}

async function handleAtmospaceLandingGenerate(env, request) {
  const requestId = crypto.randomUUID();
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== 'object') {
    console.warn('[atmospace.generate] bad_json', { requestId });
    return json({
      ok: false,
      error: 'bad_json',
      message: 'Некорректный запрос.',
      requestId
    }, 400);
  }

  const payload = cleanAtmospaceGenerateInput(input);
  const validationErrors = validateAtmospaceGenerateInput(payload);
  if (validationErrors.length) {
    const missing = validationErrors
      .filter((item) => item.code.endsWith('_required'))
      .map((item) => item.field);
    console.warn('[atmospace.generate] validation_failed', { requestId, validationErrors });
    return json({
      ok: false,
      error: 'validation_failed',
      message: safeAtmospaceGenerateMessage(validationErrors[0].code, 400),
      missing,
      validationErrors,
      requestId
    }, 400);
  }

  console.info('[atmospace.generate] request', {
    requestId,
    landingCode: maskAtmospaceLogValue(payload.landingCode),
    counterId: payload.counterId,
    landingNameLength: payload.landingName.length,
    hasProtectedCredential: Boolean(payload.serverOnlyAdGoalCredential)
  });

  let upstream;
  try {
    upstream = await fetch(`${ATMOSPACE_API_BASE_URL}${ATMOSPACE_GENERATE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('[atmospace.generate] network_error', { requestId, error: String(error?.message || error) });
    return json({
      ok: false,
      error: 'atmospace_network_error',
      message: 'Не удалось связаться с сервером генерации. Повторите попытку позже.',
      requestId
    }, 502);
  }

  let result = null;
  const contentType = upstream.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    result = await upstream.json().catch(() => null);
  }

  const upstreamData = result?.data || {};
  if (!upstream.ok || !result?.ok || !upstreamData.publicLandingKey || !upstreamData.embedCode) {
    const upstreamError = result?.error || upstreamData.error || 'atmospace_generate_failed';
    console.warn('[atmospace.generate] upstream_rejected', {
      requestId,
      upstreamStatus: upstream.status,
      upstreamError,
      landingCode: maskAtmospaceLogValue(payload.landingCode)
    });
    return json({
      ok: false,
      error: upstreamError,
      message: safeAtmospaceGenerateMessage(upstreamError, upstream.status),
      status: upstream.status,
      requestId
    }, upstream.ok ? 502 : Math.min(Math.max(upstream.status, 400), 599));
  }

  const runtimeEmbedCode = ensureAtmospaceRuntimeEmbed(
    upstreamData.embedCode,
    cleanText(upstreamData.publicLandingKey, 500),
    payload.counterId,
    upstreamData.landingName || payload.landingName,
    payload.landingCode
  );
  const runtimeErrors = validateAtmospaceEmbedCode({
    embedCode: runtimeEmbedCode,
    publicLandingKey: cleanText(upstreamData.publicLandingKey, 500),
    counterId: payload.counterId,
    landingName: upstreamData.landingName || payload.landingName,
    landingCode: payload.landingCode,
    protectedValue: payload.serverOnlyAdGoalCredential
  });
  if (runtimeErrors.length) {
    console.error('[atmospace.generate] runtime_contract_failed', { requestId, runtimeErrors });
    return json({
      ok: false,
      error: 'atmospace_runtime_contract_failed',
      message: 'Не удалось подготовить лендинг. Попробуйте ещё раз.',
      requestId
    }, 502);
  }

  const artifact = publicAtmospaceGenerateResult({
    ...upstreamData,
    embedCode: runtimeEmbedCode,
    landingName: upstreamData.landingName || payload.landingName,
    landingCode: payload.landingCode,
    counterId: payload.counterId,
    runtimeStatus: hasAtmospaceRuntime(upstreamData.embedCode) ? 'upstream_runtime_verified' : 'constructor_runtime_added'
  });
  const artifactId = await storeAtmospaceLandingArtifact(env, artifact).catch(() => '');

  console.info('[atmospace.generate] success', {
    requestId,
    artifactId,
    publicLandingKey: maskAtmospaceLogValue(artifact.publicLandingKey),
    runtimeStatus: artifact.runtimeStatus
  });

  return json({
    ok: true,
    requestId,
    data: {
      ...artifact,
      artifactId
    }
  });
}

function accessClientId(fullName, requestId) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
    ь: '', э: 'e', ю: 'yu', я: 'ya'
  };
  const source = cleanText(fullName, 120).toLowerCase();
  const latin = Array.from(source).map((char) => map[char] ?? char).join('');
  const asciiSlug = latin
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 48);
  const readableSlug = source
    .replace(/[^a-z0-9а-яё]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 48);
  const slug = asciiSlug || readableSlug || 'client';
  return `client_${requestId.replace(/-/g, '').slice(0, 4)}_${slug}`;
}

function accountFromAccessRequest(record) {
  return {
    login: `access:${record.client_id}`,
    role: 'client',
    label: record.full_name,
    clientId: record.client_id,
    metrikaId: '',
    metrikaToken: '',
    getcourseLink: '',
    partnerCode: '',
    contactChannel: record.contact_channel,
    contactValue: record.contact_value,
    limits: { banners: 12, prelandings: 4 }
  };
}

function approvalPublicBase(request, env) {
  return cleanText(env.APP_PUBLIC_URL || new URL(request.url).origin, 300).replace(/\/+$/, '');
}

async function putAccessRequest(env, record) {
  const store = accessStorage(env);
  if (!store?.put) throw new Error('access_storage_not_configured');
  await store.put(accessRequestKey(record.request_id), JSON.stringify(record), { expirationTtl: 60 * 60 * 24 });
}

async function getAccessRequest(env, requestId) {
  const store = accessStorage(env);
  if (!store?.get) throw new Error('access_storage_not_configured');
  const raw = await store.get(accessRequestKey(requestId));
  if (!raw) return null;
  return JSON.parse(raw);
}

async function sendAccessApprovalNotification(env, request, record) {
  const adminToken = cleanText(env.ACCESS_APPROVAL_SECRET, 500);
  if (!adminToken) return { sent: false, reason: 'approval_secret_not_configured' };

  const base = approvalPublicBase(request, env);
  const approveUrl = `${base}/api/approve-access?request_id=${encodeURIComponent(record.request_id)}&decision=approve&admin_token=${encodeURIComponent(adminToken)}`;
  const rejectUrl = `${base}/api/approve-access?request_id=${encodeURIComponent(record.request_id)}&decision=reject&admin_token=${encodeURIComponent(adminToken)}`;
  const text = [
    'Новая заявка в конструктор',
    '',
    `Имя: ${record.full_name}`,
    `Контакт: ${record.contact_channel} ${record.contact_value}`,
    `client_id: ${record.client_id}`,
    '',
    `Одобрить: ${approveUrl}`,
    `Отклонить: ${rejectUrl}`
  ].join('\n');
  const telegramText = [
    'Новая заявка в конструктор',
    '',
    `Имя: ${record.full_name}`,
    `Контакт: ${record.contact_channel} ${record.contact_value}`,
    `client_id: ${record.client_id}`
  ].join('\n');

  const botToken = cleanText(env.ACCESS_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN, 1000);
  const chatIds = cleanText(env.ACCESS_TELEGRAM_CHAT_IDS || env.TELEGRAM_APPROVER_CHAT_IDS, 1000)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const deliveries = [];

  if (botToken && chatIds.length) {
    const results = await Promise.allSettled(chatIds.map((chatId) => fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramText,
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Принять', url: approveUrl },
            { text: 'Отклонить', url: rejectUrl }
          ]]
        }
      })
    })));
    deliveries.push({
      sent: results.some((result) => result.status === 'fulfilled' && result.value.ok),
      channel: 'telegram',
      total: chatIds.length
    });
  }

  const maxToken = cleanText(env.ACCESS_MAX_BOT_TOKEN || env.MAX_BOT_TOKEN, 1500);
  const maxUserIds = cleanText(env.ACCESS_MAX_USER_IDS || env.MAX_APPROVER_USER_IDS, 1000)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (maxToken && maxUserIds.length) {
    const buttons = [[
      { type: 'link', text: 'Принять', url: approveUrl },
      { type: 'link', text: 'Отклонить', url: rejectUrl }
    ]];
    const results = await Promise.allSettled(maxUserIds.map((userId) => fetch(`https://platform-api.max.ru/messages?user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        authorization: maxToken,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        text: telegramText,
        attachments: [{
          type: 'inline_keyboard',
          payload: { buttons }
        }]
      })
    })));
    deliveries.push({
      sent: results.some((result) => result.status === 'fulfilled' && result.value.ok),
      channel: 'max',
      total: maxUserIds.length
    });
  }

  if (deliveries.length) {
    return {
      sent: deliveries.some((delivery) => delivery.sent),
      channels: deliveries.map((delivery) => delivery.channel),
      total: deliveries.reduce((sum, delivery) => sum + delivery.total, 0),
      deliveries
    };
  }

  const webhookUrl = cleanText(env.ACCESS_APPROVAL_WEBHOOK_URL || env.APPROVAL_WEBHOOK_URL, 1000);
  if (!webhookUrl) return { sent: false, reason: 'telegram_max_or_webhook_not_configured' };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event: 'constructor_access_request',
      text,
      recipients: cleanText(env.ACCESS_APPROVAL_RECIPIENTS || '', 500),
      request_id: record.request_id,
      full_name: record.full_name,
      contact_channel: record.contact_channel,
      contact_value: record.contact_value,
      client_id: record.client_id,
      approve_url: approveUrl,
      reject_url: rejectUrl,
      created_at: record.created_at
    })
  });

  return { sent: response.ok, status: response.status };
}

async function handleRequestAccess(env, request) {
  return json({
    ok: false,
    error: 'constructor_owner_only',
    message: 'Клиентские заявки отключены. Вход доступен только администратору.'
  }, 403);

  const input = await request.json().catch(() => null);
  if (!input || typeof input !== 'object') return json({ ok: false, error: 'bad_json' }, 400);

  const fullName = cleanText(input.full_name || input.fullName, 160);
  const contactChannel = cleanText(input.contact_channel || input.contactChannel || 'telegram', 40).toLowerCase();
  const contactValue = cleanText(input.contact_value || input.contactValue, 180);

  if (fullName.split(/\s+/).filter(Boolean).length < 2) return json({ ok: false, error: 'full_name_required', message: 'Укажите имя и фамилию.' }, 400);
  if (!['telegram', 'max'].includes(contactChannel)) return json({ ok: false, error: 'bad_contact_channel', message: 'Выберите Telegram или MAX.' }, 400);
  if (contactValue.length < 3) return json({ ok: false, error: 'contact_required', message: 'Укажите username или ссылку на контакт.' }, 400);

  const requestId = crypto.randomUUID();
  const record = {
    request_id: requestId,
    request_token: randomToken(18),
    status: 'pending',
    client_id: accessClientId(fullName, requestId),
    full_name: fullName,
    contact_channel: contactChannel,
    contact_value: contactValue,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    await putAccessRequest(env, record);
  } catch (error) {
    return json({
      ok: false,
      error: 'access_storage_not_configured',
      message: 'Временное хранилище доступа не настроено на Worker.'
    }, 500);
  }

  let notification = { sent: false };
  try {
    notification = await sendAccessApprovalNotification(env, request, record);
  } catch (error) {
    notification = { sent: false, reason: String(error?.message || error).slice(0, 200) };
  }

  return json({
    ok: true,
    status: 'pending',
    requestId: record.request_id,
    requestToken: record.request_token,
    clientId: record.client_id,
    notification
  });
}

async function handleAccessStatus(env, request) {
  const url = new URL(request.url);
  const requestId = cleanText(url.searchParams.get('request_id'), 120);
  const token = cleanText(url.searchParams.get('token'), 180);
  if (!requestId || !token) return json({ ok: false, error: 'missing_request' }, 400);

  let record = null;
  try {
    record = await getAccessRequest(env, requestId);
  } catch (error) {
    return json({ ok: false, error: 'access_storage_not_configured', message: 'Временное хранилище доступа не настроено.' }, 500);
  }
  if (!record || record.request_token !== token) return json({ ok: false, error: 'not_found' }, 404);
  if (record.status === 'approved') return json({ ok: true, status: 'approved', account: accountFromAccessRequest(record) });
  if (record.status === 'rejected') return json({ ok: true, status: 'rejected', message: 'Заявка отклонена.' });
  return json({ ok: true, status: 'pending', clientId: record.client_id });
}

async function handleApproveAccess(env, request) {
  const url = new URL(request.url);
  const requestId = cleanText(url.searchParams.get('request_id'), 120);
  const decision = cleanText(url.searchParams.get('decision') || 'approve', 30).toLowerCase();
  const adminToken = cleanText(url.searchParams.get('admin_token'), 500);
  const expectedToken = cleanText(env.ACCESS_APPROVAL_SECRET, 500);

  if (!expectedToken || adminToken !== expectedToken) {
    return html('<h1>Доступ запрещён</h1><p>Неверный токен подтверждения.</p>', 403);
  }

  let record = null;
  try {
    record = await getAccessRequest(env, requestId);
  } catch (error) {
    return html('<h1>Хранилище доступа не настроено</h1>', 500);
  }
  if (!record) return html('<h1>Заявка не найдена</h1><p>Возможно, она устарела.</p>', 404);

  const approved = decision !== 'reject' && decision !== 'rejected';
  const next = {
    ...record,
    status: approved ? 'approved' : 'rejected',
    updated_at: new Date().toISOString(),
    approved_at: approved ? new Date().toISOString() : '',
    rejected_at: approved ? '' : new Date().toISOString()
  };
  await putAccessRequest(env, next);

  return html(`<!doctype html><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;background:#07111f;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}.box{max-width:560px;padding:28px;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:rgba(255,255,255,.06)}b{color:#86efac}</style><div class="box"><h1>${approved ? 'Вход одобрен' : 'Заявка отклонена'}</h1><p><b>${next.full_name}</b></p><p>client_id: ${next.client_id}</p><p>Можно закрыть эту страницу. У человека конструктор откроется автоматически при следующей проверке статуса.</p></div>`);
}

async function handleImageProxy(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url') || '';
  if (!/^https?:\/\//i.test(target)) {
    return json({ error: 'bad_image_url' }, 400);
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(target);
  } catch {
    return json({ error: 'bad_image_url' }, 400);
  }

  async function fetchTarget(targetUrl, method = 'GET') {
    return fetch(targetUrl, {
      method,
      headers: {
        'user-agent': 'Mozilla/5.0 image-proxy'
      },
      cf: {
        cacheTtl: 0
      }
    });
  }

  function tmpfilesFallbackPath(targetUrl) {
    const lower = String(targetUrl || '').toLowerCase();
    if (!/tmpfiles\.org/i.test(lower)) return '';

    if (lower.includes('wawcajzwnq9s') || lower.includes('1778799372085')) {
      return '/approved-banners/06-not-paycheck.jpg';
    }
    if (lower.includes('1778883109330') || lower.includes('study') || lower.includes('course')) {
      return '/approved-banners/01-study-life.jpg';
    }
    if (lower.includes('29000') || lower.includes('deal') || lower.includes('commission')) {
      return '/approved-banners/07-deal-29000.jpg';
    }
    return '/approved-banners/06-not-paycheck.jpg';
  }

  async function fallbackImageResponse(reason) {
    const configuredFallback = url.searchParams.get('fallback') || '';
    let fallbackUrl = '';

    if (/^https?:\/\//i.test(configuredFallback)) {
      try {
        const parsedFallback = new URL(configuredFallback);
        if (parsedFallback.hostname === url.hostname && !/\/api\//i.test(parsedFallback.pathname)) {
          fallbackUrl = parsedFallback.toString();
        }
      } catch {
        fallbackUrl = '';
      }
    } else if (configuredFallback.startsWith('/approved-banners/')) {
      fallbackUrl = new URL(configuredFallback, url.origin).toString();
    }

    if (!fallbackUrl) {
      const fallbackPath = tmpfilesFallbackPath(parsedTarget.toString());
      if (!fallbackPath) return null;
      fallbackUrl = new URL(fallbackPath, url.origin).toString();
    }

    const fallbackResponse = await fetch(fallbackUrl, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      cf: { cacheTtl: 3600 }
    });
    if (!fallbackResponse.ok) return null;
    const fallbackType = fallbackResponse.headers.get('content-type') || 'image/jpeg';
    if (!fallbackType.startsWith('image/')) return null;

    return new Response(request.method === 'HEAD' ? null : fallbackResponse.body, {
      status: 200,
      headers: {
        'content-type': fallbackType,
        'cache-control': 'public, max-age=3600',
        'access-control-allow-origin': '*',
        'x-image-proxy-fallback': reason,
        'x-fallback-image-url': fallbackUrl
      }
    });
  }

  function decodeHtml(value) {
    return String(value || '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;|&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  function resolveImageUrl(candidate, baseUrl) {
    const decoded = decodeHtml(candidate).trim();
    if (!decoded || decoded.startsWith('data:')) return '';
    try {
      return new URL(decoded, baseUrl).toString();
    } catch {
      return '';
    }
  }

  function firstSrcsetUrl(value) {
    return String(value || '').split(',')[0]?.trim().split(/\s+/)[0] || '';
  }

  function extractImageFromHtml(html, baseUrl) {
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
      /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
      /<link[^>]+rel=["'][^"']*image_src[^"']*["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*image_src[^"']*["']/i,
      /<img[^>]+src=["']([^"']+)["']/i,
      /<img[^>]+srcset=["']([^"']+)["']/i
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (!match?.[1]) continue;
      const raw = pattern.source.includes('srcset') ? firstSrcsetUrl(match[1]) : match[1];
      const resolved = resolveImageUrl(raw, baseUrl);
      if (resolved) return resolved;
    }
    return '';
  }

  let response = await fetchTarget(parsedTarget.toString(), request.method === 'HEAD' ? 'HEAD' : 'GET');

  if (!response.ok) {
    const fallback = await fallbackImageResponse(`target_${response.status}`);
    if (fallback) return fallback;
    return json({ error: 'image_fetch_failed', status: response.status }, 502);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  if (!contentType.startsWith('image/')) {
    const htmlResponse = request.method === 'HEAD'
      ? await fetchTarget(parsedTarget.toString(), 'GET')
      : response;
    const htmlType = htmlResponse.headers.get('content-type') || '';

    if (!htmlResponse.ok || !/text\/html|application\/xhtml\+xml/i.test(htmlType)) {
      const fallback = await fallbackImageResponse(`not_image_${htmlResponse.status || response.status}`);
      if (fallback) return fallback;
      return json({ error: 'not_an_image', contentType }, 415);
    }

    const html = await htmlResponse.text();
    const extracted = extractImageFromHtml(html, parsedTarget.toString());
    if (!/^https?:\/\//i.test(extracted)) {
      const fallback = await fallbackImageResponse('image_not_found_in_html');
      if (fallback) return fallback;
      return json({ error: 'image_not_found_in_html', contentType }, 415);
    }

    response = await fetchTarget(extracted, request.method === 'HEAD' ? 'HEAD' : 'GET');
    if (!response.ok) {
      const fallback = await fallbackImageResponse(`extracted_${response.status}`);
      if (fallback) return fallback;
      return json({ error: 'extracted_image_fetch_failed', status: response.status }, 502);
    }

    const extractedType = response.headers.get('content-type') || 'image/png';
    if (!extractedType.startsWith('image/')) {
      const fallback = await fallbackImageResponse('extracted_not_image');
      if (fallback) return fallback;
      return json({ error: 'extracted_url_not_an_image', contentType: extractedType }, 415);
    }

    return new Response(request.method === 'HEAD' ? null : response.body, {
      status: 200,
      headers: {
        'content-type': extractedType,
        'cache-control': 'public, max-age=86400',
        'access-control-allow-origin': '*',
        'x-resolved-image-url': extracted
      }
    });
  }

  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: 200,
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=86400',
      'access-control-allow-origin': '*'
    }
  });
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

function textFromResponses(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) parts.push(content.text);
      if (content.type === 'text' && content.text) parts.push(content.text);
    }
  }
  return parts.join('\n');
}

function imageFromResponses(data) {
  for (const item of data.output || []) {
    if (item.type === 'image_generation_call' && item.result) return item.result;
  }
  return null;
}

function dataUrlToInputImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) return null;
  return {
    mime: match[1].replace('image/jpg', 'image/jpeg'),
    data: match[2]
  };
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function uploadImageToTmpFiles({ bytes, mime = 'image/png', filename = 'banner.png' }) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime }), filename);

  const response = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: form
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`tmpfiles_upload_failed: ${text.slice(0, 220)}`);
    error.status = response.status;
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('tmpfiles_bad_json');
  }

  const pageUrl = String(payload?.data?.url || '').trim();
  if (!pageUrl) throw new Error('tmpfiles_missing_url');
  return pageUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
}

async function publishImageToKv(env, { bytes, mime }) {
  const store = accessStorage(env);
  if (!store?.put) return null;
  const imageId = `${Date.now().toString(36)}-${randomToken(8)}`;
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  await store.put(publishedImageKey(imageId), buffer, {
    metadata: {
      mime,
      created_at: new Date().toISOString()
    }
  });
  return imageId;
}

async function handlePublishedImage(env, request) {
  const store = accessStorage(env);
  if (!store?.get) return json({ ok: false, error: 'image_storage_not_configured' }, 500);
  const url = new URL(request.url);
  const imageId = cleanText(url.searchParams.get('id'), 120);
  if (!imageId) return json({ ok: false, error: 'missing_image_id' }, 400);

  const result = store.getWithMetadata
    ? await store.getWithMetadata(publishedImageKey(imageId), { type: 'arrayBuffer' })
    : { value: await store.get(publishedImageKey(imageId), { type: 'arrayBuffer' }), metadata: null };
  if (!result?.value) return json({ ok: false, error: 'published_image_not_found' }, 404);

  const mime = result.metadata?.mime || 'image/png';
  return new Response(request.method === 'HEAD' ? null : result.value, {
    status: 200,
    headers: {
      'content-type': mime,
      'cache-control': 'public, max-age=2592000',
      'access-control-allow-origin': '*'
    }
  });
}

async function handlePublishImage(env, request) {
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== 'object') return json({ ok: false, error: 'bad_json' }, 400);
  const imageData = dataUrlToInputImage(input.imageDataUrl);
  if (!imageData) return json({ ok: false, error: 'image_data_url_required' }, 400);

  const bytes = base64ToUint8Array(imageData.data);
  const extension = imageData.mime.includes('jpeg') ? 'jpg' : imageData.mime.split('/')[1] || 'png';
  const origin = new URL(request.url).origin;
  const kvImageId = await publishImageToKv(env, {
    bytes,
    mime: imageData.mime
  });
  if (kvImageId) {
    const imageUrl = `${origin}/api/published-image?id=${encodeURIComponent(kvImageId)}`;
    return json({
      ok: true,
      imageUrl,
      originalUrl: imageUrl,
      storage: 'kv'
    });
  }

  const uploadedUrl = await uploadImageToTmpFiles({
    bytes,
    mime: imageData.mime,
    filename: `banner-${Date.now()}.${extension}`
  });
  const proxyUrl = `${origin}/api/image-proxy?url=${encodeURIComponent(uploadedUrl)}`;
  return json({
    ok: true,
    imageUrl: proxyUrl,
    originalUrl: uploadedUrl
  });
}

function publicWorkerError(error) {
  const message = String(error?.message || error || 'worker_exception');
  if (/tmpfiles_upload_failed/i.test(message)) return 'Не удалось временно опубликовать картинку для Tilda. Попробуйте ещё раз через 20-30 секунд.';
  if (/tmpfiles_bad_json|tmpfiles_missing_url/i.test(message)) return 'Сервис публикации картинки вернул неожиданный ответ. Попробуйте ещё раз.';
  if (/fetch failed|network|timeout/i.test(message)) return 'Сеть не отдала картинку для публикации. Попробуйте ещё раз.';
  return 'Worker поймал ошибку, но конструктор жив. Повторите действие ещё раз.';
}

function normalizeIdeas(input, raw) {
  const ideas = Array.isArray(raw?.ideas) ? raw.ideas : [];
  const safeIdeas = ideas.slice(0, 10).map((item, index) => ({
    angle: String(item.angle || `вариант ${index + 1}`).slice(0, 80),
    headline: String(item.headline || input.headline || '').slice(0, 100),
    decoration: String(item.decoration || 'Посмотрите, как это устроено внутри.').slice(0, 90),
    adTitle: String(item.adTitle || item.headline || input.headline || '').slice(0, 56),
    adText: String(item.adText || 'Смотрите разбор метода без лишней теории.').slice(0, 81),
    visualPrompt: String(item.visualPrompt || '').slice(0, 900)
  }));
  return {
    source: raw?.source || 'ai',
    selectedIndex: 0,
    ideas: safeIdeas.length ? safeIdeas : fallbackIdeas
  };
}

async function callOpenAI(env, payload) {
  const apiKey = String(env.OPENAI_API_KEY || '').replace(/^\uFEFF/, '').trim();
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not set');
    error.code = 'NO_KEY';
    throw error;
  }
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(text);
    error.status = response.status;
    throw error;
  }
  return JSON.parse(text);
}

function normalizeImageSize(size, fallback = '1024x1024') {
  const value = String(size || '').trim();
  return ['1024x1024', '1536x1024', '1024x1536', 'auto'].includes(value) ? value : fallback;
}

function normalizeImageQuality(quality, fallback = 'medium') {
  const value = String(quality || '').trim();
  return ['low', 'medium', 'high', 'auto'].includes(value) ? value : fallback;
}

async function callOpenAIImageEndpoint(env, { prompt, heroImage, quality = 'medium', size = '1024x1024', model = IMAGE_MODEL }) {
  const apiKey = String(env.OPENAI_API_KEY || '').replace(/^\uFEFF/, '').trim();
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not set');
    error.code = 'NO_KEY';
    throw error;
  }

  const isEdit = Boolean(heroImage);
  const response = await fetch(`https://api.openai.com/v1/images/${isEdit ? 'edits' : 'generations'}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      size: normalizeImageSize(size),
      quality: normalizeImageQuality(quality),
      output_format: 'png',
      ...(isEdit
        ? { images: [{ image_url: `data:${heroImage.mime};base64,${heroImage.data}` }] }
        : {})
    })
  });

  const text = await response.text();
  if (!response.ok) {
    const error = new Error(text);
    error.status = response.status;
    throw error;
  }

  const data = JSON.parse(text);
  const image = data?.data?.[0]?.b64_json;
  if (!image) throw new Error('No image returned');
  return image;
}

async function callOpenAIImageViaResponses(env, { prompt, heroImage, quality = 'medium', size = '1024x1024', model = IMAGE_MODEL }) {
  const inputContent = [{ type: 'input_text', text: prompt }];
  if (heroImage) {
    inputContent.push({
      type: 'input_image',
      image_url: `data:${heroImage.mime};base64,${heroImage.data}`
    });
  }

  const data = await callOpenAI(env, {
    model: IMAGE_TOOL_TEXT_MODEL,
    input: [{ role: 'user', content: inputContent }],
    tools: [{ type: 'image_generation', model, size: normalizeImageSize(size), quality: normalizeImageQuality(quality) }]
  });
  const image = imageFromResponses(data);
  if (!image) throw new Error('No image returned');
  return image;
}

async function callOpenAIImage(env, input) {
  return callOpenAIImageViaResponses(env, input);
}

function shouldRetryImageError(error) {
  const message = String(error?.message || '');
  return error?.status === 429 || error?.status === 500 || error?.status === 502 || error?.status === 503 || /1015|rate|temporar|no image/i.test(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOpenAIImageWithFallback(env, { prompt, heroImage, quality = 'medium', size = '1024x1024' }) {
  return {
    image: await callOpenAIImageWithRetry(env, { prompt, heroImage, quality, size, model: IMAGE_MODEL }),
    model: IMAGE_MODEL
  };
}

async function callOpenAIImageWithRetry(env, input) {
  const delays = [0, 8500, 14000];
  let lastError = null;
  for (let index = 0; index < delays.length; index += 1) {
    if (delays[index] > 0) {
      await wait(delays[index]);
    }
    try {
      return await callOpenAIImage(env, input);
    } catch (error) {
      lastError = error;
      if (!shouldRetryImageError(error) || index === delays.length - 1) throw error;
    }
  }
  throw lastError || new Error('Image generation failed');
}

async function handleIdeate(env, request) {
  const input = await request.json();
  const headline = String(input.headline || '').trim();
  if (!headline) return json({ error: 'headline_required' }, 400);

  const personaLine =
    input.persona === 'man'
      ? 'Визуально и по тону можно смещаться к мужчине 40-60.'
      : input.persona === 'mixed'
        ? 'Аудитория смешанная: чередуй мужской, женский, парный и предметный визуал. Не уходи по умолчанию в один типаж.'
        : 'Основной упор на женщину 40-60, не глянец, а живая реальная сцена.';

  const intensityLine =
    input.intensity === 'money'
      ? 'Сильнее бей в деньги и разницу между вечным обучением и реальным движением к доходу, но без гарантий и обещаний конкретной суммы.'
      : input.intensity === 'balanced'
        ? 'Сохрани удар в боль, но не уходи в грубость. Формулировки должны быть плотные и цепляющие.'
        : 'Нужен самый пробивной вариант: хлестко, энергично, с завершенной мыслью.';

  const angleLine = input.angleLabel
    ? `Выбранный смысл креатива: ${String(input.angleLabel).slice(0, 80)}. Генерируй вокруг него, не распыляйся на соседние темы.`
    : 'Смысл креатива не выбран. Найди один главный конфликт и держи всю связку вокруг него.';

  const prompt = `
${audienceContext}
${personaLine}
${intensityLine}
${angleLine}

Пользователь ввел заголовок или исходную мысль:
"${headline}"

Задача:
1. Предложи 10 сильных вариантов на базе введенной мысли и выбранного смысла.
2. Каждый headline должен быть завершенной мыслью, а не обрывком. Он должен бить в боль и сразу давать ощущение: "там есть решение".
3. Не делай полезняшку, мотивацию или мягкий экспертный пост. Нужна рекламная связка с ясным конфликтом.
4. Избегай воды вроде "создайте спокойный доход", "финансовая опора", "измените жизнь легко", "начните новый этап".
5. Пиши простым русским языком. Допустимы резкие формулировки, но без мата и без прямых гарантий дохода.
6. Не выдумывай "комиссионные", 5000, 65000, 200000 или 300000, если пользователь сам не ввёл этот смысл. Если ввёл - можно развивать как правдивый практический крючок без гарантий.
7. Каждый вариант должен легко продолжаться первым экраном предлендинга: те же ключевые слова, та же боль, тот же поворот.
8. Для каждого варианта дай:
- angle: короткое название варианта
- headline: крупный текст на баннере
- decoration: короткое продолжение мысли под заголовком, до 90 символов
- adTitle: заголовок Директа до 56 символов
- adText: текст Директа до 81 символа
- visualPrompt: промпт для фоновой картинки без текста

Ответь только JSON:
{"source":"ai","ideas":[{"angle":"","headline":"","decoration":"","adTitle":"","adText":"","visualPrompt":""}]}
`;

  try {
    const data = await callOpenAI(env, {
      model: TEXT_MODEL,
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'banner_ideas',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['source', 'ideas'],
            properties: {
              source: { type: 'string' },
              ideas: {
                type: 'array',
                minItems: 1,
                maxItems: 10,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['angle', 'headline', 'decoration', 'adTitle', 'adText', 'visualPrompt'],
                  properties: {
                    angle: { type: 'string' },
                    headline: { type: 'string' },
                    decoration: { type: 'string' },
                    adTitle: { type: 'string' },
                    adText: { type: 'string' },
                    visualPrompt: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    });
    const parsed = safeJsonParse(textFromResponses(data));
    return json(normalizeIdeas(input, parsed));
  } catch (error) {
    const base = normalizeIdeas(input, { source: error.code === 'NO_KEY' ? 'local_no_api_key' : 'local_fallback', ideas: fallbackIdeas });
    return json({
      ...base,
      warning: error.code === 'NO_KEY'
        ? 'OPENAI_API_KEY не задан. Включен локальный демо-режим.'
        : 'AI временно недоступен, включен локальный fallback.'
    });
  }
}

async function handleGenerateImage(env, request) {
  const input = await request.json();
  const visualPrompt = String(input.visualPrompt || '').trim();
  const headline = String(input.headline || '').trim();
  const methodName = String(input.methodName || '').trim();
  const stylePreset = String(input.stylePreset || 'editorialGold');
  const heroImage = dataUrlToInputImage(input.heroImage);
  const visualMode = String(input.visualMode || 'reference');
  const requestedSize = normalizeImageSize(input.imageSize || input.size, input.imagePurpose === 'prelandingHero' ? '1536x1024' : '1024x1024');
  const requestedQuality = normalizeImageQuality(input.imageQuality || input.quality, input.imagePurpose === 'prelandingHero' ? 'high' : 'medium');
  const noPersonVisual = visualMode === 'noPerson';
  const metaphorVisual = visualMode === 'metaphor';
  if (!visualPrompt) return json({ error: 'visual_prompt_required' }, 400);

  const personaLine =
    noPersonVisual
      ? 'Do not use a human hero. Build the banner around an object, scene, symbolic system, or visual metaphor.'
      : metaphorVisual
        ? 'You may use a human, animal, object, surreal or cosmic metaphor only if it helps the headline. Do not add a random stock person.'
        : input.persona === 'man'
      ? 'Use an ordinary confident man 35-55 as the hero unless the visual prompt explicitly asks for another age. Rotate type, clothes, setting, light and camera angle.'
      : input.persona === 'mixed'
        ? 'Use a balanced audience rotation: man, woman, couple, or no-face scene depending on the visual prompt. Do not default to a woman.'
        : 'Prefer an ordinary real-looking woman 35-55 as the hero unless the visual prompt explicitly asks for another age. Do not default to an elderly woman in a dark workshop.';

  const prompt = input.fullBanner ? `
Create a finished premium 1:1 Russian advertising banner, like a high-quality ChatGPT image generation result, not a web template mockup.
Context:
${audienceContext}
${personaLine}

Visual direction:
${visualPrompt}

${heroImage ? "Use the uploaded image as the person's reference. Preserve general age range, face type, hair, and authentic feel, but make the person look polished, sharp, confident, realistic, and suitable for an ad banner." : ''}

Exact main headline to place on the banner in Russian:
"${headline}"

Small supporting line / decoration:
"${methodName || 'Преврати хаос в систему — получи результат'}"

Design direction:
- varied premium ad style according to the prompt: black/yellow, black/red, green, white/gold, blue, newspaper, fintech, glass, metaphorical, documentary, or another fitting style;
- prefer a brighter, cleaner, optimistic performance-ad look unless the user explicitly asks for a dark style: blue sky/city light/white-gold/green trust beats gloomy noir;
- do not default to black backgrounds, sad workshop scenes, old tired faces, muddy grading, or one-template split layouts; even dark styles must have a well-lit hero, vivid color accent, and clear readable typography;
- huge bold condensed Cyrillic typography, readable, energetic, modern, like premium performance ads;
- main visual subject large on one side, headline large on the other side; if there is a face, never cover it with a text box;
- no small useless text, no clutter, no many icons, no website navigation;
- one short supporting phrase by meaning and one tiny CTA badge: "УЗНАТЬ ПОДРОБНЕЕ";
- cinematic light, sharp face, premium ad composition, realistic but punchy;
- make it look like a final exported banner ready for an ad campaign.

Critical constraints:
- preserve the meaning and spelling of the Russian headline as accurately as possible;
- if an uploaded person exists, the person must remain recognizable as the same person, but improved/polished;
- if the prompt asks for no-person/object/metaphor, do not invent a random man or woman;
- if the person is male, the banner must be from a male visual angle; if female, from a female visual angle;
- no extra unrelated words, no fake brand logos, no bank logos;
- no luxury, no yachts, no sports cars, no Dubai/Bali lifestyle;
- no guarantees of income, no fake screenshots.
- avoid gloomy faces, muddy dark grading, repeated sad workshop/window scenes, and one-template split layouts.
` : `
Generate a premium advertising photo background without any text.
Context:
${audienceContext}
${personaLine}

Visual direction:
${visualPrompt}

${heroImage ? "Use the uploaded image as the person's reference. Preserve general age range, face type, hair, and authentic feel, but place them into a polished ad composition." : ''}

Banner layout that will be added later by code:
- style preset: ${stylePreset};
- the final banner uses a big Russian headline, a short supporting line, clean contrast panels and a small CTA painted by canvas;
- therefore the generated image must be clean lifestyle photography or a strong object/metaphor scene, with the main subject clearly on one side and enough visual breathing room for graphic overlay;
- suitable scenes: city terrace, cafe, home office, phone, road/door/system metaphors, travel-like but believable;
- avoid gloomy workshop/window scenes, old tired faces, muddy dark grading, and black empty backgrounds unless the prompt explicitly locks that scene.

Critical constraints:
- no text, no letters, no numbers, no logos, no bank brands;
- if the prompt asks for no human, do not include a human;
- no luxury, no yachts, no sports cars, no Dubai/Bali lifestyle;
- warm, click-stopping, confident and lively, but not scammy;
- avoid gloomy faces, muddy dark grading, repeated sad workshop/window scenes, and one-template split layouts;
- do not draw banners, typography, icons or frames inside the image.
`;

  try {
    const result = await callOpenAIImageWithFallback(env, {
      prompt,
      heroImage,
      quality: requestedQuality,
      size: requestedSize
    });
    return json({
      image: `data:image/png;base64,${result.image}`,
      imageModel: result.model,
      imageSize: requestedSize,
      imageQuality: requestedQuality,
      fallbackReason: result.fallbackReason || null
    });
  } catch (error) {
    return json({
      image: null,
      warning: error.code === 'NO_KEY'
        ? 'OPENAI_API_KEY не задан. Фон будет шаблонным.'
        : `Генерация картинки временно недоступна: ${String(error.status || '')} ${String(error.message || '').slice(0, 240)}`
    });
  }
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET,POST,OPTIONS',
            'access-control-allow-headers': 'content-type'
          }
        });
      }

      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return json({
          ok: true,
          hasKey: Boolean(env.OPENAI_API_KEY),
          hasSupabase: Boolean(env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY)),
          hasAccessStorage: Boolean(accessStorage(env)),
          hasApprovalTelegram: Boolean((env.ACCESS_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN) && (env.ACCESS_TELEGRAM_CHAT_IDS || env.TELEGRAM_APPROVER_CHAT_IDS)),
          hasApprovalMax: Boolean((env.ACCESS_MAX_BOT_TOKEN || env.MAX_BOT_TOKEN) && (env.ACCESS_MAX_USER_IDS || env.MAX_APPROVER_USER_IDS)),
          hasApprovalWebhook: Boolean(env.ACCESS_APPROVAL_WEBHOOK_URL || env.APPROVAL_WEBHOOK_URL),
          atmospaceGenerateEndpoint: `${ATMOSPACE_API_BASE_URL}${ATMOSPACE_GENERATE_PATH}`,
          textModel: TEXT_MODEL,
          imageToolTextModel: IMAGE_TOOL_TEXT_MODEL,
          imageModel: IMAGE_MODEL
        });
      }
      if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/published-image') {
        return await handlePublishedImage(env, request);
      }
      if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/image-proxy') {
        return await handleImageProxy(request);
      }
      if (request.method === 'POST' && url.pathname === '/api/ideate') {
        return await handleIdeate(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/generate-image') {
        return await handleGenerateImage(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/publish-image') {
        return await handlePublishImage(env, request);
      }
      if (request.method === 'POST' && (url.pathname === '/api/submit-client' || url.pathname === '/api/constructor/individual-clients/upsert')) {
        return await handleSubmitClient(env, request);
      }
      if (request.method === 'POST' && (
        url.pathname === '/api/atmospace/generate'
        || url.pathname === '/api/constructor/atmospace/generate'
      )) {
        return await handleAtmospaceLandingGenerate(env, request);
      }
      if (request.method === 'POST' && url.pathname === '/api/request-access') {
        return await handleRequestAccess(env, request);
      }
      if (request.method === 'GET' && url.pathname === '/api/access-status') {
        return await handleAccessStatus(env, request);
      }
      if (request.method === 'GET' && url.pathname === '/api/approve-access') {
        return await handleApproveAccess(env, request);
      }
      return json({ ok: false, error: 'not_found' }, 404);
    } catch (error) {
      return json({
        ok: false,
        error: 'worker_exception',
        message: publicWorkerError(error),
        detail: String(error?.message || error || '').slice(0, 240)
      }, 500);
    }
  }
};
