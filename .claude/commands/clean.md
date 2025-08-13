# Claude Command: Clean

Fix all linting, formatting, and type-checking issues in the entire codebase.

## Usage

```
/clean
```

## What This Command Does

1. **Runs ESLint** to identify and fix linting issues
   - Automatically fixes what can be fixed
   - Reports issues that need manual intervention

2. **Runs Prettier** to format all code files
   - Ensures consistent code formatting
   - Applies project formatting rules

3. **Runs TypeScript compiler** to check for type errors
   - Identifies type mismatches
   - Catches potential runtime errors

4. **Runs build** to ensure everything compiles
   - Verifies no build-breaking changes
   - Catches import/export issues

## For Next.js Projects

The command will run:
- `npm run lint` - ESLint with Next.js rules
- `npm run lint:fix` - Auto-fix linting issues (if available)
- `npm run format` - Prettier formatting (if available)
- `npm run typecheck` - TypeScript type checking
- `npm run build` - Build verification

## Files Checked

- `**/*.ts` - TypeScript files
- `**/*.tsx` - React TypeScript files
- `**/*.js` - JavaScript files
- `**/*.jsx` - React JavaScript files
- `**/*.json` - JSON configuration files
- `**/*.css` - Stylesheets
- `**/*.md` - Markdown documentation

## Common Issues Fixed

### ESLint
- Unused variables
- Missing dependencies in hooks
- Incorrect import order
- Console statements
- Accessibility issues

### Prettier
- Inconsistent indentation
- Line length violations
- Quote style inconsistencies
- Trailing commas
- Semicolon usage

### TypeScript
- Missing type annotations
- Type mismatches
- Unused imports
- Implicit any types
- Null/undefined handling

## Best Practices

- Run before committing code
- Run after merging branches
- Run after major refactoring
- Set up as pre-commit hook
- Include in CI/CD pipeline

## Configuration Files

The command respects these config files:
- `.eslintrc.json` - ESLint rules
- `.prettierrc` - Prettier formatting
- `tsconfig.json` - TypeScript configuration
- `.eslintignore` - Files to skip
- `.prettierignore` - Files to skip formatting

## Error Handling

If issues can't be auto-fixed:
1. The command will list all remaining issues
2. Provide file paths and line numbers
3. Suggest manual fixes
4. Offer to fix specific issues interactively