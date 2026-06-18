###############################################################################
# Contract consumed by 20-data and 30-compute via terraform_remote_state.
###############################################################################

# --- networking ---
output "vpc_id" {
  value = module.networking.vpc_id
}
output "vpc_cidr_block" {
  value = module.networking.vpc_cidr_block
}
output "public_subnet_ids" {
  value = module.networking.public_subnet_ids
}
output "app_private_subnet_ids" {
  value = module.networking.app_private_subnet_ids
}
output "app_private_subnet_cidrs" {
  value = module.networking.app_private_subnet_cidrs
}
output "db_private_subnet_ids" {
  value = module.networking.db_private_subnet_ids
}
output "app_private_route_table_ids" {
  value = module.networking.app_private_route_table_ids
}
output "availability_zones" {
  value = module.networking.availability_zones
}

# --- ECR ---
output "ecr_backend_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}
output "ecr_worker_repository_url" {
  value = aws_ecr_repository.worker.repository_url
}

# --- IAM roles ---
output "backend_lambda_role_arn" {
  value = aws_iam_role.backend.arn
}
output "worker_lambda_role_arn" {
  value = aws_iam_role.worker.arn
}

# --- Cognito (referenced) ---
output "cognito_user_pool_id" {
  value = data.aws_cognito_user_pool.this.id
}
output "cognito_user_pool_arn" {
  value = data.aws_cognito_user_pool.this.arn
}
output "cognito_app_client_id" {
  value = var.cognito_app_client_id
}

# --- frontend bucket ---
output "frontend_bucket_id" {
  value = aws_s3_bucket.frontend.id
}
output "frontend_bucket_arn" {
  value = aws_s3_bucket.frontend.arn
}
output "frontend_bucket_regional_domain_name" {
  value = aws_s3_bucket.frontend.bucket_regional_domain_name
}

# --- misc ---
output "region" {
  value = var.region
}
output "name_prefix" {
  value = var.name_prefix
}
