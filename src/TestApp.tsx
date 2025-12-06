import React from 'react';

/**
 * Minimal test component to verify React is working
 * This bypasses all complex dependencies and should render if React is functioning
 */
const TestApp: React.FC = () => {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '30px',
        borderRadius: '15px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h1 style={{ margin: '0 0 20px 0', fontSize: '2.5em' }}>
          🎉 NFTGen React Test
        </h1>
        
        <div style={{
          background: 'rgba(76, 175, 80, 0.2)',
          border: '1px solid #4CAF50',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>
            ✅ React is Working!
          </h2>
          <p style={{ margin: 0 }}>
            This component is rendering successfully, which means React and the basic setup are functional.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #2196F3'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2196F3' }}>
              🖥️ Environment
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Development Mode: {import.meta.env.DEV ? 'Yes' : 'No'}<br/>
              Vite HMR: {import.meta.hot ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #ff9800'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ff9800' }}>
              🌐 Browser
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              User Agent: {navigator.userAgent.split(' ')[0]}<br/>
              Ethereum: {(window as any).ethereum ? 'Detected' : 'Not Found'}
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0' }}>🔧 Next Steps</h3>
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>
              React is working - this confirms the basic setup is correct
            </li>
            <li style={{ marginBottom: '8px' }}>
              The main App component likely has dependency issues
            </li>
            <li style={{ marginBottom: '8px' }}>
              Check for TypeScript errors or missing imports
            </li>
            <li style={{ marginBottom: '8px' }}>
              Verify all required services are available
            </li>
          </ol>
        </div>

        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 15px 0' }}>🚀 Ready to Fix Main App</h3>
          <p style={{ margin: '0 0 15px 0' }}>
            Since this test component renders correctly, we can now focus on fixing the main application dependencies.
          </p>
          <button
            onClick={() => {
              console.log('🔄 Attempting to load main app...');
              window.location.href = window.location.href.replace('TestApp', 'App');
            }}
            style={{
              background: 'rgba(76, 175, 80, 0.3)',
              border: '1px solid #4CAF50',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(76, 175, 80, 0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔄 Try Main App
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestApp;
