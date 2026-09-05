###############################################################################
# Route 53 hosted zone + ACM certificate for structra.cloud
# Cert is provisioned in us-east-1 (required by CloudFront).
# DNS validation records are written into the Route 53 zone automatically so
# the cert validates without any manual steps.
###############################################################################

resource "aws_route53_zone" "main" {
  name = "structra.cloud"
}

resource "aws_acm_certificate" "main" {
  provider                  = aws.us_east_1
  domain_name               = "structra.cloud"
  subject_alternative_names = ["*.structra.cloud"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.acm_validation : r.fqdn]
}

###############################################################################
# Zoho Mail MX. These were never in Terraform and so did not survive the move
# of the zone to this account; without them inbound mail to @structra.cloud
# bounces. Zoho India data centre (the account uses smtp.zoho.in and
# include:zoho.in), whose MX hosts are mx/mx2/mx3.zoho.in.
###############################################################################

resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "structra.cloud"
  type    = "MX"
  ttl     = 300
  records = [
    "10 mx.zoho.in",
    "20 mx2.zoho.in",
    "50 mx3.zoho.in",
  ]
}

###############################################################################
# Email authentication - SPF, DMARC
# DKIM: generate the key in the Zoho Mail admin panel
# (Mail Admin → Email Authentication → DKIM) and add the record manually
# or add a aws_route53_record.dkim resource below once you have the key.
###############################################################################

resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "structra.cloud"
  type    = "TXT"
  ttl     = 300
  records = [
    "v=spf1 include:zoho.in ~all"
  ]
}

resource "aws_route53_record" "dkim" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "zoho._domainkey.structra.cloud"
  type    = "TXT"
  ttl     = 300
  records = [
    "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCi/Yw/RqDETj/JUXiOEfkJJ5L1CG/Vqroj/3VROh6dqchtEz5qZrk9Qk3pgkcYtXneNmDAfdjawevHo0dAZUnz2b143ZvVC9aFPR1X5HYn6EOSxrvELEzd6w/4Hw35UNqT6mDXir5S4ulth5HzpcNvLbyYSyEFGpiG1f9qNFErzQIDAQAB"
  ]
}

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.structra.cloud"
  type    = "TXT"
  ttl     = 300
  records = [
    "v=DMARC1; p=quarantine; rua=mailto:support@structra.cloud; adkim=r; aspf=r"
  ]
}

###############################################################################
# Cognito hosted UI (auth.structra.cloud)
# Cognito fronts a custom hosted-UI domain with its own CloudFront distribution,
# so this is an ALIAS A record against CloudFront's fixed zone ID.
###############################################################################

resource "aws_route53_record" "cognito_auth" {
  count = var.create_cognito_hosted_ui_domain ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = var.cognito_hosted_ui_domain
  type    = "A"

  alias {
    name                   = module.cognito.hosted_ui_cloudfront_domain
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}
