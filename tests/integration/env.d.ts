/// <reference types="@cloudflare/vitest-plugin/types" />

declare namespace Cloudflare {
  interface Env {
    ROOM: DurableObjectNamespace<import("../../src/room/Room").Room>;
    ASSETS: Fetcher;
  }
}
