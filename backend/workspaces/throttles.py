from rest_framework.throttling import SimpleRateThrottle


class AnonymousPublicWorkspaceSearchThrottle(SimpleRateThrottle):
    scope = "public_workspace_search_anon"

    def get_cache_key(self, request, view):
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return None

        ident = self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}
