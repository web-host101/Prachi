document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. NAVIGATION & MOBILE MENU
     ========================================================================== */
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    }
  });

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('open');
      navLinks.classList.toggle('active');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        navLinks.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('active') && !e.target.closest('.navbar')) {
        navToggle.classList.remove('open');
        navLinks.classList.remove('active');
      }
    });
  }

  /* ==========================================================================
     2. FLOATING BALLOONS GENERATOR
     ========================================================================== */
  const balloonsContainer = document.getElementById('balloons');
  if (balloonsContainer) {
    const colors = [
      '#ff4d6d', '#ff85a1', '#ffd166', '#c77dff', 
      '#ff758f', '#ff9ec7', '#f72585', '#b5179e'
    ];
    
    // Spawn initial balloons
    for (let i = 0; i < 22; i++) {
      createBalloon(balloonsContainer, colors, true);
    }

    // Continuously spawn gentle balloons
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        createBalloon(balloonsContainer, colors, false);
      }
    }, 2800);
  }

  function createBalloon(container, colors, isInitial) {
    const balloon = document.createElement('div');
    balloon.className = 'balloon';
    const color = colors[Math.floor(Math.random() * colors.length)];
    balloon.style.background = `radial-gradient(circle at 35% 30%, #fff 0%, ${color} 45%, #000 100%)`;
    balloon.style.left = `${Math.random() * 95}vw`;
    
    const size = Math.random() * 20 + 28;
    balloon.style.width = `${size}px`;
    balloon.style.height = `${size * 1.3}px`;
    
    const duration = Math.random() * 8 + 10;
    balloon.style.animationDuration = `${duration}s`;
    
    if (isInitial) {
      balloon.style.animationDelay = `-${Math.random() * duration}s`;
    }

    container.appendChild(balloon);

    setTimeout(() => {
      balloon.remove();
    }, duration * 1000 + 1000);
  }

  /* ==========================================================================
     3. HAPPY BIRTHDAY MUSIC BOX SYNTHESIZER (WEBAUDIO API)
     ========================================================================== */
  const musicToggle = document.getElementById('musicToggle');
  let audioCtx = null;
  let masterGain = null;
  let isPlaying = false;
  let melodyTimeout = null;

  // Tempo & Note timings (~108 BPM waltz)
  const BEAT = 0.55;

  // Note Frequencies (Hz)
  const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, Bb4 = 466.16;
  const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00, Bb5 = 932.33, C6 = 1046.50;

  // Full "Happy Birthday To You" Score: [freq, startBeat, durationBeats, isChime]
  const birthdayScore = [
    // Phrase 1: "Happy Birthday to you"
    [C5, 0.0, 0.75],
    [C5, 0.75, 0.25],
    [D5, 1.0, 0.9],
    [C5, 2.0, 0.9],
    [F4, 0.0, 1.8, true], // Harmony
    [A4, 1.0, 1.0, true],

    [F5, 3.0, 0.9],
    [E5, 4.0, 1.8],
    [C4, 3.0, 2.0, true],
    [G4, 4.0, 1.5, true],

    // Phrase 2: "Happy Birthday to you"
    [C5, 6.0, 0.75],
    [C5, 6.75, 0.25],
    [D5, 7.0, 0.9],
    [C5, 8.0, 0.9],
    [C4, 6.0, 1.8, true],
    [E4, 7.0, 1.2, true],

    [G5, 9.0, 0.9],
    [F5, 10.0, 1.8],
    [F4, 9.0, 2.0, true],
    [A4, 10.0, 1.5, true],

    // Phrase 3: "Happy Birthday dear Prachi"
    [C5, 12.0, 0.75],
    [C5, 12.75, 0.25],
    [C6, 13.0, 0.95],
    [A5, 14.0, 0.95],
    [F4, 12.0, 2.0, true],
    [C5, 13.0, 1.5, true],

    [F5, 15.0, 0.9],
    [E5, 16.0, 0.9],
    [D5, 17.0, 1.8],
    [Bb4, 15.0, 2.2, true],
    [D4, 15.0, 2.2, true],
    [F4, 16.0, 1.5, true],

    // Phrase 4: "Happy Birthday to you"
    [Bb5, 18.0, 0.75],
    [Bb5, 18.75, 0.25],
    [A5, 19.0, 0.9],
    [F5, 20.0, 0.9],
    [F4, 18.0, 2.0, true],
    [A4, 19.0, 1.2, true],

    [G5, 21.0, 0.9],
    [F5, 22.0, 2.4],
    [C4, 21.0, 1.2, true],
    [F4, 22.0, 2.5, true],
    [A4, 22.0, 2.5, true],
    [C5, 22.0, 2.5, true]
  ];

  const loopLengthMs = 26.0 * BEAT * 1000; // ~14.3 seconds per loop

  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // Dynamics Compressor to boost perceived loudness, richness & clarity without clipping
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, audioCtx.currentTime);
      compressor.knee.setValueAtTime(25, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(6, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

      masterGain = audioCtx.createGain();
      // Soft master output level
      masterGain.gain.setValueAtTime(0.25, audioCtx.currentTime);

      masterGain.connect(compressor);
      compressor.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  let activeOscillators = [];

  function playMusicBoxNote(freq, startTime, duration, isChime = false) {
    if (!audioCtx || !isPlaying) return;

    // Primary bell tone
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Harmonic sparkle overtone (giving authentic music box chime timbre)
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.003, startTime);

    const gain1 = audioCtx.createGain();
    const gain2 = audioCtx.createGain();

    // Louder per-note amplitude
    const maxVol = isChime ? 0.12 : 0.35;
    const overtoneVol = maxVol * 0.35;

    // Pluck attack & ringing bell decay
    gain1.gain.setValueAtTime(0.0001, startTime);
    gain1.gain.linearRampToValueAtTime(maxVol, startTime + 0.006);
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * BEAT + 1.1);

    gain2.gain.setValueAtTime(0.0001, startTime);
    gain2.gain.linearRampToValueAtTime(overtoneVol, startTime + 0.004);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + (duration * BEAT * 0.7) + 0.5);

    osc1.connect(gain1);
    osc2.connect(gain2);

    gain1.connect(masterGain);
    gain2.connect(masterGain);

    activeOscillators.push(osc1, osc2);

    osc1.onended = () => {
      const idx = activeOscillators.indexOf(osc1);
      if (idx > -1) activeOscillators.splice(idx, 1);
    };

    osc1.start(startTime);
    osc1.stop(startTime + duration * BEAT + 1.2);

    osc2.start(startTime);
    osc2.stop(startTime + duration * BEAT + 0.7);
  }

  function scheduleBirthdaySong() {
    if (!isPlaying || !audioCtx) return;

    const now = audioCtx.currentTime + 0.05;
    birthdayScore.forEach(([freq, startBeat, duration, isChime]) => {
      const noteTime = now + (startBeat * BEAT);
      playMusicBoxNote(freq, noteTime, duration, isChime);
    });

    // Schedule next loop
    melodyTimeout = setTimeout(() => {
      if (isPlaying) {
        scheduleBirthdaySong();
      }
    }, loopLengthMs);
  }

  const customAudio = document.getElementById('customBirthdayAudio');

  function startBirthdayMusic() {
    if (isPlaying) return;

    if (customAudio && customAudio.src) {
      customAudio.volume = 1.0;
      customAudio.play().then(() => {
        isPlaying = true;
        updateMusicButtonUI(true);
      }).catch(() => {
        // Fallback to WebAudio Music Box
        playSynthesizedMusicBox();
      });
    } else {
      playSynthesizedMusicBox();
    }
  }

  function playSynthesizedMusicBox() {
    initAudioContext();
    isPlaying = true;
    if (masterGain && audioCtx) {
      masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      masterGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    }
    updateMusicButtonUI(true);
    scheduleBirthdaySong();
  }

  function stopBirthdayMusic() {
    isPlaying = false;

    // 1. Cancel scheduling of next loop
    if (melodyTimeout) {
      clearTimeout(melodyTimeout);
      melodyTimeout = null;
    }

    // 2. Stop HTML5 audio if active
    if (customAudio && !customAudio.paused) {
      customAudio.pause();
      customAudio.currentTime = 0;
    }

    // 3. Immediately kill all running & scheduled oscillators
    activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    activeOscillators = [];

    // 4. Zero out master gain instantly
    if (masterGain && audioCtx) {
      masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }

    // 5. Suspend audio context
    if (audioCtx && audioCtx.state !== 'closed') {
      try {
        audioCtx.suspend();
      } catch (e) {}
    }

    updateMusicButtonUI(false);
  }

  function updateMusicButtonUI(playing) {
    if (musicToggle) {
      musicToggle.classList.toggle('playing', playing);
      const icon = musicToggle.querySelector('.music-icon');
      const text = musicToggle.querySelector('.music-text');
      const status = musicToggle.querySelector('.music-status');
      
      if (icon) icon.textContent = playing ? '⏹️' : '🎵';
      if (text) text.textContent = 'Birthday Song';
      if (status) status.textContent = playing ? 'Stop' : 'Play';
      musicToggle.setAttribute('title', playing ? 'Click to Stop Music' : 'Click to Play Music');
    }
  }

  if (musicToggle) {
    musicToggle.addEventListener('click', () => {
      if (isPlaying) {
        stopBirthdayMusic();
      } else {
        startBirthdayMusic();
      }
    });
  }

  // Auto-play when user first interacts anywhere on the site (only after unlock)
  function autoStartOnFirstGesture() {
    if (!isPlaying && isUnlocked) {
      startBirthdayMusic();
      document.removeEventListener('click', autoStartOnFirstGesture);
      document.removeEventListener('touchstart', autoStartOnFirstGesture);
    }
  }
  document.addEventListener('click', autoStartOnFirstGesture);
  document.addEventListener('touchstart', autoStartOnFirstGesture);

  // Expose globally
  window.startBirthdayMusic = startBirthdayMusic;
  window.stopBirthdayMusic = stopBirthdayMusic;

  /* ==========================================================================
     4. COUNTDOWN TIMER & COVER PAGE LOCK
     ========================================================================== */
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minsEl = document.getElementById('minutes');
  const secsEl = document.getElementById('seconds');

  const coverDaysEl = document.getElementById('coverDays');
  const coverHoursEl = document.getElementById('coverHours');
  const coverMinsEl = document.getElementById('coverMinutes');
  const coverSecsEl = document.getElementById('coverSeconds');

  const coverPage = document.getElementById('coverPage');
  const coverCountdown = document.getElementById('coverCountdown');
  const enterBtn = document.getElementById('enterBtn');
  const coverStatusText = document.getElementById('coverStatusText');
  const coverLockNotice = document.getElementById('coverLockNotice');

  // Explicit Birthday Target: November 25, 2026 at 00:00:00 midnight local time
  // Note: Month 10 in JS Date represents November (0-indexed)
  const target = new Date(2026, 10, 25, 0, 0, 0);

  let isUnlocked = false;
  let shakeTimeout = null;

  // Live Countdown Mode: strictly locked until 25 Nov 2026 midnight
  const isPreviewMode = false; // Set to true for testing/demo purposes

  function updateCountdown() {
    const now = new Date();
    let diff = target - now;

    if (isPreviewMode) {
      diff = 0; // Simulate reached target in preview mode
    }

    if (diff <= 0) {
      diff = 0;
      if (!isUnlocked) {
        unlockCelebrationAccess();
      }
    } else {
      lockCelebrationAccess();
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    const dStr = String(d).padStart(2, '0');
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    const sStr = String(s).padStart(2, '0');

    if (daysEl) daysEl.textContent = dStr;
    if (hoursEl) hoursEl.textContent = hStr;
    if (minsEl) minsEl.textContent = mStr;
    if (secsEl) secsEl.textContent = sStr;

    if (coverDaysEl) coverDaysEl.textContent = dStr;
    if (coverHoursEl) coverHoursEl.textContent = hStr;
    if (coverMinsEl) coverMinsEl.textContent = mStr;
    if (coverSecsEl) coverSecsEl.textContent = sStr;
  }

  function lockCelebrationAccess() {
    isUnlocked = false;
    if (enterBtn) {
      enterBtn.disabled = true;
      enterBtn.classList.add('locked');
      enterBtn.innerHTML = '<span>🔒 Locked Until Midnight</span>';
    }
    if (coverStatusText) {
      coverStatusText.innerHTML = '</em>';
    }
  }

  function unlockCelebrationAccess() {
    isUnlocked = true;
    if (enterBtn) {
      enterBtn.disabled = false;
      enterBtn.classList.remove('locked');
      enterBtn.innerHTML = '<span>Open Birthday Surprise!</span> 🎁';
    }
    if (coverStatusText) {
      coverStatusText.innerHTML = '🎉 <strong>IT\'S OFFICIALLY PRACHI\'S BIRTHDAY! 👑</strong>';
    }
    if (coverLockNotice) {
      coverLockNotice.textContent = '✨ Tap below to reveal the celebration! ✨';
    }
  }

  function handleAttemptOpen() {
    if (!isUnlocked) {
      // Trigger rejection shake
      if (coverCountdown) {
        coverCountdown.classList.remove('shake');
        void coverCountdown.offsetWidth; // re-flow
        coverCountdown.classList.add('shake');
      }
      if (coverLockNotice) {
        coverLockNotice.textContent = '🤫 No peeking early! Unlocks strictly when the countdown hits zero.';
        clearTimeout(shakeTimeout);
        shakeTimeout = setTimeout(() => {
          coverLockNotice.textContent = '';
        }, 3500);
      }
      return;
    }

    // Countdown reached 0 -> Open with grand celebration
    if (coverPage) {
      coverPage.classList.add('hidden');
      triggerConfetti(0.5, 0.5);
      setTimeout(() => triggerConfetti(0.3, 0.4), 300);
      setTimeout(() => triggerConfetti(0.7, 0.4), 600);
      startBirthdayMusic();
    }
  }

  if (enterBtn) {
    enterBtn.addEventListener('click', handleAttemptOpen);
  }

  // Also prevent clicking past before countdown
  if (coverPage) {
    coverPage.addEventListener('click', (e) => {
      if (!isUnlocked && e.target.closest('#enterBtn, .cover-content')) {
        handleAttemptOpen();
      }
    });
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ==========================================================================
     5. CONFETTI CANNON (CANVAS-BASED)
     ========================================================================== */
  const canvas = document.getElementById('confetti-canvas');
  let ctx = canvas ? canvas.getContext('2d') : null;
  let particles = [];
  let confettiAnimId = null;

  function resizeCanvas() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function triggerConfetti(originX = 0.5, originY = 0.6) {
    if (!canvas || !ctx) return;

    const colors = ['#ff4d6d', '#ff85a1', '#ffd166', '#c77dff', '#4cc9f0', '#ffffff'];
    const count = 90;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      particles.push({
        x: canvas.width * originX,
        y: canvas.height * originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        life: 1
      });
    }

    if (!confettiAnimId) {
      animateConfetti();
    }
  }

  function animateConfetti() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.vx *= 0.98; // air resistance
      p.rotation += p.rotationSpeed;
      p.life -= 0.012;
      p.opacity = Math.max(0, p.life);

      if (p.opacity <= 0 || p.y > canvas.height) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    if (particles.length > 0) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      confettiAnimId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // Export for interactive elements
  window.triggerConfetti = triggerConfetti;

  /* ==========================================================================
     6. INTERACTIVE BIRTHDAY CAKE & WISH
     ========================================================================== */
  const cakeStage = document.getElementById('cakeStage');
  const candleFlame = document.getElementById('candleFlame');
  const cakeBanner = document.getElementById('cakeWishBanner');
  let candleBlown = false;

  if (cakeStage && candleFlame) {
    cakeStage.addEventListener('click', () => {
      if (!candleBlown) {
        candleBlown = true;
        candleFlame.classList.add('blown-out');

        // Confetti explosion
        triggerConfetti(0.5, 0.55);
        setTimeout(() => triggerConfetti(0.4, 0.45), 300);
        setTimeout(() => triggerConfetti(0.6, 0.45), 600);

        // Show banner
        if (cakeBanner) {
          cakeBanner.classList.add('active');
        }

        // Chime sound if audio context active
        if (isPlaying) {
          startAmbientSynth();
        }
      } else {
        // Relight candle
        candleBlown = false;
        candleFlame.classList.remove('blown-out');
        if (cakeBanner) {
          cakeBanner.classList.remove('active');
        }
      }
    });
  }

  /* ==========================================================================
     7. POLAROID LIGHTBOX MODAL
     ========================================================================== */
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');

  document.querySelectorAll('.polaroid-card').forEach(card => {
    card.addEventListener('click', () => {
      const img = card.querySelector('img');
      const title = card.querySelector('.polaroid-title');
      if (img && lightboxModal && lightboxImg) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || 'Birthday Memory';
        if (lightboxCaption && title) {
          lightboxCaption.textContent = title.textContent;
        }
        lightboxModal.classList.add('active');
      }
    });
  });

  function closeLightbox() {
    if (lightboxModal) {
      lightboxModal.classList.remove('active');
    }
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        closeLightbox();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
    }
  });

  /* ==========================================================================
     8. WISHES / CONTACT FORM SUBMISSION
     ========================================================================== */
  const contactForm = document.getElementById('contactForm');
  const successMsg = document.getElementById('successMsg');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const nameInput = document.getElementById('name');
      const messageInput = document.getElementById('message');

      if (successMsg) {
        successMsg.classList.add('show');
        contactForm.style.display = 'none';
      }

      // Confetti burst
      triggerConfetti(0.5, 0.7);

      // Save wish in localStorage
      try {
        const storedWishes = JSON.parse(localStorage.getItem('prachi_wishes') || '[]');
        storedWishes.push({
          name: nameInput ? nameInput.value : 'Anonymous',
          message: messageInput ? messageInput.value : '',
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('prachi_wishes', JSON.stringify(storedWishes));
      } catch (err) {}
    });
  }

});
