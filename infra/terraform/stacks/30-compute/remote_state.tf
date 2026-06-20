data "terraform_remote_state" "persistent" {
  backend = "s3"
  config = {
    bucket  = "structra-tfstate-042843883108-ap-south-1"
    key     = "structra/10-persistent.tfstate"
    region  = "ap-south-1"
    profile = "structra"
  }
}

data "terraform_remote_state" "data" {
  backend = "s3"
  config = {
    bucket  = "structra-tfstate-042843883108-ap-south-1"
    key     = "structra/20-data.tfstate"
    region  = "ap-south-1"
    profile = "structra"
  }
}
