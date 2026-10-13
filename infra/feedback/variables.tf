variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "repo" {
  description = "The GitHub repository the feedback becomes issues in (owner/name)."
  type        = string
  default     = "steves165/weave-patterner"
}

variable "token_parameter" {
  description = <<-EOT
    The SSM Parameter Store parameter (standard tier, SecureString) holding a fine-grained GitHub token with only
    Issues: read and write on the repo. Made by hand, so the token never passes through Terraform or its state.
  EOT
  type        = string
  default     = "/weave-patterner/feedback/github-token"
}

variable "allowed_origins" {
  description = "Where the form may be sent from: the site, and the desktop app."
  type        = list(string)
  default     = ["https://weave-patterner.com", "app://patterner"]
}

variable "max_requests_per_5_minutes" {
  description = <<-EOT
    The kill switch: more requests than this in 5 minutes turns the function off (concurrency 0) until the next
    `terraform apply`. Real feedback is a few messages a day; a flood is stopped far below the free million a month.
  EOT
  type        = number
  default     = 30
}

variable "alert_email" {
  description = "Told when the kill switch turns the function off (confirm the subscription email from AWS first)."
  type        = string
}
