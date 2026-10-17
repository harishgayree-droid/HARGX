
document.addEventListener('DOMContentLoaded', () => {
  const sortSelects = document.querySelectorAll('[data-hargx-sort]');

  if (!sortSelects.length) return;

  sortSelects.forEach((sortSelect) => {
    sortSelect.addEventListener('change', () => {
      const selectedSort = sortSelect.value;

      const url = new URL(window.location.href);

      url.searchParams.set('sort_by', selectedSort);

      /*
       * Reset pagination when sorting changes.
       * This prevents the user from landing on an invalid/empty
       * page after changing the sort order.
       */
      url.searchParams.delete('page');

      window.location.href = url.toString();
    });
  });
});


function getHargxFilterScope(source) {
  const drawer = source.closest('[data-hargx-filter-drawer]');

  if (drawer) {
    return drawer;
  }

  const section = source.closest('.hargx-collection');

  if (!section) {
    return null;
  }

  const filterSystem = section.querySelector('[data-filter-layout]');

  if (filterSystem && filterSystem.dataset.filterLayout === 'drawer') {
    return section.querySelector('[data-hargx-filter-drawer]');
  }

  return filterSystem;
}

function applyHargxFilters(source) {
  const scope = getHargxFilterScope(source);

  if (!scope) {
    return;
  }

  const url = new URL(window.location.href);
  const filterInputs = scope.querySelectorAll(
    '[data-hargx-filter-input]'
  );
  const priceInputs = scope.querySelectorAll(
    '[data-hargx-price-input]'
  );

  filterInputs.forEach((input) => {
    url.searchParams.delete(input.name);
  });

  priceInputs.forEach((input) => {
    url.searchParams.delete(input.name);
  });

  filterInputs.forEach((input) => {
    if (!input.checked || input.disabled) return;

    url.searchParams.append(input.name, input.value);
  });

  priceInputs.forEach((input) => {
    if (!input.value) return;

    url.searchParams.set(input.name, input.value);
  });

  url.searchParams.delete('page');

  window.location.href = url.toString();
}

document.addEventListener('change', (event) => {
  const input = event.target.closest(
    '[data-hargx-filter-input], [data-hargx-price-input]'
  );

  if (!input || input.closest('[data-hargx-filter-drawer]')) {
    return;
  }

  applyHargxFilters(input);
});

document.addEventListener('keydown', (event) => {
  const input = event.target.closest('[data-hargx-price-input]');

  if (event.key !== 'Enter' || !input) {
    return;
  }

  event.preventDefault();

  if (!input.closest('[data-hargx-filter-drawer]')) {
    applyHargxFilters(input);
  }
});

document.addEventListener('DOMContentLoaded', () => {

  const drawer = document.querySelector(
    '[data-hargx-filter-drawer]'
  );

  const openButtons = document.querySelectorAll(
    '[data-hargx-filter-open]'
  );

  const closeButtons = document.querySelectorAll(
    '[data-hargx-filter-close]'
  );

  const applyButtons = document.querySelectorAll(
    '[data-hargx-filter-apply]'
  );

  if (!drawer) return;


  function openDrawer() {
    drawer.hidden = false;

    requestAnimationFrame(() => {
      drawer.classList.add('is-open');
    });

    document.documentElement.classList.add(
      'hargx-filter-drawer-open'
    );
  }


  function closeDrawer() {
    drawer.classList.remove('is-open');

    document.documentElement.classList.remove(
      'hargx-filter-drawer-open'
    );

    setTimeout(() => {
      drawer.hidden = true;
    }, 350);
  }


  openButtons.forEach((button) => {
    button.addEventListener('click', openDrawer);
  });


  closeButtons.forEach((button) => {
    button.addEventListener('click', closeDrawer);
  });

  applyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyHargxFilters(button);
    });
  });

  document.addEventListener('keydown', (event) => {

    if (event.key === 'Escape' && !drawer.hidden) {
      closeDrawer();
    }

  });

});