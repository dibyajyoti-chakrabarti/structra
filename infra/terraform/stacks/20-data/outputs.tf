output "rds_endpoint_address" {
  value = module.rds.endpoint_address
}

output "rds_port" {
  value = module.rds.port
}

output "rds_db_name" {
  value = module.rds.db_name
}

output "rds_security_group_id" {
  value = module.rds.security_group_id
}

output "rds_instance_identifier" {
  value = module.rds.instance_identifier
}

output "rds_instance_arn" {
  value = module.rds.instance_arn
}
