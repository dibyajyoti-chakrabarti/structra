# End-to-end tests

Playwright specs that drive a **deployed** app. Set `E2E_BASE_URL`; it defaults to
`http://localhost:5173`. They are a smoke suite for a live environment: they check
that the SPA, the API and the database all work together.

## Projects

| Project | Needs a login | Covers |
|---|---|---|
| `public-firefox` | no | Marketing and auth pages, SPA deep links, route guards |
| `api` | no | HTTP contract of the API directly, without a browser |
| `app-firefox` | yes | Everything behind `/app` |

The app project writes to the live account. Every workspace it creates is
uniquely named and deleted in `afterEach`, including when the test body fails.

## Running

```bash
npm run e2e:public      # no login needed
npm run e2e:login       # once, opens a browser for you to sign in
npm run e2e:app
npm run e2e             # everything
npm run e2e:report      # open the last HTML report
```

`e2e:login` opens a real browser and waits for you to reach `/app`, then writes
the session tokens to `e2e/.auth/user.json`. Sign in with the **email code**: Google refuses OAuth in a browser it can detect as
automation-controlled, so that button cannot complete the flow here.

`e2e/.auth/` is gitignored. It holds live access and refresh tokens for a real
account, so treat it like a credential and re-run `e2e:login` when it expires.

## Pointing at another environment

```bash
E2E_BASE_URL=https://staging.example.com E2E_API_URL=https://.../api/ npm run e2e
```

## The evaluation spec is opt-in

`e2e/app/evaluation.spec.js` drives the whole pipeline: backend to SQS, worker
Lambda, Bedrock, the result callback, RDS and back to the report. It is skipped
by default because each run spends one of the workspace's three daily insight
tokens and bills real inference.

```bash
E2E_RUN_EVALUATION=1 npm run e2e:app
```

## When creation starts failing

The CORE plan allows exactly one workspace, so a single workspace left behind
by an interrupted run blocks every later run at `createWorkspace`. Clear it:

```bash
node e2e/cleanup.mjs
```

## Infrastructure this depends on

Authenticated specs need the backend awake. On the free tier it sleeps when idle,
so the first request can take about a minute. A run where the public project
passes but every `app` spec fails on a timeout is the signature of a sleeping
backend, not of an app bug. Open the site once and wait for it before running.
