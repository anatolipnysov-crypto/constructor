import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#') || !clean.includes('=')) continue;
    const [key, ...rest] = clean.split('=');
    if (!process.env[key]) {
      process.env[key] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

loadDotEnv();

const PORT = Number(process.env.AI_SERVER_PORT || process.env.PORT || 3001);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-5.4';
const IMAGE_TOOL_TEXT_MODEL = process.env.OPENAI_IMAGE_TEXT_MODEL || 'gpt-5';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const SUPABASE_CLIENTS_TABLE = process.env.SUPABASE_CLIENTS_TABLE || 'clients';
const ACCESS_APPROVAL_WEBHOOK_URL = process.env.ACCESS_APPROVAL_WEBHOOK_URL || process.env.APPROVAL_WEBHOOK_URL || '';
const ACCESS_APPROVAL_SECRET = process.env.ACCESS_APPROVAL_SECRET || '';
const ACCESS_APPROVAL_RECIPIENTS = process.env.ACCESS_APPROVAL_RECIPIENTS || '';
const ACCESS_TELEGRAM_BOT_TOKEN = process.env.ACCESS_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
const ACCESS_TELEGRAM_CHAT_IDS = process.env.ACCESS_TELEGRAM_CHAT_IDS || process.env.TELEGRAM_APPROVER_CHAT_IDS || '';
const ACCESS_MAX_BOT_TOKEN = process.env.ACCESS_MAX_BOT_TOKEN || process.env.MAX_BOT_TOKEN || '';
const ACCESS_MAX_USER_IDS = process.env.ACCESS_MAX_USER_IDS || process.env.MAX_APPROVER_USER_IDS || '';
const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL || '').replace(/\/+$/, '');
const accessRequests = new Map();

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

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(body);
}

const DEFAULT_STORY_URL = 'https://promo-ii.ru/67';
const DEFAULT_OFFER_URL = 'https://promo-ii.ru/65';
const GETCOURSE_ORDER_BASE = 'https://voronkapodkluch.getcourse.ru/page2';
const ATMOSPACE_API_BASE_URL = 'https://api.atmospace.pro';
const ATMOSPACE_GENERATE_PATH = '/api/landing-runtime/generate';
const ATMOSPACE_INIT_PATH = '/api/landing-runtime/init';
const ATMOSPACE_CLICK_PATH = '/api/landing-runtime/click';
const ATMOSPACE_RUNTIME_VERSION = 'sergey-constructor-runtime-v1';
const PURCHASE_URL_MISSING_MESSAGE = 'База не вернула purchase_url_990. Генерация остановлена. Проверьте серверную логику автосоздания ссылки покупки 990.';
const DEFAULT_CLIENT_GOALS = {
  goal_bot_start: 'bot_start',
  goal_channel_joined: 'channel_joined',
  goal_offer_click: 'offer_click',
  goal_webinar_click: 'webinar_click',
  goal_webinar_registration: 'webinar_registration'
};

function normalizeImageSize(size, fallback = '1024x1024') {
  const value = String(size || '').trim();
  return ['1024x1024', '1536x1024', '1024x1536', 'auto'].includes(value) ? value : fallback;
}

function normalizeImageQuality(quality, fallback = 'medium') {
  const value = String(quality || '').trim();
  return ['low', 'medium', 'high', 'auto'].includes(value) ? value : fallback;
}

function cleanText(value, max = 400) {
  return String(value || '').trim().slice(0, max);
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

function hasAtmospaceRuntime(source) {
  const htmlSource = String(source || '');
  const requiredMarkers = [
    ATMOSPACE_INIT_PATH,
    ATMOSPACE_CLICK_PATH,
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
    'messenger_button_clicked',
    'links.telegram',
    'links.max',
    'atmospace-policy-consent'
  ];
  return requiredMarkers.every((marker) => htmlSource.includes(marker))
    && /messenger\s*:\s*messenger\s*\|\|\s*null/.test(htmlSource)
    && /!links\.telegram\s*\|\|\s*!links\.max/.test(htmlSource);
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
  var pageInstanceId = makePageInstanceId();
  var readyLinks={telegram:"",max:""};
  var landingOpenedSent=false;
  var runtimeErrorMessage="Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.";
  var buttonSelector=[
    "[data-atmospace-cta]",
    "[data-atmospace-messenger]"
  ].join(",");

  function makePageInstanceId(){
    try{
      var bytes=new Uint8Array(10);
      crypto.getRandomValues(bytes);
      return "pi_"+Array.from(bytes,function(byte){return byte.toString(16).padStart(2,"0");}).join("");
    }catch(error){
      return "pi_"+Date.now()+"_"+Math.random().toString(36).slice(2,10);
    }
  }

  function getParam(name){
    try{return new URLSearchParams(window.location.search).get(name)||"";}catch(error){return "";}
  }

  function collectAttribution(){
    var clickIds={};
    ["yclid","gclid","fbclid","msclkid","dclid"].forEach(function(key){
      var value=getParam(key);
      if(value)clickIds[key]=value;
    });
    return{
      utm_source:getParam("utm_source")||null,
      utm_medium:getParam("utm_medium")||null,
      utm_campaign:getParam("utm_campaign")||null,
      utm_content:getParam("utm_content")||null,
      utm_term:getParam("utm_term")||null,
      advertising_click_ids:clickIds
    };
  }

  function basePayload(){
    var attribution=collectAttribution();
    return Object.assign({
      public_landing_key:cfg.publicLandingKey,
      counter_id:cfg.counterId,
      landing_variant_code:cfg.landingCode||"",
      landing_variant_name:cfg.landingName||"",
      page_instance_id:pageInstanceId,
      page_url:window.location.href,
      referrer:document.referrer||null,
      runtime_version:cfg.runtimeVersion,
      browser_language:navigator.language||null,
      browser_client_time:new Date().toISOString(),
      advertising_click_ids:attribution.advertising_click_ids
    },{
      utm_source:attribution.utm_source,
      utm_medium:attribution.utm_medium,
      utm_campaign:attribution.utm_campaign,
      utm_content:attribution.utm_content,
      utm_term:attribution.utm_term
    });
  }

  function detectMessenger(button){
    var raw=(button.getAttribute("data-atmospace-messenger")||"").toLowerCase();
    if(raw==="max")return "max";
    return "telegram";
  }

  function setButtonsWaiting(){
    document.querySelectorAll(buttonSelector).forEach(function(button){
      button.setAttribute("href","#");
      button.setAttribute("aria-disabled","true");
      button.setAttribute("data-atmospace-state","waiting");
    });
  }

  function applyReadyLinks(links){
    readyLinks.telegram=links&&links.telegram?String(links.telegram):"";
    readyLinks.max=links&&links.max?String(links.max):"";
    document.querySelectorAll(buttonSelector).forEach(function(button){
      var messenger=detectMessenger(button);
      var href=readyLinks[messenger]||"#";
      button.setAttribute("href",href);
      button.setAttribute("target","_blank");
      button.setAttribute("rel","noopener noreferrer");
      button.setAttribute("aria-disabled",href==="#"?"true":"false");
      button.setAttribute("data-atmospace-state",href==="#"?"waiting":"ready");
    });
    setRuntimeMessage("");
  }

  function getRuntimeMessageNode(){
    var existing=document.querySelector("[data-atmospace-runtime-message]");
    if(existing)return existing;
    var firstButton=document.querySelector(buttonSelector);
    if(!firstButton)return null;
    var node=document.createElement("p");
    node.setAttribute("data-atmospace-runtime-message","");
    node.hidden=true;
    node.style.cssText="display:none;margin:12px 0 0;color:#b91c1c;font-size:14px;line-height:1.45;font-weight:800;text-align:center;";
    var container=firstButton.parentElement||firstButton;
    container.insertAdjacentElement("afterend",node);
    return node;
  }

  function setRuntimeMessage(message){
    var node=getRuntimeMessageNode();
    if(!node)return;
    node.textContent=message||"";
    node.hidden=!message;
    node.style.display=message?"block":"none";
  }

  function showRuntimeError(){
    document.querySelectorAll(buttonSelector).forEach(function(button){
      button.setAttribute("href","#");
      button.setAttribute("aria-disabled","true");
      button.setAttribute("data-atmospace-state","error");
    });
    setRuntimeMessage(runtimeErrorMessage);
  }

  function getPolicyCheckbox(){
    return document.getElementById("atmospace-policy-consent");
  }

  function setPolicyError(isVisible){
    var error=document.getElementById("atmospace-policy-error");
    if(!error)return;
    error.hidden=!isVisible;
    error.style.display=isVisible?"block":"none";
  }

  function hasPolicyConsent(){
    var checkbox=getPolicyCheckbox();
    if(!checkbox){
      setPolicyError(false);
      return true;
    }
    if(checkbox.checked){
      setPolicyError(false);
      return true;
    }
    setPolicyError(true);
    if(typeof checkbox.focus==="function")checkbox.focus();
    return false;
  }

  function postJson(url,payload,keepalive){
    if(!url||typeof fetch!=="function")return Promise.resolve(null);
    return fetch(url,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(payload),
      keepalive:Boolean(keepalive)
    }).then(function(response){
      return response.json().catch(function(){return null;}).then(function(body){
        return{ok:response.ok,body:body};
      });
    }).catch(function(){return null;});
  }

  function sendEvent(eventType,messenger){
    var payload={
      public_landing_key:cfg.publicLandingKey,
      counter_id:cfg.counterId,
      page_instance_id:pageInstanceId,
      event_type:eventType,
      messenger:messenger||null,
      page_url:window.location.href,
      referrer:document.referrer||null,
      runtime_version:cfg.runtimeVersion,
      client_time:new Date().toISOString()
    };
    var url=cfg.baseUrl+cfg.clickPath;
    try{
      var body=JSON.stringify(payload);
      if(navigator.sendBeacon){
        var blob=new Blob([body],{type:"application/json"});
        if(navigator.sendBeacon(url,blob))return;
      }
      postJson(url,payload,true);
    }catch(error){}
  }

  function sendLandingOpenedOnce(){
    if(landingOpenedSent)return;
    landingOpenedSent=true;
    sendEvent("landing_opened",null);
  }

  document.addEventListener("click",function(event){
    var button=event.target&&event.target.closest?event.target.closest(buttonSelector):null;
    if(!button)return;
    var messenger=detectMessenger(button);
    var href=readyLinks[messenger]||button.getAttribute("href")||"";
    if(!href||href==="#"){
      event.preventDefault();
      return;
    }
    if(!hasPolicyConsent()){
      event.preventDefault();
      return;
    }
    sendEvent("messenger_button_clicked",messenger);
  },true);

  function initRuntime(){
    setButtonsWaiting();
    if(!cfg.publicLandingKey||!cfg.counterId){
      showRuntimeError();
      return;
    }
    postJson(cfg.baseUrl+cfg.initPath,basePayload(),false).then(function(result){
      var responseBody=result&&result.body?result.body:null;
      var data=responseBody&&responseBody.ok&&responseBody.data?responseBody.data:null;
      var links=data&&data.links?data.links:null;
      if(!result||!result.ok||!links||!links.telegram||!links.max)throw new Error("landing_not_ready");
      applyReadyLinks(links);
      sendLandingOpenedOnce();
    }).catch(function(){
      showRuntimeError();
    });
  }

  var consent=getPolicyCheckbox();
  if(consent){
    consent.addEventListener("change",function(){
      if(consent.checked)setPolicyError(false);
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",initRuntime);
  }else{
    initRuntime();
  }
})();
</script>`;
}

function ensureAtmospaceRuntimeEmbed(embedCode, publicLandingKey, counterId, landingName, landingCode) {
  let htmlSource = String(embedCode || '');
  if (!htmlSource || hasAtmospaceRuntime(htmlSource)) return htmlSource;
  if (htmlSource.includes(ATMOSPACE_INIT_PATH) || htmlSource.includes(ATMOSPACE_CLICK_PATH) || htmlSource.includes('data-atmospace-runtime=')) {
    return htmlSource;
  }

  const runtimeScript = buildAtmospaceRuntimeScript({ publicLandingKey, counterId, landingName, landingCode });
  if (/<\/body\s*>/i.test(htmlSource)) {
    return htmlSource.replace(/<\/body\s*>/i, `${runtimeScript}\n</body>`);
  }
  return `${htmlSource}\n${runtimeScript}`;
}

function validateAtmospaceEmbedCode({ embedCode, publicLandingKey, counterId, landingName, landingCode, protectedValue }) {
  const source = String(embedCode || '');
  const errors = [];
  const requiredMarkers = [
    'landing_variant_code',
    'landing_variant_name',
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
    'landing_opened',
    'messenger_button_clicked',
    'links.telegram',
    'links.max',
    'atmospace-policy-consent'
  ];
  if (!source.trim()) errors.push('embed_code_empty');
  if (!publicLandingKey || !source.includes(publicLandingKey)) errors.push('public_landing_key_missing');
  if (!counterId || !source.includes(counterId)) errors.push('counter_id_missing');
  if (!landingName || !source.includes(landingName)) errors.push('landing_name_missing');
  if (!landingCode || !source.includes(landingCode)) errors.push('landing_code_missing');
  if (!source.includes(`${ATMOSPACE_API_BASE_URL}${ATMOSPACE_INIT_PATH}`) && !source.includes(ATMOSPACE_INIT_PATH)) errors.push('runtime_init_missing');
  if (!source.includes(`${ATMOSPACE_API_BASE_URL}${ATMOSPACE_CLICK_PATH}`) && !source.includes(ATMOSPACE_CLICK_PATH)) errors.push('runtime_click_missing');
  requiredMarkers.forEach((marker) => {
    if (!source.includes(marker)) errors.push(`runtime_marker_missing:${marker}`);
  });
  if ((source.match(/var pageInstanceId\s*=\s*makePageInstanceId\(\);/g) || []).length !== 1) errors.push('page_instance_id_contract_invalid');
  if (source.includes('sessionStorage')) errors.push('page_instance_id_session_storage_forbidden');
  if (source.includes('readyLinks[messenger]||readyLinks.telegram') || source.includes('readyLinks[messenger]||readyLinks.max')) {
    errors.push('messenger_link_fallback_forbidden');
  }
  if (!/messenger\s*:\s*messenger\s*\|\|\s*null/.test(source)) errors.push('nullable_messenger_contract_missing');
  if (!/!links\.telegram\s*\|\|\s*!links\.max/.test(source)) errors.push('both_messenger_links_required');
  if (source.includes('https://web.telegram.org/k/#')) errors.push('telegram_web_link_forbidden');
  if (!source.includes('Сейчас переход временно недоступен. Попробуйте ещё раз чуть позже.')) errors.push('runtime_error_message_missing');
  if (protectedValue && source.includes(protectedValue)) errors.push('protected_value_leaked');
  if (source.includes('serverOnlyAdGoalCredential')) errors.push('protected_field_name_leaked');
  return errors;
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

async function fetchPublicClientRecord(clientId) {
  const endpoint = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_CLIENTS_TABLE)}?client_id=eq.${encodeURIComponent(clientId)}&select=*`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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

  return { ok: true, record: Array.isArray(data) ? data[0] : data };
}

async function fetchClientRowsByField(field, value) {
  if (!value) return { ok: true, records: [] };
  const endpoint = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_CLIENTS_TABLE)}?${encodeURIComponent(field)}=eq.${encodeURIComponent(value)}&select=client_id,partner_code,landing_url`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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

async function fetchClientConflicts(record) {
  const checks = [
    ['partner_code', record.partner_code],
    ['landing_url', record.landing_url]
  ];
  const conflicts = [];

  for (const [field, value] of checks) {
    const result = await fetchClientRowsByField(field, value);
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

async function handleSubmitClient(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 500, {
      ok: false,
      error: 'supabase_not_configured',
      message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set.'
    });
  }

  const input = await readBody(req);
  const { record, missing, bothelp } = normalizeClientRecord(input);
  if (missing.length) {
    return sendJson(res, 400, { ok: false, error: 'validation_failed', missing });
  }

  const conflicts = await fetchClientConflicts(record);
  if (!conflicts.ok) {
    return sendJson(res, 502, {
      ok: false,
      error: 'supabase_conflict_check_failed',
      status: conflicts.status,
      details: conflicts.details
    });
  }

  if (conflicts.conflicts.length) {
    return sendJson(res, 409, {
      ok: false,
      error: 'client_conflict',
      message: 'partner_code или landing_url уже привязан к другому client_id.',
      conflicts: conflicts.conflicts
    });
  }

  const endpoint = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_CLIENTS_TABLE)}?on_conflict=client_id`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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
    return sendJson(res, 502, {
      ok: false,
      error: 'supabase_upsert_failed',
      status: response.status,
      details: typeof data === 'string' ? data.slice(0, 500) : data
    });
  }

  const fresh = await fetchPublicClientRecord(record.client_id);
  if (!fresh.ok) {
    return sendJson(res, 502, {
      ok: false,
      error: 'supabase_select_failed',
      status: fresh.status,
      details: fresh.details
    });
  }

  const freshRecord = publicClientRecord(fresh.record, record);
  const freshMissing = validateFreshClientRecord(freshRecord, record);
  if (freshMissing.length) {
    return sendJson(res, 409, {
      ok: false,
      error: freshMissing.includes('purchase_url_990_missing') ? 'purchase_url_990_missing' : 'fresh_client_validation_failed',
      message: freshMissing.includes('purchase_url_990_missing') ? PURCHASE_URL_MISSING_MESSAGE : 'Свежая строка public.clients не прошла проверку.',
      missing: freshMissing,
      record: freshRecord
    });
  }

  return sendJson(res, 200, {
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

async function sendAccessApprovalNotification(req, record) {
  if (!ACCESS_APPROVAL_SECRET) return { sent: false, reason: 'approval_secret_not_configured' };
  const origin = APP_PUBLIC_URL || `http://${req.headers.host}`;
  const approveUrl = `${origin}/api/approve-access?request_id=${encodeURIComponent(record.request_id)}&decision=approve&admin_token=${encodeURIComponent(ACCESS_APPROVAL_SECRET)}`;
  const rejectUrl = `${origin}/api/approve-access?request_id=${encodeURIComponent(record.request_id)}&decision=reject&admin_token=${encodeURIComponent(ACCESS_APPROVAL_SECRET)}`;
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

  const chatIds = ACCESS_TELEGRAM_CHAT_IDS.split(',').map((item) => item.trim()).filter(Boolean);
  const deliveries = [];
  if (ACCESS_TELEGRAM_BOT_TOKEN && chatIds.length) {
    const results = await Promise.allSettled(chatIds.map((chatId) => fetch(`https://api.telegram.org/bot${ACCESS_TELEGRAM_BOT_TOKEN}/sendMessage`, {
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

  const maxUserIds = ACCESS_MAX_USER_IDS.split(',').map((item) => item.trim()).filter(Boolean);
  if (ACCESS_MAX_BOT_TOKEN && maxUserIds.length) {
    const buttons = [[
      { type: 'link', text: 'Принять', url: approveUrl },
      { type: 'link', text: 'Отклонить', url: rejectUrl }
    ]];
    const results = await Promise.allSettled(maxUserIds.map((userId) => fetch(`https://platform-api.max.ru/messages?user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        authorization: ACCESS_MAX_BOT_TOKEN,
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

  if (!ACCESS_APPROVAL_WEBHOOK_URL) return { sent: false, reason: 'telegram_max_or_webhook_not_configured' };
  const response = await fetch(ACCESS_APPROVAL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event: 'constructor_access_request',
      text,
      recipients: ACCESS_APPROVAL_RECIPIENTS,
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

async function handleRequestAccess(req, res) {
  return sendJson(res, 403, {
    ok: false,
    error: 'constructor_owner_only',
    message: 'Клиентские заявки отключены. Вход доступен только администратору.'
  });

  const input = await readBody(req);
  const fullName = cleanText(input.full_name || input.fullName, 160);
  const contactChannel = cleanText(input.contact_channel || input.contactChannel || 'telegram', 40).toLowerCase();
  const contactValue = cleanText(input.contact_value || input.contactValue, 180);

  if (fullName.split(/\s+/).filter(Boolean).length < 2) return sendJson(res, 400, { ok: false, error: 'full_name_required', message: 'Укажите имя и фамилию.' });
  if (!['telegram', 'max'].includes(contactChannel)) return sendJson(res, 400, { ok: false, error: 'bad_contact_channel', message: 'Выберите Telegram или MAX.' });
  if (contactValue.length < 3) return sendJson(res, 400, { ok: false, error: 'contact_required', message: 'Укажите username или ссылку на контакт.' });

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
  accessRequests.set(record.request_id, record);
  const notification = await sendAccessApprovalNotification(req, record).catch((error) => ({ sent: false, reason: String(error?.message || error).slice(0, 200) }));
  return sendJson(res, 200, {
    ok: true,
    status: 'pending',
    requestId: record.request_id,
    requestToken: record.request_token,
    clientId: record.client_id,
    notification
  });
}

async function handleAccessStatus(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestId = cleanText(url.searchParams.get('request_id'), 120);
  const token = cleanText(url.searchParams.get('token'), 180);
  const record = accessRequests.get(requestId);
  if (!record || record.request_token !== token) return sendJson(res, 404, { ok: false, error: 'not_found' });
  if (record.status === 'approved') return sendJson(res, 200, { ok: true, status: 'approved', account: accountFromAccessRequest(record) });
  if (record.status === 'rejected') return sendJson(res, 200, { ok: true, status: 'rejected', message: 'Заявка отклонена.' });
  return sendJson(res, 200, { ok: true, status: 'pending', clientId: record.client_id });
}

async function handleApproveAccess(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestId = cleanText(url.searchParams.get('request_id'), 120);
  const decision = cleanText(url.searchParams.get('decision') || 'approve', 30).toLowerCase();
  const adminToken = cleanText(url.searchParams.get('admin_token'), 500);
  if (!ACCESS_APPROVAL_SECRET || adminToken !== ACCESS_APPROVAL_SECRET) {
    res.writeHead(403, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return res.end('<h1>Доступ запрещён</h1>');
  }
  const record = accessRequests.get(requestId);
  if (!record) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return res.end('<h1>Заявка не найдена</h1>');
  }
  const approved = decision !== 'reject' && decision !== 'rejected';
  const next = {
    ...record,
    status: approved ? 'approved' : 'rejected',
    updated_at: new Date().toISOString(),
    approved_at: approved ? new Date().toISOString() : '',
    rejected_at: approved ? '' : new Date().toISOString()
  };
  accessRequests.set(requestId, next);
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  return res.end(`<!doctype html><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;background:#07111f;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}.box{max-width:560px;padding:28px;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:rgba(255,255,255,.06)}b{color:#86efac}</style><div class="box"><h1>${approved ? 'Вход одобрен' : 'Заявка отклонена'}</h1><p><b>${next.full_name}</b></p><p>client_id: ${next.client_id}</p><p>Можно закрыть эту страницу.</p></div>`);
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
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

async function uploadImageToTmpFiles({ buffer, mime = 'image/png', filename = 'banner.png' }) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime }), filename);

  const response = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: form
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`tmpfiles_upload_failed: ${text.slice(0, 220)}`);

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

async function callOpenAI(payload) {
  if (!OPENAI_API_KEY) {
    const error = new Error('OPENAI_API_KEY is not set');
    error.code = 'NO_KEY';
    throw error;
  }
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${OPENAI_API_KEY}`
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

async function handleIdeate(req, res) {
  const input = await readBody(req);
  const headline = String(input.headline || '').trim();
  if (!headline) return sendJson(res, 400, { error: 'headline_required' });

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
    const data = await callOpenAI({
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
    sendJson(res, 200, normalizeIdeas(input, parsed));
  } catch (error) {
    console.error('IDEATE_ERROR', error.status || '', error.message);
    const base = normalizeIdeas(input, { source: error.code === 'NO_KEY' ? 'local_no_api_key' : 'local_fallback', ideas: fallbackIdeas });
    sendJson(res, 200, {
      ...base,
      warning: error.code === 'NO_KEY'
        ? 'OPENAI_API_KEY не задан. Включен локальный демо-режим.'
        : 'AI временно недоступен, включен локальный fallback.'
    });
  }
}

async function handleGenerateImage(req, res) {
  const input = await readBody(req);
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
  if (!visualPrompt) return sendJson(res, 400, { error: 'visual_prompt_required' });

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
- varied premium ad style according to the prompt: black/yellow, black/red, green, white/gold, blue, newspaper, fintech, glass, metaphorical, or documentary;
- prefer a brighter, cleaner, optimistic performance-ad look unless the user explicitly asks for a dark style: blue sky/city light/white-gold/green trust beats gloomy noir;
- do not default to black backgrounds, sad workshop scenes, old tired faces, muddy grading, or one-template split layouts; even dark styles must have a well-lit hero, vivid color accent, and clear readable typography;
- huge bold condensed Cyrillic typography, readable, energetic, modern, like premium performance ads;
- main visual subject large on one side, headline large on the other side; if there is a face, never cover it with a text box;
- no small useless text, no clutter, no many icons, no website navigation;
- one short supporting phrase by meaning and one tiny CTA badge: "УЗНАТЬ ПОДРОБНЕЕ";
- make it look like a final exported banner ready for an ad campaign.

Critical constraints:
- preserve the meaning and spelling of the Russian headline as accurately as possible;
- if an uploaded person exists, the person must remain recognizable as the same person, but improved/polished;
- if the prompt asks for no-person/object/metaphor, do not invent a random man or woman;
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
    const inputContent = [{ type: 'input_text', text: prompt }];
    if (heroImage) {
      inputContent.push({
        type: 'input_image',
        image_url: `data:${heroImage.mime};base64,${heroImage.data}`
      });
    }

    const data = await callOpenAI({
      model: IMAGE_TOOL_TEXT_MODEL,
      input: [{ role: 'user', content: inputContent }],
      tools: [{ type: 'image_generation', model: IMAGE_MODEL, size: requestedSize, quality: requestedQuality }]
    });
    const image = imageFromResponses(data);
    if (!image) throw new Error('No image returned');
    sendJson(res, 200, {
      image: `data:image/png;base64,${image}`,
      imageSize: requestedSize,
      imageQuality: requestedQuality
    });
  } catch (error) {
    console.error('IMAGE_ERROR', error.status || '', error.message);
    sendJson(res, 200, {
      image: null,
      warning: error.code === 'NO_KEY'
        ? 'OPENAI_API_KEY не задан. Фон будет шаблонным.'
        : 'Генерация картинки временно недоступна.'
    });
  }
}

async function handlePublishImage(req, res) {
  const input = await readBody(req);
  const imageData = dataUrlToInputImage(input.imageDataUrl);
  if (!imageData) return sendJson(res, 400, { error: 'image_data_url_required' });

  const buffer = Buffer.from(imageData.data, 'base64');
  const extension = imageData.mime.includes('jpeg') ? 'jpg' : imageData.mime.split('/')[1] || 'png';
  const uploadedUrl = await uploadImageToTmpFiles({
    buffer,
    mime: imageData.mime,
    filename: `banner-${Date.now()}.${extension}`
  });
  return sendJson(res, 200, { imageUrl: uploadedUrl, originalUrl: uploadedUrl });
}

async function handleAtmospaceLandingGenerate(req, res) {
  const requestId = crypto.randomUUID();
  let input;
  try {
    input = await readBody(req);
  } catch {
    console.warn('[atmospace.generate] bad_json', { requestId });
    return sendJson(res, 400, {
      ok: false,
      error: 'bad_json',
      message: 'Некорректный запрос.',
      requestId
    });
  }

  const payload = cleanAtmospaceGenerateInput(input);
  const validationErrors = validateAtmospaceGenerateInput(payload);
  if (validationErrors.length) {
    const primaryError = validationErrors[0]?.code || 'validation_failed';
    console.warn('[atmospace.generate] validation_failed', { requestId, validationErrors });
    return sendJson(res, 400, {
      ok: false,
      error: primaryError,
      message: safeAtmospaceGenerateMessage(primaryError, 400),
      validationErrors,
      requestId
    });
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
    return sendJson(res, 502, {
      ok: false,
      error: 'atmospace_network_error',
      message: 'Не удалось связаться с сервером генерации. Повторите попытку позже.',
      requestId
    });
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
    return sendJson(res, upstream.ok ? 502 : Math.min(Math.max(upstream.status, 400), 599), {
      ok: false,
      error: upstreamError,
      message: safeAtmospaceGenerateMessage(upstreamError, upstream.status),
      status: upstream.status,
      requestId
    });
  }

  const runtimeEmbedCode = ensureAtmospaceRuntimeEmbed(
    upstreamData.embedCode,
    cleanText(upstreamData.publicLandingKey, 500),
    payload.counterId,
    payload.landingName,
    payload.landingCode
  );
  const runtimeErrors = validateAtmospaceEmbedCode({
    embedCode: runtimeEmbedCode,
    publicLandingKey: cleanText(upstreamData.publicLandingKey, 500),
    counterId: payload.counterId,
    landingName: payload.landingName,
    landingCode: payload.landingCode,
    protectedValue: payload.serverOnlyAdGoalCredential
  });
  if (runtimeErrors.length) {
    console.error('[atmospace.generate] runtime_contract_failed', { requestId, runtimeErrors });
    return sendJson(res, 502, {
      ok: false,
      error: 'atmospace_runtime_contract_failed',
      message: 'Сервер вернул HTML без обязательной отправки заявок, меток или кликов. Генерация остановлена.',
      runtimeErrors,
      requestId
    });
  }

  const artifact = publicAtmospaceGenerateResult({
    ...upstreamData,
    embedCode: runtimeEmbedCode,
    landingName: upstreamData.landingName || payload.landingName,
    landingCode: payload.landingCode,
    counterId: payload.counterId,
    runtimeStatus: hasAtmospaceRuntime(upstreamData.embedCode) ? 'upstream_runtime_verified' : 'constructor_runtime_added'
  });

  console.info('[atmospace.generate] success', {
    requestId,
    publicLandingKey: maskAtmospaceLogValue(artifact.publicLandingKey),
    runtimeStatus: artifact.runtimeStatus
  });

  return sendJson(res, 200, {
    ok: true,
    requestId,
    data: {
      ...artifact,
      artifactId: ''
    }
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'POST' && url.pathname === '/api/ideate') return await handleIdeate(req, res);
    if (req.method === 'POST' && url.pathname === '/api/generate-image') return await handleGenerateImage(req, res);
    if (req.method === 'POST' && url.pathname === '/api/publish-image') return await handlePublishImage(req, res);
    if (req.method === 'POST' && (url.pathname === '/api/submit-client' || url.pathname === '/api/constructor/individual-clients/upsert')) return await handleSubmitClient(req, res);
    if (
      req.method === 'POST'
      && (
        url.pathname === '/api/atmospace/generate'
        || url.pathname === '/api/constructor/atmospace/generate'
      )
    ) return await handleAtmospaceLandingGenerate(req, res);
    if (req.method === 'POST' && url.pathname === '/api/request-access') return await handleRequestAccess(req, res);
    if (req.method === 'GET' && url.pathname === '/api/access-status') return await handleAccessStatus(req, res);
    if (req.method === 'GET' && url.pathname === '/api/approve-access') return await handleApproveAccess(req, res);
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        hasKey: Boolean(OPENAI_API_KEY),
        hasSupabase: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
        hasAccessStorage: true,
        hasApprovalTelegram: Boolean(ACCESS_TELEGRAM_BOT_TOKEN && ACCESS_TELEGRAM_CHAT_IDS),
        hasApprovalMax: Boolean(ACCESS_MAX_BOT_TOKEN && ACCESS_MAX_USER_IDS),
        hasApprovalWebhook: Boolean(ACCESS_APPROVAL_WEBHOOK_URL),
        atmospaceGenerateEndpoint: `${ATMOSPACE_API_BASE_URL}${ATMOSPACE_GENERATE_PATH}`,
        port: PORT,
        textModel: TEXT_MODEL,
        imageToolTextModel: IMAGE_TOOL_TEXT_MODEL,
        imageModel: IMAGE_MODEL
      });
    }
    return sendJson(res, 404, { error: 'not_found' });
  } catch (error) {
    return sendJson(res, 500, { error: 'server_error', details: String(error.message || error) });
  }
});

server.listen(PORT, () => {
  console.log(`Constructor AI server: http://localhost:${PORT}`);
  if (!OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY is not set. Local fallback mode is active.');
  }
});
