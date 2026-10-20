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
|`history.txt`|Optional. The stages of how your soil formed, played by "Play its history" on your 3D model.|

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

## Filling in history.txt (optional)

Each stage of how your soil formed is a few labelled lines; the file explains them and has an example. Check every date and fact against a real source and cite it in your Sources. If you use an AI assistant to help research or draft it, say so in your Sources too.

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
