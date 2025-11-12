import React, { useEffect, useRef } from 'react'
import './Transcript.css'

const Transcript = ({ transcript }) => {
  const transcriptEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  if (transcript.length === 0) {
    return (
      <div className="transcript-container">
        <div className="transcript-empty">
          <p>📝 Transcript will appear here...</p>
          <p className="transcript-hint">
            Start talking to see the conversation
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="transcript-container">
      <div className="transcript-messages">
        {transcript.map((message, index) => (
          <div
            key={index}
            className={`transcript-message ${message.role}`}
          >
            <div className="message-role">
              {message.role === 'user' ? '👤 You' : '🤖 Agent'}
            </div>
            <div className="message-text">
              {message.text}
              {!message.completed && <span className="typing-indicator">...</span>}
            </div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  )
}

export default Transcript
