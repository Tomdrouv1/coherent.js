#!/bin/bash

# Coherent.js wrk benchmarks

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_tools() {
  local missing_tools=()
  
  if ! command -v wrk &> /dev/null; then
    missing_tools+=("wrk")
  fi
  
  if ! command -v node &> /dev/null; then
    missing_tools+=("node")
  fi
  
  # Check for Deno and Bun in the PATH
  if ! command -v deno &> /dev/null; then
    missing_tools+=("deno")
  fi
  
  if ! command -v bun &> /dev/null; then
    missing_tools+=("bun")
  fi
  
  if [ ${#missing_tools[@]} -ne 0 ]; then
    print_error "Missing required tools: ${missing_tools[*]}"
    print_error "Please install the missing tools and try again."
    exit 1
  fi
}

# Default values
DURATION=30
THREADS=4
CONNECTIONS=100

# Print usage
usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Run wrk benchmarks for Coherent.js API server"
  echo ""
  echo "Options:"
  echo "  -d, --duration DURATION    Duration of the test in seconds (default: 30)"
  echo "  -t, --threads THREADS      Number of threads to use (default: 4)"
  echo "  -c, --connections CONN     Number of concurrent connections (default: 100)"
  echo "  -h, --help                 Show this help message"
  exit 1
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
      usage
      ;;
    *)
      print_error "Unknown option $1"
      usage
      ;;
  esac
done

# Check if all required tools are installed
check_tools

# Start Coherent.js HTTP/1.1 server in the background
print_status "Starting Coherent.js HTTP/1.1 server..."
node ./benchmarks/benchmark.js &
HTTP1_PID=$!

# Wait a moment for server to start
sleep 2

# Start Coherent.js HTTP/2 server in the background
print_status "Starting Coherent.js HTTP/2 server..."
node ./benchmarks/benchmark-http2.js &
HTTP2_PID=$!

# Wait a moment for server to start
sleep 2

# Start Express.js server in the background
print_status "Starting Express.js server..."
node ./benchmarks/benchmark-pure-node.js &
EXPRESS_PID=$!

# Wait a moment for server to start
sleep 2

# Start Express benchmark server in the background
print_status "Starting Express benchmark server..."
node ./benchmarks/express-benchmark.js &
EXPRESS_BENCHMARK_PID=$!

# Wait a moment for server to start
sleep 2

# Start Fastify benchmark server in the background
print_status "Starting Fastify benchmark server..."
node ./benchmarks/fastify-benchmark.js &
FASTIFY_BENCHMARK_PID=$!

# Wait a moment for server to start
sleep 2

# Start Koa benchmark server in the background
print_status "Starting Koa benchmark server..."
node ./benchmarks/koa-benchmark.js &
KOA_BENCHMARK_PID=$!

# Wait a moment for server to start
sleep 2

# Start Deno benchmark server in the background
print_status "Starting Deno benchmark server..."
deno run --allow-net ./benchmarks/deno-benchmark.js &
DENO_BENCHMARK_PID=$!

# Wait a moment for server to start
sleep 2

# Start Bun benchmark server in the background
print_status "Starting Bun benchmark server..."
bun ./benchmarks/bun-benchmark.js &
BUN_BENCHMARK_PID=$!

# Wait a moment for server to start
sleep 2

# Run wrk benchmarks
print_status "Running wrk benchmarks..."

echo "==========================================="
echo "Coherent.js HTTP/1.1 Server Benchmark"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:3000/
echo ""

echo "==========================================="
echo "Coherent.js HTTP/2 Server Benchmark"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION https://localhost:3001/
echo ""

echo "==========================================="
echo "Express.js Server Benchmark"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:3002/
echo ""

echo "==========================================="
echo "Express Benchmark Server"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:4003/
echo ""

echo "==========================================="
echo "Fastify Benchmark Server"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:4004/
echo ""

echo "==========================================="
echo "Koa Benchmark Server"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:4005/
echo ""

echo "==========================================="
echo "Deno Benchmark Server"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:4006/
echo ""

echo "==========================================="
echo "Bun Benchmark Server"
echo "==========================================="
wrk -t$THREADS -c$CONNECTIONS -d$DURATION http://localhost:4007/
echo ""

# Kill all background processes
print_status "Stopping servers..."
kill $HTTP1_PID $HTTP2_PID $EXPRESS_PID $EXPRESS_BENCHMARK_PID $FASTIFY_BENCHMARK_PID $KOA_BENCHMARK_PID $DENO_BENCHMARK_PID $BUN_BENCHMARK_PID 2>/dev/null || true

print_status "Benchmarking complete!"
