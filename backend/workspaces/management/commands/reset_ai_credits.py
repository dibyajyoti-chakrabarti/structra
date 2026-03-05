from django.core.management.base import BaseCommand
from django.utils import timezone

from workspaces.credit_service import ensure_workspace_credit_state
from workspaces.models import Workspace


class Command(BaseCommand):
    help = "Reset monthly AI credits for workspaces whose billing cycle has elapsed."

    def handle(self, *args, **options):
        now = timezone.now()
        updated = 0

        for workspace in Workspace.objects.select_related("owner").iterator():
            prior_remaining = workspace.ai_credits_remaining
            prior_reset_at = workspace.ai_credits_reset_at
            should_reset = prior_reset_at is None or now >= prior_reset_at
            ensure_workspace_credit_state(workspace, now=now, force_reset=should_reset)
            if should_reset or workspace.ai_credits_remaining != prior_remaining:
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Processed {updated} workspace credit states."))
