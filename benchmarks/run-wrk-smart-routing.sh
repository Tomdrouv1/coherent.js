#!/bin/bash

# Coherent.js Smart Routing Performance Benchmark Script
# Measures performance improvement from smart route matching optimization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default benchmark parameters
DURATION=10
THREADS=4
CONNECTIONS=20

# Function to print colored status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${GREEN}=== $1 ===${NC}"
}

print_optimization() {
    echo -e "${YELLOW}=== $1 ===${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--duration)
            DURATION="$2"
            shift 2
            ;;
        -t|--threads)
            THREADS="$2"
            shift 2
            ;;
        -c|--connections)
            CONNECTIONS="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -d, --duration DURATION    Test duration in seconds (default: 10)"
            echo "  -t, --threads THREADS      Number of threads (default: 4)"
            echo "  -c, --connections CONNECTIONS  Number of connections (default: 20)"
            echo "  -h, --help                Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if wrk is installed
if ! command -v wrk &> /dev/null; then
    print_error "wrk benchmarking tool is not installed"
    print_status "Install wrk with: sudo apt-get install wrk (Ubuntu/Debian)"
    print_status "Or: brew install wrk (macOS)"
    exit 1
fi

if ! pnpm exec node --version &> /dev/null; then
    print_error "pnpm/node not available"
    exit 1
fi

print_status "Coherent.js Smart Routing Performance Benchmark"
print_status "Duration: ${DURATION}s, Threads: ${THREADS}, Connections: ${CONNECTIONS}"
print_status "Starting smart routing test servers..."

# Pre-start cleanup
print_status "Cleaning up any existing processes on ports 8001-8005..."
for port in 8001 8002 8003 8004 8005; do
  lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
done
sleep 1

# Function to cleanup servers
cleanup_servers() {
  print_status "Stopping smart routing test servers..."
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

# Start the smart routing servers
pnpm exec node benchmarks/servers-smart-routing.js &
SERVERS_PID=$!

# Wait for servers to start
print_status "Waiting for servers to start..."
sleep 3

# Check if servers are running
if ! curl -s http://localhost:8001/ > /dev/null; then
    print_error "Smart routing test servers failed to start"
    exit 1
fi

print_success "Smart routing test servers started successfully"
print_status "Running smart routing performance tests..."

echo ""
echo "======================================================="
print_header "Node.js HTTP (Baseline - No Framework)"
echo "======================================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:8001/

echo ""
echo "======================================================="
print_header "Express.js (Standard Routing)"
echo "======================================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:8002/

echo ""
echo "======================================================="
print_optimization "Coherent.js (Original Routing - All Regex)"
echo "======================================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:8003/

echo ""
echo "======================================================="
print_optimization "Coherent.js (Smart Routing - O(1) Static + Regex Dynamic)"
echo "======================================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:8004/

echo ""
echo "======================================================="
print_optimization "Coherent.js (Ultra-Optimized - Smart + Minimal Headers)"
echo "======================================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:8005/

echo ""
print_success "Smart routing performance benchmark complete!"
print_status "Expected results: Smart routing should show significant improvement"
print_status "Static route optimization should provide 8-15% performance gain"

print_status "Stopping smart routing test servers..."
cleanup_servers

echo ""
print_status "Smart routing benchmark completed successfully!"
print_status "Compare results to see the performance improvement from smart routing."
