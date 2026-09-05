output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.this.arn
}

output "user_pool_endpoint" {
  value = aws_cognito_user_pool.this.endpoint
}

output "app_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "hosted_ui_domain" {
  value = one(aws_cognito_user_pool_domain.this[*].domain)
}

output "hosted_ui_cloudfront_domain" {
  description = "CloudFront domain fronting a custom hosted-UI domain; null for a prefix domain. Alias target for the auth DNS record."
  value       = one(aws_cognito_user_pool_domain.this[*].cloudfront_distribution)
}

output "trigger_function_arns" {
  description = "Map of trigger key -> function ARN"
  value       = { for k, fn in aws_lambda_function.trigger : k => fn.arn }
}
