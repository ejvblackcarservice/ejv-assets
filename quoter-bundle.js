/* quoter-live-1.js */

var EJV_KEY = 'AIzaSyD6GvwTNTBAiJAzeBodR_34EyAJ57NIJew';
var RATES = {
  suv:       {name:'2025 SUV Premier',          base:20, mile:2.75, minute:1.95, minimum:60, hourly:100, hourlyMin:3},
  sedan:     {name:'Luxury Sedan',              base:20, mile:2.00, minute:1.95, minimum:60, hourly:80,  hourlyMin:2},
  xl:        {name:'XL Económico',          base:25, mile:2.00, minute:1.50, minimum:60, hourly:75, hourlyMin:3},
  economy:  {name:'Economy Sedan',  base:10, mile:2.00, minute:1.50, minimum:60, hourly:70, hourlyMin:2},
  wheelchair:{name:'Wheelchair Accessible Van', base:25, mile:2.00, minute:1.50, minimum:60, hourly:75,  hourlyMin:3}
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
;
/* quoter-live-2.js */
(function(){var MIN={suv:1.95,sedan:1.95,xl:1.50,economy:1.50,wheelchair:1.50};function $(id){return document.getElementById(id);}var q=$('ejvQuote');if(!q||$('stop'))return;var drop=$('dropWrap');var btn=document.createElement('button');btn.type='button';btn.id='addStopBtn';btn.textContent='+ Add a stop';btn.style.cssText='margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid #c9a24b;background:#171410;color:#e6c877;font-size:14px;cursor:pointer;width:100%;font-family:inherit;';var wrap=document.createElement('div');wrap.id='stopWrap';wrap.className='hidden';wrap.innerHTML='<label for="stop">Stop address</label><div class="fieldwrap"><input id="stop" type="text" placeholder="Stop address" autocomplete="off"><div class="ac" id="acStop"></div></div><button type="button" id="removeStopBtn" style="margin-top:8px;padding:9px 12px;border-radius:10px;border:1px solid #2a2a2e;background:#0e0e10;color:#f4f1ea;font-size:13px;cursor:pointer;">Remove stop</button>';drop.parentNode.insertBefore(btn,drop.nextSibling);drop.parentNode.insertBefore(wrap,btn.nextSibling);function hideStop(){wrap.classList.add('hidden');var s=$('stop');if(s)s.value='';if(window.places)places.stop=null;}btn.addEventListener('click',function(){wrap.classList.remove('hidden');btn.style.display='none';});wrap.querySelector('#removeStopBtn').addEventListener('click',function(){hideStop();btn.style.display='';});$('tabHr').addEventListener('click',function(){hideStop();btn.style.display='none';});$('tabP2p').addEventListener('click',function(){btn.style.display='';});try{if(window.places)places.stop=null;if(window.tokens)tokens.stop=uuid();attachAutocomplete('stop','acStop','stop');}catch(e){}var origFetch=window.fetch;window.fetch=function(url,opts){var stopEl=$('stop');var hasStop=stopEl&&stopEl.value.trim().length>0;var isRoutes=String(url).indexOf('computeRoutes')!==-1;if(isRoutes&&hasStop&&opts&&opts.body){try{var body=JSON.parse(opts.body);var sw=null;if(window.places&&places.stop&&places.stop.placeId)sw={placeId:places.stop.placeId};else sw={address:stopEl.value.trim()};body.intermediates=[sw];opts.body=JSON.stringify(body);}catch(e){}}return origFetch(url,opts);};var det=$('resDet');if(det){var obs=new MutationObserver(function(){var stopEl=$('stop');if(!stopEl||!stopEl.value.trim())return;if(det.innerHTML.indexOf('Stop: +15 min')!==-1)return;var per=MIN[$('vehicle').value]||1.95;var add=15*per;var amtEl=$('resAmt');if(!amtEl)return;var cur=parseFloat(amtEl.textContent.replace(/[^0-9.]/g,''));if(isNaN(cur))return;var total=cur+add;amtEl.textContent='$'+total.toFixed(2);det.innerHTML=det.innerHTML+'<br>Stop: +15 min (+$'+add.toFixed(2)+')';var wa=$('waBtn');if(wa){try{var parts=wa.href.split('text=');var txt=decodeURIComponent(parts[1]||'');txt=txt.replace(/Quoted fixed price: \$[0-9.]+/,'Quoted fixed price: $'+total.toFixed(2));txt=txt+' Stop: +15 min';wa.href='https://wa.me/19296984146?text='+encodeURIComponent(txt);}catch(e){}}});obs.observe(det,{childList:true,subtree:true});}})();
;
/* quoter-live-3.js */
(function(){if(window.__ejvC5)return;window.__ejvC5=true;var $=function(id){return document.getElementById(id);};var go0=$('goBtn');if(!go0)return;var tabs=document.querySelector('.tabs');var vehEl=$('vehicle'),paxEl=$('pax'),resBox=$('resBox'),resAmt=$('resAmt'),resDet=$('resDet'),waEl=$('waBtn'),errEl=$('errBox');if(!vehEl||!resBox||!resAmt||!resDet||!waEl)return;var origSetMode=window.setMode;var origFetch=window.fetch;var origQuote=window.quote;if(typeof origQuote!=='function')return;var R=RATES;function money(n){return '$'+Number(n).toFixed(2);}function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}function fmtWhen(d){try{return d.toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}catch(e){return '';}}function rawDt(ds,ts){if(!ds||!ts)return null;var d=new Date(ds+'T'+ts+':00');return isNaN(d.getTime())?null:d;}function addDays(ds,n){var d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);var m='0'+(d.getMonth()+1),dd='0'+d.getDate();return d.getFullYear()+'-'+m.slice(-2)+'-'+dd.slice(-2);}var lastRoute=null;if(origFetch&&!origFetch.__ejvW){var wf=function(url,opts){var p=origFetch.apply(this,arguments);try{if(typeof url==='string'&&url.indexOf('computeRoutes')>-1){p.then(function(res){try{var c=res.clone();c.json().then(function(data){if(data&&data.routes&&data.routes.length){var rt=data.routes[0];var mi=rt.distanceMeters/1609.344;var mn=parseInt(String(rt.duration).replace('s',''),10)/60;lastRoute={miles:mi,mins:mn};}}).catch(function(){});}catch(e){}}).catch(function(){});}}catch(e){}return p;};wf.__ejvW=true;window.fetch=wf;}var tabRt=document.createElement('button');tabRt.type='button';tabRt.id='ejvTabRt';tabRt.textContent='Round trip';tabRt.addEventListener('click',function(){window.setMode('rt');});if(tabs)tabs.appendChild(tabRt);var vehRow=vehEl.closest?vehEl.closest('.row'):null;if(!vehRow)vehRow=vehEl.parentNode;var rtDiv=document.createElement('div');rtDiv.id='ejvRtFields';rtDiv.style.display='none';rtDiv.style.marginTop='4px';rtDiv.innerHTML='<label for="ejvRtPickup">Return pickup</label><div class="fieldwrap"><input id="ejvRtPickup" type="text" placeholder="Return pickup address" autocomplete="off"><div class="ac" id="acRetPickup"></div></div><label for="ejvRtDropoff">Return drop-off</label><div class="fieldwrap"><input id="ejvRtDropoff" type="text" placeholder="Return drop-off address" autocomplete="off"><div class="ac" id="acRetDropoff"></div></div><div class="row"><div><label for="ejvRtDate">Return date</label><input id="ejvRtDate" type="date"></div><div><label for="ejvRtTime">Return time</label><input id="ejvRtTime" type="time"></div></div>';if(vehRow&&vehRow.parentNode)vehRow.parentNode.insertBefore(rtDiv,vehRow);var prefDiv=document.createElement('div');prefDiv.id='ejvPref';prefDiv.style.marginTop='14px';prefDiv.innerHTML='<div style="font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#a8a29a;margin:12px 0 6px;">Preferences</div><div style="font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#a8a29a;margin:8px 0 6px;">Air conditioning</div><div style="display:flex;gap:8px;"><button type="button" data-ac="Warm" style="flex:1;padding:10px 6px;border-radius:10px;border:1px solid #2a2a2e;background:#0e0e10;color:#a8a29a;font-size:14px;cursor:pointer;">Warm</button><button type="button" data-ac="Cool" style="flex:1;padding:10px 6px;border-radius:10px;border:1px solid #2a2a2e;background:#0e0e10;color:#a8a29a;font-size:14px;cursor:pointer;">Cool</button><button type="button" data-ac="Cold" style="flex:1;padding:10px 6px;border-radius:10px;border:1px solid #2a2a2e;background:#0e0e10;color:#a8a29a;font-size:14px;cursor:pointer;">Cold</button></div><div style="font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#a8a29a;margin:12px 0 6px;">Your ride</div><div style="display:flex;gap:8px;"><button type="button" data-ride="Quiet" style="flex:1;padding:10px 6px;border-radius:10px;border:1px solid #2a2a2e;background:#0e0e10;color:#a8a29a;font-size:14px;cursor:pointer;">Quiet</button><button type="button" data-ride="Open to chat" style="flex:1;padding:10px 6px;border-radius:10px;border:1px solid #2a2a2e;background:#0e0e10;color:#a8a29a;font-size:14px;cursor:pointer;">Open to chat</button></div>';if(vehRow&&vehRow.parentNode)vehRow.parentNode.insertBefore(prefDiv,vehRow.nextSibling);var airDiv=document.createElement('div');airDiv.id='ejvAir';airDiv.style.marginTop='14px';airDiv.innerHTML='<label class="chk"><input type="checkbox" id="ejvAirportChk"> This is an airport trip</label><p style="font-size:12px;color:#a8a29a;margin-top:6px;">We track the flight and adjust pickup if it changes.</p><div id="ejvFlightWrap" style="display:none;margin-top:8px;"><label for="ejvFlightNo">Flight number</label><input id="ejvFlightNo" type="text" placeholder="e.g. DL1234" autocomplete="off"></div>';var goBtn0=$('goBtn');if(goBtn0&&goBtn0.parentNode)goBtn0.parentNode.insertBefore(airDiv,goBtn0);var listEl=document.createElement('div');listEl.id='ejvVehList';listEl.style.display='none';listEl.style.marginTop='14px';var bookRow=resBox.querySelector('.bookrow');if(bookRow)resBox.insertBefore(listEl,bookRow);else resBox.appendChild(listEl);var prefAC='',prefRide='';var lastQ=null;function prefText(){var p=[];if(prefAC)p.push('Air conditioning: '+prefAC);if(prefRide)p.push('Ride: '+prefRide);return p.join(' · ');}function flightText(){var c=$('ejvAirportChk');if(!c||!c.checked)return '';var f=$('ejvFlightNo');var v=f?f.value.trim():'';return v?('Flight: '+v):'Flight: (not provided)';}function paintPrefs(){var bs=prefDiv.querySelectorAll('button');bs.forEach(function(b){var on=(b.getAttribute('data-ac')&&b.getAttribute('data-ac')===prefAC)||(b.getAttribute('data-ride')&&b.getAttribute('data-ride')===prefRide);b.style.borderColor=on?'#c9a24b':'#2a2a2e';b.style.color=on?'#e6c877':'#a8a29a';b.style.background=on?'#171410':'#0e0e10';});}var pbs=prefDiv.querySelectorAll('button');pbs.forEach(function(b){b.addEventListener('click',function(){var a=b.getAttribute('data-ac'),r=b.getAttribute('data-ride');if(a)prefAC=(prefAC===a?'':a);if(r)prefRide=(prefRide===r?'':r);paintPrefs();if(lastQ)refresh();});});var airChk=$('ejvAirportChk'),flWrap=$('ejvFlightWrap'),flEl=$('ejvFlightNo');if(airChk)airChk.addEventListener('change',function(){flWrap.style.display=airChk.checked?'block':'none';if(lastQ)refresh();});if(flEl)flEl.addEventListener('input',function(){if(lastQ)refresh();});if(typeof places!=='undefined'){places.rtPickup=null;places.rtDropoff=null;}if(typeof tokens!=='undefined'&&typeof uuid==='function'){tokens.rtPickup=uuid();tokens.rtDropoff=uuid();}if(typeof attachAutocomplete==='function'){try{attachAutocomplete('ejvRtPickup','acRetPickup','rtPickup');}catch(e){}try{attachAutocomplete('ejvRtDropoff','acRetDropoff','rtDropoff');}catch(e){}}function getStopEl(){var s=document.querySelector('input[placeholder*="Stop"]');if(s)return s;var ins=document.querySelectorAll('input[type="text"]');for(var i=0;i<ins.length;i++){var id=ins[i].id;if(id&&id!=='pickup'&&id!=='dropoff'&&id!=='ejvRtPickup'&&id!=='ejvRtDropoff'&&id!=='ejvFlightNo')return ins[i];}return null;}function fareFor(v,mi,mn,stop){var r=R[v];var f=Math.max(r.base+mi*r.mile+mn*r.minute,r.minimum);if(stop)f+=15*r.minute;return f;}function nightFee(ts){if(!ts)return 0;var h=parseInt(String(ts).slice(0,2),10);if(isNaN(h))return 0;return (h>=22||h<6)?10:0;}function buildDet(){var q=lastQ;if(!q)return '';var r=R[q.selected];var L=[];if(q.mode==='hr'){L.push('<b>'+q.hrs+' hours</b> with your private chauffeur');}else{L.push('<b>'+q.outMiles.toFixed(1)+' miles</b> · about <b>'+Math.round(q.outMins)+' min</b> drive');if(q.mode==='rt'){L.push('Return: <b>'+q.retMiles.toFixed(1)+' miles</b> · about <b>'+Math.round(q.retMins)+' min</b>');}}L.push('Vehicle: '+r.name+' · Passengers: '+q.pax+(q.extra?' · Child car seat':''));var pt=prefText();if(pt)L.push(esc(pt));var ft=flightText();if(ft)L.push(esc(ft));if(q.mode==='hr'){L.push('Pickup: '+esc(q.from));L.push('When: '+esc(q.when));}else{L.push('From: '+esc(q.from));L.push('To: '+esc(q.to));L.push('When: '+esc(q.when));if(q.stop)L.push('Stop: '+esc(q.stop)+' (+'+money(15*R[q.selected].minute)+')');if(q.mode==='rt'){L.push('Return pickup: '+esc(q.retFrom));L.push('Return drop-off: '+esc(q.retTo));L.push('Return when: '+esc(q.retWhen));L.push('Outbound price: '+money(q.totalsOut[q.selected]));L.push('Return price: '+money(q.totalsRet[q.selected]));}}return L.join('<br>');}function buildWA(){var q=lastQ;if(!q)return waEl.href;var r=R[q.selected];var NL=String.fromCharCode(10);var L=[];if(q.mode==='hr'){L.push('Hello EJV! I want to book the HOURLY service.');L.push('Pickup: '+q.from);L.push('When: '+q.when);L.push('Hours: '+q.hrs);}else{L.push('Hello EJV! I want to book a ride.');L.push('From: '+q.from);L.push('To: '+q.to);L.push('When: '+q.when);if(q.stop)L.push('Stop: '+q.stop);}L.push('Vehicle: '+r.name+' · Passengers: '+q.pax+(q.extra?' · Child car seat':''));var pt=prefText();if(pt)L.push(pt);var ft=flightText();if(ft)L.push(ft);if(q.mode==='hr'){L.push('Quoted price: '+money(q.totals[q.selected]));}else{if(q.mode==='rt'){L.push('Return pickup: '+q.retFrom);L.push('Return drop-off: '+q.retTo);L.push('Return when: '+q.retWhen);L.push('Return distance: '+q.retMiles.toFixed(1)+' mi · ~'+Math.round(q.retMins)+' min');L.push('Outbound price: '+money(q.totalsOut[q.selected]));L.push('Return price: '+money(q.totalsRet[q.selected]));}L.push('Distance: '+q.outMiles.toFixed(1)+' mi · ~'+Math.round(q.outMins)+' min');L.push('Quoted fixed price: '+money(q.totals[q.selected]-(q.stop?15*R[q.selected].minute:0)));}return 'https://wa.me/19296984146?text='+encodeURIComponent(L.join(NL));}function refresh(){if(!lastQ)return;var q=lastQ;resAmt.textContent=money(q.totals[q.selected]-(q.stop?15*R[q.selected].minute:0));resDet.innerHTML=buildDet();waEl.href=buildWA();}function renderList(){if(!lastQ)return;var q=lastQ;var rows=[];['suv','sedan','xl','economy','wheelchair'].forEach(function(v){if(!R[v])return;var on=v===q.selected;rows.push('<div data-v="'+v+'" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:10px;cursor:pointer;margin-top:6px;border:1px solid '+(on?'#c9a24b':'#2a2a2e')+';background:'+(on?'#171410':'#0e0e10')+';"><span style="font-size:14px;color:'+(on?'#e6c877':'#f4f1ea')+';">'+R[v].name+'</span><b style="color:#e6c877;font-size:15px;">'+money(q.totals[v])+'</b></div>');});listEl.innerHTML='<div style="font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#a8a29a;margin-bottom:2px;">All vehicles — total price</div>'+rows.join('');listEl.style.display='block';var ds=listEl.querySelectorAll('[data-v]');ds.forEach(function(d){d.addEventListener('click',function(){var v=d.getAttribute('data-v');if(R[v]){q.selected=v;var ve=$('vehicle');if(ve)ve.value=v;refresh();renderList();}});});}vehEl.addEventListener('change',function(){if(lastQ&&R[vehEl.value]){lastQ.selected=vehEl.value;refresh();renderList();}});window.setMode=function(m){if(m==='rt'){if(origSetMode)origSetMode('p2p');window.mode='rt';var tp=$('tabP2p'),th=$('tabHr');if(tp)tp.classList.remove('on');if(th)th.classList.remove('on');tabRt.classList.add('on');var dw=$('dropWrap');if(dw)dw.classList.remove('hidden');var hw=$('hoursWrap');if(hw)hw.classList.add('hidden');rtDiv.style.display='block';var pk=$('pickup'),dr=$('dropoff'),dt=$('date'),tm=$('time');var rp=$('ejvRtPickup'),rd=$('ejvRtDropoff'),rdate=$('ejvRtDate'),rtime=$('ejvRtTime');if(rp&&dr)rp.value=dr.value;if(rd&&pk)rd.value=pk.value;if(rdate&&dt&&dt.value)rdate.value=addDays(dt.value,1);if(rtime&&tm)rtime.value=tm.value;return;}if(origSetMode)origSetMode(m);tabRt.classList.remove('on');rtDiv.style.display='none';};function waitRes(){return new Promise(function(resolve){var t0=Date.now();var iv=setInterval(function(){if(errEl&&errEl.style.display==='block'){clearInterval(iv);resolve(false);}else if(resBox.style.display==='block'&&resAmt.textContent){clearInterval(iv);resolve(true);}else if(Date.now()-t0>15000){clearInterval(iv);resolve(false);}},200);});}async function ejvQuote(){var m=window.mode;var isHr=(m==='hr');var hw0=$('hoursWrap');if(hw0&&hw0.classList)isHr=!hw0.classList.contains('hidden');var btn=$('goBtn');if(btn){btn.disabled=true;btn.textContent='Calculating…';}var veh=vehEl.value;var extra=($('carseat')&&$('carseat').checked)?20:0;var pax=paxEl?paxEl.value:'1';var dt0=rawDt($('date').value,$('time').value);var whenStr=dt0?fmtWhen(dt0):'';if(isHr){resBox.style.display='none';listEl.style.display='none';try{origQuote();}catch(e){}var ok=await waitRes();if(!ok){if(btn){btn.disabled=false;btn.textContent='Get My Price';}return;}var hm=(R[veh]&&R[veh].hourlyMin)||3;var hrs=Math.max(parseInt($('hours').value||'0',10),hm);var totals={};['suv','sedan','xl','economy','wheelchair'].forEach(function(v){if(R[v])totals[v]=hrs*R[v].hourly+extra+nightFee($('time').value);});var q={mode:'hr',selected:veh,totals:totals,hrs:hrs,pax:pax,extra:extra,from:($('pickup').value||'').trim(),when:whenStr};lastQ=q;refresh();renderList();resBox.style.display='block';if(btn){btn.disabled=false;btn.textContent='Get My Price';}return;}var stopEl=getStopEl();var stopVal=stopEl?stopEl.value.trim():'';var outFrom=($('pickup').value||'').trim(),outTo=($('dropoff').value||'').trim();var isRt=(m==='rt');var retFrom='',retTo='',retWhen='',retDateV='',retTimeV='';if(isRt){retFrom=($('ejvRtPickup').value||'').trim();retTo=($('ejvRtDropoff').value||'').trim();retDateV=$('ejvRtDate').value;retTimeV=$('ejvRtTime').value;if(!retFrom||!retTo||!retDateV||!retTimeV){alert('Please enter the return pickup, drop-off, date and time.');if(btn){btn.disabled=false;btn.textContent='Get My Price';}return;}}resBox.style.display='none';listEl.style.display='none';lastRoute=null;try{origQuote();}catch(e){}var ok2=await waitRes();if(!ok2){if(btn){btn.disabled=false;btn.textContent='Get My Price';}return;}await new Promise(function(r){setTimeout(r,400);});var outMi=lastRoute?lastRoute.miles:0,outMn=lastRoute?lastRoute.mins:0;var retMi=0,retMn=0;if(isRt){var svPk=$('pickup').value,svDr=$('dropoff').value,svDt=$('date').value,svTm=$('time').value;var svPlP=(typeof places!=='undefined')?places.pickup:null,svPlD=(typeof places!=='undefined')?places.dropoff:null;var svStop=stopEl?stopEl.value:'';$('pickup').value=retFrom;$('dropoff').value=retTo;$('date').value=retDateV;$('time').value=retTimeV;if(typeof places!=='undefined'){places.pickup=places.rtPickup||null;places.dropoff=places.rtDropoff||null;}if(stopEl)stopEl.value='';resBox.style.display='none';lastRoute=null;try{origQuote();}catch(e){}var ok3=await waitRes();if(!ok3){$('pickup').value=svPk;$('dropoff').value=svDr;$('date').value=svDt;$('time').value=svTm;if(typeof places!=='undefined'){places.pickup=svPlP;places.dropoff=svPlD;}if(stopEl)stopEl.value=svStop;if(btn){btn.disabled=false;btn.textContent='Get My Price';}return;}await new Promise(function(r){setTimeout(r,400);});retMi=lastRoute?lastRoute.miles:0;retMn=lastRoute?lastRoute.mins:0;$('pickup').value=svPk;$('dropoff').value=svDr;$('date').value=svDt;$('time').value=svTm;if(typeof places!=='undefined'){places.pickup=svPlP;places.dropoff=svPlD;}if(stopEl)stopEl.value=svStop;}var totals2={},totalsOut={},totalsRet={};['suv','sedan','xl','economy','wheelchair'].forEach(function(v){if(!R[v])return;var of=fareFor(v,outMi,outMn,!!stopVal)+extra+nightFee($('time').value);totalsOut[v]=of;var rf=0;if(isRt)rf=fareFor(v,retMi,retMn,false)+nightFee(retTimeV);totalsRet[v]=rf;totals2[v]=of+rf;});var retDt=rawDt(retDateV,retTimeV);var retWhenStr=retDt?fmtWhen(retDt):'';var q2={mode:isRt?'rt':'p2p',selected:veh,totals:totals2,totalsOut:totalsOut,totalsRet:totalsRet,outMiles:outMi,outMins:outMn,retMiles:retMi,retMins:retMn,from:outFrom,to:outTo,when:whenStr,stop:stopVal,pax:pax,extra:extra,retFrom:retFrom,retTo:retTo,retWhen:retWhenStr};lastQ=q2;refresh();renderList();resBox.style.display='block';if(btn){btn.disabled=false;btn.textContent='Get My Price';}}var nb=go0.cloneNode(true);go0.parentNode.replaceChild(nb,go0);nb.addEventListener('click',ejvQuote);})();
;
/* quoter-live-4.js */

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
;
/* quoter-live-5.js */
(function(){function $(i){return document.getElementById(i);}function n(t){var v=parseFloat(String(t||'').replace(/[^0-9.]/g,''));return isNaN(v)?0:v;}function upd(){try{var b=$('resBox'),a=$('resAmt');if(!b||!a)return;if(b.style.display==='none'){window.EJV_QUOTE=null;if(window.EJV_BOOKING)window.EJV_BOOKING.refresh();return;}var tot=n(a.textContent);if(!(tot>0))return;var v=$('vehicle');if(!v||!v.value)return;var isHr=$('hoursWrap')&&!$('hoursWrap').classList.contains('hidden');var rt=$('ejvTabRt');var isRt=(rt&&rt.classList.contains('on'))||window.mode==='rt';var tipo=isRt?'round':(isHr?'hourly':'p2p');var txt=$('resDet')?$('resDet').textContent:'';var pr=[];var re=/([0-9]+(?:\.[0-9]+)?)\s*miles[^0-9]*?([0-9]+)\s*min/g;var m;while((m=re.exec(txt))!==null)pr.push({miles:parseFloat(m[1]),minutes:parseInt(m[2],10)});var stop=$('stop').value.trim()||null;var legs=[];if(tipo==='round'){if(pr[0])legs.push({miles:pr[0].miles,minutes:pr[0].minutes,stop:!!stop});if(pr[1])legs.push({miles:pr[1].miles,minutes:pr[1].minutes,stop:false});}else if(tipo==='p2p'&&pr[0])legs.push({miles:pr[0].miles,minutes:pr[0].minutes,stop:!!stop});var ac=null,ride=null;var pd=$('ejvPref');if(pd){var bs=pd.querySelectorAll('button');for(var i=0;i<bs.length;i++){var bc=bs[i].style.borderColor||'',bg=bs[i].style.background||'';if(bc==='rgb(201, 162, 75)'||bc==='#c9a24b'||bg==='rgb(23, 20, 16)'){if(bs[i].getAttribute('data-ac'))ac=bs[i].getAttribute('data-ac');if(bs[i].getAttribute('data-ride'))ride=bs[i].getAttribute('data-ride');}}}var fl=$('ejvFlightNo'),ak=$('ejvAirportChk');var vuelo=(ak&&ak.checked&&fl&&fl.value.trim())?fl.value.trim():null;var q={tipo:tipo,vehiculo:v.value,total:tot,legs:legs,horas:isHr?parseInt($('hours').value,10)||null:null,sillaInfantil:!!($('carseat')&&$('carseat').checked),fecha:$('date').value,hora:$('time').value,recogida:$('pickup').value.trim(),destino:$('dropoff').value.trim(),parada:stop,pasajeros:parseInt($('pax').value,10)||null,maletas:null,vuelo:vuelo,prefAC:ac,prefRide:ride,regreso:null};if(tipo==='round'){q.regreso={fecha:($('ejvRtDate')||$('ejvRetDate')||{}).value||null,hora:($('ejvRtTime')||$('ejvRetTime')||{}).value||null,recogida:($('ejvRtPickup')||{}).value||$('dropoff').value.trim()||null,destino:($('ejvRtDropoff')||{}).value||$('pickup').value.trim()||null};}window.EJV_QUOTE=q;if(window.EJV_BOOKING)window.EJV_BOOKING.refresh();}catch(e){}}var rb=$('resBox');if(rb)new MutationObserver(function(){setTimeout(upd,50);}).observe(rb,{childList:true,subtree:true,attributes:true,characterData:true});document.addEventListener('click',function(){setTimeout(upd,300);});window.EJV_QUOTE_UPDATE=upd;})();;
/* quoter-live-6.js */
(function(){var F=window.fetch;window.fetch=function(u,o){var p=F.apply(this,arguments);try{return p.then(function(r){try{var c=r.clone();c.json().then(function(j){if(j&&j.url){try{window.top.location.href=j.url;}catch(e){}}}).catch(function(){});}catch(e){}return r;});}catch(e){return p;}};})();;
/* quoter-live-7.js */
var _gb=document.getElementById('goBtn');if(_gb)_gb.addEventListener('click',function(){window.__EJV_LEGS=[];},true);setInterval(function(){var q=window.EJV_QUOTE,L=window.__EJV_LEGS;if(q&&L)q.legs=q.tipo==='hourly'?[]:L;},500);;
/* meetgreet.js */
/* EJV — quoter patches loaded by a one-line <script src> tag appended to the GoDaddy embed (the embed field is at its size limit): (1-4) Meet & Greet add-on (+$50), (5) optional driver tip at checkout (12/18/20%, 12% preselected — added 2026-11-11). Source of truth: ~/workspace/ejv-quoter/meetgreet.js — keep this GitHub copy in sync. */
(function(){
  if (window.__ejvMG) return; window.__ejvMG = true;
  var FEE = 50;
  function $(id){ return document.getElementById(id); }
  function money(n){ return '$' + Number(n).toFixed(2); }

  /* 0) REMOVED 2026-11-18: the old hours-note rewrite was deleted when EJV switched to 24/7 service by advance reservation. Do NOT re-add. */

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
;
