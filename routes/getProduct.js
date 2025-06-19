import express from 'express';
const router = express.Router();
const app = express();

router.get('/', async (req, res) => {
  const PUBLIC_STORE_DOMAIN = req.shopify.PUBLIC_STORE_DOMAIN;
  const PRIVATE_STOREFRONT_API_TOKEN = req.shopify.PRIVATE_STOREFRONT_API_TOKEN;
  const productId = req.body.id || '8649197551844'; // Default to a specific product ID if not provided
  try {
    const response = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/products/${productId}.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching product: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}
);
export default router;