# Building Real-time Voice Agents with OpenAI Agents SDK

## Complete Guide from Scratch

This document captures the complete journey, challenges, and solutions for building a production-ready real-time voice agent using the OpenAI Agents SDK, FastAPI, and React.

---

## Table of Contents

1. [Recent Improvements](#recent-improvements)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Audio Pipeline](#audio-pipeline)
8. [Interruption Handling](#interruption-handling)
9. [Tools Integration](#tools-integration)
10. [Production Considerations](#production-considerations)
11. [Key Learnings](#key-learnings)

---

## Recent Improvements

### Critical Fixes for Production-Ready Voice Agent

**1. Smooth Audio Playback (Eliminates Stuttering)**
- **Problem**: Sequential playback with `await` caused micro-interruptions between audio chunks
- **Solution**: Scheduled playback using `source.start(scheduledTime)` for gap-free audio
- **Result**: Smooth, continuous agent speech without stuttering
- **Files**: [useRealtimeAgent.js:88-153](../frontend/src/hooks/useRealtimeAgent.js#L88-L153)

**2. Noise-Resistant Interruption Detection**
- **Problem**: Single-frame speech detection triggered false interruptions from coughs, clicks, background noise
- **Solution**: Require 3 consecutive frames (~500ms) of sustained speech before interrupting
- **Result**: Natural interruptions work, but brief noises don't cause false positives
- **Files**: [useRealtimeAgent.js:118-164](../frontend/src/hooks/useRealtimeAgent.js#L118-L164)

**3. Fixed Tool Event Handling**
- **Problem**: `AttributeError: 'RealtimeToolStart' object has no attribute 'tool_name'`
- **Solution**: Extract tool name from `event.tool` object using `getattr()`
- **Result**: Tools execute without crashes
- **Files**: [main.py:200-212](../backend/main.py#L200-L212)

**4. Proper Interruption Cleanup**
- **Problem**: Audio continued playing locally even after interruption signal sent
- **Solution**: Track array of active audio sources and stop all on interruption
- **Result**: Immediate, complete audio stop when user interrupts
- **Files**: [useRealtimeAgent.js:66-85](../frontend/src/hooks/useRealtimeAgent.js#L66-L85)

**Key Technical Changes:**
```javascript
// Before: Sequential playback (caused gaps)
await new Promise(resolve => source.onended = resolve)

// After: Scheduled playback (no gaps)
source.start(scheduledTime)
scheduledTime += audioBuffer.duration
```

```javascript
// Before: Single-frame detection (false positives)
if (rms > threshold && agentSpeaking) interrupt()

// After: Sustained speech detection (noise resistant)
if (consecutiveFrames >= 3 && agentSpeaking) interrupt()
```

```python
# Before: Wrong attributes
event.tool_name  # ❌ AttributeError

# After: Extract from tool object
getattr(event.tool, 'name', str(event.tool))  # ✅ Works
```

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────┐
│  Frontend (React + Web Audio API)      │
│  - Microphone capture (PCM16 24kHz)    │
│  - Audio playback                       │
│  - Speech detection for interruption   │
│  - WebSocket client                     │
└──────────────┬──────────────────────────┘
               │ WebSocket (ws://)
┌──────────────▼──────────────────────────┐
│  Backend (FastAPI)                      │
│  - WebSocket relay server               │
│  - Event transformation                 │
│  - Tool execution                       │
│  - Audio format handling                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  OpenAI Agents SDK                      │
│  - RealtimeAgent                        │
│  - RealtimeRunner                       │
│  - RealtimeSession                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  OpenAI Realtime API                    │
│  - gpt-4o-realtime-preview-2024-12-17   │
│  - Voice synthesis & recognition        │
│  - Tool calling                         │
└─────────────────────────────────────────┘
```

### Why This Architecture?

- **WebSocket Relay**: Keeps API keys secure server-side
- **Event Transformation**: Bridges OpenAI SDK events to frontend-compatible format
- **Bidirectional Streaming**: Real-time audio in both directions
- **Tool Execution**: Server-side execution of tools for security

---

## Technology Stack

### Backend

```python
# requirements.txt
fastapi==0.115.6
uvicorn[standard]==0.34.0
websockets==14.1
openai-agents==0.5.0
python-dotenv==1.0.1
```

**Key Components:**
- **FastAPI**: Async web framework with native WebSocket support
- **OpenAI Agents SDK**: Official SDK for Realtime API integration
- **Python 3.13**: Latest Python with improved async performance

### Frontend

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.3"
  }
}
```

**Key Technologies:**
- **React**: UI framework
- **Web Audio API**: Native browser audio processing
- **WebSocket API**: Browser WebSocket client
- **Vite**: Fast build tool with HMR

---

## Backend Implementation

### 1. Project Structure

```
backend/
├── main.py              # FastAPI app & WebSocket endpoint
├── agent.py             # Agent configuration
├── tools.py             # @function_tool decorated tools
├── config.py            # Environment configuration
├── requirements.txt     # Dependencies
├── .env.example         # Configuration template
└── .env                 # Actual config (gitignored)
```

### 2. Configuration (`config.py`)

```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    MODEL: str = os.getenv("MODEL", "gpt-4o-realtime-preview-2024-12-17")
    VOICE: str = os.getenv("VOICE", "alloy")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    @classmethod
    def validate(cls) -> None:
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required")

Config.validate()
```

### 3. Tools (`tools.py`)

**Critical Pattern: Use `@function_tool` decorator**

```python
from agents import function_tool
from datetime import datetime

@function_tool
def calculator_tool(expression: str) -> str:
    """Evaluate mathematical expressions.

    Args:
        expression: Math expression to evaluate (e.g., "100000 * 1.07 ** 30")

    Returns:
        Result of calculation or error message.
    """
    try:
        allowed = {"abs": abs, "round": round, "min": min, "max": max, "pow": pow}
        result = eval(expression, {"__builtins__": {}}, allowed)
        return f"Result: {result:,.2f}" if isinstance(result, (int, float)) else str(result)
    except Exception as e:
        return f"Error: {str(e)}"

@function_tool
def get_date_time_tool() -> str:
    """Get current date and time.

    Returns:
        Current date/time in human-readable format.
    """
    now = datetime.now()
    return f"Current date: {now.strftime('%B %d, %Y at %I:%M %p')}"
```

**Key Points:**
- Docstring becomes tool description
- Type hints define parameters
- Return strings (not JSON) for voice responses
- Use `@function_tool` decorator (not manual tool definitions)

### 4. Agent Configuration (`agent.py`)

```python
from tools import calculator_tool, get_date_time_tool

AGENT_INSTRUCTIONS = """You are a knowledgeable financial advisor.

Be short, concise and conversational - this is a voice interface.

Your expertise:
- Retirement Planning: 401(k)s, IRAs, pensions
- Risk Assessment: Portfolio diversification, risk tolerance
- Market Trends: Current conditions, economic indicators

Guidelines:
- Use calculator tool for math
- Use date/time tool for time-relevant context
- Be conversational and friendly
- Provide educational information only
"""

# Simple list of tools - SDK handles the rest
TOOLS = [calculator_tool, get_date_time_tool]
```

### 5. Main Application (`main.py`)

**Critical Implementation Details:**

#### API Key Configuration

```python
# WRONG - API key in RealtimeRunner constructor
runner = RealtimeRunner(
    starting_agent=agent,
    api_key=Config.OPENAI_API_KEY  # ❌ This doesn't work
)

# CORRECT - API key in model_config
runner = RealtimeRunner(starting_agent=agent)

model_config = {
    "api_key": Config.OPENAI_API_KEY,  # ✅ Pass it here
    "model": Config.MODEL,
    "voice": Config.VOICE,
    # ...other config
}

async with await runner.run(model_config=model_config) as session:
    # Use session
```

#### Audio Event Handling

```python
async for event in session:
    event_type = event.type if hasattr(event, 'type') else str(type(event).__name__)

    if event_type == "audio":
        # event.audio contains RealtimeModelAudioEvent
        audio_obj = event.audio

        # Extract bytes - try multiple attributes
        audio_bytes = None
        if hasattr(audio_obj, 'delta') and isinstance(audio_obj.delta, (bytes, bytearray)):
            audio_bytes = audio_obj.delta
        elif hasattr(audio_obj, 'audio') and isinstance(audio_obj.audio, (bytes, bytearray)):
            audio_bytes = audio_obj.audio
        elif isinstance(audio_obj, (bytes, bytearray)):
            audio_bytes = audio_obj

        if audio_bytes:
            import base64
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            await websocket.send_text(json.dumps({
                "type": "response.audio.delta",
                "delta": audio_base64
            }))
```

#### Interruption Handling

```python
async def receive_from_client():
    while True:
        data = await websocket.receive_text()
        message = json.loads(data)

        if message.get("type") == "input_audio_buffer.append":
            audio_bytes = base64.b64decode(message["audio"])
            await session.send_audio(audio_bytes)

        elif message.get("type") == "response.cancel":
            # User interrupted - stop agent immediately
            await session.interrupt()
```

---

## Frontend Implementation

### 1. Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── VoiceAgent.jsx        # Main UI component
│   │   ├── VoiceAgent.css
│   │   ├── Transcript.jsx        # Conversation display
│   │   └── Transcript.css
│   ├── hooks/
│   │   └── useRealtimeAgent.js   # WebSocket & audio logic
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```

### 2. Audio Configuration

**Critical: Buffer size MUST be power of 2**

```javascript
const SAMPLE_RATE = 24000
const BUFFER_SIZE = 4096  // ✅ Power of 2 (not 4800!)

// WRONG: const BUFFER_SIZE = 4800
// ERROR: "buffer size (4800) must be 0 or a power of two between 256 and 16384"
```

**Valid buffer sizes:** 256, 512, 1024, 2048, 4096, 8192, 16384

### 3. Audio Capture Pipeline

```javascript
async function startAudioInput() {
    // 1. Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            channelCount: 1,           // Mono
            sampleRate: SAMPLE_RATE,    // 24kHz
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }
    })

    // 2. Create audio context
    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
    const source = audioContext.createMediaStreamSource(stream)

    // 3. Create processor (must be power of 2!)
    const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1)

    // 4. Process audio
    processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
            const inputData = e.inputBuffer.getChannelData(0)
            const int16Data = floatTo16BitPCM(inputData)

            // Convert to base64
            const base64 = btoa(
                String.fromCharCode.apply(null, new Uint8Array(int16Data.buffer))
            )

            // Send to server
            wsRef.current.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64
            }))
        }
    }

    // 5. Connect pipeline
    source.connect(processor)
    processor.connect(audioContext.destination)
}
```

### 4. Audio Format Conversion

```javascript
// Float32 [-1, 1] to PCM16 [-32768, 32767]
function floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]))
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return int16Array
}

// PCM16 to Float32 for playback
function int16ToFloat32(int16Array) {
    const float32Array = new Float32Array(int16Array.length)
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF)
    }
    return float32Array
}

// Base64 to PCM16
function base64ToInt16Array(base64) {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return new Int16Array(bytes.buffer)
}
```

### 5. Audio Playback (Scheduled for Smooth Playback)

**Critical: Use scheduled playback to eliminate micro-interruptions**

```javascript
// WRONG: Sequential playback causes gaps
async function playAudioFromQueue() {
    while (audioQueueRef.current.length > 0) {
        const chunk = audioQueueRef.current.shift()
        // ...create buffer
        await new Promise(resolve => {
            source.onended = resolve
            source.start()  // ❌ Waits for previous chunk, causes gaps
        })
    }
}

// CORRECT: Scheduled playback for smooth continuous audio
function playAudioFromQueue() {
    if (audioQueueRef.current.length === 0) return

    const audioContext = audioContextRef.current
    isAgentSpeakingRef.current = true

    // Initialize scheduled time if not playing
    if (!isPlayingRef.current || scheduledTimeRef.current < audioContext.currentTime) {
        scheduledTimeRef.current = audioContext.currentTime + 0.05 // 50ms buffer
        isPlayingRef.current = true
    }

    // Schedule all queued audio chunks
    while (audioQueueRef.current.length > 0) {
        const int16Array = audioQueueRef.current.shift()
        const float32Array = int16ToFloat32(int16Array)

        const audioBuffer = audioContext.createBuffer(1, float32Array.length, SAMPLE_RATE)
        audioBuffer.getChannelData(0).set(float32Array)

        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)

        // Track active sources for interruption
        currentAudioSourceRef.current.push(source)

        // Schedule this chunk to play immediately after the previous one
        source.start(scheduledTimeRef.current)  // ✅ Precise scheduling, no gaps!

        // Calculate when this chunk will finish
        const chunkDuration = audioBuffer.duration
        scheduledTimeRef.current += chunkDuration

        // Clean up source reference when it ends
        source.onended = () => {
            const index = currentAudioSourceRef.current.indexOf(source)
            if (index > -1) {
                currentAudioSourceRef.current.splice(index, 1)
            }

            // Check if playback is complete
            if (currentAudioSourceRef.current.length === 0 &&
                audioQueueRef.current.length === 0) {
                isPlayingRef.current = false
                isAgentSpeakingRef.current = false
                scheduledTimeRef.current = 0
            }
        }
    }
}
```

**Key Differences:**
- **Scheduled timing**: Uses `source.start(scheduledTime)` instead of `source.start()`
- **No await**: Doesn't wait for chunks to finish - schedules them all immediately
- **Precise scheduling**: Web Audio API handles exact timing, no JavaScript delays
- **Multiple sources**: Tracks array of active sources for proper interruption
- **Result**: Smooth, continuous audio without gaps or stuttering

### 6. Interruption Detection (Noise-Resistant)

**Critical: Require sustained speech to avoid false interruptions from noise**

```javascript
// Configuration
const SPEECH_THRESHOLD = 0.015  // RMS threshold (adjust based on environment)
const SUSTAINED_SPEECH_FRAMES = 3  // Require 3 consecutive frames (~500ms)

let consecutiveSpeechFrames = 0
let interruptionSent = false

processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0)

    // Calculate RMS (Root Mean Square) volume
    let sum = 0
    for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i]
    }
    const rms = Math.sqrt(sum / inputData.length)
    const isSpeaking = rms > SPEECH_THRESHOLD

    // Track consecutive frames of speech
    if (isSpeaking) {
        consecutiveSpeechFrames++
    } else {
        consecutiveSpeechFrames = 0
        interruptionSent = false  // Reset when user stops speaking
    }

    // Only interrupt if we detect sustained speech (not just noise)
    if (consecutiveSpeechFrames >= SUSTAINED_SPEECH_FRAMES &&
        !interruptionSent &&
        isAgentSpeakingRef.current) {

        console.log('Sustained user speech detected - interrupting agent')
        interruptionSent = true

        // Send interruption signal to backend
        wsRef.current.send(JSON.stringify({
            type: 'response.cancel'
        }))

        // Immediately stop local playback
        stopAudioPlayback()
    }

    // Continue processing audio...
}

function stopAudioPlayback() {
    // Stop all playing audio sources
    if (currentAudioSourceRef.current && currentAudioSourceRef.current.length > 0) {
        currentAudioSourceRef.current.forEach(source => {
            try {
                source.stop()
                source.disconnect()
            } catch (e) {
                // Ignore errors if already stopped
            }
        })
    }
    currentAudioSourceRef.current = []

    // Clear queue
    audioQueueRef.current = []
    isPlayingRef.current = false
    isAgentSpeakingRef.current = false
    scheduledTimeRef.current = 0
}
```

**Why Sustained Speech Detection?**
- **Problem**: Single-frame detection triggers on coughs, clicks, background noise
- **Solution**: Require 3 consecutive frames (≈500ms) of speech
- **Result**: Natural interruptions work, but noise doesn't trigger false positives

**Tuning Parameters:**
```javascript
// More sensitive (interrupts faster, more false positives)
const SPEECH_THRESHOLD = 0.01
const SUSTAINED_SPEECH_FRAMES = 2

// Less sensitive (fewer false positives, slower interruption)
const SPEECH_THRESHOLD = 0.02
const SUSTAINED_SPEECH_FRAMES = 4
```

---

## Common Issues & Solutions

### Issue 1: Buffer Size Error

**Error:**
```
IndexSizeError: Failed to execute 'createScriptProcessor' on 'BaseAudioContext':
buffer size (4800) must be 0 or a power of two between 256 and 16384.
```

**Solution:**
```javascript
// WRONG
const BUFFER_SIZE = 4800  // ❌

// CORRECT
const BUFFER_SIZE = 4096  // ✅ Power of 2
```

### Issue 2: API Key Configuration

**Error:**
```
RealtimeRunner.__init__() got an unexpected keyword argument 'api_key'
```

**Solution:**
```python
# WRONG
runner = RealtimeRunner(starting_agent=agent, api_key=key)  # ❌

# CORRECT
runner = RealtimeRunner(starting_agent=agent)
model_config = {"api_key": key, ...}
async with await runner.run(model_config=model_config) as session:
    ...
```

### Issue 3: Audio Event Structure

**Error:**
```
cannot convert 'RealtimeModelAudioEvent' object to bytes
```

**Solution:**
```python
# event.audio is NOT bytes, it's an object
audio_obj = event.audio

# Try multiple ways to extract bytes
if hasattr(audio_obj, 'delta'):
    audio_bytes = audio_obj.delta
elif hasattr(audio_obj, 'audio'):
    audio_bytes = audio_obj.audio
elif isinstance(audio_obj, bytes):
    audio_bytes = audio_obj
```

### Issue 4: Microphone Not Capturing

**Symptoms:** WebSocket connected, but no audio data sent from frontend

**Debug Steps:**
1. Check console for `getUserMedia` errors
2. Verify microphone permissions granted
3. Check buffer size is power of 2
4. Add logging in `onaudioprocess` callback
5. Verify WebSocket `readyState === WebSocket.OPEN`

**Solution:**
```javascript
// Add debug logging
processor.onaudioprocess = (e) => {
    console.log('Audio processing', {
        wsReady: wsRef.current?.readyState === WebSocket.OPEN,
        muted: isMuted,
        bufferSize: e.inputBuffer.length
    })
    // ...rest of processing
}
```

### Issue 5: Audio Not Playing

**Symptoms:** Receiving audio events but no sound

**Common Causes:**
1. AudioContext suspended
2. Audio queue not being processed
3. Format conversion error
4. currentAudioSourceRef not initialized as array

**Solution:**
```javascript
// Resume AudioContext if suspended
if (audioContext.state === 'suspended') {
    await audioContext.resume()
}

// Ensure playback is triggered
function handleAudioDelta(data) {
    const int16Array = base64ToInt16Array(data.delta)
    audioQueueRef.current.push(int16Array)
    playAudioFromQueue()  // ✅ Must trigger this
}

// Initialize refs correctly for scheduled playback
const currentAudioSourceRef = useRef([])  // ✅ Array, not null
const scheduledTimeRef = useRef(0)
```

### Issue 6: Audio Has Micro-Interruptions / Stuttering

**Symptoms:** Audio plays but has brief gaps/stuttering between chunks

**Cause:** Sequential playback with `await` causes JavaScript execution delays between chunks

**WRONG:**
```javascript
// ❌ Sequential playback - causes gaps
while (queue.length > 0) {
    const chunk = queue.shift()
    await new Promise(resolve => {
        source.onended = resolve
        source.start()  // Waits for previous chunk
    })
}
```

**CORRECT:**
```javascript
// ✅ Scheduled playback - no gaps
let scheduledTime = audioContext.currentTime + 0.05

while (queue.length > 0) {
    const chunk = queue.shift()
    const source = createAudioSource(chunk)

    source.start(scheduledTime)  // Schedule precisely
    scheduledTime += source.buffer.duration  // Track timing
}
```

**Key Points:**
- Use `source.start(time)` with scheduled time, not `source.start()`
- Don't `await` between chunks - schedule them all immediately
- Web Audio API handles precise timing internally
- Track array of active sources for proper interruption

### Issue 7: Tool Events Causing AttributeError

**Error:**
```
AttributeError: 'RealtimeToolStart' object has no attribute 'tool_name'
```

**Cause:** SDK event structure doesn't have `tool_name` or `tool_call_id` attributes

**WRONG:**
```python
if event_type == "tool_start":
    name = event.tool_name  # ❌ Doesn't exist
    call_id = event.tool_call_id  # ❌ Doesn't exist
```

**CORRECT:**
```python
if event_type == "tool_start":
    # Extract name from tool object
    tool_name = getattr(event.tool, 'name', str(event.tool))
    arguments = event.arguments  # JSON string
    output = event.output  # For tool_end events
```

### Issue 8: False Interruptions from Background Noise

**Symptoms:** Agent gets interrupted by coughs, keyboard clicks, background sounds

**Cause:** Single-frame speech detection is too sensitive

**WRONG:**
```javascript
const isSpeaking = rms > 0.01
if (isSpeaking && isAgentSpeaking) {
    interrupt()  // ❌ Triggers on single noise spike
}
```

**CORRECT:**
```javascript
// Require sustained speech
let consecutiveFrames = 0

if (isSpeaking) {
    consecutiveFrames++
} else {
    consecutiveFrames = 0
}

// Only interrupt after 3 consecutive frames (~500ms)
if (consecutiveFrames >= 3 && isAgentSpeaking) {
    interrupt()  // ✅ Filters out brief noise
}
```

---

## Audio Pipeline

### Complete Flow

```
User Speech
    ↓
Microphone Input
    ↓
getUserMedia() → MediaStream
    ↓
createMediaStreamSource() → MediaStreamSourceNode
    ↓
createScriptProcessor(4096, 1, 1) → ScriptProcessorNode
    ↓
onaudioprocess callback
    ↓
Float32Array [-1, 1]
    ↓
floatTo16BitPCM() → Int16Array [-32768, 32767]
    ↓
Base64 encode
    ↓
WebSocket send → Backend
    ↓
Base64 decode
    ↓
session.send_audio(bytes)
    ↓
OpenAI Realtime API
    ↓
Agent Response
    ↓
event.audio (RealtimeModelAudioEvent)
    ↓
Extract bytes from event.audio.delta
    ↓
Base64 encode
    ↓
WebSocket send → Frontend
    ↓
Base64 decode → Int16Array
    ↓
int16ToFloat32() → Float32Array
    ↓
createBuffer() → AudioBuffer
    ↓
createBufferSource() → AudioBufferSourceNode
    ↓
source.start()
    ↓
Speaker Output
```

### Audio Format Requirements

**OpenAI Realtime API:**
- Format: PCM16 (16-bit linear PCM)
- Sample Rate: 24000 Hz
- Channels: Mono (1 channel)
- Encoding: Base64 (for WebSocket transport)

**Web Audio API:**
- Input: Float32Array [-1.0, 1.0]
- Output: Float32Array [-1.0, 1.0]
- Sample Rate: 24000 Hz (configurable)

**Conversion:**
- Frontend Float32 → PCM16 → Base64 → Backend
- Backend Base64 → PCM16 → OpenAI
- OpenAI PCM16 → Base64 → Backend
- Backend Base64 → PCM16 → Float32 → Frontend

---

## Interruption Handling

### Why Interruptions Matter

In voice conversations, users expect to interrupt the agent naturally, just like human conversations. Without interruption handling:
- Users must wait for agent to finish speaking
- Feels robotic and frustrating
- Poor user experience

### Implementation Strategy

**1. Frontend Detection (Immediate)**
```javascript
// Detect user speech via RMS volume
const rms = calculateRMS(audioData)
if (rms > THRESHOLD && isAgentSpeaking) {
    // Interrupt detected!

    // 1. Stop local playback immediately
    stopAudioPlayback()

    // 2. Notify backend
    ws.send(JSON.stringify({ type: 'response.cancel' }))
}
```

**2. Backend Handling**
```python
if message_type == "response.cancel":
    await session.interrupt()  # Stops OpenAI generation
```

**3. Cleanup**
```javascript
// Handle interruption confirmation
if (event.type === "response.audio.interrupted") {
    stopAudioPlayback()  // Ensure stopped
}
```

### Tuning the Threshold

```javascript
const RMS_THRESHOLD = 0.01  // Adjust based on environment

// Too low (0.001): False positives from background noise
// Too high (0.1): Requires shouting to interrupt
// Optimal (0.01-0.03): Natural speech detection
```

---

## Tools Integration

### Tool Definition Pattern

```python
from agents import function_tool

@function_tool
def my_tool(param: str, count: int = 5) -> str:
    """Tool description visible to agent.

    Args:
        param: Parameter description
        count: Optional parameter with default

    Returns:
        Description of return value
    """
    # Implementation
    return f"Result: {param} x {count}"
```

### Key Points

1. **Use `@function_tool` decorator** - Don't manually define JSON schemas
2. **Docstring is the description** - Agent sees this
3. **Type hints define parameters** - SDK extracts automatically
4. **Return strings for voice** - Not JSON objects
5. **Handle errors gracefully** - Return error messages as strings

### Tools List

```python
# agent.py
from tools import tool1, tool2, tool3

TOOLS = [tool1, tool2, tool3]  # Simple list

# SDK automatically:
# - Generates JSON schemas
# - Handles tool calling
# - Manages conversation flow
```

### Tool Execution

The SDK handles tool execution automatically:
1. Agent decides to use tool
2. SDK sends `tool_start` event
3. Backend receives function call
4. Tool executes
5. Result returned to conversation
6. Agent continues with result

**No manual tool call handling needed!**

---

## Production Considerations

### Security

1. **API Keys**
   - Always server-side
   - Never expose in frontend
   - Use environment variables
   - Rotate regularly

2. **Tool Validation**
   - Sanitize inputs
   - Limit execution scope
   - Timeout long-running tools
   - Rate limit tool calls

3. **WebSocket Security**
   - Use WSS (not WS) in production
   - Implement authentication
   - Validate origin
   - Rate limit connections

### Performance

1. **Audio Buffering**
   - Use appropriate buffer sizes (4096 recommended)
   - Don't buffer too much (increases latency)
   - Don't buffer too little (causes stuttering)

2. **WebSocket**
   - Monitor message queue depth
   - Implement backpressure
   - Handle disconnections gracefully
   - Reconnect automatically

3. **Memory Management**
   - Clear audio queues on disconnect
   - Stop audio contexts properly
   - Release media streams
   - Prevent memory leaks

### Monitoring

```python
# Log key metrics
logger.info(f"Session started: {session_id}")
logger.info(f"Tool called: {tool_name} in {duration}ms")
logger.info(f"Audio processed: {bytes_sent} bytes")
logger.error(f"Error: {error_type} - {error_message}")
```

### Error Handling

```python
try:
    async with await runner.run(model_config=config) as session:
        async for event in session:
            # Process events
            pass
except websockets.ConnectionClosed:
    logger.info("Connection closed normally")
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    # Notify client
    # Cleanup resources
finally:
    # Always cleanup
    await cleanup_session()
```

---

## Key Learnings

### 1. OpenAI Agents SDK Patterns

- **Use `@function_tool`** - Not manual JSON schemas
- **API key in `model_config`** - Not runner constructor
- **Event structures are nested** - `event.audio.delta`, not `event.audio`
- **Tools execute automatically** - No manual call handling

### 2. Audio Processing

- **Buffer size must be power of 2** - Critical for Web Audio API (4096 recommended)
- **PCM16 is the format** - Convert Float32 ↔ PCM16 ↔ Base64
- **24kHz sample rate** - Standard for OpenAI Realtime API
- **Scheduled playback** - Use `source.start(time)` for gap-free audio
- **No await between chunks** - Schedule all immediately for smooth playback
- **Track active sources** - Array of sources for proper interruption
- **Monitor audio pipeline** - Debug at each conversion step

### 3. WebSocket Communication

- **Bidirectional events** - Frontend ↔ Backend ↔ OpenAI
- **Transform event formats** - SDK events ≠ Frontend events
- **Handle disconnections** - Cleanup properly
- **Check readyState** - Before sending messages

### 4. Interruption Handling

- **Sustained speech detection** - Require 3 consecutive frames (~500ms) to filter noise
- **Adjustable threshold** - RMS 0.015 balances sensitivity vs false positives
- **Stop immediately** - Local playback first (stop all active sources)
- **Notify backend** - `response.cancel` message
- **Backend interrupts** - `session.interrupt()`
- **Cleanup everywhere** - Clear queues, stop sources, reset scheduled time
- **Natural feel** - Brief noises don't interrupt, but real speech does

### 5. User Experience

- **Latency matters** - Optimize audio pipeline
- **Visual feedback** - Show connection status, listening state
- **Transcript display** - Let users see conversation
- **Error messages** - Clear, actionable feedback
- **Interruption feels natural** - Critical for voice UX

---

## Testing Checklist

### Audio Pipeline
- [ ] Microphone permission requested
- [ ] Audio capture starts successfully
- [ ] Audio data sent through WebSocket
- [ ] Audio received from backend
- [ ] Audio playback works
- [ ] Volume levels appropriate

### Interruption
- [ ] User can interrupt agent
- [ ] Playback stops immediately
- [ ] Agent stops generating
- [ ] Conversation continues smoothly
- [ ] No audio artifacts

### Tools
- [ ] Tools called correctly
- [ ] Parameters extracted properly
- [ ] Results returned to agent
- [ ] Agent uses results in response
- [ ] Error handling works

### Connection
- [ ] WebSocket connects successfully
- [ ] Reconnects on disconnect
- [ ] Handles network errors
- [ ] Cleans up on close
- [ ] Multiple sessions work

### UI/UX
- [ ] Status indicators accurate
- [ ] Transcript updates in real-time
- [ ] Mute button works
- [ ] Connect/disconnect works
- [ ] Visual feedback clear

---

## Quick Start Template

### Backend Minimal Setup

```python
# main.py
from fastapi import FastAPI, WebSocket
from agents.realtime import RealtimeAgent, RealtimeRunner

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    agent = RealtimeAgent(
        name="Assistant",
        instructions="You are helpful.",
        tools=[]
    )

    runner = RealtimeRunner(starting_agent=agent)

    model_config = {
        "api_key": "your-key",
        "model": "gpt-4o-realtime-preview-2024-12-17",
        "voice": "alloy",
        "modalities": ["text", "audio"],
        "input_audio_format": "pcm16",
        "output_audio_format": "pcm16"
    }

    async with await runner.run(model_config=model_config) as session:
        # Implement bidirectional relay here
        pass
```

### Frontend Minimal Setup

```javascript
// useRealtimeAgent.js
const SAMPLE_RATE = 24000
const BUFFER_SIZE = 4096  // Power of 2!

const ws = new WebSocket('ws://localhost:8000/ws')

const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, sampleRate: SAMPLE_RATE }
})

const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
const source = audioContext.createMediaStreamSource(stream)
const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1)

processor.onaudioprocess = (e) => {
    const float32 = e.inputBuffer.getChannelData(0)
    const pcm16 = floatTo16BitPCM(float32)
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)))

    ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64
    }))
}

source.connect(processor)
processor.connect(audioContext.destination)
```

---

## Conclusion

Building a real-time voice agent requires careful attention to:

1. **Correct SDK usage** - Follow OpenAI Agents SDK patterns
2. **Audio pipeline** - Handle formats and conversions correctly
3. **WebSocket relay** - Transform events between SDK and frontend
4. **Interruption handling** - Enable natural conversations
5. **Error handling** - Graceful degradation and recovery

The key is understanding the complete flow from microphone to speaker, and handling each transformation step correctly. With the patterns in this document, you can build production-ready voice agents that feel natural and responsive.

---

## Resources

- [OpenAI Agents SDK Documentation](https://openai.github.io/openai-agents-python/)
- [OpenAI Realtime API Guide](https://platform.openai.com/docs/guides/realtime)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)
- [React Hooks](https://react.dev/reference/react)

---

## License

This document is part of the Real-time Voice Agent PoC project.

**Disclaimer:** This is educational information for building voice agents. Always ensure proper security, privacy, and compliance when building production applications.
