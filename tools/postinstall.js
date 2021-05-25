/* tools/postinstall.js Sun Feb 28 2021 11:46:51 GMT-0500 (Eastern Standard Time) */
/**
 * Klick IVA Boilerplate Components postinstall script
 *
 * This script will copy the distribution version of a component's code
 * into a specified location in the user's project.
 *
 * THIS FILE MUST USE LEGACY JS SO IT CAN BE UGLIFIED.
 * IF YOU USE ES6 FUNCTIONALITY IT WILL BREAK COMPONENT INSTALLATION.
 *
 * Meaning:
 * - no const, let
 * - no `` strings
 * - no fat arrow functions
 * - etc.
 *
 * The build.js file for each component should copy this file to each
 * component's tools/ folder. It should be referenced as a postinstall
 * script in package.json for each component:
 *
 *   ...
 *   "scripts": {
 *     ...
 *     "postinstall": "node tools/postinstall.js $INIT_CWD",
 *     ...
 *   },
 *   ...
 *
 */

var fs = require("fs");
var path = require("path");

var title = "Briefcase";
var path_root;
var path_default_install;

// This is the package.json file contents for the component being installed.
var component_pjson;

// This is the package.json file contents for the project that referenced our
// component package as a devDependency.
var pjson;


/**
 * Find the root path for the project installing this module.
 */
var findRoot = function(folder) {
  if (folder === "$INIT_CWD") {
    // We're being run in a Windows environment, so our installation folder
    // wasn't provided. We'll use a hacky workaround to guess at the root
    // folder. Use the parent of the first node_modules folder.
    //
    // YES, THIS IS VERY HACKY and will probably come back to bite us at some
    // point in the future.
    folder = process.cwd();
    folder = folder.replace(/(\/|\\)node_modules(\/|\\).*$/, "");
  }
  if (!folder) {
    return false;
  }
  folder = folder.replace(/\/$/, "");
  if (fs.existsSync(path.join(folder, "package.json"))) {
    return folder;
  }

  var items = folder.split(path.sep);
  items.pop();
  if (items.length === 0) {
    return false;
  }
  else {
    return findRoot(items.join(path.sep));
  }
};


/**
 * We haven't configured package.json if/where to copy component dist files.
 * Ask the user, and save the result in the host project's package.json file.
 *
 * @param string path_root
 *   Path to the project that is installing the npm module
 * @param string component_name
 *   The npm module's 'name' key from its package.json file
 * @param string path_default_install
 *   The default path where we should copy a component's dist/ files
 */
var promptUser = function(path_root, component_name, path_default_install) {
  lines = [
    "",
    "=====================================================================",
    component_name + ": " + title,
    "=====================================================================",
    "The files for this component can be copied to your project any time",
    "you run 'npm install' or 'npm update'. This choice will be remembered",
    "in your project 'package.json' file in a \"klick-components\" key.",
    "",
    "You can define which folder the distribution files are copied into."
  ];
  console.log(lines.join("\n"));

  var readline = require("readline");
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  var target_folder = "";

  var question1 = {
    prompt: "\nShould these files get copied into your project? (Y/n) ", 
    default: "y"
  };
  rl.question(question1.prompt, function(answer_copy) {
    answer_copy = answer_copy.toLowerCase().trim();
    if (answer_copy === "" || answer_copy === question1.default || answer_copy === "yes") {
      console.log("Yes");
      var default_path = path_default_install;
      var question2 = {
        prompt: "\nSpecify where they should be copied, relative to your package.json file.\n(default = '" + default_path + "'): "
      };
      rl.question(question2.prompt, function(answer_path) {
        target_folder = answer_path.trim().replace(/(\/|\\)$/, "").replace(/^(\/|\\)/, "");
        if (target_folder === "") {
          target_folder = default_path;
        }
        rl.close();
        writeConfig(path_root, component_name, target_folder);
      });
    }
    else {
      rl.close();
      writeConfig(path_root, component_name, target_folder);
    }
  });
};

/**
 * Update the package.json file for the project installing the npm package.
 * Record whether we should copy the component's dist/ files into the project
 * next time we install or update.
 *
 * @param string path_root = path to the host project package.json file
 * @param string component_name = name of the npm package being installed
 * @param string target_folder = the folder within our project where the npm
 *   package dist/ files will be copied. If this is an empty string, the dist/
 *   files will NOT be copied automatically on the next npm install or
 *   npm update.
 */
var writeConfig = function(path_root, component_name, target_folder) {
  if (!pjson["klick-components"]) {
    pjson["klick-components"] = {};
  }
  pjson["klick-components"][component_name] = target_folder;
  fs.writeFileSync(path.join(path_root, "package.json"), JSON.stringify(pjson, null, 2), "utf8");
  console.log(title + ": Saving copy settings to package.json:", path.join(path_root, "package.json"));

  if (target_folder !== "") {
    copyFiles(target_folder);
  }
};

/**
 * Copy all files from our component dist/ folder into the given path.
 *
 * @param string path_target = the relative path to copy files into
 *   - this is relative to the host project's package.json file folder
 */
var copyFiles = function(path_target) {
  // Find all files in my dist folder and copy them:
  //   - NOT recursive
  //   - Overwrite existing files

  // Ensure the target folder (and subfolders) exist.
  mkDirByPathSync(path.join(path_root, path_target));

  var path_dist = path.join(__dirname, "..", "dist");
  console.log(title + ": Copying " + path_dist + " to " + path_target);

  fs.readdir(path_dist, function(err, files) {
    if (err) {
      return console.log("Unable to read files in folder:", path_dist);
    }
    files.forEach(function(file) {
      try {
        //console.log("- copying", path.join(path_dist, file), "to", path.join(path_root, path_target, file));
        fs.copyFileSync(path.join(path_dist, file), path.join(path_root, path_target, file));
      }
      catch(err) {
        console.error("Error copying file:", err);
      }
    });
  });
};


/**
 * https://stackoverflow.com/questions/31645738/how-to-create-full-path-with-nodes-fs-mkdirsync
 *
 * Default, make directories relative to current working directory.
 *   mkDirByPathSync('path/to/dir');
 *
 * Make directories relative to the current script.
 *   mkDirByPathSync('path/to/dir', {isRelativeToScript: true});
 *
 * Make directories with an absolute path.
 *   mkDirByPathSync('/path/to/dir');
 */
function mkDirByPathSync(targetDir) {
  var isRelativeToScript = true;
  var sep = path.sep;
  var initDir = path.isAbsolute(targetDir) ? sep : "";
  var baseDir = isRelativeToScript ? __dirname : ".";

  return targetDir.split(sep).reduce(function(parentDir, childDir) {
    var curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
    } catch (err) {
      if (err.code === "EEXIST") {
        // curDir already exists!
        return curDir;
      }

      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === "ENOENT") {
        // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error("EACCES: permission denied, mkdir '" + parentDir + "'");
      }

      var caughtErr = ["EACCES", "EPERM", "EISDIR"].indexOf(err.code) > -1;
      if (!caughtErr || (caughtErr && curDir === path.resolve(targetDir))) {
        throw err; // Throw if it's just the last created dir.
      }
    }

    return curDir;
  }, initDir);
}

var main = function() {
  // path_src is the path where our component is currently getting installed.
  // e.g.: /path/project/node_modules/@klickinc/amp-iva-boilerplate-component-modal
  var path_src = process.cwd();

  // Load the contents of the component's package.json file, so we can get
  // the package name as a key.
  component_pjson = require(path.join(path_src, "package.json"));

  // Component name is the unique name for this npm package.
  // e.g.: @klickinc/amp-iva-boilerplate-component-modal
  var component_name = component_pjson.name;

  // process.argv[2] is the path from which we did 'npm install' or 'npm update'.
  // We use this to determine path_root -- the folder with our project's
  // package.json file. (This is NOT package.json for the component we're
  // installing.)
  //
  // NOTE: This is currently provided in the postinstall argument as $INIT_CWD
  // but *this doesn't work in Windows*. For Windows, we have a hacky
  // workaround within findRoot().
  path_root = findRoot(process.argv[2]);
  if (!path_root) {
    console.warn(title + ": Couldn't determine path to package.json. Not copying component source files to your project.");
    process.exit(0);
  }

  // process.argv[3] is the default path to copy dist/ files to upon npm install.
  // If not provided, use "src/shared/boilerplate".
  if (process.argv[3] && process.argv[3] !== "") {
    path_default_install = process.argv[3];
  }
  else {
    path_default_install = "src/shared/boilerplate";
  }

  pjson = require(path.join(path_root, "package.json"));
  if (pjson["klick-components"] && Object.keys(pjson["klick-components"]).includes(component_name)) {
    if (pjson["klick-components"][component_name] && pjson["klick-components"][component_name] !== "") {
      copyFiles(pjson["klick-components"][component_name]);
    }
  }
  else {
    promptUser(path_root, component_name, path_default_install);
  }

};

main();

