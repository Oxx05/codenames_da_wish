// =============================================
// Multiplayer via PeerJS (WebRTC Peer-to-Peer)
// =============================================

const ROOM_PREFIX = 'codenames-multi-';

const mp = {
    peer: null,
    connections: [],   // Host: list of connections to guests
    hostConn: null,    // Guest: connection to host
    isHost: false,
    roomCode: null,
    onStateReceived: null  // Callback for guests
};

// Generate a random 4-digit room code
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Initialize PeerJS
function initPeer(id) {
    return new Promise((resolve, reject) => {
        const peer = new Peer(id);
        peer.on('open', () => resolve(peer));
        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            reject(err);
        });
    });
}

// HOST: Create a new room
async function createRoom(customCode) {
    const code = customCode || generateRoomCode();
    const peerId = ROOM_PREFIX + code;
    
    try {
        mp.peer = await initPeer(peerId);
        mp.isHost = true;
        mp.roomCode = code;
        mp.connections = [];

        mp.peer.on('connection', (conn) => {
            console.log('Guest connected:', conn.peer);
            mp.connections.push(conn);
            
            conn.on('open', () => {
                updatePlayerCount();
                // Send current game state to the new guest
                if (typeof gameState !== 'undefined' && gameState.cards.length > 0) {
                    conn.send({ type: 'state', payload: getShareableState() });
                }
            });

            conn.on('data', (data) => {
                // Guest sent a card click
                if (data.type === 'click') {
                    handleCardClick(data.index);
                }
            });

            conn.on('close', () => {
                mp.connections = mp.connections.filter(c => c !== conn);
                updatePlayerCount();
            });
        });

        showRoomInfo(code);
        return code;
    } catch (err) {
        alert('Failed to create room. Try again.');
        return null;
    }
}

// GUEST: Join an existing room
async function joinRoom(code) {
    const hostPeerId = ROOM_PREFIX + code;
    
    try {
        mp.peer = await initPeer(undefined); // auto-generated ID for guest
        mp.isHost = false;
        mp.roomCode = code;

        return new Promise((resolve, reject) => {
            const conn = mp.peer.connect(hostPeerId);
            
            conn.on('open', () => {
                mp.hostConn = conn;
                console.log('Connected to host!');
                showRoomInfo(code);
                resolve(true);
            });

            conn.on('data', (data) => {
                if (data.type === 'state') {
                    if (mp.onStateReceived) {
                        mp.onStateReceived(data.payload);
                    }
                }
            });

            conn.on('close', () => {
                alert('Disconnected from host.');
                mp.hostConn = null;
                leaveRoom();
            });

            conn.on('error', (err) => {
                console.error('Connection error:', err);
                reject(err);
            });

            // Timeout after 5 seconds
            setTimeout(() => {
                if (!mp.hostConn) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    } catch (err) {
        alert('Failed to join room. Check the code and try again.');
        return false;
    }
}

// Get a serializable version of game state
function getShareableState() {
    return {
        settings: gameState.settings,
        cards: gameState.cards,
        remaining: gameState.remaining,
        spymasterView: false, // Never share spymaster view
        gameOver: gameState.gameOver
    };
}

// Broadcast state to all connected guests
function broadcastState() {
    if (!mp.isHost || mp.connections.length === 0) return;
    
    const state = getShareableState();
    mp.connections.forEach(conn => {
        if (conn.open) {
            conn.send({ type: 'state', payload: state });
        }
    });
}

// Guest: send a click event to the host
function sendClickToHost(index) {
    if (mp.isHost || !mp.hostConn) return;
    mp.hostConn.send({ type: 'click', index: index });
}

// Leave/disconnect from room
function leaveRoom() {
    if (mp.peer) {
        mp.peer.destroy();
        mp.peer = null;
    }
    mp.connections = [];
    mp.hostConn = null;
    mp.isHost = false;
    mp.roomCode = null;
    hideRoomInfo();
}

// --- UI helpers ---
function showRoomInfo(code) {
    const el = document.getElementById('room-info');
    const codeEl = document.getElementById('room-code-display');
    const playerCountEl = document.getElementById('player-count');
    
    if (el) el.classList.remove('hidden');
    if (codeEl) codeEl.textContent = code;
    if (playerCountEl) playerCountEl.textContent = mp.isHost ? (mp.connections.length + 1) : '?';
}

function hideRoomInfo() {
    const el = document.getElementById('room-info');
    if (el) el.classList.add('hidden');
}

function updatePlayerCount() {
    const el = document.getElementById('player-count');
    if (el && mp.isHost) {
        el.textContent = mp.connections.length + 1;
    }
}
