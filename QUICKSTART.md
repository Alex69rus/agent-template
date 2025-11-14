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
3. Try these examples:
   - "What's 25 times 37?"
   - "Calculate 2 to the power of 10"
   - "What's today's date?"
   - "What time is it?"

The agent will use the calculator and date/time tools to respond.

## Customization

**Change Voice**: Edit `backend/.env` → `VOICE=nova` (options: alloy, echo, fable, onyx, nova, shimmer)

**Change Model**: Edit `backend/.env` → `MODEL=gpt-realtime-mini`

**Modify Agent**: Edit `backend/agent_config/agent_template.py` → Update `AGENT_INSTRUCTIONS`

**Add Tools**: Edit `backend/agent_config/tools.py` → Add your custom tool functions

## Health Check

Backend: http://localhost:8000/health

## Stop

Press `Ctrl+C` in both terminal windows

---

**Next Steps**: See [CUSTOMIZATION.md](CUSTOMIZATION.md) to create your own specialized agent!
