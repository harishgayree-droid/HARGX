(function () {
  'use strict';

  var STORAGE_KEY = 'hargx-wishlist-v1';
  var wishlist = [];
  var initialized = false;

  function readStorage() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(value)) return [];
      var seen = {};
      return value.reduce(function (items, item) {
        if (!item || !item.id) return items;
        var id = String(item.id);
        if (seen[id]) return items;
        seen[id] = true;
        items.push({
          id: id,
          variantId: item.variantId ? String(item.variantId) : '',
          handle: item.handle ? String(item.handle) : ''
        });
        return items;
      }, []);
    } catch (error) {
      return [];
    }
  }

  function writeStorage(nextWishlist) {
    wishlist = nextWishlist;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch (error) {
      // The in-memory wishlist remains usable when storage is unavailable.
    }
  }

  function findItem(productId) {
    return wishlist.find(function (item) {
      return item.id === String(productId);
    });
  }

  function updateButtons() {
    document.querySelectorAll('[data-hargx-wishlist-toggle]').forEach(function (button) {
      var saved = Boolean(findItem(button.dataset.productId));
      button.classList.toggle('is-active', saved);
      button.setAttribute('aria-pressed', saved ? 'true' : 'false');
      button.setAttribute(
        'aria-label',
        saved ? 'Remove from wishlist' : 'Add to wishlist'
      );
      button.setAttribute('title', saved ? 'Remove from wishlist' : 'Add to wishlist');
      var productLabel = button.querySelector('[data-hargx-wishlist-product-label]');
      if (productLabel) {
        productLabel.textContent = saved ? 'Remove from wishlist' : 'Save to wishlist';
      }
    });

    document.querySelectorAll('[data-hargx-wishlist-count]').forEach(function (counter) {
      counter.textContent = String(wishlist.length);
      counter.hidden = wishlist.length === 0;
    });
  }

  function announce(message) {
    var region = document.querySelector('[data-hargx-wishlist-status]');
    if (!region) {
      region = document.createElement('div');
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.className = 'visually-hidden';
      region.dataset.hargxWishlistStatus = '';
      document.body.appendChild(region);
    }
    region.textContent = '';
    window.requestAnimationFrame(function () {
      region.textContent = message;
    });
  }

  function toggleWishlist(button) {
    var productId = button.dataset.productId;
    if (!productId) return;

    var existing = findItem(productId);
    if (existing) {
      writeStorage(wishlist.filter(function (item) {
        return item.id !== String(productId);
      }));
      announce('Removed from wishlist');
    } else {
      var next = wishlist.slice();
      next.push({
        id: String(productId),
        variantId: button.dataset.variantId || '',
        handle: button.dataset.productHandle || ''
      });
      writeStorage(next);
      announce('Added to wishlist');
    }

    updateButtons();
    document.dispatchEvent(new CustomEvent('hargx:wishlist-updated', {
      detail: { count: wishlist.length }
    }));
  }

  function cartUrl(path) {
    var root = window.Shopify && window.Shopify.routes
      ? window.Shopify.routes.root
      : '/';
    return root + path.replace(/^\/+/, '');
  }

  async function addToCart(button) {
    if (button.disabled || button.classList.contains('is-loading')) return;

    var variantId = button.dataset.variantId;
    if (!variantId) {
      announce('This product is unavailable.');
      return;
    }

    var originalText = button.querySelector('[data-hargx-wishlist-cart-label]');
    var labelText = originalText ? originalText.textContent : button.textContent;

    button.disabled = true;
    button.classList.add('is-loading');
    if (originalText) originalText.textContent = 'Adding...';

    try {
      var response = await fetch(cartUrl('cart/add.js'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1 }] })
      });

      var data = await response.json().catch(function () { return null; });
      if (!response.ok) {
        throw new Error((data && (data.description || data.message)) || 'Unable to add product.');
      }

      var cartResponse = await fetch(cartUrl('cart.js'), {
        headers: { Accept: 'application/json' }
      });
      var cart = await cartResponse.json();

      document.dispatchEvent(new CustomEvent('hargx:cart-updated', { detail: { cart: cart } }));
      document.dispatchEvent(new CustomEvent('hargx:open-cart-drawer'));
      announce('Added to cart');
    } catch (error) {
      announce(error.message || 'Unable to add product.');
    } finally {
      button.disabled = false;
      button.classList.remove('is-loading');
      if (originalText) originalText.textContent = labelText;
    }
  }

  function formatMoney(cents) {
    var format = window.Shopify && window.Shopify.formatMoney
      ? window.Shopify.formatMoney
      : function (value) { return (value / 100).toFixed(2); };
    return format(cents, window.Shopify && window.Shopify.currency
      ? window.Shopify.money_format
      : undefined);
  }

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function renderWishlistPage(section) {
    var grid = section.querySelector('[data-hargx-wishlist-grid]');
    var empty = section.querySelector('[data-hargx-wishlist-empty]');
    if (!grid) return;
    var showAddToCart = section.dataset.showAddToCart !== 'false';

    var savedItems = wishlist.filter(function (item) {
      return item.handle;
    });

    if (!savedItems.length) {
      grid.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    grid.hidden = false;
    if (empty) empty.hidden = true;
    grid.innerHTML = '';

    Promise.all(savedItems.map(function (item) {
      return fetch(cartUrl('products/' + encodeURIComponent(item.handle) + '.js'), {
        headers: { Accept: 'application/json' }
      }).then(function (response) {
        return response.ok ? response.json() : null;
      }).catch(function () { return null; });
    })).then(function (products) {
      var validProducts = products.filter(Boolean);
      if (!validProducts.length) {
        grid.hidden = true;
        if (empty) empty.hidden = false;
        return;
      }

      validProducts.forEach(function (product) {
        var variants = product.variants || [];
        var saved = findItem(product.id);
        var availableVariant = variants.find(function (variant) {
          return variant.available && variant.id === Number(saved && saved.variantId);
        }) || variants.find(function (variant) { return variant.available; });
        if (!availableVariant) return;

        var card = document.createElement('article');
        card.className = 'hargx-wishlist-card';
        var image = product.featured_image
          ? '<img class="hargx-wishlist-card__image" src="' +
            escapeHtml(product.featured_image) + '" alt="' +
            escapeHtml(product.title) + '" loading="lazy">'
          : '<div class="hargx-wishlist-card__placeholder" aria-hidden="true"></div>';
        var compare = availableVariant.compare_at > availableVariant.price
          ? '<s class="hargx-wishlist-card__compare">' +
            formatMoney(availableVariant.compare_at) + '</s>'
          : '';
        var sale = availableVariant.compare_at > availableVariant.price
          ? '<span class="hargx-wishlist-card__badge">Sale</span>'
          : '';

        card.innerHTML =
          '<div class="hargx-wishlist-card__media">' +
            '<a href="' + escapeHtml(cartUrl('products/' + product.handle)) +
            '" aria-label="' + escapeHtml(product.title) + '">' + image + '</a>' +
            sale +
            '<button type="button" class="hargx-wishlist-card__remove"' +
            ' data-hargx-wishlist-toggle data-product-id="' + String(product.id) + '"' +
            ' data-variant-id="' + String(availableVariant.id) + '"' +
            ' data-product-handle="' + escapeHtml(product.handle) + '"' +
            ' aria-label="Remove from wishlist" aria-pressed="true">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
            '<path d="M12 21s-7-4.35-9.33-8.1C.7 9.75 2.15 5.5 6 4.35A5.3 5.3 0 0 1 12 6.9a5.3 5.3 0 0 1 6-2.55c3.85 1.15 5.3 5.4 3.33 8.55C19 16.65 12 21 12 21Z" fill="currentColor"/></svg></button>' +
          '</div>' +
          '<div class="hargx-wishlist-card__content">' +
            '<h2 class="hargx-wishlist-card__title"><a href="' +
            escapeHtml(cartUrl('products/' + product.handle)) + '">' +
            escapeHtml(product.title) + '</a></h2>' +
            '<div class="hargx-wishlist-card__availability">' +
            (availableVariant.available ? 'In stock' : 'Sold out') + '</div>' +
            '<div class="hargx-wishlist-card__price">' +
            formatMoney(availableVariant.price) + compare + '</div>' +
            (showAddToCart
              ? '<button type="button" class="hargx-wishlist-card__cart"' +
                ' data-hargx-wishlist-add-cart data-variant-id="' + String(availableVariant.id) + '"' +
                (availableVariant.available ? '' : ' disabled') + '>' +
                '<span data-hargx-wishlist-cart-label>' +
                (availableVariant.available ? 'Add to cart' : 'Sold out') +
                '</span></button>'
              : '') +
          '</div>';
        grid.appendChild(card);
      });

      updateButtons();
    });
  }

  function init() {
    wishlist = readStorage();
    updateButtons();

    document.querySelectorAll('[data-hargx-wishlist-section]').forEach(function (section) {
      var showCardButtons = section.dataset.showCardButtons !== 'false';
      var showProductButton = section.dataset.showProductButton !== 'false';
      document.querySelectorAll('.hargx-wishlist-card-button').forEach(function (button) {
        button.hidden = !showCardButtons;
      });
      document.querySelectorAll('.hargx-wishlist-product-button').forEach(function (button) {
        button.hidden = !showProductButton;
      });
      section.dataset.initialized === 'true' || (section.dataset.initialized = 'true', renderWishlistPage(section));
    });

    if (initialized) return;
    initialized = true;

    document.addEventListener('click', function (event) {
      var toggle = event.target.closest('[data-hargx-wishlist-toggle]');
      if (toggle) {
        event.preventDefault();
        toggleWishlist(toggle);
        var card = toggle.closest('[data-hargx-wishlist-section], .hargx-wishlist-card');
        if (card && card.classList.contains('hargx-wishlist-card')) {
          card.remove();
          if (!gridHasCards()) {
            var section = document.querySelector('[data-hargx-wishlist-section]');
            if (section) renderWishlistPage(section);
          }
        }
        return;
      }

      var cartButton = event.target.closest('[data-hargx-wishlist-add-cart]');
      if (cartButton) {
        event.preventEvent = true;
        event.preventDefault();
        addToCart(cartButton);
      }
    });

    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY) {
        wishlist = readStorage();
        updateButtons();
        document.querySelectorAll('[data-hargx-wishlist-section]').forEach(renderWishlistPage);
      }
    });

    document.addEventListener('shopify:section:load', function () {
      wishlist = readStorage();
      updateButtons();
      document.querySelectorAll('[data-hargx-wishlist-section]').forEach(function (section) {
        section.dataset.initialized = '';
        renderWishlistPage(section);
      });
    });
  }

  function gridHasCards() {
    var grid = document.querySelector('[data-hargx-wishlist-grid]');
    return Boolean(grid && grid.querySelector('.hargx-wishlist-card'));
  }

  window.HargxWishlist = {
    getItems: function () { return wishlist.slice(); },
    refresh: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
