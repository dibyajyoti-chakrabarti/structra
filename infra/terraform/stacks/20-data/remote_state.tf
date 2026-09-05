data "terraform_remote_state" "persistent" {
  backend = "s3"
  config = {
    bucket  = "structra-tfstate-190084967282-ap-south-1"
    key     = "structra/10-persistent.tfstate"
    region  = "ap-south-1"
    profile = "jan-saathi"
  }
}
