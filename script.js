/* ===== Enhanced Chess Game - Complete Working Version ===== */

// Global game state variables
let board = [];
let moveHistory = [];
let selectedSquare = null;
let currentPlayer = "white";
let gameActive = false;

// Timer variables
let whiteTime = 600;
let blackTime = 600;
let increment = 0;
let timerInterval = null;
let moveStartTime = 0;
let isPaused = false;

// Audio variables
let backgroundMusic = null;
let audioContext = null;
let effectsMuted = false;
let musicPlaying = false;

// Chess piece Unicode symbols
const pieceSymbols = {
    white: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
    black: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" }
};

// Initial chess board setup
const initialBoardState = [
    [{type:'R',color:'black'},{type:'N',color:'black'},{type:'B',color:'black'},{type:'Q',color:'black'},{type:'K',color:'black'},{type:'B',color:'black'},{type:'N',color:'black'},{type:'R',color:'black'}],
    [{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'}],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'}],
    [{type:'R',color:'white'},{type:'N',color:'white'},{type:'B',color:'white'},{type:'Q',color:'white'},{type:'K',color:'white'},{type:'B',color:'white'},{type:'N',color:'white'},{type:'R',color:'white'}]
];

/* ===== BOARD MANAGEMENT ===== */

function initializeBoard() {
    // Deep copy the initial board state
    board = initialBoardState.map(row => row.map(cell => cell ? {...cell} : null));
    console.log("✅ Board initialized successfully");
}

function renderChessBoard() {
    const boardElement = document.getElementById('chessBoard');
    if (!boardElement) {
        console.error("❌ Chess board element not found!");
        return;
    }
    
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            
            // Add piece if present
            const piece = board[row][col];
            if (piece) {
                const pieceElement = document.createElement('span');
                pieceElement.className = 'piece';
                pieceElement.textContent = pieceSymbols[piece.color][piece.type];
                square.appendChild(pieceElement);
            }
            
            // Attach click event listener - CRITICAL FIX
            square.addEventListener('click', handleSquareClick, { capture: true });
            square.style.cursor = 'pointer';
            
            boardElement.appendChild(square);
        }
    }
    
    console.log("✅ Board rendered with 64 squares and event listeners");
}

/* ===== MOVE HANDLING SYSTEM ===== */

function handleSquareClick(event) {
    // Prevent event bubbling and default behavior
    event.preventDefault();
    event.stopPropagation();
    
    if (!gameActive) {
        console.log("⚠️ Game not active - click ignored");
        updateGameStatus("Please start a game first!");
        return;
    }
    
    const row = parseInt(event.currentTarget.dataset.row);
    const col = parseInt(event.currentTarget.dataset.col);
    const clickedPiece = board[row][col];
    
    console.log(`🎯 Square clicked: (${row}, ${col})`, clickedPiece);
    
    // No piece selected - select a piece
    if (!selectedSquare) {
        if (clickedPiece && clickedPiece.color === currentPlayer) {
            selectedSquare = { row, col, piece: clickedPiece };
            console.log("✅ Piece selected:", selectedSquare);
            
            clearAllHighlights();
            highlightSquare(row, col, 'selected');
            showValidMovesForPiece(row, col);
            updateGameStatus(`${clickedPiece.type} selected. Click a highlighted square to move.`);
        } else {
            updateGameStatus(`Select a ${currentPlayer} piece to move.`);
        }
        return;
    }
    
    // Same square clicked - deselect
    if (selectedSquare.row === row && selectedSquare.col === col) {
        clearAllHighlights();
        selectedSquare = null;
        updateGameStatus(`${currentPlayer === 'white' ? '♔ White' : '♛ Black'} to move`);
        return;
    }
    
    // Different piece of same color - reselect
    if (clickedPiece && clickedPiece.color === currentPlayer) {
        selectedSquare = { row, col, piece: clickedPiece };
        clearAllHighlights();
        highlightSquare(row, col, 'selected');
        showValidMovesForPiece(row, col);
        return;
    }
    
    // Attempt to make a move
    if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
        console.log("✅ Valid move - executing");
        executeMove(selectedSquare.row, selectedSquare.col, row, col);
        clearAllHighlights();
        selectedSquare = null;
        switchTurns();
    } else {
        console.log("❌ Invalid move attempted");
        updateGameStatus("Invalid move! Try selecting a highlighted square.");
    }
}

/* ===== MOVE VALIDATION LOGIC ===== */

function isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;
    
    // Can't capture own piece
    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) return false;
    
    // Calculate movement differences
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    
    switch (piece.type) {
        case 'P': // Pawn movement
            return validatePawnMove(piece, fromRow, fromCol, toRow, toCol, rowDiff, colDiff, targetPiece);
        case 'R': // Rook movement
            return (rowDiff === 0 || colDiff === 0) && isPathClear(fromRow, fromCol, toRow, toCol);
        case 'N': // Knight movement
            return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
        case 'B': // Bishop movement
            return absRowDiff === absColDiff && isPathClear(fromRow, fromCol, toRow, toCol);
        case 'Q': // Queen movement
            return (rowDiff === 0 || colDiff === 0 || absRowDiff === absColDiff) && 
                   isPathClear(fromRow, fromCol, toRow, toCol);
        case 'K': // King movement
            return absRowDiff <= 1 && absColDiff <= 1;
        default:
            return false;
    }
}

function validatePawnMove(piece, fromRow, fromCol, toRow, toCol, rowDiff, colDiff, targetPiece) {
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;
    
    // Forward move
    if (colDiff === 0 && !targetPiece) {
        if (rowDiff === direction) return true; // One square forward
        if (fromRow === startRow && rowDiff === 2 * direction) return true; // Two squares from start
    }
    
    // Diagonal capture
    if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece) {
        return true;
    }
    
    return false;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol] !== null) {
            return false;
        }
        currentRow += rowStep;
        currentCol += colStep;
    }
    
    return true;
}

/* ===== MOVE EXECUTION ===== */

function executeMove(fromRow, fromCol, toRow, toCol) {
    const movingPiece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // Execute the move
    board[toRow][toCol] = movingPiece;
    board[fromRow][fromCol] = null;
    
    // Record move in history
    const moveNotation = generateMoveNotation(movingPiece, fromRow, fromCol, toRow, toCol, capturedPiece);
    const timeSpent = Math.floor((Date.now() - moveStartTime) / 1000);
    
    moveHistory.push({
        player: currentPlayer,
        moveText: moveNotation,
        timeSpent: timeSpent,
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol }
    });
    
    // Play appropriate sound effect
    if (capturedPiece) {
        playCaptureSound();
    } else {
        playMoveSound();
    }
    
    // Re-render board and update displays
    renderChessBoard();
    updateMoveHistoryDisplay();
    
    console.log(`✅ Move executed: ${moveNotation}`);
}

function generateMoveNotation(piece, fromRow, fromCol, toRow, toCol, captured) {
    const files = 'abcdefgh';
    const ranks = '87654321';
    
    const fromSquare = files[fromCol] + ranks[fromRow];
    const toSquare = files[toCol] + ranks[toRow];
    const pieceSymbol = pieceSymbols[piece.color][piece.type];
    
    if (captured) {
        return `${pieceSymbol}${fromSquare} × ${toSquare}`;
    } else {
        return `${pieceSymbol}${fromSquare} - ${toSquare}`;
    }
}

/* ===== VISUAL FEEDBACK SYSTEM ===== */

function showValidMovesForPiece(row, col) {
    for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(row, col, toRow, toCol)) {
                const targetPiece = board[toRow][toCol];
                const className = targetPiece ? 'capture-move' : 'valid-move';
                highlightSquare(toRow, toCol, className);
            }
        }
    }
}

function highlightSquare(row, col, className) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (square) {
        square.classList.add(className);
    }
}

function clearAllHighlights() {
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'valid-move', 'capture-move');
    });
}

/* ===== TIMER MANAGEMENT SYSTEM ===== */

function startGameTimer(baseTimeSeconds, incrementSeconds) {
    whiteTime = baseTimeSeconds;
    blackTime = baseTimeSeconds;
    increment = incrementSeconds;
    
    updateTimerDisplays();
    startMoveTimer();
    updateActivePlayerHighlight();
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (isPaused) return;
        
        const elapsed = Math.floor((Date.now() - moveStartTime) / 1000);
        
        if (currentPlayer === 'white') {
            const remaining = Math.max(0, whiteTime - elapsed);
            document.getElementById('whiteTime').textContent = formatTimeDisplay(remaining);
            checkForLowTime('white', remaining);
        } else {
            const remaining = Math.max(0, blackTime - elapsed);
            document.getElementById('blackTime').textContent = formatTimeDisplay(remaining);
            checkForLowTime('black', remaining);
        }
    }, 100);
    
    console.log(`⏰ Timer started: ${baseTimeSeconds}s + ${incrementSeconds}s increment`);
}

function switchTurns() {
    const moveTime = Math.floor((Date.now() - moveStartTime) / 1000);
    
    if (currentPlayer === 'white') {
        whiteTime = Math.max(0, whiteTime - moveTime + increment);
        if (whiteTime <= 0) {
            endGame('Black wins on time! ⏱️');
            return;
        }
        currentPlayer = 'black';
    } else {
        blackTime = Math.max(0, blackTime - moveTime + increment);
        if (blackTime <= 0) {
            endGame('White wins on time! ⏱️');
            return;
        }
        currentPlayer = 'white';
    }
    
    updateGameStatus(`${currentPlayer === 'white' ? '♔ White' : '♛ Black'} to move`);
    updateActivePlayerHighlight();
    startMoveTimer();
    updateTimerDisplays();
}

function startMoveTimer() {
    moveStartTime = Date.now();
}

function updateTimerDisplays() {
    const whiteDisplay = document.getElementById('whiteTime');
    const blackDisplay = document.getElementById('blackTime');
    
    if (whiteDisplay) whiteDisplay.textContent = formatTimeDisplay(whiteTime);
    if (blackDisplay) blackDisplay.textContent = formatTimeDisplay(blackTime);
}

function updateActivePlayerHighlight() {
    const whiteTimer = document.querySelector('.white-timer');
    const blackTimer = document.querySelector('.black-timer');
    
    if (whiteTimer && blackTimer) {
        whiteTimer.classList.toggle('active', currentPlayer === 'white');
        blackTimer.classList.toggle('active', currentPlayer === 'black');
    }
}

function checkForLowTime(player, timeRemaining) {
    const timerElement = player === 'white' ? 
        document.querySelector('.white-timer') : 
        document.querySelector('.black-timer');
    
    if (timerElement) {
        timerElement.classList.toggle('low-time', timeRemaining <= 30);
        
        // Audio warning for very low time
        if (timeRemaining === 10 && !effectsMuted) {
            playLowTimeWarning();
        }
    }
}

function formatTimeDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function pauseGame() {
    const pauseBtn = document.getElementById('pauseBtn');
    if (!pauseBtn) return;
    
    if (isPaused) {
        isPaused = false;
        pauseBtn.textContent = '⏸️ Pause';
        startMoveTimer();
        gameActive = true;
    } else {
        isPaused = true;
        pauseBtn.textContent = '▶️ Resume';
        gameActive = false;
    }
}

function resetGame() {
    if (confirm('Are you sure you want to start a new game?')) {
        location.reload();
    }
}

/* ===== MOVE HISTORY SYSTEM ===== */

function updateMoveHistoryDisplay() {
    const historyElement = document.getElementById('moveHistory');
    if (!historyElement) return;
    
    historyElement.innerHTML = '';
    
    if (moveHistory.length === 0) {
        historyElement.innerHTML = '<div class="no-moves">Make your first move to begin!</div>';
        return;
    }
    
    moveHistory.forEach((move, index) => {
        const moveElement = document.createElement('div');
        moveElement.className = `move-entry ${move.player}-move`;
        
        moveElement.innerHTML = `
            <span class="move-text">${index + 1}. ${move.moveText}</span>
            <span class="move-time">(${formatTimeDisplay(move.timeSpent)})</span>
        `;
        
        historyElement.appendChild(moveElement);
    });
    
    // Auto-scroll to bottom
    historyElement.scrollTop = historyElement.scrollHeight;
}

/* ===== AUDIO SYSTEM ===== */

function initializeAudioSystem() {
    // Initialize Web Audio Context
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("🎵 Audio context initialized");
    } catch (e) {
        console.log("❌ Web Audio API not supported");
    }
    
    // Initialize background music
    try {
        backgroundMusic = new Audio('audio/background-music.mp3');
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.3;
    } catch (e) {
        console.log("❌ Background music file not found");
    }
    
    // Set up audio controls
    setupAudioControls();
}

function setupAudioControls() {
    const musicToggle = document.getElementById('musicToggle');
    const musicVolume = document.getElementById('musicVolume');
    const effectsToggle = document.getElementById('effectsToggle');
    const masterVolume = document.getElementById('masterVolume');
    
    if (musicToggle) {
        musicToggle.addEventListener('click', toggleBackgroundMusic);
    }
    
    if (musicVolume) {
        musicVolume.addEventListener('input', updateMusicVolume);
    }
    
    if (effectsToggle) {
        effectsToggle.addEventListener('click', toggleSoundEffects);
    }
    
    if (masterVolume) {
        masterVolume.addEventListener('input', updateMasterVolume);
    }
}

function toggleBackgroundMusic() {
    const musicToggle = document.getElementById('musicToggle');
    if (!musicToggle || !backgroundMusic) return;
    
    if (musicPlaying) {
        backgroundMusic.pause();
        musicToggle.textContent = '▶️ Play';
        musicToggle.classList.add('paused');
        musicPlaying = false;
    } else {
        backgroundMusic.play().then(() => {
            musicToggle.textContent = '⏸️ Pause';
            musicToggle.classList.remove('paused');
            musicPlaying = true;
        }).catch(e => {
            console.log("Music playback failed:", e);
        });
    }
}

function updateMusicVolume() {
    const musicVolume = document.getElementById('musicVolume');
    const masterVolume = document.getElementById('masterVolume');
    
    if (backgroundMusic && musicVolume && masterVolume) {
        const volume = (musicVolume.value / 100) * (masterVolume.value / 100);
        backgroundMusic.volume = volume;
    }
}

function toggleSoundEffects() {
    const effectsToggle = document.getElementById('effectsToggle');
    if (!effectsToggle) return;
    
    effectsMuted = !effectsMuted;
    effectsToggle.textContent = effectsMuted ? '🔇 Off' : '🔊 On';
    effectsToggle.classList.toggle('muted', effectsMuted);
}

function updateMasterVolume() {
    updateMusicVolume(); // This will apply master volume to music
}

// Sound effect functions
function playMoveSound() {
    if (effectsMuted || !audioContext) return;
    createToneSound(800, 0.1, 0.1);
}

function playCaptureSound() {
    if (effectsMuted || !audioContext) return;
    createToneSound(400, 0.2, 0.2);
}

function playLowTimeWarning() {
    if (effectsMuted || !audioContext) return;
    createToneSound(600, 0.3, 0.5);
}

function createToneSound(frequency, gain, duration) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log("Sound generation failed:", e);
    }
}

/* ===== GAME STATE MANAGEMENT ===== */

function updateGameStatus(message) {
    const statusElement = document.getElementById('gameStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function endGame(message) {
    gameActive = false;
    isPaused = true;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    updateGameStatus(message);
    
    setTimeout(() => {
        alert(message + '\n\nClick "New Game" to play again.');
    }, 100);
    
    console.log(`🏁 Game ended: ${message}`);
}

/* ===== GAME INITIALIZATION ===== */

function initializeChessGame() {
    console.log("🚀 Initializing chess game...");
    
    try {
        // Initialize game components
        initializeBoard();
        renderChessBoard();
        initializeAudioSystem();
        
        // Reset game state
        currentPlayer = "white";
        selectedSquare = null;
        moveHistory = [];
        gameActive = true;
        isPaused = false;
        
        // Update displays
        updateGameStatus("♔ White to move - Click any white piece to start!");
        updateActivePlayerHighlight();
        updateMoveHistoryDisplay();
        
        // Set up control buttons
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        if (pauseBtn) pauseBtn.addEventListener('click', pauseGame);
        if (resetBtn) resetBtn.addEventListener('click', resetGame);
        
        console.log("✅ Chess game initialized successfully!");
        
        // Show success message
        setTimeout(() => {
            alert("🎉 Chess game ready! Click any white piece (bottom two rows) to make your first move.");
        }, 500);
        
    } catch (error) {
        console.error("❌ Error initializing game:", error);
        alert("Error initializing the chess game. Please refresh and try again.");
    }
}

/* ===== EVENT LISTENERS & STARTUP ===== */

document.addEventListener('DOMContentLoaded', function() {
    console.log("📱 DOM loaded, setting up game interface...");
    
    // Welcome screen button
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', function() {
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('timeControlModal').style.display = 'flex';
        });
    }
    
    // Time control buttons
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', function() {
            const timeSeconds = parseInt(this.dataset.time);
            const incrementSeconds = parseInt(this.dataset.increment);
            
            // Hide modal and show game
            document.getElementById('timeControlModal').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
            
            // Initialize game with selected time control
            setTimeout(() => {
                initializeChessGame();
                startGameTimer(timeSeconds, incrementSeconds);
            }, 200);
        });
    });
    
    // Custom time control button
    const customTimeBtn = document.getElementById('customTimeBtn');
    if (customTimeBtn) {
        customTimeBtn.addEventListener('click', function() {
            const minutes = parseInt(document.getElementById('customMinutes').value) || 10;
            const incrementSeconds = parseInt(document.getElementById('customIncrement').value) || 0;
            const timeSeconds = minutes * 60;
            
            // Hide modal and show game
            document.getElementById('timeControlModal').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
            
            // Initialize game with custom time control
            setTimeout(() => {
                initializeChessGame();
                startGameTimer(timeSeconds, incrementSeconds);
            }, 200);
        });
    }
    
    console.log("✅ Event listeners set up successfully");
});

/* ===== DEBUG AND TESTING FUNCTIONS ===== */

// Expose some functions for debugging (remove in production)
window.debugChess = {
    showBoard: () => console.table(board),
    showGameState: () => console.log({
        gameActive,
        currentPlayer,
        selectedSquare,
        whiteTime,
        blackTime
    }),
    forceMove: (from, to) => {
        if (isValidMove(from.row, from.col, to.row, to.col)) {
            executeMove(from.row, from.col, to.row, to.col);
            switchTurns();
        } else {
            console.log("Invalid debug move");
        }
    }
};

console.log("🎮 Enhanced Chess Game loaded successfully!");
console.log("Use window.debugChess for debugging functions");
