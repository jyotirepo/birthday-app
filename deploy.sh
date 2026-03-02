#!/bin/bash
set -e

echo "🏗️  Building Docker images..."

# Build images
docker build -t birthday-backend:latest ./backend
docker build -t birthday-frontend:latest ./frontend

echo "✅ Images built successfully"
echo ""

# For Minikube users
if command -v minikube &> /dev/null; then
  echo "📦 Detected Minikube — loading images into cluster..."
  minikube image load birthday-backend:latest
  minikube image load birthday-frontend:latest
fi

echo "🚀 Deploying to Kubernetes..."
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-postgres-secret.yaml
kubectl apply -f k8s/02-postgres.yaml

echo "⏳ Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n birthday-app --timeout=60s

kubectl apply -f k8s/03-backend.yaml
kubectl apply -f k8s/04-frontend.yaml

echo "⏳ Waiting for deployments..."
kubectl rollout status deployment/backend -n birthday-app
kubectl rollout status deployment/frontend -n birthday-app

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📌 Access options:"
echo "  NodePort:   http://<NODE_IP>:30080"
echo "  Port-forward: kubectl port-forward svc/frontend-service 8080:80 -n birthday-app"
echo "                then open: http://localhost:8080"
echo ""
echo "  For Minikube: minikube service frontend-service -n birthday-app"
