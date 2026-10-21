const fs = require("node:fs");
const path = require("node:path");

function globSync(pattern, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const matches = fs.globSync(pattern, { cwd });
  if (!options.onlyDirectories) return matches;

  return matches.filter((match) => {
    const full = path.resolve(cwd, match);
    try {
      return fs.statSync(full).isDirectory();
    } catch {
      return false;
    }
  });
}

module.exports = globSync;
module.exports.globSync = globSync;
module.exports.sync = globSync;
