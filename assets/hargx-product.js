document.addEventListener('DOMContentLoaded', () => {
  initializeHargxProducts();
});

document.addEventListener('shopify:section:load', (event) => {
  const section = event.target.querySelector?.('.hargx-product');

  if (section) {
    initHargxProduct(section);
  }
});

function initializeHargxProducts() {
  const sections = document.querySelectorAll('.hargx-product');

  sections.forEach((section) => {
    initHargxProduct(section);
  });
}


function initHargxProduct(section) {
  if (section.dataset.hargxInitialized === 'true') {
    return;
  }

  section.dataset.hargxInitialized = 'true';

  const productForm = section.querySelector('.hargx-product-form');

  const productDataElement = section.querySelector(
    '[data-hargx-product-data]'
  );

  if (!productForm || !productDataElement) {
    return;
  }

  let productData;

  try {
    productData = JSON.parse(productDataElement.textContent);
  } catch (error) {
    console.error(
      'HARGX Product: Unable to read product data.',
      error
    );

    return;
  }

  if (!productData?.variants?.length) {
    return;
  }


  /*
   * ------------------------------------------------------------
   * Elements
   * ------------------------------------------------------------
   */

  const variantInput = productForm.querySelector(
    '[data-hargx-variant-id]'
  );

  const hiddenQuantityInput = productForm.querySelector(
    '[data-hargx-hidden-quantity]'
  );

  const quantityInput = productForm.querySelector(
    '[data-hargx-quantity]'
  );

  const quantityMinus = productForm.querySelector(
    '[data-hargx-quantity-minus]'
  );

  const quantityPlus = productForm.querySelector(
    '[data-hargx-quantity-plus]'
  );

  const optionInputs = productForm.querySelectorAll(
    '[data-hargx-option]'
  );

  const priceCurrent = section.querySelector(
    '[data-hargx-current-price]'
  );

  const priceCompare = section.querySelector(
    '[data-hargx-compare-price]'
  );

  const saleBadge = section.querySelector(
    '[data-hargx-sale-badge]'
  );

  const addToCartButton = productForm.querySelector(
    '[data-hargx-add-to-cart]'
  );

  const addToCartText = productForm.querySelector(
    '[data-hargx-add-text]'
  );

  const skuElement = section.querySelector(
    '[data-hargx-sku]'
  );

  const inventoryElement = section.querySelector(
    '[data-hargx-inventory]'
  );


  /*
   * ------------------------------------------------------------
   * Current Variant
   * ------------------------------------------------------------
   */

  let activeVariant =
    productData.variants.find(
      (variant) =>
        String(variant.id) === String(variantInput?.value)
    ) ||
    productData.variants.find(
      (variant) =>
        String(variant.id) === String(
          productData.selectedVariantId
        )
    ) ||
    productData.variants[0];


  /*
   * ------------------------------------------------------------
   * Money
   * ------------------------------------------------------------
   */

  
    function formatMoney(cents) {
      const moneyFormat =
        section.dataset.moneyFormat ||
        window.Shopify?.money_format ||
        window.theme?.moneyFormat ||
        '${{amount}}';

      const amountInCents = Number(cents);

      if (!Number.isFinite(amountInCents)) {
        return '';
      }

      if (typeof window.Shopify?.formatMoney === 'function') {
        return window.Shopify.formatMoney(
          amountInCents,
          moneyFormat
        );
      }

      // Fallback: preserve the currency and amount format
      const amount = (amountInCents / 100).toFixed(2);

      return moneyFormat.replace(
        /\{\{\s*(amount|amount_no_decimals)\s*\}\}/,
        (placeholder, formatType) => {
          const value = amountInCents / 100;

          return formatType === 'amount_no_decimals'
            ? Math.round(value).toLocaleString('en-US')
            : value.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              });
        }
      );
    }


  /*
   * ------------------------------------------------------------
   * Selected Options
   * ------------------------------------------------------------
   */

  function getSelectedOptions() {
    const selectedOptions = [];

    optionInputs.forEach((input) => {
      if (!input.checked) {
        return;
      }

      const position = Number(
        input.dataset.optionPosition
      );

      selectedOptions[position - 1] = input.value;
    });

    return selectedOptions;
  }


  /*
   * ------------------------------------------------------------
   * Find Variant
   * ------------------------------------------------------------
   */

  function findVariant() {
    if (!optionInputs.length) {
      return activeVariant || productData.variants[0];
    }

    const selectedOptions =
      getSelectedOptions();

    return productData.variants.find((variant) => {
      return variant.options.every(
        (option, index) => {
          return option === selectedOptions[index];
        }
      );
    });
  }


  /*
   * ------------------------------------------------------------
   * Price
   * ------------------------------------------------------------
   */

  function updatePrice(variant) {
    if (!variant) {
      return;
    }

    if (priceCurrent) {
      priceCurrent.textContent =
        formatMoney(variant.price);
    }

    const compareAtPrice =
      Number(variant.compare_at_price || 0);

    const currentPrice =
      Number(variant.price || 0);

    if (
      priceCompare &&
      saleBadge
    ) {
      if (
        compareAtPrice >
        currentPrice
      ) {
        priceCompare.hidden = false;

        priceCompare.textContent =
          formatMoney(
            compareAtPrice
          );

        saleBadge.hidden = false;

      } else {
        priceCompare.hidden = true;
        priceCompare.textContent = '';

        saleBadge.hidden = true;
      }
    }
  }


  /*
   * ------------------------------------------------------------
   * Availability
   * ------------------------------------------------------------
   */

  function updateAvailability(variant) {
    if (!variant) {
      return;
    }

    if (addToCartButton) {
      addToCartButton.disabled =
        !variant.available;
    }

    if (addToCartText) {
      addToCartText.textContent =
        variant.available
          ? 'Add to cart'
          : 'Sold out';
    }


    /*
     * Inventory block
     */

    if (inventoryElement) {
      if (!variant.available) {
        inventoryElement.innerHTML =
          '<span>Out of stock</span>';

      } else if (
        variant.inventory_management ===
          'shopify' &&
        Number(
          variant.inventory_quantity
        ) > 0 &&
        Number(
          variant.inventory_quantity
        ) <= 5
      ) {
        inventoryElement.innerHTML =
          `<span>Only ${variant.inventory_quantity} left in stock</span>`;

      } else {
        inventoryElement.innerHTML =
          '<span>In stock</span>';
      }
    }


    /*
     * SKU
     */

    if (skuElement) {
      skuElement.textContent =
        variant.sku || '';
    }
  }


  /*
   * ------------------------------------------------------------
   * Update Variant
   * ------------------------------------------------------------
   */

  function updateVariant() {
    const variant =
      findVariant();

    if (!variant) {
      if (addToCartButton) {
        addToCartButton.disabled =
          true;
      }

      return;
    }

    activeVariant =
      variant;


    /*
     * Hidden variant ID
     */

    if (variantInput) {
      variantInput.value =
        variant.id;
    }


    /*
     * Update UI
     */

    updatePrice(
      variant
    );

    updateAvailability(
      variant
    );


    /*
     * Update URL
     *
     * Only when the product actually has options.
     */

    if (optionInputs.length) {
      const url =
        new URL(
          window.location.href
        );

      url.searchParams.set(
        'variant',
        variant.id
      );

      window.history.replaceState(
        {},
        '',
        url.toString()
      );
    }
  }


  /*
   * ------------------------------------------------------------
   * Variant Change Events
   * ------------------------------------------------------------
   */

  optionInputs.forEach((input) => {
    input.addEventListener(
      'change',
      updateVariant
    );
  });


  /*
   * ------------------------------------------------------------
   * Quantity
   * ------------------------------------------------------------
   */

  function getQuantity() {
    if (!quantityInput) {
      return 1;
    }

    const quantity =
      parseInt(
        quantityInput.value,
        10
      );

    if (
      Number.isNaN(quantity) ||
      quantity < 1
    ) {
      return 1;
    }

    return quantity;
  }


  function updateQuantity(value) {
    const quantity =
      Math.max(
        1,
        parseInt(
          value,
          10
        ) || 1
      );

    if (quantityInput) {
      quantityInput.value =
        quantity;
    }

    if (hiddenQuantityInput) {
      hiddenQuantityInput.value =
        quantity;
    }
  }


  if (quantityMinus) {
    quantityMinus.addEventListener(
      'click',
      () => {
        updateQuantity(
          getQuantity() - 1
        );
      }
    );
  }


  if (quantityPlus) {
    quantityPlus.addEventListener(
      'click',
      () => {
        updateQuantity(
          getQuantity() + 1
        );
      }
    );
  }


  if (quantityInput) {
    quantityInput.addEventListener(
      'change',
      () => {
        updateQuantity(
          getQuantity()
        );
      }
    );
  }


  /*
   * ------------------------------------------------------------
   * ADD TO CART
   *
   * Uses the existing product form.
   * This preserves:
   * - variant ID
   * - quantity
   * - line item properties
   * - hidden fields
   * - any future product-form fields
   * ------------------------------------------------------------
   */

  productForm.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const variant =
        findVariant();

      if (!variant) {
        console.warn(
          'HARGX Product: No valid variant selected.'
        );

        return;
      }

      if (!variant.available) {
        return;
      }


      /*
       * Make sure the latest variant
       * and quantity are present.
       */

      if (variantInput) {
        variantInput.value =
          variant.id;
      }

      updateQuantity(
        getQuantity()
      );


      /*
       * Prevent duplicate submissions.
       */

      if (
        productForm.dataset
          .hargxSubmitting === 'true'
      ) {
        return;
      }

      productForm.dataset
        .hargxSubmitting = 'true';


      /*
       * Button loading state.
       */

      const originalButtonText =
        addToCartText
          ? addToCartText.textContent
          : '';

      if (addToCartButton) {
        addToCartButton.disabled =
          true;

        addToCartButton.classList.add(
          'is-loading'
        );

        addToCartButton.setAttribute(
          'aria-busy',
          'true'
        );
      }

      if (addToCartText) {
        addToCartText.textContent =
          'Adding...';
      }


      try {
        /*
         * Use the existing Shopify product
         * form data so all hidden inputs,
         * variant ID, quantity and line-item
         * properties are preserved.
         */

        const formData =
          new FormData(
            productForm
          );


        /*
         * Make absolutely sure the
         * selected variant and quantity
         * are correct.
         */

        if (variantInput) {
          formData.set(
            'id',
            variant.id
          );
        }

        formData.set(
          'quantity',
          getQuantity()
        );


        /*
         * AJAX Add to Cart
         */

        const response =
          await fetch(
            window.Shopify.routes.root +
              'cart/add.js',
            {
              method: 'POST',
              headers: {
                Accept:
                  'application/json',
                'X-Requested-With':
                  'XMLHttpRequest'
              },
              body: formData
            }
          );


        const responseData =
          await response
            .json()
            .catch(
              () => null
            );


        if (!response.ok) {
          throw new Error(
            responseData?.description ||
            responseData?.message ||
            'Unable to add product to cart.'
          );
        }


        /*
         * Successful Add to Cart
         */

        if (addToCartText) {
          addToCartText.textContent =
            'Added';
        }

        if (addToCartButton) {
          addToCartButton.classList.remove(
            'is-loading'
          );

          addToCartButton.classList.add(
            'is-added'
          );
        }


        /*
         * Notify HARGX Cart Drawer.
         *
         * hargx-cart-drawer.js listens
         * for this event and will:
         *
         * 1. Fetch latest cart
         * 2. Refresh drawer HTML
         * 3. Update cart count
         * 4. Update subtotal
         * 5. Update shipping progress
         * 6. Open the drawer
         */

        document.dispatchEvent(
          new CustomEvent(
            'hargx:cart-add-success',
            {
              bubbles: true,
              detail: {
                item:
                  responseData
              }
            }
          )
        );


        /*
         * Also dispatch normal cart
         * update event for other HARGX
         * components.
         */

        document.dispatchEvent(
          new CustomEvent(
            'hargx:cart-updated',
            {
              bubbles: true,
              detail: {
                item:
                  responseData
              }
            }
          )
        );


        /*
         * Restore button after short delay.
         */

        setTimeout(
          () => {
            if (addToCartText) {
              addToCartText.textContent =
                originalButtonText ||
                'Add to cart';
            }

            if (addToCartButton) {
              addToCartButton.classList.remove(
                'is-added'
              );

              addToCartButton.removeAttribute(
                'aria-busy'
              );

              /*
               * Only enable again if
               * the current variant is available.
               */

              addToCartButton.disabled =
                !activeVariant?.available;
            }

            productForm.dataset
              .hargxSubmitting = 'false';
          },
          1200
        );

      } catch (error) {
        console.error(
          'HARGX Product: Add to cart failed.',
          error
        );


        /*
         * Restore button.
         */

        if (addToCartButton) {
          addToCartButton.classList.remove(
            'is-loading'
          );

          addToCartButton.removeAttribute(
            'aria-busy'
          );

          addToCartButton.disabled =
            !activeVariant?.available;
        }

        if (addToCartText) {
          addToCartText.textContent =
            'Try again';
        }


        /*
         * Reset submission state.
         */

        productForm.dataset
          .hargxSubmitting = 'false';


        /*
         * Restore button text.
         */

        setTimeout(
          () => {
            if (addToCartText) {
              addToCartText.textContent =
                originalButtonText ||
                'Add to cart';
            }
          },
          1800
        );
      }
    }
  );


  /*
   * ------------------------------------------------------------
   * Initial State
   * ------------------------------------------------------------
   */

  updateVariant();
}


/* =========================================================
   HARGX PRODUCT GALLERY
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {
    initializeHargxGalleries();
  }
);

document.addEventListener(
  'shopify:section:load',
  (event) => {
    const gallery =
      event.target.querySelector?.(
        '[data-hargx-gallery]'
      );

    if (gallery) {
      initHargxGallery(
        gallery
      );
    }
  }
);


function initializeHargxGalleries() {
  const galleries =
    document.querySelectorAll(
      '[data-hargx-gallery]'
    );

  galleries.forEach(
    (gallery) => {
      initHargxGallery(
        gallery
      );
    }
  );
}


function initHargxGallery(
  gallery
) {
  if (
    gallery.dataset
      .hargxGalleryInitialized ===
    'true'
  ) {
    return;
  }

  gallery.dataset
    .hargxGalleryInitialized =
    'true';


  const slides =
    Array.from(
      gallery.querySelectorAll(
        '[data-hargx-gallery-slide]'
      )
    );

  const thumbnails =
    Array.from(
      gallery.querySelectorAll(
        '[data-hargx-gallery-thumbnail]'
      )
    );

  const previousButton =
    gallery.querySelector(
      '[data-hargx-gallery-prev]'
    );

  const nextButton =
    gallery.querySelector(
      '[data-hargx-gallery-next]'
    );


  if (!slides.length) {
    return;
  }


  let activeIndex = 0;


  function showSlide(index) {
    if (index < 0) {
      index =
        slides.length - 1;
    }

    if (
      index >=
      slides.length
    ) {
      index = 0;
    }

    activeIndex =
      index;


    /*
     * Slides
     */

    slides.forEach(
      (
        slide,
        slideIndex
      ) => {
        const isActive =
          slideIndex ===
          activeIndex;

        slide.classList.toggle(
          'is-active',
          isActive
        );

        slide.setAttribute(
          'aria-hidden',
          isActive
            ? 'false'
            : 'true'
        );
      }
    );


    /*
     * Thumbnails
     */

    thumbnails.forEach(
      (
        thumbnail,
        thumbnailIndex
      ) => {
        const isActive =
          thumbnailIndex ===
          activeIndex;

        thumbnail.classList.toggle(
          'is-active',
          isActive
        );

        thumbnail.setAttribute(
          'aria-current',
          isActive
            ? 'true'
            : 'false'
        );
      }
    );


    /*
     * Keep active thumbnail visible
     */

    const activeThumbnail =
      thumbnails[
        activeIndex
      ];

    if (activeThumbnail) {
      activeThumbnail.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }


  /*
   * Thumbnail click
   */

  thumbnails.forEach(
    (
      thumbnail,
      index
    ) => {
      thumbnail.addEventListener(
        'click',
        () => {
          showSlide(
            index
          );
        }
      );
    }
  );


  /*
   * Previous
   */

  if (previousButton) {
    previousButton.addEventListener(
      'click',
      () => {
        showSlide(
          activeIndex - 1
        );
      }
    );
  }


  /*
   * Next
   */

  if (nextButton) {
    nextButton.addEventListener(
      'click',
      () => {
        showSlide(
          activeIndex + 1
        );
      }
    );
  }


  /*
   * Keyboard navigation
   */

  gallery.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key ===
        'ArrowLeft'
      ) {
        showSlide(
          activeIndex - 1
        );
      }

      if (
        event.key ===
        'ArrowRight'
      ) {
        showSlide(
          activeIndex + 1
        );
      }
    }
  );


  /*
   * Initial slide
   */

  showSlide(0);

  initHargxGallerySwipe(
    gallery
  );
}


function initHargxGallerySwipe(
  gallery
) {
  const mainGallery =
    gallery.querySelector(
      '.hargx-product__gallery-main'
    );

  if (!mainGallery) {
    return;
  }

  let startX = 0;
  let endX = 0;

  mainGallery.addEventListener(
    'touchstart',
    (event) => {
      startX =
        event.changedTouches[0]
          .screenX;
    },
    {
      passive: true
    }
  );

  mainGallery.addEventListener(
    'touchend',
    (event) => {
      endX =
        event.changedTouches[0]
          .screenX;

      const difference =
        startX - endX;

      if (
        Math.abs(
          difference
        ) < 40
      ) {
        return;
      }

      const nextButton =
        gallery.querySelector(
          '[data-hargx-gallery-next]'
        );

      const previousButton =
        gallery.querySelector(
          '[data-hargx-gallery-prev]'
        );

      if (
        difference > 0
      ) {
        nextButton?.click();
      } else {
        previousButton?.click();
      }
    },
    {
      passive: true
    }
  );
}


/* =========================================================
   HARGX — Complementary Products
   ========================================================= */

function initHargxComplementaryProducts() {
  const containers =
    document.querySelectorAll(
      '[data-hargx-complementary-products]'
    );

  if (!containers.length) {
    return;
  }

  containers.forEach(
    (container) => {
      initHargxComplementaryAddButtons(
        container
      );

      initHargxComplementarySlider(
        container
      );
    }
  );
}


/* =========================================================
   ADD TO CART
   ========================================================= */

function initHargxComplementaryAddButtons(
  container
) {
  const addButtons =
    container.querySelectorAll(
      '[data-complementary-add]'
    );

  addButtons.forEach(
    (button) => {
      if (
        button.dataset
          .hargxInitialized ===
        'true'
      ) {
        return;
      }

      button.dataset
        .hargxInitialized =
        'true';

      button.addEventListener(
        'click',
        async () => {
          const variantId =
            button.dataset.variantId;

          if (
            !variantId ||
            button.classList.contains(
              'is-loading'
            )
          ) {
            return;
          }

          const originalText =
            button.textContent.trim();

          button.classList.add(
            'is-loading'
          );

          button.setAttribute(
            'aria-disabled',
            'true'
          );

          button.textContent =
            'Adding...';

          try {
            const response =
              await fetch(
                window.Shopify.routes.root +
                  'cart/add.js',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type':
                      'application/json',
                    Accept:
                      'application/json'
                  },
                  body: JSON.stringify({
                    items: [
                      {
                        id:
                          Number(
                            variantId
                          ),
                        quantity: 1
                      }
                    ]
                  })
                }
              );

            if (!response.ok) {
              const errorData =
                await response
                  .json()
                  .catch(
                    () => null
                  );

              throw new Error(
                errorData?.description ||
                errorData?.message ||
                'Unable to add product to cart.'
              );
            }

            const addedItem =
              await response.json();


            /*
             * Update button state.
             */

            button.classList.remove(
              'is-loading'
            );

            button.classList.add(
              'is-added'
            );

            button.textContent =
              'Added';


            /*
             * Notify cart drawer.
             */

            document.dispatchEvent(
              new CustomEvent(
                'hargx:cart-add-success',
                {
                  bubbles: true,
                  detail: {
                    item:
                      addedItem
                  }
                }
              )
            );


            /*
             * Normal cart update
             * event for other components.
             */

            document.dispatchEvent(
              new CustomEvent(
                'hargx:cart-updated',
                {
                  bubbles: true,
                  detail: {
                    item:
                      addedItem
                  }
                }
              )
            );


            setTimeout(
              () => {
                button.classList.remove(
                  'is-added'
                );

                button.removeAttribute(
                  'aria-disabled'
                );

                button.textContent =
                  originalText;
              },
              1800
            );

          } catch (error) {
            console.error(
              'HARGX complementary product add failed:',
              error
            );

            button.classList.remove(
              'is-loading'
            );

            button.removeAttribute(
              'aria-disabled'
            );

            button.textContent =
              'Try again';

            setTimeout(
              () => {
                button.textContent =
                  originalText;
              },
              1800
            );
          }
        }
      );
    }
  );
}


/* =========================================================
   SLIDER
   ========================================================= */

function initHargxComplementarySlider(
  container
) {
  const displayMode =
    container.dataset.displayMode;

  if (
    displayMode !==
    'slider'
  ) {
    return;
  }

  const list =
    container.querySelector(
      '[data-hargx-complementary-list]'
    );

  const previousButton =
    container.querySelector(
      '[data-complementary-prev]'
    );

  const nextButton =
    container.querySelector(
      '[data-complementary-next]'
    );

  if (
    !list ||
    !previousButton ||
    !nextButton
  ) {
    return;
  }

  if (
    list.dataset
      .sliderInitialized ===
    'true'
  ) {
    return;
  }

  list.dataset
    .sliderInitialized =
    'true';


  const getScrollAmount =
    () => {
      const card =
        list.querySelector(
          '[data-complementary-product]'
        );

      if (!card) {
        return list.clientWidth;
      }

      const cardWidth =
        card.getBoundingClientRect()
          .width;

      const gap =
        parseFloat(
          window.getComputedStyle(
            list
          ).gap
        ) || 0;

      return (
        cardWidth +
        gap
      );
    };


  const updateArrowState =
    () => {
      const maxScrollLeft =
        list.scrollWidth -
        list.clientWidth;

      previousButton.disabled =
        list.scrollLeft <= 1;

      nextButton.disabled =
        list.scrollLeft >=
        maxScrollLeft - 1;
    };


  previousButton.addEventListener(
    'click',
    () => {
      list.scrollBy({
        left:
          -getScrollAmount(),
        behavior:
          'smooth'
      });
    }
  );


  nextButton.addEventListener(
    'click',
    () => {
      list.scrollBy({
        left:
          getScrollAmount(),
        behavior:
          'smooth'
      });
    }
  );


  list.addEventListener(
    'scroll',
    updateArrowState,
    {
      passive: true
    }
  );


  window.addEventListener(
    'resize',
    updateArrowState
  );


  updateArrowState();
}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    initHargxComplementaryProducts
  );
} else {
  initHargxComplementaryProducts();
}


/* =========================================================
   SHOPIFY THEME EDITOR
   ========================================================= */

document.addEventListener(
  'shopify:section:load',
  (event) => {
    if (
      event.target.querySelector(
        '[data-hargx-complementary-products]'
      )
    ) {
      initHargxComplementaryProducts();
    }
  }
);