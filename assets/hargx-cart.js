(function () {
  'use strict';

  function initHargxCart() {
    const cart = document.querySelector('[data-hargx-cart]');

    if (!cart) {
      return;
    }

    if (cart.dataset.hargxCartInitialized === 'true') {
      return;
    }

    cart.dataset.hargxCartInitialized = 'true';

    bindQuantityButtons(cart);
    bindQuantityInputs(cart);
    bindRemoveButtons(cart);
  }


  /* =========================================================
     Quantity Buttons
     ========================================================= */

  function bindQuantityButtons(cart) {
    const minusButtons = cart.querySelectorAll(
      '[data-hargx-quantity-minus]'
    );

    const plusButtons = cart.querySelectorAll(
      '[data-hargx-quantity-plus]'
    );


    minusButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const item = button.closest('[data-hargx-cart-item]');
        const input = item?.querySelector(
          '[data-hargx-quantity-input]'
        );

        if (!item || !input) {
          return;
        }

        const currentQuantity = parseInt(input.value, 10) || 0;

        const newQuantity = Math.max(
          currentQuantity - 1,
          0
        );

        updateCartLine(
          cart,
          getLineNumber(item),
          newQuantity
        );
      });
    });


    plusButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const item = button.closest('[data-hargx-cart-item]');
        const input = item?.querySelector(
          '[data-hargx-quantity-input]'
        );

        if (!item || !input) {
          return;
        }

        const currentQuantity = parseInt(input.value, 10) || 0;

        const newQuantity = currentQuantity + 1;

        updateCartLine(
          cart,
          getLineNumber(item),
          newQuantity
        );
      });
    });
  }


  /* =========================================================
     Manual Quantity Input
     ========================================================= */

  function bindQuantityInputs(cart) {
    const inputs = cart.querySelectorAll(
      '[data-hargx-quantity-input]'
    );

    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        const item = input.closest(
          '[data-hargx-cart-item]'
        );

        if (!item) {
          return;
        }

        let quantity = parseInt(input.value, 10);

        if (Number.isNaN(quantity)) {
          quantity = 1;
        }

        quantity = Math.max(quantity, 0);

        input.value = quantity;

        updateCartLine(
          cart,
          getLineNumber(item),
          quantity
        );
      });


      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') {
          return;
        }

        event.preventDefault();

        input.blur();
      });
    });
  }


  /* =========================================================
     Remove Buttons
     ========================================================= */

  function bindRemoveButtons(cart) {
    const removeButtons = cart.querySelectorAll(
      '[data-hargx-remove]'
    );

    removeButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();

        const item = button.closest(
          '[data-hargx-cart-item]'
        );

        if (!item) {
          return;
        }

        updateCartLine(
          cart,
          getLineNumber(item),
          0
        );
      });
    });
  }


  /* =========================================================
     Get Line Number
     ========================================================= */

  function getLineNumber(item) {
    return parseInt(
      item.dataset.line,
      10
    );
  }


  /* =========================================================
     Update Cart Line
     ========================================================= */

  async function updateCartLine(
    cart,
    line,
    quantity
  ) {
    if (!line || Number.isNaN(line)) {
      return;
    }

    if (cart.dataset.hargxCartUpdating === 'true') {
      return;
    }

    cart.dataset.hargxCartUpdating = 'true';

    const item = cart.querySelector(
      `[data-line="${line}"]`
    );

    setCartLoading(item, true);


    try {
      const response = await fetch(
        window.Shopify.routes.root + 'cart/change.js',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            line: line,
            quantity: quantity
          })
        }
      );


      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.description ||
          errorData?.message ||
          'Unable to update cart.'
        );
      }


      const updatedCart = await response.json();

      updateCartItemCount(
        updatedCart.item_count
      );

      updateCartSubtotal(
        updatedCart.total_price
      );


      if (quantity === 0) {
        removeCartItemFromDom(item);
      } else {
        updateCartLineDom(
          item,
          updatedCart,
          line
        );
      }


      if (updatedCart.item_count === 0) {
        renderEmptyCart(cart);
      }


      document.dispatchEvent(
        new CustomEvent(
          'hargx:cart-updated',
          {
            bubbles: true,
            detail: {
              cart: updatedCart
            }
          }
        )
      );


    } catch (error) {

      console.error(
        'HARGX cart update failed:',
        error
      );

      showCartError(
        cart,
        error.message
      );

    } finally {

      setCartLoading(item, false);

      cart.dataset.hargxCartUpdating = 'false';
    }
  }


  /* =========================================================
     Update Line DOM
     ========================================================= */

  function updateCartLineDom(
    item,
    cartData,
    line
  ) {
    if (!item) {
      return;
    }

    const cartItem = cartData.items[line - 1];

    if (!cartItem) {
      return;
    }


    const quantityInput = item.querySelector(
      '[data-hargx-quantity-input]'
    );

    if (quantityInput) {
      quantityInput.value =
        cartItem.quantity;
    }


    const desktopPrice = item.querySelector(
      '.hargx-cart-item__price'
    );

    if (desktopPrice) {
      desktopPrice.innerHTML =
        formatLinePrice(cartItem);
    }


    const mobilePrice = item.querySelector(
      '.hargx-cart-item__mobile-price'
    );

    if (mobilePrice) {
      mobilePrice.innerHTML =
        formatMoney(cartItem.final_line_price);
    }
  }


  /* =========================================================
     Remove Line From DOM
     ========================================================= */

  function removeCartItemFromDom(item) {
    if (!item) {
      return;
    }

    item.classList.add(
      'hargx-cart-item--removing'
    );

    setTimeout(() => {
      item.remove();
    }, 220);
  }


  /* =========================================================
     Empty Cart
     ========================================================= */

  function renderEmptyCart(cart) {
    const container = cart.querySelector(
      '.hargx-cart__container'
    );

    if (!container) {
      return;
    }

    container.innerHTML = `
      <div class="hargx-cart__empty">

        <div class="hargx-cart__empty-content">

          <span
            class="hargx-cart__empty-icon"
            aria-hidden="true"
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 14H38L35.5 39H12.5L10 14Z"
                stroke="currentColor"
                stroke-width="1.5"
              />

              <path
                d="M17 18V11C17 7.68629 19.6863 5 23 5H25C28.3137 5 31 7.68629 31 11V18"
                stroke="currentColor"
                stroke-width="1.5"
              />
            </svg>
          </span>

          <h1 class="hargx-cart__empty-title">
            Your cart is empty
          </h1>

          <p class="hargx-cart__empty-text">
            Looks like you haven't added anything yet.
          </p>

          <a
            href="${window.Shopify.routes.root}collections/all"
            class="hargx-cart__empty-button"
          >
            Continue shopping
          </a>

        </div>

      </div>
    `;
  }


  /* =========================================================
     Cart Count
     ========================================================= */

  function updateCartItemCount(itemCount) {
    const countElements =
      document.querySelectorAll(
        '.hargx-cart__count'
      );

    countElements.forEach((element) => {
      element.textContent =
        `${itemCount} ${
          itemCount === 1
            ? 'item'
            : 'items'
        }`;
    });


    /*
     * Also update common HARGX header
     * cart count if it exists.
     */

    const headerCount =
      document.querySelectorAll(
        '[data-hargx-cart-count]'
      );

    headerCount.forEach((element) => {
      element.textContent =
        itemCount;
    });
  }


  /* =========================================================
     Cart Subtotal
     ========================================================= */

  function updateCartSubtotal(totalPrice) {
    const subtotalElements =
      document.querySelectorAll(
        '.hargx-cart__summary-row span:last-child'
      );

    subtotalElements.forEach((element) => {
      element.textContent =
        formatMoney(totalPrice);
    });
  }


  /* =========================================================
     Money Formatting
     ========================================================= */

  function formatMoney(cents) {
    const amount =
      Number(cents) / 100;

    const currency =
      window.Shopify.currency?.active ||
      'USD';

    try {
      return new Intl.NumberFormat(
        document.documentElement.lang || 'en',
        {
          style: 'currency',
          currency: currency
        }
      ).format(amount);
    } catch (error) {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }


  function formatLinePrice(item) {
    if (
      item.original_line_price >
      item.final_line_price
    ) {
      return `
        <span class="hargx-cart-item__price--sale">
          ${formatMoney(item.final_line_price)}
        </span>

        <span class="hargx-cart-item__price--compare">
          ${formatMoney(item.original_line_price)}
        </span>
      `;
    }

    return `
      <span>
        ${formatMoney(item.final_line_price)}
      </span>
    `;
  }


  /* =========================================================
     Loading State
     ========================================================= */

  function setCartLoading(
    item,
    loading
  ) {
    if (!item) {
      return;
    }

    item.classList.toggle(
      'is-loading',
      loading
    );


    const buttons =
      item.querySelectorAll(
        'button, a, input'
      );

    buttons.forEach((element) => {
      if (loading) {
        element.setAttribute(
          'aria-disabled',
          'true'
        );
      } else {
        element.removeAttribute(
          'aria-disabled'
        );
      }
    });
  }


  /* =========================================================
     Error
     ========================================================= */

  function showCartError(
    cart,
    message
  ) {
    let error =
      cart.querySelector(
        '[data-hargx-cart-error]'
      );

    if (!error) {
      error =
        document.createElement('div');

      error.className =
        'hargx-cart__error';

      error.setAttribute(
        'data-hargx-cart-error',
        ''
      );

      const container =
        cart.querySelector(
          '.hargx-cart__container'
        );

      if (container) {
        container.prepend(error);
      }
    }

    error.textContent =
      message ||
      'Something went wrong. Please try again.';

    error.classList.add('is-visible');


    setTimeout(() => {
      error.classList.remove(
        'is-visible'
      );
    }, 3500);
  }


  /* =========================================================
     Initial Load
     ========================================================= */

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initHargxCart
    );
  } else {
    initHargxCart();
  }


  /* =========================================================
     Shopify Theme Editor
     ========================================================= */

  document.addEventListener(
    'shopify:section:load',
    (event) => {
      if (
        event.target.querySelector(
          '[data-hargx-cart]'
        )
      ) {
        initHargxCart();
      }
    }
  );

})();