import { ExternalLink } from "lucide-react";
import { useT } from "@/hooks/useT";
import { Paragraph, Steps, SubTitle } from "./primitives";

const REFERENCES = [
  {
    key: "plugin",
    url: "https://github.com/ph0Void/packet-tools-ai/releases/tag/plugin",
  },
  {
    key: "windows",
    url: "https://github.com/ph0Void/packet-tools-ai/releases/latest",
  },
  {
    key: "linux",
    url: "https://github.com/ph0Void/packet-tools-ai/releases/latest",
  },
  {
    key: "packetTracer",
    url: "https://www.netacad.com/resources/lab-downloads",
  },
  {
    key: "gns3",
    url: "https://www.gns3.com/",
  },
  {
    key: "github",
    url: "https://github.com/ph0Void/packet-tools-ai",
  },
] as const;

export default function PrimerosPasos() {
  const t = useT().manual.primerosPasos;
  const references = REFERENCES.map((ref) => ({
    ...ref,
    ...t.references[ref.key],
  }));

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <SubTitle>{t.welcomeTitle}</SubTitle>
        <Paragraph>{t.welcome}</Paragraph>
        <Steps
          items={[
            {
              title: t.steps.account.title,
              description: t.steps.account.description,
            },
            {
              title: t.steps.device.title,
              description: t.steps.device.description,
            },
            {
              title: t.steps.ask.title,
              description: t.steps.ask.description,
            },
          ]}
        />
      </section>

      <section className="space-y-2">
        <SubTitle>{t.referencesTitle}</SubTitle>
        <Paragraph>{t.referencesIntro}</Paragraph>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {references.map((ref) => (
            <li key={ref.key}>
              <a
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-1 rounded-lg border border-border p-4 transition-all duration-200 hover:border-primary/50 hover:bg-muted/40"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {ref.title}
                  <ExternalLink className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs text-muted-foreground">
                  {ref.description}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
