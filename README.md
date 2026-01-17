# YNAB MCP Server

A Model Context Protocol (MCP) server that provides Claude with secure access to YNAB (You Need A Budget) API.

## Architecture

```mermaid
flowchart TB
    subgraph Client["Claude Client"]
        CC[Claude Code/Desktop]
    end

    subgraph Server["MCP Server (Vercel)"]
        MCP[MCP Handler]
        BA[BetterAuth<br/>OAuth 2.1 Provider]
        TOOLS[YNAB Tools]
        JWT[JWT Verification<br/>via JWKS]
    end

    subgraph Database["Neon Postgres"]
        USERS[(users)]
        SESSIONS[(sessions)]
        OAUTH[(oauth_clients)]
        YNAB_TOKENS[(ynab_tokens<br/>encrypted)]
    end

    subgraph External["External Services"]
        YNAB_API[YNAB API]
    end

    CC -->|"1. MCP OAuth 2.1<br/>(PKCE + JWT)"| BA
    BA --> USERS
    BA --> SESSIONS
    BA --> OAUTH

    CC -->|"2. MCP Requests<br/>(Bearer Token)"| MCP
    MCP --> JWT
    JWT -->|Verify via JWKS| BA
    MCP --> TOOLS

    TOOLS -->|"3. YNAB API Calls"| YNAB_API
    TOOLS --> YNAB_TOKENS
```

## Authentication Flows

### MCP OAuth 2.1 Flow (Client to Server)

```mermaid
sequenceDiagram
    participant C as Claude Client
    participant S as MCP Server
    participant BA as BetterAuth
    participant U as User Browser

    C->>S: Initial MCP Request
    S-->>C: 401 + OAuth Discovery URL
    C->>BA: GET /.well-known/oauth-authorization-server
    BA-->>C: OAuth Metadata (endpoints, PKCE support)

    alt Dynamic Registration
        C->>BA: POST /oauth2/register (Dynamic Client Registration)
        BA-->>C: client_id
    else Well-known Client
        Note over C: Use client_id "ynab"
    end

    C->>C: Generate PKCE (code_verifier + code_challenge)
    C->>U: Open Browser to /oauth2/authorize
    U->>BA: Login (email/password)
    BA->>U: Consent Screen
    U->>BA: Approve
    BA-->>C: Authorization Code (via callback)

    C->>BA: POST /oauth2/token (code + code_verifier)
    BA-->>C: Access Token (JWT) + Refresh Token

    C->>S: MCP Request + Bearer Token
    S->>S: Verify JWT via JWKS
    S-->>C: MCP Response
```

### YNAB OAuth Flow (Server to YNAB)

```mermaid
sequenceDiagram
    participant C as Claude Client
    participant S as MCP Server
    participant DB as Database
    participant Y as YNAB API
    participant U as User Browser

    C->>S: Call YNAB Tool (e.g., list_budgets)
    S->>S: Verify MCP JWT Token
    S->>DB: Check for YNAB tokens

    alt No YNAB Tokens
        S-->>C: Error: "Visit /api/ynab/authorize"
        C->>U: Show authorization URL
        U->>S: GET /api/ynab/authorize
        S->>S: Generate state token
        S->>DB: Store state for CSRF protection
        S-->>U: Redirect to YNAB OAuth
        U->>Y: Authorize access
        Y-->>U: Redirect to callback with code
        U->>S: GET /api/ynab/callback?code=XXX
        S->>Y: Exchange code for tokens
        Y-->>S: Access + Refresh tokens
        S->>S: Encrypt tokens
        S->>DB: Store encrypted tokens
        S-->>U: Redirect to success page
    end

    S->>DB: Get YNAB tokens
    S->>S: Decrypt tokens

    alt Token Expired (2 hours)
        S->>Y: Refresh token
        Y-->>S: New tokens
        S->>DB: Update encrypted tokens
    end

    S->>Y: API Request
    Y-->>S: Budget Data
    S-->>C: Tool Response
```

### Token Lifecycle

```mermaid
stateDiagram-v2
    [*] --> NoToken: First Use

    NoToken --> Authorizing: User visits /api/ynab/authorize
    Authorizing --> Valid: OAuth callback success

    Valid --> NeedsRefresh: Token expires (2 hours)
    NeedsRefresh --> Valid: Auto-refresh successful
    NeedsRefresh --> Invalid: Refresh failed

    Invalid --> NoToken: Tokens deleted

    Valid --> [*]: API calls work
```

## Features

- Full OAuth 2.1 authentication via BetterAuth with PKCE
- JWT token verification via JWKS endpoint
- YNAB OAuth integration with automatic token refresh
- Budget, account, transaction, and category management tools
- Encrypted token storage (AES-256-GCM)
- Deployed on Vercel with Neon Postgres

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database
- A [YNAB](https://app.ynab.com/settings/developer) OAuth application

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd ynab-mcp
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```bash
# Database (Neon Postgres)
DATABASE_URL=postgres://user:password@host/database?sslmode=require

# BetterAuth
BETTER_AUTH_SECRET=<generate-a-secure-secret>
BETTER_AUTH_URL=http://localhost:3000

# YNAB OAuth
YNAB_CLIENT_ID=<your-ynab-client-id>
YNAB_CLIENT_SECRET=<your-ynab-client-secret>
YNAB_REDIRECT_URI=http://localhost:3000/api/ynab/callback
```

### 3. Set Up Database

Push the schema to your Neon database:

```bash
npm run db:push
```

### 4. Run Development Server

```bash
npm run dev
```

The server will be available at `http://localhost:3000`.

## YNAB OAuth Setup

1. Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
2. Click "New OAuth Application"
3. Fill in the application details:
   - **Application Name**: Your app name
   - **Redirect URI(s)**: `http://localhost:3000/api/ynab/callback` (development) or your production URL
4. Copy the Client ID and Client Secret to your `.env` file

## Deployment

### Deploy to Vercel

1. Push your repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard
4. Deploy

Remember to update:
- `BETTER_AUTH_URL` to your Vercel deployment URL
- `YNAB_REDIRECT_URI` to `https://your-domain.vercel.app/api/ynab/callback`

## MCP Configuration

### Claude Desktop

Add the server to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ynab": {
      "type": "http",
      "url": "https://ynab-mcp.vercel.app/api/mcp"
    }
  }
}
```

The server provides a well-known OAuth client (`client_id: "ynab"`) that supports:
- Localhost callbacks with any port (for MCP's dynamic port allocation)
- Public client authentication (PKCE, no client_secret required)

On first connection, Claude Desktop will open a browser for you to sign in and authorize access.

### Claude Code (CLI)

For Claude Code, add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "ynab": {
      "type": "http",
      "url": "https://ynab-mcp.vercel.app/api/mcp"
    }
  }
}
```

### Manual OAuth Configuration (Advanced)

If your MCP client requires explicit OAuth configuration:

```json
{
  "mcpServers": {
    "ynab": {
      "url": "https://your-domain.vercel.app/api/mcp",
      "transport": {
        "type": "http"
      },
      "auth": {
        "type": "oauth2",
        "client_id": "ynab",
        "discoveryUrl": "https://your-domain.vercel.app/.well-known/oauth-authorization-server"
      }
    }
  }
}
```

## Available Tools

### Connection Status
- `ynab_connection_status` - Check YNAB connection and token validity

### Budget Management
- `ynab_list_budgets` - List all budgets
- `ynab_get_budget` - Get budget details by ID
- `ynab_get_budget_settings` - Get budget settings

### Account Management
- `ynab_list_accounts` - List all accounts in a budget
- `ynab_get_account` - Get account details

### Transaction Management
- `ynab_list_transactions` - List transactions with filters
- `ynab_get_transaction` - Get transaction details
- `ynab_create_transaction` - Create a new transaction
- `ynab_update_transaction` - Update existing transaction
- `ynab_delete_transaction` - Delete a transaction

### Category Management
- `ynab_list_categories` - List all categories
- `ynab_get_category` - Get category details
- `ynab_get_category_month` - Get category details for a specific month
- `ynab_update_category_budget` - Update budgeted amount for a category

### Month Management
- `ynab_list_months` - List budget months
- `ynab_get_month` - Get budget month details

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7+ |
| Auth | BetterAuth + OAuth Provider |
| Database | Neon Postgres + Drizzle ORM |
| MCP | @modelcontextprotocol/sdk |
| YNAB | Official YNAB SDK |
| Deployment | Vercel |

## Security

### Encryption
- YNAB tokens encrypted at rest (AES-256-GCM)
- PBKDF2 key derivation (100,000 iterations)

### OAuth Security
- **MCP OAuth**: PKCE required (S256), JWT tokens verified via JWKS
- **YNAB OAuth**: State parameter for CSRF protection, encrypted token storage

### API Security
- Rate limiting on auth endpoints
- User isolation (users only access their own data)
- Sensitive data redaction in logs

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run Biome linter
npm run format       # Format code with Biome
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run Drizzle migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/     # BetterAuth routes
│   │   ├── mcp/               # MCP handler
│   │   └── ynab/              # YNAB OAuth routes
│   └── .well-known/           # OAuth discovery endpoints
├── db/
│   ├── index.ts               # Database client
│   └── schema.ts              # Drizzle schema
└── lib/
    ├── auth.ts                # BetterAuth configuration
    ├── mcp/
    │   ├── helpers.ts         # MCP helper functions
    │   └── tools/             # YNAB tool implementations
    │       ├── accounts.ts
    │       ├── budgets.ts
    │       ├── categories.ts
    │       ├── months.ts
    │       ├── status.ts
    │       └── transactions.ts
    └── ynab/
        ├── client.ts          # YNAB API client
        ├── oauth.ts           # YNAB OAuth flow
        ├── state.ts           # OAuth state management
        └── tokens.ts          # Token management
```

## License

GPL-3.0 - See [LICENSE](LICENSE) for details.
