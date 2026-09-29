// ============================================================================
// FILE 3: js/portal-wallet-chat.js
// (Auth, Live Support Chat, Wallet/QR/UTR Ticket, History & Tab Switcher)
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
window.userChatUnsubscribe = null;
window.activePaymentUnsubscribe = null;
window.currentActiveOrderId = null;
window.currentUserChatData = { messages: [], unreadByUser: false };

window.portalConfigState = {
    showDomicile: true,
    showCaste: true,
    showDob18: true,
    bannerEnabled: false,
    bannerBadge: "UPDATE",
    bannerTitle: "",
    bannerMessage: "",
    bannerBtnText: "",
    bannerBtnLink: ""
};

window.currentRechargeCredits = 0;
window.currentTotalPayable = 0;
window.currentWantsVip = false;
window.currentVipDays = 0;
window.currentVipPlanFee = 0;

async function notifyAdminSecurely(payload) {
    try {
        await fetch('/api/notify-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {}
}

// ================= 1. OUTSIDE LOGIN: FORGOT PASSWORD TICKET =================
window.openForgotPasswordModal = function() {
    const modal = document.getElementById('forgotPasswordModal');
    const idInp = document.getElementById('forgotUserIdInput');
    const phoneInp = document.getElementById('forgotUserPhoneInput');
    const noteInp = document.getElementById('forgotUserNoteInput');
    const resBox = document.getElementById('forgotResultBox');

    if (!modal) return;
    resBox.style.display = 'none';
    idInp.value = document.getElementById('loginUsername')?.value.trim() || '';
    phoneInp.value = '';
    noteInp.value = '';
    modal.style.display = 'flex';
};

window.closeForgotPasswordModal = function() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'none';
};

window.submitForgotPasswordTicket = async function(event) {
    event.preventDefault();
    const userIdText = document.getElementById('forgotUserIdInput').value.trim();
    const userPhoneText = document.getElementById('forgotUserPhoneInput').value.trim();
    const userNoteText = document.getElementById('forgotUserNoteInput').value.trim();
    const btn = document.getElementById('btnSubmitForgotTicket');
    const resBox = document.getElementById('forgotResultBox');

    if (!userIdText || !userPhoneText) {
        return alert("कृपया अपनी User ID और मोबाइल/WhatsApp नंबर ज़रूर भरें!");
    }

    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Raising Ticket...';

    const finalMessage = userNoteText || "मैं अपना पासवर्ड भूल गया हूँ, कृपया नया पासवर्ड जारी करें।";

    try {
        await addDoc(collection(db, "supportTickets"), {
            type: "FORGOT_PASSWORD",
            userIdentifier: userIdText,
            userPhone: userPhoneText,
            message: `🔑 Forgot Password Request: ${finalMessage} (WhatsApp: ${userPhoneText})`,
            messages: [{
                sender: 'user',
                text: `🔑 [FORGOT PASSWORD TICKET]\nUser ID: ${userIdText}\nWhatsApp: ${userPhoneText}\nNote: ${finalMessage}`,
                time: Date.now()
            }],
            status: "Open",
            unreadByAdmin: true,
            unreadByUser: false,
            timestamp: new Date(),
            updatedAtMs: Date.now()
        });

        try {
            await addDoc(collection(db, "forgotTickets"), {
                userIdentifier: userIdText,
                userPhone: userPhoneText,
                note: finalMessage,
                status: "Pending",
                timestamp: new Date()
            });
        } catch (e) {}

        notifyAdminSecurely({
            type: "FORGOT_PASSWORD",
            userId: userIdText,
            phone: userPhoneText,
            message: finalMessage
        });

        resBox.className = "p-3.5 rounded-2xl bg-green-50 border border-green-300 text-green-900 text-xs font-bold text-center space-y-1";
        resBox.innerHTML = `
            <div><i class="fa-solid fa-circle-check text-green-600 text-base mr-1"></i> आपका टिकट सफलतापूर्वक रेज़ हो गया है!</div>
            <p class="text-[11px] text-green-700">एडमिन को सूचना भेज दी गई है। जल्द ही आपके नंबर (${userPhoneText}) पर नया पासवर्ड भेज दिया जाएगा।</p>
        `;
        resBox.style.display = 'block';
        event.target.reset();
    } catch (err) {
        alert("टिकट भेजने में समस्या आई: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

// ================= 2. INSIDE PORTAL: REAL-TIME 2-WAY LIVE SUPPORT CHAT =================
function startUserSupportChatListener(uid) {
    if (window.userChatUnsubscribe) window.userChatUnsubscribe();

    const chatDocRef = doc(db, "supportTickets", uid);
    window.userChatUnsubscribe = onSnapshot(chatDocRef, async (snap) => {
        if (snap.exists()) {
            window.currentUserChatData = snap.data();
        } else {
            window.currentUserChatData = { messages: [], unreadByUser: false };
        }

        const isUnread = window.currentUserChatData.unreadByUser === true;
        const headerBadge = document.getElementById('headerSupportUnreadBadge');
        const gearBadge = document.getElementById('gearSupportUnreadBadge');

        if (window.currentActiveTab === 'support_chat') {
            if (isUnread) {
                try { await updateDoc(chatDocRef, { unreadByUser: false }); } catch (e) {}
            }
            if (headerBadge) headerBadge.style.display = 'none';
            if (gearBadge) gearBadge.style.display = 'none';
            window.renderUserLiveChatMessages();
        } else {
            if (headerBadge) {
                headerBadge.innerText = '1';
                headerBadge.style.display = isUnread ? 'inline-flex' : 'none';
            }
            if (gearBadge) {
                gearBadge.innerText = 'New';
                gearBadge.style.display = isUnread ? 'inline-block' : 'none';
            }
        }
    }, (err) => {
        console.error("Support chat listener error:", err);
    });
}

window.renderUserLiveChatMessages = function() {
    const box = document.getElementById('userLiveChatMessagesBox');
    if (!box) return;

    let msgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : [];
    if (msgs.length === 0 && window.currentUserChatData?.message) {
        msgs.push({
            sender: 'user',
            text: window.currentUserChatData.message,
            time: Date.now()
        });
    }

    if (msgs.length === 0) {
        box.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div class="w-12 h-12 rounded-full bg-royal-50 text-royal-500 flex items-center justify-center text-xl mb-2 border border-royal-200">
                    <i class="fa-solid fa-comments"></i>
                </div>
                <p class="text-xs font-black text-slate-600">Ojas Live Support Chat</p>
                <p class="text-[11px] text-slate-400 mt-0.5">कोई भी समस्या या सवाल नीचे लिखकर भेजें। एडमिन का रिप्लाई यहीं इसी चैट में लाइव दिखेगा।</p>
            </div>
        `;
        return;
    }

    box.innerHTML = msgs.map(m => {
        const isMe = m.sender === 'user';
        const tStr = m.time ? new Date(m.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '';
        const safeText = String(m.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (isMe) {
            return `
                <div class="flex justify-end">
                    <div class="max-w-[80%] bg-dark-900 text-white px-3.5 py-2.5 rounded-2xl rounded-br-none shadow-sm">
                        <p class="text-xs font-semibold whitespace-pre-line leading-relaxed">${safeText}</p>
                        <span class="block text-[9px] text-royal-300 text-right mt-1 opacity-80">${tStr} • You</span>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="flex justify-start">
                    <div class="max-w-[80%] bg-amber-50 border border-amber-300 text-slate-900 px-3.5 py-2.5 rounded-2xl rounded-bl-none shadow-sm">
                        <span class="text-[10px] font-black text-amber-800 uppercase block mb-0.5"><i class="fa-solid fa-crown text-amber-500 mr-1"></i>Admin Support</span>
                        <p class="text-xs font-bold whitespace-pre-line leading-relaxed">${safeText}</p>
                        <span class="block text-[9px] text-slate-400 text-right mt-1">${tStr}</span>
                    </div>
                </div>
            `;
        }
    }).join('');

    box.scrollTop = box.scrollHeight;
};

window.sendUserSupportMessage = async function(event) {
    event.preventDefault();
    if (!window.currentUserData) return;

    const inp = document.getElementById('userSupportChatInput');
    const btn = document.getElementById('btnSendUserChat');
    const text = inp.value.trim();
    if (!text) return;

    inp.value = '';
    btn.disabled = true;

    const uid = window.currentUserData.uid;
    const chatRef = doc(db, "supportTickets", uid);
    const newMsg = {
        sender: 'user',
        text: text,
        time: Date.now()
    };

    try {
        const existingMsgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : [];
        existingMsgs.push(newMsg);

        await setDoc(chatRef, {
            type: 'USER_SUPPORT_CHAT',
            userId: uid,
            userIdentifier: window.currentUserData.email,
            username: window.currentUserData.username,
            message: text,
            status: 'Open',
            unreadByAdmin: true,
            unreadByUser: false,
            timestamp: new Date(),
            updatedAtMs: Date.now(),
            messages: existingMsgs
        }, { merge: true });
    } catch (err) {
        alert("मैसेज भेजने में समस्या आई: " + err.message);
    } finally {
        btn.disabled = false;
        inp.focus();
    }
};

// ================= REAL-TIME STEALTH MODE & BANNER LISTENER =================
function startPortalSettingsListener() {
    if (window.portalSettingsUnsubscribe) window.portalSettingsUnsubscribe();
    
    const configRef = doc(db, "settings", "portalConfig");
    window.portalSettingsUnsubscribe = onSnapshot(configRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            window.portalConfigState = {
                showDomicile: data.showDomicile !== false,
                showCaste: data.showCaste !== false,
                showDob18: data.showDob18 !== false,
                bannerEnabled: !!data.bannerEnabled,
                bannerBadge: data.bannerBadge || "UPDATE",
                bannerTitle: data.bannerTitle || "",
                bannerMessage: data.bannerMessage || "",
                bannerBtnText: data.bannerBtnText || "",
                bannerBtnLink: data.bannerBtnLink || ""
            };
        }
        window.applyLivePortalControls();
    }, (err) => {
        console.error("Portal config listener error:", err);
    });
}

window.applyLivePortalControls = function() {
    const cfg = window.portalConfigState;

    const bannerBox = document.getElementById('liveUpdateBannerContainer');
    if (bannerBox) {
        if (cfg.bannerEnabled && (cfg.bannerTitle || cfg.bannerMessage)) {
            bannerBox.style.display = 'block';
            const btnHtml = (cfg.bannerBtnText && cfg.bannerBtnLink)
                ? `<a href="${cfg.bannerBtnLink}" target="_blank" class="bg-amber-400 hover:bg-amber-300 text-dark-950 font-black px-3.5 py-1.5 rounded-xl text-[11px] transition shrink-0 shadow-sm">
                     ${cfg.bannerBtnText} <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-[9px]"></i>
                   </a>`
                : '';

            bannerBox.innerHTML = `
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-dark-950 via-slate-900 to-indigo-950 text-white border border-royal-400/60 shadow-md">
                    <div class="flex flex-wrap items-center justify-between gap-2.5">
                        <div class="flex items-start sm:items-center gap-2.5">
                            <span class="bg-royal-500 text-dark-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 mt-0.5 sm:mt-0">
                                <i class="fa-solid fa-bullhorn mr-1"></i>${cfg.bannerBadge}
                            </span>
                            <div>
                                ${cfg.bannerTitle ? `<h4 class="text-xs md:text-sm font-black text-royal-300">${cfg.bannerTitle}</h4>` : ''}
                                ${cfg.bannerMessage ? `<p class="text-[11px] font-semibold text-slate-200 mt-0.5">${cfg.bannerMessage}</p>` : ''}
                            </div>
                        </div>
                        ${btnHtml}
                    </div>
                </div>
            `;
        } else {
            bannerBox.style.display = 'none';
            bannerBox.innerHTML = '';
        }
    }

    const stdGrid = document.getElementById('standardServicesGrid');
    const btnDom = document.getElementById('btn-domicile');
    const btnCas = document.getElementById('btn-caste');
    const btnDob = document.getElementById('btn-dob18');
    const promoDesc = document.getElementById('normalPromoTextDesc');
    const vipHeaderLabel = document.getElementById('vipBarTitleLabel');

    if (btnDom) btnDom.style.setProperty('display', cfg.showDomicile ? 'flex' : 'none', 'important');
    if (btnCas) btnCas.style.setProperty('display', cfg.showCaste ? 'flex' : 'none', 'important');

    if (stdGrid) {
        if (!cfg.showDomicile && !cfg.showCaste) {
            stdGrid.style.setProperty('display', 'none', 'important');
        } else if (cfg.showDomicile && cfg.showCaste) {
            stdGrid.style.setProperty('display', 'grid', 'important');
            stdGrid.className = "grid grid-cols-2 gap-2.5 mb-3";
        } else {
            stdGrid.style.setProperty('display', 'grid', 'important');
            stdGrid.className = "grid grid-cols-1 gap-2.5 mb-3";
        }
    }

    if (btnDob) btnDob.style.setProperty('display', cfg.showDob18 ? 'flex' : 'none', 'important');

    if (promoDesc) {
        promoDesc.innerHTML = cfg.showDob18
            ? `VIP लें: <strong>18+ DOB & सारे 9 Official Annexures</strong> अनलॉक करें (सभी डॉक्यूमेंट 10 Cr)!`
            : `VIP लें: <strong>सारे 9 Official Annexures</strong> अनलॉक करें (सभी डॉक्यूमेंट 10 Cr)!`;
    }
    if (vipHeaderLabel) {
        vipHeaderLabel.innerHTML = cfg.showDob18
            ? `<i class="fa-solid fa-crown text-royal-400"></i> VIP Services (DOB & All Annexures)`
            : `<i class="fa-solid fa-crown text-royal-400"></i> VIP Services (All 9 Annexures)`;
    }

    if (
        (window.currentActiveTab === 'domicile' && !cfg.showDomicile) ||
        (window.currentActiveTab === 'caste' && !cfg.showCaste) ||
        (window.currentActiveTab === 'dob18' && !cfg.showDob18)
    ) {
        window.switchService(window.getFirstAllowedTab());
    }
};

window.getFirstAllowedTab = function() {
    const cfg = window.portalConfigState;
    if (cfg.showDomicile) return 'domicile';
    if (cfg.showCaste) return 'caste';
    if (window.currentUserData && window.currentUserData.isVip) {
        if (cfg.showDob18) return 'dob18';
        return 'annexure1';
    }
    return 'history';
};

document.addEventListener('click', (e) => {
    const menu = document.getElementById('gearDropdownMenu');
    const btn = document.getElementById('gearMenuBtn');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

window.toggleGearMenu = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('gearDropdownMenu');
    if (menu) menu.classList.toggle('hidden');
};

window.selectGearOption = function(serviceName) {
    const menu = document.getElementById('gearDropdownMenu');
    if (menu) menu.classList.add('hidden');
    window.switchService(serviceName);
};

// ================= AUTH STATE & STRICT @print.com ENFORCEMENT =================
onAuthStateChanged(auth, async (user) => {
    const loadingScreen = document.getElementById('loadingScreen');
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');

    if (user) {
        try {
            const emailLower = user.email.trim().toLowerCase();

            if (!window.isAllowedPortalEmail(emailLower)) {
                await signOut(auth);
                alert("अमान्य आईडी! पोर्टल पर केवल @print.com डोमेन वाली आईडी ही मान्य है।");
                loadingScreen.style.display = 'none';
                return;
            }

            try {
                const cfgSnap = await getDoc(doc(db, "settings", "portalConfig"));
                if (cfgSnap.exists()) {
                    const d = cfgSnap.data();
                    window.portalConfigState = {
                        showDomicile: d.showDomicile !== false,
                        showCaste: d.showCaste !== false,
                        showDob18: d.showDob18 !== false,
                        bannerEnabled: !!d.bannerEnabled,
                        bannerBadge: d.bannerBadge || "UPDATE",
                        bannerTitle: d.bannerTitle || "",
                        bannerMessage: d.bannerMessage || "",
                        bannerBtnText: d.bannerBtnText || "",
                        bannerBtnLink: d.bannerBtnLink || ""
                    };
                }
            } catch (e) {}

            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            let userCredits = 0;
            let isVip = false;
            let vipExpiry = 0;

            if (userDoc.exists()) {
                const data = userDoc.data();
                userCredits = data.credits || 0;
                isVip = data.isVip || false;
                vipExpiry = data.vipExpiry || 0;
            }
            
            const isAdmin = (emailLower === window.ADMIN_EMAIL);
            const isFreeVip = window.FREE_VIP_EMAILS.includes(emailLower);
            const hasFreeAccess = isAdmin || isFreeVip;
            const now = Date.now();

            if (!hasFreeAccess && isVip && vipExpiry > 0 && vipExpiry <= now) {
                isVip = false;
                vipExpiry = 0;
                await updateDoc(userDocRef, { isVip: false, vipExpiry: 0 });
            }
            
            window.currentUserData = { 
                uid: user.uid, 
                email: user.email, 
                credits: userCredits, 
                isVip: isVip || hasFreeAccess, 
                vipExpiry: hasFreeAccess ? 0 : vipExpiry,
                isAdmin: isAdmin,
                isFreeVip: isFreeVip,
                hasFreeAccess: hasFreeAccess,
                username: user.email.split('@')[0] 
            };
            
            setupDashboard(window.currentUserData);
            startPortalSettingsListener();
            startUserSupportChatListener(user.uid);
            startVipCountdownLoop();
            loadingScreen.style.display = 'none'; 
        } catch (err) {
            console.error(err);
            await signOut(auth);
        }
    } else {
        if (window.vipCountdownInterval) clearInterval(window.vipCountdownInterval);
        if (window.portalSettingsUnsubscribe) window.portalSettingsUnsubscribe();
        if (window.userChatUnsubscribe) window.userChatUnsubscribe();
        if (window.activePaymentUnsubscribe) window.activePaymentUnsubscribe();

        window.currentUserData = null;
        document.body.classList.remove('vip-body-bg');
        document.getElementById('vipCornerAlert').style.display = 'none';
        loginSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
        loadingScreen.style.display = 'none';
    }
});

window.handleLogin = async function(event) {
    event.preventDefault();
    const emailInput = document.getElementById('loginUsername').value.trim().toLowerCase();
    const passInput = document.getElementById('loginPassword').value.trim();
    const errorDiv = document.getElementById('loginError');
    const loginBtn = event.target.querySelector('button[type="submit"]');
    
    errorDiv.style.display = 'none';
    const email = emailInput.includes('@') ? emailInput : `${emailInput}@print.com`;

    if (!window.isAllowedPortalEmail(email)) {
        errorDiv.innerHTML = '<i class="fa-solid fa-ban mr-1"></i> केवल <strong>@print.com</strong> डोमेन वाली User ID ही मान्य है! (जैसे: user@print.com)';
        errorDiv.style.display = 'block';
        return;
    }

    const originalBtnHtml = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
    loginBtn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, passInput);
    } catch (error) {
        errorDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1"></i> Your ID or Password are incorrect!';
        errorDiv.style.display = 'block';
        document.getElementById('loginPassword').value = '';
        loginBtn.innerHTML = originalBtnHtml;
        loginBtn.disabled = false;
    }
};

// ================= LIVE VIP COUNTDOWN =================
function startVipCountdownLoop() {
    if (window.vipCountdownInterval) clearInterval(window.vipCountdownInterval);
    updateVipTimerAndAlerts();
    window.vipCountdownInterval = setInterval(updateVipTimerAndAlerts, 1000);
}

async function updateVipTimerAndAlerts() {
    const userData = window.currentUserData;
    const gearVipDaysText = document.getElementById('gearVipDaysText');
    const cornerAlert = document.getElementById('vipCornerAlert');
    const cornerAlertDaysText = document.getElementById('cornerAlertDaysText');

    if (!userData || !userData.isVip || userData.hasFreeAccess) {
        if (cornerAlert) cornerAlert.style.display = 'none';
        if (gearVipDaysText) {
            if (userData?.isAdmin) gearVipDaysText.innerText = '👑 Admin (Unlimited)';
            else if (userData?.isFreeVip) gearVipDaysText.innerText = '👑 Permanent VIP (Free)';
            else gearVipDaysText.innerText = 'Normal User (0 Days)';
        }
        return;
    }

    if (!userData.vipExpiry || userData.vipExpiry <= 0) {
        if (gearVipDaysText) gearVipDaysText.innerText = 'VIP Active';
        if (cornerAlert) cornerAlert.style.display = 'none';
        return;
    }

    const now = Date.now();
    const diff = userData.vipExpiry - now;

    if (diff <= 0) {
        clearInterval(window.vipCountdownInterval);
        userData.isVip = false;
        userData.vipExpiry = 0;

        try {
            await updateDoc(doc(db, "users", userData.uid), { isVip: false, vipExpiry: 0 });
        } catch (e) {}

        if (cornerAlert) cornerAlert.style.display = 'none';
        setupDashboard(userData);
        alert('आपकी VIP वैलिडिटी समाप्त हो गई है। आपका अकाउंट अब Normal User पोर्टल में बदल दिया गया है।');
        return;
    }

    const totalDaysCeil = Math.ceil(diff / window.MS_PER_DAY);
    const days = Math.floor(diff / window.MS_PER_DAY);
    const hours = Math.floor((diff % window.MS_PER_DAY) / (1000 * 60 * 60));

    if (gearVipDaysText) {
        gearVipDaysText.innerText = `👑 VIP: ${totalDaysCeil} दिन बाकी (${days}d ${hours}h)`;
    }

    if (totalDaysCeil <= 5 && totalDaysCeil >= 1) {
        if (!window.cornerAlertDismissed) {
            cornerAlert.style.display = 'block';
            cornerAlertDaysText.innerHTML = `VIP खत्म होने में सिर्फ <strong class="text-red-600 underline">${totalDaysCeil} दिन</strong> बचे हैं!`;
        }
    } else {
        cornerAlert.style.display = 'none';
    }
}

window.dismissCornerAlert = function() {
    window.cornerAlertDismissed = true;
    document.getElementById('vipCornerAlert').style.display = 'none';
};

// ================= SETUP DASHBOARD =================
function setupDashboard(userData) {
    document.getElementById('displayUser').innerText = userData.username.toUpperCase();
    const adminLink = document.getElementById('adminPanelLink');
    const creditDisplayBox = document.getElementById('creditDisplayBox');
    const vipServicesBar = document.getElementById('vipServicesBar');
    const normalUserVipPromo = document.getElementById('normalUserVipPromo');
    const portalTitle = document.getElementById('portalHeaderTitle');
    const portalIcon = document.getElementById('portalHeaderIcon');
    const vipBadge = document.getElementById('vipStatusBadge');
    const mainFormCard = document.getElementById('mainFormCard');
    const gearBtnAddCredit = document.getElementById('gearBtnAddCredit');
    const gearBtnPaymentHistory = document.getElementById('gearBtnPaymentHistory');

    if (userData.isAdmin) adminLink.style.display = 'flex';
    else adminLink.style.display = 'none';

    if (userData.hasFreeAccess) {
        creditDisplayBox.style.display = 'none';
        if (gearBtnAddCredit) gearBtnAddCredit.style.display = 'none';
        if (gearBtnPaymentHistory) gearBtnPaymentHistory.style.display = 'none';
    } else {
        creditDisplayBox.style.display = 'flex';
        document.getElementById('displayCredits').innerText = userData.credits;
        if (gearBtnAddCredit) gearBtnAddCredit.style.display = 'flex';
        if (gearBtnPaymentHistory) gearBtnPaymentHistory.style.display = 'flex';
    }

    if (userData.isVip) {
        document.body.classList.add('vip-body-bg');
        portalTitle.innerHTML = `Ojas <span class="text-royal-400">VIP</span>`;
        portalIcon.innerHTML = `<i class="fa-solid fa-crown text-sm animate-pulse"></i>`;
        portalIcon.className = "w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-yellow-300 via-royal-500 to-amber-700 text-dark-950 rounded-xl flex items-center justify-center shadow-vip-glow border border-yellow-200";
        vipBadge.style.display = 'inline-flex';
        vipServicesBar.style.display = 'block';
        normalUserVipPromo.style.display = 'none';
        mainFormCard.className = "bg-white text-slate-800 rounded-2xl md:rounded-3xl shadow-vip-glow border-2 border-royal-400 p-4 md:p-7";
    } else {
        document.body.classList.remove('vip-body-bg');
        portalTitle.innerHTML = `Ojas <span class="text-royal-400">Portal</span>`;
        portalIcon.innerHTML = `<i class="fa-solid fa-sun text-sm"></i>`;
        portalIcon.className = "w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-royal-400 to-royal-600 text-white rounded-xl flex items-center justify-center shadow-inner";
        vipBadge.style.display = 'none';
        vipServicesBar.style.display = 'none';
        normalUserVipPromo.style.display = 'block';
        mainFormCard.className = "bg-white text-slate-800 rounded-2xl md:rounded-3xl shadow-card border border-slate-100 p-4 md:p-7";
    }

    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'flex';
    
    window.applyLivePortalControls();
    window.switchService(window.getFirstAllowedTab());
}

window.handleLogout = async function() {
    await signOut(auth);
    window.location.reload();
};

window.jumpToVipUpgrade = function(days = 30) {
    if (window.currentUserData?.hasFreeAccess) return;
    const menu = document.getElementById('gearDropdownMenu');
    if (menu) menu.classList.add('hidden');
    window.switchService('add_credit');
    setTimeout(() => {
        const planRadio = document.querySelector(`input[name="vipPlanOption"][value="${days}"]`);
        if (planRadio) {
            planRadio.checked = true;
            window.calculateCredits();
        }
    }, 50);
};

// ================= PASSWORD CHANGE LOGIC =================
window.handleChangePassword = async function(event) {
    event.preventDefault();
    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    const msgBox = document.getElementById('passwordMsgBox');
    const btn = document.getElementById('btnChangePass');

    msgBox.style.display = 'none';

    if (newPass.length < 6) {
        msgBox.className = "p-3 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 text-center";
        msgBox.innerText = "नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए!";
        msgBox.style.display = 'block';
        return;
    }

    if (newPass !== confirmPass) {
        msgBox.className = "p-3 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 text-center";
        msgBox.innerText = "नया पासवर्ड और कन्फर्म पासवर्ड आपस में मैच नहीं कर रहे हैं!";
        msgBox.style.display = 'block';
        return;
    }

    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> पासवर्ड बदला जा रहा है...';
    btn.disabled = true;

    try {
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, currentPass);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPass);

        try {
            await updateDoc(doc(db, "users", user.uid), {
                passUpdatedAt: new Date()
            });
        } catch (e) {}

        msgBox.className = "p-3 rounded-xl text-xs font-bold bg-green-50 text-green-700 border border-green-200 text-center";
        msgBox.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> आपका पासवर्ड सफलतापूर्वक बदल दिया गया है।';
        msgBox.style.display = 'block';
        event.target.reset();
    } catch (err) {
        msgBox.className = "p-3 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 text-center";
        msgBox.innerText = "आपका पुराना पासवर्ड गलत है!";
        msgBox.style.display = 'block';
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
};

// ================= PAYMENT + AUTO-CANCEL + 24-HOUR UTR TICKET SYSTEM =================
window.calculateCredits = function() {
    const creditAmt = parseFloat(document.getElementById('rupeeAmount')?.value) || 0;
    const selectedPlanEl = document.querySelector('input[name="vipPlanOption"]:checked');
    
    let vipDays = 0;
    let vipFee = 0;
    if (selectedPlanEl) {
        vipDays = parseInt(selectedPlanEl.value) || 0;
        vipFee = parseInt(selectedPlanEl.getAttribute('data-price')) || 0;
    }

    const wantsVip = vipDays > 0;
    const totalPayable = creditAmt + vipFee;

    window.currentRechargeCredits = creditAmt;
    window.currentWantsVip = wantsVip;
    window.currentVipDays = vipDays;
    window.currentVipPlanFee = vipFee;
    window.currentTotalPayable = totalPayable;

    const calcCreditsEl = document.getElementById('calculatedCredits');
    if (calcCreditsEl) calcCreditsEl.innerText = `${creditAmt} Cr`;
    
    const vipSummaryBadge = document.getElementById('vipSummaryBadge');
    if (vipSummaryBadge) {
        if (wantsVip) {
            vipSummaryBadge.style.display = 'inline-block';
            vipSummaryBadge.innerHTML = `👑 +${vipDays}d VIP`;
        } else {
            vipSummaryBadge.style.display = 'none';
        }
    }

    const totalPayableDisplay = document.getElementById('totalPayableDisplay');
    if (totalPayableDisplay) totalPayableDisplay.innerText = `₹${totalPayable}`;
};

window.generateQR = async function() {
    if (window.currentUserData?.hasFreeAccess) return;

    window.calculateCredits();
    const creditAmt = window.currentRechargeCredits;
    const wantsVip = window.currentWantsVip;
    const totalPayable = window.currentTotalPayable;
    
    if (!wantsVip && creditAmt < 100) {
        return alert('पोर्टल पर कम से कम ₹100 के क्रेडिट रिचार्ज करना अनिवार्य है! कृपया ₹100 या उससे अधिक दर्ज करें।');
    }
    if (wantsVip && creditAmt > 0 && creditAmt < 100) {
        return alert('क्रेडिट रिचार्ज की न्यूनतम वैल्यू ₹100 है! कृपया क्रेडिट में कम से कम ₹100 डालें (या सिर्फ VIP लेने के लिए क्रेडिट को 0 छोड़ें)।');
    }
    if (totalPayable < 100) {
        return alert('न्यूनतम पेमेंट राशि ₹100 होनी चाहिए!');
    }

    const btn = document.getElementById('btnGenerateQR');
    const origBtnHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> पेमेंट लिंक बन रहा है...';
    }

    const upiId = "8279650137@amazonpay"; 
    const payeeName = "Ojas Print Service";
    const txnNote = wantsVip ? `Ojas VIP ${window.currentVipDays}d` : `Ojas Credits`;
    const queryParams = `pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${totalPayable}&cu=INR&tn=${encodeURIComponent(txnNote)}`;

    let universalUpiUrl = `upi://pay?${queryParams}`;
    let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(universalUpiUrl)}`;
    window.currentActiveOrderId = null;

    try {
        const res = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: window.currentUserData.uid,
                email: window.currentUserData.email,
                username: window.currentUserData.username,
                totalPayable: totalPayable,
                creditsRequested: creditAmt,
                wantsVip: wantsVip,
                vipDaysRequested: window.currentVipDays,
                vipPlanFee: window.currentVipPlanFee
            })
        });
        const orderData = await res.json();

        if (orderData.status && orderData.orderId) {
            window.currentActiveOrderId = orderData.orderId;

            if (orderData.upi_string) {
                universalUpiUrl = orderData.upi_string;
                qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(universalUpiUrl)}`;
            }
            if (orderData.qr_code && orderData.qr_code.startsWith('http')) {
                qrUrl = orderData.qr_code;
            }

            if (window.activePaymentUnsubscribe) window.activePaymentUnsubscribe();
            window.activePaymentUnsubscribe = onSnapshot(doc(db, "payments", orderData.orderId), async (snap) => {
                if (snap.exists()) {
                    const pData = snap.data();
                    if (pData.status === 'Auto-Approved' || pData.status === 'Approved') {
                        if (window.activePaymentUnsubscribe) window.activePaymentUnsubscribe();
                        window.currentActiveOrderId = null;
                        
                        const uSnap = await getDoc(doc(db, "users", window.currentUserData.uid));
                        if (uSnap.exists()) {
                            const updatedUser = uSnap.data();
                            window.currentUserData.credits = updatedUser.credits || 0;
                            window.currentUserData.isVip = updatedUser.isVip || window.currentUserData.hasFreeAccess;
                            window.currentUserData.vipExpiry = updatedUser.vipExpiry || 0;
                            const crEl = document.getElementById('displayCredits');
                            if (crEl) crEl.innerText = window.currentUserData.credits;
                        }

                        document.getElementById('walletMainUI').innerHTML = `
                            <div class="p-6 bg-green-50 rounded-2xl border-2 border-green-400 text-center space-y-2">
                                <i class="fa-solid fa-circle-check text-5xl text-green-600 mb-2 animate-bounce"></i>
                                <h2 class="text-xl font-black text-green-900">पेमेंट सफल! (Auto-Verified)</h2>
                                <p class="text-xs font-bold text-green-700">आपका ₹${totalPayable} का पेमेंट वेरीफाई हो गया है और आपके अकाउंट में तुरंत क्रेडिट्स/VIP जोड़ दिए गए हैं!</p>
                                <div class="pt-3">
                                    <button onclick="window.location.reload()" class="bg-green-600 hover:bg-green-700 text-white font-black py-2.5 px-6 rounded-xl text-xs shadow">डैशबोर्ड पर जाएँ</button>
                                </div>
                            </div>
                        `;
                    }
                }
            });
        }
    } catch (err) {
        try {
            const fallbackDoc = await addDoc(collection(db, "payments"), {
                userId: window.currentUserData.uid,
                email: window.currentUserData.email,
                amountPaid: totalPayable,
                creditsRequested: creditAmt,
                wantsVip: wantsVip,
                vipDaysRequested: window.currentVipDays,
                vipPlanFee: window.currentVipPlanFee,
                utrNumber: "ONLINE_UPI",
                timestamp: new Date(),
                status: "Pending"
            });
            window.currentActiveOrderId = fallbackDoc.id;
        } catch (e) {}
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origBtnHtml;
        }
    }

    const paytmUrl = universalUpiUrl.replace('upi://pay?', 'paytmmp://pay?');
    const phonepeUrl = universalUpiUrl.replace('upi://pay?', 'phonepe://pay?');
    const gpayUrl = universalUpiUrl.replace('upi://pay?', 'tez://upi/pay?');

    document.getElementById('upiQRCode').src = qrUrl;
    document.getElementById('qrPayableAmountText').innerText = `कुल पेमेंट: ₹${totalPayable}`;
    
    const mainUpiBtn = document.getElementById('btnDirectUpiPay');
    if (mainUpiBtn) {
        mainUpiBtn.href = universalUpiUrl;
        mainUpiBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Pay ₹${totalPayable} Directly via UPI App`;
    }
    const btnPaytm = document.getElementById('btnPaytmApp');
    if (btnPaytm) btnPaytm.href = paytmUrl;
    const btnPhonePe = document.getElementById('btnPhonePeApp');
    if (btnPhonePe) btnPhonePe.href = phonepeUrl;
    const btnGPay = document.getElementById('btnGPayApp');
    if (btnGPay) btnGPay.href = gpayUrl;

    const ticketBox = document.getElementById('paymentIssueTicketBox');
    if (ticketBox) ticketBox.style.display = 'none';
    const ticketResult = document.getElementById('paymentTicketResultMsg');
    if (ticketResult) ticketResult.style.display = 'none';

    document.getElementById('paymentStep1').style.display = 'none';
    document.getElementById('qrSection').style.display = 'flex';
};

window.cancelAndBackToPaymentStep1 = async function() {
    if (window.activePaymentUnsubscribe) {
        window.activePaymentUnsubscribe();
        window.activePaymentUnsubscribe = null;
    }

    if (window.currentActiveOrderId) {
        const orderIdToCancel = window.currentActiveOrderId;
        window.currentActiveOrderId = null;
        try {
            await updateDoc(doc(db, "payments", orderIdToCancel), {
                status: "Cancelled",
                cancelledBy: "User (Back without Payment)",
                cancelledAt: new Date()
            });
        } catch (e) {}
    }

    document.getElementById('qrSection').style.display = 'none';
    document.getElementById('paymentStep1').style.display = 'block';
    alert("पेमेंट प्रोसेस कैंसिल कर दिया गया है (Payment Cancelled)।");
};

window.togglePaymentTicketBox = function() {
    const box = document.getElementById('paymentIssueTicketBox');
    if (!box) return;
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
};

window.submitPaymentIssueTicket = async function() {
    const rawUtr = document.getElementById('ticketUtrInput')?.value.trim() || '';
    const utr = rawUtr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const resMsg = document.getElementById('paymentTicketResultMsg');
    const btn = document.getElementById('btnRaisePaymentTicket');

    if (!utr || utr.length < 10) {
        return alert("कृपया अपना 12-अंकों का सही UTR / Reference नंबर दर्ज करें!");
    }

    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> टिकट सबमिट हो रहा है...';

    const totalPaid = window.currentTotalPayable;
    const creditsReq = window.currentRechargeCredits;
    const vipDays = window.currentVipDays;

    const ticketMsgText = `💳 [PAYMENT UTR TICKET]\nAmount: ₹${totalPaid}\nCredits: +${creditsReq} Cr${vipDays > 0 ? ` | VIP: +${vipDays}d` : ''}\nUTR No: ${utr}\nOrder ID: ${window.currentActiveOrderId || 'N/A'}\nNote: ऑनलाइन पेमेंट ऑटो-वेरीफाई नहीं हुआ, कृपया चेक करके क्रेडिट जोड़ें।`;

    try {
        if (window.currentActiveOrderId) {
            try {
                await updateDoc(doc(db, "payments", window.currentActiveOrderId), {
                    utrNumber: utr,
                    status: "Pending (Ticket Raised)",
                    ticketRaisedAt: new Date()
                });
            } catch (e) {}
        }

        const uid = window.currentUserData.uid;
        const chatRef = doc(db, "supportTickets", uid);
        const existingMsgs = Array.isArray(window.currentUserChatData?.messages) ? [...window.currentUserChatData.messages] : [];
        existingMsgs.push({
            sender: 'user',
            text: ticketMsgText,
            time: Date.now()
        });

        await setDoc(chatRef, {
            type: 'PAYMENT_ISSUE_TICKET',
            userId: uid,
            userIdentifier: window.currentUserData.email,
            username: window.currentUserData.username,
            message: `💳 Payment UTR Ticket: ₹${totalPaid} (UTR: ${utr})`,
            status: 'Open',
            unreadByAdmin: true,
            unreadByUser: false,
            timestamp: new Date(),
            updatedAtMs: Date.now(),
            messages: existingMsgs
        }, { merge: true });

        notifyAdminSecurely({
            type: "PAYMENT_UTR_TICKET",
            user: window.currentUserData.email,
            amount: totalPaid,
            utr: utr
        });

        resMsg.className = "p-3.5 rounded-xl bg-green-50 border border-green-300 text-green-900 text-xs font-bold text-center space-y-1 mt-2";
        resMsg.innerHTML = `
            <div><i class="fa-solid fa-circle-check text-green-600 text-base mr-1"></i> आपका पेमेंट टिकट सफलतापूर्वक रेज़ हो गया है!</div>
            <p class="text-[11px] text-green-800">आपका UTR नंबर (<strong>${utr}</strong>) दर्ज कर लिया गया है। <strong>24 घंटे के अंदर</strong> आपकी समस्या का समाधान (Resolution) कर दिया जाएगा और क्रेडिट्स आपके वॉलेट में जोड़ दिए जाएंगे।</p>
        `;
        resMsg.style.display = 'block';
        document.getElementById('ticketUtrInput').value = '';
    } catch (err) {
        alert("टिकट रेज़ करने में समस्या आई: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

// ================= USER PAYMENT HISTORY =================
window.loadUserPayments = async function() {
    const tbody = document.getElementById('userPaymentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 font-bold text-xs"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-royal-500"></i><br>पेमेंट हिस्ट्री लोड हो रही है...</td></tr>`;

    try {
        const userDocRef = doc(db, "users", window.currentUserData.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const uData = userDoc.data();
            window.currentUserData.credits = uData.credits || 0;
            window.currentUserData.vipExpiry = uData.vipExpiry || 0;
            const isNowVip = (uData.isVip && (!uData.vipExpiry || uData.vipExpiry > Date.now())) || window.currentUserData.hasFreeAccess;
            window.currentUserData.isVip = isNowVip;
            const creditEl = document.getElementById('displayCredits');
            if (creditEl) creditEl.innerText = window.currentUserData.credits;
        }

        const validityCard = document.getElementById('userValidityInfoBox');
        if (validityCard) {
            const now = Date.now();
            const exp = window.currentUserData.vipExpiry || 0;
            if (window.currentUserData.isVip && exp > now) {
                const daysLeft = Math.ceil((exp - now) / window.MS_PER_DAY);
                const expDateStr = new Date(exp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                validityCard.innerHTML = `
                    <div class="p-3.5 rounded-2xl bg-dark-900 text-white border border-royal-400 flex flex-wrap justify-between items-center gap-2">
                        <div>
                            <span class="text-[10px] font-black uppercase bg-amber-400 text-dark-950 px-2 py-0.5 rounded-full"><i class="fa-solid fa-crown mr-1"></i>VIP ACTIVE</span>
                            <h4 class="text-sm md:text-base font-black text-royal-300 mt-1">VIP वैलिडिटी: <span class="text-white underline">${daysLeft} दिन बाकी हैं</span></h4>
                            <p class="text-[11px] text-slate-300">समाप्ति: ${expDateStr}</p>
                        </div>
                        <button onclick="window.jumpToVipUpgrade(30)" class="bg-royal-500 text-dark-950 font-black px-3 py-2 rounded-xl text-xs">
                            + वैलिडिटी बढ़ाएं
                        </button>
                    </div>
                `;
            } else if (window.currentUserData.isVip) {
                validityCard.innerHTML = `<div class="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs"><i class="fa-solid fa-crown text-amber-500 mr-1"></i> आपका VIP Access एक्टिव है!</div>`;
            } else {
                validityCard.innerHTML = `
                    <div class="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex flex-wrap justify-between items-center gap-2">
                        <div>
                            <h4 class="text-xs md:text-sm font-black text-slate-800">अभी कोई VIP प्लान एक्टिव नहीं है (0 दिन)</h4>
                            <p class="text-[11px] text-slate-500">DOB 18+ और सारे 9 Annexures अनलॉक करने के लिए VIP लें।</p>
                        </div>
                        <button onclick="window.jumpToVipUpgrade(30)" class="bg-dark-900 text-royal-300 font-black px-3 py-2 rounded-xl text-xs">
                            👑 ₹149 में VIP लें
                        </button>
                    </div>
                `;
            }
        }

        const q = query(collection(db, "payments"), where("userId", "==", window.currentUserData.uid));
        const snap = await getDocs(q);

        window.userPaymentsData = [];
        snap.forEach(docSnap => {
            window.userPaymentsData.push({ id: docSnap.id, ...docSnap.data() });
        });

        window.userPaymentsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        let totalTxns = window.userPaymentsData.length;
        let approvedAmount = 0;
        let pendingAmount = 0;
        let pendingCount = 0;

        window.userPaymentsData.forEach(item => {
            const amt = parseFloat(item.amountPaid) || 0;
            const st = (item.status || 'Pending').toLowerCase();
            if (st === 'approved' || st === 'auto-approved') {
                approvedAmount += amt;
            } else if (st.includes('pending')) {
                pendingAmount += amt;
                pendingCount++;
            }
        });

        const elTotalTxns = document.getElementById('sumTotalTxns');
        const elApprovedAmt = document.getElementById('sumApprovedAmt');
        const elPendingAmt = document.getElementById('sumPendingAmt');
        if (elTotalTxns) elTotalTxns.innerText = totalTxns;
        if (elApprovedAmt) elApprovedAmt.innerText = `₹${approvedAmount}`;
        if (elPendingAmt) elPendingAmt.innerText = `₹${pendingAmount} (${pendingCount})`;

        if (window.userPaymentsData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-bold text-xs">अभी तक कोई पेमेंट रिकॉर्ड नहीं मिला।</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        window.userPaymentsData.forEach(item => {
            const sec = item.timestamp?.seconds || Math.floor(Date.now() / 1000);
            const dateObj = new Date(sec * 1000);
            const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            const creditsReq = item.creditsRequested !== undefined ? item.creditsRequested : (item.creditsAdded || 0);
            const vipDays = item.vipDaysRequested || (item.wantsVip ? 30 : 0);

            let detailsHtml = `<span class="font-bold text-slate-800">+${creditsReq} Cr</span>`;
            if (vipDays > 0) {
                detailsHtml += ` <span class="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-black">+${vipDays}d VIP</span>`;
            }

            const rawStatus = (item.status || 'Pending');
            let statusBadgeHtml = '';
            if (rawStatus === 'Approved' || rawStatus === 'Auto-Approved') {
                statusBadgeHtml = `<span class="bg-green-100 text-green-800 border border-green-300 px-2.5 py-1 rounded-full text-[11px] font-black">सफल (Approved)</span>`;
            } else if (rawStatus === 'Rejected') {
                statusBadgeHtml = `<span class="bg-red-100 text-red-700 border border-red-300 px-2.5 py-1 rounded-full text-[11px] font-black">रद्द (Rejected)</span>`;
            } else if (rawStatus === 'Cancelled') {
                statusBadgeHtml = `<span class="bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-full text-[11px] font-black">कैंसिल (Cancelled)</span>`;
            } else if (rawStatus.includes('Ticket')) {
                statusBadgeHtml = `<span class="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2.5 py-1 rounded-full text-[11px] font-black">टिकट रेज़्ड (24h Resolution)</span>`;
            } else {
                statusBadgeHtml = `<span class="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full text-[11px] font-black animate-pulse">पेंडिंग (Pending)</span>`;
            }

            tbody.innerHTML += `
                <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
                    <td class="p-3 text-slate-600 font-bold">${dateStr}<br><span class="text-[10px] text-slate-400">${timeStr}</span></td>
                    <td class="p-3 font-black text-sm text-slate-900">₹${item.amountPaid || 0}</td>
                    <td class="p-3">${detailsHtml}</td>
                    <td class="p-3 font-mono font-bold text-slate-700">${item.utrNumber || 'ONLINE'}</td>
                    <td class="p-3 text-right whitespace-nowrap">${statusBadgeHtml}</td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500 font-bold text-xs">लोड करने में समस्या आई।</td></tr>`;
    }
};

// ================= IN-APP PREVIEW MODAL & DOCUMENT HISTORY =================
window.openPdfViewer = async function(fileId, fileName, historyIndex = -1) {
    document.getElementById('pdfViewerTitle').innerText = fileName;
    const iframe = document.getElementById('pdfIframe');
    const htmlPreviewContainer = document.getElementById('htmlDocPreviewContainer');
    const spinner = document.getElementById('pdfLoadingSpinner');
    const downloadBtn = document.getElementById('modalDownloadBtn');
    const printBtn = document.getElementById('modalPrintBtn');

    if (String(fileId).startsWith('LOCAL_HTML_') && historyIndex >= 0) {
        const record = window.historyData[historyIndex];
        const fData = record?.formData || {};
        const withStamp = !!record?.withStamp;
        const stampSrc = withStamp ? await window.getTransparentStampDataUrl(record?.stampFile || 'stamp.png') : '';

        spinner.style.display = 'none';
        iframe.style.display = 'none';
        htmlPreviewContainer.style.display = 'flex';
        htmlPreviewContainer.innerHTML = window.buildLocalAffidavitHtml(fileId, fData, true, withStamp, stampSrc);

        downloadBtn.onclick = async function() {
            await window.downloadHtmlDocAsPdf(fileId, fData, fileName, withStamp, stampSrc);
        };
        if (printBtn) {
            printBtn.onclick = function() {
                window.directPrintDocument(fileId, fData, fileName, withStamp, stampSrc);
            };
        }
    } else {
        htmlPreviewContainer.style.display = 'none';
        htmlPreviewContainer.innerHTML = '';
        iframe.style.display = 'block';
        spinner.style.display = 'flex';
        iframe.src = `https://drive.google.com/file/d/${fileId}/preview`;
        downloadBtn.onclick = function() {
            window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank');
        };
        if (printBtn) {
            printBtn.onclick = function() {
                window.directPrintDocument(fileId, {}, fileName, false, '');
            };
        }
    }

    document.getElementById('pdfViewerModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closePdfViewer = function() {
    document.getElementById('pdfViewerModal').style.display = 'none';
    document.getElementById('pdfIframe').src = '';
    document.getElementById('htmlDocPreviewContainer').innerHTML = '';
    document.body.style.overflow = 'auto';
};

window.loadUserHistory = async function() {
    const historyContainer = document.getElementById('historyTableBody');
    if (!historyContainer) return;
    historyContainer.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400 font-bold text-xs"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-royal-500"></i><br>Loading records...</td></tr>`;

    try {
        const q = query(collection(db, "history"), where("userId", "==", window.currentUserData.uid));
        const querySnapshot = await getDocs(q);

        window.historyData = [];
        querySnapshot.forEach((docSnap) => { window.historyData.push({ id: docSnap.id, ...docSnap.data() }); });
        window.historyData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        window.renderHistory('ALL');
    } catch (err) {
        historyContainer.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500 text-xs">Failed to load history.</td></tr>`;
    }
};

window.renderHistory = function(filterType) {
    const historyContainer = document.getElementById('historyTableBody');
    if (!historyContainer) return;
    historyContainer.innerHTML = '';

    const indexedData = window.historyData.map((item, idx) => ({ ...item, _origIndex: idx }));
    const filteredData = filterType === 'ALL' ? indexedData : indexedData.filter(item => item.serviceType === filterType);
    document.getElementById('userHistoryCount').innerText = `Total Files: ${filteredData.length}`;

    if (filteredData.length === 0) {
        historyContainer.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400 text-xs"><i class="fa-regular fa-folder-open text-3xl mb-2 text-slate-300"></i><br>No records found.</td></tr>`;
        return;
    }

    filteredData.forEach((data) => {
        const sec = data.timestamp?.seconds || Math.floor(Date.now() / 1000);
        const dateObj = new Date(sec * 1000);
        const dateStr = dateObj.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
        const timeStr = dateObj.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
        const stampBadgeHtml = data.withStamp
            ? `<span class="bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 rounded-full text-[10px] font-black ml-1.5"><i class="fa-solid fa-stamp mr-0.5"></i>Stamped</span>`
            : '';
        
        historyContainer.innerHTML += `
            <tr class="border-b border-slate-100 text-xs hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-800">${data.fileName}${stampBadgeHtml}</td>
                <td class="p-3"><span class="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">${data.serviceType}</span></td>
                <td class="p-3 text-slate-500 text-[11px] font-medium">${dateStr} <br> ${timeStr}</td>
                <td class="p-3 text-right whitespace-nowrap">
                    <button onclick="window.openPdfViewer('${data.fileId}', '${data.fileName}', ${data._origIndex})" class="inline-flex items-center gap-1 bg-royal-50 text-royal-700 border border-royal-200 hover:bg-royal-600 hover:text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition shadow-sm">
                        <i class="fa-solid fa-eye"></i> Preview / Print / PDF
                    </button>
                </td>
            </tr>
        `;
    });
};

function getPaymentHistorySectionHtml() {
    return `
        <div class="space-y-4">
            <div id="userValidityInfoBox"></div>

            <div class="grid grid-cols-3 gap-2 md:gap-4">
                <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p class="text-[10px] font-bold text-slate-400 uppercase">कुल ट्रांजैक्शन</p>
                    <p id="sumTotalTxns" class="text-lg md:text-2xl font-black text-dark-900">0</p>
                </div>
                <div class="p-3 rounded-xl bg-green-50 border border-green-200">
                    <p class="text-[10px] font-bold text-green-700 uppercase">सफल (Approved)</p>
                    <p id="sumApprovedAmt" class="text-lg md:text-2xl font-black text-green-700">₹0</p>
                </div>
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p class="text-[10px] font-bold text-amber-800 uppercase">पेंडिंग (Pending)</p>
                    <p id="sumPendingAmt" class="text-lg md:text-2xl font-black text-amber-700">₹0 (0)</p>
                </div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-sm md:text-base font-black text-dark-900"><i class="fa-solid fa-receipt text-royal-500 mr-1.5"></i> पेमेंट और VIP हिस्ट्री</h4>
                    <button onclick="window.loadUserPayments()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-rotate-right mr-1"></i> Refresh</button>
                </div>
                <div class="overflow-x-auto border border-slate-200 rounded-xl">
                    <table class="w-full text-left border-collapse bg-white min-w-[520px]">
                        <thead class="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase">
                            <tr>
                                <th class="p-3">तारीख (Date)</th>
                                <th class="p-3">राशि</th>
                                <th class="p-3">क्रेडिट्स / VIP</th>
                                <th class="p-3">UTR / Mode</th>
                                <th class="p-3 text-right">स्टेटस</th>
                            </tr>
                        </thead>
                        <tbody id="userPaymentsTableBody" class="text-xs text-slate-700"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ================= MAIN SERVICE SWITCHER =================
window.switchService = async function(serviceName) {
    const cfg = window.portalConfigState;

    if (window.currentUserData?.hasFreeAccess && (serviceName === 'add_credit' || serviceName === 'payments_history')) {
        serviceName = window.getFirstAllowedTab();
    }

    if (serviceName === 'domicile' && !cfg.showDomicile) serviceName = window.getFirstAllowedTab();
    else if (serviceName === 'caste' && !cfg.showCaste) serviceName = window.getFirstAllowedTab();
    else if (serviceName === 'dob18' && !cfg.showDob18) serviceName = window.getFirstAllowedTab();

    window.currentActiveTab = serviceName;

    document.querySelectorAll('.service-tab').forEach(btn => {
        btn.className = "service-tab bg-white text-slate-700 font-bold py-2.5 px-3 rounded-xl hover:bg-slate-50 transition shadow-sm border border-slate-200 text-xs md:text-sm flex-1 flex justify-center items-center gap-1.5";
    });
    document.querySelectorAll('.vip-tab').forEach(btn => {
        btn.className = "vip-tab bg-dark-800 text-royal-300 border border-royal-500/30 font-bold py-2 px-2.5 rounded-xl hover:bg-royal-500 hover:text-dark-950 transition text-[11px] md:text-xs flex items-center justify-center gap-1 shadow-sm";
    });

    const activeBtn = document.getElementById('btn-' + serviceName);
    if (activeBtn) {
        if (activeBtn.classList.contains('vip-tab')) {
            activeBtn.className = "vip-tab bg-gradient-to-r from-yellow-300 via-royal-400 to-amber-500 text-dark-950 font-black py-2 px-2.5 rounded-xl shadow-vip-glow transition text-[11px] md:text-xs flex items-center justify-center gap-1 border border-yellow-200";
        } else {
            activeBtn.className = "service-tab bg-dark-900 text-royal-300 font-bold py-2.5 px-3 rounded-xl shadow-glow transition text-xs md:text-sm flex-1 flex justify-center items-center gap-1.5 border border-royal-500/50";
        }
    }

    window.applyLivePortalControls();

    const container = document.getElementById('formContainer');
    if (!container) return;

    const submitBtnText = window.currentUserData && window.currentUserData.hasFreeAccess 
        ? 'Generate Document (VIP Free) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>' 
        : 'Generate Document (10 Credits) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>';
                                                     
    const statusTagHtml = window.currentUserData && window.currentUserData.hasFreeAccess 
        ? '<span class="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-[10px] font-black border border-green-300 uppercase"><i class="fa-solid fa-crown mr-1"></i>Lifetime VIP Free</span>' 
        : (window.currentUserData && window.currentUserData.isVip 
            ? '<span class="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-[10px] font-black border border-amber-300 uppercase"><i class="fa-solid fa-crown mr-1"></i>10 Credits</span>' 
            : '<span class="bg-royal-100 text-royal-900 px-2.5 py-1 rounded-md text-[10px] font-black border border-royal-300 uppercase">10 Credits</span>');

    // पहले चेक करें कि क्या यह कोई सर्टिफिकेट या Annexure फॉर्म है (portal-forms.js से)
    if (window.renderServiceFormHtml(serviceName, container, submitBtnText, statusTagHtml)) {
        return;
    }

    // LIVE 2-WAY SUPPORT CHAT TAB
    if (serviceName === 'support_chat') {
        container.innerHTML = `
            <div class="max-w-2xl mx-auto flex flex-col h-[460px] md:h-[520px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-inner">
                <div class="bg-dark-950 text-white px-4 py-3 flex justify-between items-center border-b border-royal-500">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-xl bg-green-500/20 border border-green-400 text-green-400 flex items-center justify-center">
                            <i class="fa-solid fa-headset text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-xs md:text-sm font-black text-white flex items-center gap-1.5">
                                Live Admin Support Chat
                                <span class="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                            </h3>
                            <p class="text-[10px] text-slate-400 font-semibold">User ID: <span class="text-royal-300 font-bold">${window.currentUserData?.email || ''}</span></p>
                        </div>
                    </div>
                    <span class="text-[10px] bg-dark-800 text-royal-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold">2-Way Live</span>
                </div>

                <div id="userLiveChatMessagesBox" class="flex-1 p-3.5 md:p-4 overflow-y-auto space-y-3 bg-slate-100/80"></div>

                <form onsubmit="window.sendUserSupportMessage(event)" class="p-3 bg-white border-t border-slate-200 flex gap-2">
                    <input type="text" id="userSupportChatInput" required placeholder="यहाँ अपनी समस्या या मैसेज लिखें..." class="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs md:text-sm font-semibold bg-slate-50 focus:bg-white focus:border-royal-500 outline-none">
                    <button type="submit" id="btnSendUserChat" class="bg-dark-900 hover:bg-black text-royal-300 font-black px-5 py-2.5 rounded-xl text-xs md:text-sm shadow-glow transition flex items-center gap-1.5 shrink-0">
                        <span>Send</span> <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </form>
            </div>
        `;
        window.renderUserLiveChatMessages();
        if (window.currentUserData && window.currentUserChatData?.unreadByUser === true) {
            try {
                await updateDoc(doc(db, "supportTickets", window.currentUserData.uid), { unreadByUser: false });
            } catch (e) {}
        }
        const headerBadge = document.getElementById('headerSupportUnreadBadge');
        const gearBadge = document.getElementById('gearSupportUnreadBadge');
        if (headerBadge) headerBadge.style.display = 'none';
        if (gearBadge) gearBadge.style.display = 'none';
        return;
    }

    // ADD CREDITS + VIP PAGE
    if (serviceName === 'add_credit') {
        container.innerHTML = `
            <div id="walletMainUI" class="max-w-md mx-auto">
                <div id="paymentStep1" class="space-y-4">
                    <div class="flex justify-between items-center border-b border-slate-100 pb-2.5">
                        <div>
                            <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-wallet text-royal-500 mr-1.5"></i> Add Credit & VIP</h3>
                            <p class="text-[11px] font-bold text-slate-400">₹1 = 1 Credit | Min Credit Recharge: ₹100</p>
                        </div>
                        <button onclick="window.switchService('payments_history')" class="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg">
                            <i class="fa-solid fa-receipt mr-1"></i> पेमेंट हिस्ट्री
                        </button>
                    </div>
                    
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">क्रेडिट अमाउंट डालें (न्यूनतम ₹100)</label>
                        <input type="number" id="rupeeAmount" placeholder="Min ₹100 (सिर्फ VIP लेने के लिए 0 छोड़ें)" min="100" oninput="window.calculateCredits()" class="w-full p-3 border border-slate-300 rounded-xl text-base font-black bg-slate-50 focus:bg-white focus:ring-2 focus:ring-royal-500 outline-none text-center text-dark-900">
                    </div>

                    <div class="p-3.5 rounded-2xl bg-dark-900 text-white border border-royal-400 space-y-2.5">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-black uppercase text-royal-300"><i class="fa-solid fa-crown text-yellow-400 mr-1"></i> VIP प्लान जोड़ें (DOB 18+ व सारे Annexures अनलॉक)</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <label class="flex items-center gap-2 p-2 rounded-xl bg-dark-800 border border-slate-700 cursor-pointer">
                                <input type="radio" name="vipPlanOption" value="0" data-price="0" checked onchange="window.calculateCredits()" class="w-3.5 h-3.5 accent-amber-400">
                                <div class="text-left leading-tight">
                                    <div class="text-[11px] font-bold text-slate-200">सिर्फ क्रेडिट</div>
                                    <div class="text-[10px] text-slate-400">+ ₹0</div>
                                </div>
                            </label>
                            <label class="flex items-center gap-2 p-2 rounded-xl bg-dark-800 border border-royal-500/40 cursor-pointer">
                                <input type="radio" name="vipPlanOption" value="30" data-price="149" onchange="window.calculateCredits()" class="w-3.5 h-3.5 accent-amber-400">
                                <div class="text-left leading-tight">
                                    <div class="text-[11px] font-black text-royal-300">1 Month (30d)</div>
                                    <div class="text-[10px] font-black text-green-400">+ ₹149</div>
                                </div>
                            </label>
                            <label class="flex items-center gap-2 p-2 rounded-xl bg-dark-800 border border-royal-500/40 cursor-pointer">
                                <input type="radio" name="vipPlanOption" value="60" data-price="249" onchange="window.calculateCredits()" class="w-3.5 h-3.5 accent-amber-400">
                                <div class="text-left leading-tight">
                                    <div class="text-[11px] font-black text-royal-300">2 Months (60d)</div>
                                    <div class="text-[10px] font-black text-green-400">+ ₹249</div>
                                </div>
                            </label>
                            <label class="flex items-center gap-2 p-2 rounded-xl bg-dark-800 border border-royal-500/40 cursor-pointer">
                                <input type="radio" name="vipPlanOption" value="90" data-price="299" onchange="window.calculateCredits()" class="w-3.5 h-3.5 accent-amber-400">
                                <div class="text-left leading-tight">
                                    <div class="text-[11px] font-black text-royal-300">3 Months (90d)</div>
                                    <div class="text-[10px] font-black text-green-400">+ ₹299</div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase block">आपको मिलेंगे</span>
                            <div class="flex items-center gap-1.5">
                                <span class="text-base font-black text-dark-900" id="calculatedCredits">0 Cr</span>
                                <span id="vipSummaryBadge" style="display: none;" class="bg-amber-400 text-dark-950 text-[10px] font-black px-2 py-0.5 rounded-full">👑 +30d VIP</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] font-bold text-slate-400 uppercase block">कुल पेमेंट</span>
                            <span id="totalPayableDisplay" class="text-xl font-black text-green-600">₹0</span>
                        </div>
                    </div>
                    
                    <button id="btnGenerateQR" onclick="window.generateQR()" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-glow transition text-sm">
                        Proceed to Pay (QR & UPI Link) <i class="fa-solid fa-arrow-right ml-1"></i>
                    </button>
                </div>

                <div id="qrSection" style="display: none;" class="flex-col items-center space-y-3 bg-slate-50 p-4 rounded-2xl border-2 border-royal-400">
                    <div class="w-full flex justify-between items-center">
                        <button type="button" onclick="window.cancelAndBackToPaymentStep1()" class="text-xs font-bold text-red-600 hover:bg-red-50 bg-white px-2.5 py-1.5 rounded-lg border border-red-200">
                            <i class="fa-solid fa-ban mr-1"></i> Cancel &amp; Back
                        </button>
                        <span id="qrPayableAmountText" class="text-sm font-black text-green-700 bg-green-100 px-3 py-1 rounded-lg border border-green-300">कुल पेमेंट: ₹0</span>
                    </div>

                    <div class="w-full p-2.5 bg-green-50 border border-green-300 rounded-xl text-center text-[11px] font-bold text-green-800 animate-pulse">
                        <i class="fa-solid fa-satellite-dish mr-1"></i> Auto-Verification चालू है! पेमेंट करते ही क्रेडिट्स अपने-आप जुड़ जाएंगे।
                    </div>

                    <div class="w-full bg-white p-3 rounded-xl border border-green-200 shadow-sm space-y-2">
                        <p class="text-[11px] font-black text-slate-700 text-center">
                            <i class="fa-solid fa-mobile-screen-button text-green-600 mr-1"></i> मोबाइल से 1-Click में सीधे ऐप खोलकर पेमेंट करें:
                        </p>
                        <a id="btnDirectUpiPay" href="#" class="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-black py-3 px-4 rounded-xl shadow transition text-xs md:text-sm flex items-center justify-center gap-2">
                            <i class="fa-solid fa-bolt"></i> Pay Directly via Any UPI App
                        </a>
                        <div class="grid grid-cols-3 gap-2 pt-1">
                            <a id="btnPaytmApp" href="#" class="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-black py-2 rounded-lg text-[11px] text-center transition">Paytm</a>
                            <a id="btnPhonePeApp" href="#" class="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-black py-2 rounded-lg text-[11px] text-center transition">PhonePe</a>
                            <a id="btnGPayApp" href="#" class="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-black py-2 rounded-lg text-[11px] text-center transition">GPay</a>
                        </div>
                    </div>

                    <div class="flex items-center w-full gap-2">
                        <div class="h-px bg-slate-200 flex-1"></div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase">या QR स्कैन करें</span>
                        <div class="h-px bg-slate-200 flex-1"></div>
                    </div>

                    <div class="p-2 border border-slate-200 rounded-xl bg-white shadow-sm">
                        <img id="upiQRCode" src="" alt="UPI QR Code" class="w-36 h-36 object-contain">
                    </div>
                    
                    <div class="w-full pt-2 border-t border-slate-200">
                        <div class="text-center">
                            <p class="text-[11px] font-semibold text-slate-500">पेमेंट कट गया पर क्रेडिट नहीं जुड़ा?</p>
                            <button type="button" onclick="window.togglePaymentTicketBox()" class="text-xs font-black text-amber-700 hover:text-amber-900 underline mt-1">
                                <i class="fa-solid fa-circle-question mr-1"></i> Payment Issue? Raise Ticket with UTR
                            </button>
                        </div>

                        <div id="paymentIssueTicketBox" style="display: none;" class="mt-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-300 space-y-2.5">
                            <p class="text-[11px] font-black text-amber-950">पेमेंट के बाद प्राप्त 12 अंकों का UTR नंबर दर्ज करें:</p>
                            <input type="text" id="ticketUtrInput" placeholder="Enter 12-Digit UTR Number" maxlength="16" class="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-bold uppercase bg-white text-center tracking-widest outline-none">
                            <button type="button" id="btnRaisePaymentTicket" onclick="window.submitPaymentIssueTicket()" class="w-full bg-dark-900 text-royal-300 hover:bg-black font-black py-2.5 rounded-xl text-xs shadow transition">
                                Submit Ticket (24 Hours Resolution) <i class="fa-solid fa-clock-rotate-left ml-1"></i>
                            </button>
                            <p class="text-[10px] text-amber-800 text-center font-medium">टिकट रेज़ होने पर 24 घंटे के अंदर आपकी समस्या का समाधान करके क्रेडिट जोड़ दिया जाएगा।</p>
                            <div id="paymentTicketResultMsg" style="display: none;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    if (serviceName === 'payments_history') {
        container.innerHTML = getPaymentHistorySectionHtml();
        window.loadUserPayments();
        return;
    }

    if (serviceName === 'password') {
        container.innerHTML = `
            <div class="max-w-md mx-auto">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 bg-royal-100 text-royal-600 rounded-xl flex items-center justify-center text-base font-bold"><i class="fa-solid fa-key"></i></div>
                        <div>
                            <h3 class="text-base font-black text-dark-900">Change Password</h3>
                            <p class="text-[11px] text-slate-400">पुराना पासवर्ड डालकर नया पासवर्ड सेट करें</p>
                        </div>
                    </div>
                    <button type="button" onclick="window.selectGearOption('support_chat')" class="text-[11px] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-xl">
                        <i class="fa-solid fa-comments mr-1"></i> Support Chat
                    </button>
                </div>

                <form onsubmit="window.handleChangePassword(event)" class="space-y-3.5">
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Current Password (पुराना पासवर्ड)</label>
                        <input type="password" id="currentPassword" required placeholder="Enter current password" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">New Password (नया पासवर्ड)</label>
                        <input type="password" id="newPassword" required minlength="6" placeholder="Minimum 6 characters" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Confirm New Password (दोबारा लिखें)</label>
                        <input type="password" id="confirmPassword" required minlength="6" placeholder="Re-enter new password" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none">
                    </div>
                    <div id="passwordMsgBox" style="display: none;"></div>
                    <button type="submit" id="btnChangePass" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-glow transition text-sm">
                        Update Password <i class="fa-solid fa-lock ml-1"></i>
                    </button>
                </form>
            </div>
        `;
        return;
    }

    if (serviceName === 'history') {
        const isVipUser = window.currentUserData && window.currentUserData.isVip;
        const domOpt = cfg.showDomicile ? `<option value="Domicile">मूल निवास</option>` : '';
        const casOpt = cfg.showCaste ? `<option value="Caste">जाति प्रमाण पत्र</option>` : '';
        const dobOpt = (isVipUser && cfg.showDob18) ? `<option value="DOB 18+">DOB (18+)</option>` : '';

        const vipFilterOptions = isVipUser ? `
            ${dobOpt}
            <option value="Annexure 1">Annexure 1</option>
            <option value="Annexure 1A">Annexure 1A</option>
            <option value="Annexure 3">Annexure 3</option>
            <option value="Annexure 3A">Annexure 3A</option>
            <option value="Annexure B">Annexure B</option>
            <option value="Annexure C">Annexure C</option>
            <option value="Annexure D">Annexure D</option>
            <option value="Annexure E">Annexure E</option>
            <option value="Annexure F">Annexure F</option>
        ` : '';

        container.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-3 mb-4">
                <div>
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-folder-open text-royal-500 mr-1.5"></i> Document History</h3>
                    <p id="userHistoryCount" class="text-[11px] font-bold text-royal-600">Total Files: 0</p>
                </div>
                
                <div class="flex items-center gap-2">
                    <select onchange="window.renderHistory(this.value)" class="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold outline-none">
                        <option value="ALL">All Documents</option>
                        ${domOpt}
                        ${casOpt}
                        ${vipFilterOptions}
                    </select>
                    <button onclick="window.loadUserHistory()" class="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-200"><i class="fa-solid fa-rotate-right"></i></button>
                </div>
            </div>
            
            <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-left border-collapse bg-white min-w-[500px]">
                    <thead class="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase">
                        <tr><th class="p-3">File Name</th><th class="p-3">Type</th><th class="p-3">Date & Time</th><th class="p-3 text-right">Action</th></tr>
                    </thead>
                    <tbody id="historyTableBody" class="text-xs text-slate-700"></tbody>
                </table>
            </div>
        `;
        window.loadUserHistory();
    }
};
