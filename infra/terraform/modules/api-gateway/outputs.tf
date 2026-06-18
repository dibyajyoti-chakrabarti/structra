output "api_id" {
  value = aws_apigatewayv2_api.this.id
}

output "api_endpoint" {
  description = "Base HTTPS endpoint (the $default stage adds no path prefix)"
  value       = aws_apigatewayv2_api.this.api_endpoint
}

output "invoke_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}

output "execution_arn" {
  value = aws_apigatewayv2_api.this.execution_arn
}

output "api_host" {
  description = "Hostname only — for DJANGO_ALLOWED_HOSTS"
  value       = replace(aws_apigatewayv2_api.this.api_endpoint, "https://", "")
}
