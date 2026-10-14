terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.60"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }

  # In the state bucket made by infra/bootstrap (S3's own locking, no DynamoDB). The state holds no secrets: the GitHub
  # token is only in SSM Parameter Store.
  backend "s3" {
    bucket       = "weave-patterner-terraform-state-557467970586"
    key          = "feedback/terraform.tfstate"
    region       = "eu-west-2"
    encrypt      = true
    use_lockfile = true
  }
}

# Credentials from the environment: AWS_PROFILE=steves165 here, the CI role in .github/workflows/infra.yml.
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "weave-patterner"
      Component = "feedback"
      ManagedBy = "terraform:infra/feedback"
    }
  }
}
