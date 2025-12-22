import { getCLIVersion } from '../utils/version.js';

// Get current CLI version automatically
const _cliVersion = getCLIVersion();

/**
 * Generate Docker configuration for database
 */
export function generateDockerScaffolding(dbType, dockerConfig) {
  const { port, name, user, password } = dockerConfig;

  const dockerCompose = generateDockerCompose(dbType, port, name, user, password);
  const dockerfile = generateDockerfile();
  const dockerignore = generateDockerignore();
  const envConfig = generateDockerEnvConfig(dbType, port, name, user, password);

  return {
    'docker-compose.yml': dockerCompose,
    'Dockerfile': dockerfile,
    '.dockerignore': dockerignore,
    envConfig
  };
}

/**
 * Generate docker-compose.yml for database
 */
function generateDockerCompose(dbType, port, dbName, dbUser, dbPassword) {
  const configs = {
    postgres: `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: coherent-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${dbName}
      POSTGRES_USER: ${dbUser}
      POSTGRES_PASSWORD: ${dbPassword}
    ports:
      - "${port}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - coherent-network

volumes:
  postgres_data:

networks:
  coherent-network:
    driver: bridge`,

    mysql: `version: '3.8'

services:
  mysql:
    image: mysql:8
    container_name: coherent-mysql
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: ${dbName}
      MYSQL_USER: ${dbUser}
      MYSQL_PASSWORD: ${dbPassword}
      MYSQL_ROOT_PASSWORD: ${dbPassword}_root
    ports:
      - "${port}:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - coherent-network

volumes:
  mysql_data:

networks:
  coherent-network:
    driver: bridge`,

    mongodb: `version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: coherent-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${dbUser}
      MONGO_INITDB_ROOT_PASSWORD: ${dbPassword}
      MONGO_INITDB_DATABASE: ${dbName}
    ports:
      - "${port}:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - coherent-network

volumes:
  mongodb_data:

networks:
  coherent-network:
    driver: bridge`
  };

  return configs[dbType] || configs.postgres;
}

/**
 * Generate Dockerfile for the application
 */
function generateDockerfile() {
  return `# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node healthcheck.js || exit 1

# Start the application
CMD ["npm", "start"]`;
}

/**
 * Generate .dockerignore file
 */
function generateDockerignore() {
  return `# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons
build/Release

# Dependency directories
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test
.env.local
.env.production

# parcel-bundler cache
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed

# Coverage directory used by tools like istanbul
coverage

# Grunt intermediate storage
.grunt

# Compiled binary addons
build/Release

# Users Environment Variables
.lock-wscript

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db`;
}

/**
 * Generate environment configuration for Docker
 */
function generateDockerEnvConfig(dbType, port, dbName, dbUser, dbPassword) {
  const configs = {
    postgres: {
      DB_HOST: 'postgres',
      DB_PORT: port,
      DB_NAME: dbName,
      DB_USER: dbUser,
      DB_PASSWORD: dbPassword,
      DATABASE_URL: `postgresql://${dbUser}:${dbPassword}@postgres:${port}/${dbName}`
    },
    mysql: {
      DB_HOST: 'mysql',
      DB_PORT: port,
      DB_NAME: dbName,
      DB_USER: dbUser,
      DB_PASSWORD: dbPassword,
      DATABASE_URL: `mysql://${dbUser}:${dbPassword}@mysql:${port}/${dbName}`
    },
    mongodb: {
      DB_HOST: 'mongodb',
      DB_PORT: port,
      DB_NAME: dbName,
      DB_USER: dbUser,
      DB_PASSWORD: dbPassword,
      DATABASE_URL: `mongodb://${dbUser}:${dbPassword}@mongodb:${port}/${dbName}`
    }
  };

  return configs[dbType] || configs.postgres;
}

/**
 * Generate health check script
 */
export function generateHealthCheck() {
  return `import http from 'http';

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(\`Health check status: \${res.statusCode}\`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('Health check failed:', err.message);
  process.exit(1);
});

request.end();`;
}
