###############################################################################
# Private docs bucket (static Docusaurus build). Same pattern as the frontend
# bucket: private + OAC, CloudFront in the compute stack does the serving.
###############################################################################

resource "aws_s3_bucket" "docs" {
  bucket = var.docs_bucket_name
  tags   = { Name = "${var.name_prefix}-docs" }
}

resource "aws_s3_bucket_public_access_block" "docs" {
  bucket                  = aws_s3_bucket.docs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "docs" {
  bucket = aws_s3_bucket.docs.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}
