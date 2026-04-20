function showPage(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

async function doLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    clearAuthMsg('login');
    if (!username || !password) {
        showAuthMsg('login', 'error', 'Please fill in all fields.');return;
    }
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = 'Signing in...';
    try {
        const res = await fetch('db.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',username,password})});
        const data = await res.json();
        if (data.success) {
            setUser(data.fullname,data.username);
            showPage('page-app');
            notify('Welcome back, '+ data.fullname + '!','success');
        } else {
            showAuthMsg('login','error',data.message);
        }
    } catch (e) {
        showAuthMsg('login','error','Cannot reach server. Is XAMPP running?');
    }
    btn.disabled = false;btn.textContent='Sign In →';
}

async function doSignup() {
    const fullname = document.getElementById('signup-fullname').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    clearAuthMsg('signup');
    
    if (!fullname || !username || !email || !password || !confirm) {
        showAuthMsg('signup','error','All fields are required.');
        return;
    }

    if (password != confirm) {
        showAuthMsg('signup','error','Passwords do not match.');
        return;
    }

    if (password.length < 6) {
        showAuthMsg('signup','error','Password must be at least 6 characters.');
        return;
    }

    const btn = document.getElementById('signup-btn');
    btn.disabled = true; btn.textContent='Creating account...';

    try {
        const res = await fetch('db.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'signup',fullname,username,email,password})});
        const data = await res.json();
        if (data.success) {
            setUser(data.fullname,data.username);
            showPage('page-app');
            notify('Account created! Welcome, ' + data.fullname + '!','success');
        } else {
            showAuthMsg('signup','error',data.message);
        }
    } catch (e) {
        showAuthMsg('signup','error','Cannot reach server. Is XAMPP running?');
    }
    btn.disabled = false;btn.textContent='Create Account →';
}

async function doLogout() {
    await fetch('db.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});
    showPage('page-login');
    notify('Logged out successfully','success');
}

function setUser(fullname, username) {
    document.getElementById('nav-username').textContent = fullname;
    document.getElementById('nav-avatar').textContent = fullname.charAt(0).toUpperCase();
}

function showAuthMsg(page, type, msg) {
    const el = document.getElementById(page + '-' + (type === 'error' ? 'error':'success'));
    el.textContent = (type === 'error' ? '✕ ':' ✓ ')+msg;
    el.style.display = 'block';
}

function clearAuthMsg(page) {
    document.getElementById(page + '-error').style.display = 'none';
    document.getElementById(page + '-success').style.display = 'none';
}

function togglePw(id, btn) {
    const inp = document.getElementById(id);
    if (inp.type === 'password') {
        inp.type = 'text';
        btn.textContent = 'hide';
    } else {
        inp.type = 'password';
        btn.textContent = 'show';
    }
}

document.addEventListener('keydown', e=> {
    if (e.key === 'Enter') {
        if (document.getElementById('page-login').classList.contains('active')) doLogin();
        else if (document.getElementById('page-signup').classList.contains('active')) doSignup();
    }
});

window.addEventListener('load',async()=>{
    try {
        const res = await fetch('db.php?action=check_session');
        const data = await res.json();
        if (data.loggedIn) {
            setUser(data.fullname, data.username);
            showPage('page-app');
        }
    } catch (e) {

    }
});

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !@#$%^&*()-_=+[]{}|;:',.<>?/`~\"\\";
const ALEN = ALPHABET.length;
function deriveKeyStream(key, len){
    const ks = [];
    for(let i=0;i<len;i++) {
        ks.push(key.charCodeAt(i%key.length));
    }
    return ks;
}

function encrypt(plain, key, shift) {
    if (!plain) return{
        out:'', steps:'No input.'
    };

    if (!key) return{
        out:'',steps:'Key required.'
    };

    const log = [];

    const ks = deriveKeyStream(key, plain.length);
    log.push('STEP 1 — KEY STREAM\nKey: "'+key+'"\nStream[0..9]: ['+ks.slice(0,10).join(',')+']');
    let subst = '';
    
    for (let i=0;i<plain.length;i++) {
        const idx = ALPHABET.indexOf(plain[i]);subst += idx===-1?plain[i]:ALPHABET[(idx+ks[i])%ALEN];
    }
    log.push('STEP 2 — KEYSTREAM SUBSTITUTION\n"'+plain.slice(0,40)+'" →\n"'+subst.slice(0,40)+'"');
    let shifted = '';
    
    for (const c of subst) {
        if (c >= 'A' && c <= 'Z') shifted+=String.fromCharCode(((c.charCodeAt(0)-65+shift)%26)+65);
        else if (c>='a'&&c<='z') shifted+=String.fromCharCode(((c.charCodeAt(0)-97+shift)%26)+97);
        else shifted += c;
    }
    log.push('STEP 3 — CAESAR SHIFT (offset='+shift+')\n"'+shifted.slice(0,40)+'"');
    const RAILS = 3; const rails = Array.from({length:RAILS},()=>[]); let r=0,d=1;
    
    for (const c of shifted) {
        rails[r].push(c);if(r===0)d=1;else if(r===RAILS-1)d=-1;r+=d;
    }
    const transposed=rails.flat().join('');
    log.push('STEP 4 — RAIL-FENCE\n"'+transposed.slice(0,40)+'"');
    const ck=key.length;let chunked='';

    for (let i=0;i<transposed.length;i+=ck) chunked+=transposed.slice(i,i+ck).split('').reverse().join('');
    log.push('STEP 5 — CHUNK REVERSAL\n"'+chunked.slice(0,40)+'"');
    let hex='';for(let i=0;i<chunked.length;i++) hex+=chunked.charCodeAt(i).toString(16).padStart(2,'0');
    log.push('STEP 6 — HEX ENCODE\n"'+hex.slice(0,60)+'"');
    log.push('\n✓ ENCRYPTION COMPLETE');
    return{out:hex,steps:log.join('\n\n')};

}

function decrypt(cipher, key, shift) {
    if (!cipher) return {
        out:'',steps:'No input.'
    };

    if (!key) return {
        out:'',steps:'Key required.'
    };
    const log=[];
    let chunked = '';

    for(let i=0;i<cipher.length;i+=2) {
        const b=parseInt(cipher.slice(i,i+2),16);if(isNaN(b)) return{out:'ERROR: invalid hex.',steps:'Hex decode failed.'};chunked+=String.fromCharCode(b);
    }
    log.push('STEP 1 — HEX DECODE\n"'+chunked.slice(0,40)+'"');
    const ck=key.length;let transposed='';

    for(let i=0;i<chunked.length;i+=ck) transposed+=chunked.slice(i,i+ck).split('').reverse().join('');
    log.push('STEP 2 — UN-REVERSE CHUNKS\n"'+transposed.slice(0,40)+'"');
    const RAILS=3,n=transposed.length;const pattern=[];let r=0,d=1;

    for(let i=0;i<n;i++) {
        pattern.push(r);
        if(r===0)d=1; else if(r===RAILS-1)d=-1; r+=d;
    }
    const indices=Array.from({length:RAILS},()=>[]);pattern.forEach((rail,i)=>indices[rail].push(i));
    const order=indices.flat();const res=new Array(n);for(let i=0;i<n;i++) res[order[i]]=transposed[i];
    const shifted2=res.join('');
    log.push('STEP 3 — INVERSE RAIL-FENCE\n"'+shifted2.slice(0,40)+'"');
    let subst='';
    
    for (const c of shifted2) {
        if(c>='A'&&c<='Z') subst+=String.fromCharCode(((c.charCodeAt(0)-65-shift+26)%26)+65);
        else if(c>='a'&&c<='z') subst+=String.fromCharCode(((c.charCodeAt(0)-97-shift+26)%26)+97);
        else subst+=c;
    }
    log.push('STEP 4 — REVERSE CAESAR\n"'+subst.slice(0,40)+'"');
    const ks=deriveKeyStream(key,subst.length);let plain='';
    
    for(let i=0;i<subst.length;i++){const idx=ALPHABET.indexOf(subst[i]);plain+=idx===-1?subst[i]:ALPHABET[((idx-ks[i])%ALEN+ALEN)%ALEN];}
    log.push('STEP 5 — REVERSE SUBSTITUTION\n"'+plain.slice(0,40)+'"');
    log.push('\n✓ DECRYPTION COMPLETE');
    return{out:plain,steps:log.join('\n\n')};
}

function calcEntropy(s){const freq={};for(const c of s)freq[c]=(freq[c]||0)+1;let e=0,n=s.length;for(const c in freq){const p=freq[c]/n;e-=p*Math.log2(p);}return e.toFixed(2);}
function calcIC(s){const al=s.replace(/[^a-zA-Z]/g,'').toLowerCase();const freq={};for(const c of al)freq[c]=(freq[c]||0)+1;let sum=0,n=al.length;for(const c in freq)sum+=freq[c]*(freq[c]-1);if(n<2)return'0.0000';return(sum/(n*(n-1))).toFixed(4);}

let lastEncResult='',lastDecResult='';

function doEncrypt() {
    const plain = document.getElementById('enc-plain').value;
    const key = document.getElementById('enc-key').value;
    const shift = parseInt(document.getElementById('enc-shift').value)||0;
    const res = encrypt(plain,key,shift);
    lastEncResult = res.out;
    document.getElementById('enc-output').textContent=res.out||'(empty)';
    document.getElementById('enc-steps').textContent=res.steps;
    if (res.out) {
        document.getElementById('enc-metrics').style.display='flex';
        document.getElementById('em-len').textContent=res.out.length;
        document.getElementById('em-ent').textContent=calcEntropy(res.out);
        document.getElementById('em-ic').textContent=calcIC(res.out);
        document.getElementById('dec-cipher').value=res.out;
        document.getElementById('dec-key').value=key;
        document.getElementById('dec-shift').value=shift;
    }
    notify('Encryption complete','success');
}

function doDecrypt() {
    const cipher = document.getElementById('dec-cipher').value.trim();
    const key = document.getElementById('dec-key').value;
    const shift = parseInt(document.getElementById('dec-shift').value)||0;
    const res = decrypt(cipher,key,shift);
    lastDecResult = res.out;
    document.getElementById('dec-output').textContent=res.out||'(empty)';
    document.getElementById('dec-steps').textContent=res.steps;
    notify('Decryption complete','success');
}

function clearEncrypt() {
    document.getElementById('enc-plain').value='';
    document.getElementById('enc-output').innerHTML='<span style="color:var(--muted);font-style:italic">Encrypted text will appear here...</span>';
    document.getElementById('enc-steps').textContent='Run encryption to see steps...';
    document.getElementById('enc-metrics').style.display='none';
    document.getElementById('save-enc').style.display='none';
    lastEncResult='';
}

function clearDecrypt() {
    document.getElementById('dec-cipher').value='';
    document.getElementById('dec-output').innerHTML='<span style="color:var(--muted);font-style:italic">Decrypted text will appear here...</span>';
    document.getElementById('dec-steps').textContent='Run decryption to see steps...';
    document.getElementById('save-dec').style.display='none';
    lastDecResult='';
}

function copyText(id) {
    navigator.clipboard.writeText(document.getElementById(id).textContent).then(()=>notify('Copied!','success'));
}

async function saveRecord(type) {
    let input='',output='',key='',shift=0,label='';
    const side=type==='encrypt'?'enc':'dec';
    if (type === 'encrypt') {
        input = document.getElementById('enc-plain').value;output=lastEncResult;
        key = document.getElementById('enc-key').value;shift=parseInt(document.getElementById('enc-shift').value)||0;
        label = document.getElementById('enc-label').value||'Untitled';
        if(!output){showSave(side,'Run encryption first.','error');return;}
    } else {
        input = document.getElementById('dec-cipher').value;output=lastDecResult;
        key = document.getElementById('dec-key').value;shift=parseInt(document.getElementById('dec-shift').value)||0;
        label = document.getElementById('dec-label').value||'Decrypted record';
        if(!output){showSave(side,'Run decryption first.','error');return;}
    }
    showSave(side,'Saving...','success');
    try{
        const res = await fetch('db.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',type,label,input,output,enc_key:key,shift})});
        const data = await res.json();
        if(data.success){
        showSave(side,'✓ Saved to MySQL (ID: '+data.id+')','success');
        notify('Saved to MySQL!','success');
}
        else{showSave(side,'✕ '+data.message,'error');notify(data.message,'error');}
    } catch(e){
        showSave(side,'✕ Cannot reach server — check XAMPP','error');
  }
}

function showSave(side,msg,type) { 
    const el = document.getElementById('save-' + side);
    el.textContent = msg; el.className = 'save-status ' + type;el.style.display = 'block';
}

function switchTab(t) {
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('tab-'+t).classList.add('active');
    const order = ['encrypt','decrypt','test','algo'];
    document.querySelectorAll('.tab-btn')[order.indexOf(t)].classList.add('active');
}

let nt = null;
function notify(msg,type='success'){
    const el = document.getElementById('notif');
    el.textContent=(type==='success'?'✓ ':'✕ ') + msg;
    el.className='notif show ' + type;
    if(nt) clearTimeout(nt);
    nt = setTimeout(()=>el.classList.remove('show'),2800);
}

const TESTS = [
    {name:'Basic roundtrip',plain:'Hello World!',key:'TestKey',shift:5},
    {name:'Empty string',plain:'',key:'AnyKey',shift:3},
    {name:'Numeric + symbols',plain:'1234 5678 !@#$%',key:'nums',shift:0},
    {name:'Full pangram',plain:'The quick brown fox jumps over the lazy dog.',key:'LongPhrase',shift:13},
    {name:'Key length = 1',plain:'Secret message',key:'A',shift:1},
    {name:'Shift = 0',plain:'Zero shift test',key:'KeyZero',shift:0},
    {name:'Shift = 25 (max)',plain:'MaxShift test!',key:'MaxK',shift:25},
    {name:'Repeated chars',plain:'aaaaaaaaaa',key:'RepKey',shift:4},
    {name:'Single character',plain:'X',key:'SingleChar',shift:10},
    {name:'Special chars only',plain:'!@#$%^&*()',key:'Special',shift:2},
    {name:'Very short key',plain:'Test message here.',key:'K',shift:7},
    {name:'Long key',plain:'Short msg',key:'ThisIsAVeryLongKeyThatExceedsMsg',shift:3},
    {name:'All digits',plain:'0123456789',key:'Digits',shift:9},
    {name:'Wrong key fails',plain:'Test',key:'RightKey',shift:5,wrongKey:'WrongKey',expectFail:true},
    {name:'Wrong shift fails',plain:'Test',key:'MyKey',shift:5,wrongShift:3,expectFail2:true},
];

function runTests() {
    const list=document.getElementById('test-list');const summary=document.getElementById('test-summary');
    list.innerHTML='';let pass=0,fail=0;const items=[];
    for(const tc of TESTS) {
        if(tc.plain===''){const enc=encrypt(tc.plain,tc.key,tc.shift);const ok=enc.out==='';ok?pass++:fail++;items.push({ok,name:tc.name,detail:'Empty input → empty output'});continue;}
        if(tc.expectFail){const enc=encrypt(tc.plain,tc.key,tc.shift);const dec=decrypt(enc.out,tc.wrongKey,tc.shift);const ok=dec.out!==tc.plain;ok?pass++:fail++;items.push({ok,name:tc.name,detail:'Wrong key → different output: confirmed'});continue;}
        if(tc.expectFail2){const enc=encrypt(tc.plain,tc.key,tc.shift);const dec=decrypt(enc.out, tc.key, tc.wrongShift ?? 0);const ok=dec.out!==tc.plain;ok?pass++:fail++;items.push({ok,name:tc.name,detail:'Wrong shift → different output: confirmed'});continue;}
        const enc=encrypt(tc.plain,tc.key,tc.shift);const dec=decrypt(enc.out,tc.key,tc.shift);const ok=dec.out===tc.plain;ok?pass++:fail++;
        items.push({ok,name:tc.name,detail:'Cipher: "'+enc.out.slice(0,22)+'…" → "'+dec.out.slice(0,22)+'"'});
    }
    list.innerHTML=items.map(it=>`<div class="test-item"><span class="${it.ok?'test-pass':'test-fail'}">${it.ok?'PASS':'FAIL'}</span><div><div class="test-name">${it.name}</div><div class="test-detail">${it.detail}</div></div></div>`).join('');
    const pct=Math.round((pass/(pass+fail))*100);
    summary.style.display='block';
    summary.innerHTML=`<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:.5rem">
        <div class="metric"><div class="metric-val" style="color:#2ecc71">${pass}</div><div class="metric-lbl">Passed</div></div>
        <div class="metric"><div class="metric-val" style="color:var(--accent3)">${fail}</div><div class="metric-lbl">Failed</div></div>
        <div class="metric"><div class="metric-val">${pct}%</div><div class="metric-lbl">Pass rate</div></div>
        <div class="metric"><div class="metric-val">${pass+fail}</div><div class="metric-lbl">Total</div></div>
    </div>`;
    notify('Tests complete: '+pass+'/'+(pass+fail)+' passed','success');
}

function clearTests(){document.getElementById('test-list').innerHTML='';document.getElementById('test-summary').style.display='none';}