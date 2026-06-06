# Real Estate Management System - Comprehensive Setup Guide

## Project Structure Overview

```
realestate/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── routes/            # API endpoints
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── services/          # Business logic
│   │   ├── security/          # JWT and auth utilities
│   │   ├── tasks/             # Celery background tasks
│   │   ├── config.py          # Application configuration
│   │   ├── database.py        # Database setup
│   │   └── main.py            # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Environment template
├── frontend/                   # React/Vue dashboard
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API client
│   │   └── App.js
│   └── package.json
├── ml_module/                 # Machine Learning pipelines
│   ├── ml_models.py           # ML models
│   ├── pipeline.py            # ML pipeline coordinator
│   ├── models/                # Saved models directory
│   └── requirements.txt
├── chatbot/                   # Claude-based chatbot
│   ├── chatbot.py             # Chatbot logic
│   ├── api.py                 # Chatbot API routes
│   └── __init__.py
└── README.md                  # This file
```

## Module Breakdown

### 1. Landlord/Property Manager Module

**Key Features:**
- Register and manage properties
- Manage units within properties
- Track tenants per unit
- Generate financial reports
- Monitor utility usage anomalies
- Receive alerts for payment arrears
- Schedule and track maintenance

**Key Endpoints:**
```
POST   /landlord/properties              # Register property
GET    /landlord/properties              # List properties
GET    /landlord/properties/{id}         # Get property details
POST   /landlord/units                   # Create unit
GET    /landlord/properties/{id}/units   # List units
GET    /landlord/units/{id}/tenants      # List unit tenants
GET    /landlord/reports/financial       # Financial report
GET    /landlord/alerts/utility          # Utility anomalies
GET    /landlord/alerts/arrears          # Arrears alerts
GET    /landlord/maintenance-requests    # List maintenance
PATCH  /landlord/maintenance-requests/{id}/approve  # Approve
```

**Database Models:**
- Property → Unit → Tenant (hierarchy)
- RentBill, Payment, Arrears
- UtilityBill (per unit per month)
- MaintenanceRequest, MaintenanceSchedule

### 2. Tenant Module

**Key Features:**
- View rent and utility balance
- Make rent payments
- Submit maintenance requests
- View payment history
- Receive notifications and reminders
- Chat with AI assistant

**Key Endpoints:**
```
GET    /tenant/balance                   # Rent + utility balance
GET    /tenant/bills                     # List rent bills
POST   /tenant/payment                   # Make payment
GET    /tenant/payment-history           # Payment timeline
GET    /tenant/utilities                 # Utility bills
POST   /tenant/maintenance               # Submit request
GET    /tenant/maintenance               # List requests
GET    /tenant/notifications             # Reminders
POST   /chat/start-session              # Start chat
POST   /chat/send-message/{id}          # Send message
```

**Portal Features:**
- Payment history timeline
- Bill breakdown (rent + utilities)
- Maintenance request tracker
- Integrated chatbot widget

### 3. Machine Learning Module

**Models & Predictions:**

1. **Risk Prediction**
   - Predicts payment risk for tenants
   - Features: payment history, arrears, late fees
   - Classification: Low Risk / High Risk
   - Output: Risk Score (0-100%)

2. **Income Forecasting**
   - Forecasts rental income
   - Factors: occupancy rate, collection rate
   - Period: 3-12 months ahead
   - Output: Income forecast with confidence intervals

3. **Utility Anomaly Detection**
   - Detects unusual utility consumption
   - Uses z-score analysis
   - Identifies potential leaks/meter issues
   - Alerts for high consumption patterns

**Pipeline:**
```
Raw Data → Feature Engineering → Model Training → Prediction API
                                        ↓
                              /ml/predict/risk/
                              /ml/predict/income/
                              /ml/alerts/utility/
```

**Celery Tasks:**
- Retrain models monthly with new data
- Daily anomaly detection
- Daily arrears calculation
- Payment reminders

### 4. Chatbot Module

**Architecture:**
```
Tenant Message → Intent Classifier → Handler Router
                                       ├─ FAQ Handler
                                       ├─ Maintenance Logger
                                       ├─ ML Trigger
                                       ├─ Notification Sender
                                       └─ Escalation
```

**Technologies:**
- Claude API (Anthropic)
- System prompts for context
- Function calling for DB operations
- Conversation history management

**Supported Intents:**
- "What is my rent balance?"
- "My water bill seems high"
- "I want to report a broken pipe"
- "When is my rent due?"
- "What is my payment history?"
- "Schedule maintenance"

### 5. Cybersecurity Module

**Implemented Features:**
- JWT authentication & authorization
- Role-based access control (RBAC)
- Password hashing with bcrypt
- SQL injection prevention
- CORS protection
- Input validation
- API rate limiting (optional)
- Audit logging (optional)

## Setup Instructions

### Prerequisites
- Python 3.10+
- PostgreSQL 12+
- Redis 6+
- Anthropic API Key
- Node.js 16+ (for frontend)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Create database
createdb realestate_db  # or using PostgreSQL client

# Run migrations (using Alembic)
alembic upgrade head

# Start API server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. ML Module Setup

```bash
cd ml_module

# Install dependencies
pip install -r requirements.txt

# Create models directory
mkdir models

# Run pipeline test
python -c "from pipeline import ml_pipeline; print('ML module ready')"
```

### 3. Chatbot Setup

```bash
# Set Anthropic API Key
export ANTHROPIC_API_KEY="your-api-key-here"

# Copy API key to backend .env file
```

### 4. Celery Worker Setup

```bash
cd backend

# Start Celery worker
celery -A app.tasks.celery worker --loglevel=info

# Start Celery beat scheduler (in another terminal)
celery -A app.tasks.celery beat --loglevel=info
```

### 5. Frontend Setup

```bash
cd frontend

npm install
npm start  # Development server runs on http://localhost:3000
```

## Database Schema

### Users Table
- id (Primary Key)
- email (Unique)
- full_name
- hashed_password
- role (landlord/tenant/admin)
- phone
- is_active
- created_at, updated_at

### Properties
- id
- landlord_id (FK → Users)
- name, address, city, state, zip_code
- total_units
- created_at, updated_at

### Units
- id
- property_id (FK → Properties)
- unit_number, bedrooms, bathrooms
- square_feet, monthly_rent
- is_occupied

### Tenants
- id
- user_id (FK → Users)
- unit_id (FK → Units)
- lease_start_date, lease_end_date
- is_active, deposit_amount

### RentBills
- id
- unit_id, month, year
- amount, due_date
- is_paid, paid_date

### Payments
- id
- tenant_id, rent_bill_id
- amount, payment_date
- payment_method, reference_number
- is_verified

### UtilityBills
- id
- unit_id, month, year
- utility_type (water/electricity/gas)
- amount, usage_value
- is_anomalous, anomaly_reason

### MaintenanceRequests
- id
- unit_id, tenant_id
- description, category, priority
- status, created_at, completed_date

### ChatSessions & ChatMessages
- Session tracking per tenant
- Message storage with intent classification

## API Authentication

All endpoints (except `/auth/*`) require JWT Bearer token:

```bash
# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Response
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {...}
}

# Use token in requests
curl -X GET http://localhost:8000/tenant/balance \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

## Configuration

### .env Template

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/realestate_db

# JWT
SECRET_KEY=your-secret-key-at-least-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis/Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# ML Module
ML_MODEL_PATH=./models
ML_RETRAIN_INTERVAL_DAYS=30

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]
```

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app

# Test specific endpoint
pytest tests/test_auth.py

# Test with markers
pytest -m "unit"
```

## Deployment

### Docker Setup

```dockerfile
# Build image
docker build -t realestate-api .

# Run container
docker run -p 8000:8000 --env-file .env realestate-api
```

### Production Checklist

- [ ] Enable HTTPS/SSL
- [ ] Set DEBUG=False
- [ ] Use strong SECRET_KEY
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Security headers

## Monitoring & Maintenance

### Health Checks

```bash
curl http://localhost:8000/health
```

### Logs
```bash
# Backend logs
tail -f logs/app.log

# Celery logs
tail -f logs/celery.log
```

### Database Maintenance

```bash
# Connection pooling stats
SELECT * FROM pg_stat_connections;

# Index analysis
ANALYZE;
REINDEX;
```

## Feature Roadmap

- [ ] Two-factor authentication
- [ ] Tenant rent payment plans
- [ ] Automated payment processing
- [ ] Document storage and management
- [ ] Property inspection scheduling
- [ ] Lease renewal automation
- [ ] Mobile app
- [ ] SMS/Email notifications
- [ ] Advanced analytics dashboard
- [ ] Integration with payment gateways

## Support & Documentation

- API Documentation: http://localhost:8000/docs
- OpenAPI Schema: http://localhost:8000/openapi.json
- Issues: [GitHub Issues](https://github.com/yourrepo/issues)

## License

MIT License - See LICENSE file for details
