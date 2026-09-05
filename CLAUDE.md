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

AWS work on this project uses the `home` CLI profile (account `469465348250`,
`ap-south-1`).
