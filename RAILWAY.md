# Railway Deployment Configuration

## Environment Variables Required
- MODEL_PROVIDER: groq (or anthropic, huggingface, ollama)
- GROQ_API_KEY: Your Groq API key (if using groq)
- ANTHROPIC_API_KEY: Your Anthropic API key (if using anthropic)
- HF_TOKEN: Your Hugging Face token (if using huggingface)
- JIRA_TOKEN: Your Jira token (for Jira integration)

## Railway Features Used
- Nixpacks for Chromium and Playwright setup
- PORT environment variable for dynamic port assignment
- Automatic frontend build and serving

## Deployment Notes
- Railway automatically installs Chromium via nixpkgs
- Playwright browsers are installed during build phase
- Backend serves both API and frontend from single process
- Database (SQLite) is created in /tmp on Railway
