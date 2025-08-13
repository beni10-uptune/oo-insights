# Claude Command: Create Pull Request

Create a new branch, commit changes, and submit a pull request to GitHub.

## Usage

```
/create-pr [branch-name]
```

Examples:
- `/create-pr fix-navigation-bug`
- `/create-pr feature-user-auth`
- `/create-pr refactor-api-endpoints`

## What This Command Does

1. **Creates a new branch** from the current branch (usually main)
2. **Formats code** using the project's formatter (prettier/eslint)
3. **Analyzes changes** to determine logical commit groupings
4. **Splits changes** into atomic, logical commits when appropriate
5. **Creates descriptive commit messages** for each commit
6. **Pushes the branch** to the remote repository
7. **Creates a pull request** with:
   - Clear title describing the changes
   - Summary of what was changed and why
   - Test plan or verification steps
   - Links to related issues if applicable

## Automatic Commit Splitting

The command intelligently splits changes into separate commits based on:

- **Feature boundaries**: Different features in separate commits
- **File types**: Separating logic changes from config/documentation
- **Components**: Keeping component changes isolated
- **Refactoring vs features**: Separating cleanup from new functionality
- **Bug fixes**: Isolating fixes from feature additions

## PR Description Template

```markdown
## Summary
Brief description of what this PR does

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Tested locally
- [ ] Added/updated tests
- [ ] Verified no regressions

## Related Issues
Fixes #123
```

## Branch Naming Conventions

- `fix-*` - Bug fixes
- `feature-*` - New features
- `refactor-*` - Code refactoring
- `docs-*` - Documentation updates
- `test-*` - Test additions/updates
- `chore-*` - Maintenance tasks

## Best Practices

- **Atomic commits**: Each commit should represent one logical change
- **Clear messages**: Commit messages should explain what and why
- **Test before PR**: Ensure all tests pass before creating PR
- **Link issues**: Reference related GitHub issues in the PR
- **Update documentation**: Include doc updates with code changes
- **Request reviews**: Tag relevant team members for review

## Prerequisites

- Git repository initialized
- GitHub remote configured
- GitHub CLI (`gh`) installed and authenticated
- Clean working directory (no uncommitted changes initially)

## Error Handling

The command will:
- Check for uncommitted changes before starting
- Verify GitHub authentication
- Ensure the branch doesn't already exist
- Validate that tests pass before pushing
- Provide clear error messages if something fails