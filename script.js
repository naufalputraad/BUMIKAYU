/* =========================================================================
   BUMI KAYU — shared interaction layer
   This single file is loaded on every page. Each block below checks that
   its elements exist before doing anything, so the same script is safe to
   include site-wide without throwing errors on pages that don't have a
   given feature.
   ========================================================================= */

document.addEventListener("DOMContentLoaded", function () {
  initQuantitySteppers();
  initSwatchGroups();
  initRadioCards();
  initOrderForms(); // product forms on detail.html
  initCheckoutForm(); // full order form on transaksi.html
});

/* ---------- Controls: quantity stepper (detail.html) ---------- */
function initQuantitySteppers() {
  document.querySelectorAll(".stepper").forEach(function (stepper) {
    var input = stepper.querySelector(".qty-input");
    var decrease = stepper.querySelector(".qty-decrease");
    var increase = stepper.querySelector(".qty-increase");
    if (!input || !decrease || !increase) return;

    decrease.addEventListener("click", function () {
      var val = parseInt(input.value, 10);
      val = isNaN(val) || val <= 1 ? 1 : val - 1;
      input.value = val;
    });

    increase.addEventListener("click", function () {
      var val = parseInt(input.value, 10);
      val = isNaN(val) ? 1 : val + 1;
      input.value = val;
    });
  });
}

/* ---------- Controls: wood-finish swatches (detail.html) ---------- */
function initSwatchGroups() {
  document.querySelectorAll(".swatch-group").forEach(function (group) {
    var options = group.querySelectorAll(".swatch-option");
    options.forEach(function (opt) {
      var input = opt.querySelector("input");
      if (!input) return;
      input.addEventListener("change", function () {
        options.forEach(function (o) { o.classList.remove("is-checked"); });
        if (input.checked) opt.classList.add("is-checked");
      });
    });
  });
}

/* ---------- Controls: delivery-method radio cards (transaksi.html) ---------- */
function initRadioCards() {
  document.querySelectorAll(".radio-card-group").forEach(function (group) {
    var cards = group.querySelectorAll(".radio-card");
    cards.forEach(function (card) {
      var input = card.querySelector("input");
      if (!input) return;
      input.addEventListener("change", function () {
        cards.forEach(function (c) { c.classList.remove("is-checked"); });
        if (input.checked) card.classList.add("is-checked");
        onDeliveryMethodChange();
      });
    });
  });
}

/* Toggle whether the address field reads as required, based on delivery method. */
function onDeliveryMethodChange() {
  var addressNote = document.getElementById("address-requirement-note");
  var checked = document.querySelector('input[name="kurir"]:checked');
  if (!addressNote || !checked) return;
  addressNote.textContent =
    checked.value === "ambil"
      ? "Not required — you're picking up at our workshop."
      : "Helps our courier find you.";
}

/* ---------- Controls + Errors: per-product order forms (detail.html) ---------- */
function initOrderForms() {
  document.querySelectorAll(".order-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      var qtyInput = form.querySelector(".qty-input");
      var qtyError = form.querySelector(".qty-error");
      if (!qtyInput || !qtyError) return;

      var qty = parseInt(qtyInput.value, 10);
      qtyError.textContent = "";

      if (isNaN(qty) || qty < 1) {
        e.preventDefault();
        qtyError.textContent = "Please enter at least 1 item.";
        qtyInput.focus();
        return;
      }
      // Keep the field's value clean before the browser serializes the GET request.
      qtyInput.value = qty;
    });
  });
}

/* ---------- Empty state + Errors + Transitional text + Confirmation (transaksi.html) ---------- */
function initCheckoutForm() {
  var form = document.getElementById("order-form");
  if (!form) return; // this block only applies to transaksi.html

  renderOrderSummary();
  onDeliveryMethodChange();

  var statusEl = document.getElementById("form-status");
  var submitBtn = document.getElementById("submit-btn");
  var formCard = document.getElementById("order-form-card");
  var confirmationCard = document.getElementById("order-confirmation");

  function setError(fieldName, message) {
    var span = form.querySelector('.error-text[data-for="' + fieldName + '"]');
    if (span) span.textContent = message;
  }

  function clearErrors() {
    form.querySelectorAll(".error-text").forEach(function (span) {
      span.textContent = "";
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearErrors();
    statusEl.innerHTML = "";

    var nama = form.nama.value.trim();
    var whatsapp = form.whatsapp.value.trim();
    var kurirChecked = form.querySelector('input[name="kurir"]:checked');
    var alamat = form.alamat.value.trim();
    var valid = true;

    if (nama === "") {
      setError("nama", "Please enter your full name so we know who to deliver to.");
      valid = false;
    }

    if (whatsapp === "") {
      setError("whatsapp", "Please enter your WhatsApp number so we can confirm your order.");
      valid = false;
    } else if (!/^[0-9+\-\s]{9,16}$/.test(whatsapp)) {
      setError("whatsapp", "That doesn't look like a valid phone number. Please use the format 08xx-xxxx-xxxx.");
      valid = false;
    }

    if (!kurirChecked) {
      setError("kurir", "Please choose a delivery method.");
      valid = false;
    } else if (kurirChecked.value !== "ambil" && alamat === "") {
      setError("alamat", "Please enter your delivery address so our courier can find you.");
      valid = false;
    }

    if (!valid) {
      var firstError = form.querySelector(".error-text:not(:empty)");
      if (firstError) firstError.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    // Ask for notification permission now, still inside the click's user-gesture
    // context — this is what lets a real system notification fire below.
    requestNotificationPermission();

    // Transitional text: acknowledge the action immediately.
    submitBtn.disabled = true;
    statusEl.innerHTML = '<span class="spinner" aria-hidden="true"></span> Placing your order…';

    setTimeout(function () {
      formCard.style.display = "none";
      statusEl.innerHTML = "";
      showConfirmation(nama, kurirChecked.value);
      notifyOrderReceived(nama); // Notifications pattern: a real OS/browser notification
      confirmationCard.style.display = "block";
      confirmationCard.setAttribute("tabindex", "-1");
      confirmationCard.focus();
    }, 900);
  });
}

function getSelection() {
  var params = new URLSearchParams(window.location.search);
  var produk = params.get("produk");
  var harga = parseInt(params.get("harga"), 10);
  var varian = params.get("varian");
  var jumlah = parseInt(params.get("jumlah"), 10) || 1;
  return { produk: produk, harga: harga, varian: varian, jumlah: jumlah };
}

function formatRupiah(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

/* Empty-state pattern: shown when someone opens the Order page without
   choosing a piece on a product page first. */
function renderOrderSummary() {
  var el = document.getElementById("order-summary");
  if (!el) return;
  var sel = getSelection();

  if (!sel.produk || isNaN(sel.harga)) {
    el.innerHTML =
      '<div class="summary-card summary-card--empty">' +
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<rect x="9" y="16" width="30" height="24" rx="2"/><path d="M9 22h30"/><path d="M17 16v-3a7 7 0 0 1 14 0v3"/>' +
      "</svg>" +
      "<p><b>No piece selected yet.</b><br>Every order starts with choosing a piece. Browse the Collection to find yours.</p>" +
      '<a class="btn btn-primary" href="detail.html">Browse the Collection</a>' +
      "</div>";
  } else {
    var total = sel.harga * sel.jumlah;
    el.innerHTML =
      '<div class="summary-card summary-card--filled">' +
      '<p class="eyebrow" style="margin-bottom: 0.6rem;">Your selection</p>' +
      "<dl>" +
      "<dt>Piece</dt><dd>" + escapeHtml(sel.produk) + "</dd>" +
      "<dt>Wood finish</dt><dd>" + escapeHtml(sel.varian || "Natural Teak") + "</dd>" +
      "<dt>Quantity</dt><dd>" + sel.jumlah + "</dd>" +
      "<dt>Estimated total</dt><dd>" + formatRupiah(total) + "</dd>" +
      "</dl></div>";
  }
}

/* Confirmation-message pattern: names the piece, sets a clear next step. */
function showConfirmation(nama, kurirValue) {
  var sel = getSelection();
  var bodyEl = document.getElementById("confirmation-body");
  if (!bodyEl) return;

  var pieceLine = sel.produk
    ? "Your <b>" + escapeHtml(sel.produk) + "</b> in <b>" + escapeHtml(sel.varian || "Natural Teak") + "</b> finish is now with our workshop team."
    : "Our team will help you choose the right piece and confirm every detail.";

  var deliveryLine = kurirValue !== "ambil" ? " and delivery details." : " and pickup schedule.";

  bodyEl.innerHTML =
    "Thank you, <b>" + escapeHtml(nama) + "</b>. " + pieceLine +
    " We'll reach out on WhatsApp within 24 hours to confirm your order" + deliveryLine +
    " Production typically takes about 30 days from confirmation.";
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Notifications pattern: a real system/browser notification ---------- */
function requestNotificationPermission() {
  if (!("Notification" in window)) return; // unsupported browser — page still works fine without it
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function notifyOrderReceived(nama) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return; // person denied or never granted — the on-page card still shows

  var sel = getSelection();
  var title = "Order Received!";
  var body = sel.produk
    ? "Your " + sel.produk + " in " + (sel.varian || "Natural Teak") + " is now with our workshop team."
    : "Thank you, " + nama + ". Our team will be in touch shortly.";

  try {
    new Notification(title, { body: body, icon: "icon.png" });
  } catch (e) {
    // A few mobile browsers only allow notifications through a service worker.
    // Fail silently — the in-page confirmation card already covers this moment.
  }
}
