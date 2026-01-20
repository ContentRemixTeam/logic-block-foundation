/**
 * Celebration Service
 * Handles confetti and sound effects for theme unlocks and challenge completions
 */

import { ThemeConfig, ConfettiStyle, SoundKey } from './themeConfigSchema';

// Sound file registry - maps keys to actual audio file paths
const SOUND_FILES: Record<SoundKey, string> = {
  winter_chime: '/sounds/timer-complete.mp3', // Reuse existing sound for now
  halloween_pop: '/sounds/timer-complete.mp3',
  level_up: '/sounds/timer-complete.mp3',
  spring_bell: '/sounds/timer-complete.mp3',
  summer_wave: '/sounds/timer-complete.mp3',
  autumn_rustle: '/sounds/timer-complete.mp3',
  celebration: '/sounds/timer-complete.mp3',
  unlock: '/sounds/timer-complete.mp3',
};

// Confetti colors by style
const CONFETTI_COLORS: Record<ConfettiStyle, string[]> = {
  classic: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
  snow: ['#ffffff', '#e0e8f0', '#c0d0e0', '#a0c0d8'],
  petals: ['#ffb7c5', '#ffc0cb', '#ff69b4', '#ff1493', '#ffffff'],
  leaves: ['#ff6b35', '#f7c566', '#c44536', '#774936', '#283618'],
  pumpkins: ['#ff6b00', '#ff8c00', '#ffa500', '#000000', '#228b22'],
  sparkles: ['#ffd700', '#ffec8b', '#fff8dc', '#ffffff', '#fffacd'],
  stars: ['#ffd700', '#ffffff', '#87ceeb', '#4169e1', '#9370db'],
  hearts: ['#ff0000', '#ff69b4', '#ff1493', '#dc143c', '#ffffff'],
};

// Particle counts by intensity
const PARTICLE_COUNTS = {
  low: 30,
  medium: 60,
  high: 100,
};

// Check if user prefers reduced motion
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Check if device is mobile (reduce particles)
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

interface CelebrationOptions {
  soundEnabled: boolean;
  celebrationsEnabled: boolean;
  delightIntensity: 'none' | 'subtle' | 'fun';
}

/**
 * Create a confetti particle element
 */
function createConfettiParticle(
  color: string,
  startX: number,
  startY: number,
  style: ConfettiStyle
): HTMLDivElement {
  const particle = document.createElement('div');
  particle.style.cssText = `
    position: fixed;
    width: ${style === 'snow' ? '8px' : '10px'};
    height: ${style === 'snow' ? '8px' : '10px'};
    background: ${color};
    border-radius: ${style === 'snow' || style === 'sparkles' ? '50%' : '2px'};
    pointer-events: none;
    z-index: 9999;
    left: ${startX}px;
    top: ${startY}px;
    opacity: 1;
  `;
  
  // Add shape variations
  if (style === 'hearts') {
    particle.innerHTML = '❤️';
    particle.style.background = 'transparent';
    particle.style.fontSize = '16px';
  } else if (style === 'stars') {
    particle.innerHTML = '⭐';
    particle.style.background = 'transparent';
    particle.style.fontSize = '14px';
  } else if (style === 'pumpkins') {
    particle.innerHTML = '🎃';
    particle.style.background = 'transparent';
    particle.style.fontSize = '16px';
  } else if (style === 'leaves') {
    particle.innerHTML = '🍂';
    particle.style.background = 'transparent';
    particle.style.fontSize = '14px';
  } else if (style === 'petals') {
    particle.innerHTML = '🌸';
    particle.style.background = 'transparent';
    particle.style.fontSize = '12px';
  }
  
  return particle;
}

/**
 * Animate confetti burst
 */
function animateConfetti(
  style: ConfettiStyle,
  intensity: 'low' | 'medium' | 'high',
  delightIntensity: 'none' | 'subtle' | 'fun'
): void {
  if (typeof document === 'undefined') return;
  
  // Adjust particle count based on delight intensity
  let baseCount = PARTICLE_COUNTS[intensity];
  if (delightIntensity === 'subtle') baseCount = Math.floor(baseCount * 0.5);
  if (isMobile()) baseCount = Math.floor(baseCount * 0.6);
  
  const colors = CONFETTI_COLORS[style];
  const particles: HTMLDivElement[] = [];
  
  // Create particles from center-top
  const centerX = window.innerWidth / 2;
  const startY = window.innerHeight * 0.3;
  
  for (let i = 0; i < baseCount; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const offsetX = (Math.random() - 0.5) * 200;
    const particle = createConfettiParticle(color, centerX + offsetX, startY, style);
    document.body.appendChild(particle);
    particles.push(particle);
    
    // Animate each particle
    const angle = (Math.random() - 0.5) * Math.PI;
    const velocity = 3 + Math.random() * 5;
    const gravity = 0.15;
    const friction = 0.99;
    const rotationSpeed = (Math.random() - 0.5) * 10;
    
    let vx = Math.sin(angle) * velocity * 3;
    let vy = -velocity * 2;
    let rotation = 0;
    let x = centerX + offsetX;
    let y = startY;
    let opacity = 1;
    
    const animate = () => {
      vx *= friction;
      vy += gravity;
      x += vx;
      y += vy;
      rotation += rotationSpeed;
      opacity -= 0.008;
      
      if (opacity <= 0 || y > window.innerHeight) {
        particle.remove();
        return;
      }
      
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.opacity = String(opacity);
      particle.style.transform = `rotate(${rotation}deg)`;
      
      requestAnimationFrame(animate);
    };
    
    // Stagger start times
    setTimeout(animate, i * 10);
  }
  
  // Cleanup after 3 seconds
  setTimeout(() => {
    particles.forEach(p => p.remove());
  }, 3000);
}

/**
 * Play a sound effect safely (swallows errors)
 */
async function playSoundSafe(soundKey: SoundKey): Promise<void> {
  try {
    const soundFile = SOUND_FILES[soundKey];
    if (!soundFile) return;
    
    const audio = new Audio(soundFile);
    audio.volume = 0.5;
    await audio.play();
  } catch (error) {
    // Swallow errors silently (iOS blocks, user hasn't interacted, etc.)
    console.debug('Sound playback blocked:', error);
  }
}

/**
 * Trigger celebration for theme unlock
 * Only triggers on explicit user action (Claim button)
 */
export function triggerThemeUnlockCelebration(
  themeConfig: ThemeConfig,
  options: CelebrationOptions
): void {
  // Respect user preferences
  if (options.delightIntensity === 'none') return;
  if (prefersReducedMotion()) return;
  
  const { fx } = themeConfig;
  
  // Confetti
  if (options.celebrationsEnabled && fx.confetti.enabled) {
    animateConfetti(fx.confetti.style, fx.confetti.intensity, options.delightIntensity);
  }
  
  // Sound
  if (options.soundEnabled && fx.sound.enabled && fx.sound.unlockSoundKey) {
    playSoundSafe(fx.sound.unlockSoundKey);
  }
}

/**
 * Trigger celebration for challenge completion
 */
export function triggerChallengeCompleteCelebration(
  themeConfig: ThemeConfig,
  options: CelebrationOptions
): void {
  if (options.delightIntensity === 'none') return;
  if (prefersReducedMotion()) return;
  
  const { fx } = themeConfig;
  
  // Confetti
  if (options.celebrationsEnabled && fx.confetti.enabled) {
    animateConfetti(fx.confetti.style, fx.confetti.intensity, options.delightIntensity);
  }
  
  // Sound
  if (options.soundEnabled && fx.sound.enabled && fx.sound.completeSoundKey) {
    playSoundSafe(fx.sound.completeSoundKey);
  }
}

/**
 * Test confetti (for preview)
 */
export function testConfetti(
  style: ConfettiStyle = 'classic',
  intensity: 'low' | 'medium' | 'high' = 'medium'
): void {
  if (prefersReducedMotion()) return;
  animateConfetti(style, intensity, 'fun');
}
