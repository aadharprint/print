// ============================================================================
// Ojas Tools Studio - Complete Logic Suite (tools-logic.js)
// 100% Client-Side, Fast, Private, High-DPI (Max 10MB Validation)
// ============================================================================

// Initialize PDF.js worker
if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB strict limit

window.validateFileSize = function(file, customMaxMb = 10) {
    if (!file) return false;
    const maxBytes = customMaxMb * 1024 * 1024;
    if (file.size > maxBytes) {
        const fileMb = (file.size / (1024 * 1024)).toFixed(2);
        alert(`⚠️ फाइल साइज बहुत बड़ा है!\n\nचुनी गई फाइल "${file.name}" का साइज ${fileMb} MB है।\nपोर्टल पर अधिकतम ${customMaxMb} MB तक की फाइल ही मान्य है।\n\nकृपया 10MB से छोटी फाइल चुनें।`);
        return false;
    }
    return true;
};

// ================= NAVIGATION & VIEW SWITCHER =================
window.currentActiveTool = null;

window.openToolWorkspace = function(toolId) {
    window.currentActiveTool = toolId;
    const gridView = document.getElementById('toolsGridView');
    const wsView = document.getElementById('toolWorkspaceView');
    const container = document.getElementById('activeToolContainer');

    if (gridView) gridView.classList.add('hidden');
    if (wsView) wsView.classList.remove('hidden');

    // Update active tab buttons styling
    document.querySelectorAll('.ws-tab-btn').forEach(btn => {
        btn.className = "ws-tab-btn px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 shrink-0 transition flex items-center gap-1.5 border border-slate-200";
    });
    const activeTab = document.getElementById(`wsTab-${toolId}`);
    if (activeTab) {
        activeTab.className = "ws-tab-btn px-3.5 py-2 rounded-xl text-xs font-black bg-dark-900 text-royal-300 shrink-0 transition flex items-center gap-1.5 border-2 border-royal-400 shadow-glow";
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    // Render selected tool workspace
    if (container) {
        container.innerHTML = '<div class="p-10 text-center text-slate-400 font-bold"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-royal-500"></i><br>Workspace लोड हो रहा है...</div>';
        setTimeout(() => {
            window.renderToolWorkspaceContent(toolId, container);
        }, 50);
    }
};

window.closeToolWorkspace = function() {
    window.currentActiveTool = null;
    const gridView = document.getElementById('toolsGridView');
    const wsView = document.getElementById('toolWorkspaceView');
    const container = document.getElementById('activeToolContainer');

    if (wsView) wsView.classList.add('hidden');
    if (gridView) gridView.classList.remove('hidden');
    if (container) container.innerHTML = '';
};

window.switchWorkspaceTool = function(toolId) {
    window.openToolWorkspace(toolId);
};

window.filterToolsCategory = function(cat) {
    const cards = document.querySelectorAll('#toolsCardsContainer .tool-card');
    const btns = ['all', 'photo', 'pdf'];
    btns.forEach(b => {
        const el = document.getElementById(`catBtn-${b}`);
        if (!el) return;
        if (b === cat) {
            el.className = "px-3.5 py-1.5 rounded-xl text-xs font-black bg-dark-900 text-royal-300 shadow-sm border border-royal-500/40 transition";
        } else {
            el.className = "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-200 border border-slate-200 transition";
        }
    });

    cards.forEach(card => {
        const itemCat = card.getAttribute('data-category') || '';
        if (cat === 'all' || itemCat.includes(cat)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
};

window.filterToolsBySearch = function(query) {
    const q = String(query).trim().toLowerCase();
    const cards = document.querySelectorAll('#toolsCardsContainer .tool-card');
    cards.forEach(card => {
        const title = (card.getAttribute('data-title') || '').toLowerCase();
        const text = card.innerText.toLowerCase();
        if (!q || title.includes(q) || text.includes(q)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
};

// ================= WORKSPACE TEMPLATE RENDERER =================
window.renderToolWorkspaceContent = function(toolId, container) {
    switch (toolId) {
        case 'passport_photo':
            window.setupPassportPhotoTool(container);
            break;
        case 'bg_remover':
            window.setupBgRemoverTool(container);
            break;
        case 'pdf_to_img':
            window.setupPdfToImageTool(container);
            break;
        case 'img_to_pdf':
            window.setupImageToPdfTool(container);
            break;
        case 'pdf_editor':
            window.setupPdfEditorTool(container);
            break;
        case 'pdf_merge':
            window.setupPdfMergeTool(container);
            break;
        case 'pdf_unlock':
            window.setupPdfUnlockTool(container);
            break;
        case 'img_compress':
            window.setupImageCompressorTool(container);
            break;
        default:
            container.innerHTML = '<div class="p-6 text-center text-red-500 font-bold">Unknown Tool</div>';
    }
};

// ============================================================================
// TOOL 1: PASSPORT PHOTO GENERATOR (With White Background & 8-Photo Printable Sheet)
// ============================================================================
window.setupPassportPhotoTool = function(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div class="flex items-center gap-2.5">
                    <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-lg font-black">
                        <i class="fa-solid fa-id-badge"></i>
                    </div>
                    <div>
                        <h2 class="text-base md:text-lg font-black text-dark-900">पासपोर्ट साइज फोटो मेकर (Passport Photo Studio)</h2>
                        <p class="text-[11px] font-semibold text-slate-400">3.5 × 4.5 cm स्टैंडर्ड साइज • वाइट बैकग्राउंड • 4×6 इंच / A4 प्रिंटेबल शीट (Max 10MB)</p>
                    </div>
                </div>
            </div>

            <!-- Upload Box -->
            <div id="ppUploadSection" class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('ppFileInput').click()">
                <input type="file" id="ppFileInput" accept="image/*" class="hidden" onchange="window.handlePassportPhotoUpload(this.files[0])">
                <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-amber-200">
                    <i class="fa-solid fa-camera"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">यहाँ अपनी फोटो अपलोड करें (क्लिक करें या ड्रैग करें)</h3>
                <p class="text-xs font-semibold text-slate-400">JPG, PNG, WEBP (अधिकतम फाइल साइज: 10 MB)</p>
            </div>

            <!-- Editor Section (Initially Hidden) -->
            <div id="ppEditorSection" class="hidden grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                <!-- Left Controls Panel -->
                <div class="lg:col-span-5 space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    
                    <!-- 1. Background Color -->
                    <div>
                        <label class="block text-[11px] font-black text-slate-600 uppercase mb-1.5">1. बैकग्राउंड का रंग (Background)</label>
                        <div class="grid grid-cols-3 gap-2">
                            <button type="button" onclick="window.setPassportBgColor('#ffffff', this)" class="pp-bg-btn p-2 rounded-xl text-xs font-bold bg-white text-dark-900 border-2 border-amber-400 flex items-center justify-center gap-1 shadow-sm">
                                <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-white"></span> White
                            </button>
                            <button type="button" onclick="window.setPassportBgColor('#cce6ff', this)" class="pp-bg-btn p-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1">
                                <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-sky-200"></span> Sky Blue
                            </button>
                            <button type="button" onclick="window.setPassportBgColor('original', this)" class="pp-bg-btn p-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1">
                                <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-slate-400"></span> Original
                            </button>
                        </div>
                    </div>

                    <!-- 2. Zoom & Position Controls -->
                    <div class="space-y-3 p-3 bg-white rounded-xl border border-slate-200">
                        <div>
                            <div class="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                                <span>Zoom (फोटो का आकार):</span>
                                <span id="ppZoomVal">1.0x</span>
                            </div>
                            <input type="range" id="ppZoomSlider" min="0.5" max="3" step="0.05" value="1" oninput="window.updatePassportCanvas()" class="w-full accent-amber-500 cursor-pointer">
                        </div>

                        <div>
                            <div class="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                                <span>Vertical Position (ऊपर / नीचे):</span>
                                <span id="ppPanYVal">0</span>
                            </div>
                            <input type="range" id="ppPanYSlider" min="-200" max="200" step="2" value="0" oninput="window.updatePassportCanvas()" class="w-full accent-amber-500 cursor-pointer">
                        </div>

                        <div>
                            <div class="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                                <span>Horizontal Position (दाएँ / बाएँ):</span>
                                <span id="ppPanXVal">0</span>
                            </div>
                            <input type="range" id="ppPanXSlider" min="-200" max="200" step="2" value="0" oninput="window.updatePassportCanvas()" class="w-full accent-amber-500 cursor-pointer">
                        </div>
                    </div>

                    <!-- 3. Brightness & Contrast -->
                    <div class="grid grid-cols-2 gap-2 p-3 bg-white rounded-xl border border-slate-200">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Brightness</label>
                            <input type="range" id="ppBrightness" min="-40" max="40" value="5" oninput="window.updatePassportCanvas()" class="w-full accent-amber-500 cursor-pointer">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contrast</label>
                            <input type="range" id="ppContrast" min="-40" max="40" value="10" oninput="window.updatePassportCanvas()" class="w-full accent-amber-500 cursor-pointer">
                        </div>
                    </div>

                    <!-- 4. Border & Cutting Line -->
                    <label class="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                        <span class="text-xs font-bold text-slate-700">काटने के लिए बॉर्डर (1mm Border)</span>
                        <input type="checkbox" id="ppBorderToggle" checked onchange="window.updatePassportCanvas()" class="w-4 h-4 accent-amber-600 rounded">
                    </label>

                    <!-- Sheet Layout Options -->
                    <div class="space-y-1.5">
                        <label class="block text-[11px] font-black text-slate-600 uppercase">प्रिंट शीट लेआउट (Print Layout)</label>
                        <select id="ppSheetLayout" onchange="window.updatePassportCanvas()" class="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none">
                            <option value="single">Single Photo (3.5 × 4.5 cm)</option>
                            <option value="sheet_4x6" selected>4 × 6 Inch Sheet (8 Photos in 2 Rows)</option>
                            <option value="sheet_a4">A4 Full Sheet (16 Photos)</option>
                        </select>
                    </div>

                    <!-- Action Buttons -->
                    <div class="grid grid-cols-2 gap-2 pt-2">
                        <button type="button" onclick="window.downloadPassportOutput('jpg')" class="bg-dark-900 hover:bg-black text-royal-300 font-black py-3 rounded-xl text-xs transition shadow-glow flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-download"></i> Download JPG
                        </button>
                        <button type="button" onclick="window.printPassportCanvas()" class="bg-amber-500 hover:bg-amber-600 text-dark-950 font-black py-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-print"></i> Direct Print
                        </button>
                    </div>

                    <button type="button" onclick="document.getElementById('ppFileInput').click()" class="w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2 rounded-xl text-xs transition">
                        <i class="fa-solid fa-rotate-left mr-1"></i> दूसरी फोटो अपलोड करें
                    </button>
                </div>

                <!-- Right Canvas Preview -->
                <div class="lg:col-span-7 bg-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center min-h-[450px] overflow-auto">
                    <div class="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                        <i class="fa-solid fa-eye text-amber-600"></i>
                        <span>Live High-DPI Print Preview</span>
                    </div>
                    <canvas id="ppMainCanvas" class="bg-white shadow-xl rounded-lg max-w-full h-auto border border-slate-300"></canvas>
                </div>

            </div>
        </div>
    `;
};

window.ppState = {
    img: null,
    bgColor: '#ffffff',
    targetRatio: 3.5 / 4.5
};

window.handlePassportPhotoUpload = function(file) {
    if (!file) return;
    if (!window.validateFileSize(file, 10)) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            window.ppState.img = img;
            document.getElementById('ppUploadSection').classList.add('hidden');
            document.getElementById('ppEditorSection').classList.remove('hidden');
            window.updatePassportCanvas();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.setPassportBgColor = function(color, btnEl) {
    window.ppState.bgColor = color;
    document.querySelectorAll('.pp-bg-btn').forEach(b => {
        b.className = "pp-bg-btn p-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1";
    });
    if (btnEl) btnEl.className = "pp-bg-btn p-2 rounded-xl text-xs font-bold bg-white text-dark-900 border-2 border-amber-400 flex items-center justify-center gap-1 shadow-sm";
    window.updatePassportCanvas();
};

window.updatePassportCanvas = function() {
    const canvas = document.getElementById('ppMainCanvas');
    if (!canvas || !window.ppState.img) return;

    const img = window.ppState.img;
    const zoom = parseFloat(document.getElementById('ppZoomSlider')?.value || 1);
    const panX = parseFloat(document.getElementById('ppPanXSlider')?.value || 0);
    const panY = parseFloat(document.getElementById('ppPanYSlider')?.value || 0);
    const brightness = parseInt(document.getElementById('ppBrightness')?.value || 0);
    const contrast = parseInt(document.getElementById('ppContrast')?.value || 0);
    const hasBorder = document.getElementById('ppBorderToggle')?.checked ?? true;
    const layout = document.getElementById('ppSheetLayout')?.value || 'sheet_4x6';

    document.getElementById('ppZoomVal').innerText = zoom.toFixed(2) + 'x';
    document.getElementById('ppPanXVal').innerText = panX;
    document.getElementById('ppPanYVal').innerText = panY;

    // Standard 300 DPI dimensions for 3.5cm x 4.5cm: 413 x 531 pixels
    const photoW = 413;
    const photoH = 531;

    // 1. Offscreen single photo canvas
    const singleCanvas = document.createElement('canvas');
    singleCanvas.width = photoW;
    singleCanvas.height = photoH;
    const sCtx = singleCanvas.getContext('2d');

    // Fill background color
    if (window.ppState.bgColor !== 'original') {
        sCtx.fillStyle = window.ppState.bgColor;
        sCtx.fillRect(0, 0, photoW, photoH);
    } else {
        sCtx.fillStyle = '#ffffff';
        sCtx.fillRect(0, 0, photoW, photoH);
    }

    // Draw user image scaled and panned
    sCtx.save();
    sCtx.translate(photoW / 2 + panX, photoH / 2 + panY);
    sCtx.scale(zoom, zoom);
    
    const imgAspect = img.width / img.height;
    let drawW = photoW;
    let drawH = photoW / imgAspect;
    if (drawH < photoH) {
        drawH = photoH;
        drawW = photoH * imgAspect;
    }
    sCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    sCtx.restore();

    // Apply brightness and contrast filters
    const imgData = sCtx.getImageData(0, 0, photoW, photoH);
    const d = imgData.data;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < d.length; i += 4) {
        let r = d[i] + brightness;
        let g = d[i + 1] + brightness;
        let b = d[i + 2] + brightness;
        d[i] = factor * (r - 128) + 128;
        d[i + 1] = factor * (g - 128) + 128;
        d[i + 2] = factor * (b - 128) + 128;
    }
    sCtx.putImageData(imgData, 0, 0);

    // Fine cut border
    if (hasBorder) {
        sCtx.strokeStyle = '#cccccc';
        sCtx.lineWidth = 3;
        sCtx.strokeRect(1, 1, photoW - 2, photoH - 2);
    }

    // 2. Render onto Main Output Canvas based on layout
    const ctx = canvas.getContext('2d');

    if (layout === 'single') {
        canvas.width = photoW;
        canvas.height = photoH;
        ctx.drawImage(singleCanvas, 0, 0);
    } 
    else if (layout === 'sheet_4x6') {
        // 4 x 6 inch at 300 DPI = 1800 x 1200 landscape (8 photos: 2 rows of 4)
        canvas.width = 1800;
        canvas.height = 1200;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const startX = 60;
        const startY = 55;
        const gapX = 18;
        const gapY = 25;

        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 4; col++) {
                const x = startX + col * (photoW + gapX);
                const y = startY + row * (photoH + gapY);
                ctx.drawImage(singleCanvas, x, y);

                ctx.strokeStyle = '#dddddd';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - 2, y - 2, photoW + 4, photoH + 4);
            }
        }
    } 
    else if (layout === 'sheet_a4') {
        // A4 at 300 DPI = 2480 x 3508 px (16 photos: 4 rows of 4)
        canvas.width = 2480;
        canvas.height = 3508;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const startX = 140;
        const startY = 160;
        const gapX = 30;
        const gapY = 40;

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const x = startX + col * (photoW + gapX);
                const y = startY + row * (photoH + gapY);
                ctx.drawImage(singleCanvas, x, y);
            }
        }
    }
};

window.downloadPassportOutput = function(format = 'jpg') {
    const canvas = document.getElementById('ppMainCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Passport_Photos_${Date.now()}.${format}`;
    link.href = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    link.click();
};

window.printPassportCanvas = function() {
    const canvas = document.getElementById('ppMainCanvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head><title>Print Passport Photos</title>
        <style>@page { size: auto; margin: 0; } body { margin: 0; display: flex; align-items: center; justify-content: center; }</style>
        </head>
        <body onload="window.print();window.close();">
            <img src="${dataUrl}" style="max-width:100%; height:auto;" />
        </body>
        </html>
    `);
    win.document.close();
};

// ============================================================================
// TOOL 2: BACKGROUND REMOVER & WHITE BG CONVERTER (bg_remover)
// ============================================================================
window.setupBgRemoverTool = function(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-lg font-black">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <div>
                    <h2 class="text-base md:text-lg font-black text-dark-900">स्मार्ट बैकग्राउंड रिमूवर &amp; वाइट BG कनवर्टर</h2>
                    <p class="text-[11px] font-semibold text-slate-400">फोटो का बैकग्राउंड तुरंत वाइट (#FFFFFF), पारदर्शी या पसंदीदा रंग का बनाएं (Max 10MB)</p>
                </div>
            </div>

            <!-- Upload Area -->
            <div id="bgUploadBox" class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('bgFileInput').click()">
                <input type="file" id="bgFileInput" accept="image/*" class="hidden" onchange="window.handleBgRemoverUpload(this.files[0])">
                <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-emerald-200">
                    <i class="fa-solid fa-image"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">यहाँ इमेज अपलोड करें (क्लिक करें या ड्रैग करें)</h3>
                <p class="text-xs font-semibold text-slate-400">JPG, PNG, WEBP (अधिकतम 10MB)</p>
            </div>

            <!-- Result Workspace -->
            <div id="bgWorkspaceSection" class="hidden space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-bold text-slate-600 uppercase">नया बैकग्राउंड रंग:</span>
                        <button type="button" onclick="window.applyBgColor('#ffffff', this)" class="bg-mode-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-dark-900 border-2 border-emerald-500 shadow-sm flex items-center gap-1.5">
                            <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-white"></span> Pure White
                        </button>
                        <button type="button" onclick="window.applyBgColor('transparent', this)" class="bg-mode-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 flex items-center gap-1.5">
                            <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-slate-200"></span> Transparent
                        </button>
                        <button type="button" onclick="window.applyBgColor('#99ccff', this)" class="bg-mode-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 flex items-center gap-1.5">
                            <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-sky-300"></span> Sky Blue
                        </button>
                    </div>

                    <div class="flex items-center gap-2">
                        <label class="text-xs font-bold text-slate-600">सेंसिटिविटी (Tolerance):</label>
                        <input type="range" id="bgTolerance" min="5" max="80" value="28" oninput="window.processBgRemoval()" class="w-28 accent-emerald-600 cursor-pointer">
                        <span id="bgTolVal" class="text-xs font-bold text-slate-700">28</span>
                    </div>

                    <button type="button" onclick="window.downloadBgResult()" class="bg-dark-900 hover:bg-black text-royal-300 font-black px-5 py-2.5 rounded-xl text-xs shadow-glow transition flex items-center gap-1.5">
                        <i class="fa-solid fa-download"></i> Download HD Image
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                        <h4 class="text-xs font-black text-slate-500 uppercase mb-2">मूल फोटो (Original)</h4>
                        <img id="bgOriginalImg" class="max-h-96 mx-auto rounded-xl object-contain shadow-sm">
                    </div>
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                        <h4 class="text-xs font-black text-emerald-600 uppercase mb-2">प्रोसेस्ड फोटो (Processed HD)</h4>
                        <div class="bg-slate-200 p-2 rounded-xl inline-block">
                            <canvas id="bgResultCanvas" class="max-h-96 mx-auto rounded-lg shadow-sm"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.bgRemoverState = {
    img: null,
    targetColor: '#ffffff'
};

window.handleBgRemoverUpload = function(file) {
    if (!file) return;
    if (!window.validateFileSize(file, 10)) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            window.bgRemoverState.img = img;
            document.getElementById('bgOriginalImg').src = img.src;
            document.getElementById('bgUploadBox').classList.add('hidden');
            document.getElementById('bgWorkspaceSection').classList.remove('hidden');
            window.processBgRemoval();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.applyBgColor = function(color, btnEl) {
    window.bgRemoverState.targetColor = color;
    document.querySelectorAll('.bg-mode-btn').forEach(b => {
        b.className = "bg-mode-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 flex items-center gap-1.5";
    });
    if (btnEl) btnEl.className = "bg-mode-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-dark-900 border-2 border-emerald-500 shadow-sm flex items-center gap-1.5";
    window.processBgRemoval();
};

window.processBgRemoval = function() {
    const img = window.bgRemoverState.img;
    const canvas = document.getElementById('bgResultCanvas');
    if (!img || !canvas) return;

    const tol = parseInt(document.getElementById('bgTolerance')?.value || 28);
    const tolValEl = document.getElementById('bgTolVal');
    if (tolValEl) tolValEl.innerText = tol;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    // Sample corner pixels to detect background color
    const corners = [
        [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]
    ];
    let avgR = 0, avgG = 0, avgB = 0;
    corners.forEach(([x, y]) => {
        const idx = (y * w + x) * 4;
        avgR += d[idx];
        avgG += d[idx + 1];
        avgB += d[idx + 2];
    });
    avgR = Math.round(avgR / corners.length);
    avgG = Math.round(avgG / corners.length);
    avgB = Math.round(avgB / corners.length);

    const isTrans = window.bgRemoverState.targetColor === 'transparent';
    let repR = 255, repG = 255, repB = 255;
    if (window.bgRemoverState.targetColor === '#99ccff') {
        repR = 153; repG = 204; repB = 255;
    }

    const tolSq = tol * tol * 3;

    for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        const distSq = (r - avgR) * (r - avgR) + (g - avgG) * (g - avgG) + (b - avgB) * (b - avgB);

        if (distSq < tolSq) {
            if (isTrans) {
                d[i + 3] = 0;
            } else {
                d[i] = repR;
                d[i + 1] = repG;
                d[i + 2] = repB;
                d[i + 3] = 255;
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
};

window.downloadBgResult = function() {
    const canvas = document.getElementById('bgResultCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Photo_NoBG_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
};

// ============================================================================
// TOOL 3: PDF TO HIGH-RES IMAGE (300 to 800 DPI Scale Rendering)
// ============================================================================
window.setupPdfToImageTool = function(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-lg font-black">
                    <i class="fa-solid fa-file-image"></i>
                </div>
                <div>
                    <h2 class="text-base md:text-lg font-black text-dark-900">PDF to High-Res Image Converter</h2>
                    <p class="text-[11px] font-semibold text-slate-400">300+ से 800 DPI अल्ट्रा-क्लियर रेंडरिंग • PNG / JPG एक्सपोर्ट (Max 10MB)</p>
                </div>
            </div>

            <!-- Upload Zone -->
            <div id="pdfImgUploadBox" class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('pdfImgFileInput').click()">
                <input type="file" id="pdfImgFileInput" accept="application/pdf" class="hidden" onchange="window.handlePdfToImgUpload(this.files[0])">
                <div class="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-indigo-200">
                    <i class="fa-solid fa-file-pdf"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">यहाँ अपनी PDF फाइल अपलोड करें</h3>
                <p class="text-xs font-semibold text-slate-400">केवल PDF फाइल (अधिकतम 10MB)</p>
            </div>

            <!-- Conversion Options & Output -->
            <div id="pdfImgWorkspaceSection" class="hidden space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div class="flex items-center gap-3">
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">DPI / रेज़ोल्यूशन क्वालिटी</label>
                            <select id="pdfRenderDpi" onchange="window.renderPdfPagesToImages()" class="p-2 border border-slate-200 rounded-xl text-xs font-black bg-white outline-none">
                                <option value="1.5">150 DPI (Fast Web)</option>
                                <option value="3.0" selected>300 DPI (High-Quality Print)</option>
                                <option value="6.0">600 DPI (Ultra-Sharp HD)</option>
                                <option value="8.0">800 DPI (Extreme Resolution)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">फॉर्मेट</label>
                            <select id="pdfImgFormat" class="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none">
                                <option value="png">PNG (Lossless Sharp)</option>
                                <option value="jpg">JPG (High Quality)</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <button type="button" id="btnDownloadAllPdfImgs" onclick="window.downloadAllPdfImagesZip()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5">
                            <i class="fa-solid fa-file-zipper"></i> Download All as ZIP
                        </button>
                        <button type="button" onclick="document.getElementById('pdfImgFileInput').click()" class="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold px-3 py-2.5 rounded-xl text-xs transition">
                            <i class="fa-solid fa-rotate-left"></i>
                        </button>
                    </div>
                </div>

                <div id="pdfPagesStatusText" class="text-xs font-bold text-indigo-700"></div>

                <!-- Rendered Pages Grid -->
                <div id="pdfPagesContainer" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"></div>
            </div>
        </div>
    `;
};

window.pdfToImgState = {
    pdfDoc: null,
    renderedImages: []
};

window.handlePdfToImgUpload = async function(file) {
    if (!file) return;
    if (!window.validateFileSize(file, 10)) return;

    const statusEl = document.getElementById('pdfPagesStatusText');
    document.getElementById('pdfImgUploadBox').classList.add('hidden');
    document.getElementById('pdfImgWorkspaceSection').classList.remove('hidden');

    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        window.pdfToImgState.pdfDoc = await loadingTask.promise;
        window.renderPdfPagesToImages();
    } catch (err) {
        alert('PDF लोड करने में समस्या आई: ' + err.message);
        document.getElementById('pdfImgUploadBox').classList.remove('hidden');
        document.getElementById('pdfImgWorkspaceSection').classList.add('hidden');
    }
};

window.renderPdfPagesToImages = async function() {
    const pdfDoc = window.pdfToImgState.pdfDoc;
    const container = document.getElementById('pdfPagesContainer');
    const statusText = document.getElementById('pdfPagesStatusText');
    if (!pdfDoc || !container) return;

    const scale = parseFloat(document.getElementById('pdfRenderDpi')?.value || 3.0);
    const numPages = pdfDoc.numPages;
    statusText.innerText = `कुल ${numPages} पेज मिलें। हाई-DPI स्केल (${scale}x) पर प्रोसेस हो रहा है...`;
    container.innerHTML = '';
    window.pdfToImgState.renderedImages = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const imgDataUrl = canvas.toDataURL('image/png');
        window.pdfToImgState.renderedImages.push({ pageNum, dataUrl: imgDataUrl });

        const card = document.createElement('div');
        card.className = "bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-2";
        card.innerHTML = `
            <div class="space-y-1">
                <span class="text-[10px] font-black text-slate-500 uppercase">Page ${pageNum} of ${numPages}</span>
                <div class="bg-white p-1 rounded-xl border border-slate-200 overflow-hidden">
                    <img src="${imgDataUrl}" class="w-full h-auto object-contain max-h-64 mx-auto rounded">
                </div>
            </div>
            <button type="button" onclick="window.downloadSinglePdfImage(${pageNum})" class="w-full bg-dark-900 hover:bg-black text-royal-300 font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1">
                <i class="fa-solid fa-download"></i> Download Page ${pageNum}
            </button>
        `;
        container.appendChild(card);
    }
    statusText.innerText = `✅ सभी ${numPages} पेज सफलतापूर्वक हाई-DPI में रेंडर हो गए हैं!`;
};

window.downloadSinglePdfImage = function(pageNum) {
    const item = window.pdfToImgState.renderedImages.find(i => i.pageNum === pageNum);
    if (!item) return;
    const fmt = document.getElementById('pdfImgFormat')?.value || 'png';
    const link = document.createElement('a');
    link.download = `Page_${pageNum}_HighDPI.${fmt}`;
    link.href = item.dataUrl;
    link.click();
};

window.downloadAllPdfImagesZip = async function() {
    const list = window.pdfToImgState.renderedImages;
    if (list.length === 0) return alert('डाउनलोड करने के लिए कोई इमेज नहीं है!');
    const btn = document.getElementById('btnDownloadAllPdfImgs');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Zipping...';

    try {
        const zip = new JSZip();
        const fmt = document.getElementById('pdfImgFormat')?.value || 'png';

        list.forEach(item => {
            const base64Data = item.dataUrl.split(',')[1];
            zip.file(`Page_${item.pageNum}.${fmt}`, base64Data, { base64: true });
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.download = `All_Pages_HighDPI_${Date.now()}.zip`;
        link.href = URL.createObjectURL(content);
        link.click();
    } catch (e) {
        alert('ZIP बनाने में समस्या आई: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

// ============================================================================
// TOOL 4: IMAGE TO PDF CONVERTER (img_to_pdf)
// ============================================================================
window.setupImageToPdfTool = function(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div class="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-lg font-black">
                    <i class="fa-solid fa-file-pdf"></i>
                </div>
                <div>
                    <h2 class="text-base md:text-lg font-black text-dark-900">Image to PDF Converter</h2>
                    <p class="text-[11px] font-semibold text-slate-400">एक या अधिक फोटो को क्रमबद्ध तरीके से A4 साइज प्रिंटेबल पीडीएफ में बदलें (Max 10MB per file)</p>
                </div>
            </div>

            <!-- Upload Area -->
            <div class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('imgPdfFileInput').click()">
                <input type="file" id="imgPdfFileInput" accept="image/*" multiple class="hidden" onchange="window.handleImageToPdfUpload(this.files)">
                <div class="w-14 h-14 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-sky-200">
                    <i class="fa-solid fa-images"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">यहाँ फोटो चुनें (एक साथ कई फोटो चुन सकते हैं)</h3>
                <p class="text-xs font-semibold text-slate-400">JPG, PNG (प्रत्येक फाइल अधिकतम 10MB)</p>
            </div>

            <!-- Image Reorder & Settings Workspace -->
            <div id="imgPdfWorkspace" class="hidden space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div class="flex items-center gap-3">
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">पेज ओरिएंटेशन</label>
                            <select id="imgPdfOrientation" class="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none">
                                <option value="portrait" selected>Portrait (सीधा A4)</option>
                                <option value="landscape">Landscape (आड़ा A4)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">मार्जिन (Margin)</label>
                            <select id="imgPdfMargin" class="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none">
                                <option value="15" selected>Standard (15mm)</option>
                                <option value="0">No Margin (Full Page)</option>
                            </select>
                        </div>
                    </div>

                    <button type="button" id="btnGenerateImgPdf" onclick="window.generatePdfFromImages()" class="bg-sky-600 hover:bg-sky-700 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-sm transition flex items-center gap-1.5">
                        <i class="fa-solid fa-file-arrow-down"></i> Convert &amp; Download PDF
                    </button>
                </div>

                <!-- Thumbnails List -->
                <div id="imgPdfListContainer" class="space-y-2"></div>
            </div>
        </div>
    `;
};

window.imgToPdfList = [];

window.handleImageToPdfUpload = function(fileList) {
    if (!fileList || fileList.length === 0) return;
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!window.validateFileSize(file, 10)) continue;
        const reader = new FileReader();
        reader.onload = (e) => {
            window.imgToPdfList.push({ name: file.name, dataUrl: e.target.result });
            window.renderImgToPdfList();
        };
        reader.readAsDataURL(file);
    }
};

window.renderImgToPdfList = function() {
    const ws = document.getElementById('imgPdfWorkspace');
    const container = document.getElementById('imgPdfListContainer');
    if (!ws || !container) return;

    if (window.imgToPdfList.length > 0) {
        ws.classList.remove('hidden');
    } else {
        ws.classList.add('hidden');
        return;
    }

    container.innerHTML = '';
    window.imgToPdfList.forEach((item, index) => {
        container.innerHTML += `
            <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm gap-2">
                <div class="flex items-center gap-3 overflow-hidden">
                    <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">${index + 1}</span>
                    <img src="${item.dataUrl}" class="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0">
                    <span class="text-xs font-bold text-slate-800 truncate">${item.name}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" onclick="window.moveImgToPdfOrder(${index}, -1)" class="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs" title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
                    <button type="button" onclick="window.moveImgToPdfOrder(${index}, 1)" class="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs" title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
                    <button type="button" onclick="window.removeImgToPdfItem(${index})" class="w-7 h-7 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-xs" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
};

window.moveImgToPdfOrder = function(idx, dir) {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= window.imgToPdfList.length) return;
    const temp = window.imgToPdfList[idx];
    window.imgToPdfList[idx] = window.imgToPdfList[targetIdx];
    window.imgToPdfList[targetIdx] = temp;
    window.renderImgToPdfList();
};

window.removeImgToPdfItem = function(idx) {
    window.imgToPdfList.splice(idx, 1);
    window.renderImgToPdfList();
};

window.generatePdfFromImages = async function() {
    if (window.imgToPdfList.length === 0) return alert('कृपया पहले कम से कम 1 फोटो अपलोड करें!');
    const btn = document.getElementById('btnGenerateImgPdf');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating PDF...';

    try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        const orientation = document.getElementById('imgPdfOrientation')?.value || 'portrait';
        const margin = parseFloat(document.getElementById('imgPdfMargin')?.value || 15);

        const a4Width = orientation === 'portrait' ? 595.28 : 841.89;
        const a4Height = orientation === 'portrait' ? 841.89 : 595.28;

        for (const item of window.imgToPdfList) {
            const page = pdfDoc.addPage([a4Width, a4Height]);
            const isPng = item.dataUrl.includes('image/png');
            let embeddedImage;

            if (isPng) {
                embeddedImage = await pdfDoc.embedPng(item.dataUrl);
            } else {
                embeddedImage = await pdfDoc.embedJpg(item.dataUrl);
            }

            const imgW = embeddedImage.width;
            const imgH = embeddedImage.height;

            const availW = a4Width - 2 * margin;
            const availH = a4Height - 2 * margin;

            const scale = Math.min(availW / imgW, availH / imgH);
            const drawW = imgW * scale;
            const drawH = imgH * scale;

            const x = (a4Width - drawW) / 2;
            const y = (a4Height - drawH) / 2;

            page.drawImage(embeddedImage, {
                x: x,
                y: y,
                width: drawW,
                height: drawH
            });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.download = `Images_${Date.now()}.pdf`;
        link.href = URL.createObjectURL(blob);
        link.click();
    } catch (e) {
        alert('PDF बनाने में त्रुटि: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

// ============================================================================
// TOOL 5: PDF TEXT & STAMP EDITOR (pdf_editor)
// ============================================================================
window.setupPdfEditorTool = function(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center text-lg font-black">
                    <i class="fa-solid fa-pen-to-square"></i>
                </div>
                <div>
                    <h2 class="text-base md:text-lg font-black text-dark-900">PDF Text &amp; Stamp Editor</h2>
                    <p class="text-[11px] font-semibold text-slate-400">टेक्स्ट जोड़ें, हस्ताक्षर लगाएं, व्हाइटआउट (Erase) करें (Max 10MB)</p>
                </div>
            </div>

            <!-- Upload Area -->
            <div id="pdfEditUploadBox" class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('pdfEditFileInput').click()">
                <input type="file" id="pdfEditFileInput" accept="application/pdf" class="hidden" onchange="window.handlePdfEditorUpload(this.files[0])">
                <div class="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-rose-200">
                    <i class="fa-solid fa-file-signature"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">यहाँ PDF फाइल अपलोड करें</h3>
                <p class="text-xs font-semibold text-slate-400">एडिट करने के लिए PDF चुनें (अधिकतम 10MB)</p>
            </div>

            <!-- Workspace Editor -->
            <div id="pdfEditWorkspace" class="hidden space-y-4">
                <!-- Toolbar -->
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="window.navPdfEditPage(-1)" class="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"><i class="fa-solid fa-chevron-left"></i> Prev</button>
                            <span id="pdfEditPageIndicator" class="text-xs font-black text-slate-700">Page 1 / 1</span>
                            <button type="button" onclick="window.navPdfEditPage(1)" class="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold">Next <i class="fa-solid fa-chevron-right"></i></button>
                        </div>

                        <div class="flex items-center gap-2">
                            <button type="button" onclick="window.addDateStampToPdf()" class="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1">
                                <i class="fa-solid fa-calendar-day text-amber-500"></i> + Date Stamp
                            </button>
                            <button type="button" onclick="window.saveAndDownloadEditedPdf()" class="bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1">
                                <i class="fa-solid fa-download"></i> Save &amp; Download PDF
                            </button>
                        </div>
                    </div>

                    <!-- Text & Whiteout Tools -->
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center">
                        <div class="sm:col-span-2">
                            <input type="text" id="pdfEditTextInput" placeholder="यहाँ टेक्स्ट लिखें और नीचे PDF पर क्लिक करें..." class="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none">
                        </div>
                        <div class="flex items-center gap-2">
                            <select id="pdfEditFontSize" class="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none">
                                <option value="16">16 px</option>
                                <option value="20" selected>20 px</option>
                                <option value="26">26 px</option>
                                <option value="32">32 px</option>
                            </select>
                            <select id="pdfEditColor" class="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none">
                                <option value="#000000">Black</option>
                                <option value="#0033cc">Blue</option>
                                <option value="#cc0000">Red</option>
                                <option value="#ffffff">Whiteout</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="window.enableWhiteoutMode()" id="btnWhiteout" class="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 p-2 rounded-xl text-xs font-bold transition">
                                <i class="fa-solid fa-eraser mr-1"></i> Erase Box
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Canvas Display -->
                <div class="bg-slate-300 p-4 rounded-2xl flex justify-center overflow-auto max-h-[600px]">
                    <canvas id="pdfEditCanvas" class="bg-white shadow-xl rounded cursor-crosshair border border-slate-400"></canvas>
                </div>
            </div>
        </div>
    `;
};

window.pdfEditorState = {
    pdfDoc: null,
    currentPage: 1,
    scale: 2.0,
    pageOverlays: {}
};

window.handlePdfEditorUpload = async function(file) {
    if (!file) return;
    if (!window.validateFileSize(file, 10)) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        window.pdfEditorState.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        window.pdfEditorState.currentPage = 1;
        window.pdfEditorState.pageOverlays = {};

        document.getElementById('pdfEditUploadBox').classList.add('hidden');
        document.getElementById('pdfEditWorkspace').classList.remove('hidden');
        window.renderPdfEditorCurrentPage();
    } catch (e) {
        alert('PDF लोड नहीं हो पाई: ' + e.message);
    }
};

window.renderPdfEditorCurrentPage = async function() {
    const pdfDoc = window.pdfEditorState.pdfDoc;
    const pageNum = window.pdfEditorState.currentPage;
    const canvas = document.getElementById('pdfEditCanvas');
    if (!pdfDoc || !canvas) return;

    document.getElementById('pdfEditPageIndicator').innerText = `Page ${pageNum} / ${pdfDoc.numPages}`;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: window.pdfEditorState.scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        const text = document.getElementById('pdfEditTextInput')?.value.trim();
        const fSize = parseInt(document.getElementById('pdfEditFontSize')?.value || 20);
        const color = document.getElementById('pdfEditColor')?.value || '#000000';

        if (text) {
            ctx.fillStyle = color;
            ctx.font = `bold ${fSize * window.pdfEditorState.scale}px Arial, sans-serif`;
            ctx.fillText(text, x, y);
        }
    };
};

window.navPdfEditPage = function(dir) {
    const next = window.pdfEditorState.currentPage + dir;
    if (next < 1 || next > window.pdfEditorState.pdfDoc.numPages) return;
    window.pdfEditorState.currentPage = next;
    window.renderPdfEditorCurrentPage();
};

window.addDateStampToPdf = function() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const inp = document.getElementById('pdfEditTextInput');
    if (inp) inp.value = `DATE: ${dateStr}`;
};

window.enableWhiteoutMode = function() {
    const canvas = document.getElementById('pdfEditCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    alert('व्हाइटआउट मोड चालू है: अब PDF पर जहाँ भी क्लिक करेंगे वहाँ 120x30px का सफेद बॉक्स बन जाएगा।');
    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 60, y - 15, 120, 30);
    };
};

window.saveAndDownloadEditedPdf = async function() {
    const canvas = document.getElementById('pdfEditCanvas');
    if (!canvas) return;
    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const embeddedImg = await pdfDoc.embedJpg(imgDataUrl);

    const page = pdfDoc.addPage([canvas.width / window.pdfEditorState.scale, canvas.height / window.pdfEditorState.scale]);
    page.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight()
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.download = `Edited_Document_${Date.now()}.pdf`;
    link.href = URL.createObjectURL(blob);
    link.click();
};

// ============================================================================
// TOOL 6: MERGE PDF (pdf_merge)
// ============================================================================
window.setupPdfMergeTool = function(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center text-lg font-black">
                    <i class="fa-solid fa-object-group"></i>
                </div>
                <div>
                    <h2 class="text-base md:text-lg font-black text-dark-900">Merge PDF Files (पीडीएफ जोड़ें)</h2>
                    <p class="text-[11px] font-semibold text-slate-400">कई PDF फाइलों को अपनी पसंद के क्रम में जोड़कर एक बनाएं (Max 10MB per file)</p>
                </div>
            </div>

            <!-- Upload Area -->
            <div class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('pdfMergeFileInput').click()">
                <input type="file" id="pdfMergeFileInput" accept="application/pdf" multiple class="hidden" onchange="window.handlePdfMergeUpload(this.files)">
                <div class="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-purple-200">
                    <i class="fa-solid fa-copy"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">यहाँ PDF फाइलें चुनें (एक साथ 2 या अधिक फाइलें चुनें)</h3>
                <p class="text-xs font-semibold text-slate-400">प्रत्येक फाइल अधिकतम 10MB</p>
            </div>

            <!-- Merge List -->
            <div id="pdfMergeWorkspace" class="hidden space-y-4">
                <div class="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span id="pdfMergeCountText" class="text-xs font-black text-purple-900">2 फाइलें चुनी गईं</span>
                    <button type="button" id="btnMergePdfs" onclick="window.executePdfMerge()" class="bg-purple-600 hover:bg-purple-700 text-white font-black px-6 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5">
                        <i class="fa-solid fa-object-group"></i> Merge &amp; Download PDF
                    </button>
                </div>

                <div id="pdfMergeFilesList" class="space-y-2"></div>
            </div>
        </div>
    `;
};

window.pdfMergeList = [];

window.handlePdfMergeUpload = async function(fileList) {
    if (!fileList || fileList.length === 0) return;
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!window.validateFileSize(file, 10)) continue;
        const arrayBuffer = await file.arrayBuffer();
        window.pdfMergeList.push({ name: file.name, size: file.size, bytes: arrayBuffer });
    }
    window.renderPdfMergeList();
};

window.renderPdfMergeList = function() {
    const ws = document.getElementById('pdfMergeWorkspace');
    const container = document.getElementById('pdfMergeFilesList');
    const countEl = document.getElementById('pdfMergeCountText');
    if (!ws || !container) return;

    if (window.pdfMergeList.length > 0) {
        ws.classList.remove('hidden');
        if (countEl) countEl.innerText = `कुल ${window.pdfMergeList.length} फाइलें जोड़ी जाएँगी`;
    } else {
        ws.classList.add('hidden');
        return;
    }

    container.innerHTML = '';
    window.pdfMergeList.forEach((item, idx) => {
        container.innerHTML += `
            <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm gap-2">
                <div class="flex items-center gap-3 overflow-hidden">
                    <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">${idx + 1}</span>
                    <i class="fa-solid fa-file-pdf text-purple-600 text-lg"></i>
                    <div>
                        <p class="text-xs font-bold text-slate-800 truncate">${item.name}</p>
                        <span class="text-[10px] text-slate-400 font-semibold">${(item.size / 1024).toFixed(1)} KB</span>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" onclick="window.movePdfMergeOrder(${idx}, -1)" class="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"><i class="fa-solid fa-arrow-up"></i></button>
                    <button type="button" onclick="window.movePdfMergeOrder(${idx}, 1)" class="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"><i class="fa-solid fa-arrow-down"></i></button>
                    <button type="button" onclick="window.removePdfMergeItem(${idx})" class="w-7 h-7 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
};

window.movePdfMergeOrder = function(idx, dir) {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= window.pdfMergeList.length) return;
    const temp = window.pdfMergeList[idx];
    window.pdfMergeList[idx] = window.pdfMergeList[targetIdx];
    window.pdfMergeList[targetIdx] = temp;
    window.renderPdfMergeList();
};

window.removePdfMergeItem = function(idx) {
    window.pdfMergeList.splice(idx, 1);
    window.renderPdfMergeList();
};

window.executePdfMerge = async function() {
    if (window.pdfMergeList.length < 2) return alert('मर्ज करने के लिए कम से कम 2 PDF फाइलें होना जरूरी है!');
    const btn = document.getElementById('btnMergePdfs');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Merging...';

    try {
        const { PDFDocument } = PDFLib;
        const mergedDoc = await PDFDocument.create();

        for (const item of window.pdfMergeList) {
            const docToMerge = await PDFDocument.load(item.bytes);
            const copiedPages = await mergedDoc.copyPages(docToMerge, docToMerge.getPageIndices());
            copiedPages.forEach((page) => mergedDoc.addPage(page));
        }

        const mergedBytes = await mergedDoc.save();
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.download = `Merged_Document_${Date.now()}.pdf`;
        link.href = URL.createObjectURL(blob);
        link.click();
    } catch (e) {
        alert('मर्ज करने में त्रुटि: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

// ============================================================================
// TOOL 7: UNLOCK PDF (pdf_unlock)
// ============================================================================
window.setupPdfUnlockTool = function(container) {
    container.innerHTML = `
        <div class="space-y-4 max-w-lg mx-auto">
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center text-lg font-black">
                    <i class="fa-solid fa-lock-open"></i>
                </div>
                <div>
                    <h2 class="text-base md:text-lg font-black text-dark-900">PDF Password Unlocker</h2>
                    <p class="text-[11px] font-semibold text-slate-400">पासवर्ड हटाकर बिना लॉक वाली सामान्य PDF बनाएं (Max 10MB)</p>
                </div>
            </div>

            <!-- Upload Area -->
            <div id="pdfUnlockUploadBox" class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('pdfUnlockFileInput').click()">
                <input type="file" id="pdfUnlockFileInput" accept="application/pdf" class="hidden" onchange="window.handlePdfUnlockUpload(this.files[0])">
                <div class="w-14 h-14 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-teal-200">
                    <i class="fa-solid fa-file-shield"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">लॉक PDF फाइल यहाँ चुनें</h3>
                <p class="text-xs font-semibold text-slate-400">अधिकतम 10MB</p>
            </div>

            <!-- Password Form -->
            <div id="pdfUnlockFormSection" class="hidden bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div>
                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">PDF का पासवर्ड दर्ज करें</label>
                    <input type="password" id="pdfUnlockPassInput" placeholder="Password लिखें" class="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold bg-white outline-none">
                </div>
                <button type="button" id="btnUnlockPdf" onclick="window.executePdfUnlock()" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-key"></i> Unlock &amp; Download Clean PDF
                </button>
            </div>
        </div>
    `;
};

window.pdfUnlockFileBytes = null;

window.handlePdfUnlockUpload = async function(file) {
    if (!file) return;
    if (!window.validateFileSize(file, 10)) return;

    window.pdfUnlockFileBytes = await file.arrayBuffer();
    document.getElementById('pdfUnlockUploadBox').classList.add('hidden');
    document.getElementById('pdfUnlockFormSection').classList.remove('hidden');
};

window.executePdfUnlock = async function() {
    const pass = document.getElementById('pdfUnlockPassInput')?.value;
    if (!pass) return alert('कृपया पासवर्ड दर्ज करें!');
    const btn = document.getElementById('btnUnlockPdf');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Unlocking...';

    try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(window.pdfUnlockFileBytes, { password: pass });
        const cleanBytes = await pdfDoc.save();

        const blob = new Blob([cleanBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.download = `Unlocked_Document_${Date.now()}.pdf`;
        link.href = URL.createObjectURL(blob);
        link.click();
        alert('सफलता! आपकी PDF हमेशा के लिए अनलॉक हो गई है।');
    } catch (e) {
        alert('पासवर्ड गलत है या PDF अनलॉक नहीं हो पाई। त्रुटि: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
};

// ============================================================================
// TOOL 8: SMART IMAGE COMPRESSOR (img_compress - Target KB Presets)
// ============================================================================
window.setupImageCompressorTool = function(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div class="w-10 h-10 rounded-xl bg-royal-50 text-royal-600 border border-royal-200 flex items-center justify-center text-lg font-black">
                    <i class="fa-solid fa-file-zipper"></i>
                </div>
                <div>
                    <h2 class="text-base md:text-lg font-black text-dark-900">Smart Image Compressor (सरकारी फॉर्म्स के लिए)</h2>
                    <p class="text-[11px] font-semibold text-slate-400">टारगेट 20KB, 50KB, 100KB में इमेज कंप्रेस करें बिना शार्पनेस खोए (Max 10MB)</p>
                </div>
            </div>

            <!-- Upload Area -->
            <div id="compUploadBox" class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('compFileInput').click()">
                <input type="file" id="compFileInput" accept="image/*" class="hidden" onchange="window.handleCompressorUpload(this.files[0])">
                <div class="w-14 h-14 bg-royal-100 text-royal-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-royal-200">
                    <i class="fa-solid fa-compress"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">यहाँ इमेज अपलोड करें</h3>
                <p class="text-xs font-semibold text-slate-400">JPG, PNG, WEBP (अधिकतम 10MB)</p>
            </div>

            <!-- Controls Workspace -->
            <div id="compWorkspaceSection" class="hidden space-y-4">
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <span class="text-xs font-bold text-slate-400 block uppercase">मूल साइज (Original Size):</span>
                            <span id="compOrigSizeText" class="text-base font-black text-dark-900">0 KB</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5">
                            <span class="text-xs font-black text-slate-600 uppercase mr-1">क्विक प्रीसेट्स:</span>
                            <button type="button" onclick="window.setCompressPreset(20)" class="comp-preset-btn px-2.5 py-1 rounded-lg text-xs font-black bg-white border border-slate-200">&lt; 20 KB (Sign)</button>
                            <button type="button" onclick="window.setCompressPreset(50)" class="comp-preset-btn px-2.5 py-1 rounded-lg text-xs font-black bg-amber-400 text-dark-950">&lt; 50 KB (Photo)</button>
                            <button type="button" onclick="window.setCompressPreset(100)" class="comp-preset-btn px-2.5 py-1 rounded-lg text-xs font-black bg-white border border-slate-200">&lt; 100 KB</button>
                            <button type="button" onclick="window.setCompressPreset(200)" class="comp-preset-btn px-2.5 py-1 rounded-lg text-xs font-black bg-white border border-slate-200">&lt; 200 KB</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">कस्टम टारगेट साइज (Target KB)</label>
                            <div class="flex gap-2">
                                <input type="number" id="compTargetKb" value="50" min="10" max="9000" class="flex-1 p-2.5 border border-slate-200 rounded-xl text-xs font-black bg-white outline-none">
                                <button type="button" onclick="window.executeSmartCompression()" class="bg-dark-900 hover:bg-black text-royal-300 font-black px-4 py-2.5 rounded-xl text-xs shadow-sm">
                                    Compress Now
                                </button>
                            </div>
                        </div>
                        <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                            <div>
                                <span class="text-[10px] font-black text-green-700 uppercase block">कंप्रेस्ड साइज (Result):</span>
                                <span id="compResultSizeText" class="text-sm font-black text-green-800">--</span>
                            </div>
                            <button type="button" id="btnDownloadCompressed" onclick="window.downloadCompressedImage()" class="bg-green-600 hover:bg-green-700 text-white font-black px-4 py-2 rounded-xl text-xs transition shadow-sm">
                                <i class="fa-solid fa-download mr-1"></i> Download
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Preview Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                        <span class="text-xs font-bold text-slate-400 block mb-2">Original Preview</span>
                        <img id="compOriginalPreview" class="max-h-80 mx-auto rounded-lg object-contain shadow-sm">
                    </div>
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                        <span class="text-xs font-bold text-green-700 block mb-2">Compressed Preview</span>
                        <img id="compResultPreview" class="max-h-80 mx-auto rounded-lg object-contain shadow-sm">
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.compressorState = {
    file: null,
    img: null,
    resultBlobUrl: null
};

window.handleCompressorUpload = function(file) {
    if (!file) return;
    if (!window.validateFileSize(file, 10)) return;

    window.compressorState.file = file;
    const origSizeKb = (file.size / 1024).toFixed(1);
    document.getElementById('compOrigSizeText').innerText = `${origSizeKb} KB (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            window.compressorState.img = img;
            document.getElementById('compOriginalPreview').src = img.src;
            document.getElementById('compUploadBox').classList.add('hidden');
            document.getElementById('compWorkspaceSection').classList.remove('hidden');
            window.executeSmartCompression();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.setCompressPreset = function(kb) {
    document.getElementById('compTargetKb').value = kb;
    document.querySelectorAll('.comp-preset-btn').forEach(b => {
        b.className = "comp-preset-btn px-2.5 py-1 rounded-lg text-xs font-black bg-white border border-slate-200 text-slate-700";
    });
    window.executeSmartCompression();
};

window.executeSmartCompression = async function() {
    const img = window.compressorState.img;
    if (!img) return;

    const targetKb = parseFloat(document.getElementById('compTargetKb')?.value || 50);
    const targetBytes = targetKb * 1024;

    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    // Iterative resize & quality binary search
    let quality = 0.92;
    let resultBlob = null;

    for (let attempt = 0; attempt < 8; attempt++) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resultBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
        if (resultBlob.size <= targetBytes || (width < 300 && quality < 0.3)) {
            break;
        }

        // Adjust dimensions and quality
        if (quality > 0.4) {
            quality -= 0.15;
        } else {
            width = Math.round(width * 0.85);
            height = Math.round(height * 0.85);
        }
    }

    if (resultBlob) {
        const resultSizeKb = (resultBlob.size / 1024).toFixed(1);
        const reduction = (100 - (resultBlob.size / window.compressorState.file.size) * 100).toFixed(0);
        document.getElementById('compResultSizeText').innerText = `${resultSizeKb} KB (${reduction}% कम हुआ)`;

        if (window.compressorState.resultBlobUrl) {
            URL.revokeObjectURL(window.compressorState.resultBlobUrl);
        }
        window.compressorState.resultBlobUrl = URL.createObjectURL(resultBlob);
        document.getElementById('compResultPreview').src = window.compressorState.resultBlobUrl;
    }
};

window.downloadCompressedImage = function() {
    if (!window.compressorState.resultBlobUrl) return alert('पहले इमेज कंप्रेस करें!');
    const link = document.createElement('a');
    link.download = `Compressed_${Date.now()}.jpg`;
    link.href = window.compressorState.resultBlobUrl;
    link.click();
};
