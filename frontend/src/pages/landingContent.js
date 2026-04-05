import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

export const landingContent = {
  navLinks: [
    { label: "Universities", href: "#universities" },
    { label: "Employers", href: "#employers" },
    { label: "Students", href: "#students" },
    { label: "Stories", href: "#stories" },
    { label: "Contact", href: "#cta" },
  ],
  hero: {
    eyebrow: "Campus Hiring Platform",
    title: "Where Talent Meets Opportunity",
    description:
      "TalentX helps students launch careers, enables employers to hire faster, and gives universities a modern placement workflow from outreach to offer tracking.",
    primaryCta: { label: "Get Started", to: "/register" },
    secondaryCta: { label: "Login", to: "/login" },
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
        "left-0 top-2 w-[235px] bg-white shadow-[0_28px_60px_-24px_rgba(15,23,42,0.35)] sm:w-[260px]",
    },
    {
      eyebrow: "Employers",
      title: "Move from outreach to shortlist with one hiring workspace.",
      icon: BusinessCenterRoundedIcon,
      className:
        "bottom-6 left-6 w-[240px] bg-[#f3ecff] shadow-[0_30px_60px_-26px_rgba(76,29,149,0.35)] sm:w-[280px]",
    },
    {
      eyebrow: "Universities",
      title: "Keep admins, recruiters, and students aligned in real time.",
      icon: ApartmentRoundedIcon,
      className:
        "right-0 top-24 w-[220px] bg-[#eef5ff] shadow-[0_32px_60px_-28px_rgba(30,64,175,0.35)] sm:w-[260px]",
    },
  ],
  impactStats: [
    {
      value: 2700000,
      suffix: "+",
      label: "Students and Young Alumni",
    },
    {
      value: 600,
      suffix: "+",
      label: "College Placement Cells",
    },
    {
      value: 12800,
      suffix: "+",
      label: "Employers",
    },
  ],
  audienceCards: [
    {
      id: "employers",
      eyebrow: "Employers",
      title: "End-to-end virtual campus hiring without scattered spreadsheets",
      description:
        "Post roles, review applicants, coordinate interviews, and keep every recruiter handoff visible from a single dashboard.",
      cta: { label: "Start Hiring", to: "/register" },
      icon: ManageSearchRoundedIcon,
      tone: "indigo",
    },
    {
      id: "universities",
      eyebrow: "Universities",
      title: "Digitise and automate campus placements online",
      description:
        "Give placement cells a cleaner way to manage employer outreach, student readiness, interview scheduling, and campus-wide communication.",
      cta: { label: "Talk to TalentX", href: "#cta" },
      icon: ApartmentRoundedIcon,
      tone: "sky",
    },
    {
      id: "students",
      eyebrow: "Students",
      title: "Learn, prepare, and apply to opportunities with confidence",
      description:
        "Students can build profiles, explore openings, track applications, and stay ready for assessments and interviews in one place.",
      cta: { label: "For Students", to: "/register" },
      icon: RocketLaunchRoundedIcon,
      tone: "amber",
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
    secondaryCta: { label: "Login", to: "/login" },
  },
  footer: {
    summary:
      "TalentX connects students, employers, and universities through a single campus hiring experience.",
    groups: [
      {
        title: "Platform",
        links: [
          { label: "Universities", href: "#universities" },
          { label: "Employers", href: "#employers" },
          { label: "Students", href: "#students" },
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
          { label: "Placement support", href: "#cta" },
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
