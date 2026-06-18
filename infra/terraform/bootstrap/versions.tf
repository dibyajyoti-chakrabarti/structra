terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
  # No backend block: bootstrap uses LOCAL state because it creates the
  # bucket/table that the other stacks use for their remote state.
}
