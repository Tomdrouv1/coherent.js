#!/bin/bash

# Optimized Coherent.js wrk benchmark - testing without Express wrapper

set -e

# Initialize NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 24.11.1 2>/dev/null || nvm use

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default parameters
DURATION=30
THREADS=4
CONNECTIONS=100

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d) DURATION="$2"; shift 2 ;;
        -t) THREADS="$2"; shift 2 ;;
        -c) CONNECTIONS="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

print_status "Optimized Coherent.js wrk Benchmark"
print_status "Duration: ${DURATION}s, Threads: ${THREADS}, Connections: ${CONNECTIONS}"

# Check tools
if ! command -v wrk &> /dev/null; then
    print_error "wrk not found. Install with: sudo apt-get install wrk"
    exit 1
fi

if ! pnpm exec node --version &> /dev/null; then
    print_error "pnpm/node not available"
    exit 1
fi

print_status "Starting optimized benchmark servers..."

# Pre-start cleanup
print_status "Cleaning up any existing processes on ports 7001-7003..."
for port in 7001 7002 7003; do
  lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
done
sleep 1

# Function to cleanup servers
cleanup_servers() {
  print_status "Stopping optimized benchmark servers..."
  if [ ! -z "$SERVERS_PID" ]; then
    kill $SERVERS_PID 2>/dev/null || true
    sleep 1
    kill -9 $SERVERS_PID 2>/dev/null || true
  fi

  for port in 7001 7002 7003; do
    lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
  done
}

# Set up signal handlers
trap cleanup_servers EXIT INT TERM

# Start the optimized servers
pnpm exec node benchmarks/servers-optimized.js &
SERVERS_PID=$!

# Wait for servers to start
print_status "Waiting for servers to start..."
sleep 5

# Check if process is still running
if ! kill -0 $SERVERS_PID 2>/dev/null; then
    print_error "Optimized benchmark servers failed to start"
    exit 1
fi

print_status "Running optimized wrk tests..."

echo ""
echo "==========================================="
echo "Node.js HTTP Server (Port 7001)"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:7001/ || \
    echo "Note: Server might be on different port due to port conflicts"

echo ""
echo "==========================================="
echo "Express.js Server (Port 7002)"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:7002/ || \
    echo "Note: Server might be on different port due to port conflicts"

echo ""
echo "==========================================="
echo "Coherent.js API Server (Optimized - No Express)"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:7003/ || \
    echo "Note: Server might be on different port due to port conflicts"

print_status "Optimized wrk benchmark complete!"
