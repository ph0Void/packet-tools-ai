import { useT } from "@/hooks/useT";
import { Bullets, Paragraph, Steps, SubTitle } from "./primitives";

export default function Modelos() {
  const t = useT();
  const section = t.manual.configuracion;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.configuration}</strong> {section.intro}
      </Paragraph>

      <SubTitle>{section.providersTitle}</SubTitle>
      <Bullets
        items={[
          section.providers.cloud,
          section.providers.local,
          section.providers.custom,
        ]}
      />

      <SubTitle>{section.twoThingsTitle}</SubTitle>
      <Bullets items={[section.twoThings.type, section.twoThings.prompt]} />

      <SubTitle>{section.howToUse}</SubTitle>
      <Steps
        items={[
          {
            title: section.steps.add.title,
            description: section.steps.add.description,
          },
          {
            title: section.steps.test.title,
            description: section.steps.test.description,
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
