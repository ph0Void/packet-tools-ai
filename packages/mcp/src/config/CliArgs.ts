function readFlagValue(args: string[], index: number, flag: string): string | undefined {
  const arg = args[index];
  if (arg === flag) {
    const next = args[index + 1];
    return next !== undefined && !next.startsWith("--") ? next : undefined;
  }
  if (arg.startsWith(`${flag}=`)) {
    return arg.slice(flag.length + 1);
  }
  return undefined;
}


const args = process.argv.slice(2);

for (let index = 0; index < args.length; index++) {
  const transport = readFlagValue(args, index, "--transport");
  if (transport !== undefined) {
    process.env.MCP_TRANSPORT = transport;
    continue;
  }

  const httpPort = readFlagValue(args, index, "--http-port");
  if (httpPort !== undefined) {
    process.env.MCP_HTTP_PORT = httpPort;
  }
}

export {};
