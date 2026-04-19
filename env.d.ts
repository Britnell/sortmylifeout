/// <reference types="astro/client" />

// Extend the Cloudflare Env interface to include your bindings
declare namespace Cloudflare {
  interface Env {
    sortinglifedb: D1Database;
  }
}
