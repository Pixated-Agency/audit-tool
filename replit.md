# Multi-Platform Ad Auditor - System Architecture Guide

## Overview

This is a full-stack web application built for auditing advertising campaigns across multiple platforms including Google Ads, Google Analytics, Facebook Ads, TikTok Ads, and Microsoft (Bing) Ads. The application uses a modern tech stack with React for the frontend, Express.js for the backend, and PostgreSQL for data persistence. The system is designed with a focus on user authentication, scalable data management, multi-platform audit workflow, and a responsive user interface.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with session-based authentication
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Passport.js with Google OAuth 2.0 strategy
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Database Provider**: Neon Database (serverless PostgreSQL)

### Development Environment
- **Platform**: Replit with PostgreSQL module
- **Hot Reload**: Vite dev server with HMR
- **Build Process**: Vite for client, esbuild for server bundling
- **Process Management**: tsx for TypeScript execution in development

## Key Components

### Authentication System
- **Strategy**: Session-based authentication with optional Google OAuth
- **Session Management**: PostgreSQL-backed sessions with 7-day TTL
- **Test Mode**: Development login endpoint for testing (`test@metaaudit.com`)
- **Security**: HTTP-only cookies, CSRF protection via same-site policies

### Database Schema
- **Users Table**: Stores user profiles with Google OAuth integration
- **Sessions Table**: Manages user sessions with automatic expiration
- **Audits Table**: Stores audit reports with platform, status, and metadata
- **Account Connections Table**: Manages connected advertising accounts across platforms
- **Schema Management**: Drizzle migrations with type-safe queries

### UI/UX Design
- **Design System**: Consistent component library with Meta blue branding
- **Responsive**: Mobile-first design with Tailwind breakpoints
- **Accessibility**: Radix UI primitives ensure ARIA compliance
- **Loading States**: Comprehensive loading and error handling

### API Structure
- **RESTful Design**: Express routes with proper HTTP status codes
- **Error Handling**: Centralized error middleware with structured responses
- **Request Logging**: Detailed API request/response logging
- **Authentication Middleware**: Protected routes with session validation

## Data Flow

### User Authentication Flow
1. User visits landing page
2. Clicks "Sign in with Google" or uses test credentials
3. OAuth callback processes user data
4. Session created and stored in PostgreSQL
5. User redirected to dashboard with authenticated state

### Client-Server Communication
1. Frontend makes API requests with credentials included
2. Express middleware validates session
3. Drizzle ORM handles database operations
4. Structured JSON responses sent to client
5. TanStack Query manages caching and state updates

### Development Workflow
1. Vite dev server serves React application with HMR
2. Express server runs on separate port with tsx
3. Database migrations applied via Drizzle Kit
4. Both services proxy through Replit's port system

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe ORM with PostgreSQL support
- **passport-google-oauth20**: Google OAuth authentication
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI component primitives

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundling for production server code
- **drizzle-kit**: Database migration and introspection tools
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay

### UI Framework
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library
- **react-icons**: Additional icon sets (Facebook, Google)

## Deployment Strategy

### Production Build
- **Client**: Vite builds optimized static assets to `dist/public`
- **Server**: esbuild bundles Express server to `dist/index.js`
- **Assets**: Static files served from Express in production

### Environment Configuration
- **Development**: Local development with Replit PostgreSQL
- **Production**: Autoscale deployment target on Replit
- **Environment Variables**: DATABASE_URL, Google OAuth credentials

### Database Management
- **Migrations**: Drizzle Kit handles schema changes
- **Connection Pooling**: Neon serverless handles connection management
- **Session Cleanup**: Automatic session expiration via PostgreSQL TTL

## Recent Changes

- June 24, 2025: Expanded platform support from Meta-only to multi-platform (Google, Facebook, TikTok, Microsoft)
- Added comprehensive audit workflow with 3-step creation process (Platform Selection → Account Connection → Audit Customization)
- Implemented audit table dashboard with status tracking, platform icons, and action buttons
- Created new database tables for audits and account connections
- Updated UI to Multi-Platform Ad Auditor branding
- Added real-time audit status updates (processing → completed)

## Changelog

Changelog:
- June 24, 2025. Initial setup and multi-platform expansion

## User Preferences

Preferred communication style: Simple, everyday language.