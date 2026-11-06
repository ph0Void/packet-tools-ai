import { useT } from "@/hooks/useT";
import {
  InlineCode,
  Paragraph,
  SimpleTable,
  Steps,
  SubTitle,
} from "./primitives";

export default function Usuarios() {
  const t = useT();
  const section = t.manual.usuarios;
  const yes = t.common.yes;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.nav.users}</strong> {section.intro}
      </Paragraph>

      <SubTitle>{section.howToUse}</SubTitle>
      <Steps
        items={[
          {
            title: section.steps.create.title,
            description: section.steps.create.description,
          },
          {
            title: section.steps.manage.title,
            description: section.steps.manage.description,
          },
        ]}
      />

      <SubTitle>{section.rolesTitle}</SubTitle>
      <Paragraph>
        {section.rolesIntro} <InlineCode>USER</InlineCode>,{" "}
        <InlineCode>STAFF</InlineCode> {section.rolesAnd}{" "}
        <InlineCode>ADMIN</InlineCode>. {section.rolesSuffix}
      </Paragraph>
      <SimpleTable
        headers={[
          section.tableHeaders.canDo,
          "USER",
          "STAFF",
          "ADMIN",
        ]}
        rows={[
          [section.table.view, yes, yes, yes],
          [section.table.chat, yes, yes, yes],
          [section.table.terminal, yes, yes, yes],
          [section.table.devices, "—", yes, yes],
          [section.table.jobs, "—", yes, yes],
          [section.table.alerts, "—", yes, yes],
          [section.table.data, "—", yes, yes],
          [section.table.approve, "—", yes, yes],
          [section.table.admin, "—", "—", yes],
        ]}
      />
      <Paragraph>
        {section.menuPrefix} <InlineCode>{t.nav.data}</InlineCode>,{" "}
        <InlineCode>{t.nav.users}</InlineCode> {section.menuMiddle}{" "}
        <InlineCode>{t.nav.configuration}</InlineCode> {section.menuSuffix}
      </Paragraph>
    </div>
  );
}
