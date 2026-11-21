import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const host=document.querySelector('#view3d'),scene=new THREE.Scene();scene.background=new THREE.Color(0xf2f5f7);
const camera=new THREE.PerspectiveCamera(43,1,.1,3000),renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;host.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x9aadc3,2.5));
const sun=new THREE.DirectionalLight(0xffefd8,2.8);sun.position.set(-140,280,180);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-600;sun.shadow.camera.right=600;sun.shadow.camera.top=600;sun.shadow.camera.bottom=-600;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1400,1100),new THREE.MeshStandardMaterial({color:0xe8ebed,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-9;ground.receiveShadow=true;scene.add(ground);
const objects=new THREE.Group();scene.add(objects);
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.04});
const beige=mat(0xf7f8f8),edge=mat(0xc6cdd1),support=mat(0xe1e5e8),rail=mat(0x66727c),goal=mat(0x54b27d),start=mat(0x53a9d5),ballMat=new THREE.MeshPhysicalMaterial({color:0xb9c5ce,metalness:1,roughness:.12,clearcoat:1,clearcoatRoughness:.06});
const railInner=mat(0xe2e6e8),supportDark=mat(0xb4bec5);
const ballLight=new THREE.PointLight(0xffffff,6,85);scene.add(ballLight);
const R=36,H=Math.sqrt(3)*R,DX=54,DY=H,ox=52,oy=55;
const center=(x,y)=>({x:ox+x*DX,y:oy+y*DY+(x%2)*DY/2});
const point=(c,i)=>({x:c.x+R*Math.cos(Math.PI*i/3),y:c.y+R*Math.sin(Math.PI*i/3)});
const midpoint=(c,i)=>{let a=point(c,i),b=point(c,(i+1)%6);return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
const ports=t=>t.type==='curve120'?[t.rot,(t.rot+2)%6]:t.type==='curve60'?[t.rot,(t.rot+1)%6]:[t.rot,(t.rot+3)%6];
const origin={x:330,y:300};
const world=(p,h)=>new THREE.Vector3(p.x-origin.x,h,origin.y-p.y);
const floorY=z=>z*15;
const hexGeo=new THREE.CylinderGeometry(R-1,R-1,1,6,1,false,Math.PI/6);
const tube=(points,radius,material)=>{let curve=new THREE.CatmullRomCurve3(points);let mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(20,points.length*3),radius,10,false),material);mesh.castShadow=true;mesh.receiveShadow=true;objects.add(mesh)};
let marble=new THREE.Mesh(new THREE.SphereGeometry(8,40,28),ballMat);marble.castShadow=true;scene.add(marble);
const ballHalo=new THREE.Object3D();scene.add(ballHalo);
function tile(x,y,t){
let c=center(x,y),height=floorY(t.z),m=t.type==='end'?goal:t.type==='down'?start:beige;
if(t.type==='support'){let base=new THREE.Mesh(hexGeo,support);base.position.copy(world(c,height-2));base.scale.y=12;base.castShadow=true;objects.add(base);return}
for(let j=0;j<t.z;j++){let pillar=new THREE.Mesh(new THREE.CylinderGeometry(7,9,14,8),support);pillar.position.copy(world(c,j*15+7));pillar.castShadow=true;pillar.receiveShadow=true;objects.add(pillar);let collar=new THREE.Mesh(new THREE.CylinderGeometry(10,10,2,8),supportDark);collar.position.copy(world(c,j*15+13));objects.add(collar)}
let block=new THREE.Mesh(hexGeo,m);block.position.copy(world(c,height+2));block.scale.y=4;block.castShadow=true;block.receiveShadow=true;objects.add(block);
let rim=new THREE.Mesh(new THREE.CylinderGeometry(R-1,R-1,2,6,1,false,Math.PI/6),edge);rim.position.copy(world(c,height+4));rim.castShadow=true;objects.add(rim);
let top=new THREE.Mesh(new THREE.CylinderGeometry(R-3,R-3,1.5,6,1,false,Math.PI/6),m);top.position.copy(world(c,height+5.5));top.receiveShadow=true;objects.add(top);
let [a,b]=ports(t),p=midpoint(c,a),q=midpoint(c,b),isCurve=t.type==='curve120'||t.type==='curve60';
let points=[],left=[],right=[];for(let k=0;k<=24;k++){let f=k/24;let xx=isCurve?(1-f)*(1-f)*p.x+2*(1-f)*f*c.x+f*f*q.x:p.x+(q.x-p.x)*f;let yy=isCurve?(1-f)*(1-f)*p.y+2*(1-f)*f*c.y+f*f*q.y:p.y+(q.y-p.y)*f;let dx=isCurve?2*(1-f)*(c.x-p.x)+2*f*(q.x-c.x):q.x-p.x,dy=isCurve?2*(1-f)*(c.y-p.y)+2*f*(q.y-c.y):q.y-p.y;let len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;let h=height+8+(t.type==='down'?-15*f:t.type==='up'?15*f:0);points.push(world({x:xx,y:yy},h-1));left.push(world({x:xx+nx*9,y:yy+ny*9},h+3));right.push(world({x:xx-nx*9,y:yy-ny*9},h+3))}
tube(points,6,t.type==='end'?goal:railInner);tube(left,2.2,t.type==='end'?goal:rail);tube(right,2.2,t.type==='end'?goal:rail);
if(t.type==='end'){let ring=new THREE.Mesh(new THREE.TorusGeometry(13,3,8,32),goal);ring.rotation.x=-Math.PI/2;ring.position.copy(world(c,height+11));objects.add(ring)}
if(x===1&&y===3){let ring=new THREE.Mesh(new THREE.TorusGeometry(13,3,8,32),start);ring.rotation.x=-Math.PI/2;ring.position.copy(world(c,height+16));objects.add(ring)}
}
let currentTiles=new Map(),currentBall=null;
function rebuild(){while(objects.children.length){let o=objects.children[0];objects.remove(o);o.traverse?.(n=>{if(n.geometry&&n.geometry!==hexGeo)n.geometry.dispose()})}for(let [k,t] of currentTiles){let [x,y]=k.split(',').map(Number);tile(x,y,t)}updateBall();if(!walkMode&&currentTiles.size){let bounds=new THREE.Box3().setFromObject(objects);if(!bounds.isEmpty()){bounds.getCenter(target);let size=bounds.getSize(new THREE.Vector3());let fov=camera.fov*Math.PI/180;distance=Math.max(220,Math.max(size.x,size.z)*1.45/Math.tan(fov/2));positionCamera()}}}
function updateBall(){marble.visible=true;if(currentBall){marble.position.copy(world(currentBall,(currentBall.height??(floorY(currentBall.z||0)+21))-5))}else{let t=currentTiles.get('1,3');marble.position.copy(world(center(1,3),t?floorY(t.z)+16:16))}ballHalo.position.copy(marble.position);ballLight.position.copy(marble.position)}
window.addEventListener('rolling-update',e=>{const d=e.detail;currentBall=d.ball;const incoming=JSON.stringify(d.tiles);if(incoming!==window.__rollingTiles3D){window.__rollingTiles3D=incoming;currentTiles=new Map(d.tiles);rebuild()}else updateBall()});
let azimuth=-.7,elevation=.9,distance=760,target=new THREE.Vector3(0,0,0);
const initial={azimuth,elevation,distance};
function positionCamera(){camera.position.set(target.x+distance*Math.sin(azimuth)*Math.cos(elevation),target.y+distance*Math.sin(elevation),target.z+distance*Math.cos(azimuth)*Math.cos(elevation));camera.lookAt(target)}
function pan(dx,dy){const factor=distance/650;const right=new THREE.Vector3(Math.cos(azimuth),0,-Math.sin(azimuth));const forward=new THREE.Vector3(Math.sin(azimuth),0,Math.cos(azimuth));target.addScaledVector(right,-dx*factor);target.addScaledVector(forward,dy*factor);positionCamera()}
function resetCamera(){azimuth=initial.azimuth;elevation=initial.elevation;if(currentTiles.size){let bounds=new THREE.Box3().setFromObject(objects);bounds.getCenter(target);let size=bounds.getSize(new THREE.Vector3());distance=Math.max(220,Math.max(size.x,size.z)*1.45/Math.tan(camera.fov*Math.PI/360))}else{distance=initial.distance;target.set(0,0,0)}positionCamera()}
positionCamera();host.style.position='relative';
const help=document.createElement('div');help.textContent='1 Finger: Tisch verschieben · 2 Finger: drehen & zoomen';Object.assign(help.style,{position:'absolute',left:'10px',bottom:'10px',background:'rgba(255,255,255,.88)',borderRadius:'9px',padding:'7px 10px',font:'12px system-ui',pointerEvents:'none',color:'#19334f'});host.append(help);
const home=document.createElement('button');home.textContent='⌂ Gesamtansicht';Object.assign(home.style,{position:'absolute',right:'10px',top:'10px',padding:'10px',background:'rgba(255,255,255,.95)',font:'14px system-ui'});home.onclick=resetCamera;host.append(home);
// Touch Events are used explicitly for reliable multi-touch on iPad Safari.
renderer.domElement.style.touchAction='none';
const pad=document.createElement('div');Object.assign(pad.style,{position:'absolute',left:'10px',top:'10px',display:'flex',gap:'5px',flexWrap:'wrap',maxWidth:'65%'});host.append(pad);
for(let [label,action] of [['◀',()=>pan(-35,0)],['▶',()=>pan(35,0)],['▲',()=>pan(0,-35)],['▼',()=>pan(0,35)],['⟲',()=>{azimuth+=.18;positionCamera()}],['⟳',()=>{azimuth-=.18;positionCamera()}],['＋',()=>{distance=Math.max(90,distance*.8);positionCamera()}],['－',()=>{distance=Math.min(1800,distance*1.25);positionCamera()}]]){let btn=document.createElement('button');btn.textContent=label;btn.setAttribute('aria-label','Kamera '+label);Object.assign(btn.style,{padding:'8px 11px',fontSize:'18px',background:'rgba(255,255,255,.94)',touchAction:'manipulation'});btn.addEventListener('click',action);pad.append(btn)}
let walkMode=false,walkYaw=0,walkPitch=0,walkPos=new THREE.Vector3(-250,34,230),moveX=0,moveY=0;
const walkButton=document.createElement('button');walkButton.textContent='🚶 Rundgang';Object.assign(walkButton.style,{position:'absolute',right:'10px',top:'58px',padding:'10px',background:'rgba(255,255,255,.96)',font:'14px system-ui'});host.append(walkButton);
const joystick=document.createElement('div');Object.assign(joystick.style,{display:'none',position:'absolute',left:'16px',bottom:'48px',width:'126px',height:'126px',borderRadius:'50%',background:'rgba(20,60,110,.25)',border:'2px solid rgba(20,60,110,.5)',touchAction:'none',userSelect:'none'});host.append(joystick);
const stick=document.createElement('div');Object.assign(stick.style,{position:'absolute',width:'56px',height:'56px',left:'33px',top:'33px',borderRadius:'50%',background:'rgba(24,91,170,.85)',border:'2px solid white',pointerEvents:'none'});joystick.append(stick);
function setWalk(active){walkMode=active;walkButton.textContent=active?'🧊 Tischansicht':'🚶 Rundgang';joystick.style.display=active?'block':'none';pad.style.display=active?'none':'flex';help.textContent=active?'Links: laufen · Rechts: umsehen':'1 Finger: Tisch verschieben · 2 Finger: drehen & zoomen';moveX=moveY=0;if(active){walkPos.set(-250,34,230);walkYaw=-.7;walkPitch=0;updateWalkCamera()}else resetCamera()}
function updateWalkCamera(){camera.position.copy(walkPos);camera.lookAt(walkPos.x+Math.sin(walkYaw)*Math.cos(walkPitch),walkPos.y+Math.sin(walkPitch),walkPos.z-Math.cos(walkYaw)*Math.cos(walkPitch))}
walkButton.onclick=()=>setWalk(!walkMode);
const findBall=document.createElement('button');findBall.textContent='🔵 Kugel finden';Object.assign(findBall.style,{position:'absolute',right:'10px',top:'106px',padding:'10px',background:'rgba(255,255,255,.96)',font:'14px system-ui'});host.append(findBall);
findBall.onclick=()=>{let p=marble.position;if(walkMode){walkPos.set(p.x+110,Math.max(34,p.y+45),p.z+120);walkYaw=Math.atan2(p.x-walkPos.x,-(p.z-walkPos.z));walkPitch=Math.atan2(p.y-walkPos.y,Math.hypot(p.x-walkPos.x,p.z-walkPos.z));updateWalkCamera()}else{target.copy(p);distance=270;positionCamera()}};

home.onclick=()=>{if(walkMode)setWalk(true);else resetCamera()};
let joyId=null;
function moveStick(e){const rect=joystick.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;moveX=Math.max(-1,Math.min(1,(e.clientX-cx)/43));moveY=Math.max(-1,Math.min(1,(cy-e.clientY)/43));const l=Math.hypot(moveX,moveY);if(l>1){moveX/=l;moveY/=l}stick.style.transform='translate('+moveX*37+'px,'+(-moveY*37)+'px)'}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();joyId=e.pointerId;joystick.setPointerCapture(joyId);moveStick(e)});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)moveStick(e)});
function releaseStick(e){if(e.pointerId!==joyId)return;joyId=null;moveX=moveY=0;stick.style.transform='translate(0,0)'}
joystick.addEventListener('pointerup',releaseStick);joystick.addEventListener('pointercancel',releaseStick);
let touches=new Map(),gesture=null,usingTouch=false;
function gestureData(){let p=[...touches.values()];if(p.length<2)return null;return{mid:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},dist:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),angle:Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x)}}
function applyMove(id,x,y){if(!touches.has(id))return;let prev=touches.get(id);touches.set(id,{x,y});if(walkMode){walkYaw-=(x-prev.x)*.006;walkPitch=Math.max(-1.2,Math.min(1.2,walkPitch-(y-prev.y)*.005));updateWalkCamera();return}if(touches.size===1){pan(x-prev.x,y-prev.y)}else if(touches.size===2){let next=gestureData();if(gesture&&next){pan(next.mid.x-gesture.mid.x,next.mid.y-gesture.mid.y);if(gesture.dist>5&&next.dist>5)distance=Math.max(90,Math.min(1800,distance*gesture.dist/next.dist));let da=next.angle-gesture.angle;if(da>Math.PI)da-=2*Math.PI;if(da< -Math.PI)da+=2*Math.PI;azimuth-=da;positionCamera()}gesture=next}}
renderer.domElement.addEventListener('touchstart',e=>{usingTouch=true;e.preventDefault();for(let t of e.changedTouches)touches.set(t.identifier,{x:t.clientX,y:t.clientY});gesture=gestureData()},{passive:false});
renderer.domElement.addEventListener('touchmove',e=>{e.preventDefault();for(let t of e.changedTouches)applyMove(t.identifier,t.clientX,t.clientY)},{passive:false});
for(let event of ['touchend','touchcancel'])renderer.domElement.addEventListener(event,e=>{e.preventDefault();for(let t of e.changedTouches)touches.delete(t.identifier);gesture=gestureData()},{passive:false});
renderer.domElement.addEventListener('pointerdown',e=>{if(usingTouch||e.pointerType==='touch')return;renderer.domElement.setPointerCapture(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=gestureData()});
renderer.domElement.addEventListener('pointermove',e=>{if(usingTouch||e.pointerType==='touch')return;applyMove(e.pointerId,e.clientX,e.clientY)});
for(let event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,e=>{if(usingTouch||e.pointerType==='touch')return;touches.delete(e.pointerId);gesture=gestureData()});
host.addEventListener('contextmenu',e=>e.preventDefault());
host.addEventListener('wheel',e=>{e.preventDefault();if(walkMode)return;if(e.shiftKey)pan(e.deltaX,e.deltaY);else{distance=Math.max(90,Math.min(1800,distance*Math.exp(e.deltaY*.001)));positionCamera()}},{passive:false});
let previousFrame=0;function animate(now=0){requestAnimationFrame(animate);let dt=Math.min(.05,(now-previousFrame)/1000||0);previousFrame=now;if(walkMode){let speed=145*dt;walkPos.x+=(Math.sin(walkYaw)*moveY+Math.cos(walkYaw)*moveX)*speed;walkPos.z+=(-Math.cos(walkYaw)*moveY+Math.sin(walkYaw)*moveX)*speed;walkPos.x=Math.max(-650,Math.min(650,walkPos.x));walkPos.z=Math.max(-500,Math.min(500,walkPos.z));updateWalkCamera()}if(host.classList.contains('active')){let w=host.clientWidth,h=host.clientHeight;if(w&&h&&(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio()))){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}renderer.render(scene,camera)}}animate();
