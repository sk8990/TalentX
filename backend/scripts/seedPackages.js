const mongoose = require("mongoose");

async function seedPackages() {
  const packages = [
    {
      name: "Student Free",
      key: "student_free",
      priceInPaise: 0,
      billingCycle: "forever",
      roleTarget: "student",
      label: "Best for students",
      buttonText: "Get Started",
      buttonActionType: "get_started",
      isActive: true,
      isVisibleOnLandingPage: true,
      displayOrder: 1,
      entitlements: {
        studentProfile: true,
        jobApplications: true,
        applicationTracking: true,
        assessmentAccess: true,
        interviewTracking: true,
        offerAcceptance: true,
        onboardingPortal: true
      }
    },
    {
      name: "Recruiter Starter",
      key: "recruiter_starter",
      priceInPaise: 99900,
      billingCycle: "monthly",
      roleTarget: "recruiter",
      label: "For small hiring teams",
      buttonText: "Start Hiring",
      buttonActionType: "start_hiring",
      isActive: true,
      isVisibleOnLandingPage: true,
      displayOrder: 2,
      entitlements: {
        jobCreationLimit: 5,
        interviewSchedulingLimit: 10,
        offerLetterGenerationLimit: 5,
        onboardingPanelAccessLimit: 5,
        exclusiveAiSupport: false
      }
    },
    {
      name: "Recruiter Pro",
      key: "recruiter_pro",
      priceInPaise: 499900,
      billingCycle: "monthly",
      roleTarget: "recruiter",
      label: "Most Popular",
      buttonText: "Upgrade to Pro",
      buttonActionType: "upgrade",
      isActive: true,
      isVisibleOnLandingPage: true,
      displayOrder: 3,
      entitlements: {
        jobCreationLimit: -1,
        interviewSchedulingLimit: -1,
        offerLetterGenerationLimit: -1,
        onboardingPanelAccessLimit: -1,
        exclusiveAiSupport: true
      }
    },
    {
      name: "University / Enterprise",
      key: "university_enterprise",
      priceInPaise: 0,
      billingCycle: "custom",
      roleTarget: "university",
      label: "For placement teams",
      buttonText: "Contact Sales",
      buttonActionType: "contact_sales",
      isActive: true,
      isVisibleOnLandingPage: true,
      displayOrder: 4,
      entitlements: {
        candidateManageLimit: -1,
        recruiterManageLimit: -1,
        deleteJobFeature: true,
        auditLimit: -1
      }
    }
  ];

  try {
    await Package.deleteMany({});
    await Package.insertMany(packages);
    console.log("Packages seeded successfully");
  } catch (err) {
    console.error("Error seeding packages:", err);
  }
}

require("dotenv").config();
const Package = require("../models/Package");

mongoose
  .connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  .then(seedPackages)
  .then(() => process.exit())
  .catch((err) => {
    console.error("Package seed failed:", err);
    process.exit(1);
  });
