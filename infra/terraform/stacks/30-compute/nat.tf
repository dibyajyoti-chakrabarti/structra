###############################################################################
# NAT instance + the default routes that send private-subnet egress to it.
###############################################################################

module "nat" {
  source = "../../modules/nat-instance"

  name_prefix      = var.name_prefix
  vpc_id           = data.terraform_remote_state.persistent.outputs.vpc_id
  vpc_cidr_block   = data.terraform_remote_state.persistent.outputs.vpc_cidr_block
  public_subnet_id = data.terraform_remote_state.persistent.outputs.public_subnet_ids[var.nat_subnet_index]
  instance_type    = var.nat_instance_type
}

# Point each app-private route table's default route at the NAT instance ENI.
resource "aws_route" "app_private_nat" {
  for_each               = toset(data.terraform_remote_state.persistent.outputs.app_private_route_table_ids)
  route_table_id         = each.value
  destination_cidr_block = "0.0.0.0/0"
  network_interface_id   = module.nat.primary_eni_id
}
