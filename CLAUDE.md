# Structra

## Committing

**Commit progressively as work lands; never push without being told.**

Once a change is complete and verified, commit it. Don't accumulate a large
working tree across a long session and commit it all at the end: a single
sprawling commit is hard to review, hard to revert, and loses the reasoning
behind each step. A good moment to commit is when something works and the next
piece of work is unrelated to it.

Split by intent, not by directory. Infrastructure repointing, a vendored
dependency, a CI change, a bug fix and documentation are separate commits even
when they were done in the same sitting, because they get reverted and reviewed
separately.

`git push` happens only on an explicit instruction. "Commit that" is not
permission to push. This is deliberate: commits are local and cheap to rewrite,
pushes are visible and trigger CI.

Write the commit body to explain *why*, since the diff already shows *what*.
When a change works around an external constraint (an AWS account limit, a
provider bug, a build tool's default), say so in the message, because that is
the part nobody can reconstruct from the code later.

## Infrastructure

Terraform lives in `infra/terraform` as four stacks with independent state.
Read `infra/terraform/README.md` before changing any of it; the first-time
bootstrap has a required order that is not obvious from the code.

AWS work on this project uses the `jan-saathi` CLI profile (account `190084967282`,
`ap-south-1`).

That account is shared with an unrelated project, Jan Saathi. Nothing here may
touch a resource that is not named `structra-*`, and no destroy plan is safe to
run without reading the resource list first. The shared GitHub OIDC provider is
the one exception: it is used by both projects, so it is adopted rather than
created (see `create_github_oidc_provider`).
