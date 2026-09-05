terraform {
  backend "s3" {
    bucket         = "structra-tfstate-190084967282-ap-south-1"
    key            = "structra/20-data.tfstate"
    region         = "ap-south-1"
    profile        = "jan-saathi"
    dynamodb_table = "structra-tflock"
    encrypt        = true
  }
}
