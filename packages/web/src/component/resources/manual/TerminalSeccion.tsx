import { useT } from "@/hooks/useT";
import { Bullets, Paragraph, Steps, SubTitle } from "./primitives";

export default function TerminalSeccion() {
  const t = useT();
  const section = t.manual.terminal;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.terminal}</strong> {section.intro}
      </Paragraph>
      <Paragraph>
        {section.protocolsPrefix} <strong>{section.ssh}</strong>{" "}
        {section.protocolsMiddle} <strong>{section.telnet}</strong>{" "}
        {section.protocolsMiddle2} <strong>{section.serial}</strong>{" "}
        {section.protocolsSuffix}
      </Paragraph>

      <SubTitle>{section.howToUse}</SubTitle>
      <Steps
        items={[
          {
            title: section.steps.choose.title,
            description: section.steps.choose.description,
          },
          {
            title: section.steps.write.title,
            description: section.steps.write.description,
          },
          {
            title: section.steps.disconnect.title,
            description: section.steps.disconnect.description,
          },
        ]}
      />

      <SubTitle>{section.noDeviceTitle}</SubTitle>
      <Bullets items={[section.noDevice.manual, section.noDevice.serial]} />
    </div>
  );
}
