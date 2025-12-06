/**
 * WebSocket Connection Monitoring Dashboard for NFTGen
 * 
 * Real-time monitoring component for WebSocket connections to Nwallet,
 * displaying connection status, latency, message counts, and health metrics
 */

import React, { useState, useEffect, useRef } from 'react';
import { webSocketService, ConnectionState } from '../services/websocket.service';

interface ConnectionMetrics {
  totalConnections: number;
  totalReconnections: number;
  totalMessages: number;
  averageLatency: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
}

interface MonitoringData {
  connectionState: ConnectionState;
  metrics: ConnectionMetrics;
  queuedMessages: number;
  isHealthy: boolean;
  lastUpdate: number;
}

const WebSocketMonitor: React.FC = () => {
  const [monitoringData, setMonitoringData] = useState<MonitoringData>({
    connectionState: ConnectionState.DISCONNECTED,
    metrics: {
      totalConnections: 0,
      totalReconnections: 0,
      totalMessages: 0,
      averageLatency: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null
    },
    queuedMessages: 0,
    isHealthy: false,
    lastUpdate: Date.now()
  });

  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial data fetch
    updateMonitoringData();

    // Set up periodic updates
    updateIntervalRef.current = setInterval(updateMonitoringData, 2000);

    // Listen to WebSocket events
    const handleStateChange = () => updateMonitoringData();
    const handleConnected = () => updateMonitoringData();
    const handleDisconnected = () => updateMonitoringData();

    webSocketService.on('stateChange', handleStateChange);
    webSocketService.on('connected', handleConnected);
    webSocketService.on('disconnected', handleDisconnected);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      webSocketService.off('stateChange', handleStateChange);
      webSocketService.off('connected', handleConnected);
      webSocketService.off('disconnected', handleDisconnected);
    };
  }, []);

  const updateMonitoringData = () => {
    const connectionState = webSocketService.getConnectionState();
    const metrics = webSocketService.getConnectionMetrics();
    const queuedMessages = webSocketService.getQueuedMessageCount();
    const isHealthy = webSocketService.isHealthy();

    setMonitoringData({
      connectionState,
      metrics,
      queuedMessages,
      isHealthy,
      lastUpdate: Date.now()
    });

    // Update latency history
    if (metrics.averageLatency > 0) {
      setLatencyHistory(prev => {
        const newHistory = [...prev, metrics.averageLatency];
        return newHistory.slice(-20); // Keep last 20 measurements
      });
    }
  };

  const getStatusColor = (state: ConnectionState): string => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return '#10b981'; // green
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return '#f59e0b'; // yellow
      case ConnectionState.ERROR:
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusIcon = (state: ConnectionState): string => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return '🟢';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return '🟡';
      case ConnectionState.ERROR:
        return '🔴';
      default:
        return '⚪';
    }
  };

  const formatTimestamp = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (timestamp: number | null): string => {
    if (!timestamp) return 'N/A';
    const duration = Date.now() - timestamp;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const handleForceReconnect = () => {
    webSocketService.forceReconnect();
  };

  return (
    <div className="websocket-monitor" style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      minWidth: '280px',
      maxWidth: '400px',
      border: `2px solid ${getStatusColor(monitoringData.connectionState)}`
    }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{getStatusIcon(monitoringData.connectionState)}</span>
          <span style={{ fontWeight: 'bold' }}>
            WebSocket {monitoringData.connectionState}
          </span>
        </div>
        <span style={{ fontSize: '10px' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '12px' }}>
          {/* Connection Status */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Connection Status</div>
            <div>State: {monitoringData.connectionState}</div>
            <div>Healthy: {monitoringData.isHealthy ? '✅' : '❌'}</div>
            <div>Queued Messages: {monitoringData.queuedMessages}</div>
          </div>

          {/* Metrics */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Metrics</div>
            <div>Total Connections: {monitoringData.metrics.totalConnections}</div>
            <div>Reconnections: {monitoringData.metrics.totalReconnections}</div>
            <div>Messages: {monitoringData.metrics.totalMessages}</div>
            <div>Avg Latency: {monitoringData.metrics.averageLatency.toFixed(0)}ms</div>
          </div>

          {/* Timing */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Timing</div>
            <div>Last Connected: {formatTimestamp(monitoringData.metrics.lastConnectedAt)}</div>
            <div>Last Disconnected: {formatTimestamp(monitoringData.metrics.lastDisconnectedAt)}</div>
            {monitoringData.metrics.lastConnectedAt && (
              <div>Uptime: {formatDuration(monitoringData.metrics.lastConnectedAt)}</div>
            )}
          </div>

          {/* Latency Chart */}
          {latencyHistory.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Latency History</div>
              <div style={{ 
                height: '40px', 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                padding: '4px',
                display: 'flex',
                alignItems: 'end',
                gap: '1px'
              }}>
                {latencyHistory.map((latency, index) => {
                  const maxLatency = Math.max(...latencyHistory);
                  const height = Math.max(2, (latency / maxLatency) * 30);
                  const color = latency > 200 ? '#ef4444' : latency > 100 ? '#f59e0b' : '#10b981';
                  
                  return (
                    <div
                      key={index}
                      style={{
                        width: '8px',
                        height: `${height}px`,
                        backgroundColor: color,
                        borderRadius: '1px'
                      }}
                      title={`${latency.toFixed(0)}ms`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={handleForceReconnect}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Force Reconnect
            </button>
            <button
              onClick={() => console.log('WebSocket Metrics:', monitoringData)}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Log Metrics
            </button>
          </div>

          <div style={{ 
            fontSize: '10px', 
            color: '#9ca3af', 
            marginTop: '8px',
            textAlign: 'center'
          }}>
            Last Update: {formatTimestamp(monitoringData.lastUpdate)}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketMonitor;
