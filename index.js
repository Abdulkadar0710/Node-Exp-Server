//Index.js
import express from 'express';
const app = express();
import getProduct from './routes/getProduct.js';
import uploadImage from './routes/uploadImage.js';
import uploadCSV from './routes/uploadCSV.js';
import deleteCol from './routes/deleteCol.js';
import  env from 'dotenv';
env.config();

const PUBLIC_STORE_DOMAIN =  process.env.PUBLIC_STORE_DOMAIN
const PRIVATE_STOREFRONT_API_TOKEN = process.env.PRIVATE_STOREFRONT_API_TOKEN

console.log(PUBLIC_STORE_DOMAIN, PRIVATE_STOREFRONT_API_TOKEN);
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
app.use('/api/deleteCol', deleteCol);

  
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});