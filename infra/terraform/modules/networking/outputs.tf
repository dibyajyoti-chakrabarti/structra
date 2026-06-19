output "vpc_id" {
  value = aws_vpc.this.id
}

output "vpc_cidr_block" {
  value = aws_vpc.this.cidr_block
}

output "internet_gateway_id" {
  value = aws_internet_gateway.this.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "app_private_subnet_ids" {
  value = aws_subnet.app_private[*].id
}

output "db_private_subnet_ids" {
  value = aws_subnet.db_private[*].id
}

output "app_private_subnet_cidrs" {
  value = aws_subnet.app_private[*].cidr_block
}

output "public_route_table_id" {
  value = aws_route_table.public.id
}

output "app_private_route_table_ids" {
  value = aws_route_table.app_private[*].id
}

output "availability_zones" {
  value = var.azs
}
