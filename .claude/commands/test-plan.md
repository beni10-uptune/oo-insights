# Claude Command: Test Plan

This command helps create comprehensive testing plans for your code, including unit tests, integration tests, and e2e tests.

## Usage

```
/test-plan <component-or-feature>
```

Examples:
```
/test-plan WebActivityTracker
/test-plan api/trends
/test-plan search-trends-component
```

## What This Command Does

1. Analyzes the specified component or feature
2. Identifies key functionality that needs testing
3. Creates a comprehensive testing plan including:
   - Unit tests for individual functions
   - Integration tests for API endpoints
   - Component tests for React components
   - E2E tests for critical user flows
4. Suggests test cases with expected inputs and outputs
5. Identifies edge cases and error scenarios
6. Recommends refactoring if code is difficult to test
7. Provides example test implementations

## Testing Strategy

### Unit Tests
- Test individual functions in isolation
- Mock external dependencies
- Focus on pure logic and calculations
- Test edge cases and error handling

### Integration Tests
- Test API endpoints with real database
- Verify data persistence and retrieval
- Test authentication and authorization
- Validate request/response formats

### Component Tests
- Test React components with React Testing Library
- Verify user interactions
- Test conditional rendering
- Validate prop handling

### E2E Tests
- Test complete user workflows
- Verify cross-component interactions
- Test real browser behavior
- Validate critical business flows

## Best Practices

- **Test behavior, not implementation**: Focus on what the code does, not how
- **Use descriptive test names**: Clearly state what is being tested
- **Follow AAA pattern**: Arrange, Act, Assert
- **Test edge cases**: Empty inputs, null values, extreme values
- **Mock external dependencies**: Keep tests isolated and fast
- **Use test data builders**: Create reusable test data factories
- **Keep tests maintainable**: Avoid brittle selectors and magic values

## Output Format

The command will provide:
1. Overview of what needs testing
2. List of test cases with descriptions
3. Suggested test structure
4. Example test implementations
5. Refactoring suggestions if needed
6. Coverage recommendations