# Using the Website Admin (Sanity Studio) — A Guide for Robert

This is where you manage everything on the website yourself: new paintings, prints,
calendars, banners, and the homepage — no coding required.

**Studio address:** https://robert-duncan-fine-art.sanity.studio/

Sign in with your own account. If you don't have login access yet, ask Josh to invite
you as an Editor.

---

## The Big Idea (read this first)

Every painting on the site is actually made of **two separate pieces** in the admin:

1. **Artwork** — the painting itself: its photo(s), title, medium, size, and story.
2. **Product** — how it's *sold*: is it an Original? A Print? A calendar? What's the price?

You need **both** for a painting to show up correctly on the site. Think of the Artwork
as the "who is this painting" and the Product as the "how do people buy it."

The left-hand menu in Studio is organized like this:

- **Artwork** — every painting's photos and details
- **Products** — every sellable listing (originals, prints, calendars, cards, gifts)
- **Frames** / **Categories** — behind-the-scenes lists, see note at the bottom
- **Homepage Settings, Announcement Banner, Store Banner, Site Settings** — the parts
  of the site that aren't tied to one specific painting
- **Pricing Rules, Print Type Descriptions, Shipping Rates** — pricing/shipping math,
  see note at the bottom

---

## Adding a New Original Painting

### Step 1 — Create the Artwork

1. Click **Artwork** in the left menu, then the **+** (Create new) button.
2. **Images** — click to upload a photo of the painting. You can add more than one
   (drag to reorder; the first one is the main photo used everywhere on the site).
3. Fill in:
   - **Title**
   - **Slug** — this becomes part of the page's web address. It fills in
     automatically from the Title; you usually don't need to touch it.
   - **Medium** — e.g. "Oil on canvas"
   - **Dimensions** — e.g. `24" × 36"`
   - **Year**
   - **Categories** — check any that apply (Western, Wildlife, Landscape, etc.)
   - **New Work** — turn this on if you want a "New Work" badge to show on the piece
   - **Status** — Available / Recently Sold / Archived (this only matters for
     originals — leave it on **Available** for a new painting)
   - **Description** — the longer write-up shown on the painting's page
   - **Artist Notes** — optional — the personal story behind the piece
4. Click **Publish** (top right). Nothing goes live until you click this.

### Step 2 — Create the Product (this is what makes it purchasable)

1. Click **Products** in the left menu, then **+**.
2. **Artwork** — search for and select the painting you just created.
3. **Product Type** — choose **Original Painting**.
4. **Original Price (USD)** — the sale price.
5. **Available for Online Purchase** — leave this **on** for a normal sale. Turn it
   **off** only if the painting is reserved or being sold through a gallery instead —
   if you turn it off, fill in **Where to Purchase** with a short note (e.g. "On
   display at the Smith Gallery, Carmel — contact them to purchase"), which is shown
   to visitors instead of a Buy button.
6. **Shipping Override (USD)** — optional. Leave blank to let the site calculate
   shipping automatically. Set a number if this piece needs a special flat shipping
   cost (e.g. it needs to ship freight/crated).
7. Click **Publish**.

That's it — the painting will appear on the Originals page.

---

## Adding a New Calendar, Card, or Gift

1. **Artwork** first, same as above (photo + title at minimum — for a calendar this
   is usually the cover image).
2. **Products** → **+**.
3. **Artwork** — select the artwork you just made.
4. **Product Type** — choose **Calendar**, **Greeting Card**, or **Gift / Other**.
5. Fill in:
   - **Price (USD)**
   - **SKU** — the code used for shipping (e.g. `CAL-2027`)
   - **In Stock** — toggle off when you run out
   - **Product Description** — short details shown on the page (e.g. "12 paintings,
     12 × 12 in.")
   - **Additional Product Images** — optional extra photos (packaging, calendar laid
     open, etc.) shown as thumbnails alongside the main image.
6. Click **Publish**.

*(Print products — the fine-art prints with size and framing options — are usually
bulk-uploaded by Josh because of the pricing setup involved. If you need to add a
single new print by hand, ask Josh to walk through it with you the first time.)*

---

## Adding More Photos to an Existing Painting

1. **Artwork** → find and open the piece.
2. Scroll to **Images**, click to add more photos.
3. Drag photos to reorder — the **first photo is always the main one** shown on the
   site.
4. Click **Publish**.

---

## Updating the Announcement Banner

This is the thin colored strip that runs across the top of every page (e.g. "2027
Calendars now available").

1. Click **Announcement Banner** in the left menu.
2. **Show banner** — turn on/off. Turning it off hides the banner everywhere without
   losing your text, so you can turn it back on later.
3. **Announcement Text** — type your message. Highlight text to make it **Bold**,
   *Italic*, add a link, or use the Style dropdown for Large/Extra Large sizing. Keep
   it to one or two short lines.
4. **Color** — Dark, Rust, Sage, or Cream background.
5. Click **Publish**.

## Updating the Store Banner

A larger image banner (used in the shop).

1. Click **Store Banner** in the left menu.
2. **Display Style** — a single banner, or a rotating carousel of several.
3. Under **Banner Items**, click **+** to add one: upload an **Image**, optionally
   add **Text Overlay** and a **Link URL** (where it goes when clicked), and make
   sure **Active** is turned on.
4. Click **Publish**.

## Updating the Homepage

1. Click **Homepage Settings** in the left menu.
2. **Hero Images** — the large rotating photos at the very top of the homepage. Drag
   to reorder.
3. **Hero Headline** — optional text overlaid on the hero image, with a size option.
4. **Inspiring Quote** — an optional quote block shown below the hero (leave blank to
   hide it entirely). You can set its attribution, font, size, and background color.
5. **Featured Work** — search for and add up to 12 Products (originals, prints,
   calendars — anything) to spotlight on the homepage. Drag to reorder.
6. Click **Publish**.

## Updating the About Page / Contact Info

1. Click **Site Settings** in the left menu.
2. **Contact Email**, **Phone Number**, **Social Links** (Instagram, Facebook, etc.)
3. **About Photo** — your photo on the About page.
4. **About Text** — your bio / artist statement.
5. Click **Publish**.

---

## A Few Important Habits

- **Always click Publish.** Nothing goes live on the website until you do — Sanity
  saves drafts automatically as you type, but a draft alone doesn't update the site.
- **Give it a minute.** After publishing, the live site can take a minute or two to
  show your change (it's not broken — it's just catching up).
- **You can't break anything permanently.** Sanity keeps a history, so if something
  looks wrong, message Josh — earlier versions can be restored.
- **Leave Frames, Categories, Pricing Rules, Print Type Descriptions, and Shipping
  Rates alone** unless you're working with Josh directly — these control the pricing
  and shipping math behind the scenes, and a wrong number there can mis-price a print
  storewide.

## If Something Goes Wrong

Text or call Josh. Nothing you do in Studio can take the site down — worst case, we
just fix or undo the change together.

---

## Domain Names (Reference)

The website answers to two domains:

- **robertduncanfineart.com** — the main site address, registered/managed through
  **Squarespace Domains**.
- **robertduncan.art** — a second domain, registered/managed through **GoDaddy**,
  set up to forward visitors to robertduncanfineart.com.

You shouldn't need to touch either of these day-to-day — this is just here so you
know where they live if a renewal notice shows up or something needs to change.

## Email (Reference)

The site's email addresses (4 total) are managed through **Google Workspace**, under
the **jduncan@robertduncanfineart.com** account.
