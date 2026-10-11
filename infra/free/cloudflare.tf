# The React app. Deployed by uploading a local build, so there is no git connection:
#   cd frontend && npm run build && wrangler pages deploy dist --project-name structra --branch main
resource "cloudflare_pages_project" "app" {
  account_id        = var.cloudflare_account_id
  name              = "structra"
  production_branch = "main"
}

# The documentation site shares that project. A deployment on the branch "docs" is served at
# docs.structra.pages.dev, which is the only way to get a dotted hostname without a domain:
#   cd docs && npm run build && wrangler pages deploy build --project-name structra --branch docs

# Keeps the free API awake from 09:30 to 22:20 IST. The code is keepalive/worker.js.
resource "cloudflare_workers_script" "keepalive" {
  account_id  = var.cloudflare_account_id
  script_name = "structra-keepalive"
  content     = file("${path.module}/keepalive/worker.js")
  main_module = "worker.js"

  bindings = [{
    type = "plain_text"
    name = "API_URL"
    text = var.api_public_url
  }]
}

resource "cloudflare_workers_cron_trigger" "keepalive" {
  account_id  = var.cloudflare_account_id
  script_name = cloudflare_workers_script.keepalive.script_name
  schedules   = [{ cron = "*/10 4-16 * * *" }]
}
