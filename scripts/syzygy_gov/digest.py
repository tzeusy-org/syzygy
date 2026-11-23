"""Compute the hexadecimal digest used by governance tooling."""

import hashlib


def sha256_hex(data: bytes) -> str:
    """Hash the exact bytes and return the lowercase SHA-256 digest."""
    return hashlib.sha256(data).hexdigest()
