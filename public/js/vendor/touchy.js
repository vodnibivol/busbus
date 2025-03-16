(function () {
  let TOUCH_EL = null;

  document.addEventListener('touchstart', addTouches);
  document.addEventListener('mousedown', addTouches);

  document.addEventListener('blur', removeTouches);
  document.addEventListener('mouseup', removeTouches);
  document.addEventListener('mouseover', removeTouches);
  document.addEventListener('touchend', removeTouches);

  function addTouches(e) {
    TOUCH_EL = e.target.closest('[touchy]');
    if (TOUCH_EL) {
      TOUCH_EL.dataset.touched = '';
    }
  }

  function removeTouches() {
    [...document.querySelectorAll('[data-touched]')].forEach((el) => delete el.dataset.touched);
  }
})();
