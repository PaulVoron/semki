const COLS = 9;
const CLASSIC_NUMBERS = [1,2,3,4,5,6,7,8,9,1,1,1,2,1,3,1,4,1,5,1,6,1,7,1,8,1,9];

// State
let board = [];
let selectedIndex = null;
let history = []; 
let score = 0;
let isAnimating = false;
let pendingHint = null;

// DOM Elements
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const undoBtn = document.getElementById('undo-btn');
const addBtn = document.getElementById('add-btn');
const hintBtn = document.getElementById('hint-btn');
const gameOverOverlay = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

const startOverlay = document.getElementById('start-overlay');
const modeClassicBtn = document.getElementById('mode-classic-btn');
const modeRandomBtn = document.getElementById('mode-random-btn');
const headerRestartBtn = document.getElementById('header-restart-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

const hintOverlay = document.getElementById('hint-overlay');
const hintMyselfBtn = document.getElementById('hint-myself-btn');
const hintShowBtn = document.getElementById('hint-show-btn');

// Start Game Modes
modeClassicBtn.addEventListener('click', () => initGame('classic'));
modeRandomBtn.addEventListener('click', () => initGame('random'));

headerRestartBtn.addEventListener('click', () => {
    startOverlay.classList.remove('hidden');
});

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

restartBtn.addEventListener('click', () => {
    gameOverOverlay.classList.add('hidden');
    startOverlay.classList.remove('hidden');
});

// Initialization
function initGame(mode) {
    let initialNumbers = [];
    if (mode === 'classic') {
        initialNumbers = [...CLASSIC_NUMBERS];
    } else if (mode === 'random') {
        // 27 random numbers from 1 to 9
        for (let i = 0; i < 27; i++) {
            initialNumbers.push(Math.floor(Math.random() * 9) + 1);
        }
    }
    
    board = initialNumbers.map(val => ({ value: val, crossed: false }));
    selectedIndex = null;
    history = [];
    score = 0;
    isAnimating = false;
    pendingHint = null;
    
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    hintOverlay.classList.add('hidden');
    
    updateUI();
}

// Render the board
function renderBoard() {
    boardEl.innerHTML = '';
    
    // Find empty rows
    const numRows = Math.ceil(board.length / COLS);
    const emptyRows = new Set();
    
    for (let r = 0; r < numRows; r++) {
        let isRowEmpty = true;
        for (let c = 0; c < COLS; c++) {
            const index = r * COLS + c;
            if (index < board.length && !board[index].crossed) {
                isRowEmpty = false;
                break;
            }
        }
        if (isRowEmpty) {
            emptyRows.add(r);
        }
    }
    
    board.forEach((cell, index) => {
        const r = Math.floor(index / COLS);
        const cellEl = document.createElement('div');
        cellEl.className = 'cell';
        
        if (emptyRows.has(r)) {
            cellEl.classList.add('hidden-row');
        }
        
        cellEl.textContent = cell.value;
        cellEl.dataset.index = index;
        
        if (cell.crossed) {
            cellEl.classList.add('crossed');
        }
        if (index === selectedIndex) {
            cellEl.classList.add('selected');
        }
        
        cellEl.addEventListener('click', () => handleCellClick(index));
        boardEl.appendChild(cellEl);
    });
}

function updateUI() {
    renderBoard();
    scoreEl.textContent = score;
    undoBtn.disabled = history.length === 0;
    
    // Check if game won
    if (board.length > 0 && board.every(c => c.crossed)) {
        gameOverOverlay.classList.remove('hidden');
    }
}

// Interaction
function handleCellClick(index) {
    if (isAnimating) return;
    
    const cell = board[index];
    if (cell.crossed) return;
    
    if (selectedIndex === index) {
        selectedIndex = null;
        updateUI();
        return;
    }
    
    if (selectedIndex === null) {
        selectedIndex = index;
        updateUI();
        return;
    }
    
    const matchResult = checkMatch(selectedIndex, index);
    
    if (matchResult) {
        executeMatch(selectedIndex, index);
    } else {
        showError(index);
        selectedIndex = index; 
        updateUI();
    }
}

function checkMatch(i1, i2) {
    if (i1 === i2) return false;
    
    const c1 = board[i1];
    const c2 = board[i2];
    
    if (c1.crossed || c2.crossed) return false;
    
    const isValidValue = (c1.value === c2.value) || (c1.value + c2.value === 10);
    if (!isValidValue) return false;
    
    return isAdjacent(i1, i2);
}

function isAdjacent(i1, i2) {
    const minI = Math.min(i1, i2);
    const maxI = Math.max(i1, i2);
    
    // 1. Linear Adjacency (Horizontal & wrap-around)
    let linearAdjacent = true;
    for (let i = minI + 1; i < maxI; i++) {
        if (!board[i].crossed) {
            linearAdjacent = false;
            break;
        }
    }
    if (linearAdjacent) return true;
    
    // Coordinate Math
    const r1 = Math.floor(i1 / COLS);
    const c1 = i1 % COLS;
    const r2 = Math.floor(i2 / COLS);
    const c2 = i2 % COLS;
    
    // 2. Vertical Adjacency
    if (c1 === c2) {
        let verticalAdjacent = true;
        const minR = Math.min(r1, r2);
        const maxR = Math.max(r1, r2);
        for (let r = minR + 1; r < maxR; r++) {
            if (!board[r * COLS + c1].crossed) {
                verticalAdjacent = false;
                break;
            }
        }
        if (verticalAdjacent) return true;
    }
    
    return false;
}

function executeMatch(i1, i2) {
    isAnimating = true;
    
    const cellEl1 = boardEl.children[i1];
    const cellEl2 = boardEl.children[i2];
    
    cellEl1.classList.add('popping');
    cellEl2.classList.add('popping');
    
    setTimeout(() => {
        board[i1].crossed = true;
        board[i2].crossed = true;
        
        history.push({ type: 'match', i1, i2, scoreBefore: score });
        score += 10;
        
        selectedIndex = null;
        
        const r1 = Math.floor(i1 / COLS);
        const r2 = Math.floor(i2 / COLS);
        const rowsToCheck = new Set([r1, r2]);
        const newlyEmptyRows = [];
        
        rowsToCheck.forEach(r => {
            let isRowEmpty = true;
            for (let c = 0; c < COLS; c++) {
                const index = r * COLS + c;
                if (index < board.length && !board[index].crossed) {
                    isRowEmpty = false;
                    break;
                }
            }
            if (isRowEmpty) {
                newlyEmptyRows.push(r);
            }
        });
        
        if (newlyEmptyRows.length > 0) {
            scoreEl.textContent = score; 
            
            newlyEmptyRows.forEach(r => {
                for (let c = 0; c < COLS; c++) {
                    const index = r * COLS + c;
                    if (index < boardEl.children.length) {
                        boardEl.children[index].classList.add('crossed', 'hiding-row');
                    }
                }
            });
            
            setTimeout(() => {
                isAnimating = false;
                updateUI();
            }, 400); 
        } else {
            isAnimating = false;
            updateUI();
        }
        
    }, 300); 
}

function showError(index) {
    const cellEl = boardEl.children[index];
    cellEl.classList.add('error');
    setTimeout(() => {
        if (boardEl.children[index]) {
            boardEl.children[index].classList.remove('error');
        }
    }, 400);
}

// Add Numbers (+)
addBtn.addEventListener('click', () => {
    if (isAnimating) return;
    
    const uncrossed = board.filter(c => !c.crossed).map(c => c.value);
    if (uncrossed.length === 0) return;
    
    const startIndex = board.length;
    
    const newCells = uncrossed.map(val => ({ value: val, crossed: false, isNew: true }));
    board = [...board, ...newCells];
    
    history.push({ type: 'add', startIndex, scoreBefore: score });
    selectedIndex = null;
    
    updateUI();
    
    for (let i = startIndex; i < board.length; i++) {
        const cellEl = boardEl.children[i];
        if (cellEl) cellEl.classList.add('new-cell');
    }
    
    setTimeout(() => {
        for (let i = startIndex; i < board.length; i++) {
            const cellEl = boardEl.children[i];
            if (cellEl) cellEl.classList.remove('new-cell');
        }
        board.forEach(c => delete c.isNew);
    }, 400);
    
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
});

// Hint logic
hintBtn.addEventListener('click', () => {
    if (isAnimating) return;
    
    // Find first valid pair
    for (let i = 0; i < board.length; i++) {
        if (board[i].crossed) continue;
        
        for (let j = i + 1; j < board.length; j++) {
            if (board[j].crossed) continue;
            
            if (checkMatch(i, j)) {
                pendingHint = { i, j };
                hintOverlay.classList.remove('hidden');
                return;
            }
        }
    }
    
    // If no hint found, shake the hint button
    hintBtn.style.animation = 'shake 0.4s ease-in-out';
    setTimeout(() => { hintBtn.style.animation = ''; }, 400);
});

hintMyselfBtn.addEventListener('click', () => {
    pendingHint = null;
    hintOverlay.classList.add('hidden');
});

hintShowBtn.addEventListener('click', () => {
    hintOverlay.classList.add('hidden');
    if (!pendingHint) return;
    
    const { i, j } = pendingHint;
    const el1 = boardEl.children[i];
    const el2 = boardEl.children[j];
    
    if (el1 && el2) {
        el1.classList.add('hint');
        el2.classList.add('hint');
        
        selectedIndex = null;
        updateUI();
        
        // Restore hint classes after updateUI rebuilds DOM
        if (boardEl.children[i]) boardEl.children[i].classList.add('hint');
        if (boardEl.children[j]) boardEl.children[j].classList.add('hint');
        
        boardEl.children[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            if (boardEl.children[i]) boardEl.children[i].classList.remove('hint');
            if (boardEl.children[j]) boardEl.children[j].classList.remove('hint');
        }, 1500);
    }
    
    pendingHint = null;
});

// Undo functionality
undoBtn.addEventListener('click', () => {
    if (history.length === 0 || isAnimating) return;
    
    const lastAction = history.pop();
    
    if (lastAction.type === 'match') {
        board[lastAction.i1].crossed = false;
        board[lastAction.i2].crossed = false;
        score = lastAction.scoreBefore;
        selectedIndex = null;
    } else if (lastAction.type === 'add') {
        board.splice(lastAction.startIndex);
        score = lastAction.scoreBefore;
        selectedIndex = null;
    }
    
    updateUI();
});

// Instead of initGame() immediately, we just wait on start screen
// Start screen is visible by default in HTML.
