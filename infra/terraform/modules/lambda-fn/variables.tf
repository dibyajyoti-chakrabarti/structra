variable "function_name" {
  description = "Lambda function name"
  type        = string
}

variable "image_uri" {
  description = "ECR image URI (tag or digest). image_uri changes are ignored after create so out-of-band deploys (update-function-code) do not cause drift."
  type        = string
}

variable "role_arn" {
  description = "Execution role ARN"
  type        = string
}

variable "architectures" {
  description = "Lambda CPU architecture"
  type        = list(string)
  default     = ["x86_64"]
}

variable "memory_size" {
  description = "Memory (MB)"
  type        = number
  default     = 1024
}

variable "timeout" {
  description = "Timeout (seconds)"
  type        = number
  default     = 30
}

variable "environment" {
  description = "Environment variables map"
  type        = map(string)
  default     = {}
}

variable "vpc_subnet_ids" {
  description = "Subnet IDs for VPC attachment (empty = not VPC-attached)"
  type        = list(string)
  default     = []
}

variable "vpc_security_group_ids" {
  description = "Security group IDs for VPC attachment"
  type        = list(string)
  default     = []
}

variable "reserved_concurrency" {
  description = "Reserved concurrent executions (-1 = unreserved)"
  type        = number
  default     = -1
}

variable "image_config_command" {
  description = "Override the image CMD (handler). Null = use the image's own CMD."
  type        = list(string)
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
