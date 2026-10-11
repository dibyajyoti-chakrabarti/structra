# The database. Postgres is the only stateful piece of the whole stack: it also carries the
# evaluation job queue, so there is no separate queue service to provision.
resource "neon_project" "structra" {
  name      = "structra"
  region_id = var.neon_region

  branch {
    name          = "main"
    database_name = "structra"
    role_name     = "structra_owner"
  }
}

# Not managed here: the structra-assets storage bucket and its credential. The Neon provider
# has no resource for branchable object storage, so they were created through the Neon API.
# See README.md for what to recreate if the project is ever rebuilt.
