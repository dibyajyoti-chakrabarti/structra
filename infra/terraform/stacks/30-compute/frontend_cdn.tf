module "frontend_cdn" {
  source = "../../modules/frontend-cdn"

  name_prefix                 = var.name_prefix
  bucket_id                   = data.terraform_remote_state.persistent.outputs.frontend_bucket_id
  bucket_arn                  = data.terraform_remote_state.persistent.outputs.frontend_bucket_arn
  bucket_regional_domain_name = data.terraform_remote_state.persistent.outputs.frontend_bucket_regional_domain_name
  price_class                 = var.cloudfront_price_class
  aliases                     = var.attach_frontend_aliases ? [var.frontend_domain, "www.${var.frontend_domain}"] : []
  acm_certificate_arn         = data.terraform_remote_state.persistent.outputs.acm_certificate_arn

  # docs.structra.cloud's CNAME is stuck on an orphaned Amplify distribution
  # in the old, inaccessible AWS account; AssociateAlias refuses to move
  # names off an Amplify-owned distribution even cross-account. Serving the
  # docs under a path on the domain we already own sidesteps that entirely.
  extra_s3_origins = [{
    origin_id                   = "s3-docs"
    path_pattern                = "documentation/*"
    bucket_id                   = data.terraform_remote_state.persistent.outputs.docs_bucket_id
    bucket_arn                  = data.terraform_remote_state.persistent.outputs.docs_bucket_arn
    bucket_regional_domain_name = data.terraform_remote_state.persistent.outputs.docs_bucket_regional_domain_name
  }]
}
