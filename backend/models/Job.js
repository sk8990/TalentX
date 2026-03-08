const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    companyName: { type: String, required: true },
    companyDomain: { type: String },
    companyLogo: { type: String },
    title: { type: String, required: true },
    description: String,
    ctc: { type: Number, required: true },
    aboutCompany: { type: String, required: true },
    minCgpa: { type: Number, required: true },
    eligibleBranches: {
      type: [String],
      enum: ["CS", "IT", "ENTC", "MECH", "CIVIL"],
      default: []
    },
    eligibilityText: { type: String },
    deadline: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
