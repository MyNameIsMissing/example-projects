// This file configures Prettier, which is an opinionated code formatter
// It enforces a consistent style by parsing your code and re-printing it with its own rules

module.exports = {
  // Specify the line length that the printer will wrap on
  // Default: 80
  printWidth: 100,

  // Specify the number of spaces per indentation-level
  // Default: 2
  tabWidth: 2,

  // Indent lines with tabs instead of spaces
  // Default: false
  useTabs: false,

  // Print semicolons at the ends of statements
  // Default: true
  semi: true,

  // Use single quotes instead of double quotes
  // Default: false
  singleQuote: true,

  // Use single quotes in JSX
  // Default: false
  jsxSingleQuote: false,

  // Print trailing commas wherever possible in multi-line comma-separated syntactic structures
  // Default: 'es5'
  // Options: 'none' | 'es5' | 'all'
  trailingComma: 'es5',

  // Print spaces between brackets in object literals
  // Default: true
  bracketSpacing: true,

  // Put the > of a multi-line HTML (HTML, JSX, Vue, Angular) element at the end of the last line
  // instead of being alone on the next line
  // Default: false
  bracketSameLine: false,

  // Include parentheses around a sole arrow function parameter
  // Default: 'always'
  // Options: 'always' | 'avoid'
  arrowParens: 'always',

  // Format only a segment of a file
  // Default: 0
  rangeStart: 0,
  // Default: Infinity
  rangeEnd: Infinity,

  // Specify which parser to use
  // Default: None
  // parser: None,

  // Specify the file name to use to infer which parser to use
  // Default: None
  // filepath: None,

  // Require either '@prettier' or '@format' to be present in the file's first docblock comment
  // in order for it to be formatted
  // Default: false
  requirePragma: false,

  // Insert a special @format marker at the top of files specifying that
  // the file has been formatted with prettier
  // Default: false
  insertPragma: false,

  // By default, Prettier will wrap markdown text as-is since some services use a linebreak-sensitive renderer
  // In some cases you may want to rely on editor/viewer soft wrapping instead
  // Default: 'preserve'
  // Options: 'always' | 'never' | 'preserve'
  proseWrap: 'preserve',

  // Specify the global whitespace sensitivity for HTML files
  // Default: 'css'
  // Options: 'css' | 'strict' | 'ignore'
  htmlWhitespaceSensitivity: 'css',

  // Whether or not to indent the code inside <script> and <style> tags in Vue files
  // Default: false
  vueIndentScriptAndStyle: false,

  // End of line
  // Default: 'lf'
  // Options: 'lf' | 'crlf' | 'cr' | 'auto'
  endOfLine: 'lf',

  // Control whether Prettier formats quoted code embedded in the file
  // Default: 'auto'
  // Options: 'auto' | 'off'
  embeddedLanguageFormatting: 'auto',

  // Enforce single attribute per line in HTML, Vue and JSX
  // Default: false
  singleAttributePerLine: false,
};
