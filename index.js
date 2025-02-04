import dotenv from "dotenv";
import DBconnect from "./src/db/db.js";
import app from "./src/App.js";

dotenv.config({
  path: '.env',
});
app.get('/', (req, res) => {
  res.send('Hello Aneesh!')
})

 
DBconnect()
  .then(() => {
    
    app.listen( process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${ process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log(`Error connecting to the database in index.js: ${error}`);
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
