from django.core.management.base import BaseCommand

from accounts.downgrade_service import enforce_expired_plan_constraints
from accounts.models import User
from accounts.plan_utils import get_plan_access_state


class Command(BaseCommand):
    help = "Apply post-grace plan expiry enforcement and core constraints."

    def handle(self, *args, **options):
        enforced = 0
        skipped = 0

        users = User.objects.exclude(current_plan=User.CurrentPlan.CORE).only(
            "user_id",
            "current_plan",
            "plan_expires_at",
        )
        for user in users.iterator():
            access_state = get_plan_access_state(user)
            if access_state["state"] != "enforcement_due":
                skipped += 1
                continue

            enforce_expired_plan_constraints(user=user)
            enforced += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Expiry enforcement complete. enforced={enforced}, skipped={skipped}."
            )
        )
