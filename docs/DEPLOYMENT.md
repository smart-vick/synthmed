# Deployment Guide: Getting SynthMed to Production

This guide walks you through deploying SynthMed to production on various platforms.

---

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Git repository set up
- ✅ All environment variables configured
- ✅ Database working locally
- ✅ Passing tests/health check

---

## Deployment Checklist

Before deploying to production:

```bash
# 1. Run security audit
npm audit

# 2. Test health endpoint
curl http://localhost:3000/api/health

# 3. Test registration
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@synthmed.ca",
    "organization": "SynthMed",
    "password": "YourSecurePassword123"
  }'

# 4. Verify environment variables
echo $JWT_SECRET
echo $ADMIN_KEY

# 5. Create database backup
cp synthmed.db synthmed.db.backup

# 6. Commit code changes
git status
git add .
git commit -m "chore: Prepare for production deployment"
```

---

## Option 1: Deploy to Heroku (Easiest)

### 1. Create Heroku Account

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login
```

### 2. Create Heroku App

```bash
# Create new app
heroku create synthmed-prod

# Verify
heroku apps
```

### 3. Set Environment Variables

```bash
heroku config:set JWT_SECRET="your-super-secret-key"
heroku config:set ADMIN_KEY="your-secure-admin-key"
heroku config:set MAIL_USER="your-email@gmail.com"
heroku config:set MAIL_PASS="your-app-password"
heroku config:set ALLOWED_ORIGINS="https://synthmed-prod.herokuapp.com,https://yourdomain.com"
heroku config:set NODE_ENV="production"

# Verify
heroku config
```

### 4. Add SQLite Buildpack

```bash
heroku buildpacks:add https://github.com/mr-c/heroku-buildpack-sqlite3.git

# For both Node and SQLite (set the order)
heroku buildpacks:set heroku/nodejs
heroku buildpacks:add https://github.com/mr-c/heroku-buildpack-sqlite3.git
```

### 5. Deploy

```bash
# Deploy to Heroku
git push heroku main

# View logs
heroku logs --tail

# Monitor
heroku ps
```

### 6. Test Deployment

```bash
heroku open

# Or test via curl
curl https://synthmed-prod.herokuapp.com/api/health
```

---

## Option 2: Deploy to Railway

### 1. Connect Repository

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to GitHub repo
railway link
```

### 2. Create Project

```bash
# Create new project
railway init

# Or deploy from Railway dashboard
# https://railway.app
```

### 3. Configure Environment

In Railway dashboard:

1. Go to Variables
2. Add:
   - `JWT_SECRET`
   - `ADMIN_KEY`
   - `MAIL_USER`
   - `MAIL_PASS`
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS`

### 4. Deploy

```bash
# Deploy
railway up

# Or use dashboard auto-deploy from GitHub
```

### 5. Test

```bash
# Get production URL
railway domain

# Test health
curl https://your-railway-app.railway.app/api/health
```

---

## Option 3: Deploy to AWS (Production)

### 1. Prepare Code

```bash
# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install SQLite build tools
RUN apk add --no-cache sqlite

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start app
CMD ["node", "server.js"]
EOF

# Create .dockerignore
cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.example
docs
tests
EOF
```

### 2. Build Docker Image

```bash
# Build locally
docker build -t synthmed:latest .

# Test locally
docker run -p 3000:3000 \
  -e JWT_SECRET="test-key" \
  -e NODE_ENV="production" \
  synthmed:latest
```

### 3. Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name synthmed

# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag synthmed:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/synthmed:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/synthmed:latest
```

### 4. Deploy to ECS/Fargate

```bash
# Create ECS task definition (or use AWS Console)
# Add container with ECR image
# Set environment variables
# Allocate resources (256MB memory, 0.25vCPU min)

# Create service
# Enable auto-scaling
# Configure load balancer
```

### 5. Configure RDS (Optional)

For production with PostgreSQL instead of SQLite:

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier synthmed-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20

# Update connection string in app
# DATABASE_URL=postgresql://user:pass@host/synthmed
```

---

## Option 4: Self-Hosted VPS (DigitalOcean, Linode, etc.)

### 1. Create Droplet

```bash
# DigitalOcean: Ubuntu 22.04 LTS
# Linode: Ubuntu 22.04 LTS
# Size: 1GB RAM, 1 vCPU minimum
```

### 2. SSH and Setup

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Create app directory
mkdir -p /var/www/synthmed
cd /var/www/synthmed
```

### 3. Deploy Code

```bash
# Clone repository
git clone https://github.com/your-repo/synthmed.git .

# Install dependencies
npm ci --only=production

# Create .env file
nano .env
# Add all environment variables

# Start with PM2
pm2 start server.js --name "synthmed"
pm2 startup
pm2 save
```

### 4. Setup Reverse Proxy (Nginx)

```bash
# Install Nginx
apt install -y nginx

# Create config
sudo nano /etc/nginx/sites-available/synthmed
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name synthmed.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Enable HTTPS

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot certonly --nginx -d synthmed.yourdomain.com

# Auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer
```

### 6. Monitor and Maintain

```bash
# View logs
pm2 logs synthmed

# Monitor resources
pm2 monit

# Restart on reboot
pm2 startup

# Update code (with zero downtime)
cd /var/www/synthmed
git pull origin main
npm ci
pm2 reload synthmed
```

---

## Post-Deployment

### 1. Test All Endpoints

```bash
# Health check
curl https://synthmed.yourdomain.com/api/health

# Test registration
curl -X POST https://synthmed.yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "organization": "Test",
    "password": "TestPassword123"
  }'

# Test login
curl -X POST https://synthmed.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

### 2. Monitor Logs

```bash
# Check for errors
tail -f /var/log/pm2/synthmed-error.log
tail -f /var/log/pm2/synthmed-out.log

# Or use cloud provider's log viewer
```

### 3. Setup Backups

```bash
# Daily backup script
cat > /usr/local/bin/backup-synthmed.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/synthmed"
mkdir -p $BACKUP_DIR
cp /var/www/synthmed/synthmed.db $BACKUP_DIR/synthmed-$(date +%Y%m%d).db
# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-synthmed.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-synthmed.sh") | crontab -
```

### 4. Setup Monitoring

```bash
# Option 1: DataDog
npm install --save datadog-browser-rum

# Option 2: New Relic
npm install --save newrelic

# Option 3: Simple health check
curl -s https://synthmed.yourdomain.com/api/health || \
  echo "Alert: SynthMed is down" | mail -s "SynthMed Alert" ops@company.com
```

### 5. Monitor Costs

```bash
# Check database size
du -sh /var/www/synthmed/synthmed.db

# Check logs size
du -sh /var/log/pm2/

# Archive old logs if needed
gzip /var/log/pm2/synthmed-*.log
```

---

## Scaling

As traffic grows:

### 1. Optimize Database

```bash
# Add indexes
CREATE INDEX idx_usage_month ON usage_events(strftime('%Y-%m', created_at));
CREATE INDEX idx_accounts_tier ON accounts(tier);
```

### 2. Switch to PostgreSQL

```bash
# Migrate from SQLite to PostgreSQL for better concurrency
# See AWS RDS setup above
```

### 3. Add Caching

```bash
# Install Redis
docker run -d -p 6379:6379 redis:latest

# Update .env
REDIS_URL=redis://localhost:6379

# Cache API key lookups, JWT verification results
```

### 4. Load Balancing

```bash
# Run multiple instances
pm2 start server.js -i 4  # Use 4 CPU cores

# Behind load balancer (Nginx, AWS ALB, etc.)
```

---

## Troubleshooting

### High Memory Usage
```bash
# Check what's consuming memory
pm2 monit

# Increase heap size
NODE_OPTIONS=--max_old_space_size=512 pm2 start server.js
```

### Database Locked
```bash
# SQLite sometimes locks under high load
# Switch to PostgreSQL for production
```

### Rate Limit Not Working
```bash
# In-memory store doesn't work with multiple processes
# Use Redis-backed rate limiter for distributed systems
```

---

## Support

- **Docs**: https://docs.synthmed.ca
- **Deployment Issues**: https://github.com/smart-vick/synthmed/issues
- **Email**: deploy-support@synthmed.ca

---

**Congratulations! Your SynthMed instance is now live in production!** 🚀
