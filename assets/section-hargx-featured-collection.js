(function () {
  'use strict';

  const initializedSections = new WeakSet();

  function getVisibleMode(section) {
    return window.matchMedia('(min-width: 750px)').matches
      ? 'desktop'
      : 'mobile';
  }

  function isSliderMode(section, mode) {
    return section.classList.contains(
      `hargx-featured-collection--${mode}-slider`
    );
  }

  function initSlider(section) {
    if (!section || initializedSections.has(section)) {
      return;
    }

    const slider = section.querySelector('[data-hargx-product-slider]');

    if (!slider) {
      return;
    }

    initializedSections.add(section);

    const getControls = () => {
      const mode = getVisibleMode(section);

      if (!isSliderMode(section, mode)) {
        return null;
      }

      return section.querySelector(
        `[data-hargx-slider-controls="${mode}"]`
      );
    };

    const getCardWidth = () => {
      const card = slider.querySelector('[data-product-card]');

      if (!card) {
        return slider.clientWidth;
      }

      const styles = window.getComputedStyle(slider);
      const gap = parseFloat(styles.columnGap || styles.gap || 0);

      return card.getBoundingClientRect().width + gap;
    };

    const updateControls = () => {
      const controls = getControls();

      if (!controls) {
        return;
      }

      const previousButton = controls.querySelector(
        '[data-hargx-slider-prev]'
      );

      const nextButton = controls.querySelector(
        '[data-hargx-slider-next]'
      );

      const progress = controls.querySelector(
        '[data-hargx-slider-progress]'
      );

      const maxScroll = Math.max(
        slider.scrollWidth - slider.clientWidth,
        0
      );

      const currentScroll = slider.scrollLeft;

      if (previousButton) {
        previousButton.disabled = currentScroll <= 2;
      }

      if (nextButton) {
        nextButton.disabled = currentScroll >= maxScroll - 2;
      }

      if (progress) {
        if (maxScroll <= 0) {
          progress.style.width = '100%';
          progress.style.transform = 'translateX(0)';
          return;
        }

        const visibleRatio =
          slider.clientWidth / slider.scrollWidth;

        const width = Math.max(
          visibleRatio * 100,
          15
        );

        const positionRatio =
          currentScroll / maxScroll;

        const availableMovement = 100 - width;
        const left = positionRatio * availableMovement;

        progress.style.width = `${width}%`;
        progress.style.transform =
          `translateX(${left}%)`;
      }
    };

    section.addEventListener('click', function (event) {
      const previousButton = event.target.closest(
        '[data-hargx-slider-prev]'
      );

      const nextButton = event.target.closest(
        '[data-hargx-slider-next]'
      );

      if (!previousButton && !nextButton) {
        return;
      }

      const controls = getControls();

      if (!controls) {
        return;
      }

      if (previousButton) {
        slider.scrollBy({
          left: -getCardWidth(),
          behavior: 'smooth'
        });
      }

      if (nextButton) {
        slider.scrollBy({
          left: getCardWidth(),
          behavior: 'smooth'
        });
      }
    });

    let ticking = false;

    slider.addEventListener(
      'scroll',
      function () {
        if (ticking) {
          return;
        }

        window.requestAnimationFrame(function () {
          updateControls();
          ticking = false;
        });

        ticking = true;
      },
      {
        passive: true
      }
    );

    let resizeTimeout;

    window.addEventListener(
      'resize',
      function () {
        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(function () {
          updateControls();
        }, 100);
      },
      {
        passive: true
      }
    );

    updateControls();
  }

  function initAll() {
    document
      .querySelectorAll('[data-hargx-featured-slider-section]')
      .forEach(initSlider);
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initAll,
      {
        once: true
      }
    );
  } else {
    initAll();
  }

  document.addEventListener(
    'shopify:section:load',
    function (event) {
      const section =
        event.target.querySelector(
          '[data-hargx-featured-slider-section]'
        );

      if (section) {
        initSlider(section);
      }
    }
  );
})();