output "issuer_url" {
  description = "OIDC issuer URL — fed to the Cognito GitHub IdP's oidc_issuer"
  value       = "https://${aws_api_gateway_rest_api.this.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.stage_name}"
}

output "rest_api_id" {
  value = aws_api_gateway_rest_api.this.id
}

output "function_names" {
  value = { for k, fn in aws_lambda_function.fn : k => fn.function_name }
}
