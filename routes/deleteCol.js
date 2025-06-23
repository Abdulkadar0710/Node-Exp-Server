import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const PUBLIC_STORE_DOMAIN = req.shopify.PUBLIC_STORE_DOMAIN;
        const PRIVATE_STOREFRONT_API_TOKEN = req.shopify.PRIVATE_STOREFRONT_API_TOKEN;

        const fetchAllProducts = async () => {
            let products = [];
            let hasNextPage = true;
            let cursor = null;

            while (hasNextPage) {
                const queryProducts = `
                    query ($cursor: String) {
                        products(first: 250, after: $cursor) {
                            edges {
                                cursor
                                node {
                                    id
                                    tags
                                }
                            }
                            pageInfo {
                                hasNextPage
                            }
                        }
                    }
                `;

                const fetchProducts = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2023-01/graphql.json`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN
                    },
                    body: JSON.stringify({
                        query: queryProducts,
                        variables: { cursor }
                    })
                });

                const productsData = await fetchProducts.json();
                const edges = productsData.data.products.edges;
                products = products.concat(edges.map(edge => edge.node));
                hasNextPage = productsData.data.products.pageInfo.hasNextPage;

                if (hasNextPage) {
                    cursor = edges[edges.length - 1].cursor;
                }
            }

            return products;
        };

        const products = await fetchAllProducts();

        for (const product of products) {
            const tags = product.tags;

            if (tags.length === 0) continue;

            const newTags = tags.filter(tag => !tag.startsWith('col'));

            if (newTags.length < tags.length) {
                const mutation = `
                    mutation updateProductTags($id: ID!, $tags: [String!]) {
                        productUpdate(input: {id: $id, tags: $tags}) {
                            product {
                                id
                                tags
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `;

                await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2023-01/graphql.json`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN
                    },
                    body: JSON.stringify({
                        query: mutation,
                        variables: {
                            id: product.id,
                            tags: newTags
                        }
                    })
                });
            }
        }

        res.status(200).json({ message: 'Tags starting with "col" have been removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;