
const DB_KEY = "keuanganku_transactions_v1";

const Database = {
  getAll() {
    try {
      const data = localStorage.getItem(DB_KEY);
      const parsed = data ? JSON.parse(data) : [];

      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item =>
        item &&
        typeof item.id === "string" &&
        ["income", "expense"].includes(item.type) &&
        Number.isSafeInteger(item.amount) &&
        item.amount > 0 &&
        typeof item.date === "string"
      );
    } catch (error) {
      console.error("Gagal membaca data:", error);
      return [];
    }
  },

  saveAll(transactions) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(transactions));
      return true;
    } catch (error) {
      console.error("Gagal menyimpan data:", error);
      alert("Data gagal disimpan. Periksa ruang penyimpanan perangkat.");
      return false;
    }
  },

  add(transaction) {
    const transactions = this.getAll();
    transactions.push(transaction);
    return this.saveAll(transactions);
  },

  update(id, changes) {
    const transactions = this.getAll();
    const index = transactions.findIndex(item => item.id === id);

    if (index === -1) return false;

    const updated = { ...transactions[index], ...changes };
    if (
      !["income", "expense"].includes(updated.type) ||
      !Number.isSafeInteger(updated.amount) ||
      updated.amount <= 0 ||
      !updated.date
    ) {
      return false;
    }

    transactions[index] = updated;
    return this.saveAll(transactions);
  },

  remove(id) {
    const transactions = this.getAll();
    return this.saveAll(transactions.filter(item => item.id !== id));
  },

  clear() {
    try {
      localStorage.removeItem(DB_KEY);
      return true;
    } catch (error) {
      alert("Data gagal dihapus.");
      return false;
    }
  }
};
