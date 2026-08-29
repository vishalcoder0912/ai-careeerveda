import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {pathToFileURL} from "node:url";

const GLOB_SHIM = "const __viteGlobShim = () => ({});\n";

const transform = (source) => {
  let output = source;

  if (output.includes("import.meta.glob")) {
    output = GLOB_SHIM + output.replaceAll("import.meta.glob", "__viteGlobShim");
  }

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
