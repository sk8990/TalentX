import { useEffect, useState } from "react";
import API from "../../api/axios";
import { landingContent } from "./landingContent";

import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import StatsBar from "./StatsBar";
import FeaturesSection from "./FeaturesSection";
import HowItWorks from "./HowItWorks";
import TrustSection from "./TrustSection";
import TestimonialsSection from "./TestimonialsSection";
import CtaSection from "./CtaSection";
import Footer from "./Footer";

export default function LandingPage() {
  const [logoDevToken, setLogoDevToken] = useState("");

  useEffect(() => {
    let isActive = true;

    API.get("/public/branding")
      .then((response) => {
        if (!isActive) return;
        setLogoDevToken(String(response.data?.logoDevToken || "").trim());
      })
      .catch(() => {
        if (!isActive) return;
        setLogoDevToken("");
      });

    return () => {
      isActive = false;
    };
  }, []);

  const {
    navLinks,
    hero,
    heroPanels,
    impactStats,
    features,
    howItWorks,
    trust,
    testimonial,
    finalCta,
    footer,
    accentIcons,
  } = landingContent;

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <Navbar navLinks={navLinks} />

      <main>
        <HeroSection hero={hero} heroPanels={heroPanels} accentIcons={accentIcons} />
        <StatsBar stats={impactStats} />
        <FeaturesSection features={features} />
        <HowItWorks steps={howItWorks} />
        <TrustSection trust={trust} logoDevToken={logoDevToken} />
        <TestimonialsSection testimonial={testimonial} />
        <CtaSection finalCta={finalCta} />
      </main>

      <Footer footer={footer} />
    </div>
  );
}
