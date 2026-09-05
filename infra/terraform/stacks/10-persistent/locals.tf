locals {
  # Repo root, four levels up from this stack dir
  # (10-persistent -> stacks -> terraform -> infra -> repo root).
  repo_root   = abspath("${path.root}/../../../..")
  lambdas_dir = "${local.repo_root}/lambdas"

  # Built by `make shim-build` before apply. Terraform zips this directory.
  shim_dist_dir = "${local.repo_root}/services/github-oidc-shim/dist-lambda"
}
