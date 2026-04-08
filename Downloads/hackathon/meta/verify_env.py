#!/usr/bin/env python3
"""
Verify that the environment is properly configured for running inference.
Run this script before running inference.py to catch configuration issues early.
"""

import os
import sys
from pathlib import Path

def check_env_file():
    """Check if .env file exists and has required variables."""
    env_file = Path(__file__).parent / ".env"
    
    if not env_file.exists():
        print("❌ .env file not found")
        print(f"   Create it at: {env_file}")
        return False
    
    print("✅ .env file found")
    return True

def check_env_variables():
    """Check if required environment variables are set."""
    required_vars = ["API_BASE_URL", "MODEL_NAME", "HF_TOKEN"]
    missing = []
    
    for var in required_vars:
        value = os.environ.get(var, "").strip()
        if not value:
            missing.append(var)
            print(f"❌ {var}: NOT SET")
        else:
            # Show masked value for security
            masked = f"{value[:10]}...{value[-5:]}" if len(value) > 20 else value
            print(f"✅ {var}: {masked}")
    
    return len(missing) == 0

def load_env_file():
    """Load .env file into environment."""
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip()
                    if key and value:
                        os.environ[key] = value

def check_dependencies():
    """Check if required packages are installed."""
    print("\nChecking dependencies...")
    required = ["openai", "requests", "fastapi", "uvicorn", "pydantic"]
    missing = []
    
    for package in required:
        try:
            __import__(package)
            print(f"✅ {package}: installed")
        except ImportError:
            missing.append(package)
            print(f"❌ {package}: NOT INSTALLED")
    
    return len(missing) == 0

def main():
    print("═══ Environment Verification ═══\n")
    
    # Load .env file first
    load_env_file()
    
    # Check .env file
    has_env_file = check_env_file()
    
    print("\nChecking environment variables...")
    has_all_vars = check_env_variables()
    
    # Check dependencies
    has_deps = check_dependencies()
    
    print("\n" + "═" * 35)
    
    if has_all_vars and has_deps:
        print("✅ All checks passed! Ready to run inference.py")
        return 0
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        print("\nQuick fix:")
        print("1. Edit .env file with your actual credentials")
        print("2. Run: pip install -r requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(main())
