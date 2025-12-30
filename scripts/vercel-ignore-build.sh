#!/bin/bash
# Vercel Ignore Build Step
# Exit 1 = proceed with build
# Exit 0 = skip build
#
# This script checks if we should skip the build for this deployment.
# Currently we always build on main branch pushes.

# Get the branch from VERCEL_GIT_COMMIT_REF
BRANCH="${VERCEL_GIT_COMMIT_REF:-main}"

echo "Branch: $BRANCH"

# Always build main branch
if [ "$BRANCH" = "main" ]; then
  echo "Building main branch..."
  exit 1
fi

# For other branches, check if apps/web changed
if git diff HEAD^ HEAD --quiet -- apps/web/; then
  echo "No changes in apps/web, skipping build"
  exit 0
else
  echo "Changes detected in apps/web, proceeding with build"
  exit 1
fi
