#!/bin/bash

# Internal benchmark script that doesn't require external tools
# Uses the existing benchmark.js internal logic

set -e

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
REQUESTS=${1:-1000}

print_status "Starting Internal Benchmark Suite"
print_status "Requests per test: $REQUESTS"
echo

# Create a simple benchmark results file
RESULTS_FILE="benchmark-results-$(date +%Y%m%d-%H%M%S).txt"

echo "Coherent.js Internal Benchmark Results - $(date)" > "$RESULTS_FILE"
echo "Requests per test: $REQUESTS" >> "$RESULTS_FILE"
echo "==========================================" >> "$RESULTS_FILE"
echo

# Function to run individual benchmark files
run_individual_benchmark() {
    local server_name=$1
    local server_file=$2

    print_status "Running $server_name benchmark..."

    if [ -f "$server_file" ]; then
        # Try to run the benchmark file directly
        if node "$server_file" 2>/dev/null | tee -a "$RESULTS_FILE"; then
            print_success "$server_name benchmark completed"
        else
            print_warning "$server_name benchmark failed (missing dependencies)"
        fi
    else
        print_warning "$server_name benchmark file not found"
    fi
    echo
}

# Run the main benchmark (which includes all three servers)
print_status "Running main Coherent.js benchmark suite..."
if node benchmarks/benchmark.js 2>/dev/null | tee -a "$RESULTS_FILE"; then
    print_success "Main benchmark completed"
else
    print_error "Main benchmark failed - trying individual files..."
    echo

    # Fall back to individual benchmark files
    run_individual_benchmark "Express.js Standalone" "benchmarks/express-benchmark.js"
    run_individual_benchmark "Fastify" "benchmarks/fastify-benchmark.js"
    run_individual_benchmark "Koa" "benchmarks/koa-benchmark.js"
    run_individual_benchmark "Deno" "benchmarks/deno-benchmark.js"
    run_individual_benchmark "Bun" "benchmarks/bun-benchmark.js"
fi

print_success "Internal benchmark suite completed!"
print_status "Results saved to: $RESULTS_FILE"

echo
print_status "Benchmark Summary:"
echo "========================="
if [ -f "$RESULTS_FILE" ]; then
    grep -E "(Results:|Requests per second:|Summary:)" "$RESULTS_FILE" | tail -10
fi

print_success "All benchmarks completed!"
