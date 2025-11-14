# Real-time Voice Agent Template

A production-ready template for building voice agents with OpenAI's Realtime API. Create custom AI voice assistants with real-time conversation capabilities, custom tools, and specialized domain knowledge.

## Overview

This template provides a complete foundation for building voice-enabled AI agents. It includes:
- Full-duplex voice conversation handling
- Tool/function calling framework
- WebSocket-based architecture
- React-based UI with audio visualization
- Example tools (calculator, date/time) to get started

Perfect for creating specialized agents in any domain: customer service, education, healthcare, technical support, or any custom use case.

## Features

- 🎤 **Real-time Voice Conversations**: Natural, low-latency voice interactions
- 🔧 **Tool Framework**: Easy-to-extend function calling system
- 📝 **Live Transcription**: Real-time conversation transcript display
- 🔇 **Audio Controls**: Mute/unmute during conversation
- 📊 **Status Indicators**: Visual connection and activity feedback
- 🎨 **Clean UI**: Modern, responsive interface ready to customize
- ⚡ **Fast Setup**: Get running in minutes

## Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React + Vite)                │
│  - WebSocket connection                 │
│  - Audio capture/playback (PCM16)       │
│  - Real-time UI updates                 │
└──────────────┬──────────────────────────┘
               │ WebSocket
┌──────────────▼──────────────────────────┐
│  Backend (FastAPI)                      │
│  - WebSocket relay server               │
│  - Tool execution                       │
│  - Agent configuration                  │
└──────────────┬──────────────────────────┘
               │ WebSocket + Auth
┌──────────────▼──────────────────────────┐
│  OpenAI Realtime API                    │
│  - gpt-realtime-mini                    │
│  - Voice synthesis & recognition        │
└─────────────────────────────────────────┘
```

## Tech Stack

### Backend
- Python 3.13
- FastAPI (web framework)
- Uvicorn (ASGI server)
- WebSockets (bidirectional communication)
- OpenAI SDK
- python-dotenv (configuration)

### Frontend
- React 18
- Vite (build tool)
- Web Audio API (audio capture/playback)
- WebSocket API (real-time communication)

## Prerequisites

- Python 3.13 or higher
- Node.js 18+ and npm
- OpenAI API key with access to Realtime API
- Modern web browser with microphone access

## Quick Start

### 1. Clone or Navigate to Project

```bash
cd realtime-agent-test
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3.13 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Edit .env and add your OpenAI API key
# nano .env  # or use your preferred editor
```

**Important**: Edit the `.env` file and set your `OPENAI_API_KEY`:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
MODEL=gpt-realtime-mini
VOICE=alloy
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:5173
```

Available voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access:** Open http://localhost:5173 in your browser

## Customizing Your Agent

### 1. Modify Agent Instructions

Edit [backend/agent_config/agent_template.py](backend/agent_config/agent_template.py):

```python
AGENT_INSTRUCTIONS = """You are a [YOUR DOMAIN] expert assistant...

Your responsibilities:
- [List key responsibilities]
- [Define behavior]
- [Set personality traits]

Available tools:
- [Describe your custom tools]
"""
```

### 2. Add Custom Tools

Create new tools in [backend/agent_config/tools.py](backend/agent_config/tools.py):

```python
from agents import function_tool

@function_tool
def my_custom_tool(param: str) -> str:
    """Tool description for the AI to understand when to use it.

    Args:
        param: Parameter description

    Returns:
        Result description
    """
    # Your tool implementation
    return "Tool result"

# Add to TOOLS list
TOOLS = [calculator_tool, get_date_time_tool, my_custom_tool]
```

### 3. Customize the UI

- **Branding**: Edit [frontend/src/App.jsx](frontend/src/App.jsx) for title and header
- **Styling**: Modify CSS files in [frontend/src/](frontend/src/) and [frontend/src/components/](frontend/src/components/)
- **Features**: Extend [frontend/src/components/VoiceAgent.jsx](frontend/src/components/VoiceAgent.jsx) for additional UI elements

See [CUSTOMIZATION.md](CUSTOMIZATION.md) for detailed customization guide.

## Project Structure

```
realtime-agent-test/
├── backend/
│   ├── agent_config/
│   │   ├── __init__.py          # Package exports
│   │   ├── agent_template.py    # Agent configuration (CUSTOMIZE THIS)
│   │   └── tools.py             # Tool functions (ADD YOUR TOOLS HERE)
│   ├── api/
│   │   ├── __init__.py
│   │   └── websocket.py         # WebSocket endpoint
│   ├── config.py                # Configuration management
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example            # Example environment variables
│   └── .env                    # Your actual config (gitignored)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceAgent.jsx       # Main voice UI component
│   │   │   ├── VoiceAgent.css
│   │   │   ├── Transcript.jsx       # Conversation display
│   │   │   └── Transcript.css
│   │   ├── hooks/
│   │   │   └── useRealtimeAgent.js  # WebSocket & audio logic
│   │   ├── App.jsx              # Root component
│   │   └── main.jsx             # Entry point
│   ├── package.json
│   └── vite.config.js
├── docs/
│   └── vision.md                # Architecture and design decisions
├── CUSTOMIZATION.md             # Detailed customization guide
├── QUICKSTART.md               # Quick start guide
└── README.md                   # This file
```

## Example Use Cases

This template can be adapted for:

- **Customer Service**: Product support, order tracking, FAQ assistance
- **Education**: Tutoring, language learning, exam preparation
- **Healthcare**: Symptom checker, appointment scheduling, patient education
- **Technical Support**: IT helpdesk, troubleshooting, software guidance
- **Sales**: Product recommendations, lead qualification, order assistance
- **Personal Assistant**: Calendar management, reminders, information lookup
- **Domain Expert**: Legal advice, financial planning, career coaching

## Configuration

### Backend Environment Variables (.env)

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `MODEL`: Realtime model to use (default: gpt-realtime-mini)
- `VOICE`: Agent voice (default: alloy)
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:5173)

### Frontend Environment Variables (.env)

- `VITE_WS_URL`: WebSocket URL (default: ws://localhost:8000/ws)

## Testing Your Agent

1. **Connect**: Click "🎤 Connect" to start
2. **Speak**: Talk naturally about topics in your agent's domain
3. **Verify Tools**: Test tool calling by asking questions that should trigger tools
4. **Check Transcript**: Ensure transcription is accurate
5. **Test Interruptions**: Try interrupting the agent mid-response

### Example Test Conversations (Default Agent)

- "What's 25 times 37?"
- "Calculate the square root of 144"
- "What's today's date?"
- "What time is it right now?"

Replace these with domain-specific examples for your custom agent.

## Troubleshooting

### Backend Issues

**Error: "OPENAI_API_KEY is required"**
- Create `.env` file in `backend/` directory
- Copy from `.env.example` and add your API key

**Error: "Connection refused"**
- Check if backend is running on port 8000
- Try accessing http://localhost:8000/health

**Error: "Module not found"**
- Activate virtual environment: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend Issues

**Error: "Failed to connect to WebSocket"**
- Verify backend server is running
- Check WebSocket URL in `.env` or `useRealtimeAgent.js`

**No audio or microphone not working**
- Grant microphone permissions in browser
- Check browser console for errors
- Try using HTTPS (required by some browsers)

**Transcript not updating**
- Check browser console for WebSocket errors
- Verify backend is running and accessible

### OpenAI API Issues

**Error: "Unauthorized" or 401**
- Verify your API key is valid
- Ensure you have Realtime API access

**Error: "Model not found"**
- Check model name in `.env` matches available models

## API Costs

The Realtime API pricing (as of 2025):
- Audio input: ~40 tokens per second
- Audio output: ~40 tokens per second
- Approximate: 800 tokens/minute of conversation

Session limits:
- Maximum duration: 15 minutes
- Maximum tokens: 128,000 per session

Monitor your usage in the OpenAI dashboard.

## Production Considerations

For production deployment:

1. **Security**
   - Add authentication/authorization
   - Implement rate limiting
   - Use HTTPS/WSS (secure WebSocket)
   - Validate and sanitize all tool inputs

2. **Scalability**
   - Add load balancing
   - Implement connection pooling
   - Use Redis for session state (if needed)

3. **Monitoring**
   - Add logging and analytics
   - Monitor API usage and costs
   - Track error rates and performance

4. **Deployment**
   - Containerize with Docker
   - Use environment-specific configs
   - Implement CI/CD pipeline
   - Use CDN for frontend assets

See [docs/vision.md](docs/vision.md) for detailed architecture discussion.

## Resources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [CUSTOMIZATION.md](CUSTOMIZATION.md) - Detailed customization guide

## Contributing

This is a template repository. Feel free to:
- Fork and customize for your use case
- Submit issues for bugs or improvements
- Share your customizations with the community

## License

This is an educational template project provided as-is for building custom voice agents.

## Support

For issues:
1. Check the Troubleshooting section
2. Review browser console and backend logs
3. Consult OpenAI Realtime API documentation
4. Check [docs/vision.md](docs/vision.md) for architecture details

---

**Ready to build your voice agent?** Start by customizing [backend/agent_config/agent_template.py](backend/agent_config/agent_template.py) and [backend/agent_config/tools.py](backend/agent_config/tools.py)!
