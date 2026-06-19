provider "aws" {
  region  = var.region
  profile = var.profile

  default_tags {
    tags = {
      Project   = "structra"
      Env       = "prod"
      ManagedBy = "terraform"
      Stack     = "30-compute"
    }
  }
}
