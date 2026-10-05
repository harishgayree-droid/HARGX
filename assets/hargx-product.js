document.addEventListener('DOMContentLoaded', () => {
  const productSections = document.querySelectorAll(
    '[data-section-id][data-product-id]'
  );

  if (!productSections.length) return;

  productSections.forEach((section) => {
    initHargxProduct(section);
  });
});


function initHargxProduct(section) {
  const productForm = section.querySelector('.hargx-product-form');

  if (!productForm) return;


  /* =========================================================
     PRODUCT DATA
     ========================================================= */

  const productData = window.hargxProducts?.[section.dataset.productId];

  if (!productData) return;


  /* =========================================================
     ELEMENTS
     ========================================================= */

  const variantInput = productForm.querySelector(
    '[data-hargx-variant-id]'
  );

  const priceContainer = section.querySelector(
    '[data-hargx-price]'
  );

  const addToCartButton = productForm.querySelector(
    '[data-hargx-add-to-cart]'
  );

  const addToCartText = productForm.querySelector(
    '[data-hargx-add-text]'
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


  /* =========================================================
     FORMAT MONEY
     ========================================================= */

  function formatMoney(cents) {
    const moneyFormat =
      window.Shopify?.money_format ||
      '${{amount}}';

    if (window.Shopify?.formatMoney) {
      return window.Shopify.formatMoney(
        cents,
        moneyFormat
      );
    }

    return `${(cents / 100).toFixed(2)}`;
  }


  /* =========================================================
     GET SELECTED OPTIONS
     ========================================================= */

  function getSelectedOptions() {
    const selectedOptions = [];

    optionInputs.forEach((input) => {
      if (!input.checked) return;

      const position = Number(
        input.dataset.optionPosition
      );

      selectedOptions[position - 1] = input.value;
    });

    return selectedOptions;
  }


  /* =========================================================
     FIND VARIANT
     ========================================================= */

  function findVariant() {
    const selectedOptions = getSelectedOptions();

    return productData.variants.find((variant) => {

      return variant.options.every(
        (option, index) => {
          return option === selectedOptions[index];
        }
      );

    });
  }


  /* =========================================================
     UPDATE PRICE
     ========================================================= */

  function updatePrice(variant) {
    if (!priceContainer || !variant) return;

    const price = formatMoney(
      variant.price
    );

    const compareAtPrice =
      variant.compare_at_price;

    if (
      compareAtPrice &&
      compareAtPrice > variant.price
    ) {

      priceContainer.innerHTML = `
        <span class="hargx-product__price-current">
          ${price}
        </span>

        <s class="hargx-product__price-compare">
          ${formatMoney(compareAtPrice)}
        </s>

        <span class="hargx-product__price-badge">
          Sale
        </span>
      `;

    } else {

      priceContainer.innerHTML = `
        <span class="hargx-product__price-current">
          ${price}
        </span>
      `;

    }
  }


  /* =========================================================
     UPDATE AVAILABILITY
     ========================================================= */

  function updateAvailability(variant) {
    if (!addToCartButton || !addToCartText) {
      return;
    }

    if (!variant) {

      addToCartButton.disabled = true;

      addToCartText.textContent =
        'Unavailable';

      return;
    }


    if (variant.available) {

      addToCartButton.disabled = false;

      addToCartText.textContent =
        'Add to cart';

    } else {

      addToCartButton.disabled = true;

      addToCartText.textContent =
        'Sold out';

    }
  }


  /* =========================================================
     UPDATE VARIANT
     ========================================================= */

  function updateVariant() {
    const variant = findVariant();

    if (!variant) {
      updateAvailability(null);
      return;
    }


    /* Update hidden variant ID */

    if (variantInput) {
      variantInput.value = variant.id;
    }


    /* Update URL */

    const url = new URL(
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


    /* Update price */

    updatePrice(variant);


    /* Update availability */

    updateAvailability(variant);
  }


  /* =========================================================
     VARIANT EVENTS
     ========================================================= */

  optionInputs.forEach((input) => {

    input.addEventListener(
      'change',
      updateVariant
    );

  });


  /* =========================================================
     QUANTITY
     ========================================================= */

  function getQuantity() {
    if (!quantityInput) return 1;

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
    if (!quantityInput) return;

    quantityInput.value =
      Math.max(
        1,
        parseInt(value, 10) || 1
      );
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


  /* =========================================================
     FORM SUBMIT
     ========================================================= */

  productForm.addEventListener(
    'submit',
    () => {

      if (!variantInput) return;

      const variant =
        findVariant();

      if (!variant) {
        return;
      }

      variantInput.value =
        variant.id;

      if (quantityInput) {
        quantityInput.value =
          getQuantity();
      }

    }
  );


  /* =========================================================
     INITIAL STATE
     ========================================================= */

  updateVariant();
}