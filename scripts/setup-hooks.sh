#!/bin/bash

# Setup Husky Git Hooks

echo "Setting up Git hooks..."

# Create .husky directory
mkdir -p .husky

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
echo "🔍 Running pre-commit checks..."

# Run linting
echo "📝 Linting code..."
pnpm lint || exit 1

# Run formatting check  
echo "💅 Checking code formatting..."
pnpm format:check || exit 1

# Run type checking
echo "🔧 Type checking..."
pnpm typecheck || exit 1

# Run tests (only fast unit tests)
echo "🧪 Running unit tests..."
pnpm test:unit || exit 1

echo "✅ Pre-commit checks passed!"
EOF

# Create commit-msg hook for conventional commits
cat > .husky/commit-msg << 'EOF'
#!/usr/bin/env sh
pnpm commitlint --edit "$1"
EOF

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg

echo "✅ Git hooks set up successfully!"