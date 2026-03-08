require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.originalUrl);
  next();
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/company", require("./routes/companyRoutes"));
app.use("/api/application", require("./routes/applicationRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/recruiter", require("./routes/recruiterRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/company", require("./routes/offerRoutes"));
app.use("/uploads", express.static("uploads"));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

app.use("/offers", express.static(path.join(__dirname, "offers")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is Running on port ${PORT}`));