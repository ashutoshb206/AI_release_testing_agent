import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from main import app
    print("Successfully imported FastAPI app")
except Exception as e:
    print(f"Error importing app: {e}")
    raise

# Vercel serverless function handler
handler = app

# Export for Vercel
app = handler
