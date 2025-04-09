# css-url-embed

Embed URLs as base64 data inside your CSS stylesheets

css-url-embed replaces URls that refer to local files with the base64 encoded
contents of the corresponding files. This allows you to generate a CSS file
that can be used by itself, without any separate font or image assets.

## Usage

```javascript
import cssUrlEmbed from 'css-url-embed';

function getMimeType(filePath) {
   // Add your MIME type resolution logic here
   // You could use the mime or mmmagic packaes or just return hardcoded types:
   return 'image/png';
}

cssUrlEmbed.processFile(srcPath, destPath, getMimeType);
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

Remote URLs (e.g. http://...) are not supported. Any remote URLs in the source
CSS will be passed through unmodified.

## License

MIT. See LICENSE.txt for details.

## Acknowledgements

css-url-embed is based on Mihhail Lapushkin's [grunt-css-url-embed](https://github.com/mihhail-lapushkin/grunt-css-url-embed),
which was used to build jasmine-core's CSS for six years. I decoupled it from
Grunt, removed dependencies, and removed a number of features that I wasn't
using.
