//uploadImage.js
import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
    console.log('Upload Image Route Hit');
    console.log('Request Body:', req.body);


  const PUBLIC_STORE_DOMAIN = req.shopify.PUBLIC_STORE_DOMAIN || 'abdul-gwl.myshopify.com';
  const PRIVATE_STOREFRONT_API_TOKEN = req.shopify.PRIVATE_STOREFRONT_API_TOKEN || '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';

//   const imageUrl = "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=620&auto=format&fit=crop&q=60&ixlib=rb-4.1.0";


  const query = `
  query GetProductMetafield($productId: ID!) {
    product(id: $productId) {
      id
      title
      metafield(namespace: "custom", key: "svgImg") {
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
  productId: `gid://shopify/Product/${req.body.pid}`
};

const response = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/graphql.json`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN,
  },
  body: JSON.stringify({ query, variables })
});

const data = await response.json();
const value = data?.data?.product?.metafield?.value;

if (!value) {
  return res.status(400).json({ error: 'No SVG image URL found in metafield' });
}

// const productId = data.data.product.id; 

const xlinkHrefRegex = /xlink:href\s*=\s*["']([^"']+)["']/g;


let xlinkUrls;
let match;

while ((match = xlinkHrefRegex.exec(value)) !== null) {
  xlinkUrls = match[1];
  break;
}
 
console.log('xlink:href URLs:', xlinkUrls);
  

    try {
      const response = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/products/${req.body.pid}/images.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN,
        },
        body: JSON.stringify({
          image: {
            src: xlinkUrls,
          },
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Error uploading image: ${response.statusText}`);
      }

      const data = await response.json();

      if(response.status == 200) {

        const updateMetafieldQuery = `
        mutation UpdateProductMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              namespace
              value
              type
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      const updateVariables = {
        metafields: [
          {
            ownerId: `gid://shopify/Product/${req.body.pid}`,
            namespace: "custom",
            key: "svgImg",
            type: "single_line_text_field",
            value: "null",
          } 
        ]
      };
      
      const updateResponse = await fetch('https://abdul-gwl.myshopify.com/admin/api/2024-04/graphql.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN,
        },
        body: JSON.stringify({
          query: updateMetafieldQuery,
          variables: updateVariables,
        }),
      });
      
      const updateData = await updateResponse.json();
      console.log('Metafield Update Response:', updateData.data.metafieldsSet);
          

      }
  
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  

});

export default router;
