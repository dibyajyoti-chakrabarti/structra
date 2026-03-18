# Structra Frontend

## Overview

Structra Frontend is the React application that powers the end-user product experience for `structra.cloud`. It is responsible for public marketing pages, account access, onboarding, workspace navigation, collaborative system design, evaluation consumption, invitation handling, and billing interactions.

This layer is intentionally isolated to handle:
- Client-side routing and page composition
- Authenticated and public user experience
- UI state, request orchestration, and session continuity
- Visualization of backend-owned data such as workspaces, systems, comments, evaluations, logs, and subscription state

It does **not** own business persistence, authorization rules, audit storage, evaluation execution, or payment verification. Those responsibilities stay in the backend.

---

## High-Level Frontend Flow

1. A visitor lands on the public marketing experience
2. The app checks backend health before rendering the main product surface
3. A user signs in, signs up, or completes an OAuth / OTP / reset flow
4. Authenticated users enter the app workspace shell
5. Users create or discover workspaces and open systems
6. Canvas editing, evaluation, invitations, notifications, settings, and billing actions are performed through backend APIs
7. The frontend renders current state, access boundaries, feedback, and error handling around those actions

---

## Application Features & Functional Breakdown

---

## 1. Logged-Out Experience

When a visitor is not authenticated, the frontend exposes the public platform surface without granting access to protected product state.

### Available Capabilities
- View the landing page
- Open pricing, privacy, and terms pages
- Start login and signup flows
- Complete password reset flows
- Complete GitHub OAuth callback handling
- Open invitation entry links

### UI Responsibilities
- Public navigation and footer
- Product positioning and feature communication
- Clear call-to-action paths into authentication or pricing
- Redirect authenticated users away from public auth pages

---

## 2. Backend Availability Guard

Before the product shell loads, the frontend performs an API health check against `/api/health/`.

### Behavior
- Shows a lightweight loading screen during initial health verification
- Polls backend health at intervals
- Switches to a dedicated server-down screen if the API is unavailable

### Design Rationale
- Prevents broken authenticated flows from partially rendering
- Gives users explicit feedback instead of silent request failures

---

## 3. Authentication & Session Experience

Authentication is exposed through multiple entry paths while preserving a single authenticated app shell.

### Supported Access Flows
- Email and password login
- Email and password signup
- Email OTP request and verification
- Google OAuth login
- GitHub OAuth login
- Password reset request, validation, and completion

### Session Handling
- JWT-based authenticated API usage
- Automatic token refresh on protected requests
- Forced logout when refresh fails or session becomes invalid
- Route protection for all `/app` surfaces

---

## 4. Onboarding & User Profile

The frontend guides first-time users into the product and exposes profile management after account creation.

### Available Capabilities
- First-time onboarding questionnaire
- Profile editing for account metadata
- Username updates with availability validation
- Public user profile viewing by username

### Purpose
- Capture initial user intent
- Improve identity clarity inside collaborative workspaces
- Support discoverability through shareable public profiles

---

## 5. Workspace Discovery & Workspace Home

The workspace area is the main organizational shell of the application.

### Available Capabilities
- View personal workspace dashboard
- Browse owned and joined workspaces
- View starred workspaces
- Discover public workspaces
- Star and unstar workspaces
- Create new workspaces

### Workspace Creation Inputs
- Workspace name
- Description
- Visibility
- Initial team invitations

### UX Goals
- Keep navigation centered around workspaces as the unit of collaboration
- Separate private team work from discoverable public examples

---

## 6. Workspace Instance & Settings Surface

Once inside a workspace, the frontend exposes scoped navigation for operational management.

### Workspace-Level Areas
- Overview
- Evaluations
- Settings

### Settings Breakdown

#### General Settings
- Rename workspace
- Update description
- Delete workspace

#### Team Settings
- View members
- Invite collaborators by email
- Remove members
- Review and cancel pending invitations

#### Security Settings
- Manage workspace visibility
- Review system access controls
- Grant and revoke per-system permissions

#### Logs Settings
- View audit summary cards
- Browse filtered audit event history

### Isolation Boundary
- The frontend renders controls and state
- The backend remains responsible for authorization enforcement and mutation validity

---

## 7. System Design & Canvas Collaboration

The canvas experience is the core interactive design surface for Structra.

### Available Capabilities
- Create systems inside a workspace
- Open a full canvas editor for an individual system
- Persist canvas graph changes through autosave
- Respect view/edit permissions from backend policy
- Open presentation mode for a system

### Collaboration Features
- Comment on systems
- Reply to comments
- Edit comments
- Delete comments

### UX Responsibilities
- Keep canvas interactions responsive
- Surface collaboration context around the same system artifact
- Separate editing mode from presentation mode

---

## 8. Evaluation Experience

Structra’s evaluation workflow is surfaced directly from the system design area.

### Available Capabilities
- Trigger evaluations using current canvas state
- Monitor evaluation run progress
- Display summary, scores, findings, and structured output
- Show workspace evaluation history
- Display insight-token availability and consumption context

### Frontend Role
- Collect and submit evaluation requests
- Visualize backend-produced evaluation output
- Communicate usage limits and run status

---

## 9. Invitations & Notifications

The frontend handles collaboration-entry and admin attention surfaces.

### Invitation Experience
- Open invitation links
- Resolve invitation token details
- Accept or reject invitations
- View invitation inbox for the authenticated user

### Notifications Experience
- View admin notification feed
- Mark one notification as read
- Mark all notifications as read

### Purpose
- Reduce collaboration friction
- Keep workspace admins aware of relevant events

---

## 10. Pricing & Billing UX

The frontend exposes plan information and checkout initiation flows, while the backend owns billing truth and webhook processing.

### Available Capabilities
- View the public pricing page
- Start checkout from the app
- Launch Razorpay checkout flow
- Show payment success handling
- Request subscription cancellation
- Surface plan expiry messaging

### Isolation Boundary
- Frontend handles billing UX and user actions
- Backend verifies payment state and updates entitlements

---

## 11. Reliability & UX Guardrails

The frontend includes infrastructure-aware and access-aware fallbacks to avoid ambiguous product states.

### Available Safeguards
- Unauthorized route handling
- Not-found page
- Server-down page
- Global error boundary patterns
- Cached GET responses with invalidation on mutations

---

## Route Surface

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

### Protected Routes
- `/app`
- `/app/home`
- `/app/onboarding`
- `/app/discover`
- `/app/profile`
- `/app/users/:username`
- `/app/notifications`
- `/app/invitations`
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

---

## Technology Stack

- **Framework:** React 19 + Vite
- **Routing:** React Router
- **Styling:** Tailwind CSS
- **HTTP Layer:** Axios
- **Auth Integrations:** Google OAuth, GitHub OAuth
- **Billing UX:** Razorpay checkout integration

---

## Frontend Architecture Notes

- The app is route-driven and divided into public pages, protected app pages, workspace pages, system pages, and infrastructure fallback pages.
- Authentication state is consumed on the client, but permission truth lives in backend responses.
- Theme behavior is synchronized by route type so the product shell and public marketing pages can differ in presentation.
- Request handling includes token refresh support and client-side cache invalidation for common read paths.

---

## Environment Variables

Create `frontend/.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/
VITE_FRONTEND_URL=http://localhost:5173
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

---

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

---

## Build and Preview

```bash
npm run build
npm run preview
```

---

## Scripts

- `npm run dev` - start the Vite development server
- `npm run build` - create a production build
- `npm run preview` - preview the production build locally
- `npm run lint` - run ESLint
