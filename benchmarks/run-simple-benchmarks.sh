#!/bin/bash

# Simple benchmark script using Node.js and curl
# Alternative to run-wrk-benchmarks.sh when wrk/deno/bun are not available

set -e

# Set Node.js command (use pnpm to ensure dependencies are available)
NODE_CMD="pnpm exec node"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Default benchmark parameters
DURATION=${1:-10}
CONNECTIONS=${2:-10}
THREADS=${3:-1}

print_status "Starting Simple Benchmark Suite"
print_status "Duration: ${DURATION}s, Connections: ${CONNECTIONS}, Threads: ${THREADS}"
echo

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is required but not installed"
    print_error "Please install pnpm: npm install -g pnpm"
    exit 1
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
    print_error "curl is required but not installed"
    exit 1
fi

# Function to run a simple benchmark with curl
run_curl_benchmark() {
    local server_name=$1
    local server_file=$2
    local port=$3
    local duration=$4
    local connections=$5

    print_status "Starting $server_name benchmark on port $port..."

    # Start server in background
    $NODE_CMD "$server_file" &
    local server_pid=$!

    # Wait for server to start
    sleep 3

    # Check if server is running
    if ! kill -0 $server_pid 2>/dev/null; then
        print_error "$server_name server failed to start"
        return 1
    fi

    print_status "Running curl benchmark for ${duration}s..."

    # Run curl benchmark (multiple parallel connections)
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    local total_requests=0

    while [ $(date +%s) -lt $end_time ]; do
        # Run multiple parallel curl requests
        for i in $(seq 1 $connections); do
            curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/" &
        done
        wait
        total_requests=$((total_requests + connections))
    done

    local actual_duration=$(($(date +%s) - start_time))
    local requests_per_second=$((total_requests / actual_duration))

    print_success "$server_name Results:"
    echo "  Total requests: $total_requests"
    echo "  Duration: ${actual_duration}s"
    echo "  Requests per second: $requests_per_second"
    echo

    # Kill server
    kill $server_pid 2>/dev/null || true
    wait $server_pid 2>/dev/null || true
}

# Create a simple benchmark results file
RESULTS_FILE="benchmark-results-$(date +%Y%m%d-%H%M%S).txt"

echo "Coherent.js Benchmark Results - $(date)" > "$RESULTS_FILE"
echo "Duration: ${DURATION}s, Connections: ${CONNECTIONS}" >> "$RESULTS_FILE"
echo "==========================================" >> "$RESULTS_FILE"
echo

# Run benchmarks for different servers
print_status "Running Node.js benchmarks..."

# 1. Pure Node.js HTTP Server
run_curl_benchmark "Node.js HTTP" "benchmarks/benchmark.js" 6001 "$DURATION" "$CONNECTIONS" | tee -a "$RESULTS_FILE"

# 2. Express.js Server
run_curl_benchmark "Express.js" "benchmarks/benchmark.js" 6002 "$DURATION" "$CONNECTIONS" | tee -a "$RESULTS_FILE"

# 3. Coherent.js API Server
run_curl_benchmark "Coherent.js API" "benchmarks/benchmark.js" 6003 "$DURATION" "$CONNECTIONS" | tee -a "$RESULTS_FILE"

# 4. Express.js Standalone
run_curl_benchmark "Express.js Standalone" "benchmarks/express-benchmark.js" 6004 "$DURATION" "$CONNECTIONS" | tee -a "$RESULTS_FILE"

# 5. Fastify Server (if fastify is available)
if $NODE_CMD -e "require('fastify')" 2>/dev/null; then
    run_curl_benchmark "Fastify" "benchmarks/fastify-benchmark.js" 6005 "$DURATION" "$CONNECTIONS" | tee -a "$RESULTS_FILE"
else
    print_warning "Fastify not available, skipping Fastify benchmark"
fi

# 6. Koa Server (if koa is available)
if $NODE_CMD -e "require('koa')" 2>/dev/null; then
    run_curl_benchmark "Koa" "benchmarks/koa-benchmark.js" 6006 "$DURATION" "$CONNECTIONS" | tee -a "$RESULTS_FILE"
else
    print_warning "Koa not available, skipping Koa benchmark"
fi

print_success "All benchmarks completed!"
print_status "Results saved to: $RESULTS_FILE"

echo
print_status "Benchmark Summary:"
cat "$RESULTS_FILE" | grep -E "(Results:|Requests per second:)" | tail -n +2

print_success "Simple benchmark suite completed successfully!"
