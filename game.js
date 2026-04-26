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
    function playNote(freq, type = 'sine', duration = 0.1, volume = 0.1) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
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
    let level = 1;
    let xp = 0;
    let spawnTimer = 0;
    let activeWords = [];
    let powerUps = [];
    let currentLane = 1; 
    let magnetActive = 0; // Timer
    let multiplierActive = 0; // Timer
    const lanes = [0, 0, 0];

    // --- UI LISTENERS ---
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

    // --- PLAYER ---
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
            
            // Magnet Glow Effect
            if (magnetActive > 0) {
                ctx.beginPath();
                ctx.arc(0, -30, 60, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 242, 254, 0.1)';
                ctx.fill();
                ctx.strokeStyle = theme.color;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
            }

            ctx.shadowBlur = 20; ctx.shadowColor = theme.color;
            ctx.fillStyle = '#222'; ctx.fillRect(-12, 10, 10, 35); ctx.fillRect(2, 10, 10, 35); // Legs
            ctx.fillStyle = theme.color; ctx.fillRect(-14, 40, 14, 8); ctx.fillRect(0, 40, 14, 8); // Shoes
            ctx.fillStyle = multiplierActive > 0 ? '#f1c40f' : '#333';
            ctx.beginPath(); ctx.roundRect(-18, -40, 36, 55, 12); ctx.fill(); // Torso
            
            // Arms
            const armAngle = Math.sin(Date.now() * 0.01) * 0.2;
            ctx.save(); ctx.translate(-18, -35); ctx.rotate(armAngle); ctx.fillRect(-8, 0, 8, 30); ctx.restore();
            ctx.save(); ctx.translate(18, -35); ctx.rotate(-armAngle); ctx.fillRect(0, 0, 8, 30); ctx.restore();

            ctx.fillStyle = '#ffdbac'; ctx.beginPath(); ctx.arc(0, -60, 18, 0, Math.PI * 2); ctx.fill(); // Head
            ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(0, -65, 20, Math.PI, 0); ctx.fill(); // Hair
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-6, -62, 2, 0, Math.PI * 2); ctx.arc(6, -62, 2, 0, Math.PI * 2); ctx.fill(); // Eyes
            ctx.restore();
        }
    };

    class WordBubble {
        constructor(text) {
            this.text = text;
            this.lane = Math.floor(Math.random() * 3);
            this.x = lanes[this.lane];
            this.y = -100;
            this.speed = 4 + (level * 0.5);
        }
        update() {
            if (magnetActive > 0 && Math.abs(this.y - player.y) < 300) {
                this.x += (player.x - this.x) * 0.1;
            }
            this.y += this.speed;
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 24px Orbitron';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 15; ctx.shadowColor = THEMES[activeTheme].color;
            ctx.fillText(this.text, 0, 0);
            ctx.restore();
        }
    }

    class PowerUp {
        constructor() {
            this.type = Math.random() > 0.5 ? 'magnet' : 'multiplier';
            this.lane = Math.floor(Math.random() * 3);
            this.x = lanes[this.lane];
            this.y = -100;
            this.speed = 3;
        }
        update() { this.y += this.speed; }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.font = '30px Arial';
            ctx.shadowBlur = 20; ctx.shadowColor = this.type === 'magnet' ? '#00f2fe' : '#f1c40f';
            ctx.fillText(this.type === 'magnet' ? '🧲' : '⭐', 0, 0);
            ctx.restore();
        }
    }

    function resize() { 
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        lanes[0] = canvas.width / 4; lanes[1] = canvas.width / 2; lanes[2] = (canvas.width / 4) * 3;
    }
    window.addEventListener('resize', resize); resize();

    // --- INPUT ---
    let mouseX = 0;
    window.addEventListener('keydown', e => {
        if (!gameActive) return;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') if (currentLane > 0) currentLane--;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') if (currentLane < 2) currentLane++;
    });
    canvas.addEventListener('mousemove', e => { mouseX = e.clientX; });

    startBtn.onclick = () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        vibeSelector.style.display = 'none';
        uiOverlay.style.display = 'block';
        gameActive = true;
        lives = 3; score = 0; combo = 0; level = 1; xp = 0;
        activeWords = []; powerUps = [];
        requestAnimationFrame(gameLoop);
    };

    function gameLoop() {
        if (!gameActive) return;
        const theme = THEMES[activeTheme];
        ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // UI Logic
        if (magnetActive > 0) magnetActive--;
        if (multiplierActive > 0) multiplierActive--;

        player.update();
        player.draw();

        spawnTimer++;
        if (spawnTimer > Math.max(20, TRACKS[activeTrack].tempo - (level * 2))) {
            const pool = TRACKS[activeTrack].lyrics.split(' / ');
            activeWords.push(new WordBubble(pool[Math.floor(Math.random() * pool.length)]));
            if (Math.random() < 0.03) powerUps.push(new PowerUp());
            spawnTimer = 0;
        }

        activeWords.forEach((w, i) => {
            w.update(); w.draw();
            const hit = (currentLane === w.lane || (magnetActive > 0 && Math.abs(player.x - w.x) < 100)) && Math.abs(player.y - w.y) < 60;
            if (hit) {
                let gain = (10 + combo) * (multiplierActive > 0 ? 2 : 1);
                score += gain; xp += 10; combo++;
                lyricEl.innerText = w.text;
                playNote(TRACKS[activeTrack].baseFreq + (combo * 10), 'sine', 0.2);
                activeWords.splice(i, 1);
                if (xp >= level * 100) { level++; xp = 0; playNote(880, 'square', 0.5); }
            } else if (w.y > canvas.height) {
                combo = 0; lives--; activeWords.splice(i, 1);
                if (lives <= 0) { gameActive = false; vibeSelector.style.display = 'block'; uiOverlay.style.display = 'none'; }
            }
        });

        powerUps.forEach((p, i) => {
            p.update(); p.draw();
            if (currentLane === p.lane && Math.abs(player.y - p.y) < 60) {
                if (p.type === 'magnet') magnetActive = 300;
                else multiplierActive = 300;
                playNote(800, 'triangle', 0.4);
                powerUps.splice(i, 1);
            } else if (p.y > canvas.height) powerUps.splice(i, 1);
        });

        altitudeEl.innerHTML = `LEVEL ${level} <br> SCORE: ${score}`;
        livesEl.innerText = '❤️'.repeat(lives) + (combo > 5 ? ` 🔥 x${combo}` : '');
        requestAnimationFrame(gameLoop);
    }
});
