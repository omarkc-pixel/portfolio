# omaryounis.com

Portfolio site for Omar Younis, product designer. Hosted on Netlify.

## Structure

- `index.html` — home page and project index
- `about.html` — about page
- `fivetran.html`, `hightouch.html`, `mcp.html`, `data-pipelines.html`, `exabeam.html`, `pebble.html` — case studies, served at `/fivetran`, `/hightouch`, etc.
- `images/` — case study images and video
- `support.js` — page runtime used by every page (generated; don't edit by hand)
- `resume-omar-younis.pdf`
- `netlify.toml` — publish settings, the `/work` redirect, and security headers

## Deploying

No build step. Once this repo is linked in Netlify with `main` as the production branch, every push to `main` publishes to omaryounis.com, and other branches get preview deploys.
