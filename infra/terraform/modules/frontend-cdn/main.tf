###############################################################################
# CloudFront (OAC) in front of the private frontend S3 bucket.
# SPA routing: 403/404 from S3 are rewritten to /index.html (200).
###############################################################################

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_function" "www_redirect" {
  name    = "${var.name_prefix}-www-redirect"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/www_redirect.js")
}

resource "aws_cloudfront_function" "static_path_index" {
  count   = length(var.extra_s3_origins) > 0 ? 1 : 0
  name    = "${var.name_prefix}-static-path-index"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/static_path_index.js")
}

resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "${var.name_prefix}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = var.default_root_object
  price_class         = var.price_class
  comment             = "${var.name_prefix} frontend"
  tags                = var.tags
  aliases             = var.aliases

  origin {
    origin_id                = "s3-frontend"
    domain_name              = var.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  dynamic "origin" {
    for_each = var.extra_s3_origins
    content {
      origin_id                = origin.value.origin_id
      domain_name              = origin.value.bucket_regional_domain_name
      origin_access_control_id = aws_cloudfront_origin_access_control.this.id
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.extra_s3_origins
    content {
      path_pattern           = ordered_cache_behavior.value.path_pattern
      target_origin_id       = ordered_cache_behavior.value.origin_id
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD"]
      cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
      compress               = true

      function_association {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.static_path_index[0].arn
      }
    }
  }

  # "documentation/*" doesn't match the bare "/documentation" request (no
  # trailing slash), which would otherwise fall through to the default (SPA)
  # behavior. This exact-match behavior catches it; the function above then
  # rewrites it to the prefix's index.html.
  dynamic "ordered_cache_behavior" {
    for_each = var.extra_s3_origins
    content {
      path_pattern           = trimsuffix(ordered_cache_behavior.value.path_pattern, "/*")
      target_origin_id       = ordered_cache_behavior.value.origin_id
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD"]
      cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
      compress               = true

      function_association {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.static_path_index[0].arn
      }
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.www_redirect.arn
    }
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == null
    acm_certificate_arn            = var.acm_certificate_arn
    ssl_support_method             = var.acm_certificate_arn != null ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != null ? "TLSv1.2_2021" : null
  }
}

# Allow only this distribution (via OAC) to read the bucket.
data "aws_iam_policy_document" "bucket" {
  statement {
    sid       = "AllowCloudFrontOAC"
    actions   = ["s3:GetObject"]
    resources = ["${var.bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = var.bucket_id
  policy = data.aws_iam_policy_document.bucket.json
}

data "aws_iam_policy_document" "extra" {
  for_each = { for o in var.extra_s3_origins : o.origin_id => o }

  statement {
    sid       = "AllowCloudFrontOAC"
    actions   = ["s3:GetObject"]
    resources = ["${each.value.bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "extra" {
  for_each = { for o in var.extra_s3_origins : o.origin_id => o }
  bucket   = each.value.bucket_id
  policy   = data.aws_iam_policy_document.extra[each.key].json
}
