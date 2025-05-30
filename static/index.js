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
  if (!Array.isArray(differences) || differences.length === 0) {
    showErrorModal("No Changes found between the PDFs");
    return;
  }

  const tableBody = document.querySelector("#diffTable tbody");
  tableBody.innerHTML = '';

  const firstEntry = differences[0];
  const fileKeys = Object.keys(firstEntry.files);
  const file1Key = fileKeys[0];
  const file2Key = fileKeys[1];

  document.getElementById("file1Name").textContent = file1Key;
  document.getElementById("file2Name").textContent = file2Key;

  differences.forEach(diff => {
    const row = document.createElement("tr");

    const checkboxCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.classList.add("row-checkbox");
    checkboxCell.appendChild(checkbox);

    // const pageCell = document.createElement("td");
    // pageCell.textContent = diff.page;

    const pageCell = document.createElement("td");
    pageCell.textContent = diff.files[file1Key]?.page || '';

    const updatedPageCell = document.createElement("td");
    updatedPageCell.textContent = diff.files[file2Key]?.page || '';

    const file1Text = diff.files[file1Key]?.text || '';
    const file2Text = diff.files[file2Key]?.text || '';

    const file1Cell = document.createElement("td");
    file1Cell.textContent = file1Text;

    const file2Cell = document.createElement("td");
    file2Cell.textContent = file2Text;

    row.appendChild(checkboxCell);
    row.appendChild(pageCell);
    row.appendChild(updatedPageCell);
    row.appendChild(file1Cell);
    row.appendChild(file2Cell);

    // Use file1 x/y for navigation fallback
    const x = diff.files[file1Key]?.x || 0;
    const y = diff.files[file1Key]?.y || 0;

    // Click handler to navigate to PDF location
    row.style.cursor = "pointer";
    row.addEventListener("click", async () => {
      const file1 = basePdfInput.files[0];
      const file2 = updatedPdfInput.files[0];
      if (!file1 || !file2) return;

      const file1Data = diff.files[file1Key];
      const file2Data = diff.files[file2Key];

      await Promise.all([
        loadPdfToCanvas(file1, "pdfCanvas1"),
        loadPdfToCanvas(file2, "pdfCanvas2")
      ]);

      await Promise.all([
        renderPdfPageWithHighlight(pdfDoc1, file1Data.page, "pdfCanvas1", file1Data.x, file1Data.y, file1Data.width, file1Data.height),
        renderPdfPageWithHighlight(pdfDoc2, file2Data.page, "pdfCanvas2", file2Data.x, file2Data.y, file2Data.width, file2Data.height)
      ]);
      // Scroll to the PDF viewer container smoothly
      document.querySelector('.pdf-viewer-container').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });

    tableBody.appendChild(row);
  });

  // Show table and controls
  document.querySelector('.table-container').style.display = 'block';
  document.querySelector('.table-controls').style.display = 'block';
  document.getElementById("countDisplay").style.display = 'block';

  // Checkbox sync
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

  selectAllCheckbox.checked = [...rowCheckboxes].every(cb => cb.checked);
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
    const data = [["Base Page Number","Updated Page Number", file1nametext, file2nametext]]; // headers

    rows.forEach(row => {
        const checkbox = row.querySelector('.row-checkbox');
        const style = window.getComputedStyle(row);

        if (checkbox && checkbox.checked && style.display !== 'none') {
        const cells = row.querySelectorAll('td');
        const rowData = [
            cells[1].textContent.trim(),
            cells[2].textContent.trim(),
            cells[3].textContent.trim(),
            cells[4].textContent.trim()
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
  // function applyFilters() {
  //   // Get all exclude filters for each column
  //   const getExcludeValues = (baseId) => {
  //     const values = [];
  //     // Get base filter
  //     const baseFilter = document.getElementById(baseId);
  //     if (baseFilter && baseFilter.value.trim()) {
  //       values.push(baseFilter.value.trim().toLowerCase());
  //     }
  //     // Get additional filters
  //     const additionalFilters = document.querySelectorAll(`[id^="${baseId}_"]`);
  //     additionalFilters.forEach(filter => {
  //       if (filter.value.trim()) {
  //         values.push(filter.value.trim().toLowerCase());
  //       }
  //     });
  //     return values;
  //   };
  
  //   const excludeFile1Values = getExcludeValues("excludeFile1");
  //   const excludeFile2Values = getExcludeValues("excludeFile2");
  //   const excludePageValues = getExcludeValues("excludePageNumber");
  //   const excludeUpdatedPageValues = getExcludeValues("excludeUpdatedPageNumber");
  //   const globalSearch = document.getElementById("globalSearch")?.value.trim().toLowerCase() || "";
  
  //   const rows = Array.from(document.querySelector("#diffTable tbody").getElementsByTagName("tr"));
  //   let filteredCount = 0;
  
  //   rows.forEach(row => {
  //     const cells = row.getElementsByTagName("td");

  //     const basePage = cells[1]?.textContent.toLowerCase();
  //     const updatedPage = cells[2]?.textContent.toLowerCase();
  //     const file1Text = cells[3]?.textContent.toLowerCase();
  //     const file2Text = cells[4]?.textContent.toLowerCase();

  
  //     // Check if any exclude value matches
  //     const isExcluded =
  //       (excludePageValues.length && excludePageValues.some(val => basePage.includes(val))) ||
  //       (excludeUpdatedPageValues.length && excludeUpdatedPageValues.some(val => updatedPage.includes(val))) ||
  //       (excludeFile1Values.length && excludeFile1Values.some(val => file1Text.includes(val))) ||
  //       (excludeFile2Values.length && excludeFile2Values.some(val => file2Text.includes(val)));
  
  //     const isSearchMatch =
  //       !globalSearch ||
  //       basePage.includes(globalSearch) ||
  //       updatedPage.includes(globalSearch) ||
  //       file1Text.includes(globalSearch) ||
  //       file2Text.includes(globalSearch);
  
  //     row.style.display = (!isExcluded && isSearchMatch) ? "" : "none";
  //     if (!isExcluded && isSearchMatch) filteredCount++;
  //   });
  
  //   const countDisplay = document.getElementById("countDisplay");
  //   countDisplay.textContent = `${filteredCount}/${rows.length}`;
  // }

  function applyFilters() {
  const excludePage = document.getElementById('excludePageNumber').value.split('|').map(s => s.trim().toLowerCase()).filter(Boolean);
  const excludeUpdatedPage = document.getElementById('excludeUpdatedPageNumber').value.split('|').map(s => s.trim().toLowerCase()).filter(Boolean);
  const excludeFile1 = document.getElementById('excludeFile1').value.split('|').map(s => s.trim().toLowerCase()).filter(Boolean);
  const excludeFile2 = document.getElementById('excludeFile2').value.split('|').map(s => s.trim().toLowerCase()).filter(Boolean);

  const globalSearch = document.getElementById('globalSearch').value.trim().toLowerCase();

  const rows = document.querySelectorAll('#diffTable tbody tr');
  const totalCount = rows.length;
  let visibleCount = 0;

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const pageBase = cells[1]?.textContent.toLowerCase();
    const pageUpdated = cells[2]?.textContent.toLowerCase();
    const content1 = cells[3]?.textContent.toLowerCase();
    const content2 = cells[4]?.textContent.toLowerCase();

    const shouldExclude = 
      excludePage.some(val => pageBase?.includes(val)) ||
      excludeUpdatedPage.some(val => pageUpdated?.includes(val)) ||
      excludeFile1.some(val => content1?.includes(val)) ||
      excludeFile2.some(val => content2?.includes(val));

    const matchesSearch = !globalSearch || row.textContent.toLowerCase().includes(globalSearch);

    if (!shouldExclude && matchesSearch) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });

  // ✅ Restore correct format: filtered / total
  const countDisplay = document.getElementById('countDisplay');
  countDisplay.textContent = `${visibleCount}/${totalCount}`;
  countDisplay.style.display = totalCount > 0 ? 'block' : 'none';
}


let pdfDoc1 = null, pdfDoc2 = null;

async function loadPdfToCanvas(file, canvasId) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async function () {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(reader.result) });
      const pdf = await loadingTask.promise;
      if (canvasId === "pdfCanvas1") pdfDoc1 = pdf;
      else pdfDoc2 = pdf;
      resolve();
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// async function renderPdfPageWithHighlight(pdfDoc, pageNum, canvasId, x, y, width, height) {
//   const page = await pdfDoc.getPage(pageNum);
//   const viewport = page.getViewport({ scale: 1.5 });
//   const canvas = document.getElementById(canvasId);
//   const ctx = canvas.getContext("2d");
//   canvas.height = viewport.height;
//   canvas.width = viewport.width;

//   await page.render({ canvasContext: ctx, viewport }).promise;

//   // Draw highlight
//   if (x != null && y != null) {
//     const scale = viewport.scale || 1.5;
//     ctx.strokeStyle = 'red';
//     ctx.lineWidth = 2;
//     ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
//   }
// }

async function renderPdfPageWithHighlight(pdfDoc, pageNum, canvasId, x, y, width, height) {
  const page = await pdfDoc.getPage(pageNum);
  const scale = 1.5;
  const viewport = page.getViewport({ scale });
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: ctx, viewport }).promise;

  if (x != null && y != null) {
    // Draw red box on canvas
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
  }
}