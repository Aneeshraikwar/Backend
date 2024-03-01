
import dotenv from 'dotenv'
import DBconnect from './src/db/db.js';
dotenv.config({
    path:'.env'
})

DBconnect();



// import mongoose from "mongoose";
// import dotenv from "dotenv"

// import { DB_NAME } from "./src/constants.js";
// import Express from "express";
// dotenv.config({
//     path:'.env'
// })
// const app = Express();

// (async() => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log("Error", error);
//       throw error;
//     });

//     app.listen(process.env.PORT,()=>{
//         console.log(
//          `The app is listning on port no ${process.env.PORT}`
//         )
//     })
//   } catch (error) {
//     console.error("Error", Error);
//     throw error;
//   }

// })();
