#!/usr/bin/env python
"""
Enhanced Django Setup Checker - Finds files recursively
"""

import os
import sys

def find_file_recursive(filename, max_depth=3):
    """Find a file recursively"""
    for root, dirs, files in os.walk('.'):
        # Skip common directories
        dirs[:] = [d for d in dirs if d not in ['venv', 'env', 'node_modules', '.git', '__pycache__', 'migrations']]
        
        depth = root.count(os.sep)
        if depth > max_depth:
            continue
            
        if filename in files:
            return os.path.join(root, filename)
    return None

def check_content_in_file(filepath, search_string):
    """Check if content exists in file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            return search_string in content
    except:
        return False

print("=" * 70)
print("ENHANCED DJANGO CANVAS SETUP VERIFICATION")
print("=" * 70)

print("\n🔍 Searching for Django configuration files...")

# Find settings.py
settings_path = find_file_recursive('settings.py')
if settings_path:
    print(f"\n✓ Found settings.py: {settings_path}")
    
    print("\n📋 Checking INSTALLED_APPS in settings.py:")
    has_canvases = check_content_in_file(settings_path, "'canvases'")
    has_rest = check_content_in_file(settings_path, "'rest_framework'")
    has_cors = check_content_in_file(settings_path, "'corsheaders'")
    
    print(f"   {'✓' if has_canvases else '✗'} 'canvases' in INSTALLED_APPS")
    print(f"   {'✓' if has_rest else '✗'} 'rest_framework' in INSTALLED_APPS")
    print(f"   {'✓' if has_cors else '⚠'} 'corsheaders' in INSTALLED_APPS (optional)")
    
    if not has_canvases:
        print("\n   ⚠️  CRITICAL: Add 'canvases' to INSTALLED_APPS in settings.py")
        print("   This is likely causing your 404 error!")
else:
    print("\n✗ Could not find settings.py")

# Find main urls.py
urls_path = find_file_recursive('urls.py')
if urls_path and 'canvases' not in urls_path:  # Skip canvases/urls.py
    print(f"\n✓ Found main urls.py: {urls_path}")
    
    print("\n📋 Checking URL configuration:")
    has_canvas_include = check_content_in_file(urls_path, "include('canvases.urls')")
    has_workspace_param = check_content_in_file(urls_path, "workspace_id")
    
    print(f"   {'✓' if has_canvas_include else '✗'} includes canvases.urls")
    print(f"   {'✓' if has_workspace_param else '✗'} has workspace_id parameter")
    
    if not has_canvas_include:
        print("\n   ⚠️  CRITICAL: Add this to your urls.py:")
        print("   path('api/workspaces/<uuid:workspace_id>/canvases/', include('canvases.urls')),")
else:
    print("\n✗ Could not find main urls.py")

# Check canvases app structure
print("\n📦 Canvases App Structure:")
canvases_files = {
    '__init__.py': 'Package initialization',
    'apps.py': 'App configuration',
    'models.py': 'Database models',
    'views.py': 'API views',
    'urls.py': 'URL routing',
    'serializers.py': 'Data serialization',
}

for file, desc in canvases_files.items():
    exists = os.path.exists(f'canvases/{file}')
    print(f"   {'✓' if exists else '✗'} canvases/{file} - {desc}")

# Check migrations
print("\n🗄️  Database Migrations:")
migrations_dir = 'canvases/migrations'
if os.path.exists(migrations_dir):
    migration_files = [f for f in os.listdir(migrations_dir) 
                      if f.startswith('0') and f.endswith('.py')]
    print(f"   ✓ Found {len(migration_files)} migration file(s)")
    if len(migration_files) == 0:
        print("   ⚠️  No migrations found - run: python manage.py makemigrations canvases")
else:
    print("   ✗ migrations directory not found")

# Summary and next steps
print("\n" + "=" * 70)
print("📊 DIAGNOSIS SUMMARY")
print("=" * 70)

issues = []
fixes = []

if settings_path and not has_canvases:
    issues.append("❌ 'canvases' NOT in INSTALLED_APPS")
    fixes.append(f"1. Open {settings_path}")
    fixes.append("2. Add 'canvases' to INSTALLED_APPS list")
    fixes.append("3. Save the file")

if urls_path and not has_canvas_include:
    issues.append("❌ canvases.urls NOT included in main urls.py")
    fixes.append(f"4. Open {urls_path}")
    fixes.append("5. Add: path('api/workspaces/<uuid:workspace_id>/canvases/', include('canvases.urls')),")

if not issues:
    print("\n✅ All checks passed!")
    print("\nIf you're still getting 404 errors, try:")
    print("   1. Restart Django server: python manage.py runserver")
    print("   2. Check server console for errors")
    print("   3. Verify the workspace UUID is valid")
    print("   4. Check authentication token is not expired")
else:
    print("\n⚠️  ISSUES FOUND:")
    for issue in issues:
        print(f"   {issue}")
    
    print("\n🔧 FIXES REQUIRED:")
    for fix in fixes:
        print(f"   {fix}")
    
    print("\n   6. Restart Django server")
    print("   7. Try creating a system again")

print("\n" + "=" * 70)