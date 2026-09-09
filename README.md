# Benjamin Fong

Personal portfolio at https://benfong10.github.io/.

Static HTML, CSS and JavaScript, published from `main` by GitHub Pages. No build
step, framework, runtime package or animation library is required.

- `index.html`: factual content, semantic sections, contact links and metadata.
- `styles.css`: typography, layout, responsive breakpoints and motion fallbacks.
- `script.js`: navigation, progressive reveals, clock, clipboard and signal field.
- `og-image.svg`: editable source for the 1200 × 630 social image.
- `og-image.png`: rendered social image used by Open Graph and Twitter cards.

## Motion

One animation scheduler owns the canvas and scroll updates. Geometry is reused
between threads and particles, and canvas colours are batched. Device pixel ratio
is capped at 1.6 on desktop and 1.35 on mobile. Fewer samples are used on mobile.

Continuous animation runs only while the hero or Connect is active and visible.
Reading sections redraw only after scroll or layout changes. Animation stops when
the page is hidden, the menu is open, or the system
requests reduced motion. Reduced motion keeps a static field. The title sequence
appears only on the first visit in a tab session, never blocks interaction, and is
skipped for deep links and reduced motion.

Motion follows the system preference automatically; there is no separate toggle.
Section shortcuts land immediately at the top with space for the fixed navigation,
including repeated clicks. Hash URLs and browser history are preserved. Normal
scrolling remains native.

The site remains readable and navigable without JavaScript. A CSS field remains
when Canvas is unavailable. Font downloads use a system-font fallback.

## Local review

Serve this directory with any static HTTP server. Check the hero, section anchors,
mobile menu (Tab, Shift+Tab and Escape), email copy and the three contact links.
Test at 1920, 1440, 1366, 768, 390 and 320 px, plus reduced motion and disabled
JavaScript. Confirm no horizontal overflow and that all career facts are intact.

Append `?qa=1` locally to expose render counters on the canvas element's `data-*`
attributes. These diagnostics make no network requests and do not run on ordinary
visits. `data-draw-ms` measures canvas draw work; `data-frame-ms` reflects the host
browser's frame pacing and is not a cross-device performance guarantee.

Keep the existing public contact details and career history accurate. Do not add
client logos, achievements, metrics, testimonials or market data without verified
content from Benjamin.
