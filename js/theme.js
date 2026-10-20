/* ------------------------------------------------------------------
   Favorite Soils Report: the site's look, chosen in
   content/group/theme.txt. Nobody needs to edit this file.

   theme.txt takes plain lines such as:
     Theme: prairie
     Accent: 2.5YR 4/6        (a Munsell colour, a colour name or #hex)
     Headings: Fraunces       (one of the fonts listed below)
     Body: Lora
     Title: The Dirt Detectives
     Headline: Three soils, and where their *water* goes
     Subheading: A field guide to our three favorite soils.
   Adding ?theme=volcanic to a page's address previews a theme.
------------------------------------------------------------------- */
(function () {
  // Fonts a group can pick by name. Each is a Google Fonts family.
  var FONTS = {
    "Young Serif": "Young+Serif", "Fraunces": "Fraunces:opsz,wght@9..144,400;9..144,600",
    "Playfair Display": "Playfair+Display:wght@400;600", "DM Serif Display": "DM+Serif+Display",
    "Bitter": "Bitter:wght@400;600", "Space Grotesk": "Space+Grotesk:wght@400;500;600",
    "Source Serif 4": "Source+Serif+4:opsz,wght@8..60,400;8..60,600", "Lora": "Lora:wght@400;600",
    "Inter": "Inter:wght@400;500;600", "Public Sans": "Public+Sans:wght@400;500;600;700",
    "Work Sans": "Work+Sans:wght@400;500;600", "Libre Franklin": "Libre+Franklin:wght@400;500;600"
  };

  // Each theme is a tested set of colours and fonts that stays readable.
  var THEMES = {
    lakebed: {
      scheme: "dark", headings: "Young Serif", body: "Source Serif 4", labels: "Public Sans",
      ground: "#303234", sheet: "#282a2c", ink: "#dedbd5", "ink-soft": "#b4b1ab", rule: "#4a4c4e", line: "#807b6f",
      bar: "#1d1e20", "bar-ink": "#dedbd5", "bar-hover": "#34363a", hatch: "rgba(255,255,255,0.07)",
      water: "#7fb8d4", "water-deep": "#a9d3e8", "water-wash": "#2a3d4a",
      "rust-line": "#c06a3f", "rust-text": "#e0956a", "rust-wash": "rgba(154,74,34,0.12)",
      stage: "#3a3f45", "stage-edge": "#191b1e", "stage-ink": "#d9d6cf"
    },
    prairie: {
      scheme: "light", headings: "Fraunces", body: "Lora", labels: "Work Sans",
      ground: "#f2ede2", sheet: "#faf7f0", ink: "#231d17", "ink-soft": "#5a5045", rule: "#d6cdbd", line: "#8f826d",
      bar: "#2b3a1f", "bar-ink": "#f2ede2", "bar-hover": "#3a4c2a", hatch: "rgba(0,0,0,0.06)",
      water: "#3f6b2a", "water-deep": "#2d4f1d", "water-wash": "#e2ead5",
      "rust-line": "#b0603a", "rust-text": "#8a3f1b", "rust-wash": "rgba(154,74,34,0.08)",
      stage: "#3b3f36", "stage-edge": "#1b1d18", "stage-ink": "#e6e2d6"
    },
    volcanic: {
      scheme: "dark", headings: "Space Grotesk", body: "Inter", labels: "Space Grotesk",
      ground: "#1d1b1e", sheet: "#262326", ink: "#efe9e4", "ink-soft": "#b9b0aa", rule: "#3d383c", line: "#7d6f73",
      bar: "#121013", "bar-ink": "#efe9e4", "bar-hover": "#2c272b", hatch: "rgba(255,255,255,0.06)",
      water: "#f08a4b", "water-deep": "#ffb487", "water-wash": "#3a2620",
      "rust-line": "#d0743f", "rust-text": "#f0a070", "rust-wash": "rgba(208,116,63,0.12)",
      stage: "#3a3236", "stage-edge": "#0f0d0f", "stage-ink": "#e9e1db"
    },
    desert: {
      scheme: "light", headings: "Playfair Display", body: "Source Serif 4", labels: "Libre Franklin",
      ground: "#efe2cf", sheet: "#f8efe2", ink: "#2b1d12", "ink-soft": "#6a4f3a", rule: "#dcc7aa", line: "#94704d",
      bar: "#7a3b1e", "bar-ink": "#fbf3e8", "bar-hover": "#8f4a2a", hatch: "rgba(0,0,0,0.06)",
      water: "#a5481f", "water-deep": "#7e3413", "water-wash": "#f3d9c3",
      "rust-line": "#b0603a", "rust-text": "#8a3f1b", "rust-wash": "rgba(154,74,34,0.08)",
      stage: "#5a4436", "stage-edge": "#241912", "stage-ink": "#f1e3d2"
    }
  };

  var root = document.documentElement;
  root.classList.add("theme-loading");
  var shown = false;
  function show() { if (!shown) { shown = true; root.classList.remove("theme-loading"); } }
  setTimeout(show, 1500);   // never keep the page hidden for long

  /* ---------- colour helpers ---------- */
  var probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  function rgbOf(cssColour) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "#000";
    probe.fillStyle = cssColour;
    probe.fillRect(0, 0, 1, 1);
    var d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  function luminance(c) {
    var v = c.map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  function hex(c) { return "#" + c.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join(""); }

  // A Munsell colour ("2.5YR 4/6"), a colour name or #hex, made readable against the background.
  function accentFor(value, theme) {
    var looksMunsell = /\d\s*(YR|GY|BG|PB|RP|R|Y|G|B|P)\s+\d/i.test(value) || /^N\s*\d/i.test(value);
    var c = rgbOf(looksMunsell && window.soilColor ? window.soilColor(value) : value);
    var ground = rgbOf(theme.ground), toward = theme.scheme === "dark" ? [255, 255, 255] : [0, 0, 0];
    for (var i = 0; i < 20 && contrast(c, ground) < 4.5; i++) c = mix(c, toward, 0.08);
    return {
      water: hex(c),
      "water-deep": hex(mix(c, toward, 0.3)),
      "water-wash": hex(mix(c, ground, theme.scheme === "dark" ? 0.78 : 0.84))
    };
  }

  /* ---------- reading theme.txt and applying it ---------- */
  function parse(text) {
    var out = {};
    text.replace(/\r/g, "").split("\n").forEach(function (line) {
      var m = line.match(/^\s*(theme|accent|headings|body|labels|title|headline|subheading)\s*:\s*(.*?)\s*$/i);
      if (m && m[2]) out[m[1].toLowerCase()] = m[2];
    });
    return out;
  }
  function font(name, fallback) {
    var key = Object.keys(FONTS).filter(function (k) { return k.toLowerCase() === String(name || "").toLowerCase(); })[0];
    return key || fallback;
  }
  function apply(text) {
    var cfg = parse(text);
    var asked = new URLSearchParams(location.search).get("theme") || cfg.theme || "lakebed";
    var name = String(asked).toLowerCase().trim();
    var theme = THEMES[name] || THEMES.lakebed;
    var colours = Object.assign({}, theme);
    if (cfg.accent) Object.assign(colours, accentFor(cfg.accent, theme));

    Object.keys(colours).forEach(function (k) {
      if (["scheme", "headings", "body", "labels"].indexOf(k) < 0) root.style.setProperty("--" + k, colours[k]);
    });
    root.style.setProperty("color-scheme", theme.scheme);
    root.dataset.theme = theme.scheme;
    root.dataset.look = THEMES[name] ? name : "lakebed";

    var headings = font(cfg.headings, theme.headings), body = font(cfg.body, theme.body), labels = font(cfg.labels, theme.labels);
    var families = [headings, body, labels, "IBM Plex Mono"].filter(function (f, i, all) { return all.indexOf(f) === i; });
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?" + families.map(function (f) {
      return "family=" + (FONTS[f] || "IBM+Plex+Mono:wght@400;500");
    }).join("&") + "&display=swap";
    document.head.appendChild(link);
    root.style.setProperty("--display", '"' + headings + '", Georgia, serif');
    root.style.setProperty("--read", '"' + body + '", Georgia, serif');
    root.style.setProperty("--label", '"' + labels + '", system-ui, sans-serif');

    if (cfg.title) {
      var site = document.querySelector(".masthead .site");
      if (site) site.firstChild.textContent = cfg.title + " ";
    }
    // The home page's big heading and the line under it; *stars* around a word show it in the
    // accent colour. Until a group writes its own, a placeholder and a "Still to do" note show.
    var head = document.querySelector("[data-headline]"), sub = document.querySelector("[data-subheading]");
    if (head) {
      var fill = function (el, text) {
        el.textContent = "";
        text.split(/\*([^*]+)\*/).forEach(function (piece, i) {
          if (!piece) return;
          if (i % 2) { var em = document.createElement("em"); em.textContent = piece; el.appendChild(em); }
          else el.appendChild(document.createTextNode(piece));
        });
      };
      fill(head, cfg.headline || "Your group's headline");
      head.classList.toggle("is-placeholder", !cfg.headline);
      head.hidden = false;
      if (cfg.subheading) { fill(sub, cfg.subheading); sub.hidden = false; } else sub.hidden = true;
      var note = head.parentNode.querySelector(".todo");
      if (!cfg.headline || !cfg.subheading) {
        if (!note) {
          note = document.createElement("div");
          note.className = "todo";
          head.parentNode.appendChild(note);
        }
        note.innerHTML = "<p><strong>Still to do.</strong> Write your home page's " +
          (!cfg.headline && !cfg.subheading ? "Headline and Subheading" : !cfg.headline ? "Headline" : "Subheading") +
          " in <code>content/group/theme.txt</code>.</p>";
      } else if (note) {
        note.remove();
      }
    }

    // Let the 3D model and anything else that reads colours know the theme is in place.
    window.siteTheme = { name: root.dataset.look, scheme: theme.scheme };
    document.dispatchEvent(new CustomEvent("site:theme"));
    show();
  }

  fetch("content/group/theme.txt", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.text() : ""; })
    .catch(function () { return ""; })
    .then(apply);
})();
