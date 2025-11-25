#!/bin/bash

# Security Header Optimization Benchmark Script

set -e

# Initialize NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 24.11.1 2>/dev/null || nvm use

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_optimization() {
    echo -e "${YELLOW}[OPT]${NC} $1"
}

# Default parameters
DURATION=10
THREADS=2
CONNECTIONS=10

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d) DURATION="$2"; shift 2 ;;
        -t) THREADS="$2"; shift 2 ;;
        -c) CONNECTIONS="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

print_status "Coherent.js Security Header Optimization Benchmark"
print_status "Duration: ${DURATION}s, Threads: ${THREADS}, Connections: ${CONNECTIONS}"

# Check tools
if ! command -v wrk &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} wrk not found. Install with: sudo apt-get install wrk"
    exit 1
fi

if ! pnpm exec node --version &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} pnpm/node not available"
    exit 1
fi

print_status "Starting optimization test servers..."

# Pre-start cleanup
print_status "Cleaning up any existing processes on ports 8001-8005..."
for port in 8001 8002 8003 8004 8005; do
  lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
done
sleep 1

# Function to cleanup servers
cleanup_servers() {
  print_status "Stopping optimization test servers..."
  if [ ! -z "$SERVERS_PID" ]; then
    kill $SERVERS_PID 2>/dev/null || true
    sleep 1
    kill -9 $SERVERS_PID 2>/dev/null || true
  fi

  for port in 8001 8002 8003 8004 8005; do
    lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
  done
}

# Set up signal handlers
trap cleanup_servers EXIT INT TERM

# Start the optimized servers
pnpm exec node benchmarks/servers-header-optimized.js &
SERVERS_PID=$!

# Wait for servers to start
print_status "Waiting for servers to start..."
sleep 5

# Check if process is still running
if ! kill -0 $SERVERS_PID 2>/dev/null; then
    echo -e "${RED}[ERROR]${NC} Optimization test servers failed to start"
    exit 1
fi

print_status "Running security header optimization tests..."

echo ""
echo "======================================================="
print_header "Node.js HTTP (Baseline - No Headers)"
echo "======================================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:8001/

echo ""
echo "======================================================="
print_header "Express.js (Standard Headers)"
echo "======================================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:8002/

echo ""
echo "======================================================="
print_optimization "Coherent.js (Original - All Security Headers)"
echo "======================================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:8003/

echo ""
echo "======================================================="
print_optimization "Coherent.js (CORS Only - Security Headers Disabled)"
echo "======================================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:8004/

echo ""
echo "======================================================="
print_optimization "Coherent.js (Minimal Headers - Ultra Optimized)"
echo "======================================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:8005/

echo ""
print_status "Security header optimization benchmark complete!"
print_status "Expected results: Minimal headers should be closest to Node.js baseline"
