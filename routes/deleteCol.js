import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {

    try {
        const PUBLIC_STORE_DOMAIN = req.shopify.PUBLIC_STORE_DOMAIN;
        const PRIVATE_STOREFRONT_API_TOKEN = req.shopify.PRIVATE_STOREFRONT_API_TOKEN;

        const products = await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2023-01/products.json?fields=id,tags`, {
            method: 'GET',
            headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN
            }
        })

        const productsData = await products.json();

        let newData = productsData.products.filter(item =>  item.tags.length > 0);

        
        for(let item in newData){
         const tags  = newData[item].tags.split(', ');     

         if(tags.length === 0) continue;

         let newTags = tags.filter(tag => !tag.startsWith('col'));

         if(newTags.length < tags.length){
           
            const id = newData[item].id;

            await fetch(`https://${PUBLIC_STORE_DOMAIN}/admin/api/2023-01/products/${id}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': PRIVATE_STOREFRONT_API_TOKEN
                },
                body: JSON.stringify({
                    product: {
                        id: id,
                        tags: newTags.join(', ')
                    }
                })
            });
         }
         
        }

        console.log(newData);

        res.status(200).json({ message: 'Tags starting with "col" have been removed'});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }

 })

 export default router;