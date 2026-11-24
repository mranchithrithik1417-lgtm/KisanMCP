#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "==================================================="
echo "    🌾 KisanClaim MCP - wHACKiest 2026 Launcher"
echo "==================================================="
echo ""

# 1. Setup Python venv
if [ ! -f "venv/bin/python" ]; then
    echo "[INFO] Creating Python virtual environment..."
    python3 -m venv venv || python -m venv venv
    echo "[INFO] Installing backend dependencies..."
    venv/bin/pip install -r backend/requirements.txt
fi

# 2. Setup Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "[INFO] Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# 3. Seed Database
echo "[INFO] Seeding database with demo farmer, plot & claims..."
export PYTHONIOENCODING=utf-8
venv/bin/python -m backend.seed

echo ""
echo "==================================================="
echo "  Starting KisanClaim MCP Services:"
echo "  🌾 Farmer Mobile App:       http://localhost:5173"
echo "  🛡️ Insurer Review Console:  http://localhost:5173 (Click Insurer Console in header)"
echo "  ⚙️ Backend API & Docs:      http://localhost:8000/docs"
echo "==================================================="
echo ""

# Cleanup background processes on exit
cleanup() {
    echo ""
    echo "[INFO] Stopping services..."
    kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT

# 4. Start Backend
echo "[INFO] Starting FastAPI backend on port 8000..."
venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

# 5. Start Frontend
echo "[INFO] Starting Vite frontend on port 5173..."
cd frontend
npm run dev -- --host
