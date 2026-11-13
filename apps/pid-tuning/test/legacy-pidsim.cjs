// Frozen copy of the original PID guide simulator (PIDSIM), lines 1-130 of its script, used ONLY to check the core simulator against it.

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
