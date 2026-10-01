(function () {
  'use strict';

  function initFeaturedCollection(section) {
    if (!section || section.dataset.hargxInitialized === 'true') {
      return;
    }

    const slider = section.querySelector('[data-hargx-product-slider]');

    if (!slider) {
      return;
    }

    section.dataset.hargxInitialized = 'true';

    const prevButton = section.querySelector('[data-hargx-slider-prev]');
    const nextButton = section.querySelector('[data-hargx-slider-next]');
    const progress = section.querySelector('[data-hargx-slider-progress]');

    const getScrollAmount = () => {
      const card = slider.querySelector('[data-product-card]');

      if (!card) {
        return slider.clientWidth;
      }

      return card.getBoundingClientRect().width + 14;
    };

    const updateControls = () => {
      if (!prevButton && !nextButton && !progress) {
        return;
      }

      const maxScroll = slider.scrollWidth - slider.clientWidth;
      const currentScroll = slider.scrollLeft;

      if (prevButton) {
        prevButton.disabled = currentScroll <= 2;
      }

      if (nextButton) {
        nextButton.disabled = currentScroll >= maxScroll - 2;
      }

      if (progress && maxScroll > 0) {
        const visibleRatio = slider.clientWidth / slider.scrollWidth;
        const positionRatio = currentScroll / maxScroll;

        const width = Math.max(visibleRatio * 100, 20);
        const left = positionRatio * (100 - width);

        progress.style.width = `${width}%`;
        progress.style.transform = `translateX(${left}%)`;
      }
    };

    if (prevButton) {
      prevButton.addEventListener('click', () => {
        slider.scrollBy({
          left: -getScrollAmount(),
          behavior: 'smooth'
        });
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
        slider.scrollBy({
          left: getScrollAmount(),
          behavior: 'smooth'
        });
      });
    }

    let ticking = false;

    slider.addEventListener(
      'scroll',
      () => {
        if (ticking) {
          return;
        }

        window.requestAnimationFrame(() => {
          updateControls();
          ticking = false;
        });

        ticking = true;
      },
      { passive: true }
    );

    window.addEventListener(
      'resize',
      updateControls,
      { passive: true }
    );

    updateControls();
  }

  function initAll() {
    document
      .querySelectorAll('.hargx-featured-collection')
      .forEach(initFeaturedCollection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => {
    const section = event.target.querySelector(
      '.hargx-featured-collection'
    );

    if (section) {
      initFeaturedCollection(section);
    }
  });
})();