// Main game initialization and loop
let game;
let audioAnalyzer;
let animationId;

// DOM elements
const canvas = document.getElementById('gameCanvas');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const scoreDisplay = document.getElementById('score');
const frequencyDisplay = document.getElementById('frequency');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreDisplay = document.getElementById('finalScore');

// Settings sliders
const gapSlider = document.getElementById('gapSlider');
const gapValue = document.getElementById('gapValue');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const gravitySlider = document.getElementById('gravitySlider');
const gravityValue = document.getElementById('gravityValue');

// Initialize game
function init() {
    audioAnalyzer = new AudioAnalyzer();
    game = new Game(canvas); // Don't pass audioAnalyzer yet, it's not initialized
    console.log('Game initialized, audioAnalyzer will be set after mic access');

    // Button event listeners
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    settingsBtn.addEventListener('click', toggleSettings);
    closeSettingsBtn.addEventListener('click', toggleSettings);

    // Settings slider listeners
    gapSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        gapValue.textContent = value;
        GameSettings.set('gapMultiplier', value);
        game.applySettings();
    });

    speedSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        speedValue.textContent = value;
        GameSettings.set('pipeSpeed', value);
        game.applySettings();
    });

    gravitySlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        gravityValue.textContent = value;
        GameSettings.set('gravity', value);
        game.applySettings();
    });
}

function toggleSettings() {
    settingsPanel.classList.toggle('hidden');
}

async function startGame() {
    console.log('Start game button clicked');

    // Initialize audio analyzer
    console.log('Initializing audio analyzer...');
    const audioReady = await audioAnalyzer.init();

    if (!audioReady) {
        console.log('Audio initialization failed');
        return;
    }

    console.log('Audio ready, starting game');
    console.log('About to set audioAnalyzer on game...');
    console.log('audioAnalyzer object:', audioAnalyzer);
    console.log('game object:', game);

    // Set audio analyzer on game (in case it wasn't available during init)
    game.setAudioAnalyzer(audioAnalyzer);

    console.log('After setAudioAnalyzer, checking game.audioAnalyzer:', game.audioAnalyzer);

    // Start game
    game.start();
    startBtn.classList.add('hidden');
    restartBtn.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // Start game loop
    gameLoop();
}

function restartGame() {
    // Ensure audio analyzer is still set
    game.setAudioAnalyzer(audioAnalyzer);

    game.start();
    restartBtn.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameLoop();
}

function gameLoop() {
    // Get current frequency
    const frequency = audioAnalyzer.getFrequency();

    // Update frequency display
    frequencyDisplay.textContent = Math.round(frequency);

    // Update bird position based on frequency
    game.updateBirdFromFrequency(frequency);

    // Update game state
    game.update();

    // Draw everything
    game.draw();

    // Update score display
    scoreDisplay.textContent = game.score;

    // Check if game over
    if (game.gameOver) {
        handleGameOver();
        return;
    }

    // Continue loop
    animationId = requestAnimationFrame(gameLoop);
}

function handleGameOver() {
    // Show game over screen
    gameOverScreen.classList.remove('hidden');
    finalScoreDisplay.textContent = game.score;
    restartBtn.classList.remove('hidden');

    // Cancel animation loop
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);
