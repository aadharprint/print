// ============================================================================
// FILE 2: js/portal-forms.js 
// ============================================================================

import "./config-templates.js";

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image(); img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 250; const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.2)); 
            };
        };
    });
}

window.saveFormDataToSession = function(serviceName) { const form = document.querySelector('#formContainer form'); if (!form) return; const fd = new FormData(form); const dataObj = {}; fd.forEach((val, key) => { if (key !== 'PHOTO' && typeof val === 'string') { dataObj[key] = val; } }); sessionStorage.setItem('ojas_draft_' + serviceName, JSON.stringify(dataObj)); };
window.restoreFormDataFromSession = function(serviceName) { const savedStr = sessionStorage.getItem('ojas_draft_' + serviceName); if (!savedStr) return; try { const dataObj = JSON.parse(savedStr); const form = document.querySelector('#formContainer form'); if (!form) return; Object.keys(dataObj).forEach(key => { const input = form.querySelector(`[name="${key}"]`); if (input && input.type !== 'file') { if (input.type === 'checkbox' || input.type === 'radio') { if (input.value === dataObj[key]) input.checked = true; } else { input.value = dataObj[key]; } input.dispatchEvent(new Event('change')); } }); } catch (e) {} };

window.submitForm = async function(event, serviceType) {
    event.preventDefault(); const { db, doc, updateDoc, collection, addDoc } = window.fb;
    if (!window.currentUserData) return alert('Please login first!');
    if (!window.isAllowedPortalEmail(window.currentUserData.email)) return alert('अमान्य यूज़र आईडी!');

    // PERMISSION CHECK WITH NEW STEALTH LOGIC
    if (serviceType === 'Domicile' && !window.canCurrentUserSeeService('domicile')) return alert('यह सर्विस बंद है।');
    if (serviceType === 'Caste' && !window.canCurrentUserSeeService('caste')) return alert('यह सर्विस बंद है।');
    if (serviceType === 'DOB Meerut 18+' && !window.canCurrentUserSeeService('dob18')) return alert('यह सर्विस बंद है।');
    if (serviceType === 'DOB Delhi 18+' && !window.canCurrentUserSeeService('dob_minor')) return alert('यह सर्विस बंद है।');
    if (serviceType === 'Passport' && !window.canCurrentUserSeeService('passport')) return alert('यह सर्विस बंद है।');

    const docCost = 10;
    if (!window.currentUserData.hasFreeAccess && window.currentUserData.credits < docCost) return alert(`Insufficient credits!`);

    const formElement = event.target; const submitBtn = formElement.querySelector('button[type="submit"]'); const originalBtnText = submitBtn.innerHTML; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Processing...'; submitBtn.disabled = true;
    const formData = new FormData(formElement); formData.append('USER_ID', window.currentUserData.email); formData.append('SERVICE_TYPE', serviceType);

    // ROUTING
    let targetUrl = "";
    if (serviceType === 'Domicile') targetUrl = window.API_URLS["domicile"];
    else if (serviceType === 'Caste') targetUrl = window.API_URLS["CASTE"];
    else if (serviceType === 'DOB Meerut 18+' || serviceType === 'DOB Delhi 18+') targetUrl = window.API_URLS["DOB"];
    else if (serviceType === 'Passport') targetUrl = window.API_URLS["PASSPORT"];

    try {
        const photoInput = formElement.querySelector('input[type="file"]'); let base64Photo = "";
        if (photoInput && photoInput.files[0]) { base64Photo = await compressImage(photoInput.files[0]); formData.set('PHOTO', base64Photo); }
        const dataObj = {}; formData.forEach((v, k) => { dataObj[k] = v; });
        if (dataObj.CAST === 'OTHER' && dataObj.CAST_CUSTOM) dataObj.CAST = dataObj.CAST_CUSTOM.trim();
        if (dataObj.VLE === 'OTHER' && dataObj.VLE_CUSTOM) dataObj.VLE = dataObj.VLE_CUSTOM.trim();
        if ((serviceType.includes('DOB') || serviceType === 'Passport') && dataObj.ADDRESS) dataObj.ADDRESS = window.cleanDob18AddressString(dataObj.ADDRESS).trim();

        let result = null;
        try { const response = await fetch(targetUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dataObj) }); result = await response.json(); } 
        catch (networkError) { alert('सर्वर टाइमआउट एरर। कृपया दोबारा क्लिक करें।'); submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false; return; }

        if (result && result.success && result.fileId) {
            if (!window.currentUserData.hasFreeAccess) { const userDocRef = doc(db, "users", window.currentUserData.uid); const newCredits = window.currentUserData.credits - docCost; await updateDoc(userDocRef, { credits: newCredits }); window.currentUserData.credits = newCredits; document.getElementById('displayCredits').innerText = newCredits; }
            await addDoc(collection(db, "history"), { userId: window.currentUserData.uid, fileName: `${dataObj.NAME || 'Document'} - ${serviceType}.pdf`, fileId: result.fileId || 'N/A', serviceType: serviceType, timestamp: new Date() });
            sessionStorage.removeItem('ojas_draft_' + serviceType); alert('Success! डॉक्यूमेंट जनरेट हो गया है।'); window.switchService('history'); formElement.reset();
        } else { alert('Google Script Error:\n\n' + (result?.error || 'Unknown Backend Error')); }
    } catch (error) { alert('Processing error.'); } finally { submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false; }
};

window.submitLocalAnnexureForm = async function(event, serviceType, fileIdKey) { /* Annexure Logic remains same */ };
const getWatermarkHtml = (srv) => { /* Watermark logic remains same */ return `<div class="absolute inset-0 flex items-center justify-center pointer-events-none z-[60] overflow-hidden select-none opacity-5"><i class="fa-solid fa-file-shield text-[200px]"></i></div>`; };

window.renderServiceFormHtml = function(serviceName, container, submitBtnText, statusTagHtml) {
    const todayISO = new Date().toISOString().split('T')[0];
    const vleSelectHtml = `<select name="VLE" onchange="window.toggleCustomInput(this, 'customVleInput')" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none relative z-10">${window.VLE_NAMES_LIST.map(v => `<option value="${v}">${v}</option>`).join('')}<option value="OTHER">OTHER (अन्य नाम दर्ज करें)</option></select><input type="text" id="customVleInput" name="VLE_CUSTOM" placeholder="VLE का नाम यहाँ लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase relative z-10">`;

    let isFormRendered = false;

    // DOMICILE (ISSUE DATE ADDED)
    if (serviceName === 'domicile') {
        container.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20"><h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-house-chimney text-royal-500 mr-1.5"></i> Domicile Certificate (मूल निवास)</h3>${statusTagHtml}</div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('domicile')}
                <form onsubmit="window.submitForm(event, 'Domicile')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">District</label><select id="districtSelect" name="DISTRICT" onchange="window.updateTehsilsAndThanas()" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none uppercase"><option value="BAGHPAT">बागपत</option></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tehsil</label><select id="tehsilSelect" name="TAHSEEL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none uppercase"></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Police Station</label><select id="thanaSelect" name="THANA" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none uppercase"></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="REL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none"><option value="पुत्र / पुत्री">पुत्र / पुत्री</option><option value="पत्नी      .">पत्नी</option></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer Name</label><input type="text" name="NAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hindi Name</label><input type="text" name="HNAME" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father/Husband Name</label><input type="text" name="FNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label><input type="text" name="MNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Area / Locality</label><input type="text" name="AREA" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Village / Ward</label><input type="text" name="GRAM" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        
                        <!-- ISSUE DATE -->
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Issue Date (जारी करने की तारीख)</label><input type="date" name="ISSUE_DATE" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">VLE Name</label>${vleSelectHtml}</div>
                        <div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Photo</label><input type="file" name="PHOTO" accept="image/*" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-glow transition">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.updateTehsilsAndThanas(); isFormRendered = true;
    }

    // CASTE (ISSUE DATE ADDED)
    else if (serviceName === 'caste') {
        container.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 relative z-20"><h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-users text-royal-500 mr-1.5"></i> Caste Certificate (जाति प्रमाण पत्र)</h3>${statusTagHtml}</div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                ${getWatermarkHtml('caste')}
                <form onsubmit="window.submitForm(event, 'Caste')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">District</label><select id="districtSelect" name="DISTRICT" onchange="window.updateTehsilsAndThanas()" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none uppercase"><option value="BAGHPAT">बागपत</option></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tehsil</label><select id="tehsilSelect" name="TAHSEEL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none uppercase"></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="REL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none"><option value="पुत्र / पुत्री">पुत्र / पुत्री</option><option value="पत्नी      .">पत्नी</option></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Caste</label><select name="CAST" onchange="window.toggleCustomInput(this, 'customCasteInput')" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none uppercase">${window.CASTE_OPTIONS_LIST.map(c => `<option value="${c}">${c}</option>`).join('')}<option value="OTHER">OTHER (अन्य जाति)</option></select><input type="text" id="customCasteInput" name="CAST_CUSTOM" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer Name</label><input type="text" name="NAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father/Husband Name</label><input type="text" name="FNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label><input type="text" name="MNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Area</label><input type="text" name="AREA" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Village / Ward</label><input type="text" name="GRAM" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        
                        <!-- ISSUE DATE -->
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Issue Date (तारीख)</label><input type="date" name="ISSUE_DATE" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">VLE Name</label>${vleSelectHtml}</div>
                        <div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Photo</label><input type="file" name="PHOTO" accept="image/*" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-glow transition">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.updateTehsilsAndThanas(); isFormRendered = true;
    }

    // DOB CERTIFICATE 18+ MEERUT
    else if (serviceName === 'dob18') {
        container.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 mb-4 relative z-20"><div><h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-cake-candles text-royal-500 mr-1.5"></i> DOB Certificate (Meerut 18+)</h3></div>${statusTagHtml}</div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                <form onsubmit="window.submitForm(event, 'DOB Meerut 18+')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name</label><input type="text" name="NAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sex</label><select name="SEX" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50"><option value="MALE">MALE</option><option value="FEMALE">FEMALE</option></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date of Birth</label><input type="date" name="DOB" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father Name</label><input type="text" name="FNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label><input type="text" name="MNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pin Code</label><input type="text" name="PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50"></div>
                        <div class="md:col-span-2 relative z-10"><label class="text-[11px] font-bold text-slate-500 uppercase mb-1 block">ADDRESS</label><input type="text" name="ADDRESS" value="VILL - " required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 uppercase"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition">${submitBtnText}</button>
                </form>
            </div>
        `;
        isFormRendered = true;
    }

    // DOB CERTIFICATE 18+ DELHI
    else if (serviceName === 'dob_minor') {
        container.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 mb-4 relative z-20"><div><h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-cake-candles text-royal-500 mr-1.5"></i> DOB Certificate (Delhi 18+)</h3></div>${statusTagHtml}</div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                <form onsubmit="window.submitForm(event, 'DOB Delhi 18+')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name</label><input type="text" name="NAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sex</label><select name="SEX" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50"><option value="MALE">MALE</option><option value="FEMALE">FEMALE</option></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date of Birth</label><input type="date" name="DOB" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father Name</label><input type="text" name="FNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label><input type="text" name="MNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pin Code</label><input type="text" name="PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50"></div>
                        <div class="md:col-span-2 relative z-10"><label class="text-[11px] font-bold text-slate-500 uppercase mb-1 block">ADDRESS</label><input type="text" name="ADDRESS" value="VILL - " required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 uppercase"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition">${submitBtnText}</button>
                </form>
            </div>
        `;
        isFormRendered = true;
    }

    // PASSPORT (PHOTO UPLOAD + REQUIRED FIELDS)
    else if (serviceName === 'passport') {
        container.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 mb-4 relative z-20">
                <div><h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-passport text-blue-500 mr-1.5"></i> Passport Form</h3></div>
                ${statusTagHtml}
            </div>
            <div class="relative overflow-hidden rounded-2xl p-1 -mx-1">
                <form onsubmit="window.submitForm(event, 'Passport')" class="space-y-3.5 relative z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name (नाम)</label><input type="text" name="NAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father Name (पापा का नाम)</label><input type="text" name="FNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date of Birth (जन्म तिथि)</label><input type="date" name="DOB" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Issue Date (तारीख)</label><input type="date" name="ISSUE_DATE" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50"></div>
                        <div class="md:col-span-2 relative z-10"><label class="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Complete Address (पूरा पता)</label><input type="text" name="ADDRESS" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 uppercase"></div>
                        
                        <!-- PHOTO UPLOAD -->
                        <div class="md:col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Photo (पासपोर्ट फोटो)</label><input type="file" name="PHOTO" accept="image/*" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition">${submitBtnText.replace('Document', 'Passport')}</button>
                </form>
            </div>
        `;
        isFormRendered = true;
    }

    if (isFormRendered) {
        setTimeout(() => {
            window.restoreFormDataFromSession(serviceName);
            const form = container.querySelector('form');
            if (form) { form.addEventListener('input', () => window.saveFormDataToSession(serviceName)); form.addEventListener('change', () => window.saveFormDataToSession(serviceName)); }
        }, 50);
        return true;
    }
    return false;
};
