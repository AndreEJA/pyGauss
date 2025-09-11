function showModal(message){
  const modal=document.getElementById('app-modal'); const txt=document.getElementById('modal-text');
  txt.textContent=message; modal.classList.remove('hidden'); setTimeout(()=> modal.classList.add('show'), 10);
}
function hideModal(){ const modal=document.getElementById('app-modal'); modal.classList.remove('show'); setTimeout(()=> modal.classList.add('hidden'), 180); }
document.getElementById('modal-ok')?.addEventListener('click', hideModal);
document.getElementById('app-modal')?.addEventListener('click',(e)=>{ if(e.target.id==='app-modal' || e.target.classList.contains('modal-backdrop')) hideModal(); });
