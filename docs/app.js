// Theme: system by default, with a manual override kept per browser.
(function () {
  var root = document.documentElement;
  var btn = document.getElementById("theme");
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
  } catch (e) {}
  btn.addEventListener("click", function () {
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var now = root.getAttribute("data-theme") || (systemDark ? "dark" : "light");
    var next = now === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
})();

// A copy button on every command block.
(function () {
  document.querySelectorAll("pre").forEach(function (pre) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy";
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      var text = pre.querySelector("code").textContent;
      var done = function () {
        btn.textContent = "Copied";
        btn.classList.add("done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1600);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(done, function () { btn.textContent = "Press Ctrl+C"; });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { btn.textContent = "Press Ctrl+C"; }
        document.body.removeChild(ta);
      }
    });
    pre.appendChild(btn);
  });
})();
