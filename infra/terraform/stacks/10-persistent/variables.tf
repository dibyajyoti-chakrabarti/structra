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
  default = "structra"
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

variable "frontend_bucket_name" {
  description = "Globally-unique name for the NEW frontend bucket (separate from the existing structra-frontend-prod)"
  type        = string
  default     = "structra-frontend-042843883108"
}

# SSM prefix for SecureString secrets (Cognito IdP secrets + SMTP password),
# created out-of-band. Matches the convention used by the 30-compute stack.
variable "ssm_prefix" {
  type    = string
  default = "/structra/prod"
}
