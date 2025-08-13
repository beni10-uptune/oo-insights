# Claude Command: Context Prime

This command helps prime Claude with comprehensive project context by reading key files and understanding the project structure.

## Usage

```
/context-prime
```

## What This Command Does

1. Reads the README.md file to understand the project overview
2. Reads the CLAUDE.md file for specific Claude-related context and guidelines
3. Analyzes package.json to understand dependencies and scripts
4. Reviews the project structure to understand the codebase organization
5. Identifies key configuration files (tsconfig.json, next.config.js, etc.)
6. Examines the database schema if present
7. Reviews environment variable requirements

## Project Files to Review

- README.md - Project overview and setup instructions
- CLAUDE.md - Claude-specific guidelines and context
- package.json - Dependencies and available scripts
- tsconfig.json - TypeScript configuration
- next.config.js - Next.js configuration
- prisma/schema.prisma - Database schema
- .env.example or .env files - Environment variables
- src/ directory structure - Application code organization

## Why Use This Command

- **Faster onboarding**: Quickly understand a new or unfamiliar project
- **Better context**: Ensure Claude has full understanding of the project structure
- **Accurate assistance**: With proper context, Claude can provide more relevant help
- **Avoid mistakes**: Understanding the project conventions prevents incorrect suggestions

## Best Practices

- Run this command at the start of a new session
- Re-run after major project structure changes
- Use before asking for complex implementation tasks
- Combine with specific domain knowledge when needed