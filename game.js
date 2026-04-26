document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const vibeSelector = document.getElementById('vibe-selector');
    const startBtn = document.getElementById('start-btn');
    const uiOverlay = document.getElementById('ui-overlay');
    const altitudeEl = document.getElementById('altitude');
    const livesEl = document.getElementById('lives-container');
    const lyricEl = document.getElementById('current-lyric');
    const flashEl = document.getElementById('flash');

    // --- AUDIO SYSTEM ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playNote(freq, type = 'sine', duration = 0.1) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    // --- GAME CONFIGS ---
    const THEMES = {
        cyber: { color: '#00f2fe', accent: '#ff00ff', bg: '#050505', laneColor: 'rgba(0, 242, 254, 0.1)' },
        dream: { color: '#ff9a9e', accent: '#ffffff', bg: '#1a0b2e', laneColor: 'rgba(255, 154, 158, 0.1)' },
        nature: { color: '#2ecc71', accent: '#f1c40f', bg: '#0b1a10', laneColor: 'rgba(46, 204, 113, 0.1)' }
    };

    const TRACKS = {
        pop: { lyrics: "Oh baby baby / I need love / And affection / Give it to me / Daily daily / Save me drowning / My heart beating / Let me know", tempo: 45, baseFreq: 440 },
        synth: { lyrics: "Electric soul / Data rain / System error / Virtual world / Neon pulse / Circuit brain / Digital dreams / Lost in space", tempo: 35, baseFreq: 330 },
        lofi: { lyrics: "Chill vibes / Rainy day / Coffee shop / Soft study / Lo-fi beats / Relaxing / Calm mind / Floating away", tempo: 65, baseFreq: 220 }
    };

    // --- STATE ---
    let activeTheme = 'cyber';
    let activeTrack = 'pop';
    let controlMode = 'keyboard';
    let gameActive = false;
    let lives = 3;
    let score = 0;
    let combo = 0;
    let spawnTimer = 0;
    let activeWords = [];
    let currentLane = 1; 
    const lanes = [0, 0, 0];

    // --- INITIALIZE UI LISTENERS ---
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTheme = btn.dataset.theme;
            playNote(440, 'triangle', 0.05);
        };
    });

    document.querySelectorAll('.track').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.track').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTrack = btn.dataset.track;
            playNote(550, 'triangle', 0.05);
        };
    });

    document.getElementById('btn-keyboard').onclick = () => {
        controlMode = 'keyboard';
        document.getElementById('btn-keyboard').classList.add('active');
        document.getElementById('btn-mouse').classList.remove('active');
    };

    document.getElementById('btn-mouse').onclick = () => {
        controlMode = 'mouse';
        document.getElementById('btn-mouse').classList.add('active');
        document.getElementById('btn-keyboard').classList.remove('active');
    };

    // --- PLAYER (MORE REALISTIC DRAWING) ---
    const player = {
        x: 0, y: 0, targetX: 0, 
        update() {
            if (controlMode === 'mouse' && gameActive) {
                if (mouseX < canvas.width / 3) currentLane = 0;
                else if (mouseX > (canvas.width / 3) * 2) currentLane = 2;
                else currentLane = 1;
            }
            this.targetX = lanes[currentLane];
            this.x += (this.targetX - this.x) * 0.15;
            this.y = canvas.height - 180 + Math.sin(Date.now() * 0.004) * 8;
        },
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            const theme = THEMES[activeTheme];
            ctx.shadowBlur = 20; ctx.shadowColor = theme.color;
            
            // Realistic Proportions / Details
            // Legs (Pants)
            ctx.fillStyle = '#222';
            ctx.fillRect(-12, 10, 10, 35);
            ctx.fillRect(2, 10, 10, 35);
            
            // Shoes
            ctx.fillStyle = theme.color;
            ctx.fillRect(-14, 40, 14, 8);
            ctx.fillRect(0, 40, 14, 8);

            // Torso (Jacket/Hoodie)
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.roundRect(-18, -40, 36, 55, 12);
            ctx.fill();
            
            // Hoodie Detail
            ctx.strokeStyle = theme.color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Arms
            const armAngle = Math.sin(Date.now() * 0.01) * 0.2;
            ctx.fillStyle = '#333';
            // Left Arm
            ctx.save();
            ctx.translate(-18, -35); ctx.rotate(armAngle);
            ctx.fillRect(-8, 0, 8, 30);
            ctx.restore();
            // Right Arm
            ctx.save();
            ctx.translate(18, -35); ctx.rotate(-armAngle);
            ctx.fillRect(0, 0, 8, 30);
            ctx.restore();

            // Head (Skin Tone)
            ctx.fillStyle = '#ffdbac';
            ctx.beginPath();
            ctx.arc(0, -60, 18, 0, Math.PI * 2);
            ctx.fill();

            // Hair (Stylized)
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(0, -65, 20, Math.PI, 0);
            ctx.fill();

            // Face Details
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-6, -62, 2, 0, Math.PI * 2);
            ctx.arc(6, -62, 2, 0, Math.PI * 2);
            ctx.fill();
            // Mouth
            ctx.beginPath();
            ctx.arc(0, -55, 4, 0.2, Math.PI - 0.2);
            ctx.stroke();

            ctx.restore();
        }
    };

    class WordBubble {
        constructor(text) {
            this.text = text;
            this.lane = Math.floor(Math.random() * 3);
            this.x = lanes[this.lane];
            this.y = -100;
            this.speed = 4 + (score * 0.004);
            this.scale = 1;
        }
        update() { this.y += this.speed; this.scale = 1 + Math.sin(Date.now() * 0.01) * 0.05; }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(this.scale, this.scale);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 24px Orbitron';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 15; ctx.shadowColor = THEMES[activeTheme].color;
            ctx.fillText(this.text, 0, 0);
            
            // Visual Trail
            ctx.globalAlpha = 0.2;
            ctx.fillText(this.text, 0, -10);
            ctx.fillText(this.text, 0, -20);
            ctx.restore();
        }
    }

    function triggerFlash() {
        flashEl.style.opacity = 0.2;
        setTimeout(() => flashEl.style.opacity = 0, 80);
    }

    function resize() { 
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight;
        lanes[0] = canvas.width / 4;
        lanes[1] = canvas.width / 2;
        lanes[2] = (canvas.width / 4) * 3;
    }
    window.addEventListener('resize', resize); resize();

    // --- INPUT ---
    let mouseX = 0;
    window.addEventListener('keydown', e => {
        if (!gameActive) return;
        if (controlMode === 'keyboard') {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                if (currentLane > 0) currentLane--;
                playNote(TRACKS[activeTrack].baseFreq * 0.8, 'square', 0.05);
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                if (currentLane < 2) currentLane++;
                playNote(TRACKS[activeTrack].baseFreq * 1.2, 'square', 0.05);
            }
        }
    });

    canvas.addEventListener('mousemove', e => { mouseX = e.clientX; });

    startBtn.onclick = () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        vibeSelector.style.display = 'none';
        uiOverlay.style.display = 'block';
        gameActive = true;
        lives = 3; score = 0; combo = 0;
        activeWords = [];
        player.x = lanes[1];
        requestAnimationFrame(gameLoop);
    };

    function gameLoop() {
        if (!gameActive) return;
        const theme = THEMES[activeTheme];
        
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Lanes
        ctx.strokeStyle = theme.laneColor;
        ctx.lineWidth = 2;
        lanes.forEach(x => {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        });

        player.update();
        player.draw();

        spawnTimer++;
        if (spawnTimer > TRACKS[activeTrack].tempo) {
            const pool = TRACKS[activeTrack].lyrics.split(' / ');
            activeWords.push(new WordBubble(pool[Math.floor(Math.random() * pool.length)]));
            spawnTimer = 0;
        }

        for (let i = activeWords.length - 1; i >= 0; i--) {
            const w = activeWords[i];
            w.update();
            w.draw();

            // Collision Check
            const distY = Math.abs(player.y - w.y);
            if (currentLane === w.lane && distY < 60) {
                score += 10 + (combo * 2);
                combo++;
                lyricEl.innerText = w.text;
                triggerFlash();
                // Play Musical Note based on combo
                playNote(TRACKS[activeTrack].baseFreq + (combo * 20), 'sine', 0.2);
                activeWords.splice(i, 1);
            } 
            else if (w.y > canvas.height) {
                combo = 0;
                lives--;
                playNote(100, 'sawtooth', 0.3); // Sad miss sound
                activeWords.splice(i, 1);
                if (lives <= 0) {
                    gameActive = false;
                    vibeSelector.style.display = 'block';
                    uiOverlay.style.display = 'none';
                }
            }
        }

        altitudeEl.innerText = `SCORE: ${score}`;
        livesEl.innerText = '❤️'.repeat(lives) + (combo > 5 ? ` 🔥 x${combo}` : '');
        requestAnimationFrame(gameLoop);
    }
});
