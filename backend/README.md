# Structra Cloud Backend

Backend API for Structra Cloud, a collaborative workspace and design platform. Built with Django and Django REST Framework.

## Features

- **Authentication & Users**: User management, OAuth logic, and JWT authentication (`accounts`).
- **Workspaces**: Multi-tenant workspace management (`workspaces`).
- **Canvases**: Design/Canvas management functionality (`canvases`).
- **Permissions**: Granular Role-Based Access Control (RBAC) and object-level permissions (`permissions`).
- **Notifications**: System for invitations and user notifications (`notifications`).
- **Audit Logging**: Comprehensive activity logging for security and compliance (`audit`).

## Project Structure

```text
structra-backend/                    # repo root
│
├── .git/
├── .gitignore
├── README.md
├── .env.example
├── manage.py
├── requirements.txt                 
│
├── structra_backend/                # Django project package 
│   ├── __init__.py
│   ├── urls.py                      # Root URL configuration
│   ├── wsgi.py
│   ├── asgi.py
│   └── settings/                    # Split settings
│       ├── __init__.py
│       ├── base.py                  # Common settings for all environments
│       ├── development.py           # Dev-specific (DEBUG=True, local DB)
│       ├── production.py            # Prod-specific (DEBUG=False, RDS)
│       └── testing.py               # Test-specific (in-memory DB, etc.)
│
├── accounts/                        # User authentication & OAuth
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                    # User model (extending Django's)
│   ├── views.py                     # OAuth login, JWT endpoints
│   ├── serializers.py               # User serializer
│   ├── urls.py                      # Auth routes
│   ├── services.py                  # OAuth validation, JWT generation
│   ├── permissions.py               # Custom DRF permissions
│   ├── admin.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_models.py
│   │   ├── test_views.py
│   │   └── test_services.py
│   └── migrations/
│       └── __init__.py
│
├── workspaces/                      # Workspace management
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                    # Workspace model
│   ├── views.py                     # CRUD views
│   ├── serializers.py
│   ├── urls.py
│   ├── services.py                  # Business logic (creation, visibility)
│   ├── admin.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_models.py
│   │   └── test_views.py
│   └── migrations/
│       └── __init__.py
│
├── canvases/                        # Canvas/design management
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                    # Canvas model
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   ├── services.py                  # Canvas CRUD, validation
│   ├── admin.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_models.py
│   │   └── test_views.py
│   └── migrations/
│       └── __init__.py
│
├── permissions/                     # RBAC & Access Control
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                    # WorkspaceMembers, CanvasPermissions
│   ├── views.py                     # Permission management endpoints
│   ├── serializers.py
│   ├── urls.py
│   ├── services.py                  # Permission checking logic
│   ├── decorators.py                # @require_workspace_owner, etc.
│   ├── checks.py                    # Reusable permission functions
│   ├── admin.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_models.py
│   │   ├── test_checks.py
│   │   └── test_decorators.py
│   └── migrations/
│       └── __init__.py
│
├── notifications/                   # Invitations & Notifications
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                    # Notification model
│   ├── views.py                     # Notification list, invite endpoints
│   ├── serializers.py
│   ├── urls.py
│   ├── services.py                  # Invitation creation, email sending
│   ├── tasks.py                     # Celery tasks (expire invitations)
│   ├── admin.py
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_services.py
│   └── migrations/
│       └── __init__.py
│
├── audit/                           # Audit logging
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                    # AuditLog model
│   ├── views.py                     # Log retrieval endpoints
│   ├── serializers.py
│   ├── urls.py
│   ├── services.py                  # Log creation helpers
│   ├── middleware.py                # Optional: auto-logging middleware
│   ├── admin.py
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_models.py
│   └── migrations/
│       └── __init__.py
│
├── core/                            # Shared utilities & base classes
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                    # Abstract base models (TimeStampedModel)
│   ├── exceptions.py                # Custom exceptions
│   ├── constants.py                 # Enums, choices (WorkspaceVisibility, etc.)
│   ├── utils.py                     # Utility functions
│   ├── middleware.py                # JWT validation middleware
│   ├── responses.py                 # Standardized API response helpers
│   └── tests/
│       ├── __init__.py
│       └── test_utils.py
│
├── static/                          # Static files (CSS, JS if serving from Django)
│   └── .gitkeep
│
├── media/                           # User uploads (if any)
│   └── .gitkeep
│
├── scripts/                         # Management/utility 
```

## Key Design Patterns

### 1. Services Layer (`services.py`)
Business logic is isolated in `services.py` modules within each app (e.g., `accounts/services.py`, `notifications/services.py`). Views remain thin and focused on HTTP request/response handling, while complex operations like OAuth validation, JWT generation, and email dispatching are delegated to these services. This separation of concerns improves testability and reusability.

### 2. Permission Checks (`permissions/checks.py`)
Core permission logic is encapsulated in reusable functions found in `permissions/checks.py`. Examples include `can_user_access_canvas` or `is_workspace_owner`. This centralizes security logic, preventing duplication and ensuring consistency across the application.

### 3. Decorators (`permissions/decorators.py`)
To enforce access control declaratively, we utilize view decorators from `permissions/decorators.py` (e.g., `@require_workspace_owner`). These provide a clean and readable way to protect endpoints based on user roles and context.

### 4. Constants (`core/constants.py`)
Magic strings and numbers are avoided by using centralized enums in `core/constants.py`. Variables such as `WorkspaceVisibility`, `CanvasRole`, and `NotificationStatus` are defined here to ensure type safety and easy refactoring across the codebase.

