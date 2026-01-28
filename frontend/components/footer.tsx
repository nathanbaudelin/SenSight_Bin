import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const footerLinks = [
  {
    title: "Legal",
    href: "#",
  },
  {
    title: "City Council",
    href: "#",
  },
  {
    title: "Support",
    href: "#",
  },
];

const Footer = () => {
  return (
    <footer
      id="join"
      className="dark:border-t mt-5 bg-background text-foreground border-t"
    >
      <div className="max-w-(--breakpoint-xl) mx-auto">
        <div className="py-12 px-6 xl:px-0 flex flex-col lg:flex-row gap-10 lg:gap-16 items-start justify-between">
          <div className="flex-1 max-w-xl space-y-4">
            <p className="text-sm font-semibold text-primary uppercase tracking-[0.2em]">
              Join the pilot
            </p>
            <h3 className="text-3xl md:text-4xl font-semibold leading-tight">
              Ready to lower your taxes?
            </h3>
            <p className="text-muted-foreground">
              Join the Montgat pilot program today.
            </p>
            <form className="mt-6 flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="Enter your email address"
                className="bg-background"
              />
              <Button className="sm:min-w-[140px]">Join Beta</Button>
            </form>
          </div>
          <div className="flex flex-col gap-4">
            <p className="font-semibold text-lg">Montgat Recicla</p>
            <p className="text-muted-foreground max-w-xs">
              Hybrid waste collection for Montgat. Recycle more, pay less, and
              track every action inside RECICLOS.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              {footerLinks.map(({ title, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {title}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <Separator />
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-y-3 px-6 xl:px-0">
          <span className="text-muted-foreground text-center sm:text-start">
            © 2025 Montgat City Council Pilot Program.
          </span>
          <Link
            href="mailto:hola@montgatrecicla.local"
            className="text-sm font-medium hover:underline"
          >
            hola@montgatrecicla.local
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
