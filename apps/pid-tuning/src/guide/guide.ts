// @ts-nocheck
/* Legacy interactive guide, migrated 1:1 from the original single-file page (pid-tuning-guide.html).
   The top bar, table of contents, theme switch and Variables panel were dropped: @study/core supplies them.
   The widget code below is the original script unchanged, except: no theme code, no scroll tracking, lightbox mounts in the host. */
import GUIDE_HTML from './guide.html?raw';

import './guide.css';
import './host.css';

export function mountGuide(host: HTMLElement) {
host.classList.add('legacy-board');
host.innerHTML = GUIDE_HTML;

/* ===== PID simulation core (pure JS, no deps) ===== */
var PIDSIM = (function(){
"use strict";
// Plants: strictly proper, unity DC gain, given as denominator polynomial (highest power first) and controllable-canonical simulation
var PLANTS = {
  p1: {name:"1/(s+1)", den:[1,1], label:"First-order lag  G(s) = 1/(s + 1)"},
  p2: {name:"1/((s+1)(0.5s+1))", den:[0.5,1.5,1], label:"Second-order lag  G(s) = 1/((s + 1)(0.5s + 1))"},
  p3: {name:"1/(s+1)^3", den:[1,3,3,1], label:"Third-order lag  G(s) = 1/(s + 1)³"}
};
// polynomial helpers (arrays, highest power first)
function pmul(a,b){var r=new Array(a.length+b.length-1).fill(0);for(var i=0;i<a.length;i++)for(var j=0;j<b.length;j++)r[i+j]+=a[i]*b[j];return r;}
function padd(a,b){var n=Math.max(a.length,b.length),r=new Array(n).fill(0);for(var i=0;i<a.length;i++)r[n-a.length+i]+=a[i];for(i=0;i<b.length;i++)r[n-b.length+i]+=b[i];return r;}
function pscale(a,k){return a.map(function(x){return x*k;});}
function trim(a){var i=0;while(i<a.length-1&&Math.abs(a[i])<1e-14)i++;return a.slice(i);}
// Durand-Kerner roots
function roots(p){
  p=trim(p);var n=p.length-1;if(n<1)return [];
  var a=p.map(function(x){return x/p[0];});
  var z=[],i,k,it;for(i=0;i<n;i++){var ang=2*Math.PI*i/n+0.4;z.push([0.9*Math.cos(ang)*(1+i*0.05),0.9*Math.sin(ang)*(1+i*0.05)]);}
  var R=1+Math.max.apply(null,a.slice(1).map(Math.abs));z=z.map(function(c){return [c[0]*R,c[1]*R];});
  function ev(c){var re=1,im=0;for(var j=1;j<=n;j++){var nr=re*c[0]-im*c[1]+a[j],ni=re*c[1]+im*c[0];re=nr;im=ni;}return [re,im];}
  for(it=0;it<800;it++){var md=0;
    for(i=0;i<n;i++){var num=ev(z[i]),dr=1,di=0;
      for(k=0;k<n;k++)if(k!==i){var xr=z[i][0]-z[k][0],xi=z[i][1]-z[k][1],t=dr*xr-di*xi;di=dr*xi+di*xr;dr=t;}
      var d2=dr*dr+di*di||1e-30,qr=(num[0]*dr+num[1]*di)/d2,qi=(num[1]*dr-num[0]*di)/d2;
      z[i]=[z[i][0]-qr,z[i][1]-qi];md=Math.max(md,Math.hypot(qr,qi));}
    if(md<1e-13)break;}
  return z.map(function(c){return [c[0],Math.abs(c[1])<1e-7?0:c[1]];});
}
// controller num/den: C = Kp + Ki/s + Kd*N*s/(s+N)
function ctrlTF(Kp,Ki,Kd,N){
  var den=[1];if(Ki)den=pmul(den,[1,0]);if(Kd)den=pmul(den,[1,N]);
  var num=pscale(den,Kp);
  if(Ki){var d=[1];if(Kd)d=[1,N];num=padd(num,pscale(d,Ki));}
  if(Kd){num=padd(num,pmul([Kd*N,0],Ki?[1,0]:[1]));}
  return {num:trim(num),den:den};
}
function closedLoopPoles(plant,Kp,Ki,Kd,N){
  var G=PLANTS[plant],C=ctrlTF(Kp,Ki,Kd,N);
  var cp=padd(pmul(C.den,G.den),C.num); // 1 + C*G = 0 with G numerator 1
  return roots(cp);
}
// seeded PRNG + gaussian
function rng(seed){var s=seed>>>0||1;return function(){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
/* simulate(o): o = {plant, Kp,Ki,Kd,N, T, dt, r, dist:{t,amp}|null, noise:sigma, umax:null|number, aw:bool, dmeas:bool}
   Plant input = u_sat + d (load disturbance at plant input). Measured y_m = y + n. */
function simulate(o){
  var G=PLANTS[o.plant||"p3"],den=G.den,n=den.length-1;
  var a=den.map(function(x){return x/den[0];}),b0=1/den[0];
  var Kp=o.Kp||0,Ki=o.Ki||0,Kd=o.Kd||0,N=o.N||20,T=o.T||20,dt=o.dt||0.01,r=(o.r==null?1:o.r);
  var umax=(o.umax==null||o.umax===Infinity)?Infinity:o.umax;
  var rand=rng(o.seed||12345),noiseHold=0,sig=o.noise||0;
  function gauss(){var u1=rand()||1e-12,u2=rand();return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);}
  // state: x[0..n-1] plant (controllable canonical, y = b0*x[0]...), xi integrator, xf derivative filter
  var S=new Float64Array(n+2);
  var steps=Math.round(T/dt),out={t:[],y:[],u:[],e:[],up:[],ui:[],ud:[],r:[],d:[]};
  function ctrl(s,t,nv){
    var y=b0*s[0],ym=y+nv,e=r-ym,ed=o.dmeas?-ym:e;
    var up=Kp*e,ui=Ki*s[n],ud=Kd?Kd*N*(ed-s[n+1]):0,uu=up+ui+ud,us=Math.max(-umax,Math.min(umax,uu));
    return {y:y,e:e,ed:ed,up:up,ui:ui,ud:ud,uu:uu,us:us};
  }
  function f(s,t,nv){
    var c=ctrl(s,t,nv),d=(o.dist&&t>=o.dist.t)?o.dist.amp:0,v=c.us+d,ds=new Float64Array(n+2);
    // controllable canonical: x0' = x1, ..., x_{n-1}' = -a_n x0 - ... - a_1 x_{n-1} + v ; y = b0*x0
    for(var i=0;i<n-1;i++)ds[i]=s[i+1];
    var acc=v;for(i=0;i<n;i++)acc-=a[n-i]*s[i];ds[n-1]=acc;
    var integ=c.e;
    if(o.aw&&umax<Infinity&&c.uu!==c.us&&(c.uu-c.us)*c.e>0)integ=0; // clamping anti-windup
    ds[n]=Ki?integ:0;ds[n+1]=Kd?N*(c.ed-s[n+1]):0;
    return ds;
  }
  // initialise derivative filter state for D-on-measurement so there is no artificial spike from y(0)=0 (it is 0 anyway)
  var unstable=false;
  for(var k=0;k<=steps;k++){
    var t=k*dt;
    if(sig&&k%Math.max(1,Math.round(0.01/dt))===0)noiseHold=sig*gauss();
    var c=ctrl(S,t,noiseHold);
    out.t.push(t);out.y.push(c.y);out.u.push(c.us);out.e.push(r-c.y);out.up.push(c.up);out.ui.push(c.ui);out.ud.push(c.ud);out.r.push(r);
    out.d.push((o.dist&&t>=o.dist.t)?o.dist.amp:0);
    if(!isFinite(c.y)||Math.abs(c.y)>1e4){unstable=true;break;}
    if(k===steps)break;
    var k1=f(S,t,noiseHold),s2=new Float64Array(n+2),s3=new Float64Array(n+2),s4=new Float64Array(n+2),i;
    for(i=0;i<n+2;i++)s2[i]=S[i]+dt/2*k1[i];var k2=f(s2,t+dt/2,noiseHold);
    for(i=0;i<n+2;i++)s3[i]=S[i]+dt/2*k2[i];var k3=f(s3,t+dt/2,noiseHold);
    for(i=0;i<n+2;i++)s4[i]=S[i]+dt*k3[i];var k4=f(s4,t+dt,noiseHold);
    for(i=0;i<n+2;i++)S[i]+=dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]);
  }
  out.unstable=unstable;return out;
}
/* step metrics on window [0, tEnd): like MATLAB stepinfo (relative to final value), 2% settling band */
function metrics(sim,tEnd,r){
  r=(r==null?1:r);var t=sim.t,y=sim.y,iEnd=t.length-1;
  if(tEnd!=null){for(var i=0;i<t.length;i++)if(t[i]>=tEnd){iEnd=i-1;break;}}
  if(sim.unstable)return {unstable:true};
  var w=Math.max(5,Math.round(0.05*iEnd)),s=0;for(i=iEnd-w+1;i<=iEnd;i++)s+=y[i];var yf=s/w;
  // stationarity check: spread over last 20% of window
  var j0=Math.round(0.8*iEnd),lo=Infinity,hi=-Infinity;for(i=j0;i<=iEnd;i++){lo=Math.min(lo,y[i]);hi=Math.max(hi,y[i]);}
  var settledWin=(hi-lo)<=0.04*Math.max(Math.abs(yf),1e-9);
  var ymax=-Infinity,ipk=0;for(i=0;i<=iEnd;i++)if(y[i]>ymax){ymax=y[i];ipk=i;}
  var os=yf>0?Math.max(0,(ymax-yf)/yf*100):NaN;
  var t10=null,t90=null;for(i=0;i<=iEnd;i++){if(t10===null&&y[i]>=0.1*yf)t10=t[i];if(t90===null&&y[i]>=0.9*yf){t90=t[i];break;}}
  var ts=0;for(i=iEnd;i>=0;i--)if(Math.abs(y[i]-yf)>0.02*Math.abs(yf)){ts=t[Math.min(i+1,iEnd)];break;}
  var umaxAbs=0;for(i=0;i<=iEnd;i++)umaxAbs=Math.max(umaxAbs,Math.abs(sim.u[i]));
  return {unstable:false,settled:settledWin&&ts<t[iEnd]*0.95,yf:yf,ess:r-yf,os:os,peak:ymax,tpk:t[ipk],
    tr:(t10!==null&&t90!==null)?t90-t10:NaN,ts:ts,umax:umaxAbs};
}

// Loop-gain frequency response L(jw)=C(jw)G(jw); returns crossover wc (last |L|=1 crossing), phase margin (deg), and arrays
function cpoly(p,w){var re=0,im=0;for(var i=0;i<p.length;i++){var nr=re*0-im*w+p[i],ni=re*w+im*0;re=nr;im=ni;}return [re,im];}
function loopFreq(plant,Kp,Ki,Kd,N,wmin,wmax,npts){
  var G=PLANTS[plant],C=ctrlTF(Kp,Ki,Kd,N),den=pmul(C.den,G.den),num=C.num;
  wmin=wmin||1e-3;wmax=wmax||1e3;npts=npts||600;
  var W=[],mag=[],ph=[],prev=null,off=0;
  for(var k=0;k<npts;k++){var w=wmin*Math.pow(wmax/wmin,k/(npts-1));
    var a=cpoly(num,w),b=cpoly(den,w),m=Math.hypot(a[0],a[1])/Math.hypot(b[0],b[1]),p=Math.atan2(a[1],a[0])-Math.atan2(b[1],b[0]);
    if(prev!==null){while(p+off-prev>Math.PI)off-=2*Math.PI;while(p+off-prev<-Math.PI)off+=2*Math.PI;}
    p+=off;prev=p;W.push(w);mag.push(m);ph.push(p*180/Math.PI);}
  // low-frequency phase anchor: type-0 -> near 0, type-1 -> near -90 (shift by multiples of 360 if needed)
  var anchor=Ki?-90:0,shift=Math.round((anchor-ph[0])/360)*360;ph=ph.map(function(x){return x+shift;});
  var wc=null,pm=null;
  for(k=1;k<npts;k++)if((mag[k-1]-1)*(mag[k]-1)<=0&&mag[k-1]!==mag[k]){
    var f=(Math.log(mag[k-1]))/(Math.log(mag[k-1])-Math.log(mag[k]));
    wc=Math.exp(Math.log(W[k-1])+f*(Math.log(W[k])-Math.log(W[k-1])));pm=180+ph[k-1]+f*(ph[k]-ph[k-1]);}
  return {w:W,mag:mag,ph:ph,wc:wc,pm:pm};
}

return {loopFreq:loopFreq,PLANTS:PLANTS,simulate:simulate,metrics:metrics,closedLoopPoles:closedLoopPoles,roots:roots,ctrlTF:ctrlTF};
})();
if(typeof module!=="undefined")module.exports=PIDSIM;

/* ===== Extra loop simulator for the appendix (teaching plants only) =====
   Plant = optional static nonlinearity f(v), then K * series of first-order lags 1/(tau_i s + 1) (tau = Infinity means a pure integrator 1/s), after an optional dead time.
   Controller = PID (parallel form, derivative on error or measurement, filter N, setpoint weight b on P).
   Actuator chain: saturation -> rate limit -> deadzone (each optional). Sensor: optional first-order lag + noise.
   o: {taus:[..],K,f,delay,sensTau,Kp,Ki,Kd,N,b,dmeas,r:fn(t),d:fn(t),umax,rmax,dz,noise,seed,aw,T,dt}  */
var LOOPSIM=(function(){
"use strict";
function rng(seed){var s=seed>>>0||1;return function(){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function run(o){
  var dt=o.dt||0.005,T=o.T||20,n=Math.round(T/dt),taus=o.taus||[1],K=o.K==null?1:o.K,m=taus.length;
  var Kp=o.Kp||0,Ki=o.Ki||0,Kd=o.Kd||0,N=o.N||20,b=o.b==null?1:o.b,umax=o.umax==null?Infinity:o.umax,rmax=o.rmax==null?Infinity:o.rmax,dz=o.dz||0;
  var rf=o.r||function(){return 1;},df=o.d||function(){return 0;},f=o.f||function(v){return v;};
  var nd=Math.round((o.delay||0)/dt),buf=new Array(nd).fill(0),bi=0;
  var x=new Array(m).fill(0),ys=0,xi=0,xf=0,uprev=0,rand=rng(o.seed||7),sig=o.noise||0,nz=0;
  function gauss(){var a=rand()||1e-12,c=rand();return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*c);}
  var out={t:[],y:[],ym:[],u:[],v:[],r:[],uu:[]};
  var tauS=o.sensTau||0;
  function deriv(x,ys,vin,y){var d=new Array(m+1),inp=K*f(vin);
    for(var i=0;i<m;i++){var src=i===0?inp:x[i-1];d[i]=taus[i]===Infinity?src:(src-x[i])/taus[i];}
    d[m]=tauS?(y-ys)/tauS:0;return d;}
  for(var k=0;k<=n;k++){
    var t=k*dt,y=x[m-1],ymeas=tauS?ys:y;
    if(sig&&k%2===0)nz=sig*gauss();
    var ym=ymeas+nz,r=rf(t),e=r-ym,ed=o.dmeas?-ym:e;
    var up=Kp*(b*r-ym),ud=Kd?Kd*N*(ed-xf):0,uu=up+Ki*xi+ud,us=Math.max(-umax,Math.min(umax,uu));
    if(rmax<Infinity){var lim=rmax*dt;us=Math.max(uprev-lim,Math.min(uprev+lim,us));}
    uprev=us;
    var va=Math.abs(us)<=dz?0:us-Math.sign(us)*dz;
    var vd;if(nd>0){vd=buf[bi];buf[bi]=va;bi=(bi+1)%nd;}else vd=va;
    var vin=vd+df(t);
    out.t.push(t);out.y.push(y);out.ym.push(ymeas);out.u.push(us);out.v.push(vin);out.r.push(r);out.uu.push(uu);
    if(!isFinite(y)||Math.abs(y)>1e5)break;
    // integrator / derivative filter (Euler, dt small); clamp anti-windup if requested
    var integ=e;if(o.aw&&uu!==us&&(uu-us)*e>0)integ=0;
    xi+=Ki?integ*dt:0;xf+=Kd?N*(ed-xf)*dt:0;
    // plant + sensor RK4 with input held
    var s0=x.concat([ys]),k1=deriv(x,ys,vin,y),tmp,i;
    function adv(h,kk){tmp=[];for(i=0;i<=m;i++)tmp.push(s0[i]+h*kk[i]);return tmp;}
    var a=adv(dt/2,k1),k2=deriv(a.slice(0,m),a[m],vin,a[m-1]);
    a=adv(dt/2,k2);var k3=deriv(a.slice(0,m),a[m],vin,a[m-1]);
    a=adv(dt,k3);var k4=deriv(a.slice(0,m),a[m],vin,a[m-1]);
    for(i=0;i<m;i++)x[i]+=dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]);
    ys+=dt/6*(k1[m]+2*k2[m]+2*k3[m]+k4[m]);
  }
  return out;
}
return {run:run};
})();
if(typeof module!=="undefined")module.exports=LOOPSIM;

(function(){
"use strict";
var S=PIDSIM, $=function(id){return document.getElementById(id);};
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
  (o.marks||[]).forEach(function(m){s+='<circle cx="'+X(m.x)+'" cy="'+Y(m.y)+'" r="4.5" class="'+(m.cls||"f1")+'"/>';});
  s+='</g>';
  (o.marks||[]).forEach(function(m){if(!m.label)return;var yy=Math.max(T+11,Y(m.y)+(m.dy||-7)),xx=Math.min(L+pw-4,X(m.x)+(m.dx||7));s+='<text class="ann" x="'+xx+'" y="'+yy+'"'+(xx>=L+pw-4?' text-anchor="end"':(m.anchor?' text-anchor="'+m.anchor+'"':''))+'>'+m.label+'</text>';});
  (o.notes||[]).forEach(function(m){s+='<text class="'+(m.cls||"annm")+'" x="'+X(m.x)+'" y="'+Y(m.y)+'"'+(m.anchor?' text-anchor="'+m.anchor+'"':'')+'>'+m.t+'</text>';});
  return s+'</svg>';
}
function legend(id,items){var el=$(id);if(!el)return;el.innerHTML=items.map(function(it){return '<span class="'+(it.dash?"dash":"")+'" style="--lc:var(--'+it.c+')">'+it.t+'</span>';}).join("");}
function sim(o){return S.simulate(Object.assign({dt:0.01,N:20},o));}
function rng(arr,i0,i1){var lo=Infinity,hi=-Infinity;for(var i=i0||0;i<(i1||arr.length);i++){if(arr[i]<lo)lo=arr[i];if(arr[i]>hi)hi=arr[i];}return [lo,hi];}

/* ---------- static (computed) figures ---------- */
function figEID(){
  var Ki=0.5,s=sim({plant:"p3",Kp:1,Ki:Ki,T:20}),t=s.t,e=s.e,I=[0],D=[];
  for(var i=1;i<t.length;i++)I.push(I[i-1]+(e[i]+e[i-1])/2*(t[i]-t[i-1]));
  for(i=0;i<t.length;i++){var a=Math.max(0,i-1),b=Math.min(t.length-1,i+1);D.push((e[b]-e[a])/(t[b]-t[a]));}
  var h=150,w=640;
  $("fig-eid").innerHTML=
   plot({w:w,h:h,xr:[0,20],yr:[-0.2,1.05],ylabel:"e(t)",series:[{x:t,y:e,cls:"s2"}],hl:[{y:0}],notes:[{x:0.6,y:0.88,t:"PRESENT: P acts on e itself",cls:"ann"}],ny:4})+
   plot({w:w,h:h,xr:[0,20],yr:[0,2.6],ylabel:"∫e dτ",series:[{x:t,y:I,cls:"s4",area:true}],hl:[{y:1/Ki,label:"→ 1/Kᵢ = 2 (holds u = Kᵢ∫e = 1 while e = 0)"}],notes:[{x:0.6,y:2.25,t:"PAST: I acts on accumulated area",cls:"ann"}],ny:4})+
   plot({w:w,h:h+16,xr:[0,20],yr:[-0.5,0.15],ylabel:"de/dt",xlabel:"time t (s)",series:[{x:t,y:D,cls:"s3"}],hl:[{y:0}],notes:[{x:7,y:-0.36,t:"FUTURE: D acts on the slope (trend)",cls:"ann"}],ny:4});
}
function figPPID(){
  var a=sim({plant:"p3",Kp:2,T:20}),b=sim({plant:"p3",Kp:1,Ki:0.4,T:20}),c=sim({plant:"p3",Kp:2,Ki:0.8,Kd:1.6,T:20});
  legend("lg-ppid",[{t:"P (Kp=2)",c:"c2"},{t:"PI (Kp=1, Ki=0.4)",c:"c1"},{t:"PID (2, 0.8, 1.6)",c:"c3"},{t:"reference r",c:"ref",dash:1}]);
  $("fig-ppid").innerHTML=plot({xr:[0,20],yr:[0,1.4],xlabel:"time (s)",ylabel:"output y",
    series:[{x:a.t,y:a.y,cls:"s2"},{x:b.t,y:b.y,cls:"s1"},{x:c.t,y:c.y,cls:"s3"}],hl:[{y:1,label:"r = 1"},{y:2/3,label:"P settles at 2/3 → e_ss = 1/3"}],bands:[{y0:0.98,y1:1.02}]});
}
function figDist(){
  var a=sim({plant:"p3",Kp:2,r:0,T:25,dist:{t:1,amp:1}}),b=sim({plant:"p3",Kp:2,Ki:0.8,r:0,T:25,dist:{t:1,amp:1}});
  legend("lg-dist",[{t:"P only (Kp=2)",c:"c2"},{t:"PI (Kp=2, Ki=0.8)",c:"c1"}]);
  $("fig-dist").innerHTML=plot({xr:[0,25],yr:[-0.15,0.5],xlabel:"time (s)",ylabel:"output y (r = 0)",
    series:[{x:a.t,y:a.y,cls:"s2"},{x:b.t,y:b.y,cls:"s1"}],hl:[{y:1/3,label:"P: permanent offset 1/3"},{y:0}],vl:[{x:1,label:"load d = 1 applied"}]});
}
function figNoise(){
  var o={plant:"p3",Kp:2,Ki:0.8,T:20,noise:0.01,seed:7};
  var a=sim(o),b=sim(Object.assign({},o,{Kd:1.6,N:100})),c=sim(Object.assign({},o,{Kd:1.6,N:10}));
  var i0=800;function cut(s){return {x:s.t.slice(i0),y:s.u.slice(i0)};}
  var A=cut(a),B=cut(b),C=cut(c),r1=rng(B.y),m=Math.max(Math.abs(r1[0]-1),Math.abs(r1[1]-1))*1.08,yr=[1-m,1+m];
  legend("lg-noise",[{t:"PI (no D)",c:"c1"},{t:"PID, N = 100 (light filter)",c:"c2"},{t:"PID, N = 10 (heavier filter)",c:"c3"}]);
  // jitter = rms of u minus its 0.5 s centred moving average (removes the slow closed-loop motion)
  function std(y){var w=25,s=0,n=0;for(var i=w;i<y.length-w;i++){var mu=0;for(var j=i-w;j<=i+w;j++)mu+=y[j];mu/=(2*w+1);s+=(y[i]-mu)*(y[i]-mu);n++;}return Math.sqrt(s/n);}
  var h=118;
  $("fig-noise").innerHTML=
    plot({h:h,xr:[8,20],yr:yr,ylabel:"u",series:[{x:A.x,y:A.y,cls:"s1",sw:1.4}],ny:3,notes:[{x:8.3,y:yr[1]-m*0.25,t:"PI: jitter in u (rms) = "+std(A.y).toFixed(3),cls:"ann"}]})+
    plot({h:h,xr:[8,20],yr:yr,ylabel:"u",series:[{x:B.x,y:B.y,cls:"s2",sw:1.2}],ny:3,notes:[{x:8.3,y:yr[1]-m*0.25,t:"PID N=100: jitter = "+std(B.y).toFixed(3),cls:"ann"}]})+
    plot({h:h+16,xr:[8,20],yr:yr,ylabel:"u",xlabel:"time (s), transient omitted",series:[{x:C.x,y:C.y,cls:"s3",sw:1.4}],ny:3,notes:[{x:8.3,y:yr[1]-m*0.25,t:"PID N=10: jitter = "+std(C.y).toFixed(3),cls:"ann"}]});
}
function figZN(){
  var a=sim({plant:"p3",Kp:6,T:30}),b=sim({plant:"p3",Kp:8,T:30}),c=sim({plant:"p3",Kp:9,T:30});
  // measure period at Ku
  var ups=[],yf=8/9;for(var i=1;i<b.y.length;i++)if(b.y[i-1]<yf&&b.y[i]>=yf)ups.push(b.t[i]);
  var Tu=(ups[ups.length-1]-ups[1])/(ups.length-2);
  legend("lg-zn",[{t:"Kp = 6 (decays)",c:"c3"},{t:"Kp = Ku = 8 (sustained, Tu ≈ "+Tu.toFixed(2)+" s)",c:"c1"},{t:"Kp = 9 (grows: unstable)",c:"c5"}]);
  $("fig-zn").innerHTML=plot({xr:[0,30],yr:[-0.6,2.4],xlabel:"time (s)",ylabel:"output y (P only)",
    series:[{x:a.t,y:a.y,cls:"s3"},{x:c.t,y:c.y,cls:"s5",sw:1.6},{x:b.t,y:b.y,cls:"s1"}],hl:[{y:1,label:"r = 1"}]});
}
function figBode(){
  var D=[{n:"Robust",kp:1,ki:0.3,c:"c3",cls:"s3",f:"f3"},{n:"Balanced",kp:1,ki:0.5,c:"c1",cls:"s1",f:"f1"},{n:"Fast",kp:1.5,ki:0.6,c:"c2",cls:"s2",f:"f2"}];
  var ser=[],serp=[],mk=[],mkp=[],st=[],txt=[];
  D.forEach(function(d){var r=S.loopFreq("p3",d.kp,d.ki,0,20,0.01,10,500),m=S.metrics(sim({plant:"p3",Kp:d.kp,Ki:d.ki,T:40}));
    ser.push({x:r.w,y:r.mag.map(function(v){return 20*Math.log10(v);}),cls:d.cls});serp.push({x:r.w,y:r.ph,cls:d.cls});
    mk.push({x:r.wc,y:0,cls:d.f});mkp.push({x:r.wc,y:r.pm-180,cls:d.f});
    var s=sim({plant:"p3",Kp:d.kp,Ki:d.ki,T:30});st.push({x:s.t,y:s.y,cls:d.cls});
    d.txt=d.n+" (Kp="+d.kp+", Ki="+d.ki+"): ωc = "+r.wc.toFixed(2)+" rad/s, PM = "+r.pm.toFixed(0)+"°, OS = "+m.os.toFixed(1)+"%";txt.push(d.txt);});
  legend("lg-bode",D.map(function(d){return {t:d.n+" PI ("+d.kp+", "+d.ki+")",c:d.c};}));
  $("bode-read").textContent=txt.join(" · ");
  $("fig-bode").innerHTML=
    plot({h:200,xr:[0.01,10],logx:true,yr:[-40,40],yt:[-40,-20,0,20,40],ylabel:"|L(jω)| (dB)",series:ser,hl:[{y:0,label:"0 dB"}],marks:mk})+
    plot({h:216,xr:[0.01,10],logx:true,yr:[-270,-90],yt:[-270,-225,-180,-135,-90],ylabel:"∠L(jω) (deg)",xlabel:"frequency ω (rad/s), log scale",series:serp,hl:[{y:-180,label:"−180°"}],marks:mkp})+
    plot({h:200,xr:[0,30],yr:[0,1.3],ylabel:"step y",xlabel:"time (s): closed-loop step responses",series:st,hl:[{y:1}]});
}
function figWU(){
  var o={plant:"p1",Kp:2,Ki:4,T:6,umax:1.2},a=sim(Object.assign({},o,{aw:false})),b=sim(Object.assign({},o,{aw:true})),c=sim({plant:"p1",Kp:2,Ki:4,T:6});
  legend("lg-wu",[{t:"saturated, no anti-windup",c:"c5"},{t:"saturated, clamping anti-windup",c:"c3"},{t:"no limit (ideal linear)",c:"c4",dash:1}]);
  $("fig-wu").innerHTML=plot({h:210,xr:[0,6],yr:[0,1.3],ylabel:"output y",series:[{x:c.t,y:c.y,cls:"s4",dash:"5 4",sw:1.6},{x:a.t,y:a.y,cls:"s5"},{x:b.t,y:b.y,cls:"s3"}],hl:[{y:1}]});
  $("fig-wu-u").innerHTML=plot({h:170,xr:[0,6],yr:[-0.6,2.2],ylabel:"control u",xlabel:"time (s)",series:[{x:c.t,y:c.u,cls:"s4",dash:"5 4",sw:1.6},{x:a.t,y:a.u,cls:"s5"},{x:b.t,y:b.u,cls:"s3"}],hl:[{y:1.2,label:"limit +1.2"}],ny:4});
}

/* ---------- 2nd-order widget ---------- */
function w2(){
  var z=+$("z").value,wn=+$("wn").value;$("o-z").textContent=z.toFixed(2);$("o-wn").textContent=wn.toFixed(2);
  var sig=z<1?z*wn:wn*(z-Math.sqrt(z*z-1)),Tend=Math.min(80,Math.max(5,1.5*4/sig)),dt=Tend/4000,x1=0,x2=0,t=[0],y=[0];
  function f(a,b){return [b,wn*wn*(1-a)-2*z*wn*b];}
  for(var k=1;k<=4000;k++){var k1=f(x1,x2),k2=f(x1+dt/2*k1[0],x2+dt/2*k1[1]),k3=f(x1+dt/2*k2[0],x2+dt/2*k2[1]),k4=f(x1+dt*k3[0],x2+dt*k3[1]);
    x1+=dt/6*(k1[0]+2*k2[0]+2*k3[0]+k4[0]);x2+=dt/6*(k1[1]+2*k2[1]+2*k3[1]+k4[1]);t.push(k*dt);y.push(x1);}
  var ymax=0,ipk=0;for(k=0;k<y.length;k++)if(y[k]>ymax){ymax=y[k];ipk=k;}
  var osm=Math.max(0,(ymax-1)*100),ts=0;for(k=y.length-1;k>=0;k--)if(Math.abs(y[k]-1)>0.02){ts=t[Math.min(k+1,y.length-1)];break;}
  var t10=null,t90=null;for(k=0;k<y.length;k++){if(t10===null&&y[k]>=0.1)t10=t[k];if(t90===null&&y[k]>=0.9){t90=t[k];break;}}
  var osf=z<1?100*Math.exp(-Math.PI*z/Math.sqrt(1-z*z)):0,tsf=4/(z*wn),tpf=z<1?Math.PI/(wn*Math.sqrt(1-z*z)):NaN,trf=(1.768*z*z*z-0.417*z*z+1.039*z+1)/wn;
  legend("lg-2nd",[{t:"step response",c:"c1"},{t:"±2% band",c:"c3"}]);
  $("plot-2nd").innerHTML=plot({h:220,xr:[0,Tend],yr:[0,Math.max(1.25,ymax*1.08)],xlabel:"time (s)",ylabel:"y",series:[{x:t,y:y,cls:"s1"}],hl:[{y:1}],bands:[{y0:0.98,y1:1.02}],
    marks:osm>0.05?[{x:t[ipk],y:ymax,cls:"f2",label:"peak "+osm.toFixed(1)+"%"}]:[],vl:ts>0?[{x:ts,label:"Ts"}]:[]});
  // s-plane
  var Wd=280,Hd=170,cx=Wd-40,cy=Hd/2,sc=Math.min((cx-20)/Math.max(wn*z+0.5,wn*(z+Math.sqrt(Math.max(0,z*z-1)))+0.3,1),(cy-14)/Math.max(wn,1));
  var p=[];if(z<1){p=[[-z*wn,wn*Math.sqrt(1-z*z)],[-z*wn,-wn*Math.sqrt(1-z*z)]];}else{var q=Math.sqrt(z*z-1);p=[[-wn*(z-q),0],[-wn*(z+q),0]];}
  var sv='<svg viewBox="0 0 '+Wd+' '+Hd+'" style="max-width:340px;margin:.3rem auto 0" role="img" aria-label="s-plane poles">';
  sv+='<line class="ax" x1="8" y1="'+cy+'" x2="'+(Wd-8)+'" y2="'+cy+'"/><line class="ax" x1="'+cx+'" y1="6" x2="'+cx+'" y2="'+(Hd-6)+'"/>';
  sv+='<text class="tk" x="'+(Wd-12)+'" y="'+(cy-5)+'" text-anchor="end">Re</text><text class="tk" x="'+(cx+5)+'" y="16">Im</text>';
  if(z<1){sv+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(wn*sc)+'" fill="none" stroke="var(--grid)" stroke-dasharray="3 3"/>';
    sv+='<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+p[0][0]*sc)+'" y2="'+(cy-p[0][1]*sc)+'" stroke="var(--c4)" stroke-width="1.3"/>';
    sv+='<text class="annm" x="'+(cx-34)+'" y="'+(cy-6)+'">θ</text>';}
  p.forEach(function(P){var X=cx+P[0]*sc,Y=cy-P[1]*sc;sv+='<path d="M'+(X-5)+','+(Y-5)+'L'+(X+5)+','+(Y+5)+'M'+(X-5)+','+(Y+5)+'L'+(X+5)+','+(Y-5)+'" stroke="var(--c2)" stroke-width="2.4"/>';});
  sv+='<text class="annm" x="10" y="'+(Hd-8)+'">poles: '+p.map(function(P){return P[0].toFixed(2)+(P[1]?(P[1]>0?" + ":" − ")+Math.abs(P[1]).toFixed(2)+"j":"");}).join(",  ")+'</text></svg>';
  $("splane-2nd").innerHTML=sv;
  function cell(l,f,m){return '<div>'+l+'<b>'+m+'</b>formula: '+f+'</div>';}
  $("ro-2nd").innerHTML=cell("Overshoot",osf.toFixed(1)+"%",osm.toFixed(1)+"%")+cell("Settling (2%)",tsf.toFixed(2)+" s",ts.toFixed(2)+" s")+
    cell("Peak time",isNaN(tpf)?"— (no peak)":tpf.toFixed(2)+" s",osm>0.05?t[ipk].toFixed(2)+" s":"—")+cell("Rise 10–90%",trf.toFixed(2)+" s",(t90-t10).toFixed(2)+" s");
}

/* ---------- PID lab ---------- */
var PRE={
  p3:{P:[2,0,0],PI:[1,0.4,0],PID:[2,0.8,1.6],I:[0,0.3,0],Ku:[8,0,0],ZN:[4.8,+(4.8/(Math.PI/Math.sqrt(3))).toFixed(2),+(4.8*Math.PI/(4*Math.sqrt(3))).toFixed(2)]},
  p2:{P:[4,0,0],PI:[2,2,0],PID:[4,4,0.8],I:[0,0.5,0],Ku:null,ZN:null},
  p1:{P:[3,0,0],PI:[2,4,0],PID:[3,5,0.2],I:[0,0.25,0],Ku:null,ZN:null}
};
var ghost=null,committed=null,last=null;
function labParams(){return {plant:$("pl").value,Kp:+$("kp").value,Ki:+$("ki").value,Kd:+$("kd").value,N:+$("nf").value,T:+$("tw").value,
  dist:$("cDist").checked?{t:+$("tw").value/2,amp:-0.5}:null,noise:$("cNoise").checked?0.01:0,umax:$("cSat").checked?1.2:null,aw:$("cAW").checked,dmeas:$("cDm").checked,seed:99};}
function pct(a,p){var b=a.slice().sort(function(x,y){return x-y;});return b[Math.min(b.length-1,Math.max(0,Math.floor(p*(b.length-1))))];}
function lab(){
  var o=labParams();
  $("o-kp").textContent=o.Kp.toFixed(2);$("o-ki").textContent=o.Ki.toFixed(2);$("o-kd").textContent=o.Kd.toFixed(2);$("o-n").textContent=o.N;$("o-T").textContent=o.T;
  var s=sim(o);last={o:o,s:s};
  var m=S.metrics(s,o.dist?o.dist.t:null),poles=S.closedLoopPoles(o.plant,o.Kp,o.Ki,o.Kd,o.N),mr=-Infinity;
  poles.forEach(function(p){if(p[0]>mr)mr=p[0];});
  var lf=(o.Kp||o.Ki||o.Kd)?S.loopFreq(o.plant,o.Kp,o.Ki,o.Kd,o.N,1e-3,1e3,700):{wc:null,pm:null};
  var ys=s.y,yr=rng(ys),ylo=Math.min(-0.05,yr[0]),yhi=Math.max(1.3,Math.min(yr[1]*1.06,3));if(!isFinite(yhi))yhi=3;if(ylo<-2)ylo=-2;
  var ser=[];if(ghost&&$("cGhost").checked)ser.push({x:ghost.t,y:ghost.y,cls:"s4",dash:"4 4",sw:1.6,op:0.7});
  ser.push({x:s.t,y:s.y,cls:"s1"});
  legend("lg-lab",[{t:"output y",c:"c1"},{t:"reference r",c:"ref",dash:1}].concat(ghost&&$("cGhost").checked?[{t:"previous run (ghost)",c:"c4",dash:1}]:[]).concat([{t:"control u (lower plot)",c:"c2"},{t:"±2% band",c:"c3"}]));
  var marks=[];if(m&&!m.unstable&&m.os>0.1&&isFinite(m.peak))marks.push({x:m.tpk,y:m.peak,cls:"f2",label:m.os.toFixed(1)+"% OS"});
  $("plot-lab").innerHTML=plot({h:250,xr:[0,o.T],yr:[ylo,yhi],xlabel:"",ylabel:"output y",series:ser,hl:[{y:1,label:"r = 1"}],bands:m&&!m.unstable&&m.yf>0?[{y0:m.yf*0.98,y1:m.yf*1.02}]:[],
    marks:marks,vl:o.dist?[{x:o.dist.t,label:"load d = −0.5"}]:[],vbands:[]});
  var lo=Math.min(-0.2,pct(s.u,0.01)),hi=Math.max(1.5,pct(s.u,0.99));var pad=(hi-lo)*0.08;
  $("plot-lab-u").innerHTML=plot({h:140,xr:[0,o.T],yr:[lo-pad,hi+pad],xlabel:"time (s)",ylabel:"u",series:[{x:s.t,y:s.u,cls:"s2",sw:1.5}],ny:3,
    hl:o.umax?[{y:o.umax,label:"limit"}]:[]});
  // status
  var st=$("lab-status"),cls="ok",msg;
  var satd=o.umax?s.u.some(function(v){return Math.abs(v)>=o.umax-1e-9;}):false;
  if(s.unstable||(mr>1e-3&&!satd)){cls="bad";msg="Unstable: closed-loop pole(s) in the right half-plane (max Re = "+mr.toFixed(3)+"). Response diverges.";}
  else if(mr>1e-3){cls="bad";msg="Linear loop is unstable (RHP poles, max Re = "+mr.toFixed(3)+"). The actuator limit keeps signals bounded, so you see a sustained oscillation (limit cycle) instead of divergence.";}
  else if(mr>-2e-3){cls="warn";msg="Marginally stable: poles on the jω-axis, so sustained oscillation (this is K_u if P-only).";}
  else{msg="Stable: all closed-loop poles in the left half-plane.";if(!m.settled)msg+=" Not settled within the window; lengthen it.";}
  if(satd){msg+=" Actuator saturates, so the loop is nonlinear and pole/margin readouts describe the unsaturated loop only.";if(cls==="ok")cls="warn";}
  st.className="status "+cls;st.textContent=msg;
  // readouts
  function c(l,v,k){return '<div class="'+(k||"")+'">'+l+'<b>'+v+'</b></div>';}
  var dom=poles.slice().sort(function(a,b){return b[0]-a[0];})[0];
  var good=m&&!m.unstable&&m.settled;
  var h="";
  h+=c("Overshoot",good?m.os.toFixed(1)+"%":"—",good?(m.os<5?"ok":m.os<20?"warn":"bad"):"");
  h+=c("Settling (2%)",good?m.ts.toFixed(2)+" s":"not settled",good?(m.ts<5?"ok":""):"bad");
  h+=c("Rise 10–90%",good&&isFinite(m.tr)?m.tr.toFixed(2)+" s":"—");
  h+=c("Steady-state error",good?(Math.abs(m.ess)<5e-4?"0":m.ess.toFixed(3)):"—",good?(Math.abs(m.ess)<5e-3?"ok":"warn"):"");
  h+=c("Peak |u|",m&&!m.unstable?m.umax.toFixed(2):"—",m&&m.umax>10?"warn":"");
  h+=c("Crossover ω<sub>c</sub>",lf.wc?lf.wc.toFixed(2)+" rad/s":"—");
  h+=c("Phase margin",lf.pm!=null?lf.pm.toFixed(0)+"°":"—",lf.pm!=null?(lf.pm>=60?"ok":lf.pm>=30?"warn":"bad"):"");
  h+=c("Dominant pole(s)",dom?(dom[0].toFixed(2)+(dom[1]?" ± "+Math.abs(dom[1]).toFixed(2)+"j":"")):"—");
  if(dom&&dom[1]){var zeta=-dom[0]/Math.hypot(dom[0],dom[1]);if(Math.abs(zeta)<0.005)zeta=0;h+=c("ζ of dominant pair",zeta.toFixed(2));}
  $("ro-lab").innerHTML=h;
  return s;
}
var dragging=false;
function cur(){return last?{t:last.s.t,y:last.s.y}:null;}
function discrete(){if(committed)ghost=committed;lab();committed=cur();}
function sliderInput(){if(!dragging){ghost=committed;dragging=true;}lab();}
function sliderDone(){dragging=false;committed=cur();}
function setGains(g){$("kp").value=g[0];$("ki").value=g[1];$("kd").value=g[2];}
function updatePresetButtons(){var P=PRE[$("pl").value];document.querySelectorAll("#presets button").forEach(function(b){b.disabled=!P[b.dataset.p];b.style.opacity=P[b.dataset.p]?1:.4;});}
function initLab(){
  ["kp","ki","kd","nf","tw"].forEach(function(id){$(id).addEventListener("input",sliderInput);$(id).addEventListener("change",sliderDone);});
  ["cDist","cNoise","cSat","cAW","cDm"].forEach(function(id){$(id).addEventListener("change",discrete);});
  $("cGhost").addEventListener("change",lab);
  $("pl").addEventListener("change",function(){ghost=null;committed=null;setGains(PRE[$("pl").value].PI);$("tw").value=$("pl").value==="p3"?30:10;updatePresetButtons();lab();committed=cur();});
  document.querySelectorAll("#presets button").forEach(function(b){b.addEventListener("click",function(){var g=PRE[$("pl").value][b.dataset.p];if(!g)return;setGains(g);$("tw").value=b.dataset.p==="I"?($("pl").value==="p3"?60:20):($("pl").value==="p3"?30:10);discrete();});});
  updatePresetButtons();lab();committed=cur();
}

/* ---------- Appendix: failure-mode gallery figures (teaching plants) ---------- */
function apLeg(k,items){legend("lg-ap-"+k,items);}
function apOut(k,arr){$("fg-ap-"+k).innerHTML=arr.join("");}
function apLB(o){return LOOPSIM.run(o);}
function figAppendix(){
  var FIX={cls:"s3",dash:"6 4",sw:2,op:"0.9"},PRB={cls:"s2"};
  function ser(s,sty,key){var o=Object.assign({x:s.t,y:s[key||"y"]},sty);return o;}
  var base={xlabel:"time (s)",h:190};
  function P(o){return plot(Object.assign({},base,o));}
  var band=[{y0:0.98,y1:1.02}];
  /* A1 slow */
  var a=sim({plant:"p2",Kp:0.3,Ki:0.2,T:30}),b=sim({plant:"p2",Kp:1.5,Ki:1,T:30});
  apLeg("slow",[{t:"PI K\u209a=0.3, K\u1d62=0.2 (slow)",c:"c2"},{t:"fixed: K\u209a=1.5, K\u1d62=1",c:"c3",dash:1},{t:"reference r",c:"ref",dash:1}]);
  apOut("slow",[P({xr:[0,30],yr:[0,1.2],ylabel:"output y",series:[ser(a,PRB),ser(b,FIX)],hl:[{y:1,label:"r = 1"}],bands:band})]);
  /* A2 offset */
  a=sim({plant:"p2",Kp:2,T:20});b=sim({plant:"p2",Kp:2,Ki:1,T:20});
  apLeg("offset",[{t:"P only, K\u209a=2",c:"c2"},{t:"fixed: PI, K\u209a=2, K\u1d62=1",c:"c3",dash:1},{t:"reference r",c:"ref",dash:1}]);
  apOut("offset",[P({xr:[0,20],yr:[0,1.3],ylabel:"output y",series:[ser(a,PRB),ser(b,FIX)],hl:[{y:1,label:"r = 1"},{y:2/3,label:"offset: y settles at 2/3"}]})]);
  /* A3 overshoot */
  a=sim({plant:"p2",Kp:2,Ki:3.5,T:15});b=sim({plant:"p2",Kp:2,Ki:1,T:15});
  var ma=S.metrics(a,null,1);
  apLeg("overshoot",[{t:"PI K\u209a=2, K\u1d62=3.5 (overshoot)",c:"c2"},{t:"fixed: K\u1d62=1",c:"c3",dash:1},{t:"reference r",c:"ref",dash:1}]);
  apOut("overshoot",[P({xr:[0,15],yr:[0,1.5],ylabel:"output y",series:[ser(a,PRB),ser(b,FIX)],hl:[{y:1,label:"r = 1"}],marks:[{x:ma.tpk,y:ma.peak,cls:"f2",label:"peak \u2248 "+Math.round(ma.os)+"% over",dx:8}]})]);
  /* A4 oscillation */
  a=sim({plant:"p3",Kp:8,T:20});var c=sim({plant:"p3",Kp:12,T:20});b=sim({plant:"p3",Kp:2,T:20});
  apLeg("oscillation",[{t:"K\u209a=8 = K\u1d64 (sustained)",c:"c2"},{t:"K\u209a=12 (grows, clipped)",c:"c5"},{t:"fixed: K\u209a=2 (calm; P-only offset)",c:"c3",dash:1}]);
  apOut("oscillation",[P({xr:[0,20],yr:[-1.5,3.5],ylabel:"output y",series:[ser(c,{cls:"s5"}),ser(a,PRB),ser(b,FIX)],hl:[{y:1,label:"r = 1"}]})]);
  /* A5 disturbance */
  a=sim({plant:"p2",Kp:0.8,Ki:0.4,r:0,T:20,dist:{t:1,amp:1}});b=sim({plant:"p2",Kp:3,Ki:3,r:0,T:20,dist:{t:1,amp:1}});
  apLeg("disturbance",[{t:"weak PI (0.8, 0.4)",c:"c2"},{t:"fixed: stronger PI (3, 3)",c:"c3",dash:1}]);
  apOut("disturbance",[P({xr:[0,20],yr:[-0.1,0.6],ylabel:"output y (r = 0)",series:[ser(a,PRB),ser(b,FIX)],hl:[{y:0,label:"target"}],vl:[{x:1,label:"load d = 1 hits"}]})]);
  /* A6 noise */
  a=sim({plant:"p2",Kp:2,Ki:1,Kd:0.5,N:100,noise:0.02,T:10});b=sim({plant:"p2",Kp:2,Ki:1,Kd:0.5,N:10,noise:0.02,T:10});
  apLeg("noise",[{t:"N = 100 (D unfiltered)",c:"c2"},{t:"fixed: N = 10",c:"c3",dash:1}]);
  apOut("noise",[P({h:130,xlabel:"",xr:[0,10],yr:[0,1.3],ylabel:"output y",series:[ser(a,PRB),ser(b,FIX)],hl:[{y:1}]}),
                 P({h:190,xr:[0,10],yr:[-3,6],ylabel:"control u",series:[ser(a,{cls:"s2",sw:1.4},"u"),ser(b,{cls:"s3",sw:2,dash:"6 4"},"u")]})]);
  /* A7 windup */
  a=sim({plant:"p1",Kp:2,Ki:4,umax:1.2,T:6});b=sim({plant:"p1",Kp:2,Ki:4,umax:1.2,aw:true,T:6});
  var mw=S.metrics(a,null,1),mf=S.metrics(b,null,1);
  apLeg("windup",[{t:"PI, |u|\u22641.2, no anti-windup",c:"c2"},{t:"fixed: with clamping anti-windup",c:"c3",dash:1}]);
  apOut("windup",[P({h:150,xlabel:"",xr:[0,6],yr:[0,1.4],ylabel:"output y",series:[ser(a,PRB),ser(b,FIX)],hl:[{y:1,label:"r = 1"}],marks:[{x:mw.tpk,y:mw.peak,cls:"f2",label:"\u2248"+Math.round(mw.os)+"% over",dx:8}]}),
                  P({h:150,xr:[0,6],yr:[-0.6,2.2],ylabel:"control u",series:[ser(a,PRB,"u"),ser(b,FIX,"u")],hl:[{y:1.2,label:"limit +1.2"}],ny:4})]);
  /* A8 kick */
  a=sim({plant:"p2",Kp:2,Ki:1,Kd:0.5,N:20,T:1.5});b=sim({plant:"p2",Kp:2,Ki:1,Kd:0.5,N:20,dmeas:true,T:1.5});
  apLeg("kick",[{t:"D on error: spike in u at the step",c:"c2"},{t:"fixed: D on measurement",c:"c3",dash:1}]);
  apOut("kick",[P({xr:[0,1.5],yr:[0,13],ylabel:"control u",series:[ser(a,PRB,"u"),ser(b,FIX,"u")],nx:6,notes:[{x:0.08,y:11.4,t:"r steps 0\u21921 at t = 0",cls:"annm"}]})]);
  /* A9 limits */
  a=sim({plant:"p2",Kp:2,Ki:1.5,r:2,T:12});b=sim({plant:"p2",Kp:2,Ki:1.5,r:2,umax:2.5,aw:true,T:12});
  var c1=apLB({taus:[1,1,1],Kp:3,Ki:0.8,T:25,r:function(){return 1;}}),c2=apLB({taus:[1,1,1],Kp:3,Ki:0.8,rmax:0.5,T:25,r:function(){return 1;}});
  apLeg("limits",[{t:"with limit",c:"c2"},{t:"ideal (no limit), for contrast",c:"c3",dash:1},{t:"reference r",c:"ref",dash:1}]);
  apOut("limits",[P({h:170,xr:[0,12],yr:[0,2.4],ylabel:"y, |u| \u2264 2.5",series:[ser(b,PRB),ser(a,FIX)],hl:[{y:2,label:"r = 2"}]}),
                  P({h:170,xr:[0,25],yr:[0,2],ylabel:"y, rate \u2264 0.5/s",series:[ser(c2,PRB),ser(c1,FIX)],hl:[{y:1,label:"r = 1"}]})]);
  /* A10 delay */
  a=apLB({taus:[1],delay:1,Kp:2,Ki:2,T:30});b=apLB({taus:[1],delay:1,Kp:0.5,Ki:0.4,T:30});
  apLeg("delay",[{t:"PI (2, 2), delay 1 s (unstable, clipped)",c:"c2"},{t:"fixed: PI (0.5, 0.4)",c:"c3",dash:1}]);
  apOut("delay",[P({xr:[0,30],yr:[-1,2.5],ylabel:"output y",series:[ser(a,PRB),ser(b,FIX)],hl:[{y:1,label:"r = 1"}]})]);
  /* A11 sensor lag */
  a=apLB({taus:[1,0.5],sensTau:1.5,Kp:2,Ki:1,T:25});b=apLB({taus:[1,0.5],sensTau:1.5,Kp:0.8,Ki:0.4,T:25});
  apLeg("sensorlag",[{t:"true y, PI (2, 1)",c:"c2"},{t:"what the controller sees (lagged)",c:"c4",dash:1},{t:"fixed: true y, PI (0.8, 0.4)",c:"c3",dash:1}]);
  apOut("sensorlag",[P({xr:[0,25],yr:[0,2],ylabel:"output y",series:[ser(a,{cls:"s4",dash:"2 4",sw:1.8},"ym"),ser(a,PRB),ser(b,FIX)],hl:[{y:1,label:"r = 1"}]})]);
  /* A12 nonlinear */
  var f=function(u){return Math.pow(Math.max(0,u),2);};
  function nl(r,kp,ki){var s=apLB({taus:[1,0.5],f:f,Kp:kp,Ki:ki,T:30,r:function(){return r;}});return {t:s.t,y:s.y.map(function(v){return v/r;})};}
  a=nl(1,2,1.5);b=nl(9,2,1.5);c=nl(9,2/3,0.5);
  apLeg("nonlinear",[{t:"step to r=1 (design point)",c:"c1"},{t:"step to r=9, same gains",c:"c2"},{t:"fixed: r=9, gains \u00f73",c:"c3",dash:1}]);
  apOut("nonlinear",[P({xr:[0,30],yr:[0,2.4],ylabel:"normalised output y / r",series:[ser(a,{cls:"s1"}),ser(b,PRB),ser(c,FIX)],hl:[{y:1,label:"y / r = 1"}]})]);
  /* A13 2-DOF */
  var dd=function(t){return t>=15?-1:0;};
  a=apLB({taus:[1,0.5],Kp:1.5,Ki:4,T:30,r:function(){return 1;},d:dd});
  b=apLB({taus:[1,0.5],Kp:1.5,Ki:4,T:30,r:function(t){return 1-Math.exp(-t/1.5);},d:dd});
  apLeg("twodof",[{t:"plain PI (1.5, 4)",c:"c2"},{t:"fixed: same PI + set-point filter 1/(1.5s+1)",c:"c3",dash:1},{t:"reference r",c:"ref",dash:1}]);
  apOut("twodof",[P({xr:[0,30],yr:[0,1.7],ylabel:"output y",series:[ser(a,PRB),ser(b,FIX)],hl:[{y:1,label:"r = 1"}],vl:[{x:15,label:"load \u22121 hits"}]})]);
  /* A14 limit cycle */
  a=apLB({taus:[1,Infinity],Kp:0.5,Ki:0.5,dz:0.3,T:100,r:function(){return 1;}});b=apLB({taus:[1,Infinity],Kp:0.5,Ki:0.3,dz:0.3,T:100,r:function(){return 1;}});
  apLeg("limitcycle",[{t:"PI (0.5, 0.5), dead zone \u00b10.3",c:"c2"},{t:"fixed: K\u1d62 = 0.3",c:"c3",dash:1},{t:"reference r",c:"ref",dash:1}]);
  apOut("limitcycle",[P({xr:[0,100],yr:[-0.5,2.5],ylabel:"output y",series:[ser(a,PRB),ser(b,FIX)],hl:[{y:1,label:"r = 1"}]})]);
}
/* expand-all + deep links into collapsed cards */
function initAppendix(){
  var cards=[].slice.call(document.querySelectorAll("details.apcard")),btn=$("apAll");
  function sync(){var all=cards.every(function(c){return c.open;});btn.textContent=all?"Collapse all":"Expand all";}
  btn.addEventListener("click",function(){var all=cards.every(function(c){return c.open;});cards.forEach(function(c){c.open=!all;});sync();});
  cards.forEach(function(c){c.addEventListener("toggle",sync);});
  function openHash(){var h=location.hash.slice(1),el=h&&document.getElementById(h);if(el&&el.tagName==="DETAILS"){el.open=true;setTimeout(function(){el.scrollIntoView();},0);}}
  window.addEventListener("hashchange",openHash);
  document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest('a[href^="#ap-"]');if(!a)return;var el=document.getElementById(a.getAttribute("href").slice(1));if(el&&el.tagName==="DETAILS")el.open=true;});
  openHash();
}

/* breadcrumb tracking: replaced by the board header */function track(){}

/* ---------- init ---------- */
figEID();figPPID();figDist();figNoise();figZN();figBode();figWU();figAppendix();initAppendix();
$("z").addEventListener("input",w2);$("wn").addEventListener("input",w2);w2();
initLab();track();
window.__guideReady=true;
})();

}
