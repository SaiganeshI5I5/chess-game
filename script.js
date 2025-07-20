/* ===== Enhanced Chess Game - FIXED VERSION ===== */

// Global game state
const board = [];
const moveHistory = [];
let selectedSquare = null;
let currentPlayer = "white";
let gameActive = false; // This was the main issue!

// Timer state
let whiteTime = 600;
let blackTime = 600;
let increment = 0;
let timerInterval = null;
let moveStartTime = 0;

// Audio elements
let backgroundMusic = null;
let audioContext = null;
let effectsMuted = false;

// Chess piece symbols
const pieceSymbols = {
    white: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
    black: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" }
};

// Initial board setup
const initialBoard = [
    [{type:'R',color:'black'},{type:'N',color:'black'},{type:'B',color:'black'},{type:'Q',color:'black'},{type:'K',color:'black'},{type:'B',color:'black'},{type:'N',color:'black'},{type:'R',color:'black'}],
    [{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'},{type:'P',color:'black'}],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'},{type:'P',color:'white'}],
    [{type:'R',color:'white'},{type:'N',color:'white'},{type:'B',color:'white'},{type:'Q',color:'white'},{type:'K',color:'white'},{type:'B',color:'white'},{type:'N',color:'white'},{type:'R',color:'white'}]
];

/* ===== Board Management ===== */
function initBoard() {
    board.length = 0;
    for (let i = 0; i < 8; i++) {
        board[i] = [...initialBoard[i]];
    }
    console.log("Board initialized"); // Debug logging
}

function renderBoard() {
    const boardElement = document.getElementById('chessBoard');
    if (!boardElement) {
        console.error("Board element not found!");
        return;
    }
    
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            
            const piece = board[row][col];
            if (piece) {
                const pieceElement = document.createElement('span');
                pieceElement.className = 'piece';
                pieceElement.textContent = pieceSymbols[piece.color][piece.type];
                square.appendChild(pieceElement);
            }
            
            // FIXED: Ensure event listener is properly attached
            square.addEventListener('click', handleSquareClick);
            boardElement.appendChild(square);
        }
    }
    console.log("Board rendered with event listeners"); // Debug logging
}

/* ===== FIXED Move Logic ===== */
function handleSquareClick(event) {
    // FIXED: Add comprehensive error handling and logging
    try {
        console.log("Square clicked!", event.currentTarget.dataset); // Debug
        
        if (!gameActive) {
            console.log("Game not active, ignoring click");
            return;
        }
        
        const row = parseInt(event.currentTarget.dataset.row);
        const col = parseInt(event.currentTarget.dataset.col);
        const clickedPiece = board[row][col];
        
        console.log(`Clicked square: ${row},${col}`, clickedPiece); // Debug
        
        // If no piece is selected
        if (!selectedSquare) {
            if (clickedPiece && clickedPiece.color === currentPlayer) {
                selectedSquare = { row, col };
                console.log("Piece selected:", selectedSquare); // Debug
                highlightSquare(row, col, 'selected');
                showValidMoves(row, col);
            } else {
                console.log("No valid piece to select");
            }
            return;
        }
        
        // If clicking the same square, deselect
        if (selectedSquare.row === row && selectedSquare.col === col) {
            console.log("Deselecting piece");
            clearHighlights();
            selectedSquare = null;
            return;
        }
        
        // If selecting a different piece of same color
        if (clickedPiece && clickedPiece.color === currentPlayer) {
            console.log("Selecting different piece");
            clearHighlights();
            selectedSquare = { row, col };
            highlightSquare(row, col, 'selected');
            showValidMoves(row, col);
            return;
        }
        
        // Try to make a move
        if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
            console.log("Making move");
            makeMove(selectedSquare.row, selectedSquare.col, row, col);
            clearHighlights();
            selectedSquare = null;
            endTurn();
        } else {
            console.log("Invalid move attempted");
            clearHighlights();
            selectedSquare = null;
        }
    } catch (error) {
        console.error("Error in handleSquareClick:", error);
    }
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;
    
    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) return false;
    
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    
    switch (piece.type) {
        case 'P': // Pawn
            if (piece.color === 'white') {
                if (colDiff === 0 && !targetPiece) {
                    if (rowDiff === -1) return true;
                    if (rowDiff === -2 && fromRow === 6) return true;
                }
                if (Math.abs(colDiff) === 1 && rowDiff === -1 && targetPiece) {
                    return true;
                }
            } else {
                if (colDiff === 0 && !targetPiece) {
                    if (rowDiff === 1) return true;
                    if (rowDiff === 2 && fromRow === 1) return true;
                }
                if (Math.abs(colDiff) === 1 && rowDiff === 1 && targetPiece) {
                    return true;
                }
            }
            break;
            
        case 'R': // Rook
            if (rowDiff === 0 || colDiff === 0) {
                return isPathClear(fromRow, fromCol, toRow, toCol);
            }
            break;
            
        case 'N': // Knight
            if ((Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
                (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2)) {
                return true;
            }
            break;
            
        case 'B': // Bishop
            if (Math.abs(rowDiff) === Math.abs(colDiff)) {
                return isPathClear(fromRow, fromCol, toRow, toCol);
            }
            break;
            
        case 'Q': // Queen
            if (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)) {
                return isPathClear(fromRow, fromCol, toRow, toCol);
            }
            break;
            
        case 'K': // King
            if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) {
                return true;
            }
            break;
    }
    
    return false;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol]) return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    
    return true;
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // Make the move
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    
    // Record move in history
    const moveText = generateMoveNotation(piece, fromRow, fromCol, toRow, toCol, capturedPiece);
    const timeSpent = Math.floor((Date.now() - moveStartTime) / 1000);
    
    moveHistory.push({
        player: currentPlayer,
        moveText: moveText,
        timeSpent: timeSpent
    });
    
    // Play sound effects
    if (capturedPiece) {
        playCaptureSound();
    } else {
        playMoveSound();
    }
    
    renderBoard(); // FIXED: Make sure board re-renders
    updateMoveHistory();
}

function generateMoveNotation(piece, fromRow, fromCol, toRow, toCol, captured) {
    const files = 'abcdefgh';
    const ranks = '87654321';
    
    const fromSquare = files[fromCol] + ranks[fromRow];
    const toSquare = files[toCol] + ranks[toRow];
    
    if (captured) {
        return `${pieceSymbols[piece.color][piece.type]}${fromSquare}×${toSquare}`;
    } else {
        return `${pieceSymbols[piece.color][piece.type]}${fromSquare}-${toSquare}`;
    }
}

function showValidMoves(row, col) {
    for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(row, col, toRow, toCol)) {
                const targetPiece = board[toRow][toCol];
                if (targetPiece) {
                    highlightSquare(toRow, toCol, 'capture-move');
                } else {
                    highlightSquare(toRow, toCol, 'valid-move');
                }
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

function clearHighlights() {
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'valid-move', 'capture-move');
    });
}

/* ===== Timer Management ===== */
function startTimer(baseTimeSeconds, incrementSeconds) {
    whiteTime = baseTimeSeconds;
    blackTime = baseTimeSeconds;
    increment = incrementSeconds;
    
    updateTimerDisplays();
    startMoveTimer();
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - moveStartTime) / 1000);
        
        if (currentPlayer === 'white') {
            const remaining = Math.max(0, whiteTime - elapsed);
            document.getElementById('whiteTime').textContent = formatTime(remaining);
            checkLowTime('white', remaining);
        } else {
            const remaining = Math.max(0, blackTime - elapsed);
            document.getElementById('blackTime').textContent = formatTime(remaining);
            checkLowTime('black', remaining);
        }
    }, 100);
}

function endTurn() {
    const timeSpent = Math.floor((Date.now() - moveStartTime) / 1000);
    
    if (currentPlayer === 'white') {
        whiteTime = Math.max(0, whiteTime - timeSpent + increment);
        if (whiteTime <= 0) {
            endGame('Black wins on time!');
            return;
        }
        currentPlayer = 'black';
    } else {
        blackTime = Math.max(0, blackTime - timeSpent + increment);
        if (blackTime <= 0) {
            endGame('White wins on time!');
            return;
        }
        currentPlayer = 'white';
    }
    
    updateGameStatus();
    updateTimerHighlights();
    startMoveTimer();
}

function startMoveTimer() {
    moveStartTime = Date.now();
}

function updateTimerDisplays() {
    document.getElementById('whiteTime').textContent = formatTime(whiteTime);
    document.getElementById('blackTime').textContent = formatTime(blackTime);
}

function updateTimerHighlights() {
    const whiteTimer = document.querySelector('.white-timer');
    const blackTimer = document.querySelector('.black-timer');
    
    whiteTimer.classList.toggle('active', currentPlayer === 'white');
    blackTimer.classList.toggle('active', currentPlayer === 'black');
}

function checkLowTime(player, timeRemaining) {
    const timerElement = player === 'white' ? 
        document.querySelector('.white-timer') : 
        document.querySelector('.black-timer');
    
    timerElement.classList.toggle('low-time', timeRemaining <= 30);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function pauseGame() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        document.getElementById('pauseBtn').textContent = '▶️ Resume';
        gameActive = false;
    } else {
        startTimer(whiteTime, increment);
        document.getElementById('pauseBtn').textContent = '⏸️ Pause';
        gameActive = true;
    }
}

function resetGame() {
    if (confirm('Start a new game? This will reset the current game.')) {
        location.reload();
    }
}

/* ===== Game Status ===== */
function updateGameStatus() {
    const statusElement = document.getElementById('gameStatus');
    if (statusElement) {
        statusElement.textContent = `${currentPlayer === 'white' ? '♔ White' : '♛ Black'} to move`;
    }
}

function endGame(message) {
    gameActive = false;
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    const statusElement = document.getElementById('gameStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
    alert(message);
}

/* ===== Move History ===== */
function updateMoveHistory() {
    const historyElement = document.getElementById('moveHistory');
    if (!historyElement) return;
    
    historyElement.innerHTML = '';
    
    if (moveHistory.length === 0) {
        historyElement.innerHTML = '<div class="no-moves">Game will begin once you make your first move</div>';
        return;
    }
    
    moveHistory.forEach((move, index) => {
        const moveElement = document.createElement('div');
        moveElement.className = `move-entry ${move.player}-move`;
        
        moveElement.innerHTML = `
            <span class="move-text">${index + 1}. ${move.moveText}</span>
            <span class="move-time">(${formatTime(move.timeSpent)})</span>
        `;
        
        historyElement.appendChild(moveElement);
    });
    
    historyElement.scrollTop = historyElement.scrollHeight;
}

/* ===== Audio System ===== */
function initAudioSystem() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio API not supported');
    }
    
    backgroundMusic = new Audio('audio/background-music.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.4;
    
    const musicToggle = document.getElementById('musicToggle');
    const musicVolume = document.getElementById('musicVolume');
    const effectsToggle = document.getElementById('effectsToggle');
    const masterVolume = document.getElementById('masterVolume');
    
    if (musicToggle) {
        musicToggle.addEventListener('click', () => {
            if (backgroundMusic.paused) {
                backgroundMusic.play().catch(e => console.log('Music play failed:', e));
                musicToggle.textContent = '⏸️ Pause';
                musicToggle.classList.remove('paused');
            } else {
                backgroundMusic.pause();
                musicToggle.textContent = '▶️ Play';
                musicToggle.classList.add('paused');
            }
        });
    }
    
    if (musicVolume) {
        musicVolume.addEventListener('input', () => {
            backgroundMusic.volume = musicVolume.value / 100 * (masterVolume.value / 100);
        });
    }
    
    if (effectsToggle) {
        effectsToggle.addEventListener('click', () => {
            effectsMuted = !effectsMuted;
            effectsToggle.textContent = effectsMuted ? '🔇 Off' : '🔊 On';
            effectsToggle.classList.toggle('muted', effectsMuted);
        });
    }
    
    if (masterVolume) {
        masterVolume.addEventListener('input', () => {
            const masterLevel = masterVolume.value / 100;
            backgroundMusic.volume = (musicVolume.value / 100) * masterLevel;
        });
    }
}

function playMoveSound() {
    if (effectsMuted || !audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Could not play move sound:', e);
    }
}

function playCaptureSound() {
    if (effectsMuted || !audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Could not play capture sound:', e);
    }
}

/* ===== FIXED Game Initialization ===== */
function initGame() {
    console.log("Initializing game..."); // Debug
    
    initBoard();
    renderBoard();
    initAudioSystem();
    updateGameStatus();
    updateTimerHighlights();
    
    // CRITICAL FIX: Set game as active!
    gameActive = true;
    console.log("Game is now active and ready for moves!"); // Debug
    
    // Control buttons
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    if (pauseBtn) pauseBtn.addEventListener('click', pauseGame);
    if (resetBtn) resetBtn.addEventListener('click', resetGame);
}

/* ===== FIXED Event Listeners ===== */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, setting up game..."); // Debug
    
    // Start game button
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('timeControlModal').style.display = 'flex';
        });
    }
    
    // Time control buttons
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', () => {
            const timeSeconds = parseInt(button.dataset.time);
            const incrementSeconds = parseInt(button.dataset.increment);
            
            document.getElementById('timeControlModal').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
            
            // CRITICAL: Initialize game BEFORE starting timer
            setTimeout(() => {
                initGame();
                startTimer(timeSeconds, incrementSeconds);
                console.log("Game fully initialized and timer started!"); // Debug
            }, 100); // Small delay to ensure DOM is ready
        });
    });
    
    // Custom time control
    const customBtn = document.getElementById('customTimeBtn');
    if (customBtn) {
        customBtn.addEventListener('click', () => {
            const minutes = parseInt(document.getElementById('customMinutes').value);
            const incrementSeconds = parseInt(document.getElementById('customIncrement').value);
            const timeSeconds = minutes * 60;
            
            document.getElementById('timeControlModal').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
            
            // CRITICAL: Initialize game BEFORE starting timer
            setTimeout(() => {
                initGame();
                startTimer(timeSeconds, incrementSeconds);
                console.log("Custom game fully initialized!"); // Debug
            }, 100);
        });
    }
});
