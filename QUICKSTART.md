# Quick Start Guide

## Setup (5 minutes)

### 1. Backend Setup

```bash
cd backend
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Run

### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate
python main.py
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### Browser
Open: http://localhost:5173

## Quick Test

1. Click "🎤 Connect"
2. Allow microphone access
3. Say: "Calculate 100000 times 1.07 to the power of 30"
4. The agent will use the calculator tool and respond

## Customization

**Change Voice**: Edit `backend/.env` → `VOICE=nova` (options: alloy, echo, fable, onyx, nova, shimmer)

**Change Model**: Edit `backend/.env` → `MODEL=gpt-realtime-mini`

**Modify Agent**: Edit `backend/agent.py` → `AGENT_INSTRUCTIONS`

## Health Check

Backend: http://localhost:8000/health

## Stop

Press `Ctrl+C` in both terminal windows
