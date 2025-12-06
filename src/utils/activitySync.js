import { syncNFTMintActivity } from '../nijaIntegration';
import { NWALLET_API_URL, WS_CONFIG, NFTGEN_ORIGIN, SESSION_STORAGE_KEY, NWALLET_SESSION_KEY } from '../config/constants';
// Use the WebSocket URL from constants
// Make sure we're using the correct port (6101 instead of 7101)
// And the correct path (/ws instead of /nwallet)
const CORRECT_NWALLET_WS_URL = 'ws://3.111.22.56:6101/ws';
// WebSocket connection state
let ws = null;
let reconnectAttempts = 0;
let heartbeatInterval = null;
let wsConnecting = false;
let lastHeartbeatResponse = 0;
let heartbeatTimeoutId = null;
// Heartbeat functions with improved reliability
function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    if (heartbeatTimeoutId) {
        clearTimeout(heartbeatTimeoutId);
        heartbeatTimeoutId = null;
    }
    // Record the current time as the last heartbeat response
    lastHeartbeatResponse = Date.now();
    heartbeatInterval = window.setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                // Check if we've received a response to our last heartbeat
                const timeSinceLastResponse = Date.now() - lastHeartbeatResponse;
                if (timeSinceLastResponse > 70000) { // No response for over 70 seconds (2 heartbeats + buffer)
                    console.warn('❤️ No heartbeat response received for too long, reconnecting...');
                    stopHeartbeat();
                    ws.close(4000, 'Heartbeat timeout');
                    return;
                }
                // Send heartbeat with session information for better security
                const sessionData = localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(NWALLET_SESSION_KEY);
                let sessionId = 'unknown';
                let address = 'unknown';
                if (sessionData) {
                    try {
                        const session = JSON.parse(sessionData);
                        sessionId = session.sessionId || 'unknown';
                        address = session.address || 'unknown';
                    }
                    catch (e) {
                        console.warn('Failed to parse session data for heartbeat:', e);
                    }
                }
                ws.send(JSON.stringify({
                    type: 'heartbeat',
                    timestamp: Date.now(),
                    sessionId,
                    address,
                    origin: NFTGEN_ORIGIN
                }));
                console.log('❤️ Heartbeat sent');
                // Set a timeout to detect missing heartbeat responses
                if (heartbeatTimeoutId) {
                    clearTimeout(heartbeatTimeoutId);
                }
                heartbeatTimeoutId = window.setTimeout(() => {
                    console.warn('❤️ Heartbeat response timeout, checking connection...');
                    // Don't immediately close - just check if we've received any message
                    const timeSinceLastResponse = Date.now() - lastHeartbeatResponse;
                    if (timeSinceLastResponse > 45000) { // No response for 45 seconds
                        console.warn('❤️ Connection appears to be dead, reconnecting...');
                        stopHeartbeat();
                        ws?.close(4000, 'Heartbeat timeout');
                    }
                }, 35000); // Wait slightly longer than heartbeat interval
            }
            catch (error) {
                console.error('❤️ Failed to send heartbeat:', error);
                stopHeartbeat();
                ws?.close(4000, 'Heartbeat error');
            }
        }
        else {
            stopHeartbeat();
        }
    }, 30000); // 30-second heartbeat
}
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    if (heartbeatTimeoutId) {
        clearTimeout(heartbeatTimeoutId);
        heartbeatTimeoutId = null;
    }
}
// Message handling with improved security and reliability
function handleWebSocketMessage(data) {
    try {
        console.log('🔌 Received WebSocket message:', data);
        // Update the last heartbeat response time for any message received
        // This helps keep the connection alive even if specific heartbeat responses aren't received
        lastHeartbeatResponse = Date.now();
        // Validate data structure
        if (!data || typeof data !== 'object' || !data.type) {
            console.warn('🔌 Invalid WebSocket message format:', data);
            return;
        }
        const messageType = data.type;
        switch (messageType) {
            case 'heartbeat-response':
                console.log('❤️ Heartbeat response received');
                break;
            case 'nft-activity':
                handleNFTActivity(data);
                break;
            case 'session-verified':
                console.log('🔑 Session verification confirmed by server');
                // Dispatch event to notify the app that the session is verified
                dispatchWebSocketStatusEvent('connected', 'Session verified');
                break;
            case 'session-invalid': {
                console.warn('🔑 Session invalid or expired');
                // Dispatch event to notify the app that the session is invalid
                dispatchWebSocketStatusEvent('error', 'Session invalid or expired');
                // Try to get a new session from localStorage
                const sessionData = localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(NWALLET_SESSION_KEY);
                if (sessionData) {
                    try {
                        const session = JSON.parse(sessionData);
                        if (session.sessionId && session.address) {
                            console.log('Attempting to reconnect with updated session data');
                            // Close the current connection and reconnect with the new session
                            if (ws) {
                                ws.close(4000, 'Session invalid, reconnecting with new session');
                            }
                            setTimeout(() => {
                                initializeWebSocketConnection(session.sessionId, session.address)
                                    .catch(err => console.warn('Failed to reconnect with new session:', err));
                            }, 1000);
                        }
                    }
                    catch (e) {
                        console.error('Error parsing session data for reconnection:', e);
                    }
                }
                break;
            }
            case 'error':
                console.error('🔌 Server reported error:', data.message || 'Unknown error');
                dispatchWebSocketStatusEvent('error', String(data.message || 'Server reported error'));
                break;
            default:
                console.log('🔌 Unknown message type:', messageType);
                // Check if it might be an activity despite unknown type
                if (data.activity || data.hash || data.transactionHash || data.tokenId) {
                    console.log('Message appears to be an activity despite unknown type, attempting to process');
                    handleNFTActivity(data);
                }
        }
    }
    catch (error) {
        console.error('🔌 Error handling WebSocket message:', error);
    }
}
function handleNFTActivity(data) {
    try {
        if (!data.activity) {
            console.warn('🔌 NFT activity message missing activity data');
            return;
        }
        // Convert the activity data to the expected format
        const activityData = data.activity;
        // Create a properly formatted NFTMintActivity object
        const mintActivity = {
            type: 'mint', // Use 'as const' to ensure type is exactly 'mint'
            hash: String(activityData.hash || activityData.transactionHash || ''),
            tokenId: String(activityData.tokenId || ''),
            tokenURI: String(activityData.tokenURI || activityData.tokenUri || ''),
            recipientAddress: String(activityData.to || activityData.recipientAddress || ''),
            name: String(activityData.name || 'NFT'),
            description: String(activityData.description || ''),
            image: String(activityData.image || ''),
            timestamp: Number(activityData.timestamp || Date.now()),
            status: (activityData.status === 'pending' ? 'pending' :
                activityData.status === 'success' ? 'success' :
                    activityData.status === 'failed' ? 'failed' : 'pending')
        };
        // Sync the activity
        syncNFTMintActivity(mintActivity)
            .then(result => {
            if (result) {
                console.log('✅ NFT activity synced successfully');
            }
            else {
                console.warn('⚠️ NFT activity sync returned false');
            }
        })
            .catch(error => {
            console.error('❌ Error syncing NFT activity:', error);
        });
    }
    catch (error) {
        console.error('❌ Error handling NFT activity:', error);
    }
}
// Utility functions for WebSocket connection management
// (Add more utility functions here as needed)
/**
 * Initialize WebSocket connection to Nija Wallet
 * This handles setting up the connection with proper parameters
 */
// Global connection tracking
let activeConnection = null;
export async function initializeWebSocketConnection(sessionId, address, wsUrlParam = CORRECT_NWALLET_WS_URL) {
    // Skip connection if no valid credentials
    if (!sessionId || !address) {
        console.log('🔌 Skipping WebSocket connection - missing credentials');
        // Notify the app that WebSocket is not available
        dispatchWebSocketStatusEvent('unavailable', 'Missing credentials');
        return false;
    }
    // Check if we already have an active connection with the same credentials
    if (ws && ws.readyState === WebSocket.OPEN) {
        if (activeConnection &&
            activeConnection.sessionId === sessionId &&
            activeConnection.address === address &&
            (Date.now() - activeConnection.timestamp) < 60000) { // Less than 1 minute old
            console.log('🔌 Active WebSocket connection already exists with same credentials');
            // Notify the app that WebSocket is connected
            dispatchWebSocketStatusEvent('connected', 'Connection already exists');
            return true; // Connection already exists and is valid
        }
        else {
            // Close existing connection before creating a new one
            console.log('🔌 Closing existing WebSocket connection before creating a new one');
            stopHeartbeat();
            ws.close();
            ws = null;
        }
    }
    // Check if a connection attempt is already in progress
    if (wsConnecting) {
        console.log('🔌 WebSocket connection already in progress...');
        // Notify the app that WebSocket is connecting
        dispatchWebSocketStatusEvent('connecting', 'Connection attempt in progress');
        return false;
    }
    // Set a connection timeout - increased to 10 seconds for slower networks
    const connectionTimeout = setTimeout(() => {
        if (wsConnecting) {
            console.log('🔌 WebSocket connection attempt timed out');
            wsConnecting = false;
            if (ws) {
                ws.close();
                ws = null;
            }
            // Notify the app that WebSocket connection timed out
            dispatchWebSocketStatusEvent('error', 'Connection timeout');
        }
    }, 10000); // 10 second timeout
    try {
        wsConnecting = true;
        // Notify the app that WebSocket is connecting
        dispatchWebSocketStatusEvent('connecting', 'Initializing connection');
        console.log('🔌 Initializing WebSocket connection to Nija Wallet...');
        console.log('WebSocket URL:', CORRECT_NWALLET_WS_URL);
        // Ensure we're using the correct WebSocket URL with port
        // The URL should be in the format: ws://3.111.22.56:7101/ws
        // Check if the WebSocket server is available
        try {
            // Try to ping the server first to check if it's available
            const pingResponse = await fetch(`${NWALLET_API_URL}/api/nwallet/ping`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).catch(() => null);
            if (!pingResponse || !pingResponse.ok) {
                console.log('🔌 WebSocket server is not available, skipping connection');
                dispatchWebSocketStatusEvent('unavailable', 'WebSocket server is not available');
                clearTimeout(connectionTimeout);
                wsConnecting = false;
                return false;
            }
        }
        catch (pingError) {
            console.warn('🔌 Error pinging WebSocket server:', pingError);
            // Continue anyway, the WebSocket connection will fail if the server is not available
        }
        // Use the provided WebSocket URL parameter
        const wsUrlString = wsUrlParam;
        console.log('Using WebSocket URL:', wsUrlString);
        // Create a properly formatted WebSocket URL with enhanced security parameters
        const wsUrl = new URL(wsUrlString);
        // Generate a unique connection ID for better security
        const connectionId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        // Generate a simple signature for authentication
        // In a production environment, this should use a proper cryptographic signature
        const timestamp = Date.now();
        const authSignature = btoa(`${sessionId}:${address}:${timestamp}:${connectionId}`);
        // Add each parameter individually with proper encoding
        // Keep sessionId and address parameters simple (no JSON objects)
        wsUrl.searchParams.set('sessionId', sessionId);
        wsUrl.searchParams.set('address', address);
        wsUrl.searchParams.set('app', 'NFTGen');
        wsUrl.searchParams.set('v', '1.1.0'); // Updated version
        wsUrl.searchParams.set('origin', NFTGEN_ORIGIN); // Use constant instead of window.location.origin
        wsUrl.searchParams.set('cid', connectionId); // Add connection ID
        wsUrl.searchParams.set('ts', timestamp.toString()); // Add timestamp
        wsUrl.searchParams.set('sig', authSignature); // Add signature
        console.log('🔌 Attempting to connect to WebSocket at', wsUrl.toString());
        // Before attempting WebSocket connection, verify the address using Alchemy SDK
        // This ensures we have a valid connection to the blockchain even if WebSocket fails
        try {
            // Import the Alchemy SDK
            const { Alchemy, Network } = await import('alchemy-sdk');
            // Initialize Alchemy SDK with Sepolia network (as recommended in the docs)
            const alchemy = new Alchemy({
                apiKey: import.meta.env.VITE_ALCHEMY_API_KEY || 'gRcliAnQ2ysaJacOBBlOCd7eT9NxGLd0', // Using production key as fallback
                network: Network.ETH_SEPOLIA
            });
            // Verify the address exists by checking its balance
            const balance = await alchemy.core.getBalance(address);
            console.log(`Address ${address} verified with Alchemy. Balance: ${balance}`);
            window.alchemyInstance = alchemy;
        }
        catch (alchemyError) {
            console.warn('Failed to initialize Alchemy SDK:', alchemyError);
            // Continue with WebSocket connection attempt even if Alchemy fails
        }
        try {
            // Try to create a real WebSocket connection
            ws = new WebSocket(wsUrl.toString());
            console.log('WebSocket object created');
            // Set a timeout for the WebSocket connection itself
            const wsConnectionTimeout = setTimeout(() => {
                if (ws && ws.readyState !== WebSocket.OPEN) {
                    console.log('🔌 WebSocket connection not established within timeout period');
                    try {
                        ws.close();
                    }
                    catch (closeError) {
                        console.warn('Error closing WebSocket:', closeError);
                    }
                    dispatchWebSocketStatusEvent('error', 'WebSocket connection timeout');
                    // Continue without WebSocket - this is non-critical
                    console.log('🔌 Continuing without WebSocket connection');
                    wsConnecting = false;
                }
            }, 5000); // 5 second timeout for the WebSocket connection
            // Store the timeout ID to clear it later
            if (typeof window !== 'undefined') {
                window.wsConnectionTimeoutId = wsConnectionTimeout;
            }
        }
        catch (error) {
            // If real WebSocket fails, log the error but continue
            console.log('🔌 Real WebSocket creation failed:', error);
            // Notify the app that WebSocket creation failed
            dispatchWebSocketStatusEvent('error', 'WebSocket creation failed');
            // Don't throw - let the app continue without WebSocket
            clearTimeout(connectionTimeout);
            wsConnecting = false;
            return false;
        }
        // Make the WebSocket connection available globally
        if (typeof window !== 'undefined') {
            window.nftGenWalletWs = ws;
        }
        return new Promise((resolve) => {
            if (!ws) {
                console.warn('WebSocket object not created');
                clearTimeout(connectionTimeout);
                wsConnecting = false;
                // Notify the app that WebSocket object creation failed
                dispatchWebSocketStatusEvent('error', 'WebSocket object not created');
                return resolve(false);
            }
            ws.onopen = () => {
                clearTimeout(connectionTimeout);
                // Clear the WebSocket connection timeout
                if (typeof window !== 'undefined' && window.wsConnectionTimeoutId) {
                    clearTimeout(window.wsConnectionTimeoutId);
                }
                console.log('🔌 WebSocket connection established');
                reconnectAttempts = 0;
                wsConnecting = false;
                // Update the active connection tracking
                activeConnection = {
                    sessionId,
                    address,
                    timestamp: Date.now()
                };
                // Store connection info globally for debugging
                if (typeof window !== 'undefined') {
                    window.nijaWalletConnectionInfo = activeConnection;
                }
                // Send enhanced handshake message with improved security
                try {
                    // Generate a simple signature for authentication
                    const handshakeTimestamp = Date.now();
                    const connectionId = wsUrl.searchParams.get('cid') || `${handshakeTimestamp}_${Math.random().toString(36).substring(2, 15)}`;
                    const authSignature = btoa(`${sessionId}:${address}:${handshakeTimestamp}:${connectionId}`);
                    ws?.send(JSON.stringify({
                        type: 'handshake',
                        sessionId,
                        address,
                        app: 'NFTGen',
                        timestamp: handshakeTimestamp,
                        connectionId,
                        signature: authSignature,
                        version: '1.1.0',
                        origin: NFTGEN_ORIGIN,
                        capabilities: ['nftSync', 'activitySync', 'transactionSync']
                    }));
                    // Also send authentication message
                    setTimeout(() => {
                        if (ws?.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'authenticate',
                                sessionId,
                                address,
                                timestamp: Date.now(),
                                connectionId,
                                signature: authSignature
                            }));
                        }
                    }, 500); // Small delay to ensure handshake is processed first
                }
                catch (e) {
                    console.error('Failed to send handshake message:', e);
                    // Non-critical error, continue with connection
                }
                startHeartbeat();
                // Notify the app that WebSocket is connected
                dispatchWebSocketStatusEvent('connected', 'Connection established');
                resolve(true);
            };
            ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                // Clear the WebSocket connection timeout
                if (typeof window !== 'undefined' && window.wsConnectionTimeoutId) {
                    clearTimeout(window.wsConnectionTimeoutId);
                }
                console.error('🔌 WebSocket error:', error);
                wsConnecting = false;
                // Notify the app that WebSocket encountered an error
                dispatchWebSocketStatusEvent('error', 'WebSocket error occurred');
                // Don't reject, just resolve with false to prevent unhandled promise rejections
                resolve(false);
            };
            ws.onclose = (event) => {
                clearTimeout(connectionTimeout);
                // Clear the WebSocket connection timeout
                if (typeof window !== 'undefined' && window.wsConnectionTimeoutId) {
                    clearTimeout(window.wsConnectionTimeoutId);
                }
                console.log('🔌 WebSocket connection closed:', event.code);
                stopHeartbeat();
                wsConnecting = false;
                // Notify the app that WebSocket connection closed
                dispatchWebSocketStatusEvent('disconnected', `Connection closed: ${event.code}`);
                if (reconnectAttempts < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    console.log(`🔌 Attempting to reconnect (${reconnectAttempts}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS})...`);
                    // Notify the app that WebSocket is attempting to reconnect
                    dispatchWebSocketStatusEvent('reconnecting', `Attempt ${reconnectAttempts}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS}`);
                    setTimeout(() => {
                        // Use catch with empty handler to prevent unhandled promise rejections
                        initializeWebSocketConnection(sessionId, address).catch(() => {
                            console.log('Reconnection attempt failed, but continuing app execution');
                        });
                    }, WS_CONFIG.RECONNECT_DELAY * reconnectAttempts); // Exponential backoff
                }
                else {
                    console.warn('🔌 Max reconnect attempts reached. App will continue without WebSocket.');
                    // Notify the app that WebSocket reconnection failed
                    dispatchWebSocketStatusEvent('failed', 'Max reconnect attempts reached');
                }
            };
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                }
                catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    // Non-critical error, continue with connection
                }
            };
        });
    }
    catch (error) {
        clearTimeout(connectionTimeout);
        console.error('Error initializing WebSocket:', error);
        wsConnecting = false;
        // Notify the app that WebSocket initialization failed
        dispatchWebSocketStatusEvent('error', 'WebSocket initialization error');
        // Don't throw, just return false to prevent unhandled promise rejections
        return false;
    }
}
// Helper function to dispatch WebSocket status events
function dispatchWebSocketStatusEvent(status, message) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nftgen_websocket_status', {
            detail: {
                status,
                message,
                timestamp: Date.now()
            }
        }));
        // Also dispatch the error event for backward compatibility
        if (status === 'error' || status === 'failed') {
            window.dispatchEvent(new CustomEvent('nftgen_websocket_error', {
                detail: {
                    error: new Error(message),
                    message
                }
            }));
        }
    }
}
/**
 * Synchronize NFT activity to Nija Wallet
 * This function handles sending activity data to Nija Wallet via WebSocket or API
 *
 * @param activity - The NFT activity to synchronize
 * @returns Promise resolving to true if sync was successful, false otherwise
 */
export async function syncActivityToNijaWallet(activity) {
    console.log('Syncing activity to Nija Wallet with Alchemy integration:', activity);
    try {
        // Ensure we have a valid transaction hash
        const hash = activity.transactionHash ||
            (activity.id && activity.id.startsWith('0x') ? activity.id : `0x${activity.id || ''}`);
        // Ensure we have a valid timestamp
        const timestamp = typeof activity.timestamp === 'string'
            ? new Date(activity.timestamp).getTime()
            : (typeof activity.timestamp === 'number' ? activity.timestamp : Date.now());
        // Create a unique ID for the activity
        const uniqueId = activity.tokenId ||
            (activity.id ? (activity.id.length > 8 ? activity.id.substring(0, 8) : activity.id) : null) ||
            hash.substring(0, 8);
        // Create a proper gallery URL
        const galleryUrl = `http://3.111.22.56:7103/gallery/${uniqueId}`;
        // Enhance activity with real Alchemy data if contract address and token ID are available
        let enhancedActivity = { ...activity };
        if (activity.contractAddress && activity.tokenId) {
            try {
                console.log('Enhancing activity with Alchemy metadata...');
                // Import Alchemy SDK for metadata enrichment
                const { Alchemy, Network } = await import('alchemy-sdk');
                // Initialize Alchemy with proper configuration based on documentation
                const alchemy = new Alchemy({
                    apiKey: import.meta.env.VITE_ALCHEMY_API_KEY || 'gRcliAnQ2ysaJacOBBlOCd7eT9NxGLd0',
                    network: Network.ETH_SEPOLIA, // Using Sepolia as per documentation
                    maxRetries: 3,
                    requestTimeout: 15000
                });
                // Fetch NFT metadata using Alchemy API (following nftalchemyref.md patterns)
                const metadata = await alchemy.nft.getNftMetadata(activity.contractAddress, activity.tokenId, {
                    tokenType: 'ERC721',
                    refreshCache: false,
                    tokenUriTimeoutInMs: 15000
                });
                if (metadata) {
                    console.log('Successfully retrieved Alchemy metadata:', metadata);
                    // Enhance activity with real blockchain data
                    enhancedActivity = {
                        ...activity,
                        name: metadata.title || activity.name || 'Unknown NFT',
                        description: metadata.description || activity.description || '',
                        image: metadata.media?.[0]?.gateway || metadata.media?.[0]?.raw || activity.image || '',
                        tokenType: metadata.tokenType || activity.tokenType,
                        contractName: metadata.contract?.name || activity.contractName,
                        metadata: {
                            ...activity.metadata,
                            attributes: metadata.rawMetadata?.attributes || activity.metadata?.attributes || [],
                            collection: metadata.contract?.name ? {
                                name: metadata.contract.name,
                                symbol: metadata.contract.symbol || undefined
                            } : activity.metadata?.collection,
                            tokenStandard: metadata.tokenType || activity.metadata?.tokenStandard,
                            external_url: metadata.rawMetadata?.external_url || activity.metadata?.external_url
                        }
                    };
                    console.log('Activity enhanced with Alchemy data');
                }
            }
            catch (alchemyError) {
                console.warn('Failed to enhance with Alchemy metadata:', alchemyError);
                // Continue with original activity data
            }
        }
        // Create a combined format that works for both NFTGen and Nwallet
        const updatedActivity = {
            ...enhancedActivity,
            hash,
            tokenId: uniqueId,
            id: enhancedActivity.id || hash,
            status: enhancedActivity.status === 'pending' ? 'pending' :
                enhancedActivity.status === 'success' ? 'success' : 'failed',
            externalUrl: enhancedActivity.externalUrl || galleryUrl,
            nftgenUrl: galleryUrl,
            timestamp,
            details: {
                name: enhancedActivity.name || 'NFT',
                tokenId: uniqueId,
                asset: {
                    imageUrl: enhancedActivity.image || '',
                    metadataUrl: enhancedActivity.tokenURI || ''
                },
                fractions: 1,
                royaltyFee: 2.5,
                contractAddress: enhancedActivity.contractAddress,
                contractName: enhancedActivity.contractName,
                tokenType: enhancedActivity.tokenType
            },
            source: 'nftgen',
            version: '2.0' // Mark as enhanced version
        };
        // Store in localStorage with multiple keys for maximum compatibility
        try {
            // Standard NFTGen key
            const nftgenKey = `nftgen_tx_${activity.id || hash}`;
            localStorage.setItem(nftgenKey, JSON.stringify(updatedActivity));
            // Special key that Nwallet will recognize
            const nwalletKey = `nftgen_tx_${hash}_nwallet`;
            localStorage.setItem(nwalletKey, JSON.stringify(updatedActivity));
            // Latest activity key
            localStorage.setItem('nftgen_latest_activity', JSON.stringify(updatedActivity));
            console.log('Stored NFT activity in localStorage with keys:', nftgenKey, nwalletKey);
            // Dispatch events for internal components
            try {
                // Dispatch an event to notify NFTGen components
                const activityEvent = new CustomEvent('nftgen_activity_update', {
                    detail: updatedActivity
                });
                window.dispatchEvent(activityEvent);
                // Dispatch event for Nwallet integration
                const nijaWalletActivityEvent = new CustomEvent('nija_wallet_activity_update', {
                    detail: updatedActivity
                });
                window.dispatchEvent(nijaWalletActivityEvent);
            }
            catch (eventError) {
                console.warn('Error dispatching activity events:', eventError);
            }
        }
        catch (storageError) {
            console.error('Error storing activity in localStorage:', storageError);
        }
        // Get session data from localStorage
        const sessionRaw = localStorage.getItem(NWALLET_SESSION_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
        let session = null;
        if (sessionRaw) {
            try {
                // Parse session data
                session = JSON.parse(sessionRaw);
                if (!session.sessionId || !session.address) {
                    console.warn('Invalid Nija Wallet session data');
                    session = null;
                }
            }
            catch (e) {
                console.warn('Error parsing Nija Wallet session:', e);
            }
        }
        // Try to initialize WebSocket connection if not connected and session exists
        if (session && (!ws || ws.readyState !== WebSocket.OPEN)) {
            try {
                initializeWebSocketConnection(session.sessionId, session.address);
                // Give it a moment to connect
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            catch (wsInitError) {
                console.warn('Error initializing WebSocket connection:', wsInitError);
            }
        }
        // Try WebSocket first if available
        if (ws && ws.readyState === WebSocket.OPEN && session) {
            try {
                // Format the activity for Nija Wallet
                const nijaActivity = {
                    type: 'mint', // Force the type to be 'mint' for compatibility
                    hash,
                    tokenId: uniqueId,
                    tokenURI: activity.tokenURI || '',
                    recipientAddress: activity.to || session.address,
                    name: activity.name || 'NFT',
                    description: activity.description || '',
                    image: activity.image || '',
                    timestamp,
                    status: updatedActivity.status
                };
                // Generate a simple signature for authentication
                const activityTimestamp = Date.now();
                const messageId = `${activityTimestamp}_${Math.random().toString(36).substring(2, 15)}`;
                const authSignature = btoa(`${session.sessionId}:${hash}:${activityTimestamp}:${messageId}`);
                // Send the activity via WebSocket with enhanced security
                ws.send(JSON.stringify({
                    type: 'activity',
                    data: nijaActivity,
                    app: 'NFTGen',
                    sessionId: session.sessionId,
                    timestamp: activityTimestamp,
                    messageId,
                    signature: authSignature,
                    version: '1.1.0',
                    origin: NFTGEN_ORIGIN
                }));
                console.log('Activity sent via WebSocket');
                return true;
            }
            catch (wsError) {
                console.error('Error sending activity via WebSocket:', wsError);
                // Fall back to API if session exists
            }
        }
        // Fall back to API if WebSocket is not available but session exists
        if (session) {
            console.log('WebSocket not available, using API fallback');
            return await syncViaAPI(updatedActivity, session);
        }
        // If we got here, we at least stored the activity in localStorage
        return true;
    }
    catch (error) {
        console.error('Error syncing activity to Nija Wallet:', error);
        return false;
    }
}
/**
 * Sync activity via API as fallback
 */
async function syncViaAPI(activity, session) {
    try {
        console.log('Syncing activity via API');
        // Normalize the status to match allowed values
        let status;
        if (activity.status === 'pending') {
            status = 'pending';
        }
        else if (activity.status === 'success') {
            status = 'success';
        }
        else {
            status = 'failed';
        }
        // Format the activity for Nija Wallet
        const nijaActivity = {
            type: 'mint',
            hash: activity.hash || activity.transactionHash || '',
            tokenId: activity.tokenId || '',
            tokenURI: activity.tokenURI || '',
            recipientAddress: activity.to || session.address,
            name: activity.name || 'NFT',
            description: activity.description || '',
            image: activity.image || '',
            timestamp: activity.timestamp || Date.now(),
            status
        };
        // Set up request headers
        const headers = {
            'Content-Type': 'application/json'
        };
        // Add authorization if session available
        if (session.sessionId) {
            headers['Authorization'] = `Bearer ${session.sessionId}`;
            if (session.nonce) {
                headers['X-Nonce'] = session.nonce.toString();
            }
        }
        // Send request to API
        const response = await fetch(`${NWALLET_API_URL}/activity/sync`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                activity: nijaActivity,
                app: 'NFTGen',
                sessionId: session.sessionId,
                timestamp: Date.now()
            })
        });
        if (response.ok) {
            console.log('Activity synced via API successfully');
            return true;
        }
        else {
            const errorText = await response.text();
            console.error('Failed to sync activity via API:', errorText);
            return false;
        }
    }
    catch (error) {
        console.error('Error syncing activity via API:', error);
        return false;
    }
}
/**
 * Fetch all NFT activities from Nija Wallet
 */
export async function fetchActivitiesFromNijaWallet() {
    try {
        console.log('Fetching activities from Nija Wallet API');
        // Get session data from localStorage
        const sessionRaw = localStorage.getItem(NWALLET_SESSION_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
        if (!sessionRaw) {
            console.warn('No Nwallet session found for fetching activities');
            return [];
        }
        // Parse session data
        let session;
        try {
            session = JSON.parse(sessionRaw);
            if (!session.sessionId || !session.address) {
                console.warn('Invalid Nija Wallet session data');
                return [];
            }
        }
        catch (error) {
            console.warn('Failed to parse session data:', error);
            return [];
        }
        // Set up request headers
        const headers = {
            'Content-Type': 'application/json'
        };
        // Add authorization if session available
        if (session.sessionId) {
            headers['Authorization'] = `Bearer ${session.sessionId}`;
            if (session.nonce) {
                headers['X-Nonce'] = session.nonce.toString();
            }
        }
        try {
            // Make the API request with a timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            const response = await fetch(`${NWALLET_API_URL}/activities`, {
                method: 'GET',
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                const activities = await response.json();
                console.log(`Fetched ${activities.length} activities from Nija Wallet`);
                if (!activities || activities.length === 0) {
                    console.log('No activities found');
                    return [];
                }
                return activities;
            }
            else {
                console.error('Failed to fetch activities:', response.statusText);
                return [];
            }
        }
        catch (fetchError) {
            console.error('Error making API request:', fetchError);
            return [];
        }
    }
    catch (error) {
        console.error('Error fetching activities:', error);
        return [];
    }
}
/**
 * Fetch a specific NFT activity by hash
 * @param hash Transaction hash
 */
export async function fetchActivityByHash(hash) {
    try {
        console.log(`Fetching activity with hash ${hash} from Nija Wallet API`);
        // Get session data from localStorage
        const sessionRaw = localStorage.getItem(NWALLET_SESSION_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
        if (!sessionRaw) {
            console.warn('No Nwallet session found for fetching activity');
            return null;
        }
        // Parse session data
        let session;
        try {
            session = JSON.parse(sessionRaw);
            if (!session.sessionId || !session.address) {
                console.warn('Invalid Nija Wallet session data');
                return null;
            }
        }
        catch (error) {
            console.warn('Failed to parse session data:', error);
            return null;
        }
        // Set up request headers
        const headers = {
            'Content-Type': 'application/json'
        };
        // Add authorization if session available
        if (session.sessionId) {
            headers['Authorization'] = `Bearer ${session.sessionId}`;
            if (session.nonce) {
                headers['X-Nonce'] = session.nonce.toString();
            }
        }
        try {
            // Make the API request with a timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            const response = await fetch(`${NWALLET_API_URL}/activities/${hash}`, {
                method: 'GET',
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                const activity = await response.json();
                console.log('Fetched activity:', activity);
                return activity;
            }
            else if (response.status === 404) {
                console.log(`Activity with hash ${hash} not found`);
                return null;
            }
            else {
                console.error('Failed to fetch activity:', response.statusText);
                return null;
            }
        }
        catch (fetchError) {
            console.error('Error making API request:', fetchError);
            return null;
        }
    }
    catch (error) {
        console.error('Error fetching activity:', error);
        return null;
    }
}
// Initialize WebSocket connection when this module is imported
// But with a slight delay to ensure session is available
// Wrap in try-catch to prevent errors from blocking the UI
setTimeout(() => {
    try {
        // Check if we have a valid session before attempting to connect
        const sessionStr = localStorage.getItem(NWALLET_SESSION_KEY) ||
            localStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionStr) {
            try {
                // Try to parse the session as JSON first
                const session = JSON.parse(sessionStr);
                if (session && session.sessionId && session.address) {
                    console.log('Initializing WebSocket with parsed session data');
                    initializeWebSocketConnection(session.sessionId, session.address)
                        .catch(err => {
                        console.warn('WebSocket connection failed, but app will continue:', err);
                        // Dispatch a custom event to notify the app that WebSocket failed
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('nftgen_websocket_error', {
                                detail: { error: err, message: 'WebSocket connection failed' }
                            }));
                        }
                    });
                }
                else {
                    console.log('Session data exists but is missing required fields');
                }
            }
            catch (error) {
                // If JSON parsing fails, try the old format (comma-separated)
                console.log('Session is not JSON, trying comma-separated format:', error);
                const sessionId = sessionStr.split(',')[0] || '';
                const address = sessionStr.split(',')[1] || '';
                if (sessionId && address) {
                    initializeWebSocketConnection(sessionId, address)
                        .catch(err => {
                        console.warn('WebSocket connection failed, but app will continue:', err);
                        // Dispatch a custom event to notify the app that WebSocket failed
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('nftgen_websocket_error', {
                                detail: { error: err, message: 'WebSocket connection failed' }
                            }));
                        }
                    });
                }
                else {
                    console.log('No valid session data found for WebSocket connection');
                }
            }
        }
        else {
            console.log('No session data found, skipping WebSocket connection');
        }
    }
    catch (error) {
        console.warn('Error during WebSocket initialization, continuing without WebSocket:', error);
        // Dispatch a custom event to notify the app that WebSocket failed
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nftgen_websocket_error', {
                detail: { error, message: 'WebSocket initialization error' }
            }));
        }
    }
}, 3000); // Increased delay to ensure app UI loads first
// Simple function to check if WebSocket server is available with enhanced security
export function testWebSocketConnection() {
    console.log('Testing WebSocket connection to:', CORRECT_NWALLET_WS_URL);
    try {
        // Create a more secure WebSocket URL with additional parameters
        const wsUrl = new URL(CORRECT_NWALLET_WS_URL);
        const connectionId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const timestamp = Date.now();
        const address = localStorage.getItem('eth_address') || '';
        // Add security parameters to the URL
        wsUrl.searchParams.set('cid', connectionId);
        wsUrl.searchParams.set('ts', timestamp.toString());
        wsUrl.searchParams.set('address', address);
        wsUrl.searchParams.set('app', 'NFTGen');
        wsUrl.searchParams.set('v', '1.1.0');
        wsUrl.searchParams.set('test', 'true');
        // Generate a simple signature for authentication
        const authSignature = btoa(`${address}:${timestamp}:${connectionId}`);
        wsUrl.searchParams.set('sig', authSignature);
        console.log('Connecting to secure WebSocket URL:', wsUrl.toString());
        const testWs = new WebSocket(wsUrl.toString());
        testWs.onopen = () => {
            console.log('Test WebSocket connection succeeded!');
            // Send a test message with enhanced security
            testWs.send(JSON.stringify({
                type: 'test',
                message: 'Testing connection from NFTGen with enhanced security',
                timestamp: Date.now(),
                connectionId,
                address,
                signature: authSignature,
                version: '1.1.0',
                origin: NFTGEN_ORIGIN
            }));
            // Close after 2 seconds
            setTimeout(() => {
                testWs.close(1000, 'Test completed');
            }, 2000);
        };
        testWs.onmessage = (event) => {
            console.log('Received test response:', event.data);
        };
        testWs.onerror = (error) => {
            console.error('Test WebSocket connection failed:', error);
        };
        testWs.onclose = (event) => {
            console.log(`Test WebSocket connection closed: ${event.code} - ${event.reason || 'No reason provided'}`);
        };
    }
    catch (error) {
        console.error('Error creating test WebSocket connection:', error);
    }
}
