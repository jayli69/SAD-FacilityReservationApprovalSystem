(() => {
  const KEY = "facility_session";
  const DEMO_KEY = "facility_demo_data";
  const hasSupabase = Boolean(window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase);
  const sb = hasSupabase ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;

  const demoUsers = {
    "admin@example.com": { id:"u-admin", name:"Administrator", role:"admin", email:"admin@example.com" },
    "staff@example.com": { id:"u-staff", name:"Facility Staff", role:"staff", email:"staff@example.com" },
    "requester@example.com": { id:"u-requester", name:"Requester User", role:"requester", email:"requester@example.com" }
  };

  const seed = {
    facilities: [
      {id:"f1", name:"Computer Laboratory", location:"CEIS Building", capacity:40, condition:"Good", status:"Active"},
      {id:"f2", name:"Conference Room", location:"Administration Building", capacity:20, condition:"Good", status:"Active"},
      {id:"f3", name:"AV Room", location:"Main Building", capacity:30, condition:"Maintenance", status:"Active"}
    ],
    reservations: [
      {id:"r1", user_id:"u-requester", requester:"Requester User", facility_id:"f1", facility:"Computer Laboratory", purpose:"Class activity", start:"2026-09-18T09:00", end:"2026-09-18T11:00", status:"Pending"},
      {id:"r2", user_id:"u-requester", requester:"Requester User", facility_id:"f2", facility:"Conference Room", purpose:"Meeting", start:"2026-09-18T13:00", end:"2026-09-18T14:00", status:"Approved"}
    ],
    services: [],
    audit_logs: []
  };

  function session(){ return JSON.parse(localStorage.getItem(KEY) || "null"); }
  function saveSession(u){ localStorage.setItem(KEY, JSON.stringify(u)); }
  function data(){ return JSON.parse(localStorage.getItem(DEMO_KEY) || JSON.stringify(seed)); }
  function saveData(d){ localStorage.setItem(DEMO_KEY, JSON.stringify(d)); }
  function uid(p){ return p + Math.random().toString(36).slice(2,9); }
  function esc(s){ return String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function toast(msg){ const t=document.getElementById("toast"); if(t){t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);} }
  function log(action, details, reservation_id=null, facility_id=null){
    const d=data(), u=session();
    d.audit_logs.unshift({id:uid("a"), action, details, reservation_id, facility_id, actor:u?.name || "System", actor_role:u?.role || "system", created_at:new Date().toISOString()});
    saveData(d);
  }
  function requireLogin(){
    if(!session()){ location.href="index.html"; return false; }
    return true;
  }
  function roleName(r){ return r==="admin"?"Administrator":r==="staff"?"Facility Staff":"Requester"; }

  async function liveLogin(email,password){
    if(!sb) return null;
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error) throw error;
    const {data:p,error:pe}=await sb.from("profiles").select("*").eq("id",data.user.id).single();
    if(pe) throw pe;
    return {id:data.user.id,email:data.user.email,name:p.full_name,role:p.role};
  }

  // Login page
  if(document.getElementById("loginForm")){
    document.getElementById("loginForm").addEventListener("submit", async e=>{
      e.preventDefault();
      const email=document.getElementById("email").value.trim();
      const password=document.getElementById("password").value;
      const err=document.getElementById("loginError");
      try{
        if(sb){
          const u=await liveLogin(email,password); saveSession(u);
        }else{
          const u=demoUsers[email];
          if(!u || password!=="password") throw new Error("Demo login: use requester@example.com, staff@example.com, or admin@example.com with password.");
          saveSession(u);
        }
        location.href="dashboard.html";
      }catch(x){ err.textContent=x.message; }
    });
    document.getElementById("demoLogin").addEventListener("click",()=>{
      const role=document.getElementById("demoRole").value;
      const u=Object.values(demoUsers).find(x=>x.role===role);
      saveSession(u); location.href="dashboard.html";
    });

    const registerForm=document.getElementById("registerForm");
    if(registerForm){
      registerForm.addEventListener("submit", async e=>{
        e.preventDefault();

        const name=document.getElementById("registerName").value.trim();
        const email=document.getElementById("registerEmail").value.trim();
        const password=document.getElementById("registerPassword").value;
        const confirmPassword=document.getElementById("registerConfirmPassword").value;
        const msg=document.getElementById("registerMessage");

        msg.textContent="";
        msg.className="small";

        if(password!==confirmPassword){
          msg.textContent="Passwords do not match.";
          msg.className="small error";
          return;
        }

        if(!sb){
          msg.textContent="Registration requires Supabase. Add your Supabase URL and anon key in js/config.js first.";
          msg.className="small error";
          return;
        }

        try{
          const {data:authData,error:signUpError}=await sb.auth.signUp({
            email,
            password,
            options:{
              data:{full_name:name}
            }
          });

          if(signUpError) throw signUpError;

          if(authData.user && authData.session){
            const {error:profileError}=await sb.from("profiles").insert({
              id:authData.user.id,
              full_name:name,
              role:"requester",
              is_active:true
            });

            if(profileError) throw profileError;

            saveSession({
              id:authData.user.id,
              email:authData.user.email,
              name,
              role:"requester"
            });

            msg.textContent="Registration successful. Opening your dashboard...";
            msg.className="small";
            setTimeout(()=>location.href="dashboard.html",700);
          }else{
            msg.textContent="Registration successful. Check your email to confirm your account, then log in.";
            msg.className="small";
            registerForm.reset();
          }
        }catch(x){
          msg.textContent=x.message || "Registration failed.";
          msg.className="small error";
        }
      });
    }
  }

  // Dashboard
  if(document.querySelector(".tabs") && requireLogin()){
    const u=session(), d=data();
    document.getElementById("roleBadge").textContent=roleName(u.role);
    document.getElementById("currentUser").textContent=`${u.name} — ${u.email}`;
    document.getElementById("logoutBtn").onclick=async()=>{ if(sb) await sb.auth.signOut(); localStorage.removeItem(KEY); location.href="index.html"; };

    document.querySelectorAll(".tabs button").forEach(btn=>btn.onclick=()=>{
      document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active"); document.getElementById(btn.dataset.tab).classList.add("active");
      renderAll();
    });

    if(u.role!=="admin") document.querySelectorAll(".admin-only").forEach(x=>x.style.display="none");
    if(u.role!=="staff") document.querySelectorAll(".staff-only").forEach(x=>x.style.display="none");
    if(u.role!=="requester") document.querySelectorAll(".requester-only").forEach(x=>x.style.display="none");

    document.getElementById("addFacilityBtn").onclick=()=>document.getElementById("facilityFormWrap").classList.remove("hidden");
    document.getElementById("cancelFacility").onclick=()=>document.getElementById("facilityFormWrap").classList.add("hidden");
    document.getElementById("newReservationBtn").onclick=()=>document.getElementById("reservationFormWrap").classList.remove("hidden");
    document.getElementById("cancelReservation").onclick=()=>document.getElementById("reservationFormWrap").classList.add("hidden");
    document.getElementById("newServiceBtn").onclick=()=>document.getElementById("serviceFormWrap").classList.remove("hidden");
    document.getElementById("cancelService").onclick=()=>document.getElementById("serviceFormWrap").classList.add("hidden");

    document.getElementById("facilityForm").onsubmit=e=>{
      e.preventDefault(); if(u.role!=="admin") return deny();
      const d=data(), id=document.getElementById("facilityId").value || uid("f");
      const item={id,name:document.getElementById("facilityName").value.trim(),location:document.getElementById("facilityLocation").value.trim(),capacity:+document.getElementById("facilityCapacity").value,condition:document.getElementById("facilityCondition").value,status:document.getElementById("facilityStatus").value};
      const old=d.facilities.find(x=>x.id===id);
      if(old) Object.assign(old,item); else d.facilities.push(item);
      saveData(d); log(old?"Facility updated":"Facility created",item.name,id); document.getElementById("facilityForm").reset(); document.getElementById("facilityFormWrap").classList.add("hidden"); renderAll();
    };

    document.getElementById("reservationForm").onsubmit=e=>{
      e.preventDefault(); if(u.role!=="requester") return deny();
      const d=data(), fid=document.getElementById("reservationFacility").value, f=d.facilities.find(x=>x.id===fid);
      const start=document.getElementById("reservationStart").value, end=document.getElementById("reservationEnd").value;
      const err=document.getElementById("reservationError"); err.textContent="";
      if(!f || f.status!=="Active" || f.condition==="Maintenance"){err.textContent="Blocked: only active facilities not under Maintenance may be reserved.";return;}
      if(new Date(start)>=new Date(end)){err.textContent="Blocked: start time must precede end time.";return;}
      const conflict=d.reservations.some(r=>r.facility_id===fid && ["Approved","Scheduled","In Use"].includes(r.status) && new Date(start)<new Date(r.end) && new Date(end)>new Date(r.start));
      if(conflict){err.textContent="Blocked: this facility has an overlapping approved schedule.";return;}
      const item={id:uid("r"),user_id:u.id,requester:u.name,facility_id:fid,facility:f.name,purpose:document.getElementById("reservationPurpose").value.trim(),start,end,status:"Pending"};
      d.reservations.push(item); saveData(d); log("Reservation submitted",`Reservation ${item.id} submitted as Pending`,item.id,fid);
      e.target.reset(); document.getElementById("reservationFormWrap").classList.add("hidden"); renderAll(); toast("Reservation submitted as Pending.");
    };

    document.getElementById("serviceForm").onsubmit=e=>{
      e.preventDefault(); if(u.role!=="staff") return deny();
      const d=data(), fid=document.getElementById("serviceFacility").value, f=d.facilities.find(x=>x.id===fid);
      const item={id:uid("s"),facility_id:fid,facility:f?.name||"",concern:document.getElementById("serviceConcern").value,description:document.getElementById("serviceDescription").value,status:"Open",created_by:u.name};
      d.services.unshift(item); saveData(d); log("Service request created",item.concern,null,fid); e.target.reset(); document.getElementById("serviceFormWrap").classList.add("hidden"); renderAll();
    };

    function deny(){ toast("Access denied: your role cannot perform this action."); }
    function statusAction(id,status){
      const d=data(), r=d.reservations.find(x=>x.id===id);
      if(!r) return;
      if(status==="Approved"||status==="Rejected"){
        if(u.role!=="admin") return deny();
        if(status==="Approved"){
          const conflict=d.reservations.some(x=>x.id!==id&&x.facility_id===r.facility_id&&["Approved","Scheduled","In Use"].includes(x.status)&&new Date(r.start)<new Date(x.end)&&new Date(r.end)>new Date(x.start));
          if(conflict){toast("Blocked: approving this reservation creates a schedule conflict.");return;}
          r.status="Scheduled";
        } else r.status="Rejected";
      } else if(["In Use","Completed"].includes(status)){
        if(u.role!=="staff") return deny();
        if(status==="Completed" && r.status!=="In Use"){toast("Reservation must be In Use before Completed.");return;}
        r.status=status;
      } else if(status==="Cancelled"){
        if(u.role!=="requester" || r.user_id!==u.id || r.status!=="Pending") return deny();
        r.status="Cancelled";
      }
      saveData(d); log(`Reservation ${status.toLowerCase()}`,`Reservation ${r.id} changed to ${r.status}`,r.id,r.facility_id); renderAll();
    }
    window.statusAction=statusAction;

    function renderAll(){
      const d=data(), mine=d.reservations.filter(r=>u.role!=="requester"||r.user_id===u.id);
      document.getElementById("statFacilities").textContent=d.facilities.length;
      document.getElementById("statPending").textContent=d.reservations.filter(r=>r.status==="Pending").length;
      document.getElementById("statApproved").textContent=d.reservations.filter(r=>["Approved","Scheduled","In Use"].includes(r.status)).length;
      document.getElementById("statCompleted").textContent=d.reservations.filter(r=>r.status==="Completed").length;

      document.getElementById("facilitiesList").innerHTML=`<table><thead><tr><th>Name</th><th>Location</th><th>Capacity</th><th>Condition</th><th>Status</th><th>Action</th></tr></thead><tbody>${d.facilities.map(f=>`<tr><td>${esc(f.name)}</td><td>${esc(f.location)}</td><td>${f.capacity}</td><td>${esc(f.condition)}</td><td><span class="status">${esc(f.status)}</span></td><td>${u.role==="admin"?`<button class="link" onclick="editFacility('${f.id}')">Edit</button> <button class="link danger" onclick="deleteFacility('${f.id}')">Delete</button>`:"View only"}</td></tr>`).join("")}</tbody></table>`;

      document.getElementById("reservationFacility").innerHTML=d.facilities.filter(f=>f.status==="Active"&&f.condition!=="Maintenance").map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join("");
      document.getElementById("serviceFacility").innerHTML=d.facilities.map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join("");

      document.getElementById("reservationsList").innerHTML=`<table><thead><tr><th>Requester</th><th>Facility</th><th>Purpose</th><th>Schedule</th><th>Status</th><th>Action</th></tr></thead><tbody>${mine.map(r=>`<tr><td>${esc(r.requester)}</td><td>${esc(r.facility)}</td><td>${esc(r.purpose)}</td><td>${esc(r.start)} → ${esc(r.end)}</td><td><span class="status ${r.status.toLowerCase().replaceAll(" ","-")}">${esc(r.status)}</span></td><td>${reservationActions(r)}</td></tr>`).join("")}</tbody></table>`;

      document.getElementById("servicesList").innerHTML=`<table><thead><tr><th>Facility</th><th>Concern</th><th>Description</th><th>Status</th><th>Created By</th></tr></thead><tbody>${d.services.map(s=>`<tr><td>${esc(s.facility)}</td><td>${esc(s.concern)}</td><td>${esc(s.description)}</td><td>${esc(s.status)}</td><td>${esc(s.created_by)}</td></tr>`).join("") || "<tr><td colspan='5'>No service requests.</td></tr>"}</tbody></table>`;

      document.getElementById("auditList").innerHTML=`<table><thead><tr><th>Date/Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Details</th></tr></thead><tbody>${d.audit_logs.map(a=>`<tr><td>${new Date(a.created_at).toLocaleString()}</td><td>${esc(a.actor)}</td><td>${roleName(a.actor_role)}</td><td>${esc(a.action)}</td><td>${esc(a.details)}</td></tr>`).join("") || "<tr><td colspan='5'>No audit records yet.</td></tr>"}</tbody></table>`;
    }
    function reservationActions(r){
      let h="";
      if(u.role==="admin"&&r.status==="Pending") h+=`<button class="link" onclick="statusAction('${r.id}','Approved')">Approve</button> <button class="link danger" onclick="statusAction('${r.id}','Rejected')">Reject</button>`;
      if(u.role==="staff"&&r.status==="Scheduled") h+=`<button class="link" onclick="statusAction('${r.id}','In Use')">Mark In Use</button>`;
      if(u.role==="staff"&&r.status==="In Use") h+=`<button class="link" onclick="statusAction('${r.id}','Completed')">Complete</button>`;
      if(u.role==="requester"&&r.user_id===u.id&&r.status==="Pending") h+=`<button class="link danger" onclick="statusAction('${r.id}','Cancelled')">Cancel</button>`;
      return h||"—";
    }
    window.renderAll=renderAll;

    window.editFacility=id=>{
      if(u.role!=="admin") return deny();
      const f=data().facilities.find(x=>x.id===id); if(!f)return;
      document.getElementById("facilityId").value=f.id; document.getElementById("facilityName").value=f.name; document.getElementById("facilityLocation").value=f.location; document.getElementById("facilityCapacity").value=f.capacity; document.getElementById("facilityCondition").value=f.condition; document.getElementById("facilityStatus").value=f.status; document.getElementById("facilityFormWrap").classList.remove("hidden");
    };
    window.deleteFacility=id=>{
      if(u.role!=="admin") return deny();
      const d=data(), f=d.facilities.find(x=>x.id===id);
      if(d.reservations.some(r=>r.facility_id===id&&["Pending","Approved","Scheduled","In Use"].includes(r.status))){toast("Blocked: facility has active reservations.");return;}
      if(confirm("Delete this facility?")){d.facilities=d.facilities.filter(x=>x.id!==id);saveData(d);log("Facility deleted",f?.name||id,null,id);renderAll();}
    };
    renderAll();
  }
})();