import { initializers } from '@dropins/tools/initializer.js';
import { initialize, setEndpoint } from '@dropins/storefront-product-discovery/api.js';
import { initializeDropin } from './index.js';
import { CS_FETCH_GRAPHQL, fetchPlaceholders } from '../commerce.js';

await initializeDropin(async () => {
  // Inherit Fetch GraphQL Instance (Catalog Service)
  setEndpoint(CS_FETCH_GRAPHQL);

  // Fetch placeholders
  const labels = await fetchPlaceholders('placeholders/search.json');
  const langDefinitions = {
    default: {
      ...labels,
    },
  };

  // Initialize search — preserve options on Product for GS card swatches on PLP
  return initializers.mountImmediately(initialize, {
    langDefinitions,
    models: {
      Product: {
        transformer: (raw) => ({
          options: raw?.options ?? [],
          // Merchandising labels for card badges (see commerce-product-card).
          product_labels: raw?.product_labels ?? [],
        }),
      },
    },
  });
})();
