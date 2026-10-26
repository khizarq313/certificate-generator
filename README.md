# CertifyX — Certificate Studio

Responsive local-first certificate generator for SIES College of Management Studies (SIESCOMS). The supplied Stitch screens and certificate references inform the studio layout, certificate styling, and responsive behavior.

## Setup

Install Node.js 20+ and npm, then run:

```sh
npm install
npm run dev
```

Scripts: `npm run dev`, `npm run build`, and `npm run preview`.

## Features

- Dashboard stats from local certificate history, with an accurate empty state.
- Four-step certificate flow: details, template selection, preview, and export.
- Eight A4 landscape certificate compositions, with locally bundled typefaces.
- Required-field validation, suggested wording, local reference ID generation, optional second signer, and signature upload resized to 800 px.
- Fixed-size export stage for image-based PDF output and a print stylesheet that keeps text selectable.
- Local history with search, reopen, duplicate, download again, and delete.
- Draft and history data saved in browser localStorage; history is capped at 20 entries.

## Templates

The eight built-in compositions are White & Gold Appreciation, Blue Geometric Achievement, Black Gold Formal, Simple Gold Completion, Cream Aesthetic Completion, White Gold Ornate, Gold Black Ornate, and Beige Gold Participation. They are based on the eight certificate references supplied with the request. All use the shared certificate data model and the same fixed-size landscape A4 canvas.

To add a design, add one metadata entry to the `templates` array in `src/App.tsx`, add its certificate and mini-preview styles to `src/style.css`, and choose the desired bundled certificate font. Keep the logo position fixed and preserve the safe inset around the artboard.

## Official SIESCOMS identity

The official SIESCOMS logo is bundled at `public/assets/siescoms-logo.jpg`. It was downloaded from the [official SIESCOMS website](https://siescoms.edu.in/images/logo.jpg). The certificates use the verified institutional name, establishment year (1995), and Nerul, Navi Mumbai location. The [official About Us page](https://siescoms.edu.in/about_us) verifies the establishment year and campus context; the [official Contact Us page](https://siescoms.edu.in/contact-us) provides the full address: Sri Chandrasekarendra Saraswati Vidyapuram, Plot I-E, Sector V, Nerul, Navi Mumbai - 400706.

## PDF and print

Download PDF captures the certificate on an unscaled 1123 × 794 px export stage and places it on a full-bleed A4 landscape PDF. Browser Print uses a dedicated print view with selectable text. Some browsers require “Background graphics” in the print dialog.

The app has no backend. Drafts and history stay in this browser profile only; they are local drafts, not official institutional records. A generated certificate ID is a local reference, not an official record number.

## Design deviations and limitations

- The supplied Stitch references include an institutional sign-in view. This app starts at the studio dashboard because the product brief excludes backend authentication and secrets.
- The certificate designs share one rendering component and stylesheet instead of using separate template folders. Adding a template currently requires metadata and CSS edits.
- Official logo and identity details are present, but the app does not claim that certificates are authenticated or institutionally issued.
- Automated unit and end-to-end test suites are not configured. TypeScript compilation, production build, manual browser workflow checks, responsive overflow checks, PDF export, print layout, and npm audit were run during implementation.
- Browser print behavior varies; check final output on the target browsers and printers.
