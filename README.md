# Favorite Soils Report: site template

A ready-made website for the ENSC 245 Favorite Soils Report. Your group fills in plain text files and the site builds itself: soil profiles drawn from your Munsell colours, a 3D soil monolith with textures from your DRoCTS+ table, an optional animated history of how each soil formed, a blog page and a map. Nobody needs to touch the code.

## Setting it up (one person, about 10 minutes)

1. On GitHub, click **Use this template**, then **Create a new repository**. Give it a name and make it **Public**.
2. In the new repository, open **Settings**, then **Pages**. Under "Branch", choose **main** and **/ (root)**, then **Save**. After a minute your site is live at `https://your-username.github.io/your-repository-name/`.
3. In **Settings**, then **Collaborators**, add your groupmates so they can edit.

## Who edits what

|Group member|Folder|Page|
|-|-|-|
|Member 1|`content/member-1`|Soil 1|
|Member 2|`content/member-2`|Soil 2|
|Member 3|`content/member-3`|Soil 3|

Decide who is which member. Stay inside your own folder and you can't break anyone else's page. The menu shows each soil's series name once you fill in `soil.txt`.

## Your files

|File|What goes in it|
|-|-|
|`soil.txt`|Your soil's name, your name, and its horizons. This draws your soil profile and 3D model.|
|`page.md`|Your soil page: classification, DRoCTS+ table, the rubric you scored, how it formed, your water comparisons, sources.|
|`blog-1.md`|Blog post 1: plant-available water.|
|`blog-2.md`|Blog post 2: annual water budget.|
|`osd.txt`|Optional. Your soil's official series description, pasted in. It makes the 3D model look like the description.|
|`history.txt`|Optional. The stages of how your soil formed, played by "Play its history" on your 3D model. Easiest to make with the **Timeline editor** (link at the bottom of every page).|

## The group's files

|File|What goes in it|
|-|-|
|`content/group/about.md`|The short "About this group" text on the home page.|
|`content/group/map.txt`|Your Google My Maps link, with a marker for each soil.|
|`content/group/theme.txt`|How your site looks: theme, accent colour, fonts, site title and home page headline. Instructions are inside the file.|

## How to edit a file

1. Open the file on github.com.
2. Click the **pencil** icon at the top right.
3. Type. Lines that start with `TO DO:` are reminders of what the assignment asks for, shown on the site as "Still to do" boxes. Delete each one and write your own text in its place.
4. Click **Commit changes**, then **Commit changes** again.
5. Wait a minute and refresh the site.

## How to add a picture

1. Open your folder, click **Add file**, then **Upload files**.
2. Drag your picture in and click **Commit changes**. Simple file names work best, like `water-budget.png`.
3. In `page.md` or a blog file, put this on its own line where the picture should go:

```
   ![Caption that describes the picture](water-budget.png)
```

## Filling in soil.txt

Type after each colon, then list your horizons, one per line: name, top depth in cm, bottom depth in cm, moist Munsell colour.

```
Series: Example
Name: Your Name
Subgroup: Typic Hapludolls
Summary: One sentence describing your soil.

Horizons (name, top in cm, bottom in cm, moist color)
Ap, 0, 20, 10YR 2/2
Bw, 20, 50, 10YR 4/3
C, 50, 120, 10YR 5/4
```

## Your DRoCTS+ table

Type it into `page.md` as a table, one row per horizon, using the same horizon names as `soil.txt`. The 3D model reads its Texture, Structure and Rocks columns, and understands common codes and close spellings (`sbk`, `pr`, `fsl`, `grsl` and so on).

```
| Horizon | Depth (in) | Rocks (%) | Color (moist) | Texture | Structure | HCl | pH |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ap | 0-8 | 0 | 10YR 2/2 | sil | gr | ne | 6.5 |
| Bw | 8-20 | 5 | 10YR 4/3 | sicl | sbk | ne | 6.8 |
```

For a mixed horizon such as E/B, label each part in the same cell: `E: 5YR 4/4 B: 2.5YR 3/6`.

## Filling in osd.txt (optional)

1. Open your soil's Official Series Description at https://soilseries.sc.egov.usda.gov/ (search for your series).
2. Under **TYPICAL PEDON**, copy the horizon paragraphs, from the first one to the last.
3. Paste them into `osd.txt` and commit.

Anything that isn't a horizon paragraph is ignored, so you can't break it.

## Play its history: making your soil's timeline (optional)

"Play its history" rebuilds your soil on the 3D model, one stage at a time, with a caption for each stage. You choose how many stages there are, what each one says, and what the model shows at each one. The button appears once your `history.txt` has at least one stage.

### The easy way: the timeline editor

1. Fill in your `soil.txt` first; the editor uses your horizons.
2. On your site, click **Timeline editor** at the bottom of any page.
3. Choose your soil. Any stages you've already saved are loaded.
4. For each stage, fill in:
   - **Stage title**, a short heading such as "The glacier lays down till".
   - **When**, in words, such as "about 17,500 years ago".
   - **Years ago (optional)**, as a number. It's kept for reference; stages always play in the order they're listed.
   - **What happened**, a sentence or two in your own words.
   - **Source**, where the facts came from. Cite it fully in Sources on your soil page too.
5. Click the horizons in each stage's soil column to set what the model shows. Each click moves a horizon one step on:
   - **Not there yet**: hidden in the model.
   - **Laid down**: appears as raw, pale parent material.
   - **Starts forming**: partly turned into the horizon it is today.
   - **Finished**: looks as it does today.

   Horizons only move forward in time, so changing one stage adjusts the stages around it to match. The last stage always shows the soil as it is today.
6. Use **Add a stage**, **Move up**, **Move down** and **Delete** to build the list.
7. Click **Preview on the 3D model** to open your soil page with your draft and press "Play its history" to watch it. Your draft is kept in your browser until you save it.
8. To save: click **Copy the text**, open your `history.txt` on GitHub (the editor links to it), click the pencil, select everything in the file, paste, and click **Commit changes**.

### Or edit history.txt directly

Each stage is a few labelled lines, starting with `Stage:`. The file explains each label and has an example.

|Line|What it does in the model|
|-|-|
|`Stage:`|Starts a new stage and gives its title.|
|`When:`|The date shown above the caption.|
|`Age:`|Years ago, as a number (optional).|
|`Deposit:`|Horizons that appear at this stage, as raw material.|
|`Develop:`|Horizons that start turning into their present look.|
|`Finish:`|Horizons that reach how they look today (`all` for every horizon).|
|`Text:`|The caption.|
|`Source:`|Shown under the caption.|

A horizon that is never in a `Deposit:` line is there from the first stage.

Whichever way you use, check every date and fact against a real source and cite it in your Sources. If you used an AI assistant to help research or write it, say so in your Sources too.

## Formatting cheat sheet

|To get|Type|
|-|-|
|A new paragraph|Leave a blank line|
|A section heading|`## Heading` (on a soil page) or `### Heading` (inside a blog post)|
|**Bold**|`**bold**`|
|*Italic*|`*italic*`|
|A link|`[words to click](https://example.com)`|
|A bullet list|Start each line with `- `|
|A numbered list|Start each line with `1. `, `2. ` and so on|
|A blog post title|Make the first line `# Your title`|

A table is rows of cells separated by `|`, with a dashed line under the header:

```
| Horizon | Depth (cm) | PAW (cm) |
| --- | --- | --- |
| Ap | 20 | 3.1 |
```

## If something looks wrong

Every save is kept in the repository's history, so any change can be undone. Ask whoever set up the repository, or your TA.
