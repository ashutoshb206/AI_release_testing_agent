import sys
import os

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

# Import the FastAPI app
from main import app

# Vercel will automatically use the 'app' variable
# No special handler needed for @vercel/python
