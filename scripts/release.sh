#!/bin/bash

# Release script for Coherent.js
# Creates a GitHub release which triggers npm publish and website deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Coherent.js Release Script${NC}\n"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if logged in to gh
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not logged in to GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}❌ You have uncommitted changes${NC}"
    echo "Please commit or stash them first"
    git status -s
    exit 1
fi

# Check if on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo -e "${YELLOW}⚠️  You're on branch '$CURRENT_BRANCH', not 'main'${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Pull latest changes
echo -e "${BLUE}📥 Pulling latest changes...${NC}"
git pull origin "$CURRENT_BRANCH"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${GREEN}$CURRENT_VERSION${NC}\n"

# Ask for release type
echo "Select release type:"
echo "  1) Patch (1.0.0-beta.1 → 1.0.0-beta.2)"
echo "  2) Minor (1.0.0-beta.1 → 1.1.0-beta.1)"
echo "  3) Major (1.0.0-beta.1 → 2.0.0-beta.1)"
echo "  4) Remove beta (1.0.0-beta.1 → 1.0.0)"
echo "  5) Custom version"
read -p "Choice (1-5): " CHOICE

case $CHOICE in
    1)
        NEW_VERSION=$(node -p "require('semver').inc('$CURRENT_VERSION', 'prerelease', 'beta')")
        IS_PRERELEASE=true
        ;;
    2)
        NEW_VERSION=$(node -p "require('semver').inc('$CURRENT_VERSION', 'preminor', 'beta')")
        IS_PRERELEASE=true
        ;;
    3)
        NEW_VERSION=$(node -p "require('semver').inc('$CURRENT_VERSION', 'premajor', 'beta')")
        IS_PRERELEASE=true
        ;;
    4)
        # Remove prerelease tag
        NEW_VERSION=$(echo "$CURRENT_VERSION" | sed -E 's/-beta\.[0-9]+//')
        IS_PRERELEASE=false
        ;;
    5)
        read -p "Enter version (e.g., 1.0.0-beta.2): " NEW_VERSION
        if [[ $NEW_VERSION == *"beta"* ]] || [[ $NEW_VERSION == *"rc"* ]] || [[ $NEW_VERSION == *"alpha"* ]]; then
            IS_PRERELEASE=true
        else
            IS_PRERELEASE=false
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}New version: $NEW_VERSION${NC}"
if [[ "$IS_PRERELEASE" == "true" ]]; then
    echo -e "${YELLOW}Release type: Prerelease (beta)${NC}"
else
    echo -e "${GREEN}Release type: Stable${NC}"
fi

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

# Update package versions using jq
echo -e "\n${BLUE}📝 Updating package versions...${NC}"
find packages -name "package.json" -type f | while read -r pkg; do
    jq ".version = \"$NEW_VERSION\"" "$pkg" > "$pkg.tmp" && mv "$pkg.tmp" "$pkg"
    echo "  ✓ Updated $(dirname "$pkg")"
done

# Update root package.json
jq ".version = \"$NEW_VERSION\"" package.json > package.json.tmp && mv package.json.tmp package.json
echo "  ✓ Updated root package.json"

# Commit version changes
echo -e "\n${BLUE}📝 Committing version changes...${NC}"
git add .
git commit -m "chore: release v$NEW_VERSION"

# Create git tag
echo -e "\n${BLUE}🏷️  Creating git tag...${NC}"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push changes and tag
echo -e "\n${BLUE}📤 Pushing to GitHub...${NC}"
git push origin "$CURRENT_BRANCH"
git push origin "v$NEW_VERSION"

# Create GitHub release
echo -e "\n${BLUE}🎉 Creating GitHub release...${NC}"
RELEASE_FLAGS="--generate-notes --latest"
if [[ "$IS_PRERELEASE" == "true" ]]; then
    RELEASE_FLAGS="$RELEASE_FLAGS --prerelease"
fi

gh release create "v$NEW_VERSION" \
    $RELEASE_FLAGS \
    --title "v$NEW_VERSION" \
    --notes-file - <<EOF
## What's Changed

Auto-generated release notes below.

### Installation

\`\`\`bash
npm install @coherent.js/core@$NEW_VERSION
\`\`\`

### Full Changelog

See below for all changes in this release.
EOF

echo -e "\n${GREEN}✅ Release created successfully!${NC}"
echo -e "${BLUE}📦 GitHub Actions will:${NC}"
echo "  1. Run tests"
echo "  2. Build packages"
if [[ "$IS_PRERELEASE" == "true" ]]; then
    echo "  3. Publish to npm with @beta tag"
else
    echo "  3. Publish to npm with @latest tag"
fi
echo "  4. Deploy website to GitHub Pages"

echo -e "\n${BLUE}🔗 View release:${NC}"
gh release view "v$NEW_VERSION" --web
