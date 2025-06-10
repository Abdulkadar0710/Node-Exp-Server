//Index.js
import express from 'express';
const app = express();
import getProduct from './routes/getProduct.js';
import uploadImage from './routes/uploadImage.js';
import uploadCSV from './routes/uploadCSV.js';

const PUBLIC_STORE_DOMAIN = 'abdul-gwl.myshopify.com';
const PRIVATE_STOREFRONT_API_TOKEN = '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';
// const id = 8649197551844;

import uploadCSV2 from './routes/uploadCSV2.js';
import uploadImage2 from './routes/uploadImage2.js';


app.use(express.json());

app.use((req, res, next) => {
    req.shopify = {
       PUBLIC_STORE_DOMAIN,
       PRIVATE_STOREFRONT_API_TOKEN
    };
    // req.pid = id;
    next();
  });


app.get('/', (req, res) => { 
  res.send('Hello, world!');
});


app.use('/api', getProduct); 
app.use('/api/uploadCSV2', uploadCSV2);
app.use('/api/uploadImage2', uploadImage2);


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


// async(req, res) => {
//     const response = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/products/8649197551844.json`, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN,
//         },
//       });
    
//       const data = await response.json();
//       console.log(data);
// }