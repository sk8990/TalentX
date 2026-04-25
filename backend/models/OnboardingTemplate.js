const mongoose = require("mongoose");
const { STEP_TYPES } = require("../constants/onboarding");

const templateStepSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(STEP_TYPES),
      required: true
    },
    description: { type: String, default: "" },
    requiresReview: { type: Boolean, default: false },
    content: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: true }
);

const onboardingTemplateSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null
    },
    companyName: { type: String, required: true, trim: true },
    templateName: { type: String, default: "Default Campus Onboarding", trim: true },
    version: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true },
    sourceJobIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Job"
        }
      ],
      default: []
    },
    steps: {
      type: [templateStepSchema],
      default: []
    }
  },
  {
    timestamps: true,
    collection: "onboardingTemplates"
  }
);

onboardingTemplateSchema.index({ companyId: 1, isActive: 1 });
onboardingTemplateSchema.index({ companyName: 1, isActive: 1 });

module.exports = mongoose.model("OnboardingTemplate", onboardingTemplateSchema);
