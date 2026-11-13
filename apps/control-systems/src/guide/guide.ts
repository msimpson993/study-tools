// @ts-nocheck
/* Legacy interactive guide, migrated 1:1 from the original single-file page (course-topics-guide.html).
   The top bar, table of contents, theme switch and Variables panel were dropped: @study/core supplies them.
   The widget code below is the original script unchanged, except: no theme code, no scroll tracking, lightbox mounts in the host. */
import GUIDE_HTML from './guide.html?raw';
import img1 from './img/annot1_slide40_LRC_ABCD.webp';
import img2 from './img/annot2_slide28_TF_from_ABCD.webp';
import img3 from './img/annot3_LRC_walkthrough_board.webp';

import './guide.css';
import './host.css';

export function mountGuide(host: HTMLElement) {
host.classList.add('legacy-board');
host.innerHTML = GUIDE_HTML;
/* the three annotated slide images the guide links to (originally ../lrc-ss/annotated/*.png) */
const IMGS = { annot1_slide40_LRC_ABCD: img1, annot2_slide28_TF_from_ABCD: img2, annot3_LRC_walkthrough_board: img3 };
host.querySelectorAll('a[href^="LRCIMG/"]').forEach((a) => { const k = a.getAttribute('href').replace(/^LRCIMG\//, '').replace(/\.png$/, ''); fetch(IMGS[k]).then((r) => r.blob()).then((b) => { a.href = URL.createObjectURL(b); a.target = '_blank'; a.rel = 'noopener'; }); });

(function(){
"use strict";
var $=function(id){return document.getElementById(id);};
/* theme: owned by @study/core */

/* ---------- tiny SVG plotting ---------- */
function nice(lo,hi,n){var span=hi-lo||1,step=Math.pow(10,Math.floor(Math.log10(span/n))),err=span/n/step;
  if(err>=7.5)step*=10;else if(err>=3.5)step*=5;else if(err>=1.5)step*=2;
  var t=[],v=Math.ceil(lo/step-1e-9)*step;for(;v<=hi+1e-9*step;v+=step)t.push(+v.toFixed(10));return t;}
function fmt(v){var a=Math.abs(v);if(a>=1000||(a<0.01&&a>0))return v.toExponential(0);return +v.toFixed(3)+"";}
var uid=0;
function plot(o){
  var W=o.w||640,H=o.h||230,L=o.ml||50,R=14,T=o.mt||12,B=o.xlabel?38:22,pw=W-L-R,ph=H-T-B,id="cp"+(uid++);
  var xr=o.xr,yr=o.yr,lx=!!o.logx;
  function X(x){return L+(lx?(Math.log10(x)-Math.log10(xr[0]))/(Math.log10(xr[1])-Math.log10(xr[0])):(x-xr[0])/(xr[1]-xr[0]))*pw;}
  function Y(y){return T+(1-(y-yr[0])/(yr[1]-yr[0]))*ph;}
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(o.aria||"plot")+'"><defs><clipPath id="'+id+'"><rect x="'+L+'" y="'+T+'" width="'+pw+'" height="'+ph+'"/></clipPath></defs>';
  var xt=lx?(function(){var a=[];for(var e=Math.ceil(Math.log10(xr[0]));e<=Math.floor(Math.log10(xr[1]));e++)a.push(Math.pow(10,e));return a;})():nice(xr[0],xr[1],o.nx||8);
  var yt=o.yt||nice(yr[0],yr[1],o.ny||5);
  xt.forEach(function(v){s+='<line class="gridl" x1="'+X(v)+'" x2="'+X(v)+'" y1="'+T+'" y2="'+(T+ph)+'"/><text class="tk" x="'+X(v)+'" y="'+(T+ph+14)+'" text-anchor="middle">'+(lx?(v>=1?v:v):fmt(v))+'</text>';});
  yt.forEach(function(v){s+='<line class="gridl" x1="'+L+'" x2="'+(L+pw)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text class="tk" x="'+(L-6)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+fmt(v)+'</text>';});
  s+='<rect class="ax" x="'+L+'" y="'+T+'" width="'+pw+'" height="'+ph+'"/>';
  if(o.xlabel)s+='<text class="lb" x="'+(L+pw/2)+'" y="'+(H-4)+'" text-anchor="middle">'+o.xlabel+'</text>';
  if(o.ylabel)s+='<text class="lb" transform="translate(12,'+(T+ph/2)+') rotate(-90)" text-anchor="middle">'+o.ylabel+'</text>';
  s+='<g clip-path="url(#'+id+')">';
  (o.bands||[]).forEach(function(b){s+='<rect class="band" x="'+L+'" width="'+pw+'" y="'+Y(b.y1)+'" height="'+(Y(b.y0)-Y(b.y1))+'"/>';});
  (o.vbands||[]).forEach(function(b){s+='<rect class="'+(b.cls||"band")+'" y="'+T+'" height="'+ph+'" x="'+X(b.x0)+'" width="'+(X(b.x1)-X(b.x0))+'"/>';});
  (o.series||[]).forEach(function(sr){
    var n=sr.x.length,step=Math.max(1,Math.floor(n/900)),d="",lo=yr[0]-(yr[1]-yr[0])*2,hi=yr[1]+(yr[1]-yr[0])*2;
    for(var i=0;i<n;i+=step){if(lx&&sr.x[i]<=0)continue;var yy=Math.max(lo,Math.min(hi,sr.y[i]));d+=(d?"L":"M")+X(sr.x[i]).toFixed(1)+","+Y(yy).toFixed(1);}
    if((n-1)%step){var yl=Math.max(lo,Math.min(hi,sr.y[n-1]));d+="L"+X(sr.x[n-1]).toFixed(1)+","+Y(yl).toFixed(1);}
    if(sr.area){s+='<path class="area" d="'+d+'L'+X(sr.x[n-1]).toFixed(1)+','+Y(0).toFixed(1)+'L'+X(sr.x[0]).toFixed(1)+','+Y(0).toFixed(1)+'Z"/>';}
    s+='<path class="ln '+(sr.cls||"s1")+'" d="'+d+'"'+(sr.dash?' stroke-dasharray="'+sr.dash+'"':'')+(sr.op?' opacity="'+sr.op+'"':'')+(sr.sw?' stroke-width="'+sr.sw+'"':'')+'/>';
  });
  (o.hl||[]).forEach(function(h){s+='<line class="sr" x1="'+L+'" x2="'+(L+pw)+'" y1="'+Y(h.y)+'" y2="'+Y(h.y)+'"/>'+(h.label?'<text class="annm" x="'+(L+pw-6)+'" y="'+(Y(h.y)-5)+'" text-anchor="end">'+h.label+'</text>':'');});
  (o.vl||[]).forEach(function(h){s+='<line class="sr" y1="'+T+'" y2="'+(T+ph)+'" x1="'+X(h.x)+'" x2="'+X(h.x)+'"/>'+(h.label?'<text class="annm" x="'+(X(h.x)+5)+'" y="'+(T+13)+'">'+h.label+'</text>':'');});
  (o.segs||[]).forEach(function(g){s+='<line x1="'+X(g.x0)+'" y1="'+Y(g.y0)+'" x2="'+X(g.x1)+'" y2="'+Y(g.y1)+'" class="'+(g.cls||'sr')+'" stroke-width="'+(g.sw||1.5)+'"'+(g.dash?' stroke-dasharray="'+g.dash+'"':'')+' fill="none"/>';});
  (o.marks||[]).forEach(function(m){s+='<circle cx="'+X(m.x)+'" cy="'+Y(m.y)+'" r="4.5" class="'+(m.cls||"f1")+'"/>';});
  s+='</g>';
  (o.marks||[]).forEach(function(m){if(!m.label)return;var yy=Math.max(T+11,Y(m.y)+(m.dy||-7)),xx=Math.min(L+pw-4,X(m.x)+(m.dx||7));s+='<text class="ann" x="'+xx+'" y="'+yy+'"'+(xx>=L+pw-4?' text-anchor="end"':(m.anchor?' text-anchor="'+m.anchor+'"':''))+'>'+m.label+'</text>';});
  (o.notes||[]).forEach(function(m){s+='<text class="'+(m.cls||"annm")+'" x="'+X(m.x)+'" y="'+Y(m.y)+'"'+(m.anchor?' text-anchor="'+m.anchor+'"':'')+'>'+m.t+'</text>';});
  return s+'</svg>';
}
function legend(id,items){var el=$(id);if(!el)return;el.innerHTML=items.map(function(it){return '<span class="'+(it.dash?"dash":"")+'" style="--lc:var(--'+it.c+')">'+it.t+'</span>';}).join("");}


/* ---------- LTI simulation (controllable canonical form + RK4) ---------- */
function pmul(a,b){var r=new Array(a.length+b.length-1).fill(0);for(var i=0;i<a.length;i++)for(var j=0;j<b.length;j++)r[i+j]+=a[i]*b[j];return r;}
function padd(a,b){var n=Math.max(a.length,b.length),r=[];for(var i=0;i<n;i++){var x=a[a.length-n+i]||0,y=b[b.length-n+i]||0;r.push(x+y);}return r;}
function step(num,den,tEnd,N,uf){
  N=N||1500;var d0=den[0],a=den.map(function(v){return v/d0;}),n=a.length-1;
  var nm=num.map(function(v){return v/d0;});while(nm.length<n+1)nm.unshift(0);
  var D=nm[0],b=[];for(var i=1;i<=n;i++)b.push(nm[i]-D*a[i]); /* b[0] coeff of s^{n-1} */
  var x=new Array(n).fill(0),dt=tEnd/N,t=[],y=[];
  function f(x,u){var dx=new Array(n);for(var i=0;i<n-1;i++)dx[i]=x[i+1];var s=u;for(var k=0;k<n;k++)s-=a[n-k]*x[k];dx[n-1]=s;return dx;}
  function out(x,u){var s=D*u;for(var k=0;k<n;k++)s+=b[n-1-k]*x[k];return s;}
  for(var j=0;j<=N;j++){var tt=j*dt,u=uf?uf(tt):1;t.push(tt);y.push(out(x,u));
    var k1=f(x,u),x2=x.map(function(v,i){return v+dt/2*k1[i];}),k2=f(x2,u),x3=x.map(function(v,i){return v+dt/2*k2[i];}),k3=f(x3,u),x4=x.map(function(v,i){return v+dt*k3[i];}),k4=f(x4,u);
    for(i=0;i<n;i++)x[i]+=dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]);}
  return {t:t,y:y};
}
function settle(r,fin,tol){tol=tol||0.02;var band=Math.abs(fin)*tol||tol;for(var i=r.y.length-1;i>=0;i--)if(Math.abs(r.y[i]-fin)>band)return i===r.y.length-1?NaN:r.t[i+1];return 0;}
function peak(r){var m=-Infinity,ti=0;r.y.forEach(function(v,i){if(v>m){m=v;ti=r.t[i];}});return {v:m,t:ti};}
function f3(v){return isFinite(v)?(+v.toPrecision(3)).toString():"—";}
function ro(id,items){$(id).innerHTML=items.map(function(it){return '<div class="'+(it.c||"")+'">'+it.k+'<b>'+it.v+'</b></div>';}).join("");}
function bind(ids,fn){ids.forEach(function(i){var el=$(i);if(el)el.addEventListener("input",fn);});fn();}

/* ---------- s-plane picture dictionary ---------- */
function figModes(){
  var W=640,H=300,sx=[-2.8,1.2],wy=[-0.5,3.25];
  function X(s){return 30+(s-sx[0])/(sx[1]-sx[0])*(W-50);} function Y(w){return 15+(1-(w-wy[0])/(wy[1]-wy[0]))*(H-45);}
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="s-plane modes">';
  s+='<rect x="'+X(sx[0])+'" y="'+Y(wy[1])+'" width="'+(X(0)-X(sx[0]))+'" height="'+(Y(wy[0])-Y(wy[1]))+'" fill="var(--ok)" opacity=".06"/>';
  s+='<rect x="'+X(0)+'" y="'+Y(wy[1])+'" width="'+(X(sx[1])-X(0))+'" height="'+(Y(wy[0])-Y(wy[1]))+'" fill="var(--bad)" opacity=".08"/>';
  s+='<line class="ax" x1="'+X(sx[0])+'" x2="'+X(sx[1])+'" y1="'+Y(0)+'" y2="'+Y(0)+'"/><line class="ax" x1="'+X(0)+'" x2="'+X(0)+'" y1="'+Y(wy[0])+'" y2="'+Y(wy[1])+'"/>';
  s+='<text class="lb" x="'+(X(sx[1])-4)+'" y="'+(Y(0)+16)+'" text-anchor="end">σ (Re)</text><text class="lb" x="'+(X(0)+6)+'" y="'+(Y(wy[1])+12)+'">jω (Im)</text>';
  s+='<text class="txs" x="'+X(-2.7)+'" y="'+(Y(wy[0])+22)+'" style="fill:var(--ok)">← stable (LHP): faster decay farther left</text><text class="txs" x="'+X(0.05)+'" y="'+(Y(wy[0])+22)+'" style="fill:var(--bad)">unstable (RHP)</text>';
  [[-2.2,0],[-0.9,0],[0,0],[0.6,0],[-2.2,2.2],[-0.9,2.2],[0,2.2],[0.6,2.2],[-0.9,1.1]].forEach(function(p){
    var px=X(p[0]),py=Y(p[1]),bw=64,bh=38,bx=px-bw/2,by=py-bh-8;
    s+='<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="5" fill="var(--panel)" stroke="var(--border)"/>';
    var d="",sig=p[0],w=p[1]*3,tm=4;for(var i=0;i<=80;i++){var t=i/80*tm,v=Math.exp(sig*t)*Math.cos(w*t);v=Math.max(-1.6,Math.min(1.6,v));d+=(i?"L":"M")+(bx+3+i/80*(bw-6)).toFixed(1)+","+(by+bh/2-v*bh*0.28).toFixed(1);}
    s+='<line x1="'+(bx+3)+'" x2="'+(bx+bw-3)+'" y1="'+(by+bh/2)+'" y2="'+(by+bh/2)+'" stroke="var(--grid)"/><path d="'+d+'" class="ln '+(sig>0?"s5":sig===0?"s2":"s1")+'" stroke-width="1.6"/>';
    s+='<text x="'+px+'" y="'+(py+5)+'" text-anchor="middle" class="txb" style="fill:'+(sig>0?"var(--bad)":"var(--text)")+'">×</text>';
  });
  s+='</svg>';$("fig-splane-modes").innerHTML=s;
}

/* ---------- W1 first order ---------- */
function w1(){var K=+$("w1K").value,T=+$("w1T").value,imp=$("w1imp").checked,tan=$("w1tan").checked;$("w1Kv").textContent=K;$("w1Tv").textContent=T+" s";
  var tE=16,t=[],y=[],g=[];for(var i=0;i<=400;i++){var tt=i/400*tE;t.push(tt);y.push(K*(1-Math.exp(-tt/T)));g.push(K/T*Math.exp(-tt/T));}
  var top=Math.max(K,imp?Math.min(K/T,6):0)*1.12,ser=[{x:t,y:y,cls:"s1"}];
  if(imp)ser.push({x:t,y:g,cls:"s2"});if(tan)ser.push({x:[0,T],y:[0,K],cls:"s4",dash:"5 4",sw:1.6});
  $("w1plot").innerHTML=plot({w:640,h:260,xr:[0,tE],yr:[0,top],xlabel:"time t (s)",ylabel:"y(t)",series:ser,hl:[{y:K,label:"K = final value"}],vl:[{x:T,label:"t = T"},{x:Math.min(4*T,tE),label:"4T"}],marks:[{x:T,y:0.632*K,label:"63.2%",cls:"f1"}]});
  legend("w1leg",[{t:"step response K(1−e^(−t/T))",c:"c1"}].concat(imp?[{t:"impulse (K/T)e^(−t/T)",c:"c2"}]:[]).concat(tan?[{t:"initial tangent, slope K/T",c:"c4",dash:1}]:[]));
  ro("w1ro",[{k:"pole",v:"−"+f3(1/T)},{k:"y(T)",v:f3(0.632*K)},{k:"Ts (2%) ≈ 4T",v:f3(4*T)+" s"},{k:"slope at 0",v:f3(K/T)}]);}

/* ---------- W2 dominant pole ---------- */
function w2(){var p=+$("w2p").value;$("w2pv").textContent=p;var z=0.5,wn=1;
  var full=step([p*wn*wn],pmul([1,2*z*wn,wn*wn],[1,p]),15),red=step([wn*wn],[1,2*z*wn,wn*wn],15);
  $("w2plot").innerHTML=plot({w:640,h:250,xr:[0,15],yr:[0,1.3],xlabel:"time t (s)",ylabel:"y(t)",series:[{x:red.t,y:red.y,cls:"s4",dash:"6 4"},{x:full.t,y:full.y,cls:"s1"}],hl:[{y:1}]});
  legend("w2leg",[{t:"full 3rd-order",c:"c1"},{t:"2nd-order approximation",c:"c4",dash:1}]);
  var ratio=p/(z*wn),st=$("w2st");st.className="status "+(ratio>=5?"ok":ratio>=2?"warn":"bad");
  st.textContent="Extra pole is "+f3(ratio)+"× farther left than the dominant pair's real part (0.5). "+(ratio>=5?"Negligible: approximation is good.":ratio>=2?"Noticeable lag: approximation is rough.":"Not negligible: the extra pole now dominates.");}

/* ---------- W3 second order ---------- */
function splane(z,wn){var W=250,H=210,cx=W*0.62,cy=H/2,poles=[];
  if(z<1){var wd=wn*Math.sqrt(1-z*z);poles=[[-z*wn,wd],[-z*wn,-wd]];}else{var r=wn*Math.sqrt(z*z-1);poles=[[-z*wn+r,0],[-z*wn-r,0]];}
  var R=Math.max(wn,Math.abs(poles[1][0]),2)*1.15,sc=Math.min((cx-12)/R,(H/2-12)/R);
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="pole plot"><rect x="0" y="0" width="'+cx+'" height="'+H+'" fill="var(--ok)" opacity=".05"/>';
  s+='<line class="ax" x1="4" x2="'+(W-4)+'" y1="'+cy+'" y2="'+cy+'"/><line class="ax" x1="'+cx+'" x2="'+cx+'" y1="4" y2="'+(H-4)+'"/>';
  s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(wn*sc)+'" fill="none" stroke="var(--axis)" stroke-dasharray="3 4"/>';
  if(z<1){s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+poles[0][0]*sc)+'" y2="'+(cy-poles[0][1]*sc)+'" stroke="var(--c4)" stroke-width="1.4"/>';s+='<text class="txs" x="'+(cx-26)+'" y="'+(cy-6)+'" style="fill:var(--c4)">θ</text>';}
  poles.forEach(function(p){s+='<text x="'+(cx+p[0]*sc)+'" y="'+(cy-p[1]*sc+6)+'" text-anchor="middle" style="fill:var(--c2);font:700 18px system-ui">×</text>';});
  s+='<text class="txs" x="'+(W-6)+'" y="'+(cy+14)+'" text-anchor="end">σ</text><text class="txs" x="'+(cx+5)+'" y="14">jω</text><text class="txs" x="6" y="'+(H-6)+'">radius = ωn, cos θ = ζ</text></svg>';
  return {svg:s,poles:poles};}
function w3(){var z=+$("w3z").value,wn=+$("w3w").value;$("w3zv").textContent=z.toFixed(2);$("w3wv").textContent=wn.toFixed(2);
  var r=step([wn*wn],[1,2*z*wn,wn*wn],15,1800),pk=peak(r),sp=splane(z,wn);$("w3sp").innerHTML=sp.svg;
  $("w3plot").innerHTML=plot({w:640,h:270,xr:[0,15],yr:[0,Math.max(1.3,pk.v*1.08)],xlabel:"time t (s)",ylabel:"y(t)",series:[{x:r.t,y:r.y,cls:"s1"}],bands:[{y0:0.98,y1:1.02}],hl:[{y:1}],marks:z<1&&z>0?[{x:pk.t,y:pk.v,label:"peak "+f3(pk.v),cls:"f2"}]:[]});
  legend("w3leg",[{t:"step response",c:"c1"},{t:"±2% band",c:"c3"}]);
  var os=z<1?100*Math.exp(-z*Math.PI/Math.sqrt(1-z*z)):0,ts=settle(r,1),pl=sp.poles;
  var pstr=z<1?f3(pl[0][0])+" ± j"+f3(pl[0][1]):f3(pl[0][0])+", "+f3(pl[1][0]);
  ro("w3ro",[{k:"poles",v:pstr},{k:"%OS formula",v:f3(os)+"%",c:os>20?"bad":os>5?"warn":"ok"},{k:"Ts ≈ 4/(ζωn)",v:z>0?f3(4/(z*wn))+" s":"∞"},{k:"Ts (2%) simulated",v:isFinite(ts)&&ts>0?f3(ts)+" s":"> 15 s"},{k:"Tp = π/ωd",v:z<1?f3(Math.PI/(wn*Math.sqrt(1-z*z)))+" s":"—"},{k:"type",v:z===0?"undamped":z<1?"under":z===1?"critical":"over"}]);}

/* ---------- W4 P vs PI ---------- */
function w4(){var Kp=+$("w4p").value,Ki=+$("w4i").value;$("w4pv").textContent=Kp;$("w4iv").textContent=Ki;
  var D=[0.2,1.2,1],num,den;
  if(Ki>0){num=[Kp,Ki];den=padd(pmul(D,[1,0]),[Kp,Ki]);}else{num=[Kp];den=padd(D,[Kp]);}
  var stable=Ki>0?(Ki<6*(1+Kp)):true,r=step(num,den,10,2000),pk=peak(r);
  var fin=Ki>0?1:Kp/(1+Kp);
  $("w4plot").innerHTML=plot({w:640,h:260,xr:[0,10],yr:[0,stable?Math.max(1.3,Math.min(pk.v*1.08,2.5)):2.5],xlabel:"time t (s)",ylabel:"y(t)",series:[{x:r.t,y:r.y,cls:Ki>0?"s3":"s1"}],hl:[{y:1,label:"reference r = 1"}].concat(Ki>0||!stable?[]:[{y:fin,label:"P-only final value"}])});
  legend("w4leg",[{t:Ki>0?"PI response":"P-only response",c:Ki>0?"c3":"c1"}]);
  var st=$("w4st");
  if(!stable){st.className="status bad";st.textContent="UNSTABLE: Ki > 6(1+Kp). No steady state exists, so the final-value theorem doesn't apply.";}
  else if(Ki>0){st.className="status ok";st.textContent="PI: integrator in L ⇒ step error → 0.";}
  else{st.className="status warn";st.textContent="P only: e_ss = 1/(1+Kp·G(0)) = "+f3(1/(1+Kp));}
  ro("w4ro",[{k:"predicted e_ss",v:stable?f3(Ki>0?0:1/(1+Kp)):"n/a",c:stable?(Ki>0?"ok":"warn"):"bad"},{k:"e at t = 10 s",v:f3(1-r.y[r.y.length-1])},{k:"overshoot",v:stable?f3(Math.max(0,(pk.v-fin)/fin*100))+"%":"—"}]);}

/* ---------- W5 S and C ---------- */
function w5(){var K=+$("w5k").value;$("w5kv").textContent=K;var w=[],S=[],C=[],pc=-1e9;
  for(var i=0;i<=400;i++){var om=Math.pow(10,-2+4*i/400);w.push(om);
    /* L = K/(jw(jw+1)) = K/(-w^2 + j w) */
    var re=-om*om,im=om,den=re*re+im*im,Lr=K*re/den,Li=-K*im/den,opr=1+Lr,opi=Li,mag1=Math.hypot(opr,opi),magL=Math.hypot(Lr,Li);
    var s=20*Math.log10(1/mag1),c=20*Math.log10(magL/mag1);S.push(s);C.push(c);if(c>pc)pc=c;}
  var wc=Math.sqrt((-1+Math.sqrt(1+4*K*K))/2);
  $("w5plot").innerHTML=plot({w:640,h:260,logx:true,xr:[0.01,100],yr:[-60,15],yt:[-60,-40,-20,0,10],xlabel:"frequency ω (rad/s), log scale",ylabel:"magnitude (dB)",series:[{x:w,y:S,cls:"s1"},{x:w,y:C,cls:"s2"}],hl:[{y:0,label:"0 dB"}],vl:[{x:wc,label:"|L| = 1"}]});
  legend("w5leg",[{t:"|S| = |1/(1+L)|: tracking & disturbance",c:"c1"},{t:"|C| = |L/(1+L)|: noise to output",c:"c2"}]);
  ro("w5ro",[{k:"crossover ωc",v:f3(wc)+" rad/s"},{k:"|S| at ω=0.1",v:f3(S[100])+" dB"},{k:"peak |C|",v:f3(pc)+" dB",c:pc>3?"bad":pc>1?"warn":"ok"},{k:"closed-loop ζ",v:f3(1/(2*Math.sqrt(K)))}]);}

/* ---------- W6 transient ---------- */
function w6(){var K=+$("w6k").value;$("w6kv").textContent=K;var t=[],o=[],c=[],tau=10;
  for(var i=0;i<=300;i++){var tt=i/300*15;t.push(tt);o.push(1-Math.exp(-tt/tau));c.push(K/(1+K)*(1-Math.exp(-tt*(1+K)/tau)));}
  $("w6plot").innerHTML=plot({w:640,h:240,xr:[0,15],yr:[0,1.05],xlabel:"time t (s)",ylabel:"normalized speed",series:[{x:t,y:o,cls:"s2"},{x:t,y:c,cls:"s1"}]});
  legend("w6leg",[{t:"open loop (τ₁ = 10 s)",c:"c2"},{t:"closed loop",c:"c1"}]);
  ro("w6ro",[{k:"τ closed",v:f3(tau/(1+K))+" s"},{k:"speed-up",v:f3(1+K)+"×"},{k:"final value",v:f3(K/(1+K))}]);}

/* ---------- W7 boring machine ---------- */
function w7(){var K=+$("w7k").value;$("w7kv").textContent=K;var den=[1,12,K];
  var rR=step([11,K],den,3,1500),rD=step([1],den,3,1500),pk=peak(rR),ts=settle(rR,1);
  $("w7plot").innerHTML=plot({w:640,h:200,xr:[0,3],yr:[0,Math.max(1.3,pk.v*1.05)],ylabel:"y from R step",series:[{x:rR.t,y:rR.y,cls:"s1"}],hl:[{y:1}],bands:[{y0:0.98,y1:1.02}]})+
    plot({w:640,h:200,xr:[0,3],yr:[0,0.21],xlabel:"time t (s)",ylabel:"y from Td step",series:[{x:rD.t,y:rD.y,cls:"s2"}],hl:[{y:1/K,label:"1/K = "+f3(1/K)}]});
  legend("w7leg",[{t:"response to unit step command R",c:"c1"},{t:"response to unit step disturbance Td (want small)",c:"c2"}]);
  var z=6/Math.sqrt(K);
  ro("w7ro",[{k:"ωn = √K",v:f3(Math.sqrt(K))},{k:"ζ = 6/√K",v:f3(z),c:z<0.5?"bad":z<0.7?"warn":"ok"},{k:"R overshoot",v:f3(Math.max(0,(pk.v-1)*100))+"%"},{k:"R Ts (2%)",v:isFinite(ts)?f3(ts)+" s":"> 3 s"},{k:"y_ss from Td",v:f3(1/K),c:1/K<=0.02?"ok":"warn"},{k:"e_ss from R",v:"0",c:"ok"}]);}

/* ---------- static figures ---------- */
function figIdx(){var zs=[],I={ise:[],iae:[],itae:[],itse:[]};
  for(var z=0.15;z<=1.5001;z+=0.01){zs.push(z);var r=step([1],[1,2*z,1],30,3000),dt=r.t[1],a=0,b=0,c=0,d=0;
    for(var i=0;i<r.t.length;i++){var e=1-r.y[i],t=r.t[i];a+=e*e*dt;b+=Math.abs(e)*dt;c+=t*Math.abs(e)*dt;d+=t*e*e*dt;}
    I.ise.push(a);I.iae.push(b);I.itae.push(c);I.itse.push(d);}
  var mins=[],ser=[],cls={ise:"s1",iae:"s3",itae:"s2",itse:"s4"},marks=[];
  Object.keys(I).forEach(function(k){var m=Math.min.apply(null,I[k]),j=I[k].indexOf(m);ser.push({x:zs,y:I[k].map(function(v){return v/m;}),cls:cls[k]});marks.push({x:zs[j],y:1,cls:"f"+cls[k].slice(1)});mins.push(k.toUpperCase()+" min at ζ ≈ "+zs[j].toFixed(2));});
  $("fig-idx").innerHTML=plot({w:640,h:270,xr:[0.15,1.5],yr:[0.9,3],xlabel:"damping ratio ζ",ylabel:"index / its minimum",series:ser,marks:marks});
  legend("fig-idx-leg",[{t:"ISE ∫e²",c:"c1"},{t:"IAE ∫|e|",c:"c3"},{t:"ITAE ∫t|e|",c:"c2"},{t:"ITSE ∫te²",c:"c4"}]);$("fig-idx-min").textContent="Minima (dots): "+mins.join(" · ");}
function figSimp(){var a=step([6],[1,6,11,6],8),b=step([1.6],[1,2.59,1.6],8);
  $("fig-simp").innerHTML=plot({w:640,h:230,xr:[0,8],yr:[0,1.1],xlabel:"time t (s)",ylabel:"y(t)",series:[{x:a.t,y:a.y,cls:"s1"},{x:b.t,y:b.y,cls:"s2",dash:"6 4"}],bands:[{y0:0.98,y1:1.02}],hl:[{y:1}]});
  legend("fig-simp-leg",[{t:"G_H = 6/((s+1)(s+2)(s+3))",c:"c1"},{t:"G_L = 1.60/(s²+2.590s+1.60)",c:"c2",dash:1}]);}

/* ---------- s-plane map section ---------- */
function SP(o){ /* generic s-plane: o.xr,o.yr,o.w,o.h,o.poles,o.zeros,o.pre(X,Y),o.post(X,Y) */
  var W=o.w||300,H=o.h||220,m=14,xr=o.xr,yr=o.yr;
  function X(x){return m+(x-xr[0])/(xr[1]-xr[0])*(W-2*m);} function Y(y){return m+(1-(y-yr[0])/(yr[1]-yr[0]))*(H-2*m);}
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(o.aria||"s-plane")+'">';
  if(!o.noshade){s+='<rect x="'+X(xr[0])+'" y="'+Y(yr[1])+'" width="'+Math.max(0,X(0)-X(xr[0]))+'" height="'+(Y(yr[0])-Y(yr[1]))+'" fill="var(--ok)" opacity=".06"/>';
    if(xr[1]>0)s+='<rect x="'+X(0)+'" y="'+Y(yr[1])+'" width="'+(X(xr[1])-X(0))+'" height="'+(Y(yr[0])-Y(yr[1]))+'" fill="var(--bad)" opacity=".08"/>';}
  if(o.pre)s+=o.pre(X,Y);
  s+='<line class="ax" x1="'+X(xr[0])+'" x2="'+X(xr[1])+'" y1="'+Y(0)+'" y2="'+Y(0)+'"/>';
  if(xr[1]>=0)s+='<line class="ax" x1="'+X(0)+'" x2="'+X(0)+'" y1="'+Y(yr[0])+'" y2="'+Y(yr[1])+'"/>';
  s+='<text class="txs" x="'+(X(xr[1])-3)+'" y="'+(Y(0)+13)+'" text-anchor="end">σ</text>'+(xr[1]>=0?'<text class="txs" x="'+(X(0)+4)+'" y="'+(Y(yr[1])+11)+'">jω</text>':'');
  if(o.ticks!==false){for(var t=Math.ceil(xr[0]);t<=Math.floor(xr[1]);t++)if(t){s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(Y(0)-3)+'" y2="'+(Y(0)+3)+'" stroke="var(--axis)"/>';if(o.tl!==false&&(xr[1]-xr[0]<=8||t%2===0))s+='<text class="tk" x="'+X(t)+'" y="'+(Y(0)+14)+'" text-anchor="middle">'+t+'</text>';}}
  if(o.post)s+=o.post(X,Y);
  (o.zeros||[]).forEach(function(z){s+='<circle cx="'+X(z[0])+'" cy="'+Y(z[1])+'" r="6" fill="none" stroke="var(--c3)" stroke-width="2.2"/>';});
  (o.poles||[]).forEach(function(p){var x=X(p[0]),y=Y(p[1]),r=5.5;s+='<path d="M'+(x-r)+','+(y-r)+'L'+(x+r)+','+(y+r)+'M'+(x-r)+','+(y+r)+'L'+(x+r)+','+(y-r)+'" stroke="var(--c2)" stroke-width="2.4" stroke-linecap="round"/>';});
  return s+'</svg>';
}
function spLegend(){return '<span style="--lc:var(--c2)">× pole</span><span style="--lc:var(--c3)">○ zero</span>';}
function figSheet(){var xr=[-4,1.5],yr=[-3.5,3.5],nx=66,ny=50;
  $("fig-sheet").innerHTML=SP({w:640,h:300,xr:xr,yr:yr,poles:[[-1,2],[-1,-2]],zeros:[[-2,0]],noshade:true,aria:"pole zero map with magnitude shading",
    pre:function(X,Y){var s="",dx=(xr[1]-xr[0])/nx,dy=(yr[1]-yr[0])/ny;
      for(var i=0;i<nx;i++)for(var j=0;j<ny;j++){var x=xr[0]+(i+.5)*dx,y=yr[0]+(j+.5)*dy;
        /* |G| = |s+2| / |s-p1||s-p2| */
        var num=Math.hypot(x+2,y),d1=Math.hypot(x+1,y-2),d2=Math.hypot(x+1,y+2),g=num/(d1*d2),v=Math.max(0,Math.min(1,(Math.log10(g)+1.3)/2.0));
        s+='<rect x="'+X(x-dx/2).toFixed(1)+'" y="'+Y(y+dy/2).toFixed(1)+'" width="'+(X(dx)-X(0)+1.2).toFixed(1)+'" height="'+(Y(0)-Y(dy)+1.2).toFixed(1)+'" shape-rendering="crispEdges" style="fill:color-mix(in srgb,var(--accent) '+(v*80).toFixed(0)+'%,var(--panel))"/>';}
      return s;},
    post:function(X,Y){return '<text class="ann" x="'+(X(-1)+10)+'" y="'+(Y(2)-8)+'">× pole: |G| → ∞</text><text class="ann" x="'+(X(-2)-8)+'" y="'+(Y(0)-12)+'" text-anchor="end">○ zero: |G| = 0</text><text class="ann" x="'+(X(0)-6)+'" y="'+(Y(-2.9))+'" text-anchor="end">walking up the jω axis = frequency response ↑</text>';}});}
function figRegions(){var xr=[-5.4,2],yr=[-2,2],P=[-1.5,1.2],wn=Math.hypot(P[0],P[1]);
  $("fig-regions").innerHTML=SP({w:640,h:360,xr:xr,yr:yr,poles:[P,[P[0],-P[1]]],aria:"s-plane regions",
    pre:function(X,Y){var s="",r=X(wn)-X(0);
      s+='<circle cx="'+X(0)+'" cy="'+Y(0)+'" r="'+r+'" fill="none" stroke="var(--c4)" stroke-dasharray="4 4"/>';
      s+='<line x1="'+X(P[0])+'" x2="'+X(P[0])+'" y1="'+Y(yr[0])+'" y2="'+Y(yr[1])+'" stroke="var(--c1)" stroke-dasharray="5 4"/>';
      s+='<line x1="'+X(xr[0])+'" x2="'+X(xr[1])+'" y1="'+Y(P[1])+'" y2="'+Y(P[1])+'" stroke="var(--c5)" stroke-dasharray="5 4"/>';
      var k=1.7/P[1];[1,-1].forEach(function(sg){s+='<line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(P[0]*k)+'" y2="'+Y(sg*P[1]*k)+'" stroke="var(--c3)" stroke-width="1.6"/>';});
      s+='<path d="M'+(X(0)-28)+','+Y(0)+' A28,28 0 0 1 '+(X(0)+28*P[0]/wn)+','+(Y(0)-28*P[1]/wn)+'" fill="none" stroke="var(--c3)"/>';
      return s;},
    post:function(X,Y){return '<text class="txs" x="'+(X(P[0])+4)+'" y="'+(Y(-1.85))+'" style="fill:var(--c1)">σ = ζωn → Ts ≈ 4/σ</text>'+
      '<text class="txs" x="'+(X(0.08))+'" y="'+(Y(P[1])-5)+'" style="fill:var(--c5)">ωd → Tp = π/ωd</text>'+
      '<text class="txs" x="'+(X(-2.75))+'" y="'+(Y(1.85))+'" style="fill:var(--c3)">ray: constant ζ = cos θ</text>'+
      '<text class="txs" x="'+(X(-0.62))+'" y="'+(Y(0)-6)+'" style="fill:var(--c3)">θ</text>'+
      '<text class="txs" x="'+(X(-wn)-4)+'" y="'+(Y(-0.6))+'" text-anchor="end" style="fill:var(--c4)">circle: constant ωn</text>'+
      '<text class="txs" x="'+(X(-5.3))+'" y="'+(Y(-1.85))+'" style="fill:var(--ok)">LHP: decay</text>'+
      '<text class="txs" x="'+(X(0.1))+'" y="'+(Y(-1.85))+'" style="fill:var(--bad)">RHP: growth</text>'+
      '<text class="txs" x="'+(X(0.1))+'" y="'+(Y(0.6))+'">jω axis: sustained</text>';}});}
function figOps(){var pp=[[-1,1.5],[-1,-1.5]],zz=[[-2,0]],o={w:210,h:190,xr:[-5,1],yr:[-3.6,3.6],tl:true};
  function lab(t){return function(X,Y){return '<text class="txb" x="'+X(-4.9)+'" y="'+(Y(3.6)+12)+'">'+t+'</text>';};}
  function wedge(X,Y){var k=4.5;return '<line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(-1*k)+'" y2="'+Y(1.5*k)+'" stroke="var(--c3)" stroke-dasharray="3 4" opacity=".7"/>';}
  var a=SP(Object.assign({},o,{poles:pp,zeros:zz,post:lab("original"),pre:wedge}));
  var b=SP(Object.assign({},o,{poles:pp.map(function(p){return[p[0]-1,p[1]];}),zeros:zz.map(function(p){return[p[0]-1,p[1]];}),post:function(X,Y){return lab("e^(−t)·f(t): slide left 1")(X,Y)+'<path d="M'+X(-1)+','+Y(2.6)+'L'+X(-2)+','+Y(2.6)+'" stroke="var(--accent)" stroke-width="2" marker-end="url(#ar)"/>';},pre:wedge}));
  var c=SP(Object.assign({},o,{poles:pp.map(function(p){return[p[0]*2,p[1]*2];}),zeros:zz.map(function(p){return[p[0]*2,p[1]*2];}),post:lab("f(2t): stretch ×2"),pre:wedge}));
  $("fig-ops").innerHTML='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem">'+a+b+c+'</div><div class="legend ui" style="justify-content:center">'+spLegend()+'<span style="--lc:var(--c3)" class="dash">ζ ray of the original</span></div>';}

/* W8 explorer */
function w8(){var sg=+$("w8s").value,w=+$("w8w").value,zon=$("w8zon").checked,z=+$("w8z").value,int=$("w8int").checked,dif=$("w8dif").checked;
  $("w8sv").textContent=sg.toFixed(2);$("w8wv").textContent=w.toFixed(2);$("w8zv").textContent=zon?z.toFixed(1):"off";$("w8z").disabled=!zon;
  if(zon&&Math.abs(z)<0.1)z=z<0?-0.1:0.1;
  var p2=sg*sg+w*w,k=p2>0.0025?p2:1,den=[1,-2*sg,p2],num=[k];
  if(zon)num=pmul(num,[-1/z,1]); /* k(1 - s/z) */
  if(int)den=pmul(den,[1,0]);if(dif)num=pmul(num,[1,0]);
  var tE=12,r=step(num,den,tE,2400),lo=Math.min.apply(null,r.y),hi=Math.max.apply(null,r.y);
  var unstable=sg>0.001,marg=Math.abs(sg)<=0.001,cap=6;lo=Math.max(lo,-cap);hi=Math.min(hi,cap);
  var yr=[Math.min(-0.1,lo*1.1),Math.max(1.2,hi*1.08)];
  $("w8plot").innerHTML=plot({w:640,h:240,xr:[0,tE],yr:yr,xlabel:"time t (s)",ylabel:"y(t), unit step",series:[{x:r.t,y:r.y,cls:"s1"}],hl:[{y:1},{y:0}]});
  legend("w8leg",[{t:"step response",c:"c1"}]);
  var poles=[[sg,w],[sg,-w]],zeros=[];if(int)poles.push([0,0]);if(zon)zeros.push([z,0]);if(dif)zeros.push([0,0]);
  var R=Math.max(3.4,Math.abs(z)+0.6);
  $("w8sp").innerHTML=SP({w:640,h:230,xr:[-Math.max(R,3.4),Math.max(1.6,zon&&z>0?z+0.8:1.6)],yr:[-3.4,3.4],poles:poles,zeros:zeros,aria:"pole zero map",
    post:function(X,Y){return '<text class="annm" x="'+(X(-R)+4)+'" y="'+(Y(3.4)+12)+'">× poles · ○ zeros (DC gain normalized to 1)</text>';}});
  var wn=Math.sqrt(p2),zeta=wn>0?-sg/wn:0,st=$("w8st"),msg=[],cls="ok";
  if(unstable){cls="bad";msg.push("RHP poles: unstable. The natural mode e^(+σt) grows even with zero input; the step only kicks it off.");}
  else if(marg){cls="warn";msg.push("Poles on the jω axis: sustained oscillation (marginal).");}
  if(int&&!dif){msg.push("Integrator: a step in → ramp out (pole at 0 never decays).");cls=cls==="ok"?"warn":cls;}
  if(dif&&!int)msg.push("Differentiator: this is the impulse response; final value 0 (zero at 0 blocks DC).");
  if(int&&dif)msg.push("× at 0 and ○ at 0 cancel each other.");
  if(zon&&z>0){msg.push("RHP zero: non-minimum phase, watch the wrong-way start (initial undershoot). It is not a growing mode (M10).");cls=cls==="ok"?"warn":cls;}
  if(zon&&z<0&&w<0.2&&Math.abs(z-sg)<0.2)msg.push("○ almost on top of ×: near-cancellation, that mode's residue is tiny.");
  if(!msg.length)msg.push("Stable, minimum phase. Move the ○ toward the ×'s to see more overshoot.");
  st.className="status "+cls;st.textContent=msg.join(" ");
  var pk=peak(r);
  ro("w8ro",[{k:"poles",v:w>0?f3(sg)+" ± j"+f3(w):f3(sg)+" (double)"},{k:"ωn = |p|",v:f3(wn)},{k:"ζ = −σ/ωn",v:wn>0?f3(zeta):"—"},{k:"zero",v:zon?f3(z):"none"},{k:"min y (undershoot)",v:f3(Math.min.apply(null,r.y.slice(0,600))),c:zon&&z>0?"warn":""},{k:"peak y",v:f3(pk.v)}]);}

/* W9 root-locus preview */
function w9(){var K=+$("w9k").value,hz=$("w9z").checked;$("w9kv").textContent=K.toFixed(1);
  function roots(K){var b=hz?2+K:2,c=hz?3*K:K,d=b*b-4*c;return d>=0?[[(-b+Math.sqrt(d))/2,0],[(-b-Math.sqrt(d))/2,0]]:[[-b/2,Math.sqrt(-d)/2],[-b/2,-Math.sqrt(-d)/2]];}
  var xr=hz?[-7,1]:[-4,1],yr=[-4.5,4.5];
  var cur=roots(K);
  $("w9sp").innerHTML=SP({w:260,h:250,xr:xr,yr:yr,poles:[[0,0],[-2,0]],zeros:hz?[[-3,0]]:[],aria:"root locus",
    pre:function(X,Y){var s="";for(var k=0;k<=300;k+=0.25){var kk=hz?k*k/300:k*k/2000*20;roots(kk).forEach(function(r){if(r[0]>=xr[0]&&Math.abs(r[1])<=yr[1])s+='<circle cx="'+X(r[0]).toFixed(1)+'" cy="'+Y(r[1]).toFixed(1)+'" r="1.1" fill="var(--axis)"/>';});}return s;},
    post:function(X,Y){return cur.map(function(r){return '<circle cx="'+X(r[0])+'" cy="'+Y(r[1])+'" r="5" fill="var(--c1)"/>';}).join("")+'<text class="annm" x="'+(X(xr[0])+4)+'" y="'+(Y(yr[0])-4)+'">grey = locus, blue = closed-loop poles</text>';}});
  var num=hz?[K,3*K]:[K],den=hz?[1,2+K,3*K]:[1,2,K],r=K>0?step(num,den,10,1500):{t:[0,10],y:[0,0]},pk=peak(r);
  $("w9plot").innerHTML=plot({w:640,h:240,xr:[0,10],yr:[0,Math.max(1.3,pk.v*1.05)],xlabel:"time t (s)",ylabel:"closed-loop step",series:[{x:r.t,y:r.y,cls:"s1"}],hl:[{y:1}]});
  legend("w9leg",[{t:"closed-loop step response",c:"c1"}]);
  var wn=Math.hypot(cur[0][0],cur[0][1]),z=cur[0][1]?-cur[0][0]/wn:1;
  ro("w9ro",[{k:"CL poles",v:cur[0][1]?f3(cur[0][0])+" ± j"+f3(cur[0][1]):f3(cur[0][0])+", "+f3(cur[1][0])},{k:"ζ",v:cur[0][1]?f3(z):"≥ 1",c:cur[0][1]&&z<0.5?"bad":"ok"},{k:"overshoot",v:f3(Math.max(0,(pk.v-1)*100))+"%"}]);}

/* W10 terrain + free e^{st} probe explorer: G(s) = C (s - z) / ((s - p)(s - p*)) */
var W10={xr:[-3.2,1.6],yr:[-5.8,5.8],W:640,H:340,m:14,Tauto:true};
function w10G(x,y){var a=+$("w10a").value,b=+$("w10b").value,zon=$("w10zon").checked,z=+$("w10z").value;
  var p2=a*a+b*b,C;
  /* D = (s-p)(s-p*) = s^2 - 2a s + (a^2+b^2) */
  var dr=x*x-y*y-2*a*x+p2,di=2*x*y-2*a*y,nr=1,ni=0;
  if(zon){nr=x-z;ni=y;C=Math.abs(z)>0.05?p2/(-z):(p2>0.01?p2:1);}else C=p2>0.01?p2:1;
  var d=dr*dr+di*di;if(d<1e-18)return [1e9,0];return [C*(nr*dr+ni*di)/d,C*(ni*dr-nr*di)/d];}
function w10(){/* terrain rebuild */
  var a=+$("w10a").value,b=+$("w10b").value,zon=$("w10zon").checked,z=+$("w10z").value;
  $("w10av").textContent=a.toFixed(2);$("w10bv").textContent=b.toFixed(2);$("w10zv").textContent=zon?z.toFixed(2):"off";$("w10z").disabled=!zon;
  var o=W10,xr=o.xr,yr=o.yr,nx=60,ny=70;
  $("w10map").innerHTML=SP({w:o.W,h:o.H,xr:xr,yr:yr,poles:[[a,b],[a,-b]],zeros:zon?[[z,0]]:[],noshade:true,aria:"height map of the |G(s)| surface with draggable e^st probe",
    pre:function(X,Y){var s="",dx=(xr[1]-xr[0])/nx,dy=(yr[1]-yr[0])/ny;
      for(var i=0;i<nx;i++)for(var j=0;j<ny;j++){var x=xr[0]+(i+.5)*dx,y=yr[0]+(j+.5)*dy,g=w10G(x,y),m=Math.hypot(g[0],g[1]),v=Math.max(0,Math.min(1,(Math.log10(m)+1.2)/2.0));
        s+='<rect x="'+X(x-dx/2).toFixed(1)+'" y="'+Y(y+dy/2).toFixed(1)+'" width="'+(X(dx)-X(0)+1.2).toFixed(1)+'" height="'+(Y(0)-Y(dy)+1.2).toFixed(1)+'" shape-rendering="crispEdges" style="fill:color-mix(in srgb,var(--accent) '+(Math.pow(v,1.4)*92).toFixed(0)+'%,var(--panel))"/>';}
      s+='<rect x="'+X(0)+'" y="'+Y(yr[1])+'" width="'+(X(xr[1])-X(0))+'" height="'+(Y(yr[0])-Y(yr[1]))+'" fill="var(--bad)" opacity=".10"/>';
      s+='<line x1="'+X(0)+'" x2="'+X(0)+'" y1="'+Y(yr[0])+'" y2="'+Y(yr[1])+'" stroke="var(--warn)" stroke-width="5" opacity=".55"/>';
      s+='<text class="txs" x="'+(X(0)+6)+'" y="'+(Y(yr[0])-6)+'" style="fill:var(--warn)">jω axis (σ = 0): Bode slice</text>';
      s+='<text class="txs" x="'+(X(xr[1])-4)+'" y="'+(Y(yr[1])+24)+'" text-anchor="end" style="fill:var(--bad)">RHP: growing modes</text>';
      s+='<text class="txs" x="'+(X(xr[0])+4)+'" y="'+(Y(yr[1])+24)+'" style="fill:var(--muted)">← LHP: decaying</text>';
      return s;},
    post:function(X,Y){return '<g id="w10pg"></g>';}});
  w10probe();}
function w10probe(){
  var o=W10,a=+$("w10a").value,b=+$("w10b").value,zon=$("w10zon").checked,z=+$("w10z").value;
  if($("w10lock").checked)$("w10ps").value=0;
  var sg=+$("w10ps").value,w=+$("w10pw").value;$("w10sv").textContent=sg.toFixed(2);$("w10wv").textContent=w.toFixed(2);
  var xr=o.xr,yr=o.yr;function X(x){return o.m+(x-xr[0])/(xr[1]-xr[0])*(o.W-2*o.m);}function Y(y){return o.m+(1-(y-yr[0])/(yr[1]-yr[0]))*(o.H-2*o.m);}
  var g=w10G(sg,w),mag=Math.hypot(g[0],g[1]),ph=Math.atan2(g[1],g[0]),onroad=Math.abs(sg)<0.005,inf=!isFinite(mag)||mag>1e3;if(inf){mag=1e3;ph=0;}
  var mg=Math.abs(a)<1e-6,d1=Math.hypot(sg-a,w-b),d2=Math.hypot(sg-a,w+b),dp=Math.min(d1,d2),dz=zon?Math.hypot(sg-z,w):9;
  var p2c=a*a+b*b,Cm=zon?(Math.abs(z)>0.05?p2c/Math.abs(z):(p2c>0.01?p2c:1)):(p2c>0.01?p2c:1);
  /* probe group: vectors from marks, diamond, conjugate */
  var mx=X(sg),my=Y(w),r=9,s="";
  [[a,b],[a,-b]].forEach(function(p){s+='<line x1="'+X(p[0])+'" y1="'+Y(p[1])+'" x2="'+mx+'" y2="'+my+'" stroke="var(--c2)" stroke-dasharray="3 3" opacity=".7"/>';});
  if(zon)s+='<line x1="'+X(z)+'" y1="'+Y(0)+'" x2="'+mx+'" y2="'+my+'" stroke="var(--c3)" stroke-dasharray="3 3" opacity=".8"/>';
  var cy=Y(-w);if(Math.abs(w)>0.05)s+='<path d="M'+mx+','+(cy-r*.7)+'L'+(mx+r*.7)+','+cy+'L'+mx+','+(cy+r*.7)+'L'+(mx-r*.7)+','+cy+'Z" fill="none" stroke="var(--c5)" opacity=".6"/><text class="annm" x="'+(mx+10)+'" y="'+(cy+4)+'">conjugate probe (s̄)</text>';
  s+='<circle cx="'+mx+'" cy="'+my+'" r="16" fill="var(--c5)" opacity=".15"/>';
  s+='<path id="w10dia" d="M'+mx+','+(my-r)+'L'+(mx+r)+','+my+'L'+mx+','+(my+r)+'L'+(mx-r)+','+my+'Z" fill="var(--c5)" stroke="var(--bg)" stroke-width="1.5" style="cursor:grab"/>';
  var left=mx>o.W-230,lx=left?mx-14:mx+14,an=left?' text-anchor="end"':'';
  s+='<text class="ann"'+an+' x="'+lx+'" y="'+(my-4)+'" style="fill:var(--c5)">◆ e^(st) probe, s = '+sg.toFixed(2)+(w>=0?' + j':' − j')+Math.abs(w).toFixed(2)+'</text>';
  s+='<text class="annm"'+an+' x="'+lx+'" y="'+(my+10)+'">response/probe = G(s) = '+(inf?'∞ (pole)':f3(mag)+' ∠ '+(ph*180/Math.PI).toFixed(0)+'°')+'</text>';
  $("w10pg").innerHTML=s;
  /* mode */
  var md=$("w10mode"),msg,cls;
  if(dp<0.08){cls="bad";msg="◆ probe is sitting on a peak (pole): G(s) → ∞. A pole is an e^(st) the system can produce with NO input. It's the system's own natural mode, not something you drive.";}
  else if(dz<0.06){cls="ok";msg="◆ probe is in the sinkhole (zero): G(s) = 0. This particular probe signal is completely blocked, so response/probe = 0.";}
  else if(onroad&&a>0){cls="bad";msg="On the jω axis, but the surface has peaks in the RHP (RHP poles at "+a.toFixed(2)+" ± j"+b.toFixed(2)+", unstable). The free response e^(+"+a.toFixed(2)+"t)·cos("+b.toFixed(2)+"t) grows even with u = 0: any initial condition, noise, or disturbance kicks it off. G(jω) is still just a number, but it only describes the forced sine; in a real test the growing free response drowns it, so the test never settles (see M8).";}
  else if(onroad){cls="ok";msg=Math.abs(w)<0.02?"On the jω axis at ω = 0: the probe is a constant (DC). Response/probe = G(0), the DC gain.":"On the jω axis: this probe is a steady sine at ω = "+Math.abs(w).toFixed(2)+" rad/s, a normal lab test. Sine in → sine out, scaled by |G| and shifted by ∠G (below).";}
  else{cls="warn";msg="Off the jω axis (σ = "+sg.toFixed(2)+"): the probe itself "+(sg<0?"DECAYS":"GROWS")+" like e^("+sg.toFixed(2)+"t)"+(Math.abs(w)>0.02?" while oscillating at "+Math.abs(w).toFixed(2)+" rad/s":"")+". Not a usual lab sine, but the rule still holds: if drive ~ e^(st), response/probe = G(s) (the forced part; the system's own modes add on top). Real inputs are sums of many such probes.";}
  if(zon&&z>0&&dz>=0.06){msg+=" ○ RHP zero at +"+z.toFixed(2)+": not a mode, so nothing grows. Same |G(jω)| as a zero at −"+z.toFixed(2)+", but extra phase lag (non-minimum phase): wrong-way step start, limited bandwidth (M10).";if(cls==="ok")cls="warn";}
  if(mg&&dp>=0.08){msg+=" ◎ Poles exactly on the jω axis: the free response rings forever at constant amplitude, with no input needed. That's an ideal oscillator (M9).";if(cls==="ok")cls="warn";}
  if(a>0&&!(onroad&&dp>=0.08))msg+=" ⚠ RHP poles: this system's free response e^(+"+a.toFixed(2)+"t)·cos("+b.toFixed(2)+"t) grows even with no input (M8).";
  md.className="status "+cls;md.textContent=msg;
  /* time sketch */
  var aw=Math.abs(w),Ta=aw>0.05?Math.min(2*2*Math.PI/aw,8):4,t=[],u=[],y=[],e1=[],e2=[];
  if(a>0&&!inf)Ta=Math.min(45,Math.max(Ta,Math.log(2*Math.max(mag,1.5)/0.05)/a)); /* auto: long enough to see the free mode overtake the forced sine */
  Ta=Math.max(1,Math.round(Ta*2)/2);if(W10.Tauto)$("w10T").value=Ta;var T=+$("w10T").value;
  $("w10Tv").textContent=T.toFixed(1)+" s"+(W10.Tauto?" (auto)":"");
  var fmax=Math.max(aw,b)/(2*Math.PI),NS=Math.min(4000,Math.max(600,Math.ceil(T*fmax*40)));
  for(var i=0;i<=NS;i++){var c=i/NS*T,env=Math.exp(sg*c);t.push(c);u.push(env*Math.cos(w*c));y.push(mag*env*Math.cos(w*c+ph));e1.push(env);e2.push(-env);}
  var A=1.1*Math.max.apply(null,u.map(Math.abs).concat(y.map(Math.abs)));A=Math.max(A,0.2);
  var shf=a>0||mg,K0=mg?0.5:0.05,LS=1.5;
  function frf(c){return K0*Math.exp((a>0?a:0)*c)*Math.cos(b*c);}
  function fsat(c){var e=K0*Math.exp(a*c);return e/Math.sqrt(1+(e/LS)*(e/LS))*Math.cos(b*c);}
  if(inf)A=1.1;var fr=[],fs=[];if(shf){for(i=0;i<t.length;i++){fr.push(frf(t[i]));if(a>0)fs.push(fsat(t[i]));}A=Math.max(A,1.1*Math.max.apply(null,fr.map(Math.abs)));}
  var ser=inf?[{x:t,y:u,cls:"s4",dash:"6 4"}]:[{x:t,y:u,cls:"s4",dash:"6 4"},{x:t,y:y,cls:"s1"}];if(shf)ser.push({x:t,y:fr,cls:"s2"});if(a>0)ser.push({x:t,y:fs,cls:"s3",sw:1.6,dash:"4 3"});if(!onroad)ser.unshift({x:t,y:e1,cls:"s4",op:.35,sw:1},{x:t,y:e2,cls:"s4",op:.35,sw:1});
  /* time window: phase bracket anchored mid-window */
  var tf=T*0.5,ev=Math.exp(sg*T),ft=shf?frf(T):0,sgm=[],nts=[];
  var phi=w>=0?ph:-ph,lag=aw>0.05?-phi/aw:0,per=aw>0.05?2*Math.PI/aw:0;
  if(aw>0.05&&!inf&&mag>1e-6){var tin=Math.round(tf/per)*per,tout=tin+lag;if(tout>T){tin-=per;tout-=per;}if(tout<0){tin+=per;tout+=per;}
    var yb=0.78*A;if(tin>=0&&tin<=T&&tout>=0&&tout<=T){sgm.push({x0:tin,y0:Math.exp(sg*tin),x1:tin,y1:yb,cls:"s4",dash:"2 3",sw:1.2},{x0:tout,y0:mag*Math.exp(sg*tout),x1:tout,y1:yb,cls:"s1",dash:"2 3",sw:1.2},{x0:tin,y0:yb,x1:tout,y1:yb,cls:"s5",sw:2.4});
      nts.push({x:Math.max(tin,tout)+T*0.012,y:yb+A*0.04,t:"Δt = "+(lag>=0?"lag ":"lead ")+f3(Math.abs(lag))+" s",cls:"annm"});}}
  $("w10sine").innerHTML=plot({w:640,h:170,xr:[0,T],yr:[-A,A],ny:4,xlabel:"time t (s): window 0 … "+T.toFixed(1)+" s",ylabel:onroad?"steady sine":"e^(σt) probe",series:ser,hl:[{y:0}],segs:sgm,notes:nts});
  var tr=[{k:"time axis T",v:T.toFixed(1)+" s"+(W10.Tauto?" (auto)":"")},{k:"cycles shown",v:aw>0.05?(T*aw/(2*Math.PI)).toFixed(1):"— (DC)"}];
  if(!onroad)tr.push({k:"envelope at t = T: e^(σT)",v:f3(ev),c:sg<0?"ok":"warn"});
  if(aw>0.05&&!inf&&mag>1e-6)tr.push({k:"phase → time shift",v:(ph*180/Math.PI).toFixed(0)+"° = "+(lag>=0?"lag ":"lead ")+f3(Math.abs(lag))+" s"});
  if(!inf&&mag>1e-6)tr.push({k:"out/in height ratio",v:f3(mag)+" = |G|"});
  if(shf)tr.push({k:a>0?"free-mode envelope at T":"free-mode amplitude",v:f3(a>0?K0*Math.exp(a*T):K0),c:a>0?"bad":"warn"});if(a>0)tr.push({k:"saturated envelope at T",v:f3(K0*Math.exp(a*T)/Math.sqrt(1+Math.pow(K0*Math.exp(a*T)/LS,2)))+" (cap ±"+LS+")"});
  ro("w10tro",tr);
  var cap="<b>Dashed purple</b> = the probe input u(t) = "+(onroad?"cos(ωt), a plain lab sine (σ = 0, so no envelope)":"e^(σt)·cos(ωt): the faint purple lines are its ±e^(σt) envelope, "+(sg<0?"shrinking":"growing")+" because σ = "+sg.toFixed(2))+". "+
   (inf?"<b>There's no solid curve</b>: the ◆ sits on a pole, so G(s) → ∞ and the forced response to this probe is unbounded. That probe is the system's own natural mode; it needs no input at all. ":
    mag<1e-6?"<b>The solid response is flat zero</b>: the ◆ sits on the zero, so this probe is completely blocked. ":
    "<b>Solid blue</b> = the forced response G(s)·probe = |G|·"+(onroad?"":"e^(σt)·")+"cos(ωt + ∠G). It's the same shape, just <b>taller or shorter by |G| = "+f3(mag)+"</b> and <b>slid sideways by the phase</b>: ∠G = "+(ph*180/Math.PI).toFixed(0)+"° shows up as a horizontal shift Δt = −∠G/ω"+(aw>0.05?" ("+(lag>=0?"lag ":"lead ")+f3(Math.abs(lag))+" s, the pink bracket)":"")+". ")+
   "Use the <b>time-axis slider</b> to set how long a stretch you see: lengthen T to watch slow growth, decay or saturation play out, or shorten it to read the phase shift up close. This plot shows the <b>forced part only</b>. The system's own modes (its poles) add a free response on top, "+
   (a>0?"<b>and here they're in the RHP: the orange free response e^(+"+a.toFixed(2)+"t)·cos("+b.toFixed(2)+"t) grows with no input and eventually swamps everything (M8)</b>. In real hardware it can't grow forever: the dashed green curve shows the same ring with the amplitude clipped by saturation (illustrative), which is how a practical oscillator settles at a finite amplitude (M9).":mg?"<b>and here they're exactly on the jω axis: the orange free response cos("+b.toFixed(2)+"t) rings forever at constant amplitude, neither growing nor decaying. That's an ideal oscillator (M9).</b>":"but with these LHP poles it dies out, so after the start-up transient the solid curve is what you'd actually measure.");
  $("w10capt").innerHTML=" "+cap;
  var lg=inf?[{t:"probe in (response → ∞: probe is at a pole, so the response is unbounded)",c:"c4",dash:1}]:onroad?[{t:"probe in: cos(ωt) (a lab sine)",c:"c4",dash:1},{t:"response: |G|·cos(ωt + ∠G)",c:"c1"}]:[{t:"probe in: e^(σt)·cos(ωt) (envelope faint)",c:"c4",dash:1},{t:"response: |G|·e^(σt)·cos(ωt + ∠G)  (same shape, × G(s))",c:"c1"}];
  if(a>0)lg.push({t:"free response, u = 0 (tiny 0.05 kick): e^(+"+a.toFixed(2)+"t)·cos("+b.toFixed(2)+"t) grows on its own (linear model)",c:"c2"},{t:"same ring with saturation at ±"+LS+" (illustrative): growth stops at the rails",c:"c3",dash:1});
  if(mg)lg.push({t:"free response, u = 0 (kick 0.5): cos("+b.toFixed(2)+"t) rings forever at constant amplitude",c:"c2"});legend("w10sleg",lg);
  /* Bode strip + slice at probe sigma */
  var ws=[],ms=[],sl=[];for(i=0;i<=300;i++){var om=i/300*6;ws.push(om);var gg=w10G(0,om),gs=w10G(sg,om);ms.push(Math.max(-45,Math.min(35,20*Math.log10(Math.hypot(gg[0],gg[1])+1e-9))));sl.push(Math.max(-45,Math.min(35,20*Math.log10(Math.hypot(gs[0],gs[1])+1e-9))));}
  var bs=[{x:ws,y:ms,cls:"s3"}];if(!onroad)bs.push({x:ws,y:sl,cls:"s5",dash:"5 4"});
  var md2=Math.max(-45,Math.min(35,20*Math.log10(mag+1e-9)));
  $("w10bode").innerHTML=plot({w:640,h:170,xr:[0,6],yr:[-45,35],yt:[-40,-20,0,20],ylabel:"|G| dB",xlabel:onroad?"slice of the |G| surface along jω: ω (rad/s) = Bode magnitude":"solid: slice along jω (Bode) · dashed: parallel slice at the probe's σ",series:bs,vl:[{x:Math.min(aw,6)}],marks:[{x:Math.min(aw,6),y:md2,cls:onroad?"f5":"f5"}]});
  var kind=Math.abs(sg)<0.005?(aw<0.02?"constant (DC)":"steady sine"):(sg<0?"decaying":"growing")+(aw<0.02?" exponential":" sinusoid")+", τ = "+f3(1/Math.abs(sg))+" s";
  ro("w10ro",[{k:"probe s = σ + jω",v:sg.toFixed(2)+(w>=0?" + j":" − j")+aw.toFixed(2)},{k:"probe type",v:kind,c:onroad?"ok":"warn"},{k:"|G(s)| = response/probe",v:inf?"→ ∞":f3(mag)},{k:"in dB",v:inf?"→ +∞":mag<1e-6?"−∞ (zero)":f3(20*Math.log10(mag))+" dB"},{k:"∠G(s)",v:inf||mag<1e-6?"undefined":(ph*180/Math.PI).toFixed(1)+"°"},{k:"poles (peaks)",v:f3(a)+" ± j"+f3(b),c:a>0?"bad":""},{k:"zero (sinkhole)",v:zon?f3(z):"none",c:zon&&z>0?"bad":""},
    {k:"d× = |s − p|, |s − p̄|",v:f3(d1)+", "+f3(d2)},{k:"d○ = |s − z|",v:zon?f3(dz):"—"},{k:"|C|·d○/(d×·d×̄)",v:inf?"→ ∞":f3(Cm*(zon?dz:1)/(d1*d2))+"  (= |G|)"}]);}
function w10init(){var map=$("w10map"),drag=false;
  function setFrom(ev){var svg=map.querySelector("svg");if(!svg)return;var pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;var q=pt.matrixTransform(svg.getScreenCTM().inverse()),o=W10;
    var x=o.xr[0]+(q.x-o.m)/(o.W-2*o.m)*(o.xr[1]-o.xr[0]),y=o.yr[0]+(1-(q.y-o.m)/(o.H-2*o.m))*(o.yr[1]-o.yr[0]);
    x=Math.max(-3,Math.min(1.5,x));y=Math.max(-5.5,Math.min(5.5,y));if(Math.abs(x)<0.07)x=0;
    $("w10ps").value=x.toFixed(2);$("w10pw").value=y.toFixed(2);w10probe();}
  map.addEventListener("pointerdown",function(e){drag=true;try{map.setPointerCapture(e.pointerId);}catch(_){}setFrom(e);e.preventDefault();});
  map.addEventListener("pointermove",function(e){if(drag)setFrom(e);});
  ["pointerup","pointercancel"].forEach(function(n){map.addEventListener(n,function(){drag=false;});});
  bind(["w10a","w10b","w10z"],w10);$("w10zon").addEventListener("change",w10);
  $("w10T").addEventListener("input",function(){W10.Tauto=false;w10probe();});$("w10Tauto").onclick=function(){W10.Tauto=true;w10probe();};
  bind(["w10ps","w10pw"],w10probe);$("w10lock").addEventListener("change",w10probe);
  $("w10snap").onclick=function(){$("w10ps").value=0;w10probe();};
  [].forEach.call(document.querySelectorAll("#w10 .presets button[data-p]"),function(b){b.onclick=function(){var v=b.dataset.p.split(",");$("w10a").value=v[0];$("w10b").value=v[1];$("w10zon").checked=v[2]==="1";$("w10z").value=v[3];$("w10ps").value=v[4];$("w10pw").value=v[5];W10.Tauto=true;w10();};});
  w10();}

/* breadcrumb tracking: replaced by the board header */function track(){}

/* ---------- init ---------- */
function safe(f){try{f();}catch(e){console.error(e);}}
safe(figModes);
safe(function(){bind(["w1K","w1T","w1imp","w1tan"],w1);$("w1imp").addEventListener("change",w1);$("w1tan").addEventListener("change",w1);});
safe(function(){bind(["w2p"],w2);});
safe(function(){bind(["w3z","w3w"],w3);[].forEach.call(document.querySelectorAll("#w3 .presets button"),function(b){b.onclick=function(){$("w3z").value=b.dataset.z;$("w3w").value=b.dataset.w;w3();};});});
safe(function(){bind(["w4p","w4i"],w4);[].forEach.call(document.querySelectorAll("#w4 .presets button"),function(b){b.onclick=function(){$("w4p").value=b.dataset.p;$("w4i").value=b.dataset.i;w4();};});});
safe(function(){bind(["w5k"],w5);});
safe(function(){bind(["w6k"],w6);});
safe(function(){bind(["w7k"],w7);[].forEach.call(document.querySelectorAll("#w7 .presets button"),function(b){b.onclick=function(){$("w7k").value=b.dataset.k;w7();};});});
safe(figIdx);safe(figSimp);safe(figSheet);safe(figRegions);safe(figOps);
safe(function(){bind(["w8s","w8w","w8z"],w8);["w8zon","w8int","w8dif"].forEach(function(i){$(i).addEventListener("change",w8);});[].forEach.call(document.querySelectorAll("#w8 .presets button"),function(b){b.onclick=function(){var v=b.dataset.p.split(",").map(Number);$("w8s").value=v[0];$("w8w").value=v[1];$("w8zon").checked=!!v[2];$("w8z").value=v[3];$("w8int").checked=!!v[4];$("w8dif").checked=!!v[5];w8();};});});
safe(w10init);
safe(function(){bind(["w9k"],w9);$("w9z").addEventListener("change",w9);});
track();

})();

/* ---------- declutter: hidable sliders + enlarge-only verbose text ---------- */
(function(){try{var K="course-topics-sliders",ST={};try{ST=JSON.parse(localStorage.getItem(K)||"{}");}catch(e){}
function save(){try{localStorage.setItem(K,JSON.stringify(ST));}catch(e){}}
[].forEach.call(document.querySelectorAll("main .widget"),function(w){
  /* verbose bits -> enlarge-only */
  [].forEach.call(w.querySelectorAll("p, .status, .note, .readout, .presets>span"),function(e){
    if(e.closest(".wgrid>.ctl")&&!e.matches(".status"))return; /* slider-column helpers hide with the sliders */
    if(/^w\d+st$/.test(e.id))return; /* short status lines stay */
    var long=e.textContent.trim().length>60||e.id==="w10cap"||e.id==="w10tro"||e.id==="w10mode";
    if(e.matches(".readout")&&e.id!=="w10tro")return;
    if(long)e.classList.add("bigonly");});
  var ctl=w.querySelector(".wgrid>.ctl"),h=w.querySelector("h4");if(!ctl||!h)return;
  var b=document.createElement("button");b.type="button";b.className="wtog";h.insertBefore(b,h.firstChild);
  function set(show){w.classList.toggle("noctl",!show);b.textContent=show?"⚙ Hide sliders":"⚙ Show sliders";b.setAttribute("aria-expanded",show);b.title=show?"Hide the sliders and readouts (plots only)":"Show the sliders and readouts";window.dispatchEvent(new Event("resize"));}
  set(ST[w.id]==="show");
  b.addEventListener("click",function(e){e.stopPropagation();var show=w.classList.contains("noctl");ST[w.id]=show?"show":"hide";save();set(show);});
  var hint=document.createElement("p");hint.className="whint";hint.textContent="Plots only. Use ⚙ for sliders, or ⤢ enlarge for the live view with sliders and the full explanation.";w.appendChild(hint);
});
[].forEach.call(document.querySelectorAll("main figure"),function(fg){var fc=fg.querySelector("figcaption");if(!fc||!fg.querySelector("svg"))return;
  if(fc.textContent.trim().length<=90)return;
  fc.classList.add("bigonly");var lead=fc.querySelector("b"),s=document.createElement("div");s.className="figshort";
  s.innerHTML=(lead&&fc.textContent.trim().indexOf(lead.textContent.trim())<3?"<b>"+lead.innerHTML+"</b> ":"")+'<a class="figmore" role="button" tabindex="0">⤢ Enlarge for the full explanation</a>';
  fc.parentNode.insertBefore(s,fc.nextSibling);});
}catch(e){console.error(e);}})();
/* ---------- click-to-enlarge lightbox ---------- */
(function(){try{var $=function(i){return document.getElementById(i);};
var EX={
 w10map:"The s-plane drawn as a height map of the |G(s)| surface: brighter means larger gain. The × poles are peaks, the ○ zero is a sinkhole, and the vertical band is the jω axis, where the Bode slice is taken (steady sines). The ◆ is where you look up G, and the dashed lines from each × and ○ are the vectors whose lengths set |G| and whose angles set ∠G (M7).",
 w10sine:"The probe input (dashed purple) against the forced response G(s)·probe (solid blue) over time. Output height ÷ input height = |G|, and the sideways offset is the phase ∠G turned into a time shift (pink bracket). Faint purple lines are the e^(σt) envelope when the probe is off the jω axis, and orange (if shown) is the free response of RHP poles, which grows with no input at all. With poles on the jω axis it rings at constant amplitude, and dashed green is that same RHP ring capped by saturation (illustrative, M9).",
 w10bode:"Slice the |G| surface along the jω axis (σ = 0) and plot |G(jω)| in dB: that's the Bode magnitude plot. The dot is the probe's current ω, and a bump appears wherever the slice passes close to a pole. When the probe is off the axis, the dashed curve is a parallel slice at the probe's σ.",
 w8plot:"Unit step response of the system whose poles and zero you set with the sliders. The poles' real part sets how fast the response decays, their imaginary part sets the ringing frequency, and a RHP zero makes the response start the wrong way.",
 w8sp:"Pole-zero map for that step response: × poles, ○ zero. Left half-plane modes decay and right half-plane modes grow. Height above the real axis is the oscillation frequency.",
 w9sp:"Root locus of 1 + K/(s(s + 2)) = 0. At K = 0 the closed-loop poles start on the open-loop poles (0 and −2). As K grows they meet at −1 and split vertically, so you get more speed and more ringing.",
 w9plot:"Closed-loop step response at the current K. More gain pushes the poles up the vertical branch: same decay rate, faster oscillation, more overshoot.",
 w1plot:"First-order step response of K/(Ts + 1). It reaches 63% of the final value K at t = T and is essentially settled by 4T. The tangent at t = 0 hits K exactly at t = T.",
 w2plot:"The full third-order step response (solid) against the dominant second-order approximation (dashed). The farther the extra pole sits from the dominant pair, the closer the two curves get.",
 w3plot:"Second-order step response for the chosen ζ and ωn, with the ±2% settling band. ζ alone sets the overshoot, and ωn just rescales time.",
 w3sp:"Where those poles sit. The angle from the negative real axis sets ζ (cos θ = ζ), and the distance from the origin is ωn.",
 w4plot:"Unit step response with P only vs PI control. Integral action removes the steady-state error, but too much Ki adds overshoot or even instability.",
 w5plot:"|S(jω)| and |C(jω)| in dB for L = K/(s(s + 1)). S is small at low frequency (good tracking and disturbance rejection), C rolls off at high frequency (noise rejection), and S + C = 1 at every frequency.",
 w6plot:"Open-loop vs closed-loop speed response, normalized. Feedback makes the closed loop settle much faster than the open-loop time constant τ1 = 10 s.",
 w7plot:"Top: response to a reference step R. Bottom: response to a disturbance step Td. Raising K shrinks the disturbance's effect but adds overshoot to tracking. That's the classic trade-off."
};
var box=document.createElement("div");box.id="lbx";box.setAttribute("role","dialog");box.setAttribute("aria-modal","true");box.setAttribute("aria-label","Enlarged figure");
box.innerHTML='<button type="button" class="lbc" aria-label="Close enlarged view">×</button><div class="lbin"><div class="lbt"></div><div class="lbe"></div><div class="lbf"></div><p class="lbh">Click anywhere or press Esc to close.</p></div>';
host.appendChild(box);var last=null,n=0;
function clean(node){n++;var map={};[].forEach.call(node.querySelectorAll("[id]"),function(e){var o=e.id;map[o]="lb"+n+"-"+o;e.id=map[o];});
  var html=node.innerHTML.replace(/url\(#([^)]+)\)/g,function(m,i){return map[i]?"url(#"+map[i]+")":m;}).replace(/href="#([^"]+)"/g,function(m,i){return map[i]?'href="#'+map[i]+'"':m;});node.innerHTML=html;return node;}
var live=null; /* {w:widget, ph:placeholder, foc:wrapper} when a widget is enlarged live */
function open(el){if(box.classList.contains("on"))return;var title,ex;
  if(el.tagName==="FIGURE"){var c=document.createElement("div");[].forEach.call(el.querySelectorAll("svg"),function(s){c.appendChild(s.cloneNode(true));});if(!c.children.length)return;clean(c);
    var fc=el.querySelector("figcaption");box.querySelector(".lbt").innerHTML="Figure";var f=box.querySelector(".lbf");f.innerHTML="";while(c.firstChild)f.appendChild(c.firstChild);
    box.querySelector(".lbe").innerHTML=fc?fc.innerHTML:"";box.querySelector(".lbh").textContent="Click anywhere or press Esc to close.";box.classList.remove("live");}
  else{var w=el.closest(".widget");if(!w)return;
    /* LIVE: move the real widget (plots + sliders + readouts + captions) into the lightbox; every control keeps working */
    var ph=document.createElement("div");ph.className="lbph";ph.style.height=w.offsetHeight+"px";w.parentNode.insertBefore(ph,w);
    var foc=el.parentNode;foc.classList.add("zfocus");live={w:w,ph:ph,foc:foc};
    box.querySelector(".lbt").innerHTML='<span class="lbtag">LIVE</span> Enlarged view: drag the sliders, the plots update in place';
    box.querySelector(".lbe").innerHTML='<b>'+(({w10map:"s-plane |G| surface (height map)",w10sine:"probe in vs forced response (time)",w10bode:"Bode strip"})[el.id]||"Highlighted plot")+':</b> '+(EX[el.id]||"");
    var f=box.querySelector(".lbf");f.innerHTML="";f.appendChild(w);w.classList.add("wbig");
    box.querySelector(".lbh").textContent="Press Esc, click ×, or click the black margin to close. The widget goes back to the page with your settings.";box.classList.add("live");
    window.dispatchEvent(new Event("resize"));}
  last=document.activeElement;box.classList.add("on");document.documentElement.style.overflow="hidden";box.scrollTop=0;
  if(live)setTimeout(function(){if(!live)return;var r=live.foc.getBoundingClientRect();if(r.top>window.innerHeight*0.6)box.scrollTop+=r.top-120;},30);
  box.querySelector(".lbc").focus({preventScroll:true});}
function close(){if(!box.classList.contains("on"))return;
  if(live){live.w.classList.remove("wbig");live.foc.classList.remove("zfocus");live.ph.parentNode.replaceChild(live.w,live.ph);live=null;}
  box.classList.remove("on","live");document.documentElement.style.overflow="";box.querySelector(".lbf").innerHTML="";if(last&&last.focus)last.focus({preventScroll:true});}
box.addEventListener("click",function(e){if(!live){close();return;}
  if(e.target===box||e.target.classList.contains("lbin")||e.target.classList.contains("lbc")||e.target.classList.contains("lbh"))close();});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&box.classList.contains("on")){close();e.stopPropagation();}},true);
function btn(el){var b=document.createElement("button");b.type="button";b.className="zbtn";b.textContent="⤢ enlarge";b.setAttribute("aria-label","Enlarge this plot with an explanation");b.addEventListener("click",function(e){e.stopPropagation();e.preventDefault();open(el);});return b;}
[].forEach.call(document.querySelectorAll(".widget [id]"),function(el){if(!/^w\d+(plot|sp|map|sine|bode)$/.test(el.id))return;
  var wr=document.createElement("div");wr.className="zwrap";el.parentNode.insertBefore(wr,el);wr.appendChild(el);wr.appendChild(btn(el));
  if(el.id!=="w10map"){el.classList.add("zclick");el.title="Click to enlarge";el.addEventListener("click",function(){open(el);});}});
[].forEach.call(document.querySelectorAll("figure"),function(fg){if(!fg.querySelector("svg"))return;fg.classList.add("zfig");fg.appendChild(btn(fg));
  [].forEach.call(fg.querySelectorAll("svg"),function(s){s.classList.add("zclick");s.addEventListener("click",function(){open(fg);});});var fm=fg.querySelector(".figmore");if(fm){fm.addEventListener("click",function(e){e.preventDefault();open(fg);});fm.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();open(fg);}});}});
}catch(e){console.error(e);}})();


}
