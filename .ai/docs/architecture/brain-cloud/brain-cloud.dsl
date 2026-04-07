workspace "Brain Cloud" "Developer memory MCP server — captures thoughts, decisions, sessions from AI-assisted workflows." {

    model {
        // Actors
        developer = person "Developer" "Uses AI coding assistants and reviews knowledge in the web dashboard."
        cronScheduler = person "Cron Scheduler" "Cloudflare Workers scheduled trigger, daily at 3 AM UTC." "System"

        // External systems
        claudeCode = softwareSystem "Claude Code / Desktop" "AI coding assistant that calls Brain Cloud MCP tools during sessions." "External"
        brainCli = softwareSystem "brain CLI" "Command-line client for quick capture and search." "External"
        githubOAuth = softwareSystem "GitHub OAuth" "User authentication via GitHub." "External"
        googleOAuth = softwareSystem "Google OAuth" "User authentication via Google." "External"
        sentry = softwareSystem "Sentry" "Error tracking and performance monitoring." "External"

        // Brain Cloud system
        brainCloud = softwareSystem "Brain Cloud" "Developer memory MCP server. Captures thoughts, decisions, sessions. Provides search, recall, coaching." {

            worker = container "Worker" "Routes requests, runs business logic, serves API and MCP endpoint." "Cloudflare Worker, Hono, TypeScript" {
                entryPoint = component "Entry Point" "Hono app setup, middleware chain, route registration, Sentry wrapper, cron dispatch." "Hono Router"
                mcpServer = component "MCP Server" "45 MCP tools. Stateless JSON-RPC 2.0 handler. Per-request SDK server. Scope-aware tool filtering." "MCP Protocol Handler"
                restApi = component "REST API" "18 route groups. CRUD for all entities. Pagination, filtering, team scoping." "Hono Routes"
                authModule = component "Auth Module" "JWT cookie auth, API key auth, GitHub/Google OAuth callbacks, key management." "Middleware + Routes"
                mcpOAuth = component "MCP OAuth" "RFC 7591 dynamic client registration. PKCE S256. For Claude.ai custom connectors." "OAuth 2.1 Handler"
                queryLayer = component "Query Layer" "All D1 SQL queries. Entity CRUD, search, analytics, team scoping. 2334 lines." "Data Access Layer"
                vectorizeModule = component "Vectorize Module" "Embedding generation, index management, hybrid search (keyword + semantic, merged re-ranking)." "Search Engine"
                middlewareStack = component "Middleware Stack" "Rate limiter, error handler, request ID, request logger, admin guard." "Cross-cutting"
                retentionCron = component "Retention & Cron" "Daily cleanup: old DX events, expired sessions, Vectorize purge, cognitive decay, weekly digests." "Scheduler"
                scoringEngine = component "Scoring Engine" "Session quality scoring rubrics, decision templates." "Business Logic"
            }

            spa = container "Web Dashboard" "SPA for browsing thoughts, decisions, sessions, coaching. 20+ pages." "React 19, TailwindCSS, TanStack Query, Radix UI"
            d1 = container "D1 Database" "~42 tables across 17 migrations. All entities." "Cloudflare D1 (SQLite)" "Database"
            vectorize = container "Vectorize Index" "768-dim cosine embeddings for semantic search." "Cloudflare Vectorize" "Database"
            workersAi = container "Workers AI" "Llama 3.1 8B for coaching/digests. BGE-base for embeddings." "Cloudflare Workers AI"
        }

        // Relationships — Context level
        developer -> brainCloud "Views dashboard, manages settings" "HTTPS"
        claudeCode -> brainCloud "Calls MCP tools" "MCP Streamable HTTP"
        brainCli -> brainCloud "Captures thoughts, searches" "REST API + API Key"
        cronScheduler -> brainCloud "Daily retention + digests" "Cron trigger"
        brainCloud -> githubOAuth "Authenticates users" "HTTPS OAuth 2.0"
        brainCloud -> googleOAuth "Authenticates users" "HTTPS OAuth 2.0"
        brainCloud -> sentry "Reports errors" "HTTPS"

        // Relationships — Container level
        claudeCode -> worker "MCP tool calls" "POST /mcp, JSON-RPC 2.0"
        brainCli -> worker "REST API calls" "HTTPS + X-API-Key"
        developer -> spa "Browses dashboard" "HTTPS"
        spa -> worker "API requests" "fetch() to /api/*"
        worker -> d1 "SQL queries" "D1 binding"
        worker -> vectorize "Index + query embeddings" "Vectorize binding"
        worker -> workersAi "Generate text + embeddings" "AI binding"
        worker -> spa "Serves static assets" "Workers Static Assets binding"

        // Relationships — Component level
        entryPoint -> mcpServer "Routes /mcp"
        entryPoint -> restApi "Routes /api/*"
        entryPoint -> authModule "Routes /auth/*"
        entryPoint -> mcpOAuth "Routes /oauth/*"
        entryPoint -> middlewareStack "Applies to all routes"
        entryPoint -> retentionCron "Cron trigger"

        mcpServer -> queryLayer "Reads/writes entities"
        mcpServer -> vectorizeModule "Search + index"
        mcpServer -> scoringEngine "Score sessions"
        restApi -> queryLayer "Reads/writes entities"
        restApi -> vectorizeModule "Search"
        authModule -> queryLayer "User + key lookup"
        retentionCron -> queryLayer "Cleanup + decay"
        retentionCron -> vectorizeModule "Purge deleted embeddings"

        // Component → external container relationships (cross-boundary)
        queryLayer -> d1 "SQL queries" "D1 binding"
        vectorizeModule -> vectorize "Index + query embeddings" "Vectorize binding"
        vectorizeModule -> workersAi "Generate embeddings" "AI binding (bge-base-en-v1.5)"
        retentionCron -> vectorize "Purge deleted embeddings" "Vectorize binding"
        mcpServer -> workersAi "LLM inference for coaching/digests" "AI binding (llama-3.1-8b)"
        authModule -> githubOAuth "OAuth code exchange" "HTTPS"
        authModule -> googleOAuth "OAuth code exchange" "HTTPS"
        entryPoint -> sentry "Error reporting" "HTTPS (Sentry SDK)"
    }

    views {
        systemContext brainCloud "L1-Context" {
            include *
            autoLayout
        }

        container brainCloud "L2-Containers" {
            include *
            autoLayout
        }

        component worker "L3-Worker-Components" {
            include *
            autoLayout
        }

        theme default

        styles {
            element "External" {
                background #999999
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
            element "System" {
                background #438DD5
            }
        }
    }
}
