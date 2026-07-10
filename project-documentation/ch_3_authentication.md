# Chapter 3 — Authentication

Authentication is handled by **AWS Cognito** with five custom Lambda triggers. The backend validates Cognito JWTs on every API request. Three login methods are supported: email OTP, Google OAuth, and GitHub OAuth.

---

## Cognito User Pool

- **Pool ID:** `ap-south-1_QD5vjF5ej`
- **App client:** `structra-web` (public SPA client, no client secret)
- **Hosted UI domain:** `structra-auth.auth.ap-south-1.amazoncognito.com`
- **Region:** `ap-south-1`

The pool was **imported** into Terraform (not recreated) to preserve the pool ID, app-client ID, hosted UI domain, and triggers. Terraform now manages it fully via `modules/cognito` (see [Chapter 6](./ch_6_infrastructure.md)).

---

## Login Methods

### 1. Email OTP (Passwordless)

Cognito's custom auth challenge flow with five trigger Lambdas:

```
Browser → POST /api/auth/email-otp/initiate/  (email address)
Backend → Cognito.initiateAuth(CUSTOM_AUTH)
              ↓ DefineAuth trigger
Cognito → CREATE_CHALLENGE
              ↓ CreateAuth trigger
Lambda  → generates 6-digit OTP, sends email via Zoho SMTP
              ↓ returns to Cognito
Cognito → challenge sent to user

Browser → POST /api/auth/email-otp/verify/  (email + OTP)
Backend → Cognito.respondToAuthChallenge(CUSTOM_CHALLENGE, OTP)
              ↓ VerifyAuth trigger
Lambda  → compares OTP from private challenge params
Cognito → authentication success → returns tokens (accessToken, idToken, refreshToken)
Backend → returns tokens to browser
```

OTP email is a styled HTML email with a 10-minute expiry. Template is embedded in `lambdas/create_auth.py`.

### 2. Google OAuth

- Cognito native **Google IdP**
- Configured with Google OAuth client ID + secret (stored in SSM, `ignore_changes`d in Terraform)
- Cognito handles the OAuth callback; the browser receives Cognito tokens

### 3. GitHub OAuth

GitHub is OAuth2, not OIDC. Cognito cannot federate it directly, so a shim is used:

- **`github-cognito-openid-wrapper`** — an API Gateway + 5 Lambda stack that exposes standard OIDC endpoints (discovery document, JWKS, token exchange, userinfo)
- **Imported** from the original CloudFormation stack (`modules/github-oidc-shim/import.sh`) — the issuer URL and the Lambdas' embedded RSA signing key are preserved
- Cognito's GitHub IdP points its `oidc_issuer` at the shim URL
- The shim Lambda code is **not managed** by Terraform (the bundle embeds the RSA key; no source repo)

---

## Cognito Trigger Lambdas

All five live in `lambdas/` and are managed in Terraform under `modules/cognito`.

| Lambda | Cognito Trigger | Purpose |
|---|---|---|
| `pre_signup.py` | Pre-signup | Block duplicate emails from different IdPs; normalize sign-up flow |
| `post_confirmation.py` | Post-confirmation | Create or link the Django user record after Cognito confirms a user |
| `define_auth.py` | Define Auth Challenge | Route the auth flow: tell Cognito to create/verify a custom challenge |
| `create_auth.py` | Create Auth Challenge | Generate 6-digit OTP; send branded HTML email via Zoho SMTP |
| `verify_auth.py` | Verify Auth Challenge | Compare submitted OTP against `privateChallengeParameters.otp` |

**Timeouts:** `define_auth`, `create_auth`, `verify_auth`, `pre_signup` run at 3 seconds; `post_confirmation` at 10 seconds (needs to provision the Django user, may make a DB call).

**Log retention:** trigger Lambda log groups have no expiry (declared explicitly in Terraform to avoid drift).

---

## JWT Validation in the Backend

This is the canonical treatment — `accounts/authentication.py`'s `CognitoJWTAuthentication` class runs on **every authenticated API request** (referenced from [Chapter 4](./ch_4_backend_service.md#authentication)):

1. **Extract** `Authorization: Bearer <token>` header
2. **Fetch JWKS** from `https://cognito-idp.ap-south-1.amazonaws.com/{pool_id}/.well-known/jwks.json`
   - Result is `@lru_cache`d in-process (cleared on Lambda cold start)
   - Fetch goes through the NAT instance (backend is in private VPC subnet)
3. **Match** the JWT's `kid` header to the JWKS key
4. **Verify** signature using `RSAAlgorithm.from_jwk(key)` with `algorithms=['RS256']`
5. **Look up** Django `User` by `cognito_sub` claim
6. **Provision** new user if not found (from `email`, `name` claims in token)
7. **Enforce** plan expiry via `enforce_plan_expiry(user)`

Token `aud` verification is disabled (`verify_aud: False`) because Cognito access tokens don't carry the `aud` claim in the same way as ID tokens.

---

## User Provisioning

On first successful login for a new account, the backend auto-provisions the Django user:

```python
user = User.objects.create_user(
    email=email,
    username=generate_unique_username(email.split('@')[0]),
    password=None,          # no local password — Cognito owns auth
    full_name=full_name,
    cognito_sub=cognito_sub,
)
```

If a user with that email already exists (e.g. migrated from a previous auth system), the existing account is linked by setting `cognito_sub` on it.

---

## Plan Enforcement

`enforce_plan_expiry(user)` runs on every authenticated request:
- If `plan_expires_at` is set and in the past → downgrades the user to CORE plan
- Applies any workspace-level effects (seat limit reduction, credit reset) via `services/downgrade.py`
- Returns the updated user object

---

## SMTP / Email

Cognito OTP emails are sent from the `create_auth` Lambda using **Zoho SMTP**:

| Setting | Value |
|---|---|
| Host | `smtp.zoho.in` |
| Port | `587` (STARTTLS) |
| From | `Structra <support@structra.cloud>` |
| Password source | SSM `/structra/prod/smtp_password` → Lambda env var `SMTP_PASS` |

The email is a branded HTML template with a `{otp}` substitution and a plain-text fallback. OTP expires in 10 minutes (enforced by Cognito challenge expiry configuration).

Zoho SMTP is also used by the backend directly for transactional emails like workspace invitations — same infrastructure, different call site (see [Chapter 4](./ch_4_backend_service.md#email)).

---

## Terraform Notes

- `generate_secret` and IdP `client_secret`s are in `ignore_changes` — Cognito never returns them on read, so Terraform would incorrectly plan to remove them
- The `email` schema attribute is declared explicitly to match the live pool (import fidelity)
- Per-function Lambda timeouts (3s/10s) are declared to avoid drift
- All trigger code lives in `lambdas/*.py`; synced byte-for-byte from live on import

---

**See also:** [Chapter 2 — System Architecture](./ch_2_architecture.md#aws-cognito) for how Cognito fits the wider system · [Chapter 4 — Backend Service](./ch_4_backend_service.md) for the auth API endpoints that call into this flow.
