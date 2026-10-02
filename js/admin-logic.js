// ============================================================================
// FILE 4: js/admin-logic.js
// (Complete Admin Logic: 6 Tabs, Per-User DOB Toggle & Permanent User Delete)
// ============================================================================

import "./config-templates.js";

const {
    firebaseConfig, auth, db, onAuthStateChanged, signOut,
    doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, onSnapshot
} = window.fb;

const ADMIN_EMAIL = window.ADMIN_EMAIL;
const FREE_VIP_EMAILS = window.FREE_VIP_EMAILS;
const MS_PER_DAY = window.MS_PER_DAY;

// ================= 6 STAMP FILES AUTO-DETECT & RANDOM CONFIG =================
const CANDIDATE_STAMP_FILES = [
    "stamp.png",
    "stamp1.png",
    "stamp2.png",
    "stamp3.png",
    "stamp4.png",
    "stamp5.png"
];

window.availableStampsList = [];
window.stampSelectionMap = {};
window.currentModalContext = { fileId: '', fileName: '', historyIndex: -1, withStamp: false, stampSrc: '', stampFile: '' };

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

// ================= AUTO-DETECT UPLOADED STAMPS & MAKE WHITE BG TRANSPARENT =================
window.loadSingleStampFile = function(fileName) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            if (!img.naturalWidth || img.naturalWidth === 0) {
                return resolve(null);
            }
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth || 794;
                canvas.height = img.naturalHeight || 1122;
                ctx.drawImage(img, 0, 0);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
                        data[i + 3] = 0;
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                resolve({
                    name: fileName,
                    dataUrl: canvas.toDataURL('image/png')
                });
            } catch (e) {
                resolve({
                    name: fileName,
                    dataUrl: fileName
                });
            }
        };
        img.onerror = () => resolve(null);
        img.src = fileName;
    });
};

window.preloadAllAvailableStamps = async function() {
    if (window.availableStampsList.length > 0) return window.availableStampsList;
    const results = await Promise.all(
        CANDIDATE_STAMP_FILES.map(file => window.loadSingleStampFile(file))
    );
    window.availableStampsList = results.filter(item => item !== null);
    window.updateStampCountBadge();
    return window.availableStampsList;
};

window.updateStampCountBadge = function() {
    const badge = document.getElementById('activeStampsBadge');
    if (!badge) return;
    const count = window.availableStampsList.length;
    if (count > 0) {
        const names = window.availableStampsList.map(s => s.name).join(', ');
        badge.className = "text-[10px] font-black bg-green-100 text-green-800 border border-green-300 px-2.5 py-0.5 rounded-full";
        badge.innerHTML = `<i class="fa-solid fa-stamp mr-1"></i>${count} Stamps Active`;
        badge.title = `Loaded: ${names}`;
    } else {
        badge.className = "text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full";
        badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i>No Stamp Uploaded`;
    }
};

window.pickRandomAvailableStampObj = function() {
    if (window.availableStampsList.length === 0) {
        return { name: "stamp.png", dataUrl: "stamp.png" };
    }
    const randomIndex = Math.floor(Math.random() * window.availableStampsList.length);
    return window.availableStampsList[randomIndex];
};

window.pickRandomAvailableStamp = function() {
    return window.pickRandomAvailableStampObj().dataUrl;
};

window.getStampDataUrlByName = function(fileName) {
    if (!fileName) return window.pickRandomAvailableStamp();
    const found = window.availableStampsList.find(s => s.name === fileName);
    return found ? found.dataUrl : window.pickRandomAvailableStamp();
};

// ================= ADMIN AUTH CHECK =================
onAuthStateChanged(auth, async (user) => {
    if (!user || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        alert('Not authorized! Only Super Admin can access this page.');
        window.location.href = "index.html";
    } else {
        window.currentUserData = { uid: user.uid, email: user.email };
        document.getElementById('adminPanelContent').classList.remove('hidden');
        document.getElementById('loadingScreen').classList.add('hidden');
        
        await window.preloadAllAvailableStamps();
        await window.loadAllUsersForDropdown();
        await window.loadPortalSettingsForAdmin();
        window.startLiveSupportListener();
        window.switchAdminMainTab('payments');
    }
});

window.handleLogout = async function() {
    await signOut(auth);
    window.location.href = "index.html";
};

window.copyUtrText = function(utr, btnEl) {
    navigator.clipboard.writeText(utr);
    const orig = btnEl.innerHTML;
    btnEl.innerHTML = '<i class="fa-solid fa-check text-green-600"></i> Copied';
    setTimeout(() => { btnEl.innerHTML = orig; }, 1500);
};

// ================= HELPER: BUILD CREDENTIAL MESSAGE & SEND VIA WHATSAPP / EMAIL =================
window.getPortalLoginUrl = function() {
    return window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
};

window.formatCleanPhone = function(rawPhone = '') {
    let digits = String(rawPhone).replace(/\D/g, '');
    if (digits.length === 10) digits = '91' + digits;
    return digits;
};

window.buildUserCredentialsText = function(email, pass, credits, isVip, vipExpiry) {
    const now = Date.now();
    let vipText = "Normal User";
    if (FREE_VIP_EMAILS.includes(email.toLowerCase())) {
        vipText = "👑 Lifetime Free VIP";
    } else if (isVip) {
        if (vipExpiry && vipExpiry > now) {
            const remDays = Math.ceil((vipExpiry - now) / MS_PER_DAY);
            vipText = `👑 VIP Active (${remDays} Days)`;
        } else {
            vipText = `👑 VIP Active`;
        }
    }
    return `🌟 Ojas Print Service - Login Details 🌟\n\n👤 User ID: ${email}\n🔑 Password: ${pass || 'Not Set'}\n💰 Credits Balance: ${FREE_VIP_EMAILS.includes(email.toLowerCase()) ? 'Unlimited (Free)' : (credits || 0) + ' Cr'}\n✨ Status: ${vipText}\n\n🌐 Login Portal Link:\n${window.getPortalLoginUrl()}`;
};

window.shareSelectedUserCredentials = async function(channel) {
    const uid = document.getElementById('userSelectDropdown').value;
    if (!uid || !window.usersDataList[uid]) return alert('कृपया पहले ड्रॉपडाउन से यूज़र सेलेक्ट करें!');
    
    const uData = window.usersDataList[uid];
    const phoneInput = document.getElementById('selectedUserPhoneInput')?.value.trim() || '';
    if (phoneInput && phoneInput !== uData.userPhone) {
        try {
            await updateDoc(doc(db, "users", uid), { userPhone: phoneInput });
            uData.userPhone = phoneInput;
        } catch (e) {}
    }

    const passToUse = uData.userPass || '[कृपया पहले नया पासवर्ड सेट करें]';
    const messageText = window.buildUserCredentialsText(uData.email, passToUse, uData.credits, uData.isVip, uData.vipExpiry);

    if (channel === 'copy') {
        navigator.clipboard.writeText(messageText);
        alert('यूज़र की ID और Password डिटेल्स कॉपी हो गई हैं!');
        return;
    }

    if (channel === 'whatsapp') {
        let targetPhone = window.formatCleanPhone(phoneInput || uData.userPhone || '');
        if (!targetPhone) {
            const askPhone = prompt("यूज़र का 10 अंकों का WhatsApp नंबर डालें (या बिना नंबर सीधे WhatsApp खोलने के लिए खाली छोड़कर OK दबाएं):", "");
            if (askPhone === null) return;
            if (askPhone.trim()) {
                targetPhone = window.formatCleanPhone(askPhone.trim());
                try {
                    await updateDoc(doc(db, "users", uid), { userPhone: askPhone.trim() });
                    uData.userPhone = askPhone.trim();
                    if (document.getElementById('selectedUserPhoneInput')) {
                        document.getElementById('selectedUserPhoneInput').value = askPhone.trim();
                    }
                } catch (e) {}
            }
        }
        const waUrl = targetPhone 
            ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(messageText)}`
            : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
        window.open(waUrl, '_blank');
    } else if (channel === 'email') {
        const targetEmail = uData.contactEmail || (uData.email.endsWith('@print.com') ? prompt("यूज़र का असली Email एड्रेस डालें:", "") : uData.email);
        if (!targetEmail) return;
        const subject = "Ojas Print Service - Your Login ID & Password";
        window.open(`mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText)}`, '_self');
    }
};

window.saveSelectedUserPhone = async function() {
    const uid = document.getElementById('userSelectDropdown').value;
    if (!uid || !window.usersDataList[uid]) return alert('कृपया पहले यूज़र सेलेक्ट करें!');
    const phoneVal = document.getElementById('selectedUserPhoneInput').value.trim();
    try {
        await updateDoc(doc(db, "users", uid), { userPhone: phoneVal });
        window.usersDataList[uid].userPhone = phoneVal;
        alert('यूज़र का WhatsApp नंबर सेव हो गया!');
    } catch (err) {
        alert('Error saving phone: ' + err.message);
    }
};

// ================= PER-USER DOB 18+ STEALTH ACCESS TOGGLE =================
window.toggleUserDobAccess = async function(allowed) {
    const uid = document.getElementById('userSelectDropdown').value;
    if (!uid || !window.usersDataList[uid]) {
        alert('कृपया पहले ड्रॉपडाउन से यूज़र सेलेक्ट करें!');
        const chk = document.getElementById('userDobToggle');
        if (chk) chk.checked = !allowed;
        return;
    }

    const uData = window.usersDataList[uid];
    const msg = document.getElementById('adminMsg');

    try {
        await updateDoc(doc(db, "users", uid), { allowDob18: allowed });
        window.usersDataList[uid].allowDob18 = allowed;

        msg.className = "p-3.5 bg-amber-50 text-amber-950 rounded-2xl text-xs font-black border border-amber-300 text-center shadow-sm";
        msg.innerHTML = `<i class="fa-solid ${allowed ? 'fa-eye text-green-600' : 'fa-eye-slash text-red-600'} mr-1"></i> <strong>${uData.email}</strong> के लिए DOB 18+ सेक्शन <strong>${allowed ? 'चालू (Visible)' : 'गायब (Hidden)'}</strong> कर दिया गया है!`;
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 3500);
    } catch (err) {
        alert('Error updating user DOB access: ' + err.message);
    }
};

// ================= DELETE SELECTED USER ACCOUNT PERMANENTLY =================
window.deleteSelectedUserAccount = async function() {
    const uid = document.getElementById('userSelectDropdown').value;
    if (!uid || !window.usersDataList[uid]) {
        return alert('कृपया पहले ड्रॉपडाउन से उस यूज़र को सेलेक्ट करें जिसे आप डिलीट करना चाहते हैं!');
    }

    const uData = window.usersDataList[uid];
    if ((uData.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return alert('आप मुख्य सुपर एडमिन अकाउंट को डिलीट नहीं कर सकते!');
    }

    const confirmDelete = confirm(
        `⚠️ चेतावनी (Permanent Delete)!\n\nक्या आप वाकई यूज़र "${uData.email}" का अकाउंट हमेशा के लिए डिलीट करना चाहते हैं?\n\nडिलीट करने के बाद यह यूज़र लॉगिन नहीं कर पाएगा।`
    );
    if (!confirmDelete) return;

    const btn = document.getElementById('btnDeleteUserAccount');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Deleting User Account...';
    }

    try {
        // 1. यदि यूज़र का पासवर्ड सेव है, तो Firebase Auth से भी उसका लॉगिन अकाउंट डिलीट करें
        if (uData.userPass) {
            try {
                const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: uData.email, password: uData.userPass, returnSecureToken: true })
                });
                const signInData = await signInRes.json();
                if (signInData.idToken) {
                    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${firebaseConfig.apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken: signInData.idToken })
                    });
                }
            } catch (authErr) {
                console.warn("Auth delete skipped:", authErr);
            }
        }

        // 2. Firestore 'users' कलेक्शन से यूज़र का डेटा हटाएं
        await deleteDoc(doc(db, "users", uid));

        // 3. यदि यूज़र का कोई सपोर्ट चैट टिकट है तो उसे भी हटाएं
        try {
            await deleteDoc(doc(db, "supportTickets", uid));
        } catch (e) {}

        delete window.usersDataList[uid];
        await window.loadAllUsersForDropdown();
        document.getElementById('userSelectDropdown').value = '';
        window.handleUserSelection();

        const msg = document.getElementById('adminMsg');
        if (msg) {
            msg.className = "p-3.5 bg-red-50 text-red-800 rounded-2xl text-xs font-black border border-red-300 text-center shadow-sm";
            msg.innerHTML = `<i class="fa-solid fa-trash-can mr-1"></i> यूज़र <strong>${uData.email}</strong> का अकाउंट हमेशा के लिए डिलीट कर दिया गया है!`;
            msg.classList.remove('hidden');
            setTimeout(() => msg.classList.add('hidden'), 4000);
        }
    } catch (err) {
        alert('यूज़र डिलीट करने में समस्या आई: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
};





// ================= SECTION: REAL-TIME 2-WAY SUPPORT CHAT & FORGOT PASSWORD TICKETS =================
window.findUserUidByIdentifier = function(identifier = '') {
    const clean = String(identifier).trim().toLowerCase();
    if (!clean) return '';
    for (const [uid, uData] of Object.entries(window.usersDataList)) {
        const emailLower = (uData.email || '').toLowerCase();
        const unameLower = (uData.username || emailLower.split('@')[0]).toLowerCase();
        if (emailLower === clean || unameLower === clean || `${clean}@print.com` === emailLower) {
            return uid;
        }
    }
    return '';
};

window.getTicketMessagesArray = function(ticket) {
    let arr = Array.isArray(ticket.messages) ? [...ticket.messages] : [];
    if (arr.length === 0 && ticket.message) {
        const sec = ticket.timestamp?.seconds || Math.floor(Date.now() / 1000);
        arr.push({
            sender: 'user',
            text: ticket.message,
            time: sec * 1000
        });
    }
    return arr;
};

window.startLiveSupportListener = function() {
    if (window.supportUnsubscribe) window.supportUnsubscribe();

    window.supportUnsubscribe = onSnapshot(collection(db, "supportTickets"), (snap) => {
        window.allSupportTickets = [];
        snap.forEach(docSnap => {
            window.allSupportTickets.push({ id: docSnap.id, ...docSnap.data() });
        });

        window.allSupportTickets.sort((a, b) => {
            const timeA = a.updatedAtMs || (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
            const timeB = b.updatedAtMs || (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
            return timeB - timeA;
        });

        window.updateSupportNavBadge();
        window.renderSupportChatSidebar();
        if (window.selectedChatTicketId) {
            window.renderActiveChatConversation(window.selectedChatTicketId, false);
        }
    });
};

window.updateSupportNavBadge = function() {
    let unreadCount = 0;
    window.allSupportTickets.forEach(t => {
        if (t.unreadByAdmin === true || (t.unreadByAdmin === undefined && (t.status || 'Open') === 'Open')) {
            unreadCount++;
        }
    });
    const badge = document.getElementById('navSupportBadge');
    if (badge) {
        badge.innerText = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }
};

window.renderSupportChatSidebar = function() {
    const listEl = document.getElementById('supportChatThreadsList');
    if (!listEl) return;

    const searchVal = (document.getElementById('supportSearchInput')?.value || '').trim().toLowerCase();
    const filtered = window.allSupportTickets.filter(t => {
        if (!searchVal) return true;
        const idMatch = (t.userIdentifier || '').toLowerCase().includes(searchVal);
        const phoneMatch = (t.userPhone || '').toLowerCase().includes(searchVal);
        return idMatch || phoneMatch;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="p-8 text-center text-slate-400 font-bold text-xs">
                <i class="fa-regular fa-comments text-3xl mb-2 text-slate-300"></i><br>
                अभी कोई यूज़र चैट या टिकट नहीं है।
            </div>`;
        return;
    }

    listEl.innerHTML = '';
    filtered.forEach(t => {
        const msgs = window.getTicketMessagesArray(t);
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : { text: t.message || 'No message', sender: 'user' };
        const isSelected = window.selectedChatTicketId === t.id;
        const isUnread = t.unreadByAdmin === true || (t.unreadByAdmin === undefined && (t.status || 'Open') === 'Open');
        const isForgot = t.type === 'FORGOT_PASSWORD';

        const timeMs = t.updatedAtMs || (t.timestamp?.seconds ? t.timestamp.seconds * 1000 : Date.now());
        const timeStr = new Date(timeMs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

        const activeClass = isSelected
            ? 'bg-royal-50 border-royal-400 shadow-sm'
            : (isUnread ? 'bg-red-50/60 border-red-200 hover:bg-slate-50' : 'bg-white border-slate-200 hover:bg-slate-50');

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
                <p class="text-[11px] font-semibold ${isUnread ? 'text-slate-900 font-bold' : 'text-slate-500'} truncate">
                    ${lastMsg.sender === 'admin' ? '<span class="text-indigo-600 font-black">You: </span>' : ''}${lastMsg.text}
                </p>
            </div>
        `;
    });
};

window.selectSupportChatThread = async function(ticketId) {
    window.selectedChatTicketId = ticketId;
    window.renderSupportChatSidebar();
    window.renderActiveChatConversation(ticketId, true);

    const ticket = window.allSupportTickets.find(t => t.id === ticketId);
    if (ticket && (ticket.unreadByAdmin === true || ticket.unreadByAdmin === undefined)) {
        try {
            await updateDoc(doc(db, "supportTickets", ticketId), { unreadByAdmin: false });
        } catch (e) {}
    }
};

window.renderActiveChatConversation = function(ticketId, scrollToBottom = true) {
    const emptyState = document.getElementById('chatWindowEmptyState');
    const activeBox = document.getElementById('chatWindowActiveBox');
    const ticket = window.allSupportTickets.find(t => t.id === ticketId);

    if (!ticket) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (activeBox) activeBox.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (activeBox) activeBox.classList.remove('hidden');

    const matchedUid = ticket.userId || window.findUserUidByIdentifier(ticket.userIdentifier);
    const matchedUser = matchedUid ? window.usersDataList[matchedUid] : null;

    document.getElementById('chatHeaderUserTitle').innerText = ticket.userIdentifier || 'Unknown User';
    const phoneToShow = ticket.userPhone || matchedUser?.userPhone || '';
    document.getElementById('chatHeaderUserPhone').innerText = phoneToShow ? `📱 WhatsApp: ${phoneToShow}` : 'No phone number saved';

    const passBadge = document.getElementById('chatHeaderSavedPassBadge');
    if (matchedUser) {
        passBadge.innerHTML = `Pass: <strong class="text-royal-300 font-mono">${matchedUser.userPass || 'Not Synced'}</strong> • Cr: <strong class="text-emerald-400">${matchedUser.credits || 0}</strong>`;
    } else {
        passBadge.innerHTML = `<span class="text-amber-300">Guest Ticket</span>`;
    }

    const msgContainer = document.getElementById('chatMessagesScrollBox');
    const msgs = window.getTicketMessagesArray(ticket);
    msgContainer.innerHTML = '';

    msgs.forEach(m => {
        const isAdmin = m.sender === 'admin';
        const tStr = m.time ? new Date(m.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
        const safeText = String(m.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

        if (isAdmin) {
            msgContainer.innerHTML += `
                <div class="flex flex-col items-end">
                    <div class="max-w-[80%] bg-dark-900 text-white px-4 py-2.5 rounded-2xl rounded-br-none shadow-sm border border-royal-500/40">
                        <span class="text-[9px] font-black text-royal-400 uppercase block mb-0.5"><i class="fa-solid fa-crown mr-1"></i>Admin Support</span>
                        <div class="text-xs font-semibold leading-relaxed">${safeText}</div>
                    </div>
                    <span class="text-[9px] font-bold text-slate-400 mt-0.5">${tStr}</span>
                </div>
            `;
        } else {
            msgContainer.innerHTML += `
                <div class="flex flex-col items-start">
                    <div class="max-w-[80%] bg-white text-slate-800 px-4 py-2.5 rounded-2xl rounded-bl-none shadow-sm border border-slate-200">
                        <span class="text-[9px] font-black text-indigo-600 uppercase block mb-0.5"><i class="fa-solid fa-user mr-1"></i>${ticket.userIdentifier || 'User'}</span>
                        <div class="text-xs font-bold leading-relaxed">${safeText}</div>
                    </div>
                    <span class="text-[9px] font-bold text-slate-400 mt-0.5">${tStr}</span>
                </div>
            `;
        }
    });

    if (scrollToBottom) {
        setTimeout(() => {
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }, 50);
    }
};

window.sendAdminChatReply = async function(event) {
    if (event) event.preventDefault();
    const ticketId = window.selectedChatTicketId;
    if (!ticketId) return alert('कृपया पहले बाईं तरफ से किसी यूज़र की चैट पर क्लिक करें!');

    const inp = document.getElementById('adminChatReplyInput');
    const replyText = inp.value.trim();
    if (!replyText) return;

    const btn = document.getElementById('btnSendAdminChatReply');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const ticket = window.allSupportTickets.find(t => t.id === ticketId);
        const existingMsgs = window.getTicketMessagesArray(ticket);
        const newMsgObj = {
            sender: 'admin',
            text: replyText,
            time: Date.now()
        };
        existingMsgs.push(newMsgObj);

        await updateDoc(doc(db, "supportTickets", ticketId), {
            messages: existingMsgs,
            lastAdminReply: replyText,
            status: 'Replied',
            unreadByAdmin: false,
            unreadByUser: true,
            updatedAtMs: Date.now()
        });

        const matchedUid = ticket.userId || window.findUserUidByIdentifier(ticket.userIdentifier);
        if (matchedUid && matchedUid !== ticketId) {
            try {
                const userChatRef = doc(db, "supportTickets", matchedUid);
                const userChatSnap = await getDoc(userChatRef);
                let uMsgs = userChatSnap.exists() && Array.isArray(userChatSnap.data().messages) ? [...userChatSnap.data().messages] : [];
                uMsgs.push(newMsgObj);
                await setDoc(userChatRef, {
                    userId: matchedUid,
                    userIdentifier: window.usersDataList[matchedUid]?.email || ticket.userIdentifier,
                    messages: uMsgs,
                    lastAdminReply: replyText,
                    status: 'Replied',
                    unreadByAdmin: false,
                    unreadByUser: true,
                    updatedAtMs: Date.now()
                }, { merge: true });
            } catch (e) {}
        }

        inp.value = '';
        window.renderActiveChatConversation(ticketId, true);
    } catch (err) {
        alert('रिप्लाई भेजने में समस्या आई: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

window.insertQuickChatReply = function(type) {
    const ticket = window.allSupportTickets.find(t => t.id === window.selectedChatTicketId);
    if (!ticket) return alert('कृपया पहले किसी यूज़र की चैट चुनें!');

    const matchedUid = ticket.userId || window.findUserUidByIdentifier(ticket.userIdentifier);
    const u = matchedUid ? window.usersDataList[matchedUid] : null;
    const inp = document.getElementById('adminChatReplyInput');

    const shortId = u ? u.email : (ticket.userIdentifier || 'User');
    const pass = u ? (u.userPass || '[PASS]') : '[PASS]';
    const cr = u ? (u.credits || 0) : 0;

    if (type === 'id_pass') {
        inp.value = `नमस्ते, आपकी लॉगिन डिटेल्स नीचे दी गई हैं:\nUser ID: ${shortId}\nPassword: ${pass}\nCredits: ${cr} Cr`;
    } else if (type === 'payment_ok') {
        inp.value = `नमस्ते ${shortId}, आपका पेमेंट वेरीफाई हो गया है और क्रेडिट्स/VIP आपके अकाउंट में जोड़ दिए गए हैं। पेमेंट स्टेटस रिफ्रेश कर लें।`;
    } else if (type === 'fixed') {
        inp.value = `नमस्ते ${shortId}, आपकी समस्या का समाधान कर दिया गया है। कृपया अब पोर्टल चेक करें।`;
    }
    inp.focus();
};

window.resetPassAndSendInChat = async function() {
    const ticket = window.allSupportTickets.find(t => t.id === window.selectedChatTicketId);
    if (!ticket) return alert('कृपया पहले किसी यूज़र की चैट चुनें!');

    const matchedUid = ticket.userId || window.findUserUidByIdentifier(ticket.userIdentifier);
    if (!matchedUid || !window.usersDataList[matchedUid]) {
        return alert(`इस यूज़र (${ticket.userIdentifier}) का अकाउंट Users लिस्ट में नहीं मिला। कृपया 'Users & Access' टैब से चेक करें।`);
    }

    const newPass = document.getElementById('chatQuickNewPassInput').value.trim();
    if (!newPass || newPass.length < 6) {
        return alert('नया पासवर्ड कम से कम 6 अक्षरों का लिखें!');
    }

    const btn = document.getElementById('btnChatQuickResetPass');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const uData = window.usersDataList[matchedUid];

    try {
        if (uData.userPass) {
            const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: uData.email, password: uData.userPass, returnSecureToken: true })
            });
            const signInData = await signInRes.json();
            if (signInData.idToken) {
                await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseConfig.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: signInData.idToken, password: newPass, returnSecureToken: true })
                });
            }
        }

        const updateUserPayload = {
            userPass: newPass,
            adminResetPass: newPass,
            passUpdatedAt: new Date()
        };
        if (ticket.userPhone && !uData.userPhone) {
            updateUserPayload.userPhone = ticket.userPhone;
            window.usersDataList[matchedUid].userPhone = ticket.userPhone;
        }

        await updateDoc(doc(db, "users", matchedUid), updateUserPayload);
        window.usersDataList[matchedUid].userPass = newPass;

        const autoReplyMsg = `🔑 आपका नया पासवर्ड सेट कर दिया गया है:\nUser ID: ${uData.email}\nNew Password: ${newPass}\n\nअब आप इस नए पासवर्ड से लॉगिन कर सकते हैं।`;
        const newMsgObj = {
            sender: 'admin',
            text: autoReplyMsg,
            time: Date.now()
        };

        const existingMsgs = window.getTicketMessagesArray(ticket);
        existingMsgs.push(newMsgObj);

        await updateDoc(doc(db, "supportTickets", ticket.id), {
            messages: existingMsgs,
            lastAdminReply: autoReplyMsg,
            status: 'Replied',
            unreadByAdmin: false,
            unreadByUser: true,
            updatedAtMs: Date.now()
        });

        if (matchedUid !== ticket.id) {
            try {
                const userChatRef = doc(db, "supportTickets", matchedUid);
                const userChatSnap = await getDoc(userChatRef);
                let uMsgs = userChatSnap.exists() && Array.isArray(userChatSnap.data().messages) ? [...userChatSnap.data().messages] : [];
                uMsgs.push(newMsgObj);
                await setDoc(userChatRef, {
                    userId: matchedUid,
                    userIdentifier: uData.email,
                    messages: uMsgs,
                    lastAdminReply: autoReplyMsg,
                    status: 'Replied',
                    unreadByAdmin: false,
                    unreadByUser: true,
                    updatedAtMs: Date.now()
                }, { merge: true });
            } catch (e) {}
        }

        document.getElementById('chatQuickNewPassInput').value = '';
        window.renderActiveChatConversation(ticket.id, true);
    } catch (err) {
        alert('Error resetting password: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

window.alsoOpenChatUserWhatsApp = function() {
    const ticket = window.allSupportTickets.find(t => t.id === window.selectedChatTicketId);
    if (!ticket) return;
    const matchedUid = ticket.userId || window.findUserUidByIdentifier(ticket.userIdentifier);
    const matchedUser = matchedUid ? window.usersDataList[matchedUid] : null;
    const cleanPhone = window.formatCleanPhone(ticket.userPhone || matchedUser?.userPhone || '');
    const msgs = window.getTicketMessagesArray(ticket);
    const lastAdmin = [...msgs].reverse().find(m => m.sender === 'admin');
    const textToSend = document.getElementById('adminChatReplyInput').value.trim() || lastAdmin?.text || `नमस्ते ${ticket.userIdentifier}, Ojas Portal सपोर्ट से अपडेट:`;
    const url = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`
        : `https://wa.me/?text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank');
};

window.deleteCurrentSupportChat = async function() {
    const ticketId = window.selectedChatTicketId;
    if (!ticketId) return;
    if (!confirm('क्या आप इस पूरी चैट को डिलीट करना चाहते हैं?')) return;
    try {
        await deleteDoc(doc(db, "supportTickets", ticketId));
        window.selectedChatTicketId = null;
        window.renderActiveChatConversation(null);
    } catch (err) {
        alert('Error deleting chat: ' + err.message);
    }
};

window.startNewChatWithSelectedUser = async function() {
    const uid = document.getElementById('newChatUserSelect').value;
    if (!uid || !window.usersDataList[uid]) return alert('कृपया ड्रॉपडाउन से यूज़र चुनें!');
    const u = window.usersDataList[uid];

    const existing = window.allSupportTickets.find(t => t.id === uid || t.userId === uid);
    if (existing) {
        window.selectSupportChatThread(existing.id);
        return;
    }

    try {
        const newDocRef = doc(db, "supportTickets", uid);
        await setDoc(newDocRef, {
            type: 'ADMIN_MESSAGE',
            userId: uid,
            userIdentifier: u.email,
            userPhone: u.userPhone || '',
            message: 'Support Chat Started',
            messages: [{
                sender: 'admin',
                text: `नमस्ते ${u.email.split('@')[0]}, Ojas Portal एडमिन सपोर्ट में आपका स्वागत है।`,
                time: Date.now()
            }],
            status: 'Replied',
            unreadByAdmin: false,
            unreadByUser: true,
            timestamp: new Date(),
            updatedAtMs: Date.now()
        }, { merge: true });
        window.selectSupportChatThread(uid);
    } catch (err) {
        alert('Error starting chat: ' + err.message);
    }
};

window.populateSupportUserDropdown = function() {
    const sel = document.getElementById('newChatUserSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- किसी यूज़र के साथ नई चैट खोलें --</option>';
    for (const [uid, data] of Object.entries(window.usersDataList)) {
        sel.innerHTML += `<option value="${uid}">${data.email}</option>`;
    }
};

// ================= SECTION: PORTAL CONTROL =================
window.loadPortalSettingsForAdmin = async function() {
    try {
        const snap = await getDoc(doc(db, "settings", "portalConfig"));
        let cfg = {
            showDomicile: true,
            showCaste: true,
            showDob18: true,
            bannerEnabled: false,
            bannerBadge: "NEW UPDATE",
            bannerTitle: "",
            bannerMessage: "",
            bannerBtnText: "",
            bannerBtnLink: "",
            supportWhatsapp: "919306437623"
        };
        if (snap.exists()) {
            cfg = { ...cfg, ...snap.data() };
        }
        document.getElementById('chkShowDomicile').checked = cfg.showDomicile !== false;
        document.getElementById('chkShowCaste').checked = cfg.showCaste !== false;
        document.getElementById('chkShowDob18').checked = cfg.showDob18 !== false;

        document.getElementById('chkBannerEnabled').checked = !!cfg.bannerEnabled;
        document.getElementById('inpBannerBadge').value = cfg.bannerBadge || 'UPDATE';
        document.getElementById('inpBannerTitle').value = cfg.bannerTitle || '';
        document.getElementById('inpBannerMessage').value = cfg.bannerMessage || '';
        document.getElementById('inpBannerBtnText').value = cfg.bannerBtnText || '';
        document.getElementById('inpBannerBtnLink').value = cfg.bannerBtnLink || '';

        const supWaEl = document.getElementById('inpSupportWhatsapp');
        if (supWaEl) supWaEl.value = cfg.supportWhatsapp || '919306437623';
        window.adminSupportWhatsapp = cfg.supportWhatsapp || '919306437623';

        window.updateStealthStatusPill();
    } catch (err) {
        console.error("Error loading portalConfig:", err);
    }
};

window.updateStealthStatusPill = function() {
    const d = document.getElementById('chkShowDomicile')?.checked;
    const c = document.getElementById('chkShowCaste')?.checked;
    const b = document.getElementById('chkShowDob18')?.checked;
    const pill = document.getElementById('stealthStatusBadge');
    if (!pill) return;

    if (!d && !c && !b) {
        pill.className = "bg-red-100 text-red-700 border border-red-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase";
        pill.innerHTML = `<i class="fa-solid fa-eye-slash mr-1"></i>Stealth Active`;
    } else if (d && c && b) {
        pill.className = "bg-green-100 text-green-800 border border-green-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase";
        pill.innerHTML = `<i class="fa-solid fa-eye mr-1"></i>All Visible`;
    } else {
        pill.className = "bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase";
        pill.innerHTML = `<i class="fa-solid fa-sliders mr-1"></i>Custom Mode`;
    }
};

window.quickToggleAllCerts = async function(makeVisible) {
    document.getElementById('chkShowDomicile').checked = makeVisible;
    document.getElementById('chkShowCaste').checked = makeVisible;
    document.getElementById('chkShowDob18').checked = makeVisible;
    await window.savePortalSettings();
};

window.savePortalSettings = async function(event) {
    if (event) event.preventDefault();
    const btn = document.getElementById('btnSavePortalConfig');
    const msg = document.getElementById('portalConfigMsg');
    const origText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...';
    }

    const rawSupWa = document.getElementById('inpSupportWhatsapp')?.value.trim() || '919306437623';
    const cleanSupWa = window.formatCleanPhone(rawSupWa) || '919306437623';

    const payload = {
        showDomicile: document.getElementById('chkShowDomicile').checked,
        showCaste: document.getElementById('chkShowCaste').checked,
        showDob18: document.getElementById('chkShowDob18').checked,
        bannerEnabled: document.getElementById('chkBannerEnabled').checked,
        bannerBadge: document.getElementById('inpBannerBadge').value.trim() || 'UPDATE',
        bannerTitle: document.getElementById('inpBannerTitle').value.trim(),
        bannerMessage: document.getElementById('inpBannerMessage').value.trim(),
        bannerBtnText: document.getElementById('inpBannerBtnText').value.trim(),
        bannerBtnLink: document.getElementById('inpBannerBtnLink').value.trim(),
        supportWhatsapp: cleanSupWa,
        updatedAt: new Date()
    };

    try {
        await setDoc(doc(db, "settings", "portalConfig"), payload, { merge: true });
        window.adminSupportWhatsapp = cleanSupWa;
        window.updateStealthStatusPill();
        if (msg) {
            msg.className = "p-3 bg-green-50 text-green-800 border border-green-300 rounded-xl text-xs font-black text-center";
            msg.innerHTML = `<i class="fa-solid fa-circle-check mr-1"></i> पोर्टल सेटिंग्स और बैनर सफलतापूर्वक अपडेट हो गए हैं!`;
            msg.classList.remove('hidden');
            setTimeout(() => msg.classList.add('hidden'), 4000);
        }
    } catch (err) {
        alert("Error saving portal settings: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    }
};

// ================= SECTION 1: COMPLETE PAYMENT NOTIFICATIONS, HISTORY & RESOLUTION =================
window.loadAllPayments = async function() {
    const container = document.getElementById('adminPaymentsCardsContainer');
    container.innerHTML = `
        <div class="col-span-1 md:col-span-2 p-10 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-100">
            <i class="fa-solid fa-spinner fa-spin text-3xl mb-2 text-royal-500"></i><br>सभी पेमेंट और हिस्ट्री लोड हो रही हैं...
        </div>`;

    try {
        const querySnapshot = await getDocs(collection(db, "payments"));
        
        window.allPaymentsData = [];
        querySnapshot.forEach((docSnap) => {
            window.allPaymentsData.push({ id: docSnap.id, ...docSnap.data() });
        });

        window.allPaymentsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        
        window.updatePaymentStatsAndBadges();
        window.renderPaymentsByFilter();
    } catch (err) {
        container.innerHTML = `<div class="col-span-1 md:col-span-2 p-6 text-center text-red-500 font-bold bg-white rounded-2xl">Error: ${err.message}</div>`;
    }
};

window.updatePaymentStatsAndBadges = function() {
    let pendingCount = 0, pendingAmt = 0;
    let approvedCount = 0, approvedAmt = 0;
    let rejectedCount = 0, rejectedAmt = 0;

    window.allPaymentsData.forEach(item => {
        const amt = parseFloat(item.amountPaid) || 0;
        const st = (item.status || 'Pending');
        if (st === 'Pending' || st.includes('Ticket')) {
            pendingCount++;
            pendingAmt += amt;
        } else if (st === 'Approved' || st === 'Auto-Approved') {
            approvedCount++;
            approvedAmt += amt;
        } else if (st === 'Rejected' || st === 'Cancelled') {
            rejectedCount++;
            rejectedAmt += amt;
        }
    });

    document.getElementById('statPendingCount').innerText = `${pendingCount} Requests`;
    document.getElementById('statPendingAmt').innerText = `₹${pendingAmt}`;
    document.getElementById('statApprovedCount').innerText = `${approvedCount} Txns`;
    document.getElementById('statApprovedAmt').innerText = `₹${approvedAmt}`;
    document.getElementById('statRejectedCount').innerText = `${rejectedCount} Txns`;
    document.getElementById('statRejectedAmt').innerText = `₹${rejectedAmt}`;

    document.getElementById('pillCountPending').innerText = pendingCount;
    document.getElementById('pillCountApproved').innerText = approvedCount;
    document.getElementById('pillCountRejected').innerText = rejectedCount;
    document.getElementById('pillCountAll').innerText = window.allPaymentsData.length;

    const navBadge = document.getElementById('navPendingBadge');
    if (navBadge) {
        navBadge.innerText = pendingCount;
        navBadge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
    }
};

window.setPaymentFilter = function(filterStatus) {
    window.currentPaymentFilter = filterStatus;

    const filters = ['Pending', 'Approved', 'Rejected', 'ALL'];
    filters.forEach(f => {
        const btn = document.getElementById(`filterPill-${f}`);
        if (!btn) return;
        if (f === filterStatus) {
            btn.className = "px-3 py-2.5 rounded-xl text-xs font-black bg-dark-900 text-royal-300 shadow-sm transition flex items-center justify-center gap-1.5 border border-royal-500/40";
        } else {
            btn.className = "px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition flex items-center justify-center gap-1.5 border border-slate-200";
        }
    });

    window.renderPaymentsByFilter();
};

window.renderPaymentsByFilter = function() {
    const container = document.getElementById('adminPaymentsCardsContainer');
    const searchQuery = (document.getElementById('paymentSearchInput')?.value || '').trim().toLowerCase();
    const activeFilter = window.currentPaymentFilter;

    let list = window.allPaymentsData.filter(item => {
        const st = (item.status || 'Pending');
        if (activeFilter === 'Pending' && st !== 'Pending' && !st.includes('Ticket')) return false;
        if (activeFilter === 'Approved' && st !== 'Approved' && st !== 'Auto-Approved') return false;
        if (activeFilter === 'Rejected' && st !== 'Rejected' && st !== 'Cancelled') return false;

        if (searchQuery) {
            const emailMatch = (item.email || '').toLowerCase().includes(searchQuery);
            const utrMatch = (item.utrNumber || '').toLowerCase().includes(searchQuery);
            const amtMatch = String(item.amountPaid || '').includes(searchQuery);
            return emailMatch || utrMatch || amtMatch;
        }
        return true;
    });

    container.innerHTML = '';

    if (list.length === 0) {
        const emptyTitle = activeFilter === 'Pending' ? 'कोई पेंडिंग पेमेंट या टिकट नहीं है!' : 'इस फिल्टर में कोई पेमेंट रिकॉर्ड नहीं मिला!';
        container.innerHTML = `
            <div class="col-span-1 md:col-span-2 p-10 text-center bg-white rounded-3xl border border-slate-100 shadow-card">
                <div class="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                    <i class="fa-solid fa-receipt"></i>
                </div>
                <h4 class="text-sm font-black text-slate-700">${emptyTitle}</h4>
                <p class="text-xs text-slate-400 font-semibold mt-1">आप ऊपर दिए गए टैब्स से Approved, Rejected या All History देख सकते हैं।</p>
            </div>`;
        return;
    }

    list.forEach(data => {
        const sec = data.timestamp?.seconds || Math.floor(Date.now() / 1000);
        const dateObj = new Date(sec * 1000);
        const dateStr = dateObj.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
        const timeStr = dateObj.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
        
        const vipDays = data.vipDaysRequested || (data.wantsVip ? 30 : 0);
        const vipFee = data.vipPlanFee || (data.wantsVip ? 100 : 0);
        const creditsReq = data.creditsRequested !== undefined ? data.creditsRequested : (data.creditsAdded || 0);
        const status = data.status || 'Pending';

        let statusBadge = '';
        let cardBorder = 'border-slate-200';
        if (status.includes('Ticket')) {
            statusBadge = `<span class="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2.5 py-0.5 rounded-full text-[10px] font-black animate-pulse"><i class="fa-solid fa-ticket mr-1"></i>UTR Ticket Raised</span>`;
            cardBorder = 'border-indigo-400';
        } else if (status === 'Pending') {
            statusBadge = `<span class="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-black animate-pulse"><i class="fa-solid fa-clock mr-1"></i>Pending</span>`;
            cardBorder = 'border-amber-300';
        } else if (status === 'Approved' || status === 'Auto-Approved') {
            statusBadge = `<span class="bg-green-100 text-green-800 border border-green-300 px-2.5 py-0.5 rounded-full text-[10px] font-black"><i class="fa-solid fa-check-circle mr-1"></i>Approved</span>`;
            cardBorder = 'border-green-200';
        } else if (status === 'Cancelled') {
            statusBadge = `<span class="bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-0.5 rounded-full text-[10px] font-black"><i class="fa-solid fa-ban mr-1"></i>Cancelled by User</span>`;
            cardBorder = 'border-slate-300';
        } else {
            statusBadge = `<span class="bg-red-100 text-red-700 border border-red-300 px-2.5 py-0.5 rounded-full text-[10px] font-black"><i class="fa-solid fa-circle-xmark mr-1"></i>Rejected</span>`;
            cardBorder = 'border-red-200';
        }

        const vipBanner = vipDays > 0 
            ? `<div class="flex items-center justify-between bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl">
                <span class="text-[11px] font-black text-amber-900"><i class="fa-solid fa-crown text-amber-500 mr-1"></i> VIP Plan</span>
                <span class="bg-amber-400 text-dark-950 text-[11px] font-black px-2 py-0.5 rounded-full">+${vipDays} Days (₹${vipFee})</span>
               </div>` 
            : `<div class="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span class="text-[11px] font-bold text-slate-500">Plan Type</span>
                <span class="text-[11px] font-bold text-slate-700">Normal Credit Recharge</span>
               </div>`;

        let actionButtonsHtml = '';
        if (status === 'Pending' || status.includes('Ticket')) {
            actionButtonsHtml = `
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button onclick="window.approvePayment('${data.id}', '${data.userId}', ${creditsReq}, ${vipDays}, false)" class="bg-green-600 hover:bg-green-700 active:scale-95 text-white py-2.5 rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-check-circle"></i> Approve
                    </button>
                    <button onclick="window.rejectPayment('${data.id}')" class="bg-red-50 hover:bg-red-600 active:scale-95 text-red-600 hover:text-white border border-red-200 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-circle-xmark"></i> Reject
                    </button>
                </div>
            `;
        } else if (status === 'Rejected' || status === 'Cancelled') {
            actionButtonsHtml = `
                <div class="flex items-center gap-2 pt-1">
                    <button onclick="window.approvePayment('${data.id}', '${data.userId}', ${creditsReq}, ${vipDays}, true)" class="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-dark-950 py-2.5 px-3 rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Resolve &amp; Approve (+${creditsReq} Cr)
                    </button>
                    <button onclick="window.deletePaymentRecord('${data.id}')" class="w-9 h-9 bg-slate-100 hover:bg-red-500 text-slate-500 hover:text-white rounded-xl text-xs transition flex items-center justify-center" title="Delete Record">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        } else {
            actionButtonsHtml = `
                <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-green-700 font-bold">
                    <span><i class="fa-solid fa-circle-check mr-1"></i> क्रेडिट्स और प्लान यूज़र को मिल चुके हैं</span>
                    <button onclick="window.deletePaymentRecord('${data.id}')" class="text-slate-400 hover:text-red-600 px-2 py-1 rounded transition" title="Delete History Record">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="bg-white rounded-2xl p-4 shadow-card border-2 ${cardBorder} transition flex flex-col justify-between space-y-3">
                <div class="flex justify-between items-start gap-2 border-b border-slate-100 pb-2.5">
                    <div class="overflow-hidden">
                        <div class="flex items-center gap-1.5 mb-1">
                            ${statusBadge}
                            <span class="text-[11px] font-semibold text-slate-400">${dateStr} • ${timeStr}</span>
                        </div>
                        <p class="text-xs md:text-sm font-black text-dark-900 truncate"><i class="fa-solid fa-user text-royal-500 mr-1"></i> ${data.email}</p>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-xl text-base md:text-lg font-black block">₹${data.amountPaid || 0}</span>
                    </div>
                </div>

                <div class="space-y-2">
                    <div class="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                        <div>
                            <span class="text-[9px] font-bold text-slate-400 uppercase block">UTR / Ref Number</span>
                            <span class="font-mono font-black text-xs md:text-sm text-slate-900 tracking-wider">${data.utrNumber || 'ONLINE_UPI'}</span>
                        </div>
                        <button onclick="window.copyUtrText('${data.utrNumber || ''}', this)" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm transition">
                            <i class="fa-regular fa-copy mr-1"></i> Copy
                        </button>
                    </div>

                    <div class="flex items-center justify-between bg-royal-50/60 border border-royal-200 px-3 py-1.5 rounded-xl">
                        <span class="text-[11px] font-bold text-royal-900">Credits Requested:</span>
                        <span class="text-xs font-black text-royal-600">+${creditsReq} Credits</span>
                    </div>

                    ${vipBanner}
                </div>

                ${actionButtonsHtml}
            </div>
        `;
    });
};

window.approvePayment = async function(paymentDocId, userId, creditsToAdd, vipDaysToAdd, isResolution = false) {
    const titleText = isResolution ? `Resolve & Approve Payment:` : `Approve Payment:`;
    const confirmMsg = vipDaysToAdd > 0 
        ? `${titleText}\n• Add +${creditsToAdd} Credits\n• Add +${vipDaysToAdd} Days VIP Access\n\nक्या आप कन्फर्म हैं?`
        : `${titleText}\n• Add +${creditsToAdd} Credits to this user?\n\nक्या आप कन्फर्म हैं?`;
    
    if (!confirm(confirmMsg)) return;

    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        let currentCredits = 0;
        let currentExpiry = 0;

        if (userSnap.exists()) {
            const uData = userSnap.data();
            currentCredits = uData.credits || 0;
            currentExpiry = uData.vipExpiry || 0;
        }

        const newCredits = currentCredits + creditsToAdd;
        const updatePayload = { credits: newCredits };

        if (vipDaysToAdd > 0) {
            const now = Date.now();
            const baseTime = (currentExpiry > now) ? currentExpiry : now;
            const newExpiry = baseTime + (vipDaysToAdd * MS_PER_DAY);
            updatePayload.isVip = true;
            updatePayload.vipExpiry = newExpiry;
        }

        await updateDoc(userRef, updatePayload);
        await updateDoc(doc(db, "payments", paymentDocId), { 
            status: "Approved",
            resolvedAt: new Date()
        });

        alert(vipDaysToAdd > 0 
            ? `सफलतापूर्वक अप्रूव हो गया! +${creditsToAdd} Credits और +${vipDaysToAdd} Days VIP वैलिडिटी जोड़ दी गई है!` 
            : `सफलतापूर्वक अप्रूव हो गया! +${creditsToAdd} Credits यूज़र के वॉलेट में जोड़ दिए गए हैं।`);
        
        await window.loadAllUsersForDropdown();
        window.loadAllPayments();
    } catch (err) { alert('Error approving payment: ' + err.message); }
};





window.rejectPayment = async function(paymentDocId) {
    if (!confirm(`क्या आप इस पेमेंट को REJECT करना चाहते हैं?\n(यह आपकी Rejected History में सेव रहेगा, जिसे आप बाद में चाहें तो Resolve भी कर सकते हैं)`)) return;
    try {
        await updateDoc(doc(db, "payments", paymentDocId), { status: "Rejected" });
        window.loadAllPayments();
    } catch (err) { alert('Error rejecting payment: ' + err.message); }
};

window.deletePaymentRecord = async function(paymentDocId) {
    if (!confirm(`क्या आप इस पेमेंट हिस्ट्री रिकॉर्ड को हमेशा के लिए डिलीट करना चाहते हैं?`)) return;
    try {
        await deleteDoc(doc(db, "payments", paymentDocId));
        window.loadAllPayments();
    } catch (err) { alert('Error deleting payment record: ' + err.message); }
};

// ================= SECTION 2: USER, VIP VALIDITY & PASSWORD RESET MANAGEMENT =================
window.loadAllUsersForDropdown = async function() {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const select = document.getElementById('userSelectDropdown');
        const currentSelected = select ? select.value : '';
        if (select) select.innerHTML = '<option value="">-- यहाँ क्लिक करके यूज़र सेलेक्ट करें --</option>';
        window.usersDataList = {};
        
        const now = Date.now();
        usersSnap.forEach(docSnap => {
            const data = docSnap.data();
            window.usersDataList[docSnap.id] = data;
            const emailLower = (data.email || '').toLowerCase();
            const isFreeVip = FREE_VIP_EMAILS.includes(emailLower);
            const isCurrentlyVip = isFreeVip || (data.isVip && (!data.vipExpiry || data.vipExpiry > now));
            const vipLabel = isFreeVip ? '👑 [FREE VIP] ' : (isCurrentlyVip ? '👑 [VIP] ' : '');
            if (select) select.innerHTML += `<option value="${docSnap.id}">${vipLabel}${data.email} (${isFreeVip ? 'Free' : (data.credits || 0) + ' Cr'})</option>`;
        });
        if (select && currentSelected && window.usersDataList[currentSelected]) {
            select.value = currentSelected;
            window.handleUserSelection();
        }
        window.populateSupportUserDropdown();
    } catch (err) { console.error("Error loading users:", err); }
};

window.handleUserSelection = function() {
    const uid = document.getElementById('userSelectDropdown').value;
    const display = document.getElementById('currentUserCreditsDisplay');
    const vipBadge = document.getElementById('selectedUserVipBadge');
    const passDisplay = document.getElementById('selectedUserSavedPass');
    const phoneInp = document.getElementById('selectedUserPhoneInput');
    const dobToggle = document.getElementById('userDobToggle');

    if (uid && window.usersDataList[uid]) {
        const uData = window.usersDataList[uid];
        const isFreeVip = FREE_VIP_EMAILS.includes((uData.email || '').toLowerCase());
        display.innerText = isFreeVip ? 'FREE' : (uData.credits || 0);
        if (passDisplay) {
            passDisplay.innerText = uData.userPass ? uData.userPass : 'Not Set';
        }
        if (phoneInp) {
            phoneInp.value = uData.userPhone || '';
        }
        if (dobToggle) {
            dobToggle.checked = uData.allowDob18 !== false;
        }

        const now = Date.now();
        const expiry = uData.vipExpiry || 0;
        const isActiveVip = isFreeVip || (uData.isVip && (expiry === 0 || expiry > now));

        if (isFreeVip) {
            vipBadge.innerHTML = '<span class="bg-emerald-400 text-dark-950 px-2.5 py-1 rounded-full text-xs font-black">👑 Lifetime Free VIP</span>';
        } else if (isActiveVip) {
            if (expiry > now) {
                const remDays = Math.ceil((expiry - now) / MS_PER_DAY);
                const expDateStr = new Date(expiry).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
                vipBadge.innerHTML = `
                    <span class="bg-amber-400 text-dark-950 px-2.5 py-0.5 rounded-full text-xs font-black inline-block">
                        👑 VIP (${remDays}d Left)
                    </span>
                    <div class="text-[10px] font-bold text-royal-300 mt-0.5">Exp: ${expDateStr}</div>
                `;
            } else {
                vipBadge.innerHTML = '<span class="bg-amber-400 text-dark-950 px-2.5 py-1 rounded-full text-xs font-black">👑 VIP Active</span>';
            }
        } else {
            vipBadge.innerHTML = '<span class="bg-slate-700 text-slate-200 px-2.5 py-1 rounded-full text-xs font-bold">Normal User</span>';
        }
    } else {
        display.innerText = '--';
        vipBadge.innerHTML = '--';
        if (passDisplay) passDisplay.innerText = '--';
        if (phoneInp) phoneInp.value = '';
        if (dobToggle) dobToggle.checked = true;
    }
};

window.adminSetNewUserPassword = async function() {
    const uid = document.getElementById('userSelectDropdown').value;
    const newPass = document.getElementById('adminNewResetPass').value.trim();
    const msg = document.getElementById('adminMsg');
    const btn = document.getElementById('btnAdminSetPass');

    if (!uid || !window.usersDataList[uid]) return alert('कृपया पहले ड्रॉपडाउन से यूज़र सेलेक्ट करें!');
    if (!newPass || newPass.length < 6) return alert('नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए!');

    const uData = window.usersDataList[uid];
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Setting...';

    try {
        if (uData.userPass) {
            const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: uData.email, password: uData.userPass, returnSecureToken: true })
            });
            const signInData = await signInRes.json();
            if (signInData.idToken) {
                await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseConfig.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: signInData.idToken, password: newPass, returnSecureToken: true })
                });
            }
        }

        await updateDoc(doc(db, "users", uid), {
            userPass: newPass,
            adminResetPass: newPass,
            passUpdatedAt: new Date()
        });

        window.usersDataList[uid].userPass = newPass;
        document.getElementById('selectedUserSavedPass').innerText = newPass;
        document.getElementById('adminNewResetPass').value = '';

        msg.className = "p-3.5 bg-green-50 text-green-800 rounded-2xl text-xs font-bold border border-green-300 text-center space-y-2 shadow-sm";
        msg.innerHTML = `
            <div><i class="fa-solid fa-circle-check mr-1"></i> <strong>${uData.email}</strong> का नया पासवर्ड <strong>${newPass}</strong> सेट हो गया!</div>
            <div class="flex justify-center gap-2 pt-1">
                <button type="button" onclick="window.shareSelectedUserCredentials('whatsapp')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-black">
                    <i class="fa-brands fa-whatsapp mr-1"></i> WhatsApp पर भेजें
                </button>
                <button type="button" onclick="window.shareSelectedUserCredentials('email')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-black">
                    <i class="fa-solid fa-envelope mr-1"></i> Email पर भेजें
                </button>
            </div>
        `;
        msg.classList.remove('hidden');
    } catch (err) {
        alert("Error setting new password: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

window.adminUpdateVipDays = async function(daysToAdd) {
    const uid = document.getElementById('userSelectDropdown').value;
    if (!uid || !window.usersDataList[uid]) return alert('कृपया पहले ड्रॉपडाउन से यूज़र सेलेक्ट करें!');

    const uData = window.usersDataList[uid];
    const msg = document.getElementById('adminMsg');

    try {
        if (daysToAdd === 0) {
            if (!confirm(`क्या आप ${uData.email} का VIP Access हटाकर उसे Normal User बनाना चाहते हैं?`)) return;
            await updateDoc(doc(db, "users", uid), { isVip: false, vipExpiry: 0 });
            window.usersDataList[uid].isVip = false;
            window.usersDataList[uid].vipExpiry = 0;

            msg.className = "p-3.5 bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold border border-slate-300 text-center";
            msg.innerHTML = `VIP Access हटा दिया गया है! यूज़र अब Normal User है।`;
        } else {
            const now = Date.now();
            const currentExpiry = uData.vipExpiry || 0;
            const baseTime = (uData.isVip && currentExpiry > now) ? currentExpiry : now;
            const newExpiry = baseTime + (daysToAdd * MS_PER_DAY);

            await updateDoc(doc(db, "users", uid), { isVip: true, vipExpiry: newExpiry });
            window.usersDataList[uid].isVip = true;
            window.usersDataList[uid].vipExpiry = newExpiry;

            const totalDaysNow = Math.ceil((newExpiry - now) / MS_PER_DAY);
            msg.className = "p-3.5 bg-amber-50 text-amber-900 rounded-2xl text-xs font-bold border border-amber-300 text-center shadow-sm";
            msg.innerHTML = `👑 +${daysToAdd} Days VIP जोड़ दिए गए! कुल एक्टिव वैलिडिटी: <strong>${totalDaysNow} Days</strong>`;
        }

        await window.loadAllUsersForDropdown();
        document.getElementById('userSelectDropdown').value = uid;
        window.handleUserSelection();

        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 4000);
    } catch (err) {
        alert('Error updating VIP validity: ' + err.message);
    }
};

window.createNewUserByAdmin = async function(event) {
    event.preventDefault();
    const rawUser = document.getElementById('newAdminUserEmail').value.trim().toLowerCase();
    const newUserEmail = rawUser.includes('@') ? rawUser : `${rawUser}@print.com`;

    if (!window.isAllowedPortalEmail(newUserEmail)) {
        return alert("केवल @print.com डोमेन वाली User ID ही बनाई जा सकती है! (जैसे: rahul@print.com)");
    }

    const newUserPass = document.getElementById('newAdminUserPass').value.trim();
    const newUserPhone = document.getElementById('newAdminUserPhone')?.value.trim() || '';
    
    const isSpecialFree = FREE_VIP_EMAILS.includes(newUserEmail);
    const creditsInputVal = parseInt(document.getElementById('newAdminUserCredits').value);
    const initialCredits = isNaN(creditsInputVal) ? 30 : creditsInputVal;
    
    const vipDaysInputVal = parseInt(document.getElementById('newAdminUserVipDays').value);
    const initialVipDays = isNaN(vipDaysInputVal) ? 2 : vipDaysInputVal;

    const msg = document.getElementById('adminCreateMsg');
    const btn = event.target.querySelector('button[type="submit"]');
    
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';
    msg.classList.remove('hidden'); msg.innerText = "Creating account...";

    try {
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: newUserEmail, password: newUserPass, returnSecureToken: true })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        const isVip = isSpecialFree || initialVipDays > 0;
        const vipExpiry = isSpecialFree ? 0 : (isVip ? (Date.now() + (initialVipDays * MS_PER_DAY)) : 0);

        await setDoc(doc(db, "users", data.localId), {
            email: newUserEmail, 
            username: newUserEmail.split('@')[0], 
            userPass: newUserPass,
            userPhone: newUserPhone,
            credits: initialCredits, 
            isVip: isVip, 
            vipExpiry: vipExpiry,
            allowDob18: true,
            createdAt: new Date()
        });

        const credMsg = window.buildUserCredentialsText(newUserEmail, newUserPass, initialCredits, isVip, vipExpiry);
        const cleanPhone = window.formatCleanPhone(newUserPhone);
        const waLink = cleanPhone 
            ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(credMsg)}`
            : `https://wa.me/?text=${encodeURIComponent(credMsg)}`;
        const mailLink = `mailto:${newUserEmail}?subject=${encodeURIComponent('Ojas Print Service - Your Login ID & Password')}&body=${encodeURIComponent(credMsg)}`;
        
        msg.className = "mt-4 p-4 bg-emerald-50 text-emerald-950 rounded-2xl text-xs font-bold border border-emerald-300 space-y-3 shadow-sm";
        msg.innerHTML = `
            <div class="text-center">
                <i class="fa-solid fa-circle-check text-emerald-600 text-base mr-1"></i> नया अकाउंट सफलतापूर्वक बन गया!<br>
                <span class="inline-block mt-1 bg-white px-3 py-1 rounded-lg border border-emerald-200">ID: <strong>${newUserEmail}</strong> &nbsp;|&nbsp; Pass: <strong>${newUserPass}</strong></span>
            </div>
            <div class="grid grid-cols-2 gap-2.5">
                <a href="${waLink}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl text-center text-xs flex items-center justify-center gap-1.5 shadow-sm">
                    <i class="fa-brands fa-whatsapp text-sm"></i> WhatsApp पर भेजें
                </a>
                <a href="${mailLink}" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-3 rounded-xl text-center text-xs flex items-center justify-center gap-1.5 shadow-sm">
                    <i class="fa-solid fa-envelope"></i> Email पर भेजें
                </a>
            </div>
        `;
        
        event.target.reset();
        document.getElementById('newAdminUserCredits').value = 30;
        document.getElementById('newAdminUserVipDays').value = "2";
        
        await window.loadAllUsersForDropdown();
    } catch (err) {
        msg.className = "mt-4 p-3.5 bg-red-50 text-red-700 rounded-2xl text-xs font-bold border border-red-200 text-center";
        msg.innerHTML = `Error: ${err.message}`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-user-check"></i> Create User Account (@print.com)';
    }
};

window.adjustCredits = async function(action) {
    const uid = document.getElementById('userSelectDropdown').value;
    const amount = parseInt(document.getElementById('creditAdjustmentAmount').value);
    
    if (!uid) return alert('कृपया पहले यूज़र सेलेक्ट करें!');
    if (!amount || amount <= 0) return alert('कृपया सही क्रेडिट संख्या डालें!');

    const btnId = action === 'add' ? 'btnAdd' : 'btnSub';
    const btn = document.getElementById(btnId);
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btn.disabled = true;

    const msg = document.getElementById('adminMsg'); msg.classList.remove('hidden');

    try {
        const userRef = doc(db, "users", uid);
        const userDoc = await getDoc(userRef);
        let currentCredits = userDoc.data().credits || 0;
        let newCredits = action === 'add' ? currentCredits + amount : currentCredits - amount;
        if (newCredits < 0) newCredits = 0;

        await updateDoc(userRef, { credits: newCredits });
        
        window.usersDataList[uid].credits = newCredits;
        document.getElementById('currentUserCreditsDisplay').innerText = newCredits;
        document.getElementById('creditAdjustmentAmount').value = '';
        
        msg.className = "p-3.5 bg-green-50 text-green-800 rounded-2xl text-xs font-bold border border-green-300 text-center shadow-sm";
        msg.innerHTML = `<i class="fa-solid fa-check-circle mr-1"></i> क्रेडिट्स अपडेट हो गए! नया बैलेंस: <strong>${newCredits} Credits</strong>`;
        await window.loadAllUsersForDropdown();
        document.getElementById('userSelectDropdown').value = uid;
    } catch (err) {
        msg.className = "p-3.5 bg-red-50 text-red-700 rounded-2xl text-xs font-bold border border-red-200 text-center";
        msg.innerHTML = `Error: ${err.message}`;
    } finally {
        btn.innerHTML = origText; btn.disabled = false;
        setTimeout(() => { msg.classList.add('hidden'); }, 3000);
    }
};

// ================= SECTION: DATABASE RECORDS (HISTORY) + STAMP SYNC TO USER PORTAL =================
window.loadAdminHistory = async function() {
    const container = document.getElementById('adminHistoryListContainer');
    container.innerHTML = `<div class="p-10 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-100"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-royal-500"></i><br>रिकॉर्ड्स लोड हो रहे हैं...</div>`;

    await window.preloadAllAvailableStamps();

    try {
        const filterUserDropdown = document.getElementById('filterUser');
        const currUserFilter = filterUserDropdown.value;
        
        filterUserDropdown.innerHTML = '<option value="ALL">All Users</option>';
        filterUserDropdown.innerHTML += `<option value="${window.currentUserData.uid}">👑 Harish Kumar (Admin)</option>`;
        
        for (const [uid, data] of Object.entries(window.usersDataList)) {
             window.allUsersMap[uid] = data.email;
             if (uid !== window.currentUserData.uid) {
                 filterUserDropdown.innerHTML += `<option value="${uid}">${data.email}</option>`;
             }
        }
        filterUserDropdown.value = currUserFilter || 'ALL';

        const historySnap = await getDocs(collection(db, "history"));
        window.adminAllHistoryData = [];
        historySnap.forEach(docSnap => {
            window.adminAllHistoryData.push({ id: docSnap.id, ...docSnap.data() });
        });
        window.adminAllHistoryData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        window.stampSelectionMap = {};
        window.adminAllHistoryData.forEach((rec, idx) => {
            if (rec.withStamp) {
                window.stampSelectionMap[idx] = {
                    enabled: true,
                    stampFile: rec.stampFile || 'stamp.png',
                    stampSrc: window.getStampDataUrlByName(rec.stampFile || 'stamp.png')
                };
            }
        });

        window.renderAdminHistory();
    } catch (err) {
        container.innerHTML = `<div class="p-6 text-center text-red-500 font-bold bg-white rounded-2xl">Error: ${err.message}</div>`;
    }
};

window.toggleRowStampCheckbox = async function(origIndex, isChecked) {
    const record = window.adminAllHistoryData[origIndex];
    if (!record) return;

    if (isChecked) {
        if (window.availableStampsList.length === 0) {
            await window.preloadAllAvailableStamps();
        }
        const chosenObj = window.pickRandomAvailableStampObj();
        window.stampSelectionMap[origIndex] = {
            enabled: true,
            stampFile: chosenObj.name,
            stampSrc: chosenObj.dataUrl
        };
        record.withStamp = true;
        record.stampFile = chosenObj.name;

        try {
            await updateDoc(doc(db, "history", record.id), {
                withStamp: true,
                stampFile: chosenObj.name,
                stampedAt: new Date()
            });
        } catch (e) {
            console.error("Failed to save stamp to Firestore:", e);
        }
    } else {
        window.stampSelectionMap[origIndex] = {
            enabled: false,
            stampFile: '',
            stampSrc: ''
        };
        record.withStamp = false;
        record.stampFile = '';

        try {
            await updateDoc(doc(db, "history", record.id), {
                withStamp: false,
                stampFile: ''
            });
        } catch (e) {
            console.error("Failed to remove stamp from Firestore:", e);
        }
    }

    window.renderAdminHistory();
};

window.renderAdminHistory = function() {
    const container = document.getElementById('adminHistoryListContainer');
    const fUser = document.getElementById('filterUser').value;
    const fType = document.getElementById('filterType').value;

    const indexedData = window.adminAllHistoryData.map((item, idx) => ({ ...item, _origIndex: idx }));
    let filteredData = indexedData;
    if (fUser !== 'ALL') filteredData = filteredData.filter(item => item.userId === fUser);
    if (fType !== 'ALL') filteredData = filteredData.filter(item => item.serviceType === fType);

    document.getElementById('historyCount').innerText = `Total Files: ${filteredData.length}`;

    container.innerHTML = '';
    if (filteredData.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-400 bg-white rounded-2xl border border-slate-100"><i class="fa-regular fa-folder-open text-4xl mb-2 text-slate-300"></i><br>कोई फाइल नहीं मिली।</div>`;
        return;
    }

    filteredData.forEach(data => {
        const sec = data.timestamp?.seconds || Math.floor(Date.now() / 1000);
        const dateObj = new Date(sec * 1000);
        const dateStr = dateObj.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
        const timeStr = dateObj.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
        
        const userBadge = (data.userId === window.currentUserData.uid) 
            ? '<span class="text-royal-700 font-black bg-royal-100 px-2 py-0.5 rounded text-[10px] border border-royal-200">👑 Admin</span>' 
            : `<span class="font-bold text-slate-600 text-xs">${window.allUsersMap[data.userId] || 'User'}</span>`;

        const safeFileName = String(data.fileName || 'Document.pdf').replace(/'/g, "\\'");
        const isAnnexure = String(data.fileId || '').startsWith('LOCAL_HTML_');
        const stampState = window.stampSelectionMap[data._origIndex];
        const isStampChecked = !!(stampState && stampState.enabled);

        const stampCheckboxHtml = isAnnexure ? `
            <label class="inline-flex items-center gap-1.5 ${isStampChecked ? 'bg-green-100 text-green-900 border-green-400' : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'} border px-2.5 py-2 rounded-xl text-xs font-black cursor-pointer select-none transition shadow-sm" title="टिक करते ही यह स्टैम्प यूज़र के पोर्टल पर भी सेव সৌন্দর্য">
                <input type="checkbox" id="stampChk-${data._origIndex}" ${isStampChecked ? 'checked' : ''} onchange="window.toggleRowStampCheckbox(${data._origIndex}, this.checked)" class="w-4 h-4 accent-green-600 rounded cursor-pointer">
                <span><i class="fa-solid fa-stamp ${isStampChecked ? 'text-green-700' : 'text-amber-600'} mr-0.5"></i> ${isStampChecked ? 'Stamped for User' : 'Apply Stamp'}</span>
            </label>
        ` : '';

        container.innerHTML += `
            <div class="bg-white p-3.5 md:p-4 rounded-2xl border ${isStampChecked ? 'border-green-300 bg-green-50/20' : 'border-slate-200'} shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-royal-400 transition">
                <div class="space-y-1 overflow-hidden w-full">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">${data.serviceType}</span>
                        ${userBadge}
                        ${isStampChecked ? `<span class="bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 rounded-full text-[10px] font-black"><i class="fa-solid fa-check mr-0.5"></i>Stamp Synced to User</span>` : ''}
                        <span class="text-[11px] text-slate-400 font-medium ml-auto sm:ml-0">${dateStr} • ${timeStr}</span>
                    </div>
                    <p class="font-black text-slate-800 text-xs md:text-sm truncate">${data.fileName}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    ${stampCheckboxHtml}
                    <button onclick="window.openPdfViewer('${data.fileId}', '${safeFileName}', ${data._origIndex})" class="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 bg-royal-50 text-royal-700 px-3 py-2 rounded-xl text-xs font-black hover:bg-royal-500 hover:text-white transition border border-royal-200">
                        <i class="fa-solid fa-eye"></i> Preview / PDF
                    </button>
                    <button onclick="window.triggerDirectPrintByIndex(${data._origIndex}, this)" class="inline-flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-dark-950 px-3 py-2 rounded-xl text-xs font-black transition shadow-sm" title="Direct Print">
                        <i class="fa-solid fa-print"></i> Print
                    </button>
                    <button onclick="window.deleteHistoryRecord('${data.id}')" class="w-9 h-9 inline-flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition border border-red-100" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
};

window.deleteHistoryRecord = async function(docId) {
    if (!confirm('क्या आप इस फाइल को हमेशा के लिए डिलीट करना चाहते हैं?')) return;
    try { await deleteDoc(doc(db, "history", docId)); window.loadAdminHistory(); } 
    catch (err) { alert('Error deleting: ' + err.message); }
};

window.bulkDeleteFilteredHistory = async function() {
    const fUser = document.getElementById('filterUser').value;
    const fType = document.getElementById('filterType').value;
    let filteredData = window.adminAllHistoryData;
    if (fUser !== 'ALL') filteredData = filteredData.filter(item => item.userId === fUser);
    if (fType !== 'ALL') filteredData = filteredData.filter(item => item.serviceType === fType);

    if (filteredData.length === 0) return alert('डिलीट करने के लिए कोई फाइल नहीं है!');
    if (!confirm(`चेतावनी!\nक्या आप वाकई इन ${filteredData.length} फाइलों को हमेशा के लिए डिलीट करना चाहते हैं?`)) return;

    const btn = document.getElementById('bulkDeleteBtn');
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...'; btn.disabled = true;

    try {
        await Promise.all(filteredData.map(item => deleteDoc(doc(db, "history", item.id))));
        alert(`Success! ${filteredData.length} फाइलें डिलीट कर दी गईं।`);
        window.loadAdminHistory();
    } catch (err) { alert('Error occurred: ' + err.message); } 
    finally { btn.innerHTML = origHTML; btn.disabled = false; }
};

window.triggerDirectPrintByIndex = async function(historyIndex, btnEl) {
    const record = window.adminAllHistoryData[historyIndex];
    if (!record) return;
    const stampState = window.stampSelectionMap[historyIndex];
    const withStamp = !!(stampState && stampState.enabled);
    let chosenSrc = stampState?.stampSrc || '';

    if (withStamp && !chosenSrc) {
        if (window.availableStampsList.length === 0) {
            await window.preloadAllAvailableStamps();
        }
        const chosenObj = window.pickRandomAvailableStampObj();
        chosenSrc = chosenObj.dataUrl;
        window.stampSelectionMap[historyIndex] = { enabled: true, stampFile: chosenObj.name, stampSrc: chosenSrc };
    }

    window.directPrintDocument(record.fileId, record.formData || {}, record.fileName || 'Document.pdf', withStamp, chosenSrc, btnEl);
};

window.toggleModalStampPreview = async function(isChecked) {
    const ctx = window.currentModalContext;
    if (!ctx || !String(ctx.fileId).startsWith('LOCAL_HTML_')) return;

    if (isChecked) {
        if (window.availableStampsList.length === 0) {
            await window.preloadAllAvailableStamps();
        }
        const chosenObj = window.pickRandomAvailableStampObj();
        ctx.withStamp = true;
        ctx.stampFile = chosenObj.name;
        ctx.stampSrc = chosenObj.dataUrl;
    } else {
        ctx.withStamp = false;
        ctx.stampFile = '';
        ctx.stampSrc = '';
    }

    if (ctx.historyIndex >= 0) {
        window.stampSelectionMap[ctx.historyIndex] = {
            enabled: ctx.withStamp,
            stampFile: ctx.stampFile,
            stampSrc: ctx.stampSrc
        };
        const record = window.adminAllHistoryData[ctx.historyIndex];
        if (record) {
            record.withStamp = ctx.withStamp;
            record.stampFile = ctx.stampFile;
            try {
                await updateDoc(doc(db, "history", record.id), {
                    withStamp: ctx.withStamp,
                    stampFile: ctx.stampFile || '',
                    stampedAt: new Date()
                });
            } catch (e) {}
        }
        window.renderAdminHistory();
    }

    const record = window.adminAllHistoryData[ctx.historyIndex];
    const fData = record?.formData || {};
    const htmlPreviewContainer = document.getElementById('htmlDocPreviewContainer');
    htmlPreviewContainer.innerHTML = window.buildLocalAffidavitHtml(ctx.fileId, fData, true, ctx.withStamp, ctx.stampSrc);
};

// --- UPDATED openPdfViewer WITH DIRECT FILE SHARE FOR GOOGLE DRIVE ---
window.openPdfViewer = async function(fileId, fileName, historyIndex = -1) {
    document.getElementById('pdfViewerTitle').innerText = fileName;
    const iframe = document.getElementById('pdfIframe');
    const htmlPreviewContainer = document.getElementById('htmlDocPreviewContainer');
    const spinner = document.getElementById('pdfLoadingSpinner');
    const downloadBtn = document.getElementById('modalDownloadBtn');
    const printBtn = document.getElementById('modalPrintBtn');
    const modalStampLabel = document.getElementById('modalStampToggleLabel');
    const modalStampCheckbox = document.getElementById('modalStampCheckbox');
    const shareBtn = document.getElementById('modalShareBtn');

    const isAnnexure = String(fileId).startsWith('LOCAL_HTML_');
    let initialWithStamp = false;
    let initialStampSrc = '';
    let initialStampFile = '';

    if (historyIndex >= 0) {
        const existingState = window.stampSelectionMap ? window.stampSelectionMap[historyIndex] : null;
        initialWithStamp = !!(existingState && existingState.enabled);
        initialStampSrc = existingState?.stampSrc || '';
        initialStampFile = existingState?.stampFile || '';
    }

    if (initialWithStamp && !initialStampSrc && typeof window.preloadAllAvailableStamps === 'function') {
        if (window.availableStampsList && window.availableStampsList.length === 0) {
            await window.preloadAllAvailableStamps();
        }
        if(window.pickRandomAvailableStampObj){
            const chosenObj = window.pickRandomAvailableStampObj();
            initialStampSrc = chosenObj.dataUrl;
            initialStampFile = chosenObj.name;
            if (historyIndex >= 0 && window.stampSelectionMap) {
                window.stampSelectionMap[historyIndex] = { enabled: true, stampFile: initialStampFile, stampSrc: initialStampSrc };
            }
        }
    }

    window.currentModalContext = {
        fileId: fileId,
        fileName: fileName,
        historyIndex: historyIndex,
        withStamp: initialWithStamp,
        stampFile: initialStampFile,
        stampSrc: initialStampSrc
    };

    // शेयर बटन दिखाएँ
    if (shareBtn) shareBtn.style.display = 'flex';

    if (isAnnexure && historyIndex >= 0) {
        if (modalStampLabel) modalStampLabel.classList.remove('hidden');
        if (modalStampCheckbox) modalStampCheckbox.checked = initialWithStamp;

        const record = (window.historyData && window.historyData[historyIndex]) || (window.adminAllHistoryData && window.adminAllHistoryData[historyIndex]);
        const fData = record?.formData || {};
        
        spinner.style.display = 'none';
        iframe.style.display = 'none';
        htmlPreviewContainer.style.display = 'flex';
        htmlPreviewContainer.innerHTML = window.buildLocalAffidavitHtml(fileId, fData, true, initialWithStamp, initialStampSrc);

        if (downloadBtn) {
            downloadBtn.onclick = async function() {
                await window.downloadHtmlDocAsPdf(fileId, fData, fileName, window.currentModalContext.withStamp, window.currentModalContext.stampSrc);
            };
        }
        if (printBtn) {
            printBtn.onclick = function() {
                window.directPrintDocument(fileId, fData, fileName, window.currentModalContext.withStamp, window.currentModalContext.stampSrc);
            };
        }
        if (shareBtn) {
            shareBtn.onclick = async function() {
                await window.shareHtmlDocAsPdf(fileId, fData, fileName, window.currentModalContext.withStamp, window.currentModalContext.stampSrc);
            };
        }
    } else {
        // GOOGLE DRIVE FILES LOGIC (Domicile / Caste)
        if (modalStampLabel) modalStampLabel.classList.add('hidden');
        
        htmlPreviewContainer.style.display = 'none';
        htmlPreviewContainer.innerHTML = '';
        iframe.style.display = 'block';
        spinner.style.display = 'flex';
        iframe.src = `https://drive.google.com/file/d/${fileId}/preview`;
        
        if (downloadBtn) {
            downloadBtn.onclick = function() {
                window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank');
            };
        }
        if (printBtn) {
            printBtn.onclick = function() {
                window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank');
            };
        }
        if (shareBtn) {
            shareBtn.onclick = async function() {
                const btn = this;
                const origHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Wait...';
                btn.disabled = true;

                try {
                    if (navigator.canShare) {
                        // Drive Direct Download URL
                        const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                        
                        // CORS Proxy to bypass Google Drive security and fetch the actual PDF blob
                        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(driveUrl)}`;
                        
                        const response = await fetch(proxyUrl);
                        if (!response.ok) throw new Error("Failed to fetch file");
                        
                        const blob = await response.blob();
                        const file = new File([blob], fileName, { type: 'application/pdf' });

                        if (navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                files: [file],
                                title: fileName
                            });
                        } else {
                            alert('आपका डिवाइस डायरेक्ट फाइल शेयर सपोर्ट नहीं करता।');
                        }
                    } else {
                        alert('आपका ब्राउज़र या कनेक्शन डायरेक्ट शेयर सपोर्ट नहीं करता।');
                    }
                } catch(e) {
                    console.error("Direct Share Error: ", e);
                    alert('फाइल को सीधे शेयर करने में समस्या आई। कृपया फाइल डाउनलोड करके शेयर करें।');
                } finally {
                    btn.innerHTML = origHtml;
                    btn.disabled = false;
                }
            };
        }
    }

    const modal = document.getElementById('pdfViewerModal');
    if (modal) {
        modal.style.display = 'flex'; 
        modal.classList.remove('hidden'); 
    }
    document.body.style.overflow = 'hidden';
};

window.closePdfViewer = function() {
    document.getElementById('pdfViewerModal').classList.add('hidden');
    document.getElementById('pdfIframe').src = '';
    document.getElementById('htmlDocPreviewContainer').innerHTML = '';
    document.body.style.overflow = 'auto';
};

// ================= 6-TAB NAVIGATION SWITCHER =================
window.switchAdminMainTab = function(tabName) {
    const tabs = ['payments', 'users', 'create_user', 'support', 'history', 'controls'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            btn.className = "bg-slate-50 text-slate-600 font-bold py-2.5 px-3 rounded-xl hover:bg-slate-100 transition border border-slate-200/80 text-xs flex justify-center items-center gap-1.5";
        }
        const section = document.getElementById(`section-${t}`);
        if (section) section.classList.add('hidden');
    });

    const activeBtn = document.getElementById(`tab-${tabName}`);
    if (activeBtn) {
        activeBtn.className = "bg-dark-950 text-royal-300 font-black py-2.5 px-3 rounded-xl shadow-glow transition text-xs flex justify-center items-center gap-1.5 border border-royal-500/50";
    }
    
    const activeSection = document.getElementById(`section-${tabName}`);
    if (activeSection) {
        activeSection.removeAttribute('class');
        if (tabName === 'payments') activeSection.className = 'space-y-4';
        if (tabName === 'users') activeSection.className = 'space-y-4';
        if (tabName === 'create_user') activeSection.className = 'block';
        if (tabName === 'support') activeSection.className = 'space-y-4';
        if (tabName === 'history') activeSection.className = 'space-y-4';
        if (tabName === 'controls') activeSection.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    }

    if (tabName === 'payments') window.loadAllPayments();
    if (tabName === 'support') {
        window.populateSupportUserDropdown();
        window.renderSupportChatSidebar();
        if (!window.selectedChatTicketId && window.allSupportTickets.length > 0) {
            window.selectSupportChatThread(window.allSupportTickets[0].id);
        }
    }
    if (tabName === 'history') window.loadAdminHistory();
    if (tabName === 'controls') window.loadPortalSettingsForAdmin();
};
