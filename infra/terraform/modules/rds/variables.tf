variable "name_prefix" {
  description = "Prefix for resource names, e.g. structra-prod"
  type        = string
}

variable "vpc_id" {
  description = "VPC the database lives in"
  type        = string
}

variable "db_subnet_ids" {
  description = "Private DB subnet IDs (>= 2 AZs) for the subnet group"
  type        = list(string)
}

variable "allowed_ingress_cidrs" {
  description = "CIDRs allowed to reach 5432 (the app-private subnet CIDRs)"
  type        = list(string)
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Storage in GiB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "structra"
}

variable "username" {
  description = "Master username"
  type        = string
  default     = "postgres"
}

variable "password" {
  description = "Master password (from SSM SecureString)"
  type        = string
  sensitive   = true
}

variable "multi_az" {
  description = "Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Prevent accidental deletion"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Automated backup retention in days"
  type        = number
  default     = 7
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on destroy (false = always snapshot)"
  type        = bool
  default     = false
}

variable "final_snapshot_identifier" {
  description = "Identifier for the final snapshot taken on destroy"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
