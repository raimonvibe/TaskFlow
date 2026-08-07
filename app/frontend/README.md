# TaskFlow Frontend

React + TypeScript frontend for the TaskFlow DevOps learning project.

## Features

- **Authentication**: JWT access tokens with refresh-token rotation
- **Task Management**: Full CRUD operations for tasks
- **Dashboard**: Visual statistics with charts (Recharts)
- **DevOps Tour**: Static field-guide pages for the surrounding toolchain
- **Responsive Design**: Tailwind CSS for mobile-friendly UI
- **Optimized Build**: Multi-stage Docker builds, code splitting
- **Health Checks**: Built-in health check endpoint

## Technology Stack

- **Framework**: React 19 with Vite
- **Language**: TypeScript (`strict`)
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios with interceptors (401 → refresh → retry)
- **Charts**: Recharts
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 22+ and npm (`nvm use` picks it up from `.nvmrc`)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your backend URL:
```
VITE_API_URL=http://localhost:3000
```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - TypeScript (`tsc --noEmit`)
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage

## Project Structure

```
src/
├── api/              # API client and wire types
│   ├── axios.ts      # Axios instance + refresh interceptor
│   ├── auth.ts       # Authentication API
│   ├── tasks.ts      # Tasks API
│   ├── health.ts     # Health check API
│   └── types.ts      # Shared response/request shapes
├── components/       # Reusable components
│   ├── Layout.tsx
│   ├── TaskCard.tsx
│   ├── TaskModal.tsx
│   ├── StatCard.tsx
│   ├── Footer.tsx
│   ├── SocialIcon.tsx
│   ├── ThemeToggle.tsx
│   ├── PrivateRoute.tsx
│   └── tour/         # DevOps Tour helpers (CodeBlock)
├── contexts/         # React contexts
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── data/             # Static content (tour, social links)
├── hooks/            # Shared hooks (useTasks)
├── pages/            # Page components
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Tasks.tsx
│   ├── TourOverview.tsx
│   ├── TourPage.tsx
│   └── NotFound.tsx
├── utils/            # secureStorage and helpers
├── test/             # Test setup
├── config.ts         # App configuration
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_ENV` | Environment name | `development` |

## Building for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

## Docker

See the `Dockerfile` in the project root for containerized deployment.

## Contributing

See the main project [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT
