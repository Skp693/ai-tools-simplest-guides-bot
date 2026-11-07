# AI TOOLS - Simplest Step By Step Guides

Autonomous Bluesky agent that posts high-quality, jargon-free AI tool tutorials **twice every day** (11:00 AM & 9:00 PM) as proper connected threads.

## Features
- Automatically selects a different AI tool every time
- Writes complete guides with Catchy Headline, Hook, Topics Covered, Overview, Step-by-step, 3 Use Cases, and Dos & Don'ts
- Posts as a proper multi-post thread (best performance on Bluesky)
- Fully automatic once deployed

## Quick Start (Local Testing)

```bash
npm install
npm install -g @atproto/lex tsx
lex install app.bsky.feed.post app.bsky.actor.profile
lex build
cp .env.example .env
# Edit .env with your real values
npm start
```

## Deploy to Railway (Recommended - Autopilot)

1. Push this repo to your GitHub (already done if you forked or use this one)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select this repository
4. Add the 4 environment variables from `.env.example`
5. Set Start Command to: `npx tsx src/index.ts`
6. Deploy

The agent will keep running 24/7 and post automatically.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BOT_PDS` | Usually `https://bsky.social` |
| `BOT_HANDLE` | Your Bluesky handle |
| `BOT_PASSWORD` | App Password (not main password) |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key |

## License
MIT
