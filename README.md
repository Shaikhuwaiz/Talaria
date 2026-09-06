# Freight – Global Freight & Shipment Tracking System

Freight is a full-stack logistics and shipment tracking platform built with React, TypeScript, Vite, Node.js, Express, and MongoDB. The platform enables users to manage shipments, monitor delivery activity, visualize global shipment locations on interactive maps, and handle secure authentication workflows.

## Features

- Secure JWT-based authentication
- Shipment creation and management
- Real-time shipment tracking with Mapbox integration
- Automated login notification emails using Resend API
- RESTful API architecture using Node.js and Express
- Responsive frontend built with React and Vite
- MongoDB Atlas cloud database integration
- Docker containerization with Docker Compose
- Environment variable management using `.env`
- Backend deployment on Render
- Frontend deployment on Vercel

## Tech Stack

### Frontend

[![Frontend](https://skillicons.dev/icons?i=react,ts,vite,tailwind)](https://skillicons.dev)

React · TypeScript · Vite · Tailwind CSS

### Backend

[![Backend](https://skillicons.dev/icons?i=nodejs,express,mongodb)](https://skillicons.dev)

Node.js · Express.js · MongoDB Atlas · JWT

### DevOps & Deployment

[![DevOps](https://skillicons.dev/icons?i=docker,vercel)](https://skillicons.dev)

Docker · Docker Compose · Vercel · Render

### APIs & Services

Mapbox API · Resend Email API

## Project Structure

```text
Talaria/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── server.js
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── ...
│
├── docker-compose.yml
├── README.md
└── .gitignore

Installation
Clone Repository
git clone https://github.com/Shaikhuwaiz/Talaria.git
cd Freight
Environment Variables

Create a .env file inside the backend directory:

MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PORT=7000
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
RESEND_API_KEY=your_resend_api_key
Run Locally
Using Docker Compose
docker compose up --build

Frontend:

http://localhost:5173

Backend:

http://localhost:7000
Deployment

Frontend deployed on Vercel.

Backend deployed on Render.

Live Demo

https://www.talaria.co.in/

Learning Outcomes

This project helped in understanding:

Full-stack application architecture
REST API development
Docker containerization
Environment configuration
Cloud deployment workflows
Authentication & authorization
Real-time map integrations
Backend operational workflows
Author

Owaiz Shaikh
