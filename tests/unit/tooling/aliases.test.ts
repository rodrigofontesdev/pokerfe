import { describe, expect, it } from "vitest";
import { aliases } from "../../../aliases.ts";
import tsconfig from "../../../tsconfig.json";

const expected = ["@domain", "@shared", "@room", "@worker", "@client"];
const paths: Record<string, string[]> = tsconfig.compilerOptions.paths;
const srcFiles = Object.keys(
  import.meta.glob("../../../src/*/{*,.gitkeep}", { query: "?url" }),
);

describe("aliases de importação", () => {
  it("declara os cinco aliases em aliases.ts e no tsconfig.json", () => {
    expect(Object.keys(aliases).sort()).toEqual([...expected].sort());
    expect(Object.keys(paths).sort()).toEqual(
      expected.map((name) => `${name}/*`).sort(),
    );
  });

  it.each(expected)("%s aponta para a pasta de mesmo nome em src/", (name) => {
    const folder = name.slice(1);
    expect(aliases[name]).toMatch(new RegExp(`/src/${folder}$`));
    expect(paths[`${name}/*`]).toEqual([`./src/${folder}/*`]);
    expect(srcFiles.some((file) => file.includes(`/src/${folder}/`))).toBe(
      true,
    );
  });
});
