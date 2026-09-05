terraform {
  backend "s3" {
    bucket         = "structra-tfstate-469465348250-ap-south-1"
    key            = "structra/30-compute.tfstate"
    region         = "ap-south-1"
    profile        = "home"
    dynamodb_table = "structra-tflock"
    encrypt        = true
  }
}
