###############################################################################
# Public assets bucket — company logo, user profile pictures, and other
# static user-uploaded or brand assets. Objects are publicly readable so
# they can be embedded in emails and displayed in the frontend without auth.
###############################################################################

resource "aws_s3_bucket" "assets" {
  bucket = "structra-assets-${data.aws_caller_identity.current.account_id}"
  tags   = { Name = "${var.name_prefix}-assets" }
}

resource "aws_s3_bucket_ownership_controls" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "assets_public_read" {
  bucket     = aws_s3_bucket.assets.id
  depends_on = [aws_s3_bucket_public_access_block.assets]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicRead"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.assets.arn}/*"
    }]
  })
}

resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET"]
    allowed_origins = ["https://structra.cloud", "https://www.structra.cloud"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
