# Citebox

A free citation generator and reference manager that runs entirely in the browser. It is hosted on GitHub Pages and has no server or database.

**Live site:** https://bl3h67.github.io/refrigerator.github.io/

## Features
- Cite websites, books, journal articles and 15 other source types
- Automatic lookup by URL, DOI, ISBN or title (Crossref, Google Books, Open Library, Microlink)
- Styles: APA 7, MLA 9, Harvard, Chicago 17, IEEE, AMA 11, Vancouver
- Projects and folders, undo/redo, colour labels, annotations, in-text citations
- Export to Word, plain text, HTML, BibTeX and RIS, copy to clipboard, or print to PDF
- **Your data stays on your device:** it autosaves in the browser, and **Save** (Ctrl/⌘+S) writes everything to a `.json` file on your computer. Open that file again with **Open** (Ctrl/⌘+O).
- Share a project as a link (the data is packed into the URL)

## Files
- `index.html`: page shell
- `css/style.css`: styles (light and dark)
- `js/formatter.js`: citation style engine
- `js/lookup.js`: metadata lookup
- `js/io.js`: import/export and device files
- `js/app.js`: UI and state

When you change a CSS or JS file, bump the `?v=` number in `index.html` so visitors get the new version instead of a cached copy.
