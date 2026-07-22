# Atmospace quiz and registration foundation

Status: technical foundation, no visual integration

## Goal

Provide a UI-independent constructor layer for this path:

```text
advertising page
→ UTM and advertising click-ID capture
→ Atmospace landing initialization
→ quiz answers and deterministic result
→ ready Atmospace registration destination
```

The current constructor design and existing templates are intentionally not changed by this foundation.

## Modules

### `advertisingContext.js`

Owns:

- current page URL normalization;
- UTM capture;
- `yclid`, `gclid`, `fbclid`, `msclkid`, and `dclid` capture;
- unique page-instance creation;
- the browser payload for Atmospace landing initialization.

It never accepts or stores protected credentials.

### `runtimeClient.js`

Owns:

- the public request to `https://api.atmospace.pro/api/landing-runtime/init`;
- timeout and retry-safe error classification;
- validation that the returned registration destination belongs to Atmospace;
- human-facing unavailable messages.

It intentionally returns only the ready registration URL and counter number. Raw visit, attribution, and handoff references are not exposed to constructor UI code.

### `functions/api/atmospace/generate.js`

Owns:

- the same-origin Cloudflare Pages Function route `/api/atmospace/generate`;
- strict input and payload-size validation;
- server-to-server forwarding to Atmospace generation;
- no-store responses and safe human errors;
- removal of the write-only advertising credential from the returned response.

The function does not log or persist request bodies and contains no real secret values.

### `generationClient.js`

Owns:

- the constructor-side call to the same-origin generation function;
- a write-only credential value that exists only for the request;
- timeout and retry state;
- the safe generated result: public landing key, embed code, and landing name.

The credential must never be copied into project state or `localStorage`.

### `projectData.js`

Owns:

- the allowlist of safe Atmospace project fields;
- safe serialization and deserialization;
- removal of password, advertising credential, CAPTCHA, API-token, and access-token fields;
- creation of a one-time generation request from safe project data plus a write-only credential.

### `quizEngine.js`

Owns:

- a generic question/option/result contract;
- deterministic scoring;
- answer state;
- completion state;
- a safe result key.

It owns no visible text, HTML, styles, React components, or campaign content.

### `quizRegistrationController.js`

Owns:

- the shared state between quiz progress and Atmospace initialization;
- idempotent initialization;
- retry state;
- subscriptions for a React adapter;
- the rule that registration becomes available only when the quiz is complete and Atmospace is ready.

### `useQuizRegistration.js`

Owns:

- the React lifecycle adapter;
- automatic initialization;
- quiz answer actions;
- retry and reset actions;
- final navigation to the ready Atmospace registration destination.

It contains no visual markup or styles.

## Security boundaries

The constructor must not own:

- user registration credentials;
- passwords;
- CAPTCHA secrets;
- partner ownership decisions;
- raw attribution identifiers;
- payment handling;
- server-side advertising goals;
- protected advertising credentials after the one-time generation request.

Those responsibilities stay on Atmospace.

The constructor must not store protected tokens in `localStorage`. Existing project fields that currently allow this require a separate cleanup task.

CAPTCHA belongs to the Atmospace registration contour, where it can be verified server-side. It must not be implemented as a constructor-only browser check.

## Deployment requirement

The `functions/` directory is designed for Cloudflare Pages file-based Functions. Before production deployment, the Pages project must be checked to confirm that Functions are enabled and the generated route is available in a preview deployment.

Optional environment binding:

```text
ATMOSPACE_API_BASE_URL=https://api.atmospace.pro
```

The production default already points to the same URL. No protected value belongs in this binding.

## Next safe integration step

Connect the completed technical modules to one existing constructor section without redesigning it.

That integration should:

1. accept a landing name, public advertising landing code, and counter number;
2. treat the advertising goal credential as write-only and never save it;
3. request a generated landing through the same-origin function;
4. initialize Atmospace when the published quiz page opens;
5. pass answers into the quiz engine;
6. show existing loading/error styles with human product wording;
7. open the returned registration destination after quiz completion.

No internal technical copy is visible in user-facing UI. All visible text must be product/human copy, not developer/debug/system wording.
