# ForgeMind - Engineering Intelligence Platform

## Architecture

Clean Architecture with 4 layers:
- **Domain**: Entities, Value Objects, Repository Interfaces
- **Application**: Use Cases, Application Services
- **Infrastructure**: Firebase, GitHub, Gemini implementations
- **Presentation**: Controllers, Middleware, Guards

## Commands

### Root (monorepo)
- `npm run dev` - Run both frontend and backend
- `npm run build` - Build both projects

### Backend
- `npm run dev` - Start NestJS in watch mode (port 3001)
- `npm run build` - Compile NestJS
- `npm run start` - Run production build

### Frontend
- `npm run dev` - Start Next.js dev server (port 3000)
- `npm run build` - Build Next.js for production

## Key Principles

- All external integrations implement domain interfaces
- Firebase is ONLY an infrastructure provider
- No business logic coupled to Firebase
- Every module must be independently replaceable
- State is NEVER set manually - AI infers it from GitHub data
- GitHub is the source of truth

## Environment Variables (backend/.env)

```
PORT=3001
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
GITHUB_TOKEN=your-github-token
GEMINI_API_KEY=your-gemini-api-key
```

## Response & Communication Style

- Keep responses highly organized, clear, and professional.
- Avoid markdown symbol clutter: do NOT use `###`, `***`, `---` dividers, or excessive markdown formatting symbols.
- Use clean formatting, plain structure, clean spacing, and simple bullet points or clear line breaks instead of raw symbol noise.

