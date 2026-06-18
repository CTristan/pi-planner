# Example Project Planning Context

This is an example `.pi/planning.md` file that you can copy to your project root (in the `.pi/` directory) to provide project-specific planning guidance.

## Usage

1. Create a `.pi` directory in your project root (if it doesn't exist)
2. Copy this file to `.pi/planning.md`
3. Customize the content for your project

## Example Content

```markdown
# Project Planning Guide

## Architecture

### Layer Structure

- **Domain Layer**: Core business logic, entities, and value objects
- **Application Layer**: Use cases, application services, ports
- **Infrastructure Layer**: External services, databases, frameworks
- **Presentation Layer**: UI components, API endpoints, CLI commands

### Code Organization

```
src/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── repositories/
├── application/
│   ├── use-cases/
│   └── ports/
├── infrastructure/
│   ├── database/
│   ├── api/
│   └── services/
└── presentation/
    ├── web/
    └── cli/
```

## Planning Conventions

### When Planning a Feature

1. **Understand the Problem**
   - What is the user trying to accomplish?
   - What are the success criteria?
   - What are the edge cases?

2. **Identify Dependencies**
   - What existing code needs to change?
   - Are there new dependencies to add?
   - Are there breaking changes?

3. **Consider Testing**
   - What unit tests are needed?
   - What integration tests are needed?
   - How to test edge cases?

4. **Plan the Implementation**
   - Break down into small, achievable steps
   - Identify technical risks
   - Consider rollback strategy

### Planning Checklist

- [ ] Problem is clearly defined
- [ ] Success criteria are identified
- [ ] Dependencies are listed
- [ ] Edge cases are considered
- [ ] Testing strategy is defined
- [ ] Implementation steps are broken down
- [ ] Technical risks are identified

## Code Standards

### General

- Use TypeScript for all new code
- Enable strict mode in tsconfig.json
- Write self-documenting code with clear names
- Add comments for complex logic only

### Functions

- Keep functions small (≤ 20 lines)
- Functions should do one thing
- Prefer pure functions when possible
- Avoid side effects in pure functions

### Error Handling

- Use typed errors with error codes
- Never catch and ignore errors
- Log errors with context
- Provide user-friendly error messages

### Testing

- Write tests before implementation (TDD)
- Aim for 80%+ code coverage
- Use descriptive test names
- One assertion per test when possible

## Technology Choices

### Database

- PostgreSQL for relational data
- Redis for caching and sessions
- Elasticsearch for search

### API

- REST for public APIs
- GraphQL for internal APIs
- gRPC for high-performance services

### Frontend

- React for web applications
- React Native for mobile apps
- Biome for linting and formatting

## Deployment

### Environments

- **Development**: Local development with hot reload
- **Staging**: Pre-production testing environment
- **Production**: Production environment with monitoring

### CI/CD

- GitHub Actions for CI
- Automated tests on every push
- Manual approval for production deployments
- Rollback capability via database migrations

## Documentation

### Required Documentation

- README.md: Project overview, setup, usage
- API docs: API specification (OpenAPI/Swagger)
- Architecture docs: System design and decisions
- CHANGELOG.md: Version history and changes

### Documentation Standards

- Keep documentation up to date with code
- Use markdown for all documentation
- Include examples in docs
- Document APIs and public interfaces

## Security

### Security Checklist

- [ ] Input validation on all user inputs
- [ ] Output encoding to prevent XSS
- [ ] Parameterized queries to prevent SQL injection
- [ ] Authentication and authorization checks
- [ ] Secure secrets management
- [ ] HTTPS in production
- [ ] Security headers configured
- [ ] Dependencies scanned for vulnerabilities

## Performance

### Performance Goals

- API responses < 200ms (p95)
- Page load time < 2 seconds
- Database queries < 100ms (p95)
- Memory usage < 1GB per instance

### Monitoring

- Track response times
- Monitor error rates
- Track resource usage
- Set up alerts for anomalies
```

## Customization Tips

1. **Add Your Tech Stack**: Update the technology choices section with your actual stack
2. **Project-Specific Conventions**: Add any coding standards unique to your project
3. **Deployment Details**: Include your actual deployment process and environments
4. **Team Processes**: Add planning workflows used by your team
5. **Common Patterns**: Document architectural patterns used in your codebase

## Related Files

- Global planning context: `~/.pi/planning.md`
- Pi config: `~/.pi/planner.json` and `.pi/planner.json`
- Project planning: Use `/planning <topic>` to start planning sessions
