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
- subscriptions for a future React adapter;
- the rule that registration becomes available only when the quiz is complete and Atmospace is ready.

## Security boundaries

The constructor must not own:

- user registration credentials;
- passwords;
- CAPTCHA secrets;
- partner ownership decisions;
- raw attribution identifiers;
- payment handling;
- server-side advertising goals;
- protected advertising credentials.

Those responsibilities stay on Atmospace.

The constructor must not store protected tokens in `localStorage`. Existing project fields that currently allow this require a separate cleanup task.

## Next safe integration step

Add a small React adapter that connects these modules to one existing constructor section without redesigning it.

That adapter should:

1. receive a public landing key;
2. initialize Atmospace when the published quiz page opens;
3. pass answers into the quiz engine;
4. show existing loading/error styles with human product wording;
5. open the returned registration destination after quiz completion.

No internal technical copy is visible in user-facing UI. All visible text must be product/human copy, not developer/debug/system wording.
