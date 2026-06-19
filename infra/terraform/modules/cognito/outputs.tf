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
  value = aws_cognito_user_pool_domain.this.domain
}

output "trigger_function_arns" {
  description = "Map of trigger key -> function ARN"
  value       = { for k, fn in aws_lambda_function.trigger : k => fn.arn }
}
