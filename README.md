# TalentX 🚀

Live Link : https://talent-x-five.vercel.app/

TalentX is a **MERN Stack Job Portal Platform** designed to connect job seekers with companies.
It allows users to explore job opportunities, apply for jobs, and manage applications, while admins and recruiters can manage job postings and applicants through a dashboard.

---

## Features

### User Features

* User Registration & Login
* Browse available jobs
* Apply for jobs
* Track application status

### Recruiter / Admin Features

* Post new job openings
* Manage job listings
* View applicants
* Dashboard for job and user management

---

## Tech Stack

**Frontend**

* React.js
* Tailwind CSS
* Axios

**Backend**

* Node.js
* Express.js

**Database**

* MongoDB
* Mongoose

**Authentication**

* JWT (JSON Web Tokens)

---

## Project Structure (Monorepo)

TalentX follows a **monorepo structure** where frontend and backend are managed in a single repository.

TalentX
│
├── frontend        # React frontend
├── backend         # Node.js / Express API
├── .gitignore
├── package.json
└── README.md

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/TalentX.git
cd TalentX
```

### 2. Install dependencies

Backend

```bash
cd backend
npm install
```

Frontend

```bash
cd frontend
npm install
```

---

### 3. Setup Environment Variables

Create a `.env` file in the backend folder.

Example:

```
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
CORS_ORIGINS=https://talent-x-five.vercel.app
```

For Vercel previews of the same frontend project, the backend also accepts origins matching
`https://talent-x-five-*.vercel.app`. For any other deployed frontend hostname, add it to
`CORS_ORIGINS` as a comma-separated list.

---

### 4. Run the project

Backend

```bash
npm start
```

Frontend

```bash
npm start
```

---

## Testing

Use the repo testing guide for route coverage, smoke-test tokens, and role-based manual flows:

- `TESTING.md`

---

## Future Improvements

* Resume upload system
* Company profiles
* Job recommendation system
* Real-time notifications
* AI-powered job matching

---

## Author

**Sarthak Kothavale**

* GitHub: https://github.com/sk8990
* LinkedIn: https://linkdin.com/sarthakkothawale
