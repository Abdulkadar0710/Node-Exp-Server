

const query = `
  query GetProductMetafield($productId: ID!) {
    product(id: $productId) {
      id
      title
      metafield(namespace: "custom", key: "svgimg") {
        id
        key
        namespace
        value
        type
      }
    }
  }
`;

const variables = {
  productId: "gid://shopify/Product/8649197551844"
};

const response = await fetch('https://abdul-gwl.myshopify.com/admin/api/2024-04/graphql.json', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': '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'
  },
  body: JSON.stringify({ query, variables })
});

const data = await response.json();
console.log(JSON.stringify(data, null, 2));
