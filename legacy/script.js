const POKEMON_COUNT_MAX = 1025; // All generations

// Elements
const screens = {
    menu: document.getElementById('menu-screen'),
    loading: document.getElementById('loading-screen'),
    game: document.getElementById('game-screen')
};

// Inputs
const inputs = {
    numTeams: document.getElementById('num-teams'),
    total: document.getElementById('total-cards'),
    assassin: document.getElementById('assassin-cards'),
    theme: document.getElementById('theme-select')
};

const teamsContainer = document.getElementById('teams-container');
const scoreBoardContainer = document.getElementById('score-board-container');

const TEAM_COLORS = [
    { id: 'red', name: 'Red Team (Start)', class: 'red-team' },
    { id: 'blue', name: 'Blue Team', class: 'blue-team' },
    { id: 'green', name: 'Green Team', class: 'green-team' },
    { id: 'yellow', name: 'Yellow Team', class: 'yellow-team' }
];

const settingsError = document.getElementById('settings-error');
const startBtn = document.getElementById('start-btn');

// Game UI Elements
const gameBoard = document.getElementById('game-board');
const spymasterBtn = document.getElementById('spymaster-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');

// Modal Elements
const modal = document.getElementById('game-over-modal');
const winnerText = document.getElementById('winner-text');
const gameOverReason = document.getElementById('game-over-reason');
const playAgainBtn = document.getElementById('play-again-btn');

// State
let gameState = {
    settings: { total: 20, numTeams: 2, teams: [4, 4], assassin: 1, theme: 'pokemon' },
    cards: [], // Array of objects: { id, name, image, role, revealed }
    remaining: {}, // e.g. { red: 4, blue: 4 }
    spymasterView: false,
    gameOver: false
};

// All fetched data for currently selected theme
let gameData = [];

// --- Menu Logic ---
function renderTeamSettings() {
    const num = parseInt(inputs.numTeams.value);
    
    // Attempt to retain previous values
    const previousValues = Array.from(teamsContainer.querySelectorAll('input[type="number"]')).map(input => parseInt(input.value));
    
    teamsContainer.innerHTML = '';
    
    for (let i = 0; i < num; i++) {
        const teamInfo = TEAM_COLORS[i];
        // Default to keeping previous value, or 4 if standard team, or 4 if newly created
        const val = previousValues[i] !== undefined ? previousValues[i] : 4;

        teamsContainer.innerHTML += `
            <div class="setting-group team-setting ${teamInfo.class}">
                <label for="team${i}-cards">${teamInfo.name}</label>
                <div class="number-input">
                    <button class="dec-btn" data-target="team${i}-cards"><i class="fas fa-minus"></i></button>
                    <input type="number" id="team${i}-cards" value="${val}" min="1" max="25" readonly>
                    <button class="inc-btn" data-target="team${i}-cards"><i class="fas fa-plus"></i></button>
                </div>
            </div>
        `;
    }
}

// Event delegation for dynamically added inputs
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button.dec-btn, button.inc-btn');
    if (!btn) return;
    
    const inputId = btn.getAttribute('data-target');
    const input = document.getElementById(inputId);
    if (!input) return;
    
    let val = parseInt(input.value);
    const min = parseInt(input.getAttribute('min'));
    const max = parseInt(input.getAttribute('max'));
    
    if (btn.classList.contains('inc-btn') && val < max) {
        val++;
    } else if (btn.classList.contains('dec-btn') && val > min) {
        val--;
    }

    if (inputId === 'num-teams') {
        input.value = val;
        renderTeamSettings();
    } else {
        input.value = val;
    }
    
    validateSettings();
});

function validateSettings() {
    const total = parseInt(inputs.total.value);
    const a = parseInt(inputs.assassin.value);
    
    let requiredCards = a;
    const num = parseInt(inputs.numTeams.value);
    
    for(let i=0; i<num; i++) {
        const teamInput = document.getElementById(`team${i}-cards`);
        if (teamInput) {
            requiredCards += parseInt(teamInput.value);
        }
    }
    
    if (requiredCards > total) {
        settingsError.textContent = `Error: Roles (${requiredCards}) exceed Total Cards (${total}). Increase Total or decrease roles.`;
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        return false;
    } else {
        settingsError.textContent = '';
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        return true;
    }
}

// --- Navigation ---
function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenId].classList.add('active');
}

// --- Initialization ---
async function fetchGameData() {
    const api = GAME_APIS[gameState.settings.theme];
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = api.loaderText;

    if (!api.cachedData) {
        try {
            api.cachedData = await api.fetchData();
        } catch (error) {
            console.error("Failed to fetch data", error);
            alert("Failed to load data. Please check your connection.");
            showScreen('menu'); // go back
            return false;
        }
    }
    gameData = api.cachedData;
    return true;
}

startBtn.addEventListener('click', async () => {
    if (!validateSettings()) return;
    
    // Save settings
    const numTeams = parseInt(inputs.numTeams.value);
    let teamSettingsArray = [];
    for(let i=0; i<numTeams; i++) {
        teamSettingsArray.push(parseInt(document.getElementById(`team${i}-cards`).value));
    }

    gameState.settings = {
        total: parseInt(inputs.total.value),
        numTeams: numTeams,
        teams: teamSettingsArray,
        assassin: parseInt(inputs.assassin.value),
        theme: inputs.theme.value
    };
    
    showScreen('loading');
    
    const success = await fetchGameData();
    if (success) {
        setupGame();
    }
});

// --- Game Logic ---
function setupGame() {
    gameState.gameOver = false;
    gameState.spymasterView = false;
    spymasterBtn.classList.remove('active');
    gameBoard.classList.remove('spymaster-view');
    modal.classList.add('hidden');
    
    gameState.remaining = {};
    for (let i = 0; i < gameState.settings.numTeams; i++) {
        const teamId = TEAM_COLORS[i].id;
        gameState.remaining[teamId] = gameState.settings.teams[i];
    }
    
    renderScoreBoard();

    // Select random unique data items
    let shuffledData = [...gameData].sort(() => 0.5 - Math.random());
    let selectedData = shuffledData.slice(0, gameState.settings.total);

    // Create roles array
    let roles = [];
    for (let i = 0; i < gameState.settings.numTeams; i++) {
        const teamId = TEAM_COLORS[i].id;
        for(let j=0; j<gameState.settings.teams[i]; j++) {
            roles.push(teamId);
        }
    }
    for(let i=0; i<gameState.settings.assassin; i++) roles.push('assassin');
    const neutrals = gameState.settings.total - roles.length;
    for(let i=0; i<neutrals; i++) roles.push('neutral');
    
    // Shuffle roles
    roles.sort(() => 0.5 - Math.random());

    // Assign cards
    gameState.cards = selectedData.map((item, index) => {
        return {
            id: item.id,
            name: item.name,
            image: item.image,
            role: roles[index],
            revealed: false
        };
    });

    renderBoard();
    
    // Broadcast initial state to connected guests
    broadcastState();
    updateGameRoomUI();
    
    // Simulate slight delay to show cool loader
    setTimeout(() => {
        showScreen('game');
    }, 500);
}

function renderScoreBoard() {
    scoreBoardContainer.innerHTML = '';
    
    for (let i = 0; i < gameState.settings.numTeams; i++) {
        const teamInfo = TEAM_COLORS[i];
        scoreBoardContainer.innerHTML += `
            <div class="score ${teamInfo.class.replace('team', 'score')}">
                <span class="label">${teamInfo.name.split(' ')[0]}</span>
                <span id="${teamInfo.id}-remaining">${gameState.remaining[teamInfo.id]}</span>
            </div>
        `;
    }
}

function updateScoreBoard() {
    for (let i = 0; i < gameState.settings.numTeams; i++) {
        const teamId = TEAM_COLORS[i].id;
        const el = document.getElementById(`${teamId}-remaining`);
        if (el) el.textContent = gameState.remaining[teamId];
    }
}

function renderBoard() {
    gameBoard.innerHTML = '';
    
    // Determine grid columns based on total cards for optimal layout
    let total = gameState.settings.total;
    let cols = 5;
    if (total <= 12) cols = 6;
    else if (total <= 20) cols = 7;
    else if (total <= 24) cols = 8;
    else if (total <= 35) cols = 9;
    else cols = 10;
    
    gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    gameState.cards.forEach((card, index) => {
        const hasImage = card.image !== null && card.image !== undefined;
        const cardEl = document.createElement('div');
        cardEl.className = `poke-card role-${card.role} ${card.revealed ? 'revealed' : ''} ${!hasImage ? 'text-only-card' : ''}`;
        cardEl.dataset.index = index;
        if (!hasImage) {
            // For CSS tooltip if the word gets truncated
            cardEl.dataset.fullname = card.name;
        }
        
        let innerContent = '';
        if (hasImage) {
            // Dynamic font-size: each char ≈ 0.65 × fontSize wide in SVG units
            const len = card.name.length;
            const maxFit = Math.floor(90 / (len * 0.72));
            const fontSize = Math.min(14, Math.max(4, maxFit));
            innerContent = `
                <img src="${card.image}" alt="${card.name}" loading="lazy">
                <div class="poke-name has-image-text">
                    <svg viewBox="0 0 100 20" preserveAspectRatio="xMidYMid meet">
                        <text x="50" y="12" font-size="${fontSize}">${card.name}</text>
                    </svg>
                </div>
            `;
        } else {
            // Text-only: Codenames style — large text at bottom, mirrored at top
            const len = card.name.length;
            const maxFit = Math.floor(90 / (len * 0.72));
            const mainSize = Math.min(28, Math.max(6, maxFit));
            const topSize = Math.round(mainSize * 0.6);
            innerContent = `
                <div class="poke-name">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        <text x="50" y="22" font-size="${topSize}" transform="rotate(180, 50, 22)">${card.name}</text>
                        <text x="50" y="82" font-size="${mainSize}">${card.name}</text>
                    </svg>
                </div>
            `;
        }

        cardEl.innerHTML = `
            <div class="role-overlay"></div>
            ${innerContent}
        `;
        
        cardEl.addEventListener('click', () => {
            // If guest in multiplayer, forward click to host instead
            if (mp.roomCode && !mp.isHost) {
                sendClickToHost(index);
                return;
            }
            handleCardClick(index);
        });
        gameBoard.appendChild(cardEl);
    });
}

function handleCardClick(index) {
    if (gameState.gameOver || gameState.spymasterView) return;
    
    const card = gameState.cards[index];
    if (card.revealed) return;
    
    card.revealed = true;
    
    const cardEl = gameBoard.children[index];
    cardEl.classList.add('revealed');
    
    if (gameState.remaining[card.role] !== undefined) {
        gameState.remaining[card.role]--;
    } else if (card.role === 'assassin') {
        endGame('assassin');
        return;
    }
    
    updateScoreBoard();
    checkWinCondition();
    
    // Broadcast updated state to guests
    broadcastState();
}

function checkWinCondition() {
    for (let i = 0; i < gameState.settings.numTeams; i++) {
        const teamId = TEAM_COLORS[i].id;
        if (gameState.remaining[teamId] === 0) {
            endGame(teamId);
            return;
        }
    }
}

function endGame(winner) {
    gameState.gameOver = true;
    
    // Soft reveal remaining cards
    gameState.cards.forEach((c, idx) => {
        if (!c.revealed) {
            gameBoard.children[idx].classList.add('revealed');
            // Give them slightly lower opacity to distinguish from actual clicked ones
            gameBoard.children[idx].style.opacity = '0.7'; 
        }
    });

    winnerText.className = '';
    
    if (winner === 'assassin') {
        winnerText.textContent = "Game Over!";
        winnerText.classList.add('winner-assassin');
        gameOverReason.textContent = "An assassin was selected!";
    } else {
        const teamInfo = TEAM_COLORS.find(t => t.id === winner);
        if (teamInfo) {
            winnerText.textContent = `${teamInfo.name.split(' ')[0]} Team Wins!`;
            winnerText.classList.add(`winner-${winner}`);
            gameOverReason.textContent = "They found all their agents.";
        }
    }
    
    setTimeout(() => {
        modal.classList.remove('hidden');
    }, 1500); // Wait a bit for dramatic effect so players can see the board
}

// --- Bindings ---
const viewBoardBtn = document.getElementById('view-board-btn');

viewBoardBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});

spymasterBtn.addEventListener('click', () => {
    gameState.spymasterView = !gameState.spymasterView;
    if (gameState.spymasterView) {
        spymasterBtn.classList.add('active');
        gameBoard.classList.add('spymaster-view');
    } else {
        spymasterBtn.classList.remove('active');
        gameBoard.classList.remove('spymaster-view');
    }
});

backToMenuBtn.addEventListener('click', () => {
    showScreen('menu');
});

playAgainBtn.addEventListener('click', () => {
    showScreen('menu');
});

// --- Multiplayer Bindings ---
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const roomCodeInput = document.getElementById('room-code-input');

createRoomBtn.addEventListener('click', async () => {
    const code = roomCodeInput.value.trim();
    if (!code) {
        alert('Enter a custom Room Name first, or I will generate a random one for you.');
    }
    createRoomBtn.disabled = true;
    createRoomBtn.textContent = 'Creating...';
    const okCode = await createRoom(code);
    createRoomBtn.disabled = false;
    createRoomBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Create Room';
    if (okCode) {
        document.getElementById('room-input-container').classList.add('hidden');
        document.getElementById('mp-action-buttons').classList.add('hidden');
        updateGameRoomUI();
    }
});

joinRoomBtn.addEventListener('click', async () => {
    const code = roomCodeInput.value.trim();
    if (!code) {
        alert('Please enter a Room Name to join.');
        roomCodeInput.focus();
        return;
    }
    joinRoomBtn.disabled = true;
    joinRoomBtn.textContent = 'Joining...';
    const ok = await joinRoom(code);
    joinRoomBtn.disabled = false;
    joinRoomBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Join Room';
    if (ok) {
        document.getElementById('room-input-container').classList.add('hidden');
        document.getElementById('mp-action-buttons').classList.add('hidden');
        updateGameRoomUI();
    }
});

roomCodeInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') joinRoomBtn.click();
});

leaveRoomBtn.addEventListener('click', () => {
    leaveRoom();
    document.getElementById('room-input-container').classList.remove('hidden');
    document.getElementById('mp-action-buttons').classList.remove('hidden');
    updateGameRoomUI();
});

// Guest: receive state from host and render it
mp.onStateReceived = (state) => {
    gameState.settings = state.settings;
    gameState.cards = state.cards;
    gameState.remaining = state.remaining;
    gameState.gameOver = state.gameOver;
    gameState.spymasterView = false;
    
    renderScoreBoard();
    renderBoard();
    updateScoreBoard();
    
    // Show game screen if not already
    showScreen('game');
    updateGameRoomUI();
    
    if (state.gameOver) {
        // Re-show end state
        gameState.cards.forEach((c, idx) => {
            if (!c.revealed) {
                gameBoard.children[idx].classList.add('revealed');
                gameBoard.children[idx].style.opacity = '0.7';
            }
        });
    }
};

function updateGameRoomUI() {
    const roomInfoGame = document.getElementById('room-info-game');
    const roomCodeGame = document.getElementById('room-code-game');
    const playerCountGame = document.getElementById('player-count-game');
    
    if (mp.roomCode) {
        if (roomInfoGame) roomInfoGame.classList.remove('hidden');
        if (roomCodeGame) roomCodeGame.textContent = mp.roomCode;
        if (playerCountGame) playerCountGame.textContent = mp.isHost ? (mp.connections.length + 1) : '?';
    } else {
        if (roomInfoGame) roomInfoGame.classList.add('hidden');
    }
}

// Init
renderTeamSettings();
validateSettings();
