import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {pathToFileURL} from "node:url";

// Loads the frontend's static data files into plain Node.
//
// They are written for Vite, which resolves two things Node does not:
//
//   1. `import.meta.glob(...)` — a build-time directory scan. Used by
//      alumniSpotlight.js and partnerLogos.js to pick up images dropped into
//      src/assets. Shimmed to an empty object: the migration wants the hosted
//      ImageKit URLs those modules fall back to, not bundled local assets.
//
//   2. Extensionless relative imports (`from "./partnerLogos"`). Node's ESM
//      resolver requires the extension.
//
// Rather than editing the frontend to suit a backend script — which would be
// the tail wagging the dog — the files are copied to a temp directory and
// transformed there. The originals are never touched.

const GLOB_SHIM = "const __viteGlobShim = () => ({});\n";

const transform = (source) => {
  let output = source;

  if (output.includes("import.meta.glob")) {
    output = GLOB_SHIM + output.replaceAll("import.meta.glob", "__viteGlobShim");
  }

  // Add .js to relative imports and re-exports that lack an extension.
  output = output.replace(
    /(\bfrom\s+["'])(\.[^"']*?)(["'])/g,
    (match, prefix, specifier, suffix) =>
      path.extname(specifier) ? match : `${prefix}${specifier}.js${suffix}`,
  );

  return output;
};

export const loadFrontendData = async (projectRoot) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "careerveda-migrate-"));

  // config/ is copied too because siteData and others reach into it.
  for (const directory of ["data", "config"]) {
    const source = path.join(projectRoot, "src", directory);
    const destination = path.join(workspace, directory);
    fs.mkdirSync(destination, {recursive: true});

    for (const file of fs.readdirSync(source)) {
      if (!file.endsWith(".js")) continue;
      fs.writeFileSync(
        path.join(destination, file),
        transform(fs.readFileSync(path.join(source, file), "utf8")),
      );
    }
  }

  const load = async (relativePath) => {
    const target = path.join(workspace, relativePath);
    if (!fs.existsSync(target)) return {};
    try {
      return await import(pathToFileURL(target).href);
    } catch (error) {
      // A single unloadable file should not abort the whole migration — the
      // caller reports it and carries on with the sources that did load.
      return {__error: error.message};
    }
  };

  const modules = {
    programCatalog: await load("data/programCatalog.js"),
    mentors: await load("data/mentors.js"),
    alumniSpotlight: await load("data/alumniSpotlight.js"),
    blogPosts: await load("data/blogPosts.js"),
    jobsData: await load("data/jobsData.js"),
    policies: await load("data/policies.js"),
    siteData: await load("data/siteData.js"),
  };

  const cleanup = () => fs.rmSync(workspace, {recursive: true, force: true});

  return {modules, cleanup, workspace};
};
