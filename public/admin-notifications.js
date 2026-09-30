import {api,t,esc,date} from './shared.js';

export function setupNotifications({isSignedIn,onOrdersChanged,onUnauthorized}) {
  const root=document.getElementById('admin-alerts');
  const toast=document.createElement('aside');toast.id='notification-toast';toast.className='notification-toast';toast.hidden=true;toast.setAttribute('role','status');
  toast.innerHTML='<span></span><button type="button">×</button>';document.body.append(toast);
  let toastTimer;
  toast.querySelector('button').addEventListener('click',()=>{toast.hidden=true;});
  root.innerHTML='<div class="alert-toolbar"><h2 data-i18n="notifications"></h2><button type="button" id="enable-sound" class="secondary"></button></div><p id="sound-hint" class="muted" data-i18n="soundHint"></p><p id="notification-connection" class="muted" role="status"></p><ol id="notification-list" class="notification-list"></ol><p id="notification-live" class="sr-only" role="status" aria-live="polite"></p>';
  let cursor=null,events=[],polling=false,audio=null,enabled=false,connected=true,generation=0;
  const button=document.getElementById('enable-sound');
  const title=event=>`${t(`event_${event.kind}`)} · ${event.orderNumber}`;
  function render(){
    root.setAttribute('aria-label',t('notifications'));toast.querySelector('button').setAttribute('aria-label',t('close'));
    button.textContent=t(enabled?'muteSound':'enableSound');button.setAttribute('aria-pressed',String(enabled));
    document.getElementById('notification-connection').textContent=t(connected?'alertsConnected':'alertsReconnecting');
    document.getElementById('notification-list').innerHTML=events.length?events.slice(0,20).map(e=>`<li class="event-${esc(e.kind)}"><strong>${esc(t(`event_${e.kind}`))} · <bdi>${esc(e.orderNumber)}</bdi></strong><time datetime="${esc(e.createdAt)}">${esc(date(e.createdAt))}</time></li>`).join(''):`<li class="muted">${t('noNotifications')}</li>`;
  }
  function sound(kind='created'){
    if(!enabled||audio?.state!=='running')return;
    const tones=kind==='cancelled'?[440,330,220]:kind==='edited'?[660,880]:[660,880,1100];
    tones.forEach((frequency,index)=>{
      const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+index*.22;
      oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.18,start+.02);gain.gain.exponentialRampToValueAtTime(.001,start+.19);
      oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+.2);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    });
  }
  button.addEventListener('click',async()=>{
    try{
      if(enabled){enabled=false;render();return;}
      audio??=new AudioContext();await audio.resume();enabled=audio.state==='running';
      audio.onstatechange=()=>{if(audio.state!=='running'){enabled=false;render();}};
      render();sound();
    }catch{enabled=false;render();document.getElementById('sound-hint').textContent=t('soundUnavailable');}
  });
  async function poll(){
    if(!isSignedIn()||polling)return;
    polling=true;const current=generation;
    try{
      const initial=cursor===null;
      const data=await api(`/api/admin/events${initial?'':`?after=${cursor}`}`);
      if(current!==generation||!isSignedIn())return;
      cursor=data.cursor;connected=true;
      if(data.events.length){
        events=[...data.events.reverse(),...events].slice(0,20);
        if(!initial){
          document.getElementById('notification-live').textContent=data.events.map(title).join('. ');
          toast.querySelector('span').textContent=data.events.map(title).join(' · ');toast.hidden=false;
          clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},10000);
          sound(data.events[0].kind);onOrdersChanged();
        }
      }
      render();
    }catch(error){if(current!==generation)return;connected=false;render();if(error.status===401)onUnauthorized();}
    finally{polling=false;}
  }
  setInterval(poll,3000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
  return {render,start:poll,reset(){generation++;cursor=null;events=[];enabled=false;toast.hidden=true;clearTimeout(toastTimer);render();}};
}
