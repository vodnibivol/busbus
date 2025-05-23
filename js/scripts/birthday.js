export default function () {
  function isDate(day, month) {
    const today = new Date();
    return today.getDate() === day && today.getMonth() + 1 === month;
  }

  if (!(isDate(23, 5) || isDate(24, 5) || isDate(25, 5) || isDate(26, 5) || isDate(27, 5))) return;

  // document.querySelector('#input .reset').style.background = 'pink';
  document.querySelector('#bg').style.background = 'url("public/img/bg/birthday-3.jpg")';
  document.querySelector('#bg').style.backgroundSize = '300px';

  // confetti
  (function () {
    // load script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
    document.body.appendChild(script);

    // confetti on click
    document.addEventListener('click', () => {
      const dir = Math.round(Math.random());
      confetti({
        particleCount: 20,
        angle: 60 * (1 + dir),
        spread: 55,
        origin: { x: dir },
        // colors: colors,
      });
    });

    // start animation
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  })();
}
