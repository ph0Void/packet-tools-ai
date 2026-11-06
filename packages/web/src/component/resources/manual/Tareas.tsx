import { useT } from "@/hooks/useT";
import { Paragraph, Steps, SubTitle } from "./primitives";

export default function Tareas() {
  const t = useT();
  const section = t.manual.tareas;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.automations}</strong> {section.intro}
      </Paragraph>

      <SubTitle>{section.howToUse}</SubTitle>
      <Steps
        items={[
          {
            title: section.steps.schedule.title,
            description: section.steps.schedule.description,
          },
          {
            title: section.steps.describe.title,
            description: section.steps.describe.description,
          },
          {
            title: section.steps.activate.title,
            description: section.steps.activate.description,
          },
        ]}
      />
    </div>
  );
}
