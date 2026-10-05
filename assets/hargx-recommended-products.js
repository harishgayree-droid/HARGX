/* =========================================================
   HARGX — Recommended Products
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const recommendationSections = document.querySelectorAll(
    '[data-hargx-recommendations]'
  );

  if (!recommendationSections.length) return;

  recommendationSections.forEach((section) => {
    initHargxRecommendations(section);
  });
});


async function initHargxRecommendations(section) {
  const productId = section.dataset.productId;
  const limit = section.dataset.limit;
  const url = section.dataset.url;
  const grid = section.querySelector(
    '[data-hargx-recommendations-grid]'
  );

  if (!productId || !limit || !url || !grid) {
    section.classList.add('is-empty');
    return;
  }

  section.classList.add('is-loading');

  try {
    const recommendationUrl = new URL(url, window.location.origin);

    recommendationUrl.searchParams.set(
      'product_id',
      productId
    );

    recommendationUrl.searchParams.set(
      'limit',
      limit
    );

    recommendationUrl.searchParams.set(
      'intent',
      'related'
    );

    const response = await fetch(
      recommendationUrl.toString(),
      {
        headers: {
          Accept: 'text/html'
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Recommendation request failed: ${response.status}`
      );
    }

    const html = await response.text();

    if (!html.trim()) {
      section.classList.add('is-empty');
      return;
    }

    const parser = new DOMParser();

    const documentFragment = parser.parseFromString(
      html,
      'text/html'
    );

    const recommendations = documentFragment.querySelector(
      '[data-hargx-recommendations-grid]'
    );

    if (!recommendations) {
      section.classList.add('is-empty');
      return;
    }

    const productCards = recommendations.children;

    if (!productCards.length) {
      section.classList.add('is-empty');
      return;
    }

    grid.innerHTML = '';

    Array.from(productCards)
      .slice(0, Number(limit))
      .forEach((card) => {
        grid.appendChild(card);
      });

    section.classList.remove('is-loading');

  } catch (error) {
    console.warn(
      'HARGX recommendations could not be loaded:',
      error
    );

    section.classList.add('is-empty');

  } finally {
    section.classList.remove('is-loading');
  }
}