# YNAB MCP Server

A Model Context Protocol (MCP) server that provides Claude with secure access to YNAB (You Need A Budget) API.

## Architecture

### Overview

```
┌─────────┐  MCP OAuth 2.1    ┌───────────────────┐  YNAB OAuth   ┌──────────┐
│ Claude  │ ════════════════> │   MCP Server      │ ════════════> │   YNAB   │
│ Client  │ (BetterAuth)      │   (Vercel)        │ (first use)   │   API    │
└─────────┘                   │                   │               └──────────┘
                              │ - BetterAuth      │
                              │ - OAuth Provider  │
                              │ - Next.js API     │
                              │ - Drizzle ORM     │
                              └───────────────────┘
                                      ║
                                      ▼
                              ┌──────────────────┐
                              │  Neon Postgres   │
                              │                  │
                              │ - users          │
                              │ - sessions       │
                              │ - accounts       │
                              │ - ynab_tokens    │
                              └──────────────────┘
```

### Two-Layer OAuth Architecture

#### Layer 1: MCP OAuth (Client → Server)
- **Protocol**: OAuth 2.1 with PKCE
- **Provider**: BetterAuth (self-hosted)
- **Purpose**: Authenticate Claude clients to the MCP server
- **Features**:
  - OAuth discovery endpoints (`.well-known/oauth-authorization-server`)
  - Authorization Code Grant with PKCE (S256)
  - Token introspection and revocation
  - Session management
  - User authentication

#### Layer 2: YNAB OAuth (Server → YNAB)
- **Protocol**: OAuth 2.0 Authorization Code Grant
- **Provider**: YNAB
- **Purpose**: Access user's YNAB data on their behalf
- **Features**:
  - Authorization Code Grant flow
  - Refresh token support (tokens expire after 2 hours)
  - Automatic token refresh
  - Per-user token storage

## Tech Stack

### Core Dependencies
- **Framework**: Next.js 15+ (App Router)
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.7+
- **Deployment**: Vercel

### Authentication & MCP
- **BetterAuth**: OAuth 2.1 server with MCP plugin
- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **@vercel/mcp-adapter**: Vercel-specific MCP integration

### YNAB Integration
- **ynab**: Official YNAB SDK for JavaScript/TypeScript

### Database
- **Drizzle ORM**: Type-safe ORM
- **Neon Postgres**: Serverless PostgreSQL database
- **@neondatabase/serverless**: Neon serverless driver

### Validation
- **Zod**: Schema validation (required by MCP SDK)

## Database Schema

### BetterAuth Tables (Auto-generated)
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth accounts
- `verification` - Email/auth verification

### Custom Tables
```typescript
// YNAB OAuth tokens per user
ynab_tokens {
  user_id: text (FK -> user.id)
  access_token: text (encrypted)
  refresh_token: text (encrypted)
  expires_at: timestamp
  created_at: timestamp
  updated_at: timestamp
}
```

## Authentication Flows

### 1. Initial Setup (First-time user)

1. User adds MCP server to Claude config with server URL
2. Claude client initiates MCP connection
3. Server returns 401 with OAuth discovery metadata
4. Claude client redirects user to BetterAuth login
5. User authenticates (email/password, OAuth providers, etc.)
6. BetterAuth issues OAuth token to Claude client
7. Claude client stores token securely
8. All subsequent requests include Bearer token

### 2. YNAB Authorization (First YNAB API call)

1. User calls a YNAB tool via Claude
2. Server validates MCP OAuth token → gets user_id
3. Server checks if YNAB tokens exist for user_id
4. If no tokens: Use MCP Elicitation URL to redirect user
5. User redirects to YNAB OAuth: `https://app.ynab.com/oauth/authorize`
6. User authorizes YNAB access
7. YNAB redirects to callback: `/api/ynab/callback?code=XXX`
8. Server exchanges code for access + refresh tokens
9. Server encrypts and stores tokens in database
10. Server completes original YNAB API request

### 3. Subsequent YNAB Calls

1. User calls YNAB tool via Claude
2. Server validates MCP token → gets user_id
3. Server retrieves YNAB tokens from database
4. If expired: Use refresh token to get new access token
5. Server calls YNAB API with access token
6. Server returns data to Claude

## Project Structure

```
ynab-mcp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   ├── auth/          # BetterAuth routes
│   │   │   │   └── [...all]/route.ts
│   │   │   ├── mcp/           # MCP handler
│   │   │   │   └── route.ts
│   │   │   ├── ynab/          # YNAB OAuth callback
│   │   │   │   └── callback/route.ts
│   │   │   └── .well-known/  # OAuth discovery
│   │   │       └── oauth-authorization-server/route.ts
│   │   └── page.tsx           # Login page
│   ├── lib/
│   │   ├── auth.ts            # BetterAuth configuration
│   │   ├── db.ts              # Drizzle database client
│   │   ├── mcp/               # MCP server implementation
│   │   │   ├── server.ts      # MCP server setup
│   │   │   └── tools/         # YNAB tools
│   │   │       ├── budgets.ts
│   │   │       ├── accounts.ts
│   │   │       ├── transactions.ts
│   │   │       └── categories.ts
│   │   └── ynab/              # YNAB integration
│   │       ├── client.ts      # YNAB API client
│   │       ├── oauth.ts       # YNAB OAuth flow
│   │       └── tokens.ts      # Token storage/refresh
│   └── db/
│       ├── schema.ts          # Drizzle schema
│       └── migrations/        # Database migrations
├── drizzle.config.ts          # Drizzle configuration
├── tsconfig.json              # TypeScript configuration
├── next.config.js             # Next.js configuration
├── .env.local                 # Local environment variables
├── .mcp.json                  # MCP development config
├── package.json
├── CLAUDE.md                  # This file
└── README.md                  # User documentation
```

## Environment Variables

### Required (Production)
```bash
# Database (Neon Postgres)
DATABASE_URL=postgres://user:password@host/database?sslmode=require

# BetterAuth (secret must be at least 32 characters)
BETTER_AUTH_SECRET=your-secret-at-least-32-characters
BETTER_AUTH_URL=https://your-domain.vercel.app

# YNAB OAuth
YNAB_CLIENT_ID=
YNAB_CLIENT_SECRET=
YNAB_REDIRECT_URI=https://your-domain.vercel.app/api/ynab/callback

# Token encryption (recommended: 32-byte hex string for production)
# If not set, falls back to a default salt (less secure)
ENCRYPTION_SALT=your-unique-32-byte-hex-string
```

### Optional (Development)
```bash
# Node environment
NODE_ENV=development

# Local URLs
BETTER_AUTH_URL=http://localhost:3000
YNAB_REDIRECT_URI=http://localhost:3000/api/ynab/callback

# Optional: Separate encryption key (falls back to BETTER_AUTH_SECRET)
TOKEN_ENCRYPTION_KEY=
```

## MCP Tools

### Budget Management
- `ynab_list_budgets` - List all budgets
- `ynab_get_budget` - Get budget details by ID
- `ynab_get_budget_settings` - Get budget settings

### Account Management
- `ynab_list_accounts` - List all accounts in a budget
- `ynab_get_account` - Get account details
- `ynab_get_account_balance` - Get current account balance

### Transaction Management
- `ynab_list_transactions` - List transactions with filters
- `ynab_get_transaction` - Get transaction details
- `ynab_create_transaction` - Create a new transaction
- `ynab_update_transaction` - Update existing transaction
- `ynab_delete_transaction` - Delete a transaction

### Category Management
- `ynab_list_categories` - List all categories
- `ynab_get_category` - Get category details
- `ynab_get_category_balance` - Get category balance and activity

### Month Management
- `ynab_get_month` - Get budget month details
- `ynab_list_months` - List budget months

## Security Considerations

### Token Storage
- All YNAB tokens are encrypted at rest using AES-256-GCM
- PBKDF2 key derivation with 100,000 iterations
- Configurable encryption salt via ENCRYPTION_SALT env var
- Tokens only accessible by authenticated users
- Automatic token rotation on refresh

### OAuth Security

#### MCP OAuth (Client → Server)
- PKCE required (S256 method) via BetterAuth OAuth provider
- OAuth 2.1 compliant (no implicit grant)
- Bearer tokens only in headers (not query strings)
- Exact redirect URI matching
- Trusted origins validation for CSRF protection
- Secure cookie configuration in production

#### YNAB OAuth (Server → YNAB)
- **Accepted Risk**: YNAB OAuth API does not support PKCE
- Authorization Code Grant flow with client_secret
- State parameter for CSRF protection (10-minute expiry)
- Validated redirect URIs (allowlist enforced)
- Tokens encrypted before database storage

### API Security
- All MCP endpoints require valid Bearer token
- User isolation (users can only access their own YNAB data)
- Rate limiting with exponential backoff for YNAB API (429 handling)
- Endpoint-specific rate limits (login, OAuth, MCP calls)
- CORS properly configured
- Security headers (HSTS, X-Frame-Options, CSP)
- Sensitive data redaction in logs

## Development Setup

1. Register YNAB OAuth application at https://app.ynab.com/settings/developer
2. Clone repository and install dependencies
3. Create a Neon Postgres database at https://neon.tech
4. Configure environment variables (copy `.env.example` to `.env`)
5. Run database migrations: `npm run db:push`
6. Start development server: `npm run dev`
7. Configure `.mcp.json` for local testing

## Deployment

### Vercel Deployment
1. Connect repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy to production
4. Verify OAuth callback URLs match deployment URL

### Post-Deployment
1. Test OAuth flow end-to-end
2. Verify MCP discovery endpoints
3. Test YNAB OAuth integration
4. Validate token refresh logic

## Future Enhancements

### Planned Features
- [ ] Webhook support for real-time updates
- [ ] Bulk transaction import
- [ ] Budget analysis tools
- [ ] Category spending predictions
- [ ] Multi-budget support
- [ ] Payee management tools

### Potential Optimizations
- [ ] Cache frequently accessed data
- [ ] Implement request batching
- [ ] Add Redis for session storage
- [ ] GraphQL API for complex queries

## References

### Official Documentation
- [YNAB API](https://api.ynab.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [BetterAuth](https://www.better-auth.com/)
- [BetterAuth MCP Plugin](https://www.better-auth.com/docs/plugins/oauth-provider)

### Key Resources
- [MCP OAuth 2.1 Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [Solving MCP with Vercel & BetterAuth](https://neon.com/blog/solving-mcp-with-vercel-and-better-auth)
- [YNAB SDK GitHub](https://github.com/ynab/ynab-sdk-js)

## License

MIT
