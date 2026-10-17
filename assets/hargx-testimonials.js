(() => {
  function initSlider(section) {
    if (section.dataset.sliderInitialized === 'true') {
      return;
    }

    const track = section.querySelector(
      '[data-hargx-testimonials-track]'
    );
    const previousButton = section.querySelector(
      '[data-hargx-testimonials-prev]'
    );
    const nextButton = section.querySelector(
      '[data-hargx-testimonials-next]'
    );

    if (!track || !previousButton || !nextButton) {
      return;
    }

    section.dataset.sliderInitialized = 'true';

    const getStep = () => {
      const card = track.querySelector('.hargx-testimonial-card');

      if (!card) {
        return track.clientWidth;
      }

      const styles = window.getComputedStyle(track);
      const gap = parseFloat(styles.columnGap || styles.gap) || 0;

      return card.getBoundingClientRect().width + gap;
    };

    const updateButtons = () => {
      const maxScroll = Math.max(
        track.scrollWidth - track.clientWidth,
        0
      );

      previousButton.disabled = track.scrollLeft <= 2;
      nextButton.disabled = track.scrollLeft >= maxScroll - 2;
    };

    const scroll = (direction) => {
      track.scrollBy({
        left: direction * getStep(),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth'
      });
    };

    previousButton.addEventListener('click', () => scroll(-1));
    nextButton.addEventListener('click', () => scroll(1));

    let ticking = false;
    track.addEventListener(
      'scroll',
      () => {
        if (ticking) {
          return;
        }

        window.requestAnimationFrame(() => {
          updateButtons();
          ticking = false;
        });
        ticking = true;
      },
      { passive: true }
    );

    window.addEventListener('resize', updateButtons, { passive: true });
    updateButtons();
  }

  function initAll(root = document) {
    if (root.matches?.('[data-hargx-testimonials]')) {
      initSlider(root);
    }

    root.querySelectorAll?.('[data-hargx-testimonials]').forEach(initSlider);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll(), {
      once: true
    });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => {
    initAll(event.target);
  });
})();
