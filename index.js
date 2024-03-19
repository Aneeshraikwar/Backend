import dotenv from "dotenv";
import DBconnect from "./src/db/db.js";
import { app } from "./src/App.js";

dotenv.config({
  path: "./env",
});

DBconnect()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`server is runing at port  : ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log(`There is some error in index.js DBconnect ${error}`);
  });
app.get("/", (req, res) => {
  res.send("Hello, world!");
});

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
