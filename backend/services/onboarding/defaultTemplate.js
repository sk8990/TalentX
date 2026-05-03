const {
  STEP_TYPES,
  STUDENT_ONBOARDING_REQUIRED_DOCUMENTS
} = require("../../constants/onboarding");

function buildOfferStep() {
  return {
    key: "review-accept-offer",
    order: 1,
    title: "Review & Accept Offer",
    type: STEP_TYPES.OFFER_ACCEPTANCE,
    description: "Please review your offer details carefully before accepting.",
    requiresReview: false,
    content: {
      acceptanceLabel:
        "I have read and accept the offer letter and all terms mentioned above. I understand that this is a legally binding agreement."
    }
  };
}

function buildDocumentStep() {
  return {
    key: "document-submission",
    order: 2,
    title: "Document Submission",
    type: STEP_TYPES.DOCUMENT_COLLECTION,
    description: "Please provide your personal details and upload required documents.",
    requiresReview: true,
    content: {
      sections: [
        {
          key: "personalDetails",
          title: "Personal Details",
          fields: [
            { key: "fullName", label: "Full Name", type: "text", placeholder: "Enter full name", required: true },
            { key: "email", label: "Email Address", type: "email", placeholder: "your.email@example.com", required: true },
            { key: "phoneNumber", label: "Phone Number", type: "tel", placeholder: "+1 (555) 000-0000", required: true }
          ]
        },
        {
          key: "addressInformation",
          title: "Address Information",
          fields: [
            { key: "streetAddress", label: "Street Address", type: "text", placeholder: "123 Main Street", required: true },
            { key: "city", label: "City", type: "text", placeholder: "City", required: true },
            { key: "state", label: "State", type: "text", placeholder: "State", required: true },
            { key: "zipCode", label: "ZIP Code", type: "text", placeholder: "12345", required: true }
          ]
        },
        {
          key: "guardianDetails",
          title: "Parent/Guardian Details",
          fields: [
            { key: "guardianName", label: "Parent/Guardian Name", type: "text", placeholder: "Full name", required: true },
            { key: "guardianPhone", label: "Parent/Guardian Phone", type: "tel", placeholder: "+1 (555) 000-0000", required: true }
          ]
        }
      ],
      requiredDocuments: STUDENT_ONBOARDING_REQUIRED_DOCUMENTS
    }
  };
}

function buildPreJoiningStep(companyName) {
  return {
    key: "pre-joining-formalities",
    order: 3,
    title: "Pre-Joining Formalities",
    type: STEP_TYPES.PRE_JOINING,
    description: "Review important policies and complete required pre-joining tasks.",
    requiresReview: false,
    content: {
      tasks: [
        {
          key: "companyPolicies",
          title: "Company Policies",
          description: `Read and understand ${companyName}'s workplace policies, benefits, and employee handbook.`
        },
        {
          key: "codeOfConduct",
          title: "Code of Conduct",
          description: "Acknowledge the code of conduct, ethics guidelines, and professional standards."
        },
        {
          key: "dataPrivacy",
          title: "Data Privacy & Security",
          description: "Review data privacy policies, security protocols, and confidentiality agreements."
        },
        {
          key: "trainingOverview",
          title: "Training Overview",
          description: "Watch the onboarding overview video and complete the welcome training module."
        }
      ],
      video: {
        title: "Welcome Video",
        description: `Watch a quick welcome message and learn about ${companyName}'s culture and values.`,
        embedUrl: "",
        sourceUrl: "",
        provider: "none",
        isFallback: true
      }
    }
  };
}

function buildDayOneStep(companyName) {
  return {
    key: "day-1-details",
    order: 4,
    title: "Day 1 Details",
    type: STEP_TYPES.DAY_ONE_INFO,
    description: `Everything you need to know for your first day at ${companyName}.`,
    requiresReview: false,
    content: {
      reportingTime: "9:00 AM",
      location: {
        name: "Location will be shared by recruiter",
        addressLines: [],
        mapLabel: "Office location pending"
      },
      instructions: [
        "Report to the reception desk on the ground floor",
        "Present your joining pass (QR code below)",
        "Bring a valid photo ID and printed offer letter",
        "You will be directed to HR for orientation at 9:30 AM"
      ],
      agenda: [
        { time: "9:00 AM", title: "Reception Check-in" },
        { time: "9:30 AM", title: "HR Orientation" },
        { time: "11:00 AM", title: "Team Introduction" },
        { time: "12:00 PM", title: "Lunch with Team" },
        { time: "2:00 PM", title: "Workspace Setup" },
        { time: "4:00 PM", title: "IT & Access Setup" }
      ],
      passLabel: "Digital Joining Pass"
    }
  };
}

function buildDefaultTemplateDefinition(companyName) {
  return {
    templateName: `${companyName} New Hire Onboarding`,
    version: 1,
    steps: [
      buildOfferStep(),
      buildDocumentStep(),
      buildPreJoiningStep(companyName),
      buildDayOneStep(companyName)
    ]
  };
}

module.exports = {
  buildDefaultTemplateDefinition
};
