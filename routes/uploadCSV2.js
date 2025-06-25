import express from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Specify the directory to store uploaded files

router.post('/', upload.single('csv'), async (req, res) => {
  console.log("json: ",req.shopify);
    const PUBLIC_STORE_DOMAIN = req.shopify.PUBLIC_STORE_DOMAIN;
    const PRIVATE_STOREFRONT_API_TOKEN = req.shopify.PRIVATE_STOREFRONT_API_TOKEN;
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
                    var svg = row.svg; // Assuming the CSV has a column named 'svg'
                    // console.log(`Processing SKU: ${sku}`);
                    const productId = await getProductIdBySKU(sku, PUBLIC_STORE_DOMAIN, PRIVATE_STOREFRONT_API_TOKEN);
                    console.log(`Product ID for SKU ${sku}: ${productId}`);


                    if(svg.startsWith('http')) {
                    // If the SVG is a URL, fetch it
                    const response = await fetch(svg);
                    if (!response.ok) {
                        return res.status(400).json({ error: `Failed to fetch SVG from URL: ${svg}` });
                    }
                     svg = await response.text();
                    svg = svg.replace(/\r?\n|\r/g, '');
                    //  console.log('Fetched SVG:', svg);   
                   }
                   
                   const value = svg;
                  //  console.log('value:', value);

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

                    const imageTagRegex = /<image\b[^>]*?xlink:href=['"][^'"]*['"][^>]*?>\s*<\/image>|<image\b[^>]*?xlink:href=['"][^'"]*['"][^>]*?\/?>/gi;
                    const scriptTagRegex = /<script\b[^>]*?\/?>/gi;
                    const cleanedSvg = value.replace(imageTagRegex, '').replace(scriptTagRegex, '');
 
                  console.log('xlink:href URLs:', xlinkUrls);
                //   console.log('Cleaned SVG:', cleanedSvg);

                  // Fetch existing images for the product
                  const existingImagesResponse = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/products/${productId}/images.json`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN,
                    },
                  });

                  if (!existingImagesResponse.ok) {
                    throw new Error(`Error fetching existing images: ${existingImagesResponse.statusText}`);
                  }

                  const existingImagesData = await existingImagesResponse.json();
                  const existingImages = existingImagesData.images;

                  // Delete each existing image
                  for (const image of existingImages) {
                    const deleteImageResponse = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/products/${productId}/images/${image.id}.json`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN,
                      },
                    });

                    if (!deleteImageResponse.ok) {
                      console.error(`Error deleting image with ID ${image.id}: ${deleteImageResponse.statusText}`);
                    } else {
                      console.log(`Deleted image with ID ${image.id}`);
                    }
                  }


                 // Add new Image to the product  
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

                //   console.log(`Image uploaded for SKU ${sku}:`, resData);

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

                  // console.log("Ckeaned SVG:", cleanedSvg);
                  
                  
                  const updateVariables = {
                    metafields: [
                      {
                        ownerId: `gid://shopify/Product/${productId}`,
                        namespace: "custom",
                        key: "svgImg",
                        type: "single_line_text_field",
                        value: cleanedSvg, // Use the cleaned SVG value
                      } 
                    ]
                  };
                  
                  const updateResponse = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/graphql.json`, {
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
                  // console.log("updateData:", updateData);
                  console.log('Metafield Update Response:', updateData.data.metafieldsSet.userErrors);
                      
            
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

        return res.status(200).json({ message: 'CSV processed successfully', 
          success: true
        });


    } catch (error) {
      console.error('Error processing CSV:', error);
        return res.status(500).json({ message: 'Server error', error });
    }
}); 


async function getProductIdBySKU(sku, PUBLIC_STORE_DOMAIN, ADMIN_API_ACCESS_TOKEN) {
  const query = `
    query getProductBySKU($sku: String!) {
      productVariants(first: 1, query: $sku) {
        edges {
          node {
            id
            sku
            product {
              id
              title
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': ADMIN_API_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { sku },
      }),
    });

    

    const result = await response.json();
    const edges = result?.data?.productVariants?.edges;

    
    if (edges && edges.length > 0) {
      const id = getNumericId(edges[0].node.product.id);
      return id;
    }

    return null;
  } catch (err) {
    console.error(`Error fetching product by SKU: ${sku}`, err);
    return null;
  }
}

function getNumericId(gid) {
  const parts = gid.split('/');
  return parts[parts.length - 1];
}



export default router; 