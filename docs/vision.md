# Real-time Voice Agent: Architecture & Design Decisions

This document captures the architectural decisions, technology choices, and key learnings from building a production-ready real-time voice agent using the OpenAI Agents SDK.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack & Rationale](#technology-stack--rationale)
3. [Critical Design Decisions](#critical-design-decisions)
4. [Key Technical Challenges & Solutions](#key-technical-challenges--solutions)
5. [Production Considerations](#production-considerations)

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
│  - gpt-realtime-mini   │
│  - Voice synthesis & recognition        │
│  - Tool calling                         │
└─────────────────────────────────────────┘
```

### Architecture Rationale

**Why WebSocket Relay?**
- Keeps API keys secure on server-side
- Enables event transformation between OpenAI SDK and frontend formats
- Provides centralized point for logging, monitoring, and rate limiting

**Why Server-Side Agent?**
- Tool execution security (no client-side code execution)
- API key protection
- Centralized state management and session handling

**Why Bidirectional Streaming?**
- Required for real-time voice interaction
- Low-latency audio transmission in both directions
- Enables natural interruption handling

---

## Technology Stack & Rationale

### Backend Stack

| Technology | Version | Why Chosen |
|-----------|---------|------------|
| **FastAPI** | 0.115.6 | Native async/await support, built-in WebSocket handling, excellent performance |
| **OpenAI Agents SDK** | 0.5.0 | Official SDK for Realtime API, handles tool calling automatically, manages conversation state |
| **Python 3.13** | Latest | Improved async performance, better error messages |
| **uvicorn** | 0.34.0 | ASGI server with WebSocket support |

**Key Decision**: FastAPI over Flask/Django
- **Rationale**: Native async support is critical for WebSocket relay performance. FastAPI's async-first design eliminates thread overhead and simplifies bidirectional streaming implementation.

### Frontend Stack

| Technology | Why Chosen |
|-----------|------------|
| **React 18** | Component architecture, hooks for audio state management |
| **Web Audio API** | Native browser audio processing, low latency, precise timing control |
| **Native WebSocket API** | Direct browser support, no library overhead |
| **Vite** | Fast dev server with HMR, optimized production builds |

**Key Decision**: Web Audio API over Media Recorder API
- **Rationale**: Web Audio API provides:
  - Precise timing control for scheduled audio playback (eliminates stuttering)
  - Real-time audio processing for interruption detection
  - Fine-grained control over audio format conversion
  - Lower latency than Media Recorder

**Key Decision**: No audio libraries (howler.js, tone.js)
- **Rationale**: Direct Web Audio API usage gives full control over audio pipeline, critical for smooth playback and interruption handling

---

## Critical Design Decisions

### 1. Audio Playback: Scheduled vs Sequential

**Decision**: Use Web Audio API's scheduled playback with `source.start(scheduledTime)`

**Problem**: Sequential playback with `await` caused micro-interruptions between audio chunks, creating stuttering effect

**Rationale**:
- Web Audio API provides precise timing control at audio engine level
- Scheduling eliminates JavaScript event loop delays between chunks
- Allows tracking multiple active sources for proper interruption handling
- Results in gap-free, smooth audio playback

**Key Implementation**: Track scheduled time and increment by buffer duration, schedule all chunks immediately without waiting

---

### 2. Interruption Detection: Sustained Speech Recognition

**Decision**: Require 3 consecutive frames (~500ms) of sustained speech before triggering interruption

**Problem**: Single-frame RMS threshold detection triggered false interruptions from coughs, keyboard clicks, and background noise

**Rationale**:
- Human speech is sustained over multiple frames
- Brief environmental noises are typically single spikes
- 500ms delay is imperceptible to users but filters most false positives
- Balances natural conversation flow with noise resistance

**Parameters**:
- RMS Threshold: 0.015 (adjustable based on environment)
- Consecutive Frames: 3 frames at 4096 buffer size ≈ 500ms
- Reset counter when user stops speaking to allow re-interruption

---

### 3. OpenAI SDK Integration: API Key Location

**Decision**: Pass API key in `model_config` parameter, not `RealtimeRunner` constructor

**Problem**: SDK architecture doesn't accept API key in constructor

**Rationale**:
- SDK design separates runner initialization from session configuration
- `model_config` passed to `runner.run()` method is the correct pattern
- Allows dynamic configuration per session while reusing runner instance

---

### 4. Event Handling: SDK Event Structure

**Decision**: Extract audio data from nested `event.audio.data` structure, handle `raw_model_event` wrapper for transcripts

**Problems**:
- Audio events contain `RealtimeModelAudioEvent` objects, not raw bytes
- Transcript events wrapped in `raw_model_event` envelope

**Rationale**:
- SDK provides structured events with metadata (timestamps, IDs)
- Nested structure allows future extensibility without breaking changes
- `raw_model_event` wrapper distinguishes SDK-generated vs API-passthrough events

**Key Implementation**:
- Audio: `event.audio.data` contains the PCM16 bytes
- Transcripts: `event.data` contains `transcript_delta` or `input_audio_transcription_completed`
- Must emit both streaming deltas AND completion signals for agent transcripts

---

### 5. Tool Integration: Decorator Pattern

**Decision**: Use `@function_tool` decorator instead of manual JSON schema definition

**Rationale**:
- SDK automatically extracts function signature to generate JSON schema
- Docstrings become tool descriptions visible to agent
- Type hints define parameter types and requirements
- Reduces boilerplate and prevents schema/implementation drift
- Tool execution handled automatically by SDK

**Key Pattern**: Return strings (not JSON) for voice responses - agent speaks the return value

---

### 6. Audio Format: PCM16 at 24kHz

**Decision**: Use 16-bit PCM at 24kHz sample rate, mono channel

**Rationale**:
- OpenAI Realtime API requirement
- 24kHz sufficient for voice (22.05kHz Nyquist covers human speech)
- Mono adequate for voice interaction (stereo unnecessary)
- PCM16 balances quality with bandwidth (vs PCM24/32)
- Lower than music quality (44.1/48kHz) but optimized for latency

**Format Chain**: Float32 (Web Audio) ↔ PCM16 ↔ Base64 (WebSocket)

---

### 7. Buffer Size: Power of 2 Constraint

**Decision**: Use 4096 samples per buffer (not 4800 or arbitrary sizes)

**Rationale**:
- Web Audio API requirement: buffer size must be power of 2 between 256-16384
- 4096 chosen as balance:
  - Smaller (256-2048): Lower latency but higher CPU overhead
  - Larger (8192-16384): Lower CPU but higher latency
- At 24kHz: 4096 samples = 170ms latency (acceptable for voice)

---

## Key Technical Challenges & Solutions

### 1. Audio Stuttering Between Chunks

**Challenge**: Audio playback had micro-interruptions between chunks, creating noticeable stuttering

**Root Cause**: Sequential playback with `await` introduced JavaScript event loop delays between audio chunks

**Solution**: Implemented Web Audio API scheduled playback
- Track scheduled time and increment by buffer duration
- Use `source.start(scheduledTime)` to schedule all chunks immediately
- No `await` between chunks - Web Audio API handles precise timing
- Track array of active sources for proper interruption handling

**Impact**: Eliminated all audio stuttering, achieving smooth continuous playback

---

### 2. False Interruptions from Background Noise

**Challenge**: Agent speech interrupted by coughs, keyboard clicks, and environmental sounds

**Root Cause**: Single-frame RMS threshold detection too sensitive to brief noise spikes

**Solution**: Implemented sustained speech detection
- Require 3 consecutive frames (~500ms) above threshold
- Reset counter when RMS drops below threshold
- Configurable threshold (0.015) and frame count

**Impact**: Natural user interruptions work perfectly while filtering false positives from environmental noise

---

### 3. Transcripts Not Displaying

**Challenge**: Real-time transcription not appearing on frontend despite backend receiving events

**Root Cause**: Backend listening for incorrect event types that don't exist in SDK

**Solution**: Correctly handle SDK event structure
- Listen for `raw_model_event` wrapper events
- Extract `event.data` to access `transcript_delta` and `input_audio_transcription_completed`
- Emit both streaming deltas AND completion signal (`response.audio_transcript.done`)

**Impact**: Real-time transcription works for both user and agent speech with proper completion

---

### 4. Tool Execution Crashes

**Challenge**: `AttributeError: 'RealtimeToolStart' object has no attribute 'tool_name'`

**Root Cause**: Incorrect assumptions about SDK event structure attributes

**Solution**: Extract tool name from nested object
- Use `getattr(event.tool, 'name', str(event.tool))` to safely extract tool name
- Access `event.arguments` for parameters (JSON string)
- Access `event.output` for tool results

**Impact**: Stable tool execution without crashes

---

### 5. API Key Configuration

**Challenge**: `RealtimeRunner.__init__() got an unexpected keyword argument 'api_key'`

**Root Cause**: SDK architecture separates runner initialization from session configuration

**Solution**: Pass API key in `model_config` parameter to `runner.run()` method, not constructor

**Impact**: Proper SDK initialization, allows session-specific configuration

---

### 6. Audio Event Structure Confusion

**Challenge**: `cannot convert 'RealtimeModelAudioEvent' object to bytes`

**Root Cause**: Audio events contain nested objects, not raw bytes

**Solution**: Extract audio bytes from `event.audio.data` instead of `event.audio`

**Impact**: Correct audio streaming from backend to frontend

---

### 7. Incomplete Interruption Cleanup

**Challenge**: Audio continued playing locally after sending interruption signal to backend

**Root Cause**: Single audio source reference, not tracking all active scheduled audio sources

**Solution**: Maintain array of active sources and stop all on interruption
- Track all scheduled sources in array
- On interruption: stop and disconnect all sources
- Clear audio queue and reset playback state

**Impact**: Immediate, complete audio stop when user interrupts

---

## Audio Pipeline

### Data Flow

**User Input Path**:
```
Microphone → getUserMedia (MediaStream) → ScriptProcessor (4096 samples) →
Float32 → PCM16 conversion → Base64 encoding → WebSocket →
Backend decode → session.send_audio() → OpenAI Realtime API
```

**Agent Response Path**:
```
OpenAI Realtime API → event.audio.data (PCM16) → Base64 encoding →
WebSocket → Frontend decode → PCM16 → Float32 conversion →
AudioBuffer → Scheduled playback → Speakers
```

### Format Specifications

| Stage | Format | Range | Notes |
|-------|--------|-------|-------|
| **Web Audio Input** | Float32Array | [-1.0, 1.0] | Native browser format |
| **Transport** | PCM16 (Base64) | [-32768, 32767] | OpenAI API requirement |
| **Web Audio Output** | Float32Array | [-1.0, 1.0] | For AudioBuffer playback |

### Key Pipeline Decisions

**Sample Rate: 24kHz**
- Balances voice quality with latency
- Nyquist frequency (12kHz) covers human speech range
- Lower than music quality but optimized for real-time

**Buffer Size: 4096 samples**
- ~170ms latency at 24kHz
- Power of 2 (Web Audio requirement)
- Balance between latency and CPU overhead

**Mono Channel**
- Sufficient for voice interaction
- Reduces bandwidth by 50% vs stereo
- Simplifies format conversion

---

## Production Considerations

### Security Requirements

| Area | Requirement | Rationale |
|------|-------------|-----------|
| **API Keys** | Server-side only, environment variables | Prevent client exposure, enable key rotation |
| **WebSocket** | WSS (TLS) in production | Encrypt audio data in transit |
| **Authentication** | Session validation, origin check | Prevent unauthorized access |
| **Tool Execution** | Input sanitization, timeout limits | Prevent injection attacks, resource exhaustion |
| **Rate Limiting** | Per-session and per-IP limits | Prevent abuse, control costs |

### Performance Targets

| Metric | Target | Why |
|--------|--------|-----|
| **Audio Latency** | < 200ms end-to-end | Maintain conversational feel |
| **Buffer Processing** | 170ms (4096 samples @ 24kHz) | Balance latency vs CPU |
| **WebSocket Throughput** | ~40 KB/s bidirectional | Support real-time audio streaming |
| **Memory per Session** | < 50MB | Support concurrent users |

### Monitoring & Observability

**Critical Metrics to Track**:
- Session connection/disconnection events
- Audio pipeline latency (input → output)
- Tool execution time and failures
- WebSocket message queue depth
- Interruption frequency and success rate

**Error Patterns to Alert On**:
- High disconnection rate
- Audio buffer underruns/overruns
- Tool execution timeouts
- Transcript processing failures

### Deployment Architecture

**Recommended Setup**:
- **Backend**: Containerized FastAPI (Docker/K8s)
- **Frontend**: Static hosting (Vercel, Netlify, Cloudflare Pages)
- **WebSocket**: Load balancer with sticky sessions
- **Logging**: Structured JSON logs for session tracking
- **Secrets**: Vault/KMS for API key management

---

## Summary: Key Architectural Decisions

### What Worked Well

1. **Web Audio API scheduled playback** - Eliminated stuttering completely
2. **Sustained speech detection** - Filtered noise while enabling natural interruptions
3. **FastAPI async architecture** - Clean WebSocket relay implementation
4. **@function_tool decorator** - Simplified tool integration
5. **Direct Web Audio API usage** - Full control without library overhead

### What Required Careful Tuning

1. **RMS threshold** - Environment-dependent, needs configuration
2. **Buffer size** - Balance between latency and stability
3. **Consecutive frame count** - Trade-off between responsiveness and false positives

### Critical Implementation Details

1. **API key must be in `model_config`**, not runner constructor
2. **Audio data is in `event.audio.data`**, not `event.audio`
3. **Transcripts wrapped in `raw_model_event`**, need extraction
4. **Agent transcripts need completion signal**, not just deltas
5. **Buffer size must be power of 2**, critical for Web Audio API

### Future Considerations

- **ScriptProcessor deprecation**: Migrate to AudioWorklet for better performance
- **VAD improvements**: Consider ML-based voice activity detection
- **Multi-modal**: Extend to support vision/screen sharing
- **Multi-agent**: Support agent handoffs and collaboration

---

## References

- **OpenAI Agents SDK**: [https://openai.github.io/openai-agents-python/](https://openai.github.io/openai-agents-python/)
- **OpenAI Realtime API**: [https://platform.openai.com/docs/guides/realtime](https://platform.openai.com/docs/guides/realtime)
- **Web Audio API**: [https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- **FastAPI Documentation**: [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)

---

**Document Purpose**: This document captures architectural decisions and technical rationale. For implementation guides and code examples, see project README and inline code documentation.
