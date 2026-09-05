provider "aws" {
  region  = var.region
  profile = var.profile != "" ? var.profile : null

  default_tags {
    tags = {
      Project   = "structra"
      Env       = "prod"
      ManagedBy = "terraform"
      Stack     = "30-compute"
    }
  }
}
