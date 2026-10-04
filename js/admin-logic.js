// ============================================================================
// FILE 4: js/admin-logic.js (PART 1)
// (Complete Admin Logic: Auth, Users, Support Chat, Settings)
// ============================================================================

import "./config-templates.js";

const {
    firebaseConfig, auth, db, onAuthStateChanged, signOut,
    doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, onSnapshot
} = window.fb;

const ADMIN_EMAIL = window.ADMIN_EMAIL;
const FREE_VIP_EMAILS = window.FREE_VIP_EMAILS;
const MS_PER_DAY = window.MS_PER_DAY;

// ================= STAMP FILES AUTO-DETECT & RANDOM CONFIG =================
const CANDIDATE_STAMP_FILES = ["stamp.png", "stamp1.png", "stamp2.png", "stamp3.png", "stamp4.png", "stamp5.png"];

window.availableStampsList = [];
window.stampSelectionMap = {};
window.certificateSelectionMap = {}; 
window.currentModalContext = { fileId: '', fileName: '', historyIndex: -1, withStamp: false, stampSrc: '', stampFile: '', certificateFileId: '' };

window.currentUserData = null;
window.allUsersMap = {};
window.usersDataList = {};
window.adminAllHistoryData = [];

window.allPaymentsData = [];
window.currentPaymentFilter = 'Pending';
window.allSupportTickets = [];
window.selectedChatTicketId = null;
window.supportUnsubscribe = null;
window.adminSupportWhatsapp = "919306437623";

window.loadSingleStampFile = function(fileName) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            if (!img.naturalWidth || img.naturalWidth === 0) return resolve(null);
            try {
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth || 794; canvas.height = img.naturalHeight || 1122; ctx.drawImage(img, 0, 0);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) { if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) { data[i + 3] = 0; } }
                ctx.putImageData(imgData, 0, 0); resolve({ name: fileName, dataUrl: canvas.toDataURL('image/png') });
            } catch (e) { resolve({ name: fileName, dataUrl: fileName }); }
        };
        img.onerror = () => resolve(null); img.src = fileName;
    });
};

window.preloadAllAvailableStamps = async function() {
    if (window.availableStampsList.length > 0) return window.availableStampsList;
    const results = await Promise.all(CANDIDATE_STAMP_FILES.map(file => window.loadSingleStampFile(file)));
    window.availableStampsList = results.filter(item => item !== null);
    window.updateStampCountBadge(); return window.availableStampsList;
};

window.updateStampCountBadge = function() {
    const badge = document.getElementById('activeStampsBadge'); if (!badge) return;
    const count = window.availableStampsList.length;
    if (count > 0) {
        const names = window.availableStampsList.map(s => s.name).join(', ');
        badge.className = "text-[10px] font-black bg-green-100 text-green-800 border border-green-300 px-2.5 py-0.5 rounded-full";
        badge.innerHTML = `<i class="fa-solid fa-stamp mr-1"></i>${count} Stamps Active`; badge.title = `Loaded: ${names}`;
    } else {
        badge.className = "text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full";
        badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i>No Stamp Uploaded`;
    }
};

window.pickRandomAvailableStampObj = function() {
    if (window.availableStampsList.length === 0) return { name: "stamp.png", dataUrl: "stamp.png" };
    const randomIndex = Math.floor(Math.random() * window.availableStampsList.length); return window.availableStampsList[randomIndex];
};
window.pickRandomAvailableStamp = function() { return window.pickRandomAvailableStampObj().dataUrl; };
window.getStampDataUrlByName = function(fileName) {
    if (!fileName) return window.pickRandomAvailableStamp();
    const found = window.availableStampsList.find(s => s.name === fileName); return found ? found.dataUrl : window.pickRandomAvailableStamp();
};

onAuthStateChanged(auth, async (user) => {
    if (!user || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        alert('Not authorized! Only Super Admin can access this page.'); window.location.href = "index.html";
    } else {
        window.currentUserData = { uid: user.uid, email: user.email };
        document.getElementById('adminPanelContent').classList.remove('hidden'); document.getElementById('loadingScreen').classList.add('hidden');
        await window.preloadAllAvailableStamps(); await window.loadAllUsersForDropdown(); await window.loadPortalSettingsForAdmin();
        window.startLiveSupportListener(); window.switchAdminMainTab('payments');
    }
});

window.handleLogout = async function() { await signOut(auth); window.location.href = "index.html"; };
window.copyUtrText = function(utr, btnEl) { navigator.clipboard.writeText(utr); const orig = btnEl.innerHTML; btnEl.innerHTML = '<i class="fa-solid fa-check text-green-600"></i> Copied'; setTimeout(() => { btnEl.innerHTML = orig; }, 1500); };
window.getPortalLoginUrl = function() { return window.location.origin + window.location.pathname.replace('admin.html', 'index.html'); };
window.formatCleanPhone = function(rawPhone = '') { let digits = String(rawPhone).replace(/\D/g, ''); if (digits.length === 10) digits = '91' + digits; return digits; };

window.buildUserCredentialsText = function(email, pass, credits, isVip, vipExpiry) {
    const now = Date.now(); let vipText = "Normal User";
    if (FREE_VIP_EMAILS.includes(email.toLowerCase())) { vipText = "👑 Lifetime Free VIP"; } else if (isVip) {
        if (vipExpiry && vipExpiry > now) { const remDays = Math.ceil((vipExpiry - now) / MS_PER_DAY); vipText = `👑 VIP Active (${remDays} Days)`; } else { vipText = `👑 VIP Active`; }
    }
    return `🌟 Ojas Print Service - Login Details 🌟\n\n👤 User ID: ${email}\n🔑 Password: ${pass || 'Not Set'}\n💰 Credits Balance: ${FREE_VIP_EMAILS.includes(email.toLowerCase()) ? 'Unlimited (Free)' : (credits || 0) + ' Cr'}\n✨ Status: ${vipText}\n\n🌐 Login Portal Link:\n${window.getPortalLoginUrl()}`;
};

window.shareSelectedUserCredentials = async function(channel) {
    const uid = document.getElementById('userSelectDropdown').value; if (!uid || !window.usersDataList[uid]) return alert('कृपया पहले ड्रॉपडाउन से यूज़र सेलेक्ट करें!');
    const uData = window.usersDataList[uid]; const phoneInput = document.getElementById('selectedUserPhoneInput')?.value.trim() || '';
    if (phoneInput && phoneInput !== uData.userPhone) { try { await updateDoc(doc(db, "users", uid), { userPhone: phoneInput }); uData.userPhone = phoneInput; } catch (e) {} }
    const passToUse = uData.userPass || '[कृपया पहले नया पासवर्ड सेट करें]';
    const messageText = window.buildUserCredentialsText(uData.email, passToUse, uData.credits, uData.isVip, uData.vipExpiry);

    if (channel === 'copy') { navigator.clipboard.writeText(messageText); alert('यूज़र की ID और Password डिटेल्स कॉपी हो गई हैं!'); return; }
    if (channel === 'whatsapp') {
        let targetPhone = window.formatCleanPhone(phoneInput || uData.userPhone || '');
        if (!targetPhone) {
            const askPhone = prompt("यूज़र का 10 अंकों का WhatsApp नंबर डालें (या बिना नंबर सीधे WhatsApp खोलने के लिए खाली छोड़कर OK दबाएं):", "");
            if (askPhone === null) return;
            if (askPhone.trim()) {
                targetPhone = window.formatCleanPhone(askPhone.trim());
                try { await updateDoc(doc(db, "users", uid), { userPhone: askPhone.trim() }); uData.userPhone = askPhone.trim(); if (document.getElementById('selectedUserPhoneInput')) { document.getElementById('selectedUserPhoneInput').value = askPhone.trim(); } } catch (e) {}
            }
        }
        const waUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(messageText)}` : `https://wa.me/?text=${encodeURIComponent(messageText)}`; window.open(waUrl, '_blank');
    } else if (channel === 'email') {
        const targetEmail = uData.contactEmail || (uData.email.endsWith('@print.com') ? prompt("यूज़र का असली Email एड्रेस डालें:", "") : uData.email);
        if (!targetEmail) return; window.open(`mailto:${targetEmail}?subject=${encodeURIComponent("Ojas Print Service - Your Login ID & Password")}&body=${encodeURIComponent(messageText)}`, '_self');
    }
};

window.saveSelectedUserPhone = async function() {
    const uid = document.getElementById('userSelectDropdown').value; if (!uid || !window.usersDataList[uid]) return alert('कृपया पहले यूज़र सेलेक्ट करें!');
    const phoneVal = document.getElementById('selectedUserPhoneInput').value.trim();
    try { await updateDoc(doc(db, "users", uid), { userPhone: phoneVal }); window.usersDataList[uid].userPhone = phoneVal; alert('यूज़र का WhatsApp नंबर सेव हो गया!'); } catch (err) { alert('Error: ' + err.message); }
};

window.toggleUserDobAccess = async function(allowed) {
    const uid = document.getElementById('userSelectDropdown').value;
    if (!uid || !window.usersDataList[uid]) { alert('कृपया पहले ड्रॉपडाउन से यूज़र सेलेक्ट करें!'); const chk = document.getElementById('userDobToggle'); if (chk) chk.checked = !allowed; return; }
    const uData = window.usersDataList[uid]; const msg = document.getElementById('adminMsg');
    try {
        await updateDoc(doc(db, "users", uid), { allowDob18: allowed }); window.usersDataList[uid].allowDob18 = allowed;
        msg.className = "p-3.5 bg-amber-50 text-amber-950 rounded-2xl text-xs font-black border border-amber-300 text-center shadow-sm";
        msg.innerHTML = `<i class="fa-solid ${allowed ? 'fa-eye text-green-600' : 'fa-eye-slash text-red-600'} mr-1"></i> <strong>${uData.email}</strong> के लिए DOB 18+ सेक्शन <strong>${allowed ? 'चालू (Visible)' : 'गायब (Hidden)'}</strong> कर दिया गया है!`;
        msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 3500);
    } catch (err) { alert('Error: ' + err.message); }
};

window.deleteSelectedUserAccount = async function() {
    const uid = document.getElementById('userSelectDropdown').value;
    if (!uid || !window.usersDataList[uid]) return alert('कृपया पहले ड्रॉपडाउन से उस यूज़र को सेलेक्ट करें जिसे आप डिलीट करना चाहते हैं!');
    const uData = window.usersDataList[uid];
    if ((uData.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()) return alert('आप मुख्य सुपर एडमिन अकाउंट को डिलीट नहीं कर सकते!');
    if (!confirm(`⚠️ चेतावनी!\n\nक्या आप वाकई यूज़र "${uData.email}" का अकाउंट हमेशा के लिए डिलीट करना चाहते हैं?`)) return;
    const btn = document.getElementById('btnDeleteUserAccount'); const origHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Deleting User...'; }

    try {
        if (uData.userPass) {
            try {
                const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: uData.email, password: uData.userPass, returnSecureToken: true }) });
                const signInData = await signInRes.json();
                if (signInData.idToken) { await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${firebaseConfig.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: signInData.idToken }) }); }
            } catch (e) {}
        }
        await deleteDoc(doc(db, "users", uid)); try { await deleteDoc(doc(db, "supportTickets", uid)); } catch (e) {}
        delete window.usersDataList[uid]; await window.loadAllUsersForDropdown(); document.getElementById('userSelectDropdown').value = ''; window.handleUserSelection();
        const msg = document.getElementById('adminMsg');
        if (msg) { msg.className = "p-3.5 bg-red-50 text-red-800 rounded-2xl text-xs font-black border border-red-300 text-center shadow-sm"; msg.innerHTML = `<i class="fa-solid fa-trash-can mr-1"></i> यूज़र <strong>${uData.email}</strong> का अकाउंट हमेशा के लिए डिलीट कर दिया गया है!`; msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 4000); }
    } catch (err) { alert('Error: ' + err.message); } finally { if (btn) { btn.disabled = false; btn.innerHTML = origHtml; } }
};

window.findUserUidByIdentifier = function(identifier = '') { const clean = String(identifier).trim().toLowerCase(); if (!clean) return ''; for (const [uid, uData] of Object.entries(window.usersDataList)) { const emailLower = (uData.email || '').toLowerCase(); const unameLower = (uData.username || emailLower.split('@')[0]).toLowerCase(); if (emailLower === clean || unameLower === clean || `${clean}@print.com` === emailLower) { return uid; } } return ''; };
window.getTicketMessagesArray = function(ticket) { let arr = Array.isArray(ticket.messages) ? [...ticket.messages] : []; if (arr.length === 0 && ticket.message) { const sec = ticket.timestamp?.seconds || Math.floor(Date.now() / 1000); arr.push({ sender: 'user', text: ticket.message, time: sec * 1000 }); } return arr; };

window.startLiveSupportListener = function() {
    if (window.supportUnsubscribe) window.supportUnsubscribe();
    window.supportUnsubscribe = onSnapshot(collection(db, "supportTickets"), (snap) => {
        window.allSupportTickets = []; snap.forEach(docSnap => { window.allSupportTickets.push({ id: docSnap.id, ...docSnap.data() }); });
        window.allSupportTickets.sort((a, b) => { const timeA = a.updatedAtMs || (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0); const timeB = b.updatedAtMs || (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0); return timeB - timeA; });
        window.updateSupportNavBadge(); window.renderSupportChatSidebar();
        if (window.selectedChatTicketId) { window.renderActiveChatConversation(window.selectedChatTicketId, false); }
    });
};

window.updateSupportNavBadge = function() { let unreadCount = 0; window.allSupportTickets.forEach(t => { if (t.unreadByAdmin === true || (t.unreadByAdmin === undefined && (t.status || 'Open') === 'Open')) unreadCount++; }); const badge = document.getElementById('navSupportBadge'); if (badge) { badge.innerText = unreadCount; badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none'; } };

window.renderSupportChatSidebar = function() {
    const listEl = document.getElementById('supportChatThreadsList'); if (!listEl) return;
    const searchVal = (document.getElementById('supportSearchInput')?.value || '').trim().toLowerCase();
    const filtered = window.allSupportTickets.filter(t => { if (!searchVal) return true; return (t.userIdentifier || '').toLowerCase().includes(searchVal) || (t.userPhone || '').toLowerCase().includes(searchVal); });

    if (filtered.length === 0) { listEl.innerHTML = `<div class="p-8 text-center text-slate-400 font-bold text-xs"><i class="fa-regular fa-comments text-3xl mb-2 text-slate-300"></i><br>अभी कोई यूज़र चैट या टिकट नहीं है।</div>`; return; }
    listEl.innerHTML = '';
    filtered.forEach(t => {
        const msgs = window.getTicketMessagesArray(t); const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : { text: t.message || 'No message', sender: 'user' };
        const isSelected = window.selectedChatTicketId === t.id; const isUnread = t.unreadByAdmin === true || (t.unreadByAdmin === undefined && (t.status || 'Open') === 'Open'); const isForgot = t.type === 'FORGOT_PASSWORD';
        const timeMs = t.updatedAtMs || (t.timestamp?.seconds ? t.timestamp.seconds * 1000 : Date.now()); const timeStr = new Date(timeMs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const activeClass = isSelected ? 'bg-royal-50 border-royal-400 shadow-sm' : (isUnread ? 'bg-red-50/60 border-red-200 hover:bg-slate-50' : 'bg-white border-slate-200 hover:bg-slate-50');

        listEl.innerHTML += `
            <div onclick="window.selectSupportChatThread('${t.id}')" class="p-3 rounded-2xl border-2 ${activeClass} cursor-pointer transition space-y-1">
                <div class="flex items-center justify-between gap-1">
                    <div class="flex items-center gap-1.5 overflow-hidden">
                        ${isUnread ? `<span class="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 animate-pulse">NEW</span>` : ''}
                        ${isForgot ? `<span class="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0"><i class="fa-solid fa-key mr-0.5"></i>Pass</span>` : `<i class="fa-solid fa-circle-user text-royal-600 text-xs shrink-0"></i>`}
                        <span class="text-xs font-black text-dark-900 truncate">${t.userIdentifier || 'User'}</span>
                    </div>
                    <span class="text-[10px] font-semibold text-slate-400 shrink-0">${timeStr}</span>
                </div>
                <p class="text-[11px] font-semibold ${isUnread ? 'text-slate-900 font-bold' : 'text-slate-500'} truncate">${lastMsg.sender === 'admin' ? '<span class="text-indigo-600 font-black">You: </span>' : ''}${lastMsg.text}</p>
            </div>
        `;
    });
};

window.selectSupportChatThread = async function(ticketId) {
    window.selectedChatTicketId = ticketId; window.renderSupportChatSidebar(); window.renderActiveChatConversation(ticketId, true);
    const ticket = window.allSupportTickets.find(t => t.id === ticketId);
    if (ticket && (ticket.unreadByAdmin === true || ticket.unreadByAdmin === undefined)) { try { await updateDoc(doc(db, "supportTickets", ticketId), { unreadByAdmin: false }); } catch (e) {} }
};

window.renderActiveChatConversation = function(ticketId, scrollToBottom = true) {
    const emptyState = document.getElementById('chatWindowEmptyState'); const activeBox = document.getElementById('chatWindowActiveBox');
    const ticket = window.allSupportTickets.find(t => t.id === ticketId);
    if (!ticket) { if (emptyState) emptyState.classList.remove('hidden'); if (activeBox) activeBox.classList.add('hidden'); return; }

    if (emptyState) emptyState.classList.add('hidden'); if (activeBox) activeBox.classList.remove('hidden');
    const matchedUid = ticket.userId || window.findUserUidByIdentifier(ticket.userIdentifier); const matchedUser = matchedUid ? window.usersDataList[matchedUid] : null;

    document.getElementById('chatHeaderUserTitle').innerText = ticket.userIdentifier || 'Unknown User';
    document.getElementById('chatHeaderUserPhone').innerText = (ticket.userPhone || matchedUser?.userPhone) ? `📱 WhatsApp: ${ticket.userPhone || matchedUser?.userPhone}` : 'No phone number saved';

    const passBadge = document.getElementById('chatHeaderSavedPassBadge');
    if (matchedUser) { passBadge.innerHTML = `Pass: <strong class="text-royal-300 font-mono">${matchedUser.userPass || 'Not Synced'}</strong> • Cr: <strong class="text-emerald-400">${matchedUser.credits || 0}</strong>`; } else { passBadge.innerHTML = `<span class="text-amber-300">Guest Ticket</span>`; }

    const msgContainer = document.getElementById('chatMessagesScrollBox');
    const msgs = window.getTicketMessagesArray(ticket); msgContainer.innerHTML = '';
    msgs.forEach(m => {
        const isAdmin = m.sender === 'admin'; const tStr = m.time ? new Date(m.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
        const safeText = String(m.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        if (isAdmin) {
            msgContainer.innerHTML += `<div class="flex flex-col items-end"><div class="max-w-[80%] bg-dark-900 text-white px-4 py-2.5 rounded-2xl rounded-br-none shadow-sm border border-royal-500/40"><span class="text-[9px] font-black text-royal-400 uppercase block mb-0.5"><i class="fa-solid fa-crown mr-1"></i>Admin Support</span><div class="text-xs font-semibold leading-relaxed">${safeText}</div></div><span class="text-[9px] font-bold text-slate-400 mt-0.5">${tStr}</span></div>`;
        } else {
            msgContainer.innerHTML += `<div class="flex flex-col items-start"><div class="max-w-[80%] bg-white text-slate-800 px-4 py-2.5 rounded-2xl rounded-bl-none shadow-sm border border-slate-200"><span class="text-[9px] font-black text-indigo-600 uppercase block mb-0.5"><i class="fa-solid fa-user mr-1"></i>${ticket.userIdentifier || 'User'}</span><div class="text-xs font-bold leading-relaxed">${safeText}</div></div><span class="text-[9px] font-bold text-slate-400 mt-0.5">${tStr}</span></div>`;
        }
    });
    if (scrollToBottom) { setTimeout(() => { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50); }
};

window.sendAdminChatReply = async function(event) {
    if (event) event.preventDefault(); const ticketId = window.selectedChatTicketId; if (!ticketId) return alert('कृपया पहले बाईं तरफ से किसी यूज़र की चैट पर क्लिक करें!');
    const inp = document.getElementById('adminChatReplyInput'); const replyText = inp.value.trim(); if (!replyText) return;
    const btn = document.getElementById('btnSendAdminChatReply'); const origHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const ticket = window.allSupportTickets.find(t => t.id === ticketId);
        const existingMsgs = window.getTicketMessagesArray(ticket); const newMsgObj = { sender: 'admin', text: replyText, time: Date.now() }; existingMsgs.push(newMsgObj);
        await updateDoc(doc(db, "supportTickets", ticketId), { messages: existingMsgs, lastAdminReply: replyText, status: 'Replied', unreadByAdmin: false, unreadByUser: true, updatedAtMs: Date.now() });

        const matchedUid = ticket.userId || window.findUserUidByIdentifier(ticket.userIdentifier);
        if (matchedUid && matchedUid !== ticketId) {
            try {
                const userChatRef = doc(db, "supportTickets", matchedUid); const userChatSnap = await getDoc(userChatRef);
                let uMsgs = userChatSnap.exists() && Array.isArray(userChatSnap.data().messages) ? [...userChatSnap.data().messages] : []; uMsgs.push(newMsgObj);
                await setDoc(userChatRef, { userId: matchedUid, userIdentifier: window.usersDataList[matchedUid]?.email || ticket.userIdentifier, messages: uMsgs, lastAdminReply: replyText, status: 'Replied', unreadByAdmin: false, unreadByUser: true, updatedAtMs: Date.now() }, { merge: true });
            } catch (e) {}
        }
        inp.value = ''; window.renderActiveChatConversation(ticketId, true);
    } catch (err) { alert('रिप्लाई भेजने में समस्या आई: ' + err.message); } finally { btn.disabled = false; btn.innerHTML = origHtml; }
};

window.insertQuickChatReply = function(type) {
    const ticket = window.allSupportTickets.find(t => t.id === window.selectedChatTicketId); if (!ticket) return alert('कृपया पहले किसी यूज़र की चैट चुनें!');
    const matchedUid = ticket.userId || window.findUserUidByIdentifier(ticket.userIdentifier); const u = matchedUid ? window.usersDataList[matchedUid] : null; const inp = document.getElementById('adminChatReplyInput');
    const shortId = u ? u.email : (ticket.userIdentifier || 'User'); const pass = u ? (u.userPass || '[PASS]') : '[PASS]'; const cr = u ? (u.credits || 0) : 0;

    if (type === 'id_pass') { inp.value = `नमस्ते, आपकी लॉगिन डिटेल्स नीचे दी गई हैं:\nUser ID: ${shortId}\nPassword: ${pass}\nCredits: ${cr} Cr`; } 
    else if (type === 'payment_ok') { inp.value = `नमस्ते ${shortId}, आपका पेमेंट वेरीफाई हो गया है और क्रेडिट्स/VIP आपके अकाउंट में जोड़ दिए गए हैं। पेमेंट स्टेटस रिफ्रेश कर लें।`; } 
    else if (type === 'fixed') { inp.value = `नमस्ते ${shortId}, आपकी समस्या का समाधान कर दिया गया है। कृपया अब पोर्टल चेक करें।`; }
    inp.focus();
};

window.resetPassAndSendInChat = async function() {
    const ticket = window.allSupportTickets.find(t => t.id === window.selectedChatTicketId); if (!ticket) return alert('कृपया पहले किसी यूज़र की चैट चुनें!');
    const matchedUid = ticket.userId || window.findUserUidByIdentifier(ticket.userIdentifier); if (!matchedUid || !window.usersDataList[matchedUid]) { return alert(`इस यूज़र (${ticket.userIdentifier}) का अकाउंट Users लिस्ट में नहीं मिला।`); }
    const newPass = document.getElementById('chatQuickNewPassInput').value.trim(); if (!newPass || newPass.length < 6) return alert('नया पासवर्ड कम से कम 6 अक्षरों का लिखें!');
    const btn = document.getElementById('btnChatQuickResetPass'); const origHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    const uData = window.usersDataList[matchedUid];

    try {
        if (uData.userPass) {
            try { const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: uData.email, password: uData.userPass, returnSecureToken: true }) }); const signInData = await signInRes.json(); if (signInData.idToken) { await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseConfig.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: signInData.idToken, password: newPass, returnSecureToken: true }) }); } } catch (e) {}
        }
        const updateUserPayload = { userPass: newPass, adminResetPass: newPass, passUpdatedAt: new Date() };
        if (ticket.userPhone && !uData.userPhone) { updateUserPayload.userPhone = ticket.userPhone; window.usersDataList[matchedUid].userPhone = ticket.userPhone; }
        await updateDoc(doc(db, "users", matchedUid), updateUserPayload); window.usersDataList[matchedUid].userPass = newPass;

        const autoReplyMsg = `🔑 आपका नया पासवर्ड सेट कर दिया गया है:\nUser ID: ${uData.email}\nNew Password: ${newPass}\n\nअब आप इस नए पासवर्ड से लॉगिन कर सकते हैं।`;
        const newMsgObj = { sender: 'admin', text: autoReplyMsg, time: Date.now() }; const existingMsgs = window.getTicketMessagesArray(ticket); existingMsgs.push(newMsgObj);

        await updateDoc(doc(db, "supportTickets", ticket.id), { messages: existingMsgs, lastAdminReply: autoReplyMsg, status: 'Replied', unreadByAdmin: false, unreadByUser: true, updatedAtMs: Date.now() });

        if (matchedUid !== ticket.id) {
            try { const userChatRef = doc(db, "supportTickets", matchedUid); const userChatSnap = await getDoc(userChatRef); let uMsgs = userChatSnap.exists() && Array.isArray(userChatSnap.data().messages) ? [...userChatSnap.data().messages] : []; uMsgs.push(newMsgObj); await setDoc(userChatRef, { userId: matchedUid, userIdentifier: uData.email, messages: uMsgs, lastAdminReply: autoReplyMsg, status: 'Replied', unreadByAdmin: false, unreadByUser: true, updatedAtMs: Date.now() }, { merge: true }); } catch (e) {}
        }
        document.getElementById('chatQuickNewPassInput').value = ''; window.renderActiveChatConversation(ticket.id, true);
    } catch (err) { alert('Error: ' + err.message); } finally { btn.disabled = false; btn.innerHTML = origHtml; }
};

window.alsoOpenChatUserWhatsApp = function() {
    const ticket = window.allSupportTickets.find(t => t.id === window.selectedChatTicketId); if (!ticket) return;
    const matchedUid = ticket.userId || window.findUserUidByIdentifier(ticket.userIdentifier); const matchedUser = matchedUid ? window.usersDataList[matchedUid] : null;
    const cleanPhone = window.formatCleanPhone(ticket.userPhone || matchedUser?.userPhone || ''); const msgs = window.getTicketMessagesArray(ticket);
    const lastAdmin = [...msgs].reverse().find(m => m.sender === 'admin'); const textToSend = document.getElementById('adminChatReplyInput').value.trim() || lastAdmin?.text || `नमस्ते ${ticket.userIdentifier}, Ojas Portal सपोर्ट से अपडेट:`;
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}` : `https://wa.me/?text=${encodeURIComponent(textToSend)}`; window.open(url, '_blank');
};

window.deleteCurrentSupportChat = async function() { const ticketId = window.selectedChatTicketId; if (!ticketId) return; if (!confirm('क्या आप इस पूरी चैट को डिलीट करना चाहते हैं?')) return; try { await deleteDoc(doc(db, "supportTickets", ticketId)); window.selectedChatTicketId = null; window.renderActiveChatConversation(null); } catch (err) { alert('Error: ' + err.message); } };

window.startNewChatWithSelectedUser = async function() {
    const uid = document.getElementById('newChatUserSelect').value; if (!uid || !window.usersDataList[uid]) return alert('कृपया ड्रॉपडाउन से यूज़र चुनें!');
    const u = window.usersDataList[uid]; const existing = window.allSupportTickets.find(t => t.id === uid || t.userId === uid); if (existing) { window.selectSupportChatThread(existing.id); return; }
    try { const newDocRef = doc(db, "supportTickets", uid); await setDoc(newDocRef, { type: 'ADMIN_MESSAGE', userId: uid, userIdentifier: u.email, userPhone: u.userPhone || '', message: 'Support Chat Started', messages: [{ sender: 'admin', text: `नमस्ते ${u.email.split('@')[0]}, Ojas Portal एडमिन सपोर्ट में आपका स्वागत है।`, time: Date.now() }], status: 'Replied', unreadByAdmin: false, unreadByUser: true, timestamp: new Date(), updatedAtMs: Date.now() }, { merge: true }); window.selectSupportChatThread(uid); } catch (err) { alert('Error: ' + err.message); }
};

window.populateSupportUserDropdown = function() { const sel = document.getElementById('newChatUserSelect'); if (!sel) return; sel.innerHTML = '<option value="">-- किसी यूज़र के साथ नई चैट खोलें --</option>'; for (const [uid, data] of Object.entries(window.usersDataList)) { sel.innerHTML += `<option value="${uid}">${data.email}</option>`; } };

window.loadPortalSettingsForAdmin = async function() {
    try { const snap = await getDoc(doc(db, "settings", "portalConfig")); let cfg = { showDomicile: true, showCaste: true, showDob18: true, bannerEnabled: false, bannerBadge: "NEW UPDATE", bannerTitle: "", bannerMessage: "", bannerBtnText: "", bannerBtnLink: "", supportWhatsapp: "919306437623" }; if (snap.exists()) { cfg = { ...cfg, ...snap.data() }; }
        document.getElementById('chkShowDomicile').checked = cfg.showDomicile !== false; document.getElementById('chkShowCaste').checked = cfg.showCaste !== false; document.getElementById('chkShowDob18').checked = cfg.showDob18 !== false; document.getElementById('chkBannerEnabled').checked = !!cfg.bannerEnabled; document.getElementById('inpBannerBadge').value = cfg.bannerBadge || 'UPDATE'; document.getElementById('inpBannerTitle').value = cfg.bannerTitle || ''; document.getElementById('inpBannerMessage').value = cfg.bannerMessage || ''; document.getElementById('inpBannerBtnText').value = cfg.bannerBtnText || ''; document.getElementById('inpBannerBtnLink').value = cfg.bannerBtnLink || ''; const supWaEl = document.getElementById('inpSupportWhatsapp'); if (supWaEl) supWaEl.value = cfg.supportWhatsapp || '919306437623'; window.adminSupportWhatsapp = cfg.supportWhatsapp || '919306437623'; window.updateStealthStatusPill();
    } catch (err) {}
};

window.updateStealthStatusPill = function() {
    const d = document.getElementById('chkShowDomicile')?.checked; const c = document.getElementById('chkShowCaste')?.checked; const b = document.getElementById('chkShowDob18')?.checked; const pill = document.getElementById('stealthStatusBadge'); if (!pill) return;
    if (!d && !c && !b) { pill.className = "bg-red-100 text-red-700 border border-red-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase"; pill.innerHTML = `<i class="fa-solid fa-eye-slash mr-1"></i>Stealth Active`; } else if (d && c && b) { pill.className = "bg-green-100 text-green-800 border border-green-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase"; pill.innerHTML = `<i class="fa-solid fa-eye mr-1"></i>All Visible`; } else { pill.className = "bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase"; pill.innerHTML = `<i class="fa-solid fa-sliders mr-1"></i>Custom Mode`; }
};

window.quickToggleAllCerts = async function(makeVisible) { document.getElementById('chkShowDomicile').checked = makeVisible; document.getElementById('chkShowCaste').checked = makeVisible; document.getElementById('chkShowDob18').checked = makeVisible; await window.savePortalSettings(); };

window.savePortalSettings = async function(event) {
    if (event) event.preventDefault(); const btn = document.getElementById('btnSavePortalConfig'); const msg = document.getElementById('portalConfigMsg'); const origText = btn ? btn.innerHTML : ''; if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...'; }
    const rawSupWa = document.getElementById('inpSupportWhatsapp')?.value.trim() || '919306437623'; const cleanSupWa = window.formatCleanPhone(rawSupWa) || '919306437623';
    const payload = { showDomicile: document.getElementById('chkShowDomicile').checked, showCaste: document.getElementById('chkShowCaste').checked, showDob18: document.getElementById('chkShowDob18').checked, bannerEnabled: document.getElementById('chkBannerEnabled').checked, bannerBadge: document.getElementById('inpBannerBadge').value.trim() || 'UPDATE', bannerTitle: document.getElementById('inpBannerTitle').value.trim(), bannerMessage: document.getElementById('inpBannerMessage').value.trim(), bannerBtnText: document.getElementById('inpBannerBtnText').value.trim(), bannerBtnLink: document.getElementById('inpBannerBtnLink').value.trim(), supportWhatsapp: cleanSupWa, updatedAt: new Date() };
    try { await setDoc(doc(db, "settings", "portalConfig"), payload, { merge: true }); window.adminSupportWhatsapp = cleanSupWa; window.updateStealthStatusPill(); if (msg) { msg.className = "p-3 bg-green-50 text-green-800 border border-green-300 rounded-xl text-xs font-black text-center"; msg.innerHTML = `<i class="fa-solid fa-circle-check mr-1"></i> पोर्टल सेटिंग्स और बैनर सफलतापूर्वक अपडेट हो गए हैं!`; msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 4000); } } catch (err) { alert("Error saving portal settings: " + err.message); } finally { if (btn) { btn.disabled = false; btn.innerHTML = origText; } }
};
