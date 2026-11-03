const folders = ["domain", "shared", "room", "worker", "client"] as const;

export const aliases = Object.fromEntries(
  folders.map((folder) => [
    `@${folder}`,
    new URL(`./src/${folder}`, import.meta.url).pathname,
  ]),
);
