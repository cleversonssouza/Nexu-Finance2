import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("nexu_finance.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    is_recurring INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount_planned REAL NOT NULL,
    amount_actual REAL,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'paid', 'pending'
    is_recurring INTEGER DEFAULT 0,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS credit_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    credit_limit REAL NOT NULL,
    closing_day INTEGER NOT NULL,
    due_day INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS card_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    installments_total INTEGER DEFAULT 1,
    installment_current INTEGER DEFAULT 1,
    buyer_type TEXT DEFAULT 'user', -- 'user', 'third_party'
    third_party_name TEXT,
    FOREIGN KEY (card_id) REFERENCES credit_cards(id)
  );

  CREATE TABLE IF NOT EXISTS third_party_debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    origin TEXT,
    status TEXT DEFAULT 'pending' -- 'received', 'pending'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Income
  app.get("/api/income", (req, res) => {
    const { month, year } = req.query;
    let query = "SELECT * FROM income";
    const params = [];
    if (month && year) {
      query += " WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?";
      params.push(month.toString().padStart(2, '0'), year.toString());
    }
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  });

  app.post("/api/income", (req, res) => {
    const { description, category, amount, date, is_recurring } = req.body;
    const info = db.prepare(
      "INSERT INTO income (description, category, amount, date, is_recurring) VALUES (?, ?, ?, ?, ?)"
    ).run(description, category, amount, date, is_recurring ? 1 : 0);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/income/:id", (req, res) => {
    db.prepare("DELETE FROM income WHERE id = ?").run(req.params.id);
    res.sendStatus(204);
  });

  app.patch("/api/income/:id", (req, res) => {
    const { amount, description, category, date } = req.body;
    db.prepare("UPDATE income SET amount = ?, description = ?, category = ?, date = ? WHERE id = ?")
      .run(amount, description, category, date, req.params.id);
    res.sendStatus(204);
  });

  // Expenses
  app.get("/api/expenses", (req, res) => {
    const { month, year } = req.query;
    let query = "SELECT * FROM expenses";
    const params = [];
    if (month && year) {
      query += " WHERE strftime('%m', due_date) = ? AND strftime('%Y', due_date) = ?";
      params.push(month.toString().padStart(2, '0'), year.toString());
    }
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  });

  app.post("/api/expenses", (req, res) => {
    const { description, category, amount_planned, due_date, is_recurring, notes } = req.body;
    const info = db.prepare(
      "INSERT INTO expenses (description, category, amount_planned, due_date, is_recurring, notes) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(description, category, amount_planned, due_date, is_recurring ? 1 : 0, notes);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/expenses/:id", (req, res) => {
    const { status, amount_actual, amount_planned, description, category, due_date } = req.body;
    if (status !== undefined || amount_actual !== undefined) {
      db.prepare("UPDATE expenses SET status = ?, amount_actual = ? WHERE id = ?")
        .run(status, amount_actual, req.params.id);
    } else {
      db.prepare("UPDATE expenses SET amount_planned = ?, description = ?, category = ?, due_date = ? WHERE id = ?")
        .run(amount_planned, description, category, due_date, req.params.id);
    }
    res.sendStatus(204);
  });

  app.delete("/api/expenses/:id", (req, res) => {
    db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
    res.sendStatus(204);
  });

  // Credit Cards
  app.get("/api/cards", (req, res) => {
    const cards = db.prepare("SELECT * FROM credit_cards").all();
    res.json(cards);
  });

  app.post("/api/cards", (req, res) => {
    const { name, credit_limit, closing_day, due_day } = req.body;
    const info = db.prepare(
      "INSERT INTO credit_cards (name, credit_limit, closing_day, due_day) VALUES (?, ?, ?, ?)"
    ).run(name, credit_limit, closing_day, due_day);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/cards/:id/transactions", (req, res) => {
    const { month, year, buyer_type } = req.query;
    let query = "SELECT * FROM card_transactions WHERE card_id = ?";
    const params: any[] = [req.params.id];
    
    if (buyer_type && buyer_type !== 'all') {
      query += " AND buyer_type = ?";
      params.push(buyer_type);
    }
    
    if (month && year) {
      // Simple month/year filtering for now
      query += " AND strftime('%m', date) = ? AND strftime('%Y', date) = ?";
      params.push(month.toString().padStart(2, '0'), year.toString());
    }
    
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  });

  app.post("/api/cards/:id/transactions", (req, res) => {
    const { description, amount, date, installments_total, buyer_type, third_party_name } = req.body;
    const info = db.prepare(
      "INSERT INTO card_transactions (card_id, description, amount, date, installments_total, buyer_type, third_party_name) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(req.params.id, description, amount, date, installments_total || 1, buyer_type || 'user', third_party_name);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/card_transactions/:id", (req, res) => {
    db.prepare("DELETE FROM card_transactions WHERE id = ?").run(req.params.id);
    res.sendStatus(204);
  });

  // Third Party Debts
  app.get("/api/debts", (req, res) => {
    const rows = db.prepare("SELECT * FROM third_party_debts").all();
    res.json(rows);
  });

  app.post("/api/debts", (req, res) => {
    const { person_name, amount, date, origin } = req.body;
    const info = db.prepare(
      "INSERT INTO third_party_debts (person_name, amount, date, origin) VALUES (?, ?, ?, ?)"
    ).run(person_name, amount, date, origin);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/debts/:id", (req, res) => {
    const { status, amount, person_name, origin, date } = req.body;
    if (status !== undefined) {
      db.prepare("UPDATE third_party_debts SET status = ? WHERE id = ?").run(status, req.params.id);
    } else {
      db.prepare("UPDATE third_party_debts SET amount = ?, person_name = ?, origin = ?, date = ? WHERE id = ?")
        .run(amount, person_name, origin, date, req.params.id);
    }
    res.sendStatus(204);
  });

  // Dashboard Summary
  app.get("/api/summary", (req, res) => {
    const { month, year } = req.query;
    const m = month.toString().padStart(2, '0');
    const y = year.toString();

    const totalIncome = db.prepare("SELECT SUM(amount) as total FROM income WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?").get(m, y).total || 0;
    const totalExpensesTable = db.prepare("SELECT SUM(amount_planned) as total FROM expenses WHERE strftime('%m', due_date) = ? AND strftime('%Y', due_date) = ?").get(m, y).total || 0;
    const paidExpenses = db.prepare("SELECT SUM(amount_actual) as total FROM expenses WHERE strftime('%m', due_date) = ? AND strftime('%Y', due_date) = ? AND status = 'paid'").get(m, y).total || 0;
    
    // Personal card transactions for the month
    const personalCardExpenses = db.prepare(`
      SELECT SUM(amount / installments_total) as total 
      FROM card_transactions 
      WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
      AND buyer_type = 'user'
    `).get(m, y).total || 0;

    // Total card bill (all transactions)
    const cardTotal = db.prepare(`
      SELECT SUM(amount / installments_total) as total 
      FROM card_transactions 
      WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
    `).get(m, y).total || 0;

    const totalExpenses = totalExpensesTable + personalCardExpenses;

    res.json({
      totalIncome,
      totalExpenses,
      paidExpenses,
      cardTotal,
      balance: totalIncome - totalExpenses
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
