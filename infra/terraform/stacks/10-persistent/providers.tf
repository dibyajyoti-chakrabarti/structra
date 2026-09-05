provider "aws" {
  region  = var.region
  profile = var.profile != "" ? var.profile : null

  default_tags {
    tags = {
      Project   = "structra"
      Env       = "prod"
      ManagedBy = "terraform"
      Stack     = "10-persistent"
    }
  }
}

# ACM certificates for CloudFront must be in us-east-1
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = var.profile != "" ? var.profile : null

  default_tags {
    tags = {
      Project   = "structra"
      Env       = "prod"
      ManagedBy = "terraform"
      Stack     = "10-persistent"
    }
  }
}
