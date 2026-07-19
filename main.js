(function () {
  "use strict";

  // On the locked site, unlock.js wires toolbar controls after decryption.
  if (document.getElementById("payload")) return;

  var html = document.documentElement;
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function syncThemeControls(isDark) {
    document.querySelectorAll("[data-theme-icon]").forEach(function (icon) {
      var use = icon.querySelector("use");
      if (use) use.setAttribute("href", isDark ? "#i-sun" : "#i-moon");
    });
    document.querySelectorAll("[data-theme-label]").forEach(function (el) {
      el.textContent = isDark ? "Light" : "Dark";
    });
  }

  function applyTheme(isDark) {
    if (isDark) {
      html.setAttribute("data-theme", "dark");
    } else {
      html.removeAttribute("data-theme");
    }
    if (themeMeta) {
      themeMeta.setAttribute("content", isDark ? "#0b141e" : "#e8eef4");
    }
    syncThemeControls(isDark);
  }

  applyTheme(localStorage.getItem("resumeTheme") === "dark");

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var isDark = html.getAttribute("data-theme") === "dark";
      applyTheme(!isDark);
      localStorage.setItem("resumeTheme", isDark ? "light" : "dark");
    });
  });

  var pdfBtn = document.getElementById("downloadPdfBtn");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", function () {
      window.print();
    });
  }

  var copyBtn = document.getElementById("copyLinkBtn");
  var copyLabel = document.getElementById("copyLinkLabel");
  if (copyBtn && copyLabel) {
    copyBtn.addEventListener("click", function () {
      var url = window.location.href;
      var done = function () {
        var original = copyLabel.textContent;
        copyLabel.textContent = "Copied!";
        setTimeout(function () {
          copyLabel.textContent = original;
        }, 2000);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () {
          window.prompt("Copy this link:", url);
        });
      } else {
        window.prompt("Copy this link:", url);
      }
    });
  }

  var lockBtn = document.getElementById("lockResumeBtn");
  if (lockBtn) {
    lockBtn.addEventListener("click", function () {
      try {
        sessionStorage.removeItem("resumeKey");
      } catch (e) {}
      window.location.reload();
    });
  }
})();
