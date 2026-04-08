# 🚀 FleetFlow – Hackathon Project

FleetFlow is a rapid-built fleet management system developed during a hackathon with the goal of solving real-world logistics and vehicle tracking challenges. It focuses on simplicity, scalability, and quick deployment.

---

# 💡 Problem Statement

Managing fleets manually leads to inefficiencies, poor tracking, and lack of real-time insights. FleetFlow aims to digitize and streamline fleet operations with a modern web-based solution.

---

# 🧠 Our Approach

During the hackathon, the focus was on:

* Building a **functional MVP quickly**
* Ensuring **clean architecture**
* Making it **deployment-ready**
* Keeping the UI simple but effective

---

# ✨ Features Implemented

* Vehicle management system
* Driver management
* Secure authentication (JWT-based)
* RESTful API backend
* Responsive frontend dashboard
* Cloud-based database integration

---

# 🛠️ Tech Stack

**Frontend:** React (Vite)
**Backend:** Node.js + Express
**Database:** MongoDB Atlas
**Deployment:** Vercel / Render

---

# ⚙️ How It Works

1. Users log in securely
2. Manage fleet data (vehicles/drivers)
3. Backend processes requests via APIs
4. Data is stored and retrieved from MongoDB Atlas
5. Frontend displays real-time updates

---

# 🌐 Deployment Overview

FleetFlow is fully deployable using modern cloud platforms:

* **Frontend:** Vercel
* **Backend:** Render / Vercel
* **Database:** MongoDB Atlas

---

# 🔐 Environment Variables

## Backend

```bash
MONGODB_URI=your_mongodb_connection_string
CLIENT_ORIGIN=your_frontend_url
JWT_SECRET=your_secret_key
```

## Frontend

```bash
VITE_API_URL=https://your-backend-url/api
```

---

# 📂 Project Structure

```bash
FleetFlow/
│
├── V2/
│   ├── fleetflow-api/   # Backend (Node.js)
│   └── fleetflow-ui/    # Frontend (React)
│
└── README.md
```

---

# ▶️ Run Locally

## Backend

```bash
cd V2/fleetflow-api
npm install
npm start
```

## Frontend

```bash
cd V2/fleetflow-ui
npm install
npm run dev
```

---

# 🚧 Limitations (Hackathon Scope)

* Limited real-time tracking features
* Basic UI/UX (focused on functionality)
* No advanced analytics yet
* Minimal role-based access control

---

# 🔮 Future Scope

* Live GPS tracking integration
* Advanced analytics dashboard
* Role-based authentication (Admin/Driver)
* Mobile application
* AI-based route optimization

---

# 🏁 Hackathon Takeaways

* Learned rapid development under time constraints
* Improved teamwork and problem-solving
* Built a production-deployable full-stack app in limited time

---

# 🤝 Team & Contributions

This project was built collaboratively during a hackathon. Contributions included:

* Backend API development
* Frontend UI implementation
* Deployment & integration

---

# 📄 License

MIT License

---

# 🎉 Conclusion

FleetFlow demonstrates how a scalable and practical solution can be built quickly during a hackathon while still maintaining real-world usability.

---
