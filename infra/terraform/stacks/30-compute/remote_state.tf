data "terraform_remote_state" "persistent" {
  backend = "s3"
  config = {
    bucket  = "structra-tfstate-469465348250-ap-south-1"
    key     = "structra/10-persistent.tfstate"
    region  = "ap-south-1"
    profile = "home"
  }
}

data "terraform_remote_state" "data" {
  backend = "s3"
  config = {
    bucket  = "structra-tfstate-469465348250-ap-south-1"
    key     = "structra/20-data.tfstate"
    region  = "ap-south-1"
    profile = "home"
  }
}
