import dotenv from 'dotenv'
import connectDB from './db/index.js'
import { app } from './app.js'

dotenv.config({
    path: './.env'
})

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000,()=>{
            console.log(`Server is listening to Port :${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.log(error)
    })

// import express from "express";
// const app=express()
// (async ()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on("error",(error)=>{
//             console.log("Error",error);
//         })

//         app.listen(process.env.PORT,()=>{
//             console.log(`Server is listening on Port ${process.env.PORT}`);
//         })
//     }
//     catch(error){
//         console.log('MongoDB Connection Error!!! ',error)
//     }
// })()