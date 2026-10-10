// ============================================================================
// Ojas Tools Studio - Complete Logic Suite (tools-logic.js)
// 100% Client-Side, Multi-CDN Robust Loaders, High-DPI & A4 PDF Editor
// ============================================================================

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

// ================= ROBUST MULTI-CDN LIBRARY LOADER =================
function dynamicallyLoadScript(url) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = url;
        s.onload = () => resolve(true);
        s.onerror = () => reject(new Error('Failed to load ' + url));
        document.head.appendChild(s);
    });
}

window.ensurePdfLibrariesLoaded = async function() {
    // 1. Load PDF.js if missing
    if (!window.pdfjsLib) {
        try {
            await dynamicallyLoadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        } catch (e) {
            await dynamicallyLoadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
        }
    }
    if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // 2. Load PDF-Lib if missing
    if (!window.PDFLib) {
        try {
            await dynamicallyLoadScript('https://unpkg.com/pdf-lib@1.17.9/dist/pdf-lib.min.js');
        } catch (e) {
            await dynamicallyLoadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.9/pdf-lib.min.js');
        }
    }

    // 3. Load JSZip if missing
    if (!window.JSZip) {
        try {
            await dynamicallyLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        } catch (e) {
            await dynamicallyLoadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
        }
    }

    if (!window.pdfjsLib) throw new Error('PDF.js लाइब्रेरी लोड नहीं हो पाई।');
    if (!window.PDFLib) throw new Error('PDF-Lib लाइब्रेरी लोड नहीं हो पाई।');
    return true;
};

// Auto-run verification on startup
setTimeout(() => {
    window.ensurePdfLibrariesLoaded().catch(() => {});
}, 200);

// ================= NAVIGATION & VIEW SWITCHER =================
window.currentActiveTool = null;

window.openToolWorkspace = function(toolId) {
    window.currentActiveTool = toolId;
    const gridView = document.getElementById('toolsGridView');
    const wsView = document.getElementById('toolWorkspaceView');
    const container = document.getElementById('activeToolContainer');

    if (gridView) gridView.classList.add('hidden');
    if (wsView) wsView.classList.remove('hidden');

    document.querySelectorAll('.ws-tab-btn').forEach(btn => {
        btn.className = "ws-tab-btn px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 shrink-0 transition flex items-center gap-1.5 border border-slate-200";
    });
    const activeTab = document.getElementById(`wsTab-${toolId}`);
    if (activeTab) {
        activeTab.className = "ws-tab-btn px-3.5 py-2 rounded-xl text-xs font-black bg-dark-900 text-royal-300 shrink-0 transition flex items-center gap-1.5 border-2 border-royal-400 shadow-glow";
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

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
// TOOL 1: PASSPORT PHOTO GENERATOR (Real Multi-Color BG & A4 Top-Aligned 6-Photo Sheet)
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
                        <p class="text-[11px] font-semibold text-slate-400">3.5 × 4.5 cm स्टैंडर्ड साइज • वाइट, लाइट पिंक, लाइट रेड व कस्टम BG • A4 टॉप-रो 6 फोटो (पेज वेस्ट न हो)</p>
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
                <p class="text-xs font-semibold text-slate-400">JPG, PNG, WEBP (अधिकतम 10 MB)</p>
            </div>

            <!-- Editor Section (Initially Hidden) -->
            <div id="ppEditorSection" class="hidden grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                <!-- Left Controls Panel -->
                <div class="lg:col-span-5 space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    
                    <!-- 1. Background Color Selection (White, Light Pink, Light Red, Sky Blue, Gray, Custom) -->
                    <div>
                        <div class="flex justify-between items-center mb-1.5">
                            <label class="text-[11px] font-black text-slate-700 uppercase">1. बैकग्राउंड का रंग (Background Color)</label>
                            <span class="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-black">Color Applied</span>
                        </div>
                        <div class="grid grid-cols-4 gap-1.5">
                            <button type="button" onclick="window.setPassportBgColor('#ffffff', this)" class="pp-bg-btn p-2 rounded-xl text-[11px] font-black bg-white text-dark-900 border-2 border-amber-400 flex items-center justify-center gap-1 shadow-sm" title="Pure White">
                                <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-white"></span> White
                            </button>
                            <button type="button" onclick="window.setPassportBgColor('#ffd1dc', this)" class="pp-bg-btn p-2 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1" title="Light Pink">
                                <span class="w-3.5 h-3.5 rounded-full border border-pink-300 bg-[#ffd1dc]"></span> Lt. Pink
                            </button>
                            <button type="button" onclick="window.setPassportBgColor('#ffcccc', this)" class="pp-bg-btn p-2 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1" title="Light Red">
                                <span class="w-3.5 h-3.5 rounded-full border border-red-300 bg-[#ffcccc]"></span> Lt. Red
                            </button>
                            <button type="button" onclick="window.setPassportBgColor('#b9dcff', this)" class="pp-bg-btn p-2 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1" title="Sky Blue">
                                <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-sky-200"></span> Blue
                            </button>
                            <button type="button" onclick="window.setPassportBgColor('#f3f4f6', this)" class="pp-bg-btn p-2 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1" title="Light Gray">
                                <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-slate-200"></span> Gray
                            </button>
                            <button type="button" onclick="window.setPassportBgColor('#cc0000', this)" class="pp-bg-btn p-2 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1" title="Deep Red">
                                <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-red-600"></span> Red
                            </button>
                            <button type="button" onclick="window.setPassportBgColor('original', this)" class="pp-bg-btn p-2 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1" title="Original Photo">
                                <span class="w-3.5 h-3.5 rounded-full border border-slate-300 bg-slate-400"></span> Orig
                            </button>
                            <label class="pp-bg-btn p-2 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1 cursor-pointer" title="Custom Color Picker">
                                <input type="color" id="ppCustomColorPicker" value="#ffffff" onchange="window.setPassportBgColor(this.value, null)" class="w-3.5 h-3.5 p-0 border-0 rounded cursor-pointer">
                                <span>Custom</span>
                            </label>
                        </div>
                    </div>

                    <!-- 2. Background Sensitivity / Auto-Removal Slider & Touch-up -->
                    <div class="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div class="flex justify-between items-center text-[11px] font-bold text-slate-600">
                            <span>बैकग्राउंड सेंसिटिविटी (Sensitivity):</span>
                            <span id="ppBgTolVal" class="text-amber-600 font-black">35</span>
                        </div>
                        <input type="range" id="ppBgTolerance" min="10" max="80" value="35" oninput="window.updatePassportTolerance(this.value)" class="w-full accent-amber-500 cursor-pointer">
                        
                        <div class="flex items-center gap-2 pt-1">
                            <button type="button" onclick="window.togglePassportMagicWand()" id="btnPpMagicWand" class="flex-1 bg-amber-400 text-dark-950 border border-amber-500 py-1.5 px-2 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1 shadow-sm">
                                <i class="fa-solid fa-wand-magic-sparkles text-dark-950"></i> मैजिक वैंड (क्लिक करके रंग भरें)
                            </button>
                            <button type="button" onclick="window.togglePassportWhiteBrush()" id="btnPpWhiteBrush" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1">
                                <i class="fa-solid fa-paintbrush text-royal-600"></i> टच-अप ब्रश
                            </button>
                        </div>
                        <p id="ppToolModeStatus" class="text-[10px] font-semibold text-slate-400 text-center">💡 टिप्स: अगर कहीं बैकग्राउंड का कोई दाग रह जाए, तो फोटो पर उस जगह क्लिक करें।</p>
                    </div>

                    <!-- 3. Zoom & Pan Controls -->
                    <div class="space-y-2.5 p-3 bg-white rounded-xl border border-slate-200">
                        <div>
                            <div class="flex justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                                <span>Zoom (फोटो आकार):</span>
                                <span id="ppZoomVal">1.0x</span>
                            </div>
                            <input type="range" id="ppZoomSlider" min="0.5" max="3" step="0.05" value="1" oninput="window.renderPassportStudio()" class="w-full accent-amber-500 cursor-pointer">
                        </div>

                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Vertical (ऊपर/नीचे)</label>
                                <input type="range" id="ppPanYSlider" min="-250" max="250" step="2" value="0" oninput="window.renderPassportStudio()" class="w-full accent-amber-500 cursor-pointer">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Horizontal (दाएँ/बाएँ)</label>
                                <input type="range" id="ppPanXSlider" min="-250" max="250" step="2" value="0" oninput="window.renderPassportStudio()" class="w-full accent-amber-500 cursor-pointer">
                            </div>
                        </div>
                    </div>

                    <!-- 4. Brightness & Contrast -->
                    <div class="grid grid-cols-2 gap-2 p-3 bg-white rounded-xl border border-slate-200">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Brightness</label>
                            <input type="range" id="ppBrightness" min="-30" max="30" value="4" oninput="window.renderPassportStudio()" class="w-full accent-amber-500 cursor-pointer">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Contrast</label>
                            <input type="range" id="ppContrast" min="-30" max="30" value="6" oninput="window.renderPassportStudio()" class="w-full accent-amber-500 cursor-pointer">
                        </div>
                    </div>

                    <!-- 5. Sheet Layout (A4 6-Photo Top Row, 12, 18, 4x6, Single) -->
                    <div class="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-slate-700">काटने के लिए 1mm बॉर्डर (Border)</span>
                            <input type="checkbox" id="ppBorderToggle" checked onchange="window.renderPassportStudio()" class="w-4 h-4 accent-amber-600 rounded cursor-pointer">
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-slate-700">चेहरे का गाइड ओवल (Face Guide)</span>
                            <input type="checkbox" id="ppGuideToggle" checked onchange="window.renderPassportStudio()" class="w-4 h-4 accent-amber-600 rounded cursor-pointer">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">प्रिंट शीट लेआउट (Print Layout)</label>
                            <select id="ppSheetLayout" onchange="window.renderPassportStudio()" class="w-full p-2.5 border-2 border-amber-300 rounded-xl text-xs font-black bg-amber-50/40 text-amber-950 outline-none cursor-pointer">
                                <option value="sheet_a4_row1" selected>⭐ A4 टॉप 1 लाइन - 6 फोटो (पेज वेस्ट न हो, कटिंग स्ट्रिप)</option>
                                <option value="sheet_a4_row2">A4 टॉप 2 लाइन - 12 फोटो</option>
                                <option value="sheet_a4_row3">A4 टॉप 3 लाइन - 18 फोटो</option>
                                <option value="sheet_a4_full">A4 फुल शीट - 30 फोटो (5 पंक्तियाँ)</option>
                                <option value="sheet_4x6">4 × 6 Inch Sheet - 8 फोटो (2 Rows of 4)</option>
                                <option value="single">Single Photo (3.5 × 4.5 cm / 300 DPI)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Action Buttons: Download PDF, Download JPG, Direct Print -->
                    <div class="grid grid-cols-3 gap-2 pt-1">
                        <button type="button" onclick="window.downloadPassportPdf()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5" title="A4 शीट की प्रिंटेबल PDF डाउनलोड करें">
                            <i class="fa-solid fa-file-pdf"></i> Download PDF
                        </button>
                        <button type="button" onclick="window.downloadPassportOutput('jpg')" class="bg-dark-900 hover:bg-black text-royal-300 font-black py-3 rounded-xl text-xs transition shadow-glow flex items-center justify-center gap-1.5" title="इमेज फाइल डाउनलोड करें">
                            <i class="fa-solid fa-download"></i> JPG Image
                        </button>
                        <button type="button" onclick="window.printPassportCanvas()" class="bg-amber-500 hover:bg-amber-600 text-dark-950 font-black py-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5" title="सीधे प्रिंटर पर भेजें">
                            <i class="fa-solid fa-print"></i> Direct Print
                        </button>
                    </div>

                    <button type="button" onclick="document.getElementById('ppFileInput').click()" class="w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2 rounded-xl text-xs transition">
                        <i class="fa-solid fa-rotate-left mr-1"></i> दूसरी फोटो बदलें
                    </button>
                </div>

                <!-- Right Canvas Preview -->
                <div class="lg:col-span-7 bg-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center min-h-[500px] overflow-auto">
                    <div class="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                        <i class="fa-solid fa-print text-amber-600"></i>
                        <span>Live High-DPI Print Preview (300 DPI Ultra Sharp)</span>
                    </div>
                    <canvas id="ppMainCanvas" class="bg-white shadow-xl rounded-lg max-w-full h-auto border border-slate-300 cursor-crosshair"></canvas>
                </div>

            </div>
        </div>
    `;
};

window.ppState = {
    originalImg: null,
    processedImageCanvas: null,
    bgColor: '#ffffff',
    activeMode: 'wand',
    brushSize: 20
};

// Helper: Hex Color to RGB
window.hexToRgb = function(hex) {
    if (!hex || hex === 'original') return { r: 255, g: 255, b: 255 };
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        return {
            r: parseInt(cleanHex[0] + cleanHex[0], 16),
            g: parseInt(cleanHex[1] + cleanHex[1], 16),
            b: parseInt(cleanHex[2] + cleanHex[2], 16)
        };
    }
    const val = parseInt(cleanHex, 16);
    return {
        r: (val >> 16) & 255,
        g: (val >> 8) & 255,
        b: val & 255
    };
};

window.handlePassportPhotoUpload = function(file) {
    if (!file) return;
    if (!window.validateFileSize(file, 10)) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            window.ppState.originalImg = img;
            document.getElementById('ppUploadSection').classList.add('hidden');
            document.getElementById('ppEditorSection').classList.remove('hidden');

            window.processPassportWhiteBackground();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.setPassportBgColor = function(color, btnEl) {
    window.ppState.bgColor = color;
    document.querySelectorAll('.pp-bg-btn').forEach(b => {
        b.className = "pp-bg-btn p-2 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 flex items-center justify-center gap-1";
    });
    if (btnEl) {
        btnEl.className = "pp-bg-btn p-2 rounded-xl text-[11px] font-black bg-white text-dark-900 border-2 border-amber-400 flex items-center justify-center gap-1 shadow-sm";
    }
    const picker = document.getElementById('ppCustomColorPicker');
    if (picker && color !== 'original') {
        picker.value = color.startsWith('#') ? color : '#ffffff';
    }
    window.processPassportWhiteBackground();
};

window.updatePassportTolerance = function(val) {
    const el = document.getElementById('ppBgTolVal');
    if (el) el.innerText = val;
    window.processPassportWhiteBackground();
};

window.togglePassportMagicWand = function() {
    window.ppState.activeMode = 'wand';
    document.getElementById('btnPpMagicWand').className = "flex-1 bg-amber-400 text-dark-950 border border-amber-500 py-1.5 px-2 rounded-lg text-[11px] font-black shadow-sm flex items-center justify-center gap-1";
    document.getElementById('btnPpWhiteBrush').className = "flex-1 bg-slate-100 text-slate-700 border border-slate-300 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1";
    document.getElementById('ppToolModeStatus').innerText = "✨ मैजिक वैंड एक्टिव: बैकग्राउंड पर जहाँ भी कोई दाग या शैडो हो, वहाँ क्लिक करें।";
};

window.togglePassportWhiteBrush = function() {
    window.ppState.activeMode = 'brush';
    document.getElementById('btnPpWhiteBrush').className = "flex-1 bg-amber-400 text-dark-950 border border-amber-500 py-1.5 px-2 rounded-lg text-[11px] font-black shadow-sm flex items-center justify-center gap-1";
    document.getElementById('btnPpMagicWand').className = "flex-1 bg-slate-100 text-slate-700 border border-slate-300 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1";
    document.getElementById('ppToolModeStatus').innerText = "🖌️ सफेद ब्रश एक्टिव: माउस से ड्रैग करके सफेद रंग का टच-अप करें।";
};

// Auto Background Replacement Algorithm (White, Pink, Red, Sky Blue, Gray, Custom)
window.processPassportWhiteBackground = function() {
    const img = window.ppState.originalImg;
    if (!img) return;

    const off = document.createElement('canvas');
    off.width = img.width;
    off.height = img.height;
    const ctx = off.getContext('2d');
    ctx.drawImage(img, 0, 0);

    if (window.ppState.bgColor === 'original') {
        window.ppState.processedImageCanvas = off;
        window.renderPassportStudio();
        return;
    }

    const imgData = ctx.getImageData(0, 0, off.width, off.height);
    const d = imgData.data;
    const w = off.width;
    const h = off.height;
    const tol = parseInt(document.getElementById('ppBgTolerance')?.value || 35);
    const tolSq = tol * tol * 3;

    // Sample background from top and corner edges
    let sampleR = 0, sampleG = 0, sampleB = 0, samplesCount = 0;
    for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 40))) {
        for (let y = 0; y < Math.min(h * 0.15, 35); y += 3) {
            const idx = (y * w + x) * 4;
            sampleR += d[idx];
            sampleG += d[idx + 1];
            sampleB += d[idx + 2];
            samplesCount++;
        }
    }
    const bgR = Math.round(sampleR / samplesCount);
    const bgG = Math.round(sampleG / samplesCount);
    const bgB = Math.round(sampleB / samplesCount);

    // Target fill color
    const targetRgb = window.hexToRgb(window.ppState.bgColor || '#ffffff');
    const fillR = targetRgb.r;
    const fillG = targetRgb.g;
    const fillB = targetRgb.b;

    // Color replacement
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const dist = (r - bgR) * (r - bgR) + (g - bgG) * (g - bgG) + (b - bgB) * (b - bgB);
        if (dist <= tolSq) {
            d[i] = fillR;
            d[i + 1] = fillG;
            d[i + 2] = fillB;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    window.ppState.processedImageCanvas = off;
    window.renderPassportStudio();
};

window.renderPassportStudio = function() {
    const canvas = document.getElementById('ppMainCanvas');
    if (!canvas || !window.ppState.processedImageCanvas) return;

    const img = window.ppState.processedImageCanvas;
    const zoom = parseFloat(document.getElementById('ppZoomSlider')?.value || 1);
    const panX = parseFloat(document.getElementById('ppPanXSlider')?.value || 0);
    const panY = parseFloat(document.getElementById('ppPanYSlider')?.value || 0);
    const brightness = parseInt(document.getElementById('ppBrightness')?.value || 0);
    const contrast = parseInt(document.getElementById('ppContrast')?.value || 0);
    const hasBorder = document.getElementById('ppBorderToggle')?.checked ?? true;
    const showGuide = document.getElementById('ppGuideToggle')?.checked ?? true;
    const layout = document.getElementById('ppSheetLayout')?.value || 'sheet_a4_row1';

    document.getElementById('ppZoomVal').innerText = zoom.toFixed(2) + 'x';

    // Standard Passport photo dimensions for single view: 413 x 531 px
    const photoW = 413;
    const photoH = 531;

    // 1. Single Photo Offscreen Canvas
    const singleCanvas = document.createElement('canvas');
    singleCanvas.width = photoW;
    singleCanvas.height = photoH;
    const sCtx = singleCanvas.getContext('2d');

    // Fill background
    sCtx.fillStyle = window.ppState.bgColor === 'original' ? '#ffffff' : (window.ppState.bgColor || '#ffffff');
    sCtx.fillRect(0, 0, photoW, photoH);

    // Draw scaled photo centered
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

    // Filters (Brightness & Contrast)
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

    // Cutting border
    if (hasBorder) {
        sCtx.strokeStyle = '#cccccc';
        sCtx.lineWidth = 3;
        sCtx.strokeRect(1, 1, photoW - 2, photoH - 2);
    }

    // 2. Output on Main Display Canvas
    const ctx = canvas.getContext('2d');

    if (layout === 'single') {
        canvas.width = photoW;
        canvas.height = photoH;
        ctx.drawImage(singleCanvas, 0, 0);

        if (showGuide) {
            ctx.save();
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.ellipse(photoW / 2, photoH * 0.45, photoW * 0.28, photoH * 0.32, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    } 
    else if (layout === 'sheet_4x6') {
        // 4 x 6 inch at 300 DPI: 1800 x 1200 landscape (8 Photos)
        canvas.width = 1800;
        canvas.height = 1200;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const startX = 60, startY = 55, gapX = 18, gapY = 25;
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
    else {
        // A4 Sheets at 300 DPI (2480 x 3508 px) - Aligned to TOP for minimal paper waste!
        canvas.width = 2480;
        canvas.height = 3508;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 6 Photos in a row across A4 width (385 x 495 px per photo)
        const a4PhotoW = 385;
        const a4PhotoH = 495;
        const gapX = 16;
        const gapY = 24;
        const startX = 45; // Horizontally centered: (2480 - (6*385 + 5*16)) / 2 = 45 px
        const startY = 70; // Top margin: neat 6mm below edge

        let totalRows = 1;
        if (layout === 'sheet_a4_row1') totalRows = 1;
        else if (layout === 'sheet_a4_row2') totalRows = 2;
        else if (layout === 'sheet_a4_row3') totalRows = 3;
        else if (layout === 'sheet_a4_full') totalRows = 5;

        for (let row = 0; row < totalRows; row++) {
            for (let col = 0; col < 6; col++) {
                const x = startX + col * (a4PhotoW + gapX);
                const y = startY + row * (a4PhotoH + gapY);
                ctx.drawImage(singleCanvas, x, y, a4PhotoW, a4PhotoH);

                // Cutting guide border
                ctx.strokeStyle = '#cccccc';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - 1, y - 1, a4PhotoW + 2, a4PhotoH + 2);

                // Corner tick marks for precision scissor cut
                ctx.strokeStyle = '#999999';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x - 4, y); ctx.lineTo(x, y); ctx.lineTo(x, y - 4);
                ctx.moveTo(x + a4PhotoW + 4, y); ctx.lineTo(x + a4PhotoW, y); ctx.lineTo(x + a4PhotoW, y - 4);
                ctx.moveTo(x - 4, y + a4PhotoH); ctx.lineTo(x, y + a4PhotoH); ctx.lineTo(x, y + a4PhotoH + 4);
                ctx.moveTo(x + a4PhotoW + 4, y + a4PhotoH); ctx.lineTo(x + a4PhotoW, y + a4PhotoH); ctx.lineTo(x + a4PhotoW, y + a4PhotoH + 4);
                ctx.stroke();
            }
        }

        // Scissor cutting guide line right below the printed rows
        const cutLineY = startY + totalRows * (a4PhotoH + gapY) + 15;
        if (totalRows < 5 && cutLineY < 3400) {
            ctx.save();
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = 2;
            ctx.setLineDash([12, 8]);
            ctx.beginPath();
            ctx.moveTo(30, cutLineY);
            ctx.lineTo(2450, cutLineY);
            ctx.stroke();

            ctx.fillStyle = '#777777';
            ctx.font = 'bold 22px Arial, sans-serif';
            ctx.fillText('✂ कटिंग लाइन (यहाँ से पेपर काटें और बाकी पेपर बचाएं)', 60, cutLineY - 8);
            ctx.restore();
        }
    }

    // Attach click handler for Magic Wand in single view
    canvas.onclick = (e) => {
        if (layout !== 'single') return;
        const rect = canvas.getBoundingClientRect();
        const clickX = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
        const clickY = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));

        const pCanvas = window.ppState.processedImageCanvas;
        if (!pCanvas) return;
        const pCtx = pCanvas.getContext('2d');
        const imgD = pCtx.getImageData(0, 0, pCanvas.width, pCanvas.height);
        const data = imgD.data;

        const idx = (clickY * pCanvas.width + clickX) * 4;
        const targetR = data[idx], targetG = data[idx + 1], targetB = data[idx + 2];
        const fillRgb = window.hexToRgb(window.ppState.bgColor || '#ffffff');

        for (let i = 0; i < data.length; i += 4) {
            const dr = data[i] - targetR, dg = data[i + 1] - targetG, db = data[i + 2] - targetB;
            if (dr * dr + dg * dg + db * db < 35 * 35 * 3) {
                data[i] = fillRgb.r; data[i + 1] = fillRgb.g; data[i + 2] = fillRgb.b;
            }
        }
        pCtx.putImageData(imgD, 0, 0);
        window.renderPassportStudio();
    };
};

window.downloadPassportOutput = function(format = 'jpg') {
    const canvas = document.getElementById('ppMainCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Passport_Photos_${Date.now()}.${format}`;
    link.href = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    link.click();
};

window.downloadPassportPdf = async function() {
    const canvas = document.getElementById('ppMainCanvas');
    if (!canvas) return;
    const layout = document.getElementById('ppSheetLayout')?.value || 'sheet_a4_row1';

    try {
        await window.ensurePdfLibrariesLoaded();
        const { PDFDocument } = window.PDFLib;
        const pdfDoc = await PDFDocument.create();

        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.98);
        const embeddedImg = await pdfDoc.embedJpg(imgDataUrl);

        if (layout === 'sheet_4x6') {
            const page = pdfDoc.addPage([432, 288]); // 6 x 4 in pt
            page.drawImage(embeddedImg, { x: 0, y: 0, width: 432, height: 288 });
        } else if (layout === 'single') {
            const page = pdfDoc.addPage([99.2, 127.5]); // 3.5 x 4.5 cm in pt
            page.drawImage(embeddedImg, { x: 0, y: 0, width: 99.2, height: 127.5 });
        } else {
            // Standard A4 portrait in pt: 595.28 x 841.89
            const page = pdfDoc.addPage([595.28, 841.89]);
            page.drawImage(embeddedImg, { x: 0, y: 0, width: 595.28, height: 841.89 });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.download = `Passport_Sheet_${layout}_${Date.now()}.pdf`;
        link.href = URL.createObjectURL(blob);
        link.click();
        alert('सफलता! पासपोर्ट फोटो की प्रिंटेबल A4 PDF डाउनलोड हो गई है।');
    } catch (e) {
        alert('PDF बनाने में त्रुटि: ' + e.message);
    }
};

window.printPassportCanvas = function() {
    const canvas = document.getElementById('ppMainCanvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head><title>Print Passport Photos</title>
        <style>@page { size: A4; margin: 0; } body { margin: 0; display: flex; align-items: flex-start; justify-content: center; }</style>
        </head>
        <body onload="window.print();window.close();">
            <img src="${dataUrl}" style="max-width:100%; height:auto;" />
        </body>
        </html>
    `);
    win.document.close();
};

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
                    <p class="text-[11px] font-semibold text-slate-400">फोटो का बैकग्राउंड तुरंत शुद्ध सफेद (#FFFFFF), पारदर्शी या स्काई-ब्लू बनाएं (Max 10MB)</p>
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
                        <label class="text-xs font-bold text-slate-600">टॉलरेंस (Sensitivity):</label>
                        <input type="range" id="bgTolerance" min="5" max="80" value="32" oninput="window.processBgRemoval()" class="w-28 accent-emerald-600 cursor-pointer">
                        <span id="bgTolVal" class="text-xs font-bold text-slate-700">32</span>
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
                        <h4 class="text-xs font-black text-emerald-600 uppercase mb-2">प्रोसेस्ड फोटो (White/No BG)</h4>
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

    const tol = parseInt(document.getElementById('bgTolerance')?.value || 32);
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

    // Sample perimeter background
    let avgR = 0, avgG = 0, avgB = 0, count = 0;
    for (let x = 0; x < w; x += 10) {
        const idx = x * 4;
        avgR += d[idx]; avgG += d[idx + 1]; avgB += d[idx + 2];
        count++;
    }
    avgR = Math.round(avgR / count);
    avgG = Math.round(avgG / count);
    avgB = Math.round(avgB / count);

    const isTrans = window.bgRemoverState.targetColor === 'transparent';
    let repR = 255, repG = 255, repB = 255;
    if (window.bgRemoverState.targetColor === '#99ccff') { repR = 153; repG = 204; repB = 255; }
    const tolSq = tol * tol * 3;

    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const dist = (r - avgR) * (r - avgR) + (g - avgG) * (g - avgG) + (b - avgB) * (b - avgB);
        if (dist <= tolSq) {
            if (isTrans) {
                d[i + 3] = 0;
            } else {
                d[i] = repR; d[i + 1] = repG; d[i + 2] = repB; d[i + 3] = 255;
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
};

window.downloadBgResult = function() {
    const canvas = document.getElementById('bgResultCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Clean_Photo_${Date.now()}.png`;
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

    try {
        await window.ensurePdfLibrariesLoaded();
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        window.pdfToImgState.pdfDoc = await loadingTask.promise;

        document.getElementById('pdfImgUploadBox').classList.add('hidden');
        document.getElementById('pdfImgWorkspaceSection').classList.remove('hidden');
        window.renderPdfPagesToImages();
    } catch (err) {
        alert('PDF लोड करने में समस्या आई: ' + err.message);
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
        await window.ensurePdfLibrariesLoaded();
        const zip = new window.JSZip();
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
                    <p class="text-[11px] font-semibold text-slate-400">एक या अधिक फोटो को क्रमबद्ध तरीके से A4 साइज प्रिंटेबल पीडीएफ में बदलें (Max 10MB)</p>
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
                    <button type="button" onclick="window.moveImgToPdfOrder(${index}, -1)" class="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"><i class="fa-solid fa-arrow-up"></i></button>
                    <button type="button" onclick="window.moveImgToPdfOrder(${index}, 1)" class="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"><i class="fa-solid fa-arrow-down"></i></button>
                    <button type="button" onclick="window.removeImgToPdfItem(${index})" class="w-7 h-7 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
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
        await window.ensurePdfLibrariesLoaded();
        const { PDFDocument } = window.PDFLib;
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
                x: x, y: y, width: drawW, height: drawH
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
// TOOL 5: TRUE A4 PDF TEXT & STAMP EDITOR (Precise In-Place Edit, Zero-Zoom Shift)
// ============================================================================
window.setupPdfEditorTool = function(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div class="flex items-center gap-2.5">
                    <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center text-lg font-black">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </div>
                    <div>
                        <h2 class="text-base md:text-lg font-black text-dark-900">PDF Text &amp; A4 Editor (इन-प्लेस टेक्स्ट एडिटर)</h2>
                        <p class="text-[11px] font-semibold text-slate-400">शब्द/लाइन पर क्लिक करके उसी जगह एडिट करें • बैकग्राउंड 100% सेम रहेगा, कोई ज़ूम या पिक्सल शिफ्ट नहीं (Max 10MB)</p>
                    </div>
                </div>
            </div>

            <!-- Upload Box -->
            <div id="pdfEditUploadBox" class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('pdfEditFileInput').click()">
                <input type="file" id="pdfEditFileInput" accept="application/pdf" class="hidden" onchange="window.handlePdfEditorUpload(this.files[0])">
                <div class="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-rose-200">
                    <i class="fa-solid fa-file-pen"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">यहाँ PDF फाइल अपलोड करें</h3>
                <p class="text-xs font-semibold text-slate-400">एडिट करने के लिए PDF चुनें (अधिकतम 10MB)</p>
            </div>

            <!-- Full Workspace -->
            <div id="pdfEditWorkspace" class="hidden space-y-4">
                
                <!-- Modern Top Toolbar -->
                <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    
                    <!-- Page Navigation -->
                    <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                        <button type="button" onclick="window.navPdfEditPage(-1)" class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 text-xs font-bold"><i class="fa-solid fa-chevron-left"></i></button>
                        <span id="pdfEditPageIndicator" class="text-xs font-black text-slate-800">Page 1 / 1</span>
                        <button type="button" onclick="window.navPdfEditPage(1)" class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 text-xs font-bold"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>

                    <!-- Editor Modes -->
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button" onclick="window.setPdfEditorMode('click_edit')" id="btnEditModeClick" class="px-3 py-2 rounded-xl text-xs font-black bg-dark-900 text-royal-300 border border-royal-400 shadow-sm flex items-center gap-1.5">
                            <i class="fa-solid fa-i-cursor"></i> शब्द पर क्लिक करके एडिट करें
                        </button>
                        <button type="button" onclick="window.setPdfEditorMode('box_replace')" id="btnEditModeBox" class="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5">
                            <i class="fa-solid fa-vector-square text-indigo-500"></i> लाइन/एरिया खींचकर बदलें
                        </button>
                        <button type="button" onclick="window.setPdfEditorMode('whiteout')" id="btnEditModeWhiteout" class="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5">
                            <i class="fa-solid fa-eraser text-rose-500"></i> इरेज़र (व्हाइटआउट)
                        </button>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2">
                        <button type="button" id="btnSavePdfEditor" onclick="window.saveAndDownloadEditedPdf()" class="bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-2 rounded-xl text-xs shadow-sm transition flex items-center gap-1.5">
                            <i class="fa-solid fa-file-arrow-down"></i> Save Edited PDF
                        </button>
                    </div>
                </div>

                <div id="pdfEditGuideBanner" class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-circle-info text-amber-600 text-sm"></i>
                    <span>💡 <strong>क्लिक-टू-एडिट एक्टिव:</strong> पेज पर किसी भी नाम या शब्द पर क्लिक करें। उसी जगह बॉक्स खुलेगा, नया टेक्स्ट लिखें और <strong>Enter</strong> दबाएं — बैकग्राउंड बिल्कुल सेम रहेगा और पुराना टेक्स्ट साफ होकर नया छप जाएगा!</span>
                </div>

                <!-- True A4 Desk Canvas Workspace (Preserves natural page ratio & zero-zoom shift) -->
                <div class="bg-slate-300/80 p-3 md:p-6 rounded-3xl flex justify-center items-start overflow-auto min-h-[650px]">
                    <div id="a4DeskWrapper" class="a4-desk-sheet rounded-lg overflow-hidden relative shadow-a4 bg-white border border-slate-300">
                        <!-- Main PDF Render Canvas -->
                        <canvas id="pdfEditCanvas" class="block bg-white w-full h-auto"></canvas>
                        <!-- Interactive Clickable Text Overlay Layer (Locked 1:1 with canvas) -->
                        <div id="pdfTextOverlayLayer" class="absolute inset-0 z-20 pointer-events-auto"></div>
                        <!-- In-Place Editable Input Popup (Dynamically Placed Over Clicked Word) -->
                        <div id="inPlaceEditorPopup" class="hidden absolute z-40 bg-white p-2.5 rounded-xl shadow-2xl border-2 border-royal-500 space-y-2 max-w-sm">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[10px] font-black uppercase text-royal-600">Edit Text In-Place</span>
                                <button type="button" onclick="window.cancelInPlaceEdit()" class="text-slate-400 hover:text-red-500 text-xs"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                            <input type="text" id="inPlaceTextInput" class="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-royal-500 bg-slate-50">
                            <div class="flex items-center justify-between gap-2 pt-1">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-[10px] font-bold text-slate-500">Size:</span>
                                    <input type="number" id="inPlaceFontSize" value="16" min="8" max="72" class="w-12 p-1 border border-slate-300 rounded text-xs font-bold text-center">
                                    <input type="color" id="inPlaceTextColor" value="#000000" class="w-6 h-6 p-0 rounded border border-slate-300 cursor-pointer" title="Font Color">
                                </div>
                                <button type="button" onclick="window.applyInPlaceEdit()" class="bg-dark-900 hover:bg-black text-royal-300 px-3 py-1.5 rounded-lg text-xs font-black shadow transition">
                                    ✓ Apply (Enter)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;
};

window.pdfEditorState = {
    pdfDoc: null,
    currentPage: 1,
    scale: 2.0,
    activeMode: 'click_edit',
    currentActiveItem: null,
    boxStartX: 0,
    boxStartY: 0,
    isDraggingBox: false,
    pageCanvasMap: {}, // Cached modified canvas data URLs per page
    pageDimsMap: {}    // Original page point dimensions [width, height]
};

// Color Sampler: Samples true backdrop color right next to text
window.sampleCanvasBackground = function(ctx, x, y, w, h) {
    try {
        const canvasW = ctx.canvas.width;
        const canvasH = ctx.canvas.height;
        const checkPoints = [
            [x, Math.max(0, y - 4)],
            [x + w / 2, Math.max(0, y - 4)],
            [Math.min(canvasW - 1, x + w), Math.max(0, y - 4)],
            [Math.max(0, x - 4), y + h / 2],
            [Math.min(canvasW - 1, x + w + 4), y + h / 2]
        ];

        let totR = 0, totG = 0, totB = 0, validSamples = 0;
        checkPoints.forEach(([px, py]) => {
            const cx = Math.max(0, Math.min(canvasW - 1, Math.round(px)));
            const cy = Math.max(0, Math.min(canvasH - 1, Math.round(py)));
            const pixel = ctx.getImageData(cx, cy, 1, 1).data;
            // Ignore dark ink strokes
            if (pixel[0] > 160 || pixel[1] > 160 || pixel[2] > 160) {
                totR += pixel[0];
                totG += pixel[1];
                totB += pixel[2];
                validSamples++;
            }
        });

        if (validSamples > 0) {
            return `rgb(${Math.round(totR / validSamples)}, ${Math.round(totG / validSamples)}, ${Math.round(totB / validSamples)})`;
        }
    } catch (e) {}
    return '#ffffff';
};

window.handlePdfEditorUpload = async function(file) {
    if (!file) return;
    if (!window.validateFileSize(file, 10)) return;

    try {
        await window.ensurePdfLibrariesLoaded();
        const arrayBuffer = await file.arrayBuffer();
        window.pdfEditorState.originalPdfBytes = arrayBuffer;
        window.pdfEditorState.pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        window.pdfEditorState.currentPage = 1;
        window.pdfEditorState.pageCanvasMap = {};
        window.pdfEditorState.pageDimsMap = {};

        document.getElementById('pdfEditUploadBox').classList.add('hidden');
        document.getElementById('pdfEditWorkspace').classList.remove('hidden');
        window.renderPdfEditorA4Page();
    } catch (e) {
        alert('PDF लोड नहीं हो पाई: ' + e.message);
    }
};

window.setPdfEditorMode = function(mode) {
    window.pdfEditorState.activeMode = mode;
    const clickBtn = document.getElementById('btnEditModeClick');
    const boxBtn = document.getElementById('btnEditModeBox');
    const whiteoutBtn = document.getElementById('btnEditModeWhiteout');
    const banner = document.getElementById('pdfEditGuideBanner');

    const defaultClass = "px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5";
    const activeClass = "px-3 py-2 rounded-xl text-xs font-black bg-dark-900 text-royal-300 border border-royal-400 shadow-sm flex items-center gap-1.5";

    if (clickBtn) clickBtn.className = mode === 'click_edit' ? activeClass : defaultClass;
    if (boxBtn) boxBtn.className = mode === 'box_replace' ? activeClass : defaultClass;
    if (whiteoutBtn) whiteoutBtn.className = mode === 'whiteout' ? activeClass : defaultClass;

    if (mode === 'click_edit') {
        banner.innerHTML = `<i class="fa-solid fa-circle-info text-amber-600 text-sm"></i><span>💡 <strong>क्लिक-टू-एडिट एक्टिव:</strong> किसी भी शब्द पर क्लिक करके वहीं बदलें।</span>`;
    } else if (mode === 'box_replace') {
        banner.innerHTML = `<i class="fa-solid fa-vector-square text-indigo-600 text-sm"></i><span>📐 <strong>बॉक्स रिप्लेस एक्टिव:</strong> माउस से किसी भी लाइन या एरिया पर बॉक्स खींचें, नया टेक्स्ट लिखें।</span>`;
    } else if (mode === 'whiteout') {
        banner.innerHTML = `<i class="fa-solid fa-eraser text-rose-600 text-sm"></i><span>🧹 <strong>व्हाइटआउट (इरेज़र) एक्टिव:</strong> जिस भाग को मिटाना चाहते हैं, उसपर माउस से बॉक्स खींचें।</span>`;
    }
};

window.renderPdfEditorA4Page = async function() {
    const pdfDoc = window.pdfEditorState.pdfDoc;
    const pageNum = window.pdfEditorState.currentPage;
    const canvas = document.getElementById('pdfEditCanvas');
    const overlay = document.getElementById('pdfTextOverlayLayer');
    const wrapper = document.getElementById('a4DeskWrapper');
    if (!pdfDoc || !canvas || !overlay || !wrapper) return;

    document.getElementById('pdfEditPageIndicator').innerText = `Page ${pageNum} of ${pdfDoc.numPages}`;

    const page = await pdfDoc.getPage(pageNum);
    const scale = window.pdfEditorState.scale;
    const viewport = page.getViewport({ scale: scale });
    const naturalViewport = page.getViewport({ scale: 1.0 });

    // Store natural point dimensions for 1:1 PDF export
    window.pdfEditorState.pageDimsMap[pageNum] = [naturalViewport.width, naturalViewport.height];

    // Lock wrapper aspect ratio to natural page ratio: ZERO ZOOM SHIFT!
    wrapper.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
    wrapper.style.maxWidth = Math.min(840, Math.round(viewport.width / (scale / 1.15))) + 'px';

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    // If this page was already modified, restore cached image to keep edits intact!
    if (window.pdfEditorState.pageCanvasMap[pageNum]) {
        const cachedImg = new Image();
        cachedImg.onload = () => {
            ctx.drawImage(cachedImg, 0, 0);
            window.buildInteractiveTextOverlay(page, viewport, scale);
        };
        cachedImg.src = window.pdfEditorState.pageCanvasMap[pageNum];
    } else {
        // Otherwise render page freshly from PDF
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        window.buildInteractiveTextOverlay(page, viewport, scale);
    }
};

window.buildInteractiveTextOverlay = async function(page, viewport, scale) {
    const overlay = document.getElementById('pdfTextOverlayLayer');
    const canvas = document.getElementById('pdfEditCanvas');
    if (!overlay || !canvas) return;

    overlay.innerHTML = '';
    const textContent = await page.getTextContent();
    const items = textContent.items;

    items.forEach((item) => {
        if (!item.str || !item.str.trim()) return;

        const tx = item.transform[4];
        const ty = item.transform[5];
        const [vx, vy] = viewport.convertToViewportPoint(tx, ty);

        const fontSize = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]);
        const fontSizeCanvas = fontSize * scale;
        const itemW = item.width * scale;
        const itemH = fontSizeCanvas * 1.25;

        // Bounding box: from baseline vy upward by fontSize
        const boxLeftPercent = (vx / viewport.width) * 100;
        const boxTopPercent = ((vy - fontSizeCanvas * 0.95) / viewport.height) * 100;
        const boxWidthPercent = (itemW / viewport.width) * 100;
        const boxHeightPercent = (itemH / viewport.height) * 100;

        const div = document.createElement('div');
        div.className = 'pdf-text-highlight';
        div.style.left = boxLeftPercent + '%';
        div.style.top = boxTopPercent + '%';
        div.style.width = Math.max(boxWidthPercent, 0.5) + '%';
        div.style.height = boxHeightPercent + '%';
        div.title = `Click to edit: "${item.str}"`;

        div.onclick = (e) => {
            e.stopPropagation();
            if (window.pdfEditorState.activeMode !== 'click_edit') return;
            window.openInPlaceEditor(item, vx, vy, itemW, itemH, fontSize);
        };

        overlay.appendChild(div);
    });

    // Box Dragging Support
    overlay.onmousedown = (e) => {
        if (window.pdfEditorState.activeMode === 'click_edit') return;
        const rect = overlay.getBoundingClientRect();
        window.pdfEditorState.isDraggingBox = true;
        window.pdfEditorState.boxStartX = (e.clientX - rect.left) * (canvas.width / rect.width);
        window.pdfEditorState.boxStartY = (e.clientY - rect.top) * (canvas.height / rect.height);
    };

    overlay.onmouseup = (e) => {
        if (!window.pdfEditorState.isDraggingBox) return;
        window.pdfEditorState.isDraggingBox = false;
        const rect = overlay.getBoundingClientRect();
        const endX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const endY = (e.clientY - rect.top) * (canvas.height / rect.height);

        const startX = window.pdfEditorState.boxStartX;
        const startY = window.pdfEditorState.boxStartY;
        const boxX = Math.min(startX, endX);
        const boxY = Math.min(startY, endY);
        const boxW = Math.abs(endX - startX);
        const boxH = Math.abs(endY - startY);

        if (boxW < 8 || boxH < 8) return;
        const ctx = canvas.getContext('2d');

        if (window.pdfEditorState.activeMode === 'whiteout') {
            const bgShade = window.sampleCanvasBackground(ctx, boxX, boxY, boxW, boxH);
            ctx.fillStyle = bgShade;
            ctx.fillRect(boxX, boxY, boxW, boxH);
            // Cache page state
            window.pdfEditorState.pageCanvasMap[window.pdfEditorState.currentPage] = canvas.toDataURL('image/jpeg', 0.98);
        } else if (window.pdfEditorState.activeMode === 'box_replace') {
            const newText = prompt('इस चुने हुए एरिया के लिए नया टेक्स्ट लिखें:', '');
            if (newText !== null && newText.trim()) {
                const bgShade = window.sampleCanvasBackground(ctx, boxX, boxY, boxW, boxH);
                ctx.fillStyle = bgShade;
                ctx.fillRect(boxX, boxY, boxW, boxH);

                ctx.fillStyle = '#000000';
                const fSize = Math.max(14, Math.round(boxH * 0.72));
                ctx.font = `bold ${fSize}px Arial, sans-serif`;
                ctx.textBaseline = 'middle';
                ctx.fillText(newText.trim(), boxX + 4, boxY + boxH / 2);
                window.pdfEditorState.pageCanvasMap[window.pdfEditorState.currentPage] = canvas.toDataURL('image/jpeg', 0.98);
            }
        }
    };
};

window.openInPlaceEditor = function(item, vx, vy, itemW, itemH, fontSize) {
    const popup = document.getElementById('inPlaceEditorPopup');
    const input = document.getElementById('inPlaceTextInput');
    const sizeInp = document.getElementById('inPlaceFontSize');
    if (!popup || !input) return;

    window.pdfEditorState.currentActiveItem = { item, vx, vy, itemW, itemH, fontSize };

    input.value = item.str;
    sizeInp.value = Math.round(fontSize * 1.05);

    const canvas = document.getElementById('pdfEditCanvas');
    const leftPercent = (vx / canvas.width) * 100;
    const topPercent = ((vy + 8) / canvas.height) * 100;

    popup.style.left = Math.min(leftPercent, 65) + '%';
    popup.style.top = Math.min(topPercent, 80) + '%';
    popup.classList.remove('hidden');

    input.focus();
    input.select();

    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            window.applyInPlaceEdit();
        } else if (e.key === 'Escape') {
            window.cancelInPlaceEdit();
        }
    };
};

window.cancelInPlaceEdit = function() {
    const popup = document.getElementById('inPlaceEditorPopup');
    if (popup) popup.classList.add('hidden');
    window.pdfEditorState.currentActiveItem = null;
};

// In-Place Text Replacement: Seamless background matching & exact baseline rendering
window.applyInPlaceEdit = function() {
    const state = window.pdfEditorState.currentActiveItem;
    const input = document.getElementById('inPlaceTextInput');
    const sizeInp = document.getElementById('inPlaceFontSize');
    const colorInp = document.getElementById('inPlaceTextColor');
    const canvas = document.getElementById('pdfEditCanvas');

    if (!state || !input || !canvas) return;

    const newStr = input.value.trim();
    const fSize = parseInt(sizeInp.value) || 16;
    const color = colorInp.value || '#000000';
    const ctx = canvas.getContext('2d');
    const scale = window.pdfEditorState.scale;

    const { vx, vy, itemW } = state;
    const fontSizeCanvas = fSize * scale;

    // 1. Sample exact background color surrounding the text box
    const eraseTop = Math.max(0, vy - fontSizeCanvas * 1.05);
    const eraseHeight = fontSizeCanvas * 1.35;
    const eraseLeft = Math.max(0, vx - 2);

    ctx.font = `bold ${fontSizeCanvas}px Arial, sans-serif`;
    const newMetrics = ctx.measureText(newStr);
    const eraseWidth = Math.max(itemW + 6, newMetrics.width + 6);

    const bgShade = window.sampleCanvasBackground(ctx, eraseLeft, eraseTop, eraseWidth, eraseHeight);

    // 2. Cleanly erase original text with seamless backdrop color: NO GAPS, NO WHITE PATCHES!
    ctx.fillStyle = bgShade;
    ctx.fillRect(eraseLeft, eraseTop, eraseWidth, eraseHeight);

    // 3. Draw newly edited text at exact original baseline
    if (newStr) {
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSizeCanvas}px Arial, sans-serif`;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(newStr, vx, vy);
    }

    // Cache page state so changes persist when paging
    window.pdfEditorState.pageCanvasMap[window.pdfEditorState.currentPage] = canvas.toDataURL('image/jpeg', 0.98);

    window.cancelInPlaceEdit();
};

window.navPdfEditPage = function(dir) {
    const state = window.pdfEditorState;
    const next = state.currentPage + dir;
    if (next < 1 || next > state.pdfDoc.numPages) return;

    // Cache current page before switching
    const canvas = document.getElementById('pdfEditCanvas');
    if (canvas) {
        state.pageCanvasMap[state.currentPage] = canvas.toDataURL('image/jpeg', 0.98);
    }

    state.currentPage = next;
    window.renderPdfEditorA4Page();
};

// Save & Download: Preserves exact original page dimensions and unedited pages!
window.saveAndDownloadEditedPdf = async function() {
    const state = window.pdfEditorState;
    if (!state.pdfDoc) return;

    const canvas = document.getElementById('pdfEditCanvas');
    if (canvas) {
        state.pageCanvasMap[state.currentPage] = canvas.toDataURL('image/jpeg', 0.98);
    }

    const btn = document.getElementById('btnSavePdfEditor');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }

    try {
        await window.ensurePdfLibrariesLoaded();
        const { PDFDocument } = window.PDFLib;

        const origDoc = await PDFDocument.load(state.originalPdfBytes);
        const newDoc = await PDFDocument.create();
        const numPages = state.pdfDoc.numPages;

        for (let p = 1; p <= numPages; p++) {
            const origPage = origDoc.getPage(p - 1);
            const origW = origPage.getWidth();
            const origH = origPage.getHeight();

            if (state.pageCanvasMap[p]) {
                // Edited page: embed canvas at EXACT original width & height: ZERO ZOOM DISTORTION!
                const embeddedImg = await newDoc.embedJpg(state.pageCanvasMap[p]);
                const newPage = newDoc.addPage([origW, origH]);
                newPage.drawImage(embeddedImg, {
                    x: 0,
                    y: 0,
                    width: origW,
                    height: origH
                });
            } else {
                // Unedited page: copy directly from original with 100% vector sharpness!
                const [copiedPage] = await newDoc.copyPages(origDoc, [p - 1]);
                newDoc.addPage(copiedPage);
            }
        }

        const pdfBytes = await newDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.download = `Edited_Document_${Date.now()}.pdf`;
        link.href = URL.createObjectURL(blob);
        link.click();
        alert('सफलता! आपकी एडिट की गई PDF फाइल डाउनलोड हो गई है। बैकग्राउंड और पेज का साइज बिल्कुल ओरिजिनल जैसा सुरक्षित रखा गया है।');
    } catch (e) {
        alert('PDF सेव करने में समस्या आई: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
    }
};

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

            <div class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('pdfMergeFileInput').click()">
                <input type="file" id="pdfMergeFileInput" accept="application/pdf" multiple class="hidden" onchange="window.handlePdfMergeUpload(this.files)">
                <div class="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-purple-200">
                    <i class="fa-solid fa-copy"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">यहाँ PDF फाइलें चुनें (एक साथ 2 या अधिक फाइलें चुनें)</h3>
                <p class="text-xs font-semibold text-slate-400">प्रत्येक फाइल अधिकतम 10MB</p>
            </div>

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
        await window.ensurePdfLibrariesLoaded();
        const { PDFDocument } = window.PDFLib;
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

            <div id="pdfUnlockUploadBox" class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('pdfUnlockFileInput').click()">
                <input type="file" id="pdfUnlockFileInput" accept="application/pdf" class="hidden" onchange="window.handlePdfUnlockUpload(this.files[0])">
                <div class="w-14 h-14 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-teal-200">
                    <i class="fa-solid fa-file-shield"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">लॉक PDF फाइल यहाँ चुनें</h3>
                <p class="text-xs font-semibold text-slate-400">अधिकतम 10MB</p>
            </div>

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
        await window.ensurePdfLibrariesLoaded();
        const { PDFDocument } = window.PDFLib;
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

            <div id="compUploadBox" class="p-6 rounded-3xl dropzone-box text-center space-y-2 bg-slate-50 cursor-pointer" onclick="document.getElementById('compFileInput').click()">
                <input type="file" id="compFileInput" accept="image/*" class="hidden" onchange="window.handleCompressorUpload(this.files[0])">
                <div class="w-14 h-14 bg-royal-100 text-royal-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 border border-royal-200">
                    <i class="fa-solid fa-compress"></i>
                </div>
                <h3 class="text-sm font-black text-slate-800">यहाँ इमेज अपलोड करें</h3>
                <p class="text-xs font-semibold text-slate-400">JPG, PNG, WEBP (अधिकतम 10MB)</p>
            </div>

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
