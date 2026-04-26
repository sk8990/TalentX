import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import RecordVoiceOverRoundedIcon from "@mui/icons-material/RecordVoiceOverRounded";

export const landingContent = {
  navLinks: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Blog", href: "#blog" },
    { label: "Trust", href: "#trust" },
    { label: "Stories", href: "#stories" },
    { label: "Contact", href: "#contact" },
  ],
  hero: {
    eyebrow: "Campus Hiring Platform",
    title: "Where Talent Meets Opportunity",
    description:
      "TalentX helps students launch careers, enables employers to hire faster, and gives universities a modern placement workflow from outreach to offer tracking.",
    primaryCta: { label: "Start Free", to: "/register" },
    secondaryCta: { label: "Watch Demo", href: "#product-preview" },
    highlights: [
      "Student-first onboarding",
      "Recruiter workflow visibility",
      "Placement-team coordination",
    ],
  },
  heroPanels: [
    {
      eyebrow: "Students",
      title: "Discover roles, prepare smarter, and track every step.",
      icon: SchoolRoundedIcon,
      className:
        "left-0 top-2 w-[14.7rem] bg-white shadow-[0_28px_60px_-24px_rgba(15,23,42,0.35)] sm:w-[16.25rem]",
    },
    {
      eyebrow: "Employers",
      title: "Move from outreach to shortlist with one hiring workspace.",
      icon: BusinessCenterRoundedIcon,
      className:
        "bottom-6 left-6 w-[15rem] bg-[#f3ecff] shadow-[0_30px_60px_-26px_rgba(76,29,149,0.35)] sm:w-[17.5rem]",
    },
    {
      eyebrow: "Universities",
      title: "Keep admins, recruiters, and students aligned in real time.",
      icon: ApartmentRoundedIcon,
      className:
        "right-0 top-24 w-[13.75rem] bg-[#eef5ff] shadow-[0_32px_60px_-28px_rgba(30,64,175,0.35)] sm:w-[16.25rem]",
    },
  ],
  impactStats: [
    { value: 2700000, suffix: "+", label: "Students and Young Alumni" },
    { value: 600, suffix: "+", label: "College Placement Cells" },
    { value: 12800, suffix: "+", label: "Employers" },
  ],
  features: [
    {
      id: "employers",
      eyebrow: "Employers",
      title: "End-to-end virtual campus hiring",
      description:
        "Post roles, review applicants, coordinate interviews, and keep every recruiter handoff visible from a single dashboard.",
      cta: { label: "Start Hiring", to: "/register" },
      icon: ManageSearchRoundedIcon,
      tone: "indigo",
    },
    {
      id: "universities",
      eyebrow: "Universities",
      title: "Digitise campus placements online",
      description:
        "Give placement cells a cleaner way to manage employer outreach, student readiness, interview scheduling, and campus-wide communication.",
      cta: { label: "Talk to TalentX", href: "#contact" },
      icon: ApartmentRoundedIcon,
      tone: "sky",
    },
    {
      id: "students",
      eyebrow: "Students",
      title: "Learn, prepare, and apply with confidence",
      description:
        "Build profiles, explore openings, track applications, and stay ready for assessments and interviews in one place.",
      cta: { label: "For Students", to: "/register" },
      icon: RocketLaunchRoundedIcon,
      tone: "amber",
    },
  ],
  howItWorks: [
    {
      step: 1,
      title: "Sign Up",
      description: "Create your account as a student, recruiter, or university admin in under a minute.",
      icon: PersonAddRoundedIcon,
    },
    {
      step: 2,
      title: "Build Your Profile",
      description: "Add your skills, experience, and preferences. Recruiters post roles and set criteria.",
      icon: AccountCircleRoundedIcon,
    },
    {
      step: 3,
      title: "Discover & Apply",
      description: "Browse matching opportunities, apply with one click, and track your application status live.",
      icon: SearchRoundedIcon,
    },
    {
      step: 4,
      title: "Get Hired",
      description: "Attend interviews, receive offers, and launch your career — all through TalentX.",
      icon: EmojiEventsRoundedIcon,
    },
  ],
  productPreview: [
    {
      title: "Student Dashboard",
      description: "Track applications, interviews, offers, and onboarding progress.",
      icon: DashboardRoundedIcon,
    },
    {
      title: "Recruiter Pipeline",
      description: "Manage jobs, candidates, assessments, interviews, and offers.",
      icon: GroupsRoundedIcon,
    },
    {
      title: "Onboarding Portal",
      description: "Accept offers, upload documents, and complete joining steps.",
      icon: AssignmentTurnedInRoundedIcon,
    },
    {
      title: "Interview Panel",
      description: "Run AI or human interviews with feedback and status tracking.",
      icon: RecordVoiceOverRoundedIcon,
    },
  ],
  pricingPlans: [
    {
      name: "Student Free",
      key: "student_free",
      price: "₹0",
      billingText: "forever",
      badge: "Best for students",
      features: [
        "Student profile",
        "Job applications",
        "Application tracking",
        "Assessment access",
        "Interview tracking",
        "Offer acceptance",
        "Onboarding portal",
      ],
      cta: "Get Started",
      action: "signup",
    },
    {
      name: "Recruiter Starter",
      key: "recruiter_starter",
      price: "₹999",
      billingText: "per month",
      badge: "For small hiring teams",
      features: [
        "5 active jobs",
        "100 applicants per month",
        "Basic applicant tracking",
        "Interview scheduling",
        "Offer generation",
      ],
      cta: "Start Hiring",
      action: "payment",
      amount: 99900,
    },
    {
      name: "Recruiter Pro",
      key: "recruiter_pro",
      price: "₹4,999",
      billingText: "per month",
      badge: "Most Popular",
      features: [
        "Unlimited jobs",
        "AI JD generation",
        "AI candidate matching",
        "Assessment panel",
        "Human interview panel",
        "Offer and onboarding management",
        "Priority support",
      ],
      cta: "Upgrade to Pro",
      action: "payment",
      amount: 499900,
      highlighted: true,
    },
    {
      name: "University / Enterprise",
      key: "enterprise",
      price: "Custom",
      billingText: "contact sales",
      badge: "For placement teams",
      features: [
        "Admin dashboard",
        "Multi-company placement management",
        "Bulk student management",
        "Reports and analytics",
        "Custom onboarding workflows",
        "Dedicated support",
      ],
      cta: "Contact Sales",
      action: "contact",
    },
  ],
  blogPosts: [
    {
      title: "How AI is changing campus recruitment",
      slug: "ai-campus-recruitment",
      category: "Hiring",
      readTime: "5 min read",
      description: "Learn how AI can speed up matching, screening, and interview preparation.",
    },
    {
      title: "How students can prepare for AI interviews",
      slug: "student-ai-interviews",
      category: "Students",
      readTime: "4 min read",
      description: "Tips for building confidence before AI-assisted interview rounds.",
    },
    {
      title: "Building a smooth offer-to-onboarding journey",
      slug: "offer-to-onboarding",
      category: "Onboarding",
      readTime: "6 min read",
      description: "How digital onboarding reduces confusion after selection.",
    },
    {
      title: "What recruiters should track during campus hiring",
      slug: "recruiter-hiring-metrics",
      category: "Recruiters",
      readTime: "5 min read",
      description: "Key metrics for improving shortlisting, interviews, and offers.",
    },
    {
      title: "Why placement teams need centralized dashboards",
      slug: "placement-dashboard",
      category: "Universities",
      readTime: "4 min read",
      description: "How placement cells can reduce manual work and improve visibility.",
    },
  ],
  faqs: [
    {
      question: "Is TalentX free for students?",
      answer:
        "Yes, students can create profiles, apply to jobs, track applications, attend assessments/interviews, and complete onboarding for free.",
    },
    {
      question: "Can recruiters generate offer letters?",
      answer: "Yes, recruiters can generate offer letters and manage acceptance and onboarding.",
    },
    {
      question: "Does TalentX support AI interviews?",
      answer:
        "Yes, TalentX supports AI interview workflows and can also support human interview panels.",
    },
    {
      question: "Can colleges manage multiple companies?",
      answer:
        "Yes, placement teams can manage recruiters, jobs, applications, approvals, and student progress.",
    },
    {
      question: "Can students upload onboarding documents?",
      answer:
        "Yes, students can upload required documents for verification during onboarding.",
    },
    {
      question: "Can recruiters manage paid plans?",
      answer:
        "Yes, paid recruiter plans can be activated through Razorpay Test Mode payment integration.",
    },
  ],
  trust: {
    eyebrow: "Built For Modern Placement Operations",
    title: "Flexible enough for universities, training institutes, and hiring teams",
    description:
      "Use a shared workflow for outreach, job discovery, interview scheduling, and placement communication without rebuilding the process for every audience.",
    colleges: [
      { name: "IIT Bombay", domain: "iitb.ac.in", city: "Mumbai" },
      { name: "IIT Madras", domain: "iitm.ac.in", city: "Chennai" },
      { name: "BITS Pilani", domain: "bits-pilani.ac.in", city: "Pilani" },
      { name: "VIT", domain: "vit.ac.in", city: "Vellore" },
      { name: "Suryadatta Group of Institutes", domain: "scmirt.org", city: "Pune" },
      { name: "MIT ACSC", domain: "mitacsc.ac.in", city: "Pune" },
      { name: "Pune University", domain: "notayush.xyz", city: "Pune" },
      { name: "Manipal Academy", domain: "manipal.edu", city: "Manipal" },
      { name: "D.Y. Patil University", domain: "dypatiluniversitypune.edu.in", city: "Pune" },
      { name: "Raisoni Group ", domain: "raisoni.net", city: "Pune" },
      { name: "IIT Hyderabad", domain: "iith.ac.in", city: "Hyderabad" },
      { name: "IIIT Bangalore", domain: "iiitb.ac.in", city: "Bengaluru" },
    ],
    pillars: [
      {
        icon: VerifiedRoundedIcon,
        title: "Structured approvals",
        text: "Recruiters, students, and placement teams all work with clear permissions.",
      },
      {
        icon: HubRoundedIcon,
        title: "Shared pipeline visibility",
        text: "Everyone sees where applications, interviews, and support requests stand.",
      },
      {
        icon: InsightsRoundedIcon,
        title: "Operational clarity",
        text: "Reduce follow-up noise with a single source of truth for hiring actions.",
      },
    ],
  },
  testimonial: {
    eyebrow: "Why Teams Love TalentX",
    quote:
      "TalentX gives our placement process a cleaner rhythm. Students know what comes next, recruiters move faster, and the university team is no longer chasing updates across separate tools.",
    name: "Campus Placement Office",
    role: "Shared operations view for placements, hiring, and student readiness",
    badges: ["Placement Team", "Recruiter Ops", "Student Support", "Interview Desk", "Career Services"],
  },
  finalCta: {
    title: "Bring your placement workflow, recruiting pipeline, and student journey together.",
    description:
      "Launch with a landing-first experience, then route each audience into the right TalentX workspace.",
    primaryCta: { label: "Create Account", to: "/register" },
    secondaryCta: { label: "View Pricing", href: "#pricing" },
  },
  footer: {
    summary:
      "TalentX connects students, employers, and universities through a single campus hiring experience.",
    groups: [
      {
        title: "Platform",
        links: [
          { label: "Features", href: "#features" },
          { label: "How It Works", href: "#how-it-works" },
          { label: "Pricing", href: "#pricing" },
          { label: "Blog", href: "#blog" },
          { label: "Trust", href: "#trust" },
          { label: "Stories", href: "#stories" },
        ],
      },
      {
        title: "Access",
        links: [
          { label: "Login", to: "/login" },
          { label: "Sign up", to: "/register" },
          { label: "Forgot password", to: "/forgot-password" },
        ],
      },
      {
        title: "Why TalentX",
        links: [
          { label: "Shared workflow", href: "#trust" },
          { label: "Placement support", href: "#contact" },
          { label: "Role-based access", href: "#hero" },
        ],
      },
    ],
    contact: {
      label: "Talk to the TalentX team",
      email: "hello@talentx.local",
      note: "For university onboarding, placement workflows, and recruiter setup.",
    },
  },
  accentIcons: [AutoAwesomeRoundedIcon, SchoolRoundedIcon, BusinessCenterRoundedIcon],
};
