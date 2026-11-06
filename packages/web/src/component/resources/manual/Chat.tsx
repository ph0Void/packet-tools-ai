import { useT } from "@/hooks/useT";
import { Callout, Paragraph, Steps, SubTitle } from "./primitives";

export default function Chat() {
  const t = useT();
  const section = t.manual.chat;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.chat}</strong> {section.intro}
      </Paragraph>

      <SubTitle>{section.howToUse}</SubTitle>
      <Steps
        items={[
          {
            title: section.steps.write.title,
            description: section.steps.write.description,
          },
          {
            title: section.steps.answer.title,
            description: section.steps.answer.description,
          },
          {
            title: section.steps.result.title,
            description: section.steps.result.description,
          },
        ]}
      />

      <Callout variant="tip" title={section.tipTitle}>
        {section.tip}
      </Callout>
    </div>
  );
}
