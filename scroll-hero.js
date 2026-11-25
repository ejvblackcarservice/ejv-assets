(function(){
var sec=document.getElementById('ejvScroll');
if(!sec)return;
function breakout(){var w=document.documentElement.clientWidth;sec.style.width=w+'px';sec.style.maxWidth=w+'px';sec.style.marginLeft='0px';var l1=sec.getBoundingClientRect().left;sec.style.marginLeft=(-l1)+'px';var l2=sec.getBoundingClientRect().left;if(l2){sec.style.marginLeft=(-l1-l2)+'px';}}
breakout();
var N=60,BASE='https://ejvblackcarservice.com/wp-content/uploads/2026/11/scroll-',cv=document.getElementById('ejvCv'),ctx=cv.getContext('2d');
var imgs=[],loaded=[],nLoaded=0,i,im;
for(i=0;i<N;i++){loaded[i]=0;im=new Image();(function(k,img){img.onload=function(){loaded[k]=1;nLoaded++;};})(i,im);im.src=BASE+String(i+1).padStart(3,'0')+'.jpg';imgs[i]=im;}
var msgs=[].slice.call(sec.querySelectorAll('.ejv-m')),fin=sec.querySelector('.ejv-fin'),hint=sec.querySelector('.ejv-hint');
var cur=0;
function prog(){var total=sec.offsetHeight-window.innerHeight;if(total<=0)return 0;var y=-(sec.getBoundingClientRect().top);var p=y/total;return Math.max(0,Math.min(1,p));}
function draw(f){var img=imgs[f];if(!img||!loaded[f]){img=null;for(var d=1;d<N;d++){if(f-d>=0&&loaded[f-d]){img=imgs[f-d];break;}if(f+d<N&&loaded[f+d]){img=imgs[f+d];break;}}if(!img)return;}
var W=cv.width,H=cv.height,iw=img.naturalWidth,ih=img.naturalHeight;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
var dw,dh,dx,dy;
if(W/H>=1){var s=Math.max(W/iw,H/ih);dw=iw*s;dh=ih*s;dx=(W-dw)/2;dy=(H-dh)/2;}
else{dw=W;dh=W/(iw/ih);dx=0;dy=H*0.07;}
ctx.drawImage(img,dx,dy,dw,dh);}
function size(){breakout();var st=sec.querySelector('.ejv-stage');cv.width=st.clientWidth;cv.height=st.clientHeight;}
function setMsgs(p){var ranges=[[0.0,0.24],[0.30,0.54],[0.58,0.80]];msgs.forEach(function(m,i){var r=ranges[i];var o=0;if(p>r[0]&&p<r[1]){o=Math.min(1,(p-r[0])/0.05,(r[1]-p)/0.05);}m.style.opacity=o;});var fo=p>0.84?Math.min(1,(p-0.84)/0.06):0;fin.style.opacity=fo;fin.style.pointerEvents=fo>0.5?'auto':'none';hint.style.opacity=p<0.04?1:0;}
function loop(){var p=prog();var tgt=p*(N-1);cur+=(tgt-cur)*0.12;if(Math.abs(tgt-cur)<0.02)cur=tgt;draw(Math.round(cur));setMsgs(p);requestAnimationFrame(loop);}
size();window.addEventListener('resize',size);window.addEventListener('load',function(){breakout();size();});setTimeout(function(){breakout();size();},600);
if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){sec.style.height='100vh';var w=setInterval(function(){if(loaded[N-1]){draw(N-1);fin.style.opacity=1;fin.style.pointerEvents='auto';hint.style.opacity=0;clearInterval(w);}},200);}
else{requestAnimationFrame(loop);}
setTimeout(function(){if(nLoaded===0){sec.style.height='100vh';fin.style.opacity=1;fin.style.pointerEvents='auto';hint.style.opacity=0;}},6000);
var btn=sec.querySelector('.ejv-btn-q');if(btn){btn.addEventListener('click',function(e){e.preventDefault();var r=sec.getBoundingClientRect();var y=r.bottom+window.scrollY-window.innerHeight+30;window.scrollTo({top:y,behavior:'smooth'});});}
})();
