# AWS Auth Implementation Plan

## Overview
Implement AWS credential-based authentication using access/secret keys (with optional session token for SSO users). All AWS calls go through tRPC backend.

## Architecture

### Full Backend Approach
- **Frontend**: Zustand for UI state (isAuthenticated, userInfo, region)
- **Backend**: tRPC procedures handle all AWS SDK calls
- **Session**: Server-side session stores credentials (cookie-based, memory store)

### Credential Flow
1. User enters credentials in modal
2. Frontend calls `trpc.aws.connect` with credentials + region
3. Backend validates via STS GetCallerIdentity
4. On success: credentials stored in server session, user info returned
5. Subsequent AWS calls use session credentials
6. Session cleared on disconnect or browser close

### State Management
- **Zustand** (frontend): UI state only - userInfo, region, isAuthenticated
- **Server session**: Credentials stored server-side, tied to session cookie

### Session Security
Cookie settings for the session:
- `httpOnly: true` - Prevents JavaScript access (XSS protection)
- `secure: true` - HTTPS only in production
- `sameSite: 'lax'` - CSRF protection while allowing normal navigation

### Credential Expiration Handling
AWS credentials (especially SSO/temporary) can expire mid-session. Handle gracefully:

1. **Detection**: Catch `ExpiredTokenException` or `InvalidIdentityToken` errors from any AWS call
2. **Response**:
   - Clear the invalid session
   - Set `isAuthenticated: false` in Zustand
   - Show credentials modal with contextual message:
     - SSO users (had session token): "Your session has expired. Please re-authenticate with fresh SSO credentials."
     - IAM users (no session token): "Authentication failed. Please check your credentials."
3. **Implementation**: Create a tRPC error handler middleware that catches AWS credential errors and transforms them into a consistent `UNAUTHORIZED` error code

## Implementation Steps

### 1. Install Dependencies
```bash
bun add zustand @aws-sdk/client-sts @aws-sdk/client-lex-models-v2 @trpc/server @trpc/client @trpc/react-query @tanstack/react-query superjson
```

### 2. Set Up tRPC
- `lib/trpc/server.ts` - tRPC init with session context
- `lib/trpc/client.ts` - tRPC client for React Query
- `lib/trpc/provider.tsx` - tRPC + React Query provider (client component)
- `server/routers/index.ts` - Root router
- `server/routers/aws.ts` - AWS procedures
- `app/api/trpc/[trpc]/route.ts` - Next.js Route Handler for tRPC

### 3. AWS Router Procedures
`server/routers/aws.ts`:
- `connect` - validates credentials, stores in session, returns userInfo (also stores whether session token was provided)
- `disconnect` - clears session
- `getCallerIdentity` - returns current user info
- `listBots` - lists LexV2 bots
- All procedures wrapped with error handler that catches AWS credential errors → returns `UNAUTHORIZED` with `isSSO` flag

### 4. Auth Store (Zustand)
`lib/stores/auth-store.ts`:
- UI state only: userInfo, region, isAuthenticated
- No credentials stored frontend-side

### 5. Credentials Modal
`components/CredentialsModal.tsx`:
- Form: Access Key ID, Secret Access Key, Session Token (optional)
- Region selector (LexV2 regions only)
- Calls `trpc.aws.connect` mutation

### 6. App Sidebar
`components/AppSidebar.tsx`:
- Header: Region selector, app title
- Content: Bot list (from `trpc.aws.listBots`)
- Footer: User info or "Connect" button

### 7. Update Layout
`app/layout.tsx`:
- Wrap children with TRPCProvider
- SidebarProvider + AppSidebar layout

## Files to Create/Modify

**Create:**
- `lib/trpc/server.ts`
- `lib/trpc/client.ts`
- `lib/trpc/provider.tsx`
- `server/routers/index.ts`
- `server/routers/aws.ts`
- `app/api/trpc/[trpc]/route.ts`
- `lib/stores/auth-store.ts`
- `components/CredentialsModal.tsx`
- `components/AppSidebar.tsx`

**Modify:**
- `app/layout.tsx` - Providers, new layout
- `package.json` - Dependencies

## LexV2 Supported Regions
```
us-east-1, us-west-2, eu-west-1, eu-west-2, eu-central-1,
ap-southeast-1, ap-southeast-2, ap-northeast-1, ap-northeast-2,
ca-central-1, af-south-1
```

## Verification
1. Run `task typecheck` and `task lint`
2. Start dev server, open app
3. Click "Connect" → enter AWS credentials
4. Verify user info appears in sidebar
5. Verify bot list loads
6. Refresh page → session persists
7. Click "Disconnect" → session cleared
8. Test expired credentials → modal appears with appropriate message
