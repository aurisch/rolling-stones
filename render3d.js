import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const host=document.querySelector('#view3d'),scene=new THREE.Scene();scene.background=new THREE.Color(0xdcecf9);
const camera=new THREE.PerspectiveCamera(43,1,.1,3000),renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x738398,2.2));
const sun=new THREE.DirectionalLight(0xffffff,2.3);sun.position.set(-140,280,180);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-600;sun.shadow.camera.right=600;sun.shadow.camera.top=600;sun.shadow.camera.bottom=-600;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1400,1100),new THREE.MeshStandardMaterial({color:0xcbdfe9,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-9;ground.receiveShadow=true;scene.add(ground);
const objects=new THREE.Group();scene.add(objects);
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.04});
const beige=mat(0xe4bd86),edge=mat(0xb58b5c),support=mat(0x8799ab),rail=mat(0x2477bf),goal=mat(0x52ad74),start=mat(0xe4a64a),ballMat=new THREE.MeshStandardMaterial({color:0x2a65e6,metalness:.65,roughness:.19});
const R=36,H=Math.sqrt(3)*R,DX=54,DY=H,ox=52,oy=55;
const center=(x,y)=>({x:ox+x*DX,y:oy+y*DY+(x%2)*DY/2});
const point=(c,i)=>({x:c.x+R*Math.cos(Math.PI*i/3),y:c.y+R*Math.sin(Math.PI*i/3)});
const midpoint=(c,i)=>{let a=point(c,i),b=point(c,(i+1)%6);return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
const ports=t=>t.type==='curve120'?[t.rot,(t.rot+2)%6]:t.type==='curve60'?[t.rot,(t.rot+1)%6]:[t.rot,(t.rot+3)%6];
const origin={x:330,y:300};
const world=(p,h)=>new THREE.Vector3(p.x-origin.x,h,origin.y-p.y);
const floorY=z=>z*15;
const hexGeo=new THREE.CylinderGeometry(R,R,6,6,1,false,Math.PI/6);
const tube=(points,radius,material)=>{let curve=new THREE.CatmullRomCurve3(points);let mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(12,points.length*3),radius,8,false),material);mesh.castShadow=true;objects.add(mesh)};
let marble=new THREE.Mesh(new THREE.SphereGeometry(9,24,16),ballMat);marble.castShadow=true;scene.add(marble);
function tile(x,y,t){let c=center(x,y),height=floorY(t.z),m=t.type==='end'?goal:t.type==='down'?start:beige;
if(t.type==='support'){let base=new THREE.Mesh(hexGeo,support);base.position.copy(world(c,height-2));base.scale.y=5;base.castShadow=true;objects.add(base);return}
for(let j=0;j<t.z;j++){let block=new THREE.Mesh(hexGeo,support);block.position.copy(world(c,j*15-1));block.scale.y=13;block.castShadow=true;block.receiveShadow=true;objects.add(block)}
let block=new THREE.Mesh(hexGeo,m);block.position.copy(world(c,height+5));block.scale.y=9;block.castShadow=true;block.receiveShadow=true;objects.add(block);
let [a,b]=ports(t),p=midpoint(c,a),q=midpoint(c,b),isCurve=t.type==='curve120'||t.type==='curve60';
let points=[];for(let k=0;k<=18;k++){let f=k/18;let xx=isCurve?(1-f)*(1-f)*p.x+2*(1-f)*f*c.x+f*f*q.x:p.x+(q.x-p.x)*f;let yy=isCurve?(1-f)*(1-f)*p.y+2*(1-f)*f*c.y+f*f*q.y:p.y+(q.y-p.y)*f;let h=height+12+(t.type==='down'?-15*f:t.type==='up'?15*f:0);points.push(world({x:xx,y:yy},h))}
tube(points,3,t.type==='end'?goal:rail);
}
let currentTiles=new Map(),currentBall=null;
function rebuild(){while(objects.children.length){let o=objects.children[0];objects.remove(o);o.traverse?.(n=>{n.geometry?.dispose?.()})}for(let [k,t] of currentTiles){let [x,y]=k.split(',').map(Number);tile(x,y,t)}updateBall()}
function updateBall(){if(currentBall){marble.visible=true;marble.position.copy(world(currentBall,18))}else{marble.visible=true;let t=currentTiles.get('1,3');marble.position.copy(world(center(1,3),t?floorY(t.z)+24:20))}}
window.addEventListener('rolling-update',e=>{const d=e.detail;currentBall=d.ball;const incoming=JSON.stringify(d.tiles);if(incoming!==window.__rollingTiles3D){window.__rollingTiles3D=incoming;currentTiles=new Map(d.tiles);rebuild()}else updateBall()});
let azimuth=-.7,elevation=.9,distance=760,target=new THREE.Vector3(0,0,0);
function positionCamera(){camera.position.set(target.x+distance*Math.sin(azimuth)*Math.cos(elevation),target.y+distance*Math.sin(elevation),target.z+distance*Math.cos(azimuth)*Math.cos(elevation));camera.lookAt(target)}
positionCamera();
let active=new Map(),lastDist=0;
host.addEventListener('pointerdown',e=>{host.setPointerCapture(e.pointerId);active.set(e.pointerId,{x:e.clientX,y:e.clientY})});
host.addEventListener('pointermove',e=>{if(!active.has(e.pointerId))return;let prev=active.get(e.pointerId);active.set(e.pointerId,{x:e.clientX,y:e.clientY});if(active.size===1){azimuth-=(e.clientX-prev.x)*.008;elevation=Math.max(.12,Math.min(1.52,elevation+(e.clientY-prev.y)*.006));positionCamera()}else if(active.size===2){let p=[...active.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(lastDist)distance=Math.max(180,Math.min(1500,distance*lastDist/dist));lastDist=dist;positionCamera()}});
for(let type of ['pointerup','pointercancel'])host.addEventListener(type,e=>{active.delete(e.pointerId);lastDist=0});
host.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(180,Math.min(1500,distance*Math.exp(e.deltaY*.001)));positionCamera()},{passive:false});
function animate(){requestAnimationFrame(animate);if(host.classList.contains('active')){let w=host.clientWidth,h=host.clientHeight;if(w&&h&&(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio()))){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}renderer.render(scene,camera)}}animate();
