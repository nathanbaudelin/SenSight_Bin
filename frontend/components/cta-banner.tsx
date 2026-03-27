import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

export default function CTABanner() {
  return (
    <section id="app" className="px-6 py-12 xs:py-20">
      <div className="relative overflow-hidden w-full bg-muted/40 text-foreground max-w-(--breakpoint-lg) mx-auto rounded-2xl py-10 md:py-16 px-6 md:px-14 border">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-primary uppercase tracking-[0.2em]">
              The Goal
            </p>
            <h3 className="text-3xl md:text-4xl font-semibold leading-tight">
              Our Mission: Fix the Organic Gap.
            </h3>
            <p className="text-base md:text-lg text-muted-foreground">
              Montgat currently recycles 55% of its waste, but only 14% of organic
              waste is captured. Together, we can reach the European target of 65%
              recycling.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="#join">
                  Join the Challenge <ArrowUpRight className="h-5! w-5!" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative h-full flex justify-center">
            <div className="relative w-full max-w-sm md:max-w-md lg:max-w-lg aspect-[4/5] overflow-hidden rounded-xl border bg-background">
              <Image
                src="/entete.png"
                alt="RECICLOS calendar preview"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 520px, (min-width: 768px) 420px, 100vw"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
