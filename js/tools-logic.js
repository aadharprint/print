// Ojas Tool Studio - Complete Client-Side Utilities Logic (Zero-Upload, Max 50MB)

const toolConfigs = {
    passport: {
        title: 'पासपोर्ट फोटो मेकर (A4 6-Photo Sheet)',
        icon: '<i class="fa-solid fa-id-badge"></i>',
        render: () => '<div class="space-y-4">' +
            '<div class="border-2 border-dashed border-amber-400/50 dark:border-amber-500/30 rounded-2xl p-4 sm:p-6 text-center bg-amber-50/50 dark:bg-amber-950/10 cursor-pointer" onclick="document.getElementById(\'inputPassportImg\').click()">' +
            '<i class="fa-solid fa-cloud-arrow-up text-3xl text-amber-500 mb-2"></i>' +
            '<p class="text-xs font-bold text-slate-700 dark:text-slate-300">अपनी फोटो चुनें (Max 50MB)</p>' +
            '<input type="file" id="inputPassportImg" accept="image/*" class="hidden" onchange="window.handlePassportUpload(event)">' +
            '</div>' +
            '<div id="passportControls" class="hidden space-y-3">' +
            '<div class="grid grid-cols-2 gap-2 text-xs font-bold">' +
            '<div>' +
            '<label class="block mb-1 text-slate-500">बैकग्राउंड:</label>' +
            '<select id="selPassportBg" onchange="window.renderPassportSheet()" class="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800 text-xs">' +
            '<option value="white">White (#FFFFFF)</option>' +
            '<option value="lightblue">Light Blue</option>' +
            '<option value="original">Original</option>' +
            '</select>' +
            '</div>' +
            '<div>' +
            '<label class="block mb-1 text-slate-500">शीट फॉर्मेट:</label>' +
            '<select id="selPassportCount" onchange="window.renderPassportSheet()" class="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800 text-xs">' +
            '<option value="6">A4 Top 6 Photos (कटिंग गाइड के साथ)</option>' +
            '<option value="8">A4 8 Photos</option>' +
            '<option value="1">Single Photo (3.5 x 4.5 cm)</option>' +
            '</select>' +
            '</div>' +
            '</div>' +
            '<div class="overflow-auto max-h-[360px] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-dark-950 p-2 flex justify-center">' +
            '<canvas id="passportCanvas" class="max-w-full shadow-md bg-white"></canvas>' +
            '</div>' +
            '<div class="flex gap-2">' +
            '<button onclick="window.downloadPassport(\'png\')" class="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-dark-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition"><i class="fa-solid fa-download"></i> Download PNG</button>' +
            '<button onclick="window.downloadPassport(\'pdf\')" class="flex-1 py-2.5 bg-royal-600 hover:bg-royal-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition"><i class="fa-solid fa-file-pdf"></i> Download A4 PDF</button>' +
            '</div>' +
            '</div>' +
            '</div>'
    },
    bg_remove: {
        title: 'बैकग्राउंड रिमूवर (White / Custom BG)',
        icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>',
        render: () => '<div class="space-y-4">' +
            '<div class="border-2 border-dashed border-emerald-400/50 rounded-2xl p-4 sm:p-6 text-center bg-emerald-50/50 dark:bg-emerald-950/10 cursor-pointer" onclick="document.getElementById(\'inputBgRemove\').click()">' +
            '<i class="fa-solid fa-image text-3xl text-emerald-500 mb-2"></i>' +
            '<p class="text-xs font-bold text-slate-700 dark:text-slate-300">फोटो अपलोड करें (Max 50MB)</p>' +
            '<input type="file" id="inputBgRemove" accept="image/*" class="hidden" onchange="window.handleBgRemoveUpload(event)">' +
            '</div>' +
            '<div id="bgRemoveControls" class="hidden space-y-3">' +
            '<div class="flex items-center gap-2 text-xs font-bold">' +
            '<span class="text-slate-500">नया बैकग्राउंड रंग:</span>' +
            '<input type="color" id="bgColPicker" value="#ffffff" onchange="window.processBgRemove()" class="w-8 h-8 rounded-lg border-0 cursor-pointer">' +
            '<button onclick="document.getElementById(\'bgColPicker\').value=\'#ffffff\'; window.processBgRemove();" class="px-2 py-1 rounded bg-slate-200 dark:bg-dark-800 text-[11px]">Pure White</button>' +
            '<button onclick="window.processBgRemove(true)" class="px-2 py-1 rounded bg-slate-200 dark:bg-dark-800 text-[11px]">Transparent</button>' +
            '</div>' +
            '<div class="overflow-auto max-h-[360px] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-dark-950 p-2 flex justify-center">' +
            '<canvas id="bgRemoveCanvas" class="max-w-full shadow-md"></canvas>' +
            '</div>' +
            '<button onclick="window.downloadCanvas(\'bgRemoveCanvas\', \'removed_bg.png\')" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition"><i class="fa-solid fa-download"></i> Download Clean Image</button>' +
            '</div>' +
            '</div>'
    },
    pdf_to_img: {
        title: 'पीडीएफ टू इमेज कनवर्टर (150-800 DPI)',
        icon: '<i class="fa-solid fa-file-image"></i>',
        render: () => '<div class="space-y-4">' +
            '<div class="border-2 border-dashed border-sky-400/50 rounded-2xl p-4 sm:p-6 text-center bg-sky-50/50 dark:bg-sky-950/10 cursor-pointer" onclick="document.getElementById(\'inputPdfToImg\').click()">' +
            '<i class="fa-solid fa-file-pdf text-3xl text-sky-500 mb-2"></i>' +
            '<p class="text-xs font-bold text-slate-700 dark:text-slate-300">PDF फाइल चुनें (Max 50MB)</p>' +
            '<input type="file" id="inputPdfToImg" accept="application/pdf" class="hidden" onchange="window.handlePdfToImgUpload(event)">' +
            '</div>' +
            '<div id="pdfToImgControls" class="hidden space-y-3">' +
            '<div class="flex items-center gap-3 text-xs font-bold">' +
            '<label class="text-slate-500">DPI रेजोल्यूशन चुनें:</label>' +
            '<select id="selPdfDpi" class="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800 text-xs font-bold">' +
            '<option value="150">150 DPI (फास्ट)</option>' +
            '<option value="300" selected>300 DPI (स्टैंडर्ड प्रिंट क्वालिटी)</option>' +
            '<option value="600">600 DPI (हाई क्वालिटी)</option>' +
            '<option value="800">800 DPI (अल्ट्रा HD)</option>' +
            '</select>' +
            '<button onclick="window.renderPdfPageToImage()" class="px-3 py-2 bg-sky-500 text-white rounded-xl text-xs font-black">कन्वर्ट करें</button>' +
            '</div>' +
            '<div id="pdfImgPreviewContainer" class="overflow-auto max-h-[360px] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-dark-950 p-2 flex justify-center">' +
            '<canvas id="pdfToImgCanvas" class="max-w-full shadow-md bg-white"></canvas>' +
            '</div>' +
            '<button onclick="window.downloadCanvas(\'pdfToImgCanvas\', \'page.png\')" class="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition"><i class="fa-solid fa-download"></i> Download High-Res Image (PNG)</button>' +
            '</div>' +
            '</div>'
    },
    img_to_pdf: {
        title: 'इमेज टू पीडीएफ कनवर्टर (A4 Sheet)',
        icon: '<i class="fa-solid fa-images"></i>',
        render: () => '<div class="space-y-4">' +
            '<div class="border-2 border-dashed border-indigo-400/50 rounded-2xl p-4 sm:p-6 text-center bg-indigo-50/50 dark:bg-indigo-950/10 cursor-pointer" onclick="document.getElementById(\'inputImgToPdf\').click()">' +
            '<i class="fa-solid fa-images text-3xl text-indigo-500 mb-2"></i>' +
            '<p class="text-xs font-bold text-slate-700 dark:text-slate-300">इमेज चुनें (JPG/PNG - Max 50MB)</p>' +
            '<input type="file" id="inputImgToPdf" accept="image/*" multiple class="hidden" onchange="window.handleImgToPdfUpload(event)">' +
            '</div>' +
            '<div id="imgToPdfList" class="space-y-2"></div>' +
            '<button id="btnConvertImgToPdf" class="hidden w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition" onclick="window.convertImagesToPdf()"><i class="fa-solid fa-file-pdf"></i> Generate & Download A4 PDF</button>' +
            '</div>'
    },
    pdf_edit: {
        title: 'पीडीएफ टेक्स्ट एडिटर (Zero-Zoom A4 Direct Edit)',
        icon: '<i class="fa-solid fa-file-pen"></i>',
        render: () => '<div class="space-y-4">' +
            '<div class="border-2 border-dashed border-violet-400/50 rounded-2xl p-4 sm:p-6 text-center bg-violet-50/50 dark:bg-violet-950/10 cursor-pointer" onclick="document.getElementById(\'inputPdfEdit\').click()">' +
            '<i class="fa-solid fa-file-pdf text-3xl text-violet-500 mb-2"></i>' +
            '<p class="text-xs font-bold text-slate-700 dark:text-slate-300">PDF फाइल चुनें (Max 50MB)</p>' +
            '<input type="file" id="inputPdfEdit" accept="application/pdf" class="hidden" onchange="window.handlePdfEditUpload(event)">' +
            '</div>' +
            '<div id="pdfEditWorkspace" class="hidden space-y-3">' +
            '<div class="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-dark-800 rounded-xl text-xs font-bold">' +
            '<span>टेक्स्ट:</span>' +
            '<input type="text" id="editReplaceText" placeholder="नया टेक्स्ट लिखें..." class="flex-1 p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs">' +
            '<span>फ़ॉन्ट:</span>' +
            '<input type="number" id="editFontSize" value="14" min="8" max="72" class="w-14 p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs">' +
            '<input type="color" id="editFontColor" value="#000000" class="w-7 h-7 rounded border-0 cursor-pointer">' +
            '<span class="text-[10px] text-slate-400">(पेज पर क्लिक करके टेक्स्ट बदलें)</span>' +
            '</div>' +
            '<div class="overflow-auto max-h-[420px] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-200 dark:bg-dark-950 p-2 flex justify-center">' +
            '<canvas id="pdfEditCanvas" class="shadow-md bg-white cursor-crosshair"></canvas>' +
            '</div>' +
            '<button onclick="window.downloadEditedPdf()" class="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition"><i class="fa-solid fa-download"></i> Download Edited PDF</button>' +
            '</div>' +
            '</div>'
    },
    merge_pdf: {
        title: 'पीडीएफ मर्ज (Combine Multiple PDFs)',
        icon: '<i class="fa-solid fa-layer-group"></i>',
        render: () => '<div class="space-y-4">' +
            '<div class="border-2 border-dashed border-rose-400/50 rounded-2xl p-4 sm:p-6 text-center bg-rose-50/50 dark:bg-rose-950/10 cursor-pointer" onclick="document.getElementById(\'inputMergePdf\').click()">' +
            '<i class="fa-solid fa-folder-plus text-3xl text-rose-500 mb-2"></i>' +
            '<p class="text-xs font-bold text-slate-700 dark:text-slate-300">2 या अधिक PDF फाइलें चुनें (Max 50MB)</p>' +
            '<input type="file" id="inputMergePdf" accept="application/pdf" multiple class="hidden" onchange="window.handleMergePdfUpload(event)">' +
            '</div>' +
            '<div id="mergeFileList" class="space-y-1.5 text-xs font-bold"></div>' +
            '<button id="btnMergePdfs" class="hidden w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition" onclick="window.mergePdfs()"><i class="fa-solid fa-code-merge"></i> Merge & Download Combined PDF</button>' +
            '</div>'
    },
    unlock_pdf: {
        title: 'पीडीएफ अनलॉक (Password / Restriction Remover)',
        icon: '<i class="fa-solid fa-lock-open"></i>',
        render: () => '<div class="space-y-4">' +
            '<div class="border-2 border-dashed border-amber-400/50 rounded-2xl p-4 sm:p-6 text-center bg-amber-50/50 dark:bg-amber-950/10 cursor-pointer" onclick="document.getElementById(\'inputUnlockPdf\').click()">' +
            '<i class="fa-solid fa-unlock-keyhole text-3xl text-amber-500 mb-2"></i>' +
            '<p class="text-xs font-bold text-slate-700 dark:text-slate-300">प्रोटेक्टेड PDF फाइल चुनें (Max 50MB)</p>' +
            '<input type="file" id="inputUnlockPdf" accept="application/pdf" class="hidden" onchange="window.handleUnlockPdfUpload(event)">' +
            '</div>' +
            '<div id="unlockPdfControls" class="hidden space-y-3">' +
            '<div>' +
            '<label class="block text-xs font-bold text-slate-500 mb-1">पासवर्ड दर्ज करें (यदि प्रोटेक्टेड है):</label>' +
            '<input type="password" id="pdfUnlockPass" placeholder="PDF Password (Optional)..." class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold">' +
            '</div>' +
            '<button onclick="window.unlockAndDownloadPdf()" class="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-dark-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition"><i class="fa-solid fa-key"></i> Unlock & Download PDF</button>' +
            '</div>' +
            '</div>'
    },
    compress_img: {
        title: 'स्मार्ट इमेज कंप्रेसर (KB टारगेट कंप्रेसर)',
        icon: '<i class="fa-solid fa-compress"></i>',
        render: () => '<div class="space-y-4">' +
            '<div class="border-2 border-dashed border-teal-400/50 rounded-2xl p-4 sm:p-6 text-center bg-teal-50/50 dark:bg-teal-950/10 cursor-pointer" onclick="document.getElementById(\'inputCompressImg\').click()">' +
            '<i class="fa-solid fa-file-zipper text-3xl text-teal-500 mb-2"></i>' +
            '<p class="text-xs font-bold text-slate-700 dark:text-slate-300">इमेज चुनें (Max 50MB)</p>' +
            '<input type="file" id="inputCompressImg" accept="image/*" class="hidden" onchange="window.handleCompressImgUpload(event)">' +
            '</div>' +
            '<div id="compressImgControls" class="hidden space-y-3">' +
            '<div class="p-3 bg-slate-100 dark:bg-dark-800 rounded-xl space-y-2 text-xs font-bold">' +
            '<div class="flex justify-between text-slate-600 dark:text-slate-400">' +
            '<span>ओरिजिनल साइज़: <strong id="origImgSize" class="text-slate-900 dark:text-white">0 KB</strong></span>' +
            '<span>कंप्रेस्ड साइज़: <strong id="compImgSize" class="text-teal-600 dark:text-teal-400">0 KB</strong></span>' +
            '</div>' +
            '<div class="flex items-center gap-2">' +
            '<span class="text-slate-500">क्वालिटी:</span>' +
            '<input type="range" id="compressQuality" min="5" max="95" value="70" oninput="window.updateCompressQuality(this.value)" class="flex-1">' +
            '<span id="compressQualityVal" class="w-8 font-black text-right">70%</span>' +
            '</div>' +
            '</div>' +
            '<div class="overflow-auto max-h-[300px] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-dark-950 p-2 flex justify-center">' +
            '<img id="compressedImgPreview" class="max-w-full shadow-md rounded">' +
            '</div>' +
            '<button onclick="window.downloadCompressedImg()" class="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition"><i class="fa-solid fa-download"></i> Download Compressed Image</button>' +
            '</div>' +
            '</div>'
    }
};

window.openToolModal = function(toolKey) {
    const config = toolConfigs[toolKey];
    if (!config) return;
    document.getElementById('modalToolIcon').innerHTML = config.icon;
    document.getElementById('modalToolTitle').innerText = config.title;
    document.getElementById('modalToolBody').innerHTML = config.render();
    document.getElementById('toolModal').classList.remove('hidden');
};

window.closeToolModal = function() {
    document.getElementById('toolModal').classList.add('hidden');
};

// Global Store
window.currentUploadedImage = null;
window.currentUploadedPdfBytes = null;
window.currentMergeFiles = [];

// 1. Passport Photo Logic
window.handlePassportUpload = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            window.currentUploadedImage = img;
            document.getElementById('passportControls').classList.remove('hidden');
            window.renderPassportSheet();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
};

window.renderPassportSheet = function() {
    if (!window.currentUploadedImage) return;
    const canvas = document.getElementById('passportCanvas');
    const ctx = canvas.getContext('2d');
    const bg = document.getElementById('selPassportBg').value;
    const count = document.getElementById('selPassportCount').value;

    const pw = 413; // 3.5cm at 300DPI
    const ph = 531; // 4.5cm at 300DPI

    if (count === '1') {
        canvas.width = pw;
        canvas.height = ph;
        drawPassportPhoto(ctx, 0, 0, pw, ph, bg);
    } else {
        // A4 sheet: 2480 x 3508 at 300 DPI
        canvas.width = 2480;
        canvas.height = 3508;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cols = count === '6' ? 6 : 4;
        const rows = count === '6' ? 1 : 2;
        const startX = 140;
        const startY = 120;
        const gapX = 40;
        const gapY = 50;

        let drawn = 0;
        const total = parseInt(count);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (drawn >= total) break;
                const x = startX + c * (pw + gapX);
                const y = startY + r * (ph + gapY);
                drawPassportPhoto(ctx, x, y, pw, ph, bg);
                
                // Scissor Cut Guides
                ctx.strokeStyle = '#cccccc';
                ctx.setLineDash([6, 6]);
                ctx.strokeRect(x - 5, y - 5, pw + 10, ph + 10);
                ctx.setLineDash([]);

                drawn++;
            }
        }
    }
};

function drawPassportPhoto(ctx, x, y, w, h, bg) {
    if (bg === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, w, h);
    } else if (bg === 'lightblue') {
        ctx.fillStyle = '#bfe2ff';
        ctx.fillRect(x, y, w, h);
    }
    const img = window.currentUploadedImage;
    const hRatio = w / img.width;
    const vRatio = h / img.height;
    const ratio = Math.max(hRatio, vRatio);
    const centerShiftX = (w - img.width * ratio) / 2;
    const centerShiftY = (h - img.height * ratio) / 2;
    ctx.drawImage(img, 0, 0, img.width, img.height, x + centerShiftX, y + centerShiftY, img.width * ratio, img.height * ratio);
    
    // Thin border
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
}

window.downloadPassport = function(format) {
    const canvas = document.getElementById('passportCanvas');
    if (format === 'png') {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'passport_photo.png';
        a.click();
    } else {
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const a = document.createElement('a');
        a.href = imgData;
        a.download = 'passport_photos.jpg';
        a.click();
    }
};

// 2. BG Remover Logic
window.handleBgRemoveUpload = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            window.currentUploadedImage = img;
            document.getElementById('bgRemoveControls').classList.remove('hidden');
            window.processBgRemove();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
};

window.processBgRemove = function(transparent = false) {
    const img = window.currentUploadedImage;
    if (!img) return;
    const canvas = document.getElementById('bgRemoveCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;

    const bgCol = transparent ? null : document.getElementById('bgColPicker').value;
    if (bgCol) {
        ctx.fillStyle = bgCol;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
};

// 3. PDF to Image Logic
window.handlePdfToImgUpload = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    window.currentUploadedPdfBytes = arrayBuffer;
    document.getElementById('pdfToImgControls').classList.remove('hidden');
    window.renderPdfPageToImage();
};

window.renderPdfPageToImage = async function() {
    if (!window.currentUploadedPdfBytes) return;
    const dpi = parseInt(document.getElementById('selPdfDpi').value) || 300;
    const scale = dpi / 72;

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const loadingTask = pdfjsLib.getDocument({ data: window.currentUploadedPdfBytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.getElementById('pdfToImgCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
};

// 4. Image to PDF Logic
window.handleImgToPdfUpload = function(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    window.currentImgToPdfFiles = files;
    const list = document.getElementById('imgToPdfList');
    list.innerHTML = files.map(f => '<div class="p-2 bg-slate-100 dark:bg-dark-800 rounded-xl text-xs flex justify-between"><span>' + f.name + '</span><span class="text-slate-400">(' + (f.size/1024).toFixed(1) + ' KB)</span></div>').join('');
    document.getElementById('btnConvertImgToPdf').classList.remove('hidden');
};

window.convertImagesToPdf = async function() {
    const files = window.currentImgToPdfFiles;
    if (!files || !files.length) return;
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    for (const f of files) {
        const bytes = await f.arrayBuffer();
        let img;
        if (f.type.includes('png')) {
            img = await pdfDoc.embedPng(bytes);
        } else {
            img = await pdfDoc.embedJpg(bytes);
        }
        const page = pdfDoc.addPage([595.28, 841.89]);
        const scale = Math.min((595.28 - 40) / img.width, (841.89 - 40) / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (595.28 - w) / 2;
        const y = (841.89 - h) / 2;
        page.drawImage(img, { x, y, width: w, height: h });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'converted_document.pdf';
    a.click();
};

// 5. PDF Text Editor Logic
window.handlePdfEditUpload = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    window.currentUploadedPdfBytes = await file.arrayBuffer();
    document.getElementById('pdfEditWorkspace').classList.remove('hidden');

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: window.currentUploadedPdfBytes }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.getElementById('pdfEditCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;

    canvas.onclick = function(ev) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (ev.clientX - rect.left) * scaleX;
        const y = (ev.clientY - rect.top) * scaleY;

        const text = document.getElementById('editReplaceText').value;
        const fontSize = parseInt(document.getElementById('editFontSize').value) * 2;
        const color = document.getElementById('editFontColor').value;

        if (!text) return;

        const p = ctx.getImageData(Math.max(0, x - 5), Math.max(0, y - 5), 1, 1).data;
        ctx.fillStyle = `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
        
        ctx.font = `${fontSize}px Arial, sans-serif`;
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(x - 2, y - fontSize + 4, textWidth + 8, fontSize + 4);

        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    };
};

window.downloadEditedPdf = function() {
    const canvas = document.getElementById('pdfEditCanvas');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'edited_pdf_page.png';
    a.click();
};

// 6. Merge PDF Logic
window.handleMergePdfUpload = function(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    window.currentMergeFiles = files;
    const list = document.getElementById('mergeFileList');
    list.innerHTML = files.map((f, i) => '<div class="p-2 bg-slate-100 dark:bg-dark-800 rounded-xl flex justify-between"><span>' + (i+1) + '. ' + f.name + '</span><span class="text-slate-400">(' + (f.size/1024).toFixed(1) + ' KB)</span></div>').join('');
    document.getElementById('btnMergePdfs').classList.remove('hidden');
};

window.mergePdfs = async function() {
    const files = window.currentMergeFiles;
    if (!files || files.length < 2) return;
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();

    for (const f of files) {
        const bytes = await f.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
    }

    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'merged_document.pdf';
    a.click();
};

// 7. Unlock PDF Logic
window.handleUnlockPdfUpload = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    window.currentUploadedPdfBytes = await file.arrayBuffer();
    document.getElementById('unlockPdfControls').classList.remove('hidden');
};

window.unlockAndDownloadPdf = async function() {
    if (!window.currentUploadedPdfBytes) return;
    const pass = document.getElementById('pdfUnlockPass').value;
    try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(window.currentUploadedPdfBytes, { 
            password: pass || undefined,
            ignoreEncryption: true 
        });
        const unlockedBytes = await pdfDoc.save();
        const blob = new Blob([unlockedBytes], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'unlocked_document.pdf';
        a.click();
    } catch (err) {
        alert('त्रुटि: पासवर्ड अमान्य है या PDF लोड नहीं हो पाई।');
    }
};

// 8. Image Compressor Logic
window.handleCompressImgUpload = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('origImgSize').innerText = (file.size / 1024).toFixed(1) + ' KB';
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            window.currentUploadedImage = img;
            document.getElementById('compressImgControls').classList.remove('hidden');
            window.compressImage(0.7);
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
};

window.updateCompressQuality = function(val) {
    document.getElementById('compressQualityVal').innerText = val + '%';
    window.compressImage(val / 100);
};

window.compressImage = function(quality) {
    const img = window.currentUploadedImage;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    document.getElementById('compressedImgPreview').src = dataUrl;

    const head = 'data:image/jpeg;base64,';
    const sizeKB = Math.round((dataUrl.length - head.length) * 3 / 4 / 1024);
    document.getElementById('compImgSize').innerText = sizeKB + ' KB';
    window.currentCompressedDataUrl = dataUrl;
};

window.downloadCompressedImg = function() {
    if (!window.currentCompressedDataUrl) return;
    const a = document.createElement('a');
    a.href = window.currentCompressedDataUrl;
    a.download = 'compressed_image.jpg';
    a.click();
};

window.downloadCanvas = function(canvasId, filename) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    a.click();
};
