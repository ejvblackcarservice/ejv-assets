/* EJV — quoter patches loaded by a one-line <script src> tag appended to the GoDaddy embed (the embed field is at its size limit): (0) hours-note wording fix, (1-4) Meet & Greet add-on (+$50). Source of truth: ~/workspace/ejv-quoter/meetgreet.js — keep this GitHub copy in sync. */
(function(){
  if (window.__ejvMG) return; window.__ejvMG = true;
  var FEE = 50;
  function $(id){ return document.getElementById(id); }
  function money(n){ return '$' + Number(n).toFixed(2); }

  /* 0) Hours note fix: the /contact quoter copy still ends the rush line with "— 24/7."
        EJV trips run 5 AM – midnight daily (only online booking is 24/7). Rewrite that
        trailing text node to match the Home copy. Text-node level, idempotent. */
  function fixHoursNote(){
    var ps = document.querySelectorAll('p.note');
    for (var i = 0; i < ps.length; i++){
      var p = ps[i];
      if (p.textContent.indexOf('In a rush') === -1) continue;
      for (var j = 0; j < p.childNodes.length; j++){
        var n = p.childNodes[j];
        if (n.nodeType === 3 && n.textContent.indexOf('24/7') !== -1){
          n.textContent = n.textContent.replace(/\s*—\s*24\/7\.?/, ', 5 AM \u2013 midnight daily.');
        }
      }
    }
  }
  fixHoursNote();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fixHoursNote);

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
