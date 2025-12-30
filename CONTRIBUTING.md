# Contributing to TaskFlow

Thank you for your interest in contributing to TaskFlow! This document provides guidelines and instructions for contributing to this DevOps learning project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Git Workflow](#git-workflow)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [DevOps Best Practices](#devops-best-practices)

## Code of Conduct

This project follows a Code of Conduct to ensure a welcoming environment for all contributors. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- Git
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 13+ (for local development)
- Basic understanding of DevOps concepts

### Initial Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/TaskFlow.git
   cd TaskFlow
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/TaskFlow.git
   ```

4. Install dependencies:
   ```bash
   # Frontend
   cd app/frontend
   npm install

   # Backend
   cd ../backend
   npm install
   ```

5. Start development environment:
   ```bash
   # From project root
   docker-compose up -d
   ```

6. Verify everything works:
   ```bash
   # Check health endpoints
   curl http://localhost:3000/health
   curl http://localhost:5173/health
   ```

## Development Workflow

### 1. Create an Issue First

Before starting work, create or find an existing issue:
- Use issue templates (Feature Request, Bug Report, or Task)
- Clearly describe what you plan to do
- Wait for discussion/approval for major changes

### 2. Create a Branch

Branch naming conventions:

- `feature/short-description` - New features
- `bugfix/short-description` - Bug fixes
- `hotfix/short-description` - Urgent production fixes
- `docs/short-description` - Documentation updates
- `refactor/short-description` - Code refactoring
- `test/short-description` - Test improvements

Examples:
```bash
git checkout -b feature/add-task-tags
git checkout -b bugfix/fix-login-redirect
git checkout -b docs/update-k8s-guide
```

### 3. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add/update tests
- Update documentation

### 4. Test Your Changes

```bash
# Frontend tests
cd app/frontend
npm test
npm run lint

# Backend tests
cd app/backend
npm test
npm run lint

# Docker build test
docker-compose build
docker-compose up -d
```

### 5. Commit Your Changes

Follow the [commit message guidelines](#commit-messages).

### 6. Push and Create PR

```bash
git push origin your-branch-name
```

Then create a Pull Request using the PR template.

## Git Workflow

We use a simplified Git Flow:

### Main Branches

- `main` - Production-ready code
- `develop` - Integration branch for features (optional)

### Feature Development

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Keep your branch updated
git fetch upstream
git rebase upstream/main

# Push your branch
git push origin feature/my-feature
```

### Staying Updated

```bash
# Fetch latest changes
git fetch upstream

# Rebase your branch
git rebase upstream/main

# If conflicts occur, resolve them and continue
git add .
git rebase --continue
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `build` - Build system changes
- `ci` - CI/CD pipeline changes
- `chore` - Other changes (dependencies, configs)
- `revert` - Revert a previous commit

### Examples

```bash
# Feature
git commit -m "feat(frontend): add task filtering by priority"

# Bug fix
git commit -m "fix(backend): resolve authentication token expiration issue"

# Documentation
git commit -m "docs(readme): update installation instructions"

# With body
git commit -m "feat(k8s): add horizontal pod autoscaling

- Add HPA configuration for backend
- Set CPU threshold to 70%
- Min replicas: 2, Max replicas: 10

Closes #123"
```

### Best Practices

- Use present tense: "add feature" not "added feature"
- Use imperative mood: "move cursor to..." not "moves cursor to..."
- First line should be 50 characters or less
- Reference issues: "Closes #123" or "Fixes #456"
- Explain **what** and **why**, not **how**

## Pull Request Process

### Before Creating PR

1. ✅ Rebase on latest main
2. ✅ All tests passing
3. ✅ Linter passes
4. ✅ Documentation updated
5. ✅ No merge conflicts
6. ✅ Commits follow convention

### Creating the PR

1. Use the PR template
2. Fill out all relevant sections
3. Link to related issues
4. Add screenshots/recordings if UI changes
5. Request review from maintainers

### PR Review Process

- At least one approval required
- All CI checks must pass
- Address all review comments
- Keep PR focused (one feature/fix per PR)
- Be responsive to feedback

### After PR is Merged

- Delete your feature branch
- Close related issues
- Update your fork:
  ```bash
  git checkout main
  git pull upstream main
  git push origin main
  ```

## Coding Standards

### JavaScript/React

- Use ES6+ features
- Use functional components and hooks
- Follow Airbnb JavaScript Style Guide
- Use meaningful variable names
- Max line length: 100 characters
- Use single quotes for strings
- Add JSDoc comments for functions

### File Structure

```javascript
// 1. Imports
import React from 'react'
import { useState } from 'react'

// 2. Constants
const MAX_ITEMS = 10

// 3. Component
const MyComponent = ({ prop1, prop2 }) => {
  // Hooks
  const [state, setState] = useState(null)

  // Functions
  const handleClick = () => {
    // ...
  }

  // Render
  return <div>...</div>
}

// 4. Exports
export default MyComponent
```

### Backend

- Use async/await over promises
- Handle errors properly
- Log important operations
- Validate all inputs
- Use middleware for common tasks
- Follow RESTful conventions

### SQL

- Use lowercase for keywords
- Use snake_case for table/column names
- Add indexes for frequently queried columns
- Include comments for complex queries

## Testing Guidelines

### Frontend Tests

```javascript
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Backend Tests

```javascript
import request from 'supertest'
import app from '../app'

describe('POST /api/tasks', () => {
  it('should create a new task', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test Task' })
      .expect(201)

    expect(response.body.task.title).toBe('Test Task')
  })
})
```

### Test Coverage

- Aim for 80%+ coverage
- Test happy paths and edge cases
- Test error handling
- Mock external dependencies

## Documentation

### Code Documentation

- Add comments for complex logic
- Document all public APIs
- Include examples in comments
- Keep comments up-to-date

### User Documentation

When updating user-facing features:
- Update README.md
- Update relevant guides in /docs
- Add examples
- Include screenshots if needed

### API Documentation

Document all API endpoints:
```javascript
/**
 * Create a new task
 * @route POST /api/tasks
 * @param {string} title - Task title (required)
 * @param {string} description - Task description
 * @param {string} status - todo|in_progress|completed
 * @param {string} priority - low|medium|high
 * @returns {Object} Created task object
 */
```

## DevOps Best Practices

### Docker

- Use multi-stage builds
- Minimize layer count
- Don't run as root
- Use .dockerignore
- Include health checks
- Tag images properly

### Kubernetes

- Use namespaces
- Set resource limits
- Define health checks
- Use ConfigMaps/Secrets
- Follow naming conventions

### Terraform

- Use variables
- Use modules
- Add comments
- Include outputs
- Use .tfvars for values
- Never commit secrets

### Ansible

- Use roles
- Make playbooks idempotent
- Use variables
- Add tags
- Include check mode support
- Document playbooks

### CI/CD

- Keep pipelines fast
- Run tests in parallel
- Cache dependencies
- Fail fast
- Use pipeline as code

### Monitoring

- Add metrics for new features
- Create alerts for errors
- Update dashboards
- Log important events
- Use structured logging

## Questions?

- Create a [Discussion](https://github.com/YOUR_USERNAME/TaskFlow/discussions)
- Comment on related issues
- Join our community chat (if available)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to TaskFlow!** 🚀

Your contributions help make this a better learning resource for everyone interested in DevOps.
