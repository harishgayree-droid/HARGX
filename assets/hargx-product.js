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
    console.error('HARGX Product: Unable to read product data.', error);
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
        String(variant.id) === String(productData.selectedVariantId)
    ) ||
    productData.variants[0];


  /*
   * ------------------------------------------------------------
   * Money
   * ------------------------------------------------------------
   */

  function formatMoney(cents) {
    if (window.Shopify?.formatMoney) {
      const moneyFormat =
        window.Shopify.money_format ||
        window.theme?.moneyFormat ||
        '${{amount}}';

      return window.Shopify.formatMoney(
        cents,
        moneyFormat
      );
    }

    return `${(Number(cents) / 100).toFixed(2)}`;
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
   *
   * IMPORTANT:
   * If product has no variant picker,
   * the current/default variant is returned directly.
   * ------------------------------------------------------------
   */

  function findVariant() {

    if (!optionInputs.length) {
      return activeVariant || productData.variants[0];
    }

    const selectedOptions = getSelectedOptions();

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

      if (compareAtPrice > currentPrice) {

        priceCompare.hidden = false;
        priceCompare.textContent =
          formatMoney(compareAtPrice);

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
        variant.inventory_management === 'shopify' &&
        Number(variant.inventory_quantity) > 0 &&
        Number(variant.inventory_quantity) <= 5
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

    const variant = findVariant();

    if (!variant) {

      if (addToCartButton) {
        addToCartButton.disabled = true;
      }

      return;
    }

    activeVariant = variant;


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

    updatePrice(variant);
    updateAvailability(variant);


    /*
     * Update URL
     *
     * Only when the product actually has options.
     */

    if (optionInputs.length) {

      const url =
        new URL(window.location.href);

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
        parseInt(value, 10) || 1
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
   * Add to Cart
   * ------------------------------------------------------------
   */

  productForm.addEventListener(
    'submit',
    () => {

      const variant =
        findVariant();

      if (!variant) {
        return;
      }

      if (variantInput) {
        variantInput.value =
          variant.id;
      }

      updateQuantity(
        getQuantity()
      );

    }
  );


  /*
   * ------------------------------------------------------------
   * Initial State
   * ------------------------------------------------------------
   */

  updateVariant();
}