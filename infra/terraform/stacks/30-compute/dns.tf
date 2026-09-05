###############################################################################
# Route 53 ALIAS records: structra.cloud + www → CloudFront distribution
# Z2FDTNDATAQYW2 is CloudFront's fixed hosted zone ID (AWS-wide constant).
###############################################################################

locals {
  cf_hosted_zone_id = "Z2FDTNDATAQYW2"
}

resource "aws_route53_record" "apex" {
  count   = var.attach_frontend_aliases ? 1 : 0
  zone_id = data.terraform_remote_state.persistent.outputs.route53_zone_id
  name    = var.frontend_domain
  type    = "A"

  alias {
    name                   = module.frontend_cdn.domain_name
    zone_id                = local.cf_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  count   = var.attach_frontend_aliases ? 1 : 0
  zone_id = data.terraform_remote_state.persistent.outputs.route53_zone_id
  name    = "www.${var.frontend_domain}"
  type    = "A"

  alias {
    name                   = module.frontend_cdn.domain_name
    zone_id                = local.cf_hosted_zone_id
    evaluate_target_health = false
  }
}
