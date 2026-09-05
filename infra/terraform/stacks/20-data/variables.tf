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
  default = "jan-saathi"
}

variable "engine_version" {
  type    = string
  default = "16"
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "structra"
}

variable "db_username" {
  type    = string
  default = "postgres"
}

variable "multi_az" {
  type    = bool
  default = false
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "backup_retention_period" {
  description = "Automated backup retention (days). 0 disables — required on this Free Tier account, which caps retention. Raise once off the free plan."
  type        = number
  default     = 0
}

variable "ssm_db_password_name" {
  type    = string
  default = "/structra/prod/DB_PASSWORD"
}
