# Real Estate Management System - Project Documentation Index

Welcome to the Real Estate Management System! This is a comprehensive platform for managing properties, tenants, payments, and maintenance - powered by FastAPI, PostgreSQL, Machine Learning, and Claude AI.

##  Documentation Files

### Getting Started
- **[QUICKSTART.md](QUICKSTART.md)** - Fast setup guide (Docker or manual)
- **[README.md](README.md)** - Complete project overview & API documentation
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Detailed module breakdown & architecture

### Detailed Information
- **[CYBERSECURITY.md](CYBERSECURITY.md)** - Security features & best practices

---

##  Project Structure

```
realestate/
├── backend/              # FastAPI Backend
│   ├── app/             # Application code
│   │   ├── models/      # Database models ( 13 models)
│   │   ├── routes/      # API endpoints ( 3 routers)
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── security/    # JWT & auth
│   │   ├── services/    # Business logic
│   │   └── tasks/       # Celery background jobs
│   ├── requirements.txt  # Dependencies
│   └── .env.example     # Configuration template
├── frontend/            # React Dashboard
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client
│   │   └── store/       # State management
│   └── package.json
├── ml_module/           # Machine Learning
│   ├── ml_models.py     # Risk, Forecast, Anomaly detection
│   ├── pipeline.py      # ML pipeline
│   └── requirements.txt
├── chatbot/             # Open AI Chatbot
│   ├── chatbot.py       # Chatbot logic
│   └── api.py           # Chatbot endpoints
├── docker-compose.yml   # Multi-container setup
├── Dockerfile           # Backend container
└── Documentation files
```

---

##  Quick Start

### Docker (Recommended)
```bash
export OPEN_AI API KEY="your-key-here"
docker-compose up -d
curl http://localhost:8000/health
```

### Manual Setup
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload
```

---

## 📋 Module Overview

### 1. **Landlord Module** 
   - Property & unit management
   - Financial reports & insights
   - Tenant tracking
   - Maintenance oversight
   - **Status**:  Complete with 8+ endpoints

### 2. **Tenant Module**
   - Balance inquiry (rent + utilities)
   - Payment submission
   - Maintenance requests
   - Notifications
   - **Status**:  Complete with 10+ endpoints

### 3. **Machine Learning**
   - **Risk Predictor**: Payment risk scoring (0-100%)
   - **Income Forecaster**: 3-12 month income projection
   - **Anomaly Detection**: Unusual utility consumption alerts
   - **Status**:  3 models + Celery integration

### 4. **Chatbot**
   - Open AI API integration
   - Intent classification
   - Database function calling
   - Escalation handling
   - **Status**:  Full implementation

### 5. **Security**
   - JWT authentication
   - Role-based access control
   - Password hashing
   - Input validation
   - **Status**:  Core implemented

---

##  Key Features

| Feature | Status | Details |
|---------|--------|---------|
| User Authentication  | JWT tokens, role-based access |
| Property Management  | Create, list, manage properties & units |
| Rent Tracking  | Bills, payments, arrears, collection rates |
| Maintenance System  | Submit, approve, schedule, track |
| Utility Monitoring  | Usage tracking, anomaly alerts |
| Payment System  | Record payments, track history |
| Risk Prediction  | ML-based tenant payment risk scoring |
| Income Forecasting  | ML-based income projections |
| Anomaly Detection  | Detect unusual utility consumption |
| Chatbot Support  | Claude AI powered tenant assistant |
| API Documentation  | Swagger UI at `/docs` |

---

##  Security Features

-  JWT authentication with HS256
-  Password hashing with bcrypt
-  Role-based authorization (Landlord/Tenant/Admin)
-  SQL injection prevention (SQLAlchemy ORM)
-  Input validation (Pydantic schemas)
-  CORS protection
-  Token expiration handling

---

##  Database Models

13 core models implemented:

1. **User** - Landlords, tenants, administrators
2. **Property** - Real estate properties
3. **Unit** - Individual units/apartments
4. **Tenant** - Tenant assignments and leases
5. **RentBill** - Monthly rent bills
6. **Payment** - Payment records
7. **Arrears** - Overdue payment tracking
8. **UtilityBill** - Water, electricity, gas usage
9. **MaintenanceRequest** - Repair/maintenance requests
10. **MaintenanceSchedule** - Work scheduling
11. **ChatSession** - Chatbot conversation sessions
12. **ChatMessage** - Individual chat messages

---

##  AI & ML Features

### Claude Chatbot Integration
- Natural language understanding
- Intent classification
- Database queries via function calling
- Conversation history management
- Escalation to human support

### ML Pipeline
- **Monthly Retraining**: Risk and forecast models
- **Daily Tasks**: Anomaly detection, arrears calculation
- **Payment Reminders**: Automated notifications

---

##  API Endpoints Summary

### Authentication
```
POST   /auth/register              # Create account
POST   /auth/login                 # Get JWT token
POST   /auth/logout                # Logout
```

### Landlord Endpoints (8+)
```
CRUD   /landlord/properties         # Manage properties
GET    /landlord/reports/financial  # Financial analysis
GET    /landlord/alerts/*          # Risk & anomaly alerts
CRUD   /landlord/maintenance-*     # Maintenance management
```

### Tenant Endpoints (10+)
```
GET    /tenant/balance             # Rent & utility status
GET    /tenant/bills               # Rent bills
POST   /tenant/payment             # Make payment
POST   /tenant/maintenance         # Submit request
GET    /tenant/utilities           # Utility charges
GET    /tenant/notifications       # Reminders
```

### Chat Endpoints (4)
```
POST   /chat/start-session         # Begin chat
POST   /chat/send-message/{id}     # Send message
GET    /chat/session-history/{id}  # View conversation
POST   /chat/session/{id}/end      # End session
```

---

##  Tech Stack

**Backend**: FastAPI, SQLAlchemy, XAMPP
**Frontend**: React, Vite, TailwindCSS, Zustand
**AI/ML**: Scikit-learn, Anthropic Claude API
**Tasks**: Celery, Redis
**Deployment**: Docker, Docker Compose
**API**: RESTful with OpenAPI/Swagger documentation

