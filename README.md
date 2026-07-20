🚗 Parking Management System
<div align="center">
https://img.shields.io/badge/version-1.0.0-blue.svg
https://img.shields.io/badge/python-3.10+-green.svg
https://img.shields.io/badge/FastAPI-0.100+-teal.svg
https://img.shields.io/badge/React-18.2+-blue.svg
https://img.shields.io/badge/Docker-24.0+-blue.svg
https://img.shields.io/badge/license-MIT-yellow.svg

A comprehensive, microservices-based parking management system with EV charging support

Features • Architecture • Quick Start • API Documentation • Deployment

</div>
📋 Table of Contents
Overview

Features

Architecture

Technology Stack

Project Structure

Quick Start

Development

API Documentation

Testing

Deployment

Contributing

License

🎯 Overview
The Parking Management System is a full-stack, production-ready application designed to manage parking facilities with support for electric vehicle charging. Built using Domain-Driven Design (DDD) principles and a microservices architecture, it provides a scalable solution for modern parking management needs.

Key Capabilities
Smart Parking Management: Real-time slot allocation and monitoring

EV Charging Integration: Support for electric vehicle charging stations

Multi-Lot Support: Manage multiple parking facilities from one platform

Real-time Updates: Live status updates via WebSockets

Analytics & Reporting: Comprehensive revenue and occupancy reports

✨ Features
🅿️ Parking Management
Create and configure parking lots

Real-time slot availability tracking

Smart slot allocation with configurable strategies

Vehicle parking and removal

Automated ticket generation

Historical parking records

🔌 EV Charging
EV charging station management

Charging session tracking

Real-time charge status monitoring

Energy consumption reporting

Charging cost calculation

📊 Analytics & Reporting
Occupancy rate tracking

Revenue analytics

Peak usage patterns

EV charging statistics

Custom report generation

🔐 Security & Access
JWT-based authentication

Role-based access control

Rate limiting

API key management

Audit logging

🌐 Real-time Features
WebSocket connections for live updates

Instant notification system

Real-time occupancy updates

Live charging status

🏗️ Architecture
High-Level Architecture
text
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Applications                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Web      │  │   Mobile    │  │    API      │  │  Admin      │ │
│  │  (React)    │  │ (React Nat.)│  │   Clients   │  │  Dashboard  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Gateway (Nginx)                          │
│                    Routing • Rate Limiting • CORS                      │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│   Parking Service │    │  Charging Service │    │   Vehicle Service │
│   (FastAPI)       │    │   (FastAPI)       │    │   (FastAPI)       │
├───────────────────┤    ├───────────────────┤    ├───────────────────┤
│ • Lot Management  │    │ • Station Mgmt    │    │ • Vehicle Registry│
│ • Slot Allocation │    │ • Session Mgmt    │    │ • Vehicle Types   │
│ • Parking Ops     │    │ • Energy Tracking │    │ • History         │
│ • Occupancy       │    │ • Charge Status   │    │ • Validation      │
└───────────────────┘    └───────────────────┘    └───────────────────┘
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│   PostgreSQL      │    │     MongoDB       │    │   PostgreSQL      │
│   parking_db      │    │   charging_db     │    │   vehicle_db      │
└───────────────────┘    └───────────────────┘    └───────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │        Message Bus (Kafka)      │
                    │   Events • Notifications • Logs │
                    └─────────────────────────────────┘
Design Patterns Used
Pattern	Location	Purpose
Strategy Pattern	Parking Service	Configurable parking allocation algorithms
Repository Pattern	Infrastructure	Data access abstraction
Factory Pattern	Domain Layer	Vehicle creation
Observer Pattern	Events	Real-time notifications
Value Object Pattern	Domain Layer	Immutable domain objects
Singleton Pattern	Services	Single service instances
🛠️ Technology Stack
Backend
Technology	Version	Purpose
Python	3.10+	Core language
FastAPI	0.100+	API framework
PostgreSQL	15	Primary database
MongoDB	6	EV charging data
Redis	7	Caching & real-time
Kafka	3.4	Message queue
SQLAlchemy	2.0	ORM
Alembic	1.11	Database migrations
Pydantic	2.0	Data validation
JWT	-	Authentication
Frontend
Technology	Version	Purpose
React	18.2	UI framework
Vite	4.4	Build tool
Redux Toolkit	1.9	State management
React Query	4.29	API caching
Tailwind CSS	3.3	Styling
Framer Motion	10.12	Animations
React Hook Form	7.45	Form handling
DevOps
Technology	Version	Purpose
Docker	24.0	Containerization
Docker Compose	2.20	Multi-container orchestration
Nginx	1.25	Reverse proxy
Railway	-	Deployment platform
GitHub Actions	-	CI/CD
Prometheus	-	Monitoring
Grafana	-	Visualization
📁 Project Structure
text
parking-management-system/
├── README.md
├── LICENSE
├── .gitignore
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
│
├── backend/                          # Python Backend (FastAPI)
│   ├── src/
│   │   ├── domain/                   # Domain Models (DDD)
│   │   ├── application/              # Application Layer
│   │   ├── infrastructure/           # Infrastructure Layer
│   │   └── interfaces/               # API Layer
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                         # React Frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── services/
│   │   └── store/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── services/                         # Microservices
│   ├── parking-service/
│   ├── charging-service/
│   ├── vehicle-service/
│   └── notification-service/
│
├── infra/                            # Infrastructure
│   ├── docker/
│   ├── nginx/
│   └── scripts/
│
├── docs/                             # Documentation
│   ├── api/
│   ├── architecture/
│   └── deployment/
│
└── .github/
    └── workflows/                    # CI/CD Pipelines
🚀 Quick Start
Prerequisites
Docker & Docker Compose (recommended)

Python 3.10+ (for local development)

Node.js 18+ (for frontend development)

PostgreSQL 15 (for database)

Redis 7 (for caching)

MongoDB 6 (for EV charging data)

Option 1: Using Docker (Recommended)
bash
# Clone the repository
git clone https://github.com/yourusername/parking-management-system.git
cd parking-management-system

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# Wait for services to start (approx 30 seconds)

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/api/v1
# API Docs: http://localhost:8000/docs

# Stop services
docker-compose down
Option 2: Local Development
Backend Setup
bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start the server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
Frontend Setup
bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build
📚 API Documentation
API Endpoints
Parking Service
Method	Endpoint	Description
POST	/api/v1/parking/lots	Create parking lot
GET	/api/v1/parking/lots/{id}	Get lot details
POST	/api/v1/parking/park	Park vehicle
POST	/api/v1/parking/remove	Remove vehicle
GET	/api/v1/parking/lots/{id}/status	Get lot status
GET	/api/v1/parking/vehicles/search	Search vehicles
Charging Service
Method	Endpoint	Description
POST	/api/v1/charging/stations	Create station
POST	/api/v1/charging/sessions	Start charging
PUT	/api/v1/charging/sessions/{id}	Stop charging
GET	/api/v1/charging/stations/{id}/status	Get station status
Interactive API Documentation
Once the server is running, access the interactive API documentation:

Swagger UI: http://localhost:8000/docs

ReDoc: http://localhost:8000/redoc

Example API Calls
Create Parking Lot
bash
curl -X POST "http://localhost:8000/api/v1/parking/lots" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Parking",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip_code": "10001",
    "total_capacity": 50,
    "ev_capacity": 10,
    "hourly_rate": 5.00
  }'
Park Vehicle
bash
curl -X POST "http://localhost:8000/api/v1/parking/park" \
  -H "Content-Type: application/json" \
  -d '{
    "lot_id": "550e8400-e29b-41d4-a716-446655440000",
    "license_plate": "ABC123",
    "make": "Tesla",
    "model": "Model 3",
    "color": "Red",
    "year": 2024,
    "is_electric": true
  }'
🧪 Testing
Backend Tests
bash
# Navigate to backend
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/unit/test_domain.py
Frontend Tests
bash
# Navigate to frontend
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage
Load Testing
bash
# Run k6 load tests
k6 run tests/load/k6-script.js

# Run with custom config
k6 run tests/load/k6-script.js --config tests/load/k6-config.js
🚀 Deployment
Railway Deployment
bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up

# Set environment variables
railway variables set JWT_SECRET=your-secret-key
railway variables set DATABASE_URL=your-postgres-url
Docker Production Deployment
bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Monitor health
curl http://localhost/health
Kubernetes Deployment
bash
# Apply configurations
kubectl apply -f infra/kubernetes/

# Check status
kubectl get pods -n parking-system
kubectl get services -n parking-system

# Scale deployment
kubectl scale deployment parking-backend -n parking-system --replicas=5
🔧 Environment Variables
Backend Environment Variables
env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/parking_db
MONGODB_URI=mongodb://localhost:27017/charging_db
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRY=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
Frontend Environment Variables
env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000
VITE_MAPBOX_TOKEN=your-mapbox-token
VITE_GOOGLE_ANALYTICS_ID=your-ga-id
🤝 Contributing
We welcome contributions! Please follow these steps:

Fork the repository

Create a feature branch

bash
git checkout -b feature/amazing-feature
Commit your changes

bash
git commit -m 'Add amazing feature'
Push to the branch

bash
git push origin feature/amazing-feature
Open a Pull Request

Development Guidelines
Write tests for new features

Follow PEP 8 for Python code

Use ESLint for JavaScript/React

Update documentation accordingly

Ensure all tests pass before submitting PR

📊 Monitoring & Logging
Health Checks
bash
# Backend health
curl http://localhost:8000/health

# Service status
curl http://localhost:8000/metrics

# Database health
curl http://localhost:8000/health/db
Logging
bash
# View application logs
docker-compose logs -f backend

# View access logs
docker-compose logs -f nginx

# View error logs
docker-compose logs -f backend | grep ERROR
📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
Quantic School of Business and Technology - Project guidance and faculty feedback

Martin Fowler - Patterns of Enterprise Application Architecture

Domain-Driven Design Community - DDD principles and practices

📞 Contact & Support
Documentation: https://docs.parking-system.com

Issue Tracker: GitHub Issues

Email: support@parking-system.com

<div align="center">
Built with ❤️ by the Parking Management Team

⬆ Back to Top

</div>