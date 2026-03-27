"use client";

import Image from "next/image";

const appScreens = [
  {
    name: "Track Your Savings",
    description:
      "Every recycling action counts. Visualize your waste tax reduction in real-time.",
    image: "/screen_left.png",
  },
  {
    name: "Join the Challenge",
    description:
      "Earn points, unlock badges, and compare your eco-score with Montgat's top recyclers.",
    image: "/screen-middle.png",
  },
  {
    name: "Measure Your Impact",
    description:
      "Track your personal stats: total recycling actions and kg of CO2 saved.",
    image: "/screen_right.png",
  },
];

const AppScreens = () => {
  return (
    <div
      id="app-features"
      className="flex flex-col items-center justify-center py-12 xs:py-20 px-6 bg-gradient-to-b from-background via-background to-muted/40"
    >
      <h1 className="text-3xl xs:text-4xl md:text-5xl font-bold text-center tracking-tight">
        Powered by the RECICLOS App
      </h1>
      <p className="mt-3 max-w-2xl text-center text-muted-foreground">
        Your simple companion to unlock bins, check the calendar, and track your
        savings.
      </p>
      <div className="mt-12 max-w-(--breakpoint-lg) mx-auto grid grid-cols-1 lg:grid-cols-3 items-start gap-8">
        {appScreens.map((screen) => (
          <div
            key={screen.name}
            className="relative rounded-2xl p-6 bg-background shadow-sm flex flex-col gap-4 transition-transform duration-200 hover:scale-[1.02]"
          >
            <div className="overflow-hidden rounded-xl">
              <Image
                src={screen.image}
                alt={screen.name}
                width={480}
                height={960}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-semibold">{screen.name}</h3>
              <p className="text-sm text-muted-foreground">
                {screen.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppScreens;
