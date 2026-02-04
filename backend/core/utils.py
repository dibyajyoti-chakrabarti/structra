import secrets
import string

def generate_alphanumeric_id(length=8):
    """Generate random alphanumeric ID (lowercase + digits)"""
    chars = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))