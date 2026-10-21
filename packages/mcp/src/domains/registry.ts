import { toolRegistry } from "@/core/ToolRegistry";
import type { DomainModule } from "@/core/ToolRegistry";

import { packetTracerModule } from "@/domains/packetTracer";
import { gns3Module } from "@/domains/gns3";
import { serialModule } from "@/domains/serial";
import { telnetModule } from "@/domains/telnet";
import { sshModule } from "@/domains/ssh";
import { planModule } from "@/domains/plan";
import { skillsModule } from "@/domains/skills";


const MODULES: DomainModule[] = [
  packetTracerModule,
  gns3Module,
  serialModule,
  telnetModule,
  sshModule,
  planModule,
  skillsModule,
];

let alreadyRegistered = false;


export function registerDomains(): void {
  if (alreadyRegistered) return;
  for (const module of MODULES) {
    toolRegistry.register(module);
  }
  alreadyRegistered = true;
}
