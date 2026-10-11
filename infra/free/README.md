# Structra on free tiers

Infrastructure for the revived Structra stack. It sits beside `infra/terraform`, which is the preserved AWS era
and must not be edited. Nothing here has been planned or applied: the live resources were created by hand
and through MCP tools, so this code is validated (`terraform validate`) but untested against real state.

## What it describes

| File | Resources |
|---|---|
| `neon.tf` | Neon project `structra` (Postgres, also the evaluation job queue) |
| `render.tf` | Render free Docker web service `structra-api` (gunicorn plus evaluation worker) |
| `cloudflare.tf` | Pages project `structra`, keepalive Worker and its cron trigger |
| `keepalive/` | Worker source and a standalone `wrangler.toml` (`wrangler deploy` also works) |

## Credentials

Provider credentials come from the environment: `NEON_API_KEY`, `RENDER_API_KEY`, `RENDER_OWNER_ID`,
`CLOUDFLARE_API_TOKEN`. Application secrets are variables marked sensitive. Supply them through `TF_VAR_*`
or an untracked `terraform.tfvars` (see `terraform.tfvars.example`). State is local and ignored by git
because it would hold those values.

## Adopting the existing resources

Run these before the first plan, then read the plan carefully. Replacing the Neon project would destroy the data.

```
terraform init
terraform import neon_project.structra rapid-brook-74029081
terraform import render_web_service.api srv-db5u74o473hc73cead30
terraform import cloudflare_pages_project.app <account_id>/structra
terraform import cloudflare_workers_script.keepalive <account_id>/structra-keepalive
```

The import commands and some attribute names (for example the Render `runtime_source` block and the
Cloudflare worker bindings) were written from provider docs, not exercised. Expect to adjust them.

## Not covered by Terraform

* Neon storage bucket `structra-assets` and its credential: the provider has no resource. Create them with
  the Neon API or console, then set the `R2_*` variables (the names are historical, the store is Neon).
* Google Cloud project, OAuth consent screen and client, and the Gmail refresh token (OAuth Playground).
* GitHub OAuth app.
* Razorpay account, plans and keys. No webhook exists, so plan changes rely on the verify endpoint.
* Frontend and docs uploads, which use `wrangler pages deploy` (commands are in `cloudflare.tf`).
* Render does not auto deploy from pushes in the current setup. Trigger a deploy after pushing.
