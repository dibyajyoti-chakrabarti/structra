variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "profile" {
  type    = string
  default = "structra-admin"
}

variable "state_bucket_name" {
  type    = string
  default = "structra-tfstate-042843883108-ap-south-1"
}

variable "lock_table_name" {
  type    = string
  default = "structra-tflock"
}
