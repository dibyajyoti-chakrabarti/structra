data "terraform_remote_state" "persistent" {
  backend = "s3"
  config = {
    bucket = "structra-tfstate-190084967282-ap-south-1"
    key    = "structra/10-persistent.tfstate"
    region = "ap-south-1"
  }
}

data "terraform_remote_state" "data" {
  backend = "s3"
  config = {
    bucket = "structra-tfstate-190084967282-ap-south-1"
    key    = "structra/20-data.tfstate"
    region = "ap-south-1"
  }
}
