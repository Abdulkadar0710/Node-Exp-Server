import express from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Specify the directory to store uploaded files

router.post('/', upload.single('csv'), async (req, res) => {
    const PUBLIC_STORE_DOMAIN = req.shopify.PUBLIC_STORE_DOMAIN || 'abdul-gwl.myshopify.com';
    const PRIVATE_STOREFRONT_API_TOKEN = req.shopify.PRIVATE_STOREFRONT_API_TOKEN || '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';
    try {
        const filePath = req.file.path; // Path to the uploaded file
        const results = [];
        // return res.status(200).json({ message: 'CSV file uploaded successfully', filePath });

        // // Read and parse the CSV file
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (data) => {

                results.push(data)
            })
            .on('end', async () => {

                for (const row of results) {
                    const sku = row.sku; // Assuming the CSV has a column named 'sku'
                    const svg = row.svg; // Assuming the CSV has a column named 'svg'
                    // console.log(`Processing SKU: ${sku}`);
                    const productId = await getProductIdBySKU(sku, PUBLIC_STORE_DOMAIN, PRIVATE_STOREFRONT_API_TOKEN);
                    console.log(`Product ID for SKU ${sku}: ${productId}`);


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
                        productId: 'gid://shopify/Product/' + productId
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

                    const xlinkHrefRegex = /xlink:href\s*=\s*["']([^"']+)["']/g;

                                    
                    let xlinkUrls;
                    let match;

                    while ((match = xlinkHrefRegex.exec(value)) !== null) {
                       xlinkUrls = match[1];
                       break;
                    }
 
                  console.log('xlink:href URLs:', xlinkUrls);


                  const res = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/products/${productId}/images.json`, {
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
              
                  if (!res.ok) {
                    throw new Error(`Error uploading image: ${res.statusText}`);
                  }
            
                  const resData = await res.json();

                  console.log(`Image uploaded for SKU ${sku}:`, resData);

                  if(res.status == 200) {

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
                        value: "null",
                      } 
                    ]
                  };
                  
                  const updateResponse = await fetch(`https://${ PUBLIC_STORE_DOMAIN }/admin/api/2024-04/graphql.json`, {
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









                }

                // Delete the file after processing
                fs.unlinkSync(filePath);
                // return res.status(200).json({ message: 'CSV processed successfully', data: results });
            })
            .on('error', (error) => {
                fs.unlinkSync(filePath); // Ensure file is deleted in case of error
                return res.status(500).json({ message: 'Error processing CSV file', error });
            });


        return res.status(200).json({ message: 'CSV processed successfully', data: results });


    } catch (error) {
        return res.status(500).json({ message: 'Server error', error });
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