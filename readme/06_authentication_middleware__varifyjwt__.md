# Chapter 6: Authentication Middleware (varifyJWT)

Welcome back, future backend developer! In our journey so far, we've learned how to structure our data ([Chapter 1: Mongoose Models](01_mongoose_models_.md)), connect to our database ([Chapter 2: Database Connection (DBconnect)](02_database_connection__dbconnect__.md)), set up our main application instance and global rules with middleware ([Chapter 3: Express Application Instance (app)](03_express_application_instance__app__.md)), define specific addresses for requests using routes ([Chapter 4: Routes](04_routes_.md)), and send consistent responses or errors back to the user ([Chapter 5: API Response and Error Handling](05_api_response_and_error_handling_.md)).

Now, imagine we have a route like `/api/v1/users/changePassword`. We only want *the logged-in user* to be able to change *their own* password, not anyone else's, and certainly not someone who isn't even logged in. How do we put a "gatekeeper" in front of certain routes to ensure only authenticated users can access them?

This is a fundamental requirement for almost any real-world application. We need a way to check, for each incoming request to a protected route, whether the request is coming from a legitimate, logged-in user.

This is where **Authentication Middleware** comes in!

## Middleware as a Checkpoint

We briefly encountered the concept of Middleware in [Chapter 3: Express Application Instance (app)](03_express_application_instance__app__.md). We saw that `app.use()` can apply middleware globally (like `cors()` or `express.json()`) that run for almost every request.

Middleware can *also* be applied specifically to individual routes or groups of routes. When multiple functions are listed for a route, Express runs them in order. Any function that isn't the final handler (the controller) is effectively a middleware function.

Think of middleware placed on a specific route as a **checkpoint** or a **security guard** standing *before* you can enter a restricted area (the main controller logic for that route).

<br/>

```mermaid
graph LR
    A[Incoming Request] --> B(Middleware 1);
    B --> C(Middleware 2);
    C --> D{Is Request Authorized?};
    D --> |Yes| E[Final Route Handler<br/>(Controller)];
    D --> |No| F[Send Error Response<br/>(e.g., 401 Unauthorized)];
    E --> G[Send Success Response];

    F -->> Z[Response back to User];
    G -->> Z;
```

In this flow:
1.  An incoming request arrives.
2.  It passes through global middleware (not shown here).
3.  It hits a route that has specific middleware.
4.  The middleware functions run one by one.
5.  One of the middleware acts as an "Authorization Check".
6.  If the check passes, the request is allowed to proceed to the final handler (Controller).
7.  If the check fails, the middleware immediately stops the flow and sends an error response, preventing the request from reaching the controller.

Our project uses a specific middleware function named `varifyJWT` (which seems like a typo and is likely intended to be `verifyJWT`) to perform this authentication check using JSON Web Tokens (JWTs).

## What is `varifyJWT` Middleware?

The `varifyJWT` middleware's specific job is to determine if an incoming request is from an **authenticated user** by checking and validating a special piece of data called an **Access Token**.

Access tokens are like temporary digital IDs issued to a user after they successfully log in. When a user wants to access a protected resource (like their profile), they include this access token with their request. The `varifyJWT` middleware intercepts the request and performs these steps:

1.  **Look for the Token:** It searches for the access token, typically in the request's cookies or in the `Authorization` header.
2.  **Check if Token Exists:** If no token is found, the user is clearly not authenticated. The middleware stops here and rejects the request with an "Unauthorized" error.
3.  **Validate the Token:** If a token is found, it needs to be verified. This involves checking if the token is genuine (hasn't been tampered with) and if it hasn't expired. JWTs are cryptographically signed, and verification checks this signature using a secret key known only to the server.
4.  **Find the User:** If the token is valid, it usually contains information about the user (like their ID). The middleware uses this information to find the corresponding user record in the database ([Chapter 1: Mongoose Models](01_mongoose_models_.md)). This step ensures that the user associated with the token actually exists and is active in our system.
5.  **Grant Access (or Deny):**
    *   If the user is found and everything checks out, the middleware attaches the user's information to the request object (`req.user`) so that the subsequent controller can easily access who the logged-in user is. Then, it calls `next()` to allow the request to proceed to the next function in the route's handling chain (usually the controller).
    *   If the token is invalid, expired, or the user is not found, the middleware stops the request and sends an "Unauthorized" error response.

## How `varifyJWT` is Used in Routes

As we saw in [Chapter 4: Routes](04_routes_.md), middleware functions are placed as arguments between the route path/method definition and the final controller function.

Let's look at some examples from `src/routes/router.js` where `varifyJWT` is used:

```javascript
// src/routes/router.js (simplified)

import { varifyJWT } from "../middlewares/auth.js"; // Import the middleware
import { logOut, getCurrentUser, changePassword, ... } from "../controllers/User.js"; // Import controllers

// ... other routes (like /register, /login) ...

/* ------------------------------ logOut route ------------------------------ */
// For the /logout POST route, first run varifyJWT, then the logOut controller
router.route("/logout").post(varifyJWT, logOut);

/* ----------------------------- /getUser route ----------------------------- */
// For the /getUser GET route, first run varifyJWT, then the getCurrentUser controller
router.route("/getUser").get(varifyJWT, getCurrentUser);

/* -------------------------- /changePassword route ------------------------- */
// For the /changePassword POST route, first run varifyJWT, then the changePassword controller
router.route("/changePassword").post(varifyJWT, changePassword);

// ... more protected routes ...
```

In these examples, `varifyJWT` is listed *before* the controller function (`logOut`, `getCurrentUser`, `changePassword`). This tells Express: "When a request comes to this specific route and HTTP method, run the `varifyJWT` function first. Only if `varifyJWT` calls `next()`, proceed to the next function (the controller). If `varifyJWT` throws an error or sends a response, stop the process for this request immediately."

This is how we protect routes: by inserting our authentication checkpoint middleware right after any global middleware (like body parsing) but *before* the business logic controller that performs the sensitive action.

## Inside the `varifyJWT` Middleware

Let's look at the code for the `varifyJWT` middleware itself, found in `src/middlewares/auth.js`. As discussed in [Chapter 5: API Response and Error Handling](05_api_response_and_error_handling_.md), this function is wrapped in `asyncHandler` to handle asynchronous operations and errors gracefully.

```javascript
// src/middlewares/auth.js
import { User } from "../models/user.js"; // Need the User model
import { ApiError } from "../utils/apiError.js"; // For throwing errors
import { asyncHandler } from "../utils/asyncHandler.js"; // To wrap the async function
import jwt from "jsonwebtoken"; // To verify the JWT

export const varifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // 1. Get the token from cookies OR Authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    // 2. Check if token exists
    if (!token) {
      // If no token, throw Unauthorized error
      throw new ApiError(401, "Unauthorized request || Token is not found  ");
    }

    // 3. Verify the token using the ACCESS_TOKEN_SECRET
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 4. Find the user in the database based on the ID from the decoded token
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken" // Exclude sensitive fields
    );

    // 5. Check if user was found
    if (!user) {
      // If user not found (maybe deleted?), token is invalid
      throw new ApiError(401, "Invalid accessToken");
    }

    // If all checks pass:
    // Attach the user to the request object for subsequent handlers
    req.user = user;
    // Call next() to pass control to the next function in the route chain
    next();

  } catch (error) {
    // If any error occurred during the above steps (e.g., verification failed)
    // asyncHandler will catch this thrown ApiError and pass it to Express error handler
    // We re-throw an ApiError here to standardize the error response
    throw new ApiError(401, "Your are not loged ,In please logIn ", error);
  }
});
```

Let's break down the core logic within the `try` block:

1.  `const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");`
    *   This line attempts to retrieve the access token.
    *   `req.cookies?.accessToken`: It first checks if there's an `accessToken` in the request's cookies (enabled by the `cookieParser` middleware in [Chapter 3](03_express_application_instance__app__.md)). The `?.` is optional chaining, preventing an error if `req.cookies` is undefined.
    *   `|| req.header("Authorization")?.replace("Bearer ", "")`: If no cookie is found, it checks the `Authorization` header. API clients often send tokens here in the format `Bearer YOUR_TOKEN_STRING`. `.replace("Bearer ", "")` removes the "Bearer " prefix to get just the token string.
2.  `if (!token)`: If neither location yields a token, an `ApiError` ([Chapter 5](05_api_response_and_error_handling_.md)) with status 401 (Unauthorized) is thrown. `asyncHandler` catches this and sends the error response.
3.  `const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);`
    *   This uses the `jsonwebtoken` library (`jwt`) to verify the token's authenticity and expiration.
    *   It takes the extracted `token` and the secret key (`process.env.ACCESS_TOKEN_SECRET`) that was used to *sign* the token when the user logged in.
    *   If the token is invalid (wrong signature) or expired, `jwt.verify` will throw an error. This error is caught by the `catch` block, and an `ApiError` is thrown, resulting in an unauthorized response.
    *   If successful, `decodedToken` contains the original payload that was signed into the token, which includes the user's ID (`_id`).
4.  `const user = await User.findById(decodedToken?._id).select("-password -refreshToken");`
    *   Using the user ID from the decoded token (`decodedToken?._id`), we query our database using the `User` model ([Chapter 1](01_mongoose_models_.md)) to find the user.
    *   `.select("-password -refreshToken")` prevents fetching sensitive fields into the `user` object attached to the request.
5.  `if (!user)`: If no user is found in the database with that ID (maybe the user was deleted after the token was issued), another 401 `ApiError` is thrown.
6.  `req.user = user;`: If the user is found, we attach the fetched user document to the `req` object as `req.user`. This is a standard practice, making the authenticated user's data easily accessible to the controller function that runs next.
7.  `next();`: Finally, if all checks pass, `next()` is called. This signals Express to continue to the *next* middleware or the final route handler (the controller, in our case).

The `catch` block ensures that any error occurring during this process (missing token, verification failure, user not found) results in an `ApiError(401, ...)` being thrown. Because the entire middleware is wrapped in `asyncHandler`, this thrown error is automatically caught by `asyncHandler` and passed to the global Express error handling middleware ([Chapter 5](05_api_response_and_error_handling_.md)), which formats and sends the standardized 401 Unauthorized JSON response back to the client.

## How `varifyJWT` Protects a Route (Flow)

Let's trace the path of a request attempting to access a protected route like `/getUser`:

```mermaid
sequenceDiagram
    participant A[User's Browser]
    participant B[Express App]
    participant C[App Middleware<br/>(CORS, JSON)]
    participant D[User Router]
    participant E[varifyJWT Middleware]
    participant F[MongoDB]
    participant G[getCurrentUser Controller]
    participant H[Error Handler]

    A->>B: Send Request (GET /api/v1/users/getUser)
    Note over A: Includes Access Token in cookie/header

    B->>C: Pass Request to App Middleware
    C-->>B: Request continues

    Note over B: App matches URL path<br/>start (/api/v1/users)
    B->>D: Route Request to User Router

    Note over D: Router matches path segment<br/>(/getUser) and method (GET)
    D->>E: Call varifyJWT(req, res, next)

    Note over E: varifyJWT starts (wrapped by asyncHandler)
    E->>E: 1. Get token from req (cookies/header)
    E->>E: 2. Check if token exists (Assume Yes)
    E->>E: 3. Verify token with jwt.verify (Assume Success)
    E->>F: 4. Find user by ID from token payload
    F-->>E: 5. Return User data (Assume Found)

    Note over E: Checks pass!
    E->>E: Attach user to req.user
    E->>D: Call next()

    Note over D: Router sees next() was called
    D->>G: Call getCurrentUser(req, res, next)

    Note over G: getCurrentUser logic runs<br/>Accesses req.user
    G-->>D: Send Success Response (using ApiResponse)
    D-->>B: Pass Response back
    B-->>A: Send Response back to User
```

Now consider the flow if the token is missing or invalid:

```mermaid
sequenceDiagram
    participant A[User's Browser]
    participant B[Express App]
    participant C[App Middleware<br/>(CORS, JSON)]
    participant D[User Router]
    participant E[varifyJWT Middleware]
    participant H[Error Handler]

    A->>B: Send Request (GET /api/v1/users/getUser)
    Note over A: Does NOT include Access Token

    B->>C: Pass Request to App Middleware
    C-->>B: Request continues

    Note over B: App matches URL path<br/>start (/api/v1/users)
    B->>D: Route Request to User Router

    Note over D: Router matches path segment<br/>(/getUser) and method (GET)
    D->>E: Call varifyJWT(req, res, next)

    Note over E: varifyJWT starts (wrapped by asyncHandler)
    E->>E: 1. Get token from req (cookies/header)
    E->>E: 2. Check if token exists (Result: No!)

    Note over E: Token missing!
    E->>E: THROW new ApiError(401, "Token not found")

    Note over E: asyncHandler wrapper CATCHES the ApiError
    E->>H: Wrapper calls next(apiError)

    Note over H: Express routes request to dedicated error handler
    H->>A: Send Error Response<br/>(e.g., 401 Unauthorized JSON)

    Note over D,G: Neither User Router nor getCurrentUser are executed after the error
```

This illustrates how `varifyJWT` acts as a mandatory gate before the actual controller logic. If it fails (by throwing an `ApiError`), the request is halted, and an error response is sent back automatically via the error handling mechanism we learned about in [Chapter 5](05_api_response_and_error_handling_.md). The protected controller never even runs.

## Summary

In this chapter, we learned about **Authentication Middleware** and specifically the `varifyJWT` function:

*   Middleware functions can act as **checkpoints** placed before route handlers (controllers).
*   `varifyJWT` is a specific middleware used to ensure a user is authenticated using an Access Token.
*   It's applied to routes using `router.route("/path").method(varifyJWT, controllerFunction)`.
*   Its internal steps involve retrieving the token (from cookies or headers), checking its presence, verifying it using `jwt.verify` and a secret key, finding the associated user in the database ([Chapter 1](01_mongoose_models_.md)), and if successful, attaching the user to `req.user` and calling `next()`.
*   If any step fails, `varifyJWT` throws an `ApiError` ([Chapter 5](05_api_response_and_error_handling_.md)) (which is caught by `asyncHandler` and handled by Express's error handling), stopping the request flow and sending a 401 Unauthorized response.
*   This pattern effectively protects sensitive routes, ensuring only valid, logged-in users can access them.

With authentication sorted, our backend can now securely handle requests based on who is logged in. However, many applications also involve handling files, like user avatars or video uploads.

[Next Chapter: File Uploads (multer & cloudinary)](07_file_uploads__multer___cloudinary__.md)

---

<sub><sup>Generated by [AI Codebase Knowledge Builder](https://github.com/The-Pocket/Tutorial-Codebase-Knowledge).</sup></sub> <sub><sup>**References**: [[1]](https://github.com/Aneeshraikwar/Backend/blob/4f07123346aeaca8aa0307e1463451754d8bb29d/src/middlewares/auth.js), [[2]](https://github.com/Aneeshraikwar/Backend/blob/4f07123346aeaca8aa0307e1463451754d8bb29d/src/middlewares/midAuth.js), [[3]](https://github.com/Aneeshraikwar/Backend/blob/4f07123346aeaca8aa0307e1463451754d8bb29d/src/middlewares/temp.js), [[4]](https://github.com/Aneeshraikwar/Backend/blob/4f07123346aeaca8aa0307e1463451754d8bb29d/src/routes/router.js)</sup></sub>