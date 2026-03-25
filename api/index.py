import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app

# Vercel serverless function handler
handler = app

# Export for Vercel
app = handler
