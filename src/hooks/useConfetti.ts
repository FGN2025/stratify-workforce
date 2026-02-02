import confetti from 'canvas-confetti';

export function fireConfetti() {
  // Fire confetti from both sides
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#22c55e', '#10b981', '#059669', '#fbbf24', '#f59e0b'];

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

export function fireBurstConfetti() {
  // Single celebratory burst from center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#22c55e', '#10b981', '#059669', '#fbbf24', '#f59e0b'],
  });
}
