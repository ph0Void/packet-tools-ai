import { useT } from "@/hooks/useT";
import { Paragraph, Steps, SubTitle } from "./primitives";

export default function DatosRag() {
  const t = useT();
  const section = t.manual.datos;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.data}</strong> {section.intro}
      </Paragraph>

      <SubTitle>{section.howToUse}</SubTitle>
      <Steps
        items={[
          {
            title: section.steps.upload.title,
            description: section.steps.upload.description,
          },
          {
            title: section.steps.name.title,
            description: section.steps.name.description,
          },
          {
            title: section.steps.ask.title,
            description: section.steps.ask.description,
          },
        ]}
      />
    </div>
  );
}
