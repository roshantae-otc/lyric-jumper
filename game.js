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

    // --- GAME CONFIGS ---
    const THEMES = {
        cyber: {
            color: '#00f2fe', accent: '#ff00ff', bg: '#050505',
            far: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
            mid: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'
        },
        dream: {
            color: '#ff9a9e', accent: '#ffffff', bg: '#1a0b2e',
            far: 'https://images.unsplash.com/photo-1534088568595-a066f77c3ed2?w=800',
            mid: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800'
        },
        nature: {
            color: '#2ecc71', accent: '#f1c40f', bg: '#141e30',
            far: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
            mid: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=800'
        }
    };

    const TRACKS = {
        pop: { lyrics: "Oh baby baby / I need love / And affection / Give it to me / Daily daily / Save me drowning / My heart beating / Let me know", tempo: 40 },
        synth: { lyrics: "Electric soul / Data rain / System error / Virtual world / Neon pulse / Circuit brain / Digital dreams / Lost in space", tempo: 30 },
        lofi: { lyrics: "Chill vibes / Rainy day / Coffee shop / Soft study / Lo-fi beats / Relaxing / Calm mind / Floating away", tempo: 60 }
    };

    // --- STATE ---
    let activeTheme = 'cyber';
    let activeTrack = 'pop';
    let gameActive = false;
    let lives = 3;
    let score = 0;
    let combo = 0;
    let spawnTimer = 0;
    let activeWords = [];
    let currentLane = 1; // 0: Left, 1: Center, 2: Right
    const lanes = [0, 0, 0];

    // --- PLAYER ---
    const player = {
        x: 0, y: 0, targetX: 0, 
        update() {
            this.targetX = lanes[currentLane];
            this.x += (this.targetX - this.x) * 0.2; // Smooth slide
            this.y = canvas.height - 150 + Math.sin(Date.now() * 0.005) * 5;
        },
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            const color = THEMES[activeTheme].color;
            ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(0, -50, 15, 0, Math.PI * 2); ctx.fill(); // Head
            ctx.beginPath(); ctx.roundRect(-15, -35, 30, 45, 10); ctx.fill(); // Torso
            const armWiggle = Math.sin(Date.now() * 0.01) * 10;
            ctx.fillRect(-25, -30, 8, 25 + armWiggle); // Left Arm
            ctx.fillRect(17, -30, 8, 25 - armWiggle); // Right Arm
            ctx.restore();
        }
    };

    class WordBubble {
        constructor(text) {
            this.text = text;
            this.lane = Math.floor(Math.random() * 3);
            this.x = lanes[this.lane];
            this.y = -50;
            this.speed = 5 + (score * 0.005);
        }
        update() { this.y += this.speed; }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 20px Inter';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 10; ctx.shadowColor = THEMES[activeTheme].color;
            ctx.fillText(this.text, 0, 0);
            ctx.restore();
        }
    }

    function triggerFlash() {
        flashEl.style.opacity = 0.3;
        setTimeout(() => flashEl.style.opacity = 0, 100);
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
    window.addEventListener('keydown', e => {
        if (!gameActive) return;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') if (currentLane > 0) currentLane--;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') if (currentLane < 2) currentLane++;
    });

    canvas.addEventListener('mousedown', e => {
        if (!gameActive) return;
        if (e.clientX < canvas.width / 3) { if (currentLane > 0) currentLane--; }
        else if (e.clientX > (canvas.width / 3) * 2) { if (currentLane < 2) currentLane++; }
        else { /* Middle tap doesn't move but could be for powerups later */ }
    });

    startBtn.onclick = () => {
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background Glow
        ctx.fillStyle = THEMES[activeTheme].bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

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

            // Collision Check (Catching the lyric)
            const distY = Math.abs(player.y - w.y);
            if (currentLane === w.lane && distY < 60) {
                score += 10 + (combo * 2);
                combo++;
                lyricEl.innerText = w.text;
                triggerFlash();
                activeWords.splice(i, 1);
            } 
            // Missed the lyric
            else if (w.y > canvas.height) {
                combo = 0;
                lives--;
                activeWords.splice(i, 1);
                if (lives <= 0) {
                    gameActive = false;
                    vibeSelector.style.display = 'block';
                    uiOverlay.style.display = 'none';
                    alert("Game Over! Score: " + score);
                }
            }
        }

        altitudeEl.innerText = `Score: ${score}`;
        livesEl.innerText = '❤️'.repeat(lives) + (combo > 5 ? ` 🔥 x${combo}` : '');
        requestAnimationFrame(gameLoop);
    }
});
