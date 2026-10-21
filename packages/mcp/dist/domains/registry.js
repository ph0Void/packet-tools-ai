"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDomains = registerDomains;
const ToolRegistry_1 = require("../core/ToolRegistry.js");
const packetTracer_1 = require("./packetTracer/index.js");
const gns3_1 = require("./gns3/index.js");
const serial_1 = require("./serial/index.js");
const telnet_1 = require("./telnet/index.js");
const ssh_1 = require("./ssh/index.js");
const plan_1 = require("./plan/index.js");
const skills_1 = require("./skills/index.js");
const MODULES = [
    packetTracer_1.packetTracerModule,
    gns3_1.gns3Module,
    serial_1.serialModule,
    telnet_1.telnetModule,
    ssh_1.sshModule,
    plan_1.planModule,
    skills_1.skillsModule,
];
let alreadyRegistered = false;
function registerDomains() {
    if (alreadyRegistered)
        return;
    for (const module of MODULES) {
        ToolRegistry_1.toolRegistry.register(module);
    }
    alreadyRegistered = true;
}
//# sourceMappingURL=registry.js.map