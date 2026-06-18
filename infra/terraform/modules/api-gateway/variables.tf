variable "name_prefix" {
  description = "Prefix for resource names, e.g. structra-prod"
  type        = string
}

variable "backend_lambda_invoke_arn" {
  description = "invoke_arn of the backend Lambda"
  type        = string
}

variable "backend_lambda_function_name" {
  description = "Function name of the backend Lambda (for the invoke permission)"
  type        = string
}

variable "payload_format_version" {
  description = "Lambda proxy payload format (2.0 for HTTP API + Mangum)"
  type        = string
  default     = "2.0"
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
