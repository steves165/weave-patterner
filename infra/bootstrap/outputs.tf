output "ci_role_arn" {
  description = "The role .github/workflows/infra.yml takes (AWS_ROLE_ARN)."
  value       = aws_iam_role.ci.arn
}

output "state_bucket" {
  value = aws_s3_bucket.state.bucket
}

output "permissions_boundary_arn" {
  description = "Every role infra/feedback makes must carry this (var.permissions_boundary there)."
  value       = aws_iam_policy.boundary.arn
}
