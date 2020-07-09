const showdown = require("showdown");
const links = require('../links.json').links;

const converter = new showdown.Converter({ extensions: [linkSwapper] });

function linkSwapper () {
  return [{
    type: 'lang',
    regex: /\[([^\[\]]*)\]([^\(])/g,
    // Need to work on my regexp-fu, capture an extra space in here
    // so be sure to reinject it
    replace: function (match, originalRef, nextChar) {
      const ref = originalRef.toLowerCase();
      let link = links[ref];

      // If there's no attached url but it looks like a url...
      if (!link && /http/.test(ref)) {
        link = ref;
      } else if (!link) {
        throw new Error(`No link defined for ${ref}`);
      }

      return `[${originalRef}](${link})${nextChar}`;
    },
  }];
}

/**
 * Swap out links in a markdown text, similar to link
 * definitions in Github mark down. e.g.:
 * Input text: `This is a [markdown] link.`
 * Input links from links.json: `{ 'markdown': 'https://markdown.org' }`
 * Output text: `<p><This is a <a href="https://markdown.org">markdown</a> link.</p>`
 */
module.exports = function (text) {
  return converter.makeHtml(text);
}
