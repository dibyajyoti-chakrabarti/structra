locals {
  # Repo root, four levels up from this stack dir
  # (10-persistent -> stacks -> terraform -> infra -> repo root).
  repo_root   = abspath("${path.root}/../../../..")
  lambdas_dir = "${local.repo_root}/lambdas"
}
