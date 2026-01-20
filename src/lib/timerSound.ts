// Timer sound utility with fallback to Web Audio API beep

export const playTimerSound = (): void => {
  const audio = new Audio('/sounds/timer-complete.mp3');
  audio.volume = 0.7;
  
  audio.play().catch(() => {
    // Fallback: use Web Audio API beep if audio file fails
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.warn('Could not play timer sound:', e);
    }
  });
};
