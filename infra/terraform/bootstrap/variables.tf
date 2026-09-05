variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "profile" {
  type    = string
  default = "home"
}

variable "state_bucket_name" {
  type    = string
  default = "structra-tfstate-469465348250-ap-south-1"
}

variable "lock_table_name" {
  type    = string
  default = "structra-tflock"
}
