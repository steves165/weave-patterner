# Infrastructure

Terraform for the one piece of Weave Patterner that isn't a static site: the **feedback form's endpoint**, which turns
messages from the apps into GitHub issues. It's built so it can never cost money: see the top of
[`feedback/main.tf`](feedback/main.tf) for how (always-free tiers only, one copy at a time, and a kill switch).

- [`bootstrap/`](bootstrap/): made once by hand. The S3 bucket for Terraform state, GitHub's OIDC provider, and the
  role the [Infrastructure workflow](../.github/workflows/infra.yml) deploys with (main branch only, feedback resources
  only, and roles it makes must carry a permissions boundary).
- [`feedback/`](feedback/): the feedback function (a Lambda function URL), its kill switch, alarm and alert email.
  Deployed by the Infrastructure workflow when it changes on main.

Everything runs with `AWS_PROFILE=weave-patterner` (account 557467970586, eu-west-2).

## The GitHub token

The function opens issues with a fine-grained GitHub token (this repository only, **Issues: Read and write** only),
kept in SSM Parameter Store and never in Terraform. To set or replace it, paste the token at the prompt:

```
read -rs T && aws ssm put-parameter --profile weave-patterner --region eu-west-2 --overwrite \
  --name /weave-patterner/feedback/github-token --type SecureString --value "$T" && unset T
```

A warm function keeps the old token for a while; `terraform apply` (or running the workflow) starts it afresh.

## If the kill switch goes off

More requests than real people send turns the function off (reserved concurrency 0) and emails the alert address.
Feedback then fails with an error in the apps. When it's safe, run the Infrastructure workflow by hand with **apply**
(or `terraform apply` in `feedback/`), which sets it back to 1.

## Plan and apply from GitHub

**Actions › Infrastructure › Run workflow**, then choose **plan** (shows what would change on the run's summary page,
and changes nothing) or **apply**. A push to main that changes `infra/feedback/` plans and applies on its own.

## Working on it locally

```
cd infra/feedback
export AWS_PROFILE=weave-patterner TF_VAR_alert_email=you@example.com   # or a git-ignored terraform.tfvars
terraform init
terraform plan
```

`alert_email` comes from the `ALERT_EMAIL` repository variable in the workflow.

## Setting up from scratch

1. `cd infra/bootstrap`, add a `backend_override.tf` with `terraform { backend "local" {} }`, then
   `terraform init && terraform apply`.
2. Delete `backend_override.tf`, then `terraform init -migrate-state` to move its state into the new bucket.
3. In `infra/feedback`: `terraform init && terraform apply`, then store the GitHub token as above.
4. Set `VITE_FEEDBACK_URL` in `.env.production` to `terraform output -raw feedback_url`.
