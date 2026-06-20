variable "name_prefix" {
  description = "Prefix for resource names, e.g. structra-prod"
  type        = string
}

variable "bucket_id" {
  description = "Frontend S3 bucket name (created in the persistent stack)"
  type        = string
}

variable "bucket_arn" {
  description = "Frontend S3 bucket ARN"
  type        = string
}

variable "bucket_regional_domain_name" {
  description = "Frontend S3 bucket regional domain name (origin)"
  type        = string
}

variable "default_root_object" {
  description = "Default root object"
  type        = string
  default     = "index.html"
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}

variable "aliases" {
  description = "Custom domain aliases for the CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN (must be in us-east-1) for custom domain; null uses CloudFront default cert"
  type        = string
  default     = null
}
