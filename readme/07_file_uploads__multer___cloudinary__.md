# Chapter 7: File Uploads (multer & cloudinary)

Welcome back! In our previous chapters, we've built a solid foundation: we know how to structure data with [Chapter 1: Mongoose Models](01_mongoose_models_.md), connect to our database with [Chapter 2: Database Connection (DBconnect)](02_database_connection__dbconnect__.md), set up our main server with [Chapter 3: Express Application Instance (app)](03_express_application_instance__app__.md), define addresses for different actions with [Chapter 4: Routes](04_routes_.md), handle success and errors consistently with [Chapter 5: API Response and Error Handling](05_api_response_and_error_handling_.md), and protect sensitive routes using authentication middleware with [Chapter 6: Authentication Middleware (varifyJWT)](06_authentication_middleware__varifyjwt__.md).

Now, think about common web applications: social media platforms, video sharing sites, profile pages. Users often need to upload files, like a profile picture (avatar), a cover image, or even the video file itself. How does our backend handle receiving these files from a user's browser and storing them reliably?

Simply receiving file data directly in your standard request body (`req.body`) is tricky because files are typically large and need special handling. Storing them directly on your web server's hard drive isn't always scalable or efficient.

This is where **File Uploads** come in, and in our project, we use two helpful tools for this: `multer` and `cloudinary`.

## What are `multer` and `cloudinary`?

Imagine a process for handling packages arriving at a large facility:

1.  **Receiving and Sorting (`multer`):** When packages arrive, they first go to a receiving area. Here, workers (`multer`) unpack the incoming shipments, identify individual packages (files), perhaps give them temporary labels, and place them in a temporary holding area. They handle the initial mess of receiving diverse items.
2.  **Processing and Storing Offsite (`cloudinary`):** Once the packages are in the temporary area, another service (`cloudinary`) comes in. This service takes each package from the holding area, processes it (maybe optimizing an image or converting a video), sends it to a secure, large, offsite warehouse (cloud storage), and gives you back a permanent tracking link (a URL) for where that package is stored. The temporary local copy is then discarded.

In our backend project:

*   **`multer`**: This is an Express middleware library specifically designed to handle `multipart/form-data`, which is the standard way browsers send files in HTTP requests. `multer` acts as the initial receiver. It parses the file data from the request, saves the files temporarily on our server's local disk, and makes information about these files available on the request object (`req.file` or `req.files`).
*   **`cloudinary`**: This is a cloud-based service that provides image and video management. We use its Node.js SDK (Software Development Kit) as a utility. `cloudinary` takes the file saved temporarily by `multer`, uploads it to their secure cloud storage, performs optional transformations, and gives us a permanent, accessible URL for that file.

Using both allows us to handle file uploads efficiently: `multer` deals with the initial messy reception locally, and `cloudinary` handles the long-term, scalable, and accessible storage in the cloud.

## Step 1: Receiving the File Locally with `multer`

The first step when a file arrives is to receive it and place it in a temporary spot on our server. `multer` is the middleware that does this.

We configure `multer` to tell it where to temporarily save files. This configuration is typically done in a separate file, like `src/middlewares/multer.js`.

```javascript
// src/middlewares/multer.js
import multer from "multer"; // Import the multer library

// Configure where to temporarily store files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // cb is a callback function
      // null means no error
      // "./public/temp" is the folder where files will be saved temporarily
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      // Use the original name of the file
      cb(null, file.originalname)
      // You could also generate a unique name here
    }
  })

// Create the multer upload middleware instance
// Pass the storage configuration to it
export const upload = multer({
    storage,
})
```

Let's break this down:

*   `import multer from "multer";`: We import the library.
*   `multer.diskStorage({...})`: This tells `multer` to save the files onto the server's disk. We configure two things:
    *   `destination`: A function that determines the folder where the file should be saved. We tell it to save files to `./public/temp`. This folder should exist.
    *   `filename`: A function that determines the name the file will have on the server. Here, we're simply using the `file.originalname` (the name the file had on the user's computer). For production, generating a unique name is safer to avoid conflicts.
*   `export const upload = multer({ storage, })`: This creates the actual `multer` middleware function that we will use in our routes. We name it `upload` and export it. It's configured to use the `storage` settings we just defined.

Now that we have our `upload` middleware configured, we can use it in our routes ([Chapter 4: Routes](04_routes_.md)). When placed in a route definition, `upload` will intercept the incoming request *before* it reaches the controller and process any file data.

Look at the user registration route in `src/routes/router.js` again:

```javascript
// src/routes/router.js (snippet)
import { upload } from "../middlewares/multer.js"; // Import the configured middleware
import { RegisterUser } from "../controllers/User.js"; // Import the controller

router.route("/register").post(
  // Use the upload middleware here
  // .fields() is used when expecting multiple files with specific field names
  upload.fields([
    { name: "Avatar", maxCount: 1 }, // Expect one file named "Avatar"
    { name: "CoverImg", maxCount: 1 }, // Expect one file named "CoverImg"
  ]),
  RegisterUser // The controller function runs AFTER multer processes files
);

// ... other routes ...
router
  .route("/updateAvatar")
  .patch(varifyJWT, upload.single("Avatar"), setAvatar); // Using .single() for one file
```

Here's how `multer` is used in the route:

*   `upload.fields([...])`: This tells `multer` to look for specific file fields in the request body. In this case, it expects a field named `"Avatar"` and a field named `"CoverImg"`. `maxCount: 1` means it will accept at most one file for each field.
*   `upload.single("Avatar")`: Used on the `/updateAvatar` route. This tells `multer` to expect a *single* file with the field name `"Avatar"`.

When a request hits a route with `upload.single()` or `upload.fields()`, `multer` will:
1.  Receive the file data.
2.  Save the file(s) to the temporary directory (`./public/temp`) as configured in `multer.diskStorage`.
3.  Add information about the uploaded file(s) to the `req` object before passing it to the next function in the chain (our controller).
    *   For `upload.single('fieldName')`, file info is in `req.file`.
    *   For `upload.fields([{ name: 'f1'}, { name: 'f2'}])`, file info is in `req.files` (an object where keys are field names, and values are arrays of files).

So, by the time the `RegisterUser` or `setAvatar` controller function runs, the file has been received and saved locally, and the controller can find its details (like its temporary path on the server) on the `req` object.

## Step 2: Uploading to the Cloud with `cloudinary`

Saving files temporarily on the server is good for receiving them, but we need a more robust solution for long-term storage. Cloudinary provides that. We need a utility function that takes a local file path (provided by `multer`) and uploads that file to Cloudinary.

This utility function is usually kept separate, like in `src/utils/cloudnary.js`.

```javascript
// src/utils/cloudnary.js
import {v2 as cloudinary} from 'cloudinary'; // Import Cloudinary SDK
import fs from 'fs'; // Node.js file system module (built-in)

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Define the utility function to upload a local file to Cloudinary
const uploadOnCloudinary = async (localFilePath) => {
    try {
      // Check if a local file path was provided
      if (!localFilePath) {
          console.log("Cloudinary: No local file path provided"); // Log for debugging
          return null; // If no path, return null
      }

      // Upload the file to Cloudinary
      const response = await cloudinary.uploader.upload(localFilePath, {
          resource_type: "auto" // Automatically detect file type (image/video etc.)
      });

      // If upload is successful, the response will contain file details
      // console.log("Cloudinary: File uploaded successfully", response.url); // Log success
      // After successful upload, remove the temporary file from the local server
      fs.unlinkSync(localFilePath); // Synchronous delete

      return response; // Return the Cloudinary response (includes URL)

    } catch (error) {
        console.error("Cloudinary: Upload failed", error); // Log error
        // If upload fails, still remove the temporary file
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null; // Return null or throw the error
    }
}

export { uploadOnCloudinary }
```

Let's break this down:

*   `cloudinary.config({...})`: This sets up the connection to your Cloudinary account using credentials stored securely in environment variables (`.env` file).
*   `const uploadOnCloudinary = async (localFilePath) => { ... }`: This defines our asynchronous utility function that takes the `localFilePath` (where `multer` saved the file) as an argument.
*   `if (!localFilePath)`: Basic check to ensure we have a file path to work with.
*   `await cloudinary.uploader.upload(localFilePath, { ... })`: This is the core line! It uses the Cloudinary SDK to upload the file located at `localFilePath`. `resource_type: "auto"` tells Cloudinary to figure out if it's an image, video, etc. The `await` is crucial because uploading to a remote service takes time.
*   `fs.unlinkSync(localFilePath);`: This is very important! After the file has been successfully uploaded to Cloudinary, we use Node.js's built-in `fs` module to *delete* the temporary file that `multer` saved on our local server. We don't need it anymore, and keeping temporary files around can quickly fill up disk space. `unlinkSync` deletes the file synchronously (blocking execution until it's done).
*   `return response;`: If the upload was successful, the function returns the response object from Cloudinary, which includes the permanent `url` for the uploaded file.
*   `catch (error)`: If anything goes wrong during the upload, we catch the error. It's crucial to still attempt to `fs.unlinkSync(localFilePath)` in the `catch` block as well, to clean up the temporary file even if the cloud upload failed.

This `uploadOnCloudinary` function provides a clean way for our controllers to send a local file to the cloud and get back its permanent URL.

## Putting it Together in a Controller

Now we can see how `multer` and `cloudinary` are used side-by-side in our controller functions. Let's look at parts of the `RegisterUser` and `setAvatar` controllers in `src/controllers/User.js`.

First, `RegisterUser` (simplified):

```javascript
// src/controllers/User.js (snippet of RegisterUser)
import { uploadOnCloudinary } from "../utils/cloudnary.js"; // Import utility

const RegisterUser = asyncHandler(async (req, res) => {
  // ... (validation for username, email, password) ...

  // Multer has already processed files and added info to req.files
  // Get the temporary local paths from req.files
  const CoverImageLocalPath = req.files?.CoverImg?.[0]?.path; // Optional chaining for safety
  const AvatarLocalPath = req.files?.Avatar?.[0]?.path;

  // Check if files were actually uploaded by multer
  if (!AvatarLocalPath) { // Check Avatar is required for registration
     // Throw ApiError - handled by asyncHandler
    throw new ApiError(400, "Avatar file is required");
  }
  // CoverImg might be optional based on business logic, but let's check here
  // if (!CoverImageLocalPath) {
  //    throw new ApiError(400, "Cover Image file is required");
  // }


  // Upload Avatar to Cloudinary using the utility function
  const avatarUploadResponse = await uploadOnCloudinary(AvatarLocalPath);

  // Upload Cover Image to Cloudinary
  const coverImgUploadResponse = await uploadOnCloudinary(CoverImageLocalPath); // This path might be undefined if no file was sent

  // Check if uploads were successful and get the public URLs
  if (!avatarUploadResponse?.url) { // Check if avatar upload failed
    // Throw ApiError - handled by asyncHandler
    throw new ApiError(500, "Error uploading avatar to Cloudinary");
  }
  // Get cover image URL, handle case where no file was provided
  const coverImgUrl = coverImgUploadResponse?.url || "";


  // Create User in the database using the Cloudinary URLs
  const user = await User.create({
    Avatar: avatarUploadResponse.url, // Save the Cloudinary URL
    CoverImg: coverImgUrl, // Save the Cloudinary URL (or empty string)
    email,
    password, // Password gets hashed by pre-save hook in model (Chapter 1 details)
    username,
  });

  // ... (check if user creation succeeded, generate tokens, send response) ...
  // In the actual code, there's a separate fetch after create to remove password/refreshToken
  const CheckUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!CheckUser) {
    throw new ApiError(400, "The user is not registered");
  }

  // Send success response using ApiResponse (Chapter 5)
  res.status(200).json(
    new ApiResponse(
      200,
      CheckUser, // Send the user data
      "User registered successfully"
    )
  );
});
```

And a similar pattern in `setAvatar`:

```javascript
// src/controllers/User.js (snippet of setAvatar)
import { uploadOnCloudinary } from "../utils/cloudnary.js"; // Import utility
import { ApiError } from "../utils/apiError.js"; // Import ApiError

const setAvatar = asyncHandler(async (req, res) => {
  // Multer (configured as upload.single("Avatar") in route)
  // has processed the file and put info in req.file
  const avatarPath = req.file?.path; // Get the temporary local path

  if (!avatarPath) {
    // If multer didn't find the file, throw an error
    throw new ApiError(400, "Avatar file is missing");
  }

  // Upload the temporary local file to Cloudinary
  const Avatar = await uploadOnCloudinary(avatarPath);

  if (!Avatar?.url) {
    // If Cloudinary upload failed, throw an error
    throw new ApiError(500, "Error uploading avatar to Cloudinary");
  }

  // Update the user's avatar URL in the database
  const user = await User.findByIdAndUpdate(
    req.user._id, // User ID is available from varifyJWT middleware (Chapter 6)
    {
      $set: {
        Avatar: Avatar.url, // Save the permanent Cloudinary URL
      },
    },
    { new: true } // Return the updated user document
  ).select("-password"); // Exclude password from the result

  // Check if update succeeded and user was found
  if (!user) {
    throw new ApiError(404, "User not found after avatar update");
  }

  // Send success response using ApiResponse (Chapter 5)
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar uploaded successfully"));
});
```

In both controller snippets:

1.  They rely on `multer` middleware having already run in the route ([Chapter 4](04_routes_.md)). `multer` parsed the request and saved files to `./public/temp`.
2.  They access the path to the temporary file from `req.files` (`.fields()`) or `req.file` (`.single()`).
3.  They use the `uploadOnCloudinary` utility function, passing the temporary local file path. `await` is used because this is an asynchronous operation.
4.  They check the response from `uploadOnCloudinary` to make sure the upload was successful and get the permanent URL.
5.  They then save this permanent Cloudinary URL (not the local path) into the database using the `User` model ([Chapter 1](01_mongoose_models_.md)).
6.   Crucially, because `uploadOnCloudinary` includes `fs.unlinkSync(localFilePath)`, the temporary file created by `multer` is automatically deleted after the Cloudinary upload is complete (whether successful or failed).
7.  They use `ApiError` to handle upload failures and `ApiResponse` for success, working within the `asyncHandler` wrapper ([Chapter 5](05_api_response_and_error_handling_.md)).

This pattern ensures that files are handled correctly from receiving the raw data to saving a permanent cloud URL in the database.

## File Upload Flow (Sequence Diagram)

Let's visualize the journey of a file being uploaded and saved:

```mermaid
sequenceDiagram
    participant A[User's Browser]
    participant B[Express App]
    participant C[User Router]
    participant D[Multer Middleware]
    participant E[Server Disk<br/>(/public/temp)]
    participant F[setAvatar Controller]
    participant G[uploadOnCloudinary Utility]
    participant H[Cloudinary Service]
    participant I[MongoDB]
    participant J[Response Handlers<br/>(ApiResponse/ApiError)]

    A->>B: POST /api/v1/users/updateAvatar<br/>(with file data)
    B->>C: Route request to User Router
    C->>D: Call Multer Middleware (upload.single)
    Note over D: Multer parses file data
    D->>E: Save temporary file
    Note over D: Add file info (path) to req.file
    D->>C: Call next() (pass request)
    C->>F: Call setAvatar Controller
    Note over F: Controller accesses req.file.path
    F->>G: Call uploadOnCloudinary(localFilePath)
    Note over G: Utility starts async upload
    G->>H: Send file data to Cloudinary
    H-->>G: Respond with Cloudinary URL
    Note over G: Delete local file from E
    G-->>F: Return Cloudinary URL (or error)
    alt Upload Success
        F->>I: Update User document with Cloudinary URL
        I-->>F: Confirm update
        F->>J: Create ApiResponse
        J-->>B: Send Success Response
    else Upload Failed (e.g., Cloudinary error)
        F->>F: THROW ApiError
        Note over F: Caught by asyncHandler
        F->>J: Pass ApiError to Handler
        J-->>B: Send Error Response
    end
    B-->>A: Send Final Response (Success or Error)
```

This diagram shows how `multer` is the first step, handling the initial file saving locally. Then, the controller uses our `uploadOnCloudinary` utility, which interacts with the Cloudinary service and cleans up the temporary local file. Finally, the controller saves the permanent URL to the database and sends the appropriate response.

## Summary

In this chapter, we tackled the important task of handling file uploads:

*   We learned that `multer` is an Express middleware for receiving files (`multipart/form-data`) and saving them temporarily on the server disk.
*   We saw how to configure `multer` using `multer.diskStorage` to specify the temporary destination and filename.
*   We learned how to use `upload.single()` or `upload.fields()` in routes ([Chapter 4](04_routes_.md)) to enable `multer` for specific upload endpoints.
*   We understood that `multer` adds information about the uploaded temporary file(s) to `req.file` or `req.files` for the controller to access.
*   We learned that `cloudinary` is used for permanent cloud storage of the files.
*   We explored the `uploadOnCloudinary` utility function which takes a local file path, uploads it to Cloudinary, and *deletes* the temporary local file afterwards.
*   We saw how controllers ([Chapter 8 covers these more fully](#)) combine these steps: getting the temporary path from the request (thanks to `multer`), calling `uploadOnCloudinary` to get the permanent URL, and saving that URL in the database ([Chapter 1](01_mongoose_models_.md)).

By using `multer` for temporary local handling and `cloudinary` for permanent cloud storage, we have a robust and scalable way to manage user-uploaded files in our backend application.

Now that we've covered essential backend concepts like models, database connection, setting up the app, routing, response/error handling, authentication, and file uploads, we're ready to dive deeper into the business logic that makes our application unique: the **Controllers**.

[Next Chapter: Controllers](08_controllers_.md)

---

<sub><sup>Generated by [AI Codebase Knowledge Builder](https://github.com/The-Pocket/Tutorial-Codebase-Knowledge).</sup></sub> <sub><sup>**References**: [[1]](https://github.com/Aneeshraikwar/Backend/blob/4f07123346aeaca8aa0307e1463451754d8bb29d/src/controllers/User.js), [[2]](https://github.com/Aneeshraikwar/Backend/blob/4f07123346aeaca8aa0307e1463451754d8bb29d/src/middlewares/multer.js), [[3]](https://github.com/Aneeshraikwar/Backend/blob/4f07123346aeaca8aa0307e1463451754d8bb29d/src/routes/router.js), [[4]](https://github.com/Aneeshraikwar/Backend/blob/4f07123346aeaca8aa0307e1463451754d8bb29d/src/utils/cloudnary.js)</sup></sub>