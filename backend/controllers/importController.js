const { Transaction, Category } = require('../models');

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseAIBDate(str) {
  const parts = str.trim().split('/');
  if (parts.length !== 3) throw new Error(`Formato de data inválido: ${str}`);
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseCreditCard(lines, header) {
  function col(...regexes) {
    for (const rx of regexes) {
      const i = header.findIndex(h => rx.test(h));
      if (i !== -1) return i;
    }
    return null;
  }

  const iProcessed  = col(/^processed$/);
  const iDescription = col(/^description$/, /merchant.name/, /merchant.desc/, /description/, /merchant/, /narrative/);
  const iPaidOut    = col(/^paid.?out$/);
  const iPaidIn     = col(/^paid.?in$/);
  const iAIBCat     = col(/^category$/);
  const iTransType  = col(/transaction.?type/);

  if (iProcessed === null || iPaidOut === null || iPaidIn === null) {
    throw new Error(
      'Formato não reconhecido. Colunas esperadas: "Processed", "Paid out", "Paid in"'
    );
  }

  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const dateStr = cols[iProcessed];
    if (!dateStr) continue;

    const paidOut = parseFloat((cols[iPaidOut] || '').replace(/,/g, '')) || 0;
    const paidIn  = parseFloat((cols[iPaidIn]  || '').replace(/,/g, '')) || 0;
    if (!paidOut && !paidIn) continue;

    const rawDesc   = (iDescription !== null ? cols[iDescription] || '' : '').trim();
    const transType = (iTransType   !== null ? cols[iTransType]   || '' : '').trim();
    const description = (rawDesc || transType || 'AIB Transaction').slice(0, 200);
    const aibCategory = (iAIBCat !== null ? cols[iAIBCat] || '' : '').trim().toLowerCase();

    try {
      transactions.push({
        date:        parseAIBDate(dateStr),
        type:        paidOut > 0 ? 'expense' : 'income',
        amount:      paidOut > 0 ? paidOut : paidIn,
        description,
        aibCategory,
      });
    } catch { /* skip rows with invalid dates */ }
  }
  return { transactions, format: 'credit_card', iDescription };
}

function parseCurrentAccount(lines, header) {
  function col(...regexes) {
    for (const rx of regexes) {
      const i = header.findIndex(h => rx.test(h));
      if (i !== -1) return i;
    }
    return null;
  }

  const iDate   = col(/posted.transactions.date/, /transaction.date/);
  const iDesc1  = col(/description.?1/, /desc.?1/);
  const iDesc2  = col(/description.?2/, /desc.?2/);
  const iDesc3  = col(/description.?3/, /desc.?3/);
  const iDebit  = col(/debit.amount/, /debit/);
  const iCredit = col(/credit.amount/, /credit/);

  if (iDate === null || iDebit === null || iCredit === null) {
    throw new Error(
      'Formato não reconhecido. Colunas esperadas: "Posted Transactions Date", "Debit Amount", "Credit Amount"'
    );
  }

  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const dateStr = cols[iDate];
    if (!dateStr) continue;

    const debit  = parseFloat((cols[iDebit]  || '').replace(/,/g, '')) || 0;
    const credit = parseFloat((cols[iCredit] || '').replace(/,/g, '')) || 0;
    if (!debit && !credit) continue;

    const descParts = [
      iDesc1 !== null ? (cols[iDesc1] || '') : '',
      iDesc2 !== null ? (cols[iDesc2] || '') : '',
      iDesc3 !== null ? (cols[iDesc3] || '') : '',
    ].map(s => s.trim()).filter(Boolean);

    const description = descParts.join(' ').slice(0, 200) || 'AIB Transaction';

    try {
      transactions.push({
        date:        parseAIBDate(dateStr),
        type:        debit > 0 ? 'expense' : 'income',
        amount:      debit > 0 ? debit : credit,
        description,
        aibCategory: '',
      });
    } catch { /* skip rows with invalid dates */ }
  }
  return { transactions, format: 'current_account' };
}

function parseAIBCSV(csvText) {
  let text = csvText;
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('O ficheiro CSV não tem linhas de dados');

  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const isCreditCard = header.some(h => /^processed$/.test(h)) && header.some(h => /^paid.?out$/.test(h));

  if (isCreditCard) return parseCreditCard(lines, header);
  return parseCurrentAccount(lines, header);
}

const AIB_CAT_MAP = {
  'travel & transportation': ['transport', 'travel', 'transportation', 'commute'],
  'shopping':                ['shopping', 'groceries', 'grocery', 'supermarket'],
  'leisure & entertainment': ['entertainment', 'leisure', 'dining', 'restaurants', 'eating out', 'food'],
  'household & home':        ['household', 'home', 'housing', 'furniture'],
  'fees and charges':        ['fees', 'charges', 'banking', 'bank'],
  'interest':                ['fees', 'charges', 'banking', 'bank'],
  'bill payment':            ['bills', 'utilities', 'subscriptions'],
  'health & beauty':         ['health', 'healthcare', 'medical', 'pharmacy'],
};

const KEYWORD_MAP = [
  { patterns: ['lidl', 'aldi', 'tesco', 'dunnes', 'supervalu', 'spar', 'centra', 'supermarket'], names: ['groceries', 'grocery', 'supermarket', 'food', 'shopping'] },
  { patterns: ['mcdonald', 'kfc', 'burger king', 'pizza', 'restaurant', 'cafe', 'coffee', 'starbucks', 'subway', 'deliveroo', 'just eat', 'takeaway', 'apache pizza'], names: ['dining', 'food', 'restaurants', 'eating out', 'leisure'] },
  { patterns: ['uber', 'lyft', 'bus', 'dart', 'luas', 'irish rail', 'iarnrod', 'taxi', 'parking', 'navigo'], names: ['transport', 'transportation', 'travel', 'commute'] },
  { patterns: ['shell', 'bp', 'circle k', 'topaz', 'applegreen', 'texaco', 'maxol'], names: ['fuel', 'petrol', 'gas'] },
  { patterns: ['electric ireland', 'bord gais', 'eir ', 'vodafone', 'three', 'sky ', 'virgin media'], names: ['utilities', 'bills'] },
  { patterns: ['pharmacy', 'boots', 'lloyds', 'dentist', 'doctor', 'gp ', 'medical'], names: ['health', 'healthcare', 'medical'] },
  { patterns: ['netflix', 'spotify', 'disney', 'amazon', 'cinema', 'odeon', 'vue', 'euro disney'], names: ['entertainment', 'subscriptions', 'leisure'] },
  { patterns: ['salary', 'wages', 'payroll', 'pay '], names: ['salary', 'income', 'wages'] },
  { patterns: ['rent', 'landlord', 'letting'], names: ['rent', 'housing'] },
  { patterns: ['interest on'], names: ['fees', 'charges', 'banking', 'bank'] },
  { patterns: ['overlimit fee', 'direct debit'], names: ['fees', 'charges', 'bills', 'banking'] },
];

function suggestCategory(description, type, categories, aibCategory = '') {
  const desc = description.toLowerCase();
  const typeCats = categories.filter(c => c.type === type);

  if (aibCategory) {
    const names = AIB_CAT_MAP[aibCategory] || [];
    const match = typeCats.find(c =>
      names.some(n => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()))
    );
    if (match) return match.id;
  }

  for (const { patterns, names } of KEYWORD_MAP) {
    if (patterns.some(p => desc.includes(p))) {
      const match = typeCats.find(c =>
        names.some(n => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()))
      );
      if (match) return match.id;
    }
  }

  for (const cat of typeCats) {
    if (desc.includes(cat.name.toLowerCase())) return cat.id;
  }

  return typeCats[0]?.id || null;
}

exports.parseAIBCSV = parseAIBCSV;
exports.suggestCategory = suggestCategory;

exports.preview = async (req, res) => {
  try {
    const { csvText } = req.body;
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ message: 'Nenhum dado CSV recebido' });
    }

    let result;
    try {
      result = parseAIBCSV(csvText);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const { transactions: parsed, format } = result;

    if (parsed.length === 0) {
      return res.status(400).json({ message: 'Nenhuma transação encontrada no ficheiro CSV' });
    }

    const categories = await Category.findAll({ where: { userId: req.user.id } });

    const transactions = parsed.map((t, i) => ({
      ...t,
      categoryId: suggestCategory(t.description, t.type, categories, t.aibCategory) || '',
      _row: i,
    }));

    res.json({ transactions, categories, format });
  } catch (err) {
    console.error('import preview:', err);
    res.status(500).json({ message: 'Falha ao processar o ficheiro CSV' });
  }
};

exports.confirm = async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ message: 'Nenhuma transação para importar' });
    }

    for (const t of transactions) {
      if (!t.categoryId) return res.status(400).json({ message: 'Todas as transações precisam de uma categoria' });
      if (!['income', 'expense'].includes(t.type)) return res.status(400).json({ message: 'Tipo de transação inválido' });
      if (!t.amount || isNaN(Number(t.amount))) return res.status(400).json({ message: 'Valor inválido' });
      if (!t.date) return res.status(400).json({ message: 'Data é obrigatória' });
      if (!t.description) return res.status(400).json({ message: 'Descrição é obrigatória' });
    }

    const catIds = [...new Set(transactions.map(t => t.categoryId))];
    const validCats = await Category.findAll({ where: { id: catIds, userId: req.user.id } });
    if (validCats.length !== catIds.length) {
      return res.status(400).json({ message: 'Uma ou mais categorias são inválidas' });
    }

    const toCreate = [];
    let skipped = 0;

    for (const t of transactions) {
      const exists = await Transaction.findOne({
        where: {
          userId: req.user.id,
          date: t.date,
          description: t.description,
          type: t.type,
          amount: parseFloat(t.amount),
        },
        attributes: ['id'],
      });

      if (exists) {
        skipped++;
      } else {
        toCreate.push({
          userId: req.user.id,
          categoryId: t.categoryId,
          type: t.type,
          amount: parseFloat(t.amount),
          description: String(t.description).slice(0, 200),
          date: t.date,
          notes: null,
          isRecurring: false,
          recurringFrequency: null,
          recurringEndDate: null,
          recurringGroupId: null,
        });
      }
    }

    if (toCreate.length > 0) await Transaction.bulkCreate(toCreate);

    res.json({
      imported: toCreate.length,
      skipped,
      message:
        `${toCreate.length} transação(ões) importada(s)` +
        (skipped > 0 ? `, ${skipped} duplicada(s) ignorada(s)` : ''),
    });
  } catch (err) {
    console.error('import confirm:', err);
    res.status(500).json({ message: 'Falha ao importar transações' });
  }
};
