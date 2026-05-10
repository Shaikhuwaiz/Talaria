# Freight – Global Freight & Shipment Tracking System

Freight is a full-stack logistics and shipment tracking platform built using the MERN Stack with Vite. The platform enables users to manage shipments, monitor delivery activity, visualize global shipment locations on interactive maps, and handle secure authentication workflows.

## Features

- Secure JWT-based authentication system
- Shipment creation and management workflows
- Real-time shipment tracking with Mapbox integration
- Automated login notification emails using Resend API
- RESTful API architecture using Node.js and Express
- Responsive frontend built with React + Vite
- MongoDB Atlas cloud database integration
- Docker containerization with Docker Compose
- Environment variable management using `.env`
- Backend deployment on Render
- Frontend deployment on Vercel

## Tech Stack

### Frontend
- React <img src="https://skillicons.dev/icons?i=react" width="18" style="vertical-align: middle;" />
- TypeScript <img src="https://skillicons.dev/icons?i=ts" width="18" style="vertical-align: middle;" />
- Vite <img src="https://skillicons.dev/icons?i=vite" width="18" style="vertical-align: middle;" />
- Tailwind CSS <img src="https://skillicons.dev/icons?i=tailwind" width="18" style="vertical-align: middle;" />

### Backend
- Node.js <img src="https://skillicons.dev/icons?i=nodejs" width="18" style="vertical-align: middle;" />
- Express.js <img src="https://skillicons.dev/icons?i=express" width="18" style="vertical-align: middle;" />
- MongoDB Atlas <img src="https://skillicons.dev/icons?i=mongodb" width="18" style="vertical-align: middle;" />
- JWT Authentication

### DevOps & Deployment
- Docker <img src="https://skillicons.dev/icons?i=docker" width="18" style="vertical-align: middle;" />
- Docker Compose
- Render
- Vercel <img src="https://skillicons.dev/icons?i=vercel" width="18" style="vertical-align: middle;" />

### APIs & Services
- Mapbox API
- Resend Email API

## Project Structure

```bash
Freight/
│
├── backend/
├── frontend/
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
