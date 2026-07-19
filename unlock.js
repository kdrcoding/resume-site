/*
 * unlock.js — password gate for the résumé.
 * The résumé HTML is AES-GCM encrypted inside index.html (see the
 * <script id="payload"> block). This script derives a key from the
 * password with PBKDF2 and decrypts the content in the browser.
 * Wrong password  ->  decryption fails  ->  nothing is revealed.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var FAIL_DELAY_MS = 450;
  var failCount = 0;

  function applyTheme(isDark) {
    if (isDark) {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#0b141e" : "#e8eef4");
    syncThemeControls(isDark);
  }

  function syncThemeControls(isDark) {
    document.querySelectorAll("[data-theme-icon]").forEach(function (icon) {
      var use = icon.querySelector("use");
      if (use) use.setAttribute("href", isDark ? "#i-sun" : "#i-moon");
    });
    document.querySelectorAll("[data-theme-label]").forEach(function (el) {
      el.textContent = isDark ? "Light" : "Dark";
    });
  }

  applyTheme(localStorage.getItem("resumeTheme") === "dark");

  var payloadEl = document.getElementById("payload");
  if (!payloadEl) return;

  var payload = JSON.parse(payloadEl.textContent);
  var lock = document.getElementById("lockScreen");
  var mount = document.getElementById("resumeMount");
  var form = document.getElementById("lockForm");
  var input = document.getElementById("pw");
  var err = document.getElementById("lockError");
  var submitBtn = document.getElementById("lockSubmit");
  var togglePw = document.getElementById("togglePw");
  var lockThemeBtn = document.getElementById("lockThemeToggle");

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function decrypt(password) {
    var enc = new TextEncoder();
    var salt = b64ToBytes(payload.salt);
    var iv = b64ToBytes(payload.iv);
    var ct = b64ToBytes(payload.ct);
    return crypto.subtle
      .importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"])
      .then(function (km) {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: salt, iterations: payload.iter, hash: "SHA-256" },
          km,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
      })
      .then(function (key) {
        return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct);
      })
      .then(function (buf) {
        return new TextDecoder().decode(buf);
      });
  }

  function setBusy(busy) {
    if (!form) return;
    form.setAttribute("aria-busy", busy ? "true" : "false");
    if (input) input.disabled = busy;
    if (submitBtn) {
      submitBtn.disabled = busy;
      submitBtn.classList.toggle("is-loading", busy);
      var label = submitBtn.querySelector("[data-label]");
      if (label) label.textContent = busy ? "Unlocking…" : "Unlock résumé";
    }
  }

  function shakeCard() {
    var card = lock && lock.querySelector(".lock-card");
    if (!card) return;
    card.classList.remove("is-shake");
    void card.offsetWidth;
    card.classList.add("is-shake");
  }

  function wireUI() {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var isDark = root.getAttribute("data-theme") === "dark";
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

    syncThemeControls(root.getAttribute("data-theme") === "dark");
  }

  function reveal(htmlStr) {
    mount.innerHTML = htmlStr;
    if (lock) {
      lock.hidden = true;
      lock.style.display = "none";
    }
    mount.hidden = false;
    document.title = "Kadir Ravshanov | Résumé";
    document.body.classList.add("is-unlocked");
    wireUI();
    var main = document.getElementById("main-content");
    if (main) main.focus({ preventScroll: true });
  }

  function tryUnlock(password, isAuto) {
    if (!password) {
      if (!isAuto && err) {
        err.textContent = "Please enter the password.";
        shakeCard();
      }
      if (input) input.focus();
      return Promise.resolve();
    }

    setBusy(true);
    if (err) err.textContent = "";

    var started = Date.now();
    return decrypt(password)
      .then(function (htmlStr) {
        try {
          sessionStorage.setItem("resumeKey", password);
        } catch (e) {}
        failCount = 0;
        reveal(htmlStr);
      })
      .catch(function () {
        try {
          sessionStorage.removeItem("resumeKey");
        } catch (e) {}
        failCount += 1;
        var wait = Math.max(0, FAIL_DELAY_MS - (Date.now() - started));
        if (failCount > 3) wait += Math.min(2500, (failCount - 3) * 400);
        return new Promise(function (resolve) {
          setTimeout(resolve, wait);
        }).then(function () {
          if (!isAuto) {
            if (err) {
              err.textContent =
                failCount >= 5
                  ? "Still incorrect. Double-check the password, or email me for access."
                  : "Incorrect password. Please try again.";
            }
            shakeCard();
            if (input) {
              input.value = "";
              input.focus();
            }
          }
        });
      })
      .finally(function () {
        if (!document.body.classList.contains("is-unlocked")) setBusy(false);
      });
  }

  if (togglePw && input) {
    togglePw.addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      togglePw.setAttribute("aria-pressed", show ? "true" : "false");
      togglePw.setAttribute("aria-label", show ? "Hide password" : "Show password");
      var label = togglePw.querySelector("[data-label]");
      if (label) label.textContent = show ? "Hide" : "Show";
      input.focus();
    });
  }

  if (lockThemeBtn) {
    lockThemeBtn.setAttribute("data-theme-toggle", "");
    lockThemeBtn.addEventListener("click", function () {
      var isDark = root.getAttribute("data-theme") === "dark";
      applyTheme(!isDark);
      localStorage.setItem("resumeTheme", isDark ? "light" : "dark");
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      tryUnlock(input ? input.value : "", false);
    });
  }

  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.getModifierState && e.getModifierState("CapsLock") && err && !err.textContent) {
        err.textContent = "Caps Lock is on";
      }
    });
  }

  var saved = null;
  try {
    saved = sessionStorage.getItem("resumeKey");
  } catch (e) {}
  if (saved) {
    tryUnlock(saved, true);
  } else if (input) {
    input.focus();
  }
})();
