"""
Google and GitHub social login are now federated through AWS Cognito
(Google as a native social IdP; GitHub via the OIDC wrapper).
The Django backend no longer handles OAuth code/token exchange for these providers.
"""
