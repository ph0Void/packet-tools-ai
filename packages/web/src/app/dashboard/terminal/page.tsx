import { redirect } from "next/navigation";

import { getSessionUser } from "@/action/SecureAction";
import { TerminalWorkspace } from "@/component/terminal/TerminalWorkspace";

export const metadata = {
  title: "Packet Tools - Terminal",
  description:
    " Acceso a la terminal de red para ejecutar comandos y scripts en dispositivos conectados",
};

export default async function PageTerminal() {
  const user = await getSessionUser();
  if (!user) redirect("/auth");

  return <TerminalWorkspace role={user.role} />;
}
