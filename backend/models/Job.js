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
    minCgpa: { type: Number, required: true, min: 0.1 },
    eligibleBranches: {
      type: [String],
      enum: ["CS", "IT", "ENTC", "MECH", "CIVIL"],
      default: []
    },
    eligibilityText: { type: String },
    deadline: { type: Date, required: true },
    isActive: { type: Boolean, default: true },

    targetColleges: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "College" }],
      default: []
    },
    visibilityType: {
      type: String,
      enum: ["college_only", "college_plus_off_campus", "all_students"],
      default: "all_students"
    }
  },
  { timestamps: true }
);

jobSchema.index({ targetColleges: 1 });
jobSchema.index({ visibilityType: 1 });
jobSchema.index({ recruiterId: 1 });
jobSchema.index({ isActive: 1 });
jobSchema.index({ createdAt: -1 });

// Virtual: visibleToOffCampus derived from visibilityType for backward compatibility
jobSchema.virtual("visibleToOffCampus").get(function () {
  return this.visibilityType === "all_students" || this.visibilityType === "college_plus_off_campus";
});
jobSchema.set("toObject", { virtuals: true });
jobSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Job", jobSchema);
