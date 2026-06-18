variable "name_prefix" {
  description = "Prefix for resource names, e.g. structra-prod"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "azs" {
  description = "Availability zones to span (length must match the subnet CIDR lists)"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDRs for the public subnets (one per AZ) — host the NAT instance"
  type        = list(string)
}

variable "app_private_subnet_cidrs" {
  description = "CIDRs for the private application subnets (one per AZ) — host the Lambdas"
  type        = list(string)
}

variable "db_private_subnet_cidrs" {
  description = "CIDRs for the private database subnets (one per AZ) — host RDS"
  type        = list(string)
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
