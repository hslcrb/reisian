/** Self-contained offline runtime. Keep this function free of module-scope dependencies. */
export function mountSite() {
  'use strict';
  const body = document.body;
  const editor = body.dataset.mode === 'editor';
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = body.dataset.reducedMotion === 'true' || reducedQuery.matches;
  let explicitPause = false;
  const motionButton = document.querySelector('[data-motion-toggle]');
  const scenes = [];
  const send = (message) => { if (editor && window.parent !== window) window.parent.postMessage(message, '*'); };
  const updateMotion = () => {
    body.classList.toggle('motion-paused', paused);
    if (motionButton) { motionButton.setAttribute('aria-pressed', String(paused)); motionButton.textContent = paused ? 'Play motion' : 'Pause motion'; }
  };
  updateMotion();
  if (motionButton) motionButton.addEventListener('click', () => { explicitPause = true; paused = !paused; updateMotion(); });
  reducedQuery.addEventListener('change', () => { if (!explicitPause) { paused = reducedQuery.matches || body.dataset.reducedMotion === 'true'; updateMotion(); } });
  let lastTop = 0, scrollPending = false;
  const updateScroll = () => {
    scrollPending = false;
    document.querySelectorAll('[data-motion]').forEach((section) => {
      const box = section.getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (innerHeight / 2 - box.top - box.height / 2) / innerHeight));
      const target = section.querySelector('.section-content');
      if (target) { const motion = section.dataset.motion; target.style.transform = paused ? '' : motion === 'parallax' ? `translateY(${p * 36}px)` : motion === 'rotate' ? `rotate(${p * 2}deg)` : ''; }
    });
    if (Math.abs(scrollY-lastTop)>1) { lastTop=scrollY; send({ type: 'reisian:scroll', top: scrollY }); }
  };
  addEventListener('scroll', () => { if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: 0.08 });
  document.querySelectorAll('[data-motion="reveal"]').forEach(el => { el.classList.add('will-reveal'); observer.observe(el); });
  function select(id) { document.querySelectorAll('[data-section-id]').forEach(el => el.classList.toggle('is-selected', el.dataset.sectionId === id)); }
  if (editor) {
    document.addEventListener('click', (event) => {
      const section = event.target.closest('[data-section-id]');
      if (section) { select(section.dataset.sectionId); send({ type: 'reisian:select', sectionId: section.dataset.sectionId }); }
      if (event.target.closest('a')) event.preventDefault();
    });
    document.addEventListener('dblclick', (event) => {
      const field = event.target.closest('[data-edit]');
      if (!field || !['title', 'body', 'eyebrow', 'buttonLabel'].includes(field.dataset.edit)) return;
      event.preventDefault(); field.contentEditable = 'plaintext-only'; field.focus();
      const range = document.createRange(); range.selectNodeContents(field); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    });
    document.addEventListener('paste', (event) => { const field = event.target.closest('[data-edit]'); if (field && field.isContentEditable) { event.preventDefault(); const text = event.clipboardData.getData('text/plain').slice(0,20000); document.execCommand('insertText', false, text); } });
    document.addEventListener('focusout', (event) => {
      const field = event.target.closest('[data-edit]');
      if (field && field.isContentEditable) { field.contentEditable = 'false'; const section = field.closest('[data-section-id]'); send({ type: 'reisian:edit', sectionId: section.dataset.sectionId, field: field.dataset.edit, value: field.innerText.slice(0, field.dataset.edit === 'body' ? 20000 : field.dataset.edit === 'title' ? 2000 : field.dataset.edit === 'eyebrow' ? 300 : 200) }); }
    });
    document.addEventListener('keydown', event => { if (event.target.isContentEditable && (event.key === 'Escape' || (event.key === 'Enter' && (event.metaKey || event.ctrlKey)))) { event.preventDefault(); event.target.blur(); } });
    addEventListener('message', (event) => {
      if (event.source !== window.parent || !event.data || typeof event.data !== 'object') return;
      const data = event.data;
      if (data.type === 'reisian:select' && typeof data.sectionId === 'string') select(data.sectionId);
      if (data.type === 'reisian:scrollTo' && typeof data.sectionId === 'string') { const el = Array.from(document.querySelectorAll('[data-section-id]')).find(s => s.dataset.sectionId === data.sectionId); if (el) el.scrollIntoView({ behavior: paused ? 'instant' : 'smooth', block: 'center' }); }
      if (data.type === 'reisian:restoreScroll' && Number.isFinite(data.top)) scrollTo({ top: Math.max(0, data.top), behavior: 'instant' });
    });
  }
  if (!editor) document.addEventListener('click', (event) => { const link = event.target.closest('a[href^="#"]'); if (!link) return; const anchor = link.getAttribute('href').slice(1); const target = document.getElementById(anchor) || Array.from(document.querySelectorAll('[data-anchor]')).find(el => el.dataset.anchor === anchor); if (target) { event.preventDefault(); target.scrollIntoView({behavior: paused ? 'instant' : 'smooth'}); } });
  function vector(x, y, z) { return [x,y,z]; }
  function sub(a,b) { return a.map((v,i)=>v-b[i]); }
  function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
  function normalize(v) { const l=Math.hypot(...v)||1; return v.map(n=>n/l); }
  function point(shape,u,v) {
    const a=u*Math.PI*2,b=v*Math.PI*2;
    if(shape==='sphere') { const lat=v*Math.PI; return vector(Math.sin(lat)*Math.cos(a)*1.2,Math.cos(lat)*1.2,Math.sin(lat)*Math.sin(a)*1.2); }
    if(shape==='wave') { return vector((u-.5)*3,Math.sin(u*9+v*6)*.23+Math.cos(v*9)*.16,(v-.5)*3); }
    if(shape==='knot') {
      const center=(t)=>[(1+.3*Math.cos(3*t))*Math.cos(2*t),(1+.3*Math.cos(3*t))*Math.sin(2*t),.42*Math.sin(3*t)];
      const c=center(a),t=normalize(sub(center(a+.001),c)),n=normalize(cross(t,[0,0,1])),d=normalize(cross(t,n));
      return c.map((x,i)=>(x+.24*(Math.cos(b)*n[i]+Math.sin(b)*d[i]))*.95);
    }
    return vector((.93+.39*Math.cos(b))*Math.cos(a),(.93+.39*Math.cos(b))*Math.sin(a),.39*Math.sin(b));
  }
  function geometry(shape,wire) {
    const positions=[],normals=[]; const nu=shape==='knot'?144:80,nv=shape==='wave'?50:40;
    function add(u,v) { const p=point(shape,u,v), n=normalize(cross(sub(point(shape,u+.0001,v),p),sub(point(shape,u,v+.0001),p))); positions.push(...p); normals.push(...n); }
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const u=i/nu,v=j/nv,U=(i+1)/nu,V=(j+1)/nv; if(wire){add(u,v);add(U,v);add(u,v);add(u,V);}else{add(u,v);add(U,v);add(U,V);add(u,v);add(U,V);add(u,V);}}
    return {positions:new Float32Array(positions),normals:new Float32Array(normals)};
  }
  document.querySelectorAll('canvas[data-scene]').forEach((canvas) => {
    let gl;
    try {
      const settings=JSON.parse(canvas.dataset.scene);
      gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false}); if(!gl)return;
      function shader(type,source) { const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Shader unavailable');return s; }
      const vertex=shader(gl.VERTEX_SHADER,`attribute vec3 position; attribute vec3 normal; uniform vec2 rotation; uniform float aspect; uniform float scale; varying vec3 N; varying vec3 P;
        void main(){float a=rotation.x,b=rotation.y;mat3 rx=mat3(1.,0.,0.,0.,cos(a),sin(a),0.,-sin(a),cos(a));mat3 ry=mat3(cos(b),0.,-sin(b),0.,1.,0.,sin(b),0.,cos(b)); vec3 p=ry*rx*position; N=ry*rx*normal;P=p;float z=4.8-p.z;gl_Position=vec4(p.x*scale*2.6/aspect,p.y*scale*2.6,z-.2,z);}`);
      const fragment=shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 N;varying vec3 P;uniform vec3 color;void main(){vec3 n=normalize(N);if(!gl_FrontFacing)n=-n;vec3 l=normalize(vec3(-.65,.9,1.5));float diffuse=max(dot(n,l),0.);vec3 eye=normalize(vec3(0.,0.,4.8)-P);float spec=pow(max(dot(n,normalize(l+eye)),0.),42.);float rim=pow(1.-max(dot(n,eye),0.),3.);vec3 result=color*(.38+.62*diffuse)+vec3(.95,.92,.82)*spec*.38+vec3(.2,.23,.16)*rim*.2;gl_FragColor=vec4(result,1.);}`);
      const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Program unavailable');gl.useProgram(program);
      const mesh=geometry(settings.shape,settings.wireframe);
      [['position',mesh.positions],['normal',mesh.normals]].forEach(([name,values])=>{const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);});
      const uniforms={rotation:gl.getUniformLocation(program,'rotation'),aspect:gl.getUniformLocation(program,'aspect'),scale:gl.getUniformLocation(program,'scale'),color:gl.getUniformLocation(program,'color')};
      const c=settings.color.match(/[a-f0-9]{2}/gi).map(h=>parseInt(h,16)/255);gl.uniform3fv(uniforms.color,c);gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
      let rotation=0,px=0,py=0,lost=false;
      canvas.addEventListener('webglcontextlost', e=>{e.preventDefault();lost=true;canvas.parentElement.classList.remove('webgl-ready');});
      canvas.addEventListener('pointermove',e=>{if(paused)return;const r=canvas.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;});
      canvas.addEventListener('pointerleave',()=>{px=0;py=0;});
      const draw=(delta)=>{
        if(lost)return;
        const rect=canvas.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;
        const ratio=Math.min(devicePixelRatio||1,2);const w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        if(!paused)rotation+=delta*settings.speed*.00022;
        gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniform2f(uniforms.rotation,-.58+Math.sin(rotation)*.24+(paused?0:py*.2),-.3+rotation+(paused?0:px*.3));gl.uniform1f(uniforms.aspect,w/h);gl.uniform1f(uniforms.scale,settings.scale);gl.drawArrays(settings.wireframe?gl.LINES:gl.TRIANGLES,0,mesh.positions.length/3);canvas.parentElement.classList.add('webgl-ready');
      };
      scenes.push(draw);draw(0);
    } catch { canvas.parentElement.classList.remove('webgl-ready'); }
  });
  let previous=performance.now();
  function frame(now) { const dt=Math.min(now-previous,64);previous=now;if(!document.hidden)scenes.forEach(draw=>draw(dt));requestAnimationFrame(frame); }
  if(scenes.length)requestAnimationFrame(frame);
  send({type:'reisian:ready'});
}
