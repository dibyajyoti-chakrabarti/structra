terraform {
  backend "s3" {
    bucket         = "structra-tfstate-042843883108-ap-south-1"
    key            = "structra/20-data.tfstate"
    region         = "ap-south-1"
    profile        = "structra-admin"
    dynamodb_table = "structra-tflock"
    encrypt        = true
  }
}
