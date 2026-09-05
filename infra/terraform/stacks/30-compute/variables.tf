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

# --- images (initial only; deploys happen via update-function-code) ---
variable "backend_image_tag" {
  type    = string
  default = "latest"
}

variable "worker_image_tag" {
  type    = string
  default = "latest"
}

# --- NAT instance ---
# Which public subnet the NAT lands in. ap-south-1a had no t4g.micro capacity
# when this stack was first built, and RunInstances answers that with
# InsufficientInstanceCapacity, which the AWS provider treats as retryable, so
# a bad AZ shows up as a create that never finishes rather than an error.
variable "nat_subnet_index" {
  type    = number
  default = 1
}

variable "nat_instance_type" {
  description = "NAT instance type. t4g.micro (arm64) is Free Tier eligible on this account; t4g.nano is not."
  type        = string
  default     = "t4g.micro"
}

# --- Lambda sizing ---
variable "backend_memory" {
  type    = number
  default = 1024
}
variable "backend_timeout" {
  type    = number
  default = 30
}
variable "worker_memory" {
  type    = number
  default = 2048
}
variable "worker_timeout" {
  type    = number
  default = 300
}

# --- Bedrock (POC-validated open-source default; tunable) ---
variable "bedrock_region" {
  type    = string
  default = "us-east-1"
}
variable "bedrock_model_id" {
  type    = string
  default = "us.meta.llama3-3-70b-instruct-v1:0"
}
variable "bedrock_semantic_model_id" {
  type    = string
  default = "us.meta.llama3-3-70b-instruct-v1:0"
}
variable "bedrock_timeout_seconds" {
  type    = number
  default = 60
}

# --- Database (non-secret; password comes from SSM) ---
variable "db_username" {
  type    = string
  default = "postgres"
}

# --- Email (non-secret; password from SSM) ---
variable "email_host" {
  type    = string
  default = "smtp.zoho.in"
}
variable "email_port" {
  type    = number
  default = 587
}
variable "email_host_user" {
  type    = string
  default = "support@structra.cloud"
}
variable "default_from_email" {
  type    = string
  default = "support@structra.cloud"
}

# --- Razorpay (public id + plan ids non-secret; secrets from SSM) ---
variable "razorpay_key_id" {
  type    = string
  default = "rzp_test_SLc8rVSPt7kKnI"
}
variable "razorpay_plan_id_individual" {
  type    = string
  default = "plan_SMFf7WQPOUQUZj"
}
variable "razorpay_plan_id_team" {
  type    = string
  default = "plan_SNVkXQnSDWrJlH"
}

# --- SSM secret parameter names ---
variable "ssm_prefix" {
  type    = string
  default = "/structra/prod"
}

# --- CloudFront ---
variable "cloudfront_price_class" {
  type    = string
  default = "PriceClass_100"
}

# --- Frontend domain ---------------------------------------------------------
variable "frontend_domain" {
  description = "Apex domain the SPA is served from. Also the CloudFront alias and the CORS/CSRF origin."
  type        = string
  default     = "structra.cloud"
}

# The structra.cloud alternate domain names are still held by a CloudFront
# distribution in the original AWS account, which we no longer have access to.
# CloudFront refuses CreateDistribution with a CNAME another distribution owns,
# in any account, so the distribution is built without the aliases first and
# they are moved across with cloudfront associate-alias afterwards. Set this
# false only for that first pass.
variable "attach_frontend_aliases" {
  type    = bool
  default = true
}
