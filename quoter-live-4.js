
(function(){
  var CREATE_URL = 'https://createcheckout-n5f4ggz3za-ue.a.run.app';
  var panel = document.getElementById('ejvBook');
  var btn = document.getElementById('ejvPayBtn');
  var err = document.getElementById('ejvBookErr');
  function $(id){ return document.getElementById(id); }
  function money(n){ return '$' + Number(n).toFixed(2); }
  function fail(msg){
    err.textContent = msg; err.style.display = 'block';
    var wa = $('waBtn'); if (wa){ wa.style.outline = '3px solid #25D366'; wa.scrollIntoView({behavior:'smooth', block:'center'}); }
    btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || 'Book & Pay';
  }
  function refresh(){
    var q = window.EJV_QUOTE;
    if (!q || !q.vehiculo || !(q.total > 0)){ panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    btn.setAttribute('data-label', 'Book & Pay ' + money(q.total));
    if (!btn.disabled) btn.textContent = btn.getAttribute('data-label');
  }
  btn.addEventListener('click', function(){
    err.style.display = 'none';
    var q = window.EJV_QUOTE;
    if (!q || !q.vehiculo){ fail('Please get your price first.'); return; }
    var name = $('bkName').value.trim(), phone = $('bkPhone').value.trim(), email = $('bkEmail').value.trim();
    if (!name || !phone || !email){ fail('Please complete your name, phone and email.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ fail('Please enter a valid email.'); return; }
    if (q.fecha && q.hora){
      var dt = new Date(q.fecha + 'T' + q.hora + ':00');
      if (dt.getTime() < Date.now() + 2*60*60*1000){
        fail('We take reservations at least 2 hours in advance. Please pick a later time — or book by WhatsApp below.'); return;
      }
    }
    btn.disabled = true; btn.textContent = 'Taking you to secure payment…';
    var payload = {
      tipo: q.tipo, vehiculo: q.vehiculo, legs: q.legs || [], horas: q.horas || null,
      sillaInfantil: !!q.sillaInfantil,
      cliente: name, telefono: phone, email: email, notas: $('bkNotes').value.trim(),
      fecha: q.fecha, hora: q.hora, recogida: q.recogida, destino: q.destino,
      parada: q.parada || null, pasajeros: q.pasajeros, maletas: q.maletas,
      vuelo: q.vuelo || null, prefAC: q.prefAC || null, prefRide: q.prefRide || null,
      regreso: q.regreso || null
    };
    fetch(CREATE_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      .then(function(r){ return r.json().then(function(j){ if (!r.ok || !j.url) throw new Error(j.error || 'checkout'); return j; }); })
      .then(function(j){ location.href = j.url; })
      .catch(function(){ fail('Something went wrong starting the payment. You can book by WhatsApp instead — the green button below.'); });
  });
  window.EJV_BOOKING = { refresh: refresh };
  refresh();
})();
