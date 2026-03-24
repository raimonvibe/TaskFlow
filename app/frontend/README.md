# TaskFlow Frontend

React-based frontend for the TaskFlow DevOps learning project.

## Features

- **Authentication**: JWT-based login and registration
- **Task Management**: Full CRUD operations for tasks
- **Dashboard**: Visual statistics with charts (Recharts)
- **Responsive Design**: Tailwind CSS for mobile-friendly UI
- **Optimized Build**: Multi-stage Docker builds, code splitting
- **Health Checks**: Built-in health check endpoint

## Technology Stack

- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios with interceptors
- **Charts**: Recharts
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 18+ and npm

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
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage

## Project Structure

```
src/
├── api/              # API client and endpoints
│   ├── axios.js      # Axios instance with interceptors
│   ├── auth.js       # Authentication API
│   ├── tasks.js      # Tasks API
│   └── health.js     # Health check API
├── components/       # Reusable components
│   ├── Layout.jsx
│   ├── TaskCard.jsx
│   ├── TaskModal.jsx
│   ├── StatCard.jsx
│   └── PrivateRoute.jsx
├── contexts/         # React contexts
│   └── AuthContext.jsx
├── pages/            # Page components
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   ├── Tasks.jsx
│   └── NotFound.jsx
├── test/             # Test setup
├── config.js         # App configuration
├── App.jsx           # Main app component
├── main.jsx          # Entry point
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
