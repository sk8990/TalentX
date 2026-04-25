module.exports = {
  onboardingTemplate: {
    companyName: "TalentX",
    templateName: "TalentX New Hire Onboarding",
    version: 1,
    steps: [
      {
        key: "review-accept-offer",
        order: 1,
        title: "Review & Accept Offer",
        type: "offer_acceptance"
      },
      {
        key: "document-submission",
        order: 2,
        title: "Document Submission",
        type: "document_collection"
      },
      {
        key: "pre-joining-formalities",
        order: 3,
        title: "Pre-Joining Formalities",
        type: "pre_joining"
      },
      {
        key: "day-1-details",
        order: 4,
        title: "Day 1 Details",
        type: "day_one_info"
      }
    ]
  },
  onboardingInstance: {
    studentId: "student_123",
    companyId: "company_456",
    jobId: "job_789",
    currentStep: 2,
    status: "in_progress",
    steps: [
      { step: 1, status: "completed" },
      { step: 2, status: "under_review" },
      { step: 3, status: "locked" },
      { step: 4, status: "locked" }
    ]
  },
  onboardingStepSubmission: {
    instanceId: "instance_123",
    stepKey: "document-submission",
    version: 1,
    status: "under_review",
    payload: {
      formData: {
        fullName: "Alex Johnson",
        email: "alex.johnson@example.com",
        phoneNumber: "+1 (555) 000-0000"
      }
    }
  },
  document: {
    instanceId: "instance_123",
    stepKey: "document-submission",
    documentType: {
      key: "identityProof",
      label: "ID Proof (Aadhar/PAN)"
    },
    status: "under_review",
    storage: {
      originalName: "alex-pan-card.pdf",
      url: "/uploads/onboarding-documents/example-pan-card.pdf"
    }
  }
};
