terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.60"
    }
  }

  # In the bucket this makes (applied once with local state, then moved: see README.md).
  backend "s3" {
    bucket       = "weave-patterner-terraform-state-557467970586"
    key          = "bootstrap/terraform.tfstate"
    region       = "eu-west-2"
    encrypt      = true
    use_lockfile = true
  }
}

# Credentials from the environment: AWS_PROFILE=weave-patterner here.
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "weave-patterner"
      Component = "terraform-ci"
      ManagedBy = "terraform:infra/bootstrap"
    }
  }
}
