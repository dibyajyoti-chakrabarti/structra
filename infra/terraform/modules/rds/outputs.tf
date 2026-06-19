output "endpoint_address" {
  description = "Hostname only (no port) — use as DB_HOST"
  value       = aws_db_instance.this.address
}

output "port" {
  value = aws_db_instance.this.port
}

output "db_name" {
  value = aws_db_instance.this.db_name
}

output "security_group_id" {
  value = aws_security_group.db.id
}

output "instance_identifier" {
  value = aws_db_instance.this.identifier
}

output "instance_arn" {
  value = aws_db_instance.this.arn
}
