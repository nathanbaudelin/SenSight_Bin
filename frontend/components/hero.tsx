import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, BadgeCheck, CirclePlay, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const Hero = () => {
  return (
    <div
      id="project"
      className="min-h-[calc(100vh-6rem)] flex flex-col justify-center py-16 md:py-20 px-6 bg-gradient-to-b from-primary/10 via-background to-background"
    >
      <div className="w-full max-w-(--breakpoint-xl) mx-auto grid lg:grid-cols-2 items-center gap-12 md:gap-16">
        <div className="space-y-6">
          <Badge className="bg-primary rounded-full py-1 border-none w-fit">
            Montgat Pilot · Waste Tax Cut
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-[20ch] text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight">
              Montgat: Recycle More, Pay Less.
            </h1>
            <p className="max-w-[60ch] xs:text-lg text-foreground/90">
              The new hybrid collection system that rewards your efforts.
              Correctly sort your waste and earn up to €90/year in direct local
              tax reductions. Door-to-door for houses, smart street bins for
              apartments, and an app that keeps you on track.
            </p>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center sm:justify-start gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto rounded-full text-base"
            >
              <Link href="#how">
                Check my Neighborhood <ArrowUpRight className="h-5! w-5!" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-full text-base shadow-none"
            >
              <Link href="#app">
                <CirclePlay className="h-5! w-5!" /> The App
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4">
            {[
              {
                title: "Hybrid model",
                desc: "Door-to-door for houses, smart bins for apartments.",
              },
              {
                title: "Tax reduction",
                desc: "Every registered recycling action cuts your local waste tax.",
              },
              {
                title: "All in one app",
                desc: "Calendar, QR unlock, rewards and CO2 savings.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border bg-background/70 p-4 shadow-sm"
              >
                <BadgeCheck className="h-5 w-5 text-emerald-600 mt-1" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-200/50 via-teal-200/30 to-sky-200/40 blur-3xl"
            aria-hidden
          />
          <div className="relative rounded-3xl border bg-background/90 shadow-2xl overflow-hidden p-6">
            <div className="relative w-full aspect-[4/5]">
              <div className="absolute inset-0 rounded-2xl overflow-hidden border">
                <Image
                  src="/hero2.jpg"
                  alt="Montgat Recicla residents and smart bins"
                  fill
                  className="object-cover"
                  priority
                  sizes="(min-width: 1024px) 520px, (min-width: 768px) 420px, 100vw"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <p>RECICLOS keeps Montgat aligned—notifications, unlocks, savings.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
