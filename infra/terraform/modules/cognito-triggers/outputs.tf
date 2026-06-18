output "function_arns" {
  description = "Map of trigger key -> function ARN"
  value       = { for k, fn in aws_lambda_function.trigger : k => fn.arn }
}

output "function_names" {
  description = "Map of trigger key -> function name"
  value       = { for k, fn in aws_lambda_function.trigger : k => fn.function_name }
}

output "role_arns" {
  value = { for k, r in aws_iam_role.trigger : k => r.arn }
}
