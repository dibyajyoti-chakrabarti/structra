variable "name_prefix" {
  description = "Prefix for resource names, e.g. structra-prod"
  type        = string
}

variable "vpc_id" {
  description = "VPC the NAT instance lives in"
  type        = string
}

variable "vpc_cidr_block" {
  description = "VPC CIDR — the NAT instance accepts forwarded traffic from this range"
  type        = string
}

variable "public_subnet_id" {
  description = "Public subnet to place the NAT instance in"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type (ARM Graviton for cost)"
  type        = string
  default     = "t4g.nano"
}

variable "root_volume_gb" {
  description = "Root EBS volume size in GiB"
  type        = number
  default     = 8
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
