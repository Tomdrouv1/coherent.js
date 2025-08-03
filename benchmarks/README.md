# Coherent.js Benchmarks

This directory contains performance benchmarks for the Coherent.js API framework, comparing it against other popular Node.js frameworks.

## Benchmark Scripts

- `benchmark.js`: Coherent.js API server with Express.js integration (HTTP/1.1)
- `benchmark-http2.js`: Coherent.js API server with HTTP/2 support
- `benchmark-pure-node.js`: Coherent.js API server running on pure Node.js HTTP server (HTTP/1.1)
- `run-wrk-benchmarks.sh`: Automated benchmark runner using wrk

## Running Benchmarks

To run the benchmarks, execute the `run-wrk-benchmarks.sh` script:

```bash
./benchmarks/run-wrk-benchmarks.sh
```

This will start all servers and run wrk benchmarks against each one.

## wrk Installation

wrk is a modern HTTP benchmarking tool capable of generating significant load when run on a single multi-core CPU. It combines a multithreaded design with scalable event notification systems such as epoll and kqueue.

### Installing wrk on macOS

Using Homebrew:

```bash
brew install wrk
```

### Installing wrk on Ubuntu/Debian

```bash
sudo apt-get install wrk
```

### Installing wrk from source

```bash
git clone https://github.com/wg/wrk.git wrk
cd wrk
make
# Move the wrk binary to somewhere in your PATH, e.g.:
sudo cp wrk /usr/local/bin
```

## Interpreting Results

The benchmark results will show requests per second (req/s) for each server configuration. Higher numbers indicate better performance.

The results will also show latency percentiles (50%, 75%, 90%, 99%) which indicate how quickly the server responds to requests. Lower numbers indicate better performance.

## Benchmark Configuration

The `run-wrk-benchmarks.sh` script uses the following default configuration:

- Duration: 30 seconds
- Threads: 4
- Connections: 100

These can be customized using command line options:

```bash
./benchmarks/run-wrk-benchmarks.sh -d 60 -t 8 -c 200
```
See [REPORT.md](./REPORT.md) for detailed results and analysis.
