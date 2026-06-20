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
# Email authentication — SPF, DMARC
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

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.structra.cloud"
  type    = "TXT"
  ttl     = 300
  records = [
    "v=DMARC1; p=quarantine; rua=mailto:support@structra.cloud; adkim=r; aspf=r"
  ]
}
