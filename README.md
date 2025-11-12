# Real-time Voice Agent - Finance Advisor

A proof-of-concept real-time voice agent built with OpenAI's Realtime API, specializing in retirement planning, risk assessment, and market trends discussions.

## Features

- 🎤 **Real-time Voice Conversations**: Natural voice interactions with AI agent
- 💼 **Finance Expertise**: Specialized in retirement planning, risk assessment, and market trends
- 🔧 **Built-in Tools**:
  - **Calculator Tool**: For financial calculations (compound interest, returns, etc.)
  - **Date/Time Tool**: Provides current date/time for time-relevant context
- 📝 **Live Transcription**: See conversation transcript in real-time
- 🔇 **Mute Control**: Toggle microphone on/off during conversation
- 📊 **Status Indicators**: Visual feedback for connection state

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
│  - Tool execution (calculator, datetime)│
│  - Agent configuration                  │
└──────────────┬──────────────────────────┘
               │ WebSocket + Auth
┌──────────────▼──────────────────────────┐
│  OpenAI Realtime API                    │
│  - gpt-4o-realtime-preview-2024-12-17   │
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

## Setup Instructions

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
MODEL=gpt-4o-realtime-preview-2024-12-17
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

## Running the Application

### Start Backend Server

```bash
# From backend directory with venv activated
cd backend
source venv/bin/activate  # if not already activated
python main.py
```

The backend server will start on `http://localhost:8000`

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Start Frontend Development Server

In a new terminal:

```bash
# From frontend directory
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

You should see:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

**Note**: You'll need to grant microphone permissions when prompted.

## Usage

1. **Connect**: Click the "🎤 Connect" button to start the session
2. **Talk**: Start speaking naturally about finance topics
3. **Listen**: The agent will respond with voice and text
4. **Mute**: Use the "🎙️ Mute" button to temporarily mute your microphone
5. **Transcript**: View the conversation history in real-time
6. **Disconnect**: Click "🔌 Disconnect" to end the session

### Example Conversations

Try asking:
- "What's the best strategy for retirement savings?"
- "How should I assess my risk tolerance for investing?"
- "Calculate the compound interest on $100,000 over 30 years at 7% annual return"
- "What are the current market trends I should be aware of?"
- "What's today's date?" (triggers the date/time tool)

## Project Structure

```
realtime-agent-test/
├── backend/
│   ├── main.py              # FastAPI app & WebSocket relay
│   ├── agent.py             # Agent config, tools, instructions
│   ├── config.py            # Environment configuration
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Example environment variables
│   └── .env                 # Your actual config (gitignored)
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceAgent.jsx       # Main voice UI component
│   │   │   ├── VoiceAgent.css
│   │   │   ├── Transcript.jsx       # Conversation display
│   │   │   └── Transcript.css
│   │   ├── hooks/
│   │   │   └── useRealtimeAgent.js  # WebSocket & audio logic
│   │   ├── App.jsx          # Root component
│   │   ├── App.css
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Configuration Options

### Backend (.env)

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `MODEL`: Realtime model to use (default: gpt-4o-realtime-preview-2024-12-17)
- `VOICE`: Agent voice (default: alloy)
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:5173)

### Agent Instructions

To customize the agent's behavior, edit `backend/agent.py`:
- Modify `AGENT_INSTRUCTIONS` for different expertise areas
- Add/remove tools in `TOOLS` array
- Implement new tool functions in `TOOL_FUNCTIONS` dictionary

### Frontend WebSocket URL

If running backend on a different host/port, update `WS_URL` in:
```javascript
// frontend/src/hooks/useRealtimeAgent.js
const WS_URL = 'ws://localhost:8000/ws'
```

## Troubleshooting

### Backend Issues

**Error: "OPENAI_API_KEY is required"**
- Make sure you created `.env` file in `backend/` directory
- Verify the API key is correctly set without quotes

**Error: "Connection refused"**
- Check if backend server is running on port 8000
- Try accessing http://localhost:8000/health in browser

**Error: "Module not found"**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again

### Frontend Issues

**Error: "Failed to connect to WebSocket"**
- Verify backend server is running
- Check WebSocket URL in `useRealtimeAgent.js`
- Check browser console for detailed errors

**No audio or microphone not working**
- Grant microphone permissions in browser
- Check browser console for `getUserMedia` errors
- Try using HTTPS (some browsers require secure context)

**Transcript not updating**
- Check browser console for WebSocket errors
- Verify backend is properly relaying messages
- Check network tab for WebSocket connection status

### OpenAI API Issues

**Error: "Unauthorized" or 401 status**
- Verify your API key is valid
- Ensure you have access to Realtime API

**Error: "Model not found"**
- Check if the model name in `.env` is correct
- OpenAI may have updated model names

## API Costs

The Realtime API uses token-based pricing:
- Audio input: ~40 tokens per second
- Audio output: ~40 tokens per second
- Approximate: 800 tokens/minute of conversation

Session limits:
- Maximum duration: 15 minutes
- Maximum tokens: 128,000 per session

## Development Notes

### KISS Principle Applied
- No database (stateless sessions)
- Minimal dependencies
- Simple WebSocket relay pattern
- No authentication (PoC only)

### YAGNI Principle Applied
- No session persistence
- No conversation history storage
- No user management
- No advanced audio processing beyond PCM16

### Security Considerations (Production)
For production deployment, consider:
- Add authentication/authorization
- Implement rate limiting
- Use HTTPS/WSS (secure WebSocket)
- Validate/sanitize tool inputs
- Add session timeout mechanisms
- Monitor API usage and costs

## Next Steps for Production

1. **WebRTC Migration**: Switch from WebSocket to WebRTC for better audio quality
2. **Authentication**: Add user authentication (OAuth, JWT)
3. **Session Management**: Implement session persistence
4. **Error Recovery**: Add automatic reconnection logic
5. **Monitoring**: Add logging and analytics
6. **Deployment**: Containerize with Docker
7. **CDN**: Use CDN for frontend assets

## Resources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## License

This is a proof-of-concept project for educational purposes.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review browser console for errors
3. Check backend logs for detailed error messages
4. Consult OpenAI API documentation

---

**Disclaimer**: This application provides educational information only, not personalized financial advice. Users should consult with licensed financial advisors for specific investment recommendations.
