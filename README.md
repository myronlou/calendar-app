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
Start the development server:
```

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
