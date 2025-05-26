export default function () {
  function isDate(day, month) {
    const today = new Date();
    return today.getDate() === day && today.getMonth() + 1 === month;
  }

  document.querySelector('#input .reset').style.background = 'pink';
  document.querySelector('#bg').style.background = 'url("public/img/bg/birthday-3.jpg")';
  document.querySelector('#bg').style.backgroundSize = '250px';

  // confetti on msg open
  document.addEventListener('click', (e) => {
    if (e.target.matches('#paketek')) {
      if (!window.confetti) return;

      heartShower();
    }
  });

  // confetti
  (function () {
    // load script
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
    document.body.appendChild(s);

    s.onload = () => {
      // confetti on click
      document.addEventListener('touchstart', fireCannon);
      document.addEventListener('keydown', fireCannon);
      document.addEventListener('mousedown', fireCannon);

      function fireCannon() {
        const dir = Math.round(Math.random());
        confetti({
          particleCount: 30,
          angle: 60 * (1 + dir),
          spread: 55,
          origin: { x: dir, y: 0.6 },
        });
      }

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
    };
  })();

  // -- HEART SHOWER ANIMATION
  function heartShower() {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    let skew = 1;
    let int = 0;
    const colors = ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'];

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    (function frame() {
      const timeLeft = animationEnd - Date.now();
      skew = Math.max(0.8, skew - 0.001);

      if (++int % 3 === 0)
        confetti({
          particleCount: 1,
          startVelocity: 0,
          ticks: 500,
          origin: {
            x: randomInRange(0, 1),
            // since particles fall down, skew start toward the top
            y: 0,
            // y: skew-0.2,
          },
          colors: [colors[int % colors.length]],
          gravity: randomInRange(0.8, 1),
          scalar: randomInRange(0.5, 1.2),
          drift: randomInRange(-0.4, 0.4), // 0.4
          // flat: true,
        });

      if (timeLeft > 0) {
        requestAnimationFrame(frame);
      }
    })();
  }
}
