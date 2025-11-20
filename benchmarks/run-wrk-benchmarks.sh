#!/bin/bash

# Super simple wrk benchmark - just start the working benchmark and test it

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

# Parse arguments properly
while [[ $# -gt 0 ]]; do
    case $1 in
        -d) DURATION="$2"; shift 2 ;;
        -t) THREADS="$2"; shift 2 ;;
        -c) CONNECTIONS="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

print_status "Simple Coherent.js wrk Benchmark"
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

print_status "Starting Coherent.js benchmark servers..."

# Pre-start cleanup: kill any existing processes on our ports
print_status "Cleaning up any existing processes on ports 7001-7003..."
for port in 7001 7002 7003; do
  lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
done
sleep 1

# Function to cleanup servers
cleanup_servers() {
  print_status "Stopping benchmark servers..."
  if [ ! -z "$SERVERS_PID" ]; then
    kill $SERVERS_PID 2>/dev/null || true
    sleep 1
    # Force kill if still running
    kill -9 $SERVERS_PID 2>/dev/null || true
  fi

  # Also kill any processes using our ports
  for port in 7001 7002 7003; do
    lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
  done
}

# Set up signal handlers for cleanup
trap cleanup_servers EXIT INT TERM

# Start the simple servers script in background (it just starts servers on fixed ports)
pnpm exec node benchmarks/servers.js &
SERVERS_PID=$!

# Wait for servers to start
print_status "Waiting for servers to start..."
sleep 5

# Check if process is still running
if ! kill -0 $SERVERS_PID 2>/dev/null; then
    print_error "Benchmark servers failed to start"
    exit 1
fi

print_status "Running wrk tests..."

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
echo "Coherent.js API Server (Port 7003)"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:7003/ || \
    echo "Note: Server might be on different port due to port conflicts"

# Cleanup will be handled automatically by the trap
print_status "Simple wrk benchmark complete!"
