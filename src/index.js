import cssLoader from "css-loader";
import { getOptions } from "loader-utils";
const path = require("path");
const fs = require("fs-extra");

export default function loader(...input) {
  if (this.cacheable) this.cacheable();

  let query = getOptions(this);
  query = Object.assign({}, query, {
    modules: true,
  });
  let queryDestDir = query.destDir;
  delete query.destDir;

  const log = makeLogger(query.silent);

  // Our goal:
  // Call our code before css-loader is executed.

  // Step 1. Create normal callback.
  const callback = this.async();

  // Step 2. Create our callback and execute them before css-loader
  let async = () => (err, content) => {
    if (err) {
      return callback(err);
    }

    // Extract locals
    const localsRegex = /exports\.locals = {([\s\S]*)};/;
    const matchLocals = localsRegex.exec(content);

    let localsContent = "";
    if (matchLocals) {
      localsContent = matchLocals[1];
    } else {
      // If exports.locals isn't found, callback and return.
      return callback(null, content);
    }

    // Extract class names
    const keyRegex = /"([^\\"]+)":/g;
    let classNames = [];
    let match;

    while ((match = keyRegex.exec(localsContent))) {
      if (classNames.indexOf(match[1]) < 0) {
        classNames.push(match[1]);
      }
    }

    // Remove invalid class names
    classNames = filterNonCamelCaseNames(classNames);
    let { validNames, keywordNames } = filterKeywords(classNames);
    if (keywordNames.length > 0) {
      log(
        `${path.basename(filepath)} has classNames that are ReasonML keywords:`
      );
      log(`${keywordNames.map((keyword) => `  - ${keyword}`).join("\n")}`);
      log(`They are removed from the module definition.`);
    }

    // Create ReasonML type
    let reasonType = makeCssModuleType(validNames);

    // Save the type
    const filepath = this.resourcePath;
    const { currentDir, destFilename } = pathAndFilename(filepath);

    let destDir = finalDestDir(queryDestDir, currentDir);
    saveFileIfChanged(destDir, destFilename, reasonType);

    // Step 3. Call callback
    return callback(null, content);
  };

  callCssLoader(this, input, query, async);
}

function callCssLoader(_this, input, query, async) {
  let context = Object.assign({}, _this, {
    query,
    async,
  });

  cssLoader.call(context, ...input);
}

export function makeLogger(silent) {
  return (slient) => {
    if (silent) {
      return () => {};
    }
    return (...args) => console["warn"](...args);
  };
}

export function pathAndFilename(filepath) {
  let { dir, name } = path.parse(filepath);
  name = name.replace(/\.module$/, "");
  return {
    currentDir: dir,
    destFilename: `${name}Styles.re`,
  };
}

export function filterNonCamelCaseNames(classNames) {
  return classNames.filter((className) => /^[A-Za-z0-9]+$/i.test(className));
}

let keywords = [
  "and",
  "as",
  "assert",
  "begin",
  "class",
  "constraint",
  "do",
  "done",
  "downto",
  "else",
  "end",
  "exception",
  "external",
  "false",
  "for",
  "fun",
  "function",
  "functor",
  "if",
  "in",
  "include",
  "inherit",
  "initializer",
  "lazy",
  "let",
  "method",
  "module",
  "mutable",
  "new",
  "nonrec",
  "object",
  "of",
  "open",
  "or",
  "private",
  "rec",
  "sig",
  "struct",
  "switch",
  "then",
  "to",
  "true",
  "try",
  "type",
  "val",
  "virtual",
  "when",
  "while",
  "with",
];

export function filterKeywords(classNames) {
  let validNames = [];
  let keywordNames = [];

  classNames.forEach((className) => {
    if (keywords.includes(className)) {
      keywordNames.push(className);
    } else {
      validNames.push(className);
    }
  });

  return {
    validNames,
    keywordNames,
  };
}

export function makeCssModuleType(validNames) {
  return `
type definition = Js.t({.
${validNames.map((name) => `    ${name}: string,`).join("\n")}
})
    `.trim();
}

export function finalDestDir(queryDestDir, currentDir) {
  if (queryDestDir == "current") {
    return currentDir;
  } else if (queryDestDir) {
    return queryDestDir;
  } else {
    return "./src/styles";
  }
}

export function saveFileIfChanged(destDir, filename, reasonType) {
  fs.ensureDirSync(destDir);

  let filePath = path.join(destDir, filename);
  if (fs.existsSync(filePath)) {
    let currentContent = fs.readFileSync(filePath).toString();

    if (currentContent !== reasonType) {
      fs.writeFileSync(filePath, reasonType);
    }
  } else {
    fs.writeFileSync(filePath, reasonType);
  }
}
