// require('dotenv').config({path: '.env'})
import dotenv from "dotenv";
import connectDB from "./db/databaseConnect.js";
dotenv.config({path: './env'})


connectDB()


/* CODE TO CONNECT DATABASE 1ST APPROCH

import express from 'express'
const app = express()

;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("ERR : ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is lisning on port ${process.env.PORT}`);
            
        })
    } catch (error) {
        console.error("ERROR: ", error)
        throw error
    }
})()

*/