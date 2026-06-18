###############################################################################
# Private frontend bucket (static SPA assets). The OAC bucket policy that lets
# CloudFront read it is attached by the compute stack's frontend-cdn module.
###############################################################################

resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
  tags   = { Name = "${var.name_prefix}-frontend" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}
