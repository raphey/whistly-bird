// Audio frequency detection using Web Audio API
class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.currentFrequency = 0;
        this.isRunning = false;

        // Frequency range for whistle detection (set from GameSettings)
        this.minFreq = 0;
        this.maxFreq = 0;
        this.sampleRate = 44100;
    }

    async init() {
        try {
            console.log('Requesting microphone access...');

            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            console.log('Microphone access granted');

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.sampleRate = this.audioContext.sampleRate;

            console.log('Audio context created, sample rate:', this.sampleRate);

            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 4096;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);

            // Connect microphone to analyser
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);

            this.isRunning = true;

            // Get frequency range from settings
            this.minFreq = GameSettings.get('minFreq');
            this.maxFreq = GameSettings.get('maxFreq');

            console.log('Audio analyzer initialized successfully');
            console.log(`Frequency range: ${this.minFreq} - ${this.maxFreq} Hz`);
            return true;
        } catch (error) {
            console.error('Error initializing audio:', error);
            alert(`Microphone error: ${error.message}\n\nPlease allow microphone access in your browser settings and reload.`);
            return false;
        }
    }

    getFrequency() {
        if (!this.isRunning || !this.analyser) {
            return 0;
        }

        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);

        // Find peak frequency
        let maxValue = 0;
        let maxIndex = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            if (this.dataArray[i] > maxValue) {
                maxValue = this.dataArray[i];
                maxIndex = i;
            }
        }

        // Convert bin index to frequency
        const frequency = maxIndex * this.sampleRate / (this.analyser.fftSize * 2);

        // Only return if frequency is in valid range and magnitude is strong enough
        if (frequency >= this.minFreq && frequency <= this.maxFreq && maxValue > 80) {
            this.currentFrequency = frequency;
            return frequency;
        }

        // Decay current frequency if no strong signal
        this.currentFrequency *= 0.95;
        return this.currentFrequency;
    }

    async playTone(frequency, duration = 0.2) {
        if (!this.audioContext) {
            console.warn('AudioContext not initialized, cannot play tone');
            return;
        }

        try {
            // Resume audio context if suspended (required in Chrome)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('AudioContext resumed');
            }

            console.log(`🎵 Playing tone: ${frequency.toFixed(2)} Hz for ${duration}s`);

            // Create oscillator for the tone
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';

            // Set frequency and verify it
            oscillator.frequency.setValueAtTime(
                frequency,
                this.audioContext.currentTime
            );

            // Verify the frequency was set correctly
            const actualFreq = oscillator.frequency.value;
            if (Math.abs(actualFreq - frequency) > 0.1) {
                console.warn(`⚠️ Frequency mismatch: requested ${frequency.toFixed(2)} Hz, got ${actualFreq.toFixed(2)} Hz`);
            } else {
                console.log(`✓ Frequency verified: ${actualFreq.toFixed(2)} Hz`);
            }

            // Set up gain envelope for smooth fade out
            const volume = 0.15; // Volume level (0-1)
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                this.audioContext.currentTime + duration
            );

            // Connect and play
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            console.error('Error playing tone:', error);
        }
    }

    stop() {
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.isRunning = false;
    }
}
