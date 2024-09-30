# Backend Project

- [Model link](https://github.com/Aneeshraikwar/Backend)

# User Registration API

## Overview

This API endpoint allows users to register by creating a new account with the provided username, email, password, avatar image, and cover image. The request should be sent as an HTTP POST with `form-data` as the request body type. Upon successful registration, the API will return the user's account information, such as user ID, username, and email address.

## Endpoint

**URL:**  
`http://localhost:8000/api/v1/users/register`

**Request Method:**  
`POST`

## Request Parameters

The following parameters should be included in the request body using `form-data` format:

1. **username (text):**  
   The desired username of the user.  
   Example: `john_doe`

2. **email (text):**  
   The email address of the user.  
   Example: `john@email.com`

3. **password (text):**  
   The password for the user's account.  
   Example: `1234567`

4. **Avatar (file):**  
   The avatar image file for the user's profile picture.  
   Example: `avatar.png`

5. **CoverImg (file):**  
   The cover image file for the user's profile cover.  
   Example: `cover.jpg`

# User Login API

## Overview

This API endpoint is used to log in a user by providing their credentials. The request should include the username or email, along with the password. Upon successful authentication, the response will return the user's account information and the required authentication tokens.

## Endpoint

**URL:**  
`http://localhost:8000/api/v1/users/login`

**Request Method:**  
`POST`

## Request Body Parameters

The following parameters should be included in the request body using `JSON` format:

| Parameter | Type   | Description                                                         | Example               |
| --------- | ------ | ------------------------------------------------------------------- | --------------------- |
| username  | string | The username of the user (optional if `email` is provided).         | `john_doe`            |
| email     | string | The email address of the user (optional if `username` is provided). | `john@email.com`      |
| password  | string | The password for the user's account.                                | `MySecurePassword123` |

**Note:** You must provide at least one of `username` or `email` along with the `password` parameter.

# User Logout API

## Overview

This endpoint is used to log out a user from the system. The request should be sent as an HTTP `POST` to `http://localhost:8000/api/v1/users/logout`. Upon successful logout, the response will include a confirmation message indicating that the user has been logged out.

## HTTP Request

**Method:**  
`POST`

**Endpoint:**  
`http://localhost:8000/api/v1/users/logout`

## Request Body

No request body parameters are required for this endpoint.

## Response

` statusCode` : 200  
 `data ` : User loged out successfully

## There is lots of requests , now you an idea of sending request ,do rest of the requests by yourself

<div align ="center" >
 <h1>
 Thank you 🙏🙏
 </h1>
</div>
