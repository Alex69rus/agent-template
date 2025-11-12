import React from 'react'
import { useRealtimeAgent } from '../hooks/useRealtimeAgent'
import Transcript from './Transcript'
import './VoiceAgent.css'

const VoiceAgent = () => {
  const {
    status,
    isMuted,
    transcript,
    connect,
    disconnect,
    toggleMute
  } = useRealtimeAgent()

  const getStatusInfo = () => {
    switch (status) {
      case 'disconnected':
        return { text: 'Disconnected', color: '#999', icon: '⭕' }
      case 'connecting':
        return { text: 'Connecting...', color: '#ffa500', icon: '🔄' }
      case 'connected':
        return { text: 'Connected', color: '#4caf50', icon: '✅' }
      case 'error':
        return { text: 'Error', color: '#f44336', icon: '❌' }
      default:
        return { text: 'Unknown', color: '#999', icon: '❓' }
    }
  }

  const statusInfo = getStatusInfo()
  const isConnected = status === 'connected'

  return (
    <div className="voice-agent-container">
      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-indicator" style={{ color: statusInfo.color }}>
          <span className="status-icon">{statusInfo.icon}</span>
          <span className="status-text">{statusInfo.text}</span>
        </div>
        {status === 'error' && (
          <div className="error-message">
            Connection failed. Please check the backend server.
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="control-panel">
        <div className="control-buttons">
          {!isConnected ? (
            <button
              className="btn btn-connect"
              onClick={connect}
              disabled={status === 'connecting'}
            >
              {status === 'connecting' ? '🔄 Connecting...' : '🎤 Connect'}
            </button>
          ) : (
            <>
              <button
                className="btn btn-disconnect"
                onClick={disconnect}
              >
                🔌 Disconnect
              </button>
              <button
                className={`btn btn-mute ${isMuted ? 'muted' : ''}`}
                onClick={toggleMute}
              >
                {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
              </button>
            </>
          )}
        </div>

        {isConnected && (
          <div className="audio-visualizer">
            <div className={`pulse ${isMuted ? 'muted' : ''}`}>
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
            </div>
            <p className="visualizer-text">
              {isMuted ? 'Microphone muted' : 'Listening...'}
            </p>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="transcript-section">
        <h2 className="section-title">💬 Conversation</h2>
        <Transcript transcript={transcript} />
      </div>

      {/* Info Panel */}
      <div className="info-panel">
        <h3>ℹ️ About this Agent</h3>
        <p>
          This AI-powered finance advisor can discuss:
        </p>
        <ul>
          <li>💰 Retirement planning (401k, IRA, pensions)</li>
          <li>📊 Risk assessment and portfolio diversification</li>
          <li>📈 Market trends and economic indicators</li>
        </ul>
        <p className="disclaimer">
          <strong>Note:</strong> This is educational information, not personalized financial advice.
        </p>
      </div>
    </div>
  )
}

export default VoiceAgent
