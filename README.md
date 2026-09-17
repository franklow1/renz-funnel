# Renz Style Solve — funnel

The live quiz and sales page for lorenzosegor.com, served as one file.

The page carries three lines, once:

```html
<div id="rz-mount"></div>
<script src="https://franklow1.github.io/renz-funnel/funnel.js" defer></script>
```

Everything else is `funnel.js`. Pushing to `main` updates the live page within about a
minute, with no re-pasting.

`funnel.js` is generated. It is built from the funnel source by `build-loader.py` and is
overwritten on every build, so it is never edited by hand.
