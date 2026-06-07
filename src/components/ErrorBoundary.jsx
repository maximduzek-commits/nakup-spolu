import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '32px 24px', textAlign: 'center',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A18', marginBottom: 8 }}>
            Něco se pokazilo
          </div>
          <div style={{ fontSize: 13, color: '#96A0A0', marginBottom: 24 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '10px 24px', background: '#1C4A2E', color: 'white',
              border: 'none', borderRadius: 12, fontFamily: 'inherit',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Zkusit znovu
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
