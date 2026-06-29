import React, { useState } from "react";
import { motion } from "motion/react";
import { Check, Sparkles, School, Building2, Users, ArrowRight } from "lucide-react";

interface PricingTier {
  name: string;
  priceMonthly: string;
  priceAnnually: string;
  periodSuffix: string;
  audience: string;
  desc: string;
  features: string[];
  cta: string;
  badge?: string;
  icon: React.ReactNode;
  colorScheme: {
    cardBg: string;
    border: string;
    glow: string;
    button: string;
    badgeBg?: string;
    badgeText?: string;
    iconBg: string;
    iconColor: string;
  };
}

export default function PricingPlans({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">("annually");

  const tiers: PricingTier[] = [
    {
      name: "Free for Individuals",
      priceMonthly: "$0",
      priceAnnually: "$0",
      periodSuffix: "",
      audience: "For Students & Self-Starters",
      desc: "Perfect for curious learners starting their journey to identify community problems and brainstorm solution concepts.",
      features: [
        "Interactive AI-assisted brainstorming chat",
        "Access to basic Phase 1 (Ideation) Workspace",
        "Personalized problem-solving templates",
        "Basic project portfolio page hosting",
        "Standard English AI assistant support"
      ],
      cta: "Start Your Free Journey",
      icon: <Users className="w-6 h-6" />,
      colorScheme: {
        cardBg: "bg-white",
        border: "border-slate-200",
        glow: "hover:shadow-slate-100",
        button: "bg-slate-900 text-white hover:bg-slate-850",
        iconBg: "bg-slate-100",
        iconColor: "text-slate-600"
      }
    },
    {
      name: "Pro for Schools",
      priceMonthly: "$15",
      priceAnnually: "$12",
      periodSuffix: "/ student / mo",
      audience: "For STEM Clubs, Classes, & Schools",
      desc: "Empower whole classrooms to design, build, and deploy full-fidelity interactive solutions with teacher-led oversight.",
      badge: "MOST POPULAR",
      features: [
        "Everything in Free, plus:",
        "Full access to Phase 2 (Product Creation) Workspace",
        "Advanced voice narration (Urdu-First accessibility)",
        "Teacher dashboard & student progress tracking analytics",
        "Classroom showcase pages & shared portfolio views",
        "Verified digital certificate credentials for students"
      ],
      cta: "Bring VibeLab to Your School",
      icon: <School className="w-6 h-6" />,
      colorScheme: {
        cardBg: "bg-gradient-to-b from-white to-cyan-50/20",
        border: "border-cyan-500/35",
        glow: "shadow-lg shadow-cyan-500/5 hover:shadow-cyan-500/10",
        button: "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-95 shadow-lg shadow-cyan-600/10",
        badgeBg: "bg-cyan-500/10",
        badgeText: "text-cyan-700",
        iconBg: "bg-cyan-500/10",
        iconColor: "text-cyan-600"
      }
    },
    {
      name: "Enterprise",
      priceMonthly: "Custom",
      priceAnnually: "Custom",
      periodSuffix: "",
      audience: "For Government & Regional Partners",
      desc: "Deploy large-scale regional/national digital literacy initiatives aligned with public curricula and custom guidelines.",
      badge: "GOVERNMENT & PUBLIC",
      features: [
        "Everything in Pro, plus:",
        "National scale analytics & Digital Literacy Insights",
        "Custom local curriculum & AI competency alignment",
        "White-labeled region/municipal showcase portals",
        "Dedicated account manager & professional faculty training",
        "Fully managed infrastructure on enterprise-grade local cloud"
      ],
      cta: "Connect with Government Relations",
      icon: <Building2 className="w-6 h-6" />,
      colorScheme: {
        cardBg: "bg-slate-900 text-white",
        border: "border-slate-800",
        glow: "hover:shadow-cyan-500/5",
        button: "bg-white text-slate-900 hover:bg-slate-100",
        badgeBg: "bg-cyan-500/20",
        badgeText: "text-cyan-400",
        iconBg: "bg-slate-800",
        iconColor: "text-cyan-400"
      }
    }
  ];

  return (
    <section id="pricing-plans-section" className="py-40 px-6 bg-slate-50 relative overflow-hidden">
      {/* Visual backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px] -z-10" />
      <div className="absolute bottom-10 -right-20 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-600 mb-6 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PRICING & TAILORED SOLUTIONS</span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight">
            Transparent Pricing for <br />
            <span className="gradient-text">Every Step of the Journey.</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed font-semibold">
            Choose the perfect plan designed for individual student creators, innovative classroom groups, or large-scale regional implementations.
          </p>

          {/* Toggle for Billing Period */}
          <div className="mt-10 inline-flex items-center gap-2 p-1 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <button
              onClick={() => setBillingPeriod("annually")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                billingPeriod === "annually"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Annually (Save 20%)
            </button>
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                billingPeriod === "monthly"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {tiers.map((tier, index) => {
            const isEnterprise = tier.name.toLowerCase().includes("enterprise");
            const price = billingPeriod === "annually" ? tier.priceAnnually : tier.priceMonthly;
            const hasSuffix = price !== "$0" && price !== "Custom" && tier.periodSuffix;

            return (
              <motion.div
                key={index}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
                className={`flex flex-col rounded-[3rem] border p-8 md:p-10 transition-all ${tier.colorScheme.cardBg} ${tier.colorScheme.border} ${tier.colorScheme.glow} relative overflow-hidden`}
              >
                {/* Badge if present */}
                {tier.badge && (
                  <div className="absolute top-6 right-8">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${tier.colorScheme.badgeBg} ${tier.colorScheme.badgeText}`}>
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${tier.colorScheme.iconBg} ${tier.colorScheme.iconColor}`}>
                    {tier.icon}
                  </div>
                  <h3 className="text-2xl font-extrabold tracking-tight mb-2 leading-tight">
                    {tier.name}
                  </h3>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-6 ${isEnterprise ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    {tier.audience}
                  </p>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl md:text-5xl font-display font-black tracking-tight">
                      {price}
                    </span>
                    {hasSuffix && (
                      <span className={`text-xs font-semibold ${isEnterprise ? 'text-slate-400' : 'text-slate-500'}`}>
                        {tier.periodSuffix}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${isEnterprise ? 'text-slate-300 font-medium' : 'text-slate-500 font-semibold'}`}>
                    {tier.desc}
                  </p>
                </div>

                {/* Features List */}
                <div className="flex-grow border-t border-slate-200/50 pt-8 mb-10">
                  <ul className="space-y-4">
                    {tier.features.map((feature, idx) => {
                      const isHeader = feature.endsWith(":");
                      return (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          {isHeader ? (
                            <span className={`font-black uppercase text-[10px] tracking-wider block mt-1 ${isEnterprise ? 'text-cyan-400' : 'text-slate-400'}`}>
                              {feature}
                            </span>
                          ) : (
                            <>
                              <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isEnterprise ? 'text-cyan-400' : 'text-emerald-500'}`} />
                              <span className={isEnterprise ? 'text-slate-200 font-medium' : 'text-slate-600 font-semibold'}>
                                {feature}
                              </span>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="mt-auto">
                  <button
                    onClick={() => {
                      if (tier.name.toLowerCase().includes("free")) {
                        onNavigate("signup");
                      } else {
                        onNavigate("contact");
                      }
                    }}
                    className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-none active:scale-95 ${tier.colorScheme.button}`}
                  >
                    <span>{tier.cta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Pricing Subnote */}
        <div className="mt-16 text-center max-w-2xl mx-auto">
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Need a custom licensing structure for your community organization, county-wide rollout, or regional science board? Our team creates tailored service levels including dedicated localized cloud deployments and specialized teacher webinars.{" "}
            <button
              onClick={() => onNavigate("contact")}
              className="text-cyan-600 hover:text-cyan-700 underline font-extrabold cursor-pointer border-none bg-transparent"
            >
              Contact Us for Custom Options
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
