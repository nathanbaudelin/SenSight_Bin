import { BadgeDollarSign, Building2, Home } from "lucide-react";
import React from "react";

const features = [
  {
    icon: Home,
    title: "Door-to-Door for Houses",
    description:
      "Individual bins collected directly at your doorstep following a strict weekly calendar. No more heavy lifting.",
  },
  {
    icon: Building2,
    title: "Smart Bins for Apartments",
    description:
      "Secure, access-controlled street bins available 24/7. Unlock them easily to deposit your organic and residual waste.",
  },
  {
    icon: BadgeDollarSign,
    title: "Real Tax Savings",
    description:
      "We gamified the system: every correct recycling action earns you points that convert directly into tax cuts.",
  },
];

const Features = () => {
  return (
    <div id="how" className="w-full py-12 xs:py-20 px-6">
      <div className="w-full max-w-(--breakpoint-lg) mx-auto flex flex-col gap-6 text-center">
        <p className="text-sm font-semibold text-primary uppercase tracking-[0.2em]">
          Hybrid Collection Model
        </p>
        <h2 className="text-3xl xs:text-4xl sm:text-5xl font-bold tracking-tight">
          Two tailored routes, one shared reward
        </h2>
        <p className="max-w-3xl mx-auto text-foreground/80">
          Montgat mixes door-to-door collection for houses with secure smart
          bins for apartments—and ties every correct action to your personal
          tax reduction.
        </p>
      </div>
      <div className="w-full max-w-(--breakpoint-lg) mx-auto mt-10 sm:mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col bg-background border rounded-2xl py-8 px-6 shadow-sm transition-transform duration-200 hover:scale-[1.02]"
          >
            <div className="mb-4 h-12 w-12 flex items-center justify-center bg-muted rounded-xl">
              <feature.icon className="h-6 w-6" />
            </div>
            <span className="text-xl font-semibold">{feature.title}</span>
            <p className="mt-2 text-foreground/80 text-[15px] leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Features;
