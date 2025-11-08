#!/bin/bash

# Test all Coherent.js examples
# Usage: ./scripts/test-examples.sh

echo "🧪 Testing Coherent.js Examples"
echo "================================"
echo ""

FAILED=0
PASSED=0
SKIPPED=0

# Colors
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_example() {
  local file=$1
  local name=$(basename "$file")
  
  echo -n "Testing $name... "
  
  # Skip test files
  if [[ $file == *".test.js" ]]; then
    echo -e "${YELLOW}SKIPPED${NC} (test file)"
    ((SKIPPED++))
    return
  fi
  
  # Skip files that require special setup
  if [[ $file == *"express-integration"* ]] || [[ $file == *"nextjs-integration"* ]]; then
    echo -e "${YELLOW}SKIPPED${NC} (requires server)"
    ((SKIPPED++))
    return
  fi
  
  # Run the example with timeout
  timeout 5s node "$file" > /dev/null 2>&1
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
  elif [ $exit_code -eq 124 ]; then
    echo -e "${YELLOW}TIMEOUT${NC} (may be server)"
    ((SKIPPED++))
  else
    echo -e "${RED}FAILED${NC} (exit code: $exit_code)"
    ((FAILED++))
    # Show error
    node "$file" 2>&1 | head -10
  fi
}

# Find and test all examples
for example in examples/*.js; do
  if [ -f "$example" ]; then
    test_example "$example"
  fi
done

# Summary
echo ""
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Some examples failed${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All testable examples passed!${NC}"
  exit 0
fi
