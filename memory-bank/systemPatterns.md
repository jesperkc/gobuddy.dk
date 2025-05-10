# System Patterns: GoBuddy

## Architectural Patterns

### Frontend Architecture

- **Component-Based Architecture**: The application is built using React components for modularity and reusability
- **Split Screen Layout**: Consistent use of a SplitScreen component across routes for unified user experience
- **Form Handling**: Modular form components with validation using @modular-forms/react

### State Management

- **Global State**: Zustand store for managing onboarding state across multiple steps
- **Form State**: Local state management for form inputs with validation

### Routing

- **TanStack Router**: File-based routing with route components
- **Multi-step Flow**: Sequential routing through the onboarding process

### API Integration

- **Supabase Authentication**: Integration with Supabase for user authentication
- **OpenStreetMap Integration**: Using Nominatim API for geocoding and reverse geocoding

### UI Patterns

- **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- **Component Library**: Custom UI components with consistent styling
- **Loading States**: Consistent loading indicators for asynchronous operations

### Data Flow

- **One-way Data Flow**: State flows down from parent components to children
- **Event Handlers**: Events bubble up through callbacks
- **Progressive Data Collection**: Data collected incrementally through the onboarding flow

## Code Organization

### Directory Structure

- `/src/components`: Reusable UI components
- `/src/routes`: Route components for each page
- `/src/store`: State management with Zustand
- `/src/lib`: Utility functions and service integrations
- `/src/assets`: Static assets like images and icons

### Component Patterns

- **UI Components**: Basic UI elements like buttons, inputs, etc.
- **Form Components**: Specialized components for form handling
- **Layout Components**: Components for page layout like SplitScreen
- **Feature Components**: Components specific to features like Map

[2025-05-03 16:10:00] - Initial documentation of system patterns
