/**
 * Create /dist/ versions of component code.
 */

const pjson = require("./package.json");
const uglify = require("uglify-js");
const build = require("../_util/build")(pjson, undefined);

build.processFiles(
  ["src/boilerplate.briefcase_engine.js"],
  "dist/boilerplate.briefcase_engine.js"
);

build.processFiles(
  ["src/boilerplate.briefcase_widget.js"],
  "dist/boilerplate.briefcase_widget.js"
);


// Ensure we have the most recent npm postinstall script.
// Don't include a version number, because it's independent of this component.
build.processFiles(["../_util/postinstall.js"], "tools/postinstall.js", false);
