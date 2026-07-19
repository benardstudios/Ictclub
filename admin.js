// =============================================
// js/admin.js — Admin Dashboard Logic
// ICT Club Uganda
// =============================================

import {
  auth, db, ref, push, set, update, remove, onValue,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  isAdmin, ADMIN_EMAILS
} from './firebase.js';

// ---- State ----
let currentUser = null;
let currentSection = 'dashboard';
let editingId   = null;
let allData     = { lessons:{}, projects:{}, news:{}, events:{}, gallery:{}, feedback:{} };

// ---- DOM helpers ----
const $ = id => document.getElementById(id);
const escHtml = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const formatDateShort = ts => ts ? new Date(ts).toLocaleDateString('en-UG',{day:'numeric',month:'short',year:'numeric'}) : '—';

// ---- Toast ----
function toast(msg, type='success'){
  let t=$('adminToast');
  if(!t){ t=document.createElement('div'); t.id='adminToast'; t.className='toast'; document.body.appendChild(t); }
  const colors={success:{bg:'#f0fff4',border:'#68d391',color:'#276749'},error:{bg:'#fff5f5',border:'#fc8181',color:'#9b2c2c'},info:{bg:'#ebf8ff',border:'#90cdf4',color:'#2c5282'}};
  const icons={success:'✅',error:'❌',info:'ℹ️'};
  const c=colors[type]||colors.info;
  t.style.cssText=`background:${c.bg};border:1px solid ${c.border};color:${c.color};`;
  t.innerHTML=`<span>${icons[type]}</span><span>${msg}</span>`;
  t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),3500);
}

// ---- Section navigation ----
window.showSection = function(name){
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
  const sec=$(`sec-${name}`); if(sec) sec.classList.add('active');
  document.querySelectorAll('.admin-sidebar a,.admin-sidebar button').forEach(a=>{
    a.classList.toggle('active', a.dataset.section===name);
  });
  currentSection=name;
  const title=$('sectionTitle');
  if(title) title.textContent = name.charAt(0).toUpperCase()+name.slice(1)+' Management';
};

// ---- Auth guard ----
onAuthStateChanged(auth, user=>{
  // Hide page loader once auth state is known
  const loader = document.getElementById('pageLoader');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => { loader.style.display = 'none'; }, 450);
  }

  if(user && isAdmin(user.email)){
    currentUser=user;
    $('adminLogin')  && ($('adminLogin').style.display='none');
    $('adminApp')    && ($('adminApp').style.display='grid');
    $('adminUserEmail') && ($('adminUserEmail').textContent=user.email);
    loadAllData();
    showSection('dashboard');
  } else {
    $('adminLogin') && ($('adminLogin').style.display='flex');
    $('adminApp')   && ($('adminApp').style.display='none');
    if(user && !isAdmin(user.email)){
      signOut(auth);
      const alertEl=$('loginAlert');
      if(alertEl) alertEl.innerHTML=`<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> Access denied. Admin privileges required.</div>`;
    }
  }
});

// ---- Login ----
window.adminLogin = async function(){
  const email=$('adminEmail').value.trim();
  const pwd  =$('adminPwd').value;
  const alertEl=$('loginAlert');
  alertEl.innerHTML='';
  if(!email||!pwd){ alertEl.innerHTML=`<div class="alert alert-error">Please enter email and password.</div>`; return; }
  try{
    await signInWithEmailAndPassword(auth,email,pwd);
  } catch(err){
    const msgs={'auth/wrong-password':'Incorrect password.','auth/user-not-found':'No account found.','auth/invalid-credential':'Invalid credentials.'};
    alertEl.innerHTML=`<div class="alert alert-error">${msgs[err.code]||'Login failed.'}</div>`;
  }
};

// ---- Logout ----
window.adminLogout = async function(){
  await signOut(auth);
  toast('Signed out.','info');
};

// ---- Load all data from Firebase ----
function loadAllData(){
  const collections=['lessons','projects','news','events','gallery','feedback'];
  collections.forEach(col=>{
    onValue(ref(db,col), snap=>{
      const data=snap.val()||{};
      allData[col]=data;
      updateDashStats();
      if(currentSection===col) renderTable(col);
      if(currentSection==='dashboard') renderDashboard();
    });
  });
}

// ---- Dashboard stats ----
function updateDashStats(){
  const counts={
    lessons:  Object.keys(allData.lessons||{}).length,
    projects: Object.keys(allData.projects||{}).length,
    news:     Object.keys(allData.news||{}).length,
    events:   Object.keys(allData.events||{}).length,
    gallery:  Object.keys(allData.gallery||{}).length,
    feedback: Object.keys(allData.feedback||{}).length,
  };
  Object.entries(counts).forEach(([k,v])=>{
    const el=$(`stat-${k}`); if(el) el.textContent=v;
  });
  const unread=Object.values(allData.feedback||{}).filter(f=>f.status==='unread').length;
  const badgeEl=$('feedbackBadge'); if(badgeEl) badgeEl.textContent=unread||'';
}

function renderDashboard(){
  updateDashStats();
  // Recent feedback
  const fbList=$('recentFeedback');
  if(fbList){
    const items=Object.entries(allData.feedback||{}).map(([k,v])=>({...v,id:k})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5);
    if(!items.length){ fbList.innerHTML='<p style="color:var(--text-sub);font-size:.9rem;">No feedback yet.</p>'; return; }
    fbList.innerHTML=items.map(f=>`
      <div style="padding:.75rem;background:var(--surface-2);border-radius:10px;margin-bottom:.6rem;display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;">
        <div style="flex:1;">
          <strong style="font-size:.88rem;">${escHtml(f.name)}</strong>
          <span class="badge ${f.status==='unread'?'badge-blue':'badge-green'}" style="font-size:.65rem;margin-left:.4rem;">${f.status||'unread'}</span>
          <p style="font-size:.8rem;color:var(--text-sub);margin:.2rem 0 0;">${escHtml(f.subject||'')}</p>
        </div>
        <span style="font-size:.75rem;color:var(--text-light);white-space:nowrap;">${formatDateShort(f.createdAt)}</span>
      </div>`).join('');
  }
}

// =====================
// GENERIC TABLE RENDERER
// =====================
function renderTable(col){
  const tbody=$(`${col}Tbody`);
  if(!tbody) return;
  const items=Object.entries(allData[col]||{}).map(([k,v])=>({...v,id:k})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(!items.length){
    tbody.innerHTML=`<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-sub);">No ${col} yet. Add the first one above.</td></tr>`;
    return;
  }
  tbody.innerHTML=items.map(item=>rowHtml(col,item)).join('');
}

function rowHtml(col,item){
  const date=formatDateShort(item.createdAt);
  const actions=`
    <div class="actions">
      <button class="btn btn-outline btn-sm" onclick="editItem('${col}','${item.id}')"><i class="fas fa-edit"></i></button>
      <button class="btn btn-danger btn-sm" onclick="deleteItem('${col}','${item.id}','${escHtml(item.title||item.name||item.subject||'item')}')"><i class="fas fa-trash"></i></button>
    </div>`;

  const colMap = {
    lessons:  `<td>${escHtml(item.title)}</td><td><span class="badge badge-blue" style="text-transform:capitalize;">${escHtml(item.category||'')}</span></td><td><span class="badge ${item.difficulty==='advanced'?'badge-red':item.difficulty==='intermediate'?'badge-gold':'badge-green'}" style="text-transform:capitalize;">${escHtml(item.difficulty||'beginner')}</span></td><td>${escHtml(item.author||'—')}</td><td>${date}</td><td>${actions}</td>`,
    projects: `<td>${escHtml(item.title)}</td><td><span class="badge badge-blue" style="text-transform:capitalize;">${escHtml(item.category||'')}</span></td><td>${escHtml(item.technologies||'—')}</td><td>${escHtml(item.team||'—')}</td><td>${date}</td><td>${actions}</td>`,
    news:     `<td>${escHtml(item.title)}</td><td><span class="badge badge-blue" style="text-transform:capitalize;">${escHtml(item.tag||'General')}</span></td><td>${escHtml(item.author||'—')}</td><td>${date}</td><td>${actions}</td>`,
    events:   `<td>${escHtml(item.title)}</td><td><span class="badge badge-blue" style="text-transform:capitalize;">${escHtml(item.type||'')}</span></td><td>${escHtml(item.date||'—')}</td><td>${escHtml(item.venue||'—')}</td><td>${date}</td><td>${actions}</td>`,
    gallery:  `<td>${escHtml(item.title||item.caption||'Untitled')}</td><td><span class="badge badge-blue" style="text-transform:capitalize;">${escHtml(item.tag||'')}</span></td><td>${item.url?`<a href="${escHtml(item.url)}" target="_blank" style="font-size:.8rem;">View Image ↗</a>`:'—'}</td><td>${date}</td><td>${actions}</td>`,
    feedback: `<td>${escHtml(item.name)}</td><td>${escHtml(item.email)}</td><td><span class="badge badge-blue" style="text-transform:capitalize;">${escHtml(item.category||'')}</span></td><td>${escHtml(item.subject||'')}</td><td><span class="badge ${item.status==='unread'?'badge-blue':'badge-green'}">${item.status||'unread'}</span></td><td>${date}</td>
      <td><div class="actions">
        <button class="btn btn-outline btn-sm" onclick="viewFeedback('${item.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteItem('feedback','${item.id}','feedback')"><i class="fas fa-trash"></i></button>
      </div></td>`,
  };
  return `<tr>${colMap[col]||''}</tr>`;
}

// =====================
// EDIT / DELETE / VIEW
// =====================
window.editItem = function(col, id){
  editingId=id;
  const item={...allData[col][id], id};
  populateForm(col, item);
  openModal(`${col}Modal`);
};

window.deleteItem = function(col, id, name){
  if(!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  remove(ref(db,`${col}/${id}`))
    .then(()=>toast(`Deleted successfully.`))
    .catch(()=>toast('Delete failed.','error'));
};

window.viewFeedback = function(id){
  const f={...allData.feedback[id],id};
  const modal=$('feedbackViewModal');
  if(!modal) return;
  $('fbViewBody').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:.75rem;">
      <div><strong>From:</strong> ${escHtml(f.name)} &lt;${escHtml(f.email)}&gt;</div>
      ${f.phone?`<div><strong>Phone:</strong> ${escHtml(f.phone)}</div>`:''}
      <div><strong>Category:</strong> <span class="badge badge-blue" style="text-transform:capitalize;">${escHtml(f.category||'')}</span></div>
      <div><strong>Subject:</strong> ${escHtml(f.subject||'')}</div>
      <div><strong>Date:</strong> ${formatDateShort(f.createdAt)}</div>
      <div style="background:var(--surface-2);border-radius:10px;padding:1rem;margin-top:.5rem;line-height:1.8;font-size:.92rem;">${escHtml(f.message||'').replace(/\n/g,'<br>')}</div>
    </div>`;
  // Mark as read
  update(ref(db,`feedback/${id}`),{status:'read'});
  openModal('feedbackViewModal');
};

// =====================
// OPEN ADD MODAL
// =====================
window.openAddModal = function(col){
  editingId=null;
  clearForm(col);
  openModal(`${col}Modal`);
  $(`${col}ModalTitle`) && ($(`${col}ModalTitle`).textContent=`Add ${col.charAt(0).toUpperCase()+col.slice(1)}`);
};

// =====================
// SAVE (Create / Update)
// =====================
window.saveItem = async function(col){
  const data=collectForm(col);
  if(!data) return;

  try{
    if(editingId){
      await update(ref(db,`${col}/${editingId}`),{...data, updatedAt:Date.now()});
      toast(`${col.charAt(0).toUpperCase()+col.slice(1)} updated!`);
    } else {
      const newRef=push(ref(db,col));
      await set(newRef,{...data, id:newRef.key, createdAt:Date.now()});
      toast(`${col.charAt(0).toUpperCase()+col.slice(1)} added!`);
    }
    closeModal(`${col}Modal`);
    editingId=null;
  } catch(err){
    console.error(err);
    toast('Save failed. Check console.','error');
  }
};

// =====================
// FORM HELPERS
// =====================
function val(id){ const el=$(id); return el?(el.value||'').trim():''; }

function collectForm(col){
  const forms={
    lessons:{
      title:val('lTitle'), category:val('lCategory'), difficulty:val('lDifficulty'),
      description:val('lDescription'), content:val('lContent'), resources:val('lResources'),
      duration:val('lDuration'), author:val('lAuthor')
    },
    projects:{
      title:val('pTitle'), category:val('pCategory'), description:val('pDescription'),
      technologies:val('pTechnologies'), team:val('pTeam'), year:val('pYear'),
      imageUrl:val('pImageUrl'), link:val('pLink')
    },
    news:{
      title:val('nTitle'), tag:val('nTag'), author:val('nAuthor'),
      summary:val('nSummary'), content:val('nContent')
    },
    events:{
      title:val('eTitle'), type:val('eType'), date:val('eDate'),
      time:val('eTime'), venue:val('eVenue'), organiser:val('eOrganiser'),
      capacity:val('eCapacity'), description:val('eDescription'), notes:val('eNotes')
    },
    gallery:{
      title:val('gTitle'), caption:val('gCaption'), url:val('gUrl'), tag:val('gTag')
    },
  };
  const data=forms[col];
  if(!data) return null;
  const firstKey=Object.keys(data)[0];
  if(!data[firstKey]||!data[firstKey].trim()){ toast('Please fill in the required fields.','error'); return null; }
  return data;
}

function populateForm(col, item){
  const fieldMap={
    lessons: ['lTitle:title','lCategory:category','lDifficulty:difficulty','lDescription:description','lContent:content','lResources:resources','lDuration:duration','lAuthor:author'],
    projects:['pTitle:title','pCategory:category','pDescription:description','pTechnologies:technologies','pTeam:team','pYear:year','pImageUrl:imageUrl','pLink:link'],
    news:    ['nTitle:title','nTag:tag','nAuthor:author','nSummary:summary','nContent:content'],
    events:  ['eTitle:title','eType:type','eDate:date','eTime:time','eVenue:venue','eOrganiser:organiser','eCapacity:capacity','eDescription:description','eNotes:notes'],
    gallery: ['gTitle:title','gCaption:caption','gUrl:url','gTag:tag'],
  };
  (fieldMap[col]||[]).forEach(pair=>{
    const [elId,key]=pair.split(':');
    const el=$(elId); if(el) el.value=item[key]||'';
  });
  $(`${col}ModalTitle`) && ($(`${col}ModalTitle`).textContent=`Edit ${col.charAt(0).toUpperCase()+col.slice(1)}`);
}

function clearForm(col){
  const ids={
    lessons: ['lTitle','lCategory','lDifficulty','lDescription','lContent','lResources','lDuration','lAuthor'],
    projects:['pTitle','pCategory','pDescription','pTechnologies','pTeam','pYear','pImageUrl','pLink'],
    news:    ['nTitle','nTag','nAuthor','nSummary','nContent'],
    events:  ['eTitle','eType','eDate','eTime','eVenue','eOrganiser','eCapacity','eDescription','eNotes'],
    gallery: ['gTitle','gCaption','gUrl','gTag'],
  };
  (ids[col]||[]).forEach(id=>{ const el=$(id); if(el) el.value=''; });
}

// =====================
// Modal open/close
// =====================
window.openModal = function(id){
  const m=$(id); if(m){ m.classList.add('open'); document.body.style.overflow='hidden'; }
};
window.closeModal = function(id){
  const m=$(id); if(m){ m.classList.remove('open'); document.body.style.overflow=''; }
};

document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    document.querySelectorAll('.modal-overlay.open').forEach(m=>{ m.classList.remove('open'); document.body.style.overflow=''; });
  }
});

// =====================
// Dark mode
// =====================
(function(){
  const btn=$('modeBtn');
  const body=document.body;
  if(localStorage.getItem('ict-theme')==='dark') body.classList.add('dark-mode');
  if(btn){
    btn.textContent=body.classList.contains('dark-mode')?'☀️ Light':'🌙 Dark';
    btn.addEventListener('click',()=>{
      body.classList.toggle('dark-mode');
      localStorage.setItem('ict-theme',body.classList.contains('dark-mode')?'dark':'light');
      btn.textContent=body.classList.contains('dark-mode')?'☀️ Light':'🌙 Dark';
    });
  }
})();

// =====================
// Hamburger
// =====================
(function(){
  const h=$('hamburger'), n=$('navLinks');
  if(h&&n) h.addEventListener('click',()=>n.classList.toggle('open'));
})();

// Export for inline HTML access
export { showSection, openAddModal, saveItem, editItem, deleteItem, viewFeedback, adminLogin, adminLogout };
