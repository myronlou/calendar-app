# Calendar App

A full-stack Calendar App that allows users to view and manage their events.

## Table of Contents

- [About](#about)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Clone the Repository](#clone-the-repository)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [Environment Setup](#environment-setup)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## About

This project is a Calendar App that lets users manage their schedules. The frontend is built with React (bootstrapped using [Create React App](https://github.com/facebook/create-react-app)), and the backend (if applicable) is built using Node.js and Express.

## Features

- View calendar events
- Add, edit, and delete events
- Responsive design
- Integration with backend API for persistent storage

## Prerequisites

- [Node.js](https://nodejs.org) (v14.x or later recommended)
- [npm](https://www.npmjs.com) (comes with Node.js)

## Installation


### Clone the Repository

Clone the repository to your local machine using Git:

```bash
git clone https://github.com/myronlou/calendar-app.git
cd calendar-app
```

## Frontend Setup
1. Navigate to the frontend folder:

```bash
cd frontend
```
Install the dependencies:

```bash
npm install
```
Start the development server:

```bash
npm start
```
The app will run in development mode and can be accessed at http://localhost:3000.

## Backend Setup
If your project includes a backend API (for example, built with Express):

Open a new terminal window/tab and navigate to the backend folder:

```bash
cd backend
```
Install the backend dependencies:

```bash
npm install
```
Start the backend server:

```bash
npm start
```
Ensure that the backend server’s port matches the configuration expected by the frontend, default is http://localhost:5001. (If needed, adjust the API endpoint URLs in your frontend code accordingly.)

## Environment Setup

This project uses environment variables to manage sensitive information and configuration. Follow these steps to set up your environment variables:

1. Create a Local .env File:

In the backend folder, copy the provided .env.example file to create your own .env file:

```bash
cp .env.example .env
```
2. Configure the Variables in the .env File:

Open the .env file and update the following variables as needed:

- DATABASE_URL
    Your PostgreSQL connection string.
    Format:

    ```plaintext
    postgresql://<username>:<password>@<host>:<port>/<database_name>?schema=public
    ```
    Example:
    ```plaintext
    DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydatabase?schema=public"
    ```

- JWT_SECRET
    A secret key used to sign JSON Web Tokens (JWT). Choose a strong, unpredictable string. You can generate with this command 
    `openssl rand -base64 64`
    Example:
    ```plaintext
    JWT_SECRET="your-very-strong-secret-key"
    ```

- PORT
    The port number on which your backend server will run (default is 5001).
    Example:
    ```plaintext
    PORT=5001
    ```

- SMTP Email Credentials:
  These variables are used if your application sends emails (e.g., account confirmations or notifications).

  - EMAIL_HOST: Your SMTP server address.
    Example:
    ```plaintext
    EMAIL_HOST="smtp.example.com"
    ```
  - EMAIL_PORT: The SMTP server port (commonly 587 for TLS or 465 for SSL).
    Example:
    ```plaintext
    EMAIL_PORT=587
    ```
  - EMAIL_USER: Your SMTP username.
    Example:
    ```plaintext
    EMAIL_USER="your-email@example.com"
    ```
  - EMAIL_PASS: Your SMTP password.
    Example:
    ```plaintext
    EMAIL_PASS="your-email-password"
    ```

  - Administrator Account Credentials:
    These are used to set up the default administrator account for your application.

    - ADMIN_EMAIL: The email address for the admin account.
      Example:
      ```plaintext
      ADMIN_EMAIL="admin@example.com"
      ```
    - ADMIN_PASSWORD: The password for the admin account.
      Example:
      ```plaintext
      ADMIN_PASSWORD="your-admin-password"
      ```

  - Frontend and API URLs:
    These URLs specify where your frontend and backend API are hosted.
    FRONTEND_URL: The URL of your frontend application (default is http://localhost:3000).
    Example:
    ```plaintext
    FRONTEND_URL=http://localhost:3000
    ```

  - REACT_APP_API_URL: The URL for your backend API (should match the backend server's address and port).
    Example:
    ```plaintext
    REACT_APP_API_URL=http://localhost:5001
    ```

  3. Save Your Changes:
  After updating the .env file, save it. Your backend server will now use these configurations when you run it.

## Deployment
Frontend
To deploy the frontend:

Build the app for production:

```bash
npm run build
```
Deploy the contents of the build folder to your static hosting service.

## Troubleshooting
Development Server Not Starting:
Ensure that you have installed all dependencies using npm install. Check if another process is using the default port (3000 for frontend).

## API Connection Issues:
Verify that the backend server is running and that the API endpoints in your frontend code are correctly configured.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request with improvements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
