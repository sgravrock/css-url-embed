# css-url-embed

Embed URLs as base64 data inside your CSS stylesheets

css-url-embed replaces URls that refer to local files with the base64 encoded
contents of the corresponding files. This allows you to generate a CSS file
that can be used by itself, without any separate font or image assets.

## Usage

```javascript
import cssUrlEmbed from 'css-url-embed';
cssUrlEmbed.processFile(srcPath, destPath);
```

### Excluding URLs manually

If you have local file URLs that shouldn't be processed by css-url-embed, you
can annotate them with a noembed directive:


```css
.exclude-me {
   background-image: url('exclude_me.png'); /* noembed */
}

.exclude-me-more-complex {
   background-image: url('exclude_me.png') /* noembed */ 1x, url('include_me.png') 2x;
}
```

## Stability

This is alpha software. Future releases are likely to include breaking changes.

## Limitations

* Remote URLs (e.g. http://...) are not supported.
* MIME type detection is based on file extensions. Other mechanisms like content
  sniffing are not currently supported.
* css-url-embed is distributed only as an ES module. To use it from a CommonJS
  module, you'll have to use asynchronous `import()` rather than `require()`.

## License

MIT. See LICENSE.txt for details.

## Acknowledgements

css-url-embed is based on Mihhail Lapushkin's [grunt-css-url-embed](https://github.com/mihhail-lapushkin/grunt-css-url-embed).
