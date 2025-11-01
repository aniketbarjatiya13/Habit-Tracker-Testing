import React, { useEffect, useMemo, useState } from "react";

const todayISO = () => new Date().toISOString().slice(0, 10);
const dateAdd = (dateISO, days) => { const d=new Date(dateISO+"T00:00:00"); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
const fmtShort = (dateISO) => { const d=new Date(dateISO+"T00:00:00"); return `${d.getDate()} ${d.toLocaleString(undefined,{month:"short"})}`; };
const lastNDays = (n, from=todayISO()) => Array.from({length:n},(_,i)=>dateAdd(from, -(n-1-i)));

const STORAGE_KEY="habitTracker_clean_v3";
const load=()=>{ try{return JSON.parse(localStorage.getItem(STORAGE_KEY));}catch{return null;} };
const save=(s)=>{ try{localStorage.setItem(STORAGE_KEY, JSON.stringify(s));}catch{} };

const seed=()=>({ habits:[
  {id:"h1",name:"Gym",emoji:"💪",archived:false},
  {id:"h2",name:"Drink 5L Water",emoji:"🥤",archived:false},
  {id:"h3",name:"Study 1hr",emoji:"📚",archived:false},
], logs:{}, tasks:{}, settings:{reminder:false, interval:60} });

const getLog=(s,d,id)=> s.logs?.[d]?.[id] || {done:false, reason:""};
const setLog=(s,d,id,p)=>{ if(!s.logs[d]) s.logs[d]={}; s.logs[d][id] = { ...(s.logs[d][id]||{done:false,reason:""}), ...p }; };
const getTasks=(s,d)=> s.tasks?.[d] || [];

const Card=({children})=><div className="border rounded-2xl p-4 bg-white dark:bg-neutral-950 border-gray-200 dark:border-gray-800">{children}</div>;
const Button=({children,onClick,variant="primary"})=>(<button onClick={onClick} className={`px-3 py-2 rounded-xl text-sm ${variant==="ghost"?"hover:bg-gray-100 dark:hover:bg-gray-900":"bg-black text-white hover:opacity-90"}`}>{children}</button>);
const Pill=({children})=><span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">{children}</span>;

export default function App(){
  const [state,setState]=useState(()=>load()||seed());
  const [tab,setTab]=useState("today");
  const [selected,setSelected]=useState(null);
  useEffect(()=>save(state),[state]);

  useEffect(()=>{
    if(!state.settings.reminder) return;
    const timer=setInterval(()=>{
      const pending = state.habits.filter(h=>!h.archived&&!getLog(state,todayISO(),h.id).done).length + (state.tasks[todayISO()]||[]).filter(t=>!t.done).length;
      if(pending>0 && "Notification" in window && Notification.permission==="granted") new Notification("Keep going!",{body:`You can do it! Only ${pending} left.`});
    }, state.settings.interval*60000);
    if("Notification" in window && Notification.permission==="default") Notification.requestPermission();
    return ()=>clearInterval(timer);
  },[state.settings.reminder,state.settings.interval,state.habits,state.logs,state.tasks]);

  const toggleDone=(d,id)=>setState(s=>{const c=structuredClone(s); const l=getLog(c,d,id); setLog(c,d,id,{done:!l.done, reason:l.done?"":l.reason}); return c;});
  const setReason=(d,id,r)=>setState(s=>{const c=structuredClone(s); setLog(c,d,id,{reason:r}); return c;});
  const addTask=(d,t)=>setState(s=>{const c=structuredClone(s); if(!c.tasks[d]) c.tasks[d]=[]; c.tasks[d].push({id:Math.random().toString(36).slice(2,7), title:t, done:false}); return c;});
  const toggleTask=(d,i)=>setState(s=>{const c=structuredClone(s); const t=c.tasks[d].find(x=>x.id===i); t.done=!t.done; return c;});
  const delTask=(d,i)=>setState(s=>{const c=structuredClone(s); c.tasks[d]=c.tasks[d].filter(x=>x.id!==i); return c;});

  const pending = state.habits.filter(h=>!h.archived&&!getLog(state,todayISO(),h.id).done).length + (state.tasks[todayISO()]||[]).filter(t=>!t.done).length;
  const days7 = useMemo(()=>lastNDays(7),[]);

  // export/import
  const exportJSON=()=>{ const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`habit-tracker-${todayISO()}.json`; a.click(); URL.revokeObjectURL(url); };
  const importJSON=(file)=>{ const r=new FileReader(); r.onload=()=>{ try{ setState(JSON.parse(String(r.result))); }catch{ alert("Invalid file"); } }; r.readAsText(file); };

  return (<div className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-gray-100 p-4 max-w-5xl mx-auto">
    <header className="flex flex-col sm:flex-row justify-between mb-4 gap-2">
      <div><h1 className="text-2xl font-bold">🔥 Habit Tracker</h1><p className="text-sm text-gray-500">{fmtShort(todayISO())} • {pending} left</p></div>
      <div className="flex gap-2 items-center">
        <Button variant="ghost" onClick={()=>setTab("today")}>Today</Button>
        <Button variant="ghost" onClick={()=>setTab("dash")}>Dashboard</Button>
        <Button variant="ghost" onClick={()=>setTab("settings")}>Settings</Button>
        <input id="fileImport" type="file" accept="application/json" className="hidden" onChange={e=>e.target.files?.[0] && importJSON(e.target.files[0])} />
        <Button variant="ghost" onClick={()=>document.getElementById("fileImport").click()}>Import</Button>
        <Button onClick={exportJSON}>Export</Button>
      </div>
    </header>

    {tab==="today" && <TodayView s={state} toggleDone={toggleDone} setReason={setReason} addTask={addTask} toggleTask={toggleTask} delTask={delTask} setSelected={setSelected}/>}  
    {tab==="dash" && <Dashboard s={state} days={days7} setSelected={setSelected}/>}  
    {tab==="settings" && <Settings s={state} setState={setState}/>}  
    {selected && <HabitModal h={state.habits.find(x=>x.id===selected)} s={state} close={()=>setSelected(null)} toggleDone={toggleDone} setReason={setReason}/>}  
  </div>);
}

function TodayView({s,toggleDone,setReason,addTask,toggleTask,delTask,setSelected}){
  const d=todayISO();
  const [task,setTask]=useState("");
  const habits=s.habits.filter(h=>!h.archived);
  const tasks=getTasks(s,d);
  return (<div className="grid gap-4">
    <Card>
      <h2 className="text-lg font-semibold mb-2">Today — Habits</h2>
      {habits.map(h=>{const log=getLog(s,d,h.id);return (<div key={h.id} className="flex justify-between items-center border-b py-2">
        <div onClick={()=>setSelected(h.id)} className="cursor-pointer flex gap-2 items-center"><span className="text-2xl">{h.emoji}</span><span>{h.name}</span></div>
        <div className="flex gap-2 items-center">
          {!log.done&&<input value={log.reason} onChange={e=>setReason(d,h.id,e.target.value)} placeholder="Reason if missed" className="border rounded-lg px-2 py-1 text-sm"/>}
          <Button onClick={()=>toggleDone(d,h.id)}>{log.done?"Undo":"Done"}</Button>
        </div>
      </div>);})}
    </Card>

    <Card>
      <h2 className="text-lg font-semibold mb-2">Today — Tasks</h2>
      <div className="flex gap-2 mb-2">
        <input value={task} onChange={e=>setTask(e.target.value)} placeholder="New task" className="flex-1 border rounded-lg px-2 py-1"/>
        <Button onClick={()=>{if(task.trim()){addTask(d,task);setTask("");}}}>Add</Button>
      </div>
      {tasks.map(t=>(<div key={t.id} className="flex justify-between items-center border-b py-1">
        <label className="flex gap-2 items-center"><input type="checkbox" checked={t.done} onChange={()=>toggleTask(d,t.id)}/><span className={t.done?"line-through text-gray-400":""}>{t.title}</span></label>
        <Button variant="ghost" onClick={()=>delTask(d,t.id)}>Del</Button>
      </div>))}
      {tasks.length===0&&<p className="text-sm text-gray-500">No tasks yet.</p>}
    </Card>
  </div>);
}

function Dashboard({s,days,setSelected}){
  return (<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{s.habits.filter(h=>!h.archived).map(h=>{
    const cur = (()=>{let c=0,d=todayISO(); while(getLog(s,d,h.id).done){c++; d=dateAdd(d,-1);} return c;})();
    const max = (()=>{let m=0,c=0; for(const d of lastNDays(365)){ if(getLog(s,d,h.id).done){ c++; m=Math.max(m,c);} else c=0; } return m;})();
    return (<Card key={h.id}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2"><span className="text-2xl">{h.emoji}</span><span>{h.name}</span></div>
        <Button variant="ghost" onClick={()=>setSelected(h.id)}>Open</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">{days.map(d=><div key={d} title={fmtShort(d)} className="text-center">{getLog(s,d,h.id).done?"🔥":"❄️"}</div>)}</div>
      <div className="flex gap-2"><Pill>Cur {cur}</Pill><Pill>Max {max}</Pill></div>
    </Card>);
  })}</div>);
}

function HabitModal({h,s,close,toggleDone,setReason}){
  const [month,setMonth]=useState(new Date());
  const days=Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i+1).toISOString().slice(0,10));
  return (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={close}>
    <div className="bg-white dark:bg-neutral-950 p-4 rounded-2xl max-w-3xl w-full" onClick={e=>e.stopPropagation()}>
      <div className="flex justify-between mb-2"><h3 className="text-lg font-semibold">{h.emoji} {h.name}</h3><Button variant="ghost" onClick={close}>Close</Button></div>
      <div className="flex justify-between mb-2"><div>{month.toLocaleString(undefined,{month:"long",year:"numeric"})}</div><div className="flex gap-2"><Button variant="ghost" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>Prev</Button><Button variant="ghost" onClick={()=>setMonth(new Date())}>Today</Button><Button variant="ghost" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>Next</Button></div></div>
      <div className="grid grid-cols-7 gap-2">{days.map(d=>{const log=getLog(s,d,h.id); return (<div key={d} className="border p-2 rounded-lg flex flex-col items-center">
        <div className="text-xs text-gray-500">{fmtShort(d)}</div>
        <div className="text-2xl">{log.done?"🔥":"❄️"}</div>
        <input disabled={log.done} value={log.reason} onChange={e=>setReason(d,h.id,e.target.value)} placeholder="Reason" className="text-xs border rounded px-1 w-full"/>
        <Button variant="ghost" onClick={()=>toggleDone(d,h.id)}>{log.done?"Undo":"Done"}</Button>
      </div>);})}</div>
    </div>
  </div>);
}

function Settings({s,setState}){
  const [name,setName]=useState("");
  const [emoji,setEmoji]=useState("✅");
  const [rem,setRem]=useState(s.settings.reminder);
  const [interval,setInterval]=useState(s.settings.interval);
  useEffect(()=>{ setState(st=>({...st, settings:{...st.settings, reminder: rem, interval: interval}})); },[rem,interval]);
  return (<div className="grid gap-4">
    <Card>
      <h2 className="text-lg font-semibold mb-2">Habits</h2>
      <div className="flex gap-2 mb-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="New habit" className="flex-1 border rounded px-2 py-1"/>
        <input value={emoji} onChange={e=>setEmoji(e.target.value)} className="w-14 text-center border rounded"/>
        <Button onClick={()=>{ if(!name.trim())return; setState(st=>{const c=structuredClone(st); c.habits.push({id:"h"+Math.random().toString(36).slice(2,8), name, emoji, archived:false}); return c;}); setName(""); }}>Add</Button>
      </div>
      {s.habits.map(h=>(<div key={h.id} className="flex justify-between items-center border-b py-1">
        <span>{h.emoji} {h.name}</span>
        <Button variant="ghost" onClick={()=>setState(st=>{const c=structuredClone(st); const hh=c.habits.find(x=>x.id===h.id); hh.archived=!hh.archived; return c;})}>{h.archived?"Unarchive":"Archive"}</Button>
      </div>))}
    </Card>

    <Card>
      <h2 className="text-lg font-semibold mb-2">Notifications</h2>
      <label className="flex gap-2 items-center"><input type="checkbox" checked={rem} onChange={e=>setRem(e.target.checked)}/><span>Hourly reminder (tab must stay open)</span></label>
      <label className="flex gap-2 items-center mt-2 text-sm">Interval (min): <input type="number" value={interval} onChange={e=>setInterval(+e.target.value||60)} className="w-20 border rounded px-2"/></label>
    </Card>
  </div>);
}