# Quick Start Guide

## 1. Prerequisites Installation

### Windows
```powershell
# Install Python 3.10+
choco install python

# Install PostgreSQL
choco install postgresql

# Install Redis
choco install redis

# Or use Windows Subsystem for Linux (WSL2) for easier setup
```

### macOS
```bash
# Using Homebrew
brew install python@3.10 postgresql redis
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install python3.10 postgresql postgresql-contrib redis-server
```

## 2. Quick Start with Docker Compose

```bash
# Clone/navigate to project
cd realestate

# Set environment variable for API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Start all services
docker-compose up -d

# Wait for services to start (30 seconds)
sleep 30

# Verify services are running
docker-compose ps

# Check API health
curl http://localhost:8000/health

# View logs
docker-compose logs -f api
```

## 3. Manual Setup (Without Docker)

### Step 1: Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://user:password@localhost:5432/realestate_db
# SECRET_KEY=your-secret-key
# ANTHROPIC_API_KEY=your-api-key

# Create database
createdb -U postgres realestate_db

# Start the API server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Setup Celery (Background Tasks)

In a new terminal:

```bash
cd backend

# Activate venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Start Celery worker
celery -A app.tasks.celery worker --loglevel=info
```

And in another terminal:

```bash
cd backend

# Start Celery beat scheduler
celery -A app.tasks.celery beat --loglevel=info
```

### Step 3: Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: http://localhost:5173

## 4. Test the System

### Register Users

```bash
# Register a landlord
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "landlord@example.com",
    "full_name": "John Landlord",
    "phone": "555-1234",
    "password": "password123",
    "role": "landlord"
  }'

# Register a tenant
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tenant@example.com",
    "full_name": "Jane Tenant",
    "phone": "555-5678",
    "password": "password123",
    "role": "tenant"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "landlord@example.com",
    "password": "password123"
  }'
```

### Create Property

```bash
curl -X POST http://localhost:8000/landlord/properties \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Complex",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip_code": "10001",
    "total_units": 4,
    "description": "Modern apartment complex"
  }'
```

## 5. Access Dashboard

### API Documentation
```
Swagger UI: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc
```

### Frontend Dashboards
```
Landlord: http://localhost:5173/landlord
Tenant: http://localhost:5173/tenant
```

## 6. Common Issues & Solutions

### Database Connection Error
```
Error: could not connect to server

Solution:
1. Ensure PostgreSQL is running
  Windows: Run Postgresql from Services
  Mac/Linux: brew services start postgresql
2. Check DATABASE_URL in .env
3. createdb -U postgres realestate_db
```

### Redis Connection Error
```
Error: ConnectionRefusedError: [Errno 111] Connection refused

Solution:
1. Ensure Redis is running
  Windows: redis-server.exe
  Mac: brew services start redis
  Linux: sudo service redis-server start
2. Check REDIS_URL format
```

### Celery Tasks Not Running
```
Check if Celery worker is running
Restart: celery -A app.tasks.celery worker --loglevel=info

Check if Celery beat is running
Restart: celery -A app.tasks.celery beat --loglevel=info
```

### API Key Error
```
Error: anthropic.AuthenticationError

Solution:
1. Get API key from https://console.anthropic.com
2. Add to .env: ANTHROPIC_API_KEY=sk-ant-...
3. Restart API server
```

## 7. Project Structure

```
realestate/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── models/      # Database models
│   │   ├── routes/      # API endpoints
│   │   ├── schemas/     # Request/response schemas
│   │   ├── security/    # Auth utilities
│   │   ├── tasks/       # Celery background tasks
│   │   └── main.py      # FastAPI app
│   ├── requirements.txt
│   └── .env.example
├── frontend/             # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client
│   │   └── App.jsx
│   └── package.json
├── ml_module/            # ML models and pipeline
│   ├── ml_models.py
│   ├── pipeline.py
│   └── requirements.txt
├── chatbot/              # Claude chatbot
│   ├── chatbot.py
│   └── api.py
├── docker-compose.yml    # Docker services
└── README.md
```

## 8. Next Steps

1. **Configure Database**: Update database credentials in .env
2. **Get API Keys**: 
   - Anthropic API: https://console.anthropic.com
3. **Start Services**: Run docker-compose or manual setup
4. **Create Initial Data**: Register users and create properties
5. **Test Workflows**: Try different user scenarios
6. **Deploy**: See deployment section in README.md

## 9. Monitoring

### View API Logs
```bash
docker-compose logs -f api
```

### View Celery Logs
```bash
docker-compose logs -f celery_worker
```

### Database Connection Check
```bash
psql -U realestate -d realestate_db -c "SELECT * FROM users;"
```

### Redis Connection Check
```bash
redis-cli ping
# Should return: PONG
```

## 10. Troubleshooting Commands

```bash
# Reset everything
docker-compose down -v
docker-compose up -d

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d

# Check service health
docker-compose ps

# View detailed logs
docker-compose logs --tail=100 api

# Access database shell
docker-compose exec db psql -U realestate -d realestate_db

# Access Celery shell
docker-compose exec celery_worker python

# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL
```

Need help? Check the main README.md or open an issue!
