const FIELD_LABELS = {
  landingName: 'название лендинга',
  landingCode: 'код рекламного лендинга',
  counterId: 'номер рекламного счётчика',
  serverOnlyAdGoalCredential: 'защищённый ключ отправки целей'
};

const ERROR_MESSAGES = {
  landing_name_required: 'Введите название лендинга.',
  landing_code_required: 'Вставьте полный код рекламного лендинга из кабинета Atmospace.',
  landing_code_invalid: 'Сервер Atmospace не нашёл этот код в боевой базе. В кабинете нажмите «Сгенерировать код» ещё раз и скопируйте код полностью.',
  landing_code_expired: 'Срок действия кода закончился. Сгенерируйте новый код в кабинете Atmospace.',
  landing_code_disabled: 'Этот код отключён в Atmospace. Создайте новый код рекламного лендинга.',
  counter_id_required: 'Укажите номер рекламного счётчика.',
  counter_id_invalid: 'Номер рекламного счётчика должен состоять только из цифр.',
  ad_goal_credential_required: 'Вставьте актуальный защищённый ключ отправки целей.',
  ad_goal_credential_invalid: 'Защищённый ключ не принят сервером. Возьмите актуальный ключ для этого кабинета.',
  credential_invalid: 'Защищённый ключ не принят сервером. Возьмите актуальный ключ для этого кабинета.',
  credential_storage_not_configured: 'Хранилище защищённых ключей на сервере Atmospace не настроено. Это серверная ошибка, а не ошибка ваших данных.',
  validation_failed: 'Проверьте четыре поля серверной сборки.',
  atmospace_network_error: 'Конструктор не смог связаться с Atmospace. Повторите попытку позже.',
  atmospace_generate_failed: 'Atmospace не смог подготовить серверный лендинг.',
  internal_error: 'На сервере Atmospace произошла внутренняя ошибка.'
};

function clean(value, limit) {
  return String(value || '').trim().slice(0, limit);
}

function containsMaskedValue(value) {
  return /(?:\.\.\.|…|\*{3,})/.test(String(value || ''));
}

export function normalizeAtmospaceLandingInput(input = {}) {
  return {
    landingName: clean(input.landingName, 180),
    landingCode: clean(input.landingCode, 240),
    counterId: clean(input.counterId, 80),
    serverOnlyAdGoalCredential: clean(input.serverOnlyAdGoalCredential, 2000)
  };
}

export function validateAtmospaceLandingInput(input = {}) {
  const value = normalizeAtmospaceLandingInput(input);
  const errors = [];

  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    if (!value[field]) {
      errors.push({ field, code: `${field}_required`, message: `Заполните поле «${label}».` });
    }
  }

  if (value.landingCode) {
    if (containsMaskedValue(value.landingCode)) {
      errors.push({
        field: 'landingCode',
        code: 'landing_code_masked',
        message: 'Код скопирован не полностью. Вставьте значение целиком, без «...» и звёздочек.'
      });
    } else if (/^https?:\/\//i.test(value.landingCode)) {
      errors.push({
        field: 'landingCode',
        code: 'landing_code_is_url',
        message: 'Нужен код из кнопки «Скопировать код», а не ссылка на кабинет или лендинг.'
      });
    } else if (/(?:^|[?&])(gcpc|gcao)=|partner[_-]?code/i.test(value.landingCode)) {
      errors.push({
        field: 'landingCode',
        code: 'legacy_partner_code',
        message: 'Это старый GetCourse/partner_code. Нужен отдельный код рекламного лендинга из Atmospace.'
      });
    } else if (/\s/.test(value.landingCode)) {
      errors.push({
        field: 'landingCode',
        code: 'landing_code_has_spaces',
        message: 'В коде рекламного лендинга не должно быть пробелов.'
      });
    }
  }

  if (value.counterId && !/^\d{5,20}$/.test(value.counterId)) {
    errors.push({
      field: 'counterId',
      code: 'counter_id_invalid',
      message: 'Номер рекламного счётчика должен состоять только из цифр.'
    });
  }

  if (value.serverOnlyAdGoalCredential && containsMaskedValue(value.serverOnlyAdGoalCredential)) {
    errors.push({
      field: 'serverOnlyAdGoalCredential',
      code: 'credential_masked',
      message: 'Защищённый ключ скопирован не полностью. Вставьте исходное значение целиком.'
    });
  }

  return { value, errors };
}

export function getAtmospaceGenerateErrorMessage(errorCode = '', status = 0, fallback = '') {
  const code = String(errorCode || '').trim().toLowerCase();
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (code.includes('credential')) return ERROR_MESSAGES.ad_goal_credential_invalid;
  if (status === 401 || status === 403) return ERROR_MESSAGES.ad_goal_credential_invalid;
  if (status === 404) return ERROR_MESSAGES.landing_code_invalid;
  if (status === 429) return 'Atmospace временно ограничил запросы. Повторите через минуту.';
  if (status >= 500) return 'Сервер Atmospace временно недоступен. Повторите генерацию позже.';
  return String(fallback || '').trim() || 'Не удалось собрать лендинг. Проверьте четыре поля и повторите генерацию.';
}
