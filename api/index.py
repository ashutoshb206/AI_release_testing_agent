import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import handler

# Vercel serverless function entry point
app = handler
