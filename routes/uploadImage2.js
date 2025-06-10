//uploadImage.js
import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
    console.log('Upload Image Route Hit');
    console.log('Request Body:', req.body);

    const svg = req.body.svg; // Assuming the SVG is passed in the request body


  const PUBLIC_STORE_DOMAIN = req.shopify.PUBLIC_STORE_DOMAIN || 'abdul-gwl.myshopify.com';
  const PRIVATE_STOREFRONT_API_TOKEN = req.shopify.PRIVATE_STOREFRONT_API_TOKEN || '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';

//   const imageUrl = "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=620&auto=format&fit=crop&q=60&ixlib=rb-4.1.0";

const productId = await getProductIdBySKU(req.body.sku, PUBLIC_STORE_DOMAIN, PRIVATE_STOREFRONT_API_TOKEN);


const xlinkHrefRegex = /xlink:href\s*=\s*["']([^"']+)["']/g;



let value = "";


if(svg.startsWith('http')) {
    // If the SVG is a URL, fetch it
    const response = await fetch(svg);
    if (!response.ok) {
        return res.status(400).json({ error: `Failed to fetch SVG from URL: ${svg}` });
    }
     value = await response.text();
     value = value.replace(/\r?\n|\r/g, '');
}
else{
    value = req.body.svg; // Assuming the SVG is passed in the request body
}



if (!value) {
  return res.status(400).json({ error: 'No SVG image URL found in metafield' });
}


let xlinkUrls;
let match;

while ((match = xlinkHrefRegex.exec(value)) !== null) {
  xlinkUrls = match[1];
  break;
}

 
console.log('xlink:href URLs:', xlinkUrls);
  

    try {
      const response = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/products/${productId}/images.json`, {
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


    //   const data = await response.json();

     const imageTagRegex = /<image\b[^>]*?xlink:href=['"][^'"]*['"][^>]*?>\s*<\/image>|<image\b[^>]*?xlink:href=['"][^'"]*['"][^>]*?\/?>/gi;
     const cleanedSvg = value.replace(imageTagRegex, '');

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
            ownerId: `gid://shopify/Product/${productId}`,
            namespace: "custom",
            key: "svgImg",
            type: "single_line_text_field",
            value: cleanedSvg,
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
  
      res.json({ message: 'Image uploaded successfully', productId: productId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  

});



async function getProductIdBySKU(sku, PUBLIC_STORE_DOMAIN, PRIVATE_STOREFRONT_API_TOKEN) {
    try {
        const response = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-01/products.json`, {
            method: 'GET',
            headers: {
                'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        for (const product of data.products) {
            for (const variant of product.variants) {
                if (variant.sku === sku) {
                    return product.id;
                }
            }
        }
        return null;
    } catch (err) {
        console.error(`Error fetching product by SKU: ${sku}`, err);
        return null;
    }
}



export default router;
