(function () {
  'use strict';

  const SELECTORS = {
    drawer: '[data-hargx-cart-drawer]',
    overlay: '[data-hargx-cart-drawer-overlay]',
    close: '[data-hargx-cart-drawer-close]',
    count: '[data-hargx-drawer-count]',
    subtotal: '[data-hargx-drawer-subtotal]',
    item: '[data-hargx-drawer-item]',
    items: '[data-hargx-drawer-items]',
    minus: '[data-hargx-drawer-minus]',
    plus: '[data-hargx-drawer-plus]',
    quantityInput: '[data-hargx-drawer-quantity-input]',
    remove: '[data-hargx-drawer-remove]',
    shipping: '[data-hargx-drawer-shipping]',
    noteToggle: '[data-hargx-drawer-note-toggle]',
    noteContent: '[data-hargx-drawer-note-content]',
    noteInput: '[data-hargx-drawer-note]',
    noteCount: '[data-hargx-drawer-note-count]',
    noteSave: '[data-hargx-drawer-note-save]',
    upsellAdd: '[data-hargx-drawer-upsell-add]',
    checkout: '[data-hargx-drawer-checkout]'
  };

  let activeDrawer = null;
  let lastFocusedElement = null;


  /* =========================================================
     INIT
     ========================================================= */

  function initHargxCartDrawer() {
    const drawer = document.querySelector(SELECTORS.drawer);

    if (!drawer) return;

    if (drawer.dataset.hargxDrawerInitialized === 'true') {
      return;
    }

    drawer.dataset.hargxDrawerInitialized = 'true';

    bindDrawerControls(drawer);
    bindCartItems(drawer);
    bindOrderNote(drawer);
    bindUpsells(drawer);
    bindCheckout(drawer);
  }


  /* =========================================================
     DRAWER OPEN / CLOSE
     ========================================================= */

  function bindDrawerControls(drawer) {
    const overlay = drawer.querySelector(SELECTORS.overlay);
    const closeButton = drawer.querySelector(SELECTORS.close);

    if (overlay) {
      overlay.addEventListener('click', function () {
        closeDrawer(drawer);
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', function () {
        closeDrawer(drawer);
      });
    }
  }


  function openDrawer(drawer) {
    if (!drawer) return;

    lastFocusedElement = document.activeElement;
    activeDrawer = drawer;

    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');

    document.documentElement.classList.add('hargx-cart-drawer-open');
    document.body.classList.add('hargx-cart-drawer-open');

    const closeButton = drawer.querySelector(SELECTORS.close);

    if (closeButton) {
      requestAnimationFrame(function () {
        closeButton.focus();
      });
    }
  }


  function closeDrawer(drawer) {
    if (!drawer) return;

    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');

    document.documentElement.classList.remove('hargx-cart-drawer-open');
    document.body.classList.remove('hargx-cart-drawer-open');

    activeDrawer = null;

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === 'function'
    ) {
      try {
        lastFocusedElement.focus();
      } catch (error) {
        // Ignore focus restoration errors.
      }
    }

    lastFocusedElement = null;
  }


  /* =========================================================
     GLOBAL OPEN EVENT
     ========================================================= */

  function bindGlobalDrawerEvents() {
    document.addEventListener('click', function (event) {
      const openTrigger = event.target.closest(
        '[data-hargx-cart-drawer-open]'
      );

      if (!openTrigger) return;

      const drawer = document.querySelector(
        SELECTORS.drawer
      );

      if (!drawer) return;

      event.preventDefault();

      openDrawer(drawer);
    });


    document.addEventListener('keydown', function (event) {
      if (!activeDrawer) return;

      if (event.key === 'Escape') {
        closeDrawer(activeDrawer);
        return;
      }

      if (event.key === 'Tab') {
        trapFocus(activeDrawer, event);
      }
    });


    document.addEventListener(
      'hargx:open-cart-drawer',
      function () {
        const drawer = document.querySelector(
          SELECTORS.drawer
        );

        if (drawer) {
          openDrawer(drawer);
        }
      }
    );
  }


  /* =========================================================
     FOCUS TRAP
     ========================================================= */

  function trapFocus(drawer, event) {
    const focusableElements = drawer.querySelectorAll(
      'button:not([disabled]), ' +
      '[href], ' +
      'input:not([disabled]), ' +
      'textarea:not([disabled]), ' +
      'select:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement =
      focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === lastElement
    ) {
      event.preventDefault();
      firstElement.focus();
    }
  }


  /* =========================================================
     CART ITEM EVENTS
     ========================================================= */

  function bindCartItems(drawer) {
    const minusButtons = drawer.querySelectorAll(
      SELECTORS.minus
    );

    const plusButtons = drawer.querySelectorAll(
      SELECTORS.plus
    );

    const quantityInputs = drawer.querySelectorAll(
      SELECTORS.quantityInput
    );

    const removeButtons = drawer.querySelectorAll(
      SELECTORS.remove
    );


    minusButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        const item = button.closest(
          SELECTORS.item
        );

        if (!item) return;

        const input = item.querySelector(
          SELECTORS.quantityInput
        );

        if (!input) return;

        const currentQuantity =
          parseInt(input.value, 10) || 0;

        const newQuantity = Math.max(
          currentQuantity - 1,
          0
        );

        updateDrawerLine(
          drawer,
          getLineNumber(item),
          newQuantity,
          item
        );
      });
    });


    plusButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        const item = button.closest(
          SELECTORS.item
        );

        if (!item) return;

        const input = item.querySelector(
          SELECTORS.quantityInput
        );

        if (!input) return;

        const currentQuantity =
          parseInt(input.value, 10) || 0;

        const newQuantity =
          currentQuantity + 1;

        updateDrawerLine(
          drawer,
          getLineNumber(item),
          newQuantity,
          item
        );
      });
    });


    quantityInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        const item = input.closest(
          SELECTORS.item
        );

        if (!item) return;

        let quantity =
          parseInt(input.value, 10);

        if (Number.isNaN(quantity)) {
          quantity = 1;
        }

        quantity = Math.max(
          quantity,
          0
        );

        input.value = quantity;

        updateDrawerLine(
          drawer,
          getLineNumber(item),
          quantity,
          item
        );
      });


      input.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        input.blur();
      });
    });


    removeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        const item = button.closest(
          SELECTORS.item
        );

        if (!item) return;

        updateDrawerLine(
          drawer,
          getLineNumber(item),
          0,
          item
        );
      });
    });
  }


  /* =========================================================
     CART LINE UPDATE
     ========================================================= */

  async function updateDrawerLine(
    drawer,
    line,
    quantity,
    item
  ) {
    if (!line || Number.isNaN(line)) {
      return;
    }

    if (
      drawer.dataset.hargxDrawerUpdating === 'true'
    ) {
      return;
    }

    drawer.dataset.hargxDrawerUpdating = 'true';

    setItemLoading(item, true);

    try {
      const response = await fetch(
        window.Shopify.routes.root +
          'cart/change.js',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            line: line,
            quantity: quantity
          })
        }
      );

      if (!response.ok) {
        const errorData =
          await response.json()
            .catch(function () {
              return null;
            });

        throw new Error(
          errorData?.description ||
          errorData?.message ||
          'Unable to update cart.'
        );
      }

      const cartData =
        await response.json();

      if (quantity === 0) {
        removeDrawerItem(item);
      } else {
        updateDrawerItem(
          item,
          cartData,
          line
        );
      }

      updateDrawerTotals(
        drawer,
        cartData
      );

      if (cartData.item_count === 0) {
        renderDrawerEmptyState(drawer);
      } else {
        refreshDrawerIndexes(drawer);
      }

      dispatchCartUpdated(cartData);

    } catch (error) {
      console.error(
        'HARGX cart drawer update failed:',
        error
      );

      showDrawerError(
        drawer,
        error.message ||
          'Unable to update cart.'
      );

      if (item) {
        const input = item.querySelector(
          SELECTORS.quantityInput
        );

        if (input) {
          input.value =
            input.dataset.previousQuantity ||
            input.value;
        }
      }

    } finally {
      setItemLoading(item, false);

      drawer.dataset.hargxDrawerUpdating =
        'false';
    }
  }


  /* =========================================================
     ITEM DOM UPDATE
     ========================================================= */

  function updateDrawerItem(
    item,
    cartData,
    line
  ) {
    if (!item) return;

    const cartItem =
      cartData.items[line - 1];

    if (!cartItem) return;

    const quantityInput =
      item.querySelector(
        SELECTORS.quantityInput
      );

    if (quantityInput) {
      quantityInput.value =
        cartItem.quantity;
    }

    const price =
      item.querySelector(
        '.hargx-cart-drawer-item__price'
      );

    if (price) {
      price.innerHTML =
        formatLinePrice(cartItem);
    }
  }


  function removeDrawerItem(item) {
    if (!item) return;

    item.classList.add(
      'hargx-cart-drawer-item--removing'
    );

    setTimeout(function () {
      item.remove();
    }, 220);
  }


  function refreshDrawerIndexes(drawer) {
    const items =
      drawer.querySelectorAll(
        SELECTORS.item
      );

    items.forEach(function (item, index) {
      item.dataset.line =
        String(index + 1);
    });
  }


  /* =========================================================
     CART TOTALS
     ========================================================= */

  function updateDrawerTotals(
    drawer,
    cartData
  ) {
    updateDrawerCount(
      cartData.item_count
    );

    updateDrawerSubtotal(
      drawer,
      cartData.total_price
    );

    updateDrawerShipping(
      drawer,
      cartData
    );

    updateMainCartCount(
      cartData.item_count
    );
  }


  function updateDrawerCount(itemCount) {
    const elements =
      document.querySelectorAll(
        SELECTORS.count
      );

    elements.forEach(function (element) {
      element.textContent =
        itemCount;
    });
  }


  function updateDrawerSubtotal(
    drawer,
    totalPrice
  ) {
    const subtotal =
      drawer.querySelector(
        SELECTORS.subtotal
      );

    if (!subtotal) return;

    subtotal.textContent =
      formatMoney(totalPrice);
  }


  function updateMainCartCount(
    itemCount
  ) {
    const elements =
      document.querySelectorAll(
        '[data-hargx-cart-count], ' +
        '.hargx-cart__count'
      );

    elements.forEach(function (element) {
      if (
        element.classList.contains(
          'hargx-cart__count'
        )
      ) {
        element.textContent =
          `${itemCount} ${
            itemCount === 1
              ? 'item'
              : 'items'
          }`;
      } else {
        element.textContent =
          itemCount;
      }
    });
  }


  /* =========================================================
     FREE SHIPPING
     ========================================================= */

  function updateDrawerShipping(
    drawer,
    cartData
  ) {
    const shipping =
      drawer.querySelector(
        SELECTORS.shipping
      );

    if (!shipping) return;

    const threshold =
      Number(
        shipping.dataset.threshold
      );

    if (!threshold) return;

    const total =
      Number(
        cartData.total_price || 0
      );

    const remaining =
      Math.max(
        threshold - total,
        0
      );

    const percentage =
      Math.min(
        (total / threshold) * 100,
        100
      );

    const message =
      shipping.querySelector(
        '.hargx-cart-drawer__shipping-message'
      );

    const fill =
      shipping.querySelector(
        '.hargx-cart-drawer__shipping-fill'
      );

    const track =
      shipping.querySelector(
        '.hargx-cart-drawer__shipping-track'
      );

    if (fill) {
      fill.style.width =
        `${percentage}%`;
    }

    if (track) {
      track.setAttribute(
        'aria-valuenow',
        Math.round(percentage)
      );
    }

    if (!message) return;

    if (remaining > 0) {
      message.innerHTML = `
        You're
        <strong>
          ${formatMoney(remaining)}
        </strong>
        away from free shipping.
      `;
    } else {
      message.innerHTML = `
        You've unlocked
        <strong>
          free shipping!
        </strong>
      `;
    }
  }


  /* =========================================================
     ORDER NOTE
     ========================================================= */

  function bindOrderNote(drawer) {
    const toggle =
      drawer.querySelector(
        SELECTORS.noteToggle
      );

    const content =
      drawer.querySelector(
        SELECTORS.noteContent
      );

    const textarea =
      drawer.querySelector(
        SELECTORS.noteInput
      );

    const count =
      drawer.querySelector(
        SELECTORS.noteCount
      );

    const saveButton =
      drawer.querySelector(
        SELECTORS.noteSave
      );

    if (
      !toggle ||
      !content ||
      !textarea ||
      !saveButton
    ) {
      return;
    }

    toggle.addEventListener(
      'click',
      function () {
        const expanded =
          toggle.getAttribute(
            'aria-expanded'
          ) === 'true';

        toggle.setAttribute(
          'aria-expanded',
          String(!expanded)
        );

        content.hidden =
          expanded;

        if (!expanded) {
          textarea.focus();
        }
      }
    );


    function updateNoteCount() {
      if (!count) return;

      count.textContent =
        textarea.value.length;
    }


    textarea.addEventListener(
      'input',
      updateNoteCount
    );

    updateNoteCount();


    saveButton.addEventListener(
      'click',
      async function () {
        if (
          saveButton.classList.contains(
            'is-loading'
          )
        ) {
          return;
        }

        const note =
          textarea.value.trim();

        const originalText =
          saveButton.textContent;

        saveButton.classList.add(
          'is-loading'
        );

        saveButton.disabled = true;
        saveButton.textContent =
          'Saving...';

        try {
          const response =
            await fetch(
              window.Shopify.routes.root +
                'cart/update.js',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                  Accept:
                    'application/json'
                },
                body: JSON.stringify({
                  note: note
                })
              }
            );

          if (!response.ok) {
            const errorData =
              await response.json()
                .catch(function () {
                  return null;
                });

            throw new Error(
              errorData?.description ||
              errorData?.message ||
              'Unable to save note.'
            );
          }

          await response.json();

          saveButton.textContent =
            'Saved';

          setTimeout(function () {
            saveButton.textContent =
              originalText;

            saveButton.classList.remove(
              'is-loading'
            );

            saveButton.disabled = false;
          }, 1200);

        } catch (error) {
          console.error(
            'HARGX drawer note save failed:',
            error
          );

          saveButton.textContent =
            'Try again';

          saveButton.classList.remove(
            'is-loading'
          );

          saveButton.disabled = false;
        }
      }
    );
  }


  /* =========================================================
     UPSELL
     ========================================================= */

  function bindUpsells(drawer) {
    const buttons =
      drawer.querySelectorAll(
        SELECTORS.upsellAdd
      );

    buttons.forEach(function (button) {
      button.addEventListener(
        'click',
        function () {
          const variantId =
            Number(
              button.dataset.variantId
            );

          if (!variantId) return;

          addUpsellProduct(
            drawer,
            button,
            variantId
          );
        }
      );
    });
  }


  async function addUpsellProduct(
    drawer,
    button,
    variantId
  ) {
    if (
      button.classList.contains(
        'is-loading'
      )
    ) {
      return;
    }

    const originalText =
      button.textContent;

    button.classList.add(
      'is-loading'
    );

    button.disabled = true;
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
                  id: variantId,
                  quantity: 1
                }
              ]
            })
          }
        );

      if (!response.ok) {
        const errorData =
          await response.json()
            .catch(function () {
              return null;
            });

        throw new Error(
          errorData?.description ||
          errorData?.message ||
          'Unable to add product.'
        );
      }

      await response.json();

      const cartResponse =
        await fetch(
          window.Shopify.routes.root +
            'cart.js',
          {
            headers: {
              Accept:
                'application/json'
            }
          }
        );

      if (!cartResponse.ok) {
        throw new Error(
          'Unable to refresh cart.'
        );
      }

      const cartData =
        await cartResponse.json();

      button.textContent =
        'Added';

      updateDrawerFromCart(
        drawer,
        cartData
      );

      dispatchCartUpdated(
        cartData
      );

      setTimeout(function () {
        button.textContent =
          originalText;

        button.classList.remove(
          'is-loading'
        );

        button.disabled = false;
      }, 900);

    } catch (error) {
      console.error(
        'HARGX drawer upsell failed:',
        error
      );

      button.textContent =
        'Try again';

      button.classList.remove(
        'is-loading'
      );

      button.disabled = false;

      setTimeout(function () {
        button.textContent =
          originalText;
      }, 1800);
    }
  }


  /* =========================================================
     CHECKOUT
     ========================================================= */

  function bindCheckout(drawer) {
    const checkoutButton =
      drawer.querySelector(
        SELECTORS.checkout
      );

    if (!checkoutButton) return;

    checkoutButton.addEventListener(
      'click',
      function () {
        window.location.href =
          window.Shopify.routes.root +
          'checkout';
      }
    );
  }


  /* =========================================================
     REFRESH DRAWER FROM CART
     ========================================================= */

  function updateDrawerFromCart(
    drawer,
    cartData
  ) {
    updateDrawerCount(
      cartData.item_count
    );

    updateDrawerSubtotal(
      drawer,
      cartData.total_price
    );

    updateDrawerShipping(
      drawer,
      cartData
    );

    updateMainCartCount(
      cartData.item_count
    );

    /*
     * We do not rebuild the complete drawer HTML here.
     * Existing cart items remain intact.
     * For newly-added upsell products, the safest approach
     * is to refresh the cart drawer section from Shopify.
     */
    refreshDrawerSection(drawer);
  }


  /* =========================================================
     SHOPIFY SECTION REFRESH
     ========================================================= */

  async function refreshDrawerSection(
    drawer
  ) {
    const sectionId =
      drawer.dataset.sectionId;

    if (!sectionId) return;

    try {
      const url =
        window.Shopify.routes.root +
        `?sections=${encodeURIComponent(
          sectionId
        )}`;

      const response =
        await fetch(url, {
          headers: {
            Accept:
              'application/json'
          }
        });

      if (!response.ok) return;

      const sections =
        await response.json();

      const html =
        sections[sectionId];

      if (!html) return;

      const parser =
        new DOMParser();

      const documentHTML =
        parser.parseFromString(
          html,
          'text/html'
        );

      const newDrawer =
        documentHTML.querySelector(
          SELECTORS.drawer
        );

      if (!newDrawer) return;

      drawer.innerHTML =
        newDrawer.innerHTML;

      /*
       * Re-bind controls after replacing
       * the drawer contents.
       */
      drawer.dataset.hargxDrawerInitialized =
        'false';

      drawer.dataset.hargxDrawerUpdating =
        'false';

      bindDrawerControls(drawer);
      bindCartItems(drawer);
      bindOrderNote(drawer);
      bindUpsells(drawer);
      bindCheckout(drawer);

    } catch (error) {
      console.error(
        'HARGX drawer section refresh failed:',
        error
      );
    }
  }


  /* =========================================================
     EMPTY CART
     ========================================================= */

  function renderDrawerEmptyState(
    drawer
  ) {
    const body =
      drawer.querySelector(
        '.hargx-cart-drawer__body'
      );

    const footer =
      drawer.querySelector(
        '.hargx-cart-drawer__footer'
      );

    if (body) {
      body.innerHTML = `
        <div class="hargx-cart-drawer__empty">

          <div class="hargx-cart-drawer__empty-icon">
            <svg
              width="46"
              height="46"
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
                d="M17 18V11C17 7.686 19.686 5 23 5H25C28.314 5 31 7.686 31 11V18"
                stroke="currentColor"
                stroke-width="1.5"
              />
            </svg>
          </div>

          <h3>
            Your cart is empty
          </h3>

          <p>
            Looks like you haven't added anything yet.
          </p>

          <a
            href="${window.Shopify.routes.root}collections/all"
            class="hargx-cart-drawer__empty-button"
          >
            Continue shopping
          </a>

        </div>
      `;
    }

    if (footer) {
      footer.remove();
    }
  }


  /* =========================================================
     LOADING STATE
     ========================================================= */

  function setItemLoading(
    item,
    loading
  ) {
    if (!item) return;

    item.classList.toggle(
      'is-loading',
      loading
    );

    const controls =
      item.querySelectorAll(
        'button, input'
      );

    controls.forEach(function (element) {
      element.disabled =
        loading;
    });
  }


  /* =========================================================
     ERROR
     ========================================================= */

  function showDrawerError(
    drawer,
    message
  ) {
    let error =
      drawer.querySelector(
        '[data-hargx-drawer-error]'
      );

    if (!error) {
      error =
        document.createElement(
          'div'
        );

      error.className =
        'hargx-cart-drawer__error';

      error.dataset.hargxDrawerError =
        '';

      error.style.cssText = `
        position: absolute;
        top: 72px;
        left: 16px;
        right: 16px;
        z-index: 5;
        padding: 10px 12px;
        background: #fff;
        border: 1px solid var(--color-border);
        font-size: 11px;
        line-height: 1.5;
      `;

      const panel =
        drawer.querySelector(
          '.hargx-cart-drawer__panel'
        );

      if (panel) {
        panel.appendChild(error);
      }
    }

    error.textContent =
      message ||
      'Something went wrong. Please try again.';

    error.classList.add(
      'is-visible'
    );

    setTimeout(function () {
      error.classList.remove(
        'is-visible'
      );
    }, 3500);
  }


  /* =========================================================
     HELPERS
     ========================================================= */

  function getLineNumber(item) {
    return parseInt(
      item?.dataset?.line,
      10
    );
  }


  function formatMoney(cents) {
    const amount =
      Number(cents) / 100;

    const currency =
      window.Shopify.currency?.active ||
      'USD';

    try {
      return new Intl.NumberFormat(
        document.documentElement
          .lang || 'en',
        {
          style: 'currency',
          currency: currency
        }
      ).format(amount);

    } catch (error) {
      return `${amount.toFixed(
        2
      )} ${currency}`;
    }
  }


  function formatLinePrice(item) {
    if (
      item.original_line_price >
      item.final_line_price
    ) {
      return `
        <span class="hargx-cart-drawer-item__price--sale">
          ${formatMoney(
            item.final_line_price
          )}
        </span>

        <span class="hargx-cart-drawer-item__price--compare">
          ${formatMoney(
            item.original_line_price
          )}
        </span>
      `;
    }

    return `
      <span>
        ${formatMoney(
          item.final_line_price
        )}
      </span>
    `;
  }


  function dispatchCartUpdated(
    cartData
  ) {
    document.dispatchEvent(
      new CustomEvent(
        'hargx:cart-updated',
        {
          bubbles: true,
          detail: {
            cart: cartData
          }
        }
      )
    );
  }


  /* =========================================================
     INITIALIZATION
     ========================================================= */

  bindGlobalDrawerEvents();


  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initHargxCartDrawer
    );
  } else {
    initHargxCartDrawer();
  }


  /* =========================================================
     SHOPIFY THEME EDITOR
     ========================================================= */

  document.addEventListener(
    'shopify:section:load',
    function (event) {
      if (
        event.target.querySelector(
          SELECTORS.drawer
        )
      ) {
        initHargxCartDrawer();
      }
    }
  );


  document.addEventListener(
    'shopify:section:unload',
    function (event) {
      const drawer =
        event.target.querySelector(
          SELECTORS.drawer
        );

      if (
        drawer &&
        activeDrawer === drawer
      ) {
        closeDrawer(drawer);
      }
    }
  );

})();