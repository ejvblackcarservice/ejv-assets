/* EJV — quoter patches loaded by a one-line <script src> tag appended to the GoDaddy embed (the embed field is at its size limit): (0) hours-note wording fix, (1-4) Meet & Greet add-on (+$50), (5) optional driver tip at checkout (12/18/20%, 12% preselected — added 2026-11-11). Source of truth: ~/workspace/ejv-quoter/meetgreet.js — keep this GitHub copy in sync. */
(function(){
  if (window.__ejvMG) return; window.__ejvMG = true;
  var FEE = 50;
  function $(id){ return document.getElementById(id); }
  function money(n){ return '$' + Number(n).toFixed(2); }

  /* 0) Hours note fix: the /contact quoter copy still ends the rush line with "— 24/7."
        EJV trips run 5 AM – midnight daily (only online booking is 24/7). Rewrite that
        text to match the Home copy. The embed may render/re-render late, so search by
        text (TreeWalker over all text nodes, not just p.note) and keep retrying via a
        MutationObserver until the patch lands; idempotent and self-stopping. */
  function fixHoursNote(){
    var done = false;
    try {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walker.nextNode())){
        if (n.textContent.indexOf('24/7') === -1) continue;
        var p = n.parentElement;
        var inRush = false;
        while (p && p !== document.body){
          if (p.textContent && p.textContent.indexOf('In a rush') !== -1){ inRush = true; break; }
          p = p.parentElement;
        }
        if (!inRush) continue;
        n.textContent = n.textContent.replace(/\s*—\s*24\/7\.?/g, ', 5 AM \u2013 midnight daily.');
        if (n.textContent.indexOf('24/7') === -1) done = true;
      }
    } catch(e){}
    return done;
  }
  var hnObs = null, hnTries = 0;
  function hnAttempt(){
    hnTries++;
    if (fixHoursNote() || hnTries > 60){
      if (hnObs) hnObs.disconnect();
      return true;
    }
    return false;
  }
  function hnStart(){
    if (hnAttempt()) return;
    if (document.body && window.MutationObserver){
      hnObs = new MutationObserver(function(){ hnAttempt(); });
      hnObs.observe(document.body, { childList: true, subtree: true, characterData: true });
      setTimeout(function(){ if (hnObs) hnObs.disconnect(); }, 15000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hnStart);
  else hnStart();

  /* 1) Checkbox injected right after the Child car seat label */
  var seat = $('carseat');
  var seatLabel = null;
  if (seat) seatLabel = seat.closest ? seat.closest('label') : seat.parentNode;
  if (!seatLabel || !seatLabel.parentNode) return; /* quoter shape unexpected: do nothing */
  var lab = document.createElement('label');
  lab.className = 'chk';
  lab.innerHTML = '<input type="checkbox" id="ejvMeetGreet"> Meet &amp; Greet \u2014 driver waits inside with a name sign <span style="color:var(--muted)">(+$50)</span>';
  seatLabel.parentNode.insertBefore(lab, seatLabel.nextSibling);
  var chk = $('ejvMeetGreet');
  if (!chk) return;

  /* 2) WhatsApp button text price sync */
  function patchWA(total, add){
    var wa = $('waBtn'); if (!wa || !wa.href) return;
    try {
      var parts = wa.href.split('text=');
      if (parts.length < 2) return;
      var txt = decodeURIComponent(parts[1]);
      txt = txt.replace(/(Quoted (?:fixed )?price: )\$[0-9]+(?:\.[0-9]{2})?/,
        function(m, p1){ return p1 + '$' + total.toFixed(2); });
      if (add && txt.indexOf('Meet & Greet') === -1) txt += ' Meet & Greet (+$50)';
      if (!add) txt = txt.replace(' Meet & Greet (+$50)', '');
      wa.href = 'https://wa.me/19296984146?text=' + encodeURIComponent(txt);
    } catch(e){}
  }

  /* 3) Displayed total sync (+/- $50), idempotent via a marker line in resDet */
  function detHas(){
    var det = $('resDet');
    return !!(det && det.innerHTML.indexOf('Meet &amp; Greet:') !== -1);
  }
  function apply(){
    var det = $('resDet'), amt = $('resAmt');
    if (!det || !amt) return;
    if (chk.checked && !detHas()){
      var cur = parseFloat(String(amt.textContent).replace(/[^0-9.]/g, ''));
      if (isNaN(cur) || cur <= 0) return;
      var total = cur + FEE;
      amt.textContent = money(total);
      det.innerHTML = det.innerHTML + '<br>Meet &amp; Greet: +$50';
      patchWA(total, true);
    } else if (!chk.checked && detHas()){
      var cur2 = parseFloat(String(amt.textContent).replace(/[^0-9.]/g, ''));
      if (isNaN(cur2) || cur2 <= FEE) return;
      var total2 = cur2 - FEE;
      amt.textContent = money(total2);
      det.innerHTML = det.innerHTML.replace('<br>Meet &amp; Greet: +$50', '');
      patchWA(total2, false);
    }
  }
  chk.addEventListener('change', apply);
  var det0 = $('resDet');
  if (det0) new MutationObserver(function(){ setTimeout(apply, 60); })
    .observe(det0, { childList: true, subtree: true, characterData: true });

  /* 4) Booking flag: inject meetGreet into the createCheckout payload */
  var prevFetch = window.fetch;
  if (prevFetch && !prevFetch.__ejvMGW){
    var wf = function(url, opts){
      try {
        if (typeof url === 'string' && url.indexOf('createcheckout') !== -1 &&
            opts && typeof opts.body === 'string'){
          var b = JSON.parse(opts.body);
          b.meetGreet = !!chk.checked;
          opts = Object.assign({}, opts, { body: JSON.stringify(b) });
        }
      } catch(e){}
      return prevFetch.call(this, url, opts);
    };
    wf.__ejvMGW = true;
    window.fetch = wf;
  }
})();

/* (5) Driver tip — optional, chosen at the payment step (added 2026-11-11,
   approved by Ender). Buttons: 12% / 18% / 20% / No tip, with 12% preselected
   and clearly optional. Only the PERCENT leaves the browser: createCheckout
   (v9) whitelists {0,12,18,20} and recomputes the amount server-side from the
   server fare. The live total (fare + Meet & Greet if checked + tip) is shown
   in this block and on the Book & Pay button. The tip is stored on the trip
   (propina / propinaPorcentaje) and is visible ONLY to the panel admin —
   the driver never sees it, same as the price. */
(function(){
  if (window.__ejvTip) return; window.__ejvTip = true;
  var PCTS = [12, 18, 20, 0];
  var pct = 12; /* preselected */
  function $(id){ return document.getElementById(id); }
  function money(n){ return '$' + Number(n).toFixed(2); }
  function round2(n){ return Math.round(n * 100) / 100; }

  /* Fare the server will charge BEFORE tip: the quoter's own total
     (window.EJV_QUOTE.total, without Meet & Greet) + $50 if the MG box is
     checked — mirrors computeTotal() in createCheckout v9. Fallback: the
     displayed quote amount (which already includes MG when checked). */
  function fareBase(){
    var q = window.EJV_QUOTE;
    var mg = $('ejvMeetGreet');
    if (q && Number(q.total) > 0) return Number(q.total) + (mg && mg.checked ? 50 : 0);
    var amt = $('resAmt');
    if (amt){
      var v = parseFloat(String(amt.textContent).replace(/[^0-9.]/g, ''));
      if (!isNaN(v) && v > 0) return v;
    }
    return 0;
  }
  function tipAmount(){ var f = fareBase(); return f > 0 ? round2(f * pct / 100) : 0; }

  var box = null, sumEl = null, btnEls = [];
  function render(){
    if (!box) return;
    var fare = fareBase(), tip = tipAmount(), total = round2(fare + tip);
    btnEls.forEach(function(b){
      var on = Number(b.getAttribute('data-pct')) === pct;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (fare > 0){
      box.style.display = 'block';
      sumEl.textContent = pct > 0
        ? 'Tip (' + pct + '%): ' + money(tip) + ' · Total to pay: ' + money(total)
        : 'No tip · Total to pay: ' + money(total);
      /* Keep the pay button label in sync with the real amount to pay. */
      var btn = $('ejvPayBtn');
      if (btn && !btn.disabled) btn.textContent = 'Book & Pay ' + money(total);
    } else {
      box.style.display = 'none';
    }
  }

  function inject(){
    var book = $('ejvBook'), payBtn = $('ejvPayBtn');
    if (!book || !payBtn || $('ejvTip')) return !!$('ejvTip');
    if (!document.getElementById('ejvTipCss')){
      var st = document.createElement('style');
      st.id = 'ejvTipCss';
      st.textContent =
        '#ejvTip{margin-top:16px}' +
        '#ejvTip .q{font-size:13px;font-weight:600;margin:0 0 4px}' +
        '#ejvTip .opt{font-size:12.5px;color:#6b6558;margin:0 0 8px}' +
        '#ejvTip .row{display:flex;gap:8px}' +
        '#ejvTip button{flex:1;padding:11px 0;border:1px solid #cfc9ba;border-radius:999px;' +
          'background:#fff;font-size:15px;font-weight:700;cursor:pointer;color:#111}' +
        '#ejvTip button.on{background:#E8B33D;border-color:#E8B33D}' +
        '#ejvTipSum{font-size:13.5px;font-weight:600;text-align:center;margin:10px 0 0}';
      document.head.appendChild(st);
    }
    box = document.createElement('div');
    box.id = 'ejvTip';
    box.innerHTML =
      '<p class="q">Add a tip for your driver?</p>' +
      '<p class="opt">Optional — you can change it or remove it.</p>' +
      '<div class="row">' +
        PCTS.map(function(p){
          return '<button type="button" data-pct="' + p + '">' + (p === 0 ? 'No tip' : p + '%') + '</button>';
        }).join('') +
      '</div>' +
      '<p id="ejvTipSum"></p>';
    book.insertBefore(box, payBtn);
    sumEl = $('ejvTipSum');
    btnEls = Array.prototype.slice.call(box.querySelectorAll('button[data-pct]'));
    btnEls.forEach(function(b){
      b.addEventListener('click', function(){
        pct = Number(b.getAttribute('data-pct'));
        render();
      });
    });
    var mg = $('ejvMeetGreet');
    if (mg) mg.addEventListener('change', render);
    render();
    return true;
  }

  /* Re-render whenever the quote changes: the quoter contract calls
     EJV_BOOKING.refresh() after each calculation, so wrap it when it shows
     up; a slow poll covers every other path (vehicle switch, MG toggle). */
  var lastSig = '';
  function sig(){ var mg = $('ejvMeetGreet'); return fareBase() + '|' + (mg && mg.checked ? 1 : 0) + '|' + pct; }
  function watch(){
    if (window.EJV_BOOKING && window.EJV_BOOKING.refresh && !window.EJV_BOOKING.__ejvTipW){
      var orig = window.EJV_BOOKING.refresh;
      window.EJV_BOOKING.refresh = function(){ var r = orig.apply(this, arguments); render(); return r; };
      window.EJV_BOOKING.__ejvTipW = true;
    }
    var s = sig();
    if (s !== lastSig){ lastSig = s; render(); }
  }
  var tries = 0;
  var iv = setInterval(function(){
    tries++;
    if (inject()){ watch(); if (tries > 8) clearInterval(iv); }
    else if (tries > 40) clearInterval(iv);
  }, 400);
  setInterval(watch, 1500);

  /* Booking flag: inject tipPercent into the createCheckout payload.
     Chained AFTER the Meet & Greet fetch wrapper (same pattern). */
  var prevFetch = window.fetch;
  if (prevFetch && !prevFetch.__ejvTipW){
    var wf = function(url, opts){
      try {
        if (typeof url === 'string' && url.indexOf('createcheckout') !== -1 &&
            opts && typeof opts.body === 'string'){
          var b = JSON.parse(opts.body);
          b.tipPercent = pct;
          opts = Object.assign({}, opts, { body: JSON.stringify(b) });
        }
      } catch(e){}
      return prevFetch.call(this, url, opts);
    };
    wf.__ejvTipW = true;
    window.fetch = wf;
  }
})();
