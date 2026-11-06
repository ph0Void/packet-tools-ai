import { useT } from "@/hooks/useT";
import { CodeBlock, InlineCode, Paragraph, SimpleTable, SubTitle } from "./primitives";

export default function Anexos() {
  const t = useT();
  const section = t.manual.anexos;

  const cisco = [
    { command: "show ip interface brief", description: section.cisco.interfaces },
    { command: "show running-config", description: section.cisco.running },
    { command: "show ip route", description: section.cisco.routes },
    { command: "show vlan brief", description: section.cisco.vlans },
    {
      command: "copy running-config startup-config",
      description: section.cisco.save,
    },
    { command: "ping 8.8.8.8", description: section.cisco.ping },
  ];

  const mikrotik = [
    { command: "/ip address print", description: section.mikrotik.addresses },
    { command: "/ip route print", description: section.mikrotik.routes },
    { command: "/interface print", description: section.mikrotik.interfaces },
    {
      command: "/system identity set name=Router-1",
      description: section.mikrotik.identity,
    },
    {
      command: "/user set admin password=NuevaClave",
      description: section.mikrotik.password,
    },
    { command: "ping 8.8.8.8", description: section.mikrotik.ping },
  ];

  const huawei = [
    {
      command: "display ip interface brief",
      description: section.huawei.interfaces,
    },
    {
      command: "display current-configuration",
      description: section.huawei.current,
    },
    { command: "display ip routing-table", description: section.huawei.routes },
    { command: "display vlan", description: section.huawei.vlans },
    { command: "save", description: section.huawei.save },
    { command: "ping 8.8.8.8", description: section.huawei.ping },
  ];

  const aruba = [
    { command: "show interfaces brief", description: section.aruba.interfaces },
    { command: "show running-config", description: section.aruba.current },
    { command: "show ip route", description: section.aruba.routes },
    { command: "show vlan", description: section.aruba.vlans },
    { command: "write memory", description: section.aruba.save },
    { command: "ping 8.8.8.8", description: section.aruba.ping },
  ];

  const renderBlock = (
    rows: { command: string; description: string }[],
    copyLabel: string
  ) => (
    <div className="space-y-3">
      <SimpleTable
        headers={[section.tableHeaders.command, section.tableHeaders.purpose]}
        rows={rows.map((item) => [
          <InlineCode key={item.command}>{item.command}</InlineCode>,
          item.description,
        ])}
      />
      <CodeBlock
        code={rows.map((item) => item.command).join("\n")}
        label={copyLabel}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <Paragraph>
        <strong>{t.manual.sections.anexos.title}</strong>
        {": "}
        {section.intro}
      </Paragraph>

      <SubTitle>Cisco (IOS)</SubTitle>
      {renderBlock(cisco, section.copy.cisco)}

      <SubTitle>MikroTik (RouterOS)</SubTitle>
      {renderBlock(mikrotik, section.copy.mikrotik)}

      <SubTitle>Huawei (VRP)</SubTitle>
      {renderBlock(huawei, section.copy.huawei)}

      <SubTitle>Aruba (ArubaOS / CX)</SubTitle>
      {renderBlock(aruba, section.copy.aruba)}
    </div>
  );
}
