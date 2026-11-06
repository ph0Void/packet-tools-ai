import { useT } from "@/hooks/useT";
import {
  InlineCode,
  Paragraph,
  SimpleTable,
  SubTitle,
} from "./primitives";

export default function Agente() {
  const t = useT();
  const section = t.manual.agente;
  const { planning } = section;

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.manual.sections.agente.title}</strong>{" "}
        {section.intro}
      </Paragraph>

      <SubTitle>{section.howItWorksTitle}</SubTitle>
      <Paragraph>{section.howItWorks}</Paragraph>

      <SubTitle>{section.planningTitle}</SubTitle>
      <Paragraph>
        {planning.prefix} <strong>{planning.planningMode}</strong>
        {planning.middle} <strong>{planning.humanApproval}</strong>
        {planning.middle2} <strong>{planning.confirm}</strong> {planning.or}{" "}
        <strong>{planning.cancel}</strong>
        {planning.suffix} <strong>{planning.autonomous}</strong>{" "}
        {planning.suffix2}
      </Paragraph>

      <SubTitle>{section.helpersTitle}</SubTitle>
      <SimpleTable
        headers={[
          section.helpersHeaders.helper,
          section.helpersHeaders.canDo,
          section.helpersHeaders.tools,
        ]}
        rows={[
          [
            <InlineCode key="pt">packet_tracer_specialist</InlineCode>,
            section.helpers.packetTracer,
            "44",
          ],
          [
            <InlineCode key="gns3">gns3_specialist</InlineCode>,
            section.helpers.gns3,
            "44",
          ],
          [
            <InlineCode key="ssh">ssh_specialist</InlineCode>,
            section.helpers.ssh,
            "10",
          ],
          [
            <InlineCode key="telnet">telnet_specialist</InlineCode>,
            section.helpers.telnet,
            "10",
          ],
          [
            <InlineCode key="serial">serial_specialist</InlineCode>,
            section.helpers.serial,
            "10",
          ],
          [
            <InlineCode key="know">knowledge_specialist</InlineCode>,
            section.helpers.knowledge,
            "4",
          ],
          [
            <InlineCode key="admin">system_admin_specialist</InlineCode>,
            section.helpers.admin,
            section.helpers.adminTools,
          ],
          [
            <InlineCode key="gen">general-purpose</InlineCode>,
            section.helpers.general,
            section.helpers.generalTools,
          ],
        ]}
      />
      <Paragraph>{section.footnote}</Paragraph>
    </div>
  );
}
