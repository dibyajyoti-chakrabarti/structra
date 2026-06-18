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
variable "nat_instance_type" {
  type    = string
  default = "t4g.nano"
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
