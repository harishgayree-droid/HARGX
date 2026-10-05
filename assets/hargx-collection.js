
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
