import {
  BookOpen,
  Bot,
  BrainCircuit,
  Clock,
  Database,
  LayoutDashboard,
  Logs,
  MessageCircleWarning,
  MessageSquare,
  Rocket,
  Router,
  Sparkles,
  Terminal,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Dictionary } from "@/i18n";
import PrimerosPasos from "./PrimerosPasos";
import Inicio from "./Inicio";
import Modelos from "./Modelos";
import Conexiones from "./Conexiones";
import Usuarios from "./Usuarios";
import TerminalSeccion from "./TerminalSeccion";
import Alertas from "./Alertas";
import Tareas from "./Tareas";
import LogsSeccion from "./LogsSeccion";
import DatosRag from "./DatosRag";
import Chat from "./Chat";
import Agente from "./Agente";
import SkillsSeccion from "./SkillsSeccion";
import Anexos from "./Anexos";

export interface ManualSectionMeta {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  Component: ComponentType;
}

export function getManualSections(t: Dictionary): ManualSectionMeta[] {
  const { sections } = t.manual;
  return [
    {
      id: "primeros-pasos",
      title: sections.primerosPasos.title,
      description: sections.primerosPasos.description,
      keywords: sections.primerosPasos.keywords,
      icon: Rocket,
      Component: PrimerosPasos,
    },
    {
      id: "inicio",
      title: sections.inicio.title,
      description: sections.inicio.description,
      keywords: sections.inicio.keywords,
      icon: LayoutDashboard,
      Component: Inicio,
    },
    {
      id: "alertas",
      title: sections.alertas.title,
      description: sections.alertas.description,
      keywords: sections.alertas.keywords,
      icon: MessageCircleWarning,
      Component: Alertas,
    },
    {
      id: "chat",
      title: sections.chat.title,
      description: sections.chat.description,
      keywords: sections.chat.keywords,
      icon: MessageSquare,
      Component: Chat,
    },
    {
      id: "agente",
      title: sections.agente.title,
      description: sections.agente.description,
      keywords: sections.agente.keywords,
      icon: Bot,
      Component: Agente,
    },
    {
      id: "conexiones",
      title: sections.conexiones.title,
      description: sections.conexiones.description,
      keywords: sections.conexiones.keywords,
      icon: Router,
      Component: Conexiones,
    },
    {
      id: "terminal",
      title: sections.terminal.title,
      description: sections.terminal.description,
      keywords: sections.terminal.keywords,
      icon: Terminal,
      Component: TerminalSeccion,
    },
    {
      id: "automatizaciones",
      title: sections.automatizaciones.title,
      description: sections.automatizaciones.description,
      keywords: sections.automatizaciones.keywords,
      icon: Clock,
      Component: Tareas,
    },
    {
      id: "skills",
      title: sections.skills.title,
      description: sections.skills.description,
      keywords: sections.skills.keywords,
      icon: Sparkles,
      Component: SkillsSeccion,
    },
    {
      id: "logs",
      title: sections.logs.title,
      description: sections.logs.description,
      keywords: sections.logs.keywords,
      icon: Logs,
      Component: LogsSeccion,
    },
    {
      id: "datos",
      title: sections.datos.title,
      description: sections.datos.description,
      keywords: sections.datos.keywords,
      icon: Database,
      Component: DatosRag,
    },
    {
      id: "usuarios",
      title: sections.usuarios.title,
      description: sections.usuarios.description,
      keywords: sections.usuarios.keywords,
      icon: Users,
      Component: Usuarios,
    },
    {
      id: "configuracion",
      title: sections.configuracion.title,
      description: sections.configuracion.description,
      keywords: sections.configuracion.keywords,
      icon: BrainCircuit,
      Component: Modelos,
    },
    {
      id: "anexos",
      title: sections.anexos.title,
      description: sections.anexos.description,
      keywords: sections.anexos.keywords,
      icon: BookOpen,
      Component: Anexos,
    },
  ];
}
