
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


const filterInputs = document.querySelectorAll(
  '[data-hargx-filter-input]'
);

const priceInputs = document.querySelectorAll(
  '[data-hargx-price-input]'
);

function applyHargxFilters() {
  const url = new URL(window.location.href);

  filterInputs.forEach((input) => {
    if (!input.checked || input.disabled) return;

    url.searchParams.append(
      input.name,
      input.value
    );
  });

  priceInputs.forEach((input) => {
    if (!input.value) return;

    url.searchParams.set(
      input.name,
      input.value
    );
  });

  url.searchParams.delete('page');

  window.location.href = url.toString();
}


filterInputs.forEach((input) => {
  input.addEventListener('change', applyHargxFilters);
});


priceInputs.forEach((input) => {
  input.addEventListener('change', applyHargxFilters);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyHargxFilters();
    }
  });
});