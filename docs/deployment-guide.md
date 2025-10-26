# Deployment Guide for Coherent.js Applications

This comprehensive guide covers deploying Coherent.js applications to various platforms, from traditional servers to modern cloud platforms and edge computing environments.

## 🚀 Quick Deployment Checklist

Before deploying your Coherent.js application:

- [ ] **Environment Configuration**: Set up proper environment variables
- [ ] **Security Hardening**: Enable HTTPS, set security headers
- [ ] **Performance Optimization**: Enable caching and compression
- [ ] **Monitoring Setup**: Configure logging and error tracking  
- [ ] **Health Checks**: Implement health check endpoints
- [ ] **Backup Strategy**: Set up database and file backups
- [ ] **CI/CD Pipeline**: Automate testing and deployment

## 🏗️ Platform-Specific Deployments

### Docker Deployment

#### Production Dockerfile

```dockerfile
# Multi-stage build for optimal size and security
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

FROM base AS deps
COPY package*.json ./
RUN npm ci --production --silent && npm cache clean --force

FROM base AS build
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build
RUN npm prune --production

FROM base AS runtime
# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S coherent -u 1001

# Copy production dependencies and built application
COPY --from=deps --chown=coherent:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=coherent:nodejs /app/dist ./dist
COPY --from=build --chown=coherent:nodejs /app/public ./public
COPY --from=build --chown=coherent:nodejs /app/package.json ./package.json
COPY --from=build --chown=coherent:nodejs /app/server.js ./server.js

# Optimize Node.js for production
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"
ENV UV_THREADPOOL_SIZE=16

# Health check configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Switch to non-root user
USER coherent

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

#### Docker Compose for Development

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://coherent:password@db:5432/coherent_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: coherent_dev
      POSTGRES_USER: coherent
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.coherent.rule=Host(\`example.com\`)"
      - "traefik.http.routers.coherent.tls.certresolver=le"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./static:/var/www/static:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  backup:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      PGPASSWORD: ${DB_PASSWORD}
    volumes:
      - ./backups:/backups
    command: |
      sh -c "
        while true; do
          pg_dump -h db -U ${DB_USER} ${DB_NAME} > /backups/backup_$$(date +%Y%m%d_%H%M%S).sql
          find /backups -name '*.sql' -mtime +7 -delete
          sleep 86400
        done
      "

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes Deployment

#### Deployment Configuration

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coherent-app
  labels:
    app: coherent-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: coherent-app
  template:
    metadata:
      labels:
        app: coherent-app
    spec:
      containers:
      - name: coherent-app
        image: coherent-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: coherent-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: coherent-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: coherent-config
      imagePullSecrets:
      - name: registry-secret
---
apiVersion: v1
kind: Service
metadata:
  name: coherent-service
spec:
  selector:
    app: coherent-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: coherent-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - example.com
    secretName: coherent-tls
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: coherent-service
            port:
              number: 80
```

#### ConfigMap and Secrets

```yaml
# k8s/config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coherent-config
data:
  cache-size: "10000"
  log-level: "info"
  metrics-enabled: "true"
---
apiVersion: v1
kind: Secret
metadata:
  name: coherent-secrets
type: Opaque
data:
  database-url: <base64-encoded-database-url>
  redis-url: <base64-encoded-redis-url>
  secret-key: <base64-encoded-secret-key>
```

### AWS Deployment

#### Elastic Beanstalk

```json
// .ebextensions/nodecommand.config
{
  "option_settings": [
    {
      "namespace": "aws:elasticbeanstalk:container:nodejs",
      "option_name": "NodeCommand",
      "value": "npm start"
    },
    {
      "namespace": "aws:elasticbeanstalk:container:nodejs",
      "option_name": "NodeVersion",
      "value": "18.x"
    },
    {
      "namespace": "aws:elasticbeanstalk:application:environment",
      "option_name": "NODE_ENV",
      "value": "production"
    },
    {
      "namespace": "aws:elasticbeanstalk:application:environment",
      "option_name": "PORT",
      "value": "8080"
    }
  ]
}
```

```yaml
# .ebextensions/https-redirect.config
Resources:
  AWSEBV2LoadBalancerListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      DefaultActions:
        - Type: redirect
          RedirectConfig:
            Protocol: HTTPS
            Port: 443
            StatusCode: HTTP_301
      LoadBalancerArn:
        Ref: AWSEBV2LoadBalancer
      Port: 80
      Protocol: HTTP
```

#### ECS with Fargate

```json
// ecs-task-definition.json
{
  "family": "coherent-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "coherent-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/coherent-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:coherent/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/coherent-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

### Serverless Deployment

#### Vercel

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/api/app.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "api/app.js": {
      "maxDuration": 30
    }
  }
}
```

```javascript
// api/app.js - Serverless entry point
import { createCoherent, renderToString } from '@coherentjs/core';
import { HomePage } from '../components/HomePage.js';

const coherent = createCoherent({
  enableCache: true,
  cacheSize: 1000
});

export default async function handler(req, res) {
  try {
    const props = {
      path: req.url,
      query: req.query,
      headers: req.headers
    };
    
    const html = coherent.render(HomePage(props));
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).send(html);
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
```

#### Netlify Functions

```javascript
// netlify/functions/ssr.js
import { createCoherent } from '@coherentjs/core';
import { App } from '../../src/App.js';

const coherent = createCoherent({
  enableCache: true,
  cacheSize: 500
});

export const handler = async (event, context) => {
  try {
    const props = {
      path: event.path,
      queryStringParameters: event.queryStringParameters,
      headers: event.headers
    };
    
    const html = coherent.render(App(props));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300'
      },
      body: html
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
```

## 🔧 Production Configuration

### Environment Variables

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_POOL_SIZE=20
DATABASE_SSL=true

# Cache
REDIS_URL=redis://user:password@host:6379
CACHE_TTL=300
CACHE_SIZE=10000

# Security
SECRET_KEY=your-super-secret-key
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret
ALLOWED_ORIGINS=https://example.com,https://www.example.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
METRICS_ENABLED=true

# Performance
UV_THREADPOOL_SIZE=16
NODE_OPTIONS=--max-old-space-size=2048 --optimize-for-size
```

### Production Server Configuration

```javascript
// server.js - Production-ready server
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createCoherent } from '@coherentjs/core';
import { setupMonitoring } from './monitoring.js';
import { setupHealthChecks } from './health.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.'
  }
});

app.use(limiter);

// Static files with long-term caching
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true,
  etag: false
}));

// Initialize Coherent.js
const coherent = createCoherent({
  enableCache: true,
  cacheSize: parseInt(process.env.CACHE_SIZE) || 10000,
  enableMonitoring: true
});

// Setup monitoring and health checks
setupMonitoring(app);
setupHealthChecks(app);

// Main application routes
app.get('*', async (req, res) => {
  try {
    const props = {
      path: req.path,
      query: req.query,
      user: req.user,
      headers: req.headers
    };
    
    const html = coherent.render(App(props));
    
    // Cache headers
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'Vary': 'Accept-Encoding'
    });
    
    res.send(html);
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Application error:', err);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal Server Error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
```

### Health Check Implementation

```javascript
// health.js
import { performanceMonitor } from '@coherentjs/core';
import { checkDatabase, checkRedis } from './services.js';

export const setupHealthChecks = (app) => {
  // Basic health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    });
  });

  // Detailed health check
  app.get('/health/detailed', async (req, res) => {
    const checks = {
      server: true,
      database: false,
      redis: false,
      coherent: false
    };

    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks,
      details: {}
    };

    try {
      // Check database
      await checkDatabase();
      checks.database = true;
      results.details.database = 'Connected';
    } catch (error) {
      checks.database = false;
      results.details.database = error.message;
      results.status = 'unhealthy';
    }

    try {
      // Check Redis
      await checkRedis();
      checks.redis = true;
      results.details.redis = 'Connected';
    } catch (error) {
      checks.redis = false;
      results.details.redis = error.message;
      results.status = 'degraded';
    }

    // Check Coherent.js performance
    const stats = performanceMonitor.getStats();
    if (stats.averageRenderTime < 100) {
      checks.coherent = true;
      results.details.coherent = `Avg render: ${stats.averageRenderTime}ms`;
    } else {
      checks.coherent = false;
      results.details.coherent = 'Performance degraded';
      results.status = 'degraded';
    }

    const statusCode = results.status === 'healthy' ? 200 : 
                      results.status === 'degraded' ? 200 : 500;

    res.status(statusCode).json(results);
  });

  // Readiness probe
  app.get('/ready', async (req, res) => {
    try {
      await checkDatabase();
      res.status(200).json({ status: 'ready' });
    } catch (error) {
      res.status(503).json({ status: 'not ready', error: error.message });
    }
  });
};
```

## 🚨 Monitoring and Logging

### Application Monitoring

```javascript
// monitoring.js
import prometheus from 'prom-client';
import { performanceMonitor } from '@coherentjs/core';

const register = prometheus.register;

// Default metrics
prometheus.collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const coherentRenderDuration = new prometheus.Histogram({
  name: 'coherent_render_duration_seconds',
  help: 'Duration of Coherent.js renders in seconds',
  labelNames: ['component']
});

const cacheHitRate = new prometheus.Gauge({
  name: 'coherent_cache_hit_rate',
  help: 'Cache hit rate percentage'
});

export const setupMonitoring = (app) => {
  // Middleware to track request metrics
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      httpRequestDuration
        .labels(req.method, req.route?.path || req.path, res.statusCode)
        .observe(duration);
    });
    
    next();
  });

  // Coherent.js metrics integration
  performanceMonitor.on('render', (data) => {
    coherentRenderDuration
      .labels(data.component)
      .observe(data.duration / 1000);
  });

  // Update cache metrics periodically
  setInterval(() => {
    const stats = performanceMonitor.getStats();
    cacheHitRate.set(stats.cacheHitRate);
  }, 30000);

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  });

  // Performance dashboard
  app.get('/admin/performance', (req, res) => {
    const stats = performanceMonitor.getStats();
    
    const dashboard = {
      div: {
        children: [
          { h1: { text: 'Performance Dashboard' } },
          {
            div: {
              className: 'metrics-grid',
              children: [
                {
                  div: {
                    className: 'metric-card',
                    children: [
                      { h3: { text: 'Render Performance' } },
                      { p: { text: `Average: ${stats.averageRenderTime}ms` } },
                      { p: { text: `95th percentile: ${stats.p95RenderTime}ms` } }
                    ]
                  }
                },
                {
                  div: {
                    className: 'metric-card',
                    children: [
                      { h3: { text: 'Cache Performance' } },
                      { p: { text: `Hit rate: ${stats.cacheHitRate}%` } },
                      { p: { text: `Total hits: ${stats.totalCacheHits}` } }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    };
    
    res.send(renderToString(dashboard));
  });
};
```

### Structured Logging

```javascript
// logger.js
import winston from 'winston';
import { performanceMonitor } from '@coherentjs/core';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'coherent-app',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Log Coherent.js performance events
performanceMonitor.on('slowRender', (data) => {
  logger.warn('Slow render detected', {
    component: data.component,
    duration: data.duration,
    threshold: data.threshold
  });
});

performanceMonitor.on('cacheHit', (data) => {
  logger.debug('Cache hit', {
    key: data.key,
    level: data.level
  });
});

export default logger;
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: coherent_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/coherent_test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v1
        with:
          method: kubectl
          kubeconfig: ${{ secrets.KUBE_CONFIG }}
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
            k8s/ingress.yaml
          images: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
      
      - name: Verify deployment
        run: |
          kubectl rollout status deployment/coherent-app -w
          kubectl get services -o wide
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

test:
  stage: test
  image: node:18-alpine
  services:
    - postgres:15-alpine
  variables:
    POSTGRES_DB: coherent_test
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/coherent_test
  script:
    - npm ci
    - npm run lint
    - npm run type-check
    - npm test
    - npm run test:e2e
  coverage: '/Statements\s*:\s*([^%]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main

deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context $KUBE_CONTEXT
    - kubectl set image deployment/coherent-app coherent-app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - kubectl rollout status deployment/coherent-app
  environment:
    name: production
    url: https://example.com
  only:
    - main
  when: manual
```

## 🔧 Maintenance and Scaling

### Database Migrations

```javascript
// migrations/001_initial_schema.js
export const up = async (db) => {
  await db.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('email').unique().notNullable();
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
  
  await db.schema.createTable('posts', table => {
    table.increments('id').primary();
    table.integer('user_id').references('users.id').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('content');
    table.timestamps(true, true);
  });
};

export const down = async (db) => {
  await db.schema.dropTable('posts');
  await db.schema.dropTable('users');
};
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Database backup script

set -euo pipefail

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME=${DB_NAME:-coherent}
RETENTION_DAYS=${RETENTION_DAYS:-7}

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "Starting database backup..."
pg_dump $DATABASE_URL > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Upload to S3 (optional)
if [ -n "${AWS_S3_BUCKET:-}" ]; then
  aws s3 cp $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz s3://$AWS_S3_BUCKET/backups/
fi

# Clean up old backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: db_backup_$TIMESTAMP.sql.gz"
```

### Scaling Configuration

```yaml
# k8s/hpa.yaml - Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: coherent-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: coherent-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

This comprehensive deployment guide covers all aspects of deploying Coherent.js applications from development to production, ensuring reliability, security, and scalability.