module "frontend_cdn" {
  source = "../../modules/frontend-cdn"

  name_prefix                 = var.name_prefix
  bucket_id                   = data.terraform_remote_state.persistent.outputs.frontend_bucket_id
  bucket_arn                  = data.terraform_remote_state.persistent.outputs.frontend_bucket_arn
  bucket_regional_domain_name = data.terraform_remote_state.persistent.outputs.frontend_bucket_regional_domain_name
  price_class                 = var.cloudfront_price_class
  aliases                     = ["structra.cloud", "www.structra.cloud"]
  acm_certificate_arn         = data.terraform_remote_state.persistent.outputs.acm_certificate_arn
}
