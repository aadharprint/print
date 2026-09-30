// ============================================================================
// FILE 2: js/portal-forms.js
// (All Service Forms: Domicile, Caste, DOB 18+, DOB MINOR & All 9 Official Annexures)
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
                const MAX_WIDTH = 500;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}

// ================= GOOGLE DRIVE SERVICES SUBMISSION =================
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

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(dataObj)
        });

        const result = await response.json();

        if (result.success || result.fileId) {
            if (!window.currentUserData.hasFreeAccess) {
                const userDocRef = doc(db, "users", window.currentUserData.uid);
                const newCredits = window.currentUserData.credits - docCost;
                await updateDoc(userDocRef, { credits: newCredits });
                window.currentUserData.credits = newCredits;
                document.getElementById('displayCredits').innerText = newCredits;
            }

            await addDoc(collection(db, "history"), {
                userId: window.currentUserData.uid,
                fileName: `${dataObj.NAME || 'Document'} - ${serviceType}.pdf`,
                fileId: result.fileId || result.id || 'N/A',
                serviceType: serviceType,
                timestamp: new Date()
            });
            alert('Success! Document generated successfully.');
            window.switchService('history');
            formElement.reset();
        } else {
            throw new Error('API Response Failed');
        }
    } catch (error) {
        alert('Technical error occurred while generating document. No credits were deducted.');
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

// ================= BACKGROUND WATERMARK HELPER =================
const getWatermarkHtml = (srv) => {
    const wMap = {
        'domicile': { icon: 'fa-house-chimney', text: 'DOMICILE' },
        'caste': { icon: 'fa-users', text: 'CASTE CERT' },
        'dob18': { icon: 'fa-cake-candles', text: 'DOB 18+' },
        'dob_minor': { icon: 'fa-baby', text: 'DOB MINOR' },
        'annexure1': { icon: 'fa-file-signature', text: 'ANNEXURE I' },
        'annexure1a': { icon: 'fa-child-reaching', text: 'ANNEXURE IA' },
        'annexure3': { icon: 'fa-bolt', text: 'ANNEXURE III' },
        'annexure3a': { icon: 'fa-child', text: 'ANNEXURE IIIA' },
        'annexureb': { icon: 'fa-file-contract', text: 'ANNEXURE B' },
        'annexurec': { icon: 'fa-file-contract', text: 'ANNEXURE C' },
        'annexured': { icon: 'fa-file-contract', text: 'ANNEXURE D' },
        'annexuree': { icon: 'fa-file-contract', text: 'ANNEXURE E' },
        'annexuref': { icon: 'fa-child-reaching', text: 'ANNEXURE F' },
    };
    const wm = wMap[srv] || { icon: 'fa-file', text: srv.toUpperCase() };
    return `
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0 overflow-hidden">
            <div class="text-center flex flex-col items-center justify-center transform -rotate-12 scale-[1.5] md:scale-[2] w-full">
                <i class="fa-solid ${wm.icon} text-[150px] mb-6"></i>
                <h1 class="text-[80px] font-black uppercase tracking-widest whitespace-nowrap">${wm.text}</h1>
            </div>
        </div>
    `;
};

// ================= RENDER DOCUMENT FORMS INTO CONTAINER =================
window.renderServiceFormHtml = function(serviceName, container, submitBtnText, statusTagHtml) {
    const todayISO = new Date().toISOString().split('T')[0];

    const vleSelectHtml = `
        <select name="VLE" onchange="window.toggleCustomInput(this, 'customVleInput')" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none">
            ${window.VLE_NAMES_LIST.map(v => `<option value="${v}">${v}</option>`).join('')}
            <option value="OTHER">OTHER (अन्य नाम दर्ज करें)</option>
        </select>
        <input type="text" id="customVleInput" name="VLE_CUSTOM" placeholder="VLE का नाम यहाँ लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase">
    `;

    // 🌟 VIP ANNEXURE DROPDOWN UI WITH EMOJIS
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
            ${getWatermarkHtml('domicile')}
            <div class="relative z-10">
                <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-house-chimney text-royal-500 mr-1.5"></i> Domicile Certificate (मूल निवास)</h3>
                    ${statusTagHtml}
                </div>
                <form onsubmit="window.submitForm(event, 'Domicile')" class="space-y-3.5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">District (जिला)</label>
                            <select id="districtSelect" name="DISTRICT" onchange="window.updateTehsilsAndThanas()" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase">
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
                            <select id="tehsilSelect" name="TAHSEEL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Police Station (थाना)</label>
                            <select id="thanaSelect" name="THANA" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation (संबंध)</label>
                            <select name="REL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none">
                                <option value="पुत्र / पुत्री">पुत्र / पुत्री</option>
                                <option value="पत्नी      .">पत्नी</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer Name (English)</label>
                            <input type="text" name="NAME" placeholder="Enter Full Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hindi Name (Optional)</label>
                            <input type="text" name="HNAME" placeholder="हिंदी में नाम (वैकल्पिक)" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father / Husband Name</label>
                            <input type="text" name="FNAME" placeholder="Enter Father/Husband Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label>
                            <input type="text" name="MNAME" placeholder="Enter Mother Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">House Number (मकान नंबर - MN)</label>
                            <input type="text" name="MN" placeholder="Enter House No" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Area / Locality (मोहल्ला / पोस्ट)</label>
                            <input type="text" name="AREA" placeholder="Enter Area / Locality" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Village / Ward Name (गाँव / वार्ड)</label>
                            <input type="text" name="GRAM" placeholder="Enter Village / Ward Name" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">VLE Name (जन सेवा केंद्र संचालक)</label>
                            ${vleSelectHtml}
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Photo</label>
                            <input type="file" name="PHOTO" accept="image/*" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-royal-100 file:text-royal-700 cursor-pointer">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-glow transition text-sm md:text-base">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.updateTehsilsAndThanas();
        return true;
    }

    // CASTE
    if (serviceName === 'caste') {
        container.innerHTML = `
            ${getWatermarkHtml('caste')}
            <div class="relative z-10">
                <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-users text-royal-500 mr-1.5"></i> Caste Certificate (जाति प्रमाण पत्र)</h3>
                    ${statusTagHtml}
                </div>
                <form onsubmit="window.submitForm(event, 'Caste')" class="space-y-3.5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">District (जिला)</label>
                            <select id="districtSelect" name="DISTRICT" onchange="window.updateTehsilsAndThanas()" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase">
                                <option value="BAGHPAT">बागपत</option>
                                <option value="SHAMLI">शामली</option>
                                <option value="MUZAFFARNAGAR">मुजफ्फरनगर</option>
                                <option value="MEERUT">मेरठ</option>
                                <option value="SAHARANPUR">सहारनपुर</option>
                                <option value="GHAZIABAD">गाजियाबाद</option>
                            </select>
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tehsil (तहसील)</label><select id="tehsilSelect" name="TAHSEEL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="REL" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none"><option value="पुत्र / पुत्री">पुत्र / पुत्री</option><option value="पत्नी      .">पत्नी</option></select></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Caste (जाति)</label>
                            <select name="CAST" onchange="window.toggleCustomInput(this, 'customCasteInput')" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase">
                                ${window.CASTE_OPTIONS_LIST.map(c => `<option value="${c}">${c}</option>`).join('')}
                                <option value="OTHER">OTHER (अन्य जाति लिखें)</option>
                            </select>
                            <input type="text" id="customCasteInput" name="CAST_CUSTOM" placeholder="जाति का नाम यहाँ लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer Name</label><input type="text" name="NAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hindi Name (Optional)</label><input type="text" name="HNAME" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father/Husband Name</label><input type="text" name="FNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label><input type="text" name="MNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Area / Locality</label><input type="text" name="AREA" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Village / Ward Name</label><input type="text" name="GRAM" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">VLE Name</label>
                            ${vleSelectHtml}
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Upload Photo</label><input type="file" name="PHOTO" accept="image/*" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-royal-100 file:text-royal-700 cursor-pointer"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-glow transition text-sm md:text-base">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.updateTehsilsAndThanas();
        return true;
    }

    // DOB CERTIFICATE 18+
    if (serviceName === 'dob18') {
        if (!window.currentUserData || !window.currentUserData.isVip) {
            window.switchService(window.getFirstAllowedTab());
            return true;
        }

        const dobSubmitBtnText = window.currentUserData && window.currentUserData.hasFreeAccess 
            ? 'Generate DOB Certificate (VIP Free) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>' 
            : 'Generate DOB Certificate (10 Credits) <i class="fa-solid fa-wand-magic-sparkles ml-1"></i>';

        container.innerHTML = `
            ${getWatermarkHtml('dob18')}
            <div class="relative z-10">
                <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-cake-candles text-royal-500 mr-1.5"></i> Date of Birth Certificate (18+ VIP)</h3>
                        <p class="text-[11px] font-bold text-slate-500">VIP एक्सक्लूसिव सर्विस</p>
                    </div>
                    ${statusTagHtml}
                </div>
                <form onsubmit="window.submitForm(event, 'DOB 18+')" class="space-y-3.5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name</label><input type="text" name="NAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sex / Gender</label><select name="SEX" class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"><option value="MALE">MALE</option><option value="FEMALE">FEMALE</option></select></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date of Birth (18+)</label><input type="date" name="DOB" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Father Name</label><input type="text" name="FNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mother Name</label><input type="text" name="MNAME" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pin Code</label><input type="text" name="PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white outline-none uppercase"></div>
                        <div class="md:col-span-2">
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-slate-500 uppercase">ADDRESS ( 'Uttar Pradesh' लिखने की आवश्यकता नहीं है)</label>
                                <span id="dobAddressCharCount" class="text-[10px] font-bold text-slate-400">7 / 38 Characters</span>
                            </div>
                            <input type="text" id="dob18AddressInput" name="ADDRESS" value="VILL - " oninput="window.handleDob18AddressInput(this)" onblur="this.value = window.cleanDob18AddressString(this.value); window.handleDob18AddressInput(this);" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white outline-none uppercase">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base">${dobSubmitBtnText}</button>
                </form>
            </div>
        `;
        return true;
    }

    // DOB MINOR (COMING SOON)
    if (serviceName === 'dob_minor') {
        if (!window.currentUserData || !window.currentUserData.isVip) {
            window.switchService(window.getFirstAllowedTab());
            return true;
        }

        container.innerHTML = `
            ${getWatermarkHtml('dob_minor')}
            <div class="relative z-10">
                <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-baby text-royal-500 mr-1.5"></i> Date of Birth Certificate (Minor)</h3>
                        <p class="text-[11px] font-bold text-slate-500">VIP एक्सक्लूसिव सर्विस</p>
                    </div>
                    ${statusTagHtml}
                </div>
                
                <div class="flex flex-col items-center justify-center py-16 px-4 text-center bg-amber-50/50 rounded-3xl border-2 border-dashed border-amber-200">
                    <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <i class="fa-solid fa-person-digging text-4xl text-amber-500 animate-bounce"></i>
                    </div>
                    <h4 class="text-2xl font-black text-dark-900 uppercase tracking-widest mb-1">Coming Soon</h4>
                    <p class="text-sm text-slate-500 font-bold max-w-md mx-auto">इस सर्विस का फॉर्म और कोड अभी तैयार किया जा रहा है। जल्द ही यह सर्विस यहाँ उपलब्ध होगी!</p>
                </div>
            </div>
        `;
        return true;
    }

    // 1. ANNEXURE-I
    if (serviceName === 'annexure1') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            ${getWatermarkHtml('annexure1')}
            <div class="relative z-10">
                ${annexureDropdownHtml}
                <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-file-signature text-royal-500 mr-1.5"></i> Annexure-I (Adults DoB Update)</h3>
                        <p class="text-[11px] text-slate-500">जनरेट करने के बाद ⚙️ गियर आइकन -> Document History से Print व Download करें।</p>
                    </div>
                    ${statusTagHtml}
                </div>
                <form onsubmit="window.submitLocalAnnexureForm(event, 'Annexure 1', 'LOCAL_HTML_ANNEXURE_1')" class="space-y-3.5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">आवेदक का नाम (Applicant Name)</label><input type="text" name="applicantName" placeholder="e.g. RAMESH KUMAR" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"><option value="S/o">S/o</option><option value="D/o">D/o</option><option value="W/o">W/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पिता / पति का नाम</label><input type="text" name="relativeName" placeholder="e.g. SURESH CHAND" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">12-Digit ID Number (4-4 Pair)</label>
                            <input type="text" name="idNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold tracking-wider uppercase bg-slate-50">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">कितनी बार DoB अपडेट किया?</label>
                            <select name="updateTimes" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50">
                                <option value="NEVER">NEVER (कभी नहीं)</option>
                                <option value="ONCE">ONCE (एक बार)</option>
                                <option value="MORE THAN ONCE">MORE THAN ONCE (एक से अधिक बार)</option>
                            </select>
                        </div>
                        <div><label class="block text-[11px] font-bold text-green-700 uppercase mb-1">सही जन्मतिथि (Correct DoB)</label><input type="date" name="newDob" required class="w-full p-3 border border-green-300 rounded-xl text-sm font-bold bg-green-50"></div>
                        <div><label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">पहले दर्ज जन्मतिथि (Old DoB)</label><input type="date" name="oldDob" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold bg-amber-50"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पहले दिया गया दस्तावेज़ (Old Doc)</label>
                            <select name="oldDoc" onchange="window.toggleCustomInput(this, 'an1OldDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an1OldDocCustom" name="oldDocCustom" placeholder="दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">अभी दिया जा रहा दस्तावेज़ (New Doc)</label>
                            <select name="newDoc" onchange="window.toggleCustomInput(this, 'an1NewDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an1NewDocCustom" name="newDocCustom" placeholder="दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">शपथ पत्र की तारीख (Date)</label><input type="date" name="date" value="${todayISO}" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Complete Address)</label><input type="text" name="address" placeholder="VILL, POST, TEHSIL, DISTT, PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base">${submitBtnText}</button>
                </form>
            </div>
        `;
        return true;
    }

    // 2. ANNEXURE-IA
    if (serviceName === 'annexure1a') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            ${getWatermarkHtml('annexure1a')}
            <div class="relative z-10">
                ${annexureDropdownHtml}
                <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-child-reaching text-royal-500 mr-1.5"></i> Annexure-IA (Children DoB Update)</h3>
                        <p class="text-[11px] text-slate-500">बच्चों (18 से कम) की जन्मतिथि अपडेट हेतु माता-पिता का शपथ पत्र।</p>
                    </div>
                    ${statusTagHtml}
                </div>
                <form onsubmit="window.submitLocalAnnexureForm(event, 'Annexure 1A', 'LOCAL_HTML_ANNEXURE_1A')" class="space-y-3.5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का नाम (Parent Name)</label><input type="text" name="parentName" placeholder="e.g. SURESH KUMAR" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50"></div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"><option value="S/o">S/o</option><option value="W/o">W/o</option><option value="D/o">D/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">दादा / पति का नाम</label><input type="text" name="relativeName" placeholder="e.g. RAMPHAL" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का 12-Digit ID Number</label>
                            <input type="text" name="parentIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-amber-50">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Complete Address)</label><input type="text" name="address" placeholder="VILL, POST, DISTT, PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        <div><label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का नाम (Child Name)</label><input type="text" name="childName" placeholder="e.g. AARAV KUMAR" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold uppercase bg-indigo-50"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का 12-Digit ID Number</label>
                            <input type="text" name="childIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-indigo-50">
                        </div>
                        <div><label class="block text-[11px] font-bold text-green-800 uppercase mb-1">बच्चे की सही जन्मतिथि (Correct DoB)</label><input type="date" name="newDob" required class="w-full p-3 border border-green-300 rounded-xl text-sm font-bold bg-green-50"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पहले दर्ज गलत जन्मतिथि (Old DoB)</label><input type="date" name="oldDob" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पहले दिया गया दस्तावेज़ (Old Doc)</label>
                            <select name="oldDoc" onchange="window.toggleCustomInput(this, 'an1aOldDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an1aOldDocCustom" name="oldDocCustom" placeholder="दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">कितनी बार अपडेट किया?</label>
                            <select name="updateTimes" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50">
                                <option value="NEVER">NEVER (कभी नहीं)</option>
                                <option value="ONCE">ONCE (एक बार)</option>
                                <option value="MORE THAN ONCE">MORE THAN ONCE (एक से अधिक बार)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">अभी दिया जा रहा दस्तावेज़ (New Doc)</label>
                            <select name="newDoc" onchange="window.toggleCustomInput(this, 'an1aNewDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an1aNewDocCustom" name="newDocCustom" placeholder="दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">शपथ पत्र की तारीख (Date)</label><input type="date" name="date" value="${todayISO}" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base">${submitBtnText}</button>
                </form>
            </div>
        `;
        return true;
    }

    // 3. ANNEXURE-III
    if (serviceName === 'annexure3') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            ${getWatermarkHtml('annexure3')}
            <div class="relative z-10">
                ${annexureDropdownHtml}
                <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-bolt text-royal-500 mr-1.5"></i> Annexure-III (Adults Reactivation)</h3>
                        <p class="text-[11px] text-slate-500">वयस्कों की निष्क्रिय आईडी को चालू (Reactivate) कराने हेतु शपथ पत्र। (जानकारी न होने पर <strong>टिक करें = NA</strong> चुनें)</p>
                    </div>
                    ${statusTagHtml}
                </div>
                <form onsubmit="window.submitLocalAnnexureForm(event, 'Annexure 3', 'LOCAL_HTML_ANNEXURE_3')" class="space-y-3.5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">आवेदक का नाम (Applicant Name)</label><input type="text" name="applicantName" placeholder="e.g. RAMESH KUMAR" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"><option value="S/o">S/o</option><option value="D/o">D/o</option><option value="W/o">W/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पिता / पति का नाम</label><input type="text" name="relativeName" placeholder="e.g. SURESH CHAND" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">12-Digit ID Number (4-4 Pair)</label>
                            <input type="text" name="idNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold tracking-wider uppercase bg-slate-50">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Complete Address)</label><input type="text" name="address" placeholder="VILL, POST, DISTT, PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">पहले दिया गया अमान्य दस्तावेज़ (Invalid Doc)</label>
                            <select name="invalidDocName" onchange="window.toggleCustomInput(this, 'an3InvDocCustom')" class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50">
                                ${window.buildDocSelectOptions("INVALID BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an3InvDocCustom" name="invalidDocNameCustom" placeholder="अमान्य दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-amber-800 uppercase">अमान्य दस्तावेज़ का नंबर (Doc No)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3InvDocNo', 'text')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="text" id="an3InvDocNo" name="invalidDocNo" placeholder="Enter Document No (या ऊपर NA टिक करें)" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-amber-800 uppercase">अमान्य दस्तावेज़ की तारीख (Doc Date)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3InvDocDate', 'date')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="date" id="an3InvDocDate" name="invalidDocDate" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-amber-800 uppercase">EID Number (एनरोलमेंट आईडी)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3EidNo', 'text')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="text" id="an3EidNo" name="eidNumber" placeholder="Enter EID Number (या ऊपर NA टिक करें)" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50">
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-green-800 uppercase mb-1">अभी दिया जा रहा सही दस्तावेज़ (New Genuine Doc)</label>
                            <select name="newDoc" onchange="window.toggleCustomInput(this, 'an3NewDocCustom')" class="w-full p-3 border border-green-300 rounded-xl text-sm font-bold uppercase bg-green-50">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an3NewDocCustom" name="newDocCustom" placeholder="सही दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-green-300 rounded-xl text-xs bg-green-50 uppercase">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">शपथ पत्र की तारीख (Date)</label><input type="date" name="date" value="${todayISO}" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base">${submitBtnText}</button>
                </form>
            </div>
        `;
        return true;
    }

    // 4. ANNEXURE-IIIA
    if (serviceName === 'annexure3a') {
        if (!window.currentUserData || !window.currentUserData.isVip) { window.switchService(window.getFirstAllowedTab()); return true; }
        container.innerHTML = `
            ${getWatermarkHtml('annexure3a')}
            <div class="relative z-10">
                ${annexureDropdownHtml}
                <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-child text-royal-500 mr-1.5"></i> Annexure-IIIA (Children Reactivation)</h3>
                        <p class="text-[11px] text-slate-500">बच्चों की निष्क्रिय आईडी को चालू (Reactivate) कराने हेतु माता-पिता का शपथ पत्र। (जानकारी न होने पर <strong>टिक करें = NA</strong> चुनें)</p>
                    </div>
                    ${statusTagHtml}
                </div>
                <form onsubmit="window.submitLocalAnnexureForm(event, 'Annexure 3A', 'LOCAL_HTML_ANNEXURE_3A')" class="space-y-3.5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div><label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का नाम (Parent Name)</label><input type="text" name="parentName" placeholder="e.g. SURESH KUMAR" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50"></div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"><option value="S/o">S/o</option><option value="W/o">W/o</option><option value="D/o">D/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">दादा / पति का नाम</label><input type="text" name="relativeName" placeholder="e.g. RAMPHAL" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का 12-Digit ID Number</label>
                            <input type="text" name="parentIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-amber-50">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Complete Address)</label><input type="text" name="address" placeholder="VILL, POST, DISTT, PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        <div><label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का नाम (Child Name)</label><input type="text" name="childName" placeholder="e.g. AARAV KUMAR" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold uppercase bg-indigo-50"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का 12-Digit ID Number</label>
                            <input type="text" name="childIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-indigo-50">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पहले दिया गया अमान्य दस्तावेज़ (Invalid Doc)</label>
                            <select name="invalidDocName" onchange="window.toggleCustomInput(this, 'an3aInvDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50">
                                ${window.buildDocSelectOptions("INVALID BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an3aInvDocCustom" name="invalidDocNameCustom" placeholder="अमान्य दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-slate-600 uppercase">अमान्य दस्तावेज़ का नंबर (Doc No)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3aInvDocNo', 'text')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="text" id="an3aInvDocNo" name="invalidDocNo" placeholder="Enter Document No (या ऊपर NA टिक करें)" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-slate-600 uppercase">अमान्य दस्तावेज़ की तारीख (Doc Date)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3aInvDocDate', 'date')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="date" id="an3aInvDocDate" name="invalidDocDate" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50">
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[11px] font-bold text-slate-600 uppercase">EID Number (एनरोलमेंट आईडी)</label>
                                <label class="inline-flex items-center gap-1 cursor-pointer bg-amber-200/80 hover:bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px] font-black select-none">
                                    <input type="checkbox" onchange="window.toggleNaField(this, 'an3aEidNo', 'text')" class="accent-dark-900 w-3.5 h-3.5"> टिक करें = NA
                                </label>
                            </div>
                            <input type="text" id="an3aEidNo" name="eidNumber" placeholder="Enter EID Number (या ऊपर NA टिक करें)" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50">
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-green-800 uppercase mb-1">अभी दिया जा रहा सही दस्तावेज़ (New Genuine Doc)</label>
                            <select name="newDoc" onchange="window.toggleCustomInput(this, 'an3aNewDocCustom')" class="w-full p-3 border border-green-300 rounded-xl text-sm font-bold uppercase bg-green-50">
                                ${window.buildDocSelectOptions("BIRTH CERTIFICATE")}
                            </select>
                            <input type="text" id="an3aNewDocCustom" name="newDocCustom" placeholder="सही दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-green-300 rounded-xl text-xs bg-green-50 uppercase">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">शपथ पत्र की तारीख (Date)</label><input type="date" name="date" value="${todayISO}" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"></div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base">${submitBtnText}</button>
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
                <input type="text" name="childIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-indigo-50">
            </div>
        ` : '';

        container.innerHTML = `
            ${getWatermarkHtml(serviceName)}
            <div class="relative z-10">
                ${annexureDropdownHtml}
                <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-file-contract text-royal-500 mr-1.5"></i> ${mapInfo.title} - Name Update Affidavit</h3>
                        <p class="text-[11px] text-slate-500">${mapInfo.desc}</p>
                    </div>
                    ${statusTagHtml}
                </div>
                <form onsubmit="window.submitLocalAnnexureForm(event, '${mapInfo.title}', '${mapInfo.key}')" class="space-y-3.5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Title</label><select name="title" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"><option value="Shri">Shri</option><option value="Smt.">Smt.</option><option value="Ms.">Ms.</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">${isChild ? 'माता/पिता का नाम (Parent)' : 'आवेदक का नाम (Applicant)'}</label><input type="text" name="applicantName" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"><option value="S/o">S/o</option><option value="W/o">W/o</option><option value="D/o">D/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पिता / पति का नाम</label><input type="text" name="relativeName" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">${isChild ? 'माता/पिता का 12-Digit ID Number' : '12-Digit ID Number (4-4 Pair)'}</label>
                            <input type="text" name="idNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold tracking-wider uppercase bg-slate-50">
                        </div>
                        ${childFieldsHtml}
                        <div><label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">पहले दर्ज नाम (Old Recorded Name)</label><input type="text" name="oldName" placeholder="OLD NAME" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50"></div>
                        <div><label class="block text-[11px] font-bold text-green-800 uppercase mb-1">नया सही नाम (New Correct Name)</label><input type="text" name="newName" placeholder="NEW CORRECT NAME" required class="w-full p-3 border border-green-300 rounded-xl text-sm font-bold uppercase bg-green-50"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">सपोर्टिंग दस्तावेज़ (Supporting PoI Doc)</label>
                            <select name="newDoc" onchange="window.toggleCustomInput(this, 'anBcdDocCustom')" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50">
                                ${window.buildDocSelectOptions(isChild ? "BIRTH CERTIFICATE" : "PAN CARD")}
                            </select>
                            <input type="text" id="anBcdDocCustom" name="newDocCustom" placeholder="दस्तावेज़ का नाम लिखें" style="display:none;" class="w-full mt-2 p-2.5 border border-amber-300 rounded-xl text-xs bg-amber-50 uppercase">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Complete Address)</label><input type="text" name="address" placeholder="VILL, POST, DISTT, PIN" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">स्थान (Verified at Place)</label><input type="text" name="place" placeholder="e.g. BARAUT" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        <div class="grid grid-cols-2 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">दिन (Day)</label><input type="text" id="inpDay" name="day" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"></div>
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">महीना व वर्ष</label><input type="text" id="inpMonthYear" name="monthYear" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base">${submitBtnText}</button>
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
            ${getWatermarkHtml('annexuree')}
            <div class="relative z-10">
                ${annexureDropdownHtml}
                <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-file-contract text-royal-500 mr-1.5"></i> Annexure E (Adults Urf/Alias Removal)</h3>
                        <p class="text-[11px] text-slate-500">वयस्कों के नाम में से "उर्फ़ / Alias" हटाने हेतु शपथ पत्र। (नाम में URF लिखने पर दोनों नाम स्वतः अलग हो जाएंगे)</p>
                    </div>
                    ${statusTagHtml}
                </div>

                <form id="annexureEForm" onsubmit="window.submitLocalAnnexureForm(event, 'Annexure E', 'LOCAL_HTML_ANNEXURE_E')" class="space-y-3.5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Title</label><select id="inpTitle" name="title" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"><option value="Shri">Shri</option><option value="Smt.">Smt.</option><option value="Ms.">Ms.</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">आवेदक का नाम (Applicant)</label><input type="text" id="inpApplicantName" name="applicantName" oninput="window.syncAnnexureENames()" placeholder="e.g. RAMESH URF SONU" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select id="inpRel" name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"><option value="S/o">S/o</option><option value="D/o">D/o</option><option value="W/o">W/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पिता / पति का नाम</label><input type="text" id="inpRelativeName" name="relativeName" placeholder="e.g. SURESH CHAND" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Resident of)</label><input type="text" id="inpAddress" name="address" placeholder="e.g. VILL BARAUT, DISTT BAGHPAT" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">12-Digit ID Number (4-4 Pair)</label>
                            <input type="text" id="inpIdNumber" name="idNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold tracking-wider uppercase bg-slate-50">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-[11px] font-black text-amber-900 uppercase">2. कार्ड में दर्ज दोनों नाम (Urf / Alias)</span>
                                <button type="button" onclick="window.swapAnnexureERetainRemove()" class="text-[10px] bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded"><i class="fa-solid fa-right-left mr-1"></i> Swap</button>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div><label class="block text-[10px] font-bold text-amber-800 uppercase mb-1">पहला नाम (Name 1)</label><input type="text" id="inpRecorded1" name="recorded1" oninput="window.syncAnnexureENames()" placeholder="RAMESH" required class="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-bold uppercase bg-white"></div>
                                <div><label class="block text-[10px] font-bold text-amber-800 uppercase mb-1">उर्फ़ नाम (Alias 2)</label><input type="text" id="inpRecorded2" name="recorded2" oninput="window.syncAnnexureENames()" placeholder="SONU" required class="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-bold uppercase bg-white"></div>
                            </div>
                        </div>

                        <div class="p-3 bg-green-50 rounded-2xl border border-green-200 space-y-2">
                            <span class="text-[11px] font-black text-green-900 uppercase block">3. कौन-सा नाम रखना है और कौन-सा हटाना है</span>
                            <div class="grid grid-cols-2 gap-2">
                                <div><label class="block text-[10px] font-bold text-green-800 uppercase mb-1">रखने वाला (Retain)</label><input type="text" id="inpRetainName" name="retainName" placeholder="RAMESH" required class="w-full p-2.5 border border-green-300 rounded-xl text-xs font-bold uppercase bg-white"></div>
                                <div><label class="block text-[10px] font-bold text-red-700 uppercase mb-1">हटाने वाला (Remove)</label><input type="text" id="inpRemoveName" name="removeName" placeholder="SONU" required class="w-full p-2.5 border border-red-300 rounded-xl text-xs font-bold uppercase bg-white"></div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2.5">
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">स्थान (Place)</label><input type="text" id="inpPlace" name="place" placeholder="BARAUT" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase bg-slate-50"></div>
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">दिन (Day)</label><input type="text" id="inpDay" name="day" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50"></div>
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">महीना व वर्ष</label><input type="text" id="inpMonthYear" name="monthYear" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase bg-slate-50"></div>
                    </div>

                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base">${submitBtnText}</button>
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
            ${getWatermarkHtml('annexuref')}
            <div class="relative z-10">
                ${annexureDropdownHtml}
                <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h3 class="text-base md:text-lg font-black text-dark-900"><i class="fa-solid fa-child-reaching text-royal-500 mr-1.5"></i> Annexure F (Children Urf/Alias Removal)</h3>
                        <p class="text-[11px] text-slate-500">बच्चे के नाम में से "उर्फ़ / Alias" हटाने हेतु शपथ पत्र।</p>
                    </div>
                    ${statusTagHtml}
                </div>

                <form onsubmit="window.submitLocalAnnexureForm(event, 'Annexure F', 'LOCAL_HTML_ANNEXURE_F')" class="space-y-3.5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Title</label><select name="title" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"><option value="Shri">Shri</option><option value="Smt.">Smt.</option><option value="Ms.">Ms.</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का नाम (Parent)</label><input type="text" name="parentName" placeholder="e.g. SURESH KUMAR" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold uppercase bg-amber-50"></div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Relation</label><select name="rel" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"><option value="S/o">S/o</option><option value="W/o">W/o</option><option value="D/o">D/o</option></select></div>
                            <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">दादा / पति का नाम</label><input type="text" name="relativeName" placeholder="e.g. RAMPHAL" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-amber-800 uppercase mb-1">माता / पिता का 12-Digit ID Number</label>
                            <input type="text" name="parentIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-amber-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-amber-50">
                        </div>
                        <div><label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">पूरा पता (Resident of)</label><input type="text" name="address" placeholder="VILL BARAUT, DISTT BAGHPAT" required class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase bg-slate-50"></div>
                        <div><label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का नाम (Child Name)</label><input type="text" id="inpApplicantName" name="childName" oninput="window.syncAnnexureENames()" placeholder="e.g. AARAV URF GOLU" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold uppercase bg-indigo-50"></div>
                        <div>
                            <label class="block text-[11px] font-bold text-indigo-800 uppercase mb-1">बच्चे का 12-Digit ID Number</label>
                            <input type="text" name="childIdNumber" oninput="window.format12DigitId(this)" pattern="\\d{4} \\d{4} \\d{4}" minlength="14" maxlength="14" title="कृपया पूरे 12 अंक दर्ज करें (XXXX XXXX XXXX)" placeholder="XXXX XXXX XXXX" required class="w-full p-3 border border-indigo-300 rounded-xl text-sm font-bold tracking-wider uppercase bg-indigo-50">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-[11px] font-black text-amber-900 uppercase">2. बच्चे के दर्ज दोनों नाम (Urf / Alias)</span>
                                <button type="button" onclick="window.swapAnnexureERetainRemove()" class="text-[10px] bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded"><i class="fa-solid fa-right-left mr-1"></i> Swap</button>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div><label class="block text-[10px] font-bold text-amber-800 uppercase mb-1">पहला नाम (Name 1)</label><input type="text" id="inpRecorded1" name="recorded1" oninput="window.syncAnnexureENames()" placeholder="AARAV" required class="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-bold uppercase bg-white"></div>
                                <div><label class="block text-[10px] font-bold text-amber-800 uppercase mb-1">उर्फ़ नाम (Alias 2)</label><input type="text" id="inpRecorded2" name="recorded2" oninput="window.syncAnnexureENames()" placeholder="GOLU" required class="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-bold uppercase bg-white"></div>
                            </div>
                        </div>

                        <div class="p-3 bg-green-50 rounded-2xl border border-green-200 space-y-2">
                            <span class="text-[11px] font-black text-green-900 uppercase block">3. कौन-सा नाम रखना है और कौन-सा हटाना है</span>
                            <div class="grid grid-cols-2 gap-2">
                                <div><label class="block text-[10px] font-bold text-green-800 uppercase mb-1">रखने वाला (Retain)</label><input type="text" id="inpRetainName" name="retainName" placeholder="AARAV" required class="w-full p-2.5 border border-green-300 rounded-xl text-xs font-bold uppercase bg-white"></div>
                                <div><label class="block text-[10px] font-bold text-red-700 uppercase mb-1">हटाने वाला (Remove)</label><input type="text" id="inpRemoveName" name="removeName" placeholder="GOLU" required class="w-full p-2.5 border border-red-300 rounded-xl text-xs font-bold uppercase bg-white"></div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2.5">
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">स्थान (Place)</label><input type="text" id="inpPlace" name="place" placeholder="BARAUT" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase bg-slate-50"></div>
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">दिन (Day)</label><input type="text" id="inpDay" name="day" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50"></div>
                        <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">महीना व वर्ष</label><input type="text" id="inpMonthYear" name="monthYear" required class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase bg-slate-50"></div>
                    </div>

                    <button type="submit" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-black py-3.5 rounded-xl shadow-vip-glow transition text-sm md:text-base">${submitBtnText}</button>
                </form>
            </div>
        `;
        window.initVerificationDefaults();
        return true;
    }

    return false;
};
