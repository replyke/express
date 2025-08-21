# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **@replyke/express** package - the Express.js backend library for Replyke, an open-source social features framework. It provides production-ready APIs for comments, votes, notifications, feeds, user management, and more.

## Core Architecture

### Layer Structure
- **API Layer**: Express routers in `src/v5/routers/` that handle HTTP requests
- **Controllers**: Business logic in `src/v5/controllers/` organized by feature (auth, comments, entities, users, etc.)
- **Models**: Sequelize ORM models in `src/models/` (User, Entity, Comment, List, etc.)
- **Interfaces**: TypeScript interfaces in `src/interfaces/` for type definitions
- **Config**: Core configuration management in `src/config.ts` requiring Sequelize setup

### Key Components
- **Authentication**: JWT-based auth with access/refresh tokens
- **Entities**: Core content objects that can be commented on and voted
- **Comments**: Threaded comment system with voting and mentions
- **Users**: User management with follow relationships and reputation scores
- **Lists**: User-curated collections of entities
- **Notifications**: In-app notification system
- **Reports**: Content moderation and reporting system

### Configuration Requirements
The library requires initialization via `setCoreConfig()` with:
- Sequelize database instance
- JWT secrets for access/refresh tokens
- Handler functions for webhooks (createEntity, createComment, etc.)
- File upload handler

## Development Commands

```bash
# Build TypeScript to JavaScript
pnpm run build

# Lint code with ESLint
pnpm run lint

# Clean and rebuild (used by prepare script)
pnpm run prepare
```

## Key Dependencies
- **Sequelize**: ORM for database operations
- **Express**: Web framework (peer dependency)
- **jsonwebtoken**: JWT handling (peer dependency)
- **multer**: File upload handling
- **express-rate-limit**: Rate limiting (peer dependency)

## Database Architecture
Uses Sequelize ORM with models supporting MySQL and PostgreSQL. Core entities include:
- Users with roles, reputation, and follow relationships
- Entities (posts/content) with metadata, voting, and geolocation
- Comments with threading and mention support
- Lists for entity curation
- App notifications for user engagement

## API Structure
All routes are versioned under `/v5/` and organized by resource:
- `/auth` - Authentication endpoints
- `/users` - User management and follows
- `/entities` - Content creation and management
- `/comments` - Comment system
- `/lists` - User lists and collections
- `/app-notifications` - In-app notifications
- `/reports` - Content reporting
- `/storage` - File upload

## Important Notes
- This is a library package, not a standalone application
- Requires external database and configuration setup
- Exports TypeScript types and Express router for integration
- Built for production use with social features at scale