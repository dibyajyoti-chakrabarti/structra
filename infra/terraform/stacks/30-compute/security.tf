# Security group for the VPC-attached Lambdas. Egress-only; outbound reaches
# the internet via the NAT instance and RDS via the DB SG (which allows the
# app-private subnet CIDRs).
resource "aws_security_group" "lambda" {
  name        = "${var.name_prefix}-lambda"
  description = "Structra Lambdas — egress only"
  vpc_id      = data.terraform_remote_state.persistent.outputs.vpc_id
  tags        = { Name = "${var.name_prefix}-lambda" }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
