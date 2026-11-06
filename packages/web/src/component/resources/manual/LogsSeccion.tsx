import { useT } from "@/hooks/useT";
import { Paragraph, Steps, SubTitle } from "./primitives";

export default function LogsSeccion() {
  const t = useT();
  const section = t.manual.logs;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.logs}</strong> {section.intro}
      </Paragraph>

      <SubTitle>{section.howToUse}</SubTitle>
      <Steps
        items={[
          {
            title: section.steps.search.title,
            description: section.steps.search.description,
          },
          {
            title: section.steps.read.title,
            description: section.steps.read.description,
          },
          {
            title: section.steps.export.title,
            description: section.steps.export.description,
          },
        ]}
      />
    </div>
  );
}
