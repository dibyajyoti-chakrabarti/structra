# Chapter 10: Free Tier Deployment

Chapters 2 to 7 describe the AWS deployment, which was torn down on 2026-09-11. This chapter describes what runs
today. The AWS chapters are kept as a record and are not updated.

![Structra on free tiers](assets/free-tier-architecture.svg)

The load bearing fact in the picture: the API and the evaluation worker share one container and one Postgres
database, and that database is also the job queue. There is no queue service, no Lambda and no Cognito.

## What runs where

| Piece | Service | Notes |
|---|---|---|
| React app | Cloudflare Pages, project `structra` | Direct upload of a local build, `https://structra.pages.dev` |
| Documentation | Same Pages project, branch `docs` | A branch alias gives `https://docs.structra.pages.dev` |
| API and worker | Render free Docker web service | `deploy/render/Dockerfile`, started by `deploy/render/start.sh` |
| Database and queue | Neon Postgres, `aws-ap-southeast-1` | The worker polls it with `USE_SQS=false` |
| Avatars | Neon storage bucket `structra-assets` | S3 compatible, env var names still `R2_*` |
| Email | Gmail API over HTTPS | `core.mail.GmailAPIEmailBackend` |
| Sign in | Own JWT, email code, Google, GitHub | Replaces Cognito |
| Evaluation LLM | OpenRouter free models | OpenAI compatible client in the worker |
| Payments | Razorpay, test mode | Individual 299 INR, Team 349 INR per month |
| Keepalive | Cloudflare Worker cron | Pings `/api/health/` every 10 minutes, 09:30 to 22:20 IST |

## Constraints that shaped it

* Render's free tier sleeps after 15 minutes idle and cold starts in about a minute. The app shows a waiting screen
  while the API wakes, and the keepalive Worker avoids most cold starts during the day.
* Render blocks outbound SMTP ports 25, 465 and 587 on the free tier, so email uses the Gmail API instead.
* There is no free background worker, so `start.sh` runs the evaluation worker next to gunicorn in one container.
  Gunicorn uses 1 worker and 4 threads to stay inside the memory limit.
* Cloudflare R2 needs a payment card, so avatars use a Neon storage bucket.
* A custom domain was not bought. `docs.structra.pages.dev` is a Pages branch alias, and preview aliases carry
  `x-robots-tag: noindex`.

## Differences between the old docs and the code

* Chapters 2 to 6 describe Cognito, SQS, Lambda and S3. The code now has its own auth in `backend/accounts`, a
  Postgres backed local queue, and `deploy/render/start.sh` for the worker.
* The Terraform in `infra/terraform` still describes AWS. The free stack lives in `infra/free` and has been
  validated but never applied (see its README).
* The worker setting `USE_SQS` is documented in chapter 5 as an AWS switch. In production it is `false`.

## Gaps

* No Razorpay webhook exists because the account that owns the keys is not accessible. Plan changes rely on the
  checkout verify endpoint, so a payment that completes without the browser returning would not update the plan.
* Render does not auto deploy on push. Trigger a deploy after pushing.
* Free OpenRouter models have a daily request cap, so a burst of evaluations can fail over to the fallback model.

## Deploying

```
# API: push the branch, then trigger a deploy in Render
# App
cd frontend
VITE_API_BASE_URL=https://structra-api-woe3.onrender.com/api/ \
VITE_FRONTEND_URL=https://structra.pages.dev npm run build
wrangler pages deploy dist --project-name structra --branch main
# Docs
cd docs && npm run build && wrangler pages deploy build --project-name structra --branch docs
```

Sources for this chapter and the diagram: `deploy/render/start.sh`, `deploy/render/Dockerfile`,
`backend/config/settings/base.py`, `backend/core/mail.py`, `infra/free/*.tf`, `infra/free/keepalive/worker.js`.
