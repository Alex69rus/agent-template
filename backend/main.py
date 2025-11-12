"""FastAPI WebSocket relay server using OpenAI Realtime Agents SDK."""
import asyncio
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from agents.realtime import RealtimeAgent, RealtimeRunner

from config import Config
from agent import AGENT_INSTRUCTIONS, TOOLS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Realtime Voice Agent API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[Config.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model": Config.MODEL,
        "voice": Config.VOICE
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for client connections using RealtimeAgent SDK."""
    await websocket.accept()
    logger.info("Client connected")

    try:
        # Create the finance agent
        agent = RealtimeAgent(
            name="FinanceAdvisor",
            instructions=AGENT_INSTRUCTIONS,
            tools=TOOLS
        )

        # Configure the runner
        runner = RealtimeRunner(
            starting_agent=agent
        )

        # Model configuration for the session
        model_config = {
            "api_key": Config.OPENAI_API_KEY,
            "model": Config.MODEL,
            "voice": Config.VOICE,
            "modalities": ["text", "audio"],
            "input_audio_format": "pcm16",
            "output_audio_format": "pcm16",
            "input_audio_transcription": {
                "model": "whisper-1"
            },
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "prefix_padding_ms": 300,
                "silence_duration_ms": 500
            },
            "temperature": 0.8
        }

        logger.info(f"Starting RealtimeSession with model: {Config.MODEL}, voice: {Config.VOICE}")

        # Start the realtime session
        async with await runner.run(model_config=model_config) as session:
            logger.info("RealtimeSession started successfully")

            # Create tasks for bidirectional communication
            async def receive_from_client():
                """Receive messages from the client and forward to the session."""
                try:
                    while True:
                        data = await websocket.receive_text()
                        message = json.loads(data)
                        msg_type = message.get("type", "")

                        logger.debug(f"Client -> Session: {msg_type}")

                        # Handle different message types from client
                        if msg_type == "input_audio_buffer.append":
                            # Decode base64 audio and send to session
                            import base64
                            audio_base64 = message.get("audio", "")
                            audio_bytes = base64.b64decode(audio_base64)
                            await session.send_audio(audio_bytes)

                        elif msg_type == "input_audio_buffer.commit":
                            # Commit the audio buffer (if needed)
                            pass

                        elif msg_type == "response.cancel":
                            # Cancel current response (user interrupted)
                            logger.info("User interrupted - canceling current response")
                            await session.interrupt()

                        # Forward other control messages as needed
                        # The SDK handles most of the protocol internally

                except WebSocketDisconnect:
                    logger.info("Client disconnected")
                except Exception as e:
                    logger.error(f"Error receiving from client: {e}")

            async def send_to_client():
                """Receive events from the session and send to the client."""
                try:
                    async for event in session:
                        event_type = event.type if hasattr(event, 'type') else str(type(event).__name__)
                        logger.debug(f"Session -> Client: {event_type}")

                        # Convert event to a format the client expects
                        event_data = {}

                        # Handle different event types
                        if event_type == "audio":
                            # Audio chunk from agent - RealtimeAudio event
                            # event.audio contains a RealtimeModelAudioEvent with the actual audio bytes
                            import base64
                            try:
                                # Introspect the audio object once to understand structure
                                audio_obj = event.audio

                                # Log structure for debugging (only first time)
                                if not hasattr(send_to_client, '_audio_structure_logged'):
                                    logger.info(f"Audio structure: type={type(audio_obj)}, has_delta={hasattr(audio_obj, 'delta')}, has_audio={hasattr(audio_obj, 'audio')}, has_data={hasattr(audio_obj, 'data')}")
                                    if hasattr(audio_obj, '__dict__'):
                                        logger.info(f"Audio object dict keys: {audio_obj.__dict__.keys()}")
                                    send_to_client._audio_structure_logged = True

                                # Try to extract bytes from the audio object
                                audio_bytes = None
                                if hasattr(audio_obj, 'delta') and isinstance(audio_obj.delta, (bytes, bytearray)):
                                    audio_bytes = audio_obj.delta
                                elif hasattr(audio_obj, 'audio') and isinstance(audio_obj.audio, (bytes, bytearray)):
                                    audio_bytes = audio_obj.audio
                                elif hasattr(audio_obj, 'data') and isinstance(audio_obj.data, (bytes, bytearray)):
                                    audio_bytes = audio_obj.data
                                elif isinstance(audio_obj, (bytes, bytearray)):
                                    audio_bytes = audio_obj

                                if audio_bytes:
                                    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                                    event_data = {
                                        "type": "response.audio.delta",
                                        "delta": audio_base64
                                    }
                                else:
                                    logger.warning(f"Could not extract audio bytes from event")
                                    event_data = None

                            except Exception as e:
                                logger.error(f"Error processing audio event: {e}")
                                import traceback
                                logger.error(traceback.format_exc())
                                event_data = None

                        elif event_type == "audio_end":
                            # Send both audio done and transcript done
                            await websocket.send_text(json.dumps({
                                "type": "response.audio.done"
                            }))
                            event_data = {
                                "type": "response.audio_transcript.done"
                            }

                        elif event_type == "audio_interrupted":
                            event_data = {
                                "type": "response.audio.interrupted"
                            }

                        elif event_type == "raw_model_event":
                            # Handle raw model events for transcripts
                            model_event = event.data
                            model_event_type = model_event.type if hasattr(model_event, 'type') else None

                            if model_event_type == "transcript_delta":
                                # Agent speech transcript delta
                                event_data = {
                                    "type": "response.audio_transcript.delta",
                                    "delta": model_event.delta
                                }
                            elif model_event_type == "input_audio_transcription_completed":
                                # User speech transcription completed
                                event_data = {
                                    "type": "conversation.item.input_audio_transcription.completed",
                                    "transcript": model_event.transcript
                                }
                            else:
                                # Skip other raw model events
                                event_data = None

                        elif event_type == "tool_start":
                            # Get tool name from the tool object
                            tool_name = getattr(event.tool, 'name', str(event.tool))
                            event_data = {
                                "type": "response.function_call_arguments.done",
                                "name": tool_name,
                                "arguments": event.arguments
                            }
                            logger.info(f"Tool started: {tool_name}, args: {event.arguments}")

                        elif event_type == "tool_end":
                            tool_name = getattr(event.tool, 'name', str(event.tool))
                            logger.info(f"Tool ended: {tool_name}, result: {event.output}")

                        elif event_type == "error":
                            event_data = {
                                "type": "error",
                                "error": str(event.error)
                            }
                            logger.error(f"Session error: {event.error}")

                        else:
                            # Pass through other events
                            event_data = {
                                "type": event_type,
                                "data": str(event)
                            }

                        # Send event to client
                        if event_data:
                            await websocket.send_text(json.dumps(event_data))

                except Exception as e:
                    logger.error(f"Error sending to client: {e}")

            # Run both tasks concurrently
            await asyncio.gather(
                receive_from_client(),
                send_to_client(),
                return_exceptions=True
            )

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "error": str(e)
            }))
        except:
            pass
    finally:
        logger.info("Connection closed")


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting server on {Config.HOST}:{Config.PORT}")
    logger.info(f"Model: {Config.MODEL}, Voice: {Config.VOICE}")

    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True,
        log_level="info"
    )
