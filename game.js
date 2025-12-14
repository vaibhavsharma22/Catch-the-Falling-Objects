// Game state
const game = {
    score: 0,
    lives: 3,
    level: 1,
    isRunning: false,
    playerPosition: 50, // percentage from left
    fallingObjects: [],
    spawnInterval: null,
    gameLoop: null
};

// DOM elements
const gameArea = document.getElementById('game-area');
const player = document.getElementById('player');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const finalScoreDisplay = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

// Game configuration
const config = {
    playerSpeed: 2,
    objectSpeed: 3,
    spawnRate: 1500, // milliseconds
    goodObjectChance: 0.7 // 70% chance for good objects
};

// Initialize game
function init() {
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', resetGame);
    homeBtn.addEventListener('click', goHome);
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyboard);
    
    // Mouse controls
    gameArea.addEventListener('mousemove', handleMouse);
    
    // Touch controls
    gameArea.addEventListener('touchmove', handleTouch);
    gameArea.addEventListener('touchstart', handleTouch);
    
    // Create clouds
    createClouds();
}

// Create animated clouds
function createClouds() {
    const cloudCount = 5;
    for (let i = 0; i < cloudCount; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        
        // Random size
        const size = 80 + Math.random() * 60;
        cloud.style.width = size + 'px';
        cloud.style.height = size * 0.6 + 'px';
        
        // Random vertical position
        cloud.style.top = Math.random() * 40 + '%';
        
        // Random animation duration
        const duration = 20 + Math.random() * 30;
        cloud.style.animationDuration = duration + 's';
        
        // Random delay
        cloud.style.animationDelay = -Math.random() * duration + 's';
        
        gameArea.appendChild(cloud);
    }
}

// Start the game
function startGame() {
    startScreen.classList.add('hidden');
    game.isRunning = true;
    
    // Start spawning objects
    spawnObject(); // Spawn first object immediately
    game.spawnInterval = setInterval(spawnObject, config.spawnRate);
    
    // Start game loop
    game.gameLoop = setInterval(updateGame, 20);
}

// Spawn a falling object
function spawnObject() {
    if (!game.isRunning) return;
    
    const object = document.createElement('div');
    object.className = 'falling-object';
    
    // Determine if good or bad object
    const isGood = Math.random() < config.goodObjectChance;
    object.classList.add(isGood ? 'good' : 'bad');
    
    // Get object size based on screen size
    const objectSize = window.innerWidth < 480 ? 35 : (window.innerWidth < 768 ? 40 : 50);
    
    // Random horizontal position with proper bounds
    const randomX = Math.random() * (gameArea.offsetWidth - objectSize);
    object.style.left = randomX + 'px';
    
    // Calculate fall duration based on level
    const duration = Math.max(2, 4 - game.level * 0.3);
    object.style.animationDuration = duration + 's';
    
    // Store object data
    object.dataset.isGood = isGood;
    object.dataset.caught = 'false';
    
    gameArea.appendChild(object);
    game.fallingObjects.push(object);
}

// Update game state
function updateGame() {
    if (!game.isRunning) return;
    
    // Iterate backwards to safely remove items
    for (let i = game.fallingObjects.length - 1; i >= 0; i--) {
        const object = game.fallingObjects[i];
        
        if (!object || !object.parentNode) {
            game.fallingObjects.splice(i, 1);
            continue;
        }
        
        const objectRect = object.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();
        const gameAreaRect = gameArea.getBoundingClientRect();
        
        // Check collision with player first
        if (object.dataset.caught === 'false' && isColliding(objectRect, playerRect)) {
            object.dataset.caught = 'true';
            
            if (object.dataset.isGood === 'true') {
                // Caught good object - make it disappear immediately
                addScore(10);
                object.style.display = 'none';
            } else {
                // Caught bad object
                loseLife();
                object.style.display = 'none';
            }
            
            removeObject(object, i);
            continue;
        }
        
        // Check if object has passed the player (missed)
        // Add extra buffer zone on mobile to catch objects that are near the basket
        const missedThreshold = window.innerWidth < 768 ? playerRect.bottom - 10 : playerRect.bottom - 100;
        
        if (objectRect.top > missedThreshold) {
            // Object missed - lose life if it was good and not caught
            if (object.dataset.isGood === 'true' && object.dataset.caught === 'false') {
                loseLife();
            }
            removeObject(object, i);
        }
    }
}

// Check if two rectangles are colliding with tolerance for better mobile experience
function isColliding(rect1, rect2) {
    // Add generous tolerance based on screen size for better mobile catching
    const horizontalTolerance = window.innerWidth < 480 ? 25 : (window.innerWidth < 768 ? 20 : 10);
    const verticalTolerance = window.innerWidth < 480 ? 35 : (window.innerWidth < 768 ? 25 : 15);
    
    return !(rect1.right < rect2.left - horizontalTolerance || 
             rect1.left > rect2.right + horizontalTolerance || 
             rect1.bottom < rect2.top - verticalTolerance || 
             rect1.top > rect2.bottom + verticalTolerance);
}

// Remove object from game
function removeObject(object, index) {
    if (object && object.parentNode) {
        object.parentNode.removeChild(object);
    }
    game.fallingObjects.splice(index, 1);
}

// Add score
function addScore(points) {
    game.score += points;
    scoreDisplay.textContent = game.score;
    
    // Level up every 300 points
    const newLevel = Math.floor(game.score / 300) + 1;
    if (newLevel > game.level) {
        game.level = newLevel;
        levelDisplay.textContent = game.level;
        
        // Increase difficulty - spawn faster and objects fall faster
        clearInterval(game.spawnInterval);
        const newSpawnRate = Math.max(400, config.spawnRate - (game.level * 150));
        game.spawnInterval = setInterval(spawnObject, newSpawnRate);
    }
}

// Lose a life
function loseLife() {
    game.lives--;
    livesDisplay.textContent = game.lives;
    
    // Pulse animation
    livesDisplay.classList.add('pulse');
    setTimeout(() => livesDisplay.classList.remove('pulse'), 300);
    
    if (game.lives <= 0) {
        endGame();
    }
}

// End the game
function endGame() {
    game.isRunning = false;
    clearInterval(game.spawnInterval);
    clearInterval(game.gameLoop);
    
    // Remove all falling objects
    game.fallingObjects.forEach(object => {
        if (object && object.parentNode) {
            object.parentNode.removeChild(object);
        }
    });
    game.fallingObjects = [];
    
    // Show game over screen
    finalScoreDisplay.textContent = game.score;
    gameOverScreen.classList.remove('hidden');
}

// Reset game
function resetGame() {
    game.score = 0;
    game.lives = 3;
    game.level = 1;
    game.playerPosition = 50;
    
    scoreDisplay.textContent = game.score;
    livesDisplay.textContent = game.lives;
    levelDisplay.textContent = game.level;
    
    player.style.left = '50%';
    
    gameOverScreen.classList.add('hidden');
    startGame();
}

// Go to home screen
function goHome() {
    game.isRunning = false;
    clearInterval(game.spawnInterval);
    clearInterval(game.gameLoop);
    
    // Remove all falling objects
    game.fallingObjects.forEach(object => {
        if (object && object.parentNode) {
            object.parentNode.removeChild(object);
        }
    });
    game.fallingObjects = [];
    
    // Reset game state
    game.score = 0;
    game.lives = 3;
    game.level = 1;
    game.playerPosition = 50;
    
    scoreDisplay.textContent = game.score;
    livesDisplay.textContent = game.lives;
    levelDisplay.textContent = game.level;
    player.style.left = '50%';
    
    // Show start screen
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// Handle keyboard input
function handleKeyboard(e) {
    if (!game.isRunning) return;
    
    if (e.key === 'ArrowLeft') {
        game.playerPosition = Math.max(5, game.playerPosition - config.playerSpeed);
    } else if (e.key === 'ArrowRight') {
        game.playerPosition = Math.min(95, game.playerPosition + config.playerSpeed);
    }
    
    player.style.left = game.playerPosition + '%';
}

// Handle mouse input
function handleMouse(e) {
    if (!game.isRunning) return;
    
    const gameAreaRect = gameArea.getBoundingClientRect();
    const mouseX = e.clientX - gameAreaRect.left;
    const percentage = (mouseX / gameAreaRect.width) * 100;
    
    game.playerPosition = Math.max(5, Math.min(95, percentage));
    player.style.left = game.playerPosition + '%';
}

// Handle touch input
function handleTouch(e) {
    if (!game.isRunning) return;
    
    e.preventDefault(); // Prevent scrolling
    
    const touch = e.touches[0];
    const gameAreaRect = gameArea.getBoundingClientRect();
    const touchX = touch.clientX - gameAreaRect.left;
    const percentage = (touchX / gameAreaRect.width) * 100;
    
    game.playerPosition = Math.max(5, Math.min(95, percentage));
    player.style.left = game.playerPosition + '%';
}

// Initialize when page loads
init();
