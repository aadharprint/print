// ============================================================================
// FILE 3: js/portal-wallet-chat.js (UPDATED)
// (Auth, Wallet, Chat, User Preview Fix & Per-User Service Stealth Logic)
// ============================================================================

import "./config-templates.js";
import "./portal-forms.js";

const {
    auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    updatePassword, EmailAuthProvider, reauthenticateWithCredential,
    doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, onSnapshot
} = window.fb;

window.currentUserData = null;
window.historyData = [];
window.userPaymentsData = [];
window.currentActiveTab = 'domicile';
window.vipCountdownInterval = null;
window.portalSettingsUnsubscribe = null;
window.userProfileUnsubscribe = null;
window.userChatUnsubscribe = null;
window.activePaymentUnsubscribe = null;
window.currentActiveOrderId = null;
window.currentUserChatData = { messages: [], unreadByUser: false };

window.portalConfigState = {
    showDomicile: true, showCaste: true, showDob18: true,
    bannerEnabled: false, bannerBadge: "UPDATE", bannerTitle: "",
    bannerMessage: "", bannerBtnText: "", bannerBtnLink: ""
};

window.currentRechargeCredits = 0; window.currentTotalPayable = 0; window.currentWantsVip = false; window.currentVipDays = 0; window.currentVipPlanFee = 0;

// === NEW: PER-USER VISIBILITY CHECKER ===
window.canCurrentUserSeeService = function(srv) {
    const cfg = window.portalConfigState || {};
    const u = window.currentUserData;
    if (!u) return false;
    
    // Check Global Stealth + Per-User Stealth
    if (srv === 'domicile') return cfg.showDomicile !== false && u.allowDomicile !== false;
    if (srv === 'caste') return cfg.showCaste !== false && u.allowCaste !== false;
    if (srv === 'dob18') return cfg.showDob18 !== false && u.allowDob18 !== false;
    if (srv === 'dob_minor') return u.allowDobMinor !== false;
    
    return true; // For other services like annexures
};

window.getFirstAllowedTab = function() { 
    if (window.canCurrentUserSeeService('domicile')) return 'domicile'; 
    if (window.canCurrentUserSeeService('caste')) return 'caste'; 
    if (window.currentUserData && window.currentUserData.isVip) {
        if (window.canCurrentUserSeeService('dob18')) return 'dob18';
        return 'annexure1';
    }
    return 'history'; 
};

async function notifyAdminSecurely(payload) { try { await fetch('/api/notify-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (e) {} }

window.openForgotPasswordModal = function() { const modal = document.getElementById('forgotPasswordModal'); const idInp = document.getElementById('forgotUserIdInput'); const phoneInp = document.getElementById('forgotUserPhoneInput'); const noteInp = document.getElementById('forgotUserNoteInput'); const resBox = document.getElementById('forgotResultBox'); if (!modal) return; resBox.style.display = 'none'; idInp.value = document.getElementById('loginUsername')?.value.trim() || ''; phoneInp.value = ''; noteInp.value = ''; modal.style.display = 'flex'; };
window.closeForgotPasswordModal = function() { const modal = document.getElementById('forgotPasswordModal'); if (modal) modal.style.display = 'none'; };
window.submitForgotPasswordTicket = async function(event) { event.preventDefault(); const userIdText = document.getElementById('forgotUserIdInput').value.trim(); const userPhoneText = document.getElementById('forgotUserPhoneInput').value.trim(); const userNoteText = document.getElementById('forgotUserNoteInput').value.trim(); const btn = document.getElementById('btnSubmitForgotTicket'); const resBox = document.getElementById('forgotResultBox'); if (!userIdText || !userPhoneText) return alert("कृपया अपनी User ID और मोबाइल/WhatsApp नंबर ज़रूर भरें!"); const origHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Raising Ticket...'; const finalMessage = userNoteText || "मैं अपना पासवर्ड भूल गया हूँ, कृपया नया पासवर्ड जारी करें।"; try { await addDoc(collection(db, "supportTickets"), { type: "FORGOT_PASSWORD", userIdentifier: userIdText, userPhone: userPhoneText, message: `🔑 Forgot Password Request: ${finalMessage} (WhatsApp: ${userPhoneText})`, messages: [{ sender: 'user', text: `🔑 [FORGOT PASSWORD TICKET]\nUser ID: ${userIdText}\nWhatsApp: ${userPhoneText}\nNote: ${finalMessage}`, time: Date.now() }], status: "Open", unreadByAdmin: true, unreadByUser: false, timestamp: new Date(), updatedAtMs: Date.now() }); try { await addDoc(collection(db, "forgotTickets"), { userIdentifier: userIdText, userPhone: userPhoneText, note: finalMessage, status: "Pending", timestamp: new Date() }); } catch (e) {} notifyAdminSecurely({ type: "FORGOT_PASSWORD", userId: userIdText, phone: userPhoneText, message: finalMessage }); resBox.className = "p-3.5 rounded-2xl bg-green-50 border border-green-300 text-green-900 text-xs font-bold text-center space-y-1"; resBox.innerHTML = `<div><i class="fa-solid fa-circle-check text-green-600 text-base mr-1"></i> आपका टिकट सफलतापूर्वक रेज़ हो गया है!</div><p class="text-[11px] text-green-700">एडमिन को सूचना भेज दी गई है। जल्द ही आपके नंबर (${userPhoneText}) पर नया पासवर्ड भेज दिया जाएगा।</p>`; resBox.style.display = 'block'; event.target.reset(); } catch (err) { alert("टिकट भेजने में समस्या आई: " + err.message); } finally { btn.disabled = false; btn.innerHTML = origHtml; } };

function startUserSupportChatListener(uid) { if (window.userChatUnsubscribe) window.userChatUnsubscribe(); window.userChatUnsubscribe = onSnapshot(doc(db, "supportTickets", uid), async (snap) => { if (snap.exists()) { window.currentUserChatData = snap.data(); } else { window.currentUserChatData = { messages: [], unreadByUser: false }; } const isUnread = window.currentUserChatData.unreadByUser === true; const headerBadge = document.getElementById('headerSupportUnreadBadge'); const gearBadge = document.getElementById('gearSupportUnreadBadge'); if (window.currentActiveTab === 'support_chat') { if (isUnread) { try { await updateDoc(doc(db, "supportTickets", uid), { unreadByUser: false }); } catch (e) {} } if (headerBadge) headerBadge.style.display = 'none'; if (gearBadge) gearBadge.style.display = 'none'; window.renderUserLiveChatMessages(); } else { if (headerBadge) { headerBadge.innerText = '1'; headerBadge.style.display = isUnread ? 'inline-flex' : 'none'; } if (gearBadge) { gearBadge.innerText = 'New'; gearBadge.style.display = isUnread ? 'inline-block' : 'none'; } } }); }
window.renderUserLiveChatMessages = function() { const box = document.getElementById('userLiveChatMessagesBox'); if (!box) return; let msgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : []; if (msgs.length === 0 && window.currentUserChatData?.message) msgs.push({ sender: 'user', text: window.currentUserChatData.message, time: Date.now() }); if (msgs.length === 0) { box.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400"><div class="w-12 h-12 rounded-full bg-royal-50 text-royal-500 flex items-center justify-center text-xl mb-2 border border-royal-200"><i class="fa-solid fa-comments"></i></div><p class="text-xs font-black text-slate-600">Ojas Live Support Chat</p><p class="text-[11px] text-slate-400 mt-0.5">कोई भी समस्या या सवाल नीचे लिखकर भेजें। एडमिन का रिप्लाई यहीं इसी चैट में लाइव दिखेगा।</p></div>`; return; } box.innerHTML = msgs.map(m => { const isMe = m.sender === 'user'; const tStr = m.time ? new Date(m.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : ''; const safeText = String(m.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); if (isMe) { return `<div class="flex justify-end"><div class="max-w-[80%] bg-dark-900 text-white px-3.5 py-2.5 rounded-2xl rounded-br-none shadow-sm"><p class="text-xs font-semibold whitespace-pre-line leading-relaxed">${safeText}</p><span class="block text-[9px] text-royal-300 text-right mt-1 opacity-80">${tStr} • You</span></div></div>`; } else { return `<div class="flex justify-start"><div class="max-w-[80%] bg-amber-50 border border-amber-300 text-slate-900 px-3.5 py-2.5 rounded-2xl rounded-bl-none shadow-sm"><span class="text-[10px] font-black text-amber-800 uppercase block mb-0.5"><i class="fa-solid fa-crown text-amber-500 mr-1"></i>Admin Support</span><p class="text-xs font-bold whitespace-pre-line leading-relaxed">${safeText}</p><span class="block text-[9px] text-slate-400 text-right mt-1">${tStr}</span></div></div>`; } }).join(''); box.scrollTop = box.scrollHeight; };
window.sendUserSupportMessage = async function(event) { event.preventDefault(); if (!window.currentUserData) return; const inp = document.getElementById('userSupportChatInput'); const btn = document.getElementById('btnSendUserChat'); const text = inp.value.trim(); if (!text) return; inp.value = ''; btn.disabled = true; const uid = window.currentUserData.uid; try { const existingMsgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : []; existingMsgs.push({ sender: 'user', text: text, time: Date.now() }); await setDoc(doc(db, "supportTickets", uid), { type: 'USER_SUPPORT_CHAT', userId: uid, userIdentifier: window.currentUserData.email, username: window.currentUserData.username, message: text, status: 'Open', unreadByAdmin: true, unreadByUser: false, timestamp: new Date(), updatedAtMs: Date.now(), messages: existingMsgs }, { merge: true }); } catch (err) { alert("मैसेज भेजने में समस्या आई: " + err.message); } finally { btn.disabled = false; inp.focus(); } };

// === UPDATED: SYNC ALL 4 PER-USER STEALTH VALUES ===
function startUserProfileListener(uid) { 
    if (window.userProfileUnsubscribe) window.userProfileUnsubscribe(); 
    window.userProfileUnsubscribe = onSnapshot(doc(db, "users", uid), (snap) => { 
        if (!snap.exists() || !window.currentUserData) return; 
        const data = snap.data(); 
        window.currentUserData.credits = data.credits || 0; 
        
        // Sync stealth states
        window.currentUserData.allowDob18 = data.allowDob18 !== false;
        window.currentUserData.allowDomicile = data.allowDomicile !== false;
        window.currentUserData.allowCaste = data.allowCaste !== false;
        window.currentUserData.allowDobMinor = data.allowDobMinor !== false;

        const creditEl = document.getElementById('displayCredits'); if (creditEl) creditEl.innerText = window.currentUserData.credits; 
        const now = Date.now(); const isNowVip = window.currentUserData.hasFreeAccess || (data.isVip && (!data.vipExpiry || data.vipExpiry > now)); 
        const vipChanged = window.currentUserData.isVip !== isNowVip; 
        window.currentUserData.isVip = isNowVip; window.currentUserData.vipExpiry = window.currentUserData.hasFreeAccess ? 0 : (data.vipExpiry || 0); 
        if (vipChanged) setupDashboard(window.currentUserData); else window.applyLivePortalControls(); 
    }); 
}

function startPortalSettingsListener() { if (window.portalSettingsUnsubscribe) window.portalSettingsUnsubscribe(); window.portalSettingsUnsubscribe = onSnapshot(doc(db, "settings", "portalConfig"), (snap) => { if (snap.exists()) { const data = snap.data(); window.portalConfigState = { showDomicile: data.showDomicile !== false, showCaste: data.showCaste !== false, showDob18: data.showDob18 !== false, bannerEnabled: !!data.bannerEnabled, bannerBadge: data.bannerBadge || "UPDATE", bannerTitle: data.bannerTitle || "", bannerMessage: data.bannerMessage || "", bannerBtnText: data.bannerBtnText || "", bannerBtnLink: data.bannerBtnLink || "" }; } window.applyLivePortalControls(); }); }

window.applyLivePortalControls = function() {
    const cfg = window.portalConfigState; 
    
    // Check combined visibility
    const canDom = window.canCurrentUserSeeService('domicile');
    const canCas = window.canCurrentUserSeeService('caste');
    const canDob18 = window.canCurrentUserSeeService('dob18');
    const canDobMinor = window.canCurrentUserSeeService('dob_minor');

    const bannerBox = document.getElementById('liveUpdateBannerContainer');
    if (bannerBox) { if (cfg.bannerEnabled && (cfg.bannerTitle || cfg.bannerMessage)) { bannerBox.style.display = 'block'; const btnHtml = (cfg.bannerBtnText && cfg.bannerBtnLink) ? `<a href="${cfg.bannerBtnLink}" target="_blank" class="bg-amber-400 hover:bg-amber-300 text-dark-950 font-black px-3.5 py-1.5 rounded-xl text-[11px] transition shrink-0 shadow-sm">${cfg.bannerBtnText} <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-[9px]"></i></a>` : ''; bannerBox.innerHTML = `<div class="p-3.5 rounded-2xl bg-gradient-to-r from-dark-950 via-slate-900 to-indigo-950 text-white border border-royal-400/60 shadow-md"><div class="flex flex-wrap items-center justify-between gap-2.5"><div class="flex items-start sm:items-center gap-2.5"><span class="bg-royal-500 text-dark-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 mt-0.5 sm:mt-0"><i class="fa-solid fa-bullhorn mr-1"></i>${cfg.bannerBadge}</span><div>${cfg.bannerTitle ? `<h4 class="text-xs md:text-sm font-black text-royal-300">${cfg.bannerTitle}</h4>` : ''}${cfg.bannerMessage ? `<p class="text-[11px] font-semibold text-slate-200 mt-0.5">${cfg.bannerMessage}</p>` : ''}</div></div>${btnHtml}</div></div>`; } else { bannerBox.style.display = 'none'; bannerBox.innerHTML = ''; } }
    
    const stdGrid = document.getElementById('standardServicesGrid'); 
    const btnDom = document.getElementById('btn-domicile'); 
    const btnCas = document.getElementById('btn-caste'); 
    const btnDob = document.getElementById('btn-dob18'); 
    const btnDobMinor = document.getElementById('btn-dob_minor');
    const promoDesc = document.getElementById('normalPromoTextDesc'); 
    const vipHeaderLabel = document.getElementById('vipBarTitleLabel');
    
    if (btnDom) btnDom.style.setProperty('display', canDom ? 'flex' : 'none', 'important'); 
    if (btnCas) btnCas.style.setProperty('display', canCas ? 'flex' : 'none', 'important');
    if (btnDob) btnDob.style.setProperty('display', canDob18 ? 'flex' : 'none', 'important');
    if (btnDobMinor) btnDobMinor.style.setProperty('display', canDobMinor ? 'flex' : 'none', 'important');
    
    if (stdGrid) { 
        if (!canDom && !canCas) { stdGrid.style.setProperty('display', 'none', 'important'); } 
        else if (canDom && canCas) { stdGrid.style.setProperty('display', 'grid', 'important'); stdGrid.className = "grid grid-cols-2 gap-2.5 mb-3"; } 
        else { stdGrid.style.setProperty('display', 'grid', 'important'); stdGrid.className = "grid grid-cols-1 gap-2.5 mb-3"; } 
    }
    
    if (promoDesc) promoDesc.innerHTML = canDob18 ? `VIP लें: <strong>18+ DOB & सारे 9 Official Annexures</strong> अनलॉक करें (सभी डॉक्यूमेंट 10 Cr)!` : `VIP लें: <strong>सारे 9 Official Annexures</strong> अनलॉक करें (सभी डॉक्यूमेंट 10 Cr)!`;
    if (vipHeaderLabel) vipHeaderLabel.innerHTML = canDob18 ? `<i class="fa-solid fa-crown text-royal-400"></i> VIP Services (DOB & All Annexures)` : `<i class="fa-solid fa-crown text-royal-400"></i> VIP Services (All 9 Annexures)`;
    
    if ((window.currentActiveTab === 'domicile' && !canDom) || (window.currentActiveTab === 'caste' && !canCas) || (window.currentActiveTab === 'dob18' && !canDob18) || (window.currentActiveTab === 'dob_minor' && !canDobMinor)) { 
        window.switchService(window.getFirstAllowedTab()); 
    }
};

document.addEventListener('click', (e) => { const menu = document.getElementById('gearDropdownMenu'); const btn = document.getElementById('gearMenuBtn'); if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) menu.classList.add('hidden'); });
window.toggleGearMenu = function(e) { if (e) e.stopPropagation(); const menu = document.getElementById('gearDropdownMenu'); if (menu) menu.classList.toggle('hidden'); };
window.selectGearOption = function(serviceName) { const menu = document.getElementById('gearDropdownMenu'); if (menu) menu.classList.add('hidden'); window.switchService(serviceName); };

onAuthStateChanged(auth, async (user) => {
    const loadingScreen = document.getElementById('loadingScreen'); const loginSection = document.getElementById('loginSection'); const dashboardSection = document.getElementById('dashboardSection');
    if (user) {
        try {
            const emailLower = user.email.trim().toLowerCase(); if (!window.isAllowedPortalEmail(emailLower)) { await signOut(auth); alert("अमान्य आईडी! पोर्टल पर केवल @print.com डोमेन वाली आईडी ही मान्य है।"); loadingScreen.style.display = 'none'; return; }
            try { const cfgSnap = await getDoc(doc(db, "settings", "portalConfig")); if (cfgSnap.exists()) { const d = cfgSnap.data(); window.portalConfigState = { showDomicile: d.showDomicile !== false, showCaste: d.showCaste !== false, showDob18: d.showDob18 !== false, bannerEnabled: !!d.bannerEnabled, bannerBadge: d.bannerBadge || "UPDATE", bannerTitle: d.bannerTitle || "", bannerMessage: d.bannerMessage || "", bannerBtnText: d.bannerBtnText || "", bannerBtnLink: d.bannerBtnLink || "" }; } } catch (e) {}
            const userDocRef = doc(db, "users", user.uid); const userDoc = await getDoc(userDocRef); let userCredits = 0, isVip = false, vipExpiry = 0, allowDob18 = true, allowDomicile = true, allowCaste = true, allowDobMinor = true;
            if (userDoc.exists()) { const data = userDoc.data(); userCredits = data.credits || 0; isVip = data.isVip || false; vipExpiry = data.vipExpiry || 0; allowDob18 = data.allowDob18 !== false; allowDomicile = data.allowDomicile !== false; allowCaste = data.allowCaste !== false; allowDobMinor = data.allowDobMinor !== false; }
            const isAdmin = (emailLower === window.ADMIN_EMAIL); const isFreeVip = window.FREE_VIP_EMAILS.includes(emailLower); const hasFreeAccess = isAdmin || isFreeVip; const now = Date.now();
            if (!hasFreeAccess && isVip && vipExpiry > 0 && vipExpiry <= now) { isVip = false; vipExpiry = 0; await updateDoc(userDocRef, { isVip: false, vipExpiry: 0 }); }
            window.currentUserData = { uid: user.uid, email: user.email, credits: userCredits, isVip: isVip || hasFreeAccess, vipExpiry: hasFreeAccess ? 0 : vipExpiry, allowDob18: allowDob18, allowDomicile: allowDomicile, allowCaste: allowCaste, allowDobMinor: allowDobMinor, isAdmin: isAdmin, isFreeVip: isFreeVip, hasFreeAccess: hasFreeAccess, username: user.email.split('@')[0] };
            setupDashboard(window.currentUserData); startPortalSettingsListener(); startUserProfileListener(user.uid); startUserSupportChatListener(user.uid); startVipCountdownLoop(); loadingScreen.style.display = 'none'; 
        } catch (err) { await signOut(auth); }
    } else {
        if (window.vipCountdownInterval) clearInterval(window.vipCountdownInterval); if (window.portalSettingsUnsubscribe) window.portalSettingsUnsubscribe(); if (window.userProfileUnsubscribe) window.userProfileUnsubscribe(); if (window.userChatUnsubscribe) window.userChatUnsubscribe(); if (window.activePaymentUnsubscribe) window.activePaymentUnsubscribe();
        window.currentUserData = null; document.body.classList.remove('vip-body-bg'); document.getElementById('vipCornerAlert').style.display = 'none';
        loginSection.style.display = 'flex'; dashboardSection.style.display = 'none'; loadingScreen.style.display = 'none';
    }
});

window.handleLogin = async function(event) {
    event.preventDefault(); const emailInput = document.getElementById('loginUsername').value.trim().toLowerCase(); const passInput = document.getElementById('loginPassword').value.trim(); const errorDiv = document.getElementById('loginError'); const loginBtn = event.target.querySelector('button[type="submit"]');
    errorDiv.style.display = 'none'; const email = emailInput.includes('@') ? emailInput : `${emailInput}@print.com`;
    if (!window.isAllowedPortalEmail(email)) { errorDiv.innerHTML = '<i class="fa-solid fa-ban mr-1"></i> केवल <strong>@print.com</strong> डोमेन वाली User ID ही मान्य है!'; errorDiv.style.display = 'block'; return; }
    const originalBtnHtml = loginBtn.innerHTML; loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...'; loginBtn.disabled = true;
    try { await signInWithEmailAndPassword(auth, email, passInput); } catch (error) { errorDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1"></i> Your ID or Password are incorrect!'; errorDiv.style.display = 'block'; document.getElementById('loginPassword').value = ''; loginBtn.innerHTML = originalBtnHtml; loginBtn.disabled = false; }
};

function startVipCountdownLoop() { if (window.vipCountdownInterval) clearInterval(window.vipCountdownInterval); updateVipTimerAndAlerts(); window.vipCountdownInterval = setInterval(updateVipTimerAndAlerts, 1000); }
async function updateVipTimerAndAlerts() {
    const userData = window.currentUserData; const gearVipDaysText = document.getElementById('gearVipDaysText'); const cornerAlert = document.getElementById('vipCornerAlert'); const cornerAlertDaysText = document.getElementById('cornerAlertDaysText');
    if (!userData || !userData.isVip || userData.hasFreeAccess) { if (cornerAlert) cornerAlert.style.display = 'none'; if (gearVipDaysText) gearVipDaysText.innerText = userData?.isAdmin ? '👑 Admin (Unlimited)' : (userData?.isFreeVip ? '👑 Permanent VIP (Free)' : 'Normal User (0 Days)'); return; }
    if (!userData.vipExpiry || userData.vipExpiry <= 0) { if (gearVipDaysText) gearVipDaysText.innerText = 'VIP Active'; if (cornerAlert) cornerAlert.style.display = 'none'; return; }
    const now = Date.now(); const diff = userData.vipExpiry - now;
    if (diff <= 0) { clearInterval(window.vipCountdownInterval); userData.isVip = false; userData.vipExpiry = 0; try { await updateDoc(doc(db, "users", userData.uid), { isVip: false, vipExpiry: 0 }); } catch (e) {} if (cornerAlert) cornerAlert.style.display = 'none'; setupDashboard(userData); alert('आपकी VIP वैलिडिटी समाप्त हो गई है।'); return; }
    const totalDaysCeil = Math.ceil(diff / window.MS_PER_DAY); const days = Math.floor(diff / window.MS_PER_DAY); const hours = Math.floor((diff % window.MS_PER_DAY) / (1000 * 60 * 60));
    if (gearVipDaysText) gearVipDaysText.innerText = `👑 VIP: ${totalDaysCeil} दिन बाकी (${days}d ${hours}h)`;
    if (totalDaysCeil <= 5 && totalDaysCeil >= 1) { if (!window.cornerAlertDismissed) { cornerAlert.style.display = 'block'; cornerAlertDaysText.innerHTML = `VIP खत्म होने में सिर्फ <strong class="text-red-600 underline">${totalDaysCeil} दिन</strong> बचे हैं!`; } } else { cornerAlert.style.display = 'none'; }
}
window.dismissCornerAlert = function() { window.cornerAlertDismissed = true; document.getElementById('vipCornerAlert').style.display = 'none'; };

function setupDashboard(userData) {
    document.getElementById('displayUser').innerText = userData.username.toUpperCase(); const adminLink = document.getElementById('adminPanelLink'); const creditDisplayBox = document.getElementById('creditDisplayBox'); const vipServicesBar = document.getElementById('vipServicesBar'); const normalUserVipPromo = document.getElementById('normalUserVipPromo'); const portalTitle = document.getElementById('portalHeaderTitle'); const portalIcon = document.getElementById('portalHeaderIcon'); const vipBadge = document.getElementById('vipStatusBadge'); const mainFormCard = document.getElementById('mainFormCard');
    adminLink.style.display = userData.isAdmin ? 'flex' : 'none';
    if (userData.hasFreeAccess) { creditDisplayBox.style.display = 'none'; } else { creditDisplayBox.style.display = 'flex'; document.getElementById('displayCredits').innerText = userData.credits; }
    if (userData.isVip) { document.body.classList.add('vip-body-bg'); portalTitle.innerHTML = `Ojas <span class="text-royal-400">VIP</span>`; portalIcon.innerHTML = `<img src="logo.png" alt="Logo" class="w-full h-full object-contain" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1211/1211833.png'">`; portalIcon.className = "w-7 h-7 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden p-1 border border-slate-200 shrink-0"; vipBadge.style.display = 'inline-flex'; vipServicesBar.style.display = 'block'; normalUserVipPromo.style.display = 'none'; mainFormCard.className = "bg-white text-slate-800 rounded-2xl md:rounded-3xl shadow-vip-glow border-2 border-royal-400 p-4 md:p-7"; } else { document.body.classList.remove('vip-body-bg'); portalTitle.innerHTML = `Ojas <span class="text-royal-400">Portal</span>`; portalIcon.innerHTML = `<img src="logo.png" alt="Logo" class="w-full h-full object-contain" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1211/1211833.png'">`; portalIcon.className = "w-7 h-7 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden p-1 border border-slate-200 shrink-0"; vipBadge.style.display = 'none'; vipServicesBar.style.display = 'none'; normalUserVipPromo.style.display = 'block'; mainFormCard.className = "bg-white text-slate-800 rounded-2xl md:rounded-3xl shadow-card border border-slate-100 p-4 md:p-7"; }
    document.getElementById('loginSection').style.display = 'none'; document.getElementById('dashboardSection').style.display = 'flex';
    window.applyLivePortalControls(); window.switchService(window.getFirstAllowedTab());
}
window.handleLogout = async function() { await signOut(auth); window.location.reload(); };

window.calculateCredits = function() {
    const creditAmt = parseFloat(document.getElementById('rupeeAmount')?.value) || 0;
    const selectedPlanEl = document.querySelector('input[name="vipPlanOption"]:checked');
    let vipDays = 0, vipFee = 0;
    if (selectedPlanEl) { vipDays = parseInt(selectedPlanEl.value) || 0; vipFee = parseInt(selectedPlanEl.getAttribute('data-price')) || 0; }

    window.currentRechargeCredits = creditAmt; window.currentWantsVip = vipDays > 0;
    window.currentVipDays = vipDays; window.currentVipPlanFee = vipFee; window.currentTotalPayable = creditAmt + vipFee;

    const calcCreditsEl = document.getElementById('calculatedCredits'); if (calcCreditsEl) calcCreditsEl.innerText = `${creditAmt} Cr`;
    const vipSummaryBadge = document.getElementById('vipSummaryBadge');
    if (vipSummaryBadge) { if (vipDays > 0) { vipSummaryBadge.style.display = 'inline-block'; vipSummaryBadge.innerHTML = `👑 +${vipDays}d VIP`; } else { vipSummaryBadge.style.display = 'none'; } }
    const totalPayableDisplay = document.getElementById('totalPayableDisplay'); if (totalPayableDisplay) totalPayableDisplay.innerText = `₹${window.currentTotalPayable}`;
};

window.generateQR = async function() {
    if (window.currentUserData?.hasFreeAccess) return; window.calculateCredits();
    if (!window.currentWantsVip && window.currentRechargeCredits < 100) return alert('पोर्टल पर कम से कम ₹100 के क्रेडिट रिचार्ज करना अनिवार्य है!');
    if (window.currentWantsVip && window.currentRechargeCredits > 0 && window.currentRechargeCredits < 100) return alert('क्रेडिट रिचार्ज की न्यूनतम वैल्यू ₹100 है!');
    if (window.currentTotalPayable < 100) return alert('न्यूनतम पेमेंट राशि ₹100 होनी चाहिए!');

    const btn = document.getElementById('btnGenerateQR'); const origBtnHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> पेमेंट लिंक बन रहा है...'; }

    const queryParams = `pa=8279650137@amazonpay&pn=Ojas%20Print%20Service&am=${window.currentTotalPayable}&cu=INR&tn=${encodeURIComponent(window.currentWantsVip ? `Ojas VIP ${window.currentVipDays}d` : `Ojas Credits`)}`;
    let universalUpiUrl = `upi://pay?${queryParams}`; let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(universalUpiUrl)}`; window.currentActiveOrderId = null;

    try {
        const res = await fetch('/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: window.currentUserData.uid, email: window.currentUserData.email, username: window.currentUserData.username, totalPayable: window.currentTotalPayable, creditsRequested: window.currentRechargeCredits, wantsVip: window.currentWantsVip, vipDaysRequested: window.currentVipDays, vipPlanFee: window.currentVipPlanFee }) });
        const orderData = await res.json();
        if (orderData.status && orderData.orderId) {
            window.currentActiveOrderId = orderData.orderId;
            if (orderData.upi_string) { universalUpiUrl = orderData.upi_string; qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(universalUpiUrl)}`; }
            if (orderData.qr_code && orderData.qr_code.startsWith('http')) qrUrl = orderData.qr_code;

            if (window.activePaymentUnsubscribe) window.activePaymentUnsubscribe();
            window.activePaymentUnsubscribe = onSnapshot(doc(db, "payments", orderData.orderId), async (snap) => {
                if (snap.exists() && (snap.data().status === 'Auto-Approved' || snap.data().status === 'Approved')) {
                    if (window.activePaymentUnsubscribe) window.activePaymentUnsubscribe(); window.currentActiveOrderId = null;
                    const uSnap = await getDoc(doc(db, "users", window.currentUserData.uid));
                    if (uSnap.exists()) { const updatedUser = uSnap.data(); window.currentUserData.credits = updatedUser.credits || 0; window.currentUserData.isVip = updatedUser.isVip || window.currentUserData.hasFreeAccess; window.currentUserData.vipExpiry = updatedUser.vipExpiry || 0; const crEl = document.getElementById('displayCredits'); if (crEl) crEl.innerText = window.currentUserData.credits; }
                    document.getElementById('walletMainUI').innerHTML = `<div class="p-6 bg-green-50 rounded-2xl border-2 border-green-400 text-center space-y-2"><i class="fa-solid fa-circle-check text-5xl text-green-600 mb-2 animate-bounce"></i><h2 class="text-xl font-black text-green-900">पेमेंट सफल! (Auto-Verified)</h2><p class="text-xs font-bold text-green-700">आपका ₹${window.currentTotalPayable} का पेमेंट वेरीफाई हो गया है और आपके अकाउंट में तुरंत क्रेडिट्स/VIP जोड़ दिए गए हैं!</p><div class="pt-3"><button onclick="window.location.reload()" class="bg-green-600 hover:bg-green-700 text-white font-black py-2.5 px-6 rounded-xl text-xs shadow">डैशबोर्ड पर जाएँ</button></div></div>`;
                }
            });
        }
    } catch (err) { try { const fallbackDoc = await addDoc(collection(db, "payments"), { userId: window.currentUserData.uid, email: window.currentUserData.email, amountPaid: window.currentTotalPayable, creditsRequested: window.currentRechargeCredits, wantsVip: window.currentWantsVip, vipDaysRequested: window.currentVipDays, vipPlanFee: window.currentVipPlanFee, utrNumber: "ONLINE_UPI", timestamp: new Date(), status: "Pending" }); window.currentActiveOrderId = fallbackDoc.id; } catch (e) {} } finally { if (btn) { btn.disabled = false; btn.innerHTML = origBtnHtml; } }

    document.getElementById('upiQRCode').src = qrUrl; document.getElementById('qrPayableAmountText').innerText = `कुल पेमेंट: ₹${window.currentTotalPayable}`;
    const mainUpiBtn = document.getElementById('btnDirectUpiPay'); if (mainUpiBtn) { mainUpiBtn.href = universalUpiUrl; mainUpiBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Pay ₹${window.currentTotalPayable} Directly via UPI App`; }
    document.getElementById('paymentStep1').style.display = 'none'; document.getElementById('qrSection').style.display = 'flex';
};

window.cancelAndBackToPaymentStep1 = async function() {
    if (window.activePaymentUnsubscribe) { window.activePaymentUnsubscribe(); window.activePaymentUnsubscribe = null; }
    if (window.currentActiveOrderId) { const orderIdToCancel = window.currentActiveOrderId; window.currentActiveOrderId = null; try { await updateDoc(doc(db, "payments", orderIdToCancel), { status: "Cancelled", cancelledBy: "User (Back without Payment)", cancelledAt: new Date() }); } catch (e) {} }
    document.getElementById('qrSection').style.display = 'none'; document.getElementById('paymentStep1').style.display = 'block'; alert("पेमेंट प्रोसेस कैंसिल कर दिया गया है (Payment Cancelled)।");
};

window.togglePaymentTicketBox = function() { const box = document.getElementById('paymentIssueTicketBox'); if (!box) return; box.style.display = box.style.display === 'none' ? 'block' : 'none'; };

window.submitPaymentIssueTicket = async function() {
    const rawUtr = document.getElementById('ticketUtrInput')?.value.trim() || ''; const utr = rawUtr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const resMsg = document.getElementById('paymentTicketResultMsg'); const btn = document.getElementById('btnRaisePaymentTicket');
    if (!utr || utr.length < 10) return alert("कृपया अपना 12-अंकों का सही UTR / Reference नंबर दर्ज करें!");
    const origHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> टिकट सबमिट हो रहा है...';

    const ticketMsgText = `💳 [PAYMENT UTR TICKET]\nAmount: ₹${window.currentTotalPayable}\nCredits: +${window.currentRechargeCredits} Cr${window.currentVipDays > 0 ? ` | VIP: +${window.currentVipDays}d` : ''}\nUTR No: ${utr}\nOrder ID: ${window.currentActiveOrderId || 'N/A'}\nNote: ऑनलाइन पेमेंट ऑटो-वेरीफाई नहीं हुआ, कृपया चेक करके क्रेडिट जोड़ें।`;
    try {
        if (window.currentActiveOrderId) { try { await updateDoc(doc(db, "payments", window.currentActiveOrderId), { utrNumber: utr, status: "Pending (Ticket Raised)", ticketRaisedAt: new Date() }); } catch (e) {} }
        const uid = window.currentUserData.uid; const chatRef = doc(db, "supportTickets", uid); const existingMsgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : []; existingMsgs.push({ sender: 'user', text: ticketMsgText, time: Date.now() });
        await setDoc(chatRef, { type: 'PAYMENT_ISSUE_TICKET', userId: uid, userIdentifier: window.currentUserData.email, username: window.currentUserData.username, message: `💳 Payment UTR Ticket: ₹${window.currentTotalPayable} (UTR: ${utr})`, status: 'Open', unreadByAdmin: true, unreadByUser: false, timestamp: new Date(), updatedAtMs: Date.now(), messages: existingMsgs }, { merge: true });
        notifyAdminSecurely({ type: "PAYMENT_UTR_TICKET", user: window.currentUserData.email, amount: window.currentTotalPayable, utr: utr });
        resMsg.className = "p-3.5 rounded-xl bg-green-50 border border-green-300 text-green-900 text-xs font-bold text-center space-y-1 mt-2"; resMsg.innerHTML = `<div><i class="fa-solid fa-circle-check text-green-600 text-base mr-1"></i> आपका पेमेंट टिकट सफलतापूर्वक रेज़ हो गया है!</div><p class="text-[11px] text-green-800">आपका UTR नंबर (<strong>${utr}</strong>) दर्ज कर लिया गया है।</p>`; resMsg.style.display = 'block'; document.getElementById('ticketUtrInput').value = '';
    } catch (err) { alert("टिकट रेज़ करने में समस्या आई: " + err.message); } finally { btn.disabled = false; btn.innerHTML = origHtml; }
};

window.openPdfViewer = async function(fileId, fileName, historyIndex = -1) {
    document.getElementById('pdfViewerTitle').innerText = fileName;
    const iframe = document.getElementById('pdfIframe'); const htmlPreviewContainer = document.getElementById('htmlDocPreviewContainer');
    const spinner = document.getElementById('pdfLoadingSpinner'); const downloadBtn = document.getElementById('modalDownloadBtn');
    const printBtn = document.getElementById('modalPrintBtn'); const modalStampLabel = document.getElementById('modalStampToggleLabel');
    const modalStampCheckbox = document.getElementById('modalStampCheckbox'); const shareBtn = document.getElementById('modalShareBtn');

    const isAnnexure = String(fileId).startsWith('LOCAL_HTML_');
    let initialWithStamp = false, initialStampSrc = '', initialStampFile = '', initialCertFileId = '';

    if (historyIndex >= 0) {
        const record = (window.historyData && window.historyData[historyIndex]) || (window.adminAllHistoryData && window.adminAllHistoryData[historyIndex]);
        if (record) {
            initialWithStamp = !!record.withStamp;
            initialStampFile = record.stampFile || 'stamp.png';
            initialCertFileId = (record.certificateFileId && record.isCertificateAttached !== false) ? record.certificateFileId : ''; 
        }
    }

    if (initialWithStamp && !initialStampSrc && typeof window.getTransparentStampDataUrl === 'function') {
        initialStampSrc = await window.getTransparentStampDataUrl(initialStampFile);
    }

    window.currentModalContext = { fileId: fileId, fileName: fileName, historyIndex: historyIndex, withStamp: initialWithStamp, stampFile: initialStampFile, stampSrc: initialStampSrc, certificateFileId: initialCertFileId };
    
    const previewParent = iframe.parentElement;
    previewParent.classList.add('flex', 'flex-col');
    if (shareBtn) shareBtn.style.display = 'none';

    if (isAnnexure && historyIndex >= 0) {
        if (shareBtn) shareBtn.style.display = 'flex';
        if (modalStampLabel) modalStampLabel.classList.remove('hidden');
        if (modalStampCheckbox) modalStampCheckbox.checked = initialWithStamp;

        const record = (window.historyData && window.historyData[historyIndex]) || (window.adminAllHistoryData && window.adminAllHistoryData[historyIndex]);
        const fData = record?.formData || {};
        spinner.style.display = 'none';
        
        if (initialCertFileId) {
            iframe.style.display = 'block'; iframe.style.flex = '1'; iframe.style.minHeight = '350px'; iframe.style.borderBottom = '4px solid #cbd5e1';
            iframe.src = `https://drive.google.com/file/d/${initialCertFileId}/preview`;
            
            htmlPreviewContainer.style.display = 'flex'; htmlPreviewContainer.style.flex = '1'; htmlPreviewContainer.style.minHeight = '350px';
            htmlPreviewContainer.innerHTML = window.buildLocalAffidavitHtml(fileId, fData, true, initialWithStamp, initialStampSrc);
        } else {
            iframe.style.display = 'none';
            htmlPreviewContainer.style.display = 'flex'; htmlPreviewContainer.style.flex = '1';
            htmlPreviewContainer.innerHTML = window.buildLocalAffidavitHtml(fileId, fData, true, initialWithStamp, initialStampSrc);
        }

        if (downloadBtn) { downloadBtn.onclick = async function() { await window.downloadHtmlDocAsPdf(fileId, fData, fileName, window.currentModalContext.withStamp, window.currentModalContext.stampSrc, window.currentModalContext.certificateFileId); }; }
        if (printBtn) { printBtn.onclick = function() { window.directPrintDocument(fileId, fData, fileName, window.currentModalContext.withStamp, window.currentModalContext.stampSrc, window.currentModalContext.certificateFileId); }; }
        if (shareBtn) { shareBtn.onclick = async function() { await window.shareHtmlDocAsPdf(fileId, fData, fileName, window.currentModalContext.withStamp, window.currentModalContext.stampSrc, window.currentModalContext.certificateFileId); }; }
    } else {
        if (modalStampLabel) modalStampLabel.classList.add('hidden');
        if (shareBtn) shareBtn.style.display = 'none'; 
        htmlPreviewContainer.style.display = 'none'; htmlPreviewContainer.innerHTML = '';
        iframe.style.display = 'block'; iframe.style.flex = '1'; spinner.style.display = 'flex';
        iframe.src = `https://drive.google.com/file/d/${fileId}/preview`;
        
        if (downloadBtn) { downloadBtn.onclick = function() { window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank'); }; }
        if (printBtn) { printBtn.onclick = function() { window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank'); }; }
    }
    const modal = document.getElementById('pdfViewerModal'); if (modal) { modal.style.display = 'flex'; modal.classList.remove('hidden'); } document.body.style.overflow = 'hidden';
};

window.closePdfViewer = function() { const modal = document.getElementById('pdfViewerModal'); if (modal) { modal.style.display = 'none'; modal.classList.add('hidden'); } const iframe = document.getElementById('pdfIframe'); if (iframe) iframe.src = ''; const htmlContainer = document.getElementById('htmlDocPreviewContainer'); if (htmlContainer) htmlContainer.innerHTML = ''; document.body.style.overflow = 'auto'; };

window.loadUserHistory = async function() {
    const historyContainer = document.getElementById('historyTableBody'); if (!historyContainer) return;
    historyContainer.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400 font-bold text-xs"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-royal-500"></i><br>Loading records...</td></tr>`;
    try {
        const q = query(collection(db, "history"), where("userId", "==", window.currentUserData.uid));
        const querySnapshot = await getDocs(q); window.historyData = [];
        querySnapshot.forEach((docSnap) => { window.historyData.push({ id: docSnap.id, ...docSnap.data() }); });
        window.historyData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); window.renderHistory('ALL');
    } catch (err) { historyContainer.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500 text-xs">Failed to load history.</td></tr>`; }
};

window.renderHistory = function(filterType) {
    const historyContainer = document.getElementById('historyTableBody'); if (!historyContainer) return; historyContainer.innerHTML = '';
    const indexedData = window.historyData.map((item, idx) => ({ ...item, _origIndex: idx }));
    const filteredData = filterType === 'ALL' ? indexedData : indexedData.filter(item => item.serviceType === filterType);
    document.getElementById('userHistoryCount').innerText = `Total Files: ${filteredData.length}`;

    if (filteredData.length === 0) { historyContainer.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400 text-xs"><i class="fa-regular fa-folder-open text-3xl mb-2 text-slate-300"></i><br>No records found.</td></tr>`; return; }

    filteredData.forEach((data) => {
        const sec = data.timestamp?.seconds || Math.floor(Date.now() / 1000); const dateObj = new Date(sec * 1000);
        const dateStr = dateObj.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}); const timeStr = dateObj.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
        
        let badgesHtml = '';
        if (data.certificateFileId && data.isCertificateAttached !== false) { badgesHtml += `<span class="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded-full text-[10px] font-black ml-1.5"><i class="fa-solid fa-certificate mr-0.5"></i>Cert</span>`; }
        if (data.withStamp) { badgesHtml += `<span class="bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 rounded-full text-[10px] font-black ml-1.5"><i class="fa-solid fa-stamp mr-0.5"></i>Stamped</span>`; }
        
        historyContainer.innerHTML += `
            <tr class="border-b border-slate-100 text-xs hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-800">${data.fileName}${badgesHtml}</td>
                <td class="p-3"><span class="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">${data.serviceType}</span></td>
                <td class="p-3 text-slate-500 text-[11px] font-medium">${dateStr} <br> ${timeStr}</td>
                <td class="p-3 text-right whitespace-nowrap"><button onclick="window.openPdfViewer('${data.fileId}', '${data.fileName}', ${data._origIndex})" class="inline-flex items-center gap-1 bg-royal-50 text-royal-700 border border-royal-200 hover:bg-royal-600 hover:text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition shadow-sm"><i class="fa-solid fa-eye"></i> Preview / PDF</button></td>
            </tr>
        `;
    });
};

// === UPDATED: MISSING PAYMENT UI INCLUDED & PER-USER STEALTH CHECKS ADDED ===
window.switchService = async function(serviceName) {
    if (window.currentUserData?.hasFreeAccess && (serviceName === 'add_credit' || serviceName === 'payments_history')) serviceName = window.getFirstAllowedTab();
    
    // Validate Tab Access
    if (serviceName === 'domicile' && !window.canCurrentUserSeeService('domicile')) serviceName = window.getFirstAllowedTab(); 
    else if (serviceName === 'caste' && !window.canCurrentUserSeeService('caste')) serviceName = window.getFirstAllowedTab(); 
    else if (serviceName === 'dob18' && !window.canCurrentUserSeeService('dob18')) serviceName = window.getFirstAllowedTab();
    else if (serviceName === 'dob_minor' && !window.canCurrentUserSeeService('dob_minor')) serviceName = window.getFirstAllowedTab();

    window.currentActiveTab = serviceName;
    document.querySelectorAll('.service-tab').forEach(btn => { btn.className = "service-tab bg-dark-900 text-royal-300 font-bold py-2.5 px-3 rounded-xl hover:bg-dark-800 transition shadow-sm border border-slate-700 text-xs md:text-sm flex-1 flex justify-center items-center gap-1.5"; });
    document.querySelectorAll('.vip-tab').forEach(btn => { btn.className = "vip-tab bg-dark-800 text-royal-300 border border-royal-500/30 font-bold py-2 px-2.5 rounded-xl hover:bg-dark-700 transition text-[11px] md:text-xs flex items-center justify-center gap-1 shadow-sm"; });

    let tabIdToHighlight = serviceName.startsWith('annexure') ? 'annexures' : serviceName; const activeBtn = document.getElementById('btn-' + tabIdToHighlight);
    if (activeBtn) { if (activeBtn.classList.contains('vip-tab')) { activeBtn.className = "vip-tab bg-white text-dark-950 font-black py-2 px-2.5 rounded-xl shadow-vip-glow transition text-[11px] md:text-xs flex items-center justify-center gap-1 border-2 border-royal-400"; } else { activeBtn.className = "service-tab bg-white text-dark-950 font-black py-2.5 px-3 rounded-xl shadow-glow transition text-xs md:text-sm flex-1 flex justify-center items-center gap-1.5 border-2 border-royal-500"; } }

    window.applyLivePortalControls(); const container = document.getElementById('formContainer'); if (!container) return;
    const submitBtnText = window.currentUserData && window.currentUserData.hasFreeAccess ? 'Generate Document (VIP Free) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>' : 'Generate Document (10 Credits) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>';
    const statusTagHtml = window.currentUserData && window.currentUserData.hasFreeAccess ? '<span class="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-[10px] font-black border border-green-300 uppercase"><i class="fa-solid fa-crown mr-1"></i>Lifetime VIP Free</span>' : (window.currentUserData && window.currentUserData.isVip ? '<span class="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-[10px] font-black border border-amber-300 uppercase"><i class="fa-solid fa-crown mr-1"></i>10 Credits</span>' : '<span class="bg-royal-100 text-royal-900 px-2.5 py-1 rounded-md text-[10px] font-black border border-royal-300 uppercase">10 Credits</span>');

    // Wallet UI Re-Added
    if (serviceName === 'add_credit') {
        container.innerHTML = `
        <div id="walletMainUI" class="max-w-xl mx-auto space-y-4">
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-wallet text-royal-500 mr-1.5"></i> Add Credits & VIP</h3>
            </div>
            <!-- STEP 1: Plan Selection -->
            <div id="paymentStep1" class="space-y-4">
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <label class="block text-xs font-black text-slate-700 uppercase mb-2">1. Enter Amount (₹)</label>
                    <input type="number" id="rupeeAmount" min="100" placeholder="Minimum ₹100" oninput="window.calculateCredits()" class="w-full p-3 border border-slate-300 rounded-xl text-lg font-black outline-none focus:border-royal-500">
                </div>
                <div class="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                    <label class="block text-xs font-black text-amber-900 uppercase mb-2"><i class="fa-solid fa-crown text-amber-500 mr-1"></i> 2. Select VIP Plan (Optional)</label>
                    <div class="space-y-2">
                        <label class="flex items-center gap-2 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer"><input type="radio" name="vipPlanOption" value="0" data-price="0" checked onchange="window.calculateCredits()" class="accent-amber-600 w-4 h-4"><span class="text-sm font-bold text-amber-950">No VIP (Only Credits)</span></label>
                        <label class="flex items-center gap-2 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer"><input type="radio" name="vipPlanOption" value="30" data-price="149" onchange="window.calculateCredits()" class="accent-amber-600 w-4 h-4"><span class="text-sm font-bold text-amber-950">30 Days VIP (+₹149)</span></label>
                        <label class="flex items-center gap-2 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer"><input type="radio" name="vipPlanOption" value="60" data-price="249" onchange="window.calculateCredits()" class="accent-amber-600 w-4 h-4"><span class="text-sm font-bold text-amber-950">60 Days VIP (+₹249)</span></label>
                        <label class="flex items-center gap-2 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer"><input type="radio" name="vipPlanOption" value="90" data-price="299" onchange="window.calculateCredits()" class="accent-amber-600 w-4 h-4"><span class="text-sm font-bold text-amber-950">90 Days VIP (+₹299)</span></label>
                    </div>
                </div>
                <div class="bg-dark-950 p-4 rounded-2xl text-white">
                    <div class="flex justify-between items-center mb-2"><span class="text-xs font-bold text-slate-400">Credits You Get:</span><span id="calculatedCredits" class="text-lg font-black text-emerald-400">0 Cr</span></div>
                    <div class="flex justify-between items-center mb-4 pb-4 border-b border-slate-800"><span class="text-xs font-bold text-slate-400">VIP Status:</span><span id="vipSummaryBadge" style="display:none;" class="bg-amber-400 text-dark-950 text-[10px] font-black px-2 py-0.5 rounded-full"></span></div>
                    <div class="flex justify-between items-center mb-4"><span class="text-sm font-black uppercase text-royal-300">Total Payable:</span><span id="totalPayableDisplay" class="text-2xl font-black text-white">₹0</span></div>
                    <button id="btnGenerateQR" onclick="window.generateQR()" class="w-full bg-royal-500 hover:bg-royal-400 text-dark-950 font-black py-3.5 rounded-xl shadow-glow transition">Proceed to Pay</button>
                </div>
            </div>
            <!-- STEP 2: QR & Payment Section -->
            <div id="qrSection" style="display:none;" class="flex-col items-center justify-center space-y-4">
                <div class="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-200 text-center w-full max-w-sm mx-auto">
                    <h4 class="text-sm font-black text-dark-900 mb-1">Scan & Pay</h4><p id="qrPayableAmountText" class="text-xs font-bold text-slate-500 mb-4">कुल पेमेंट: ₹0</p>
                    <div class="bg-slate-50 p-2 rounded-2xl inline-block border border-slate-200 mb-4"><img id="upiQRCode" src="" class="w-48 h-48 object-contain"></div>
                    <a id="btnDirectUpiPay" href="#" class="w-full block bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl mb-3 shadow-sm transition">Pay Directly via UPI App</a>
                    <button onclick="window.cancelAndBackToPaymentStep1()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-xl transition text-xs">Cancel & Go Back</button>
                </div>
                <div class="text-center"><button onclick="window.togglePaymentTicketBox()" class="text-xs font-bold text-royal-600 hover:underline">पेमेंट कट गया पर क्रेडिट नहीं मिला? यहाँ क्लिक करें</button></div>
                <div id="paymentIssueTicketBox" style="display:none;" class="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 w-full max-w-sm mx-auto">
                    <label class="block text-[11px] font-black text-indigo-900 uppercase mb-2">12-Digit UTR / Ref Number</label>
                    <input type="text" id="ticketUtrInput" placeholder="e.g. 312345678901" class="w-full p-3 border border-indigo-300 rounded-xl text-xs font-bold bg-white mb-2 outline-none">
                    <button id="btnRaisePaymentTicket" onclick="window.submitPaymentIssueTicket()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl text-xs transition">Submit UTR</button>
                    <div id="paymentTicketResultMsg" style="display:none;"></div>
                </div>
            </div>
        </div>`;
        window.calculateCredits(); 
        return;
    }

    if (window.renderServiceFormHtml(serviceName, container, submitBtnText, statusTagHtml)) return;
    if (serviceName === 'support_chat') { container.innerHTML = `<div class="max-w-2xl mx-auto flex flex-col h-[460px] md:h-[520px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-inner"><div class="bg-dark-950 text-white px-4 py-3 flex justify-between items-center border-b border-royal-500"><div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-xl bg-green-500/20 border border-green-400 text-green-400 flex items-center justify-center"><i class="fa-solid fa-headset text-sm"></i></div><div><h3 class="text-xs md:text-sm font-black text-white flex items-center gap-1.5">Live Admin Support Chat <span class="w-2 h-2 rounded-full bg-green-400 animate-ping"></span></h3><p class="text-[10px] text-slate-400 font-semibold">User ID: <span class="text-royal-300 font-bold">${window.currentUserData?.email || ''}</span></p></div></div><span class="text-[10px] bg-dark-800 text-royal-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold">2-Way Live</span></div><div id="userLiveChatMessagesBox" class="flex-1 p-3.5 md:p-4 overflow-y-auto space-y-3 bg-slate-100/80"></div><form onsubmit="window.sendUserSupportMessage(event)" class="p-3 bg-white border-t border-slate-200 flex gap-2"><input type="text" id="userSupportChatInput" required placeholder="यहाँ अपनी समस्या या मैसेज लिखें..." class="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs md:text-sm font-semibold bg-slate-50 focus:bg-white focus:border-royal-500 outline-none"><button type="submit" id="btnSendUserChat" class="bg-dark-900 hover:bg-black text-royal-300 font-black px-5 py-2.5 rounded-xl text-xs md:text-sm shadow-glow transition flex items-center gap-1.5 shrink-0"><span>Send</span> <i class="fa-solid fa-paper-plane text-xs"></i></button></form></div>`; window.renderUserLiveChatMessages(); if (window.currentUserData && window.currentUserChatData?.unreadByUser === true) { try { await updateDoc(doc(db, "supportTickets", window.currentUserData.uid), { unreadByUser: false }); } catch (e) {} } const headerBadge = document.getElementById('headerSupportUnreadBadge'); const gearBadge = document.getElementById('gearSupportUnreadBadge'); if (headerBadge) headerBadge.style.display = 'none'; if (gearBadge) gearBadge.style.display = 'none'; return; }
    if (serviceName === 'payments_history') { container.innerHTML = `<div class="space-y-4"><div id="userValidityInfoBox"></div><div class="grid grid-cols-3 gap-2 md:gap-4"><div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><p class="text-[10px] font-bold text-slate-400 uppercase">कुल ट्रांजैक्शन</p><p id="sumTotalTxns" class="text-lg md:text-2xl font-black text-dark-900">0</p></div><div class="p-3 rounded-xl bg-green-50 border border-green-200"><p class="text-[10px] font-bold text-green-700 uppercase">सफल (Approved)</p><p id="sumApprovedAmt" class="text-lg md:text-2xl font-black text-green-700">₹0</p></div><div class="p-3 rounded-xl bg-amber-50 border border-amber-200"><p class="text-[10px] font-bold text-amber-800 uppercase">पेंडिंग (Pending)</p><p id="sumPendingAmt" class="text-lg md:text-2xl font-black text-amber-700">₹0 (0)</p></div></div><div><div class="flex justify-between items-center mb-2"><h4 class="text-sm md:text-base font-black text-dark-900"><i class="fa-solid fa-receipt text-royal-500 mr-1.5"></i> पेमेंट और VIP हिस्ट्री</h4><button onclick="window.loadUserPayments()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-rotate-right mr-1"></i> Refresh</button></div><div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left border-collapse bg-white min-w-[520px]"><thead class="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase"><tr><th class="p-3">तारीख (Date)</th><th class="p-3">राशि</th><th class="p-3">क्रेडिट्स / VIP</th><th class="p-3">UTR / Mode</th><th class="p-3 text-right">स्टेटस</th></tr></thead><tbody id="userPaymentsTableBody" class="text-xs text-slate-700"></tbody></table></div></div></div>`; window.loadUserPayments(); return; }
    if (serviceName === 'history') { const isVipUser = window.currentUserData && window.currentUserData.isVip; const canShowDob = window.canCurrentUserSeeService('dob18'); const domOpt = cfg.showDomicile ? `<option value="Domicile">मूल निवास</option>` : ''; const casOpt = cfg.showCaste ? `<option value="Caste">जाति प्रमाण पत्र</option>` : ''; const dobOpt = (isVipUser && canShowDob) ? `<option value="DOB 18+">DOB (18+)</option>` : ''; const vipFilterOptions = isVipUser ? `${dobOpt}<option value="Annexure 1">Annexure 1</option><option value="Annexure 1A">Annexure 1A</option><option value="Annexure 3">Annexure 3</option><option value="Annexure 3A">Annexure 3A</option><option value="Annexure B">Annexure B</option><option value="Annexure C">Annexure C</option><option value="Annexure D">Annexure D</option><option value="Annexure E">Annexure E</option><option value="Annexure F">Annexure F</option>` : ''; container.innerHTML = `<div class="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-3 mb-4"><div><h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-folder-open text-royal-500 mr-1.5"></i> Document History</h3><p id="userHistoryCount" class="text-[11px] font-bold text-royal-600">Total Files: 0</p></div><div class="flex items-center gap-2"><select onchange="window.renderHistory(this.value)" class="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold outline-none"><option value="ALL">All Documents</option>${domOpt}${casOpt}${vipFilterOptions}</select><button onclick="window.loadUserHistory()" class="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-200"><i class="fa-solid fa-rotate-right"></i></button></div></div><div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left border-collapse bg-white min-w-[500px]"><thead class="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase"><tr><th class="p-3">File Name</th><th class="p-3">Type</th><th class="p-3">Date & Time</th><th class="p-3 text-right">Action</th></tr></thead><tbody id="historyTableBody" class="text-xs text-slate-700"></tbody></table></div>`; window.loadUserHistory(); }
};

window.loadUserPayments = async function() {
    const tableBody = document.getElementById('userPaymentsTableBody'); if (!tableBody) return; tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 font-bold text-xs"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-royal-500"></i><br>Loading payment history...</td></tr>`;
    try { const querySnapshot = await getDocs(query(collection(db, "payments"), where("userId", "==", window.currentUserData.uid))); window.userPaymentsData = []; querySnapshot.forEach((docSnap) => { window.userPaymentsData.push({ id: docSnap.id, ...docSnap.data() }); }); window.userPaymentsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); let sumApproved = 0, sumPending = 0, pendingCount = 0; window.userPaymentsData.forEach(item => { const amt = parseFloat(item.amountPaid) || 0; if (item.status === 'Approved' || item.status === 'Auto-Approved') { sumApproved += amt; } else if (item.status === 'Pending' || (item.status || '').includes('Ticket')) { sumPending += amt; pendingCount++; } }); document.getElementById('sumTotalTxns').innerText = window.userPaymentsData.length; document.getElementById('sumApprovedAmt').innerText = `₹${sumApproved}`; document.getElementById('sumPendingAmt').innerText = `₹${sumPending} (${pendingCount})`; tableBody.innerHTML = ''; if (window.userPaymentsData.length === 0) { tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-xs"><i class="fa-solid fa-receipt text-3xl mb-2 text-slate-300"></i><br>आपने अभी तक कोई पेमेंट नहीं किया है।</td></tr>`; return; } window.userPaymentsData.forEach(data => { const sec = data.timestamp?.seconds || Math.floor(Date.now() / 1000); const dateObj = new Date(sec * 1000); const dateStr = dateObj.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}); const timeStr = dateObj.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'}); let statusBadge = ''; if ((data.status || '').includes('Ticket')) { statusBadge = `<span class="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-ticket mr-1"></i>Ticket Raised</span>`; } else if (data.status === 'Pending') { statusBadge = `<span class="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-clock mr-1"></i>Pending</span>`; } else if (data.status === 'Approved' || data.status === 'Auto-Approved') { statusBadge = `<span class="bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-check-circle mr-1"></i>Approved</span>`; } else { statusBadge = `<span class="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-circle-xmark mr-1"></i>${data.status}</span>`; } const vipDays = data.vipDaysRequested || (data.wantsVip ? 30 : 0); const creds = data.creditsRequested !== undefined ? data.creditsRequested : (data.creditsAdded || 0); tableBody.innerHTML += `<tr class="border-b border-slate-100 text-xs hover:bg-slate-50 transition"><td class="p-3 text-slate-500 font-medium">${dateStr} <br> ${timeStr}</td><td class="p-3 font-black text-slate-800 text-sm">₹${data.amountPaid || 0}</td><td class="p-3"><div class="flex flex-col gap-1"><span class="font-bold text-royal-600">+${creds} Cr</span>${vipDays > 0 ? `<span class="bg-amber-400 text-dark-950 px-1.5 py-0.5 rounded text-[9px] font-black inline-block w-max">👑 +${vipDays}d VIP</span>` : ''}</div></td><td class="p-3 font-mono font-bold text-slate-600 text-[11px]">${data.utrNumber || 'ONLINE_UPI'}</td><td class="p-3 text-right whitespace-nowrap">${statusBadge}</td></tr>`; }); } catch (err) { tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500 text-xs">Failed to load payment history.</td></tr>`; }
};
```eof

### 2. `js/portal-forms.js` का पूरा कोड
इस फाइल में **Google Script की देरी या टाइमआउट (Timeout)** आने पर "फेक सक्सेस" रोकने और यूज़र को Retry करने का मैसेज दिखाने वाला लॉजिक (`submitForm` में) जोड़ दिया गया है। 

```javascript:js/portal-forms.js
// ============================================================================
// FILE 2: js/portal-forms.js (UPDATED)
// (Forms & submitForm fix for Fake Certificate generation on App Script Timeout)
// ============================================================================

import "./config-templates.js";

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 250; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.2)); 
            };
        };
    });
}

// === UPDATED: GOOGLE DRIVE SERVICES SUBMISSION (FIXED FAKE GENERATION) ===
window.submitForm = async function(event, serviceType) {
    event.preventDefault();
    const { db, doc, updateDoc, collection, addDoc } = window.fb;

    if (!window.currentUserData) return alert('Please login first!');
    if (!window.isAllowedPortalEmail(window.currentUserData.email)) {
        return alert('अमान्य यूज़र आईडी! केवल @print.com वाली आईडी से ही डॉक्यूमेंट जनरेट हो सकता है।');
    }

    const cfg = window.portalConfigState;
    if (serviceType === 'Domicile' && !cfg.showDomicile) return alert('यह सर्विस वर्तमान में बंद है।');
    if (serviceType === 'Caste' && !cfg.showCaste) return alert('यह सर्विस वर्तमान में बंद है।');
    if ((serviceType === 'DOB' || serviceType === 'DOB 18+') && !cfg.showDob18) return alert('यह सर्विस वर्तमान में बंद है।');

    const docCost = 10;
    if (!window.currentUserData.hasFreeAccess && window.currentUserData.credits < docCost) {
        return alert(`Insufficient credits! You need ${docCost} credits to generate this ${serviceType} document.`);
    }

    const formElement = event.target;
    const submitBtn = formElement.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Processing...';
    submitBtn.disabled = true;

    const formData = new FormData(formElement);
    formData.append('USER_ID', window.currentUserData.email);
    formData.append('SERVICE_TYPE', serviceType);

    let targetUrl = "";
    if (serviceType === 'Domicile') targetUrl = window.API_URLS["domicile"];
    else if (serviceType === 'Caste') targetUrl = window.API_URLS["CASTE"];
    else if (serviceType === 'DOB' || serviceType === 'DOB 18+') targetUrl = window.API_URLS["DOB"];

    try {
        const photoInput = formElement.querySelector('input[type="file"]');
        let base64Photo = "";
        if (photoInput && photoInput.files[0]) {
            base64Photo = await compressImage(photoInput.files[0]);
            formData.set('PHOTO', base64Photo);
        }

        const dataObj = {};
        formData.forEach((v, k) => { dataObj[k] = v; });

        if (dataObj.CAST === 'OTHER' && dataObj.CAST_CUSTOM) {
            dataObj.CAST = dataObj.CAST_CUSTOM.trim();
        }
        if (dataObj.VLE === 'OTHER' && dataObj.VLE_CUSTOM) {
            dataObj.VLE = dataObj.VLE_CUSTOM.trim();
        }

        if ((serviceType === 'DOB' || serviceType === 'DOB 18+') && dataObj.ADDRESS) {
            dataObj.ADDRESS = window.cleanDob18AddressString(dataObj.ADDRESS).trim();
        }

        // --- NETWORK CALL (API) ---
        let result = null;
        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(dataObj)
            });
            result = await response.json();
        } catch (networkError) {
            // FIX: Fake generation on delay removed. User is prompted to retry.
            alert('सर्वर की ओर से डिले (Delay) या टाइमआउट के कारण आपका सर्टिफिकेट जनरेट नहीं हो पाया है।\n\nआपकी भरी हुई जानकारी फॉर्म में सेव है। कृपया कुछ सेकंड रुककर "Generate" बटन पर दोबारा क्लिक करें।');
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            return; // Stops here, credits are not cut, fake history is not created
        }

        // --- FIREBASE DATABASE UPDATE ---
        if (result && result.success && result.fileId) {
            
            // 1. क्रेडिट्स काटना
            if (!window.currentUserData.hasFreeAccess) {
                const userDocRef = doc(db, "users", window.currentUserData.uid);
                const newCredits = window.currentUserData.credits - docCost;
                await updateDoc(userDocRef, { credits: newCredits });
                window.currentUserData.credits = newCredits;
                document.getElementById('displayCredits').innerText = newCredits;
            }

            // 2. हिस्ट्री में डेटा सेव करना 
            await addDoc(collection(db, "history"), {
                userId: window.currentUserData.uid,
                fileName: `${dataObj.NAME || 'Document'} - ${serviceType}.pdf`,
                fileId: result.fileId || 'N/A',
                serviceType: serviceType,
                timestamp: new Date()
            });
            
            alert('Success! आपका डॉक्यूमेंट जनरेट हो गया है। कृपया History चेक करें।');
            window.switchService('history');
            formElement.reset();
        } else {
            const backendErrorMsg = result && result.error ? result.error : "अज्ञात बैकएंड एरर";
            alert('Google Apps Script Error:\n\n' + backendErrorMsg + '\n\n(कृपया अपनी Google Script चेक करें कि कहाँ गलती हो रही है)');
        }

    } catch (error) {
        alert('Form processing error. Please try again.');
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
};

// ================= LOCAL ANNEXURE FORM SUBMISSION =================
window.submitLocalAnnexureForm = async function(event, serviceType, fileIdKey) {
    event.preventDefault();
    const { db, doc, updateDoc, collection, addDoc } = window.fb;

    if (!window.currentUserData) return alert('Please login first!');
    if (!window.isAllowedPortalEmail(window.currentUserData.email)) {
        return alert('अमान्य यूज़र आईडी! केवल @print.com वाली आईडी से ही डॉक्यूमेंट जनरेट हो सकता है।');
    }
    if (!window.currentUserData.isVip) return alert('यह सर्विस केवल VIP यूज़र्स के लिए है!');

    const docCost = 10;
    if (!window.currentUserData.hasFreeAccess && window.currentUserData.credits < docCost) {
        return alert(`Insufficient credits! You need ${docCost} credits to generate ${serviceType}. Please add credits.`);
    }

    const formEl = event.target;
    const btn = formEl.querySelector('button[type="submit"]');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Generating...';
    btn.disabled = true;

    const fd = new FormData(formEl);
    const formDataObj = {};
    fd.forEach((val, key) => {
        const strVal = String(val).trim();
        if (key === 'newDob' || key === 'oldDob' || key === 'date' || key === 'invalidDocDate') {
            formDataObj[key] = window.formatDateIN(strVal);
        } else if (key === 'rel' || key === 'title' || key === 'day') {
            formDataObj[key] = strVal;
        } else {
            formDataObj[key] = strVal.toUpperCase();
        }
    });

    if (formDataObj.oldDoc === 'OTHER' && formDataObj.oldDocCustom) {
        formDataObj.oldDoc = formDataObj.oldDocCustom;
    }
    if (formDataObj.newDoc === 'OTHER' && formDataObj.newDocCustom) {
        formDataObj.newDoc = formDataObj.newDocCustom;
    }
    if (formDataObj.invalidDocName === 'OTHER' && formDataObj.invalidDocNameCustom) {
        formDataObj.invalidDocName = formDataObj.invalidDocNameCustom;
    }

    const mainPersonName = formDataObj.childName || formDataObj.applicantName || formDataObj.parentName || 'CUSTOMER';
    const cleanName = mainPersonName.replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFileName = `${cleanName} - ${serviceType}.pdf`;

    try {
        await addDoc(collection(db, "history"), {
            userId: window.currentUserData.uid,
            fileName: pdfFileName,
            fileId: fileIdKey,
            serviceType: serviceType,
            formData: formDataObj,
            timestamp: new Date()
        });

        if (!window.currentUserData.hasFreeAccess) {
            const userDocRef = doc(db, "users", window.currentUserData.uid);
            const newCredits = window.currentUserData.credits - docCost;
            await updateDoc(userDocRef, { credits: newCredits });
            window.currentUserData.credits = newCredits;
            document.getElementById('displayCredits').innerText = newCredits;
        }

        alert(`आपका डॉक्यूमेंट (${serviceType}) जनरेट हो चुका है! अब आप यहाँ History से इसे Preview, Print और Download कर सकते हैं।`);
        formEl.reset();
        window.switchService('history');
    } catch (err) {
        alert('Error generating document: ' + err.message);
    } finally {
        if (btn) {
            btn.innerHTML = origText;
            btn.disabled = false;
        }
    }
};

// ================= BACKGROUND WATERMARK HELPER (ADVANCED FORM OVERLAY) =================
const getWatermarkHtml = (srv) => {
    const wMap = {
        'domicile': { emoji: '🏠', text: 'DOMICILE' },
        'caste': { emoji: '👥', text: 'CASTE CERT' },
        'dob18': { emoji: '🎂', text: 'DOB 18+' },
        'dob_minor': { emoji: '🍼', text: 'DOB MINOR' },
        'annexure1': { emoji: '📜', text: 'ANNEXURE I' },
        'annexure1a': { emoji: '👶', text: 'ANNEXURE IA' },
        'annexure3': { emoji: '⚡', text: 'ANNEXURE III' },
        'annexure3a': { emoji: '👦', text: 'ANNEXURE IIIA' },
        'annexureb': { emoji: '🧑', text: 'ANNEXURE B' },
        'annexurec': { emoji: '👧', text: 'ANNEXURE C' },
        'annexured': { emoji: '💍', text: 'ANNEXURE D' },
        'annexuree': { emoji: '✂️️', text: 'ANNEXURE E' },
        'annexuref': { emoji: '🖍️', text: 'ANNEXURE F' },
    };
    const wm = wMap[srv] || { emoji: '📄', text: srv.toUpperCase() };
    
    return `
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-[60] overflow-hidden select-none">
            <div class="absolute text-[160px] md:text-[220px] transform -rotate-12 grayscale-[10%] opacity-[0.06]">${wm.emoji}</div>
            <div class="absolute inset-0 flex flex-col justify-around items-center py-6 transform -rotate-12 w-[200%] left-[-50%] opacity-[0.03]">
                <div class="flex justify-around w-full px-4"><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span></div>
                <div class="flex justify-around w-full px-4"><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span></div>
                <div class="flex justify-around w-full px-4"><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span></div>
                <div class="flex justify-around w-full px-4"><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span></div>
                <div class="flex justify-around w-full px-4"><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span><span class="text-[30px] md:text-[45px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</span></div>
            </div>
        </div>
    `;
};

// ================= RENDER DOCUMENT FORMS INTO CONTAINER =================
window.renderServiceFormHtml = function(serviceName, container, submitBtnText, statusTagHtml) {
    const todayISO = new Date().toISOString().split('T')[0];

    const vleSelectHtml = `
        <select name="VLE" onchange="window.toggleCustomInput(this, 'customVleInput')" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10">
            ${window.VLE_NAMES_LIST.map(v => `<option value="${v}">${v}</option>`).join('')}
            <option value="OTHER">OTHER (अन्य नाम दर्ज करें)</option>
        </select>
        <input type="text" id="customVleInput" name="VLE_CUSTOM" placeholder="VLE का नाम यहाँ लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
    `;

    const annexureDropdownHtml = serviceName.startsWith('annexure') ? `
        <div class="mb-6 p-1 rounded-2xl bg-gradient-to-r from-amber-400 via-royal-500 to-amber-600 shadow-vip-glow relative z-20">
            <div class="bg-dark-950 p-4 rounded-[14px]">
                <label class="block text-[11px] font-black text-amber-400 uppercase mb-2 tracking-widest flex items-center">
                    <i class="fa-solid fa-crown mr-1.5 text-yellow-300"></i> VIP Official Annexures Collection
                </label>
                <select onchange="window.switchService(this.value)" class="w-full p-3.5 border border-slate-700 rounded-xl text-sm font-black bg-dark-900 text-white outline-none cursor-pointer shadow-inner focus:border-amber-400 transition hover:bg-dark-800">
                    <option value="annexure1" ${serviceName==='annexure1'?'selected':''}>📜 Annexure-I (Adults DoB Update)</option>
                    <option value="annexure1a" ${serviceName==='annexure1a'?'selected':''}>👶 Annexure-IA (Children DoB Update)</option>
                    <option value="annexure3" ${serviceName==='annexure3'?'selected':''}>⚡ Annexure-III (Adults Reactivation)</option>
                    <option value="annexure3a" ${serviceName==='annexure3a'?'selected':''}>👦 Annexure-IIIA (Children Reactivation)</option>
                    <option value="annexureb" ${serviceName==='annexureb'?'selected':''}>🧑 Annexure B (Adults Name Update)</option>
                    <option value="annexurec" ${serviceName==='annexurec'?'selected':''}>👧 Annexure C (Children Name Update)</option>
                    <option value="annexured" ${serviceName==='annexured'?'selected':''}>💍 Annexure D (Name Update after Marriage)</option>
                    <option value="annexuree" ${serviceName==='annexuree'?'selected':''}>✂️ Annexure E (Adults Urf/Alias Removal)</option>
                    <option value="annexuref" ${serviceName==='annexuref'?'selected':''}>🖍️ Annexure F (Children Urf/Alias Removal)</option>
                </select>
            </div>
        </div>
    ` : '';

    // DOMICILE
    if (serviceName === 'domicile') {
        container.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-house-chimney text-royal-500 mr-1.5"></i> Domicile Certificate (मूल निवास)</h3>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('domicile')}
                <form onsubmit="window.submitForm(event, 'Domicile')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">District (जिला)</label>
                            <select id="districtSelect" name="DISTRICT" onchange="window.updateTehsilsAndThanas()" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                                <option value="BAGHPAT">बागपत</option>
                                <option value="SHAMLI">शामली</option>
                                <option value="MUZAFFARNAGAR">मुजफ्फरनगर</option>
                                <option value="MEERUT">मेरठ</option>
                                <option value="SAHARANPUR">सहारनपुर</option>
                                <option value="GHAZIABAD">गाजियाबाद</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tehsil (तहसील)</label>
                            <select id="tehsilSelect" name="TAHSEEL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Police Station (थाना)</label>
                            <select id="thanaSelect" name="THANA" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation (संबंध)</label>
                            <select name="REL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10">
                                <option value="पुत्र / पुत्री">पुत्र / पुत्री</option>
                                <option value="पत्नी      .">पत्नी</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer Name (English)</label>
                            <input type="text" name="NAME" placeholder="Enter Full Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hindi Name (Optional)</label>
                            <input type="text" name="HNAME" placeholder="हिंदी में नाम (वैकल्पिक)" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father / Husband Name</label>
                            <input type="text" name="FNAME" placeholder="Enter Father/Husband Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label>
                            <input type="text" name="MNAME" placeholder="Enter Mother Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">House Number (मकान नंबर - MN)</label>
                            <input type="text" name="MN" placeholder="Enter House No" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Area / Locality (मोहल्ला / पोस्ट)</label>
                            <input type="text" name="AREA" placeholder="Enter Area / Locality" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Village / Ward Name (गाँव / वार्ड)</label>
                            <input type="text" name="GRAM" placeholder="Enter Village / Ward Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">VLE Name (जन सेवा केंद्र संचालक)</label>
                            ${vleSelectHtml}
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Photo</label>
                            <input type="file" name="PHOTO" accept="image/*" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-royal-100 file:text-royal-700 cursor-pointer relative z-10">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.updateTehsilsAndThanas();
        return true;
    }

    // CASTE
    if (serviceName === 'caste') {
        container.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-users text-royal-500 mr-1.5"></i> Caste Certificate (जाति प्रमाण पत्र)</h3>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('caste')}
                <form onsubmit="window.submitForm(event, 'Caste')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">District (जिला)</label>
                            <select id="districtSelect" name="DISTRICT" onchange="window.updateTehsilsAndThanas()" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                                <option value="BAGHPAT">बागपत</option>
                                <option value="SHAMLI">शामली</option>
                                <option value="MUZAFFARNAGAR">मुजफ्फरनगर</option>
                                <option value="MEERUT">मेरठ</option>
                                <option value="SAHARANPUR">सहारनपुर</option>
                                <option value="GHAZIABAD">गाजियाबाद</option>
                            </select>
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tehsil (तहसील)</label><select id="tehsilSelect" name="TAHSEEL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="REL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10"><option value="पुत्र / पुत्री">पुत्र / पुत्री</option><option value="पत्नी      .">पत्नी</option></select></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Caste (जाति)</label>
                            <select name="CAST" onchange="window.toggleCustomInput(this, 'customCasteInput')" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10">
                                ${window.CASTE_OPTIONS_LIST.map(c => `<option value="${c}">${c}</option>`).join('')}
                                <option value="OTHER">OTHER (अन्य जाति लिखें)</option>
                            </select>
                            <input type="text" id="customCasteInput" name="CAST_CUSTOM" placeholder="जाति का नाम यहाँ लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer Name</label><input type="text" name="NAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hindi Name (Optional)</label><input type="text" name="HNAME" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father/Husband Name</label><input type="text" name="FNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label><input type="text" name="MNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Area / Locality</label><input type="text" name="AREA" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Village / Ward Name</label><input type="text" name="GRAM" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">VLE Name</label>
                            ${vleSelectHtml}
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Photo</label><input type="file" name="PHOTO" accept="image/*" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-royal-100 file:text-royal-700 cursor-pointer relative z-10"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.updateTehsilsAndThanas();
        return true;
    }

    // DOB CERTIFICATE 18+
    if (serviceName === 'dob18') {
        const dobSubmitBtnText = window.currentUserData && window.currentUserData.hasFreeAccess 
            ? 'Generate DOB Certificate (VIP Free) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>' 
            : 'Generate DOB Certificate (10 Credits) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>';

        container.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-cake-candles text-royal-500 mr-1.5"></i> Date of Birth Certificate (18+ VIP)</h3>
                    <p class="text-[11px] font-bold text-slate-500">VIP एक्सक्लूसिव सर्विस</p>
                </div>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('dob18')}
                <form onsubmit="window.submitForm(event, 'DOB 18+')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name</label><input type="text" name="NAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sex / Gender</label><select name="SEX" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"><option value="MALE">MALE</option><option value="FEMALE">FEMALE</option></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date of Birth (18+)</label><input type="date" name="DOB" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father Name</label><input type="text" name="FNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label><input type="text" name="MNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pin Code</label><input type="text" name="PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase relative z-10"></div>
                        <div class="md:col-span-2 relative z-10">
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-slate-500 uppercase">ADDRESS ( 'Uttar Pradesh' लिखने की आवश्यकता नहीं है)</label>
                                <span id="dobAddressCharCount" class="text-[10px] font-bold text-slate-400">7 / 38 Characters</span>
                            </div>
                            <input type="text" id="dob18AddressInput" name="ADDRESS" value="VILL - " oninput="window.handleDob18AddressInput(this)" onblur="this.value = window.cleanDob18AddressString(this.value); window.handleDob18AddressInput(this);" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none uppercase">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base relative z-10">${dobSubmitBtnText}</button>
                </form>
            </div>
        `;
        return true;
    }

    // DOB MINOR 
    if (serviceName === 'dob_minor') {
        container.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-baby text-royal-500 mr-1.5"></i> Date of Birth Certificate (Minor)</h3>
                    <p class="text-[11px] font-bold text-slate-500">VIP एक्सक्लूसिव सर्विस</p>
                </div>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-3xl p-1 -mx-1">
                ${getWatermarkHtml('dob_minor')}
                <div class="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-50/80 border-2 border-dashed border-amber-200 relative z-10 rounded-2xl">
                    <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <i class="fa-solid fa-person-digging text-4xl text-amber-500 animate-bounce"></i>
                    </div>
                    <h4 class="text-2xl font-black text-dark-900 uppercase tracking-widest mb-1">Coming Soon</h4>
                    <p class="text-sm text-slate-600 font-bold max-w-md mx-auto">इस सर्विस का फॉर्म और कोड अभी तैयार किया जा रहा है। जल्द ही यह सर्विस यहाँ उपलब्ध होगी!</p>
                </div>
            </div>
        `;
        return true;
    }

    // 1. ANNEXURE-I
    if (serviceName === 'annexure1') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            ${annexureDropdownHtml}
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-file-signature text-royal-500 mr-1.5"></i> Annexure-I (Adults DoB Update)</h3>
                    <p class="text-[11px] text-slate-500">जनरेट करने के बाद ⚙️ गियर आइकन -> Document History से Print व Download करें।</p>
                </div>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('annexure1')}
                <form onsubmit="window.submitLocalAnnexureForm(event, 'Annexure 1', 'LOCAL_HTML_ANNEXURE_1')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">आवेदक का नाम (Applicant Name)</label><input type="text" name="applicantName" placeholder="e.g. RAMESH KUMAR" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"><option value="S/o">S/o</option><option value="D/o">D/o</option><option value="W/o">W/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पिता / पति का नाम</label><input type="text" name="relativeName" placeholder="e.g. SURESH CHAND" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">12-Digit ID Number (4-4 Pair)</label>
                            <input type="text" name="idNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold tracking-wider uppercase bg-slate-50 relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">कितनी बार DoB अपडेट किया?</label>
                            <select name="updateTimes" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10">
                                <option value="NEVER">NEVER (कभी नहीं)</option>
                                <option value="ONCE">ONCE (एक बार)</option>
                                <option value="MORE THAN ONCE">MORE THAN ONCE (एक से अधिक बार)</option>
                            </select>
                        </div>
                        <div><label class="block text-[11px] font-bold text-green-700 uppercase mb-1">सही जन्मतिथि (Correct DoB)</label><input type="date" name="newDob" required class="w-full p-3 border border-green-300 rounded-xl text-sm font-bold bg-green-50 relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">पहले दर्ज जन्मतिथि (Old DoB)</label><input type="date" name="oldDob" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold bg-amber-50 relative z-10"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पहले दिया गया दस्तावेज़ (Old Doc)</label>
                            <select name="oldDoc" onchange="window.toggleCustomInput(this, 'an1OldDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an1OldDocCustom" name="oldDocCustom" placeholder="दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">अभी दिया जा रहा दस्तावेज़ (New Doc)</label>
                            <select name="newDoc" onchange="window.toggleCustomInput(this, 'an1NewDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an1NewDocCustom" name="newDocCustom" placeholder="दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">शपथ पत्र की तारीख (Date)</label><input type="date" name="date" value="${todayISO}" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Complete Address)</label><input type="text" name="address" placeholder="VILL, POST, TEHSIL, DISTT, PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        return true;
    }

    // 2. ANNEXURE-IA
    if (serviceName === 'annexure1a') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            ${annexureDropdownHtml}
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-child-reaching text-royal-500 mr-1.5"></i> Annexure-IA (Children DoB Update)</h3>
                    <p class="text-[11px] text-slate-500">बच्चों (18 से कम) की जन्मतिथि अपडेट हेतु माता-पिता का शपथ पत्र।</p>
                </div>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('annexure1a')}
                <form onsubmit="window.submitLocalAnnexureForm(event, 'Annexure 1A', 'LOCAL_HTML_ANNEXURE_1A')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का नाम (Parent Name)</label><input type="text" name="parentName" placeholder="e.g. SURESH KUMAR" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50 relative z-10"></div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"><option value="S/o">S/o</option><option value="W/o">W/o</option><option value="D/o">D/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">दादा / पति का नाम</label><input type="text" name="relativeName" placeholder="e.g. RAMPHAL" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का 12-Digit ID Number</label>
                            <input type="text" name="parentIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-amber-50 relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Complete Address)</label><input type="text" name="address" placeholder="VILL, POST, DISTT, PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का नाम (Child Name)</label><input type="text" name="childName" placeholder="e.g. AARAV KUMAR" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold uppercase bg-indigo-50 relative z-10"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का 12-Digit ID Number</label>
                            <input type="text" name="childIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-indigo-50 relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-green-800 uppercase mb-1">बच्चे की सही जन्मतिथि (Correct DoB)</label><input type="date" name="newDob" required class="w-full p-3 border border-green-300 rounded-xl text-sm font-bold bg-green-50 relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पहले दर्ज गलत जन्मतिथि (Old DoB)</label><input type="date" name="oldDob" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पहले दिया गया दस्तावेज़ (Old Doc)</label>
                            <select name="oldDoc" onchange="window.toggleCustomInput(this, 'an1aOldDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an1aOldDocCustom" name="oldDocCustom" placeholder="दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">कितनी बार अपडेट किया?</label>
                            <select name="updateTimes" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10">
                                <option value="NEVER">NEVER (कभी नहीं)</option>
                                <option value="ONCE">ONCE (एक बार)</option>
                                <option value="MORE THAN ONCE">MORE THAN ONCE (एक से अधिक बार)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">अभी दिया जा रहा दस्तावेज़ (New Doc)</label>
                            <select name="newDoc" onchange="window.toggleCustomInput(this, 'an1aNewDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an1aNewDocCustom" name="newDocCustom" placeholder="दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">शपथ पत्र की तारीख (Date)</label><input type="date" name="date" value="${todayISO}" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        return true;
    }

    // 3. ANNEXURE-III
    if (serviceName === 'annexure3') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            ${annexureDropdownHtml}
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-bolt text-royal-500 mr-1.5"></i> Annexure-III (Adults Reactivation)</h3>
                    <p class="text-[11px] text-slate-500">वयस्कों की निष्क्रिय आईडी को चालू (Reactivate) कराने हेतु शपथ पत्र। (जानकारी न होने पर <strong>टिक करें = NA</strong> चुनें)</p>
                </div>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('annexure3')}
                <form onsubmit="window.submitLocalAnnexureForm(event, 'Annexure 3', 'LOCAL_HTML_ANNEXURE_3')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">आवेदक का नाम (Applicant Name)</label><input type="text" name="applicantName" placeholder="e.g. RAMESH KUMAR" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"><option value="S/o">S/o</option><option value="D/o">D/o</option><option value="W/o">W/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पिता / पति का नाम</label><input type="text" name="relativeName" placeholder="e.g. SURESH CHAND" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">12-Digit ID Number (4-4 Pair)</label>
                            <input type="text" name="idNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold tracking-wider uppercase bg-slate-50 relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Complete Address)</label><input type="text" name="address" placeholder="VILL, POST, DISTT, PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">पहले दिया गया अमान्य दस्तावेज़ (Invalid Doc)</label>
                            <select name="invalidDocName" onchange="window.toggleCustomInput(this, 'an3InvDocCustom')" class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50 relative z-10">
                                ${window.buildDocSelectOptions("INVALID BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an3InvDocCustom" name="invalidDocNameCustom" placeholder="अमान्य दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-amber-800 uppercase">अमान्य दस्तावेज़ का नंबर (Doc No)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none relative z-10">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3InvDocNo', 'text')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="text" id="an3InvDocNo" name="invalidDocNo" placeholder="Enter Document No (या ऊपर NA टिक करें)" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50 relative z-10">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-amber-800 uppercase">अमान्य दस्तावेज़ की तारीख (Doc Date)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none relative z-10">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3InvDocDate', 'date')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="date" id="an3InvDocDate" name="invalidDocDate" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50 relative z-10">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-amber-800 uppercase">EID Number (एनरोलमेंट आईडी)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none relative z-10">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3EidNo', 'text')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="text" id="an3EidNo" name="eidNumber" placeholder="Enter EID Number (या ऊपर NA टिक करें)" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50 relative z-10">
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-green-800 uppercase mb-1">अभी दिया जा रहा सही दस्तावेज़ (New Genuine Doc)</label>
                            <select name="newDoc" onchange="window.toggleCustomInput(this, 'an3NewDocCustom')" class="w-full p-3 border border-green-300 rounded-xl text-sm font-bold uppercase bg-green-50 relative z-10">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an3NewDocCustom" name="newDocCustom" placeholder="सही दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-green-300 rounded-xl text-xs bg-green-50 uppercase relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">शपथ पत्र की तारीख (Date)</label><input type="date" name="date" value="${todayISO}" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        return true;
    }

    // 4. ANNEXURE-IIIA
    if (serviceName === 'annexure3a') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            ${annexureDropdownHtml}
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-child text-royal-500 mr-1.5"></i> Annexure-IIIA (Children Reactivation)</h3>
                    <p class="text-[11px] text-slate-500">बच्चों की निष्क्रिय आईडी को चालू (Reactivate) कराने हेतु माता-पिता का शपथ पत्र। (जानकारी न होने पर <strong>टिक करें = NA</strong> चुनें)</p>
                </div>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('annexure3a')}
                <form onsubmit="window.submitLocalAnnexureForm(event, 'Annexure 3A', 'LOCAL_HTML_ANNEXURE_3A')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का नाम (Parent Name)</label><input type="text" name="parentName" placeholder="e.g. SURESH KUMAR" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50 relative z-10"></div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"><option value="S/o">S/o</option><option value="W/o">W/o</option><option value="D/o">D/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">दादा / पति का नाम</label><input type="text" name="relativeName" placeholder="e.g. RAMPHAL" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का 12-Digit ID Number</label>
                            <input type="text" name="parentIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-amber-50 relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Complete Address)</label><input type="text" name="address" placeholder="VILL, POST, DISTT, PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का नाम (Child Name)</label><input type="text" name="childName" placeholder="e.g. AARAV KUMAR" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold uppercase bg-indigo-50 relative z-10"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का 12-Digit ID Number</label>
                            <input type="text" name="childIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-indigo-50 relative z-10">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पहले दिया गया अमान्य दस्तावेज़ (Invalid Doc)</label>
                            <select name="invalidDocName" onchange="window.toggleCustomInput(this, 'an3aInvDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10">
                                ${window.buildDocSelectOptions("INVALID BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an3aInvDocCustom" name="invalidDocNameCustom" placeholder="अमान्य दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-slate-600 uppercase">अमान्य दस्तावेज़ का नंबर (Doc No)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none relative z-10">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3aInvDocNo', 'text')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="text" id="an3aInvDocNo" name="invalidDocNo" placeholder="Enter Document No (या ऊपर NA टिक करें)" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-slate-600 uppercase">अमान्य दस्तावेज़ की तारीख (Doc Date)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none relative z-10">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3aInvDocDate', 'date')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="date" id="an3aInvDocDate" name="invalidDocDate" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-slate-600 uppercase">EID Number (एनरोलमेंट आईडी)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none relative z-10">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3aEidNo', 'text')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="text" id="an3aEidNo" name="eidNumber" placeholder="Enter EID Number (या ऊपर NA टिक करें)" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10">
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-green-800 uppercase mb-1">अभी दिया जा रहा सही दस्तावेज़ (New Genuine Doc)</label>
                            <select name="newDoc" onchange="window.toggleCustomInput(this, 'an3aNewDocCustom')" class="w-full p-3 border border-green-300 rounded-xl text-sm font-bold uppercase bg-green-50 relative z-10">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an3aNewDocCustom" name="newDocCustom" placeholder="सही दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-green-300 rounded-xl text-xs bg-green-50 uppercase relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">शपथ पत्र की तारीख (Date)</label><input type="date" name="date" value="${todayISO}" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        return true;
    }

    // 5, 6, 7. ANNEXURE B, C, D
    if (serviceName === 'annexureb' || serviceName === 'annexurec' || serviceName === 'annexured') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        const isChild = (serviceName === 'annexurec');
        const mapInfo = {
            'annexureb': { title: 'Annexure B', key: 'LOCAL_HTML_ANNEXURE_B', desc: 'वयस्कों के नाम सुधार / परिवर्तन हेतु शपथ पत्र' },
            'annexurec': { title: 'Annexure C', key: 'LOCAL_HTML_ANNEXURE_C', desc: 'बच्चों के नाम सुधार / परिवर्तन हेतु माता-पिता द्वारा शपथ पत्र' },
            'annexured': { title: 'Annexure D', key: 'LOCAL_HTML_ANNEXURE_D', desc: 'विवाह पश्चात या दूसरी बार नाम अपडेट करने हेतु शपथ पत्र' }
        }[serviceName];

        const childFieldsHtml = isChild ? `
            <div>
                <label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का 12-Digit ID Number</label>
                <input type="text" name="childIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-indigo-50 relative z-10">
            </div>
        ` : '';

        container.innerHTML = `
            ${annexureDropdownHtml}
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-file-contract text-royal-500 mr-1.5"></i> ${mapInfo.title} - Name Update Affidavit</h3>
                    <p class="text-[11px] text-slate-500">${mapInfo.desc}</p>
                </div>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml(serviceName)}
                <form onsubmit="window.submitLocalAnnexureForm(event, '${mapInfo.title}', '${mapInfo.key}')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Title</label><select name="title" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"><option value="Shri">Shri</option><option value="Smt.">Smt.</option><option value="Ms.">Ms.</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">${isChild ? 'माता/पिता का नाम (Parent)' : 'आवेदक का नाम (Applicant)'}</label><input type="text" name="applicantName" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"><option value="S/o">S/o</option><option value="W/o">W/o</option><option value="D/o">D/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पिता / पति का नाम</label><input type="text" name="relativeName" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">${isChild ? 'माता/पिता का 12-Digit ID Number' : '12-Digit ID Number (4-4 Pair)'}</label>
                            <input type="text" name="idNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold tracking-wider uppercase bg-slate-50 relative z-10">
                        </div>
                        ${childFieldsHtml}
                        <div><label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">पहले दर्ज नाम (Old Recorded Name)</label><input type="text" name="oldName" placeholder="OLD NAME" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50 relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-green-800 uppercase mb-1">नया सही नाम (New Correct Name)</label><input type="text" name="newName" placeholder="NEW CORRECT NAME" required class="w-full p-3 border border-green-300 rounded-xl text-sm font-bold uppercase bg-green-50 relative z-10"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">सपोर्टिंग दस्तावेज़ (Supporting PoI Doc)</label>
                            <select name="newDoc" onchange="window.toggleCustomInput(this, 'anBcdDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10">
                                ${window.buildDocSelectOptions(isChild ? "BIRTH CERTIFICATE" : "PAN CARD")}
                            </select>
                            <input type="text" id="anBcdDocCustom" name="newDocCustom" placeholder="दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Complete Address)</label><input type="text" name="address" placeholder="VILL, POST, DISTT, PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">स्थान (Verified at Place)</label><input type="text" name="place" placeholder="e.g. BARAUT" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div class="grid grid-cols-2 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">दिन (Day)</label><input type="text" id="inpDay" name="day" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"></div>
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">महीना व वर्ष</label><input type="text" id="inpMonthYear" name="monthYear" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.initVerificationDefaults();
        return true;
    }

    // 8. ANNEXURE E
    if (serviceName === 'annexuree') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            ${annexureDropdownHtml}
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-file-contract text-royal-500 mr-1.5"></i> Annexure E (Adults Urf/Alias Removal)</h3>
                    <p class="text-[11px] text-slate-500">वयस्कों के नाम में से "उर्फ़ / Alias" हटाने हेतु शपथ पत्र। (नाम में URF लिखने पर दोनों नाम स्वतः अलग हो जाएंगे)</p>
                </div>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('annexuree')}
                <form id="annexureEForm" onsubmit="window.submitLocalAnnexureForm(event, 'Annexure E', 'LOCAL_HTML_ANNEXURE_E')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Title</label><select id="inpTitle" name="title" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"><option value="Shri">Shri</option><option value="Smt.">Smt.</option><option value="Ms.">Ms.</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">आवेदक का नाम (Applicant)</label><input type="text" id="inpApplicantName" name="applicantName" oninput="window.syncAnnexureENames()" placeholder="e.g. RAMESH URF SONU" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select id="inpRel" name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"><option value="S/o">S/o</option><option value="D/o">D/o</option><option value="W/o">W/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पिता / पति का नाम</label><input type="text" id="inpRelativeName" name="relativeName" placeholder="e.g. SURESH CHAND" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Resident of)</label><input type="text" id="inpAddress" name="address" placeholder="e.g. VILL BARAUT, DISTT BAGHPAT" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">12-Digit ID Number (4-4 Pair)</label>
                            <input type="text" id="inpIdNumber" name="idNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold tracking-wider uppercase bg-slate-50 relative z-10">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 relative z-10">
                        <div class="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 relative z-10">
                            <div class="flex justify-between items-center">
                                <span class="text-[11px] font-black text-amber-900 uppercase">2. कार्ड में दर्ज दोनों नाम (Urf / Alias)</span>
                                <button type="button" onclick="window.swapAnnexureERetainRemove()" class="text-[10px] bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded relative z-10"><i class="fa-solid fa-right-left mr-1"></i> Swap</button>
                            </div>
                            <div class="grid grid-cols-2 gap-2 relative z-10">
                                <div><label class="block text-[10px] font-bold text-amber-800 uppercase mb-1">पहला नाम (Name 1)</label><input type="text" id="inpRecorded1" name="recorded1" oninput="window.syncAnnexureENames()" placeholder="RAMESH" required class="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-bold uppercase bg-white relative z-10"></div>
                                <div><label class="block text-[10px] font-bold text-amber-800 uppercase mb-1">उर्फ़ नाम (Alias 2)</label><input type="text" id="inpRecorded2" name="recorded2" oninput="window.syncAnnexureENames()" placeholder="SONU" required class="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-bold uppercase bg-white relative z-10"></div>
                            </div>
                        </div>

                        <div class="p-3 bg-green-50 rounded-2xl border border-green-200 space-y-2 relative z-10">
                            <span class="text-[11px] font-black text-green-900 uppercase block">3. कौन-सा नाम रखना है और कौन-सा हटाना है</span>
                            <div class="grid grid-cols-2 gap-2 relative z-10">
                                <div><label class="block text-[10px] font-bold text-green-800 uppercase mb-1">रखने वाला (Retain)</label><input type="text" id="inpRetainName" name="retainName" placeholder="RAMESH" required class="w-full p-2.5 border border-green-300 rounded-xl text-xs font-bold uppercase bg-white relative z-10"></div>
                                <div><label class="block text-[10px] font-bold text-red-700 uppercase mb-1">हटाने वाला (Remove)</label><input type="text" id="inpRemoveName" name="removeName" placeholder="SONU" required class="w-full p-2.5 border border-red-300 rounded-xl text-xs font-bold uppercase bg-white relative z-10"></div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2.5 relative z-10">
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">स्थान (Place)</label><input type="text" id="inpPlace" name="place" placeholder="BARAUT" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">दिन (Day)</label><input type="text" id="inpDay" name="day" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 relative z-10"></div>
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">महीना व वर्ष</label><input type="text" id="inpMonthYear" name="monthYear" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase bg-slate-50 relative z-10"></div>
                    </div>

                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.initVerificationDefaults();
        return true;
    }

    // 9. ANNEXURE F
    if (serviceName === 'annexuref') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            ${annexureDropdownHtml}
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-child-reaching text-royal-500 mr-1.5"></i> Annexure F (Children Urf/Alias Removal)</h3>
                    <p class="text-[11px] text-slate-500">बच्चे के नाम में से "उर्फ़ / Alias" हटाने हेतु शपथ पत्र।</p>
                </div>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('annexuref')}
                <form onsubmit="window.submitLocalAnnexureForm(event, 'Annexure F', 'LOCAL_HTML_ANNEXURE_F')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Title</label><select name="title" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"><option value="Shri">Shri</option><option value="Smt.">Smt.</option><option value="Ms.">Ms.</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का नाम (Parent)</label><input type="text" name="parentName" placeholder="e.g. SURESH KUMAR" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50 relative z-10"></div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 relative z-10"><option value="S/o">S/o</option><option value="W/o">W/o</option><option value="D/o">D/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">दादा / पति का नाम</label><input type="text" name="relativeName" placeholder="e.g. RAMPHAL" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का 12-Digit ID Number</label>
                            <input type="text" name="parentIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-amber-50 relative z-10">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Resident of)</label><input type="text" name="address" placeholder="VILL BARAUT, DISTT BAGHPAT" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div><label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का नाम (Child Name)</label><input type="text" id="inpApplicantName" name="childName" oninput="window.syncAnnexureENames()" placeholder="e.g. AARAV URF GOLU" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold uppercase bg-indigo-50 relative z-10"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का 12-Digit ID Number</label>
                            <input type="text" name="childIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-indigo-50 relative z-10">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 relative z-10">
                        <div class="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 relative z-10">
                            <div class="flex justify-between items-center">
                                <span class="text-[11px] font-black text-amber-900 uppercase">2. बच्चे के दर्ज दोनों नाम (Urf / Alias)</span>
                                <button type="button" onclick="window.swapAnnexureERetainRemove()" class="text-[10px] bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded relative z-10"><i class="fa-solid fa-right-left mr-1"></i> Swap</button>
                            </div>
                            <div class="grid grid-cols-2 gap-2 relative z-10">
                                <div><label class="block text-[10px] font-bold text-amber-800 uppercase mb-1">पहला नाम (Name 1)</label><input type="text" id="inpRecorded1" name="recorded1" oninput="window.syncAnnexureENames()" placeholder="AARAV" required class="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-bold uppercase bg-white relative z-10"></div>
                                <div><label class="block text-[10px] font-bold text-amber-800 uppercase mb-1">उर्फ़ नाम (Alias 2)</label><input type="text" id="inpRecorded2" name="recorded2" oninput="window.syncAnnexureENames()" placeholder="GOLU" required class="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-bold uppercase bg-white relative z-10"></div>
                            </div>
                        </div>

                        <div class="p-3 bg-green-50 rounded-2xl border border-green-200 space-y-2 relative z-10">
                            <span class="text-[11px] font-black text-green-900 uppercase block">3. कौन-सा नाम रखना है और कौन-सा हटाना है</span>
                            <div class="grid grid-cols-2 gap-2 relative z-10">
                                <div><label class="block text-[10px] font-bold text-green-800 uppercase mb-1">रखने वाला (Retain)</label><input type="text" id="inpRetainName" name="retainName" placeholder="AARAV" required class="w-full p-2.5 border border-green-300 rounded-xl text-xs font-bold uppercase bg-white relative z-10"></div>
                                <div><label class="block text-[10px] font-bold text-red-700 uppercase mb-1">हटाने वाला (Remove)</label><input type="text" id="inpRemoveName" name="removeName" placeholder="GOLU" required class="w-full p-2.5 border border-red-300 rounded-xl text-xs font-bold uppercase bg-white relative z-10"></div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2.5 relative z-10">
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">स्थान (Place)</label><input type="text" id="inpPlace" name="place" placeholder="BARAUT" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase bg-slate-50 relative z-10"></div>
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">दिन (Day)</label><input type="text" id="inpDay" name="day" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 relative z-10"></div>
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">महीना व वर्ष</label><input type="text" id="inpMonthYear" name="monthYear" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase bg-slate-50 relative z-10"></div>
                    </div>

                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base relative z-10">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.initVerificationDefaults();
        return true;
    }

    return false;
};
```eof

आप इन दोनों फाइलों का कोड अपडेट कर लें। **जैसे ही आप मुझे जवाब देंगे, मैं आपको तुरंत `admin.html` और `admin-logic.js` का कोड भी इसी तरह कंप्लीट दे दूंगा!**
