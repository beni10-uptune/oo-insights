# Claude Command: Analyze

Perform comprehensive code analysis including complexity, dependencies, and potential issues.

## Usage

```
/analyze [target]
```

Examples:
- `/analyze` - Analyze entire codebase
- `/analyze src/components` - Analyze specific directory
- `/analyze src/lib/api.ts` - Analyze specific file

## What This Command Does

1. **Code Complexity Analysis**
   - Cyclomatic complexity per function
   - Cognitive complexity scores
   - Lines of code metrics
   - Nesting depth analysis

2. **Dependency Analysis**
   - Unused dependencies in package.json
   - Circular dependencies detection
   - Import/export relationships
   - Bundle size impact

3. **Performance Analysis**
   - Large bundle detection
   - Render-blocking resources
   - Unnecessary re-renders (React)
   - Database query optimization opportunities

4. **Security Analysis**
   - Known vulnerabilities in dependencies
   - Hardcoded secrets/API keys
   - SQL injection risks
   - XSS vulnerabilities

5. **Code Quality Metrics**
   - Test coverage gaps
   - Documentation coverage
   - TODO/FIXME comments
   - Code duplication

## Output Report

The analysis provides:

### Summary Statistics
- Total files analyzed
- Lines of code
- Test coverage percentage
- Number of dependencies

### Issues by Severity
- 🔴 **Critical**: Security vulnerabilities, breaking bugs
- 🟡 **Warning**: Performance issues, code smells
- 🔵 **Info**: Suggestions, minor improvements

### Detailed Findings
```
📁 src/components/Dashboard.tsx
  ⚠️ High complexity: handleSubmit() has cyclomatic complexity of 15
  ⚠️ Potential memory leak: Event listener not cleaned up
  💡 Consider memoizing expensive calculation on line 142

📁 src/api/users.ts
  🔴 SQL injection risk: Raw query construction on line 87
  ⚠️ No error handling for database connection
```

### Recommendations
- Priority fixes ordered by impact
- Refactoring suggestions
- Performance optimization opportunities
- Security hardening steps

## Metrics Explained

### Cyclomatic Complexity
- 1-10: Simple, low risk
- 11-20: Moderate complexity
- 21-50: High complexity, refactor recommended
- 50+: Very high risk, refactor required

### Code Coverage
- 80%+: Good coverage
- 60-79%: Adequate coverage
- <60%: Needs improvement

### Bundle Size
- <200KB: Excellent
- 200-500KB: Good
- 500KB-1MB: Consider optimization
- >1MB: Needs optimization

## Integration with CI/CD

Can be configured to:
- Run on pull requests
- Block merges if critical issues found
- Generate reports for code review
- Track metrics over time

## Configuration

Create `.claude/analyze.config.json`:
```json
{
  "complexity": {
    "max": 15
  },
  "coverage": {
    "minimum": 80
  },
  "ignore": [
    "*.test.ts",
    "*.spec.ts"
  ]
}
```

## Best Practices

- Run regularly during development
- Address critical issues immediately
- Track metrics trends over time
- Use as part of code review process
- Set team standards for metrics