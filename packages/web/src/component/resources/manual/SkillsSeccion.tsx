import { useT } from "@/hooks/useT";
import { Bullets, Callout, CodeBlock, Paragraph, Steps, SubTitle } from "./primitives";

export default function SkillsSeccion() {
  const t = useT();
  const section = t.manual.skills;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.skills}</strong> {section.intro}
      </Paragraph>

      <SubTitle>{section.howToUse}</SubTitle>
      <Steps
        items={[
          {
            title: section.steps.create.title,
            description: section.steps.create.description,
          },
          {
            title: section.steps.use.title,
            description: section.steps.use.description,
          },
        ]}
      />

      <SubTitle>{section.exampleTitle}</SubTitle>
      <Paragraph>
        {section.examplePrefix}{" "}
        <strong>{section.exampleTitleSuggestion}</strong>.{" "}
        {section.exampleMiddle} <em>{section.exampleWhen}</em>{" "}
        {section.exampleSuffix}
      </Paragraph>
      <CodeBlock code={section.exampleSkill} label={section.exampleLabel} />

      <SubTitle>{section.guidelinesTitle}</SubTitle>
      <Bullets
        items={[
          section.guidelines.title,
          section.guidelines.when,
          section.guidelines.steps,
          section.guidelines.caution,
          section.guidelines.precise,
        ]}
      />

      <Callout variant="tip" title={section.permissionsTitle}>
        {section.permissions}
      </Callout>
    </div>
  );
}
