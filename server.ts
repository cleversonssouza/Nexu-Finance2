import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: "supabase" });
  });

  // API Routes
  
  // Income
  app.get("/api/income", async (req, res) => {
    const { month, year } = req.query;
    let query = supabase.from('income').select('*');
    
    if (month && year) {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/income", async (req, res) => {
    const { description, category, amount, date, is_recurring } = req.body;
    const { data, error } = await supabase
      .from('income')
      .insert([{ description, category, amount, date, is_recurring: is_recurring ? 1 : 0 }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
  });

  app.delete("/api/income/:id", async (req, res) => {
    const { error } = await supabase.from('income').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.sendStatus(204);
  });

  app.patch("/api/income/:id", async (req, res) => {
    const { amount, description, category, date } = req.body;
    const { error } = await supabase
      .from('income')
      .update({ amount, description, category, date })
      .eq('id', req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.sendStatus(204);
  });

  // Expenses
  app.get("/api/expenses", async (req, res) => {
    const { month, year } = req.query;
    let query = supabase.from('expenses').select('*');
    
    if (month && year) {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      query = query.gte('due_date', startDate).lte('due_date', endDate);
    }
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/expenses", async (req, res) => {
    const { description, category, amount_planned, due_date, is_recurring, notes } = req.body;
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ description, category, amount_planned, due_date, is_recurring: is_recurring ? 1 : 0, notes }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    const { status, amount_actual, amount_planned, description, category, due_date } = req.body;
    let updateData: any = {};
    if (status !== undefined || amount_actual !== undefined) {
      updateData = { status, amount_actual };
    } else {
      updateData = { amount_planned, description, category, due_date };
    }
    
    const { error } = await supabase.from('expenses').update(updateData).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.sendStatus(204);
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    const { error } = await supabase.from('expenses').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.sendStatus(204);
  });

  // Credit Cards
  app.get("/api/cards", async (req, res) => {
    const { data, error } = await supabase.from('credit_cards').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/cards", async (req, res) => {
    const { name, credit_limit, closing_day, due_day } = req.body;
    const { data, error } = await supabase
      .from('credit_cards')
      .insert([{ name, credit_limit, closing_day, due_day }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
  });

  app.get("/api/cards/:id/transactions", async (req, res) => {
    const { month, year, buyer_type } = req.query;
    let query = supabase.from('card_transactions').select('*').eq('card_id', req.params.id);
    
    if (buyer_type && buyer_type !== 'all') {
      query = query.eq('buyer_type', buyer_type);
    }
    
    if (month && year) {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/cards/:id/transactions", async (req, res) => {
    const { description, amount, date, installments_total, buyer_type, third_party_name } = req.body;
    const { data, error } = await supabase
      .from('card_transactions')
      .insert([{ 
        card_id: req.params.id, 
        description, 
        amount, 
        date, 
        installments_total: installments_total || 1, 
        buyer_type: buyer_type || 'user', 
        third_party_name 
      }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
  });

  app.delete("/api/card_transactions/:id", async (req, res) => {
    const { error } = await supabase.from('card_transactions').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.sendStatus(204);
  });

  // Third Party Debts
  app.get("/api/debts", async (req, res) => {
    const { data, error } = await supabase.from('third_party_debts').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/debts", async (req, res) => {
    const { person_name, amount, date, origin } = req.body;
    const { data, error } = await supabase
      .from('third_party_debts')
      .insert([{ person_name, amount, date, origin }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
  });

  app.patch("/api/debts/:id", async (req, res) => {
    const { status, amount, person_name, origin, date } = req.body;
    let updateData: any = {};
    if (status !== undefined) {
      updateData = { status };
    } else {
      updateData = { amount, person_name, origin, date };
    }
    
    const { error } = await supabase.from('third_party_debts').update(updateData).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.sendStatus(204);
  });

  // Dashboard Summary
  app.get("/api/summary", async (req, res) => {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: "Month and year required" });
    
    const m = month.toString().padStart(2, '0');
    const y = year.toString();
    const startDate = `${y}-${m}-01`;
    const endDate = `${y}-${m}-31`;

    try {
      // Income
      const { data: incomeData, error: incomeErr } = await supabase
        .from('income')
        .select('amount')
        .gte('date', startDate)
        .lte('date', endDate);
      
      const totalIncome = (incomeData || []).reduce((sum, item) => sum + (item.amount || 0), 0);

      // Expenses
      const { data: expenseData, error: expenseErr } = await supabase
        .from('expenses')
        .select('amount_planned, amount_actual, status')
        .gte('due_date', startDate)
        .lte('due_date', endDate);
      
      const totalExpensesTable = (expenseData || []).reduce((sum, item) => sum + (item.amount_planned || 0), 0);
      const paidExpenses = (expenseData || []).filter(i => i.status === 'paid').reduce((sum, item) => sum + (item.amount_actual || 0), 0);

      // Card Transactions
      const { data: cardData, error: cardErr } = await supabase
        .from('card_transactions')
        .select('amount, installments_total, buyer_type')
        .gte('date', startDate)
        .lte('date', endDate);
      
      const personalCardExpenses = (cardData || [])
        .filter(i => i.buyer_type === 'user')
        .reduce((sum, item) => sum + ((item.amount || 0) / (item.installments_total || 1)), 0);

      const cardTotal = (cardData || [])
        .reduce((sum, item) => sum + ((item.amount || 0) / (item.installments_total || 1)), 0);

      const totalExpenses = totalExpensesTable + personalCardExpenses;

      res.json({
        totalIncome,
        totalExpenses,
        paidExpenses,
        cardTotal,
        balance: totalIncome - totalExpenses
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
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
