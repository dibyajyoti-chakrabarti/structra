module "rds" {
  source = "../../modules/rds"

  name_prefix           = var.name_prefix
  vpc_id                = data.terraform_remote_state.persistent.outputs.vpc_id
  db_subnet_ids         = data.terraform_remote_state.persistent.outputs.db_private_subnet_ids
  allowed_ingress_cidrs = data.terraform_remote_state.persistent.outputs.app_private_subnet_cidrs

  engine_version          = var.engine_version
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  db_name                 = var.db_name
  username                = var.db_username
  password                = data.aws_ssm_parameter.db_password.value
  multi_az                = var.multi_az
  deletion_protection     = var.deletion_protection
  backup_retention_period = var.backup_retention_period
}
