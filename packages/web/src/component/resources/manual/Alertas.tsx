import { useT } from "@/hooks/useT";
import { Paragraph, Steps, SubTitle } from "./primitives";

export default function Alertas() {
  const t = useT();
  const section = t.manual.alertas;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.alerts}</strong> {section.intro}
      </Paragraph>

      <SubTitle>{section.howToUse}</SubTitle>
      <Steps
        items={[
          {
            title: section.steps.report.title,
            description: section.steps.report.description,
          },
          {
            title: section.steps.search.title,
            description: section.steps.search.description,
          },
          {
            title: section.steps.resolve.title,
            description: section.steps.resolve.description,
          },
        ]}
      />
    </div>
  );
}
