(function () {
  'use strict';

  const SELECTORS = {
    root: '[data-hargx-announcement]',
    slide: '[data-hargx-announcement-slide]',
    previous: '[data-hargx-announcement-prev]',
    next: '[data-hargx-announcement-next]',
    close: '[data-hargx-announcement-close]',
    marqueeTrack: '[data-hargx-announcement-marquee-track]'
  };

  const instances = new WeakMap();

  function prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initAnnouncementBar(root) {
    if (!root || instances.has(root)) {
      return;
    }

    const mode = root.dataset.displayMode || 'normal';

    const instance = {
      root,
      mode,
      currentIndex: 0,
      autoplayTimer: null,
      touchStartX: 0,
      touchStartY: 0,
      isDragging: false,
      destroyed: false
    };

    instances.set(root, instance);

    setupCloseButton(instance);

    if (mode === 'slider') {
      setupSlider(instance);
    }

    if (mode === 'marquee') {
      setupMarquee(instance);
    }
  }

  /* ---------------------------------------------------------
     Close Button
  --------------------------------------------------------- */

  function setupCloseButton(instance) {
    const button = instance.root.querySelector(SELECTORS.close);

    if (!button) {
      return;
    }

    button.addEventListener('click', function () {
      instance.root.classList.add('is-dismissed');

      button.setAttribute('aria-expanded', 'false');

      const sectionId = instance.root.dataset.sectionId;

      if (
        sectionId &&
        !(window.Shopify && Shopify.designMode)
      ) {
        try {
          localStorage.setItem(
            'hargx-announcement-dismissed-' + sectionId,
            'true'
          );
        } catch (error) {
          // Ignore localStorage errors.
        }
      }

      stopAutoplay(instance);
    });

    /*
     * Do not restore a persisted dismissal inside
     * Shopify Theme Editor.
     */
    if (
      !(window.Shopify && Shopify.designMode)
    ) {
      const sectionId = instance.root.dataset.sectionId;

      if (sectionId) {
        try {
          const dismissed = localStorage.getItem(
            'hargx-announcement-dismissed-' + sectionId
          );

          if (dismissed === 'true') {
            instance.root.classList.add('is-dismissed');
          }
        } catch (error) {
          // Ignore localStorage errors.
        }
      }
    }
  }

  /* ---------------------------------------------------------
     Slider
  --------------------------------------------------------- */

  function setupSlider(instance) {
    const root = instance.root;

    const slides = Array.from(
      root.querySelectorAll(SELECTORS.slide)
    );

    const previousButton = root.querySelector(
      SELECTORS.previous
    );

    const nextButton = root.querySelector(
      SELECTORS.next
    );

    if (!slides.length) {
      return;
    }

    instance.slides = slides;
    instance.previousButton = previousButton;
    instance.nextButton = nextButton;

    /*
     * If there is only one announcement,
     * navigation is not required.
     */
    if (slides.length <= 1) {
      if (previousButton) {
        previousButton.hidden = true;
      }

      if (nextButton) {
        nextButton.hidden = true;
      }

      slides[0].classList.add('is-active');
      slides[0].setAttribute('aria-hidden', 'false');

      return;
    }

    slides.forEach(function (slide, index) {
      slide.setAttribute(
        'aria-hidden',
        index === 0 ? 'false' : 'true'
      );

      slide.classList.toggle(
        'is-active',
        index === 0
      );
    });

    if (previousButton) {
      previousButton.addEventListener(
        'click',
        function () {
          goToSlide(
            instance,
            instance.currentIndex - 1
          );
        }
      );
    }

    if (nextButton) {
      nextButton.addEventListener(
        'click',
        function () {
          goToSlide(
            instance,
            instance.currentIndex + 1
          );
        }
      );
    }

    /*
     * Keyboard navigation.
     */
    root.addEventListener('keydown', function (event) {
      if (
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight'
      ) {
        return;
      }

      /*
       * Only respond when focus is inside
       * the announcement bar.
       */
      if (!root.contains(document.activeElement)) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();

        goToSlide(
          instance,
          instance.currentIndex - 1
        );
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();

        goToSlide(
          instance,
          instance.currentIndex + 1
        );
      }
    });

    /*
     * Pause autoplay while user interacts
     * with the announcement.
     */
    root.addEventListener(
      'mouseenter',
      function () {
        stopAutoplay(instance);
      }
    );

    root.addEventListener(
      'mouseleave',
      function () {
        startAutoplay(instance);
      }
    );

    root.addEventListener(
      'focusin',
      function () {
        stopAutoplay(instance);
      }
    );

    root.addEventListener(
      'focusout',
      function () {
        startAutoplay(instance);
      }
    );

    /*
     * Touch / swipe support.
     */
    root.addEventListener(
      'touchstart',
      function (event) {
        if (!event.touches.length) {
          return;
        }

        instance.touchStartX =
          event.touches[0].clientX;

        instance.touchStartY =
          event.touches[0].clientY;

        instance.isDragging = true;

        stopAutoplay(instance);
      },
      {
        passive: true
      }
    );

    root.addEventListener(
      'touchend',
      function (event) {
        if (
          !instance.isDragging ||
          !event.changedTouches.length
        ) {
          return;
        }

        const touch = event.changedTouches[0];

        const deltaX =
          touch.clientX - instance.touchStartX;

        const deltaY =
          touch.clientY - instance.touchStartY;

        instance.isDragging = false;

        /*
         * Ignore mostly vertical gestures.
         */
        if (
          Math.abs(deltaX) < 35 ||
          Math.abs(deltaX) < Math.abs(deltaY)
        ) {
          startAutoplay(instance);
          return;
        }

        if (deltaX < 0) {
          goToSlide(
            instance,
            instance.currentIndex + 1
          );
        } else {
          goToSlide(
            instance,
            instance.currentIndex - 1
          );
        }

        startAutoplay(instance);
      },
      {
        passive: true
      }
    );

    /*
     * Browser tab visibility.
     */
    document.addEventListener(
      'visibilitychange',
      function () {
        if (document.hidden) {
          stopAutoplay(instance);
        } else {
          startAutoplay(instance);
        }
      }
    );

    /*
     * Start autoplay.
     */
    startAutoplay(instance);
  }

  function goToSlide(instance, index) {
    if (
      !instance.slides ||
      !instance.slides.length
    ) {
      return;
    }

    const totalSlides =
      instance.slides.length;

    if (index < 0) {
      index = totalSlides - 1;
    }

    if (index >= totalSlides) {
      index = 0;
    }

    instance.currentIndex = index;

    instance.slides.forEach(
      function (slide, slideIndex) {
        const isActive =
          slideIndex === index;

        slide.classList.toggle(
          'is-active',
          isActive
        );

        slide.setAttribute(
          'aria-hidden',
          isActive ? 'false' : 'true'
        );
      }
    );

    restartAutoplay(instance);
  }

  /* ---------------------------------------------------------
     Autoplay
  --------------------------------------------------------- */

  function startAutoplay(instance) {
    if (
      instance.destroyed ||
      instance.mode !== 'slider' ||
      !instance.slides ||
      instance.slides.length <= 1
    ) {
      return;
    }

    if (prefersReducedMotion()) {
      return;
    }

    const autoplay =
      instance.root.dataset.autoplay === 'true';

    if (!autoplay) {
      return;
    }

    stopAutoplay(instance);

    const speed =
      parseInt(
        instance.root.dataset.autoplaySpeed,
        10
      ) || 5;

    instance.autoplayTimer = window.setInterval(
      function () {
        goToSlide(
          instance,
          instance.currentIndex + 1
        );
      },
      speed * 1000
    );
  }

  function stopAutoplay(instance) {
    if (instance.autoplayTimer) {
      window.clearInterval(
        instance.autoplayTimer
      );

      instance.autoplayTimer = null;
    }
  }

  function restartAutoplay(instance) {
    stopAutoplay(instance);
    startAutoplay(instance);
  }

  /* ---------------------------------------------------------
     Marquee
  --------------------------------------------------------- */

  function setupMarquee(instance) {
    const root = instance.root;

    const track = root.querySelector(
      SELECTORS.marqueeTrack
    );

    if (!track) {
      return;
    }

    instance.marqueeTrack = track;

    /*
     * CSS handles the animation.
     * JS only controls pause/resume.
     */
    root.addEventListener(
      'mouseenter',
      function () {
        track.style.animationPlayState = 'paused';
      }
    );

    root.addEventListener(
      'mouseleave',
      function () {
        track.style.animationPlayState = '';
      }
    );

    root.addEventListener(
      'focusin',
      function () {
        track.style.animationPlayState = 'paused';
      }
    );

    root.addEventListener(
      'focusout',
      function () {
        track.style.animationPlayState = '';
      }
    );
  }

  /* ---------------------------------------------------------
     Destroy
  --------------------------------------------------------- */

  function destroyAnnouncementBar(root) {
    const instance = instances.get(root);

    if (!instance) {
      return;
    }

    instance.destroyed = true;

    stopAutoplay(instance);

    instances.delete(root);
  }

  /* ---------------------------------------------------------
     Initializer
  --------------------------------------------------------- */

  function initAll() {
    document
      .querySelectorAll(SELECTORS.root)
      .forEach(function (root) {
        initAnnouncementBar(root);
      });
  }

  /*
   * Normal page load.
   */
  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initAll
    );
  } else {
    initAll();
  }

  /*
   * Shopify Theme Editor support.
   */
  document.addEventListener(
    'shopify:section:load',
    function (event) {
      const root =
        event.target.querySelector(
          SELECTORS.root
        );

      if (root) {
        initAnnouncementBar(root);
      }
    }
  );

  document.addEventListener(
    'shopify:section:unload',
    function (event) {
      const root =
        event.target.querySelector(
          SELECTORS.root
        );

      if (root) {
        destroyAnnouncementBar(root);
      }
    }
  );

  /*
   * Public API.
   */
  window.HARGXAnnouncementBar = {
    refresh: initAll
  };
})();