/* ================= COLLEGE TIMETABLE ================= */
const TT_DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
const TT_SLOTS=[
{id:1,label:'S1',time:'9:30–10:20'},{id:2,label:'S2',time:'10:20–11:10'},
{id:3,label:'S3',time:'11:25–12:15'},{id:4,label:'S4',time:'12:15–1:05'},
{id:5,label:'S5',time:'1:05–1:45'},{id:6,label:'S6',time:'1:45–2:35'},
{id:7,label:'S7',time:'2:35–3:25'},{id:8,label:'S8',time:'3:25–4:15'}];
const TT_COLORS=['#FFF2CC','#D9EAD3','#CFE2F3','#F4CCCC','#EADCF8','#D0E0E3','#FCE5CD','#D9D2E9'];
function defaultTimetable(){
const E=(day,start,end,course,room,color)=>({id:uid(),day,start,end,course,room,color});
return{section:'B',break:'11:10–11:25',lunch:'1:05–1:45',entries:[
E('Monday',1,2,'DVDF-LAB','',TT_COLORS[1]),E('Monday',6,6,'IQP','',TT_COLORS[2]),E('Monday',7,7,'ELS','',TT_COLORS[0]),
E('Tuesday',1,2,'CP-LAB','104',TT_COLORS[3]),E('Tuesday',3,3,'LA','',TT_COLORS[4]),E('Tuesday',4,4,'EAI','',TT_COLORS[1]),E('Tuesday',6,6,'DVDF','',TT_COLORS[1]),E('Tuesday',7,8,'IQP-LAB','107',TT_COLORS[2]),
E('Wednesday',1,1,'EAI','',TT_COLORS[1]),E('Wednesday',2,2,'LA','',TT_COLORS[4]),E('Wednesday',3,4,'IQP-LAB','107',TT_COLORS[2]),E('Wednesday',6,6,'CP','',TT_COLORS[3]),E('Wednesday',7,7,'ELS','',TT_COLORS[0]),
E('Thursday',1,2,'DVDF','',TT_COLORS[1]),E('Thursday',3,3,'IQP','',TT_COLORS[2]),E('Thursday',4,4,'CP','',TT_COLORS[3]),E('Thursday',7,8,'ELS-LAB','',TT_COLORS[0]),
E('Friday',2,2,'EAI','',TT_COLORS[1]),E('Friday',3,3,'IQP','',TT_COLORS[2]),E('Friday',6,8,'CP-LAB','211',TT_COLORS[3])],
faculty:[
{no:1,course:'ELS',name:'Dr Swathi'},{no:2,course:'LA&ODE',name:'Dr. Rakesh Reddy'},
{no:3,course:'CP',name:'Dr J. Vamsinath'},{no:4,course:'IQP',name:'Dr. Shreecharan'},
{no:5,course:'DV&DF',name:'Dr. Manmadhachary (IC)'},{no:6,course:'EAI',name:'Mr. Brahma naidu'}]}};
function ensureTimetable(){
if(!D.timetable||!Array.isArray(D.timetable.entries)){D.timetable=defaultTimetable();return true;}
if(!D.timetable.section)D.timetable.section='B';if(!D.timetable.break)D.timetable.break='11:10–11:25';if(!D.timetable.lunch)D.timetable.lunch='1:05–1:45';
if(!Array.isArray(D.timetable.faculty))D.timetable.faculty=defaultTimetable().faculty;return false;}
if(!IC.timetable)IC.timetable='<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18M7 13h3M14 13h3M7 17h3M14 17h3"/>';
function ttCol(slot){return slot<=2?slot+1:slot+2;}
function ttStart(day,slot){return D.timetable.entries.find(e=>e.day===day&&e.start===slot);}
function ttAt(day,slot){return D.timetable.entries.find(e=>e.day===day&&slot>=e.start&&slot<=e.end);}
function ttBlock(e,row){return '<button class="tt-block" data-a="tt-edit" data-id="'+e.id+'" style="grid-column:'+ttCol(e.start)+' / span '+(e.end-e.start+1)+';grid-row:'+row+';--ttc:'+esc(e.color||TT_COLORS[0])+'"><b>'+esc(e.course)+'</b>'+(e.room?'<small>'+esc(e.room)+'</small>':'')+'</button>';}
function viewTimetable(){
const added=ensureTimetable();if(added)save();const tt=D.timetable;
const head='<div class="tt-head"><div>'+pageHead('College Timetable','Section '+esc(tt.section)+' · Tap a class to edit it.','<button class="btn btn-primary" data-a="tt-new">'+ico('plus')+'Add class</button>')+'</div><button class="btn tt-home" data-a="nav" data-p="today">'+ico('today')+'Home</button></div>';
const slots=TT_SLOTS.map(s=>'<div class="tt-slot"><b>'+s.label+'</b><small>'+s.time+'</small></div>').join('');
const rows=TT_DAYS.map((day,i)=>{const row=i+2,parts=['<div class="tt-day" style="grid-row:'+row+';grid-column:1">'+esc(day.slice(0,3))+'</div>'];for(let s=1;s<=8;s++){const e=ttStart(day,s);if(e)parts.push(ttBlock(e,row));else if(!ttAt(day,s))parts.push('<button class="tt-empty" data-a="tt-new-slot" data-day="'+day+'" data-start="'+s+'"></button>');}return parts.join('');}).join('');
const breaks='<div class="tt-break" style="grid-column:4;grid-row:2 / span 5">Break<br><small>'+esc(tt.break)+'</small></div><div class="tt-lunch" style="grid-column:7;grid-row:2 / span 5">Lunch<br><small>'+esc(tt.lunch)+'</small></div>';
const faculty='<section class="tt-faculty"><div class="tt-faculty-head"><b>S#</b><b>Course</b><b>Name of the Faculty</b></div>'+tt.faculty.map(f=>'<div class="tt-faculty-row"><span>'+esc(f.no)+'</span><b>'+esc(f.course)+'</b><span>'+esc(f.name)+'</span></div>').join('')+'</section>';
return '<div class="tt-page">'+head+'<div class="tt-scroll"><div class="tt-grid"><div class="tt-day-head">Day</div>'+slots+rows+breaks+'</div></div><div class="tt-note"><b>Timing:</b> S1 9:30–10:20 · S2 10:20–11:10 · Break 11:10–11:25 · S3 11:25–12:15 · S4 12:15–1:05 · S5/Lunch 1:05–1:45 · S6 1:45–2:35 · S7 2:35–3:25 · S8 3:25–4:15</div>'+faculty;}
function openTimetableForm(id,preset){
ensureTimetable();const old=id?D.timetable.entries.find(e=>e.id===id):null;const f=old||{day:(preset&&preset.day)||'Monday',start:(preset&&preset.start)||1,end:(preset&&preset.start)||1,course:'',room:'',color:TT_COLORS[0]};U.form={kind:'timetable',id:id||null};
const opts=n=>TT_SLOTS.map(s=>'<option value="'+s.id+'" '+(s.id===n?'selected':'')+'>'+s.label+' · '+s.time+'</option>').join('');
const days=TT_DAYS.map(d=>'<option '+(d===f.day?'selected':'')+'>'+d+'</option>').join('');
const colors=TT_COLORS.map(c=>'<option value="'+c+'" '+(c===f.color?'selected':'')+'>'+c+'</option>').join('');
openModal('<div class="m-head"><h2>'+(old?'Edit class':'Add class')+'</h2><button class="icon-btn" data-a="close-modal" aria-label="Close">'+ico('x')+'</button></div><div class="m-body"><label class="fld"><span>Course / Class</span><input class="input" id="tt-course" value="'+esc(f.course)+'" placeholder="e.g. EAI"></label><div class="frow"><label class="fld"><span>Day</span><select class="select" id="tt-day">'+days+'</select></label><label class="fld"><span>Room</span><input class="input" id="tt-room" value="'+esc(f.room||'')+'" placeholder="e.g. 107"></label></div><div class="frow"><label class="fld"><span>Start</span><select class="select" id="tt-start">'+opts(f.start)+'</select></label><label class="fld"><span>End</span><select class="select" id="tt-end">'+opts(f.end)+'</select></label></div><label class="fld"><span>Block color</span><select class="select" id="tt-color">'+colors+'</select></label></div><div class="m-foot">'+(old?'<button class="btn btn-danger" data-a="tt-del">Delete</button>':'')+'<span class="grow"></span><button class="btn" data-a="close-modal">Cancel</button><button class="btn btn-primary" data-a="tt-save">Save class</button></div>',{label:'Timetable class'});}
