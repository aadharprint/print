// ============================================================================
// FILE 3: js/portal-wallet-chat.js (UPDATED)
// (Auth, Per-User DOB Stealth, Active=White/Inactive=Dark Tabs, Wallet, Chat & User Preview Fix)
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

window.canCurrentUserSeeDob18 = function() { const globalDob = window.portalConfigState.showDob18 !== false; const userDob = window.currentUserData ? (window.currentUserData.allowDob18 !== false) : true; return globalDob && userDob; };
async function notifyAdminSecurely(payload) { try { await fetch('/api/notify-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (e) {} }

window.openForgotPasswordModal = function() { const modal = document.getElementById('forgotPasswordModal'); const idInp = document.getElementById('forgotUserIdInput'); const phoneInp = document.getElementById('forgotUserPhoneInput'); const noteInp = document.getElementById('forgotUserNoteInput'); const resBox = document.getElementById('forgotResultBox'); if (!modal) return; resBox.style.display = 'none'; idInp.value = document.getElementById('loginUsername')?.value.trim() || ''; phoneInp.value = ''; noteInp.value = ''; modal.style.display = 'flex'; };
window.closeForgotPasswordModal = function() { const modal = document.getElementById('forgotPasswordModal'); if (modal) modal.style.display = 'none'; };
window.submitForgotPasswordTicket = async function(event) { event.preventDefault(); const userIdText = document.getElementById('forgotUserIdInput').value.trim(); const userPhoneText = document.getElementById('forgotUserPhoneInput').value.trim(); const userNoteText = document.getElementById('forgotUserNoteInput').value.trim(); const btn = document.getElementById('btnSubmitForgotTicket'); const resBox = document.getElementById('forgotResultBox'); if (!userIdText || !userPhoneText) return alert("कृपया अपनी User ID और मोबाइल/WhatsApp नंबर ज़रूर भरें!"); const origHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Raising Ticket...'; const finalMessage = userNoteText || "मैं अपना पासवर्ड भूल गया हूँ, कृपया नया पासवर्ड जारी करें।"; try { await addDoc(collection(db, "supportTickets"), { type: "FORGOT_PASSWORD", userIdentifier: userIdText, userPhone: userPhoneText, message: `🔑 Forgot Password Request: ${finalMessage} (WhatsApp: ${userPhoneText})`, messages: [{ sender: 'user', text: `🔑 [FORGOT PASSWORD TICKET]\nUser ID: ${userIdText}\nWhatsApp: ${userPhoneText}\nNote: ${finalMessage}`, time: Date.now() }], status: "Open", unreadByAdmin: true, unreadByUser: false, timestamp: new Date(), updatedAtMs: Date.now() }); try { await addDoc(collection(db, "forgotTickets"), { userIdentifier: userIdText, userPhone: userPhoneText, note: finalMessage, status: "Pending", timestamp: new Date() }); } catch (e) {} notifyAdminSecurely({ type: "FORGOT_PASSWORD", userId: userIdText, phone: userPhoneText, message: finalMessage }); resBox.className = "p-3.5 rounded-2xl bg-green-50 border border-green-300 text-green-900 text-xs font-bold text-center space-y-1"; resBox.innerHTML = `<div><i class="fa-solid fa-circle-check text-green-600 text-base mr-1"></i> आपका टिकट सफलतापूर्वक रेज़ हो गया है!</div><p class="text-[11px] text-green-700">एडमिन को सूचना भेज दी गई है। जल्द ही आपके नंबर (${userPhoneText}) पर नया पासवर्ड भेज दिया जाएगा。</p>`; resBox.style.display = 'block'; event.target.reset(); } catch (err) { alert("टिकट भेजने में समस्या आई: " + err.message); } finally { btn.disabled = false; btn.innerHTML = origHtml; } };

function startUserSupportChatListener(uid) { if (window.userChatUnsubscribe) window.userChatUnsubscribe(); window.userChatUnsubscribe = onSnapshot(doc(db, "supportTickets", uid), async (snap) => { if (snap.exists()) { window.currentUserChatData = snap.data(); } else { window.currentUserChatData = { messages: [], unreadByUser: false }; } const isUnread = window.currentUserChatData.unreadByUser === true; const headerBadge = document.getElementById('headerSupportUnreadBadge'); const gearBadge = document.getElementById('gearSupportUnreadBadge'); if (window.currentActiveTab === 'support_chat') { if (isUnread) { try { await updateDoc(doc(db, "supportTickets", uid), { unreadByUser: false }); } catch (e) {} } if (headerBadge) headerBadge.style.display = 'none'; if (gearBadge) gearBadge.style.display = 'none'; window.renderUserLiveChatMessages(); } else { if (headerBadge) { headerBadge.innerText = '1'; headerBadge.style.display = isUnread ? 'inline-flex' : 'none'; } if (gearBadge) { gearBadge.innerText = 'New'; gearBadge.style.display = isUnread ? 'inline-block' : 'none'; } } }); }
window.renderUserLiveChatMessages = function() { const box = document.getElementById('userLiveChatMessagesBox'); if (!box) return; let msgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : []; if (msgs.length === 0 && window.currentUserChatData?.message) msgs.push({ sender: 'user', text: window.currentUserChatData.message, time: Date.now() }); if (msgs.length === 0) { box.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400"><div class="w-12 h-12 rounded-full bg-royal-50 text-royal-500 flex items-center justify-center text-xl mb-2 border border-royal-200"><i class="fa-solid fa-comments"></i></div><p class="text-xs font-black text-slate-600">Ojas Live Support Chat</p><p class="text-[11px] text-slate-400 mt-0.5">कोई भी समस्या या सवाल नीचे लिखकर भेजें। एडमिन का रिप्लाई यहीं इसी चैट में लाइव दिखेगा।</p></div>`; return; } box.innerHTML = msgs.map(m => { const isMe = m.sender === 'user'; const tStr = m.time ? new Date(m.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : ''; const safeText = String(m.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); if (isMe) { return `<div class="flex justify-end"><div class="max-w-[80%] bg-dark-900 text-white px-3.5 py-2.5 rounded-2xl rounded-br-none shadow-sm"><p class="text-xs font-semibold whitespace-pre-line leading-relaxed">${safeText}</p><span class="block text-[9px] text-royal-300 text-right mt-1 opacity-80">${tStr} • You</span></div></div>`; } else { return `<div class="flex justify-start"><div class="max-w-[80%] bg-amber-50 border border-amber-300 text-slate-900 px-3.5 py-2.5 rounded-2xl rounded-bl-none shadow-sm"><span class="text-[10px] font-black text-amber-800 uppercase block mb-0.5"><i class="fa-solid fa-crown text-amber-500 mr-1"></i>Admin Support</span><p class="text-xs font-bold whitespace-pre-line leading-relaxed">${safeText}</p><span class="block text-[9px] text-slate-400 text-right mt-1">${tStr}</span></div></div>`; } }).join(''); box.scrollTop = box.scrollHeight; };
window.sendUserSupportMessage = async function(event) { event.preventDefault(); if (!window.currentUserData) return; const inp = document.getElementById('userSupportChatInput'); const btn = document.getElementById('btnSendUserChat'); const text = inp.value.trim(); if (!text) return; inp.value = ''; btn.disabled = true; const uid = window.currentUserData.uid; try { const existingMsgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : []; existingMsgs.push({ sender: 'user', text: text, time: Date.now() }); await setDoc(doc(db, "supportTickets", uid), { type: 'USER_SUPPORT_CHAT', userId: uid, userIdentifier: window.currentUserData.email, username: window.currentUserData.username, message: text, status: 'Open', unreadByAdmin: true, unreadByUser: false, timestamp: new Date(), updatedAtMs: Date.now(), messages: existingMsgs }, { merge: true }); } catch (err) { alert("मैसेज भेजने में समस्या आई: " + err.message); } finally { btn.disabled = false; inp.focus(); } };

function startUserProfileListener(uid) { if (window.userProfileUnsubscribe) window.userProfileUnsubscribe(); window.userProfileUnsubscribe = onSnapshot(doc(db, "users", uid), (snap) => { if (!snap.exists() || !window.currentUserData) return; const data = snap.data(); window.currentUserData.credits = data.credits || 0; window.currentUserData.allowDob18 = data.allowDob18 !== false; const creditEl = document.getElementById('displayCredits'); if (creditEl) creditEl.innerText = window.currentUserData.credits; const now = Date.now(); const isNowVip = window.currentUserData.hasFreeAccess || (data.isVip && (!data.vipExpiry || data.vipExpiry > now)); const vipChanged = window.currentUserData.isVip !== isNowVip; window.currentUserData.isVip = isNowVip; window.currentUserData.vipExpiry = window.currentUserData.hasFreeAccess ? 0 : (data.vipExpiry || 0); if (vipChanged) setupDashboard(window.currentUserData); else window.applyLivePortalControls(); }); }
function startPortalSettingsListener() { if (window.portalSettingsUnsubscribe) window.portalSettingsUnsubscribe(); window.portalSettingsUnsubscribe = onSnapshot(doc(db, "settings", "portalConfig"), (snap) => { if (snap.exists()) { const data = snap.data(); window.portalConfigState = { showDomicile: data.showDomicile !== false, showCaste: data.showCaste !== false, showDob18: data.showDob18 !== false, bannerEnabled: !!data.bannerEnabled, bannerBadge: data.bannerBadge || "UPDATE", bannerTitle: data.bannerTitle || "", bannerMessage: data.bannerMessage || "", bannerBtnText: data.bannerBtnText || "", bannerBtnLink: data.bannerBtnLink || "" }; } window.applyLivePortalControls(); }); }

window.applyLivePortalControls = function() {
    const cfg = window.portalConfigState; const canShowDob = window.canCurrentUserSeeDob18(); const bannerBox = document.getElementById('liveUpdateBannerContainer');
    if (bannerBox) { if (cfg.bannerEnabled && (cfg.bannerTitle || cfg.bannerMessage)) { bannerBox.style.display = 'block'; const btnHtml = (cfg.bannerBtnText && cfg.bannerBtnLink) ? `<a href="${cfg.bannerBtnLink}" target="_blank" class="bg-amber-400 hover:bg-amber-300 text-dark-950 font-black px-3.5 py-1.5 rounded-xl text-[11px] transition shrink-0 shadow-sm">${cfg.bannerBtnText} <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-[9px]"></i></a>` : ''; bannerBox.innerHTML = `<div class="p-3.5 rounded-2xl bg-gradient-to-r from-dark-950 via-slate-900 to-indigo-950 text-white border border-royal-400/60 shadow-md"><div class="flex flex-wrap items-center justify-between gap-2.5"><div class="flex items-start sm:items-center gap-2.5"><span class="bg-royal-500 text-dark-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 mt-0.5 sm:mt-0"><i class="fa-solid fa-bullhorn mr-1"></i>${cfg.bannerBadge}</span><div>${cfg.bannerTitle ? `<h4 class="text-xs md:text-sm font-black text-royal-300">${cfg.bannerTitle}</h4>` : ''}${cfg.bannerMessage ? `<p class="text-[11px] font-semibold text-slate-200 mt-0.5">${cfg.bannerMessage}</p>` : ''}</div></div>${btnHtml}</div></div>`; } else { bannerBox.style.display = 'none'; bannerBox.innerHTML = ''; } }
    const stdGrid = document.getElementById('standardServicesGrid'); const btnDom = document.getElementById('btn-domicile'); const btnCas = document.getElementById('btn-caste'); const btnDob = document.getElementById('btn-dob18'); const promoDesc = document.getElementById('normalPromoTextDesc'); const vipHeaderLabel = document.getElementById('vipBarTitleLabel');
    if (btnDom) btnDom.style.setProperty('display', cfg.showDomicile ? 'flex' : 'none', 'important'); if (btnCas) btnCas.style.setProperty('display', cfg.showCaste ? 'flex' : 'none', 'important');
    if (stdGrid) { if (!cfg.showDomicile && !cfg.showCaste) { stdGrid.style.setProperty('display', 'none', 'important'); } else if (cfg.showDomicile && cfg.showCaste) { stdGrid.style.setProperty('display', 'grid', 'important'); stdGrid.className = "grid grid-cols-2 gap-2.5 mb-3"; } else { stdGrid.style.setProperty('display', 'grid', 'important'); stdGrid.className = "grid grid-cols-1 gap-2.5 mb-3"; } }
    if (btnDob) btnDob.style.setProperty('display', canShowDob ? 'flex' : 'none', 'important');
    if (promoDesc) promoDesc.innerHTML = canShowDob ? `VIP लें: <strong>18+ DOB & सारे 9 Official Annexures</strong> अनलॉक करें (सभी डॉक्यूमेंट 10 Cr)!` : `VIP लें: <strong>सारे 9 Official Annexures</strong> अनलॉक करें (सभी डॉक्यूमेंट 10 Cr)!`;
    if (vipHeaderLabel) vipHeaderLabel.innerHTML = canShowDob ? `<i class="fa-solid fa-crown text-royal-400"></i> VIP Services (DOB & All Annexures)` : `<i class="fa-solid fa-crown text-royal-400"></i> VIP Services (All 9 Annexures)`;
    if ((window.currentActiveTab === 'domicile' && !cfg.showDomicile) || (window.currentActiveTab === 'caste' && !cfg.showCaste) || (window.currentActiveTab === 'dob18' && !canShowDob)) { window.switchService(window.getFirstAllowedTab()); }
};

window.getFirstAllowedTab = function() { const cfg = window.portalConfigState; if (cfg.showDomicile) return 'domicile'; if (cfg.showCaste) return 'caste'; if (window.currentUserData && window.currentUserData.isVip) return window.canCurrentUserSeeDob18() ? 'dob18' : 'annexure1'; return 'history'; };
document.addEventListener('click', (e) => { const menu = document.getElementById('gearDropdownMenu'); const btn = document.getElementById('gearMenuBtn'); if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) menu.classList.add('hidden'); });
window.toggleGearMenu = function(e) { if (e) e.stopPropagation(); const menu = document.getElementById('gearDropdownMenu'); if (menu) menu.classList.toggle('hidden'); };
window.selectGearOption = function(serviceName) { const menu = document.getElementById('gearDropdownMenu'); if (menu) menu.classList.add('hidden'); window.switchService(serviceName); };

onAuthStateChanged(auth, async (user) => {
    const loadingScreen = document.getElementById('loadingScreen'); const loginSection = document.getElementById('loginSection'); const dashboardSection = document.getElementById('dashboardSection');
    if (user) {
        try {
            const emailLower = user.email.trim().toLowerCase(); if (!window.isAllowedPortalEmail(emailLower)) { await signOut(auth); alert("अमान्य आईडी! पोर्टल पर केवल @print.com डोमेन वाली आईडी ही मान्य है।"); loadingScreen.style.display = 'none'; return; }
            try { const cfgSnap = await getDoc(doc(db, "settings", "portalConfig")); if (cfgSnap.exists()) { const d = cfgSnap.data(); window.portalConfigState = { showDomicile: d.showDomicile !== false, showCaste: d.showCaste !== false, showDob18: d.showDob18 !== false, bannerEnabled: !!d.bannerEnabled, bannerBadge: d.bannerBadge || "UPDATE", bannerTitle: d.bannerTitle || "", bannerMessage: d.bannerMessage || "", bannerBtnText: d.bannerBtnText || "", bannerBtnLink: d.bannerBtnLink || "" }; } } catch (e) {}
            const userDocRef = doc(db, "users", user.uid); const userDoc = await getDoc(userDocRef); let userCredits = 0, isVip = false, vipExpiry = 0, allowDob18 = true;
            if (userDoc.exists()) { const data = userDoc.data(); userCredits = data.credits || 0; isVip = data.isVip || false; vipExpiry = data.vipExpiry || 0; allowDob18 = data.allowDob18 !== false; }
            const isAdmin = (emailLower === window.ADMIN_EMAIL); const isFreeVip = window.FREE_VIP_EMAILS.includes(emailLower); const hasFreeAccess = isAdmin || isFreeVip; const now = Date.now();
            if (!hasFreeAccess && isVip && vipExpiry > 0 && vipExpiry <= now) { isVip = false; vipExpiry = 0; await updateDoc(userDocRef, { isVip: false, vipExpiry: 0 }); }
            window.currentUserData = { uid: user.uid, email: user.email, credits: userCredits, isVip: isVip || hasFreeAccess, vipExpiry: hasFreeAccess ? 0 : vipExpiry, allowDob18: allowDob18, isAdmin: isAdmin, isFreeVip: isFreeVip, hasFreeAccess: hasFreeAccess, username: user.email.split('@')[0] };
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

// User PDF Viewer Updated to Stack Certificate and HTML side-by-side
window.openPdfViewer = async function(fileId, fileName, historyIndex = -1) {
    document.getElementById('pdfViewerTitle').innerText = fileName;
    const iframe = document.getElementById('pdfIframe'); const htmlPreviewContainer = document.getElementById('htmlDocPreviewContainer');
    const spinner = document.getElementById('pdfLoadingSpinner'); const downloadBtn = document.getElementById('modalDownloadBtn');
    const printBtn = document.getElementById('modalPrintBtn'); const modalStampLabel = document.getElementById('modalStampToggleLabel');
    const modalStampCheckbox = document.getElementById('modalStampCheckbox'); const shareBtn = document.getElementById('modalShareBtn');

    const isAnnexure = String(fileId).startsWith('LOCAL_HTML_');
    let initialWithStamp = false, initialStampSrc = '', initialStampFile = '', initialCertFileId = '';

    if (historyIndex >= 0) {
        const existingState = window.stampSelectionMap ? window.stampSelectionMap[historyIndex] : null;
        initialWithStamp = !!(existingState && existingState.enabled); initialStampSrc = existingState?.stampSrc || ''; initialStampFile = existingState?.stampFile || '';
        const record = (window.historyData && window.historyData[historyIndex]) || (window.adminAllHistoryData && window.adminAllHistoryData[historyIndex]);
        initialCertFileId = record?.certificateFileId || ''; // Fetch cert file ID if available
    }

    if (initialWithStamp && !initialStampSrc && typeof window.preloadAllAvailableStamps === 'function') {
        if (window.availableStampsList && window.availableStampsList.length === 0) await window.preloadAllAvailableStamps();
        if(window.pickRandomAvailableStampObj){ const chosenObj = window.pickRandomAvailableStampObj(); initialStampSrc = chosenObj.dataUrl; initialStampFile = chosenObj.name; }
    }

    window.currentModalContext = { fileId: fileId, fileName: fileName, historyIndex: historyIndex, withStamp: initialWithStamp, stampFile: initialStampFile, stampSrc: initialStampSrc, certificateFileId: initialCertFileId };
    
    // Container को कॉलम (Stack) में बदलें
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
            // अगर सर्टिफिकेट अटैच है: ऊपर सर्टिफिकेट, नीचे एनेक्सर
            iframe.style.display = 'block';
            iframe.style.flex = '1';
            iframe.style.minHeight = '350px';
            iframe.style.borderBottom = '4px solid #cbd5e1';
            iframe.src = `https://drive.google.com/file/d/${initialCertFileId}/preview`;
            
            htmlPreviewContainer.style.display = 'flex';
            htmlPreviewContainer.style.flex = '1';
            htmlPreviewContainer.style.minHeight = '350px';
            htmlPreviewContainer.innerHTML = window.buildLocalAffidavitHtml(fileId, fData, true, initialWithStamp, initialStampSrc);
        } else {
            // केवल एनेक्सर
            iframe.style.display = 'none';
            htmlPreviewContainer.style.display = 'flex';
            htmlPreviewContainer.style.flex = '1';
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
        if (data.certificateFileId) { badgesHtml += `<span class="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded-full text-[10px] font-black ml-1.5"><i class="fa-solid fa-certificate mr-0.5"></i>Cert</span>`; }
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

window.switchService = async function(serviceName) {
    const cfg = window.portalConfigState; const canShowDob = window.canCurrentUserSeeDob18();
    if (window.currentUserData?.hasFreeAccess && (serviceName === 'add_credit' || serviceName === 'payments_history')) serviceName = window.getFirstAllowedTab();
    if (serviceName === 'domicile' && !cfg.showDomicile) serviceName = window.getFirstAllowedTab(); else if (serviceName === 'caste' && !cfg.showCaste) serviceName = window.getFirstAllowedTab(); else if (serviceName === 'dob18' && !canShowDob) serviceName = window.getFirstAllowedTab();
    window.currentActiveTab = serviceName;
    document.querySelectorAll('.service-tab').forEach(btn => { btn.className = "service-tab bg-dark-900 text-royal-300 font-bold py-2.5 px-3 rounded-xl hover:bg-dark-800 transition shadow-sm border border-slate-700 text-xs md:text-sm flex-1 flex justify-center items-center gap-1.5"; });
    document.querySelectorAll('.vip-tab').forEach(btn => { btn.className = "vip-tab bg-dark-800 text-royal-300 border border-royal-500/30 font-bold py-2 px-2.5 rounded-xl hover:bg-dark-700 transition text-[11px] md:text-xs flex items-center justify-center gap-1 shadow-sm"; });

    let tabIdToHighlight = serviceName.startsWith('annexure') ? 'annexures' : serviceName; const activeBtn = document.getElementById('btn-' + tabIdToHighlight);
    if (activeBtn) { if (activeBtn.classList.contains('vip-tab')) { activeBtn.className = "vip-tab bg-white text-dark-950 font-black py-2 px-2.5 rounded-xl shadow-vip-glow transition text-[11px] md:text-xs flex items-center justify-center gap-1 border-2 border-royal-400"; } else { activeBtn.className = "service-tab bg-white text-dark-950 font-black py-2.5 px-3 rounded-xl shadow-glow transition text-xs md:text-sm flex-1 flex justify-center items-center gap-1.5 border-2 border-royal-500"; } }

    window.applyLivePortalControls(); const container = document.getElementById('formContainer'); if (!container) return;
    const submitBtnText = window.currentUserData && window.currentUserData.hasFreeAccess ? 'Generate Document (VIP Free) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>' : 'Generate Document (10 Credits) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>';
    const statusTagHtml = window.currentUserData && window.currentUserData.hasFreeAccess ? '<span class="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-[10px] font-black border border-green-300 uppercase"><i class="fa-solid fa-crown mr-1"></i>Lifetime VIP Free</span>' : (window.currentUserData && window.currentUserData.isVip ? '<span class="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-[10px] font-black border border-amber-300 uppercase"><i class="fa-solid fa-crown mr-1"></i>10 Credits</span>' : '<span class="bg-royal-100 text-royal-900 px-2.5 py-1 rounded-md text-[10px] font-black border border-royal-300 uppercase">10 Credits</span>');

    if (serviceName === 'dob18' && !canShowDob) return;
    if (window.renderServiceFormHtml(serviceName, container, submitBtnText, statusTagHtml)) return;
    if (serviceName === 'support_chat') { container.innerHTML = `<div class="max-w-2xl mx-auto flex flex-col h-[460px] md:h-[520px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-inner"><div class="bg-dark-950 text-white px-4 py-3 flex justify-between items-center border-b border-royal-500"><div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-xl bg-green-500/20 border border-green-400 text-green-400 flex items-center justify-center"><i class="fa-solid fa-headset text-sm"></i></div><div><h3 class="text-xs md:text-sm font-black text-white flex items-center gap-1.5">Live Admin Support Chat <span class="w-2 h-2 rounded-full bg-green-400 animate-ping"></span></h3><p class="text-[10px] text-slate-400 font-semibold">User ID: <span class="text-royal-300 font-bold">${window.currentUserData?.email || ''}</span></p></div></div><span class="text-[10px] bg-dark-800 text-royal-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold">2-Way Live</span></div><div id="userLiveChatMessagesBox" class="flex-1 p-3.5 md:p-4 overflow-y-auto space-y-3 bg-slate-100/80"></div><form onsubmit="window.sendUserSupportMessage(event)" class="p-3 bg-white border-t border-slate-200 flex gap-2"><input type="text" id="userSupportChatInput" required placeholder="यहाँ अपनी समस्या या मैसेज लिखें..." class="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs md:text-sm font-semibold bg-slate-50 focus:bg-white focus:border-royal-500 outline-none"><button type="submit" id="btnSendUserChat" class="bg-dark-900 hover:bg-black text-royal-300 font-black px-5 py-2.5 rounded-xl text-xs md:text-sm shadow-glow transition flex items-center gap-1.5 shrink-0"><span>Send</span> <i class="fa-solid fa-paper-plane text-xs"></i></button></form></div>`; window.renderUserLiveChatMessages(); if (window.currentUserData && window.currentUserChatData?.unreadByUser === true) { try { await updateDoc(doc(db, "supportTickets", window.currentUserData.uid), { unreadByUser: false }); } catch (e) {} } const headerBadge = document.getElementById('headerSupportUnreadBadge'); const gearBadge = document.getElementById('gearSupportUnreadBadge'); if (headerBadge) headerBadge.style.display = 'none'; if (gearBadge) gearBadge.style.display = 'none'; return; }
    if (serviceName === 'payments_history') { container.innerHTML = `<div class="space-y-4"><div id="userValidityInfoBox"></div><div class="grid grid-cols-3 gap-2 md:gap-4"><div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><p class="text-[10px] font-bold text-slate-400 uppercase">कुल ट्रांजैक्शन</p><p id="sumTotalTxns" class="text-lg md:text-2xl font-black text-dark-900">0</p></div><div class="p-3 rounded-xl bg-green-50 border border-green-200"><p class="text-[10px] font-bold text-green-700 uppercase">सफल (Approved)</p><p id="sumApprovedAmt" class="text-lg md:text-2xl font-black text-green-700">₹0</p></div><div class="p-3 rounded-xl bg-amber-50 border border-amber-200"><p class="text-[10px] font-bold text-amber-800 uppercase">पेंडिंग (Pending)</p><p id="sumPendingAmt" class="text-lg md:text-2xl font-black text-amber-700">₹0 (0)</p></div></div><div><div class="flex justify-between items-center mb-2"><h4 class="text-sm md:text-base font-black text-dark-900"><i class="fa-solid fa-receipt text-royal-500 mr-1.5"></i> पेमेंट और VIP हिस्ट्री</h4><button onclick="window.loadUserPayments()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-rotate-right mr-1"></i> Refresh</button></div><div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left border-collapse bg-white min-w-[520px]"><thead class="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase"><tr><th class="p-3">तारीख (Date)</th><th class="p-3">राशि</th><th class="p-3">क्रेडिट्स / VIP</th><th class="p-3">UTR / Mode</th><th class="p-3 text-right">स्टेटस</th></tr></thead><tbody id="userPaymentsTableBody" class="text-xs text-slate-700"></tbody></table></div></div></div>`; window.loadUserPayments(); return; }
    if (serviceName === 'history') { const isVipUser = window.currentUserData && window.currentUserData.isVip; const canShowDob = window.canCurrentUserSeeDob18(); const domOpt = cfg.showDomicile ? `<option value="Domicile">मूल निवास</option>` : ''; const casOpt = cfg.showCaste ? `<option value="Caste">जाति प्रमाण पत्र</option>` : ''; const dobOpt = (isVipUser && canShowDob) ? `<option value="DOB 18+">DOB (18+)</option>` : ''; const vipFilterOptions = isVipUser ? `${dobOpt}<option value="Annexure 1">Annexure 1</option><option value="Annexure 1A">Annexure 1A</option><option value="Annexure 3">Annexure 3</option><option value="Annexure 3A">Annexure 3A</option><option value="Annexure B">Annexure B</option><option value="Annexure C">Annexure C</option><option value="Annexure D">Annexure D</option><option value="Annexure E">Annexure E</option><option value="Annexure F">Annexure F</option>` : ''; container.innerHTML = `<div class="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-3 mb-4"><div><h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-folder-open text-royal-500 mr-1.5"></i> Document History</h3><p id="userHistoryCount" class="text-[11px] font-bold text-royal-600">Total Files: 0</p></div><div class="flex items-center gap-2"><select onchange="window.renderHistory(this.value)" class="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold outline-none"><option value="ALL">All Documents</option>${domOpt}${casOpt}${vipFilterOptions}</select><button onclick="window.loadUserHistory()" class="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-200"><i class="fa-solid fa-rotate-right"></i></button></div></div><div class="overflow-x-auto border border-slate-200 rounded-xl"><table class="w-full text-left border-collapse bg-white min-w-[500px]"><thead class="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase"><tr><th class="p-3">File Name</th><th class="p-3">Type</th><th class="p-3">Date & Time</th><th class="p-3 text-right">Action</th></tr></thead><tbody id="historyTableBody" class="text-xs text-slate-700"></tbody></table></div>`; window.loadUserHistory(); }
};

window.loadUserPayments = async function() {
    const tableBody = document.getElementById('userPaymentsTableBody'); if (!tableBody) return; tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 font-bold text-xs"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-royal-500"></i><br>Loading payment history...</td></tr>`;
    try { const querySnapshot = await getDocs(query(collection(db, "payments"), where("userId", "==", window.currentUserData.uid))); window.userPaymentsData = []; querySnapshot.forEach((docSnap) => { window.userPaymentsData.push({ id: docSnap.id, ...docSnap.data() }); }); window.userPaymentsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); let sumApproved = 0, sumPending = 0, pendingCount = 0; window.userPaymentsData.forEach(item => { const amt = parseFloat(item.amountPaid) || 0; if (item.status === 'Approved' || item.status === 'Auto-Approved') { sumApproved += amt; } else if (item.status === 'Pending' || (item.status || '').includes('Ticket')) { sumPending += amt; pendingCount++; } }); document.getElementById('sumTotalTxns').innerText = window.userPaymentsData.length; document.getElementById('sumApprovedAmt').innerText = `₹${sumApproved}`; document.getElementById('sumPendingAmt').innerText = `₹${sumPending} (${pendingCount})`; tableBody.innerHTML = ''; if (window.userPaymentsData.length === 0) { tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 text-xs"><i class="fa-solid fa-receipt text-3xl mb-2 text-slate-300"></i><br>आपने अभी तक कोई पेमेंट नहीं किया है।</td></tr>`; return; } window.userPaymentsData.forEach(data => { const sec = data.timestamp?.seconds || Math.floor(Date.now() / 1000); const dateObj = new Date(sec * 1000); const dateStr = dateObj.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}); const timeStr = dateObj.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'}); let statusBadge = ''; if ((data.status || '').includes('Ticket')) { statusBadge = `<span class="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-ticket mr-1"></i>Ticket Raised</span>`; } else if (data.status === 'Pending') { statusBadge = `<span class="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-clock mr-1"></i>Pending</span>`; } else if (data.status === 'Approved' || data.status === 'Auto-Approved') { statusBadge = `<span class="bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-check-circle mr-1"></i>Approved</span>`; } else { statusBadge = `<span class="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-black"><i class="fa-solid fa-circle-xmark mr-1"></i>${data.status}</span>`; } const vipDays = data.vipDaysRequested || (data.wantsVip ? 30 : 0); const creds = data.creditsRequested !== undefined ? data.creditsRequested : (data.creditsAdded || 0); tableBody.innerHTML += `<tr class="border-b border-slate-100 text-xs hover:bg-slate-50 transition"><td class="p-3 text-slate-500 font-medium">${dateStr} <br> ${timeStr}</td><td class="p-3 font-black text-slate-800 text-sm">₹${data.amountPaid || 0}</td><td class="p-3"><div class="flex flex-col gap-1"><span class="font-bold text-royal-600">+${creds} Cr</span>${vipDays > 0 ? `<span class="bg-amber-400 text-dark-950 px-1.5 py-0.5 rounded text-[9px] font-black inline-block w-max">👑 +${vipDays}d VIP</span>` : ''}</div></td><td class="p-3 font-mono font-bold text-slate-600 text-[11px]">${data.utrNumber || 'ONLINE_UPI'}</td><td class="p-3 text-right whitespace-nowrap">${statusBadge}</td></tr>`; }); } catch (err) { tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500 text-xs">Failed to load payment history.</td></tr>`; }
};
