# End-to-end tests

Playwright specs that drive the **deployed** app at `structra.cloud`, not a
local dev server. They are a smoke suite for a live environment: they check that
the SPA, API Gateway, the backend Lambda, RDS and the NAT egress path are all
working together.

## Projects

| Project | Needs a login | Covers |
|---|---|---|
| `public-firefox` | no | Marketing and auth pages, SPA deep links, route guards |
| `api` | no | HTTP contract of the API directly, without a browser |
| `app-firefox` | yes | Everything behind `/app` |

## Running

```bash
npm run e2e:public      # no login needed
npm run e2e:login       # once, opens a browser for you to sign in
npm run e2e:app
npm run e2e             # everything
npm run e2e:report      # open the last HTML report
```

`e2e:login` opens a real browser and waits for you to reach `/app`, then writes
the Cognito tokens to `e2e/.auth/user.json`. Sign in with **email/password or
email OTP**: Google refuses OAuth in a browser it can detect as
automation-controlled, so that button cannot complete the flow here.

`e2e/.auth/` is gitignored. It holds live access and refresh tokens for a real
account, so treat it like a credential and re-run `e2e:login` when it expires.

## Pointing at another environment

```bash
E2E_BASE_URL=https://staging.example.com E2E_API_URL=https://.../api/ npm run e2e
```

## Infrastructure this depends on

Authenticated specs fail wholesale when the NAT instance is down, because the
backend verifies every JWT against Cognito's JWKS endpoint and reaches it
through NAT. A run where the public and API projects pass but every `app`
spec fails on a 401 is the signature of NAT being stopped, not of an app bug.
