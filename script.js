
const $ = id => document.getElementById(id);

const rupiah = amount =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount);

const today = new Date();
const localDate = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0")
].join("-");

const currentMonth = localDate.slice(0, 7);

$("date").value = localDate;
$("monthFilter").value = currentMonth;
$("reportMonth").value = currentMonth;

let transactions = Database.getAll();
let netSalaryValue = 0;

function monthOf(date) {
  return date.slice(0, 7);
}

function monthTransactions(month) {
  return transactions.filter(t => monthOf(t.date) === month);
}

function totals(items) {
  return items.reduce((result, item) => {
    if (item.type === "income") {
      result.income += item.amount;
    } else {
      result.expense += item.amount;
    }
    return result;
  }, { income: 0, expense: 0 });
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function syncData() {
  transactions = Database.getAll();
  renderAll();
}

function renderDashboard() {
  const month = $("monthFilter").value || currentMonth;
  const summary = totals(monthTransactions(month));

  const all = totals(transactions);
  $("totalBalance").textContent =
    rupiah(all.income - all.expense);
  $("totalIncome").textContent = rupiah(summary.income);
  $("totalExpense").textContent = rupiah(summary.expense);

  const recent = [...transactions]
    .sort((a, b) =>
      b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    )
    .slice(0, 5);

  renderTransactions($("recentTransactions"), recent, false);
}

function renderTransactions(container, items, allowDelete) {
  if (items.length === 0) {
    container.innerHTML =
      '<div class="empty-state">Belum ada transaksi.</div>';
    return;
  }

  container.innerHTML = items.map(item => {
    const isIncome = item.type === "income";
    const sign = isIncome ? "+" : "-";
    const color = isIncome ? "positive" : "negative";
    const icon = isIncome ? "↙" : "↗";

    return `
      <article class="transaction">
        <div class="tx-icon">${icon}</div>
        <div class="tx-details">
          <strong>${safeText(item.category)}</strong>
          <small>${safeText(item.description || "Tanpa keterangan")}</small>
          <small>${safeText(item.date)}</small>
        </div>
        <div class="tx-right">
          <strong class="tx-amount ${color}">
            ${sign}${rupiah(item.amount)}
          </strong>
          ${allowDelete ? `
            <div>
              <button class="delete-btn"
                data-delete="${safeText(item.id)}">
                Hapus
              </button>
              <button class="delete-btn"
                data-edit="${safeText(item.id)}">
                Edit
              </button>
            </div>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function renderTransactionPage() {
  const filter = $("listFilter").value;
  let items = [...transactions];

  if (filter !== "all") {
    items = items.filter(t => t.type === filter);
  }

  items.sort((a, b) =>
    b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
  );

  renderTransactions($("allTransactions"), items, true);
}

function renderReport() {
  const month = $("reportMonth").value || currentMonth;
  const items = monthTransactions(month);
  const summary = totals(items);
  const net = summary.income - summary.expense;

  $("reportIncome").textContent = rupiah(summary.income);
  $("reportExpense").textContent = rupiah(summary.expense);
  $("reportNet").textContent = rupiah(net);
  $("reportNet").className = net < 0 ? "negative" : "positive";

  $("reportNote").textContent = items.length
    ? `${items.length} transaksi tercatat pada bulan ini.`
    : "Belum ada transaksi pada bulan yang dipilih.";

  const categories = {};

  items.forEach(item => {
    const key = `${item.type}:${item.category}`;
    categories[key] = (categories[key] || 0) + item.amount;
  });

  const entries = Object.entries(categories);

  $("categoryReport").innerHTML = entries.length
    ? entries.map(([key, amount]) => {
        const [type, category] = key.split(":");
        const label = type === "income"
          ? "Pemasukan"
          : "Pengeluaran";

        return `
          <div class="report-row">
            <span>${safeText(category)} (${label})</span>
            <strong>${rupiah(amount)}</strong>
          </div>
        `;
      }).join("")
    : '<p class="muted">Belum ada rincian kategori.</p>';
}

function renderAll() {
  renderDashboard();
  renderTransactionPage();
  renderReport();
}

function showPage(pageName) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageName);
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

$("type").addEventListener("change", () => {
  const category = $("category");
  const oldValue = category.value;

  const options = $("type").value === "income"
    ? ["Gaji", "Penjualan", "Bonus", "Lainnya"]
    : [
        "Modal usaha",
        "Makanan",
        "Transportasi",
        "Belanja",
        "Tagihan",
        "Operasional usaha",
        "Lainnya"
      ];

  category.innerHTML = options.map(option =>
    `<option>${safeText(option)}</option>`
  ).join("");

  if (options.includes(oldValue)) category.value = oldValue;
});

$("transactionForm").addEventListener("submit", event => {
  event.preventDefault();

  const amount = Number($("amount").value);
  const date = $("date").value;

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !date ||
    date > "9999-12-31"
  ) {
    alert("Masukkan nominal dan tanggal yang valid.");
    return;
  }

  const transaction = {
    id: crypto.randomUUID(),
    type: $("type").value,
    amount,
    category: $("category").value,
    description: $("description").value.trim(),
    date
  };

  if (!Database.add(transaction)) return;

  $("amount").value = "";
  $("description").value = "";
  $("date").value = localDate;

  syncData();
  alert("Transaksi berhasil disimpan.");
  showPage("dashboard");
});

$("allTransactions").addEventListener("click", event => {
  const deleteButton = event.target.closest("[data-delete]");
  const editButton = event.target.closest("[data-edit]");

  if (deleteButton) {
    const id = deleteButton.dataset.delete;

    if (!confirm("Hapus transaksi ini?")) return;

    if (Database.remove(id)) syncData();
  }

  if (editButton) {
    const id = editButton.dataset.edit;
    const item = transactions.find(t => t.id === id);
    if (!item) return;

    const newAmount = prompt(
      "Masukkan nominal baru:",
      String(item.amount)
    );
    if (newAmount === null) return;

    const amount = Number(newAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      alert("Nominal tidak valid.");
      return;
    }

    const newDescription = prompt(
      "Masukkan keterangan baru:",
      item.description || ""
    );
    if (newDescription === null) return;

    if (Database.update(id, {
      amount,
      description: newDescription.trim()
    })) {
      syncData();
      alert("Transaksi berhasil diperbarui.");
    }
  }
});

$("monthFilter").addEventListener("change", renderDashboard);
$("reportMonth").addEventListener("change", renderReport);
$("listFilter").addEventListener("change", renderTransactionPage);

$("salaryForm").addEventListener("submit", event => {
  event.preventDefault();

  const base = Number($("baseSalary").value);
  const bonus = Number($("bonus").value);
  const deduction = Number($("deduction").value);

  if (![base, bonus, deduction].every(value =>
    Number.isSafeInteger(value) && value >= 0
  )) {
    alert("Masukkan nominal gaji yang valid.");
    return;
  }

  netSalaryValue = base + bonus - deduction;
  $("netSalary").textContent = rupiah(netSalaryValue);
});

$("saveSalary").addEventListener("click", () => {
  if (!Number.isSafeInteger(netSalaryValue) || netSalaryValue <= 0) {
    alert("Hitung gaji terlebih dahulu. Nilai harus lebih dari Rp0.");
    return;
  }

  if (!confirm(
    `Simpan pemasukan gaji sebesar ${rupiah(netSalaryValue)}?`
  )) return;

  if (!Database.add({
    id: crypto.randomUUID(),
    type: "income",
    amount: netSalaryValue,
    category: "Gaji",
    description: "Gaji bersih bulanan",
    date: localDate
  })) return;

  syncData();
  alert("Gaji berhasil dicatat sebagai pemasukan.");
});

$("exportBtn").addEventListener("click", () => {
  const month = $("reportMonth").value || currentMonth;
  const items = monthTransactions(month);

  if (!items.length) {
    alert("Tidak ada transaksi untuk diekspor.");
    return;
  }

  const escapeCSV = value =>
    '"' + String(value ?? "").replace(/"/g, '""') + '"';

  const rows = [
    ["Tanggal", "Jenis", "Kategori", "Keterangan", "Nominal"],
    ...items.map(item => [
      item.date,
      item.type === "income" ? "Pemasukan" : "Pengeluaran",
      item.category,
      item.description,
      item.amount
    ])
  ];

  const csv = "\uFEFF" + rows
    .map(row => row.map(escapeCSV).join(","))
    .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `laporan-keuangan-${month}.csv`;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm(
    "Hapus SEMUA data transaksi di perangkat ini? Tindakan ini tidak bisa dibatalkan."
  )) return;

  if (Database.clear()) {
    syncData();
    alert("Data transaksi telah dihapus.");
  }
});

renderAll();
