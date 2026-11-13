
var EJV_KEY = 'AIzaSyD6GvwTNTBAiJAzeBodR_34EyAJ57NIJew';
var RATES = {
  suv:       {name:'2025 SUV Premier',          base:20, mile:2.75, minute:1.95, minimum:60, hourly:100, hourlyMin:3},
  sedan:     {name:'Sedan Premier',              base:10, mile:2.00, minute:1.95, minimum:60, hourly:80,  hourlyMin:2},
  xl:        {name:'XL Comfort Van',          base:20, mile:2.00, minute:1.60, minimum:60, hourly:100, hourlyMin:3},
  wheelchair:{name:'Wheelchair Accessible Van', base:20, mile:2.00, minute:1.60, minimum:60, hourly:70,  hourlyMin:3}
};
var mode = 'p2p';
var places = {pickup:null, dropoff:null};
var tokens = {pickup:uuid(), dropoff:uuid()};

function $(id){ return document.getElementById(id); }
function money(n){ return '$' + n.toFixed(2); }
function uuid(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
  var r = Math.random()*16|0, v = c==='x' ? r : (r&0x3|0x8); return v.toString(16); }); }
function showErr(msg){ var e=$('errBox'); e.textContent=msg; e.style.display='block'; }
function hideErr(){ $('errBox').style.display='none'; }

function setMode(m){
  mode = m;
  $('tabP2p').classList.toggle('on', m==='p2p');
  $('tabHr').classList.toggle('on', m==='hr');
  $('dropWrap').classList.toggle('hidden', m==='hr');
  $('hoursWrap').classList.toggle('hidden', m==='p2p');
  applyHourlyMin();
}
function applyHourlyMin(){
  var r = RATES[$('vehicle').value];
  var h = $('hours');
  h.min = r.hourlyMin;
  if (parseInt(h.value||'0',10) < r.hourlyMin) h.value = r.hourlyMin;
}
$('tabP2p').addEventListener('click', function(){ setMode('p2p'); });
$('tabHr').addEventListener('click', function(){ setMode('hr'); });
$('vehicle').addEventListener('change', applyHourlyMin);

/* --- Places API (New) autocomplete, REST --- */
function attachAutocomplete(inputId, listId, key){
  var input = $(inputId), list = $(listId), timer = null;
  input.addEventListener('input', function(){
    places[key] = null;
    var q = input.value.trim();
    clearTimeout(timer);
    if (q.length < 3){ list.style.display='none'; list.innerHTML=''; return; }
    timer = setTimeout(function(){
      fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'X-Goog-Api-Key': EJV_KEY,
          'X-Goog-FieldMask':'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat'
        },
        body: JSON.stringify({input:q, sessionToken:tokens[key], languageCode:'en', regionCode:'US'})
      })
      .then(function(r){ return r.json(); })
      .then(function(data){
        list.innerHTML='';
        var sugs = (data && data.suggestions) || [];
        if (!sugs.length){ list.style.display='none'; return; }
        sugs.slice(0,6).forEach(function(s){
          var p = s.placePrediction; if (!p) return;
          var main = (p.structuredFormat && p.structuredFormat.mainText) ? p.structuredFormat.mainText.text : '';
          var sec  = (p.structuredFormat && p.structuredFormat.secondaryText) ? p.structuredFormat.secondaryText.text : '';
          var item = document.createElement('div');
          item.innerHTML = '';
          item.appendChild(document.createTextNode(main));
          if (sec){ var sm = document.createElement('small'); sm.textContent = sec; item.appendChild(sm); }
          item.addEventListener('click', function(){
            var lbl = sec ? main + ', ' + sec : main;
            input.value = lbl;
            places[key] = {placeId: p.placeId, label: lbl};
            tokens[key] = uuid();
            list.style.display='none'; list.innerHTML='';
          });
          list.appendChild(item);
        });
        list.style.display='block';
      })
      .catch(function(){ list.style.display='none'; });
    }, 250);
  });
  document.addEventListener('click', function(e){
    if (e.target !== input) { list.style.display='none'; }
  });
}
attachAutocomplete('pickup','acPickup','pickup');
attachAutocomplete('dropoff','acDropoff','dropoff');

(function(){
  var today = new Date();
  var iso = today.toISOString().slice(0,10);
  $('date').min = iso; $('date').value = iso;
})();

function pickupDateTime(){
  var d = $('date').value, t = $('time').value;
  if (!d || !t) return null;
  var dt = new Date(d + 'T' + t + ':00');
  return isNaN(dt.getTime()) ? null : dt;
}
function waypoint(inputId, key){
  if (places[key] && places[key].placeId) return {placeId: places[key].placeId};
  var txt = $(inputId).value.trim();
  return txt ? {address: txt} : null;
}
function label(inputId, key){
  if (places[key] && places[key].label) return places[key].label;
  return $(inputId).value.trim();
}

function quote(){
  hideErr();
  var veh = $('vehicle').value, r = RATES[veh];
  var extra = $('carseat').checked ? 20 : 0;
  var dt = pickupDateTime();
  var now = new Date();
  if (!dt){ showErr('Please pick a date and pickup time so we can price traffic correctly.'); return; }
  var btn = $('goBtn'); btn.disabled = true; btn.textContent = 'Calculating…';

  function finish(total, detHtml, waText){
    $('resAmt').textContent = money(total);
    $('resDet').innerHTML = detHtml;
    $('waBtn').href = 'https://wa.me/19296984146?text=' + encodeURIComponent(waText);
    $('resBox').style.display = 'block';
    btn.disabled = false; btn.textContent = 'Get My Price';
    $('resBox').scrollIntoView({behavior:'smooth', block:'nearest'});
  }
  var whenTxt = dt.toLocaleString('en-US',{weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'});
  var common = 'Vehicle: ' + r.name + ' · Passengers: ' + $('pax').value +
               (extra ? ' · Child car seat' : '');

  if (mode === 'hr'){
    var hrs = Math.max(parseInt($('hours').value||'0',10), r.hourlyMin);

window.__EJV_LEGS=[];    var totalH = hrs * r.hourly + extra;
    finish(totalH,
      '<b>' + hrs + ' hours</b> with your private chauffeur<br>' + common +
      '<br>Pickup: ' + label('pickup','pickup') + '<br>When: ' + whenTxt,
      'Hello EJV! I want to book the HOURLY service.\nPickup: ' + label('pickup','pickup') +
      '\nWhen: ' + whenTxt + '\nHours: ' + hrs + '\n' + common + '\nQuoted price: ' + money(totalH));
    return;
  }

  var o = waypoint('pickup','pickup'), d = waypoint('dropoff','dropoff');
  if (!o || !d){ btn.disabled=false; btn.textContent='Get My Price';
    showErr('Please enter a pickup and a drop-off location.'); return; }

  var dep = dt.getTime() < now.getTime() + 15*60000
    ? new Date(now.getTime() + 15*60000) : dt;
  fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'X-Goog-Api-Key': EJV_KEY,
      'X-Goog-FieldMask':'routes.distanceMeters,routes.duration'
    },
    body: JSON.stringify({
      origin: o, destination: d, travelMode:'DRIVE',
      routingPreference:'TRAFFIC_AWARE',
      departureTime: dep.toISOString(), units:'IMPERIAL'
    })
  })
  .then(function(res){ return res.json(); })
  .then(function(data){
    if (!data.routes || !data.routes.length) throw new Error('noroute');
    var route = data.routes[0];
    var miles = route.distanceMeters / 1609.344;
    var mins = parseInt(String(route.duration).replace('s',''), 10) / 60;

window.__EJV_LEGS=(window.__EJV_LEGS||[]);if(window.__EJV_LEGS.length>=2)window.__EJV_LEGS=[];window.__EJV_LEGS.push({miles:miles,minutes:mins,stop:!!($('stop')&&$('stop').value.trim())});    var fare = Math.max(r.base + miles*r.mile + mins*r.minute, r.minimum) + extra;
    finish(fare,
      '<b>' + miles.toFixed(1) + ' miles</b> · about <b>' + Math.round(mins) + ' min</b> drive at that time<br>' +
      common + '<br>From: ' + label('pickup','pickup') + '<br>To: ' + label('dropoff','dropoff') +
      '<br>When: ' + whenTxt,
      'Hello EJV! I want to book a ride.\nFrom: ' + label('pickup','pickup') +
      '\nTo: ' + label('dropoff','dropoff') + '\nWhen: ' + whenTxt + '\n' + common +
      '\nDistance: ' + miles.toFixed(1) + ' mi · ~' + Math.round(mins) + ' min' +
      '\nQuoted fixed price: ' + money(fare));
  })
  .catch(function(){
    btn.disabled = false; btn.textContent = 'Get My Price';
    showErr('We could not price that route automatically. Call or WhatsApp (929) 698-4146 and we will quote you right away.');
  });
}
$('goBtn').addEventListener('click', quote);
