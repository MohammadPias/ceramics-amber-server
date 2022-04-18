const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.o4muq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect()

        const database = client.db('ceramics-amber');
        const userCollection = database.collection('users');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders')

        // add user to database
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.json(result);
        });
        // update users to database
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email, displayName: user.displayName }
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.json(result)
        });
        // get users
        app.get('/users', async (req, res) => {
            const users = userCollection.find({});
            const result = await users.toArray();
            res.send(result)
        });
        // set admin role
        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const findUser = await userCollection.findOne(filter);
            let result;
            if (findUser?.role === 'admin') {
                const updateDoc = { $set: { role: '' } };
                result = await userCollection.updateOne(filter, updateDoc);
            } else {

                const updateDoc = { $set: { role: 'admin' } };
                result = await userCollection.updateOne(filter, updateDoc);
            }
            res.json(result)
        });
        // check admin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);

            let isAdmin = false;
            if (result?.role === 'admin') {
                isAdmin = true;
            };
            res.send({ isAdmin })
        });
        // get admin users
        app.get('/users/admin', async (req, res) => {
            const query = { role: 'admin' };
            const cursor = userCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        });

        // Delete user
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.json(result)
        });

        //--------------products---------------//

        // add products to data base
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.json(result);
        });
        // get all products
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const result = await cursor.toArray();
            res.send(result)
        });
        // get products by id
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            // const result = await productCollection.findOne(query);
            res.json(id)
        });

        app.delete('/products', async (req, res) => {
            const id = req.body;
            const query = { _id: ObjectId(id.id) }

            const result = await productCollection.deleteOne(query)
            res.json(result)
        });
        // get product by local storage keys
        app.post('/products/keys', async (req, res) => {
            const keys = req.body;
            console.log(keys)

            const objArray = [];
            if (keys.length) {
                for (const key of keys) {
                    objArray.push(ObjectId(key))
                }
            }

            const query = { _id: { $in: objArray } };
            const result = await productCollection.find(query).toArray();
            res.json(result)

        });

        // Order management=======================
        // add orders to database
        app.post('/orders', async (req, res) => {
            const orders = req.body;
            const result = await orderCollection.insertOne(orders);
            res.json(result)
        });

        // get all orders
        app.get('/myorders', async (req, res) => {
            const cursor = orderCollection.find({});
            const result = await cursor.toArray();
            res.send(result)
        });
        //get order by id
        app.get('/myorders/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await orderCollection.findOne(query);
            res.json(result)
        })
        // get orders by email
        app.post('/myOrders', async (req, res) => {
            const data = req.body;
            const query = { email: data.email }
            const result = await orderCollection.find(query).toArray();
            res.json(result)
        });
        // delete order
        app.delete('/myOrders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);

            res.json(result)
        })
        // update order Status
        app.put('/myOrders/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const fromBody = req.body;
            let result;

            if(fromBody?.status === "update"){
                const updateDoc = {
                    $set: { status: 'updated' }
                };
                result= await orderCollection.updateOne(filter, updateDoc);
            }
            else{
                const updateDoc = {
                    $set: { paymentStatus: fromBody }
                };
                result= await orderCollection.updateOne(filter, updateDoc);
            }
            
            
            res.json(result)
        });

        // stripe payment method
        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo?.price * 100;
          
            console.log(amount, paymentInfo)
           if(amount){
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: [
                    "card"
                  ],
              });
              res.send({
                clientSecret: paymentIntent?.client_secret,
              });
           }
          });

    }
    finally {
        // await client.close();
    }
};
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send("Welcome Ceramics-Amber")
})
app.listen(port, () => {
    console.log('listening port', port)
})