variable "function_name_prefix" {
  description = "Prefix for the trigger function names. Must match the existing functions so they can be imported (existing: structra-cognito-*)."
  type        = string
  default     = "structra-cognito"
}

variable "source_dir" {
  description = "Absolute path to the repo lambdas/ directory containing the 4 trigger .py files"
  type        = string
}

variable "user_pool_arn" {
  description = "ARN of the (referenced) Cognito user pool — used to scope invoke permission and pre_signup IAM"
  type        = string
}

variable "ses_identity_arn" {
  description = "SES identity ARN the create_auth trigger sends from. Null = allow ses:SendEmail on any identity."
  type        = string
  default     = null
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
