import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // GitHub Pages hosts project sites beneath /<repository>/.
  // Keep localhost rooted at / so the existing development loop is unchanged.
  base: command === "build" ? "/test-subject-01/" : "/",
}));
