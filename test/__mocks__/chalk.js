// Mock chalk to return plain strings without colors
const chalk = {
  blue: (str) => str,
  cyan: (str) => str,
  green: (str) => str,
  red: (str) => str,
  yellow: (str) => str,
  gray: (str) => str,
  grey: (str) => str,
  white: (str) => str,
  black: (str) => str,
  magenta: (str) => str,
  bold: (str) => str,
  italic: (str) => str,
  underline: (str) => str,
  strikethrough: (str) => str
};

// Add color support by making each function chainable
Object.keys(chalk).forEach(color => {
  Object.keys(chalk).forEach(style => {
    chalk[color][style] = (str) => str;
  });
});

module.exports = chalk;