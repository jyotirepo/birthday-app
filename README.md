# 🎂 BirthdayHQ — Employee Birthday Management

A full-stack Kubernetes-deployable app to manage employee data and birthdays.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Kubernetes Cluster              │
│                                                 │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │   Frontend   │───▶│      Backend         │   │
│  │  (nginx:80)  │    │  (Node.js:3001)      │   │
│  │  NodePort    │    │  REST API            │   │
│  │   :30080     │    └──────────┬───────────┘   │
│  └──────────────┘               │               │
│                        ┌────────▼──────────┐    │
│                        │    PostgreSQL     │    │
│                        │   (port 5432)    │    │
│                        │   + PVC 1Gi      │    │
│                        └──────────────────┘    │
└─────────────────────────────────────────────────┘
```

## Quick Start

### Option 1: Docker Compose (local dev)
```bash
docker-compose up --build
# Open http://localhost:8080
```

### Option 2: Kubernetes (Minikube)
```bash
# Start minikube
minikube start

# Build + deploy
chmod +x deploy.sh
./deploy.sh

# Open in browser
minikube service frontend-service -n birthday-app
```

### Option 3: Kubernetes (generic)
```bash
# Build images
docker build -t birthday-backend:latest ./backend
docker build -t birthday-frontend:latest ./frontend

# Push to your registry (replace with your registry URL)
docker tag birthday-backend:latest YOUR_REGISTRY/birthday-backend:latest
docker tag birthday-frontend:latest YOUR_REGISTRY/birthday-frontend:latest
docker push YOUR_REGISTRY/birthday-backend:latest
docker push YOUR_REGISTRY/birthday-frontend:latest

# Update image names in k8s/03-backend.yaml and k8s/04-frontend.yaml

# Deploy
kubectl apply -f k8s/
```

### Port-forward (after deploy)
```bash
kubectl port-forward svc/frontend-service 8080:80 -n birthday-app
# Open http://localhost:8080
```

## Features
- ✅ Add / Edit / Delete employees
- ✅ Store Name, Department, Position, DOB, Email, Phone
- ✅ Dashboard with birthday stats
- ✅ Upcoming birthdays (next 30 days)
- ✅ Filter by month and department
- ✅ Click any employee to see birthday details
- ✅ Age calculation
- ✅ Data persisted in PostgreSQL with PVC

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/employees | List all employees |
| POST | /api/employees | Create employee |
| PUT | /api/employees/:id | Update employee |
| DELETE | /api/employees/:id | Delete employee |
| GET | /api/birthdays/upcoming | Birthdays in next 30 days |
| GET | /health | Health check |

## Project Structure
```
employee-birthday-app/
├── frontend/
│   ├── index.html        # Single-page app (HTML/CSS/JS)
│   ├── nginx.conf        # Nginx config (proxies /api to backend)
│   └── Dockerfile
├── backend/
│   ├── server.js         # Express REST API
│   ├── package.json
│   └── Dockerfile
├── k8s/
│   ├── 00-namespace.yaml
│   ├── 01-postgres-secret.yaml
│   ├── 02-postgres.yaml       # DB + PVC + Service
│   ├── 03-backend.yaml        # API + Service (ClusterIP)
│   ├── 04-frontend.yaml       # UI + Service (NodePort 30080)
│   └── 05-ingress.yaml        # Optional ingress
├── docker-compose.yml    # Local dev
├── deploy.sh             # Build + deploy script
└── README.md
```
