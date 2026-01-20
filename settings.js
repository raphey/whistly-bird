// Game settings with customization
const GameSettings = {
    // Difficulty presets (pipe spawn intervals in frames)
    difficulties: {
        'easiest': 180,    // 3.0 seconds at 60 FPS
        'easy': 150,       // 2.5 seconds (default)
        'medium': 120,     // 2.0 seconds
        'hard': 90,        // 1.5 seconds (original default)
        'hardest': 60      // 1.0 second
    },

    // Default values
    defaults: {
        gapMultiplier: 3,      // Gap height as multiple of bird height (2-5)
        minFreq: 440,          // Hz (A4)
        maxFreq: 830.61,       // Hz (G#5)
        pipeSpeed: 2,          // Pixels per frame (1-4)
        glideSpeed: 1.5,       // Constant descent speed when not whistling (0.5-3.0)
        difficulty: 'easy',    // Default difficulty level
        pipeSpawnInterval: 150 // Frames between pipes (matches 'easy')
    },

    // Current values
    current: {},

    // Initialize settings
    init: function() {
        this.current = { ...this.defaults };
        console.log('Settings initialized:', this.current);
    },

    // Update a setting
    set: function(key, value) {
        this.current[key] = value;
        console.log(`Setting updated: ${key} = ${value}`);
    },

    // Get a setting value
    get: function(key) {
        return this.current[key];
    },

    // Reset to defaults
    reset: function() {
        this.current = { ...this.defaults };
        console.log('Settings reset to defaults');
    },

    // Set difficulty level
    setDifficulty: function(level) {
        if (this.difficulties[level]) {
            this.current.difficulty = level;
            this.current.pipeSpawnInterval = this.difficulties[level];
            console.log(`Difficulty set to ${level}: ${this.difficulties[level]} frames`);
        } else {
            console.error(`Invalid difficulty: ${level}`);
        }
    }
};

// Initialize on load
GameSettings.init();
