"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = loader;
exports.makeLogger = makeLogger;
exports.pathAndFilename = pathAndFilename;
exports.filterNonCamelCaseNames = filterNonCamelCaseNames;
exports.filterKeywords = filterKeywords;
exports.makeCssModuleType = makeCssModuleType;
exports.finalDestDir = finalDestDir;
exports.saveFileIfChanged = saveFileIfChanged;

var _cssLoader = _interopRequireDefault(require("css-loader"));

var _loaderUtils = require("loader-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var path = require("path");

var fs = require("fs-extra");

function loader() {
  var _this2 = this;

  if (this.cacheable) this.cacheable();
  var query = (0, _loaderUtils.getOptions)(this);
  query = Object.assign({}, query, {
    modules: true
  });
  var queryDestDir = query.destDir;
  delete query.destDir;
  var log = makeLogger(query.silent); // Our goal:
  // Call our code before css-loader is executed.
  // Step 1. Create normal callback.

  var callback = this.async(); // Step 2. Create our callback and execute them before css-loader

  var async = function async() {
    return function (err, content) {
      if (err) {
        return callback(err);
      } // Extract locals


      var localsRegex = /exports\.locals = {([\s\S]*)};/;
      var matchLocals = localsRegex.exec(content);
      var localsContent = "";

      if (matchLocals) {
        localsContent = matchLocals[1];
      } else {
        // If exports.locals isn't found, callback and return.
        return callback(null, content);
      } // Extract class names


      var keyRegex = /"([^\\"]+)":/g;
      var classNames = [];
      var match;

      while (match = keyRegex.exec(localsContent)) {
        if (classNames.indexOf(match[1]) < 0) {
          classNames.push(match[1]);
        }
      } // Remove invalid class names


      classNames = filterNonCamelCaseNames(classNames);

      var _filterKeywords = filterKeywords(classNames),
          validNames = _filterKeywords.validNames,
          keywordNames = _filterKeywords.keywordNames;

      if (keywordNames.length > 0) {
        log(`${path.basename(filepath)} has classNames that are ReasonML keywords:`);
        log(`${keywordNames.map(function (keyword) {
          return `  - ${keyword}`;
        }).join("\n")}`);
        log(`They are removed from the module definition.`);
      } // Create ReasonML type


      var reasonType = makeCssModuleType(validNames); // Save the type

      var filepath = _this2.resourcePath;

      var _pathAndFilename = pathAndFilename(filepath),
          currentDir = _pathAndFilename.currentDir,
          destFilename = _pathAndFilename.destFilename;

      var destDir = finalDestDir(queryDestDir, currentDir);
      saveFileIfChanged(destDir, destFilename, reasonType); // Step 3. Call callback

      return callback(null, content);
    };
  };

  for (var _len = arguments.length, input = new Array(_len), _key = 0; _key < _len; _key++) {
    input[_key] = arguments[_key];
  }

  callCssLoader(this, input, query, async);
}

function callCssLoader(_this, input, query, async) {
  var context = Object.assign({}, _this, {
    query,
    async
  });

  _cssLoader.default.call.apply(_cssLoader.default, [context].concat(_toConsumableArray(input)));
}

function makeLogger(silent) {
  return function (slient) {
    if (silent) {
      return function () {};
    }

    return function () {
      var _console;

      return (_console = console)["warn"].apply(_console, arguments);
    };
  };
}

function pathAndFilename(filepath) {
  var _path$parse = path.parse(filepath),
      dir = _path$parse.dir,
      name = _path$parse.name;

  name = name.replace(/\.module$/, "");
  return {
    currentDir: dir,
    destFilename: `${name}Styles.re`
  };
}

function filterNonCamelCaseNames(classNames) {
  return classNames.filter(function (className) {
    return /^[A-Za-z0-9]+$/i.test(className);
  });
}

var keywords = ["and", "as", "assert", "begin", "class", "constraint", "do", "done", "downto", "else", "end", "exception", "external", "false", "for", "fun", "function", "functor", "if", "in", "include", "inherit", "initializer", "lazy", "let", "method", "module", "mutable", "new", "nonrec", "object", "of", "open", "or", "private", "rec", "sig", "struct", "switch", "then", "to", "true", "try", "type", "val", "virtual", "when", "while", "with"];

function filterKeywords(classNames) {
  var validNames = [];
  var keywordNames = [];
  classNames.forEach(function (className) {
    if (keywords.includes(className)) {
      keywordNames.push(className);
    } else {
      validNames.push(className);
    }
  });
  return {
    validNames,
    keywordNames
  };
}

function makeCssModuleType(validNames) {
  return `
type definition = Js.t({.
${validNames.map(function (name) {
    return `    ${name}: string,`;
  }).join("\n")}
})
    `.trim();
}

function finalDestDir(queryDestDir, currentDir) {
  if (queryDestDir == "current") {
    return currentDir;
  } else if (queryDestDir) {
    return queryDestDir;
  } else {
    return "./src/styles";
  }
}

function saveFileIfChanged(destDir, filename, reasonType) {
  fs.ensureDirSync(destDir);
  var filePath = path.join(destDir, filename);

  if (fs.existsSync(filePath)) {
    var currentContent = fs.readFileSync(filePath).toString();

    if (currentContent !== reasonType) {
      fs.writeFileSync(filePath, reasonType);
    }
  } else {
    fs.writeFileSync(filePath, reasonType);
  }
}