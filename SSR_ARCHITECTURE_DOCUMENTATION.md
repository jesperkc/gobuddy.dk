# SSR-Ready Architecture Documentation - GoBuddy

## Overview

This document provides comprehensive technical documentation for the SSR-ready architecture implemented in the GoBuddy application. The current setup uses a hybrid approach with TanStack Router providing file-based routing while maintaining complete SSR infrastructure for future activation.

## Architecture Patterns

### Hybrid Architecture Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     Current Hybrid Architecture                 │
├─────────────────────────────────────────────────────────────────┤
│  Runtime: TanStack Router + File-Based Routing                 │
│  Build System: Vite + TanStack Router Vite Plugin              │
│  SSR Infrastructure: Complete but Dormant                      │
│  Entry Points: src/main.tsx (active) + app/client.tsx (ready)  │
└─────────────────────────────────────────────────────────────────┘
```

## SSR-Safe Utility Library

### Core SSR Utilities (`src/lib/ssr-utils.ts`)

#### Environment Detection

```typescript
export const isBrowser = typeof window !== "undefined";
export const isServer = !isBrowser;
```

#### Safe Browser API Wrappers

```typescript
export const safeWindow = isBrowser ? window : undefined;
export const safeNavigator = isBrowser ? navigator : undefined;
export const safeDocument = isBrowser ? document : undefined;
```

#### Storage Utilities

- **safeLocalStorage**: SSR-safe localStorage with error handling
- **safeSessionStorage**: SSR-safe sessionStorage with error handling
- Automatic fallback to no-op on server-side
- Error recovery for quota exceeded scenarios

#### Timing Functions

```typescript
export const safeSetTimeout = (callback: () => void, delay: number): number | undefined
export const safeClearTimeout = (timeoutId: number | undefined): void
```

#### Geolocation API Wrapper

```typescript
export const safeGeolocation = {
  getCurrentPosition: (successCallback, errorCallback?, options?) => void,
  watchPosition: (successCallback, errorCallback?, options?) => number | null,
  clearWatch: (watchId: number) => void
}
```

- Server-side returns mock errors to prevent crashes
- Client-side provides full geolocation functionality
- Used in [`app/routes/location.tsx`](app/routes/location.tsx) for map functionality

#### Client-Only Components

```typescript
export const ClientOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback = null }) => {
  // Renders fallback on server, children on client after hydration
};
```

#### Client-Only Effects Hook

```typescript
export const useClientEffect = (effect: () => void | (() => void), deps?: React.DependencyList)
```

- Prevents effects from running during SSR
- Automatic cleanup support
- Used throughout authentication infrastructure

#### Date/Time Utilities

```typescript
export const safeDate = {
  getCurrentTime: (): Date | null,  // Returns null on server
  getGreeting: (fallback: string = "Hej"): string  // Time-based greeting with fallback
}
```

## Authentication Infrastructure

### SSR-Safe Authentication Context (`src/contexts/AuthContext.tsx`)

#### State Management

```typescript
// SSR-safe state initialization
const [loading, setLoading] = useState(isBrowser); // Only show loading on client
const [user, setUser] = useState<User | null>(null);
const [session, setSession] = useState<Session | null>(null);
```

#### Client-Only Operations

```typescript
// Authentication initialization - client-only
useClientEffect(() => {
  const getInitialSession = async () => {
    // Supabase operations only run on client
  };

  // Auth state change listeners only on client
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}, []);
```

#### Login/Logout Guards

```typescript
const login = async (email: string, password: string) => {
  if (!isBrowser) {
    setError("Login can only be performed on the client");
    return { error: new Error("Client-only operation") as AuthError };
  }
  // Proceed with Supabase authentication
};
```

### Protected Route Component (`src/components/ProtectedRoute.tsx`)

#### Hydration-Safe Authentication Checking

```typescript
const [hasMounted, setHasMounted] = useState(false);

useClientEffect(() => {
  setHasMounted(true);
}, []);

// Always show loading on server or before client hydration
if (!isBrowser || !hasMounted) {
  return <LoadingSpinner />;
}
```

#### Authentication Flow

1. **Server-side**: Always renders loading state
2. **Client hydration**: Shows loading while checking auth
3. **Authenticated**: Renders children
4. **Unauthenticated**: Redirects to login

### Navigation Component (`src/components/NavBar.tsx`)

#### SSR-Safe User Menu

```typescript
// Only render user authentication UI on client
{isBrowser && user ? (
  <UserDropdownMenu />
) : (
  <LoginButton />
)}
```

#### Event Listeners

```typescript
// SSR-safe event listener setup
useClientEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    // Event handling logic
  }

  if (isBrowser && document) {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }
}, []);
```

## File-Based Routing Architecture

### Route Structure (`app/routes/`)

```
app/routes/
├── __root.tsx          # Root layout with AuthProvider
├── index.tsx           # Landing page (/)
├── login.tsx           # Authentication (/login)
├── signup.tsx          # Account creation (/signup)
├── details.tsx         # Personal details (/details)
├── interests.tsx       # Interest selection (/interests)
├── location.tsx        # Location sharing (/location)
├── confirmemail.tsx    # Email confirmation (/confirmemail)
├── complete.tsx        # Onboarding completion (/complete)
├── completed.tsx       # Success page (/completed)
├── home.tsx            # Protected dashboard (/home)
└── profile.tsx         # Protected profile (/profile)
```

### Route Pattern

```typescript
// Standard route file pattern
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/route-path")({
  component: RouteComponent,
});

function RouteComponent() {
  // Component implementation with SSR-safe patterns
}
```

### SSR-Safe Route Examples

#### Location Route with Maps

```typescript
// app/routes/location.tsx
import { ClientOnly, safeGeolocation } from "../../src/lib/ssr-utils";

function LocationRoute() {
  return (
    <div>
      <ClientOnly fallback={<div>Loading map...</div>}>
        <MapComponent />
      </ClientOnly>
    </div>
  );
}
```

#### Home Route with Time-Based Greeting

```typescript
// app/routes/home.tsx
import { safeDate } from "../../src/lib/ssr-utils";

function HomeRoute() {
  const greeting = safeDate.getGreeting("Hej");
  return <h1>{greeting}, User!</h1>;
}
```

## Layout Architecture

### Dual Layout System

#### AppShell Layout (`src/components/AppShell.tsx`)

- **Purpose**: Layout for authenticated routes (home, profile)
- **Features**: Fixed navigation, full-width content, user menu
- **SSR Compatibility**: Uses SSR-safe navigation component

#### SplitScreen Layout (`src/components/SplitScreen.tsx`)

- **Purpose**: Layout for public routes (login, signup, onboarding)
- **Features**: Split design with testimonial images and forms
- **SSR Compatibility**: Static layout, no browser-dependent features

### Layout Selection Pattern

```typescript
// Public routes use SplitScreen
function LoginRoute() {
  return (
    <SplitScreen>
      <LoginForm />
    </SplitScreen>
  );
}

// Protected routes use AppShell
function ProfileRoute() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ProfileContent />
      </AppShell>
    </ProtectedRoute>
  );
}
```

## TanStack Start Infrastructure (Ready but Dormant)

### Configuration Files

#### App Configuration (`app.config.ts`)

```typescript
import { defineConfig } from "@tanstack/start/config";

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "~": resolve(__dirname, "./app"),
      },
    },
    optimizeDeps: {
      exclude: ["lucide-react"],
    },
  },
  server: {
    preset: "vercel",
  },
});
```

#### Client Entry Point (`app/client.tsx`)

```typescript
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/start";
import { createRouter } from "./router";

const router = createRouter();
hydrateRoot(document.getElementById("root")!, <StartClient router={router} />);
```

#### Server Entry Point (`app/server.tsx`)

```typescript
import { createStartHandler, defaultStreamHandler } from "@tanstack/start/server";
import { createRouter } from "./router";

export default createStartHandler({
  createRouter,
})(defaultStreamHandler);
```

#### Router Configuration (`app/router.tsx`)

```typescript
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "../src/index.css";

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    context: undefined!,
    defaultPendingComponent: () => <div>Loading...</div>,
    defaultErrorComponent: ({ error }) => <div>Error: {error.message}</div>,
  });
}
```

## Component Patterns

### SSR-Safe Component Pattern Template

```typescript
import React from "react";
import { isBrowser, useClientEffect, ClientOnly } from "../lib/ssr-utils";

function SSRSafeComponent() {
  const [clientState, setClientState] = useState(null);

  // Client-only effects
  useClientEffect(() => {
    // Browser-only initialization
  }, []);

  return (
    <div>
      {/* Always safe content */}
      <h1>Server-safe content</h1>

      {/* Client-only conditional rendering */}
      {isBrowser && <BrowserOnlyContent />}

      {/* Client-only with fallback */}
      <ClientOnly fallback={<LoadingPlaceholder />}>
        <InteractiveComponent />
      </ClientOnly>
    </div>
  );
}
```

### Loading States Pattern

```typescript
function ComponentWithLoading() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useClientEffect(() => {
    fetchData().then(result => {
      setData(result);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingValue value={null} loading={true} />;
  }

  return <LoadingValue value={data} loading={false} />;
}
```

## Build System

### Current Active Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({
      routesDirectory: "./app/routes",
      generatedRouteTree: "./app/routeTree.gen.ts",
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./app"),
    },
  },
  server: {
    port: 3002,
  },
});
```

### Package Dependencies (Current)

```json
{
  "dependencies": {
    "@tanstack/react-router": "^1.102.0",
    "@tanstack/router-devtools": "^1.102.0",
    "@tanstack/router-vite-plugin": "^1.102.0"
  },
  "scripts": {
    "dev": "vite dev --port=3002",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## Migration Readiness Assessment

### ✅ SSR-Ready Components

- [x] All route components use SSR-safe patterns
- [x] Authentication infrastructure fully SSR-compatible
- [x] Navigation and layout components prepared
- [x] Form components and UI elements ready
- [x] State management (Zustand) works with SSR

### ✅ SSR-Ready Infrastructure

- [x] Comprehensive SSR utility library
- [x] Client-only rendering patterns implemented
- [x] Hydration-safe state management
- [x] Browser API wrappers in place
- [x] Error handling for server/client differences

### ✅ TanStack Start Configuration

- [x] App configuration file ready
- [x] Client and server entry points created
- [x] Router configured for SSR
- [x] Build system configuration prepared

### 🔄 Activation Requirements

- [ ] Update package.json dependencies
- [ ] Change build scripts to use vinxi
- [ ] Remove vite.config.ts, activate app.config.ts
- [ ] Update index.html entry point
- [ ] Comprehensive testing

## Performance Considerations

### Current Benefits (Active)

- **Code Splitting**: Automatic route-based code splitting
- **Tree Shaking**: Dead code elimination in builds
- **Bundle Optimization**: Optimized build output
- **Development Performance**: Fast hot module replacement

### Future Benefits (Post-SSR Activation)

- **Initial Page Load**: Server-rendered HTML for faster first paint
- **SEO Optimization**: Search engine indexable content
- **Social Media**: Proper meta tags for social sharing
- **Core Web Vitals**: Improved LCP and FID scores

## Security Considerations

### Current Implementation

- **Authentication State**: Never exposed on server-side
- **Session Management**: Client-only with proper guards
- **API Keys**: Environment-based configuration
- **Route Protection**: SSR-safe authentication checks

### SSR Security Patterns

- **No Server-Side Auth State**: Authentication always handled client-side
- **Safe Redirects**: Proper redirect handling for protected routes
- **Data Sanitization**: Clean server/client data boundary
- **Environment Isolation**: Separate server/client concerns

---

_This architecture documentation reflects the current SSR-ready state of the GoBuddy application as of 2025-07-24. The infrastructure is complete and ready for TanStack Start activation with minimal additional work required._
