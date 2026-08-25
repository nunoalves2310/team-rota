import { createClient } from '@supabase/supabase-js'
import './style.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const app = document.querySelector('#app')
let supabase
let currentUser = null
let currentMember = null
let members = []
let shifts = []
let activeTab = 'rota'
let weekDate = new Date()
let modal = null

const TYPES = ['Office', 'Remote', 'On call', 'Leave', 'Training', 'Other']
const typeClass = {
  Office: 'office', Remote: 'remote', 'On call': 'oncall',
  Leave: 'leave', Training: 'training', Other: 'other'
}

function esc(v='') {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}
function monday(d) {
  const x = new Date(d)
  const n = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - n)
  x.setHours(0,0,0,0)
  return x
}
function isoDate(d) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0,10)
}
function addDays(d,n) { const x = new Date(d); x.setDate(x.getDate()+n); return x }
function fmtDate(d, opts={day:'numeric',month:'short'}) {
  return d.toLocaleDateString('en-GB', opts)
}
function weekLabel() {
  const m = monday(weekDate), s = addDays(m,6)
  return `${fmtDate(m)} – ${fmtDate(s,{day:'numeric',month:'short',year:'numeric'})}`
}
function initials(name) {
  return name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()
}
function isAdmin() { return currentMember?.role === 'admin' }
function shiftFor(memberId, date) {
  return shifts.find(s => s.team_member_id === memberId && s.shift_date === date)
}
function notify(msg, kind='info') {
  const el = document.createElement('div')
  el.className = `toast ${kind}`
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(()=>el.remove(), 3000)
}

async function init() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    app.innerHTML = `<main class="setup"><h1>Team Rota</h1><p>Supabase environment variables are missing.</p><p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in Vercel, then redeploy.</p></main>`
    return
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data } = await supabase.auth.getSession()
  if (data.session) await loadUser(data.session.user)
  else renderLogin()
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) await loadUser(session.user)
    else { currentUser=null; currentMember=null; renderLogin() }
  })
}

async function loadUser(user) {
  currentUser = user
  const { data, error } = await supabase.from('team_members')
    .select('*').eq('auth_user_id', user.id).eq('active', true).single()
  if (error || !data) {
    await supabase.auth.signOut()
    renderLogin()
    notify('This account is not linked to a team member.', 'error')
    return
  }
  currentMember = data
  await loadMembers()
  await loadShifts()
  renderApp()
}

async function loadMembers() {
  const { data, error } = await supabase.from('team_members')
    .select('*').eq('active', true).order('name')
  if (error) { notify(error.message,'error'); return }
  members = data || []
}
async function loadShifts() {
  const m = monday(weekDate), s = addDays(m,6)
  const { data, error } = await supabase.from('rota_shifts')
    .select('*').gte('shift_date', isoDate(m)).lte('shift_date', isoDate(s))
  if (error) { notify(error.message,'error'); return }
  shifts = data || []
}

function renderLogin() {
  app.innerHTML = `
    <main class="login-shell">
      <section class="login-card">
        <div class="logo">TR</div>
        <h1>Team Rota</h1>
        <p class="muted">Sign in to view the team schedule.</p>
        <form id="login-form">
          <label>Username<input id="username" autocomplete="username" required placeholder="e.g. nuno"></label>
          <label>Password<input id="password" type="password" autocomplete="current-password" required></label>
          <button class="primary full" type="submit">Sign in</button>
          <div id="login-error" class="form-error"></div>
        </form>
      </section>
    </main>`
  document.querySelector('#login-form').addEventListener('submit', async e => {
    e.preventDefault()
    const btn = e.currentTarget.querySelector('button')
    btn.disabled = true; btn.textContent = 'Signing in…'
    const username = document.querySelector('#username').value.trim()
    const password = document.querySelector('#password').value
    const { data: email, error: lookupError } = await supabase.rpc('get_login_email', { p_username: username })
    if (lookupError || !email) {
      document.querySelector('#login-error').textContent = 'Invalid username or password.'
      btn.disabled=false; btn.textContent='Sign in'; return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) document.querySelector('#login-error').textContent = 'Invalid username or password.'
    btn.disabled=false; btn.textContent='Sign in'
  })
}

function renderApp() {
  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div class="brand"><div class="logo">TR</div><div><h1>Team Rota</h1><p class="muted">${esc(currentMember.name)} · ${isAdmin()?'Administrator':'Team member'}</p></div></div>
        <nav class="tabs">
          <button data-tab="rota" class="${activeTab==='rota'?'active':''}">Rota</button>
          <button data-tab="requests" class="${activeTab==='requests'?'active':''}">My requests</button>
          ${isAdmin()?'<button data-tab="admin" class="'+(activeTab==='admin'?'active':'')+'">Admin</button>':''}
        </nav>
        <button id="logout" class="ghost">Sign out</button>
      </header>
      <section id="view"></section>
    </main>`
  document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click', async ()=>{
    activeTab=b.dataset.tab; await renderCurrent()
  }))
  document.querySelector('#logout').addEventListener('click',()=>supabase.auth.signOut())
  renderCurrent()
}

async function renderCurrent() {
  const view=document.querySelector('#view')
  if (!view) return
  if (activeTab==='rota') await renderRota(view)
  if (activeTab==='requests') await renderRequests(view)
  if (activeTab==='admin') await renderAdmin(view)
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab))
}

async function renderRota(view) {
  await loadShifts()
  const m=monday(weekDate)
  const days=Array.from({length:7},(_,i)=>addDays(m,i))
  view.innerHTML=`
    <section class="panel">
      <div class="toolbar">
        <div class="nav"><button class="ghost" id="prev">‹</button><strong>${weekLabel()}</strong><button class="ghost" id="next">›</button></div>
        <div class="actions"><button class="ghost" id="today">Today</button>${isAdmin()?'<button class="primary" id="add-member">+ Manage team</button>':''}</div>
      </div>
      <div class="calendar"><div class="grid">
        <div class="head"><div>Team member</div>${days.map(d=>`<div>${d.toLocaleDateString('en-GB',{weekday:'short'})}<small>${fmtDate(d)}</small></div>`).join('')}</div>
        ${members.map(p=>`<div class="row"><div class="person"><span class="avatar">${initials(p.name)}</span>${esc(p.name)}</div>
          ${days.map(d=>{
            const s=shiftFor(p.id,isoDate(d))
            return `<div class="cell">${isAdmin()
              ? `<button class="shift ${s?typeClass[s.shift_type]:'empty'}" data-edit="${p.id}|${isoDate(d)}">${s?esc(s.shift_type):'+'}</button>`
              : `<div class="shift ${s?typeClass[s.shift_type]:'empty'}">${s?esc(s.shift_type):'—'}</div>`}
            </div>`
          }).join('')}
        </div>`).join('')}
      </div></div>
      <div class="legend"><span><i class="dot office"></i>Office</span><span><i class="dot remote"></i>Remote</span><span><i class="dot oncall"></i>On call</span><span><i class="dot leave"></i>Leave</span><span><i class="dot training"></i>Training</span></div>
    </section>`
  document.querySelector('#prev').onclick=async()=>{weekDate=addDays(weekDate,-7);await renderCurrent()}
  document.querySelector('#next').onclick=async()=>{weekDate=addDays(weekDate,7);await renderCurrent()}
  document.querySelector('#today').onclick=async()=>{weekDate=new Date();await renderCurrent()}
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openShiftModal(b.dataset.edit))
  document.querySelector('#add-member')?.addEventListener('click',async()=>{activeTab='admin';await renderCurrent();document.querySelector('#manage-team')?.click()})
}

function openShiftModal(key) {
  const [memberId,date]=key.split('|'), p=members.find(x=>x.id===memberId), existing=shiftFor(memberId,date)
  modal=showModal(`
    <h2>Edit rota</h2><p class="muted">${esc(p.name)} · ${date}</p>
    <label>Assignment<select id="m-type"><option value="">Not scheduled</option>${TYPES.map(t=>`<option ${existing?.shift_type===t?'selected':''}>${t}</option>`).join('')}</select></label>
    <label>Note<input id="m-note" value="${esc(existing?.note||'')}" placeholder="Optional note"></label>
    <div class="modal-actions"><button class="ghost" id="m-cancel">Cancel</button><button class="primary" id="m-save">Save</button></div>`)
  modal.querySelector('#m-cancel').onclick=closeModal
  modal.querySelector('#m-save').onclick=async()=>{
    const type=modal.querySelector('#m-type').value, note=modal.querySelector('#m-note').value.trim()
    if (!type && existing) {
      const {error}=await supabase.from('rota_shifts').delete().eq('id',existing.id)
      if(error) notify(error.message,'error'); else {notify('Shift removed','success');closeModal();await renderCurrent()}
      return
    }
    if (!type) return
    const payload={team_member_id:memberId,shift_date:date,shift_type:type,note}
    const {error}=await supabase.from('rota_shifts').upsert(payload,{onConflict:'team_member_id,shift_date'})
    if(error) notify(error.message,'error'); else {notify('Rota saved','success');closeModal();await renderCurrent()}
  }
}

async function renderRequests(view) {
  const {data:swaps,error:e1}=await supabase.from('shift_swap_requests').select('*, requester:requester_id(name), colleague:colleague_id(name)').order('created_at',{ascending:false})
  const {data:offs,error:e2}=await supabase.from('time_off_requests').select('*, team_member:team_member_id(name)').order('created_at',{ascending:false})
  if(e1||e2) return view.innerHTML=`<section class="panel pad"><p class="form-error">${esc((e1||e2).message)}</p></section>`
  view.innerHTML=`<section class="panel pad"><div class="section-head"><div><h2>My requests</h2><p class="muted">Request changes without editing the rota directly.</p></div></div>
    <div class="request-cards"><button class="request-card" id="swap"><b>↔ Shift swap</b><span>Ask another team member to swap a shift.</span></button><button class="request-card" id="timeoff"><b>🏖 Holiday / time off</b><span>Request one or more days away.</span></button></div>
    <h3>Requests</h3><div class="request-list">
      ${(swaps||[]).map(r=>`<div class="request-row"><div><b>↔ ${esc(r.requester?.name||'')} → ${esc(r.colleague?.name||'')}</b><span>${esc(r.shift_date)} · ${esc(r.message||'')}</span></div><span class="badge ${r.status}">${esc(r.status)}</span></div>`).join('')}
      ${(offs||[]).map(r=>`<div class="request-row"><div><b>🏖 ${esc(r.team_member?.name||'')} · ${esc(r.request_type)}</b><span>${esc(r.start_date)} → ${esc(r.end_date)} · ${esc(r.message||'')}</span></div><span class="badge ${r.status}">${esc(r.status)}</span></div>`).join('')}
      ${!(swaps?.length||offs?.length)?'<p class="muted">No requests yet.</p>':''}
    </div></section>`
  view.querySelector('#swap').onclick=()=>openSwapModal()
  view.querySelector('#timeoff').onclick=()=>openTimeoffModal()
}
function openSwapModal() {
  modal=showModal(`<h2>Request a shift swap</h2><label>Date<input id="sd" type="date" required></label>
    <label>Colleague<select id="sc">${members.filter(m=>m.id!==currentMember.id).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label>
    <label>Message<input id="sm" placeholder="Optional note"></label>
    <div class="modal-actions"><button class="ghost" id="mc">Cancel</button><button class="primary" id="ms">Submit</button></div>`)
  modal.querySelector('#mc').onclick=closeModal
  modal.querySelector('#ms').onclick=async()=>{
    const date=modal.querySelector('#sd').value, colleague=modal.querySelector('#sc').value, message=modal.querySelector('#sm').value.trim()
    if(!date) return notify('Choose a date','error')
    const mine=shiftFor(currentMember.id,date)
    const {data:other}=await supabase.from('rota_shifts').select('shift_type').eq('team_member_id',colleague).eq('shift_date',date).maybeSingle()
    if(!mine) return notify('You do not have a shift on that date.','error')
    const {error}=await supabase.from('shift_swap_requests').insert({requester_id:currentMember.id,colleague_id:colleague,shift_date:date,requester_shift:mine.shift_type,colleague_shift:other?.shift_type||null,message})
    if(error) notify(error.message,'error'); else {notify('Swap request submitted','success');closeModal();await renderCurrent()}
  }
}
function openTimeoffModal() {
  modal=showModal(`<h2>Request holiday / time off</h2><label>From<input id="ts" type="date"></label><label>To<input id="te" type="date"></label>
    <label>Type<select id="tt"><option>Holiday</option><option>Appointment</option><option>Other</option></select></label><label>Message<input id="tm" placeholder="Optional note"></label>
    <div class="modal-actions"><button class="ghost" id="mc">Cancel</button><button class="primary" id="ms">Submit</button></div>`)
  modal.querySelector('#mc').onclick=closeModal
  modal.querySelector('#ms').onclick=async()=>{
    const start=modal.querySelector('#ts').value,end=modal.querySelector('#te').value
    if(!start||!end||end<start) return notify('Choose a valid date range','error')
    const {error}=await supabase.from('time_off_requests').insert({team_member_id:currentMember.id,start_date:start,end_date:end,request_type:modal.querySelector('#tt').value,message:modal.querySelector('#tm').value.trim()})
    if(error) notify(error.message,'error'); else {notify('Time-off request submitted','success');closeModal();await renderCurrent()}
  }
}

async function renderAdmin(view) {
  const [{data:swaps,error:e1},{data:offs,error:e2}] = await Promise.all([
    supabase.from('shift_swap_requests').select('*, requester:requester_id(name), colleague:colleague_id(name)').eq('status','pending').order('created_at',{ascending:true}),
    supabase.from('time_off_requests').select('*, team_member:team_member_id(name)').eq('status','pending').order('created_at',{ascending:true})
  ])
  if(e1||e2) return view.innerHTML=`<section class="panel pad"><p class="form-error">${esc((e1||e2).message)}</p></section>`

  view.innerHTML=`<section class="panel pad">
    <div class="section-head"><div><h2>Admin</h2><p class="muted">Manage the rota, team and requests.</p></div></div>

    <div class="stats">
      <div><b>${members.length}</b><span>Team members</span></div>
      <div><b>${(swaps?.length||0)+(offs?.length||0)}</b><span>Pending requests</span></div>
      <div><b>${offs?.length||0}</b><span>Time-off requests</span></div>
    </div>

    <div class="admin-tools">
      <button class="primary" id="copy-week">Copy this week → next week</button>
      <button class="ghost" id="manage-team">Manage team</button>
    </div>

    <div id="team-manager" class="team-manager hidden">
      <div class="section-subhead"><div><h3>Team members</h3><p class="muted">Manage names, usernames and active status. New authentication accounts are still created in Supabase Auth.</p></div></div>
      <div class="member-list">
        ${members.map(m=>`<div class="member-admin-row">
          <div class="member-main"><span class="avatar">${initials(m.name)}</span><div><b>${esc(m.name)}</b><span>@${esc(m.username)} · ${m.role}</span></div></div>
          <div class="row-actions">
            <button class="ghost" data-member-edit="${m.id}">Edit</button>
            ${m.id!==currentMember.id?`<button class="ghost" data-member-toggle="${m.id}">${m.active?'Deactivate':'Activate'}</button>`:''}
          </div>
        </div>`).join('')}
      </div>
    </div>

    <h3>Pending requests</h3>
    <div class="admin-list">
      ${(swaps||[]).map(r=>`<article class="admin-row"><div><b>↔ ${esc(r.requester?.name)} → ${esc(r.colleague?.name)}</b><p>${esc(r.shift_date)} · ${esc(r.requester_shift||'?')} ↔ ${esc(r.colleague_shift||'?')} · ${esc(r.message||'')}</p></div><div class="row-actions"><button class="primary" data-swap-approve="${r.id}">Approve</button><button class="ghost" data-swap-decline="${r.id}">Decline</button></div></article>`).join('')}
      ${(offs||[]).map(r=>`<article class="admin-row"><div><b>🏖 ${esc(r.team_member?.name)} · ${esc(r.request_type)}</b><p>${esc(r.start_date)} → ${esc(r.end_date)} · ${esc(r.message||'')}</p></div><div class="row-actions"><button class="primary" data-off-approve="${r.id}">Approve</button><button class="ghost" data-off-decline="${r.id}">Decline</button></div></article>`).join('')}
      ${!(swaps?.length||offs?.length)?'<p class="muted">Nothing waiting for approval.</p>':''}
    </div>
  </section>`

  view.querySelector('#manage-team').onclick=()=>view.querySelector('#team-manager').classList.toggle('hidden')

  view.querySelector('#copy-week').onclick=async()=>{
    const ok=confirm(`Copy all shifts from ${weekLabel()} into the following week? Existing shifts in the destination week will be replaced.`)
    if(!ok) return
    await copyWeek()
  }

  view.querySelectorAll('[data-member-edit]').forEach(b=>b.onclick=()=>openMemberEditModal(b.dataset.memberEdit))
  view.querySelectorAll('[data-member-toggle]').forEach(b=>b.onclick=()=>toggleMember(b.dataset.memberToggle))
  view.querySelectorAll('[data-swap-approve]').forEach(b=>b.onclick=()=>reviewSwap(b.dataset.swapApprove,true))
  view.querySelectorAll('[data-swap-decline]').forEach(b=>b.onclick=()=>reviewSwap(b.dataset.swapDecline,false))
  view.querySelectorAll('[data-off-approve]').forEach(b=>b.onclick=()=>reviewOff(b.dataset.offApprove,true))
  view.querySelectorAll('[data-off-decline]').forEach(b=>b.onclick=()=>reviewOff(b.dataset.offDecline,false))
}

async function copyWeek() {
  const sourceStart=monday(weekDate), targetStart=addDays(sourceStart,7)
  const {data:source,error:e}=await supabase.from('rota_shifts').select('*')
    .gte('shift_date',isoDate(sourceStart)).lte('shift_date',isoDate(addDays(sourceStart,6)))
  if(e) return notify(e.message,'error')
  const payload=(source||[]).map(s=>({
    team_member_id:s.team_member_id,
    shift_date:isoDate(addDays(new Date(`${s.shift_date}T00:00:00`),7)),
    shift_type:s.shift_type,
    note:s.note
  }))
  if(!payload.length) return notify('There are no shifts in this week to copy.','error')
  const {error}=await supabase.from('rota_shifts').upsert(payload,{onConflict:'team_member_id,shift_date'})
  if(error) notify(error.message,'error')
  else notify(`${payload.length} shifts copied to next week.`,'success')
}

function openMemberEditModal(id) {
  const m=members.find(x=>x.id===id)
  if(!m) return
  modal=showModal(`<h2>Edit team member</h2>
    <label>Name<input id="en" value="${esc(m.name)}"></label>
    <label>Username<input id="eu" value="${esc(m.username)}"></label>
    <label>Role<select id="er"><option value="member" ${m.role==='member'?'selected':''}>Team member</option><option value="admin" ${m.role==='admin'?'selected':''}>Admin</option></select></label>
    <div class="modal-actions"><button class="ghost" id="mc">Cancel</button><button class="primary" id="ms">Save</button></div>`)
  modal.querySelector('#mc').onclick=closeModal
  modal.querySelector('#ms').onclick=async()=>{
    const name=modal.querySelector('#en').value.trim(), username=modal.querySelector('#eu').value.trim(), role=modal.querySelector('#er').value
    if(!name||!username) return notify('Name and username are required','error')
    const {error}=await supabase.from('team_members').update({name,username,role}).eq('id',id)
    if(error) notify(error.message,'error')
    else {notify('Team member updated','success');closeModal();await loadMembers();await loadUser(currentUser)}
  }
}

async function toggleMember(id) {
  const m=members.find(x=>x.id===id)
  if(!m) return
  const action=m.active?'deactivate':'activate'
  if(!confirm(`${action[0].toUpperCase()+action.slice(1)} ${m.name}?`)) return
  const {error}=await supabase.from('team_members').update({active:!m.active}).eq('id',id)
  if(error) notify(error.message,'error')
  else {notify(`${m.name} ${m.active?'deactivated':'activated'}`,'success');await loadMembers();await renderCurrent()}
}

async function reviewSwap(id,approve) {
  const {data:r,error}=await supabase.from('shift_swap_requests').select('*').eq('id',id).single()
  if(error) return notify(error.message,'error')
  if(approve) {
    const {data:a}=await supabase.from('rota_shifts').select('*').eq('team_member_id',r.requester_id).eq('shift_date',r.shift_date).maybeSingle()
    const {data:b}=await supabase.from('rota_shifts').select('*').eq('team_member_id',r.colleague_id).eq('shift_date',r.shift_date).maybeSingle()
    if(!a) return notify('Requester shift no longer exists.','error')
    const e1=await supabase.from('rota_shifts').update({shift_type:b?.shift_type||'Other',note:b?.note||null}).eq('id',a.id)
    let e2={error:null}
    if(b) e2=await supabase.from('rota_shifts').update({shift_type:a.shift_type,note:a.note||null}).eq('id',b.id)
    else e2=await supabase.from('rota_shifts').insert({team_member_id:r.colleague_id,shift_date:r.shift_date,shift_type:a.shift_type,note:a.note||null})
    if(e1.error||e2.error) return notify((e1.error||e2.error).message,'error')
  }
  const {error:reviewError}=await supabase.from('shift_swap_requests').update({status:approve?'approved':'declined',reviewed_by:currentMember.id,reviewed_at:new Date().toISOString()}).eq('id',id)
  if(reviewError) notify(reviewError.message,'error'); else {notify(approve?'Swap approved':'Swap declined','success');await renderCurrent()}
}
async function reviewOff(id,approve) {
  const {data:r,error}=await supabase.from('time_off_requests').select('*').eq('id',id).single()
  if(error) return notify(error.message,'error')
  if(approve) {
    for(let d=new Date(`${r.start_date}T00:00:00`); d<=new Date(`${r.end_date}T00:00:00`); d=addDays(d,1)) {
      const date=isoDate(d)
      const {error:e}=await supabase.from('rota_shifts').upsert({team_member_id:r.team_member_id,shift_date:date,shift_type:'Leave',note:r.message||r.request_type},{onConflict:'team_member_id,shift_date'})
      if(e) return notify(e.message,'error')
    }
  }
  const {error:e}=await supabase.from('time_off_requests').update({status:approve?'approved':'declined',reviewed_by:currentMember.id,reviewed_at:new Date().toISOString()}).eq('id',id)
  if(e) notify(e.message,'error'); else {notify(approve?'Time off approved':'Time off declined','success');await renderCurrent()}
}

function showModal(html) {
  const el=document.createElement('div'); el.className='modal-back'; el.innerHTML=`<div class="modal">${html}</div>`
  document.body.appendChild(el); el.addEventListener('click',e=>{if(e.target===el)closeModal()}); return el.querySelector('.modal')
}
function closeModal(){document.querySelector('.modal-back')?.remove();modal=null}

init()
