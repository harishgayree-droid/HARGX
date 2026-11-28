(function () {
  'use strict';

  var STORAGE_KEY = 'hargx-product-compare-v1';
  var MAX_STORED_ITEMS = 6;
  var items = [];
  var initialized = false;
  var storageErrorAnnounced = false;
  var pageRenderVersion = 0;
  var activePageRequest = null;
  var initializedPages = new WeakSet();

  function getRoot() {
    return document.querySelector('[data-hargx-compare-root]');
  }

  function getMaxItems() {
    var root = getRoot();
    var configured = Number(root && root.dataset.maxProducts);
    if (!Number.isFinite(configured)) return 4;
    return Math.min(Math.max(Math.floor(configured), 2), MAX_STORED_ITEMS);
  }

  function getLabels() {
    var root = getRoot();
    return root ? root.dataset : {};
  }

  function message(template, values) {
    return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}|\{product\}/g, function (match, key) {
      if (match === '{product}') return String((values && values.product) || '');
      return String((values && values[key]) || '');
    });
  }

  function isValidHandle(handle) {
    return typeof handle === 'string' && /^[a-z0-9][a-z0-9-]*$/i.test(handle);
  }

  function isSafeImageUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    try {
      var url = new URL(value, window.location.origin);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch (error) {
      return false;
    }
  }

  function getSafeStoreUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      var url = new URL(value, window.location.origin);
      return url.origin === window.location.origin ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function normalizeItem(item) {
    if (!item || item.id == null || !isValidHandle(String(item.handle || ''))) {
      return null;
    }

    return {
      id: String(item.id),
      handle: String(item.handle),
      title: typeof item.title === 'string' ? item.title.slice(0, 250) : '',
      image: isSafeImageUrl(item.image) ? String(item.image) : '',
      url: getSafeStoreUrl(item.url),
      variantId: item.variantId == null ? '' : String(item.variantId),
      variantTitle: typeof item.variantTitle === 'string' ? item.variantTitle.slice(0, 150) : '',
      variantAvailable: item.variantAvailable !== false
    };
  }

  function normalizeItems(value) {
    if (!Array.isArray(value)) return [];

    var seen = new Set();
    var result = [];
    value.forEach(function (item) {
      var normalized = normalizeItem(item);
      if (!normalized || seen.has(normalized.id) || result.length >= MAX_STORED_ITEMS) return;
      seen.add(normalized.id);
      result.push(normalized);
    });
    return result;
  }

  function readStorage() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeItems(JSON.parse(raw)) : [];
    } catch (error) {
      console.warn('HARGX comparison: saved selections could not be read.', error);
      return [];
    }
  }

  function announce(text) {
    var status = getRoot();
    status = status && status.querySelector('[data-hargx-compare-status]');
    if (!status) return;

    status.textContent = '';
    window.requestAnimationFrame(function () {
      status.textContent = text;
    });
  }

  function persistItems(nextItems, announceStorageError) {
    items = normalizeItems(nextItems);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('HARGX comparison: saved selections could not be stored.', error);
      if (announceStorageError && !storageErrorAnnounced) {
        storageErrorAnnounced = true;
        announce(getLabels().labelStorageError);
      }
    }

    updateInterface();
    document.dispatchEvent(new CustomEvent('hargx:compare-updated', {
      detail: { count: items.length }
    }));
  }

  function findItem(productId) {
    return items.find(function (item) {
      return item.id === String(productId);
    });
  }

  function updateButtons() {
    var labels = getLabels();
    document.querySelectorAll('[data-hargx-compare-toggle]').forEach(function (button) {
      var saved = findItem(button.dataset.productId);
      var label = saved ? labels.labelRemove : labels.labelAdd;
      var text = button.querySelector('[data-hargx-compare-label]');
      button.classList.toggle('is-selected', Boolean(saved));
      button.setAttribute('aria-pressed', saved ? 'true' : 'false');
      button.setAttribute(
        'aria-label',
        saved
          ? message(labels.labelRemoveProduct, { product: button.dataset.productTitle })
          : message(labels.labelAddProduct, { product: button.dataset.productTitle })
      );
      if (text) text.textContent = label || '';
      else button.textContent = label || '';
    });
  }

  function createBarProduct(item, labels) {
    var entry = document.createElement('div');
    entry.className = 'hargx-compare-bar__product';

    if (isSafeImageUrl(item.image)) {
      var image = document.createElement('img');
      image.className = 'hargx-compare-bar__image';
      image.src = item.image;
      image.alt = item.title;
      image.loading = 'lazy';
      entry.appendChild(image);
    } else {
      var placeholder = document.createElement('span');
      placeholder.className = 'hargx-compare-bar__placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      entry.appendChild(placeholder);
    }

    var text = document.createElement('div');
    text.className = 'hargx-compare-bar__product-text';
    var title = document.createElement('p');
    title.className = 'hargx-compare-bar__product-title';
    title.textContent = item.title || labels.labelUnavailable;
    text.appendChild(title);
    if (item.variantTitle && item.variantTitle !== 'Default Title') {
      var variant = document.createElement('p');
      variant.className = 'hargx-compare-bar__product-variant';
      variant.textContent = item.variantTitle;
      text.appendChild(variant);
    }
    entry.appendChild(text);

    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'hargx-compare-bar__remove';
    remove.dataset.hargxCompareRemove = '';
    remove.dataset.productId = item.id;
    remove.textContent = '×';
    remove.setAttribute(
      'aria-label',
      message(labels.labelRemoveProduct, { product: item.title })
    );
    entry.appendChild(remove);
    return entry;
  }

  function updateBar() {
    var root = getRoot();
    if (!root) return;

    var bar = root.querySelector('[data-hargx-compare-bar]');
    if (!bar) return;

    var labels = getLabels();
    var products = bar.querySelector('[data-hargx-compare-bar-products]');
    var count = bar.querySelector('[data-hargx-compare-count]');
    var remaining = bar.querySelector('[data-hargx-compare-remaining]');
    var visible = items.length > 0 && root.dataset.showBar !== 'false';

    bar.hidden = !visible;
    document.body.classList.toggle('hargx-compare-bar-active', visible);
    if (products) {
      products.replaceChildren();
      items.forEach(function (item) {
        products.appendChild(createBarProduct(item, labels));
      });
    }
    if (count) {
      count.textContent = message(labels.labelSelected, { count: items.length });
    }
    if (remaining) {
      remaining.textContent = message(labels.labelRemaining, {
        count: Math.max(getMaxItems() - items.length, 0)
      });
    }
  }

  function updateInterface() {
    updateButtons();
    updateBar();
    document.querySelectorAll('[data-hargx-compare-page]').forEach(renderComparePage);
  }

  function addOrRemove(button) {
    var productId = String(button.dataset.productId || '');
    var existing = findItem(productId);
    var labels = getLabels();

    if (!productId || !isValidHandle(button.dataset.productHandle || '')) {
      announce(labels.labelUnavailable || '');
      return;
    }

    if (existing) {
      persistItems(items.filter(function (item) {
        return item.id !== productId;
      }), true);
      announce(message(labels.labelRemoved, { product: existing.title }));
      return;
    }

    if (items.length >= getMaxItems()) {
      announce(message(labels.labelLimit, { count: getMaxItems() }));
      return;
    }

    var added = normalizeItem({
      id: productId,
      handle: button.dataset.productHandle,
      title: button.dataset.productTitle,
      image: button.dataset.productImage,
      url: button.dataset.productUrl,
      variantId: button.dataset.variantId,
      variantTitle: button.dataset.variantTitle,
      variantAvailable: button.dataset.variantAvailable !== 'false'
    });
    if (!added) {
      announce(labels.labelUnavailable || '');
      return;
    }

    persistItems(items.concat(added), true);
    announce(message(labels.labelAdded, { product: added.title }));
  }

  function updateSavedVariant(detail) {
    if (!detail || detail.productId == null) return;
    var existing = findItem(detail.productId);
    if (!existing) return;

    persistItems(items.map(function (item) {
      if (item.id !== existing.id) return item;
      return Object.assign({}, item, {
        variantId: String(detail.variantId || item.variantId),
        variantTitle: String(detail.variantTitle || ''),
        variantAvailable: detail.available !== false
      });
    }), true);
  }

  function removeItem(productId) {
    if (!findItem(productId)) return;
    var removed = findItem(productId);
    persistItems(items.filter(function (item) {
      return item.id !== String(productId);
    }), true);
    announce(message(getLabels().labelRemoved, { product: removed.title }));
  }

  function clearItems() {
    if (!items.length) return;
    persistItems([], true);
    announce(getLabels().labelCleared || '');
  }

  function getRootUrl() {
    var root = getRoot();
    return (root && root.dataset.rootUrl) ||
      (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
      '/';
  }

  function buildProductSectionUrl(item) {
    var productPath = getRootUrl() + 'products/' + encodeURIComponent(item.handle);
    var url = new URL(productPath, window.location.origin);
    if (item.variantId) url.searchParams.set('variant', item.variantId);
    url.searchParams.set('section_id', 'hargx-compare-product-data');

    ['preview_theme_id', 'preview_key'].forEach(function (key) {
      var currentValue = new URL(window.location.href).searchParams.get(key);
      if (currentValue) url.searchParams.set(key, currentValue);
    });
    return url.toString();
  }

  async function fetchProductData(item, signal) {
    var response;
    try {
      response = await fetch(buildProductSectionUrl(item), {
        headers: { Accept: 'text/html' },
        signal: signal
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      return { item: item, status: 'error' };
    }

    if (response.status === 404 || response.status === 410) {
      return { item: item, status: 'unavailable' };
    }
    if (!response.ok) {
      return { item: item, status: 'error' };
    }

    var html;
    try {
      html = await response.text();
      var parsed = new DOMParser().parseFromString(html, 'text/html');
      var payload = parsed.querySelector('[data-hargx-compare-product-data]');
      if (!payload) return { item: item, status: 'error' };

      var product = JSON.parse(payload.textContent);
      if (!product || String(product.id) !== item.id || !product.variant) {
        return { item: item, status: 'unavailable' };
      }
      return { item: item, product: product, status: 'ok' };
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      return { item: item, status: 'error' };
    }
  }

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = String(text);
    return element;
  }

  function getProductTitle(entry, labels) {
    if (entry.product && entry.status === 'ok') return entry.product.title || entry.item.title;
    return entry.item.title || labels.labelUnavailable || '';
  }

  function formatMoney(cents, moneyFormat) {
    var amount = Number(cents);
    if (!Number.isFinite(amount)) return '';
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(amount, moneyFormat);
    }

    var format = moneyFormat || '${{amount}}';
    return format.replace(
      /\{\{\s*(amount|amount_no_decimals|amount_with_comma_separator|amount_no_decimals_with_comma_separator)\s*\}\}/,
      function (match, key) {
        var noDecimals = key.indexOf('no_decimals') !== -1;
        var commaSeparator = key.indexOf('comma_separator') !== -1;
        var decimalMark = commaSeparator ? ',' : '.';
        var thousandsMark = commaSeparator ? '.' : ',';
        var value = amount / 100;
        var fixed = noDecimals ? String(Math.round(value)) : value.toFixed(2);
        var parts = fixed.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsMark);
        return parts.length > 1 ? parts[0] + decimalMark + parts[1] : parts[0];
      }
    );
  }

  function getVariant(entry) {
    return entry.status === 'ok' && entry.product ? entry.product.variant : null;
  }

  function appendProductHeader(cell, entry, labels) {
    var product = entry.status === 'ok' ? entry.product : null;
    var titleText = getProductTitle(entry, labels);
    var card = createElement('div', 'hargx-product-compare__product');
    var imageUrl = product ? product.image : entry.item.image;

    if (isSafeImageUrl(imageUrl)) {
      var image = createElement('img', 'hargx-product-compare__image');
      image.src = imageUrl;
      image.alt = titleText;
      image.loading = 'lazy';
      card.appendChild(image);
    } else {
      card.appendChild(createElement('span', 'hargx-product-compare__placeholder'));
    }

    var safeUrl = product ? getSafeStoreUrl(product.url) : '';
    var title = createElement('h2', 'hargx-product-compare__product-title');
    if (safeUrl) {
      var link = createElement('a', '', titleText);
      link.href = safeUrl;
      title.appendChild(link);
    } else {
      title.textContent = titleText;
    }
    card.appendChild(title);

    if (entry.status !== 'ok') {
      var stateText = entry.status === 'unavailable'
        ? labels.labelPageUnavailable
        : labels.labelNotAvailable;
      card.appendChild(createElement('p', 'hargx-product-compare__state', stateText));
    }

    var remove = createElement('button', 'hargx-product-compare__remove', labels.labelPageRemove);
    remove.type = 'button';
    remove.dataset.hargxCompareRemove = '';
    remove.dataset.productId = entry.item.id;
    remove.setAttribute(
      'aria-label',
      message(labels.labelRemoveProduct, { product: titleText })
    );
    card.appendChild(remove);

    var variant = getVariant(entry);
    if (variant && entry.product.available && variant.available) {
      var add = createElement('button', 'hargx-product-compare__add', labels.labelAddToCart);
      add.type = 'button';
      add.dataset.hargxCompareAddCart = '';
      add.dataset.variantId = String(variant.id);
      add.dataset.productTitle = titleText;
      card.appendChild(add);
    } else if (entry.status === 'ok') {
      var soldOut = createElement('button', 'hargx-product-compare__add', labels.labelSoldOut);
      soldOut.type = 'button';
      soldOut.disabled = true;
      card.appendChild(soldOut);
    }

    cell.appendChild(card);
  }

  function appendRow(tableBody, label, values, className) {
    var row = document.createElement('tr');
    var heading = createElement('th', '', label);
    heading.scope = 'row';
    row.appendChild(heading);
    values.forEach(function (value) {
      var cell = createElement('td', className || '', value);
      row.appendChild(cell);
    });
    tableBody.appendChild(row);
  }

  function buildCompareTable(section, entries) {
    var labels = getLabels();
    var content = section.querySelector('[data-hargx-compare-content]');
    var tableWrap = createElement('div', 'hargx-product-compare__table-wrap');
    var table = createElement('table', 'hargx-product-compare__table');
    table.setAttribute('aria-label', labels.labelTable || '');
    var caption = createElement('caption', 'hargx-compare-status', labels.labelTable || '');
    table.appendChild(caption);

    var head = document.createElement('thead');
    var headRow = document.createElement('tr');
    var productHeading = createElement('th', '', labels.labelProduct);
    productHeading.scope = 'col';
    headRow.appendChild(productHeading);
    entries.forEach(function (entry) {
      var cell = document.createElement('th');
      cell.scope = 'col';
      appendProductHeader(cell, entry, labels);
      headRow.appendChild(cell);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    var body = document.createElement('tbody');
    var valuesFor = function (callback) {
      return entries.map(function (entry) {
        return entry.status === 'ok' ? callback(entry.product, entry) : labels.labelNotAvailable;
      });
    };
    var showVendor = section.dataset.showVendor !== 'false';
    var showAvailability = section.dataset.showAvailability !== 'false';
    var showType = section.dataset.showType !== 'false';
    var showDescription = section.dataset.showDescription !== 'false';

    if (showVendor && entries.some(function (entry) {
      return entry.status === 'ok' && entry.product.vendor;
    })) {
      appendRow(body, labels.labelVendor, valuesFor(function (product) {
        return product.vendor || labels.labelEmptyValue;
      }));
    }

    appendRow(body, labels.labelPrice, valuesFor(function (product) {
      return formatMoney(product.variant.price, product.moneyFormat);
    }));

    if (entries.some(function (entry) {
      return entry.status === 'ok' &&
        Number(entry.product.variant.compareAtPrice) > Number(entry.product.variant.price);
    })) {
      appendRow(body, labels.labelCompareAt, valuesFor(function (product) {
        return Number(product.variant.compareAtPrice) > Number(product.variant.price)
          ? formatMoney(product.variant.compareAtPrice, product.moneyFormat)
          : labels.labelEmptyValue;
      }));
    }

    if (showAvailability) {
      appendRow(body, labels.labelAvailability, entries.map(function (entry) {
        if (entry.status !== 'ok') return labels.labelNotAvailable;
        var available = Boolean(entry.product.available && entry.product.variant.available);
        return available ? labels.labelAvailable : labels.labelSoldOut;
      }));
      var availabilityCells = body.lastElementChild.querySelectorAll('td');
      availabilityCells.forEach(function (cell, index) {
        var entry = entries[index];
        cell.className = 'hargx-product-compare__availability ' +
          (entry.status === 'ok' && entry.product.available && entry.product.variant.available
            ? 'hargx-product-compare__availability--available'
            : 'hargx-product-compare__availability--unavailable');
      });
    }

    if (showType && entries.some(function (entry) {
      return entry.status === 'ok' && entry.product.type;
    })) {
      appendRow(body, labels.labelProductType, valuesFor(function (product) {
        return product.type || labels.labelEmptyValue;
      }));
    }

    if (showDescription && entries.some(function (entry) {
      return entry.status === 'ok' && productDescription(entry.product);
    })) {
      var descriptionRow = document.createElement('tr');
      var descriptionHeading = createElement('th', '', labels.labelDescription);
      descriptionHeading.scope = 'row';
      descriptionRow.appendChild(descriptionHeading);
      entries.forEach(function (entry) {
        var description = entry.status === 'ok'
          ? productDescription(entry.product) || labels.labelEmptyValue
          : labels.labelNotAvailable;
        descriptionRow.appendChild(
          createElement('td', 'hargx-product-compare__description-cell', description)
        );
      });
      body.appendChild(descriptionRow);
    }

    if (entries.some(function (entry) {
      return entry.status === 'ok' && hasVariantOptions(entry.product);
    })) {
      appendRow(body, labels.labelVariant, valuesFor(function (product) {
        var variant = product.variant;
        var names = product.optionNames || [];
        var options = variant.options || [];
        var parts = [];
        names.forEach(function (name, index) {
          if (options[index] && name && name !== 'Title') {
            parts.push(name + ': ' + options[index]);
          }
        });
        return parts.join(' · ') || variant.title || labels.labelEmptyValue;
      }));
    }

    var specificationRows = new Map();
    entries.forEach(function (entry) {
      if (entry.status !== 'ok' || !Array.isArray(entry.product.specifications)) return;
      entry.product.specifications.forEach(function (specification) {
        if (!specification || !specification.label || !specification.value) return;
        if (!specificationRows.has(specification.label)) {
          specificationRows.set(specification.label, true);
        }
      });
    });

    specificationRows.forEach(function (_, specLabel) {
      var values = entries.map(function (entry) {
        if (entry.status !== 'ok') return labels.labelNotAvailable;
        var specification = (entry.product.specifications || []).find(function (spec) {
          return spec && spec.label === specLabel;
        });
        return specification && specification.value
          ? String(specification.value)
          : labels.labelEmptyValue;
      });
      appendRow(body, specLabel, values, 'hargx-product-compare__specification');
    });

    table.appendChild(body);
    tableWrap.appendChild(table);
    content.replaceChildren(tableWrap);
    content.hidden = false;
  }

  function productDescription(product) {
    return typeof product.description === 'string'
      ? product.description.trim()
      : '';
  }

  function hasVariantOptions(product) {
    var names = product.optionNames || [];
    return names.some(function (name) {
      return name && name !== 'Title';
    });
  }

  function renderFallbackEntries(savedItems) {
    return savedItems.map(function (item) {
      return { item: item, status: 'error', product: null };
    });
  }

  async function renderComparePage(section) {
    if (!section || !section.isConnected) return;
    var empty = section.querySelector('[data-hargx-compare-empty]');
    var loading = section.querySelector('[data-hargx-compare-loading]');
    var error = section.querySelector('[data-hargx-compare-error]');
    var errorText = section.querySelector('[data-hargx-compare-error-text]');
    var content = section.querySelector('[data-hargx-compare-content]');
    if (!empty || !loading || !error || !content) return;

    var savedItems = items.slice();
    var version = ++pageRenderVersion;
    if (activePageRequest) activePageRequest.abort();

    if (!savedItems.length) {
      loading.hidden = true;
      error.hidden = true;
      content.hidden = true;
      content.replaceChildren();
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    error.hidden = true;
    loading.hidden = false;

    var controller = new AbortController();
    activePageRequest = controller;
    var results;
    try {
      results = await Promise.all(savedItems.map(function (item) {
        return fetchProductData(item, controller.signal);
      }));
    } catch (requestError) {
      if (requestError.name === 'AbortError') return;
      throw requestError;
    }
    if (version !== pageRenderVersion || !section.isConnected) return;

    activePageRequest = null;
    loading.hidden = true;
    var hasErrors = results.some(function (result) {
      return result.status === 'error';
    });
    if (hasErrors) {
      error.hidden = false;
      if (errorText) errorText.textContent = getLabels().labelNetworkError || '';
    }

    buildCompareTable(section, results.length ? results : renderFallbackEntries(savedItems));
  }

  async function addToCart(button) {
    if (button.disabled || button.dataset.loading === 'true') return;
    var variantId = Number(button.dataset.variantId);
    if (!Number.isSafeInteger(variantId) || variantId <= 0) {
      announce(getLabels().labelCartError || '');
      return;
    }

    var originalText = button.textContent;
    button.disabled = true;
    button.dataset.loading = 'true';
    button.textContent = getLabels().labelAdding || '';

    try {
      var response = await fetch(getRootUrl() + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] })
      });
      var result = await response.json().catch(function () { return null; });
      if (!response.ok) {
        throw new Error(
          (result && (result.description || result.message)) ||
          getLabels().labelCartError ||
          'Unable to add product to cart.'
        );
      }

      button.textContent = getLabels().labelAddedToCart || originalText;
      document.dispatchEvent(new CustomEvent('hargx:cart-add-success', {
        bubbles: true,
        detail: { item: result }
      }));
      document.dispatchEvent(new CustomEvent('hargx:cart-updated', {
        bubbles: true,
        detail: { item: result }
      }));
      announce(message(getLabels().labelAddedToCart, {
        product: button.dataset.productTitle
      }));
    } catch (error) {
      console.error('HARGX comparison: add to cart failed.', error);
      announce(error.message || getLabels().labelCartError || '');
    } finally {
      button.disabled = false;
      delete button.dataset.loading;
      if (button.isConnected) button.textContent = originalText;
    }
  }

  function handleClick(event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    var toggle = target.closest('[data-hargx-compare-toggle]');
    if (toggle) {
      event.preventDefault();
      addOrRemove(toggle);
      return;
    }

    var remove = target.closest('[data-hargx-compare-remove]');
    if (remove) {
      event.preventDefault();
      removeItem(remove.dataset.productId);
      return;
    }

    var clear = target.closest('[data-hargx-compare-clear]');
    if (clear) {
      event.preventDefault();
      clearItems();
      return;
    }

    var retry = target.closest('[data-hargx-compare-retry]');
    if (retry) {
      event.preventDefault();
      document.querySelectorAll('[data-hargx-compare-page]').forEach(renderComparePage);
      return;
    }

    var add = target.closest('[data-hargx-compare-add-cart]');
    if (add) {
      event.preventDefault();
      addToCart(add);
    }
  }

  function initializePage(section) {
    if (initializedPages.has(section)) return;
    initializedPages.add(section);
    renderComparePage(section);
  }

  function initialize(scope) {
    items = readStorage();
    updateButtons();
    updateBar();
    (scope || document).querySelectorAll('[data-hargx-compare-page]').forEach(initializePage);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    initialize(document);

    document.addEventListener('click', handleClick);
    document.addEventListener('hargx:compare-variant-changed', function (event) {
      updateSavedVariant(event.detail);
    });

    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY || event.key === null) {
        items = readStorage();
        updateInterface();
      }
    });

    document.addEventListener('shopify:section:load', function (event) {
      items = readStorage();
      updateButtons();
      updateBar();
      var target = event.target;
      if (target instanceof Element && target.matches('[data-hargx-compare-page]')) {
        initializePage(target);
      }
      if (target && target.querySelectorAll) {
        target.querySelectorAll('[data-hargx-compare-page]').forEach(initializePage);
      }
    });

    document.addEventListener('shopify:section:unload', function (event) {
      var target = event.target;
      if (
        target instanceof Element &&
        (target.matches('[data-hargx-compare-page]') ||
          target.querySelector('[data-hargx-compare-page]'))
      ) {
        pageRenderVersion += 1;
        if (activePageRequest) activePageRequest.abort();
        activePageRequest = null;
      }
    });

    if (window.MutationObserver && document.body) {
      var observer = new MutationObserver(function (records) {
        var refreshButtons = false;
        records.forEach(function (record) {
          record.addedNodes.forEach(function (node) {
            if (!(node instanceof Element)) return;
            if (
              node.matches('[data-hargx-compare-toggle]') ||
              node.querySelector('[data-hargx-compare-toggle]')
            ) {
              refreshButtons = true;
            }
            if (node.matches('[data-hargx-compare-page]')) {
              initializePage(node);
            }
            node.querySelectorAll('[data-hargx-compare-page]').forEach(initializePage);
          });
        });
        if (refreshButtons) updateButtons();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  window.HargxProductCompare = {
    getItems: function () { return items.slice(); },
    refresh: function () { initialize(document); },
    clear: clearItems
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
