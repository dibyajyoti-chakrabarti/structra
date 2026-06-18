# Structra infrastructure — Terraform operations
#
# Layered stacks (each has its own remote state):
#   bootstrap          one-time: creates the S3 state bucket + DynamoDB lock table
#   stacks/10-persistent   VPC, ECR, IAM roles, Cognito triggers, frontend bucket  (never destroyed)
#   stacks/20-data         RDS                                                     (stop to save cost)
#   stacks/30-compute      NAT instance, Lambdas, SQS, API GW, CloudFront          (stop NAT to save cost)
#
# Cost on/off is `prod-down` / `prod-up` — it STOPS the NAT EC2 + RDS (an operational
# AWS CLI action, NOT terraform). Data is preserved; no `terraform apply` needed to resume.
#
# Override defaults inline, e.g.: make apply-data PROFILE=other REGION=us-east-1

PROFILE ?= structra-admin
REGION  ?= ap-south-1
ACCOUNT ?= 042843883108
TF      ?= terraform
ROOT    := ../..
TAG     ?= latest

PERSIST := stacks/10-persistent
DATA    := stacks/20-data
COMPUTE := stacks/30-compute

# Resolved from state (empty until the relevant stack is applied)
NAT_ID      = $(shell $(TF) -chdir=$(COMPUTE) output -raw nat_instance_id 2>/dev/null)
RDS_ID      = $(shell $(TF) -chdir=$(DATA) output -raw rds_instance_identifier 2>/dev/null)
ECR_BACKEND = $(shell $(TF) -chdir=$(PERSIST) output -raw ecr_backend_repository_url 2>/dev/null)
ECR_WORKER  = $(shell $(TF) -chdir=$(PERSIST) output -raw ecr_worker_repository_url 2>/dev/null)
FE_BUCKET   = $(shell $(TF) -chdir=$(PERSIST) output -raw frontend_bucket_id 2>/dev/null)
BACKEND_FN  = $(shell $(TF) -chdir=$(COMPUTE) output -raw backend_function_name 2>/dev/null)
WORKER_FN   = $(shell $(TF) -chdir=$(COMPUTE) output -raw worker_function_name 2>/dev/null)
CF_DIST     = $(shell $(TF) -chdir=$(COMPUTE) output -raw cloudfront_distribution_id 2>/dev/null)

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_./-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------- bootstrap
.PHONY: bootstrap
bootstrap: ## One-time: create remote-state bucket + lock table (local state)
	$(TF) -chdir=bootstrap init
	$(TF) -chdir=bootstrap apply

# ---------------------------------------------------------------- init
.PHONY: init-all init-persistent init-data init-compute
init-persistent: ; $(TF) -chdir=$(PERSIST) init
init-data: ; $(TF) -chdir=$(DATA) init
init-compute: ; $(TF) -chdir=$(COMPUTE) init
init-all: init-persistent init-data init-compute ## terraform init every stack

# ---------------------------------------------------------------- plan
.PHONY: plan-persistent plan-data plan-compute
plan-persistent: ## Plan the persistent stack
	$(TF) -chdir=$(PERSIST) plan
plan-data: ## Plan the data stack
	$(TF) -chdir=$(DATA) plan
plan-compute: ## Plan the compute stack
	$(TF) -chdir=$(COMPUTE) plan

# ---------------------------------------------------------------- apply
.PHONY: apply-persistent apply-data apply-compute
apply-persistent: ## Apply the persistent stack
	$(TF) -chdir=$(PERSIST) apply
apply-data: ## Apply the data stack (RDS)
	$(TF) -chdir=$(DATA) apply
apply-compute: ## Apply the compute stack
	$(TF) -chdir=$(COMPUTE) apply

# ---------------------------------------------------------------- destroy
.PHONY: destroy-compute destroy-data
destroy-compute: ## Destroy the compute stack (safe — no data)
	$(TF) -chdir=$(COMPUTE) destroy
destroy-data: ## Destroy RDS (guarded). Disable deletion_protection first, then: make destroy-data CONFIRM=yes
	@if [ "$(CONFIRM)" != "yes" ]; then \
	  echo "Refusing. RDS holds data. Set deletion_protection=false, apply, then 'make destroy-data CONFIRM=yes'."; \
	  exit 1; fi
	$(TF) -chdir=$(DATA) destroy
# (No destroy-persistent target by design — VPC/ECR/IAM/Cognito triggers must persist.)

# ---------------------------------------------------------------- cost on/off (stop/start, not TF)
.PHONY: prod-down prod-up prod-status
prod-down: ## Stop NAT instance + RDS to save cost (data preserved)
	@if [ -n "$(NAT_ID)" ]; then aws ec2 stop-instances --instance-ids $(NAT_ID) --profile $(PROFILE) --region $(REGION); else echo "skip: no NAT instance id in state"; fi
	@if [ -n "$(RDS_ID)" ]; then aws rds stop-db-instance --db-instance-identifier $(RDS_ID) --profile $(PROFILE) --region $(REGION); else echo "skip: no RDS id in state"; fi
	@echo "NOTE: a stopped RDS auto-restarts after 7 days — re-run prod-down or schedule a re-stop for long pauses."
prod-up: ## Start RDS then NAT instance
	@if [ -n "$(RDS_ID)" ]; then aws rds start-db-instance --db-instance-identifier $(RDS_ID) --profile $(PROFILE) --region $(REGION); else echo "skip: no RDS id in state"; fi
	@if [ -n "$(NAT_ID)" ]; then aws ec2 start-instances --instance-ids $(NAT_ID) --profile $(PROFILE) --region $(REGION); else echo "skip: no NAT instance id in state"; fi
prod-status: ## Show NAT + RDS power state
	@aws ec2 describe-instances --instance-ids $(NAT_ID) --profile $(PROFILE) --region $(REGION) --query "Reservations[0].Instances[0].State.Name" --output text 2>/dev/null | sed 's/^/NAT:  /' || true
	@aws rds describe-db-instances --db-instance-identifier $(RDS_ID) --profile $(PROFILE) --region $(REGION) --query "DBInstances[0].DBInstanceStatus" --output text 2>/dev/null | sed 's/^/RDS:  /' || true

# ---------------------------------------------------------------- deploy (build + push images / frontend)
.PHONY: ecr-login deploy-backend deploy-worker deploy-frontend
ecr-login:
	aws ecr get-login-password --region $(REGION) --profile $(PROFILE) \
	  | docker login --username AWS --password-stdin $(ACCOUNT).dkr.ecr.$(REGION).amazonaws.com
deploy-backend: ecr-login ## Build+push backend image and update the Lambda
	docker build -f $(ROOT)/backend/Dockerfile.lambda -t $(ECR_BACKEND):$(TAG) $(ROOT)/backend
	docker push $(ECR_BACKEND):$(TAG)
	@if [ -n "$(BACKEND_FN)" ]; then aws lambda update-function-code --function-name $(BACKEND_FN) --image-uri $(ECR_BACKEND):$(TAG) --profile $(PROFILE) --region $(REGION); fi
deploy-worker: ecr-login ## Build+push worker image and update the Lambda
	docker build -f $(ROOT)/worker/Dockerfile.lambda -t $(ECR_WORKER):$(TAG) $(ROOT)
	docker push $(ECR_WORKER):$(TAG)
	@if [ -n "$(WORKER_FN)" ]; then aws lambda update-function-code --function-name $(WORKER_FN) --image-uri $(ECR_WORKER):$(TAG) --profile $(PROFILE) --region $(REGION); fi
deploy-frontend: ## Build frontend (needs VITE_* env) and sync to S3 + invalidate CloudFront
	npm --prefix $(ROOT)/frontend run build
	aws s3 sync $(ROOT)/frontend/dist s3://$(FE_BUCKET) --delete --profile $(PROFILE) --region $(REGION)
	@if [ -n "$(CF_DIST)" ]; then aws cloudfront create-invalidation --distribution-id $(CF_DIST) --paths "/*" --profile $(PROFILE) --region $(REGION); fi

# ---------------------------------------------------------------- quality
.PHONY: fmt validate
fmt: ## terraform fmt the whole tree
	$(TF) fmt -recursive
validate: ## terraform validate each stack
	@for d in $(PERSIST) $(DATA) $(COMPUTE); do echo "== $$d =="; $(TF) -chdir=$$d validate; done
