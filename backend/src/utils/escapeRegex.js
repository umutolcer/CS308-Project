// Escapes characters that have a special meaning in regular expressions,
// so user input such as "c++" or "(64GB)" is searched as plain text
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
