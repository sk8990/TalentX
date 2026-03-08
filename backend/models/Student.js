const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    branch: {
      type: String,
      enum: ["CS", "IT", "ENTC", "MECH", "CIVIL"],
      default: null
    },

    year: {
      type: String,
      default: null
    },

    cgpa: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },

    skills: {
      type: [String],
      default: []
    },

    resumeUrl: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
