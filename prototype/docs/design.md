# Design tokens and conventions (all views share these)

Subject: a Dutch professional network of consultants/coaches; tone of a well-run practitioners' circle.
Treatment: utilitarian-polished. No hero. Member view feels like a calm conversation; organiser view is
an information-design dashboard. Layout: one centred column (max 44rem) for member/network views;
organiser view max 72rem with summary row → charts → lists.

Fonts (Google Fonts, with real fallbacks):
  --font-display: "IBM Plex Serif", Georgia, serif   (headings only)
  --font-body:    "IBM Plex Sans", system-ui, sans-serif
  --font-mono:    "IBM Plex Mono", ui-monospace, monospace   (numbers in tables, result codes)

Color tokens (defined ONLY in index.html; other files reference them):
  --bg, --surface, --surface-2, --fg, --fg-2, --muted, --line,
  --accent (deep petrol teal), --accent-fg (text on accent), --accent-soft (tinted background),
  --warm (ochre highlight, used sparingly), --good, --warn, --bad,
  --radius: 6px; --radius-lg: 12px
Light: bg #F7F8F7, surface #FFFFFF, surface-2 #EEF1F0, fg #19211F, fg-2 #46514E, muted #778481, line #D5DBD9,
       accent #0F6E72, accent-fg #FFFFFF, accent-soft #DDEFEF, warm #B5731C, good #2E7D4F, warn #B26A00, bad #B23A3A
Dark:  bg #121716, surface #1B2321, surface-2 #232D2B, fg #EAF0EE, fg-2 #B6C2BF, muted #7F8D8A, line #324240,
       accent #5FC2C4, accent-fg #0B1F20, accent-soft #16393A, warm #E0A24A, good #6CC48E, warn #E5A33B, bad #E07070

Chart palettes (organiser view; validated with the dataviz skill's validator before shipping):
  Practice ladder (sequential, 5 steps, one teal hue light→dark): light mode
    L0 #7DBCBD, L1 #56A4A6, L2 #378A8D, L3 #1C6A6D, L4 #0E4A4D   (dark mode: #2A5E5F #3A7F81 #4FA3A5 #7CC8CA #B4E4E5)  [validated]
  Stance (categorical, fixed order enthusiast, pragmatic, cautious, sceptical, worried):
    #0F6E72 #5B7FB5 #B5731C #8A5BA0 #B23A3A    (dark: #5FC2C4 #93AEDD #E0A24A #C49BD6 #E07070)
  Divergence kinds: aligned = --muted outline, confident-starter = --warm, cautious-practitioner = --accent
  Text in charts always uses --fg / --fg-2 / --muted, never the series colour.

Shared UI helpers that index.html exposes as App.ui:
  App.ui.el(tag, attrs, children)  — tiny DOM builder; attrs.class, attrs.on = {click: fn}, text via string children
  App.ui.toast(msg)                — bottom toast, 3 s
  App.ui.copy(text, btn)           — clipboard with fallback select; flips button label to "Copied"
  App.navigate(hash)               — routes between views; App.currentView
Buttons: .btn (secondary), .btn.primary, .btn.quiet; inputs: .input, .textarea; cards: .card (only where an
element must be set apart); pills: .pill with .pill.good/.warn/.bad/.accent; small caps labels: .eyebrow.
Focus ring visible on every control. prefers-reduced-motion respected. Phone width works (400px).
