/* eslint-disable */
// Procedural food illustrations (canvas). Browser-only: import dynamically inside effects.
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function blob(c,x,y,r,R,n=10,sq=1){
  const pts=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,rr=r*(.72+R()*.5);pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr*sq])}
  c.beginPath();for(let i=0;i<=n;i++){const p=pts[i%n],q=pts[(i+1)%n],mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2;i===0?c.moveTo(mx,my):c.quadraticCurveTo(p[0],p[1],mx,my)}c.closePath();
}
function radial(c,x,y,r,stops){const g=c.createRadialGradient(x-r*.35,y-r*.4,r*.05,x,y,r);stops.forEach(([o,col])=>g.addColorStop(o,col));return g}
function gloss(c,x,y,r,a=.35){c.save();c.globalAlpha=a;c.fillStyle='#fff';c.beginPath();c.ellipse(x-r*.3,y-r*.35,r*.28,r*.14,-.6,0,7);c.fill();c.restore()}
function shadowed(c,blur,oy,fn,col='rgba(0,0,0,.6)'){c.save();c.shadowColor=col;c.shadowBlur=blur;c.shadowOffsetY=oy;fn();c.restore()}

function lagan(c,cx,cy,R,rand,wellK=.8){
  shadowed(c,R*.16,R*.06,()=>{c.fillStyle='#1B3576';c.beginPath();c.arc(cx,cy,R,0,7);c.fill()},'rgba(0,0,0,.75)');
  // rim cobalt glaze
  let g=c.createRadialGradient(cx-R*.3,cy-R*.3,R*.2,cx,cy,R);g.addColorStop(0,'#3A62BE');g.addColorStop(1,'#1A3375');
  c.fillStyle=g;c.beginPath();c.arc(cx,cy,R,0,7);c.fill();
  // Rishtan pattern: petals + turquoise seeds
  const pr=R*(wellK+1)/2,N=28;
  for(let i=0;i<N;i++){const a=i/N*Math.PI*2;c.save();c.translate(cx+Math.cos(a)*pr,cy+Math.sin(a)*pr);c.rotate(a);
    c.fillStyle='#EEF2F6';c.beginPath();c.ellipse(0,0,R*(1-wellK)*.36,R*.028,0,0,7);c.fill();
    c.fillStyle='#2E9DAF';c.beginPath();c.arc(0,0,R*.011,0,7);c.fill();c.restore();
    const b=a+Math.PI/N;c.fillStyle='#C9D7EE';c.beginPath();c.arc(cx+Math.cos(b)*pr,cy+Math.sin(b)*pr,R*.008,0,7);c.fill()}
  c.strokeStyle='rgba(230,236,246,.7)';c.lineWidth=R*.006;
  [wellK+.012,.985].forEach(k=>{c.beginPath();c.arc(cx,cy,R*k,0,7);c.stroke()});
  // well
  g=c.createRadialGradient(cx-R*.15,cy-R*.2,R*.05,cx,cy,R*wellK);g.addColorStop(0,'#F4EEE2');g.addColorStop(.85,'#E2D7C4');g.addColorStop(1,'#B9AD98');
  c.fillStyle=g;c.beginPath();c.arc(cx,cy,R*wellK,0,7);c.fill();
  c.strokeStyle='rgba(44,78,158,.35)';c.lineWidth=R*.01;c.beginPath();c.arc(cx,cy,R*wellK*.62,0,7);c.stroke();
  // rim gloss
  c.save();c.globalAlpha=.18;c.strokeStyle='#fff';c.lineWidth=R*.05;c.beginPath();c.arc(cx,cy,R*.9,Math.PI*1.05,Math.PI*1.45);c.stroke();c.restore();
}

function drawPlov(c,W,H){
  const R=rng(7),cx=W/2,cy=H/2,P=W*.46,m=P*.72;
  lagan(c,cx,cy,P,R);
  // mound base with soft shadow
  shadowed(c,P*.06,P*.02,()=>{c.fillStyle=radial(c,cx,cy,m,[[0,'#E1A64E'],[.7,'#C2822F'],[1,'#9B6224']]);blob(c,cx,cy,m*.98,()=>.55+R()*.15,24);c.fill()},'rgba(60,30,5,.55)');
  const grains=(n,warm)=>{for(let i=0;i<n;i++){const a=R()*Math.PI*2,rr=Math.sqrt(R())*m*.97,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
      const h=1-rr/m;const L=P*(.024+R()*.008),Wd=P*.0085;const tones=warm?['#E9B356','#DDA043','#F0C574','#D18F38']:['#F3D79A','#EAC277','#F6E2B4','#E2B062'];
      c.save();c.translate(x,y);c.rotate(R()*Math.PI);c.globalAlpha=.75+h*.25;c.fillStyle=tones[(R()*tones.length)|0];
      c.beginPath();c.ellipse(0,0,L,Wd,0,0,7);c.fill();c.globalAlpha=.55*h+.1;c.fillStyle='#FFF4D8';c.beginPath();c.ellipse(-L*.2,-Wd*.3,L*.5,Wd*.32,0,0,7);c.fill();c.restore()}};
  const carrots=n=>{for(let i=0;i<n;i++){const a=R()*Math.PI*2,rr=Math.sqrt(R())*m*.92,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,L=P*(.05+R()*.05),Wd=P*.012;
      c.save();c.translate(x,y);c.rotate(R()*Math.PI);const yellow=R()<.35;c.fillStyle=yellow?'#F0A93A':(R()<.5?'#E46A1C':'#EF8228');
      c.beginPath();c.roundRect(-L/2,-Wd/2,L,Wd,Wd/2);c.fill();c.fillStyle='rgba(255,220,170,.5)';c.fillRect(-L/2+Wd*.5,-Wd*.35,L-Wd,Wd*.22);c.restore()}};
  grains(2200,true);carrots(170);grains(1300,false);carrots(70);
  // chickpeas & raisins
  for(let i=0;i<42;i++){const a=R()*7,rr=Math.sqrt(R())*m*.85,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.019;
    shadowed(c,r*.8,r*.3,()=>{c.fillStyle=radial(c,x,y,r,[[0,'#F4DDA6'],[1,'#B98B47']]);c.beginPath();c.arc(x,y,r,0,7);c.fill()},'rgba(60,30,5,.5)');
    c.strokeStyle='rgba(120,80,30,.4)';c.lineWidth=r*.12;c.beginPath();c.arc(x+r*.2,y-r*.1,r*.55,1.8,3.4);c.stroke()}
  for(let i=0;i<34;i++){const a=R()*7,rr=Math.sqrt(R())*m*.88,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
    c.fillStyle=R()<.5?'#3B1712':'#5A2A1A';blob(c,x,y,P*.012,R,7,.7);c.fill();c.fillStyle='rgba(255,200,170,.35)';c.beginPath();c.arc(x-P*.004,y-P*.004,P*.003,0,7);c.fill()}
  // lamb slices around center
  const meat=[];for(let i=0;i<14;i++){const a=i/14*Math.PI*2+R()*.35,rr=m*(.2+R()*.2);meat.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*(.085+R()*.03)])}
  for(let i=0;i<5;i++){const a=R()*7,rr=m*R()*.12;meat.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*(.09+R()*.02)])}
  meat.forEach(([x,y,r])=>{const sd=(R()*1e9)|0;
    shadowed(c,r*.5,r*.25,()=>{c.fillStyle=radial(c,x,y,r,[[0,'#9A4F28'],[.6,'#6E3218'],[1,'#3D190B']]);blob(c,x,y,r,rng(sd),9,.78);c.fill()},'rgba(30,12,2,.7)');
    c.save();blob(c,x,y,r,rng(sd),9,.78);c.clip();
    c.fillStyle='rgba(218,170,110,.35)';c.beginPath();c.ellipse(x+r*.75,y+r*.15,r*.2,r*.9,.4,0,7);c.fill();
    c.strokeStyle='rgba(30,10,2,.22)';c.lineWidth=r*.03;for(let k=0;k<7;k++){c.beginPath();c.moveTo(x-r,y-r+k*r*.3);c.quadraticCurveTo(x,y-r*.85+k*r*.3+r*.1,x+r,y-r*1.1+k*r*.3);c.stroke()}
    c.fillStyle='rgba(170,90,40,.35)';blob(c,x-r*.2,y-r*.15,r*.45,R,7,.7);c.fill();
    c.restore();gloss(c,x,y,r,.32)});
  // quail egg halves
  [[.55,-.4],[-.6,.25],[.15,.62],[-.2,-.62]].forEach(([dx,dy])=>{const x=cx+dx*m,y=cy+dy*m,r=P*.045;
    shadowed(c,r*.6,r*.25,()=>{c.fillStyle='#FBF7EE';c.beginPath();c.ellipse(x,y,r,r*.78,dx,0,7);c.fill()},'rgba(60,30,5,.5)');
    c.fillStyle=radial(c,x,y,r*.5,[[0,'#FFD36A'],[1,'#E59A1E']]);c.beginPath();c.arc(x,y,r*.46,0,7);c.fill();gloss(c,x,y,r,.4)});
  // garlic head crown
  const gx=cx-m*.02,gy=cy+m*.02,gr=P*.075;
  shadowed(c,gr*.6,gr*.3,()=>{c.fillStyle='#E9DCC2';c.beginPath();c.arc(gx,gy,gr,0,7);c.fill()},'rgba(40,20,5,.6)');
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=gx+Math.cos(a)*gr*.55,y=gy+Math.sin(a)*gr*.55;c.fillStyle=radial(c,x,y,gr*.42,[[0,'#F6EEDD'],[1,'#C9B48C']]);c.beginPath();c.ellipse(x,y,gr*.42,gr*.3,a,0,7);c.fill();c.strokeStyle='rgba(150,120,70,.5)';c.lineWidth=1;c.stroke()}
  c.fillStyle='#8C6A3A';c.beginPath();c.arc(gx,gy,gr*.18,0,7);c.fill();
  // warm key light + edge falloff
  let g=c.createRadialGradient(cx-P*.35,cy-P*.4,0,cx-P*.35,cy-P*.4,P*1.3);g.addColorStop(0,'rgba(255,214,150,.22)');g.addColorStop(1,'rgba(255,214,150,0)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,P,0,7);c.fill();
  g=c.createRadialGradient(cx,cy,m*.6,cx,cy,m*1.02);g.addColorStop(0,'rgba(50,25,5,0)');g.addColorStop(1,'rgba(50,25,5,.35)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,m,0,7);c.fill();
}

function board(c,W,H,R,tone){
  c.fillStyle='#120C08';c.fillRect(0,0,W,H);
  const x=W*.06,y=H*.08,w=W*.88,h=H*.84;
  shadowed(c,W*.05,W*.02,()=>{c.fillStyle=tone[0];c.beginPath();c.roundRect(x,y,w,h,W*.04);c.fill()},'rgba(0,0,0,.8)');
  c.save();c.beginPath();c.roundRect(x,y,w,h,W*.04);c.clip();
  const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,tone[1]);g.addColorStop(1,tone[2]);c.fillStyle=g;c.fillRect(x,y,w,h);
  for(let i=0;i<70;i++){c.strokeStyle=`rgba(0,0,0,${.05+R()*.1})`;c.lineWidth=1+R()*2;const yy=y+R()*h;c.beginPath();c.moveTo(x,yy);c.bezierCurveTo(x+w*.3,yy+(R()-.5)*30,x+w*.7,yy+(R()-.5)*30,x+w,yy+(R()-.5)*20);c.stroke()}
  c.restore();
  const v=c.createRadialGradient(W*.35,H*.3,W*.1,W/2,H/2,W*.75);v.addColorStop(0,'rgba(255,200,130,.12)');v.addColorStop(1,'rgba(0,0,0,.45)');c.fillStyle=v;c.fillRect(0,0,W,H);
}

function drawSomsa(c,W,H){
  const R=rng(21);board(c,W,H,R,['#5A3A22','#7A5132','#4A2E1A']);
  const tri=(x,y,s,rot)=>{c.save();c.translate(x,y);c.rotate(rot);
    const path=()=>{c.beginPath();const p=[[0,-s],[s*.92,s*.62],[-s*.92,s*.62]];for(let i=0;i<3;i++){const a=p[i],b=p[(i+1)%3],d=p[(i+2)%3];const m1=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(!i)c.moveTo((d[0]+a[0])/2,(d[1]+a[1])/2);c.quadraticCurveTo(a[0],a[1],m1[0],m1[1])}c.closePath()};
    shadowed(c,s*.25,s*.12,()=>{c.fillStyle='#8F4E1C';path();c.fill()},'rgba(0,0,0,.7)');
    const g=c.createRadialGradient(-s*.2,-s*.15,s*.1,0,s*.1,s*1.1);g.addColorStop(0,'#F4CB7A');g.addColorStop(.5,'#DC9A45');g.addColorStop(1,'#93501C');c.fillStyle=g;path();c.fill();
    c.save();path();c.clip();
    for(let i=0;i<9;i++){c.strokeStyle=`rgba(120,60,15,${.25+R()*.2})`;c.lineWidth=s*.02;c.beginPath();c.arc(0,s*1.4,s*(.9+i*.12),Math.PI*1.25,Math.PI*1.75);c.stroke()}
    for(let i=0;i<14;i++){c.fillStyle='rgba(90,40,10,.35)';blob(c,(R()-.5)*s*1.4,(R()-.2)*s*1.1,s*.07,R,6);c.fill()}
    for(let i=0;i<55;i++){const sx=(R()-.5)*s*1.3,sy=(R()-.35)*s*1.2;c.save();c.translate(sx,sy);c.rotate(R()*3);c.fillStyle=R()<.25?'#1E140E':'#F6E7C4';c.beginPath();c.ellipse(0,0,s*.028,s*.014,0,0,7);c.fill();c.restore()}
    c.restore();gloss(c,-s*.05,-s*.1,s*.5,.08);c.restore()};
  tri(W*.32,H*.36,W*.2,-.25);tri(W*.69,H*.4,W*.19,.35);tri(W*.5,H*.7,W*.21,.05);
  for(let i=0;i<22;i++){const x=W*(.15+R()*.7),y=H*(.15+R()*.75);c.strokeStyle='#4E7A2E';c.lineWidth=W*.004;c.beginPath();c.moveTo(x,y);for(let k=0;k<4;k++)c.lineTo(x+(R()-.5)*W*.03,y+(R()-.5)*W*.03);c.stroke()}
}

function drawShashlik(c,W,H){
  const R=rng(33);board(c,W,H,R,['#2A2420','#3A322C','#1E1916']);
  for(let i=0;i<18;i++){const x=W*(.12+R()*.76),y=H*(.12+R()*.76),r=W*(.018+R()*.02);c.strokeStyle='rgba(240,228,236,.85)';c.lineWidth=W*.007;c.beginPath();c.ellipse(x,y,r,r*.8,R()*3,0,7);c.stroke();c.strokeStyle='rgba(150,60,130,.35)';c.lineWidth=W*.002;c.beginPath();c.ellipse(x,y,r*1.08,r*.86,R()*3,0,7);c.stroke()}
  const skewer=(y,rot)=>{c.save();c.translate(W/2,y);c.rotate(rot);
    c.strokeStyle='#C9CDD2';c.lineWidth=W*.01;c.beginPath();c.moveTo(-W*.46,0);c.lineTo(W*.44,0);c.stroke();
    c.fillStyle='#8E9399';c.beginPath();c.roundRect(-W*.5,-W*.012,W*.06,W*.024,4);c.fill();
    for(let k=0;k<6;k++){const x=-W*.33+k*W*.135,fat=k===2||k===4,r=fat?W*.042:W*.07;
      const sd=(R()*1e9)|0;shadowed(c,r*.5,r*.3,()=>{c.fillStyle=fat?radial(c,x,0,r,[[0,'#F1DDB8'],[1,'#B98A4E']]):radial(c,x,0,r,[[0,'#A3542A'],[.55,'#6A2D14'],[1,'#2E1207']]);blob(c,x,0,r,rng(sd),9,.85);c.fill()},'rgba(0,0,0,.75)');
      if(!fat){c.save();blob(c,x,0,r,rng(sd),9,.85);c.clip();c.fillStyle='rgba(190,95,45,.35)';blob(c,x-r*.25,-r*.2,r*.5,R,7);c.fill();for(let j=0;j<5;j++){c.strokeStyle=`rgba(12,4,0,${.25+R()*.25})`;c.lineWidth=r*.12;c.lineCap='round';const yy=(R()-.5)*r*1.2;c.beginPath();c.moveTo(x-r*.7,yy-r*.3);c.lineTo(x+r*.6,yy+r*.2);c.stroke()}c.restore();gloss(c,x,0,r,.28)}}
    c.restore()};
  skewer(H*.3,-.12);skewer(H*.52,-.06);skewer(H*.74,-.1);
  for(let i=0;i<200;i++){c.fillStyle=R()<.7?'rgba(140,25,30,.75)':'rgba(70,120,40,.8)';c.beginPath();c.arc(W*(.1+R()*.8),H*(.1+R()*.8),W*.0035,0,7);c.fill()}
}

function drawLagmon(c,W,H){
  const R=rng(44);
  const cx=W/2,cy=H/2,P=W*.45;lagan(c,cx,cy,P,R,.76);
  const b=P*.72;
  c.fillStyle=radial(c,cx,cy,b,[[0,'#D9673A'],[.7,'#B0401E'],[1,'#7C2812']]);c.beginPath();c.arc(cx,cy,b,0,7);c.fill();
  for(let i=0;i<70;i++){const a=R()*7,rr=Math.sqrt(R())*b*.95;c.fillStyle='rgba(255,170,70,.35)';c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*(.006+R()*.014),0,7);c.fill()}
  c.save();c.beginPath();c.arc(cx,cy,b*.98,0,7);c.clip();
  for(let i=0;i<70;i++){const a0=R()*7,r0=b*(.15+R()*.8),sw=1.2+R()*2;
    c.lineCap='round';c.strokeStyle='rgba(120,70,20,.55)';c.lineWidth=P*.034;c.beginPath();c.arc(cx+(R()-.5)*b*.25,cy+(R()-.5)*b*.25,r0,a0,a0+sw);c.stroke();
    c.strokeStyle=R()<.5?'#EED596':'#E4C47A';c.lineWidth=P*.026;c.beginPath();c.arc(cx+(R()-.5)*b*.25,cy+(R()-.5)*b*.25,r0,a0,a0+sw);c.stroke()}
  c.restore();
  // vaja topping
  const top=b*.45;
  for(let i=0;i<34;i++){const a=R()*7,rr=Math.sqrt(R())*top,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;c.save();c.translate(x,y);c.rotate(R()*3);
    const t=R();c.fillStyle=t<.4?'#C8281F':t<.7?'#4E8F2C':'#E8A23A';c.beginPath();c.roundRect(-P*.05,-P*.011,P*.1,P*.022,P*.01);c.fill();c.restore()}
  for(let i=0;i<16;i++){const a=R()*7,rr=Math.sqrt(R())*top*.9,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.04;
    shadowed(c,r*.4,r*.2,()=>{c.fillStyle=radial(c,x,y,r,[[0,'#8E4524'],[1,'#3E180A']]);blob(c,x,y,r,R,8,.8);c.fill()},'rgba(0,0,0,.6)');gloss(c,x,y,r,.3)}
  for(let i=0;i<40;i++){c.fillStyle='#3F7E2A';const a=R()*7,rr=Math.sqrt(R())*b*.7;c.beginPath();c.ellipse(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.012,P*.006,R()*3,0,7);c.fill()}
  const g=c.createRadialGradient(cx-P*.35,cy-P*.4,0,cx-P*.35,cy-P*.4,P*1.3);g.addColorStop(0,'rgba(255,214,150,.18)');g.addColorStop(1,'rgba(255,214,150,0)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,P,0,7);c.fill();
}

function drawNon(c,W,H){
  const R=rng(55);
  const cx=W/2,cy=H/2,r=W*.4;
  shadowed(c,r*.15,r*.05,()=>{c.fillStyle='#7A4018';c.beginPath();c.arc(cx,cy,r,0,7);c.fill()},'rgba(0,0,0,.8)');
  c.fillStyle=radial(c,cx,cy,r,[[0,'#E8A85A'],[.6,'#C47A33'],[1,'#7C3F16']]);c.beginPath();c.arc(cx,cy,r,0,7);c.fill();
  for(let i=0;i<40;i++){const a=R()*7,rr=r*(.62+R()*.33);c.fillStyle=`rgba(70,25,5,${.15+R()*.25})`;blob(c,cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,r*(.03+R()*.05),R,7);c.fill()}
  const ir=r*.56;
  c.fillStyle=radial(c,cx,cy,ir,[[0,'#F0CF95'],[1,'#D5A25E']]);c.beginPath();c.arc(cx,cy,ir,0,7);c.fill();
  c.strokeStyle='rgba(90,40,10,.4)';c.lineWidth=r*.02;c.beginPath();c.arc(cx,cy,ir,0,7);c.stroke();
  for(let ring=1;ring<=5;ring++){const rr=ir*ring/5.6,n=ring*9;for(let k=0;k<n;k++){const a=k/n*Math.PI*2+ring;c.fillStyle='rgba(120,60,20,.6)';c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,r*.011,0,7);c.fill()}}
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2;c.fillStyle='rgba(120,60,20,.55)';c.beginPath();c.ellipse(cx+Math.cos(a)*ir*.1,cy+Math.sin(a)*ir*.1,r*.05,r*.015,a,0,7);c.fill()}
  for(let i=0;i<260;i++){const a=R()*7,rr=r*(.6+R()*.36);c.save();c.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.rotate(R()*3);c.fillStyle=R()<.45?'#1A120D':'#F7EACB';c.beginPath();c.ellipse(0,0,r*.014,r*.007,0,0,7);c.fill();c.restore()}
  c.save();c.globalAlpha=.25;c.strokeStyle='#fff';c.lineWidth=r*.05;c.beginPath();c.arc(cx,cy,r*.8,Math.PI*1.1,Math.PI*1.45);c.stroke();c.restore();
}


/* ---------- additional dishes ---------- */
function drawManti(c,W,H){
  const R=rng(61),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);
  const one=(x,y,s,rot)=>{c.save();c.translate(x,y);c.rotate(rot);
    shadowed(c,s*.35,s*.15,()=>{c.fillStyle=radial(c,0,0,s,[[0,'#FBF5EA'],[.7,'#E9DCC4'],[1,'#C6B391']]);blob(c,0,0,s,rng(Math.round(s*7+x)),12,.92);c.fill()},'rgba(40,20,5,.55)');
    for(let i=0;i<5;i++){c.fillStyle='rgba(150,85,50,.18)';blob(c,(R()-.5)*s*.9,(R()-.5)*s*.9,s*.28,R,7);c.fill()}
    c.strokeStyle='rgba(150,125,90,.55)';c.lineWidth=s*.035;c.lineCap='round';
    for(let i=0;i<9;i++){const a=i/9*Math.PI*2;c.beginPath();c.moveTo(Math.cos(a)*s*.82,Math.sin(a)*s*.78);c.quadraticCurveTo(Math.cos(a+.35)*s*.35,Math.sin(a+.35)*s*.35,0,0);c.stroke()}
    c.fillStyle='#E4D3B3';c.beginPath();c.arc(0,0,s*.12,0,7);c.fill();gloss(c,0,0,s,.35);c.restore()};
  [[0,0],[-.42,-.3],[.42,-.28],[-.38,.36],[.4,.36]].forEach(([dx,dy],i)=>one(cx+dx*P*.95,cy+dy*P*.95,P*.24,i));
  for(let i=0;i<140;i++){const a=R()*7,rr=Math.sqrt(R())*P*.75;c.fillStyle=R()<.6?'rgba(180,30,25,.75)':'#3F7E2A';c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.006,0,7);c.fill()}
}
function drawShurva(c,W,H){
  const R=rng(72),cx=W/2,cy=H/2,P=W*.45;lagan(c,cx,cy,P,R,.76);const b=P*.72;
  c.fillStyle=radial(c,cx,cy,b,[[0,'#E2B25E'],[.7,'#B97F33'],[1,'#7D4F1C']]);c.beginPath();c.arc(cx,cy,b,0,7);c.fill();
  for(let i=0;i<90;i++){const a=R()*7,rr=Math.sqrt(R())*b*.95;c.strokeStyle='rgba(255,215,130,.45)';c.lineWidth=P*.004;c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*(.008+R()*.02),0,7);c.stroke()}
  const chunk=(x,y,r,cols,sq)=>{const sd=(R()*1e9)|0;shadowed(c,r*.4,r*.2,()=>{c.fillStyle=radial(c,x,y,r,cols);blob(c,x,y,r,rng(sd),9,sq);c.fill()},'rgba(50,25,5,.55)');gloss(c,x,y,r,.25)};
  chunk(cx-b*.2,cy-b*.1,P*.17,[[0,'#9A5530'],[1,'#432010']],.8);
  c.fillStyle='#F2E8D6';c.beginPath();c.ellipse(cx-b*.05,cy-b*.25,P*.09,P*.035,-.5,0,7);c.fill();
  chunk(cx+b*.32,cy+b*.12,P*.13,[[0,'#F4DFA2'],[1,'#C9A458']],.9);
  chunk(cx-b*.35,cy+b*.35,P*.12,[[0,'#F4DFA2'],[1,'#C9A458']],.85);
  chunk(cx+b*.2,cy-b*.42,P*.09,[[0,'#F59A3F'],[1,'#C25B16']],.95);
  chunk(cx+b*.05,cy+b*.45,P*.085,[[0,'#F59A3F'],[1,'#C25B16']],.95);
  chunk(cx+b*.5,cy-b*.15,P*.08,[[0,'#7FB04E'],[1,'#3D6B22']],.8);
  for(let i=0;i<18;i++){const a=R()*7,rr=Math.sqrt(R())*b*.85,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.02;c.fillStyle=radial(c,x,y,r,[[0,'#F4DDA6'],[1,'#B98B47']]);c.beginPath();c.arc(x,y,r,0,7);c.fill()}
  for(let i=0;i<60;i++){c.fillStyle='#3F7E2A';const a=R()*7,rr=Math.sqrt(R())*b*.9;c.beginPath();c.ellipse(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.012,P*.006,R()*3,0,7);c.fill()}
}
function drawKazanDish(c,W,H){
  const R=rng(83),cx=W/2,cy=H/2,P=W*.46;kazanBase(c,cx,cy,P,.25);const b=P*.78;
  for(let i=0;i<14;i++){const a=R()*7,rr=Math.sqrt(R())*b*.8,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*(.1+R()*.04),sd=(R()*1e9)|0;
    shadowed(c,r*.4,r*.2,()=>{c.fillStyle=radial(c,x,y,r,[[0,'#F6CB6E'],[.6,'#D9932F'],[1,'#94551A']]);blob(c,x,y,r,rng(sd),9,.85);c.fill()},'rgba(0,0,0,.6)');gloss(c,x,y,r,.35)}
  for(let i=0;i<9;i++){const a=R()*7,rr=Math.sqrt(R())*b*.75,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.11,sd=(R()*1e9)|0;
    shadowed(c,r*.4,r*.2,()=>{c.fillStyle=radial(c,x,y,r,[[0,'#A0542A'],[1,'#3E180A']]);blob(c,x,y,r,rng(sd),9,.6);c.fill()},'rgba(0,0,0,.6)');
    c.fillStyle='#EFE5D1';c.beginPath();c.ellipse(x+r*.8,y,r*.22,r*.12,0,0,7);c.fill();gloss(c,x,y,r,.3)}
  for(let i=0;i<80;i++){c.strokeStyle='rgba(230,215,235,.8)';c.lineWidth=P*.004;const a=R()*7,rr=Math.sqrt(R())*b*.9;c.beginPath();c.ellipse(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.03,P*.024,R()*3,0,7);c.stroke()}
  for(let i=0;i<120;i++){c.fillStyle='#3F7E2A';const a=R()*7,rr=Math.sqrt(R())*b*.9;c.beginPath();c.ellipse(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.01,P*.005,R()*3,0,7);c.fill()}
}
function drawSalad(c,W,H){
  const R=rng(94),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);const b=P*.7;
  for(let i=0;i<26;i++){const a=R()*7,rr=Math.sqrt(R())*b*.85,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*(.1+R()*.03),rot=R()*7;
    c.save();c.translate(x,y);c.rotate(rot);
    shadowed(c,r*.3,r*.1,()=>{c.fillStyle='#C42B22';c.beginPath();c.arc(0,0,r,0,Math.PI);c.closePath();c.fill()},'rgba(60,10,5,.5)');
    c.fillStyle='#E0473B';c.beginPath();c.arc(0,0,r*.86,0,Math.PI);c.closePath();c.fill();
    c.fillStyle='rgba(255,170,150,.5)';for(let k=0;k<3;k++){c.beginPath();c.ellipse(-r*.5+k*r*.5,r*.35,r*.16,r*.24,0,0,7);c.fill()}
    c.fillStyle='#F2D27A';for(let k=0;k<7;k++){c.beginPath();c.ellipse(-r*.6+R()*r*1.2,r*(.2+R()*.4),r*.04,r*.025,R()*3,0,7);c.fill()}
    gloss(c,0,r*.3,r*.7,.25);c.restore()}
  for(let i=0;i<34;i++){const a=R()*7,rr=Math.sqrt(R())*b,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;c.strokeStyle='rgba(248,240,250,.92)';c.lineWidth=P*.009;c.beginPath();c.ellipse(x,y,P*.06,P*.022,R()*3,0,Math.PI*(1+R()));c.stroke()}
  for(let i=0;i<14;i++){const a=R()*7,rr=Math.sqrt(R())*b*.8;c.save();c.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.rotate(R()*7);c.fillStyle=R()<.5?'#3E7A26':'#4A1F3A';c.beginPath();c.ellipse(0,0,P*.04,P*.018,0,0,7);c.fill();c.restore()}
  for(let i=0;i<160;i++){c.fillStyle='rgba(20,15,10,.7)';const a=R()*7,rr=Math.sqrt(R())*b;c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.004,0,7);c.fill()}
}
function piyola(c,x,y,r,fill,R){
  shadowed(c,r*.3,r*.12,()=>{c.fillStyle='#F3F0EA';c.beginPath();c.arc(x,y,r,0,7);c.fill()},'rgba(0,0,0,.7)');
  c.strokeStyle='#2A4FA0';c.lineWidth=r*.08;c.beginPath();c.arc(x,y,r*.93,0,7);c.stroke();
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;c.fillStyle='#2A4FA0';c.beginPath();c.ellipse(x+Math.cos(a)*r*.82,y+Math.sin(a)*r*.82,r*.06,r*.025,a,0,7);c.fill()}
  c.fillStyle=fill;c.beginPath();c.arc(x,y,r*.72,0,7);c.fill();
  c.save();c.globalAlpha=.35;c.fillStyle='#fff';c.beginPath();c.ellipse(x-r*.25,y-r*.3,r*.22,r*.08,-.6,0,7);c.fill();c.restore();
}
function drawTea(c,W,H){
  const R=rng(105);board(c,W,H,R,['#4A2E1A','#5E3D24','#3A2414']);
  piyola(c,W*.38,H*.42,W*.16,radial(c,W*.38,H*.42,W*.12,[[0,'#C9A24E'],[1,'#7C5A1D']]),R);
  piyola(c,W*.68,H*.62,W*.12,radial(c,W*.68,H*.62,W*.09,[[0,'#C9A24E'],[1,'#7C5A1D']]),R);
  for(let i=0;i<9;i++){const x=W*(.22+R()*.25),y=H*(.66+R()*.16),s=W*(.025+R()*.02);c.fillStyle='rgba(245,220,160,.85)';c.beginPath();for(let k=0;k<6;k++){const a=k/6*Math.PI*2+R();c.lineTo(x+Math.cos(a)*s*(.7+R()*.5),y+Math.sin(a)*s*(.7+R()*.5))}c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.arc(x-s*.2,y-s*.2,s*.2,0,7);c.fill()}
  for(let i=0;i<7;i++){const x=W*(.6+R()*.25),y=H*(.22+R()*.18),s=W*.03;c.save();c.translate(x,y);c.rotate(R()*3);c.fillStyle=radial(c,0,0,s,[[0,'#D9A86A'],[1,'#8C5A2A']]);c.beginPath();c.ellipse(0,0,s,s*.55,0,0,7);c.fill();c.restore()}
}
function drawGlass(col){return function(c,W,H){
  const R=rng(116);board(c,W,H,R,['#2A2420','#3A322C','#1E1916']);const x=W/2,y=H/2,r=W*.24;
  shadowed(c,r*.4,r*.15,()=>{c.fillStyle='rgba(240,240,245,.18)';c.beginPath();c.arc(x,y,r,0,7);c.fill()},'rgba(0,0,0,.7)');
  c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=r*.05;c.beginPath();c.arc(x,y,r*.97,0,7);c.stroke();
  c.fillStyle=radial(c,x,y,r*.88,col);c.beginPath();c.arc(x,y,r*.88,0,7);c.fill();
  for(let i=0;i<30;i++){c.fillStyle='rgba(255,255,255,.18)';const a=R()*7,rr=Math.sqrt(R())*r*.8;c.beginPath();c.arc(x+Math.cos(a)*rr,y+Math.sin(a)*rr,r*(.01+R()*.03),0,7);c.fill()}
  c.save();c.globalAlpha=.3;c.strokeStyle='#fff';c.lineWidth=r*.06;c.beginPath();c.arc(x,y,r*.8,Math.PI*1.1,Math.PI*1.45);c.stroke();c.restore();
  c.fillStyle='#4E8F2C';for(let i=0;i<3;i++){c.save();c.translate(x+r*.3+i*r*.12,y-r*.3);c.rotate(i);c.beginPath();c.ellipse(0,0,r*.12,r*.05,0,0,7);c.fill();c.restore()}
}}
function drawChakchak(c,W,H){
  const R=rng(127),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);const b=P*.6;
  shadowed(c,P*.08,P*.03,()=>{c.fillStyle='#A8661E';c.beginPath();c.arc(cx,cy,b,0,7);c.fill()},'rgba(60,30,5,.6)');
  for(let i=0;i<520;i++){const a=R()*7,rr=Math.sqrt(R())*b,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*(.016+R()*.012),h=1-rr/b;
    c.fillStyle=radial(c,x,y,r,[[0,`hsl(${36+h*8},80%,${58+h*14}%)`],[1,'#9A5A16']]);c.beginPath();c.ellipse(x,y,r*1.4,r,R()*3,0,7);c.fill()}
  c.save();c.globalAlpha=.4;for(let i=0;i<80;i++){const a=R()*7,rr=Math.sqrt(R())*b;c.fillStyle='#FFE7A8';c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.006,0,7);c.fill()}c.restore();
  for(let i=0;i<24;i++){const a=R()*7,rr=Math.sqrt(R())*b*.9;c.save();c.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.rotate(R()*3);c.fillStyle='#E9DCC0';c.beginPath();c.ellipse(0,0,P*.025,P*.014,0,0,7);c.fill();c.restore()}
}
function drawSpices(c,W,H){
  const R=rng(138);board(c,W,H,R,['#2C221B','#3A2D23','#1F1813']);
  const mound=(x,y,r,cols,dots)=>{shadowed(c,r*.3,r*.15,()=>{c.fillStyle=radial(c,x,y,r,cols);blob(c,x,y,r,R,14,.9);c.fill()},'rgba(0,0,0,.6)');
    for(let i=0;i<dots[0];i++){const a=R()*7,rr=Math.sqrt(R())*r*.9;c.fillStyle=dots[1][(R()*dots[1].length)|0];c.save();c.translate(x+Math.cos(a)*rr,y+Math.sin(a)*rr);c.rotate(R()*3);c.beginPath();c.ellipse(0,0,r*dots[2],r*dots[2]*.45,0,0,7);c.fill();c.restore()}};
  mound(W*.3,H*.32,W*.15,[[0,'#9C7A4A'],[1,'#5E4426']],[500,['#8C6A3C','#6E5130','#A8875A'],.05]);
  mound(W*.68,H*.3,W*.13,[[0,'#E04A2C'],[1,'#8E1F12']],[200,['#F06040','#B02A18'],.025]);
  mound(W*.5,H*.62,W*.14,[[0,'#C42A35'],[1,'#6E1018']],[80,['#E0404A','#9A1A24'],.1]);
  mound(W*.24,H*.72,W*.1,[[0,'#F1E4C2'],[1,'#BCA87A']],[300,['#F6EBD0','#D9C79E'],.07]);
  mound(W*.78,H*.7,W*.1,[[0,'#2A2420'],[1,'#0E0B09']],[260,['#1A1512','#3A332E'],.06]);
}
let SPOOL=null;
function drawDastarkhan(c,W,H){
  c.fillStyle='#1B3B32';c.fillRect(0,0,W,H);
  c.save();c.globalAlpha=.12;c.strokeStyle='#E3A43E';c.lineWidth=W*.002;
  for(let i=0;i<9;i++)for(let j=0;j<9;j++){const x=i*W/8,y=j*H/8;c.beginPath();c.arc(x,y,W*.05,0,7);c.stroke();c.beginPath();c.arc(x,y,W*.025,0,7);c.stroke()}c.restore();
  const put=(fn,x,y,s)=>{SPOOL=SPOOL||document.createElement('canvas');SPOOL.width=SPOOL.height=Math.round(s);const k=SPOOL.getContext('2d');k.clearRect(0,0,s,s);fn(k,s,s);c.drawImage(SPOOL,x-s/2,y-s/2)};
  put(drawPlov,W*.5,H*.5,W*.55);put(drawSalad,W*.13,H*.2,W*.3);put(drawShurva,W*.86,H*.22,W*.3);put(drawManti,W*.15,H*.82,W*.3);put(drawNon,W*.87,H*.8,W*.32);
}

/* ---------- kazan & live sequence ---------- */
function kazanBase(c,cx,cy,P,heat){
  shadowed(c,P*.18,P*.05,()=>{c.fillStyle='#141210';c.beginPath();c.arc(cx,cy,P,0,7);c.fill()},'rgba(0,0,0,.85)');
  let g=c.createRadialGradient(cx-P*.3,cy-P*.3,P*.1,cx,cy,P);g.addColorStop(0,'#3A3532');g.addColorStop(1,'#121010');c.fillStyle=g;c.beginPath();c.arc(cx,cy,P,0,7);c.fill();
  c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=P*.02;c.beginPath();c.arc(cx,cy,P*.95,Math.PI*1.05,Math.PI*1.5);c.stroke();
  // handles
  [[-1,0],[1,0]].forEach(([s])=>{c.fillStyle='#1E1B19';c.beginPath();c.ellipse(cx+s*P*1.02,cy,P*.06,P*.16,0,0,7);c.fill()});
  g=c.createRadialGradient(cx,cy,P*.05,cx,cy,P*.86);g.addColorStop(0,`rgba(${90+heat*120},${50+heat*40},20,1)`);g.addColorStop(.7,`rgba(${40+heat*50},${28+heat*12},14,1)`);g.addColorStop(1,'#0B0A09');
  c.fillStyle=g;c.beginPath();c.arc(cx,cy,P*.86,0,7);c.fill();
  if(heat>0){c.save();c.globalAlpha=heat*.5;g=c.createRadialGradient(cx,cy,0,cx,cy,P*.7);g.addColorStop(0,'rgba(255,170,60,.55)');g.addColorStop(1,'rgba(255,120,30,0)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,P*.86,0,7);c.fill();c.restore()}
}
const LIVE={layers:null,W:0};
function liveLayers(W,H){
  const mk=()=>{const k=document.createElement('canvas');k.width=W;k.height=H;return k};
  const cx=W/2,cy=H/2,P=W*.44,m=P*.8,R=rng(201);
  const meat=[],onion=[],carrot=[];
  for(let i=0;i<16;i++){const a=R()*7,rr=Math.sqrt(R())*m*.8;meat.push({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr,r:P*(.06+R()*.03),sd:(R()*1e9)|0,d:R()})}
  for(let i=0;i<40;i++){const a=R()*7,rr=Math.sqrt(R())*m*.85;onion.push({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr,r:P*(.03+R()*.03),rot:R()*3,d:R()})}
  for(let i=0;i<230;i++){const a=R()*7,rr=Math.sqrt(R())*m*.9;carrot.push({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr,L:P*(.06+R()*.06),rot:R()*Math.PI,col:R()<.4?'#F0A93A':(R()<.5?'#E46A1C':'#EF8228'),d:R()})}
  const rice=mk();const rc=rice.getContext('2d');
  rc.fillStyle=radial(rc,cx,cy,m,[[0,'#E1A64E'],[.7,'#C2822F'],[1,'#9B6224']]);rc.beginPath();rc.arc(cx,cy,m,0,7);rc.fill();
  const tones=['#F3D79A','#EAC277','#F6E2B4','#E2B062','#E9B356'];
  const n=W>900?4200:2600;
  for(let i=0;i<n;i++){const a=R()*7,rr=Math.sqrt(R())*m*.98,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,L=P*(.022+R()*.008),Wd=P*.008;
    rc.save();rc.translate(x,y);rc.rotate(R()*Math.PI);rc.fillStyle=tones[(R()*5)|0];rc.beginPath();rc.ellipse(0,0,L,Wd,0,0,7);rc.fill();rc.fillStyle='rgba(255,246,220,.5)';rc.beginPath();rc.ellipse(-L*.2,-Wd*.3,L*.5,Wd*.3,0,0,7);rc.fill();rc.restore()}
  for(let i=0;i<70;i++){const a=R()*7,rr=Math.sqrt(R())*m*.9;rc.save();rc.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);rc.rotate(R()*3);rc.fillStyle='#E9792A';rc.beginPath();rc.roundRect(-P*.035,-P*.006,P*.07,P*.012,P*.006);rc.fill();rc.restore()}
  const top=mk();const tc=top.getContext('2d');const TR=rng(305);
  for(let i=0;i<12;i++){const a=i/12*7+TR()*.3,rr=m*(.15+TR()*.22),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*(.08+TR()*.025),sd=(TR()*1e9)|0;
    shadowed(tc,r*.5,r*.25,()=>{tc.fillStyle=radial(tc,x,y,r,[[0,'#9A4F28'],[.6,'#6E3218'],[1,'#3D190B']]);blob(tc,x,y,r,rng(sd),9,.78);tc.fill()},'rgba(30,12,2,.7)');gloss(tc,x,y,r,.3)}
  for(let i=0;i<30;i++){const a=TR()*7,rr=Math.sqrt(TR())*m*.85,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.018;tc.fillStyle=radial(tc,x,y,r,[[0,'#F4DDA6'],[1,'#B98B47']]);tc.beginPath();tc.arc(x,y,r,0,7);tc.fill()}
  [[.55,-.4],[-.6,.25],[.15,.62],[-.2,-.62]].forEach(([dx,dy])=>{const x=cx+dx*m,y=cy+dy*m,r=P*.045;tc.fillStyle='#FBF7EE';tc.beginPath();tc.ellipse(x,y,r,r*.78,dx,0,7);tc.fill();tc.fillStyle=radial(tc,x,y,r*.5,[[0,'#FFD36A'],[1,'#E59A1E']]);tc.beginPath();tc.arc(x,y,r*.46,0,7);tc.fill()});
  const gx=cx,gy=cy,gr=P*.075;tc.fillStyle='#E9DCC2';tc.beginPath();tc.arc(gx,gy,gr,0,7);tc.fill();
  for(let i=0;i<8;i++){const a=i/8*7,x=gx+Math.cos(a)*gr*.55,y=gy+Math.sin(a)*gr*.55;tc.fillStyle=radial(tc,x,y,gr*.42,[[0,'#F6EEDD'],[1,'#C9B48C']]);tc.beginPath();tc.ellipse(x,y,gr*.42,gr*.3,a,0,7);tc.fill()}
  LIVE.layers={meat,onion,carrot,rice,top,cx,cy,P,m};LIVE.W=W;
}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const seg=(p,a,b)=>clamp((p-a)/(b-a));
const ease=t=>1-Math.pow(1-t,3);
function drawLive(c,W,H,p){
  if(!LIVE.layers||LIVE.W!==W)liveLayers(W,H);
  const L=LIVE.layers,{cx,cy,P,m}=L;
  c.clearRect(0,0,W,H);
  const heat=ease(seg(p,0,.18));
  kazanBase(c,cx,cy,P,heat);
  // heat shimmer rings
  if(p<.3){c.save();c.globalAlpha=heat*.25*(1-seg(p,.2,.3));c.strokeStyle='#FFB54A';c.lineWidth=P*.004;for(let i=0;i<4;i++){c.beginPath();c.arc(cx,cy,P*(.2+i*.15+(p*3%0.15)),0,7);c.stroke()}c.restore()}
  const sm=seg(p,.18,.38),brown=seg(p,.38,.6);
  L.onion.forEach(o=>{const t=ease(seg(sm,o.d*.6,o.d*.6+.4));if(!t)return;c.save();c.globalAlpha=t;c.translate(o.x,o.y-(1-t)*P*.2);c.rotate(o.rot);
    c.strokeStyle=`rgb(${235-brown*70},${220-brown*110},${200-brown*150})`;c.lineWidth=P*.012;c.beginPath();c.ellipse(0,0,o.r,o.r*.7,0,0,Math.PI*1.4);c.stroke();c.restore()});
  L.meat.forEach(o=>{const t=ease(seg(sm,o.d*.6,o.d*.6+.4));if(!t)return;const s=.6+.4*t;c.save();c.globalAlpha=t;
    const r=o.r*s,y=o.y-(1-t)*P*.25;
    c.fillStyle=radial(c,o.x,y,r,[[0,`rgb(${200-brown*100},${80-brown*25},${70-brown*35})`],[1,`rgb(${120-brown*65},${40-brown*14},${35-brown*24})`]]);blob(c,o.x,y,r,rng(o.sd),9,.8);c.fill();gloss(c,o.x,y,r,.25);c.restore()});
  const cr=seg(p,.4,.6);
  L.carrot.forEach(o=>{const t=ease(seg(cr,o.d*.7,o.d*.7+.3));if(!t)return;c.save();c.globalAlpha=t;c.translate(o.x,o.y-(1-t)*P*.3);c.rotate(o.rot+(1-t)*1.2);
    c.fillStyle=o.col;c.beginPath();c.roundRect(-o.L/2,-P*.006,o.L,P*.012,P*.006);c.fill();c.restore()});
  // oil glow over zirvak
  if(sm>0){c.save();c.globalAlpha=.25*heat;const g=c.createRadialGradient(cx,cy,0,cx,cy,P*.8);g.addColorStop(0,'rgba(255,190,90,.4)');g.addColorStop(1,'rgba(255,190,90,0)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,P*.86,0,7);c.fill();c.restore()}
  const rf=ease(seg(p,.6,.82));
  if(rf>0){c.save();c.beginPath();const rr=m*1.02*rf;
    // rice spreads from the rim inward like a poured layer
    c.arc(cx,cy,m*1.02,0,7);if(rf<1){c.arc(cx,cy,Math.max(0,m*1.02-rr),0,7,true)}c.clip();c.globalAlpha=Math.min(1,rf*1.4);c.drawImage(L.rice,0,0);c.restore()}
  const fin=ease(seg(p,.84,1));
  if(fin>0){c.save();c.globalAlpha=fin;c.translate(0,-(1-fin)*P*.05);c.drawImage(L.top,0,0);c.restore();
    c.save();c.globalAlpha=fin*.9;const g=c.createRadialGradient(cx-P*.35,cy-P*.4,0,cx-P*.35,cy-P*.4,P*1.3);g.addColorStop(0,'rgba(255,214,150,.22)');g.addColorStop(1,'rgba(255,214,150,0)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,P,0,7);c.fill();c.restore()}
}

const ART={plov:drawPlov,somsa:drawSomsa,shashlik:drawShashlik,lagmon:drawLagmon,non:drawNon,manti:drawManti,shurva:drawShurva,kazan:drawKazanDish,salad:drawSalad,tea:drawTea,chakchak:drawChakchak,spices:drawSpices,dastarkhan:drawDastarkhan,
  'glass-mango':drawGlass([[0,'#FFC24D'],[1,'#E0821A']]),'glass-kompot':drawGlass([[0,'#B5333E'],[1,'#5E0F1A']]),'glass-ayron':drawGlass([[0,'#FBFAF4'],[1,'#DCD8CB']]),
  kazanlive:(c,W,H)=>drawLive(c,W,H,.95)};
const ART_LABELS={plov:'Плов',somsa:'Самса',shashlik:'Шашлык',lagmon:'Лагман',non:'Лепёшка',manti:'Манты',shurva:'Шурпа/суп',kazan:'Казан-кабоб',salad:'Салат',tea:'Чай',chakchak:'Чак-чак/сладкое','glass-mango':'Напиток манго','glass-kompot':'Компот','glass-ayron':'Айран/сюзьма',spices:'Специи'};

export { ART, ART_LABELS, drawLive, LIVE, clamp, seg, drawPlov };

/* ---------- brizol: meat patty wrapped in a thin egg crepe ---------- */
function drawBrizol(c,W,H){
  const R=rng(311),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);
  // garnish: fries + tomato
  for(let i=0;i<16;i++){const a=Math.PI*(.15+R()*.55),rr=P*(.45+R()*.2);c.save();c.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.rotate(R()*3);
    shadowed(c,P*.02,P*.01,()=>{c.fillStyle=radial(c,0,0,P*.06,[[0,'#F6D27A'],[1,'#D9962E']]);c.beginPath();c.roundRect(-P*.07,-P*.014,P*.14,P*.028,P*.01);c.fill()},'rgba(60,30,5,.4)');c.restore()}
  for(let i=0;i<3;i++){const a=Math.PI*(1.1+i*.18),x=cx+Math.cos(a)*P*.52,y=cy+Math.sin(a)*P*.52,r=P*.1;c.fillStyle='#C42B22';c.beginPath();c.arc(x,y,r,0,7);c.fill();c.fillStyle='#E0473B';c.beginPath();c.arc(x,y,r*.85,0,7);c.fill();c.fillStyle='rgba(255,190,160,.6)';for(let k=0;k<5;k++){const b=k/5*7;c.beginPath();c.ellipse(x+Math.cos(b)*r*.45,y+Math.sin(b)*r*.45,r*.18,r*.1,b,0,7);c.fill()}gloss(c,x,y,r,.3)}
  // brizol: folded egg crepe
  const bx=cx-P*.05,by=cy-P*.02,bw=P*.48,bh=P*.32;
  shadowed(c,P*.08,P*.03,()=>{c.fillStyle='#C98A2E';c.beginPath();c.ellipse(bx,by,bw,bh,-.25,0,7);c.fill()},'rgba(50,25,5,.6)');
  c.save();c.beginPath();c.ellipse(bx,by,bw,bh,-.25,0,7);c.clip();
  c.fillStyle=radial(c,bx,by,bw,[[0,'#F7D27A'],[.6,'#E9B24F'],[1,'#B9772A']]);c.fillRect(bx-bw,by-bh*2,bw*2,bh*4);
  for(let i=0;i<70;i++){c.fillStyle=`rgba(${120+R()*40},${60+R()*30},20,${.15+R()*.3})`;blob(c,bx+(R()-.5)*bw*1.8,by+(R()-.5)*bh*1.8,P*(.01+R()*.03),R,7);c.fill()}
  // fold line + peeking filling
  c.strokeStyle='rgba(120,70,20,.55)';c.lineWidth=P*.012;c.beginPath();c.moveTo(bx-bw*.9,by+bh*.25);c.quadraticCurveTo(bx,by+bh*.55,bx+bw*.9,by-bh*.05);c.stroke();
  c.fillStyle='rgba(110,50,25,.55)';c.beginPath();c.ellipse(bx+bw*.15,by+bh*.42,bw*.45,bh*.12,-.18,0,7);c.fill();
  c.restore();gloss(c,bx,by,bw,.22);
  // cheese drizzle + herbs
  c.strokeStyle='rgba(255,236,170,.85)';c.lineWidth=P*.012;c.lineCap='round';for(let i=0;i<4;i++){c.beginPath();c.moveTo(bx-bw*.6+i*bw*.35,by-bh*.4);c.quadraticCurveTo(bx-bw*.4+i*bw*.35,by,bx-bw*.55+i*bw*.35,by+bh*.3);c.stroke()}
  for(let i=0;i<60;i++){c.fillStyle='#3F7E2A';c.beginPath();c.ellipse(bx+(R()-.5)*bw*1.6,by+(R()-.5)*bh*1.6,P*.01,P*.005,R()*3,0,7);c.fill()}
}

/* ---------- scroll scene: mangal from cold coals to served shashlik ---------- */
const GRILL={W:0,coals:null,skewers:null,garnish:null};
function grillSetup(W,H){
  const R=rng(421),cx=W/2,cy=H/2,gw=W*.86,gh=H*.5;
  const coals=[];for(let i=0;i<420;i++)coals.push({x:cx+(R()-.5)*gw*.92,y:cy+(R()-.5)*gh*.82,r:W*(.008+R()*.014),sd:(R()*1e9)|0,t:R()});
  const skewers=[];const n=6;for(let i=0;i<n;i++){const x=cx-gw*.38+i*(gw*.76/(n-1));const chunks=[];for(let k=0;k<5;k++)chunks.push({y:cy-gh*.36+k*gh*.18,r:W*(.032+R()*.008),sd:(R()*1e9)|0,fat:k===2&&i%2===0});skewers.push({x,chunks,d:R()})}
  const garnish=[];for(let i=0;i<46;i++)garnish.push({x:cx+(R()-.5)*gw*.9,y:cy+(R()-.5)*gh*.9,r:W*(.012+R()*.016),rot:R()*3,k:R()<.6?'onion':'herb',d:R()});
  Object.assign(GRILL,{W,coals,skewers,garnish,cx,cy,gw,gh});
}
function drawLiveGrill(c,W,H,p){
  if(GRILL.W!==W)grillSetup(W,H);
  const G=GRILL,{cx,cy,gw,gh}=G;c.clearRect(0,0,W,H);
  const heat=ease(seg(p,0,.2)),place=seg(p,.2,.4),cook=ease(seg(p,.4,.72)),smoke=seg(p,.6,.85),serve=ease(seg(p,.85,1));
  // mangal body
  shadowed(c,W*.06,W*.02,()=>{c.fillStyle='#171514';c.beginPath();c.roundRect(cx-gw/2,cy-gh/2,gw,gh,W*.02);c.fill()},'rgba(0,0,0,.85)');
  let g=c.createLinearGradient(0,cy-gh/2,0,cy+gh/2);g.addColorStop(0,'#3A3633');g.addColorStop(1,'#141211');c.fillStyle=g;c.beginPath();c.roundRect(cx-gw/2,cy-gh/2,gw,gh,W*.02);c.fill();
  const iw=gw*.94,ih=gh*.86;c.fillStyle='#0B0A09';c.beginPath();c.roundRect(cx-iw/2,cy-ih/2,iw,ih,W*.01);c.fill();
  // coals
  c.save();c.beginPath();c.rect(cx-iw/2,cy-ih/2,iw,ih);c.clip();
  // charcoal: dark grey lumps whose cracks glow as the heat rises
  G.coals.forEach(o=>{const h=clamp(heat*1.2-o.t*.3),gl=h*(.35+.65*((o.sd%97)/97));
    c.fillStyle=radial(c,o.x,o.y,o.r,[[0,`rgb(${52+gl*170},${40+gl*52},${30+gl*6})`],[.65,`rgb(${36+gl*60},${30+gl*12},28)`],[1,'#121010']]);blob(c,o.x,o.y,o.r,rng(o.sd),7);c.fill()});
  if(heat>0){c.globalCompositeOperation='screen';c.globalAlpha=.35*heat;const gg=c.createRadialGradient(cx,cy,0,cx,cy,iw*.55);gg.addColorStop(0,'rgba(255,110,30,.6)');gg.addColorStop(1,'rgba(255,60,10,0)');c.fillStyle=gg;c.fillRect(cx-iw/2,cy-ih/2,iw,ih);c.globalAlpha=1;c.globalCompositeOperation='source-over'}
  c.restore();
  // skewers
  G.skewers.forEach((s,i)=>{const t=ease(seg(place,s.d*.5,s.d*.5+.5));if(!t)return;const off=(1-t)*-H*.5;
    c.save();c.translate(0,off);c.globalAlpha=t;
    c.strokeStyle='#C9CDD2';c.lineWidth=W*.006;c.beginPath();c.moveTo(s.x,cy-gh*.62);c.lineTo(s.x,cy+gh*.5);c.stroke();
    c.fillStyle='#8E9399';c.beginPath();c.roundRect(s.x-W*.01,cy-gh*.7,W*.02,gh*.1,3);c.fill();
    s.chunks.forEach(ch=>{const r=ch.r;
      const raw=ch.fat?[[0,'#F4E2CC'],[1,'#D8BC98']]:[[0,'#D9767A'],[1,'#A8464C']];
      const done=ch.fat?[[0,'#F1DDB8'],[1,'#B98A4E']]:[[0,'#A3542A'],[.55,'#6A2D14'],[1,'#2E1207']];
      const col=(a,b)=>a.map((st,k)=>[st[0],mix(st[1],(b[k]||b[b.length-1])[1],cook)]);
      shadowed(c,r*.5,r*.3,()=>{c.fillStyle=radial(c,s.x,ch.y,r,col(raw,done));blob(c,s.x,ch.y,r,rng(ch.sd),9,.85);c.fill()},'rgba(0,0,0,.7)');
      if(!ch.fat&&cook>.3){c.save();blob(c,s.x,ch.y,r,rng(ch.sd),9,.85);c.clip();const k=(cook-.3)/.7;for(let j=0;j<4;j++){c.strokeStyle=`rgba(12,4,0,${.35*k})`;c.lineWidth=r*.14;c.beginPath();c.moveTo(s.x-r,ch.y-r*.5+j*r*.35);c.lineTo(s.x+r,ch.y-r*.2+j*r*.35);c.stroke()}c.restore()}
      gloss(c,s.x,ch.y,r,.15+cook*.2)});
    c.restore()});
  // smoke haze
  if(smoke>0){c.save();c.globalAlpha=.18*smoke*(1-serve*.5);g=c.createRadialGradient(cx,cy-gh*.2,0,cx,cy-gh*.2,gw*.6);g.addColorStop(0,'rgba(230,225,220,.8)');g.addColorStop(1,'rgba(230,225,220,0)');c.fillStyle=g;c.fillRect(0,0,W,H);c.restore()}
  // serving garnish
  if(serve>0)G.garnish.forEach(o=>{const t=ease(seg(serve,o.d*.6,o.d*.6+.4));if(!t)return;c.save();c.globalAlpha=t;c.translate(o.x,o.y-(1-t)*W*.05);c.rotate(o.rot);
    if(o.k==='onion'){c.strokeStyle='rgba(240,228,236,.9)';c.lineWidth=W*.005;c.beginPath();c.ellipse(0,0,o.r,o.r*.8,0,0,7);c.stroke();c.strokeStyle='rgba(150,60,130,.45)';c.lineWidth=W*.002;c.beginPath();c.ellipse(0,0,o.r*1.08,o.r*.86,0,0,7);c.stroke()}
    else{c.fillStyle='#3F7E2A';c.beginPath();c.ellipse(0,0,o.r*.6,o.r*.25,0,0,7);c.fill()}c.restore()});
}
function mix(a,b,t){const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16);const r=Math.round(((pa>>16)&255)*(1-t)+((pb>>16)&255)*t),g=Math.round(((pa>>8)&255)*(1-t)+((pb>>8)&255)*t),bl=Math.round((pa&255)*(1-t)+(pb&255)*t);return `rgb(${r},${g},${bl})`}
ART.brizol=drawBrizol;ART_LABELS.brizol='Бризоль';ART.mangal=(c,W,H)=>drawLiveGrill(c,W,H,.97);
export { drawLiveGrill, GRILL };

/* ---------- v2: garnishes, sauces, pickles, drinks, sweets ---------- */
function smallBowl(c,x,y,r,R,glaze='#F1ECE2',rim='#2A4FA0'){
  shadowed(c,r*.3,r*.12,()=>{c.fillStyle=glaze;c.beginPath();c.arc(x,y,r,0,7);c.fill()},'rgba(0,0,0,.65)');
  c.strokeStyle=rim;c.lineWidth=r*.07;c.beginPath();c.arc(x,y,r*.92,0,7);c.stroke();
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;c.fillStyle=rim;c.beginPath();c.ellipse(x+Math.cos(a)*r*.82,y+Math.sin(a)*r*.82,r*.055,r*.022,a,0,7);c.fill()}
}
function herbs(c,cx,cy,rad,P,R,n=14,cols=['#3E7A26','#5C9A34','#2F6A1E']){
  for(let i=0;i<n;i++){const a=R()*7,rr=Math.sqrt(R())*rad;c.save();c.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.rotate(R()*7);c.fillStyle=cols[(R()*cols.length)|0];c.beginPath();c.ellipse(0,0,P*.035,P*.016,0,0,7);c.fill();c.restore()}
}
function drawRice(c,W,H){
  const R=rng(401),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);const b=P*.6;
  shadowed(c,P*.06,P*.03,()=>{c.fillStyle='#EFE6D2';blob(c,cx,cy,b,R,16,.95);c.fill()},'rgba(40,30,10,.45)');
  for(let i=0;i<900;i++){const a=R()*7,rr=Math.sqrt(R())*b*.95,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;c.save();c.translate(x,y);c.rotate(R()*3);
    c.fillStyle=`hsl(${42+R()*8},${30+R()*20}%,${86+R()*10}%)`;c.beginPath();c.ellipse(0,0,P*.026,P*.009,0,0,7);c.fill();c.restore()}
  c.save();c.globalAlpha=.5;c.fillStyle='#F2C14E';blob(c,cx-b*.1,cy-b*.1,b*.25,R,8);c.fill();c.restore();
  herbs(c,cx,cy,b*.7,P,R,18);
}
function drawFries(c,W,H){
  const R=rng(402),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);const b=P*.62;
  for(let i=0;i<70;i++){const a=R()*7,rr=Math.sqrt(R())*b*.85,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,l=P*(.16+R()*.12),w=P*.035;
    c.save();c.translate(x,y);c.rotate(R()*Math.PI);
    shadowed(c,w*.6,w*.3,()=>{c.fillStyle=radial(c,0,0,l,[[0,'#F6CE5C'],[1,'#D99A2B']]);c.fillRect(-l/2,-w/2,l,w)},'rgba(80,40,0,.45)');
    c.fillStyle='rgba(255,240,180,.45)';c.fillRect(-l/2,-w/2,l,w*.3);c.restore()}
  for(let i=0;i<120;i++){c.fillStyle='rgba(255,255,255,.8)';const a=R()*7,rr=Math.sqrt(R())*b;c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.004,0,7);c.fill()}
}
function drawPotato(c,W,H){
  const R=rng(403),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);const b=P*.62;
  for(let i=0;i<22;i++){const a=R()*7,rr=Math.sqrt(R())*b*.8,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*(.12+R()*.04);
    c.save();c.translate(x,y);c.rotate(R()*7);
    shadowed(c,r*.3,r*.12,()=>{c.fillStyle=radial(c,0,0,r,[[0,'#F0C060'],[.7,'#D08A2A'],[1,'#8A4E14']]);c.beginPath();c.moveTo(-r,0);c.quadraticCurveTo(0,-r*1.1,r,0);c.quadraticCurveTo(0,r*.5,-r,0);c.fill()},'rgba(60,30,0,.5)');
    c.restore()}
  herbs(c,cx,cy,b*.8,P,R,16,['#4E7A2C','#6B8E3A']);
  for(let i=0;i<20;i++){const a=R()*7,rr=Math.sqrt(R())*b*.8;c.fillStyle='#F4EAD0';c.beginPath();c.ellipse(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.02,P*.014,R()*3,0,7);c.fill()}
}
function drawGrillVeg(c,W,H){
  const R=rng(404),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);const b=P*.64;
  const piece=(x,y,r,fill,rot)=>{c.save();c.translate(x,y);c.rotate(rot);shadowed(c,r*.3,r*.1,()=>{c.fillStyle=fill;c.beginPath();c.ellipse(0,0,r,r*.55,0,0,7);c.fill()},'rgba(0,0,0,.45)');
    c.strokeStyle='rgba(30,15,8,.75)';c.lineWidth=r*.12;for(let k=-1;k<=1;k++){c.beginPath();c.moveTo(-r*.7,k*r*.25-r*.1);c.lineTo(r*.7,k*r*.25+r*.1);c.stroke()}c.restore()};
  const cols=[radial(c,0,0,P*.2,[[0,'#7A3E7E'],[1,'#3E1A44']]),radial(c,0,0,P*.2,[[0,'#E8442E'],[1,'#9A1E12']]),radial(c,0,0,P*.2,[[0,'#F2C230'],[1,'#B0820E']]),radial(c,0,0,P*.2,[[0,'#6FA23A'],[1,'#3A6A1A']])];
  for(let i=0;i<16;i++){const a=R()*7,rr=Math.sqrt(R())*b*.8;piece(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*(.14+R()*.05),cols[i%4],R()*7)}
  for(let i=0;i<5;i++){const a=R()*7,rr=Math.sqrt(R())*b*.6,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.11;c.fillStyle='#C9302A';c.beginPath();c.arc(x,y,r,0,7);c.fill();c.fillStyle='rgba(255,180,150,.5)';c.beginPath();c.arc(x,y,r*.6,0,7);c.fill()}
  herbs(c,cx,cy,b*.8,P,R,12);
}
function drawPickles(c,W,H){
  const R=rng(405),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);const b=P*.64;
  for(let i=0;i<9;i++){const a=i/9*7+R()*.3,rr=b*(.35+R()*.4),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,l=P*.22;c.save();c.translate(x,y);c.rotate(a+1.4);
    shadowed(c,l*.2,l*.08,()=>{c.fillStyle=radial(c,0,0,l,[[0,'#8DB04A'],[1,'#3E6420']]);c.beginPath();c.ellipse(0,0,l,l*.33,0,0,7);c.fill()},'rgba(0,0,0,.45)');
    c.fillStyle='rgba(220,240,170,.35)';for(let k=0;k<8;k++){c.beginPath();c.arc(-l*.7+k*l*.2,(R()-.5)*l*.3,l*.03,0,7);c.fill()}c.restore()}
  for(let i=0;i<5;i++){const a=R()*7,rr=Math.sqrt(R())*b*.5,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.12;
    shadowed(c,r*.3,r*.1,()=>{c.fillStyle=radial(c,x,y,r,[[0,'#F25A3A'],[1,'#A21E12']]);c.beginPath();c.arc(x,y,r,0,7);c.fill()},'rgba(0,0,0,.4)');gloss(c,x,y,r,.35)}
  for(let i=0;i<30;i++){const a=R()*7,rr=Math.sqrt(R())*b;c.strokeStyle='rgba(240,236,210,.85)';c.lineWidth=P*.012;c.beginPath();c.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.lineTo(cx+Math.cos(a)*rr+P*.06,cy+Math.sin(a)*rr+P*.02);c.stroke()}
  for(let i=0;i<3;i++){const a=R()*7,rr=b*.5;c.save();c.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.rotate(R()*7);c.fillStyle='#C8261C';c.beginPath();c.ellipse(0,0,P*.16,P*.035,0,0,7);c.fill();c.restore()}
}
function drawSauce(col,top){return function(c,W,H){
  const R=rng(406),cx=W/2,cy=H/2;board(c,W,H,R,['#2E241D','#3B3027','#211A15']);const r=W*.3;
  smallBowl(c,cx,cy,r,R);
  c.fillStyle=radial(c,cx,cy,r*.75,col);c.beginPath();c.arc(cx,cy,r*.74,0,7);c.fill();
  c.save();c.globalAlpha=.35;c.strokeStyle='#fff';c.lineWidth=r*.04;c.beginPath();c.arc(cx,cy,r*.5,Math.PI*1.1,Math.PI*1.7);c.stroke();c.restore();
  if(top==='herb')herbs(c,cx,cy,r*.5,W*.46,R,16);
  if(top==='chili')for(let i=0;i<40;i++){const a=R()*7,rr=Math.sqrt(R())*r*.65;c.fillStyle=R()<.5?'#FFD27A':'#7A0E08';c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,r*.02,0,7);c.fill()}
  if(top==='tomato')herbs(c,cx,cy,r*.5,W*.46,R,8,['#3E7A26']);
  if(top==='mint'){for(let i=0;i<5;i++){const a=R()*7,rr=R()*r*.4;c.save();c.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.rotate(R()*7);c.fillStyle='#5FA640';c.beginPath();c.ellipse(0,0,r*.12,r*.07,0,0,7);c.fill();c.strokeStyle='#3C7A26';c.lineWidth=r*.01;c.beginPath();c.moveTo(-r*.1,0);c.lineTo(r*.1,0);c.stroke();c.restore()}c.strokeStyle='rgba(200,190,170,.6)';c.lineWidth=r*.015;c.beginPath();c.arc(cx,cy,r*.3,0,5);c.stroke()}
}}
function drawSweets(c,W,H){
  const R=rng(407);board(c,W,H,R,['#4A2E1A','#5E3D24','#3A2414']);const cx=W/2,cy=H/2,r=W*.34;
  smallBowl(c,cx,cy,r,R);
  for(let i=0;i<16;i++){const x=cx+(R()-.5)*r*1.0,y=cy-r*.1+(R()-.5)*r*.7,s=r*(.08+R()*.05);c.fillStyle='rgba(245,225,170,.92)';c.beginPath();for(let k=0;k<6;k++){const a=k/6*Math.PI*2+R();c.lineTo(x+Math.cos(a)*s*(.7+R()*.5),y+Math.sin(a)*s*(.7+R()*.5))}c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.arc(x-s*.25,y-s*.25,s*.22,0,7);c.fill()}
  for(let i=0;i<6;i++){const x=cx+(R()-.5)*r*.9,y=cy+r*.35+(R()-.5)*r*.25,s=r*.16;c.save();c.translate(x,y);c.rotate(R()*3);c.fillStyle=radial(c,0,0,s,[[0,'#E8D2A0'],[1,'#B89A62']]);c.fillRect(-s,-s*.6,s*2,s*1.2);c.restore()}
  for(let i=0;i<8;i++){const x=cx+(R()-.5)*r*1.1,y=cy+(R()-.5)*r*1.1,s=r*.08;c.save();c.translate(x,y);c.rotate(R()*3);c.fillStyle=radial(c,0,0,s,[[0,'#D9A86A'],[1,'#8C5A2A']]);c.beginPath();c.ellipse(0,0,s,s*.55,0,0,7);c.fill();c.restore()}
}
function drawIcecream(c,W,H){
  const R=rng(408),cx=W/2,cy=H/2;board(c,W,H,R,['#3A2A33','#4A3640','#2A1E25']);const r=W*.34;
  smallBowl(c,cx,cy,r,R,'#F4F1EA','#8A2A4A');
  [[-.28,-.12,'#FFF4DE'],[.26,-.18,'#FCEBC8'],[0,.24,'#FFF8EA']].forEach(([dx,dy,col])=>{const x=cx+dx*r,y=cy+dy*r,s=r*.36;
    shadowed(c,s*.3,s*.12,()=>{c.fillStyle=radial(c,x,y,s,[[0,col],[1,'#E2D2B4']]);blob(c,x,y,s,R,12,.95);c.fill()},'rgba(0,0,0,.3)');gloss(c,x,y,s,.35)});
  c.strokeStyle='#A0182E';c.lineWidth=r*.05;c.lineCap='round';for(let i=0;i<4;i++){c.beginPath();const y=cy-r*.4+i*r*.25;c.moveTo(cx-r*.5,y);c.bezierCurveTo(cx-r*.2,y-r*.2,cx+r*.1,y+r*.2,cx+r*.45,y-r*.05);c.stroke()}
  for(let i=0;i<8;i++){c.fillStyle='#7A0E22';c.beginPath();c.arc(cx+(R()-.5)*r*.9,cy+(R()-.5)*r*.9,r*.04,0,7);c.fill()}
  herbs(c,cx+r*.2,cy-r*.3,r*.1,W*.46,R,3,['#4E8F2C']);
}
ART.rice=drawRice;ART.fries=drawFries;ART.potato=drawPotato;ART.grillveg=drawGrillVeg;ART.pickles=drawPickles;
ART['sauce-red']=drawSauce([[0,'#E0503A'],[1,'#8E1E12']],'tomato');ART['sauce-white']=drawSauce([[0,'#FBF8EE'],[1,'#DCD6C4']],'herb');ART['sauce-chili']=drawSauce([[0,'#C8281A'],[1,'#5E0A04']],'chili');
ART['glass-water']=drawGlass([[0,'rgba(220,236,245,.9)'],[1,'rgba(150,186,205,.85)']]);ART['glass-cola']=drawGlass([[0,'#6A2A14'],[1,'#200A04']]);
ART.sweets=drawSweets;ART.icecream=drawIcecream;

/* ---------- v2 variants: every dish gets its own picture ---------- */
function drawSkewers(o){return function(c,W,H){
  const R=rng(o.seed);board(c,W,H,R,o.board||['#2A2420','#3A322C','#1E1916']);
  for(let i=0;i<(o.onion??18);i++){const x=W*(.12+R()*.76),y=H*(.12+R()*.76),r=W*(.018+R()*.02);c.strokeStyle='rgba(240,228,236,.85)';c.lineWidth=W*.007;c.beginPath();c.ellipse(x,y,r,r*.8,R()*3,0,7);c.stroke()}
  const sk=(y,rot)=>{c.save();c.translate(W/2,y);c.rotate(rot);
    c.strokeStyle='#C9CDD2';c.lineWidth=W*.01;c.beginPath();c.moveTo(-W*.46,0);c.lineTo(W*.44,0);c.stroke();
    c.fillStyle='#8E9399';c.beginPath();c.roundRect(-W*.5,-W*.012,W*.06,W*.024,4);c.fill();
    if(o.lula){const l=W*.66,h=W*.085,x0=-W*.33;
      shadowed(c,h*.6,h*.3,()=>{c.fillStyle=radial(c,0,0,l*.6,o.meat);c.beginPath();c.roundRect(x0,-h/2,l,h,h/2);c.fill()},'rgba(0,0,0,.75)');
      for(let j=0;j<14;j++){c.strokeStyle=`rgba(20,6,0,${.25+R()*.25})`;c.lineWidth=h*.12;c.lineCap='round';const xx=x0+h*.4+j*(l-h*.8)/13;c.beginPath();c.moveTo(xx-h*.15,-h*.35);c.lineTo(xx+h*.15,h*.35);c.stroke()}
      c.fillStyle='rgba(70,120,40,.9)';for(let j=0;j<12;j++){c.beginPath();c.arc(x0+R()*l,(R()-.5)*h*.6,W*.004,0,7);c.fill()}
      gloss(c,0,-h*.1,l*.4,.18);c.restore();return}
    for(let k=0;k<6;k++){const x=-W*.33+k*W*.135,extra=o.extra&&o.extra[k%o.extra.length],r=extra?W*.05:W*.07,sd=(R()*1e9)|0;
      shadowed(c,r*.5,r*.3,()=>{c.fillStyle=extra?radial(c,x,0,r,extra):radial(c,x,0,r,o.meat);blob(c,x,0,r,rng(sd),9,.85);c.fill()},'rgba(0,0,0,.75)');
      if(!extra){c.save();blob(c,x,0,r,rng(sd),9,.85);c.clip();if(o.wrap){c.strokeStyle='rgba(240,225,200,.75)';c.lineWidth=r*.18;c.beginPath();c.moveTo(x-r,-r*.2);c.quadraticCurveTo(x,r*.5,x+r,-r*.1);c.stroke()}
        for(let j=0;j<5;j++){c.strokeStyle=`rgba(12,4,0,${.25+R()*.25})`;c.lineWidth=r*.12;c.lineCap='round';const yy=(R()-.5)*r*1.2;c.beginPath();c.moveTo(x-r*.7,yy-r*.3);c.lineTo(x+r*.6,yy+r*.2);c.stroke()}c.restore()}
      gloss(c,x,0,r,.28)}
    c.restore()};
  sk(H*.3,-.12);sk(H*.52,-.06);sk(H*.74,-.1);
  for(let i=0;i<160;i++){c.fillStyle=R()<.6?'rgba(140,25,30,.75)':'rgba(70,120,40,.8)';c.beginPath();c.arc(W*(.1+R()*.8),H*(.1+R()*.8),W*.0035,0,7);c.fill()}
}}
ART['shashlik-beef']=drawSkewers({seed:34,meat:[[0,'#8E3A1E'],[.55,'#521E0C'],[1,'#1E0803']],onion:10});
ART['shashlik-lula']=drawSkewers({seed:35,lula:true,meat:[[0,'#B0602E'],[.6,'#7A3818'],[1,'#3A1608']],onion:14});
ART['shashlik-liver']=drawSkewers({seed:36,wrap:true,meat:[[0,'#7A3442'],[.55,'#4A1A24'],[1,'#1E070C']],extra:[0,0,[[0,'#F1DDB8'],[1,'#B98A4E']]],onion:8});
ART['shashlik-chicken']=drawSkewers({seed:37,meat:[[0,'#F0B45A'],[.55,'#C4782E'],[1,'#6A3410']],extra:[0,[[0,'#7FB04E'],[1,'#3D6B22']],0,[[0,'#F25A3A'],[1,'#A21E12']]],onion:6,board:['#3A2E24','#4A3A2C','#2A2018']});

function drawSaladV(kind){return function(c,W,H){
  const R=rng(kind==='spring'?501:502),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);const b=P*.68;
  if(kind==='spring'){
    for(let i=0;i<22;i++){const a=R()*7,rr=Math.sqrt(R())*b*.85,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.085;
      shadowed(c,r*.3,r*.1,()=>{c.fillStyle='#3E7A26';c.beginPath();c.arc(x,y,r,0,7);c.fill()},'rgba(0,0,0,.35)');
      c.fillStyle='#CFE3A0';c.beginPath();c.arc(x,y,r*.82,0,7);c.fill();c.fillStyle='#E6F0C8';for(let k=0;k<6;k++){const t=k/6*7;c.beginPath();c.ellipse(x+Math.cos(t)*r*.4,y+Math.sin(t)*r*.4,r*.1,r*.05,t,0,7);c.fill()}}
    for(let i=0;i<10;i++){const a=R()*7,rr=Math.sqrt(R())*b*.8,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.06;c.fillStyle='#D2385A';c.beginPath();c.arc(x,y,r,0,7);c.fill();c.fillStyle='#FBEFF2';c.beginPath();c.arc(x,y,r*.78,0,7);c.fill()}
    for(let i=0;i<12;i++){const a=R()*7,rr=Math.sqrt(R())*b*.8;c.save();c.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.rotate(R()*7);const r=P*.09;c.fillStyle='#D83A2E';c.beginPath();c.arc(0,0,r,0,Math.PI);c.closePath();c.fill();c.fillStyle='rgba(255,170,150,.5)';c.beginPath();c.ellipse(0,r*.35,r*.5,r*.2,0,0,7);c.fill();c.restore()}
    for(let i=0;i<80;i++){const a=R()*7,rr=Math.sqrt(R())*b;c.strokeStyle=R()<.5?'#4E8F2C':'#6FAE3A';c.lineWidth=P*.006;const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;c.beginPath();c.moveTo(x,y);c.lineTo(x+(R()-.5)*P*.06,y+(R()-.5)*P*.06);c.stroke()}
  }else{ // tashkent
    for(let i=0;i<140;i++){const a=R()*7,rr=Math.sqrt(R())*b*.9,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;c.save();c.translate(x,y);c.rotate(R()*3);c.fillStyle=R()<.5?'#EDF2DC':'#DDE8C0';c.fillRect(-P*.06,-P*.008,P*.12,P*.016);c.restore()}
    for(let i=0;i<34;i++){const a=R()*7,rr=Math.sqrt(R())*b*.7,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;c.save();c.translate(x,y);c.rotate(R()*3);shadowed(c,P*.01,P*.005,()=>{c.fillStyle='#6E3A22';c.fillRect(-P*.07,-P*.012,P*.14,P*.024)},'rgba(0,0,0,.4)');c.restore()}
    for(let i=0;i<5;i++){const a=i/5*7,x=cx+Math.cos(a)*b*.45,y=cy+Math.sin(a)*b*.45,r=P*.085;c.fillStyle='#FBFAF4';c.beginPath();c.ellipse(x,y,r,r*.8,a,0,7);c.fill();c.fillStyle='#F2B83A';c.beginPath();c.arc(x,y,r*.45,0,7);c.fill()}
    for(let i=0;i<60;i++){const a=R()*7,rr=Math.sqrt(R())*b*.35;c.fillStyle=R()<.5?'#C98A2E':'#E0A84A';c.beginPath();c.ellipse(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.02,P*.008,R()*3,0,7);c.fill()}
  }
}}
ART['salad-spring']=drawSaladV('spring');ART['salad-tashkent']=drawSaladV('tashkent');

function drawSoupV(kind){return function(c,W,H){
  const R=rng(kind==='mastava'?511:512),cx=W/2,cy=H/2,P=W*.45;lagan(c,cx,cy,P,R,.76);const b=P*.72;
  const broth=kind==='mastava'?[[0,'#E07A3A'],[.7,'#B8481E'],[1,'#7A2A10']]:[[0,'#EBCB8A'],[.7,'#C99A50'],[1,'#8C6228']];
  c.fillStyle=radial(c,cx,cy,b,broth);c.beginPath();c.arc(cx,cy,b,0,7);c.fill();
  for(let i=0;i<60;i++){const a=R()*7,rr=Math.sqrt(R())*b*.95;c.strokeStyle='rgba(255,215,130,.4)';c.lineWidth=P*.004;c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*(.008+R()*.02),0,7);c.stroke()}
  if(kind==='mastava'){
    for(let i=0;i<260;i++){const a=R()*7,rr=Math.sqrt(R())*b*.92;c.save();c.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.rotate(R()*3);c.fillStyle='rgba(250,240,220,.9)';c.beginPath();c.ellipse(0,0,P*.018,P*.007,0,0,7);c.fill();c.restore()}
    for(let i=0;i<8;i++){const a=R()*7,rr=Math.sqrt(R())*b*.7,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.06;c.fillStyle=radial(c,x,y,r,[[0,'#8E4524'],[1,'#3E180A']]);blob(c,x,y,r,R,8,.8);c.fill()}
    shadowed(c,P*.04,P*.01,()=>{c.fillStyle='#FBF8EE';blob(c,cx+b*.1,cy-b*.1,P*.16,R,12,.9);c.fill()},'rgba(0,0,0,.25)');
  }else{
    for(let i=0;i<16;i++){const a=R()*7,rr=Math.sqrt(R())*b*.8,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,s=P*.075;c.save();c.translate(x,y);c.rotate(R()*7);
      shadowed(c,s*.3,s*.15,()=>{c.fillStyle=radial(c,0,0,s,[[0,'#FBF5EA'],[1,'#D8C7A6']]);c.beginPath();c.moveTo(-s,0);c.quadraticCurveTo(0,-s*1.2,s,0);c.quadraticCurveTo(0,s*.7,-s,0);c.fill()},'rgba(60,30,5,.4)');c.restore()}
    c.save();c.globalAlpha=.9;c.fillStyle='#FBF8EE';blob(c,cx-b*.2,cy+b*.2,P*.12,R,10,.9);c.fill();c.restore();
  }
  for(let i=0;i<70;i++){c.fillStyle='#3F7E2A';const a=R()*7,rr=Math.sqrt(R())*b*.9;c.beginPath();c.ellipse(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.012,P*.006,R()*3,0,7);c.fill()}
}}
ART.mastava=drawSoupV('mastava');ART.chuchvara=drawSoupV('chuchvara');

function drawTeaBlack(c,W,H){
  const R=rng(521);board(c,W,H,R,['#3A2214','#4E2E1A','#2A170C']);
  piyola(c,W*.4,H*.44,W*.17,radial(c,W*.4,H*.44,W*.13,[[0,'#C8642A'],[1,'#5E2208']]),R);
  piyola(c,W*.7,H*.66,W*.12,radial(c,W*.7,H*.66,W*.09,[[0,'#C8642A'],[1,'#5E2208']]),R);
  const lx=W*.24,ly=H*.72,lr=W*.07;c.fillStyle='#F2D24A';c.beginPath();c.arc(lx,ly,lr,0,7);c.fill();c.fillStyle='#FBF0B0';c.beginPath();c.arc(lx,ly,lr*.85,0,7);c.fill();
  c.strokeStyle='#F2D24A';c.lineWidth=lr*.08;for(let k=0;k<8;k++){const a=k/8*7;c.beginPath();c.moveTo(lx,ly);c.lineTo(lx+Math.cos(a)*lr*.85,ly+Math.sin(a)*lr*.85);c.stroke()}
}
ART['tea-black']=drawTeaBlack;

function drawBrizolV(kind){return function(c,W,H){
  ART.brizol(c,W,H);
  const R=rng(kind==='beef'?531:532),cx=W/2,cy=H/2,P=W*.46;
  if(kind==='beef'){ // darker crepe edge with tomato slices on top
    c.save();c.globalCompositeOperation='multiply';c.fillStyle='rgba(170,110,60,.35)';c.beginPath();c.ellipse(cx-P*.05,cy-P*.02,P*.48,P*.32,-.25,0,7);c.fill();c.restore();
    for(let i=0;i<3;i++){const x=cx-P*.25+i*P*.2,y=cy-P*.08+i*P*.03,r=P*.07;c.fillStyle='#D8392C';c.beginPath();c.arc(x,y,r,0,7);c.fill();c.fillStyle='rgba(255,190,160,.55)';c.beginPath();c.arc(x,y,r*.55,0,7);c.fill()}
  }else{ // assorti: second crepe + mushroom sauce
    const bx=cx+P*.12,by=cy+P*.3,bw=P*.32,bh=P*.2;
    shadowed(c,P*.06,P*.02,()=>{c.fillStyle=radial(c,bx,by,bw,[[0,'#F2C565'],[1,'#B9772A']]);c.beginPath();c.ellipse(bx,by,bw,bh,.3,0,7);c.fill()},'rgba(50,25,5,.6)');
    c.fillStyle='rgba(150,95,55,.85)';blob(c,cx-P*.1,cy-P*.05,P*.16,R,10,.8);c.fill();
    for(let i=0;i<7;i++){const x=cx-P*.1+(R()-.5)*P*.22,y=cy-P*.05+(R()-.5)*P*.18,r=P*.035;c.fillStyle='#E8D8C0';c.beginPath();c.ellipse(x,y,r,r*.7,R()*3,0,7);c.fill();c.fillStyle='#A68A6A';c.fillRect(x-r*.2,y,r*.4,r*.8)}
  }
}}
ART['brizol-beef']=drawBrizolV('beef');ART['brizol-mix']=drawBrizolV('mix');

function drawSomsaPumpkin(c,W,H){
  ART.somsa(c,W,H);
  const R=rng(541);c.save();c.globalCompositeOperation='overlay';c.fillStyle='rgba(255,140,40,.25)';c.fillRect(0,0,W,H);c.restore();
  for(let i=0;i<10;i++){const x=W*(.2+R()*.6),y=H*(.82+R()*.1),s=W*.03;shadowed(c,s*.4,s*.2,()=>{c.fillStyle=radial(c,x,y,s,[[0,'#FFB04A'],[1,'#D06A12']]);c.fillRect(x-s/2,y-s/2,s,s)},'rgba(0,0,0,.5)')}
}
ART['somsa-pumpkin']=drawSomsaPumpkin;

function drawPatir(c,W,H){
  ART.non(c,W,H);const R=rng(551),cx=W/2,cy=H/2,r=W*.4;
  c.save();c.globalCompositeOperation='multiply';c.fillStyle=radial(c,cx,cy,r,[[0,'rgba(255,255,255,0)'],[.6,'rgba(190,110,50,.35)'],[1,'rgba(120,60,20,.5)']]);c.beginPath();c.arc(cx,cy,r,0,7);c.fill();c.restore();
  for(let ring=0;ring<3;ring++){c.strokeStyle='rgba(110,55,15,.45)';c.lineWidth=r*.012;c.beginPath();c.arc(cx,cy,r*(.62+ring*.1),0,7);c.stroke()}
  for(let i=0;i<300;i++){const a=R()*7,rr=r*(.6+R()*.36);c.fillStyle=R()<.6?'#140C08':'#FFF2D0';c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,r*.007,0,7);c.fill()}
}
ART.patir=drawPatir;

function drawXonim(c,W,H){
  const R=rng(561),cx=W/2,cy=H/2,P=W*.46;lagan(c,cx,cy,P,R);
  const roll=(x,y,s)=>{shadowed(c,s*.3,s*.15,()=>{c.fillStyle=radial(c,x,y,s,[[0,'#FBF5EA'],[1,'#D9C8A8']]);c.beginPath();c.arc(x,y,s,0,7);c.fill()},'rgba(40,20,5,.5)');
    for(let k=0;k<4;k++){c.strokeStyle=k%2?'rgba(200,110,40,.75)':'rgba(120,60,30,.7)';c.lineWidth=s*.12;c.beginPath();c.arc(x,y,s*(.25+k*.18),k,k+5.4);c.stroke()}gloss(c,x,y,s,.3)};
  [[-.3,-.25],[.25,-.3],[.35,.2],[-.2,.3],[.02,0]].forEach(([dx,dy])=>roll(cx+dx*P,cy+dy*P,P*.2));
  c.fillStyle='#FBF8EE';blob(c,cx+P*.5,cy-P*.05,P*.1,R,10,.9);c.fill();
  for(let i=0;i<60;i++){const a=R()*7,rr=Math.sqrt(R())*P*.7;c.fillStyle=R()<.5?'#3F7E2A':'rgba(180,30,25,.75)';c.beginPath();c.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.006,0,7);c.fill()}
}
ART.xonim=drawXonim;

function drawDimlama(c,W,H){
  const R=rng(571),cx=W/2,cy=H/2,P=W*.46;kazanBase(c,cx,cy,P,.25);const b=P*.78;
  for(let i=0;i<6;i++){const a=i/6*7+R(),rr=b*.45,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.22;c.save();c.translate(x,y);c.rotate(a);
    shadowed(c,r*.2,r*.1,()=>{c.fillStyle=radial(c,0,0,r,[[0,'#E4EDB8'],[1,'#9DB46A']]);c.beginPath();c.ellipse(0,0,r,r*.6,0,0,7);c.fill()},'rgba(0,0,0,.4)');
    c.strokeStyle='rgba(255,255,240,.6)';c.lineWidth=r*.04;c.beginPath();c.moveTo(-r*.8,0);c.lineTo(r*.8,0);c.stroke();c.restore()}
  for(let i=0;i<8;i++){const a=R()*7,rr=Math.sqrt(R())*b*.6,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.1;shadowed(c,r*.4,r*.2,()=>{c.fillStyle=radial(c,x,y,r,[[0,'#9A4A26'],[1,'#3E180A']]);blob(c,x,y,r,R,9,.8);c.fill()},'rgba(0,0,0,.6)');gloss(c,x,y,r,.3)}
  for(let i=0;i<5;i++){const a=R()*7,rr=Math.sqrt(R())*b*.6,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.09;c.fillStyle=radial(c,x,y,r,[[0,'#F6DC7A'],[1,'#C99A2E']]);c.beginPath();c.moveTo(x-r,y);c.quadraticCurveTo(x,y-r*1.2,x+r,y);c.quadraticCurveTo(x,y+r*.5,x-r,y);c.fill()}
  for(let i=0;i<4;i++){const a=R()*7,rr=Math.sqrt(R())*b*.6,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr,r=P*.08;c.fillStyle='#4A2048';c.beginPath();c.arc(x,y,r,0,7);c.fill();c.fillStyle='#E8DCC0';c.beginPath();c.arc(x,y,r*.75,0,7);c.fill()}
  for(let i=0;i<80;i++){c.fillStyle='#3F7E2A';const a=R()*7,rr=Math.sqrt(R())*b*.9;c.beginPath();c.ellipse(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,P*.01,P*.005,R()*3,0,7);c.fill()}
}
ART.dimlama=drawDimlama;
ART['sauce-qatiq']=drawSauce([[0,'#F7F4EA'],[1,'#E2DCCB']],'mint');
