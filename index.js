const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb')
const jwt = require('jsonwebtoken')
// const morgan = require('morgan')
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
    origin: ['https://task-management-platform-d7c1d.web.app'],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())
// app.use(morgan('dev'))

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token
    console.log(token)
    if (!token) {
        return res.status(401).send({
            message: 'unauthorized access'
        })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err)
            return res.status(401).send({
                message: 'unauthorized access'
            })
        }
        req.user = decoded
        next()
    })
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pbsbgav.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
})
async function run() {
    try {
        const usersCollection = client.db("Task-management").collection("user")
        const newTaskCollection = client.db("Task-management").collection("newtask")
        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body
            // console.log('I need a new jwt', user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '365d',
            })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({
                    success: true
                })
        })

        // newtask post on database start
        app.post('/newtask', async (req, res) => {
            const newTaskInfo = req.body;
            const resuls = await newTaskCollection.insertOne(newTaskInfo)
            res.send(resuls)
        })


        // Logout get oparation start ==================================================================
        app.get('/logout', async (req, res) => {
            try {
                res
                    .clearCookie('token', {
                        maxAge: 0,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                    })
                    .send({
                        success: true
                    })
                console.log('Logout successful')
            } catch (err) {
                res.status(500).send(err)
            }
        })

        // gettting data like previous data
        app.get('/previous/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            }
            const resuls = await newTaskCollection.find(query).toArray();
            res.send(resuls);
        })

        app.get('/singleTask/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id : new ObjectId(id)}
            const resuls = await newTaskCollection.findOne(query);
            res.send(resuls)
        })


        // Save or modify user email, status in DB =====================================================
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const query = {
                email: email
            }
            const options = {
                upsert: true
            }
            const isExist = await usersCollection.findOne(query)
            console.log('User found?----->', isExist)
            if (isExist) return res.send(isExist)
            const result = await usersCollection.updateOne(
                query, {
                    $set: {
                        ...user,
                        timestamp: Date.now()
                    },
                },
                options
            )
            res.send(result)
        })
        // update task
        app.patch('/newtask/:id', async (req, res) => {
            const updateInfo = req.body
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    title: updateInfo.title,
                    deadlines:updateInfo.deadlines,
                    descriptions:updateInfo.descriptions,
                    priyrity:updateInfo.priyrity
                },
            };
            const reuls = await newTaskCollection.updateOne(filter, updateDoc);
            res.send(reuls)
            
        })

        // delete oparation start====================================================================
        app.delete('/previous/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const resuls = await newTaskCollection.deleteOne(query);
            res.send(resuls)
        })

        // Send a ping to confirm a successful connection
        await client.db('admin').command({
            ping: 1
        })
        console.log(
            'Pinged your deployment. You successfully connected to MongoDB!'
        )
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello from task management Server..')
})

app.listen(port, () => {
    console.log(`task management is running on port ${port}`)
})