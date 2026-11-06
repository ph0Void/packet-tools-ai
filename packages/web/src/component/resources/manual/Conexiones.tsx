import { useT } from "@/hooks/useT";
import { Bullets, Paragraph, Steps, SubTitle } from "./primitives";

export default function Conexiones() {
  const t = useT();
  const section = t.manual.conexiones;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.connections}</strong> {section.intro}
      </Paragraph>

      <SubTitle>{section.typesTitle}</SubTitle>
      <Bullets
        items={[
          section.types.ssh,
          section.types.telnet,
          section.types.serial,
          section.types.simulation,
        ]}
      />
      <Paragraph>{section.accepts}</Paragraph>

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
            title: section.steps.use.title,
            description: section.steps.use.description,
          },
        ]}
      />
    </div>
  );
}
