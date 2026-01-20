// Game engine for Whistly Bird
class Game {
    constructor(canvas, audioAnalyzer = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.audioAnalyzer = audioAnalyzer;

        // Game state
        this.isPlaying = false;
        this.score = 0;
        this.gameOver = false;

        // Bird properties
        this.bird = {
            x: 80,
            y: this.height / 2,
            width: 34,
            height: 24,
            targetY: this.height / 2,
            velocity: 0,
            smoothing: 0.15,
            isWhistling: false,
            glideSpeed: 1.5,  // Constant descent speed when not whistling
            isLocked: false,  // True when coasting after clearing a pipe
            lockEndTime: 0    // When the lock expires
        };

        // Pipes
        this.pipes = [];
        this.pipeWidth = 52;
        this.pipeSpawnTimer = 0;
        this.pipeSpawnInterval = 150; // frames (default: easy difficulty)

        // Load sprites
        this.sprites = {};
        this.loadSprites();

        // Animation
        this.frame = 0;

        // Note grid and frequency range (set by applySettings)
        this.notes = [];
        this.minFreq = 0;
        this.maxFreq = 0;
        this.pipeGap = 0;
        this.pipeSpeed = 0;

        // Apply settings
        this.applySettings();
    }

    setAudioAnalyzer(audioAnalyzer) {
        console.log('setAudioAnalyzer called with:', audioAnalyzer);
        this.audioAnalyzer = audioAnalyzer;
        console.log('AudioAnalyzer set on game:', !!this.audioAnalyzer);
        console.log('Verifying - this.audioAnalyzer:', this.audioAnalyzer);
    }

    applySettings() {
        // Get values from settings
        this.bird.glideSpeed = GameSettings.get('glideSpeed');
        this.pipeGap = this.bird.height * GameSettings.get('gapMultiplier');
        this.pipeSpeed = GameSettings.get('pipeSpeed');
        this.minFreq = GameSettings.get('minFreq');
        this.maxFreq = GameSettings.get('maxFreq');
        this.pipeSpawnInterval = GameSettings.get('pipeSpawnInterval');

        // Update note grid for new frequency range
        this.updateNoteGrid();
    }

    updateNoteGrid() {
        // Generate note grid based on current frequency range
        // Extended chromatic scale for better note detection
        this.notes = [
            { name: 'A4', freq: 440.00 },
            { name: 'A#4', freq: 466.16 },
            { name: 'B4', freq: 493.88 },
            { name: 'C5', freq: 523.25 },
            { name: 'C#5', freq: 554.37 },
            { name: 'D5', freq: 587.33 },
            { name: 'D#5', freq: 622.25 },
            { name: 'E5', freq: 659.25 },
            { name: 'F5', freq: 698.46 },
            { name: 'F#5', freq: 739.99 },
            { name: 'G5', freq: 783.99 },
            { name: 'G#5', freq: 830.61 }
        ];
    }

    getClosestNoteName(frequency) {
        // Find the closest note to the given frequency
        let closestNote = this.notes[0];
        let minDiff = Math.abs(Math.log(frequency) - Math.log(closestNote.freq));

        for (const note of this.notes) {
            const diff = Math.abs(Math.log(frequency) - Math.log(note.freq));
            if (diff < minDiff) {
                minDiff = diff;
                closestNote = note;
            }
        }

        return closestNote.name;
    }

    loadSprites() {
        const spriteNames = [
            'background-day',
            'bluebird-midflap',
            'pipe-green',
            'base'
        ];

        spriteNames.forEach(name => {
            const img = new Image();
            img.src = `sprites/${name}.png`;
            this.sprites[name] = img;
        });
    }

    start() {
        this.isPlaying = true;
        this.gameOver = false;
        this.score = 0;
        this.bird.y = this.height / 2;
        this.bird.targetY = this.height / 2;
        this.bird.velocity = 0;
        this.bird.isLocked = false;
        this.bird.lockEndTime = 0;
        this.bird.isWhistling = false;
        this.pipes = [];
        this.pipeSpawnTimer = 0;

        // Apply current settings
        this.applySettings();
    }

    updateBirdFromFrequency(frequency) {
        if (!this.isPlaying || this.gameOver) return;

        // If bird is locked (coasting after success), ignore whistle input
        if (this.bird.isLocked) {
            this.bird.isWhistling = false;
            return;
        }

        // Check if we have a strong enough whistle signal
        if (frequency >= this.minFreq && frequency <= this.maxFreq) {
            this.bird.isWhistling = true;

            // Use the same mapping as freqToY for consistent positioning
            this.bird.targetY = this.freqToY(frequency);
            this.bird.velocity = 0; // Reset velocity when actively whistling
        } else {
            // Not whistling - enter coast/fall mode
            this.bird.isWhistling = false;
        }
    }

    freqToY(frequency) {
        // Convert frequency to Y position using logarithmic scale
        const logFreq = Math.log(frequency);
        const logMin = Math.log(this.minFreq);
        const logMax = Math.log(this.maxFreq);

        const normalized = (logFreq - logMin) / (logMax - logMin);

        // Map to center 70% of screen, leaving margins for pipe visibility
        const birdMinY = this.bird.height / 2;
        const birdMaxY = this.height - this.bird.height / 2;
        const fullRange = birdMaxY - birdMinY;

        // Use 70% of range, centered
        const margin = fullRange * 0.15;  // 15% margin top and bottom
        const usableRange = fullRange - (2 * margin);
        const centerY = (birdMinY + birdMaxY) / 2;

        return centerY + (usableRange / 2) - (normalized * usableRange);
    }

    update() {
        if (!this.isPlaying || this.gameOver) return;

        this.frame++;

        // Check if bird lock has expired
        if (this.bird.isLocked && this.frame >= this.bird.lockEndTime) {
            this.bird.isLocked = false;
            console.log('Bird unlocked, whistle input resumed');
        }

        // Update bird position based on mode
        if (this.bird.isWhistling) {
            // Whistling mode: smoothly move toward target pitch
            const dy = this.bird.targetY - this.bird.y;
            this.bird.y += dy * this.bird.smoothing;
            this.bird.velocity = 0;
        } else {
            // Glide mode: steady descent at constant speed
            this.bird.y += this.bird.glideSpeed;
            this.bird.velocity = this.bird.glideSpeed;
        }

        // Keep bird on screen
        this.bird.y = Math.max(
            this.bird.height / 2,
            Math.min(this.height - this.bird.height / 2, this.bird.y)
        );

        // Clamp velocity when hitting bounds
        if (this.bird.y <= this.bird.height / 2 ||
            this.bird.y >= this.height - this.bird.height / 2) {
            this.bird.velocity = 0;
        }

        // Update pipes
        this.pipes.forEach(pipe => {
            pipe.x -= this.pipeSpeed;

            // Check if passed pipe (for scoring)
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;

                // Play the target note sound
                if (this.audioAnalyzer && pipe.targetFreq) {
                    const toneDuration = 0.45; // seconds
                    console.log(`✓ Passed pipe! Playing ${pipe.targetNote} (${pipe.targetFreq.toFixed(2)} Hz) for ${toneDuration}s`);
                    this.audioAnalyzer.playTone(pipe.targetFreq, toneDuration);

                    // Lock bird input during tone playback
                    // Convert duration to frames (at 60 FPS)
                    const lockFrames = Math.ceil(toneDuration * 60);
                    this.bird.isLocked = true;
                    this.bird.lockEndTime = this.frame + lockFrames;
                    console.log(`🔒 Bird locked for ${lockFrames} frames (until frame ${this.bird.lockEndTime})`);
                }
            }
        });

        // Remove off-screen pipes
        this.pipes = this.pipes.filter(pipe => pipe.x > -this.pipeWidth);

        // Spawn new pipes
        this.pipeSpawnTimer++;
        if (this.pipeSpawnTimer >= this.pipeSpawnInterval) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        // Check collisions
        if (this.checkCollisions()) {
            this.gameOver = true;
        }
    }

    spawnPipe() {
        // Pick a random note from the available notes (natural notes only for cleaner gameplay)
        const naturalNotes = this.notes.filter(n => !n.name.includes('#'));
        const randomNote = naturalNotes[Math.floor(Math.random() * naturalNotes.length)];

        const targetFreq = randomNote.freq;
        const targetNote = randomNote.name;

        // Convert frequency to Y position (center of gap)
        const gapCenterY = this.freqToY(targetFreq);

        // Calculate top of gap (gap extends above and below center)
        const gapY = gapCenterY - this.pipeGap / 2;

        // Store the pipeGap value used for this pipe
        this.pipes.push({
            x: this.width,
            gapY: gapY,
            gapCenterY: gapCenterY,
            gapSize: this.pipeGap,  // Store the gap size used at spawn time
            targetFreq: targetFreq,
            targetNote: targetNote,
            passed: false
        });
    }

    checkCollisions() {
        // Check collision with pipes
        for (const pipe of this.pipes) {
            const gapSize = pipe.gapSize || this.pipeGap;

            if (
                this.bird.x + this.bird.width / 2 > pipe.x &&
                this.bird.x - this.bird.width / 2 < pipe.x + this.pipeWidth
            ) {
                // Bird is horizontally aligned with pipe
                if (
                    this.bird.y - this.bird.height / 2 < pipe.gapY ||
                    this.bird.y + this.bird.height / 2 > pipe.gapY + gapSize
                ) {
                    return true; // Collision!
                }
            }
        }

        return false;
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw background
        if (this.sprites['background-day']?.complete) {
            this.ctx.drawImage(
                this.sprites['background-day'],
                0,
                0,
                this.width,
                this.height
            );
        } else {
            this.ctx.fillStyle = '#70c5ce';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Draw note grid lines
        this.drawNoteGrid();

        // Draw pipes
        this.pipes.forEach(pipe => {
            this.drawPipe(pipe);
        });

        // Draw bird
        this.drawBird();
    }

    drawNoteGrid() {
        this.ctx.save();

        // Draw horizontal lines only for natural notes (no sharps)
        this.notes.forEach(note => {
            if (note.name.includes('#')) return; // Skip sharps for cleaner grid

            const y = this.freqToY(note.freq);

            // Draw line
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();

            // Draw note label
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(note.name, 5, y);
        });

        this.ctx.restore();
    }

    drawPipe(pipe) {
        const pipeSprite = this.sprites['pipe-green'];
        const gapSize = pipe.gapSize || this.pipeGap;  // Use stored gap size

        if (pipeSprite?.complete) {
            // Top pipe (flipped)
            this.ctx.save();
            this.ctx.translate(pipe.x + this.pipeWidth / 2, pipe.gapY);
            this.ctx.rotate(Math.PI);
            this.ctx.drawImage(
                pipeSprite,
                -this.pipeWidth / 2,
                0,
                this.pipeWidth,
                pipe.gapY
            );
            this.ctx.restore();

            // Bottom pipe
            this.ctx.drawImage(
                pipeSprite,
                pipe.x,
                pipe.gapY + gapSize,
                this.pipeWidth,
                this.height - (pipe.gapY + gapSize)
            );
        } else {
            // Fallback rectangles
            this.ctx.fillStyle = '#5cb85c';
            this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.gapY);
            this.ctx.fillRect(
                pipe.x,
                pipe.gapY + gapSize,
                this.pipeWidth,
                this.height - (pipe.gapY + gapSize)
            );
        }

        // Draw target note label in the center of the gap
        if (pipe.targetNote) {
            this.ctx.save();

            const gapSize = pipe.gapSize || this.pipeGap;

            // Position in center of gap (use stored gapCenterY for accuracy)
            const labelX = pipe.x + this.pipeWidth / 2;
            const labelY = pipe.gapCenterY;  // Use the stored center position

            // Draw semi-transparent background for readability
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            const textMetrics = this.ctx.measureText(pipe.targetNote);
            const padding = 6;
            const bgWidth = textMetrics.width + padding * 2;
            const bgHeight = 28;

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.fillRect(
                labelX - bgWidth / 2,
                labelY - bgHeight / 2,
                bgWidth,
                bgHeight
            );

            // Draw text
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(pipe.targetNote, labelX, labelY);

            this.ctx.restore();
        }
    }

    drawBird() {
        const birdSprite = this.sprites['bluebird-midflap'];

        if (birdSprite?.complete) {
            this.ctx.drawImage(
                birdSprite,
                this.bird.x - this.bird.width / 2,
                this.bird.y - this.bird.height / 2,
                this.bird.width,
                this.bird.height
            );

            // Draw glow effect when locked
            if (this.bird.isLocked) {
                this.ctx.save();
                this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)'; // Gold glow
                this.ctx.lineWidth = 3;
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                this.ctx.strokeRect(
                    this.bird.x - this.bird.width / 2 - 2,
                    this.bird.y - this.bird.height / 2 - 2,
                    this.bird.width + 4,
                    this.bird.height + 4
                );
                this.ctx.restore();
            }
        } else {
            // Fallback circle
            this.ctx.fillStyle = this.bird.isLocked ? '#FFD700' : '#3498db';
            this.ctx.beginPath();
            this.ctx.arc(this.bird.x, this.bird.y, 12, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}
