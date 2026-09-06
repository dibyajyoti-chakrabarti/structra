output "api_invoke_url" {
  value = module.api_gateway.invoke_url
}

output "api_health_url" {
  value = "${module.api_gateway.invoke_url}/api/health/"
}

output "cloudfront_distribution_id" {
  value = module.frontend_cdn.distribution_id
}

output "cloudfront_domain_name" {
  value = module.frontend_cdn.domain_name
}

output "frontend_url" {
  value = module.frontend_cdn.url
}

output "docs_url" {
  value = "${module.frontend_cdn.canonical_url}/documentation/"
}

output "sqs_queue_url" {
  value = aws_sqs_queue.eval.url
}

output "sqs_dlq_url" {
  value = aws_sqs_queue.dlq.url
}

output "backend_function_name" {
  value = module.backend_lambda.function_name
}

output "worker_function_name" {
  value = module.worker_lambda.function_name
}

output "nat_instance_id" {
  value = module.nat.instance_id
}

output "nat_public_ip" {
  value = module.nat.public_ip
}
