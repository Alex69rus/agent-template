import { useState, useRef, useCallback, useEffect } from 'react'

const WS_URL = 'ws://localhost:8000/ws'

// Audio configuration
const SAMPLE_RATE = 24000
const BUFFER_SIZE = 4096 // Must be power of 2 (256-16384), ~170ms at 24kHz

export const useRealtimeAgent = () => {
  const [status, setStatus] = useState('disconnected') // disconnected, connecting, connected, error
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState([])

  const wsRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioStreamRef = useRef(null)
  const audioWorkletNodeRef = useRef(null)
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const isAgentSpeakingRef = useRef(false)
  const currentAudioSourceRef = useRef(null)

  // Initialize audio context
  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      })
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    return audioContextRef.current
  }, [])

  // Convert Float32Array to Int16Array (PCM16)
  const floatTo16BitPCM = (float32Array) => {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return int16Array
  }

  // Convert Int16Array to Float32Array
  const int16ToFloat32 = (int16Array) => {
    const float32Array = new Float32Array(int16Array.length)
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF)
    }
    return float32Array
  }

  // Convert base64 to Int16Array
  const base64ToInt16Array = (base64) => {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return new Int16Array(bytes.buffer)
  }

  // Stop current audio playback
  const stopAudioPlayback = useCallback(() => {
    // Stop current playing audio source
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop()
        currentAudioSourceRef.current.disconnect()
      } catch (e) {
        // Ignore errors if already stopped
      }
      currentAudioSourceRef.current = null
    }

    // Clear the audio queue
    audioQueueRef.current = []
    isPlayingRef.current = false
    isAgentSpeakingRef.current = false
  }, [])

  // Play audio from queue
  const playAudioFromQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return
    }

    isPlayingRef.current = true
    isAgentSpeakingRef.current = true
    const audioContext = audioContextRef.current

    while (audioQueueRef.current.length > 0) {
      const int16Array = audioQueueRef.current.shift()
      const float32Array = int16ToFloat32(int16Array)

      const audioBuffer = audioContext.createBuffer(1, float32Array.length, SAMPLE_RATE)
      audioBuffer.getChannelData(0).set(float32Array)

      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      currentAudioSourceRef.current = source

      await new Promise((resolve) => {
        source.onended = resolve
        source.start()
      })

      currentAudioSourceRef.current = null
    }

    isPlayingRef.current = false
    isAgentSpeakingRef.current = false
  }, [])

  // Handle audio input from microphone
  const startAudioInput = useCallback(async () => {
    const audioContext = await initAudioContext()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      audioStreamRef.current = stream
      const source = audioContext.createMediaStreamSource(stream)
      console.log('Audio stream created, tracks:', stream.getTracks())

      // Use ScriptProcessorNode for audio processing (AudioWorklet is better but more complex)
      const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1)
      console.log('ScriptProcessorNode created with buffer size:', BUFFER_SIZE)

      let audioPacketCount = 0
      let userSpeakingDetected = false

      processor.onaudioprocess = (e) => {
        audioPacketCount++
        // Log every 100 packets (roughly every 2 seconds at 24kHz with 4800 buffer)
        if (audioPacketCount % 100 === 0) {
          console.log(`Audio processing: ${audioPacketCount} packets, wsReady: ${wsRef.current?.readyState === WebSocket.OPEN}, muted: ${isMuted}`)
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          if (!isMuted) {
            const inputData = e.inputBuffer.getChannelData(0)

            // Detect if user is speaking using simple volume threshold
            let sum = 0
            for (let i = 0; i < inputData.length; i++) {
              sum += inputData[i] * inputData[i]
            }
            const rms = Math.sqrt(sum / inputData.length)
            const isSpeaking = rms > 0.01 // Threshold for detecting speech

            // If user starts speaking while agent is speaking, send interruption
            if (isSpeaking && !userSpeakingDetected && isAgentSpeakingRef.current) {
              console.log('User started speaking - interrupting agent')
              userSpeakingDetected = true

              // Send cancel message to server
              wsRef.current.send(JSON.stringify({
                type: 'response.cancel'
              }))

              // Stop local audio playback immediately
              stopAudioPlayback()
            } else if (!isSpeaking && userSpeakingDetected) {
              // Reset detection flag when user stops speaking
              userSpeakingDetected = false
            }

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

            if (audioPacketCount % 100 === 0) {
              console.log('Sent audio packet to server')
            }
          }
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)
      audioWorkletNodeRef.current = processor

    } catch (error) {
      console.error('Error accessing microphone:', error)
      setStatus('error')
      throw error
    }
  }, [isMuted, initAudioContext, stopAudioPlayback])

  // Stop audio input
  const stopAudioInput = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
      audioStreamRef.current = null
    }

    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect()
      audioWorkletNodeRef.current = null
    }
  }, [])

  // Handle WebSocket messages
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'session.created':
          console.log('Session created:', data)
          break

        case 'session.updated':
          console.log('Session updated:', data)
          break

        case 'response.audio.delta':
          // Queue audio for playback
          if (data.delta) {
            const int16Array = base64ToInt16Array(data.delta)
            audioQueueRef.current.push(int16Array)
            playAudioFromQueue()
          }
          break

        case 'response.audio.interrupted':
          // Agent was interrupted - stop playback immediately
          console.log('Agent audio interrupted')
          stopAudioPlayback()
          break

        case 'response.audio_transcript.delta':
          // Update transcript with agent's speech
          if (data.delta) {
            setTranscript(prev => {
              const last = prev[prev.length - 1]
              if (last && last.role === 'agent' && !last.completed) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + data.delta }
                ]
              } else {
                return [...prev, { role: 'agent', text: data.delta, completed: false }]
              }
            })
          }
          break

        case 'response.audio_transcript.done':
          // Mark transcript as completed
          setTranscript(prev => {
            const last = prev[prev.length - 1]
            if (last && last.role === 'agent' && !last.completed) {
              return [...prev.slice(0, -1), { ...last, completed: true }]
            }
            return prev
          })
          break

        case 'conversation.item.input_audio_transcription.completed':
          // Add user transcript
          if (data.transcript) {
            setTranscript(prev => [...prev, {
              role: 'user',
              text: data.transcript,
              completed: true
            }])
          }
          break

        case 'response.function_call_arguments.done':
          console.log('Function call:', data.name, data.arguments)
          break

        case 'error':
          console.error('Error from server:', data)
          setStatus('error')
          break

        default:
          // Log other events for debugging
          if (data.type !== 'response.audio.done' && data.type !== 'input_audio_buffer.speech_started') {
            console.log('Event:', data.type)
          }
      }
    } catch (error) {
      console.error('Error handling message:', error)
    }
  }, [playAudioFromQueue, stopAudioPlayback])

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      setStatus('connecting')
      setTranscript([])

      // Initialize audio (optional - continue even if it fails)
      try {
        await initAudioContext()
        await startAudioInput()
        console.log('Audio input initialized successfully')
      } catch (audioError) {
        console.warn('Audio input failed, continuing without microphone:', audioError)
        // Continue anyway - we can still test the connection
      }

      // Connect WebSocket
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Connected to server')
        setStatus('connected')
      }

      ws.onmessage = handleMessage

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setStatus('error')
      }

      ws.onclose = () => {
        console.log('Disconnected from server')
        setStatus('disconnected')
        stopAudioInput()
      }

    } catch (error) {
      console.error('Connection error:', error)
      setStatus('error')
      stopAudioInput()
    }
  }, [initAudioContext, startAudioInput, stopAudioInput, handleMessage])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    stopAudioPlayback()
    stopAudioInput()
    setStatus('disconnected')
  }, [stopAudioInput, stopAudioPlayback])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [disconnect])

  return {
    status,
    isMuted,
    transcript,
    connect,
    disconnect,
    toggleMute
  }
}
