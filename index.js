const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;


// middle ware
app.use(cors({
  origin: [
    'http://localhost:5173'

    // 'https://eleven-assignment-993a2.web.app',
    // 'https://eleven-assignment-993a2.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.achcrxa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middleware 
const logger = (req, res, next) => {
  console.log('log: info', req.method, req.url)
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log('token in the middleware', token);
  // if (!token) {
  //   return res.status(401).send({ meassage: 'unauthoraized access' })
  // }
  // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
  //   if (err) {
  //     return res.status(401).send({ meassage: 'unauthoraized access' })
  //   }
  //   req.user = decoded
  // })
  next();
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodCollection = client.db('foodDB').collection('allFood');
    const foodReqCollection = client.db('foodDB').collection('foodRequestCollection');


    //for token ........................................
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log('user for token ', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        })
        .send({ success: true })
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('loging out ', user)
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })

    // for sending data to database ( user requested food )
    app.post('/reqfood', async (req, res) => {
      const reqFood = req.body;
      console.log(reqFood);
     
      const result = await foodReqCollection.insertOne(reqFood);
      res.send(result);
    })

    // for update pending to delevered (Manage Button)
    app.patch('/reqConfirm/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }

      const reqConfirm = req.body;
      console.log(reqConfirm)
      const updateDoc = {
        $set: {
          foodStatus: reqConfirm.foodStatus
        },
      };
      const result = await foodReqCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    app.patch('/requested/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }

      const reqConfirm = req.body;
      console.log(reqConfirm)
      const updateDoc = {
        $set: {
          food_status: reqConfirm.food_status
        },
      };
      const result = await foodCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
  


    //posted single data on allFood 
    app.post('/allfood', async (req, res) => {
      const newFood = req.body;
      console.log(newFood)
      const result = await foodCollection.insertOne(newFood)
      res.send(result);
    })

    // for delete user added data 
    app.delete('/allFood/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    })

    //for cancel
    app.delete('/cancel/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodReqCollection.deleteOne(query);
      res.send(result);
    })
    // .........................................................................................................
    // update or edit a user food
    app.get('/allFood/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.findOne(query);
      res.send(result)
    })

    // client side update is done noow send it to or put it to db 

    app.put('/allFood/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedFood = req.body;
      const food = {
        $set: {
          pickup_location: updatedFood.pickup_location,
          food_name: updatedFood.food_name,
          food_image: updatedFood.food_image,
          food_quantity: updatedFood.food_quantity,
          additional_notes: updatedFood.additional_notes,
          expired_datetime: updatedFood.expired_datetime,
          food_status: updatedFood.food_status

        }
      }

      const result = await foodCollection.updateOne(filter, food, options)
      res.send(result)
    })

    //..,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
    //getting single user added food 

    app.get('/allfood', logger, verifyToken, async (req, res) => {
      const cursor = foodCollection.find({ food_status: "Available" });
      const result = await cursor.toArray();
      res.json(result);
    });
    //...................................


    app.get('/allAddfood', logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      // console.log('cook cookies', req.cookies)
      let query = {};
      if (req.query?.email) {
        query = { 'donator.email': req.query.email }; // Include the nested field 'donator.email'
      }
      const result = await foodCollection.find(query).toArray();
      res.send(result);
    });




    // get all data from allFood 
    app.get('/allfood', async (req, res) => {
      const { food_status } = req.query; // Extract the food_status value from the request query

        // Construct the query based on the food_status value
        const query = food_status ? { food_status: "Available" } : {};

        const cursor = foodCollection.find(query);
        const result = await cursor.toArray();
        res.json(result);
    })

    // for donator manage page .....................................................
    app.get('/donatorManage', async (req, res) => {
      console.log(req.query.email);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await foodReqCollection.find(query).toArray();
      res.send(result);
    });

    //for my request page 

    app.get('/myRequest', logger, verifyToken, async (req, res) => {
      // console.log(req.query.email);
      let query = {};
      if (req.query?.email) {
        query = { userEmail: req.query.email }; // Use the email from the request
      }
      const result = await foodReqCollection.find(query).toArray();
      res.send(result);
    });




    //for singleFoodDetails
    app.get('/allFoods/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.findOne(query);
      console.log(result)
      res.send(result);
    })

    //data get for featured section on home page
    app.get('/allfoods', async (req, res) => {

      const cursor = foodCollection.find().sort({ food_quantity: -1 });
      // .sort({ foodQuantity: -1 })
      // .limit(6);

      const result = await cursor.toArray();
      res.send(result);

    });

    // request food post on database 


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


//for check server is running 
app.get('/', (req, res) => {
  res.send('server is running 11')
})

app.listen(port, () => {
  console.log(`eleven assignment server is running on ${port}`)
})

