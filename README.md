# Insurance AI Backend

Insurance AI Backend is a NestJS monorepo that powers the INSU insurance platform. It provides a GraphQL API for insurance packages, policies, claims, members, authentication, community articles, comments, likes, views, file uploads, notifications, sockets, and AI-assisted insurance recommendations.

The project follows NestJS modular architecture with modules, resolvers, services, guards, decorators, DTOs, schemas, and database providers separated by domain. MongoDB is used as the main database through Mongoose.

## Features

- GraphQL API built with NestJS Apollo Server and TypeScript decorators.
- Member registration, login, JWT authentication, role guards, and authenticated member decorators.
- Insurance package management with filtering, sorting, pagination, likes, views, comments, and package statistics.
- Policy and claim domains for managing insurance ownership and claim workflows.
- Community article system with article creation, listing, detail pages, image uploads, likes, comments, and view tracking.
- Shared like, view, comment, follow, and notification modules for reusable social interactions.
- File upload support through `graphql-upload`, including uploaded community and profile assets.
- MongoDB persistence using Mongoose schemas and DTO-based input validation.
- AI recommendation services using OpenRouter configuration when API credentials are provided.
- Socket.IO gateway support for real-time features.
- Separate API and batch NestJS applications inside one monorepo.

## Tech Stack

- NestJS 11
- TypeScript
- GraphQL / Apollo Server
- Mongoose / MongoDB
- JWT authentication
- class-validator / class-transformer
- graphql-upload
- Socket.IO
- Jest
- ESLint and Prettier

## Project Structure

```txt
apps/insu-api/src/main.ts                  API application entry point
apps/insu-api/src/app.module.ts            Root API module
apps/insu-api/src/database/                MongoDB connection setup
apps/insu-api/src/components/              Domain modules, resolvers, and services
apps/insu-api/src/components/auth/         Authentication, guards, and decorators
apps/insu-api/src/components/member/       Member profile and upload logic
apps/insu-api/src/components/insurance-packages/
                                            Insurance package GraphQL domain
apps/insu-api/src/components/board-article/
                                            Community article GraphQL domain
apps/insu-api/src/components/comment/      Comment domain
apps/insu-api/src/components/like/         Like domain
apps/insu-api/src/components/view/         View counter domain
apps/insu-api/src/components/ai/           AI recommendation services
apps/insu-api/src/schemas/                 Mongoose schemas
apps/insu-api/src/libs/dto/                GraphQL DTOs and input types
apps/insu-api/src/libs/enums/              Shared enum definitions
apps/insu-batch/                           Batch application
```

## Environment Variables

Create `.env` in the backend root:

```env
NODE_ENV=development
PORT_API=3007
MONGO_DEV=mongodb://localhost:27017/insurance-dev
MONGO_PROD=mongodb://localhost:27017/insurance-prod
SECRET_TOKEN=your-jwt-secret
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=your-openrouter-model
```

`OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are only required for AI recommendation features. MongoDB must be running before starting the API.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the API in watch mode:

```bash
npm run start:dev
```

The GraphQL endpoint runs on:

```txt
http://localhost:3007/graphql
```

The exact port depends on `PORT_API`.

## Scripts

```bash
npm run start           # Start the default Nest application
npm run start:dev       # Start insu-api in watch mode
npm run start:dev:batch # Start insu-batch in watch mode
npm run build           # Build the NestJS project
npm run start:prod      # Run the production build
npm run lint            # Run ESLint with auto-fix
npm run format          # Format TypeScript files with Prettier
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Run tests with coverage
npm run test:e2e        # Run e2e tests
```

## GraphQL And Uploads

The API exposes queries and mutations through Apollo GraphQL. The frontend should send JSON GraphQL requests with a valid `content-type` header, or include Apollo's preflight header when using upload links.

For file uploads, the frontend uses multipart GraphQL requests and the backend stores uploaded files under backend-controlled upload folders. Image URLs returned by the API should be resolved by the frontend against the backend API origin.

## Development Notes

- Keep `PORT_API` aligned with the frontend `NEXT_PUBLIC_GRAPHQL_URL`.
- Use DTOs and enums from `apps/insu-api/src/libs` when adding new GraphQL inputs.
- Keep domain logic inside services and expose it through resolvers.
- Use guards and decorators from the auth module for protected operations.
- Run tests or targeted service checks after changing package, article, like, view, or comment counter logic.
