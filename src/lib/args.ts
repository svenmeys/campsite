/** Extract a --flag value from args */
export function flagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

/** Read all of stdin as text */
export async function readStdin(): Promise<string> {
  return await Bun.readableStreamToText(Bun.stdin.stream());
}
