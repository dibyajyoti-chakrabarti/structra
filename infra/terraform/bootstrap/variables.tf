variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "profile" {
  type    = string
  default = "jan-saathi"
}

variable "state_bucket_name" {
  type    = string
  default = "structra-tfstate-190084967282-ap-south-1"
}

variable "lock_table_name" {
  type    = string
  default = "structra-tflock"
}
