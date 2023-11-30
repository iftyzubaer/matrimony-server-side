const express = require("express")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const stripe = require('stripe')(process.env.STRIPE_SK)
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gsq0j5x.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const biodataCollection = client.db('biodataDB').collection('biodata')
    const biodataFavCollection = client.db('biodataDB').collection('biodataFav')
    const biodataAdminCollection = client.db('biodataDB').collection('admin')

    app.post('/biodatas', async (req, res) => {
      const newBiodata = req.body
      const userEmail = newBiodata.email
      const existingUser = await biodataCollection.findOne({ email: userEmail })
      if (existingUser) {
        const result = await biodataCollection.updateOne({ email: userEmail }, { $set: newBiodata })
        res.send(result)
      }
      else {
        const userCount = await biodataCollection.countDocuments()
        const newUser = { user_id: userCount + 1, newBiodata }
        const result = await biodataCollection.insertOne(newUser)
        res.send(result)
      }
    })

    app.get('/biodatas', async (req, res) => {
      const cursor = biodataCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/biodatas/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await biodataCollection.findOne(query)
      res.send(result)
    })

    app.get('/favourites', async (req, res) => {
      const cursor = biodataFavCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post('/favourites', async (req, res) => {
      const newRequest = req.body
      const result = await biodataFavCollection.insertOne(newRequest)
      res.send(result)
    })

    app.delete('/favourites/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await biodataFavCollection.deleteOne(query)
      res.send(result)
    })

    app.get('/admin', async (req, res) => {
      const cursor = biodataAdminCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post('/create-payment-intent', async (res, req) => {
      const { price } = req.body
      const amount = parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("Server Connected Successfully")
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
})