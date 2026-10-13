variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "repo" {
  description = <<-EOT
    The GitHub repository whose main branch may deploy, as its OIDC tokens name it. This repository uses immutable
    subjects (owner@id/name@id), so a renamed or recreated repository of the same name can't take the role. See
    `gh api repos/steves165/weave-patterner/actions/oidc/customization/sub`.
  EOT
  type        = string
  default     = "steves165@2880364/weave-patterner@1409461912"
}
