// ============================================================================
// FILE 1: js/config-templates.js
// (Firebase Config, Common Helpers, District Maps, 2-Page Layout & All 9 Annexures)
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, 
    updatePassword, EmailAuthProvider, reauthenticateWithCredential 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, collection, 
    addDoc, getDocs, query, where, onSnapshot, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyBSiDAvDYyBG8hkmez7s900JHhlbenG2nU",
    authDomain: "oaps-d2cce.firebaseapp.com",
    projectId: "oaps-d2cce",
    storageBucket: "oaps-d2cce.firebasestorage.app",
    messagingSenderId: "619616461386",
    appId: "1:619616461386:web:c3b9b36815369c6f5d7cb3",
    measurementId: "G-5Y6RHLE2LK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.fb = {
    firebaseConfig, app, auth, db,
    signInWithEmailAndPassword, signOut, onAuthStateChanged,
    updatePassword, EmailAuthProvider, reauthenticateWithCredential,
    doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, onSnapshot, deleteDoc
};

// ================= CUSTOM STYLISH ALERT =================
window.alert = function(message) {
    let alertModal = document.getElementById('customAlertModal');
    if (!alertModal) {
        alertModal = document.createElement('div');
        alertModal.id = 'customAlertModal';
        alertModal.className = 'fixed inset-0 z-[99999] flex items-center justify-center bg-dark-950/85 backdrop-blur-sm p-4 opacity-0 pointer-events-none transition-all duration-300';
        alertModal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl border-t-4 border-royal-500 max-w-sm w-full p-6 text-center transform scale-95 transition-transform duration-300">
                <div class="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden p-2">
                    <img src="logo.png" alt="Ojas Logo" class="w-full h-full object-contain" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1211/1211833.png'">
                </div>
                <h2 class="text-lg font-black text-dark-900 mb-2">Ojas Print Service</h2>
                <p id="customAlertMessage" class="text-sm font-semibold text-slate-600 mb-6 whitespace-pre-line"></p>
                <button onclick="window.closeCustomAlert()" class="bg-dark-900 hover:bg-black text-royal-300 font-black py-3 px-6 rounded-xl shadow-glow transition w-full text-sm">
                    OK, Got it!
                </button>
            </div>
        `;
        document.body.appendChild(alertModal);
        
        window.closeCustomAlert = function() {
            alertModal.classList.remove('opacity-100', 'pointer-events-auto');
            alertModal.classList.add('opacity-0', 'pointer-events-none');
            alertModal.querySelector('div').classList.remove('scale-100');
            alertModal.querySelector('div').classList.add('scale-95');
        };
    }
    document.getElementById('customAlertMessage').innerText = message;
    alertModal.classList.remove('opacity-0', 'pointer-events-none');
    alertModal.classList.add('opacity-100', 'pointer-events-auto');
    alertModal.querySelector('div').classList.remove('scale-95');
    alertModal.querySelector('div').classList.add('scale-100');
};

// ================= STRICT ADMIN & FREE VIP CONFIG =================
window.ADMIN_EMAIL = "hkosiun1221@gmail.com";
window.FREE_VIP_EMAILS = [
    "aadhaar@gmail.com",
    "danish@print.com"
];
window.MS_PER_DAY = 24 * 60 * 60 * 1000;

window.isAllowedPortalEmail = function(email) {
    if (!email) return false;
    const cleanEmail = String(email).trim().toLowerCase();
    if (cleanEmail === window.ADMIN_EMAIL) return true;
    if (window.FREE_VIP_EMAILS.includes(cleanEmail)) return true;
    return cleanEmail.endsWith("@print.com");
};

// ================= DEPLOYED GOOGLE APPS SCRIPT API URLS =================
window.API_URLS = {
    "domicile": "https://script.google.com/macros/s/AKfycbwqvv_hWDzTltYcP7UDC41uPM7X2wvCzYFvu_eKu8t82TJf_f4QD5tLQtZ23_JCgYlgFA/exec",
    "DOB": "https://script.google.com/macros/s/AKfycbyncAUbXWLplC_uHgodCqhPCDLTWFiWEQVzxPAInLP7zedGUQRdRbvix_jdDBJrYMlc9w/exec",
    "CASTE": "https://script.google.com/macros/s/AKfycbzUs_e_ga3Ly3SQ9qq5inqHgfC23-jzav8sjUES7XnPw7cyUn3DHhVEBFdgxqUejU5Y/exec"
};

// ================= GLOBAL DROPDOWN OPTIONS LISTS =================
window.DOC_OPTIONS_LIST = [
    "BIRTH CERTIFICATE",
    "INVALID BIRTH CERTIFICATE",
    "MARKSHEET",
    "SCHOOL LEAVING CERTIFICATE",
    "TRANSFER CERTIFICATE",
    "PASSPORT",
];

window.VLE_NAMES_LIST = [
    "कपिल", "सचिन", "नसीम", "शौकीन", "राहुल", "अमन", "मोहित"
];

window.CASTE_OPTIONS_LIST = [
    "गुर्जर", "कश्यप", "अहीर", "ब्राह्मण", "सैनी", "प्रजापति", "राजपूत", "त्यागी", "वाल्मीकि"
];

window.DISTRICT_DATA_MAP = {
    'BAGHPAT': {
        tehsils: ['बड़ौत', 'खेकड़ा', 'बागपत'],
        thanas: ['बड़ौत', 'खेकड़ा', 'बागपत', 'छपरोली', 'बिनौली', 'रमाला', 'दोघट', 'सिंघावली अहीर', 'बालैनी', 'चांदीनगर']
    },
    'SHAMLI': {
        tehsils: ['कैराना', 'ऊन', 'शामली'],
        thanas: ['थाना भवन', 'कैराना', 'झिंझाना', 'शामली', 'बाबरी', 'कांधला', 'गढ़ी पुख्ता', 'आदर्श मंडी']
    },
    'MUZAFFARNAGAR': {
        tehsils: ['बुढ़ाना', 'खतौली', 'जानसठ', 'मुजफ्फरनगर'],
        thanas: ['बुढ़ाना', 'खतौली', 'जानसठ', 'मीरापुर', 'सिविल लाइन', 'कोतवाली नगर', 'नई मंडी', 'चरथावल', 'पुरकाजी', 'छपार', 'मंसूरपुर', 'शाहपुर', 'सिखेड़ा', 'फुगाना', 'भौराकलां', 'ककरौली', 'भोपा', 'रतनपुरी', 'तितावी', 'रामराज']
    },
    'MEERUT': {
        tehsils: ['मेरठ', 'मवाना', 'सरधना'],
        thanas: ['मवाना', 'सरधना', 'जानी', 'रोहटा', 'परतापुर', 'कंकरखेड़ा', 'दौराला', 'हस्तिनापुर', 'बहसूमा', 'फलावदा', 'किठौर', 'मुंडाली', 'खरखौदा', 'इंचौली', 'गंगानगर', 'मेडिकल', 'नौचंदी', 'सिविल लाइन', 'कोतवाली', 'देहली गेट', 'लिसाड़ी गेट', 'ब्रह्मपुरी', 'टीपी नगर', 'पल्लवपुरम', 'सरूरपुर', 'लालकुर्ती', 'सदर बाजार', 'रेलवे रोड', 'लोहियानगर']
    },
    'SAHARANPUR': {
        tehsils: ['सहारनपुर', 'बेहट', 'देवबंद', 'रामपुर मनिहारन', 'नकुड़'],
        thanas: ['बेहट', 'देवबंद', 'रामपुर मनिहारन', 'नकुड़', 'गंगोह', 'चिलकाना', 'सरसावा', 'तीतरों', 'नानौता', 'बड़गांव', 'मिर्जापुर', 'फतेहपुर', 'गागलहेड़ी', 'नागल', 'कोतवाली देहात', 'कोतवाली नगर', 'सदर बाजार', 'कुतुबशेर', 'जनकपुरी', 'मंडी', 'बिहारीगढ़']
    },
    'GHAZIABAD': {
        tehsils: ['गाजियाबाद', 'मोदीनगर', 'लोनी'],
        thanas: ['मोदीनगर', 'लोनी', 'मुरादनगर', 'भोजपुर', 'निवाड़ी', 'लोनी बॉर्डर', 'ट्रॉनिका सिटी', 'अंकुर विहार', 'साहिबाबाद', 'लिंक रोड', 'टीला मोड़', 'शालीमार गार्डन', 'इंदिरापुरम', 'कौशांबी', 'खोड़ा', 'विजयनगर', 'क्रॉसिंग रिपब्लिक', 'कोतवाली घंटाघर', 'सिहानी गेट', 'नंदग्राम', 'कविनगर', 'मधुबन बापूधाम', 'मसूरी', 'वेव सिटी']
    }
};

// ================= COMMON FORM HELPERS =================
window.buildDocSelectOptions = function(defaultVal = "BIRTH CERTIFICATE") {
    return window.DOC_OPTIONS_LIST.map(docName => 
        `<option value="${docName}" ${docName === defaultVal ? 'selected' : ''}>${docName}</option>`
    ).join('') + `<option value="OTHER">OTHER (खुद टाइप करें)</option>`;
};

window.toggleCustomInput = function(selectEl, customInputId) {
    const customInp = document.getElementById(customInputId);
    if (!customInp) return;
    if (selectEl.value === 'OTHER') {
        customInp.style.display = 'block';
        customInp.required = true;
        customInp.focus();
    } else {
        customInp.style.display = 'none';
        customInp.required = false;
        customInp.value = '';
    }
};

window.format12DigitId = function(el) {
    const digits = el.value.replace(/\D/g, '').substring(0, 12);
    el.value = digits.match(/.{1,4}/g)?.join(' ') || '';
};

window.toggleNaField = function(checkbox, inputId, originalType = 'text') {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    if (checkbox.checked) {
        if (inp.type === 'date') inp.type = 'text';
        inp.value = 'NA';
        inp.readOnly = true;
        inp.classList.add('bg-slate-200', 'text-slate-600', 'cursor-not-allowed');
    } else {
        inp.type = originalType;
        inp.value = '';
        inp.readOnly = false;
        inp.classList.remove('bg-slate-200', 'text-slate-600', 'cursor-not-allowed');
        inp.focus();
    }
};

window.cleanDob18AddressString = function(rawVal = '') {
    let val = String(rawVal).toUpperCase();
    val = val.replace(/[\s,\-\/]*(?:UTT[AE]R\s*PRADESH|उत्तर\s*प्रदेश|उत्तरप्रदेश)[\s,\-\/]*/gi, ' ');
    val = val.replace(/\s{2,}/g, ' ');
    if (val.trim() !== 'VILL -') {
        val = val.replace(/[,\-]+$/, '');
    }
    if (val.length > 38) {
        val = val.substring(0, 38);
    }
    return val;
};

window.handleDob18AddressInput = function(el) {
    const rawUpper = el.value.toUpperCase();
    const hasUP = /(?:UTT[AE]R\s*PRADESH|उत्तर\s*प्रदेश|उत्तरप्रदेश)/i.test(rawUpper);
    if (hasUP || rawUpper.length > 38) {
        el.value = window.cleanDob18AddressString(rawUpper);
    } else {
        el.value = rawUpper;
    }

    const counterEl = document.getElementById('dobAddressCharCount');
    if (counterEl) {
        const len = el.value.length;
        counterEl.innerText = `${len} / 38 Characters`;
        counterEl.className = len >= 38 
            ? "text-[10px] font-black text-red-600" 
            : "text-[10px] font-bold text-slate-400";
    }
};

window.updateTehsilsAndThanas = function() {
    const districtEl = document.getElementById('districtSelect');
    const tehsilSelect = document.getElementById('tehsilSelect');
    const thanaSelect = document.getElementById('thanaSelect');
    if (!districtEl || !tehsilSelect) return;

    const selectedDistrict = districtEl.value;
    const data = window.DISTRICT_DATA_MAP[selectedDistrict] || window.DISTRICT_DATA_MAP['BAGHPAT'];

    tehsilSelect.innerHTML = data.tehsils.map(t => `<option value="${t}">${t}</option>`).join('');
    if (thanaSelect) {
        thanaSelect.innerHTML = data.thanas.map(th => `<option value="${th}">${th}</option>`).join('');
    }
};

window.formatDateIN = function(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
};

window.getOrdinalDay = function(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

window.initVerificationDefaults = function() {
    const now = new Date();
    const dayEl = document.getElementById('inpDay');
    const myEl = document.getElementById('inpMonthYear');
    if (dayEl) dayEl.value = window.getOrdinalDay(now.getDate());
    if (myEl) myEl.value = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
};

window.syncAnnexureENames = function() {
    const appName = document.getElementById('inpApplicantName')?.value.trim().toUpperCase() || '';
    const rec1Input = document.getElementById('inpRecorded1');
    const rec2Input = document.getElementById('inpRecorded2');
    const retainInput = document.getElementById('inpRetainName');
    const removeInput = document.getElementById('inpRemoveName');

    if (appName && document.activeElement?.id === 'inpApplicantName') {
        const urfSplit = appName.split(/\s+(?:URF|ALIAS|उर्फ|उर्फ़)\s+/i);
        if (urfSplit.length >= 2) {
            const firstName = urfSplit[0].trim();
            const aliasName = urfSplit.slice(1).join(' ').trim();
            if (rec1Input) rec1Input.value = firstName;
            if (rec2Input) rec2Input.value = aliasName;
            if (retainInput) retainInput.value = firstName;
            if (removeInput) removeInput.value = aliasName;
        } else {
            if (rec1Input) rec1Input.value = appName;
            if (retainInput) retainInput.value = appName;
        }
    } else if (document.activeElement?.id === 'inpRecorded1' && retainInput) {
        retainInput.value = rec1Input.value.toUpperCase();
    } else if (document.activeElement?.id === 'inpRecorded2' && removeInput) {
        removeInput.value = rec2Input.value.toUpperCase();
    }
};

window.swapAnnexureERetainRemove = function() {
    const retainInput = document.getElementById('inpRetainName');
    const removeInput = document.getElementById('inpRemoveName');
    if (!retainInput || !removeInput) return;
    const temp = retainInput.value;
    retainInput.value = removeInput.value;
    removeInput.value = temp;
};

// ================= TRANSPARENT STAMP LOADER =================
window.userStampCache = {};
window.getTransparentStampDataUrl = function(fileName = 'stamp.png') {
    if (window.userStampCache[fileName]) return Promise.resolve(window.userStampCache[fileName]);
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
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
                const url = canvas.toDataURL('image/png');
                window.userStampCache[fileName] = url;
                resolve(url);
            } catch (e) {
                resolve(fileName);
            }
        };
        img.onerror = () => resolve(fileName);
        img.src = fileName;
    });
};

// ================= 2-PAGE LAYOUT (CERTIFICATE + ANNEXURE) =================
window.buildLocalAffidavitHtml = function(fileId, d = {}, withShadow = true, withStamp = false, stampSrc = '', withCertificate = false, certApiUrl = '') {
    const shadowClass = withShadow ? 'shadow-2xl' : '';
    const finalStampSrc = stampSrc || (typeof window.pickRandomAvailableStamp === 'function' ? window.pickRandomAvailableStamp() : 'stamp.png');
    
    const stampOverlayHtml = (withStamp && finalStampSrc) ? `
        <div class="stamp-overlay-layer">
            <img src="${finalStampSrc}" onerror="this.style.display='none'" />
        </div>
    ` : '';

    let relRaw = (d.rel || 'S/o').toUpperCase();
    let relCode = 'SO';
    if (relRaw.includes('D') || relRaw.includes('पुत्री')) relCode = 'DO';
    else if (relRaw.includes('W') || relRaw.includes('पत्नी')) relCode = 'WO';

    const candidateName = (d.applicantName || d.childName || d.parentName || '').toUpperCase();
    const fatherName = (d.relativeName || '').toUpperCase();
    const docDate = d.date || new Date().toLocaleDateString('en-IN');

    // --- PAGE 1: CERTIFICATE ---
    const certificatePageHtml = withCertificate ? `
        <div class="affidavit-paper ${shadowClass}" style="page-break-after: always; margin-bottom: 20px;">
            ${stampOverlayHtml}
            <div>
                <div style="text-align: center; font-weight: bold; font-size: 20px; text-decoration: underline; margin-bottom: 10px; color: #1e293b;">
                    VERIFICATION &amp; CERTIFICATE
                </div>
                <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 30px; color: #475569;">
                    Ojas Print Service - Official Verification Certificate
                </div>
                
                <div style="text-align: justify; line-height: 1.8; font-size: 16px; margin-bottom: 25px;">
                    This is to certify and officially verify that the details provided in the attached affidavit/annexure for the candidate <span class="filled-val">${candidateName}</span> (${relCode}) <span class="filled-val">${fatherName}</span> have been thoroughly reviewed and processed through the portal on date <span class="filled-val">${docDate}</span>.
                </div>

                <div style="background: #f8fafc; border: 2px solid #cbd5e1; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
                    <table style="width: 100%; font-size: 15px; line-height: 1.8;">
                        <tr>
                            <td style="font-weight: bold; width: 40%;">Candidate Name:</td>
                            <td class="filled-val">${candidateName}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold;">Relation Code (${relCode}):</td>
                            <td class="filled-val">${fatherName}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold;">Submission Date:</td>
                            <td class="filled-val">${docDate}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold;">Verification Status:</td>
                            <td style="color: #16a34a; font-weight: bold;">VERIFIED &amp; APPROVED</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; font-weight: bold; border-top: 2px solid #e2e8f0; padding-top: 15px;">
                <div>Date: <span class="filled-val">${docDate}</span></div>
                <div style="text-align: right;">
                    <div style="height: 30px;"></div>
                    <div style="border-top: 1px solid #000; padding-top: 4px;">Authorized Signatory / Admin</div>
                </div>
            </div>
        </div>
    ` : '';

    // --- PAGE 2: ANNEXURE CONTENT ---
    let annexureBodyHtml = '';

    if (fileId === 'LOCAL_HTML_ANNEXURE_1') {
        annexureBodyHtml = `
            <div class="affidavit-paper ${shadowClass}">
                ${stampOverlayHtml}
                <div>
                    <div style="text-align: center; font-weight: bold; font-size: 17px; text-decoration: underline; margin-bottom: 6px;">Annexure-I- For Adults</div>
                    <div style="text-align: center; font-weight: bold; font-size: 16px; text-decoration: underline; margin-bottom: 10px;">Affidavit for date of birth updation</div>
                    <div style="text-align: justify; line-height: 1.75; margin-bottom: 14px;">
                        1. I, <span class="filled-val">${candidateName}</span> ${d.rel || 'S/D/W/o'} <span class="filled-val">${fatherName}</span> resident of <span class="filled-val">${d.address || ''}</span> holding ID number <span class="filled-val">${d.idNumber || ''}</span> do hereby solemnly affirm and declare as under:-
                    </div>
                </div>
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 26px; font-weight: bold;">
                        <div>Date: <span class="filled-val">${docDate}</span></div>
                        <div style="text-align: right;"><div class="filled-val">${candidateName}</div><div>Name &amp; Signature</div></div>
                    </div>
                </div>
            </div>
        `;
    } else {
        annexureBodyHtml = `
            <div class="affidavit-paper ${shadowClass}">
                ${stampOverlayHtml}
                <div style="padding: 40px;">
                    <h2 style="text-align:center; font-weight:bold; text-decoration:underline;">${fileId}</h2>
                    <p style="margin-top:20px; font-size:16px;">Candidate: <b>${candidateName}</b> (${relCode}) <b>${fatherName}</b></p>
                    <p style="margin-top:10px; font-size:16px;">Date: <b>${docDate}</b></p>
                </div>
            </div>
        `;
    }

    return certificatePageHtml + annexureBodyHtml;
};

// ================= SHARED PDF DOWNLOAD & PRINT FUNCTIONS =================
window.downloadHtmlDocAsPdf = async function(fileId, formDataObj, fileName, withStamp = false, stampSrc = '', withCert = false) {
    const savedScrollX = window.scrollX;
    const savedScrollY = window.scrollY;
    window.scrollTo(0, 0);

    const tempWrapper = document.createElement('div');
    tempWrapper.style.cssText = 'position:fixed;top:0;left:0;width:794px;margin:0;padding:0;z-index:99999;background:#ffffff;';
    tempWrapper.innerHTML = window.buildLocalAffidavitHtml(fileId, formDataObj, false, withStamp, stampSrc, withCert);
    document.body.appendChild(tempWrapper);

    try {
        const opt = {
            margin: 0,
            filename: fileName,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 2, useCORS: true, width: 794 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(tempWrapper).save();
    } catch (err) {
        alert("PDF डाउनलोड करने में समस्या आई।");
    } finally {
        document.body.removeChild(tempWrapper);
        window.scrollTo(savedScrollX, savedScrollY);
    }
};

window.directPrintDocument = async function(fileId, formDataObj, fileName, withStamp = false, stampSrc = '', withCert = false) {
    const htmlContent = window.buildLocalAffidavitHtml(fileId, formDataObj, false, withStamp, stampSrc, withCert);
    let printFrame = document.getElementById('directPrintIframe');
    if (printFrame) document.body.removeChild(printFrame);

    printFrame = document.createElement('iframe');
    printFrame.id = 'directPrintIframe';
    printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${fileName}</title>
            <style>
                @page { size: A4; margin: 0; }
                html, body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .affidavit-paper {
                    position: relative !important;
                    font-family: 'Times New Roman', Times, serif;
                    width: 794px;
                    height: 1122px;
                    padding: 46px 62px;
                    background: #ffffff;
                    color: #000000;
                    font-size: 15px;
                    line-height: 1.55;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    margin: 0 !important;
                    page-break-after: always;
                    overflow: hidden;
                }
                .filled-val { font-weight: bold !important; text-decoration: underline !important; }
                .stamp-overlay-layer { position: absolute; top: 0; left: 0; width: 794px; height: 1122px; pointer-events: none; z-index: 30; mix-blend-mode: multiply; }
                .stamp-overlay-layer img { width: 794px; height: 1122px; object-fit: contain; }
            </style>
        </head>
        <body>${htmlContent}</body>
        </html>
    `);
    frameDoc.close();

    setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
    }, 250);
};
