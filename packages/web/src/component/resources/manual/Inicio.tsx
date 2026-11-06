import { useT } from "@/hooks/useT";
import { Paragraph, Steps, SubTitle } from "./primitives";

export default function Inicio() {
  const t = useT();
  const section = t.manual.inicio;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.home}</strong> {section.intro}
      </Paragraph>

      <SubTitle>{section.howToUse}</SubTitle>
      <Steps
        items={[
          {
            title: section.steps.summary.title,
            description: section.steps.summary.description,
          },
          {
            title: section.steps.shortcuts.title,
            description: section.steps.shortcuts.description,
          },
          {
            title: section.steps.alerts.title,
            description: section.steps.alerts.description,
          },
        ]}
      />
    </div>
  );
}
