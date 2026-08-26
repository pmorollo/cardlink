(function () {
  const carousel = document.getElementById('landing-carousel');
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll('.landing-carousel-slide'));
  const dots = Array.from(carousel.querySelectorAll('.landing-carousel-dots button'));
  const previousButton = carousel.querySelector('.landing-carousel-prev');
  const nextButton = carousel.querySelector('.landing-carousel-next');
  const status = document.getElementById('landing-carousel-status');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let currentIndex = 0;
  let autoplayTimer = null;

  function showSlide(index, announce = true) {
    currentIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === currentIndex;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === currentIndex;
      dot.classList.toggle('is-active', active);
      if (active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (announce && status) status.textContent = `Imagem ${currentIndex + 1} de ${slides.length}`;
  }

  function stopAutoplay() {
    if (autoplayTimer) window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  function startAutoplay() {
    stopAutoplay();
    if (!reduceMotion) autoplayTimer = window.setInterval(() => showSlide(currentIndex + 1, false), 6500);
  }

  previousButton.addEventListener('click', () => { showSlide(currentIndex - 1); startAutoplay(); });
  nextButton.addEventListener('click', () => { showSlide(currentIndex + 1); startAutoplay(); });
  dots.forEach((dot, index) => dot.addEventListener('click', () => { showSlide(index); startAutoplay(); }));
  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', startAutoplay);
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') showSlide(currentIndex - 1);
    if (event.key === 'ArrowRight') showSlide(currentIndex + 1);
  });

  showSlide(0, false);
  startAutoplay();
})();
