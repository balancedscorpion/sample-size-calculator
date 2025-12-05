# Frontend – Power Calculator UI

A React + TypeScript application for calculating A/B test sample sizes and visualizing power curves.

## Prerequisites

- Node.js 18+ (recommended: 20+)
- npm (comes with Node.js)

## Getting Started

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

> **Note:** The frontend expects the backend API to be running at `http://localhost:8000`. Make sure to start the backend first (see `backend/README.md`).

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check for code issues |

## Tech Stack

- **React 19** – UI framework
- **TypeScript** – Type safety
- **Vite** – Build tool and dev server
- **Recharts** – Chart visualizations

## Project Structure

```
frontend/
├── src/
│   ├── components/     # React components
│   ├── api.ts          # API client for backend
│   ├── types.ts        # TypeScript type definitions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
└── package.json        # Dependencies and scripts
```
