from decimal import Decimal


PLAN_CORE = "CORE"
PLAN_INDIVIDUAL = "INDIVIDUAL"
PLAN_TEAM = "TEAM"
PLAN_ENTERPRISE = "ENTERPRISE"

PLAN_ORDER = (PLAN_CORE, PLAN_INDIVIDUAL, PLAN_TEAM, PLAN_ENTERPRISE)

PLAN_BASE_PRICES = {
    PLAN_CORE: Decimal("0.00"),
    PLAN_INDIVIDUAL: Decimal("599.00"),
    PLAN_TEAM: Decimal("349.00"),
}

INDIVIDUAL_MEMBER_ADDON_PRICE = Decimal("249.00")
TEAM_SEAT_PRICE = Decimal("349.00")

PLAN_WORKSPACE_LIMITS = {
    PLAN_CORE: 1,
    PLAN_INDIVIDUAL: 5,
    PLAN_TEAM: None,
    PLAN_ENTERPRISE: None,
}

PLAN_SYSTEM_LIMITS = {
    PLAN_CORE: 3,
    PLAN_INDIVIDUAL: None,
    PLAN_TEAM: None,
    PLAN_ENTERPRISE: None,
}

# Additional members beyond admin.
PLAN_MEMBER_LIMITS = {
    PLAN_CORE: 0,
    PLAN_INDIVIDUAL: 3,
    PLAN_TEAM: None,
    PLAN_ENTERPRISE: None,
}


def normalize_plan(plan_name):
    normalized = (plan_name or PLAN_CORE).strip().upper()
    if normalized in PLAN_ORDER:
        return normalized
    return PLAN_CORE


def get_workspace_limit_for_user_plan(plan_name):
    return PLAN_WORKSPACE_LIMITS[normalize_plan(plan_name)]


def get_system_limit_for_workspace_plan(plan_name):
    return PLAN_SYSTEM_LIMITS[normalize_plan(plan_name)]


def get_member_limit_for_workspace_plan(plan_name):
    return PLAN_MEMBER_LIMITS[normalize_plan(plan_name)]


def can_workspace_plan_invite_members(plan_name):
    return get_member_limit_for_workspace_plan(plan_name) != 0


def get_workspace_monthly_cost_estimate(plan_name, invited_member_count):
    plan = normalize_plan(plan_name)
    invited = max(int(invited_member_count or 0), 0)

    if plan == PLAN_CORE:
        return PLAN_BASE_PRICES[PLAN_CORE]
    if plan == PLAN_INDIVIDUAL:
        return PLAN_BASE_PRICES[PLAN_INDIVIDUAL] + (INDIVIDUAL_MEMBER_ADDON_PRICE * invited)
    if plan == PLAN_TEAM:
        # Team bills per occupied seat including the admin.
        return TEAM_SEAT_PRICE * (invited + 1)
    return None
