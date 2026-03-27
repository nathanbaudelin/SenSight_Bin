import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { PlusIcon } from "lucide-react";

const faq = [
  {
    question: 'How is the "Waste Tax Cut" calculated?',
    answer:
      'It follows a "Pay-As-You-Throw" model. Every correct recycling action (scanning a bag or using a smart bin) earns points. These points accumulate and are automatically deducted from your annual municipal waste tax bill, up to a maximum of €90 per household per year.',
  },
  {
    question: "I live in an apartment. How do I open the street bins?",
    answer:
      "The Brown (Organic) and Grey (Rest) bins are locked to ensure proper usage. You can unlock them 24/7 by scanning the QR code on the bin using the RECICLOS app. The lid will open automatically for 5 seconds.",
  },
  {
    question: "I live in a house. What if I miss the collection time?",
    answer:
      'The Door-to-Door collection follows a strict schedule (usually 20:00 - 22:00). If you miss the truck, please DO NOT leave waste on the street. You must take it to the "Emergency Smart Bins" located at the Green Point (Deixalleria), accessible via the app.',
  },
  {
    question: "I don't have a smartphone. Can I still participate?",
    answer:
      "Yes. While the App offers the best experience (calendar, savings tracking), the City Council provides physical NFC Key Cards for residents who cannot use smartphones. These cards allow you to unlock street bins and record your participation.",
  },
  {
    question: "Why is there a special focus on Organic Waste?",
    answer:
      "Currently, only 14% of organic waste in Montgat is recycled properly, yet it makes up 40% of our total waste. Improving organic separation is the fastest way to reach our 70% recycling target and lower costs for the city.",
  },
  {
    question: "What happens if the smart bin is full or broken?",
    answer:
      'Please report it immediately via the "Report Issue" button in the App. The system will direct you to the nearest available bin. Our maintenance teams receive real-time alerts from the bins\' sensors to fix issues typically within 4 hours.',
  },
];

const FAQ = () => {
  return (
    <div
      id="faq"
      className="w-full max-w-(--breakpoint-xl) mx-auto pt-8 pb-10 xs:pt-14 xs:pb-12 px-6"
    >
      <h2 className="md:text-center text-3xl xs:text-4xl md:text-5xl leading-[1.15]! font-bold tracking-tighter">
        Frequently Asked Questions
      </h2>
      <p className="mt-1.5 md:text-center xs:text-lg text-muted-foreground">
        Everything you need to know about the Montgat Recicla pilot program.
      </p>

      <div className="min-h-[320px]">
        <Accordion
          type="single"
          collapsible
          className="mt-8 space-y-4 md:columns-2 gap-4"
        >
          {faq.map(({ question, answer }, index) => (
            <AccordionItem
              key={question}
              value={`question-${index}`}
              className="bg-accent py-1 px-4 rounded-xl border-none mt-0! mb-4! break-inside-avoid"
            >
              <AccordionPrimitive.Header className="flex">
                <AccordionPrimitive.Trigger
                  className={cn(
                    "flex flex-1 items-center justify-between py-4 font-semibold tracking-tight transition-all hover:underline [&[data-state=open]>svg]:rotate-45",
                    "text-start text-lg"
                  )}
                >
                  {question}
                  <PlusIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200" />
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionContent className="text-[15px]">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default FAQ;
