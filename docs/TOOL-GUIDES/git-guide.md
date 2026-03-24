# Git Guide for TaskFlow

Git workflow and best practices for TaskFlow development.

## Basic Workflow

```bash
# Clone repository
git clone <repo-url>
cd TaskFlow

# Create feature branch
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request on GitHub
```

## Commit Message Convention

TaskFlow uses conventional commits:

```
<type>: <description>

feat: New feature
fix: Bug fix
docs: Documentation
style: Formatting
refactor: Code restructuring
test: Add tests
chore: Maintenance
```

Examples:
```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve database connection issue"
git commit -m "docs: update README with deployment steps"
```

## Useful Commands

```bash
# View status
git status

# View commit history
git log --oneline --graph

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard changes
git checkout -- <file>

# Update from main
git pull origin main

# Merge main into feature branch
git checkout feature/my-feature
git merge main

# Resolve conflicts
git status  # See conflicted files
# Edit files to resolve
git add .
git commit
```

## Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `hotfix/*`: Urgent production fixes

## GitHub Workflow

1. Fork repository (if external contributor)
2. Create feature branch
3. Make changes and commit
4. Push to GitHub
5. Create Pull Request
6. Wait for CI/CD checks
7. Address review comments
8. Merge after approval

## Resources
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
