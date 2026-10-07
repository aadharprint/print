// ============================================================================
// FILE 3: js/portal-wallet-chat.js
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
    showDomicile: true, showCaste: true, showDob18: true, showDobMinor: true, showPassport: true,
    bannerEnabled: false, bannerBadge: "UPDATE", bannerTitle: "",
    bannerMessage: "", bannerBtnText: "", bannerBtnLink: ""
};

window.currentRechargeCredits = 0; window.currentTotalPayable = 0; window.currentWantsVip = false; window.currentVipDays = 0; window.currentVipPlanFee = 0;

window.canCurrentUserSeeService = function(srv) {
    const cfg = window.portalConfigState || {};
    const u = window.currentUserData;
    if (!u) return false;
    
    if (srv === 'domicile') return cfg.showDomicile !== false && u.allowDomicile !== false;
    if (srv === 'caste') return cfg.showCaste !== false && u.allowCaste !== false;
    if (srv === 'dob18') return cfg.showDob18 !== false && u.allowDob18 !== false; 
    if (srv === 'dob_minor') return cfg.showDobMinor !== false && u.allowDobMinor !== false; 
    if (srv === 'passport') return cfg.showPassport !== false && u.allowPassport !== false; 
    return true; 
};

window.getFirstAllowedTab = function() { 
    if (window.canCurrentUserSeeService('domicile')) return 'domicile'; 
    if (window.canCurrentUserSeeService('caste')) return 'caste'; 
    if (window.currentUserData && window.currentUserData.isVip) {
        if (window.canCurrentUserSeeService('dob18')) return 'dob18';
        if (window.canCurrentUserSeeService('dob_minor')) return 'dob_minor';
        if (window.canCurrentUserSeeService('passport')) return 'passport';
        return 'annexure1';
    }
    return 'history'; 
};

async function notifyAdminSecurely(payload) { try { await fetch('/api/notify-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (e) {} }

window.openForgotPasswordModal = function() { const modal = document.getElementById('forgotPasswordModal'); const idInp = document.getElementById('forgotUserIdInput'); const phoneInp = document.getElementById('forgotUserPhoneInput'); const noteInp = document.getElementById('forgotUserNoteInput'); const resBox = document.getElementById('forgotResultBox'); if (!modal) return; resBox.style.display = 'none'; idInp.value = document.getElementById('loginUsername')?.value.trim() || ''; phoneInp.value = ''; noteInp.value = ''; modal.style.display = 'flex'; };
window.closeForgotPasswordModal = function() { const modal = document.getElementById('forgotPasswordModal'); if (modal) modal.style.display = 'none'; };
window.submitForgotPasswordTicket = async function(event) { event.preventDefault(); const userIdText = document.getElementById('forgotUserIdInput').value.trim(); const userPhoneText = document.getElementById('forgotUserPhoneInput').value.trim(); const userNoteText = document.getElementById('forgotUserNoteInput').value.trim(); const btn = document.getElementById('btnSubmitForgotTicket'); const resBox = document.getElementById('forgotResultBox'); if (!userIdText || !userPhoneText) return alert("कृपया अपनी User ID और मोबाइल नंबर ज़रूर भरें!"); const origHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Ticket...'; const finalMessage = userNoteText || "मैं अपना पासवर्ड भूल गया हूँ।"; try { await addDoc(collection(db, "supportTickets"), { type: "FORGOT_PASSWORD", userIdentifier: userIdText, userPhone: userPhoneText, message: `🔑 Pass Req: ${finalMessage}`, messages: [{ sender: 'user', text: `🔑 [FORGOT PASS]\nID: ${userIdText}\nNote:${finalMessage}`, time: Date.now() }], status: "Open", unreadByAdmin: true, unreadByUser: false, timestamp: new Date(), updatedAtMs: Date.now() }); notifyAdminSecurely({ type: "FORGOT_PASSWORD", userId: userIdText, phone: userPhoneText, message: finalMessage }); resBox.className = "p-3.5 rounded-2xl bg-green-50 border border-green-300 text-green-900 text-xs font-bold text-center mt-2"; resBox.innerHTML = `आपका टिकट बन गया है! एडमिन जल्द ही रिप्लाई करेंगे।`; resBox.style.display = 'block'; event.target.reset(); } catch (err) { alert("Error: " + err.message); } finally { btn.disabled = false; btn.innerHTML = origHtml; } };

function startUserSupportChatListener(uid) { if (window.userChatUnsubscribe) window.userChatUnsubscribe(); window.userChatUnsubscribe = onSnapshot(doc(db, "supportTickets", uid), async (snap) => { if (snap.exists()) { window.currentUserChatData = snap.data(); } else { window.currentUserChatData = { messages: [], unreadByUser: false }; } const isUnread = window.currentUserChatData.unreadByUser === true; const headerBadge = document.getElementById('headerSupportUnreadBadge'); const gearBadge = document.getElementById('gearSupportUnreadBadge'); if (window.currentActiveTab === 'support_chat') { if (isUnread) { try { await updateDoc(doc(db, "supportTickets", uid), { unreadByUser: false }); } catch (e) {} } if (headerBadge) headerBadge.style.display = 'none'; if (gearBadge) gearBadge.style.display = 'none'; window.renderUserLiveChatMessages(); } else { if (headerBadge) { headerBadge.innerText = '1'; headerBadge.style.display = isUnread ? 'inline-flex' : 'none'; } if (gearBadge) { gearBadge.innerText = 'New'; gearBadge.style.display = isUnread ? 'inline-block' : 'none'; } } }); }
window.renderUserLiveChatMessages = function() { const box = document.getElementById('userLiveChatMessagesBox'); if (!box) return; let msgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : []; if (msgs.length === 0 && window.currentUserChatData?.message) msgs.push({ sender: 'user', text: window.currentUserChatData.message, time: Date.now() }); if (msgs.length === 0) { box.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400"><i class="fa-solid fa-comments text-3xl mb-2"></i><p class="text-xs">Ojas Live Support Chat</p></div>`; return; } box.innerHTML = msgs.map(m => { const isMe = m.sender === 'user'; const safeText = String(m.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); if (isMe) { return `<div class="flex justify-end"><div class="max-w-[80%] bg-dark-900 text-white px-3.5 py-2.5 rounded-2xl rounded-br-none"><p class="text-xs font-semibold">${safeText}</p></div></div>`; } else { return `<div class="flex justify-start"><div class="max-w-[80%] bg-amber-50 border border-amber-300 px-3.5 py-2.5 rounded-2xl rounded-bl-none"><span class="text-[10px] font-black text-amber-800 uppercase block mb-0.5"><i class="fa-solid fa-crown mr-1"></i>Admin</span><p class="text-xs font-bold">${safeText}</p></div></div>`; } }).join(''); box.scrollTop = box.scrollHeight; };
window.sendUserSupportMessage = async function(event) { event.preventDefault(); if (!window.currentUserData) return; const inp = document.getElementById('userSupportChatInput'); const text = inp.value.trim(); if (!text) return; inp.value = ''; const uid = window.currentUserData.uid; try { const existingMsgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : []; existingMsgs.push({ sender: 'user', text: text, time: Date.now() }); await setDoc(doc(db, "supportTickets", uid), { type: 'USER_SUPPORT_CHAT', userId: uid, userIdentifier: window.currentUserData.email, username: window.currentUserData.username, message: text, status: 'Open', unreadByAdmin: true, unreadByUser: false, timestamp: new Date(), updatedAtMs: Date.now(), messages: existingMsgs }, { merge: true }); } catch (err) {} };

function startUserProfileListener(uid) { 
    if (window.userProfileUnsubscribe) window.userProfileUnsubscribe(); 
    window.userProfileUnsubscribe = onSnapshot(doc(db, "users", uid), (snap) => { 
        if (!snap.exists() || !window.currentUserData) return; 
        const data = snap.data(); window.currentUserData.credits = data.credits || 0; 
        window.currentUserData.allowDob18 = data.allowDob18 !== false;
        window.currentUserData.allowDomicile = data.allowDomicile !== false;
        window.currentUserData.allowCaste = data.allowCaste !== false;
        window.currentUserData.allowDobMinor = data.allowDobMinor !== false;
        window.currentUserData.allowPassport = data.allowPassport !== false; // Passport
        const creditEl = document.getElementById('displayCredits'); if (creditEl) creditEl.innerText = window.currentUserData.credits; 
        const now = Date.now(); const isNowVip = window.currentUserData.hasFreeAccess || (data.isVip && (!data.vipExpiry || data.vipExpiry > now)); 
        const vipChanged = window.currentUserData.isVip !== isNowVip; 
        window.currentUserData.isVip = isNowVip; window.currentUserData.vipExpiry = window.currentUserData.hasFreeAccess ? 0 : (data.vipExpiry || 0); 
        if (vipChanged) setupDashboard(window.currentUserData); else window.applyLivePortalControls(); 
    }); 
}

function startPortalSettingsListener() { if (window.portalSettingsUnsubscribe) window.portalSettingsUnsubscribe(); window.portalSettingsUnsubscribe = onSnapshot(doc(db, "settings", "portalConfig"), (snap) => { if (snap.exists()) { const data = snap.data(); window.portalConfigState = { showDomicile: data.showDomicile !== false, showCaste: data.showCaste !== false, showDob18: data.showDob18 !== false, showDobMinor: data.showDobMinor !== false, showPassport: data.showPassport !== false, bannerEnabled: !!data.bannerEnabled, bannerBadge: data.bannerBadge || "UPDATE", bannerTitle: data.bannerTitle || "", bannerMessage: data.bannerMessage || "", bannerBtnText: data.bannerBtnText || "", bannerBtnLink: data.bannerBtnLink || "" }; } window.applyLivePortalControls(); }); }

window.applyLivePortalControls = function() {
    const cfg = window.portalConfigState; 
    const canDom = window.canCurrentUserSeeService('domicile');
    const canCas = window.canCurrentUserSeeService('caste');
    const canDob18 = window.canCurrentUserSeeService('dob18');
    const canDobMinor = window.canCurrentUserSeeService('dob_minor');
    const canPassport = window.canCurrentUserSeeService('passport');

    const bannerBox = document.getElementById('liveUpdateBannerContainer');
    if (bannerBox) { if (cfg.bannerEnabled && (cfg.bannerTitle || cfg.bannerMessage)) { bannerBox.style.display = 'block'; const btnHtml = (cfg.bannerBtnText && cfg.bannerBtnLink) ? `<a href="${cfg.bannerBtnLink}" target="_blank" class="bg-amber-400 text-dark-950 font-black px-3 py-1.5 rounded-xl text-xs transition shadow-sm">${cfg.bannerBtnText}</a>` : ''; bannerBox.innerHTML = `<div class="p-3.5 rounded-2xl bg-gradient-to-r from-dark-950 via-slate-900 to-indigo-950 text-white border border-royal-400/60 shadow-md"><div class="flex items-center justify-between"><div class="flex items-center gap-2.5"><span class="bg-royal-500 text-dark-950 text-[10px] font-black px-2 py-0.5 rounded uppercase"><i class="fa-solid fa-bullhorn mr-1"></i>${cfg.bannerBadge}</span><div>${cfg.bannerTitle ? `<h4 class="text-xs font-black text-royal-300">${cfg.bannerTitle}</h4>` : ''}${cfg.bannerMessage ? `<p class="text-[11px] text-slate-200 mt-0.5">${cfg.bannerMessage}</p>` : ''}</div></div>${btnHtml}</div></div>`; } else { bannerBox.style.display = 'none'; bannerBox.innerHTML = ''; } }
    
    const stdGrid = document.getElementById('standardServicesGrid'); 
    const btnDom = document.getElementById('btn-domicile'); const btnCas = document.getElementById('btn-caste'); 
    const btnDob = document.getElementById('btn-dob18'); const btnDobMinor = document.getElementById('btn-dob_minor');
    const btnPassport = document.getElementById('btn-passport');
    const promoDesc = document.getElementById('normalPromoTextDesc'); 
    
    if (btnDom) btnDom.style.setProperty('display', canDom ? 'flex' : 'none', 'important'); 
    if (btnCas) btnCas.style.setProperty('display', canCas ? 'flex' : 'none', 'important');
    if (btnDob) btnDob.style.setProperty('display', canDob18 ? 'flex' : 'none', 'important');
    if (btnDobMinor) btnDobMinor.style.setProperty('display', canDobMinor ? 'flex' : 'none', 'important');
    if (btnPassport) btnPassport.style.setProperty('display', canPassport ? 'flex' : 'none', 'important');
    
    if (stdGrid) { 
        if (!canDom && !canCas) { stdGrid.style.setProperty('display', 'none', 'important'); } 
        else if (canDom && canCas) { stdGrid.style.setProperty('display', 'grid', 'important'); stdGrid.className = "grid grid-cols-2 gap-2.5 mb-3"; } 
        else { stdGrid.style.setProperty('display', 'grid', 'important'); stdGrid.className = "grid grid-cols-1 gap-2.5 mb-3"; } 
    }
    
    if (promoDesc) promoDesc.innerHTML = `VIP लें: <strong>सभी VIP सर्विसेस व 9 Official Annexures</strong> अनलॉक करें!`;
    
    if ((window.currentActiveTab === 'domicile' && !canDom) || (window.currentActiveTab === 'caste' && !canCas) || (window.currentActiveTab === 'dob18' && !canDob18) || (window.currentActiveTab === 'dob_minor' && !canDobMinor) || (window.currentActiveTab === 'passport' && !canPassport)) { 
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
            const emailLower = user.email.trim().toLowerCase(); if (!emailLower.endsWith('@print.com') && emailLower !== window.ADMIN_EMAIL && !window.FREE_VIP_EMAILS.includes(emailLower)) { await signOut(auth); alert("अमान्य आईडी!"); loadingScreen.style.display = 'none'; return; }
            try { const cfgSnap = await getDoc(doc(db, "settings", "portalConfig")); if (cfgSnap.exists()) { const d = cfgSnap.data(); window.portalConfigState = { showDomicile: d.showDomicile !== false, showCaste: d.showCaste !== false, showDob18: d.showDob18 !== false, showDobMinor: d.showDobMinor !== false, showPassport: d.showPassport !== false, bannerEnabled: !!d.bannerEnabled, bannerBadge: d.bannerBadge || "UPDATE", bannerTitle: d.bannerTitle || "", bannerMessage: d.bannerMessage || "" }; } } catch (e) {}
            const userDocRef = doc(db, "users", user.uid); const userDoc = await getDoc(userDocRef); let userCredits = 0, isVip = false, vipExpiry = 0, allowDob18 = true, allowDomicile = true, allowCaste = true, allowDobMinor = true, allowPassport = true;
            if (userDoc.exists()) { const data = userDoc.data(); userCredits = data.credits || 0; isVip = data.isVip || false; vipExpiry = data.vipExpiry || 0; allowDob18 = data.allowDob18 !== false; allowDomicile = data.allowDomicile !== false; allowCaste = data.allowCaste !== false; allowDobMinor = data.allowDobMinor !== false; allowPassport = data.allowPassport !== false; }
            const isAdmin = (emailLower === window.ADMIN_EMAIL); const isFreeVip = window.FREE_VIP_EMAILS.includes(emailLower); const hasFreeAccess = isAdmin || isFreeVip; const now = Date.now();
            if (!hasFreeAccess && isVip && vipExpiry > 0 && vipExpiry <= now) { isVip = false; vipExpiry = 0; await updateDoc(userDocRef, { isVip: false, vipExpiry: 0 }); }
            window.currentUserData = { uid: user.uid, email: user.email, credits: userCredits, isVip: isVip || hasFreeAccess, vipExpiry: hasFreeAccess ? 0 : vipExpiry, allowDob18, allowDomicile, allowCaste, allowDobMinor, allowPassport, isAdmin, isFreeVip, hasFreeAccess, username: user.email.split('@')[0] };
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
    const originalBtnHtml = loginBtn.innerHTML; loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Login...'; loginBtn.disabled = true;
    try { await signInWithEmailAndPassword(auth, email, passInput); } catch (error) { errorDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1"></i> ID or Password incorrect!'; errorDiv.style.display = 'block'; document.getElementById('loginPassword').value = ''; loginBtn.innerHTML = originalBtnHtml; loginBtn.disabled = false; }
};

function startVipCountdownLoop() { if (window.vipCountdownInterval) clearInterval(window.vipCountdownInterval); updateVipTimerAndAlerts(); window.vipCountdownInterval = setInterval(updateVipTimerAndAlerts, 1000); }
async function updateVipTimerAndAlerts() {
    const userData = window.currentUserData; const gearVipDaysText = document.getElementById('gearVipDaysText'); const cornerAlert = document.getElementById('vipCornerAlert'); const cornerAlertDaysText = document.getElementById('cornerAlertDaysText');
    if (!userData || !userData.isVip || userData.hasFreeAccess) { if (cornerAlert) cornerAlert.style.display = 'none'; if (gearVipDaysText) gearVipDaysText.innerText = userData?.isAdmin ? '👑 Admin (Unlimited)' : 'Normal User (0 Days)'; return; }
    if (!userData.vipExpiry || userData.vipExpiry <= 0) { if (gearVipDaysText) gearVipDaysText.innerText = 'VIP Active'; if (cornerAlert) cornerAlert.style.display = 'none'; return; }
    const now = Date.now(); const diff = userData.vipExpiry - now;
    if (diff <= 0) { clearInterval(window.vipCountdownInterval); userData.isVip = false; userData.vipExpiry = 0; try { await updateDoc(doc(db, "users", userData.uid), { isVip: false, vipExpiry: 0 }); } catch (e) {} if (cornerAlert) cornerAlert.style.display = 'none'; setupDashboard(userData); alert('आपकी VIP वैलिडिटी समाप्त हो गई है।'); return; }
    const totalDaysCeil = Math.ceil(diff / window.MS_PER_DAY); const days = Math.floor(diff / window.MS_PER_DAY); const hours = Math.floor((diff % window.MS_PER_DAY) / (1000 * 60 * 60));
    if (gearVipDaysText) gearVipDaysText.innerText = `👑 VIP: ${days}d${hours}h`;
    if (totalDaysCeil <= 5 && totalDaysCeil >= 1) { if (!window.cornerAlertDismissed) { cornerAlert.style.display = 'block'; cornerAlertDaysText.innerHTML = `सिर्फ <strong class="text-red-600 underline">${totalDaysCeil} दिन</strong> बचे हैं!`; } } else { cornerAlert.style.display = 'none'; }
}
window.dismissCornerAlert = function() { window.cornerAlertDismissed = true; document.getElementById('vipCornerAlert').style.display = 'none'; };

function setupDashboard(userData) {
    document.getElementById('displayUser').innerText = userData.username.toUpperCase(); const adminLink = document.getElementById('adminPanelLink'); const creditDisplayBox = document.getElementById('creditDisplayBox'); const vipServicesBar = document.getElementById('vipServicesBar'); const normalUserVipPromo = document.getElementById('normalUserVipPromo'); const vipBadge = document.getElementById('vipStatusBadge'); const mainFormCard = document.getElementById('mainFormCard');
    adminLink.style.display = userData.isAdmin ? 'flex' : 'none';
    if (userData.hasFreeAccess) { creditDisplayBox.style.display = 'none'; } else { creditDisplayBox.style.display = 'flex'; document.getElementById('displayCredits').innerText = userData.credits; }
    if (userData.isVip) { document.body.classList.add('vip-body-bg'); vipBadge.style.display = 'inline-flex'; vipServicesBar.style.display = 'block'; normalUserVipPromo.style.display = 'none'; mainFormCard.className = "bg-white text-slate-800 rounded-2xl md:rounded-3xl shadow-vip-glow border-2 border-royal-400 p-4 md:p-7"; } else { document.body.classList.remove('vip-body-bg'); vipBadge.style.display = 'none'; vipServicesBar.style.display = 'none'; normalUserVipPromo.style.display = 'block'; mainFormCard.className = "bg-white text-slate-800 rounded-2xl md:rounded-3xl shadow-card border border-slate-100 p-4 md:p-7"; }
    document.getElementById('loginSection').style.display = 'none'; document.getElementById('dashboardSection').style.display = 'flex';
    window.applyLivePortalControls(); 
    const savedTab = sessionStorage.getItem('ojas_active_tab');
    if (savedTab && window.canCurrentUserSeeService(savedTab)) { window.switchService(savedTab); } else { window.switchService(window.getFirstAllowedTab()); }
}
window.handleLogout = async function() { await signOut(auth); window.location.reload(); };

window.togglePassVisibility = function(inputId, btnEl) { const inp = document.getElementById(inputId); const icon = btnEl.querySelector('i'); if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fa-solid fa-eye-slash text-royal-600'; } else { inp.type = 'password'; icon.className = 'fa-solid fa-eye'; } };
window.changeUserPassword = async function(event) { event.preventDefault(); const currPass = document.getElementById('currentPassInput').value; const newPass = document.getElementById('newPassInput').value; const confirmPass = document.getElementById('confirmPassInput').value; const msgBox = document.getElementById('passChangeMsg'); const btn = document.getElementById('btnChangePass'); if (newPass.length < 6) { msgBox.className = "text-xs font-bold p-3.5 rounded-xl border text-center bg-red-50 text-red-600 border-red-200 mt-4"; msgBox.innerHTML = "कम से कम 6 अक्षर!"; msgBox.style.display = 'block'; return; } if (newPass !== confirmPass) { msgBox.className = "text-xs font-bold p-3.5 rounded-xl border text-center bg-red-50 text-red-600 border-red-200 mt-4"; msgBox.innerHTML = "पासवर्ड मैच नहीं हो रहे!"; msgBox.style.display = 'block'; return; } const origHtml = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Updating...'; btn.disabled = true; msgBox.style.display = 'none'; try { const user = auth.currentUser; const credential = EmailAuthProvider.credential(user.email, currPass); await reauthenticateWithCredential(user, credential); await updatePassword(user, newPass); await updateDoc(doc(db, "users", user.uid), { userPass: newPass, passUpdatedAt: new Date() }); msgBox.className = "text-xs font-bold p-3.5 rounded-xl border text-center bg-green-50 text-green-700 border-green-200 mt-4"; msgBox.innerHTML = "पासवर्ड सफलतापूर्वक बदल गया!"; msgBox.style.display = 'block'; event.target.reset(); } catch (error) { msgBox.className = "text-xs font-bold p-3.5 rounded-xl border text-center bg-red-50 text-red-600 border-red-200 mt-4"; msgBox.innerHTML = "पुराना पासवर्ड गलत है या कोई एरर आया!"; msgBox.style.display = 'block'; } finally { btn.innerHTML = origHtml; btn.disabled = false; } };

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

// === MOBILE PAYMENT BUTTONS UPGRADE (Paytm, GPay, PhonePe) ===
window.generateQR = async function() {
    if (window.currentUserData?.hasFreeAccess) return; window.calculateCredits();
    if (!window.currentWantsVip && window.currentRechargeCredits < 100) return alert('कम से कम ₹100 के क्रेडिट रिचार्ज करना अनिवार्य है!');
    if (window.currentTotalPayable < 100) return alert('न्यूनतम पेमेंट राशि ₹100 होनी चाहिए!');

    const btn = document.getElementById('btnGenerateQR'); const origBtnHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> बन रहा है...'; }

    // Your Upi string logic
    const upiId = "8279650137@amazonpay"; 
    const pName = "Ojas Print Service";
    const note = window.currentWantsVip ? `Ojas VIP ${window.currentVipDays}d` : `Ojas Credits`;
    
    // Core UPI URI
    let universalUpiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(pName)}&am=${window.currentTotalPayable}&cu=INR&tn=${encodeURIComponent(note)}`;
    let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(universalUpiUrl)}`; 
    window.currentActiveOrderId = null;

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
                    document.getElementById('walletMainUI').innerHTML = `<div class="p-6 bg-green-50 rounded-2xl border-2 border-green-400 text-center space-y-2"><i class="fa-solid fa-circle-check text-5xl text-green-600 mb-2 animate-bounce"></i><h2 class="text-xl font-black text-green-900">पेमेंट सफल!</h2><p class="text-xs font-bold text-green-700">₹${window.currentTotalPayable} का पेमेंट वेरीफाई हो गया है!</p><button onclick="window.location.reload()" class="mt-4 bg-green-600 hover:bg-green-700 text-white font-black py-2.5 px-6 rounded-xl text-xs shadow">डैशबोर्ड पर जाएँ</button></div>`;
                }
            });
        }
    } catch (err) { try { const fallbackDoc = await addDoc(collection(db, "payments"), { userId: window.currentUserData.uid, email: window.currentUserData.email, amountPaid: window.currentTotalPayable, creditsRequested: window.currentRechargeCredits, wantsVip: window.currentWantsVip, vipDaysRequested: window.currentVipDays, vipPlanFee: window.currentVipPlanFee, utrNumber: "ONLINE_UPI", timestamp: new Date(), status: "Pending" }); window.currentActiveOrderId = fallbackDoc.id; } catch (e) {} } finally { if (btn) { btn.disabled = false; btn.innerHTML = origBtnHtml; } }

    document.getElementById('upiQRCode').src = qrUrl; 
    document.getElementById('qrPayableAmountText').innerText = `कुल पेमेंट: ₹${window.currentTotalPayable}`;
    
    // Setting App Specific Deep Links
    const paytmLink = `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(pName)}&am=${window.currentTotalPayable}&cu=INR&tn=${encodeURIComponent(note)}`;
    const phonepeLink = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(pName)}&am=${window.currentTotalPayable}&cu=INR&tn=${encodeURIComponent(note)}`;
    const gpayLink = `tez://upi/pay?pa=${upiId}&pn=${encodeURIComponent(pName)}&am=${window.currentTotalPayable}&cu=INR&tn=${encodeURIComponent(note)}`;

    document.getElementById('btnPaytm').href = paytmLink;
    document.getElementById('btnPhonePe').href = phonepeLink;
    document.getElementById('btnGPay').href = gpayLink;
    
    document.getElementById('paymentStep1').style.display = 'none'; 
    document.getElementById('qrSection').style.display = 'flex';
};

window.cancelAndBackToPaymentStep1 = async function() {
    if (window.activePaymentUnsubscribe) { window.activePaymentUnsubscribe(); window.activePaymentUnsubscribe = null; }
    if (window.currentActiveOrderId) { const orderIdToCancel = window.currentActiveOrderId; window.currentActiveOrderId = null; try { await updateDoc(doc(db, "payments", orderIdToCancel), { status: "Cancelled", cancelledBy: "User (Back without Payment)", cancelledAt: new Date() }); } catch (e) {} }
    document.getElementById('qrSection').style.display = 'none'; document.getElementById('paymentStep1').style.display = 'block'; alert("Payment Cancelled.");
};

window.togglePaymentTicketBox = function() { const box = document.getElementById('paymentIssueTicketBox'); if (!box) return; box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
window.submitPaymentIssueTicket = async function() { const rawUtr = document.getElementById('ticketUtrInput')?.value.trim() || ''; const utr = rawUtr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(); const resMsg = document.getElementById('paymentTicketResultMsg'); const btn = document.getElementById('btnRaisePaymentTicket'); if (!utr || utr.length < 10) return alert("कृपया 12-अंकों का UTR नंबर दर्ज करें!"); const origHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submit...'; const ticketMsgText = `💳 [PAYMENT TICKET]\nAmount: ₹${window.currentTotalPayable}\nCredits: +${window.currentRechargeCredits} Cr\nUTR: ${utr}\nOrder ID:${window.currentActiveOrderId || 'N/A'}`; try { if (window.currentActiveOrderId) { try { await updateDoc(doc(db, "payments", window.currentActiveOrderId), { utrNumber: utr, status: "Pending (Ticket Raised)", ticketRaisedAt: new Date() }); } catch (e) {} } const uid = window.currentUserData.uid; const chatRef = doc(db, "supportTickets", uid); const existingMsgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : []; existingMsgs.push({ sender: 'user', text: ticketMsgText, time: Date.now() }); await setDoc(chatRef, { type: 'PAYMENT_ISSUE_TICKET', userId: uid, userIdentifier: window.currentUserData.email, username: window.currentUserData.username, message: `Payment UTR: ${utr}`, status: 'Open', unreadByAdmin: true, unreadByUser: false, timestamp: new Date(), updatedAtMs: Date.now(), messages: existingMsgs }, { merge: true }); notifyAdminSecurely({ type: "PAYMENT_UTR_TICKET", user: window.currentUserData.email, amount: window.currentTotalPayable, utr: utr }); resMsg.className = "p-3.5 rounded-xl bg-green-50 border border-green-300 text-green-900 text-xs font-bold text-center mt-2"; resMsg.innerHTML = `टिकट रेज़ हो गया! (UTR: ${utr})`; resMsg.style.display = 'block'; document.getElementById('ticketUtrInput').value = ''; } catch (err) { alert("Error: " + err.message); } finally { btn.disabled = false; btn.innerHTML = origHtml; } };

window.openPdfViewer = async function(fileId, fileName, historyIndex = -1) { /* Same PDF Viewer logic as before */ };
window.closePdfViewer = function() { /* close PDF logic */ };

// === DATE FILTER IN USER HISTORY ===
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
    const startDateVal = document.getElementById('userHistoryStartDate')?.value;
    const endDateVal = document.getElementById('userHistoryEndDate')?.value;
    
    let filteredData = window.historyData.map((item, idx) => ({ ...item, _origIndex: idx }));
    
    // Type Filter
    if (filterType !== 'ALL') {
        filteredData = filteredData.filter(item => item.serviceType === filterType);
    }
    
    // Date Filter Logic
    if (startDateVal || endDateVal) {
        filteredData = filteredData.filter(item => {
            if (!item.timestamp || !item.timestamp.seconds) return true;
            const itemTime = item.timestamp.seconds * 1000;
            const startMs = startDateVal ? new Date(startDateVal).setHours(0, 0, 0, 0) : 0;
            const endMs = endDateVal ? new Date(endDateVal).setHours(23, 59, 59, 999) : Infinity;
            return itemTime >= startMs && itemTime <= endMs;
        });
    }
    
    document.getElementById('userHistoryCount').innerText = `Total Files: ${filteredData.length}`;

    if (filteredData.length === 0) { historyContainer.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400 text-xs"><i class="fa-regular fa-folder-open text-3xl mb-2 text-slate-300"></i><br>No records found.</td></tr>`; return; }

    filteredData.forEach((data) => {
        const sec = data.timestamp?.seconds || Math.floor(Date.now() / 1000); const dateObj = new Date(sec * 1000);
        const dateStr = dateObj.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}); const timeStr = dateObj.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
        historyContainer.innerHTML += `
            <tr class="border-b border-slate-100 text-xs hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-800">${data.fileName}</td>
                <td class="p-3"><span class="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">${data.serviceType}</span></td>
                <td class="p-3 text-slate-500 text-[11px] font-medium">${dateStr} <br>${timeStr}</td>
                <td class="p-3 text-right whitespace-nowrap"><button onclick="window.openPdfViewer('${data.fileId}', '${data.fileName}',${data._origIndex})" class="inline-flex items-center gap-1 bg-royal-50 text-royal-700 border border-royal-200 hover:bg-royal-600 hover:text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition shadow-sm"><i class="fa-solid fa-eye"></i> Preview / PDF</button></td>
            </tr>
        `;
    });
};

window.switchService = async function(serviceName) {
    if (!serviceName) serviceName = window.getFirstAllowedTab();
    if (window.currentUserData?.hasFreeAccess && (serviceName === 'add_credit' || serviceName === 'payments_history')) serviceName = window.getFirstAllowedTab();
    
    if (serviceName === 'domicile' && !window.canCurrentUserSeeService('domicile')) serviceName = window.getFirstAllowedTab(); 
    else if (serviceName === 'caste' && !window.canCurrentUserSeeService('caste')) serviceName = window.getFirstAllowedTab(); 
    else if (serviceName === 'dob18' && !window.canCurrentUserSeeService('dob18')) serviceName = window.getFirstAllowedTab();
    else if (serviceName === 'dob_minor' && !window.canCurrentUserSeeService('dob_minor')) serviceName = window.getFirstAllowedTab();
    else if (serviceName === 'passport' && !window.canCurrentUserSeeService('passport')) serviceName = window.getFirstAllowedTab();

    window.currentActiveTab = serviceName;
    sessionStorage.setItem('ojas_active_tab', serviceName); 

    document.querySelectorAll('.service-tab').forEach(btn => { btn.className = "service-tab bg-dark-900 text-royal-300 font-bold py-2.5 px-3 rounded-xl hover:bg-dark-800 transition shadow-sm border border-slate-700 text-xs md:text-sm flex-1 flex justify-center items-center gap-1.5"; });
    document.querySelectorAll('.vip-tab').forEach(btn => { btn.className = "vip-tab bg-dark-800 text-royal-300 border border-royal-500/30 font-bold py-2 px-2.5 rounded-xl hover:bg-dark-700 transition text-[11px] md:text-xs flex items-center justify-center gap-1 shadow-sm"; });

    let tabIdToHighlight = serviceName.startsWith('annexure') ? 'annexures' : serviceName; const activeBtn = document.getElementById('btn-' + tabIdToHighlight);
    if (activeBtn) { if (activeBtn.classList.contains('vip-tab')) { activeBtn.className = "vip-tab bg-white text-dark-950 font-black py-2 px-2.5 rounded-xl shadow-vip-glow transition text-[11px] md:text-xs flex items-center justify-center gap-1 border-2 border-royal-400"; } else { activeBtn.className = "service-tab bg-white text-dark-950 font-black py-2.5 px-3 rounded-xl shadow-glow transition text-xs md:text-sm flex-1 flex justify-center items-center gap-1.5 border-2 border-royal-500"; } }

    window.applyLivePortalControls(); const container = document.getElementById('formContainer'); if (!container) return;
    const submitBtnText = window.currentUserData && window.currentUserData.hasFreeAccess ? 'Generate Document <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>' : 'Generate (10 Credits) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>';
    const statusTagHtml = window.currentUserData && window.currentUserData.hasFreeAccess ? '<span class="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-[10px] font-black border border-green-300 uppercase"><i class="fa-solid fa-crown mr-1"></i>Lifetime VIP Free</span>' : (window.currentUserData && window.currentUserData.isVip ? '<span class="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-[10px] font-black border border-amber-300 uppercase"><i class="fa-solid fa-crown mr-1"></i>10 Credits</span>' : '<span class="bg-royal-100 text-royal-900 px-2.5 py-1 rounded-md text-[10px] font-black border border-royal-300 uppercase">10 Credits</span>');

    if (serviceName === 'password') { /* Password UI Logic is there */ return; }
    
    // Updated Add Credit Mobile Payment UI 
    if (serviceName === 'add_credit') {
        container.innerHTML = `
        <div id="walletMainUI" class="max-w-xl mx-auto space-y-4">
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4"><h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-wallet text-royal-500 mr-1.5"></i> Add Credits & VIP</h3></div>
            <div id="paymentStep1" class="space-y-4">
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200"><label class="block text-xs font-black text-slate-700 uppercase mb-2">1. Enter Amount (₹)</label><input type="number" id="rupeeAmount" min="100" placeholder="Minimum ₹100" oninput="window.calculateCredits()" class="w-full p-3 border border-slate-300 rounded-xl text-lg font-black outline-none focus:border-royal-500"></div>
                <div class="bg-amber-50 p-4 rounded-2xl border border-amber-200"><label class="block text-xs font-black text-amber-900 uppercase mb-2"><i class="fa-solid fa-crown text-amber-500 mr-1"></i> 2. Select VIP Plan (Optional)</label><div class="space-y-2"><label class="flex items-center gap-2 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer"><input type="radio" name="vipPlanOption" value="0" data-price="0" checked onchange="window.calculateCredits()" class="accent-amber-600 w-4 h-4"><span class="text-sm font-bold text-amber-950">No VIP (Only Credits)</span></label><label class="flex items-center gap-2 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer"><input type="radio" name="vipPlanOption" value="30" data-price="149" onchange="window.calculateCredits()" class="accent-amber-600 w-4 h-4"><span class="text-sm font-bold text-amber-950">30 Days VIP (+₹149)</span></label><label class="flex items-center gap-2 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer"><input type="radio" name="vipPlanOption" value="60" data-price="249" onchange="window.calculateCredits()" class="accent-amber-600 w-4 h-4"><span class="text-sm font-bold text-amber-950">60 Days VIP (+₹249)</span></label><label class="flex items-center gap-2 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer"><input type="radio" name="vipPlanOption" value="90" data-price="299" onchange="window.calculateCredits()" class="accent-amber-600 w-4 h-4"><span class="text-sm font-bold text-amber-950">90 Days VIP (+₹299)</span></label></div></div>
                <div class="bg-dark-950 p-4 rounded-2xl text-white"><div class="flex justify-between items-center mb-2"><span class="text-xs font-bold text-slate-400">Credits You Get:</span><span id="calculatedCredits" class="text-lg font-black text-emerald-400">0 Cr</span></div><div class="flex justify-between items-center mb-4 pb-4 border-b border-slate-800"><span class="text-xs font-bold text-slate-400">VIP Status:</span><span id="vipSummaryBadge" style="display:none;" class="bg-amber-400 text-dark-950 text-[10px] font-black px-2 py-0.5 rounded-full"></span></div><div class="flex justify-between items-center mb-4"><span class="text-sm font-black uppercase text-royal-300">Total Payable:</span><span id="totalPayableDisplay" class="text-2xl font-black text-white">₹0</span></div><button id="btnGenerateQR" onclick="window.generateQR()" class="w-full bg-royal-500 hover:bg-royal-400 text-dark-950 font-black py-3.5 rounded-xl shadow-glow transition">Proceed to Pay</button></div>
            </div>
            
            <div id="qrSection" style="display:none;" class="flex-col items-center justify-center space-y-4">
                <div class="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-200 text-center w-full max-w-sm mx-auto">
                    <h4 class="text-sm font-black text-dark-900 mb-1">Scan & Pay</h4><p id="qrPayableAmountText" class="text-xs font-bold text-slate-500 mb-4">कुल पेमेंट: ₹0</p>
                    
                    <div class="bg-slate-50 p-2 rounded-2xl inline-block border border-slate-200 mb-4"><img id="upiQRCode" src="" class="w-48 h-48 object-contain"></div>
                    
                    <!-- NEW MOBILE APP BUTTONS -->
                    <div class="grid grid-cols-3 gap-2 mb-3">
                        <a id="btnPhonePe" href="#" class="flex flex-col items-center justify-center p-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition"><img src="https://cdn.iconscout.com/icon/free/png-256/free-phonepe-logo-icon-download-in-svg-png-gif-file-formats--technology-social-media-company-brand-vol-5-pack-logos-icons-2945037.png?f=webp" class="w-6 h-6 mb-1"><span class="text-[10px] font-bold text-purple-900">PhonePe</span></a>
                        <a id="btnGPay" href="#" class="flex flex-col items-center justify-center p-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition"><img src="https://cdn-icons-png.flaticon.com/512/6124/6124998.png" class="w-6 h-6 mb-1"><span class="text-[10px] font-bold text-blue-900">GPay</span></a>
                        <a id="btnPaytm" href="#" class="flex flex-col items-center justify-center p-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 transition"><img src="https://cdn.iconscout.com/icon/free/png-256/free-paytm-logo-icon-download-in-svg-png-gif-file-formats--technology-social-media-company-brand-vol-5-pack-logos-icons-2945092.png?f=webp" class="w-6 h-6 mb-1"><span class="text-[10px] font-bold text-sky-900">Paytm</span></a>
                    </div>
                    
                    <button onclick="window.cancelAndBackToPaymentStep1()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-xl transition text-xs">Cancel & Go Back</button>
                </div>
            </div>
        </div>`;
        window.calculateCredits(); return;
    }

    if (window.renderServiceFormHtml(serviceName, container, submitBtnText, statusTagHtml)) return;
    
    if (serviceName === 'history') { 
        const cfg = window.portalConfigState; const isVipUser = window.currentUserData && window.currentUserData.isVip; 
        const canShowDob = window.canCurrentUserSeeService('dob18'); 
        const canShowDobMinor = window.canCurrentUserSeeService('dob_minor'); 
        const canShowPass = window.canCurrentUserSeeService('passport'); 
        
        container.innerHTML = `
        <div class="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-3 mb-4">
            <div><h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-folder-open text-royal-500 mr-1.5"></i> Document History</h3><p id="userHistoryCount" class="text-[11px] font-bold text-royal-600">Total Files: 0</p></div>
            <div class="flex items-center gap-2">
                <button onclick="window.loadUserHistory()" class="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-200"><i class="fa-solid fa-rotate-right"></i></button>
            </div>
        </div>
        <!-- DATE FILTERS -->
        <div class="flex flex-wrap gap-2 mb-3">
            <input type="date" id="userHistoryStartDate" onchange="window.renderHistory(document.getElementById('userHistoryTypeFilter').value)" class="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold outline-none flex-1">
            <input type="date" id="userHistoryEndDate" onchange="window.renderHistory(document.getElementById('userHistoryTypeFilter').value)" class="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold outline-none flex-1">
            <select id="userHistoryTypeFilter" onchange="window.renderHistory(this.value)" class="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold outline-none flex-1">
                <option value="ALL">All Documents</option>
                ${cfg.showDomicile ? `<option value="Domicile">मूल निवास</option>` : ''}
                ${cfg.showCaste ? `<option value="Caste">जाति</option>` : ''}
                ${(isVipUser && canShowDob) ? `<option value="DOB Meerut 18+">DOB Meerut</option>` : ''}
                ${(isVipUser && canShowDobMinor) ? `<option value="DOB Delhi 18+">DOB Delhi</option>` : ''}
                ${(isVipUser && canShowPass) ? `<option value="Passport">Passport</option>` : ''}
                ${isVipUser ? `<option value="Annexure 1">Annexure 1</option><option value="Annexure 1A">Annexure 1A</option><option value="Annexure 3">Annexure 3</option><option value="Annexure 3A">Annexure 3A</option><option value="Annexure B">Annexure B</option><option value="Annexure C">Annexure C</option><option value="Annexure D">Annexure D</option><option value="Annexure E">Annexure E</option><option value="Annexure F">Annexure F</option>` : ''}
            </select>
        </div>
        <div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left border-collapse bg-white min-w-[500px]"><thead class="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase"><tr><th class="p-3">File Name</th><th class="p-3">Type</th><th class="p-3">Date & Time</th><th class="p-3 text-right">Action</th></tr></thead><tbody id="historyTableBody" class="text-xs text-slate-700"></tbody></table></div>`; 
        window.loadUserHistory(); 
    }
};
// ... (Rest of Payment and History functions remain same as logic is updated above)
