// @ts-nocheck
/* The six-domains board, migrated 1:1 from the original single-file page.
   Pure math lives in @study/core/dsp and ./model (unit-tested); this module is the DOM/canvas layer. */
import content from 'virtual:study-content';
import { C, cadd, csub, cmul, cdiv, cabs, carg, cexpj, cscale, TAU, WINS, windowAt, windowMetrics, dft as coreDft } from '@study/core/dsp';
import { derive, xt as mxt, Xs as mXs, Xjw as mXjw, Xz as mXz } from '../model';
import BOARD_HTML from './board.html?raw';
import './board.css';

export function mountBoard(host, params) {
host.classList.add('legacy-board');
host.setAttribute('data-theme','dark');
host.innerHTML=BOARD_HTML;
/* ---------- state ---------- */
const DEF={A:1,wave:'free',mode:'under',sig:0.6,f0:1,dl:1,fs:8,M:32,N:64,win:'rect',beta:6,alpha:0.5,interp:'zoh',db:false,sel:'samp',ctv:'sig',cop:true};
/* View toggles that picking a transform sets (a visible convenience; the toggles can be overridden afterwards) */
const viewFor=sel=>({ctv:sel==='fs'?'per':'sig',cop:sel==='dtft'||sel==='samp'||sel==='map'});
let S=Object.assign({},DEF);

const D=()=>derive(S);
const xt=(t,d)=>mxt(t,d,S);
const Xs=(s,d)=>mXs(s,d,S);
const Xjw=(w,d)=>mXjw(w,d,S);
const Xz=(z,d)=>mXz(z,d,S);
/* ---------- windows (shared implementation in @study/core/dsp) ---------- */
const win=(n,M)=>windowAt(S.win,n,M,{beta:S.beta,alpha:S.alpha});
let winCache={key:null,m:null};
function winMetrics(){const key=[S.win,S.M,S.beta,S.alpha].join('|');if(winCache.key===key)return winCache.m;
  const m=windowMetrics(S.win,S.M,{beta:S.beta,alpha:S.alpha});winCache={key,m};return m;}
function samples(d){const x=[];for(let n=0;n<S.M;n++)x.push(xt(n*d.T,d));return x;}
function dtftRecord(w,xw,d){ // windowed/truncated record, length L
  let re=0,im=0;for(let n=0;n<d.L;n++){const th=-w*n*d.T;re+=xw[n]*Math.cos(th);im+=xw[n]*Math.sin(th);}return C(re,im);
}
const dft=(xw,d)=>coreDft(xw,S.N,d.L);

/* ---------- canvas plotting ---------- */
const COL={yel:'#f2e85a',pink:'#ff7eb9',cyan:'#4fc3f7',grn:'#6ee26e',org:'#ff8a5c',vio:'#b197fc',chalk:'#f1f1f1',muted:'#8f8f8f',grid:'#333',axis:'#9a9a9a'};
let FK=1;
function setup(cv){
  const r=cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  const W=Math.max(10,r.width),H=Math.max(10,r.height);
  FK=cv.dataset.big?Math.max(1.15,Math.min(1.75,Math.min(W/560,H/330))):1;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  return {g,W,H,small:W<230};
}
function frame(g,x,y,w,h,xr,yr){
  const X=v=>x+(v-xr[0])/(xr[1]-xr[0])*w, Y=v=>y+h-(v-yr[0])/(yr[1]-yr[0])*h;
  return {g,x,y,w,h,xr,yr,X,Y};
}
function niceStep(span,n){const raw=span/n,p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p;return (m<1.5?1:m<3.5?2:m<7.5?5:10)*p;}
function fmt(v,s){const dec=s>=1?0:Math.min(3,Math.ceil(-Math.log10(s)));return (Math.abs(v)<1e-9?0:v).toFixed(dec);}
function axes(F,o={}){
  const g=F.g;g.save();g.font=(9.5*FK)+'px system-ui,sans-serif';g.lineWidth=1;
  const sx=niceStep(F.xr[1]-F.xr[0],o.nx||4);
  g.fillStyle=COL.muted;g.textAlign='center';g.textBaseline='top';
  for(let v=Math.ceil(F.xr[0]/sx)*sx;v<=F.xr[1]+1e-9;v+=sx){const px=F.X(v);g.strokeStyle=COL.grid;g.beginPath();g.moveTo(px,F.y);g.lineTo(px,F.y+F.h);g.stroke();if(!o.noxl)g.fillText(fmt(v,sx),px,F.y+F.h+1);}
  if(o.y0!==false){const y0=F.Y(Math.min(Math.max(0,F.yr[0]),F.yr[1]));g.strokeStyle=COL.axis;g.beginPath();g.moveTo(F.x,y0);g.lineTo(F.x+F.w,y0);g.stroke();}
  if(o.xl){g.textAlign='right';g.textBaseline='bottom';g.fillStyle=COL.muted;g.fillText(o.xl,F.x+F.w,F.y+F.h-1);}
  if(o.yl){g.textAlign='left';g.textBaseline='top';g.fillStyle=COL.muted;g.fillText(o.yl,F.x+2,F.y+1);}
  g.restore();
}
function line(F,xs,ys,col,lw=1.8,dash=null,alpha=1){
  const g=F.g;g.save();g.beginPath();g.rect(F.x,F.y-2,F.w,F.h+4);g.clip();
  g.strokeStyle=col;g.lineWidth=lw;g.globalAlpha=alpha;if(dash)g.setLineDash(dash);g.lineJoin='round';g.beginPath();let pen=false;
  for(let i=0;i<xs.length;i++){const y=ys[i];if(!isFinite(y)){pen=false;continue;}const px=F.X(xs[i]),py=F.Y(Math.max(F.yr[0]-1e3,Math.min(F.yr[1]+1e3,y)));pen?g.lineTo(px,py):g.moveTo(px,py);pen=true;}
  g.stroke();g.restore();
}
function stems(F,xs,ys,col,dots=true,lw=1.4,alpha=1){
  const g=F.g;g.save();g.beginPath();g.rect(F.x,F.y-3,F.w,F.h+6);g.clip();g.strokeStyle=col;g.fillStyle=col;g.lineWidth=lw;g.globalAlpha=alpha;
  const yb=F.Y(Math.min(Math.max(0,F.yr[0]),F.yr[1]));
  for(let i=0;i<xs.length;i++){const px=F.X(xs[i]);if(px<F.x-2||px>F.x+F.w+2||!isFinite(ys[i]))continue;const py=F.Y(Math.max(F.yr[0],Math.min(F.yr[1],ys[i])));g.beginPath();g.moveTo(px,yb);g.lineTo(px,py);g.stroke();if(dots){g.beginPath();g.arc(px,py,2.1*Math.sqrt(FK),0,TAU);g.fill();}}
  g.restore();
}
function vmark(F,v,col,label,dash=[3,3],bot=false){
  if(v<F.xr[0]||v>F.xr[1])return;const g=F.g,px=F.X(v);g.save();g.strokeStyle=col;g.setLineDash(dash);g.lineWidth=1.1;g.beginPath();g.moveTo(px,F.y);g.lineTo(px,F.y+F.h);g.stroke();
  if(label){g.setLineDash([]);g.fillStyle=col;g.font=(9*FK)+'px system-ui,sans-serif';g.textAlign='center';g.textBaseline=bot?'bottom':'top';g.fillText(label,px,bot?F.y+F.h-1:F.y+1);}g.restore();
}
function shadeX(F,a,b,col,alpha=.12){const g=F.g,x1=F.X(Math.max(a,F.xr[0])),x2=F.X(Math.min(b,F.xr[1]));if(x2<=x1)return;g.save();g.fillStyle=col;g.globalAlpha=alpha;g.fillRect(x1,F.y,x2-x1,F.h);g.restore();}
function text(g,s,x,y,col,al='left',bl='top',font=null){font=font||((9.5*FK)+'px system-ui,sans-serif');g.save();g.fillStyle=col;g.font=font;g.textAlign=al;g.textBaseline=bl;g.fillText(s,x,y);g.restore();}
function lin2(v){return S.db?20*Math.log10(Math.max(v,1e-12)):v;}
function magRange(maxv){return S.db?[20*Math.log10(maxv)-60,20*Math.log10(maxv)+5]:[0,maxv*1.12];}

/* ---------- panel renderers ---------- */
function drawCT(d,x,cv=cvCT){
  const {g,W,H}=setup(cv);const L=S.M*d.T,Tp=S.N*d.T,fsSel=S.ctv==='per';
  const tr=fsSel?[-0.55*Tp,1.6*Tp]:[-0.06*L,1.08*L];
  const n=700,ts=[],ys=[];for(let i=0;i<n;i++){const t=tr[0]+(tr[1]-tr[0])*i/(n-1);ts.push(t);ys.push(xt(t,d));}
  let ymax=0;ts.forEach((t,i)=>{if(t<=Math.max(L,Tp)*1.1)ymax=Math.max(ymax,Math.abs(ys[i]))});ymax=Math.max(ymax,1e-3)*1.15;
  const F=frame(g,4,4,W-8,H-17*FK,tr,[-ymax,ymax]);
  axes(F,{xl:'t (s)'});
  if(fsSel){ // periodic extension of the windowed, truncated record, period N*T
    const pe=ts.map(t=>{let tau=((t%Tp)+Tp)%Tp;return tau<d.L*d.T?xt(tau,d)*win(tau/d.T,S.M):0;});
    line(F,ts,ys,COL.yel,1.2,null,.35);line(F,ts,pe,COL.org,2);
    for(let k=-1;k<=2;k++)vmark(F,k*Tp,COL.org,k===1?'NT':'',[2,4],true);
    text(g,'periodic extension, period NT = '+Tp.toFixed(2)+' s',F.x+4,F.y+2,COL.org);
    return;
  }
  line(F,ts,ys,COL.yel,2);
  // reconstruction from the M samples
  const rec=ts.map(t=>{
    if(S.interp==='zoh'){const k=Math.floor(t/d.T+1e-9);return (k>=0&&k<S.M)?x[k]:0;}
    if(S.interp==='foh'){const u=t/d.T,k=Math.floor(u),f=u-k;const a=(k>=0&&k<S.M)?x[k]:0,b=(k+1>=0&&k+1<S.M)?x[k+1]:0;return a*(1-f)+b*f;}
    let s=0;const u=t/d.T;for(let k=0;k<S.M;k++){const v=Math.PI*(u-k);s+=x[k]*(Math.abs(v)<1e-9?1:Math.sin(v)/v);}return s;});
  line(F,ts,rec,COL.pink,1.6,S.interp==='sinc'?[5,3]:null,.95);
  const tn=x.map((_,k)=>k*d.T);
  g.save();g.fillStyle=COL.pink;tn.forEach((t,k)=>{const px=F.X(t);if(px>F.x&&px<F.x+F.w){g.beginPath();g.arc(px,F.Y(x[k]),S.M>120?1.2:2.2,0,TAU);g.fill();}});g.restore();
  text(g,(S.interp==='zoh'?'ZOH':S.interp==='foh'?'FOH':'sinc')+' reconstruction',F.x+F.w-2,F.y+2,COL.pink,'right');
}
function drawDT(d,x,xw,cv=cvDT){
  const {g,W,H}=setup(cv);const nmax=Math.max(S.M,S.N);const nr=[-0.06*nmax,1.08*nmax];
  let ymax=Math.max(1e-3,...x.map(Math.abs))*1.15;
  const F=frame(g,4,4,W-8,H-17*FK,nr,[-ymax,ymax]);axes(F,{xl:'n'});
  const ns=x.map((_,k)=>k), dots=S.M<=96;
  if(S.win!=='rect'){stems(F,ns,x,COL.muted,false,1,.45);const wn=ns.map(n=>ymax/1.15*win(n,S.M));line(F,ns,wn,COL.vio,1,[3,3],.8);line(F,ns,wn.map(v=>-v),COL.vio,1,[3,3],.8);}
  const used=ns.slice(0,d.L), xu=xw.slice(0,d.L);
  stems(F,used,xu,COL.yel,dots);
  if(S.win!=='rect')text(g,WINS[S.win].n+' window',F.x+4,F.y+2,COL.vio);
  if(S.M>S.N){stems(F,ns.slice(S.N),x.slice(S.N),'#666',dots,1);text(g,'n ≥ N dropped by fft(x,N)',F.x+F.w-2,F.y+2,'#999','right');}
  else if(S.N>S.M){const zp=[];for(let n=S.M;n<S.N;n++)zp.push(n);g.save();g.fillStyle='#777';zp.forEach(n=>{const px=F.X(n);g.fillRect(px-.6,F.Y(0)-.6,1.2,1.2)});g.restore();text(g,'zero-pad to N = '+S.N,F.x+F.w-2,F.y+2,'#999','right');}
  vmark(F,S.M,COL.muted,'M',[2,3],true);
}
function drawCF(d,cv=cvCF){
  const {g,W,H,small}=setup(cv);
  const fmax=Math.max(1.25*S.fs,1.5*d.fchar),n=520,fr=[-fmax,fmax];
  const f=[],mag=[],ph=[],dm=[],dp=[],cp=[[],[],[],[]];const ks=[-2,-1,1,2];
  const stab=-d.pmax,dtftOK=stab>=-1e-12;
  for(let i=0;i<n;i++){const fv=fr[0]+(fr[1]-fr[0])*i/(n-1),w=TAU*fv;f.push(fv);
    const X=Xjw(w,d);mag.push(cabs(X));ph.push(carg(X));
    if(dtftOK){const Xd=cscale(Xz(cexpj(w*d.T),d),d.T);dm.push(cabs(Xd));dp.push(carg(Xd));}
    ks.forEach((k,j)=>cp[j].push(cabs(Xjw(w-TAU*k*S.fs,d))));
  }
  let mx=Math.max(...mag.filter(isFinite),...(dtftOK?dm:[]));if(!isFinite(mx)||mx<=0)mx=1;
  mx=Math.min(mx,(2*S.sig+1)/Math.max(Math.abs(d.pmax),0.02));
  const yr=magRange(mx),hm=(H-30*FK)*0.6;
  const F=frame(g,4,4,W-8,hm,fr,yr);
  shadeX(F,fr[0],-d.nyq,'#ffffff',.05);shadeX(F,d.nyq,fr[1],'#ffffff',.05);
  axes(F,{noxl:true,yl:small?'':(S.db?'|X| dB':'Magnitude'),y0:!S.db});
  if(S.cop)ks.forEach((k,j)=>line(F,f,cp[j].map(lin2),COL.cyan,1,[2,3],.55));
  line(F,f,mag.map(lin2),COL.yel,stab>0?2:1.4,null,stab>0?1:.5);
  if(dtftOK)line(F,f,dm.map(lin2),COL.grn,1.6,[5,3],stab>0?1:.7);
  vmark(F,-d.nyq,COL.pink,'−fs/2');vmark(F,d.nyq,COL.pink,'fs/2');vmark(F,S.fs,COL.pink,'fs',[1,4]);vmark(F,-S.fs,COL.pink,'',[1,4]);
  if(stab<=1e-12)text(g,stab<-1e-12?(small?'unstable: no FT/DTFT':'unstable pole: FT/DTFT do not exist (showing X(s) at s=jω)'):(small?'marginal: impulses':'pole on jω axis: FT/DTFT contain impulses (spikes)'),F.x+4,F.y+12,COL.warn||'#f0b54a');
  const P=frame(g,4,hm+12*FK,W-8,H-hm-25*FK,fr,[-Math.PI,Math.PI]);
  axes(P,{xl:'f (Hz)',yl:'Phase'});
  line(P,f,ph,COL.yel,1.5,null,stab>0?1:.5);if(dtftOK)line(P,f,dp,COL.grn,1.2,[5,3]);
  vmark(P,-d.nyq,COL.pink,'');vmark(P,d.nyq,COL.pink,'');
}
function drawDF(d,X,xw,cv=cvDF){
  const {g,W,H,small}=setup(cv);const fr=[0,S.fs];
  const kf=X.map((_,k)=>k*S.fs/S.N), km=X.map(v=>cabs(v)*d.T);
  const n=420,fc=[],cm=[],cpz=[];for(let i=0;i<n;i++){const fv=S.fs*i/(n-1);fc.push(fv);const Xw=cscale(dtftRecord(TAU*fv,xw,d),d.T);cm.push(cabs(Xw));cpz.push(carg(Xw));}
  const mx=Math.max(1e-6,...cm,...km);const yr=magRange(mx),hm=(H-30*FK)*0.6;
  const F=frame(g,4,4,W-8,hm,fr,yr);axes(F,{noxl:true,yl:small?'':(S.db?'T|X[k]| dB':'Magnitude'),y0:!S.db});
  line(F,fc,cm.map(lin2),COL.grn,1.3,[4,3],.85);
  const dots=S.N<=128;
  if(S.db){const base=yr[0];g.save();g.strokeStyle=COL.cyan;g.fillStyle=COL.cyan;g.lineWidth=1.3;kf.forEach((fv,i)=>{const px=F.X(fv),py=F.Y(Math.max(base,lin2(km[i])));g.beginPath();g.moveTo(px,F.Y(base));g.lineTo(px,py);g.stroke();if(dots){g.beginPath();g.arc(px,py,2,0,TAU);g.fill();}});g.restore();}
  else stems(F,kf,km,COL.cyan,dots);
  vmark(F,d.nyq,COL.pink,'fs/2');
  if(d.mode==='under'&&S.f0<=S.fs)vmark(F,S.f0>d.nyq?S.fs-S.f0:S.f0,COL.yel,'',[1,3]);
  if(!small)text(g,'Δf = '+d.df.toPrecision(3)+' Hz',F.x+F.w-2,F.y+2,COL.cyan,'right');
  const P=frame(g,4,hm+12*FK,W-8,H-hm-25*FK,fr,[-Math.PI,Math.PI]);axes(P,{xl:'f = k·fs/N (Hz)',yl:'Phase'});
  line(P,fc,cpz,COL.grn,1,[4,3],.6);
  const kp=X.map((v,i)=>km[i]<1e-6*mx?0:carg(v));stems(P,kf,kp,COL.cyan,dots,1.2);
}
const VIEWS=new Map();let drag=null;
function drawS(d,cv=cvS){
  const {g,W,H}=setup(cv);let sView;const old=VIEWS.get(cv);
  if(drag&&drag.cv===cv&&old&&old.sv)sView=old.sv;else{const im=1.3*Math.max(d.wd,Math.PI/d.T,1);const lo=Math.min(-4.4,1.12*Math.min(d.p2.re,d.z0.re));sView={re:[lo,Math.max(1.3,1.25*d.pmax)],im:[-im,im]};}
  const F=frame(g,4,4,W-8,H-12*FK,sView.re,sView.im);
  shadeX(F,sView.re[0],0,COL.grn,.07);shadeX(F,0,sView.re[1],COL.bad||'#ef5b5b',.08);
  g.save();g.strokeStyle=COL.axis;g.lineWidth=1;g.beginPath();g.moveTo(F.x,F.Y(0));g.lineTo(F.x+F.w,F.Y(0));g.moveTo(F.X(0),F.y);g.lineTo(F.X(0),F.y+F.h);g.stroke();g.restore();
  const ny=Math.PI/d.T;[ny,-ny].forEach(v=>{if(v<sView.im[1]&&v>sView.im[0]){g.save();g.strokeStyle=COL.pink;g.setLineDash([4,3]);g.beginPath();g.moveTo(F.x,F.Y(v));g.lineTo(F.x+F.w,F.Y(v));g.stroke();g.restore();}});
  g.save();g.fillStyle=COL.pink;g.globalAlpha=.06;g.fillRect(F.x,F.Y(ny),F.w,F.Y(-ny)-F.Y(ny));g.restore();
  text(g,'ω = +π/T',F.x+3,F.Y(ny)-11*FK,COL.pink);text(g,'jω',F.X(0)+3,F.y+1,COL.muted);text(g,'Re',F.x+F.w-2,F.Y(0)+2,COL.muted,'right');
  text(g,'stable',F.x+3,F.y+F.h-12*FK,COL.grn);
  mark(g,F.X(d.p1.re),F.Y(d.p1.im),'x',COL.grn);mark(g,F.X(d.p2.re),F.Y(d.p2.im),'x',COL.grn);mark(g,F.X(d.z0.re),F.Y(0),'o',COL.yel);
  if(d.rep)text(g,'×2',F.X(d.p1.re)+6*FK,F.Y(0)-14*FK,COL.grn);
  const lab=d.mode==='under'?'s = '+(-S.sig).toFixed(2)+' ± j'+d.wd.toFixed(2):d.rep?'s = '+(-S.sig).toFixed(2)+' (double)':'s = '+d.p1.re.toFixed(2)+', '+d.p2.re.toFixed(2);
  text(g,lab,F.x+F.w-2,F.y+F.h-12*FK,COL.grn,'right');
  VIEWS.set(cv,{F,sv:sView});
}
function drawZ(d,cv=cvZ){
  const {g,W,H,small}=setup(cv);const R=Math.max(1.35,d.qmax*1.12,Math.abs(d.zz.re)*1.12);
  const h=H-8,w=W-8,ar=w/h;const F=frame(g,4,4,w,h,[-R*ar,R*ar],[-R,R]);VIEWS.set(cv,{F,R});
  g.save();g.strokeStyle=COL.axis;g.lineWidth=1;g.beginPath();g.moveTo(F.x,F.Y(0));g.lineTo(F.x+F.w,F.Y(0));g.moveTo(F.X(0),F.y);g.lineTo(F.X(0),F.y+F.h);g.stroke();
  const rad=F.X(1)-F.X(0);g.fillStyle=COL.grn;g.globalAlpha=.08;g.beginPath();g.arc(F.X(0),F.Y(0),rad,0,TAU);g.fill();g.globalAlpha=1;
  g.strokeStyle=COL.chalk;g.lineWidth=1.6;g.beginPath();g.arc(F.X(0),F.Y(0),rad,0,TAU);g.stroke();
  if(d.mode==='under'){ // pole angle arc
    g.strokeStyle=COL.grn;g.globalAlpha=.6;g.lineWidth=1;g.beginPath();g.arc(F.X(0),F.Y(0),rad*.32,0,-Math.abs(d.Wwrap),true);g.stroke();g.globalAlpha=1;
    g.setLineDash([2,3]);g.beginPath();g.moveTo(F.X(0),F.Y(0));g.lineTo(F.X(d.q1.re),F.Y(d.q1.im));g.stroke();}
  g.restore();
  g.save();g.fillStyle=COL.pink;g.beginPath();g.arc(F.X(-1),F.Y(0),3.5,0,TAU);g.fill();g.fillStyle=COL.cyan;g.beginPath();g.arc(F.X(1),F.Y(0),3,0,TAU);g.fill();g.restore();
  if(!small)text(g,'Nyquist',F.X(-1)-4,F.Y(0)-12*FK,COL.pink,'right');text(g,'z=−1',F.X(-1)-4,F.Y(0)+3,COL.pink,'right');text(g,'DC',F.X(1)+4,F.Y(0)+3,COL.cyan);
  mark(g,F.X(d.q1.re),F.Y(d.q1.im),'x',COL.grn);mark(g,F.X(d.q2.re),F.Y(d.q2.im),'x',COL.grn);
  if(d.rep)text(g,'×2',F.X(d.q1.re)+6*FK,F.Y(0)-14*FK,COL.grn);
  mark(g,F.X(0),F.Y(0),'o',COL.yel);mark(g,F.X(d.zz.re),F.Y(0),'o',COL.yel);
  const lab=d.mode==='under'?'z = '+d.r.toFixed(3)+'∠±'+Math.abs(d.Wwrap).toFixed(2):d.rep?'z = '+d.q1.re.toFixed(3)+' (double)':'z = '+d.q1.re.toFixed(3)+', '+d.q2.re.toFixed(3);
  text(g,lab,F.x+F.w-2,F.y+1,COL.grn,'right');
  text(g,'|z|<1 stable',F.x+3,F.y+F.h-12*FK,COL.grn);
}
function mark(g,x,y,t,col){g.save();g.strokeStyle=col;g.lineWidth=2.4*Math.sqrt(FK);g.beginPath();if(t==='x'){const s=5*FK;g.moveTo(x-s,y-s);g.lineTo(x+s,y+s);g.moveTo(x+s,y-s);g.lineTo(x-s,y+s);}else{g.arc(x,y,4.5*FK,0,TAU);}g.stroke();g.restore();}

/* ---------- model description (HTML) for the current pole type ---------- */
const FR=(a,b)=>`<span class="frac"><span>${a}</span><span>${b}</span></span>`;
function MH(d){
  if(S.wave==='cos')return MHcos(d);
  if(d.mode==='under')return {tag:'underdamped, ζ &lt; 1',
    xt:'<i>A e</i><sup>−σ<i>t</i></sup>[cos ω<sub>d</sub><i>t</i> + (σ/ω<sub>d</sub>) sin ω<sub>d</sub><i>t</i>] <i>u</i>(<i>t</i>)',
    Xs:FR('<i>A</i>(<i>s</i> + 2σ)','(<i>s</i> + σ)² + ω<sub>d</sub>²'),ps:'<i>s</i> = −σ ± <i>j</i>ω<sub>d</sub>',
    xn:'<i>A r</i><sup><i>n</i></sup>[cos Ω<sub>d</sub><i>n</i> + (σ/ω<sub>d</sub>) sin Ω<sub>d</sub><i>n</i>]',
    Xz:FR('<i>A z</i>(<i>z</i> − <i>z</i><sub>1</sub>)','<i>z</i>² − 2<i>r</i> cos Ω<sub>d</sub> <i>z</i> + <i>r</i>²'),
    zp:'<i>r e</i><sup>±<i>j</i>Ω<sub>d</sub></sup>',z1:'<i>z</i><sub>1</sub> = <i>r</i>(cos Ω<sub>d</sub> − (σ/ω<sub>d</sub>) sin Ω<sub>d</sub>)'};
  if(d.mode==='crit')return {tag:'critically damped, ζ = 1',
    xt:'<i>A</i>(1 + σ<i>t</i>) <i>e</i><sup>−σ<i>t</i></sup> <i>u</i>(<i>t</i>)',Xs:FR('<i>A</i>(<i>s</i> + 2σ)','(<i>s</i> + σ)²'),ps:'<i>s</i> = −σ (double)',
    xn:'<i>A r</i><sup><i>n</i></sup>(1 + σ<i>T n</i>)',Xz:FR('<i>A z</i>(<i>z</i> − <i>z</i><sub>1</sub>)','(<i>z</i> − <i>r</i>)²'),
    zp:'<i>r</i> = <i>e</i><sup>−σ<i>T</i></sup> (double)',z1:'<i>z</i><sub>1</sub> = <i>r</i>(1 − σ<i>T</i>)'};
  return {tag:'overdamped, ζ &gt; 1',
    xt:'<i>A</i>(<i>b e</i><sup>−<i>at</i></sup> − <i>a e</i><sup>−<i>bt</i></sup>)/(<i>b</i> − <i>a</i>) <i>u</i>(<i>t</i>), &nbsp;<i>a</i>,<i>b</i> = σ ∓ δ',
    Xs:FR('<i>A</i>(<i>s</i> + 2σ)','(<i>s</i> + <i>a</i>)(<i>s</i> + <i>b</i>)'),ps:'<i>s</i> = −<i>a</i>, −<i>b</i> = −σ ± δ',
    xn:'<i>A</i>(<i>b q</i><sub>a</sub><sup><i>n</i></sup> − <i>a q</i><sub>b</sub><sup><i>n</i></sup>)/(<i>b</i> − <i>a</i>)',
    Xz:FR('<i>A z</i>(<i>z</i> − <i>z</i><sub>1</sub>)','(<i>z</i> − <i>q</i><sub>a</sub>)(<i>z</i> − <i>q</i><sub>b</sub>)'),
    zp:'<i>q</i><sub>a</sub> = <i>e</i><sup>−<i>aT</i></sup>, <i>q</i><sub>b</sub> = <i>e</i><sup>−<i>bT</i></sup>',z1:'<i>z</i><sub>1</sub> = (<i>b q</i><sub>b</sub> − <i>a q</i><sub>a</sub>)/(<i>b</i> − <i>a</i>)'};
}
function MHcos(d){
  if(d.mode==='under')return {tag:'underdamped, ζ &lt; 1',zs:'−σ',
    xt:'<i>A e</i><sup>−σ<i>t</i></sup> cos(ω<sub>d</sub><i>t</i>) <i>u</i>(<i>t</i>)',Xs:FR('<i>A</i>(<i>s</i> + σ)','(<i>s</i> + σ)² + ω<sub>d</sub>²'),ps:'<i>s</i> = −σ ± <i>j</i>ω<sub>d</sub>',
    xn:'<i>A r</i><sup><i>n</i></sup> cos(Ω<sub>d</sub><i>n</i>)',Xz:FR('<i>A z</i>(<i>z</i> − <i>z</i><sub>1</sub>)','<i>z</i>² − 2<i>r</i> cos Ω<sub>d</sub> <i>z</i> + <i>r</i>²'),
    zp:'<i>r e</i><sup>±<i>j</i>Ω<sub>d</sub></sup>',z1:'<i>z</i><sub>1</sub> = <i>r</i> cos Ω<sub>d</sub>'};
  if(d.mode==='crit')return {tag:'repeated pole, ζ = 1 (cancelled by the zero)',zs:'−σ',
    xt:'<i>A e</i><sup>−σ<i>t</i></sup> <i>u</i>(<i>t</i>)',Xs:FR('<i>A</i>(<i>s</i> + σ)','(<i>s</i> + σ)²')+' = '+FR('<i>A</i>','<i>s</i> + σ'),ps:'<i>s</i> = −σ (double, one cancelled)',
    xn:'<i>A r</i><sup><i>n</i></sup>',Xz:FR('<i>A z</i>(<i>z</i> − <i>r</i>)','(<i>z</i> − <i>r</i>)²')+' = '+FR('<i>A z</i>','<i>z</i> − <i>r</i>'),
    zp:'<i>r</i> = <i>e</i><sup>−σ<i>T</i></sup> (double, one cancelled)',z1:'<i>z</i><sub>1</sub> = <i>r</i>'};
  return {tag:'overdamped, ζ &gt; 1',zs:'−σ',
    xt:'<i>A e</i><sup>−σ<i>t</i></sup> cosh(δ<i>t</i>) <i>u</i>(<i>t</i>)',Xs:FR('<i>A</i>(<i>s</i> + σ)','(<i>s</i> + σ)² − δ²'),ps:'<i>s</i> = −σ ± δ',
    xn:'<i>A</i>(<i>q</i><sub>a</sub><sup><i>n</i></sup> + <i>q</i><sub>b</sub><sup><i>n</i></sup>)/2',Xz:FR('<i>A z</i>(<i>z</i> − <i>z</i><sub>1</sub>)','(<i>z</i> − <i>q</i><sub>a</sub>)(<i>z</i> − <i>q</i><sub>b</sub>)'),
    zp:'<i>q</i><sub>a,b</sub> = <i>e</i><sup>(−σ ± δ)<i>T</i></sup>',z1:'<i>z</i><sub>1</sub> = (<i>q</i><sub>a</sub> + <i>q</i><sub>b</sub>)/2 = <i>r</i> cosh δ<i>T</i>'};
}
const f3=v=>(Math.abs(v)<5e-4?0:v).toFixed(3);
function PS(d){return d.mode==='under'?`${(-S.sig).toFixed(2)} ± j${d.wd.toFixed(2)}`:d.rep?`${(-S.sig).toFixed(2)} (double)`:`${d.p1.re.toFixed(2)}, ${d.p2.re.toFixed(2)}`;}
function PZ(d){return d.mode==='under'?`${d.r.toFixed(4)} ∠ ±${Math.abs(d.Wwrap).toFixed(3)}`:d.rep?`${d.q1.re.toFixed(4)} (double)`:`${d.q1.re.toFixed(4)}, ${d.q2.re.toFixed(4)}`;}
function stabTxt(d){return d.pmax<-1e-12?'stable (LHP)':d.pmax>1e-12?'unstable (RHP)':'marginal (on the jω axis)';}

/* ---------- transforms (arrows + explanations) ---------- */
const TX={
 samp:{c:COL.pink,name:'Sampling ⇄ Interpolation',pair:'Continuous Time ⇄ Discrete Time',ends:['pCT','pDT'],
  eq:`<div class="eq box"><i>x</i>[<i>n</i>] = <i>x</i>(<i>nT</i>), &nbsp; <i>T</i> = 1/<i>f</i><sub>s</sub></div>
      <div class="eq box"><i>x</i><sub>r</sub>(<i>t</i>) = <span class="lim"><small>&nbsp;</small><b>Σ</b><small><i>n</i></small></span> <i>x</i>[<i>n</i>] <i>h</i>(<i>t</i> − <i>nT</i>)
      <span class="note">ZOH: <i>h</i> = 1 on [0,<i>T</i>) &nbsp;·&nbsp; FOH: triangle Λ(<i>t</i>/<i>T</i>) &nbsp;·&nbsp; ideal: sinc(<i>t</i>/<i>T</i>)</span></div>`,
  vars:[['T, f<sub>s</sub>','sample period / rate'],['n','sample index'],['h(t)','interpolation (hold) kernel']],
  lost:['Everything between samples is thrown away. Recovery is exact only if <i>x</i> is band-limited below <i>f</i><sub>s</sub>/2 (Nyquist–Shannon).',
        'Tones above <i>f</i><sub>s</sub>/2 alias to |<i>f</i><sub>0</sub> − <i>k f</i><sub>s</sub>|. Try the ideal-sinc reconstruction: it rebuilds the <i>alias</i>, not the original.',
        'ZOH: staircase, <i>T</i>/2 delay, sinc(<i>fT</i>) droop. FOH: smoother, sinc² droop. Ideal sinc is non-causal and infinitely long (truncated here, so it rings at the record edges and at the <i>t</i> = 0 step).'],
  ml:'x = xfun((0:M-1)*T);  interp1(t_n,x,t,"previous"/"linear");  c2d(sys,T,"zoh"/"foh")',
  live:d=>d.mode!=='under'?`Real poles (${MH(d).tag}): nothing oscillates, so there's no tone to alias. The spectrum is still not band-limited: |X| at fs/2 is ${cabs(Xjw(Math.PI/d.T,d)).toExponential(2)} vs ${cabs(Xjw(0,d)).toFixed(3)} at DC, and that tail aliases.`:d.aliased?`f₀ = ${S.f0.toFixed(2)} Hz is above Nyquist ${d.nyq.toFixed(2)} Hz → the samples look like ${d.fa.toFixed(2)} Hz.`:`f₀ = ${S.f0.toFixed(2)} Hz is below Nyquist ${d.nyq.toFixed(2)} Hz (${(S.fs/S.f0).toFixed(1)} samples per cycle). No aliasing of the main tone, but the u(t) step and the exponential tail are not band-limited.`},
 ft:{c:COL.yel,name:'(Inverse) Fourier transform',pair:'Continuous Time ⇄ Continuous Frequency',ends:['pCT','pCF'],
  eq:d=>`<div class="eq box"><i>X</i>(<i>j</i>ω) = <span class="big">∫</span><sub>−∞</sub><sup>∞</sup> <i>x</i>(<i>t</i>) <i>e</i><sup>−<i>j</i>ω<i>t</i></sup> <i>dt</i>, &nbsp;&nbsp; <i>x</i>(<i>t</i>) = <span class="frac"><span>1</span><span>2π</span></span><span class="big">∫</span> <i>X</i>(<i>j</i>ω) <i>e</i><sup><i>j</i>ω<i>t</i></sup> <i>d</i>ω</div>
      <div class="eq box">Here: <i>X</i>(<i>j</i>ω) = <i>X</i>(<i>s</i>)|<sub><i>s</i>=<i>j</i>ω</sub>, &nbsp; <i>X</i>(<i>s</i>) = ${MH(d).Xs}<span class="note">exists only if every pole is in the LHP (the jω axis must be inside the ROC). Currently ${stabTxt(d)}.</span></div>`,
  vars:[['ω = 2πf','angular frequency (rad/s)'],['σ','decay rate. The −3 dB width of the peak ≈ 2σ rad/s'],['ω<sub>d</sub>','ringing frequency, peak location']],
  lost:['Nothing is lost; the transform is invertible. Time detail and frequency detail trade off: faster decay (bigger σ) gives a broader peak.',
        'Needs ∫|x| &lt; ∞, so growing signals (σ &lt; 0) have no FT. The Laplace transform handles them.'],
  ml:'b=[A A*sig]; a=[1 2*sig sig^2+wd^2];  H=freqs(b,a,w);  bode(tf(b,a))',
  live:d=>d.pmax>=0?'Pole on or right of the jω axis: no Fourier transform (shown faded as X(s) evaluated on the jω axis).':d.mode==='under'?`Peak ≈ |X(jω<sub>d</sub>)| ≈ ${cabs(Xjw(d.wd,d)).toFixed(3)} at ${S.f0.toFixed(2)} Hz; −3 dB bandwidth ≈ ${(S.sig/Math.PI).toFixed(3)} Hz.`:`Low-pass shape with no resonant peak (${MH(d).tag}): |X(0)| = ${cabs(Xjw(0,d)).toFixed(3)}, and |X| falls ≈ A/ω (−20 dB/dec) at high ω.`},
 dft:{c:COL.yel,name:'(Inverse) Discrete Fourier Transform',pair:'Discrete Time ⇄ Discrete Frequency',ends:['pDT','pDF'],
  eq:`<div class="eq box"><i>X</i>[<i>k</i>] = <span class="lim"><small><i>N</i>−1</small><b>Σ</b><small><i>n</i>=0</small></span> <i>w</i>[<i>n</i>]<i>x</i>[<i>n</i>] <i>e</i><sup>−<i>j</i>2π<i>kn</i>/<i>N</i></sup>, &nbsp; <i>x</i>[<i>n</i>] = <span class="frac"><span>1</span><span><i>N</i></span></span><span class="lim"><small><i>N</i>−1</small><b>Σ</b><small><i>k</i>=0</small></span> <i>X</i>[<i>k</i>] <i>e</i><sup><i>j</i>2π<i>kn</i>/<i>N</i></sup></div>
      <div class="eq box"><i>f</i><sub>k</sub> = <i>k</i>·<i>f</i><sub>s</sub>/<i>N</i>, &nbsp; Δ<i>f</i> = <i>f</i><sub>s</sub>/<i>N</i>, &nbsp; resolution ≈ 1/(<i>MT</i>)</div>`,
  vars:[['N','DFT length (bins)'],['M','record length (samples)'],['w[n]','window (rect / Hann)']],
  lost:['Finite and computable (FFT). It treats the N samples as one period of a periodic sequence, so the two ends of the record get joined.',
        'Leakage: a tone that doesn\'t complete a whole number of cycles in the record, or a decay that gets cut off, spreads into every bin. Hann lowers the sidelobes and widens the main lobe.',
        'Zero-padding (N &gt; M) samples the same DTFT more finely. It does not improve resolution; only a longer record does. N &lt; M truncates, like MATLAB fft(x,N).'],
  ml:'X = fft(x.*w, N);  f = (0:N-1)*fs/N;  stem(f, T*abs(X))',
  live:d=>d.mode!=='under'?`Δf = ${d.df.toPrecision(3)} Hz; record resolution 1/(MT) = ${(S.fs/S.M).toPrecision(3)} Hz. Real poles give a low-pass spectrum, so leakage shows up as the window's sidelobe floor, not around a tone.`:`Δf = ${d.df.toPrecision(3)} Hz; record resolution 1/(MT) = ${(S.fs/S.M).toPrecision(3)} Hz; the tone sits at bin ${((d.aliased?d.fa:S.f0)/d.df).toFixed(2)}${Math.abs(((d.aliased?d.fa:S.f0)/d.df)%1-0.5)<0.25?' (between bins, so expect scalloping/leakage)':''}.`},
 fs:{c:COL.org,name:'Fourier series',pair:'Continuous Time ⇄ Discrete Frequency',ends:['pCT','pDF'],
  eq:`<div class="eq box"><i>c</i><sub>k</sub> = <span class="frac"><span>1</span><span><i>T</i><sub>p</sub></span></span><span class="big">∫</span><sub>0</sub><sup><i>T</i><sub>p</sub></sup> <i>x̃</i>(<i>t</i>) <i>e</i><sup>−<i>j</i>2π<i>kt</i>/<i>T</i><sub>p</sub></sup><i>dt</i>, &nbsp; <i>x̃</i>(<i>t</i>) = <span class="lim"><small>&nbsp;</small><b>Σ</b><small><i>k</i></small></span> <i>c</i><sub>k</sub><i>e</i><sup><i>j</i>2π<i>kt</i>/<i>T</i><sub>p</sub></sup></div>
      <div class="eq box"><i>T</i><sub>p</sub> = <i>NT</i>: &nbsp; <span class="frac"><span><i>X</i>[<i>k</i>]</span><span><i>N</i></span></span> = <span class="lim"><small>&nbsp;</small><b>Σ</b><small><i>m</i></small></span> <i>c</i><sub><i>k</i>+<i>mN</i></sub><span class="note">The DFT of the samples gives the Fourier-series coefficients, aliased in k</span></div>`,
  vars:[['T<sub>p</sub>','period of the extension (= NT)'],['c<sub>k</sub>','line spectrum at k/T<sub>p</sub> = k·f<sub>s</sub>/N'],['x̃(t)','periodic extension (orange in the CT panel)']],
  lost:['A periodic signal has a discrete line spectrum. Here the record is forced to be periodic, which is the hidden assumption behind the DFT.',
        'The jump where one period meets the next (x(0) = A vs. ≈ 0 at the end) causes Gibbs ringing and slow 1/k decay of c<sub>k</sub>. Sampling folds those coefficients together (aliasing in k).'],
  ml:'ck ≈ fft(x,N)/N;   % line spectrum at (0:N-1)/(N*T)',
  live:d=>`Period T<sub>p</sub> = NT = ${(S.N*d.T).toFixed(3)} s, so the lines are spaced 1/T<sub>p</sub> = ${d.df.toPrecision(3)} Hz. The DF stems T·X[k] = T<sub>p</sub>·c<sub>k</sub> (aliased).`},
 dtft:{c:COL.grn,name:'(Inverse) Discrete-Time Fourier Transform',pair:'Discrete Time ⇄ Continuous Frequency',ends:['pDT','pCF'],
  eq:`<div class="eq box"><i>X</i>(<i>e</i><sup><i>j</i>Ω</sup>) = <span class="lim"><small>∞</small><b>Σ</b><small><i>n</i>=−∞</small></span> <i>x</i>[<i>n</i>]<i>e</i><sup>−<i>j</i>Ω<i>n</i></sup>, &nbsp; <i>x</i>[<i>n</i>] = <span class="frac"><span>1</span><span>2π</span></span><span class="big">∫</span><sub>−π</sub><sup>π</sup><i>X</i>(<i>e</i><sup><i>j</i>Ω</sup>)<i>e</i><sup><i>j</i>Ω<i>n</i></sup><i>d</i>Ω, &nbsp; Ω = ω<i>T</i></div>
      <div class="eq box"><i>X</i>(<i>e</i><sup><i>j</i>ω<i>T</i></sup>) = <span class="frac"><span>1</span><span><i>T</i></span></span><span class="lim"><small>∞</small><b>Σ</b><small><i>k</i>=−∞</small></span> <i>X</i>(<i>j</i>(ω − 2π<i>k</i>/<i>T</i>)) <span style="color:var(--muted)">+ <i>A</i>/2</span><span class="note">Poisson sum: periodic copies of the CT spectrum, scaled by 1/T. The extra A/2 appears because x(t) jumps at t = 0 and the copy sum converges to the midpoint x(0⁺)/2, while x[0] = A.</span></div>`,
  vars:[['Ω','digital frequency, rad/sample (period 2π)'],['ω<sub>s</sub> = 2π/T','spacing of the spectral copies'],['T·X(e<sup>jωT</sup>)','dashed green, the same scale as X(jω)']],
  lost:['The spectrum becomes periodic with period f<sub>s</sub>; only |f| &lt; f<sub>s</sub>/2 is unique. Where the copies (dotted cyan) overlap, they add: that is aliasing.',
        'It is still continuous in frequency and needs infinitely many samples, so it can\'t be computed directly. The DFT samples it.'],
  ml:'bz=A*[1 -r*cos(Wd) 0]; az=[1 -2*r*cos(Wd) r^2];  [H,w]=freqz(bz,az,1024,"whole",fs)',
  live:d=>d.pmax<0?`At ±fs/2 the copies meet. T·|X| at Nyquist: CT ${cabs(Xjw(Math.PI/d.T,d)).toFixed(4)} vs DTFT ${(d.T*cabs(Xz(C(-1),d))).toFixed(4)}. The difference is the aliased energy plus the A/2·T step term.`:'A pole on or outside the unit circle: the DTFT does not exist (the unit circle is outside the ROC).'},
 fsamp:{c:COL.pink,name:'Frequency sampling ⇄ interpolation',pair:'Continuous Frequency ⇄ Discrete Frequency',ends:['pCF','pDF'],
  eq:`<div class="eq box"><i>X</i>[<i>k</i>] = <i>X</i><sub>w</sub>(<i>e</i><sup><i>j</i>Ω</sup>)|<sub>Ω = 2π<i>k</i>/<i>N</i></sub><span class="note">X<sub>w</sub> is the DTFT of the windowed, length-min(M,N) record (green dashed in the DF panel)</span></div>
      <div class="eq box"><i>X</i><sub>w</sub>(<i>e</i><sup><i>j</i>Ω</sup>) = <span class="lim"><small><i>N</i>−1</small><b>Σ</b><small><i>k</i>=0</small></span> <i>X</i>[<i>k</i>] <i>P</i><sub>N</sub>(Ω − 2π<i>k</i>/<i>N</i>), &nbsp; <i>P</i><sub>N</sub>(Ω) = <span class="frac"><span>sin(<i>N</i>Ω/2)</span><span><i>N</i> sin(Ω/2)</span></span><i>e</i><sup>−<i>j</i>Ω(<i>N</i>−1)/2</sup></div>`,
  vars:[['Δf = f<sub>s</sub>/N','frequency sample spacing'],['P<sub>N</sub>','Dirichlet (periodic sinc) interpolation kernel']],
  lost:['Sampling in frequency means repeating in time with period N. If the signal is longer than N, the repeats overlap (time-domain aliasing). That is why fft(x,N) with N &lt; M is lossy.',
        'A peak that falls between bins is under-read (picket-fence/scalloping). Denser sampling (zero-padding) shows the true curve, and interpolating with P<sub>N</sub> is exact.'],
  ml:'X1 = fft(x, N);  X2 = fft(x, 8*N);   % same DTFT, denser samples',
  live:d=>`${S.N} samples of the continuous spectrum over [0, fs), every ${d.df.toPrecision(3)} Hz. ${S.N<S.M?'N < M, so the record is truncated.':S.N>S.M?'N > M: zero-padded, finer sampling of the same curve.':'N = M.'}`},
 lap:{c:COL.cyan,name:'(Inverse) Laplace transform',pair:'Continuous Time ⇄ S-domain',ends:['pCT','pS'],
  eq:d=>`<div class="eq box"><i>X</i>(<i>s</i>) = <span class="big">∫</span><sub>0</sub><sup>∞</sup><i>x</i>(<i>t</i>)<i>e</i><sup>−<i>st</i></sup><i>dt</i>, &nbsp; <i>x</i>(<i>t</i>) = <span class="frac"><span>1</span><span>2π<i>j</i></span></span><span class="big">∫</span><sub><i>c</i>−<i>j</i>∞</sub><sup><i>c</i>+<i>j</i>∞</sup><i>X</i>(<i>s</i>)<i>e</i><sup><i>st</i></sup><i>ds</i></div>
      <div class="eq box"><i>x</i>(<i>t</i>) = ${MH(d).xt} &nbsp;⇒&nbsp; <i>X</i>(<i>s</i>) = ${MH(d).Xs}<span class="note">${MH(d).tag}: poles ${MH(d).ps} (✕), zero s = ${S.wave==='cos'?'−σ':'−2σ'} = ${d.z0.re.toFixed(2)} (○), ROC Re{s} &gt; ${d.pmax.toFixed(2)}. ${S.wave==='cos'?'Damped-cosine waveform: x(0) = A, x′(0) = −σA. In the repeated-pole case the zero cancels one pole.':'This is the free response of s² + 2ζω<sub>n</sub>s + ω<sub>n</sub>² released from rest: x(0) = A, x′(0) = 0.'}</span></div>`,
  vars:[['s = Re{s} + jω','complex frequency'],['−σ','pole real part: decay (&lt;0) or growth (&gt;0)'],['ω<sub>d</sub>','pole imaginary part: ringing frequency']],
  lost:['Gained over the FT: works for growing signals and initial conditions, and the pole locations are the modes e<sup>pt</sup>.',
        'Stable ⇔ all poles in the open left half-plane. FT = X(s) on the jω axis, only when the ROC includes it.'],
  ml:'sys = tf(A*[1 2*sig],[1 2*sig wn^2]);  % damped cosine: tf(A*[1 sig],[1 2*sig wn^2]);  pole(sys), damp(sys), pzmap(sys), impulse(sys)',
  live:d=>`Poles at ${PS(d)} rad/s → ${stabTxt(d)}. ${isFinite(d.zeta)?`ζ = ${d.zeta.toFixed(3)}, ω<sub>n</sub> = ${d.wn.toFixed(2)} rad/s`:'ζ, ω<sub>n</sub> undefined (p₁p₂ ≤ 0)'}.`},
 zt:{c:COL.cyan,name:'(Inverse) Z-transform',pair:'Discrete Time ⇄ Z-domain',ends:['pDT','pZ'],
  eq:d=>`<div class="eq box"><i>X</i>(<i>z</i>) = <span class="lim"><small>∞</small><b>Σ</b><small><i>n</i>=0</small></span><i>x</i>[<i>n</i>]<i>z</i><sup>−<i>n</i></sup>, &nbsp; <i>x</i>[<i>n</i>] = <span class="frac"><span>1</span><span>2π<i>j</i></span></span><span class="big">∮</span><i>X</i>(<i>z</i>)<i>z</i><sup><i>n</i>−1</sup><i>dz</i></div>
      <div class="eq box"><i>x</i>[<i>n</i>] = ${MH(d).xn} &nbsp;⇒&nbsp; <i>X</i>(<i>z</i>) = ${MH(d).Xz}<span class="note">r = e<sup>−σT</sup>; poles ${MH(d).zp}; zeros 0 and ${MH(d).z1} = ${f3(d.zz.re)}; ROC |z| &gt; ${d.qmax.toFixed(3)}</span></div>`,
  vars:[['z = r e<sup>jΩ</sup>','complex discrete frequency'],['r','pole radius = per-sample decay'],['Ω<sub>d</sub>','pole angle, rad/sample']],
  lost:['The discrete-time counterpart of Laplace: it handles growing sequences, and pole radius and angle are the modes r<sup>n</sup>e<sup>jΩn</sup>.',
        'Stable ⇔ all poles strictly inside the unit circle. DTFT = X(z) on |z| = 1 (if inside the ROC).'],
  ml:'sysd = c2d(sys,T,"impulse");  zpk(sysd), zplane(...)   % poles = exp(pole(sys)*T)',
  live:d=>`Poles at z = ${PZ(d)} → ${d.qmax<1-1e-12?'inside the unit circle: stable':d.qmax>1+1e-12?'outside the unit circle: unstable':'on the unit circle: marginal'}.${d.rep?' Double pole ⇒ the n·rⁿ term in x[n].':''}`},
 map:{c:COL.pink,name:'z = e^{sT}',pair:'S-domain ⇄ Z-domain',ends:['pS','pZ'],
  eq:d=>`<div class="eq box"><i>z</i> = <i>e</i><sup><i>sT</i></sup>: &nbsp; <i>s</i> = Re{<i>s</i>} + <i>j</i>ω &nbsp;↦&nbsp; |<i>z</i>| = <i>e</i><sup>Re{<i>s</i>}<i>T</i></sup>, &nbsp; ∠<i>z</i> = ω<i>T</i></div>
      <div class="eq box">${d.mode==='under'?'<i>s</i><sub>p</sub> = −σ ± <i>j</i>ω<sub>d</sub> &nbsp;↦&nbsp; <i>z</i><sub>p</sub> = <i>e</i><sup>(−σ ± <i>j</i>ω<sub>d</sub>)<i>T</i></sup> = <i>r e</i><sup>±<i>j</i>Ω<sub>d</sub></sup>':d.rep?'<i>s</i><sub>p</sub> = −σ (double) &nbsp;↦&nbsp; <i>z</i><sub>p</sub> = <i>e</i><sup>−σ<i>T</i></sup> (double), on the positive real axis':'<i>s</i><sub>p</sub> = −<i>a</i>, −<i>b</i> &nbsp;↦&nbsp; <i>z</i><sub>p</sub> = <i>e</i><sup>−<i>aT</i></sup>, <i>e</i><sup>−<i>bT</i></sup>: real poles land on (0, 1)'}<span class="note">LHP → inside the circle · jω axis → unit circle · s = 0 → z = 1 · ω = ±π/T → z = −1 (Nyquist)</span></div>`,
  vars:[['T','sample period: sets how far around the circle a pole goes'],['ω = π/T','Nyquist line in the s-plane (pink dashed)'],['s + j2πk/T','all map to the same z']],
  lost:['Many-to-one: each 2π/T-tall strip of the s-plane covers the whole z-plane. A pole above π/T wraps around and looks like a lower-frequency pole. That is aliasing.',
        'Exact for the <i>poles</i> of a sampled impulse response (impulse invariance), and also the pole map used by c2d ZOH/FOH. <i>Zeros do not map this way</i>: the s-zero (at −2σ for the free response, −σ for the damped cosine) would land at e<sup>z₀T</sup>, but the actual z-zeros are 0 and z<sub>1</sub> (see the Z-transform card).',
        'Tustin (bilinear) s ≈ (2/T)(z−1)/(z+1) is a different, warped approximation.'],
  ml:'zp = exp(pole(sys)*T);  sysd = c2d(sys,T,"impulse");  % or "zoh"',
  live:d=>d.mode!=='under'?`Real s-poles ${PS(d)} ↦ z = ${PZ(d)} on the positive real axis. Zero angle, so the poles can't alias.`:`Ω<sub>d</sub> = ω<sub>d</sub>T = ${d.Wd.toFixed(3)} rad${d.aliased?` > π, so it wraps to ${d.Wwrap.toFixed(3)} rad (looks like ${d.fa.toFixed(2)} Hz)`:''}; r = e<sup>−σT</sup> = ${d.r.toFixed(4)}.`},
};

const I=v=>`<i>${v}</i>`;
const FRc=(n,d)=>`<span class="frac"><span>${n}</span><span>${d}</span></span>`;
const SUM=(hi,lo)=>`<span class="lim"><small>${hi}</small><b>Σ</b><small>${lo}</small></span>`;
const INT_=(lo,hi)=>`<span class="big">∫</span>${lo!==''?`<sub>${lo}</sub>`:''}${hi!==''?`<sup>${hi}</sup>`:''}`;
const cfmt=(z,p=3)=>Math.abs(z.im)<1e-9?z.re.toFixed(p):`(${z.re.toFixed(p)} ${z.im<0?'−':'+'} j${Math.abs(z.im).toFixed(p)})`;
const sincv=x=>Math.abs(x)<1e-12?1:Math.sin(Math.PI*x)/(Math.PI*x);
/* Both directions of every link. f/i = forward/inverse: [from, to, name, equation(d), lost-going-this-way, live(d) or null] */
const DIRS={
 samp:{f:['CT','DT','Sampling',d=>`${I('x')}[${I('n')}] = ${I('x')}(${I('nT')}), &nbsp; ${I('n')} = 0 … ${I('M')}−1, &nbsp; ${I('T')} = 1/${I('f')}<sub>s</sub>`,
        'Everything between the samples. Content above f<sub>s</sub>/2 folds onto |f − k f<sub>s</sub>| (aliasing) and can no longer be told apart.',d=>TX.samp.live(d)],
       i:['DT','CT','Interpolation (reconstruction)',(d,compact)=>{const o=k=>S.interp===k?' class="on"':(compact?' hidden':'');return `${I('x')}<sub>r</sub>(${I('t')}) = ${SUM('','<i>n</i>')} ${I('x')}[${I('n')}] ${I('h')}(${I('t')} − ${I('nT')}) &nbsp; with &nbsp;<span class="opts"><span${o('zoh')}>ZOH: ${I('h')} = 1 on [0, ${I('T')})</span><span${o('foh')}>FOH: ${I('h')} = Λ(${I('t')}/${I('T')}) = max(0, 1 − |${I('t')}|/${I('T')})</span><span${o('sinc')}>ideal: ${I('h')} = sinc(${I('t')}/${I('T')}) = sin(π${I('t')}/${I('T')})/(π${I('t')}/${I('T')})</span></span>`;},
        'Cannot undo aliasing: it rebuilds the alias, not the original. Exact only for a band-limited x, the ideal sinc kernel and infinitely many samples; ZOH/FOH add droop and images.',
        d=>{const fa=d.mode==='under'?(d.aliased?d.fa:S.f0):null,dr=f=>(20*Math.log10(Math.abs(sincv(f/S.fs))**(S.interp==='foh'?2:1))).toFixed(2);
          if(S.interp==='sinc')return `Ideal sinc = brick-wall low-pass at f<sub>s</sub>/2 = ${d.nyq.toFixed(2)} Hz${fa!==null?`: rebuilds a ${fa.toFixed(2)} Hz tone${d.aliased?` (not the original ${S.f0.toFixed(2)} Hz)`:''}`:''}. Truncated to M = ${S.M} samples, so it rings at the record edges.`;
          return `${S.interp==='zoh'?`ZOH: delay T/2 = ${(500/S.fs).toFixed(1)} ms; |H|/T = |sinc(fT)|`:'FOH (linear): no delay; |H|/T = sinc²(fT)'} → ${dr(S.fs/2)} dB at f<sub>s</sub>/2${fa!==null?`, ${dr(fa)} dB at ${fa.toFixed(2)} Hz`:''}.`;}]},
 ft:{f:['CT','CF','Fourier transform',d=>`${I('X')}(${I('j')}ω) = ${INT_('−∞','∞')} ${I('x')}(${I('t')}) ${I('e')}<sup>−${I('j')}ω${I('t')}</sup> ${I('dt')}`,
       'Nothing, if it exists (needs ∫|x| dt &lt; ∞: every pole in the LHP). Growing signals have no FT.',d=>TX.ft.live(d)],
     i:['CF','CT','Inverse Fourier transform',d=>`${I('x')}(${I('t')}) = ${FRc('1','2π')} ${INT_('−∞','∞')} ${I('X')}(${I('j')}ω) ${I('e')}<sup>${I('j')}ω${I('t')}</sup> ${I('d')}ω`,
       'Nothing. At a jump (here t = 0) the integral converges to the midpoint, A/2.',d=>d.pmax<0?`Gives back x(t) for t &gt; 0, x(0) = ${(S.A/2).toFixed(2)} (midpoint of the step), 0 for t &lt; 0.`:'Not available: X(jω) does not exist for this pole position.']},
 dft:{f:['DT','DF','DFT',d=>`${I('X')}[${I('k')}] = ${SUM('<i>N</i>−1','<i>n</i>=0')} ${I('w')}[${I('n')}]${I('x')}[${I('n')}] ${I('e')}<sup>−${I('j')}2π${I('kn')}/${I('N')}</sup>, &nbsp; ${I('k')} = 0 … ${I('N')}−1`,
        'Samples n ≥ N (if N &lt; M) are dropped, and the window reshapes the record. Treats the record as one period, so a mismatch at the ends leaks.',d=>TX.dft.live(d)],
      i:['DF','DT','Inverse DFT',d=>`${I('w')}[${I('n')}]${I('x')}[${I('n')}] = ${FRc('1','<i>N</i>')} ${SUM('<i>N</i>−1','<i>k</i>=0')} ${I('X')}[${I('k')}] ${I('e')}<sup>${I('j')}2π${I('kn')}/${I('N')}</sup>, &nbsp; ${I('n')} = 0 … ${I('N')}−1`,
        'Nothing within the N samples (exact), but it returns the windowed, zero-padded/truncated record, N-periodic in n; dividing out w[n] needs w[n] ≠ 0.',
        d=>`ifft(X) returns ${S.N} samples: w[n]x[n] for n &lt; ${Math.min(S.M,S.N)}${S.N>S.M?`, then ${S.N-S.M} zeros`:''}.`]},
 fs:{f:['CT','DF','Fourier-series analysis',d=>`${I('c')}<sub>k</sub> = ${FRc('1','<i>T</i><sub>p</sub>')} ${INT_('0','<i>T</i><sub>p</sub>')} ${I('x̃')}(${I('t')}) ${I('e')}<sup>−${I('j')}2π${I('kt')}/${I('T')}<sub>p</sub></sup> ${I('dt')}, &nbsp; ${I('T')}<sub>p</sub> = ${I('NT')}`,
       'Everything outside one period: x is replaced by its periodic extension x̃ (windowed record, zero-padded to NT). The DFT gets c<sub>k</sub> only aliased: X[k]/N = Σ<sub>m</sub> c<sub>k+mN</sub>.',d=>TX.fs.live(d)],
     i:['DF','CT','Fourier-series synthesis',d=>`${I('x̃')}(${I('t')}) = ${SUM('∞','<i>k</i>=−∞')} ${I('c')}<sub>k</sub> ${I('e')}<sup>${I('j')}2π${I('kt')}/${I('T')}<sub>p</sub></sup>`,
       'Rebuilds the periodic x̃(t), not the one-shot x(t). Gibbs overshoot (≈ 9%) at every period edge if the sum is truncated.',d=>`Lines every 1/T<sub>p</sub> = ${d.df.toPrecision(3)} Hz rebuild a waveform repeating every NT = ${(S.N*d.T).toFixed(3)} s.`]},
 dtft:{f:['DT','CF','DTFT',d=>`${I('X')}(${I('e')}<sup>${I('j')}Ω</sup>) = ${SUM('∞','<i>n</i>=−∞')} ${I('x')}[${I('n')}] ${I('e')}<sup>−${I('j')}Ω${I('n')}</sup>, &nbsp; Ω = ω${I('T')}`,
        'Nothing, if it exists (Σ|x[n]| &lt; ∞). The result is 2π-periodic in Ω (period f<sub>s</sub> in f): equal to (1/T)Σ<sub>k</sub> X(j(ω − 2πk/T)) + A/2, i.e. the aliased CT spectrum.',d=>TX.dtft.live(d)],
       i:['CF','DT','Inverse DTFT',d=>`${I('x')}[${I('n')}] = ${FRc('1','2π')} ${INT_('−π','π')} ${I('X')}(${I('e')}<sup>${I('j')}Ω</sup>) ${I('e')}<sup>${I('j')}Ω${I('n')}</sup> ${I('d')}Ω &nbsp; (any 2π interval)`,
        'Nothing about x[n]; but it returns the samples, not x(t). Any CT content that aliased stays folded.',d=>d.pmax<0?`Returns x[n] exactly, e.g. x[1] = ${xt(d.T,d).toFixed(4)}.`:'Not available: the unit circle is outside the ROC.']},
 fsamp:{f:['CF','DF','Frequency sampling',d=>`${I('X')}[${I('k')}] = ${I('X')}<sub>w</sub>(${I('e')}<sup>${I('j')}Ω</sup>)|<sub>Ω = 2π${I('k')}/${I('N')}</sub>, &nbsp; ${I('f')}<sub>k</sub> = ${I('k')}·${I('f')}<sub>s</sub>/${I('N')}`,
         'Everything between the bins (picket fence / scalloping). Sampling in frequency makes time N-periodic: a record longer than N would time-alias (fft(x,N) truncates instead).',d=>TX.fsamp.live(d)],
        i:['DF','CF','Dirichlet (periodic-sinc) interpolation',d=>`${I('X')}<sub>w</sub>(${I('e')}<sup>${I('j')}Ω</sup>) = ${SUM('<i>N</i>−1','<i>k</i>=0')} ${I('X')}[${I('k')}] ${I('P')}<sub>N</sub>(Ω − 2π${I('k')}/${I('N')}), &nbsp; ${I('P')}<sub>N</sub>(Ω) = ${FRc(`sin(${I('N')}Ω/2)`,`${I('N')} sin(Ω/2)`)} ${I('e')}<sup>−${I('j')}Ω(${I('N')}−1)/2</sup>`,
         'Nothing, as long as the record fits in N samples (it does here: length min(M, N)). Equivalent: zero-pad to a larger N and FFT again.',d=>`Record length min(M,N) = ${Math.min(S.M,S.N)} ≤ N = ${S.N}, so the green curve is recovered exactly from the ${S.N} bins.`]},
 lap:{f:['CT','S','Laplace transform',d=>`${I('X')}(${I('s')}) = ${INT_('0','∞')} ${I('x')}(${I('t')}) ${I('e')}<sup>−${I('st')}</sup> ${I('dt')}, &nbsp; ROC: Re{${I('s')}} &gt; ${d.pmax.toFixed(2)}`,
        'Unilateral: anything at t &lt; 0 is ignored. Otherwise nothing; it exists even for growing signals.',d=>TX.lap.live(d)],
      i:['S','CT','Inverse Laplace',d=>`${I('x')}(${I('t')}) = ${FRc('1','2π<i>j</i>')} ${INT_('<i>c</i>−<i>j</i>∞','<i>c</i>+<i>j</i>∞')} ${I('X')}(${I('s')}) ${I('e')}<sup>${I('st')}</sup> ${I('ds')} &nbsp;(${I('c')} in the ROC) = Σ Res[${I('X')}(${I('s')})${I('e')}<sup>${I('st')}</sup>, ${I('p')}<sub>i</sub>] &nbsp;(partial fractions)`,
        'Nothing, given the ROC. Without the ROC the inverse is ambiguous (a left-sided signal has the same X(s)).',
        d=>d.rep?`Double pole: x(t) = A(1 + ${(d.p1.re-d.z0.re).toFixed(2)}·t)e<sup>${d.p1.re.toFixed(2)}t</sup>, t ≥ 0.`:`Residues: x(t) = ${cfmt(cscale(d.R1,S.A))}·e<sup>${cfmt(d.p1,2)}t</sup> + ${cfmt(cscale(d.R2,S.A))}·e<sup>${cfmt(d.p2,2)}t</sup>, t ≥ 0.`]},
 zt:{f:['DT','Z','Z-transform',d=>`${I('X')}(${I('z')}) = ${SUM('∞','<i>n</i>=0')} ${I('x')}[${I('n')}] ${I('z')}<sup>−${I('n')}</sup>, &nbsp; ROC: |${I('z')}| &gt; ${d.qmax.toFixed(3)}`,
       'Unilateral: n &lt; 0 is ignored. Otherwise nothing.',d=>TX.zt.live(d)],
     i:['Z','DT','Inverse Z-transform',d=>`${I('x')}[${I('n')}] = ${FRc('1','2π<i>j</i>')} <span class="big">∮</span><sub>C</sub> ${I('X')}(${I('z')}) ${I('z')}<sup>${I('n')}−1</sup> ${I('dz')} &nbsp;(C counter-clockwise in the ROC) = Σ residues; &nbsp; ${FRc('<i>z</i>','<i>z</i> − <i>q</i>')} ↔ ${I('q')}<sup>${I('n')}</sup>${I('u')}[${I('n')}]`,
       'Nothing, given the ROC. It returns the samples x[n], not x(t).',
       d=>d.rep?`Double pole: x[n] = A(1 + ${((d.p1.re-d.z0.re)*d.T).toFixed(3)}·n)·${d.q1.re.toFixed(4)}<sup>n</sup>.`:`Residues: x[n] = ${cfmt(cscale(d.R1,S.A))}·${cfmt(d.q1,4)}<sup>n</sup> + ${cfmt(cscale(d.R2,S.A))}·${cfmt(d.q2,4)}<sup>n</sup>.`]},
 map:{f:['S','Z','z = e<sup>sT</sup>',d=>`${I('z')} = ${I('e')}<sup>${I('sT')}</sup>: &nbsp; |${I('z')}| = ${I('e')}<sup>Re{${I('s')}}${I('T')}</sup>, &nbsp; ∠${I('z')} = Im{${I('s')}}·${I('T')}`,
        'Many-to-one: s and s ± j2πk/T land on the same z, so pole frequencies above π/T fold (aliasing). Zeros do not map this way.',
        d=>d.mode==='under'?`s = ${(-S.sig).toFixed(2)} ± j${d.wd.toFixed(2)} ↦ z = ${d.r.toFixed(4)}∠±${Math.abs(d.Wwrap).toFixed(3)} rad`:`s = ${PS(d)} ↦ z = ${PZ(d)}`],
      i:['Z','S','s = (1/T) ln z',d=>`${I('s')} = ${FRc('1','<i>T</i>')} Ln ${I('z')} = ${FRc('1','<i>T</i>')}(ln|${I('z')}| + ${I('j')}∠${I('z')}), &nbsp; ∠${I('z')} ∈ (−π, π] &nbsp; (principal branch; also ${I('s')} + ${I('j')}2π${I('k')}/${I('T')})`,
        'Which strip the pole came from: it returns the principal value |Im s| ≤ π/T. Aliased poles come back at the alias frequency. z on the negative real axis or z = 0 has no unique / finite s.',
        d=>{if(d.mode!=='under')return `z = ${PZ(d)} ↦ s = ${PS(d)} (real, positive z: unique).`;const w=Math.abs(d.Wwrap)/d.T;
          return `z = ${d.r.toFixed(4)}∠±${Math.abs(d.Wwrap).toFixed(3)} ↦ s = ${(Math.log(d.r)/d.T).toFixed(2)} ± j${w.toFixed(2)}${d.aliased?` ≠ the original ±j${d.wd.toFixed(2)} (differs by a multiple of j2π/T = j${(TAU/d.T).toFixed(2)}): ${d.fa.toFixed(2)} Hz instead of ${S.f0.toFixed(2)} Hz`:' (= the original pole)'}.`;}]},
};
const DOMN={CT:'Continuous Time',DT:'Discrete Time',CF:'Continuous Freq.',DF:'Discrete Freq.',S:'S-domain',Z:'Z-domain'};
function dirRow(id,w,d,full){const r=DIRS[id][w],live=r[5]?r[5](d):'';
  return `<div class="drow"><div class="dhd"><span class="dtag" title="${DOMN[r[0]]} → ${DOMN[r[1]]}">${r[0]} → ${r[1]}</span><b>${r[2]}</b></div><div class="deq">${r[3](d)}</div>`+
   (full?`<div class="dlost"><span>Lost going this way:</span> ${r[4]}</div>${live?`<div class="live dlive" data-w="${w}">${live}</div>`:''}`:'')+`</div>`;}
/* arrow geometry: labels + paths built from panel rectangles */
const mapEl=document.getElementById('map'),svg=document.getElementById('arrows');
const P=id=>{const m=mapEl.getBoundingClientRect(),r=document.getElementById(id).getBoundingClientRect();return {l:r.left-m.left,t:r.top-m.top,r:r.right-m.left,b:r.bottom-m.top,w:r.width,h:r.height};};
const LABELS=[];
function layoutArrows(){
  const ct=P('pCT'),dt=P('pDT'),cf=P('pCF'),df=P('pDF'),ps=P('pS'),pz=P('pZ');
  const g=4,side=ct.l,midgap=dt.l-ct.r;const items=[];
  const H=(id,x1,y1,x2,y2,heads)=>items.push({id,d:`M${x1},${y1} L${x2},${y2}`,heads});
  const Q=(id,x1,y1,cx1,cy1,cx2,cy2,x2,y2,heads)=>items.push({id,d:`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`,heads});
  // horizontal pairs
  H('samp',ct.r+g,ct.t+ct.h*.34,dt.l-g,ct.t+ct.h*.34,'end');H('samp',dt.l-g,ct.t+ct.h*.68,ct.r+g,ct.t+ct.h*.68,'end');
  H('fsamp',cf.r+g,cf.t+cf.h*.34,df.l-g,cf.t+cf.h*.34,'end');H('fsamp',df.l-g,cf.t+cf.h*.68,cf.r+g,cf.t+cf.h*.68,'end');
  H('map',ps.r+g,ps.t+ps.h*.5,pz.l-g,ps.t+ps.h*.5,'both');
  // left side curves
  const bx=Math.max(8,side*.42);
  Q('ft',ct.l-g,ct.t+ct.h*.62,ct.l-bx,ct.b+10,cf.l-bx,cf.t-10,cf.l-g,cf.t+cf.h*.38,'both');
  Q('lap',ct.l-g,ct.t+ct.h*.2,ct.l-side*.95,ct.t,ps.l-side*.95,ps.t+ps.h*.5,ps.l-g,ps.t+ps.h*.62,'both');
  Q('dft',dt.r+g,dt.t+dt.h*.62,dt.r+bx,dt.b+10,df.r+bx,df.t-10,df.r+g,df.t+df.h*.38,'both');
  Q('zt',dt.r+g,dt.t+dt.h*.2,dt.r+side*.95,dt.t,pz.r+side*.95,pz.t+pz.h*.5,pz.r+g,pz.t+pz.h*.62,'both');
  // diagonals
  const inset=Math.min(40,ct.w*.12);
  H('fs',ct.r-inset,ct.b+g,df.l+inset,df.t-g,'both');
  H('dtft',dt.l+inset,dt.b+g,cf.r-inset,cf.t-g,'both');
  // labels (x,y in map coords)
  const yGap1=(ct.b+cf.t)/2, xm=(ct.r+dt.l)/2;
  const lp=[
    ['samp',xm,ct.t+ct.h*.34-14,'Sampling','',''],
    ['samp',xm,ct.t+ct.h*.68+18,'Interpolation','ZOH · FOH · sinc','dup'],
    ['fsamp',xm,cf.t+cf.h*.34-14,'Sampling','',''],
    ['fsamp',xm,cf.t+cf.h*.68+18,'Interpolation','','dup'],
    ['map',xm,ps.t+ps.h*.5-16,'z = e<sup>sT</sup>','s = (ln z)/T',''],
    ['ft',ct.l-bx*.78,yGap1,'(Inverse)<br>Fourier<br>transform','',''],
    ['lap',ps.l-side*.62,ps.t+ps.h*.2,'(Inverse)<br>Laplace<br>transform','',''],
    ['dft',dt.r+bx*.78,yGap1,'(Inverse)<br>Discrete<br>Fourier T.','',''],
    ['zt',pz.r+side*.62,pz.t+pz.h*.2,'(Inverse)<br>Z-<br>transform','',''],
    ['fs',xm,yGap1-15,'Fourier series','',''],
    ['dtft',xm,yGap1+15,'(Inverse) DTFT','',''],
  ];
  const SHORT={samp:'S/I',fsamp:'S/I',map:'e<sup>sT</sup>⇄',ft:'FT',lap:'LT',dft:'DFT',zt:'ZT',fs:'FS',dtft:'DTFT'};
  const narrow=side<60;
  if(narrow){ // reposition short badges onto arrows
    lp[0]=['samp',xm,ct.t+ct.h*.5,'','',''];lp[2]=['fsamp',xm,cf.t+cf.h*.5,'','',''];lp[4]=['map',xm,ps.t+ps.h*.5,'','',''];
    lp[5]=['ft',ct.l-side*.45,yGap1,'','',''];lp[7]=['dft',dt.r+side*.45,yGap1,'','',''];
    lp[6]=['lap',ps.l-side*.62,(cf.b+ps.t)/2,'','',''];lp[8]=['zt',pz.r+side*.62,(df.b+pz.t)/2,'','',''];
    lp[9]=['fs',xm-12,yGap1-11,'','',''];lp[10]=['dtft',xm+10,yGap1+11,'','',''];
  }
  // build svg
  const cols=[...new Set(Object.values(TX).map(t=>t.c))];
  let defs='<defs>'+cols.map((c,i)=>`<marker id="mk${i}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join('')+'</defs>';
  let body='';items.forEach(it=>{const c=TX[it.id].c,mi=cols.indexOf(c);const ms=`marker-end="url(#mk${mi})"`+(it.heads==='both'?` marker-start="url(#mk${mi})"`:'');
    body+=`<path class="a" data-id="${it.id}" d="${it.d}" stroke="${c}" style="color:${c}" ${ms}/><path class="hit" data-id="${it.id}" d="${it.d}"/>`;});
  svg.innerHTML=defs+body;
  svg.querySelectorAll('path.hit').forEach(p=>p.addEventListener('click',()=>pick(p.dataset.id)));
  mapEl.querySelectorAll('.tl').forEach(e=>e.remove());
  lp.forEach(([id,x,y,long,sm,cls])=>{const b=document.createElement('button');b.className='tl '+(cls||'');b.dataset.id=id;b.style.left=x+'px';b.style.top=y+'px';b.style.setProperty('--c',TX[id].c);
    b.innerHTML=`<span class="l">${long}${sm?`<small>${sm}</small>`:''}</span><span class="s">${SHORT[id]}</span>`;b.title=TX[id].name.replace('^{sT}','ˢᵀ');b.onclick=()=>pick(id);mapEl.appendChild(b);});
  markSel();
}
function markSel(){
  svg.querySelectorAll('path.a').forEach(p=>p.classList.toggle('on',p.dataset.id===S.sel));
  mapEl.querySelectorAll('.tl').forEach(b=>b.classList.toggle('on',b.dataset.id===S.sel));
  const t=TX[S.sel];document.querySelectorAll('.panel').forEach(p=>{const on=t.ends.includes(p.id);p.classList.toggle('hl',on);p.style.setProperty('--hc',t.c);});
}
function pick(id){select(id);openPair(id);}   // direct user choice of a transform: highlight + split view of its two panels
function select(id){S.sel=id;Object.assign(S,viewFor(id));syncControls();markSel();renderExplain();changed();schedule();}
let explMode=null;
/* the card's own eq boxes: drop the generic transform-pair boxes (now shown per direction above), keep the model-specific ones */
const DROP={samp:[0,1],fsamp:[0,1],ft:[0],dft:[0],fs:[0],dtft:[0],lap:[0],zt:[0],map:[0]};
function modelBoxes(id,d){const t=TX[id],h=typeof t.eq==='function'?t.eq(d):t.eq;const parts=h.split('<div class="eq box">').slice(1);
  return parts.filter((_,i)=>!(DROP[id]||[]).includes(i)).map(p=>'<div class="eq box">'+p).join('');}
function renderExplain(){
  const t=TX[S.sel],d=D();explMode=S.mode;$('modelHint').innerHTML=`<i>x</i>(<i>t</i>) = ${MH(d).xt} &nbsp;⇔&nbsp; poles ${MH(d).ps} (${MH(d).tag})`;
  document.getElementById('explain').innerHTML=`<div class="xhead" style="--c:${t.c}"><span class="chip"></span><h2>${t.name.replace('e^{sT}','e<sup>sT</sup>')}</h2><span class="pair">${t.pair}</span></div>
   <div class="xgrid"><div style="--c:${t.c}">${dirRow(S.sel,'f',d,true)}${dirRow(S.sel,'i',d,true)}${modelBoxes(S.sel,d)}<div class="live" id="liveLine" hidden>${t.live(d)}</div></div>
   <div><h4>Key variables</h4><dl class="vars">${t.vars.map(v=>`<dt>${v[0]}</dt><dd>${v[1]}</dd>`).join('')}</dl>
   <h4>What's lost / gained</h4><ul>${t.lost.map(l=>`<li>${l}</li>`).join('')}</ul>
   <h4>MATLAB</h4><code>${t.ml}</code></div></div>`;
}

/* ---------- readout ---------- */
function renderReadout(d){
  const deg=v=>(v*180/Math.PI).toFixed(1)+'°',U=d.mode==='under';
  const sStab=d.pmax<-1e-12?['ok','stable (LHP)']:d.pmax>1e-12?['bad','unstable (RHP)']:['warn','marginal'];
  const zStab=d.qmax<1-1e-12?['ok','|z| < 1 stable']:d.qmax>1+1e-12?['bad','|z| > 1 unstable']:['warn','|z| = 1 marginal'];
  const zl=isFinite(d.zeta)?(Math.abs(d.zeta-1)<1e-9?' (critical)':d.zeta>1?' (over)':d.zeta<0?' (negative)':' (under)'):'';
  const R=[
    ['','s-poles '+(U?'−σ ± jω<sub>d</sub>':d.rep?'−σ (double)':'−σ ± δ'),PS(d)],
    ['','z-poles  z = e<sup>sT</sup>',PZ(d)],
    ['','Ω = ω<sub>d</sub>T (rad/sample)',U?`${d.Wd.toFixed(3)}${d.aliased?' → '+d.Wwrap.toFixed(3):''} (${deg(Math.abs(d.Wwrap))})`:'0 (real poles)'],
    ['','r = e<sup>−σT</sup>'+(d.mode==='over'?' (centre)':''),Math.exp(-S.sig*d.T).toFixed(4)],
    ['','fs = 1/T',`${S.fs.toFixed(2)} Hz · T=${(1000*d.T).toFixed(1)} ms`],
    [d.aliased?'warn':'','Nyquist fs/2',`${d.nyq.toFixed(2)} Hz`],
    U?[d.aliased?'bad':'ok','f₀ → apparent freq.',d.aliased?`${S.f0.toFixed(2)} → ${d.fa.toFixed(2)} Hz`:`${S.f0.toFixed(2)} Hz (no alias)`]:['','f₀','none (no oscillation)'],
    ['','DFT bin Δf = fs/N',`${d.df.toPrecision(3)} Hz`],
    ['','Record MT · res 1/(MT)',`${(S.M*d.T).toFixed(2)} s · ${(S.fs/S.M).toPrecision(3)} Hz`],
    ['','ζ, ω<sub>n</sub>',isFinite(d.zeta)?`${d.zeta.toFixed(3)}${zl}, ${d.wn.toFixed(2)} r/s`:'n/a (p₁p₂ ≤ 0)'],
    [sStab[0],'s-plane stability',sStab[1]],
    [zStab[0],'z-plane stability',zStab[1]],
  ];
  document.getElementById('readout').innerHTML=R.map(r=>`<div class="${r[0]}">${r[1]}<b>${r[2]}</b></div>`).join('');
  const st=document.getElementById('status');const msgs=[];
  if(d.pmax>1e-12)msgs.push(['bad','Unstable: an s-pole is in the RHP and a z-pole is outside the unit circle. No FT or DTFT.']);
  else if(d.pmax>=-1e-12)msgs.push(['warn','Marginally stable: a pole sits on the jω axis and the unit circle. The FT/DTFT contain impulses.']);
  if(d.aliased)msgs.push(['warn',`Aliasing: f₀ > fs/2. The z-pole angle wraps, and the samples look like ${d.fa.toFixed(2)} Hz.`]);
  else if(U&&S.f0>0.4*S.fs)msgs.push(['warn','Close to Nyquist: few samples per cycle, and the spectral copies are starting to overlap.']);
  if(!msgs.length)msgs.push(['ok',U?'Stable, no aliasing of the main tone.':`Stable, ${MH(d).tag.replace('&lt;','<').replace('&gt;','>')}: no oscillation.`]);
  st.innerHTML=msgs.map(m=>`<div class="status ${m[0]}">${m[1]}</div>`).join('');
}
let winKey=null;
function renderWinInfo(){
  const key=[S.win,S.M,S.beta,S.alpha].join('|');if(key===winKey)return;winKey=key;
  const m=winMetrics(),W=WINS[S.win];
  const ml=W.ml.replace('beta',S.beta.toFixed(1)).replace('alpha',S.alpha.toFixed(2)).replace(/\bM\b/,S.M);
  $('winsum').innerHTML=`Window: ${W.n} · PSL ${m.psl.toFixed(1)} dB · main lobe ${m.ml.toFixed(2)} bins`;
  $('winbody').innerHTML=`<p>${W.d}</p><table class="wm">
   <tr><th>Main-lobe width (null-to-null)</th><td class="v">${m.ml.toFixed(2)} bins</td></tr>
   <tr><th>−3 dB width</th><td class="v">${m.bw3.toFixed(2)} bins</td></tr>
   <tr><th>Peak sidelobe level</th><td class="v">${m.psl.toFixed(1)} dB</td></tr>
   <tr><th>ENBW</th><td class="v">${m.enbw.toFixed(3)} bins (${(10*Math.log10(m.enbw)).toFixed(2)} dB)</td></tr>
   <tr><th>Scallop loss (½-bin tone)</th><td class="v">${m.scal.toFixed(2)} dB</td></tr>
   <tr><th>Coherent gain Σw/M</th><td class="v">${m.cg.toFixed(3)}</td></tr></table>
   <p style="color:var(--muted)">1 bin = f<sub>s</sub>/M = ${(S.fs/S.M).toPrecision(3)} Hz. Computed live from this ${S.M}-point window with a 64× zero-padded FFT. Cosine-sum windows use MATLAB's "periodic" (DFT-even) form; Kaiser, Tukey and Bartlett are symmetric, as MATLAB defines them.</p>
   <h5>MATLAB</h5><code>w = ${ml};  X = fft(x(:).*w(:), ${S.N});</code>`;
}

/* ---------- controls ---------- */
const $=id=>document.getElementById(id);
const cvCT=$('cvCT'),cvDT=$('cvDT'),cvCF=$('cvCF'),cvDF=$('cvDF'),cvS=$('cvS'),cvZ=$('cvZ');
const INT=k=>k==='M'||k==='N';
const numStr=v=>String(+(+v).toFixed(6));
function syncControls(){
  document.querySelectorAll('input[type=range][data-k]').forEach(i=>{i.value=S[i.dataset.k];});
  document.querySelectorAll('input.num[data-n]').forEach(i=>{if(document.activeElement!==i)i.value=numStr(S[i.dataset.n]);});
  $('oT').textContent='T = '+numStr((1000/S.fs).toFixed(2))+' ms';
  $('selWave').value=S.wave;$('selSel').value=S.sel;
  $('selWin').value=S.win;$('rowBeta').hidden=S.win!=='kaiser';$('rowAlpha').hidden=S.win!=='tukey';
  segSet('segMode',S.mode);$('rowDl').hidden=S.mode!=='over';const U=S.mode==='under';
  $('sF0').disabled=!U;$('sF0').classList.toggle('off',!U);$('lblF0').classList.toggle('off',!U);document.querySelector('input.num[data-n=f0]').disabled=!U;
  segSet('segInterp',S.interp);segSet('segDb',S.db?'db':'lin');segSet('segCtv',S.ctv);segSet('segCop',S.cop?'on':'off');moreBadge();
}
function moreBadge(){const v=viewFor(S.sel),L=[];
  if(S.wave!==DEF.wave)L.push('waveform: damped cosine');if(S.interp!==DEF.interp)L.push('interp: '+({foh:'FOH',sinc:'ideal sinc'})[S.interp]);if(S.db)L.push('dB scale');
  if(S.ctv!==v.ctv)L.push('CT panel: '+(S.ctv==='per'?'periodic ext.':'signal'));if(S.cop!==v.cop)L.push('shifted copies '+(S.cop?'shown':'hidden'));
  const b=$('moreBadge');b.hidden=!L.length;b.textContent=L.length?L.length+' set':'';b.title=L.join(' · ');$('more').title=L.length?'Changed here: '+L.join(' · '):'';}
function segSet(id,v){$(id).querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));}
function after(){syncControls();changed();renderExplain();schedule();}
document.querySelectorAll('input[type=range][data-k]').forEach(i=>i.addEventListener('input',e=>{const k=i.dataset.k;S[k]=INT(k)?parseInt(e.target.value):parseFloat(e.target.value);after();}));
/* numeric boxes: exact values (any precision) inside the slider range; live while typing, clamped on commit */
document.querySelectorAll('input.num[data-n]').forEach(i=>{const k=i.dataset.n,mn=+i.min,mx=+i.max;
  const val=()=>{const v=parseFloat(i.value);return isFinite(v)?(INT(k)?Math.round(v):v):null;};
  i.addEventListener('input',()=>{const v=val();if(v!==null&&v>=mn&&v<=mx&&v!==S[k]){S[k]=v;after();}});
  i.addEventListener('change',()=>{const v=val();if(v!==null){const c=clamp(v,mn,mx);if(c!==S[k]){S[k]=c;after();}}i.value=numStr(S[k]);});
  i.addEventListener('keydown',e=>{if(e.key==='Enter')i.blur();});});
$('selWin').innerHTML=Object.entries(WINS).map(([k,w])=>`<option value="${k}">${w.n}</option>`).join('');
$('selWin').onchange=e=>{S.win=e.target.value;after();};
$('selWave').onchange=e=>{S.wave=e.target.value;after();};
$('selSel').innerHTML=Object.entries(TX).map(([k,t])=>`<option value="${k}">${t.name.replace('e^{sT}','e^(sT)')}</option>`).join('');
$('selSel').onchange=e=>pick(e.target.value);
$('segMode').onclick=e=>{const v=e.target.dataset.v;if(v){S.mode=v;after();}};
$('segInterp').onclick=e=>{if(e.target.dataset.v){S.interp=e.target.dataset.v;after();}};
$('segDb').onclick=e=>{if(e.target.dataset.v){S.db=e.target.dataset.v==='db';after();}};
$('segCtv').onclick=e=>{if(e.target.dataset.v){S.ctv=e.target.dataset.v;after();}};
$('segCop').onclick=e=>{if(e.target.dataset.v){S.cop=e.target.dataset.v==='on';after();}};

/* ---------- examples (one code path for presets, Try-this and Reset) ---------- */
const CATS=content.extra.examples.categories;
const DAMPTAB=content.extra.examples.defs.damptab;
const EX=content.extra.examples.examples.map(e=>({...e,extra:e.extra?content.extra.examples.defs[e.extra]:undefined}));
let activeEx='under',exModified=false,activeCat=0;
/* An example IS a setting of the visible controls: DEF + the view toggles its transform implies + its overrides. */
function exState(ex){const sel=ex.sel||DEF.sel;return Object.assign({},DEF,viewFor(sel),ex.p,{sel});}
/* keys that the visible controls expose (sliders that are hidden/disabled in the current mode don't count) */
function relKeys(st){const k=['wave','mode','sig','fs','M','N','win','interp','db','sel','ctv','cop'];
  if(st.mode==='under')k.push('f0');if(st.mode==='over')k.push('dl');if(st.win==='kaiser')k.push('beta');if(st.win==='tukey')k.push('alpha');return k;}
function sameState(a,b){const k=relKeys(a);if(k.join()!==relKeys(b).join())return false;return k.every(x=>typeof a[x]==='number'?Math.abs(a[x]-b[x])<1e-9:a[x]===b[x]);}
function changed(){ // keep the active example + "(modified)" flag in step with the controls
  const cur=EX.find(e=>e.id===activeEx);let id=activeEx,mod=!sameState(S,exState(cur));
  if(mod){const m=EX.find(e=>sameState(S,exState(e)));if(m){id=m.id;mod=false;}}
  if(id!==activeEx){activeEx=id;activeCat=EX.find(e=>e.id===id).cat;exModified=mod;renderCats();renderExInfo();}
  else if(mod!==exModified){exModified=mod;renderExInfo();}}
function applyExample(id){
  const ex=EX.find(e=>e.id===id)||EX[0];
  // full reset: every parameter AND every piece of view/selection state comes from DEF + this example only
  S=exState(ex);
  drag=null;activeEx=ex.id;exModified=false;activeCat=ex.cat;
  syncControls();renderCats();renderExInfo();markSel();renderExplain();schedule();
}
const SETL={wave:['Waveform',v=>v==='cos'?'damped cosine':'free response'],mode:['Pole pair',v=>({under:'complex ζ<1',crit:'repeated ζ=1',over:'real ζ>1'})[v]],
  sig:['σ',v=>numStr(v)+' 1/s'],f0:['f₀',v=>numStr(v)+' Hz'],dl:['δ',v=>numStr(v)+' 1/s'],fs:['fs',v=>numStr(v)+' Hz'],M:['M',numStr],N:['N',numStr],
  win:['Window',v=>WINS[v].n.replace(/ \(.*\)/,'')],beta:['β',numStr],alpha:['α',numStr],interp:['Interp.',v=>({zoh:'ZOH',foh:'FOH',sinc:'ideal sinc'})[v]],
  db:['Scale',v=>v?'dB':'linear'],sel:['Transform',v=>TX[v].name.replace('e^{sT}','e^(sT)')],ctv:['CT panel',v=>v==='per'?'periodic ext.':'signal + recon.'],cop:['CF copies',v=>v?'show':'hide']};
const SETORDER=['wave','mode','sig','f0','dl','fs','M','N','win','beta','alpha','interp','db','sel','ctv','cop'];
function settingsHTML(ex){const st=exState(ex),rk=relKeys(st);
  return SETORDER.filter(k=>rk.includes(k)).map(k=>{const t=`${SETL[k][0]} ${SETL[k][1](st[k])}`;return st[k]!==DEF[k]?`<b>${t}</b>`:t;}).join(' · ');}
function renderCats(){
  $('cats').innerHTML=CATS.map((c,i)=>`<button data-i="${i}" class="${i===activeCat?'on':''}">${c}</button>`).join('');
  $('presets').innerHTML=EX.filter(e=>e.cat===activeCat).map(e=>`<button data-id="${e.id}" class="${e.id===activeEx?'on':''}">${e.n}</button>`).join('');
}
$('cats').onclick=e=>{const b=e.target.closest('button');if(b){activeCat=+b.dataset.i;renderCats();}};
$('presets').onclick=e=>{const b=e.target.closest('button');if(b)applyExample(b.dataset.id);};
function renderExInfo(){
  const ex=EX.find(e=>e.id===activeEx);
  $('exsum').innerHTML=`About: ${ex.n}${exModified?'<span class="mod">(modified)</span>':''}`;
  $('exbody').innerHTML=`<h5>Settings <span style="text-transform:none;letter-spacing:0;font-weight:500">(bold = changed from Reset)</span></h5><div class="sets">${settingsHTML(ex)}</div><h5>What to look at</h5><p>${ex.look}</p><h5>Why</h5><p>${ex.why}</p>${ex.extra?`<h5>Under vs. critical vs. over</h5>${ex.extra}`:''}<h5>Key relation</h5><div class="eqi">${ex.eq}</div><h5>MATLAB tip</h5><code>${ex.ml}</code>`;
}
$('btnReset').onclick=()=>applyExample('under');

/* try-this list: same applyExample path */
const TRY=content.extra.examples.tryThis.map(t=>[t.id,t.head,t.text]);
TRY.forEach(([id,h,t])=>{const li=document.createElement('li');li.innerHTML=`<button class="tbtn" data-ex="${id}">Do it</button><div><b>${h}.</b> ${t}</div>`;li.querySelector('button').onclick=()=>{applyExample(id);$('map').scrollIntoView({behavior:'smooth',block:'start'});};$('tryList').appendChild(li);});

/* ---------- pointer handling: pole drag vs. tap-to-expand ---------- */
function canvasXY(cv,e){const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function poleHit(cv,kind,x,y){ // index of the pole under the pointer, or -1
  const v=VIEWS.get(cv);if(!v)return -1;const d=D(),F=v.F,R=22*Math.max(1,FK*0.9);
  const pts=kind==='s'?[d.p1,d.p2]:[d.q1,d.q2];let best=-1,bd=R;
  pts.forEach((p,i)=>{const dd=Math.hypot(x-F.X(p.re),y-F.Y(p.im));if(dd<bd){bd=dd;best=i;}});return best;}
function otherReal(d,i){ // real part (s-domain) of the pole NOT being dragged, for real-pole modes
  if(d.mode==='under')return null;return (i===0?d.p2:d.p1).re;}
const SNAP=9; // px: within this distance of the real axis a pole snaps onto it
function dragTo(cv,kind,x,y){
  const F=VIEWS.get(cv).F;
  const re=F.xr[0]+(x-F.x)/F.w*(F.xr[1]-F.xr[0]),im=F.yr[0]+(F.y+F.h-y)/F.h*(F.yr[1]-F.yr[0]);
  const onAxis=Math.abs(y-F.Y(0))<=SNAP&&(kind==='s'||re>0);           // z: only the positive real axis holds real s-poles
  const toPx=sr=>kind==='s'?F.X(sr):F.X(Math.exp(sr/S.fs));
  let sre,sim;
  if(kind==='s'){sre=re;sim=im;}
  else{const rr=clamp(Math.hypot(re,im),0.02,Math.exp(0.5/S.fs));sre=Math.log(onAxis?clamp(re,0.02,Math.exp(0.5/S.fs)):rr)*S.fs;sim=clamp(Math.abs(Math.atan2(im,re)),1e-3,Math.PI)*S.fs;}
  if(!onAxis){S.mode='under';S.sig=clamp(+(-sre).toFixed(2),-0.5,4);S.f0=clamp(+(Math.abs(sim)/TAU).toFixed(2),0.1,15);drag.other=null;}
  else if(drag.other===null){S.mode='crit';S.sig=clamp(+(-sre).toFixed(2),-0.5,4);}   // complex pair lands on the axis → double pole that follows the pointer
  else{const o=drag.other;
    if(Math.abs(toPx(sre)-toPx(o))<SNAP){S.mode='crit';S.sig=clamp(+(-o).toFixed(2),-0.5,4);}
    else{S.mode='over';S.sig=clamp(+(-(sre+o)/2).toFixed(2),-0.5,4);S.dl=clamp(+(Math.abs(sre-o)/2).toFixed(2),0.05,4);}}
  syncControls();changed();if(S.mode!==explMode)renderExplain();schedule();}
function attachPointer(cv,kindFn,onTap){
  let start=null;
  cv.addEventListener('pointerdown',e=>{const [x,y]=canvasXY(cv,e);start={x,y,moved:false};const kind=kindFn();
    const hi=kind?poleHit(cv,kind,x,y):-1;
    if(hi>=0){drag={pl:kind,cv,i:hi,other:otherReal(D(),hi)};try{cv.setPointerCapture(e.pointerId);}catch(_){}cv.style.cursor='grabbing';e.preventDefault();}});
  cv.addEventListener('pointermove',e=>{const [x,y]=canvasXY(cv,e);if(start&&Math.hypot(x-start.x,y-start.y)>6)start.moved=true;
    if(drag&&drag.cv===cv)dragTo(cv,drag.pl,x,y);});
  cv.addEventListener('pointerup',()=>{const wasDrag=!!(drag&&drag.cv===cv);if(wasDrag){drag=null;cv.style.cursor='';schedule();}
    if(start&&!start.moved&&!wasDrag&&onTap)onTap();start=null;});
  cv.addEventListener('pointercancel',()=>{if(drag&&drag.cv===cv){drag=null;cv.style.cursor='';schedule();}start=null;});
}
const PANELS={CT:['Continuous Time',cvCT],DT:['Discrete Time',cvDT],CF:['Continuous Frequency',cvCF],DF:['Discrete Frequency',cvDF],S:['Continuous S-Domain',cvS],Z:['Discrete Z-Domain',cvZ]};
const MOD={k:null,keys:[],pair:null,lastFocus:null,lg:[false,false],flip:false,smore:false};const cvM=$('cvM'),cvM2=$('cvM2'),MCV=[cvM,cvM2];
const boardEl=document.querySelector('.board');
const txName=id=>TX[id].name.replace('e^{sT}','e<sup>sT</sup>');
/* keys: one panel (tap / ⤢) or the two panels a transform links (arrow click / transform dropdown) */
function openView(keys,pair=null){
  const wasOpen=MOD.k!==null;MOD.keys=keys;MOD.pair=pair;MOD.k=keys.join('+');if(!wasOpen)MOD.lastFocus=document.activeElement;
  $('mTitle').innerHTML=pair?txName(pair):PANELS[keys[0]][0];
  const narrow=window.matchMedia('(max-width:1150px)').matches,pz=keys.some(k=>k==='S'||k==='Z');
  $('mHint').textContent=(pz?'Drag the ✕ poles. ':'')+(narrow?(window.innerWidth<560?'Pinned · controls below':'Scroll down for the controls; this view stays pinned. ✕ or Esc closes it.'):'Live: the controls on the right update this view. ✕, Esc or a click on the margin closes it.');
  MCV.forEach((cv,i)=>{const k=keys[i],p=(k==='S'||k==='Z');$('slot'+i).hidden=!k;cv.style.touchAction=p?'none':'auto';cv.style.cursor=p?'grab':'default';$('sName'+i).textContent=k&&pair?PANELS[k][0]:'';VIEWS.delete(cv);});
  $('mGrid').classList.toggle('pair',!!pair);boardEl.classList.toggle('pair',!!pair);
  const st=$('mStrip');st.hidden=!pair;if(pair){st.style.setProperty('--c',TX[pair].c);renderStrip(D());}
  document.documentElement.style.setProperty('--tbh',(document.querySelector('header.topbar').offsetHeight)+'px');
  boardEl.classList.add('expanded');$('modal').hidden=false;
  if(narrow){const top=boardEl.getBoundingClientRect().top;if(top<0||top>window.innerHeight*0.5)window.scrollTo({top:window.scrollY+top-document.querySelector('header.topbar').offsetHeight-4});}
  [0,1].forEach(i=>setLegend(i,MOD.lg[i]));if(!wasOpen)$('mClose').focus({preventScroll:true});schedule();}
function openModal(k){openView([k]);}
function openPair(id){openView(TX[id].ends.map(e=>e.slice(1)),id);}
let stripKey=null;
function renderStrip(d){if(!MOD.pair){stripKey=null;return;}const id=MOD.pair,ws=MOD.flip?['i','f']:['f','i'];
  const lostLive=w=>{const r=DIRS[id][w],lv=r[5]?r[5](d):'';return `<div class="sm"><span class="dtag">${r[0]} → ${r[1]}</span> <span class="lostl">Lost:</span> ${r[4]}${lv?`<div class="live">${lv}</div>`:''}</div>`;};
  const h=`<div class="shd"><span class="ml">${TX[id].pair}</span><button class="sflip" id="sFlip" title="Swap which direction is listed first">⇄ flip</button></div>`+
    ws.map(w=>{const r=DIRS[id][w];return `<div class="srow"><span class="dtag" title="${DOMN[r[0]]} → ${DOMN[r[1]]}">${r[0]} → ${r[1]}</span><span class="meq">${r[3](d,true)}</span></div>`;}).join('')+
    `<details class="smore"${MOD.smore?' open':''}><summary>What's lost each way · live values</summary>${ws.map(lostLive).join('')}</details>`;
  if(h!==stripKey){$('mStrip').innerHTML=h;stripKey=h;}}
$('mStrip').addEventListener('toggle',e=>{if(e.target.classList.contains('smore'))MOD.smore=e.target.open;},true);
$('mStrip').addEventListener('click',e=>{if(e.target.id==='sFlip'){MOD.flip=!MOD.flip;renderStrip(D());}});
function closeModal(){if(MOD.k===null)return;MOD.k=null;MOD.keys=[];MOD.pair=null;drag=null;$('modal').hidden=true;boardEl.classList.remove('expanded','pair');
  if(MOD.lastFocus&&MOD.lastFocus.focus&&MOD.lastFocus!==document.body)MOD.lastFocus.focus({preventScroll:true});layoutArrows();schedule();}
$('mClose').onclick=closeModal;
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&MOD.k){closeModal();}});
for(const k in PANELS){const cv=PANELS[k][1];attachPointer(cv,()=>k==='S'?'s':k==='Z'?'z':null,()=>openModal(k));}
document.querySelectorAll('.xp').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openModal(b.dataset.k);}));
MCV.forEach((cv,i)=>attachPointer(cv,()=>{const k=MOD.keys[i];return k==='S'?'s':k==='Z'?'z':null;},null));
window.addEventListener('resize',()=>{if(MOD.k)schedule();});


/* ---------- legend for the expanded view: only what is drawn right now ---------- */
function sw(t,c,o={}){ // tiny SVG swatch
  const a=o.a??1,dash=o.dash?`stroke-dasharray="${o.dash}"`:'',w=o.w??2;let b='';
  if(t==='line')b=`<line x1="1" y1="7" x2="27" y2="7" stroke="${c}" stroke-width="${w}" ${dash} opacity="${a}"/>`;
  else if(t==='vline')b=`<line x1="14" y1="1" x2="14" y2="13" stroke="${c}" stroke-width="1.4" ${dash} opacity="${a}"/>`;
  else if(t==='stem')b=[6,14,22].map((x,i)=>`<line x1="${x}" y1="13" x2="${x}" y2="${[5,3,8][i]}" stroke="${c}" stroke-width="1.4" opacity="${a}"/><circle cx="${x}" cy="${[5,3,8][i]}" r="1.8" fill="${c}" opacity="${a}"/>`).join('');
  else if(t==='dots')b=[5,12,19,26].map((x,i)=>`<circle cx="${x}" cy="${[8,5,7,9][i]}" r="${o.r??2}" fill="${c}" opacity="${a}"/>`).join('');
  else if(t==='x')b=`<path d="M9,2 L19,12 M19,2 L9,12" stroke="${c}" stroke-width="2.2"/>`;
  else if(t==='o')b=`<circle cx="14" cy="7" r="4.5" stroke="${c}" stroke-width="2" fill="none"/>`;
  else if(t==='fill')b=`<rect x="1" y="1" width="26" height="12" rx="2" fill="${c}" opacity="${a}"/>`;
  else if(t==='circ')b=`<path d="M3,13 A11,11 0 0 1 25,13" stroke="${c}" stroke-width="1.6" fill="${o.fill||'none'}" fill-opacity=".25"/>`;
  else if(t==='dot')b=`<circle cx="14" cy="7" r="3.5" fill="${c}"/>`;
  else if(t==='arc')b=`<path d="M4,12 L24,12 M4,12 L20,3" stroke="${c}" stroke-width="1" stroke-dasharray="2 2" fill="none"/><path d="M12,12 A8,8 0 0 0 11,8" stroke="${c}" fill="none"/>`;
  return `<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true">${b}</svg>`;}
function legendItems(k,d){
  const L=[],it=(s,t,m)=>L.push([s,t,m]),stab=-d.pmax,U=d.mode==='under',dB=S.db?' (dB)':'';
  if(k==='CT'){
    if(S.ctv==='per'){it(sw('line',COL.yel,{a:.35,w:1.2}),'x(t)','the CT signal (faded)');it(sw('line',COL.org),'x̃(t)','periodic extension of the windowed record, period NT');it(sw('vline',COL.org,{dash:'2 3'}),'k·NT','period boundaries');}
    else{const nm={zoh:'ZOH (staircase)',foh:'FOH (straight chords)',sinc:'ideal sinc (dashed)'}[S.interp];
      it(sw('line',COL.yel),'x(t)',MH(d).tag);it(sw('line',COL.pink,{dash:S.interp==='sinc'?'5 3':''}),'x<sub>r</sub>(t)',nm+' reconstruction from the M samples');it(sw('dots',COL.pink),'x(nT)','sample instants');}
  }else if(k==='DT'){
    if(S.win!=='rect'){it(sw('stem',COL.muted,{a:.6}),'x[n]','raw samples, before the window');it(sw('line',COL.vio,{dash:'3 3'}),'±w[n]',WINS[S.win].n+' window shape (scaled)');}
    it(sw('stem',COL.yel),S.win!=='rect'?'w[n]x[n]':'x[n]','samples that go into fft(·,N)');
    if(S.M>S.N)it(sw('stem','#666'),'n ≥ N','dropped by fft(x,N) (truncation)');else if(S.N>S.M)it(sw('dots','#777',{r:1}),'zeros','zero-padding up to N');
    it(sw('vline',COL.muted,{dash:'2 3'}),'M','end of the record');
  }else if(k==='CF'){
    it(sw('line',COL.yel,{a:stab>0?1:.5}),'X(jω)','CT spectrum'+(stab>0?'':' (faded: no FT, X(s) on the jω axis)')+dB);
    if(stab>=-1e-12)it(sw('line',COL.grn,{dash:'5 3'}),'T·X(e<sup>jωT</sup>)','DTFT of the samples, scaled by T');
    if(S.cop)it(sw('line',COL.cyan,{dash:'2 3',a:.7,w:1.2}),'X(j(ω−kω<sub>s</sub>))','shifted copies, k = ±1, ±2 (they sum to the DTFT)');
    it(sw('vline',COL.pink),'±fs/2','Nyquist');it(sw('vline',COL.pink,{dash:'1 4'}),'±fs','sampling rate');it(sw('fill','#ffffff',{a:.12}),'|f| > fs/2','outside the first Nyquist zone');
    it('','Lower plot','phase of the same curves (rad)');
  }else if(k==='DF'){
    it(sw('line',COL.grn,{dash:'4 3'}),'T·X<sub>w</sub>(e<sup>jωT</sup>)','DTFT of the windowed, length-min(M,N) record');
    it(sw('stem',COL.cyan),'T·X[k]','N-point DFT bins at k·fs/N'+dB);
    it(sw('vline',COL.pink),'fs/2','Nyquist');
    if(U&&S.f0<=S.fs)it(sw('vline',COL.yel,{dash:'1 3'}),d.aliased?'f<sub>a</sub>':'f<sub>0</sub>',d.aliased?'apparent (aliased) tone frequency':'tone frequency');
    it('','Lower plot','phase: DTFT (dashed) and DFT bins (stems)');
  }else if(k==='S'){
    it(sw('x',COL.grn),'poles','s = '+PS(d)+(d.rep?' (double)':'')+' · drag them');it(sw('o',COL.yel),'zero','s = '+d.z0.re.toFixed(2));
    it(sw('fill',COL.grn,{a:.25}),'Re s < 0','stable half-plane');it(sw('fill','#ef5b5b',{a:.25}),'Re s > 0','unstable half-plane');
    it(sw('line',COL.pink,{dash:'4 3',w:1.4}),'ω = ±π/T','Nyquist lines; the band between them maps once onto the z-plane');
  }else{
    it(sw('x',COL.grn),'poles','z = '+PZ(d)+' · drag them');it(sw('o',COL.yel),'zeros','z = 0 and z₁ = '+f3(d.zz.re));
    it(sw('circ',COL.chalk,{fill:COL.grn}),'|z| = 1','unit circle (image of the jω axis); inside = stable');
    it(sw('dot',COL.pink),'z = −1','Nyquist (ω = π/T)');it(sw('dot',COL.cyan),'z = 1','DC (s = 0)');
    if(U)it(sw('arc',COL.grn),'Ω<sub>d</sub>','pole angle = ω<sub>d</sub>T');
  }
  return L;}
const lgKey=[null,null];
function renderLegend(d){[0,1].forEach(i=>{const box=$('lgBox'+i),k=MOD.keys[i];if(!k||!MOD.lg[i]){box.hidden=true;lgKey[i]=null;return;}box.hidden=false;
  const h=`<h6>Legend · ${PANELS[k][0]}</h6>`+legendItems(k,d).map(([s,t,m])=>`<div class="li">${s||'<svg width="28" height="14"></svg>'}<div><b>${t}</b> <span>${m}</span></div></div>`).join('');
  if(h!==lgKey[i]){box.innerHTML=h;lgKey[i]=h;}});}
function setLegend(i,on){MOD.lg[i]=on;const c=document.querySelector(`.lgchip[data-s="${i}"]`);c.setAttribute('aria-expanded',on);c.textContent=on?'Legend ▴':'Legend ▾';renderLegend(D());}
document.querySelectorAll('.lgchip').forEach(c=>c.onclick=e=>{e.stopPropagation();const i=+c.dataset.s;setLegend(i,!MOD.lg[i]);});
/* ---------- main render ---------- */
let pending=false;
function schedule(){if(!pending){pending=true;requestAnimationFrame(render);}}
function render(){
  pending=false;const d=D();const x=samples(d);const xw=x.map((v,n)=>v*win(n,S.M));const X=dft(xw,d);
  drawCT(d,x);drawDT(d,x,xw);drawCF(d);drawDF(d,X,xw);drawS(d);drawZ(d);
  if(MOD.k)MOD.keys.forEach((k,i)=>{const cv=MCV[i];if(k==='CT')drawCT(d,x,cv);else if(k==='DT')drawDT(d,x,xw,cv);else if(k==='CF')drawCF(d,cv);else if(k==='DF')drawDF(d,X,xw,cv);else if(k==='S')drawS(d,cv);else drawZ(d,cv);});
  renderStrip(d);
  if(S.mode!==explMode)renderExplain();
  renderReadout(d);renderWinInfo();renderLegend(d);document.querySelectorAll('#explain .dlive').forEach(e=>{const f=DIRS[S.sel][e.dataset.w][5];if(f)e.innerHTML=f(d);});
}
window.addEventListener('resize',()=>{layoutArrows();schedule();});
if(window.ResizeObserver)new ResizeObserver(()=>{layoutArrows();schedule();}).observe(mapEl);
syncControls();layoutArrows();renderCats();renderExInfo();renderExplain();render();
/* exposed for self-tests */
window.__EX=EX;window.__apply=applyExample;window.__exState=id=>exState(EX.find(e=>e.id===id));window.__same=sameState;window.__openModal=openModal;window.__openPair=openPair;
/* exposed for self-check */
window.__check=()=>{const save=Object.assign({},S),out={};
  const cases=[['under',{sig:0.6,f0:1}],['crit',{sig:2}],['over',{sig:2.5,dl:1.5}],['under_hi',{sig:0.4,f0:3.6,mode:'under'}],['cos_under',{wave:'cos',sig:0.6,f0:1}],['cos_crit',{wave:'cos',sig:2}],['cos_over',{wave:'cos',sig:2.5,dl:1.5}]];
  const rel=(a,b)=>cabs(csub(a,b))/Math.max(1e-12,cabs(b));
  for(const [m,ps] of cases){Object.assign(S,DEF,{mode:m.replace('_hi','').replace('cos_','')},ps);const d=D();
    // 1) DTFT: Poisson sum (1/T)ΣX(j(ω−2πk/T)) + A/2  vs closed-form X(z) on |z|=1  vs direct Σx[n]e^{−jωnT}
    const w=TAU*0.37*S.fs;let sm=C(0);for(let k=-40000;k<=40000;k++)sm=cadd(sm,Xjw(w-TAU*k*S.fs,d));
    const poisson=cadd(cscale(sm,1/d.T),C(S.A/2)),closed=Xz(cexpj(w*d.T),d);let direct=C(0);for(let n=0;n<6000;n++)direct=cadd(direct,cscale(cexpj(-w*n*d.T),xt(n*d.T,d)));
    // 2) Laplace: Simpson ∫0^60 x(t)e^{−st}dt vs X(s) at s = 0.7 + 2.1j
    const sv=C(0.7,2.1),h=2e-3,Nn=30000;let L=C(0);for(let n=0;n<=Nn;n++){const t=n*h,wgt=(n===0||n===Nn)?1:(n%2?4:2);L=cadd(L,cscale(cmul(C(xt(t,d)),cscale(cexpj(-sv.im*t),Math.exp(-sv.re*t))),wgt*h/3));}
    // 3) Z: direct Σ x[n] z^{−n} at z = 1.3 e^{j0.7}
    const zv=cscale(cexpj(0.7),1.3);let Zs=C(0),zp=C(1);for(let n=0;n<600;n++){Zs=cadd(Zs,cscale(cdiv(C(1),zp),xt(n*d.T,d)));zp=cmul(zp,zv);}
    // 4) z-poles = e^{sT}: X(z) blows up there; zero z1 makes X(z1) = 0
    const xz1=(d.rep&&Math.abs(d.zz.re-d.q1.re)<1e-12)?'cancels the pole':cabs(Xz(d.zz,d));
    // 5) initial conditions x(0)=A, x'(0)=0
    const e=1e-6,x0=xt(0,d),dx0=(xt(e,d)-x0)/e;
    out[m]={poisson_vs_closed:rel(poisson,closed),direct_vs_closed:rel(direct,closed),laplace_rel:rel(L,Xs(sv,d)),z_rel:rel(Zs,Xz(zv,d)),X_at_z1:xz1,x0,dx0:+dx0.toFixed(5),zeta:d.zeta,wn:d.wn};}
  S=save;schedule();return out;};
/* test + deep-link hooks */
const define=(k,get)=>Object.defineProperty(window,k,{get,configurable:true});
define('S',()=>S);define('MOD',()=>MOD);define('VIEWS',()=>VIEWS);define('TX',()=>TX);define('EX',()=>EX);
Object.assign(window,{D,closeModal,openModal,openPair,pick,render,setLegend,moreBadge,applyExample,renderStrip,layoutArrows,schedule,viewFor,DEF,exState,sameState});
const show=(q)=>{
  const preset=q&&q.get('preset'),pair=q&&q.get('pair');
  if(preset&&EX.some(e=>e.id===preset))applyExample(preset);
  if(pair&&TX[pair]){pick(pair);openPair(pair);}
  else if(!pair&&MOD.k&&q&&q.get('view')==='board')closeModal();
  layoutArrows();schedule();
};
show(params);
return {show,hide(){}};
}
