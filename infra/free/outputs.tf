output "neon_project_id" {
  value = neon_project.structra.id
}

output "api_url" {
  description = "Set this as api_public_url and apply again, because the service URL is not known before the first apply."
  value       = render_web_service.api.url
}

output "frontend_url" {
  value = "https://${cloudflare_pages_project.app.subdomain}"
}
