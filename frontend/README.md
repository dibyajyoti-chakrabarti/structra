# Structra Cloud Frontend

React + Vite frontend for `structra.cloud`.

This app powers the full end-user experience for Structra Cloud: authentication, onboarding, workspace/system management, collaborative system design, evaluations, audit visibility, invitations, and billing flows.

## Tech Stack

- React 19 + Vite
- React Router
- Tailwind CSS v4
- Axios (with JWT refresh + client-side response caching)
- Google OAuth (`@react-oauth/google`)
- Razorpay checkout integration

## What The Frontend Supports

### Authentication and Account Access

- Email/password login
- Email OTP login and signup verification
- Google sign-in
- GitHub OAuth sign-in
- Password reset request + token validation + reset completion
- Automatic JWT refresh and forced logout when refresh fails

### Onboarding and User Profile

- First-time onboarding questionnaire
- Profile editing:
  - full name
  - username (with availability checks)
  - role and organization metadata
- Public profile pages by username

### Workspace Discovery and Management

- Workspace home dashboard (`/app`) with:
  - owned/member workspace listing
  - starred workspace section
- Discover page for public workspaces (`/app/discover`)
- Workspace starring/unstarring from multiple screens
- Create workspace flow with:
  - name/description/visibility
  - initial invitation sending
- Workspace-level views:
  - overview
  - evaluations list
  - settings

### Workspace Settings Surface

- General settings
  - rename workspace
  - update description
  - delete workspace
- Team settings
  - list members
  - invite members by email
  - remove member
  - cancel pending invitation
- Security settings
  - workspace visibility controls
  - per-system visibility controls
  - per-system permission grant/revoke
- Logs settings
  - audit summary cards
  - filtered audit event listing

### System (Canvas) Design and Collaboration

- Create systems in a workspace
- Open system canvas editor
- Autosave of canvas state
- Permission-aware read/edit access
- Comment threads on systems:
  - create
  - reply
  - edit
  - delete
- Presentation mode for systems (`/present`)

### Evaluation Experience

- Trigger system evaluations from canvas data
- Track evaluation run status/history
- Show evaluation summaries, scores, and structured findings
- Surface insight token status and consumption feedback
- Workspace evaluation history panels

### Notifications and Invitations

- Admin notification feed (audit-backed)
- Mark one / mark all notifications read
- Invitation flow:
  - invitation details fetch by token
  - accept / reject invitation
  - authenticated redirect handling

### Pricing and Payments UX

- Public pricing page
- In-app checkout initiation
- Razorpay subscription flow integration
- Payment verification handling
- Plan cancellation requests
- Plan expiry banner for user awareness

### Reliability and UX Guardrails

- Backend health check before app bootstraps
- Full-screen "server down" fallback UI when API is unavailable
- Unauthorized and not-found route handling
- Route protection for authenticated app areas
- API GET response cache with invalidation on mutations

## Routes Overview

### Public Routes

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/auth/github/callback`
- `/pricing`
- `/privacy`
- `/terms`
- `/invite/:token`
- `/invite/:token/respond`

### Protected App Routes

- `/app`
- `/app/home`
- `/app/onboarding`
- `/app/discover`
- `/app/profile`
- `/app/users/:username`
- `/app/notifications`
- `/app/create-workspace`
- `/app/ws/:workspaceId`
- `/app/ws/:workspaceId/create-system`
- `/app/ws/:workspaceId/evaluations`
- `/app/ws/:workspaceId/settings`
- `/app/ws/:workspaceId/settings/team`
- `/app/ws/:workspaceId/settings/security`
- `/app/ws/:workspaceId/settings/logs`
- `/app/ws/:workspaceId/systems/:systemId`
- `/app/ws/:workspaceId/systems/:systemId/evaluate`
- `/app/ws/:workspaceId/systems/:systemId/present`

## Environment Variables

Create `frontend/.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/
VITE_FRONTEND_URL=http://localhost:5173
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GITHUB_CLIENT_ID=your_github_oauth_client_id
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

## Build and Preview

```bash
npm run build
npm run preview
```

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - serve production build locally
- `npm run lint` - run ESLint
