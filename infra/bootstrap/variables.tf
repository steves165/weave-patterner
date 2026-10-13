variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "repo" {
  description = "The GitHub repository whose main branch may deploy (owner/name)."
  type        = string
  default     = "steves165/weave-patterner"
}
