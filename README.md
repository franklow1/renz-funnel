# Renz · The Style Solve

The live funnel for lorenzosegor.com. Three pages, three files, served straight
off this repository by GitHub Pages. A push to `main` is a deploy: the live
pages pick it up in about a minute and there is nothing to re-paste.

    funnel.js    the quiz, the sales page and the £99 checkout with its two bumps
    thanks.js    the booking page, "You're In"
    upsell.js    The Buyer, the £199 one click upsell

## What goes in GoHighLevel

One Custom Code element per page, and nothing else on the page. The exact
snippets are in `ghl/`. Do not retype them; copy the file.

| Page    | Snippet                  | Mount               | Paper   |
|---------|--------------------------|---------------------|---------|
| Sales   | `ghl/sales-page.html`    | `rz-mount`          | #EFECE4 |
| Booking | `ghl/booking-page.html`  | `rz-thanks-mount`   | #F4F1EA |
| Upsell  | `ghl/upsell-page.html`   | `rz-upsell-mount`   | #F4F1EA |

The builder's own elements stay where they are. The sales page keeps its one
step order form, the booking page keeps its calendar, the upsell page keeps its
order form and its skip link. The funnel paints around all of them and drives
them; it never replaces them.

The upsell page also needs GoHighLevel's own buy button and skip link given the
custom classes `rz-buy` and `rz-skip`. The page hides them and clicks them from
its own buttons, because a one click charge has to be the builder's element.

## How the code is laid out

    funnel.js            the built file GitHub Pages serves. never edit by hand
    src/funnel/page.css  its stylesheet
    src/funnel/page.html its markup
    src/funnel/loader.js everything else, with a marker where each of those two go

and the same for `thanks` and `upsell`.

    node tools/build.mjs --check    does src/ still rebuild the built files,
                                    byte for byte? this is the check that
                                    matters, and it should always be green
    node tools/build.mjs            src/ -> the three built files
    node tools/extract.mjs          the three built files -> src/
    node tools/preview.mjs          src/ -> preview/, three pages you can open

### The rule

**Edit `src/`, then `node tools/build.mjs`, then commit both.**

If you ever edit a built file directly, run `node tools/extract.mjs` straight
afterwards to pull the change back into `src/`, and check `--check` is green
before you commit. A drift between the two is how the source gets lost.

## Looking at a page

    node tools/preview.mjs

then open `preview/index.html`, or run the `renz` preview server and browse to
it. Each preview is a bare document carrying the real paste snippet pointed at
the built file next door. Nothing is stubbed: the loader finds no builder app,
so it paints straight into the mount and settles, which is the path it already
takes on any page with no checkout on it.

So the preview is honest about the copy, the layout, the quiz, the scroll work
and the whole sales page. It cannot be honest about the order form, the bumps or
the money, because there is no checkout in it. Test those on the live page.

## Why the loader is shaped the way it is

GoHighLevel pages are a server rendered Vue app, and the div the snippet paints
into is part of the markup that app is about to take ownership of. Write into it
before the app has hydrated and the hand over fails. What dies is the order
form: no total, no card field, no way to pay, and **not one line in the console
to say so**. It just quietly stops taking money.

So the funnel paints at once into a sheet of its own laid over the page, which
is what the quiz looks like anyway, and only moves into the page once the
checkout has actually drawn itself. Measured on the live pages: the order node
is present at 20 to 45ms, `__nuxt.__vue_app__` at 870ms to 2.4s, the checkout
alive at 2.3 to 4.2s. The budget is 30s on a page with a checkout, because there
is nothing to lose by waiting while the man can already use the funnel.

Two things follow from that, and both have broken this page before:

- **Moving the funnel re-parents everything in it.** A video player that has
  already wired itself to a node loses that node and refuses to start. Wistia
  says so out loud: "Could not find element in DOM." So nothing that embeds
  anything is built until `window.__rzWhenSettled(fn)` has fired.
- **The first paint is not ours.** The builder draws its own content, and its
  order form, in the second before this file has finished downloading. So the
  paste snippet carries an opaque sheet of paper as inline CSS, which the
  browser honours on the first paint, and the funnel takes it away once there is
  something underneath it. If this file never arrives the sheet stays, which is
  the right failure: a blank page beats somebody's half drawn checkout.

## What is wired to what

    order form    #one-step-order-DE0P7Us6ET   (sales)
                  #one-step-order-U3AtvyuBgg   (upsell)
    calendar      RYS7dx7Mc0qtjARUFxLP
    Wistia        wai638s3ie   sales page film      PLACEHOLDER
                  7ehs06hu2p   booking page film    PLACEHOLDER

The two Wistia ids are placeholders and currently point at real, unrelated
footage. They must be replaced before this takes a real buyer.

## Checking it

    node tools/serve.mjs 8777 &     a server that answers Range, so video seeks
    node tools/preview.mjs
    node audit/all.mjs              everything below, in one go

| What it asks | File |
|---|---|
| does `src/` still rebuild the built files byte for byte | `tools/build.mjs --check` |
| is every id the code reaches for actually in the markup | `audit/ids.mjs` |
| does any rule reach two different kinds of element sharing a class, and does any selector match nothing | `audit/selectors.mjs` |
| anything wider than the window, past a readable measure, under a 44px touch area, or clipped | `audit/layout.mjs` |
| anything holding text that is never once on screen | `audit/invisible.mjs` |
| two lines saying the same thing in front of the same man | `audit/repeats.mjs` |
| every kind of man through the page: no placeholder, no undefined, and the lines that are his actually change | `audit/persona.mjs` |
| how it looks, a screen at a time | `audit/slices.mjs` then `tools/montage.mjs` |

Three of those exist because this page has actually shipped the fault they look
for: a rule written for an image that reached a div and inverted it, a reveal
whose observer could never fire, and a personalisation that silently stopped.

The one check that cannot run locally is the money. The checkout only exists on
the real host, so after a push has gone out:

    node audit/stress.mjs 7 390 844
    node audit/stress.mjs 7 1440 900

which seeds a man, lands him on the live page, brings the checkout on screen and
asks whether his name and email are in it, whether it says £99.00, whether
Stripe drew, whether either bump arrived ticked, and whether anything scrolled
sideways. Seven runs, because the faults that matter here are the intermittent
ones.

## The private half

The research, the ten call transcripts, the market report and the test harness
are **not** in this repository, because this repository is public. They live in
`~/Documents/Renz`. So does the one document that explains how the closet score
is scored, which stops working the moment it is somewhere a visitor can read it.
So do the three pages as they were originally authored, recovered from the
published artifacts and kept for history: `~/Documents/Renz/archive`.
