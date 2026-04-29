import { useEffect, useState } from "react";
import API from "../../api/axios";
import { landingContent } from "./landingContent";

import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import StatsBar from "./StatsBar";
import FeaturesSection from "./FeaturesSection";
import HowItWorks from "./HowItWorks";
import ProductPreviewSection from "./ProductPreviewSection";
import PricingSection from "./PricingSection";
import BlogSection from "./BlogSection";
import TrustSection from "./TrustSection";
import TestimonialsSection from "./TestimonialsSection";
import FAQSection from "./FAQSection";
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
    productPreview,
    blogPosts,
    faqs,
    trust,
    testimonial,
    finalCta,
    footer,
    accentIcons,
  } = landingContent;

  return (
    <div className="min-h-screen overflow-clip bg-[#f8f9fc] text-slate-900">
      <Navbar navLinks={navLinks} />

      <main>
        <HeroSection hero={hero} heroPanels={heroPanels} accentIcons={accentIcons} />
        <StatsBar stats={impactStats} />
        <FeaturesSection features={features} />
        <HowItWorks steps={howItWorks} />
        <ProductPreviewSection productPreview={productPreview} />
        <PricingSection />
        <BlogSection blogPosts={blogPosts} />
        <TrustSection trust={trust} logoDevToken={logoDevToken} />
        <TestimonialsSection testimonial={testimonial} />
        <FAQSection faqs={faqs} />
        <CtaSection finalCta={finalCta} />
      </main>

      <Footer footer={footer} />
    </div>
  );
}
