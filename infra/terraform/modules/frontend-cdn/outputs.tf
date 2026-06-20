output "distribution_id" {
  value = aws_cloudfront_distribution.this.id
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.this.arn
}

output "domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "url" {
  value = "https://${aws_cloudfront_distribution.this.domain_name}"
}

output "oac_id" {
  value = aws_cloudfront_origin_access_control.this.id
}

output "canonical_url" {
  description = "Preferred public URL: first custom alias if set, otherwise the CloudFront distribution URL"
  value = length(var.aliases) > 0 ? "https://${var.aliases[0]}" : "https://${aws_cloudfront_distribution.this.domain_name}"
}
