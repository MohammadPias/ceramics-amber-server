const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config()

const app = express();
const port = process.env.PORT | 5000;

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
            console.log(id)
            const query = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.json(result)
        });

        //--------------product---------------//

        // add products to data base
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            console.log(product, result)
            res.json(result);
        });
        // get all products
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const result = await cursor.toArray();
            res.send(result)
        })
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