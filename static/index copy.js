// === DOM Elements ===
const basePdfInput = document.getElementById('basePdfInput');
const updatedPdfInput = document.getElementById('updatedPdfInput');
const basePdfInfo = document.getElementById('basePdfInfo');
const updatedPdfInfo = document.getElementById('updatedPdfInfo');
const basePdfName = document.getElementById('basePdfName');
const updatedPdfName = document.getElementById('updatedPdfName');
const compareBtn = document.getElementById('compareBtn');
const downloadBtn = document.getElementById('downloadBtn');
const spinnerOverlay = document.getElementById('spinnerOverlay');

// === Event Listeners for File Input ===
basePdfInput.addEventListener('change', () => handleFileUpload('base'));
updatedPdfInput.addEventListener('change', () => handleFileUpload('updated'));

// === Handle File Upload and Show File Info ===
function handleFileUpload(type) {
  const input = type === 'base' ? basePdfInput : updatedPdfInput;
  const info = type === 'base' ? basePdfInfo : updatedPdfInfo;
  const name = type === 'base' ? basePdfName : updatedPdfName;

  if (input.files.length > 0) {
    name.textContent = input.files[0].name;
    info.style.display = 'flex';
  }

  toggleCompareButton();
}

// === Remove Uploaded File and Reset Info ===
function removeFile(type) {
  const input = type === 'base' ? basePdfInput : updatedPdfInput;
  const info = type === 'base' ? basePdfInfo : updatedPdfInfo;
  const name = type === 'base' ? basePdfName : updatedPdfName;

  input.value = '';
  name.textContent = '';
  info.style.display = 'none';

  toggleCompareButton();
}

// === Enable Compare Button Only When Both Files Are Selected ===
function toggleCompareButton() {
  compareBtn.disabled = !(basePdfInput.files.length && updatedPdfInput.files.length);
}

// === Populate Comparison Table with Differences ===
function populateDiffTable(response) {
  if (!response.success) return;

  const differences = response.differences;
  if (differences && Object.keys(differences).length > 0) {
    console.log(differences)
    const tableBody = document.querySelector("#diffTable tbody");
    tableBody.innerHTML = '';

    const headers = Object.keys(differences[0]);
    const file1Key = headers.find(key => key !== "page");
    const file2Key = headers.find(key => key !== "page" && key !== file1Key);

    document.getElementById("file1Name").textContent = file1Key;
    document.getElementById("file2Name").textContent = file2Key;

    // Create each row
    differences.forEach(diff => {
        const row = document.createElement("tr");

        // Checkbox column
        const checkboxCell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.classList.add("row-checkbox");
        checkboxCell.appendChild(checkbox);

        // Data columns
        const pageCell = document.createElement("td");
        pageCell.textContent = diff.page;

        const file1Cell = document.createElement("td");
        file1Cell.textContent = diff[file1Key];

        const file2Cell = document.createElement("td");
        file2Cell.textContent = diff[file2Key];

        row.appendChild(checkboxCell);
        row.appendChild(pageCell);
        row.appendChild(file1Cell);
        row.appendChild(file2Cell);

        // Set x and y to 0 if not available in diff
        const x = diff.x || 0;
        const y = diff.y || 0;

        // Attach click handler to navigate to PDF location
        row.style.cursor = "pointer";
        row.addEventListener("click", () => {
          const file = currentPdfType === "base" ? basePdfInput.files[0] : updatedPdfInput.files[0];
          if (file) {
            loadPdf(file, currentPdfType).then(() => {
              renderPage(diff.page, x, y);
            });
          }
        });

        tableBody.appendChild(row);
    });

    // Show table and controls
    document.querySelector('.table-container').style.display = 'block';
    document.querySelector('.table-controls').style.display = 'block';
    document.getElementById("countDisplay").style.display = 'block';

    // Checkbox state sync
    const rowCheckboxes = document.querySelectorAll(".row-checkbox");
    const selectAllCheckbox = document.getElementById("selectAll");

    rowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
        const allChecked = [...rowCheckboxes].every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
        toggleExportButton();
        });
    });

    applyFilters();
    toggleExportButton();

    // Initial select all checkbox sync
    const allChecked = [...rowCheckboxes].every(cb => cb.checked);
    selectAllCheckbox.checked = allChecked;
    }
    else{
        showErrorModal("No Changes found between the PDFs");
    }
}

// === Compare PDFs via Backend API ===
function comparePDFs() {
  const formData = new FormData();
  formData.append('file1', basePdfInput.files[0]);
  formData.append('file2', updatedPdfInput.files[0]);

  // Show spinner and disable inputs
  spinnerOverlay.style.display = 'flex';
  compareBtn.disabled = true;
  downloadBtn.disabled = true;
  basePdfInput.disabled = true;
  updatedPdfInput.disabled = true;

  fetch('/compare', {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      spinnerOverlay.style.display = 'none';
      if (data.success) {
        downloadBtn.disabled = false;
        downloadBtn.setAttribute('data-filename', data.filename);
        populateDiffTable(data);
      } else {
        showErrorModal(data.message || "Comparison failed. Please refer the logs");
        basePdfInput.disabled = false;
        updatedPdfInput.disabled = false;
        toggleCompareButton();
      }
    })
    .catch(err => {
      console.error(err);
      spinnerOverlay.style.display = 'none';
      showErrorModal("An error occurred. Please refer the logs");
      basePdfInput.disabled = false;
      updatedPdfInput.disabled = false;
      toggleCompareButton();
    });
}

// === Download Comparison Results ===
function downloadResults() {
  const filename = downloadBtn.getAttribute('data-filename');
  if (filename) {
    window.location.href = `/download/${filename}`;
  }

  // Reset UI
  removeFile('base');
  removeFile('updated');
  basePdfInput.disabled = false;
  updatedPdfInput.disabled = false;
  compareBtn.disabled = true;
  downloadBtn.disabled = true;
}

// === Cancel Loading Spinner ===
function stopComparison() {
  spinnerOverlay.style.display = 'none';
  basePdfInput.disabled = false;
  updatedPdfInput.disabled = false;
  toggleCompareButton();
}

// === Show Error Modal with Custom Message ===
function showErrorModal(message) {
  const modal = document.getElementById('errorModal');
  const messageElem = document.getElementById('errorMessage');
  messageElem.textContent = message;
  modal.classList.remove('hidden');
}

// === Close Error Modal ===
function closeErrorModal() {
  document.getElementById('errorModal').classList.add('hidden');
}

// === Reload Page on Refresh Button Click ===
document.getElementById('refreshBtn').addEventListener('click', () => {
  window.location.reload();
});

// === Filter Table Rows Based on User Input ===
function applyFilters() {
  const excludeFile1 = document.getElementById("excludeFile1")?.value.trim().toLowerCase() || "";
  const excludeFile2 = document.getElementById("excludeFile2")?.value.trim().toLowerCase() || "";
  const excludePage = document.getElementById("excludePageNumber")?.value.trim().toLowerCase() || "";
  const globalSearch = document.getElementById("globalSearch")?.value.trim().toLowerCase() || "";

  const rows = Array.from(document.querySelector("#diffTable tbody").getElementsByTagName("tr"));
  let filteredCount = 0;

  rows.forEach(row => {
    const cells = row.getElementsByTagName("td");
    const pageText = cells[1]?.textContent.toLowerCase();
    const file1Text = cells[2]?.textContent.toLowerCase();
    const file2Text = cells[3]?.textContent.toLowerCase();

    const isExcluded =
      (excludePage && pageText.includes(excludePage)) ||
      (excludeFile1 && file1Text.includes(excludeFile1)) ||
      (excludeFile2 && file2Text.includes(excludeFile2));

    const isSearchMatch =
      !globalSearch ||
      pageText.includes(globalSearch) ||
      file1Text.includes(globalSearch) ||
      file2Text.includes(globalSearch);

    row.style.display = (!isExcluded && isSearchMatch) ? "" : "none";
    if (!isExcluded && isSearchMatch) filteredCount++;
  });

  const countDisplay = document.getElementById("countDisplay");
  countDisplay.textContent = `${filteredCount}/${rows.length}`;
}

// === Toggle All Row Checkboxes via Header Checkbox ===
function toggleSelectAll(source) {
  const checkboxes = document.querySelectorAll(".row-checkbox");
  checkboxes.forEach(checkbox => {
    checkbox.checked = source.checked;
  });
  toggleExportButton();
}

// === Enable Export Button Only If Any Row is Selected ===
function toggleExportButton() {
  const checkboxes = document.querySelectorAll(".row-checkbox");
  const anyChecked = [...checkboxes].some(cb => cb.checked);
  document.getElementById("exportExcelBtn").disabled = !anyChecked;
}

// === Global Checkbox Change Listener (Row/Select All) ===
document.addEventListener("change", function (e) {
  if (e.target.classList.contains("row-checkbox") || e.target.id === "selectAll") {
    toggleExportButton();
  }
});

/**
 * Export selected and visible rows from the differences table to an Excel file.
 * 
 * This function collects all rows from the comparison table (`#diffTable`) that:
 * - Have their checkbox selected
 * - Are currently visible (not filtered out or hidden)
 * 
 * It then formats the data as an Excel workbook using SheetJS and triggers download.
 * 
 * Requirements:
 * - Include SheetJS (xlsx.full.min.js) in your HTML for this to work:
 *   <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
 */
  
    function exportSelectedToExcel() {
    const rows = document.querySelectorAll('#diffTable tbody tr');
    file1nametext = document.getElementById("file1Name").textContent;
    file2nametext = document.getElementById("file2Name").textContent;
    const data = [["Page Number", file1nametext, file2nametext]]; // headers

    rows.forEach(row => {
        const checkbox = row.querySelector('.row-checkbox');
        const style = window.getComputedStyle(row);

        if (checkbox && checkbox.checked && style.display !== 'none') {
        const cells = row.querySelectorAll('td');
        const rowData = [
            cells[1].textContent.trim(),
            cells[2].textContent.trim(),
            cells[3].textContent.trim()
        ];
        data.push(rowData);
        }
    });

    if (data.length === 1) {
        showErrorModal("No visible and selected rows to export!");
        return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Differences");

    XLSX.writeFile(workbook, "Filtered_PDF_Comparison.xlsx");
    }

// Add this function to handle adding new exclude filters
function addExcludeFilter(containerId, baseId) {
    const container = document.getElementById(containerId);
    const existingFilters = container.querySelectorAll('.input-wrapper').length;
    
    if (existingFilters >= 3) { // Restrict to 4 total (1 base + 3 additional)
      return;
    }
    
    const newFilterId = `${baseId}_${existingFilters + 1}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'input-wrapper new-filter';
    wrapper.innerHTML = `
      <input type="text" class="exclude-filter" id="${newFilterId}" placeholder="Exclude..." oninput="applyFilters()">
      <i class="fas fa-times clear-icon" onclick="this.parentElement.remove(); applyFilters()"></i>
    `;
    
    container.appendChild(wrapper);
    
    // Animate the new filter
    setTimeout(() => {
      wrapper.classList.remove('new-filter');
    }, 300);
  }
  
  // Update the clearInput function
  function clearInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.value = '';
      applyFilters();
      // Trigger input event to update clear icon visibility
      const event = new Event('input');
      input.dispatchEvent(event);
    }
  }
  
  // Update the applyFilters function to handle multiple exclude filters
  function applyFilters() {
    // Get all exclude filters for each column
    const getExcludeValues = (baseId) => {
      const values = [];
      // Get base filter
      const baseFilter = document.getElementById(baseId);
      if (baseFilter && baseFilter.value.trim()) {
        values.push(baseFilter.value.trim().toLowerCase());
      }
      // Get additional filters
      const additionalFilters = document.querySelectorAll(`[id^="${baseId}_"]`);
      additionalFilters.forEach(filter => {
        if (filter.value.trim()) {
          values.push(filter.value.trim().toLowerCase());
        }
      });
      return values;
    };
  
    const excludeFile1Values = getExcludeValues("excludeFile1");
    const excludeFile2Values = getExcludeValues("excludeFile2");
    const excludePageValues = getExcludeValues("excludePageNumber");
    const globalSearch = document.getElementById("globalSearch")?.value.trim().toLowerCase() || "";
  
    const rows = Array.from(document.querySelector("#diffTable tbody").getElementsByTagName("tr"));
    let filteredCount = 0;
  
    rows.forEach(row => {
      const cells = row.getElementsByTagName("td");
      const pageText = cells[1]?.textContent.toLowerCase();
      const file1Text = cells[2]?.textContent.toLowerCase();
      const file2Text = cells[3]?.textContent.toLowerCase();
  
      // Check if any exclude value matches
      const isExcluded =
        (excludePageValues.length && excludePageValues.some(val => pageText.includes(val))) ||
        (excludeFile1Values.length && excludeFile1Values.some(val => file1Text.includes(val))) ||
        (excludeFile2Values.length && excludeFile2Values.some(val => file2Text.includes(val)));
  
      const isSearchMatch =
        !globalSearch ||
        pageText.includes(globalSearch) ||
        file1Text.includes(globalSearch) ||
        file2Text.includes(globalSearch);
  
      row.style.display = (!isExcluded && isSearchMatch) ? "" : "none";
      if (!isExcluded && isSearchMatch) filteredCount++;
    });
  
    const countDisplay = document.getElementById("countDisplay");
    countDisplay.textContent = `${filteredCount}/${rows.length}`;
  }

let pdfDoc = null;
let currentPageNum = 1;
let pdfCanvas = document.getElementById("pdfCanvas");
let pdfCtx = pdfCanvas.getContext("2d");
let currentPdfType = "base"; // either 'base' or 'updated'

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Load and render the PDF file
async function loadPdf(file, type) {
  const fileReader = new FileReader();
  fileReader.onload = async function () {
    const typedarray = new Uint8Array(this.result);
    pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
    currentPdfType = type;
    renderPage(1); // Initial page render
  };
  fileReader.readAsArrayBuffer(file);
}

// Render a specific page and scroll to coordinates
async function renderPage(num, x = 0, y = 0) {
  currentPageNum = num;
  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale: 1.5 });
  pdfCanvas.height = viewport.height;
  pdfCanvas.width = viewport.width;

  await page.render({
    canvasContext: pdfCtx,
    viewport: viewport
  }).promise;

  // Scroll to (x, y) visually if needed
  setTimeout(() => {
    const container = pdfCanvas.parentElement;
    container.scrollTop = y;
    container.scrollLeft = x;
  }, 200);
}
