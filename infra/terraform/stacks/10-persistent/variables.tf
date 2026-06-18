variable "name_prefix" {
  type    = string
  default = "structra-prod"
}

variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "profile" {
  type    = string
  default = "structra-admin"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "azs" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/24", "10.0.1.0/24"]
}

variable "app_private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "db_private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.20.0/24", "10.0.21.0/24"]
}

variable "cognito_user_pool_id" {
  type    = string
  default = "ap-south-1_QD5vjF5ej"
}

variable "cognito_app_client_id" {
  type    = string
  default = "2dmikoh9ligfjqe9auo8ioh21m"
}

variable "frontend_bucket_name" {
  description = "Globally-unique name for the NEW frontend bucket (separate from the existing structra-frontend-prod)"
  type        = string
  default     = "structra-frontend-042843883108"
}

variable "ses_identity_arn" {
  description = "SES identity ARN for the Cognito create_auth trigger (null = allow any)"
  type        = string
  default     = null
}

variable "manage_cognito_triggers" {
  description = "Manage the 4 Cognito trigger Lambdas in Terraform. Default false — they already exist and handle live auth; enable only after importing them (see modules/cognito-triggers)."
  type        = bool
  default     = false
}
