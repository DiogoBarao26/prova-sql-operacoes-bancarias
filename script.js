/* ==========================================================================
   Prova prática de SQL — operações bancárias
   Aplicação 100% no navegador. O SQL não é executado em banco nenhum.

   Organização:
   1. Esquema fictício
   2. Normalização e leitura do SQL
   3. Banco de questões (professores: editem o array QUESTOES)
   4. Correção, nota e diagnóstico
   5. Estado local
   6. Interface
   ========================================================================== */

const VERSAO_BANCO = 1;
const CHAVE_ARMAZENAMENTO = "prova-sql-operacoes-bancarias-v1";
const PONTOS_QUESTAO = 100;

const PALAVRAS_RESERVADAS = new Set([
  "select", "from", "where", "and", "or", "not", "order", "by", "limit",
  "group", "having", "inner", "left", "right", "full", "cross", "outer",
  "join", "on", "as", "asc", "desc", "distinct", "between", "in", "like",
  "ilike", "is", "null", "count", "sum", "avg", "max", "min", "top",
  "fetch", "first", "next", "rows", "only", "offset", "using", "all",
  "case", "when", "then", "else", "end", "union", "insert", "update",
  "delete", "into", "values", "set", "create", "table", "drop", "alter",
  "truncate", "grant", "revoke", "primary", "key", "foreign", "references",
  "true", "false", "exists", "any", "some", "with", "over", "partition"
]);

const ESQUEMA = [
  {
    nome: "clientes",
    descricao: "Pessoas cadastradas no banco.",
    colunas: [
      ["id_cliente", "PK"],
      ["nome", "texto"],
      ["cpf", "fictício"],
      ["cidade", "texto"],
      ["idade", "número"]
    ]
  },
  {
    nome: "contas",
    descricao: "Contas correntes e poupanças.",
    colunas: [
      ["id_conta", "PK"],
      ["id_cliente", "FK"],
      ["tipo_conta", "texto"],
      ["saldo", "número"],
      ["status", "texto"],
      ["data_abertura", "data"]
    ]
  },
  {
    nome: "transacoes",
    descricao: "Movimentações financeiras das contas.",
    colunas: [
      ["id_transacao", "PK"],
      ["id_conta", "FK"],
      ["tipo", "texto"],
      ["valor", "número"],
      ["data_transacao", "data"],
      ["status", "texto"]
    ]
  },
  {
    nome: "agencias",
    descricao: "Agências do banco.",
    colunas: [
      ["id_agencia", "PK"],
      ["nome_agencia", "texto"],
      ["cidade", "texto"]
    ]
  },
  {
    nome: "emprestimos",
    descricao: "Contratos de crédito dos clientes.",
    colunas: [
      ["id_emprestimo", "PK"],
      ["id_cliente", "FK"],
      ["valor", "número"],
      ["taxa", "número"],
      ["status", "texto"],
      ["data_contratacao", "data"]
    ]
  },
  {
    nome: "clientes_agencias",
    descricao: "Vínculo entre clientes e agências.",
    colunas: [
      ["id_cliente", "FK"],
      ["id_agencia", "FK"]
    ]
  }
];

const RELACIONAMENTOS = [
  "contas.id_cliente referencia clientes.id_cliente",
  "transacoes.id_conta referencia contas.id_conta",
  "emprestimos.id_cliente referencia clientes.id_cliente",
  "clientes_agencias.id_cliente referencia clientes.id_cliente",
  "clientes_agencias.id_agencia referencia agencias.id_agencia"
];

const DOMINIO = [
  "contas.tipo_conta: 'corrente', 'poupanca'",
  "contas.status: 'ativa', 'bloqueada', 'encerrada'",
  "transacoes.tipo: 'PIX', 'deposito', 'saque', 'ted'",
  "transacoes.status: 'concluida', 'pendente', 'estornada'",
  "emprestimos.status: 'ativo', 'aprovado', 'quitado', 'recusado'"
];

const GRUPOS_DIAGNOSTICO = [
  { id: "fundamentos", nome: "Comandos fundamentais", itens: ["SELECT", "FROM", "WHERE", "ORDER BY", "LIMIT", "AS"] },
  { id: "logicos", nome: "Operadores lógicos", itens: ["AND", "OR", "NOT"] },
  { id: "filtros", nome: "Filtros", itens: ["BETWEEN", "IN", "LIKE"] },
  { id: "agregacoes", nome: "Agregações", itens: ["COUNT", "SUM", "AVG", "MAX", "MIN"] },
  { id: "agrupamento", nome: "GROUP BY / HAVING", itens: ["GROUP BY", "HAVING"] },
  { id: "relacionamentos", nome: "JOIN / PK / FK", itens: ["PK", "FK", "INNER JOIN", "LEFT JOIN"] }
];

const CONTEUDOS_OBRIGATORIOS = [
  "SELECT", "FROM", "WHERE", "ORDER BY", "LIMIT", "AS", "AND", "OR", "NOT",
  "BETWEEN", "IN", "LIKE", "COUNT", "SUM", "AVG", "MAX", "MIN", "GROUP BY",
  "HAVING", "PK", "FK", "INNER JOIN", "LEFT JOIN"
];

/* --------------------------------------------------------------------------
   Leitura do SQL — normaliza forma, não compara texto idêntico
   -------------------------------------------------------------------------- */

function escapeRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function canonizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizarSql(sql) {
  let texto = String(sql || "").replace(/\u00a0/g, " ");
  texto = texto.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n\r]*/g, " ");

  const literais = [];
  texto = texto.replace(/'(?:[^']|'')*'/g, (match) => {
    literais.push(canonizarTexto(match.slice(1, -1).replace(/''/g, "'")));
    return `__LIT${literais.length - 1}__`;
  });
  texto = texto.replace(/"([^"]*)"/g, (_, conteudo) => {
    if (/[%\s]/.test(conteudo)) {
      literais.push(canonizarTexto(conteudo));
      return `__LIT${literais.length - 1}__`;
    }
    return conteudo;
  });

  texto = texto.toLowerCase();
  texto = texto.replace(/[`;\[\]]/g, " ");
  texto = texto.replace(/<>/g, " != ");
  texto = texto.replace(/!=/g, " != ");
  texto = texto.replace(/>=/g, " >= ");
  texto = texto.replace(/<=/g, " <= ");
  texto = texto.replace(/([^\s<>=!])=([^\s=])/g, "$1 = $2");
  texto = texto.replace(/([^\s<>=!])>([^\s=])/g, "$1 > $2");
  texto = texto.replace(/([^\s<>=!])<([^\s=])/g, "$1 < $2");
  texto = texto.replace(/\s+/g, " ").trim();
  texto = texto.replace(/\s*,\s*/g, ", ");
  texto = texto.replace(/\s*\(\s*/g, "(").replace(/\s*\)\s*/g, ")");
  texto = texto.replace(/\)(?=[a-z_(])/g, ") ");
  texto = texto.replace(/__lit(\d+)__/g, (_, indice) => `'${literais[Number(indice)]}'`);
  return texto;
}

function resolverAliases(sql) {
  const mapa = {};
  const reAlias = /\b(?:from|join)\s+([a-z_][\w]*)(?:\s+as\s+([a-z_][\w]*)|\s+([a-z_][\w]*))?/g;
  let match;
  while ((match = reAlias.exec(sql))) {
    const tabela = match[1];
    const alias = match[2] || match[3];
    if (!alias || PALAVRAS_RESERVADAS.has(alias) || alias === tabela) continue;
    mapa[alias] = tabela;
  }

  let resolvido = sql;
  Object.keys(mapa)
    .sort((a, b) => b.length - a.length)
    .forEach((alias) => {
      resolvido = resolvido.replace(new RegExp(`\\b${alias}\\.`, "g"), `${mapa[alias]}.`);
    });

  resolvido = resolvido.replace(
    /\b(from|join)\s+([a-z_][\w]*)\s+as\s+([a-z_][\w]*)\b/g,
    "$1 $2"
  );
  resolvido = resolvido.replace(
    /\b(from|join)\s+([a-z_][\w]*)\s+([a-z_][\w]*)\b/g,
    (full, kw, tabela, alias) => (PALAVRAS_RESERVADAS.has(alias) ? full : `${kw} ${tabela}`)
  );
  return resolvido.replace(/\s+/g, " ").trim();
}

function extrairClausula(sql, marcador, fins) {
  const encontrado = new RegExp(`\\b${marcador}\\b`).exec(sql);
  if (!encontrado) return "";
  const inicio = encontrado.index + encontrado[0].length;
  let fim = sql.length;
  fins.forEach((fin) => {
    const regex = new RegExp(`\\b${fin}\\b`, "g");
    regex.lastIndex = inicio;
    const proximo = regex.exec(sql);
    if (proximo && proximo.index < fim) fim = proximo.index;
  });
  return sql.slice(inicio, fim).trim();
}

function dividirVirgulas(texto) {
  const partes = [];
  let atual = "";
  let nivel = 0;
  let aspas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const caractere = texto[i];
    if (caractere === "'") aspas = !aspas;
    if (!aspas) {
      if (caractere === "(") nivel += 1;
      else if (caractere === ")") nivel = Math.max(0, nivel - 1);
      else if (caractere === "," && nivel === 0) {
        partes.push(atual.trim());
        atual = "";
        continue;
      }
    }
    atual += caractere;
  }
  if (atual.trim()) partes.push(atual.trim());
  return partes;
}

function listaSelect(sql) {
  if (!/\bselect\b/.test(sql)) return [];
  let lista = extrairClausula(sql, "select", ["from"]);
  lista = lista.replace(/^(?:all\s+)?/, "").replace(/^(?:distinct\s+)?/, "").replace(/^(?:top\s+\d+\s+)?/, "");
  if (!lista) return [];
  return dividirVirgulas(lista);
}

function analisarSql(resposta) {
  const sql = resolverAliases(normalizarSql(resposta));
  return {
    sql,
    select: listaSelect(sql),
    where: extrairClausula(sql, "where", ["group by", "order by", "having", "limit"]),
    groupBy: extrairClausula(sql, "group by", ["having", "order by", "limit"]),
    having: extrairClausula(sql, "having", ["order by", "limit"]),
    orderBy: extrairClausula(sql, "order by", ["limit"]),
    from: extrairClausula(sql, "from", ["where", "group by", "order by", "having", "limit"])
  };
}

function comandoProibido(sql) {
  const semLiterais = sql.replace(/'[^']*'/g, "''");
  return /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/.test(semLiterais);
}

function usou(ctx, expressao) {
  return new RegExp(`\\b${expressao}\\b`).test(ctx.sql);
}

function tabelasDaConsulta(sql) {
  const conjunto = new Set();
  const from = extrairClausula(sql, "from", ["where", "group by", "order by", "having", "limit"]);
  const cabeca = from.split(/\b(?:inner|left|right|full|cross|outer|join)\b/)[0] || "";
  cabeca.split(",").forEach((parte) => {
    const nome = parte.trim().split(/\s+/)[0];
    if (nome && /^[a-z_][\w]*$/.test(nome) && !PALAVRAS_RESERVADAS.has(nome)) conjunto.add(nome);
  });
  const joins = /\bjoin\s+([a-z_][\w]*)/g;
  let match;
  while ((match = joins.exec(from))) {
    if (!PALAVRAS_RESERVADAS.has(match[1])) conjunto.add(match[1]);
  }
  return conjunto;
}

function temTabelas(ctx, tabelas) {
  const presentes = tabelasDaConsulta(ctx.sql);
  return tabelas.every((tabela) => presentes.has(tabela));
}

function nucleoSelect(item) {
  let base = item.trim().replace(/^(?:distinct\s+)/, "");
  base = base.replace(/\s+as\s+[a-z_][\w]*\s*$/, "");
  if (base.includes("(")) return base.replace(/\s+[a-z_][\w]*\s*$/, "").trim();
  const semAlias = base.replace(/\s+[a-z_][\w]*\s*$/, "");
  if (semAlias && semAlias !== base && /^(?:[a-z_][\w]*\.)?[a-z_][\w]*$/.test(semAlias)) return semAlias;
  return base;
}

function temCampos(ctx, campos) {
  return campos.every((campo) => ctx.select.some((item) => {
    const base = nucleoSelect(item);
    if (base.includes("(")) return false;
    return base === campo || base.endsWith(`.${campo}`);
  }));
}

function comparacaoTexto(trecho, campo, valor) {
  const coluna = `(?:\\w+\\.)?${campo}`;
  const literal = `'${escapeRegex(valor)}'`;
  return new RegExp(`${coluna}\\s*=\\s*${literal}`).test(trecho)
    || new RegExp(`${literal}\\s*=\\s*${coluna}\\b`).test(trecho)
    || new RegExp(`\\(\\s*${coluna}\\s*\\)\\s*=\\s*${literal}`).test(trecho);
}

function comparacaoNumero(trecho, campo, operador, numero) {
  const coluna = `(?:\\w+\\.)?${campo}`;
  const valor = `${numero}(?:\\.0+)?`;
  const inverso = { ">": "<", "<": ">", ">=": "<=", "<=": ">=", "=": "=" }[operador];
  return new RegExp(`${coluna}\\s*${escapeRegex(operador)}\\s*${valor}\\b`).test(trecho)
    || new RegExp(`\\b${valor}\\s*${escapeRegex(inverso)}\\s*${coluna}\\b`).test(trecho);
}

function temWhereTexto(ctx, campo, valor) {
  return comparacaoTexto(ctx.where, campo, valor);
}

function temWhereNumero(ctx, campo, operador, numero) {
  return comparacaoNumero(ctx.where, campo, operador, numero);
}

function temIntervalo(ctx, campo, minimo, maximo) {
  const coluna = `(?:\\w+\\.)?${campo}`;
  const between = new RegExp(`${coluna}\\s+between\\s+${minimo}(?:\\.0+)?\\s+and\\s+${maximo}(?:\\.0+)?\\b`);
  if (between.test(ctx.where)) return true;
  return comparacaoNumero(ctx.where, campo, ">=", minimo) && comparacaoNumero(ctx.where, campo, "<=", maximo);
}

function inContem(where, campo, valores) {
  const encontrado = where.match(new RegExp(`(?:\\w+\\.)?${campo}\\s+in\\s*\\(([^)]*)\\)`));
  if (!encontrado) return false;
  const itens = encontrado[1].split(",").map((item) => item.trim());
  return valores.every((valor) => itens.includes(`'${valor}'`));
}

function temConjunto(ctx, campo, valores) {
  if (inContem(ctx.where, campo, valores)) return true;
  const todos = valores.every((valor) => comparacaoTexto(ctx.where, campo, valor));
  return todos && (valores.length < 2 || /\bor\b/.test(ctx.where));
}

function mencionaValor(ctx, campo, valor) {
  return comparacaoTexto(ctx.where, campo, valor) || inContem(ctx.where, campo, [valor]);
}

function temLike(ctx, campo, padrao) {
  const regex = new RegExp(`(?:\\w+\\.)?${campo}\\s+(?:i?like)\\s+'${escapeRegex(padrao)}'`);
  return regex.test(ctx.where);
}

function exclusaoTexto(trecho, campo, valor) {
  const coluna = `(?:\\w+\\.)?${campo}`;
  const literal = `'${escapeRegex(valor)}'`;
  return new RegExp(`\\bnot\\s+${coluna}\\s*=\\s*${literal}`).test(trecho)
    || new RegExp(`\\bnot\\s*\\(\\s*${coluna}\\s*=\\s*${literal}\\s*\\)`).test(trecho)
    || new RegExp(`${coluna}\\s*!=\\s*${literal}`).test(trecho)
    || new RegExp(`${coluna}\\s+not\\s+in\\s*\\(\\s*${literal}\\s*\\)`).test(trecho);
}

function temFuncao(ctx, funcao, campo) {
  const texto = ctx.select.join(" ");
  if (campo === "*") {
    return new RegExp(`\\b${funcao}\\s*\\(\\s*(?:\\*|1|(?:\\w+\\.)?id_\\w+)\\s*\\)`).test(texto);
  }
  return new RegExp(`\\b${funcao}\\s*\\(\\s*(?:\\w+\\.)?${campo}\\s*\\)`).test(texto);
}

function temAliasCampo(ctx, campo, alias) {
  const regex = new RegExp(`^(?:\\w+\\.)?${campo}\\s+as\\s+${alias}\\b`);
  return ctx.select.some((item) => regex.test(item.trim()));
}

function temAliasFuncao(ctx, funcao, campo, alias) {
  const nucleo = campo === "*" ? "(?:\\*|1|(?:\\w+\\.)?id_\\w+)" : `(?:\\w+\\.)?${campo}`;
  const regex = new RegExp(`^${funcao}\\s*\\(\\s*${nucleo}\\s*\\)\\s+as\\s+${alias}\\b`);
  return ctx.select.some((item) => regex.test(item.trim()));
}

function temOrdenacao(ctx, campo, direcao) {
  if (!ctx.orderBy) return false;
  return dividirVirgulas(ctx.orderBy).some((parte) => {
    if (!new RegExp(`(?:\\w+\\.)?${campo}\\b`).test(parte)) return false;
    const descendente = /\bdesc\b/.test(parte);
    return direcao === "desc" ? descendente : !descendente;
  });
}

function temLimite(ctx, quantidade) {
  return new RegExp(`\\blimit\\s+${quantidade}\\b`).test(ctx.sql)
    || new RegExp(`\\btop\\s+${quantidade}\\b`).test(ctx.sql)
    || new RegExp(`\\bfetch\\s+(?:first|next)\\s+${quantidade}\\s+rows\\b`).test(ctx.sql);
}

function agrupou(ctx, campo) {
  if (!ctx.groupBy) return false;
  return dividirVirgulas(ctx.groupBy).some((parte) => {
    const texto = parte.trim();
    return texto === campo || texto.endsWith(`.${campo}`);
  });
}

function temHavingCount(ctx, numero, alias) {
  if (!ctx.having) return false;
  const valor = `${numero}(?:\\.0+)?`;
  return new RegExp(`(?:\\bcount\\s*\\([^)]*\\)|\\b${alias}\\b)\\s*>\\s*${valor}\\b`).test(ctx.having);
}

function temHavingSoma(ctx, numero, alias) {
  if (!ctx.having) return false;
  const valor = `${numero}(?:\\.0+)?`;
  return new RegExp(`(?:\\bsum\\s*\\(\\s*(?:\\w+\\.)?valor\\s*\\)|\\b${alias}\\b)\\s*>\\s*${valor}\\b`).test(ctx.having);
}

function ordenouSomaDesc(ctx, alias) {
  if (!ctx.orderBy) return false;
  return dividirVirgulas(ctx.orderBy).some((parte) => {
    if (!/\bdesc\b/.test(parte)) return false;
    return new RegExp(`\\b${alias}\\b`).test(parte)
      || /\bsum\s*\(\s*(?:\w+\.)?valor\s*\)/.test(parte)
      || /^\s*2\b/.test(parte);
  });
}

function listarJoins(sql) {
  const from = extrairClausula(sql, "from", ["where", "group by", "order by", "having", "limit"]);
  const regex = /\b((?:inner|left|right|full|cross)\s+(?:outer\s+)?)?join\s+([a-z_][\w]*)/g;
  const joins = [];
  let match;
  while ((match = regex.exec(from))) {
    const prefixo = match[1] || "";
    let tipo = "inner";
    if (/\bleft\b/.test(prefixo)) tipo = "left";
    else if (/\bright\b/.test(prefixo)) tipo = "right";
    else if (/\bfull\b/.test(prefixo)) tipo = "full";
    else if (/\bcross\b/.test(prefixo)) tipo = "cross";
    joins.push({ tipo, tabela: match[2] });
  }
  return joins;
}

function relacionaInner(sql, tabelaA, tabelaB) {
  const presentes = tabelasDaConsulta(sql);
  if (!presentes.has(tabelaA) || !presentes.has(tabelaB)) return false;
  const joins = listarJoins(sql);
  const tipoDe = (tabela) => {
    const join = joins.find((item) => item.tabela === tabela);
    return join ? join.tipo : "from";
  };
  return [tipoDe(tabelaA), tipoDe(tabelaB)].every((tipo) => tipo === "inner" || tipo === "from");
}

function temLeftJoin(sql, tabela) {
  return listarJoins(sql).some((join) => join.tipo === "left" && join.tabela === tabela);
}

function juntouInternamente(ctx, tabelas) {
  if (!temTabelas(ctx, tabelas)) return false;
  return listarJoins(ctx.sql)
    .filter((join) => tabelas.includes(join.tabela))
    .every((join) => join.tipo === "inner");
}

function temUsing(sql, tabelaA, tabelaB, coluna) {
  const regex = /\bjoin\s+([a-z_][\w]*)\s+using\s*\(\s*([a-z_][\w]*)\s*\)/g;
  let match;
  while ((match = regex.exec(sql))) {
    if (match[2] !== coluna) continue;
    const destino = match[1];
    const anteriores = [...sql.slice(0, match.index).matchAll(/\b(?:from|join)\s+([a-z_][\w]*)/g)];
    const origem = anteriores.length ? anteriores[anteriores.length - 1][1] : "";
    const par = [origem, destino].sort().join("|");
    if (par === [tabelaA, tabelaB].sort().join("|")) return true;
  }
  return false;
}

function temVinculo(sql, tabelaA, tabelaB, coluna) {
  const ladoA = `${tabelaA}\\.${coluna}`;
  const ladoB = `${tabelaB}\\.${coluna}`;
  if (new RegExp(`\\b${ladoA}\\s*=\\s*${ladoB}\\b`).test(sql)) return true;
  if (new RegExp(`\\b${ladoB}\\s*=\\s*${ladoA}\\b`).test(sql)) return true;
  return temUsing(sql, tabelaA, tabelaB, coluna);
}

function el(descricao, peso, conteudo, verificar) {
  return { descricao, peso, conteudo, verificar };
}

/* --------------------------------------------------------------------------
   30 questões. A soma dos pesos de cada uma deve ser 100.
   Para criar outra questão, copie um objeto e ajuste enunciado, gabarito,
   explicação e elementos.
   -------------------------------------------------------------------------- */

const QUESTOES = [
  {
    id: 1,
    nivel: "Fundamentos",
    conteudo: "SELECT / FROM",
    tabelas: ["clientes"],
    enunciado: "A agência precisa de uma lista simples com o nome de todos os clientes cadastrados. Escreva uma consulta que retorne somente a coluna nome da tabela clientes.",
    respostaEsperada: "SELECT nome\nFROM clientes;",
    explicacao: "SELECT escolhe as colunas e FROM indica a tabela. Nesta consulta basta projetar nome a partir de clientes, sem filtro, porque o pedido é a lista completa.",
    elementos: [
      el("Utilizou SELECT", 20, "SELECT", (ctx) => usou(ctx, "select")),
      el("Utilizou FROM", 20, "FROM", (ctx) => usou(ctx, "from")),
      el("Consultou a tabela clientes", 30, "FROM", (ctx) => temTabelas(ctx, ["clientes"])),
      el("Retornou a coluna nome", 30, "SELECT", (ctx) => temCampos(ctx, ["nome"]))
    ]
  },
  {
    id: 2,
    nivel: "Fundamentos",
    conteudo: "SELECT",
    tabelas: ["contas"],
    enunciado: "O caixa precisa visualizar o identificador e o saldo de todas as contas. Retorne id_conta e saldo da tabela contas.",
    respostaEsperada: "SELECT id_conta, saldo\nFROM contas;",
    explicacao: "Quando a consulta pede duas informações, elas entram no SELECT separadas por vírgula. A ordem das colunas pode mudar sem alterar o sentido da resposta.",
    elementos: [
      el("Utilizou SELECT", 15, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela contas", 25, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["contas"])),
      el("Retornou id_conta", 30, "SELECT", (ctx) => temCampos(ctx, ["id_conta"])),
      el("Retornou saldo", 30, "SELECT", (ctx) => temCampos(ctx, ["saldo"]))
    ]
  },
  {
    id: 3,
    nivel: "Fundamentos",
    conteudo: "WHERE",
    tabelas: ["contas"],
    enunciado: "Um gerente deseja localizar contas com saldo superior a 5000. Retorne id_conta e saldo somente dessas contas. Use o número 5000, sem separador de milhar.",
    respostaEsperada: "SELECT id_conta, saldo\nFROM contas\nWHERE saldo > 5000;",
    explicacao: "WHERE filtra as linhas antes de exibi-las. O operador > mantém apenas saldos maiores que 5000. Sem esse filtro, a consulta traria todas as contas.",
    elementos: [
      el("Utilizou SELECT", 20, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela contas", 25, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["contas"])),
      el("Retornou id_conta e saldo", 25, "SELECT", (ctx) => temCampos(ctx, ["id_conta", "saldo"])),
      el("Utilizou WHERE", 10, "WHERE", (ctx) => usou(ctx, "where")),
      el("Filtrou saldo maior que 5000", 20, "WHERE", (ctx) => temWhereNumero(ctx, "saldo", ">", 5000))
    ]
  },
  {
    id: 4,
    nivel: "Fundamentos",
    conteudo: "WHERE",
    tabelas: ["contas"],
    enunciado: "A auditoria precisa das contas em funcionamento, com status 'ativa'. Retorne id_conta, tipo_conta, saldo e data_abertura.",
    respostaEsperada: "SELECT id_conta, tipo_conta, saldo, data_abertura\nFROM contas\nWHERE status = 'ativa';",
    explicacao: "O filtro compara a coluna status com o valor fictício 'ativa'. Textos em SQL ficam entre aspas simples. data_abertura mostra quando a conta foi aberta nesse cenário.",
    elementos: [
      el("Utilizou SELECT", 15, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela contas", 20, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["contas"])),
      el("Retornou id_conta, tipo_conta, saldo e data_abertura", 25, "SELECT", (ctx) => temCampos(ctx, ["id_conta", "tipo_conta", "saldo", "data_abertura"])),
      el("Utilizou WHERE", 15, "WHERE", (ctx) => usou(ctx, "where")),
      el("Filtrou status igual a 'ativa'", 25, "WHERE", (ctx) => temWhereTexto(ctx, "status", "ativa"))
    ]
  },
  {
    id: 5,
    nivel: "Fundamentos",
    conteudo: "AND",
    tabelas: ["clientes"],
    enunciado: "O marketing quer clientes da cidade 'São Paulo' com idade acima de 30 anos. Retorne nome e idade. As duas condições precisam ser verdadeiras ao mesmo tempo.",
    respostaEsperada: "SELECT nome, idade\nFROM clientes\nWHERE cidade = 'São Paulo' AND idade > 30;",
    explicacao: "AND combina condições obrigatórias. A pessoa precisa estar em São Paulo e, ao mesmo tempo, ter idade maior que 30. Se uma das comparações falhar, a linha fica de fora.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela clientes", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["clientes"])),
      el("Retornou nome e idade", 15, "SELECT", (ctx) => temCampos(ctx, ["nome", "idade"])),
      el("Utilizou WHERE", 10, "WHERE", (ctx) => usou(ctx, "where")),
      el("Filtrou a cidade São Paulo", 20, "WHERE", (ctx) => temWhereTexto(ctx, "cidade", "sao paulo")),
      el("Filtrou idade maior que 30", 15, "WHERE", (ctx) => temWhereNumero(ctx, "idade", ">", 30)),
      el("Ligou as condições com AND", 15, "AND", (ctx) => /\band\b/.test(ctx.where))
    ]
  },
  {
    id: 6,
    nivel: "Fundamentos",
    conteudo: "OR",
    tabelas: ["transacoes"],
    enunciado: "A mesa de operações quer as transações cujo tipo seja 'PIX' ou 'deposito'. Retorne id_transacao, tipo e valor.",
    respostaEsperada: "SELECT id_transacao, tipo, valor\nFROM transacoes\nWHERE tipo = 'PIX' OR tipo = 'deposito';",
    explicacao: "OR aceita linhas que atendam a qualquer uma das comparações. A forma tipo IN ('PIX', 'deposito') representa o mesmo conjunto e também é reconhecida.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela transacoes", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["transacoes"])),
      el("Retornou id_transacao, tipo e valor", 15, "SELECT", (ctx) => temCampos(ctx, ["id_transacao", "tipo", "valor"])),
      el("Utilizou WHERE", 10, "WHERE", (ctx) => usou(ctx, "where")),
      el("Incluiu o tipo PIX", 15, "WHERE", (ctx) => mencionaValor(ctx, "tipo", "pix")),
      el("Incluiu o tipo deposito", 15, "WHERE", (ctx) => mencionaValor(ctx, "tipo", "deposito")),
      el("Usou OR ou uma lista IN equivalente", 20, "OR", (ctx) => /\bor\b/.test(ctx.where) || inContem(ctx.where, "tipo", ["pix", "deposito"]))
    ]
  },
  {
    id: 7,
    nivel: "Fundamentos",
    conteudo: "NOT",
    tabelas: ["emprestimos"],
    enunciado: "A área de crédito quer os empréstimos que não estão com status 'aprovado'. Retorne id_emprestimo, valor e status. Exclua os aprovados com NOT ou com um operador de diferença.",
    respostaEsperada: "SELECT id_emprestimo, valor, status\nFROM emprestimos\nWHERE NOT status = 'aprovado';",
    explicacao: "NOT inverte o resultado da comparação. status <> 'aprovado' e status != 'aprovado' também eliminam os contratos aprovados e recebem a mesma pontuação.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela emprestimos", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["emprestimos"])),
      el("Retornou id_emprestimo, valor e status", 20, "SELECT", (ctx) => temCampos(ctx, ["id_emprestimo", "valor", "status"])),
      el("Utilizou WHERE", 15, "WHERE", (ctx) => usou(ctx, "where")),
      el("Excluiu o status 'aprovado'", 40, "NOT", (ctx) => exclusaoTexto(ctx.where, "status", "aprovado"))
    ]
  },
  {
    id: 8,
    nivel: "Fundamentos",
    conteudo: "ORDER BY",
    tabelas: ["clientes"],
    enunciado: "A recepção precisa da lista de clientes em ordem alfabética de nome, de A a Z. Retorne nome e cidade.",
    respostaEsperada: "SELECT nome, cidade\nFROM clientes\nORDER BY nome;",
    explicacao: "ORDER BY define a ordem das linhas. A direção crescente ASC é o padrão, então ORDER BY nome e ORDER BY nome ASC produzem a mesma lista alfabética.",
    elementos: [
      el("Utilizou SELECT", 15, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela clientes", 20, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["clientes"])),
      el("Retornou nome e cidade", 20, "SELECT", (ctx) => temCampos(ctx, ["nome", "cidade"])),
      el("Ordenou por nome em ordem crescente", 45, "ORDER BY", (ctx) => usou(ctx, "order by") && temOrdenacao(ctx, "nome", "asc"))
    ]
  },
  {
    id: 9,
    nivel: "Fundamentos",
    conteudo: "LIMIT",
    tabelas: ["clientes"],
    enunciado: "O programa de educação financeira quer os 5 clientes mais jovens. Retorne nome e idade, do menor para o maior, limitando o resultado a 5 registros.",
    respostaEsperada: "SELECT nome, idade\nFROM clientes\nORDER BY idade ASC\nLIMIT 5;",
    explicacao: "A ordenação precisa acontecer antes do corte. ORDER BY idade ASC coloca os mais jovens no início e LIMIT 5 guarda só esses cinco. TOP 5 e FETCH FIRST 5 ROWS também são aceitos.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela clientes", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["clientes"])),
      el("Retornou nome e idade", 15, "SELECT", (ctx) => temCampos(ctx, ["nome", "idade"])),
      el("Ordenou pela idade crescente", 35, "ORDER BY", (ctx) => temOrdenacao(ctx, "idade", "asc")),
      el("Limitou o resultado a 5 registros", 25, "LIMIT", (ctx) => temLimite(ctx, 5))
    ]
  },
  {
    id: 10,
    nivel: "Fundamentos",
    conteudo: "AS",
    tabelas: ["contas"],
    enunciado: "O aplicativo deve exibir o saldo com o apelido saldo_disponivel. Retorne id_conta e o saldo usando AS para criar esse alias.",
    respostaEsperada: "SELECT id_conta, saldo AS saldo_disponivel\nFROM contas;",
    explicacao: "AS renomeia a coluna só no resultado, sem alterar a tabela. saldo AS saldo_disponivel deixa o valor mais claro para quem lê o relatório.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela contas", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["contas"])),
      el("Retornou id_conta", 15, "SELECT", (ctx) => temCampos(ctx, ["id_conta"])),
      el("Incluiu a coluna saldo", 20, "SELECT", (ctx) => temCampos(ctx, ["saldo"])),
      el("Criou o alias saldo_disponivel com AS", 40, "AS", (ctx) => temAliasCampo(ctx, "saldo", "saldo_disponivel"))
    ]
  },
  {
    id: 11,
    nivel: "Filtros e agregações",
    conteudo: "BETWEEN",
    tabelas: ["contas"],
    enunciado: "A gerência quer contas com saldo entre 1000 e 5000, incluindo os dois extremos. Retorne id_conta, tipo_conta e saldo. Use os números 1000 e 5000.",
    respostaEsperada: "SELECT id_conta, tipo_conta, saldo\nFROM contas\nWHERE saldo BETWEEN 1000 AND 5000;",
    explicacao: "BETWEEN inclui os limites inferior e superior. A forma saldo >= 1000 AND saldo <= 5000 descreve o mesmo intervalo e recebe a pontuação do filtro.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela contas", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["contas"])),
      el("Retornou id_conta, tipo_conta e saldo", 15, "SELECT", (ctx) => temCampos(ctx, ["id_conta", "tipo_conta", "saldo"])),
      el("Filtrou o saldo entre 1000 e 5000", 60, "BETWEEN", (ctx) => temIntervalo(ctx, "saldo", 1000, 5000))
    ]
  },
  {
    id: 12,
    nivel: "Filtros e agregações",
    conteudo: "IN",
    tabelas: ["clientes"],
    enunciado: "Uma campanha regional abrange 'São Paulo', 'Rio de Janeiro' e 'Belo Horizonte'. Retorne nome, cidade e idade dos clientes dessas cidades.",
    respostaEsperada: "SELECT nome, cidade, idade\nFROM clientes\nWHERE cidade IN ('São Paulo', 'Rio de Janeiro', 'Belo Horizonte');",
    explicacao: "IN testa se a cidade está na lista. Três igualdades unidas por OR são equivalentes. A ordem dos municípios na lista não importa.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela clientes", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["clientes"])),
      el("Retornou nome, cidade e idade", 15, "SELECT", (ctx) => temCampos(ctx, ["nome", "cidade", "idade"])),
      el("Filtrou as três cidades pedidas", 60, "IN", (ctx) => temConjunto(ctx, "cidade", ["sao paulo", "rio de janeiro", "belo horizonte"]))
    ]
  },
  {
    id: 13,
    nivel: "Filtros e agregações",
    conteudo: "LIKE",
    tabelas: ["clientes"],
    enunciado: "O atendimento procura clientes cujo nome começa com 'Maria'. Retorne nome e cidade.",
    respostaEsperada: "SELECT nome, cidade\nFROM clientes\nWHERE nome LIKE 'Maria%';",
    explicacao: "LIKE compara um padrão, não um texto exato. O símbolo % representa qualquer continuação, então 'Maria%' encontra nomes que começam com Maria.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela clientes", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["clientes"])),
      el("Retornou nome e cidade", 15, "SELECT", (ctx) => temCampos(ctx, ["nome", "cidade"])),
      el("Usou LIKE com o padrão Maria%", 60, "LIKE", (ctx) => temLike(ctx, "nome", "maria%"))
    ]
  },
  {
    id: 14,
    nivel: "Filtros e agregações",
    conteudo: "COUNT",
    tabelas: ["contas"],
    enunciado: "Quantas contas estão com status 'ativa'? Retorne essa quantidade com COUNT.",
    respostaEsperada: "SELECT COUNT(*) AS total_contas\nFROM contas\nWHERE status = 'ativa';",
    explicacao: "COUNT conta linhas. COUNT(*), COUNT(1) ou COUNT do identificador da conta servem para responder quantas contas ativas existem. O apelido da coluna é opcional nesta questão.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela contas", 20, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["contas"])),
      el("Contou os registros com COUNT", 45, "COUNT", (ctx) => temFuncao(ctx, "count", "*")),
      el("Considerou apenas status 'ativa'", 25, "WHERE", (ctx) => temWhereTexto(ctx, "status", "ativa"))
    ]
  },
  {
    id: 15,
    nivel: "Filtros e agregações",
    conteudo: "SUM",
    tabelas: ["transacoes"],
    enunciado: "Qual é o valor total dos depósitos concluídos? Some a coluna valor das transações com tipo 'deposito' e status 'concluida'. As duas condições são obrigatórias.",
    respostaEsperada: "SELECT SUM(valor) AS total_depositos\nFROM transacoes\nWHERE tipo = 'deposito' AND status = 'concluida';",
    explicacao: "SUM acumula um valor numérico. AND garante que só entrem depósitos já concluídos: tipo e status precisam ser verdadeiros juntos.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela transacoes", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["transacoes"])),
      el("Somou a coluna valor", 30, "SUM", (ctx) => temFuncao(ctx, "sum", "valor")),
      el("Filtrou o tipo deposito", 15, "WHERE", (ctx) => temWhereTexto(ctx, "tipo", "deposito")),
      el("Filtrou o status concluida", 15, "WHERE", (ctx) => temWhereTexto(ctx, "status", "concluida")),
      el("Exigiu as duas condições com AND", 15, "AND", (ctx) => /\band\b/.test(ctx.where))
    ]
  },
  {
    id: 16,
    nivel: "Filtros e agregações",
    conteudo: "AVG",
    tabelas: ["contas"],
    enunciado: "Qual é o saldo médio das contas do tipo 'poupanca'? Calcule a média de saldo e apresente o resultado com o alias saldo_medio, usando AS.",
    respostaEsperada: "SELECT AVG(saldo) AS saldo_medio\nFROM contas\nWHERE tipo_conta = 'poupanca';",
    explicacao: "AVG calcula a média aritmética. O WHERE restringe a conta ao tipo poupança; sem esse filtro, a média misturaria contas correntes e poupanças.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela contas", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["contas"])),
      el("Calculou a média do saldo", 40, "AVG", (ctx) => temFuncao(ctx, "avg", "saldo")),
      el("Filtrou tipo_conta 'poupanca'", 20, "WHERE", (ctx) => temWhereTexto(ctx, "tipo_conta", "poupanca")),
      el("Nomeou a média como saldo_medio", 15, "AS", (ctx) => temAliasFuncao(ctx, "avg", "saldo", "saldo_medio"))
    ]
  },
  {
    id: 17,
    nivel: "Filtros e agregações",
    conteudo: "MAX / MIN",
    tabelas: ["emprestimos"],
    enunciado: "Na carteira de empréstimos com status 'ativo', qual é o maior e o menor valor contratado? Retorne os dois resultados na mesma consulta.",
    respostaEsperada: "SELECT MAX(valor) AS maior_valor, MIN(valor) AS menor_valor\nFROM emprestimos\nWHERE status = 'ativo';",
    explicacao: "MAX devolve o maior número do conjunto e MIN devolve o menor. Os dois podem aparecer no mesmo SELECT. O filtro deixa de fora contratos que não estão ativos. Apelidos são opcionais aqui.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela emprestimos", 15, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["emprestimos"])),
      el("Obteve o maior valor com MAX", 30, "MAX", (ctx) => temFuncao(ctx, "max", "valor")),
      el("Obteve o menor valor com MIN", 30, "MIN", (ctx) => temFuncao(ctx, "min", "valor")),
      el("Considerou apenas status 'ativo'", 15, "WHERE", (ctx) => temWhereTexto(ctx, "status", "ativo"))
    ]
  },
  {
    id: 18,
    nivel: "Filtros e agregações",
    conteudo: "GROUP BY",
    tabelas: ["contas"],
    enunciado: "Quantas contas existem para cada tipo de conta? Mostre tipo_conta e a quantidade com o alias quantidade, usando AS.",
    respostaEsperada: "SELECT tipo_conta, COUNT(*) AS quantidade\nFROM contas\nGROUP BY tipo_conta;",
    explicacao: "GROUP BY tipo_conta cria um grupo para corrente, outro para poupança e assim por diante. COUNT conta as linhas de cada grupo. A quantidade não faria sentido sem o agrupamento.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela contas", 10, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["contas"])),
      el("Mostrou tipo_conta", 10, "SELECT", (ctx) => temCampos(ctx, ["tipo_conta"])),
      el("Contou os registros de cada grupo", 20, "COUNT", (ctx) => temFuncao(ctx, "count", "*")),
      el("Nomeou a contagem como quantidade", 10, "AS", (ctx) => temAliasFuncao(ctx, "count", "*", "quantidade")),
      el("Utilizou GROUP BY", 15, "GROUP BY", (ctx) => usou(ctx, "group by")),
      el("Agrupou por tipo_conta", 25, "GROUP BY", (ctx) => agrupou(ctx, "tipo_conta"))
    ]
  },
  {
    id: 19,
    nivel: "Filtros e agregações",
    conteudo: "SUM / GROUP BY",
    tabelas: ["transacoes"],
    enunciado: "Qual é o volume financeiro das transações concluídas, separado por tipo? Some valor, mostre a coluna tipo e considere apenas status 'concluida'.",
    respostaEsperada: "SELECT tipo, SUM(valor) AS volume\nFROM transacoes\nWHERE status = 'concluida'\nGROUP BY tipo;",
    explicacao: "WHERE elimina o que não está concluído antes do cálculo. GROUP BY tipo abre um total para PIX, depósito, saque e os demais tipos. SUM(valor) é o volume de cada grupo.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela transacoes", 10, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["transacoes"])),
      el("Mostrou a coluna tipo", 15, "SELECT", (ctx) => temCampos(ctx, ["tipo"])),
      el("Somou a coluna valor", 25, "SUM", (ctx) => temFuncao(ctx, "sum", "valor")),
      el("Filtrou status 'concluida'", 15, "WHERE", (ctx) => temWhereTexto(ctx, "status", "concluida")),
      el("Agrupou por tipo", 25, "GROUP BY", (ctx) => usou(ctx, "group by") && agrupou(ctx, "tipo"))
    ]
  },
  {
    id: 20,
    nivel: "Filtros e agregações",
    conteudo: "HAVING",
    tabelas: ["contas"],
    enunciado: "Mostre apenas os tipos de conta que possuem mais de 100 contas cadastradas. Exiba tipo_conta e a quantidade. Use o número 100.",
    respostaEsperada: "SELECT tipo_conta, COUNT(*) AS quantidade\nFROM contas\nGROUP BY tipo_conta\nHAVING COUNT(*) > 100;",
    explicacao: "HAVING filtra grupos já formados. WHERE não consegue testar o resultado de COUNT, porque a contagem ainda não existe na hora de filtrar as linhas. Por isso COUNT(*) > 100 fica no HAVING.",
    elementos: [
      el("Utilizou SELECT", 5, "SELECT", (ctx) => usou(ctx, "select")),
      el("Consultou a tabela contas", 10, "FROM", (ctx) => usou(ctx, "from") && temTabelas(ctx, ["contas"])),
      el("Mostrou tipo_conta", 10, "SELECT", (ctx) => temCampos(ctx, ["tipo_conta"])),
      el("Contou as contas", 15, "COUNT", (ctx) => temFuncao(ctx, "count", "*")),
      el("Agrupou por tipo_conta", 20, "GROUP BY", (ctx) => usou(ctx, "group by") && agrupou(ctx, "tipo_conta")),
      el("Manteve somente grupos com mais de 100 contas", 40, "HAVING", (ctx) => usou(ctx, "having") && temHavingCount(ctx, 100, "quantidade"))
    ]
  },
  {
    id: 21,
    nivel: "Relacionamentos",
    conteudo: "INNER JOIN / PK / FK",
    tabelas: ["clientes", "contas"],
    enunciado: "Liste o nome do cliente, o número da conta e o saldo. Relacione clientes e contas por id_cliente. Essa coluna é a chave primária de clientes e a chave estrangeira de contas.",
    respostaEsperada: "SELECT clientes.nome, contas.id_conta, contas.saldo\nFROM clientes\nINNER JOIN contas ON clientes.id_cliente = contas.id_cliente;",
    explicacao: "O INNER JOIN combina linhas que possuem correspondência nas duas tabelas. A igualdade clientes.id_cliente = contas.id_cliente liga a chave primária à chave estrangeira. Cliente sem conta não aparece.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Usou as tabelas clientes e contas", 10, "FROM", (ctx) => temTabelas(ctx, ["clientes", "contas"])),
      el("Relacionou as tabelas com INNER JOIN", 25, "INNER JOIN", (ctx) => relacionaInner(ctx.sql, "clientes", "contas")),
      el("Usou a chave primária clientes.id_cliente", 20, "PK", (ctx) => temVinculo(ctx.sql, "clientes", "contas", "id_cliente")),
      el("Usou a chave estrangeira contas.id_cliente", 20, "FK", (ctx) => temVinculo(ctx.sql, "clientes", "contas", "id_cliente")),
      el("Retornou nome, id_conta e saldo", 15, "SELECT", (ctx) => temCampos(ctx, ["nome", "id_conta", "saldo"]))
    ]
  },
  {
    id: 22,
    nivel: "Relacionamentos",
    conteudo: "INNER JOIN",
    tabelas: ["contas", "transacoes"],
    enunciado: "Liste id_conta, tipo, valor e data_transacao dos saques concluídos (tipo 'saque' e status 'concluida'). Relacione transacoes e contas pela chave id_conta.",
    respostaEsperada: "SELECT transacoes.id_conta, transacoes.tipo, transacoes.valor, transacoes.data_transacao\nFROM contas\nINNER JOIN transacoes ON contas.id_conta = transacoes.id_conta\nWHERE transacoes.tipo = 'saque' AND transacoes.status = 'concluida';",
    explicacao: "id_conta é a chave primária de contas e a chave estrangeira de transacoes. O JOIN une cada movimento à sua conta. O WHERE deixa somente saques já concluídos.",
    elementos: [
      el("Retornou id_conta, tipo, valor e data_transacao", 15, "SELECT", (ctx) => usou(ctx, "select") && temCampos(ctx, ["id_conta", "tipo", "valor", "data_transacao"])),
      el("Usou as tabelas contas e transacoes", 10, "FROM", (ctx) => temTabelas(ctx, ["contas", "transacoes"])),
      el("Relacionou as tabelas com INNER JOIN", 20, "INNER JOIN", (ctx) => relacionaInner(ctx.sql, "contas", "transacoes")),
      el("Ligou a chave primária contas.id_conta", 15, "PK", (ctx) => temVinculo(ctx.sql, "contas", "transacoes", "id_conta")),
      el("Ligou a chave estrangeira transacoes.id_conta", 15, "FK", (ctx) => temVinculo(ctx.sql, "contas", "transacoes", "id_conta")),
      el("Filtrou tipo 'saque'", 15, "WHERE", (ctx) => temWhereTexto(ctx, "tipo", "saque")),
      el("Filtrou status 'concluida'", 10, "WHERE", (ctx) => temWhereTexto(ctx, "status", "concluida"))
    ]
  },
  {
    id: 23,
    nivel: "Relacionamentos",
    conteudo: "INNER JOIN",
    tabelas: ["clientes", "emprestimos"],
    enunciado: "A área de crédito quer o nome do cliente, o valor, a taxa e a data de contratação dos empréstimos ativos. Relacione clientes e emprestimos por id_cliente e mantenha status 'ativo'.",
    respostaEsperada: "SELECT clientes.nome, emprestimos.valor, emprestimos.taxa, emprestimos.data_contratacao\nFROM clientes\nINNER JOIN emprestimos ON clientes.id_cliente = emprestimos.id_cliente\nWHERE emprestimos.status = 'ativo';",
    explicacao: "emprestimos.id_cliente aponta para clientes.id_cliente. O INNER JOIN traz o nome de quem contratou o crédito, e o filtro status = 'ativo' esconde propostas encerradas ou recusadas.",
    elementos: [
      el("Retornou nome, valor, taxa e data_contratacao", 15, "SELECT", (ctx) => usou(ctx, "select") && temCampos(ctx, ["nome", "valor", "taxa", "data_contratacao"])),
      el("Usou as tabelas clientes e emprestimos", 10, "FROM", (ctx) => temTabelas(ctx, ["clientes", "emprestimos"])),
      el("Relacionou as tabelas com INNER JOIN", 20, "INNER JOIN", (ctx) => relacionaInner(ctx.sql, "clientes", "emprestimos")),
      el("Usou a chave primária clientes.id_cliente", 15, "PK", (ctx) => temVinculo(ctx.sql, "clientes", "emprestimos", "id_cliente")),
      el("Usou a chave estrangeira emprestimos.id_cliente", 15, "FK", (ctx) => temVinculo(ctx.sql, "clientes", "emprestimos", "id_cliente")),
      el("Filtrou status 'ativo'", 25, "WHERE", (ctx) => temWhereTexto(ctx, "status", "ativo"))
    ]
  },
  {
    id: 24,
    nivel: "Relacionamentos",
    conteudo: "LEFT JOIN",
    tabelas: ["clientes", "emprestimos"],
    enunciado: "A auditoria quer todos os clientes, mesmo quem não possui empréstimo, ao lado dos dados do contrato quando existirem. Retorne nome, id_emprestimo e valor usando LEFT JOIN.",
    respostaEsperada: "SELECT clientes.nome, emprestimos.id_emprestimo, emprestimos.valor\nFROM clientes\nLEFT JOIN emprestimos ON clientes.id_cliente = emprestimos.id_cliente;",
    explicacao: "LEFT JOIN preserva todas as linhas da tabela da esquerda. Clientes sem empréstimo continuam na lista, com as colunas do contrato vazias. Um INNER JOIN esconderia essas pessoas.",
    elementos: [
      el("Utilizou SELECT", 10, "SELECT", (ctx) => usou(ctx, "select")),
      el("Partiu da tabela clientes", 10, "FROM", (ctx) => temTabelas(ctx, ["clientes", "emprestimos"])),
      el("Usou LEFT JOIN em emprestimos", 40, "LEFT JOIN", (ctx) => temLeftJoin(ctx.sql, "emprestimos")),
      el("Relacionou as tabelas por id_cliente", 25, "FK", (ctx) => temVinculo(ctx.sql, "clientes", "emprestimos", "id_cliente")),
      el("Retornou nome, id_emprestimo e valor", 15, "SELECT", (ctx) => temCampos(ctx, ["nome", "id_emprestimo", "valor"]))
    ]
  },
  {
    id: 25,
    nivel: "Relacionamentos",
    conteudo: "LEFT JOIN",
    tabelas: ["agencias", "clientes_agencias", "clientes"],
    enunciado: "Liste todas as agências e, quando houver, o nome dos clientes vinculados. Use clientes_agencias. Agências sem clientes também devem aparecer. Retorne nome_agencia e nome.",
    respostaEsperada: "SELECT agencias.nome_agencia, clientes.nome\nFROM agencias\nLEFT JOIN clientes_agencias ON agencias.id_agencia = clientes_agencias.id_agencia\nLEFT JOIN clientes ON clientes_agencias.id_cliente = clientes.id_cliente;",
    explicacao: "O vínculo entre agência e cliente não está direto: ele passa por clientes_agencias. Dois LEFT JOINs, começando em agencias, mantêm a agência mesmo quando não existe cliente associado.",
    elementos: [
      el("Retornou nome_agencia e nome", 10, "SELECT", (ctx) => usou(ctx, "select") && temCampos(ctx, ["nome_agencia", "nome"])),
      el("Usou LEFT JOIN em clientes_agencias", 25, "LEFT JOIN", (ctx) => temLeftJoin(ctx.sql, "clientes_agencias")),
      el("Usou LEFT JOIN em clientes", 25, "LEFT JOIN", (ctx) => temLeftJoin(ctx.sql, "clientes")),
      el("Ligou agência e vínculo por id_agencia", 20, "FK", (ctx) => temVinculo(ctx.sql, "agencias", "clientes_agencias", "id_agencia")),
      el("Ligou vínculo e cliente por id_cliente", 20, "PK", (ctx) => temVinculo(ctx.sql, "clientes_agencias", "clientes", "id_cliente"))
    ]
  },
  {
    id: 26,
    nivel: "Relacionamentos",
    conteudo: "INNER JOIN / AND",
    tabelas: ["clientes", "contas"],
    enunciado: "Liste o nome e a cidade dos clientes de 'Curitiba' que possuem conta bloqueada. Retorne também id_conta. A conta deve estar com status 'bloqueada'.",
    respostaEsperada: "SELECT clientes.nome, clientes.cidade, contas.id_conta\nFROM clientes\nINNER JOIN contas ON clientes.id_cliente = contas.id_cliente\nWHERE contas.status = 'bloqueada' AND clientes.cidade = 'Curitiba';",
    explicacao: "O JOIN encontra o titular de cada conta. AND combina dois filtros de tabelas diferentes: a cidade do cliente e o status da conta. Os dois precisam ser verdadeiros.",
    elementos: [
      el("Retornou nome, cidade e id_conta", 10, "SELECT", (ctx) => usou(ctx, "select") && temCampos(ctx, ["nome", "cidade", "id_conta"])),
      el("Relacionou clientes e contas com INNER JOIN", 20, "INNER JOIN", (ctx) => relacionaInner(ctx.sql, "clientes", "contas")),
      el("Ligou as tabelas pela chave estrangeira id_cliente", 20, "FK", (ctx) => temVinculo(ctx.sql, "clientes", "contas", "id_cliente")),
      el("Filtrou status 'bloqueada'", 20, "WHERE", (ctx) => temWhereTexto(ctx, "status", "bloqueada")),
      el("Filtrou a cidade Curitiba", 20, "WHERE", (ctx) => temWhereTexto(ctx, "cidade", "curitiba")),
      el("Combinou os filtros com AND", 10, "AND", (ctx) => /\band\b/.test(ctx.where))
    ]
  },
  {
    id: 27,
    nivel: "Relacionamentos",
    conteudo: "JOIN / SUM",
    tabelas: ["clientes", "contas"],
    enunciado: "Calcule o saldo total de cada cliente que possui conta. Retorne o nome e a soma dos saldos com o alias saldo_total, usando AS.",
    respostaEsperada: "SELECT clientes.nome, SUM(contas.saldo) AS saldo_total\nFROM clientes\nINNER JOIN contas ON clientes.id_cliente = contas.id_cliente\nGROUP BY clientes.id_cliente, clientes.nome;",
    explicacao: "Depois do JOIN, cada cliente pode ter várias contas. SUM adiciona os saldos e GROUP BY separa um total por cliente. Agrupar por id_cliente ou pelo nome atende a esta questão.",
    elementos: [
      el("Retornou o nome do cliente", 15, "SELECT", (ctx) => usou(ctx, "select") && temCampos(ctx, ["nome"])),
      el("Relacionou clientes e contas com INNER JOIN", 20, "INNER JOIN", (ctx) => relacionaInner(ctx.sql, "clientes", "contas")),
      el("Ligou as tabelas por id_cliente", 15, "PK", (ctx) => temVinculo(ctx.sql, "clientes", "contas", "id_cliente")),
      el("Somou a coluna saldo", 25, "SUM", (ctx) => temFuncao(ctx, "sum", "saldo")),
      el("Agrupou por cliente", 15, "GROUP BY", (ctx) => usou(ctx, "group by") && (agrupou(ctx, "nome") || agrupou(ctx, "id_cliente"))),
      el("Nomeou a soma como saldo_total", 10, "AS", (ctx) => temAliasFuncao(ctx, "sum", "saldo", "saldo_total"))
    ]
  },
  {
    id: 28,
    nivel: "Relacionamentos",
    conteudo: "JOIN / HAVING",
    tabelas: ["clientes", "contas"],
    enunciado: "Mostre os clientes que possuem mais de 3 contas. Retorne o nome e a quantidade com o alias qtd_contas, usando AS. Use o número 3.",
    respostaEsperada: "SELECT clientes.nome, COUNT(contas.id_conta) AS qtd_contas\nFROM clientes\nINNER JOIN contas ON clientes.id_cliente = contas.id_cliente\nGROUP BY clientes.id_cliente, clientes.nome\nHAVING COUNT(contas.id_conta) > 3;",
    explicacao: "COUNT conta as contas de cada cliente depois do JOIN e do GROUP BY. HAVING COUNT(...) > 3 remove os grupos pequenos. Esse teste não pode ficar no WHERE, porque depende do agregado.",
    elementos: [
      el("Retornou o nome do cliente", 10, "SELECT", (ctx) => usou(ctx, "select") && temCampos(ctx, ["nome"])),
      el("Relacionou clientes e contas com INNER JOIN", 15, "INNER JOIN", (ctx) => relacionaInner(ctx.sql, "clientes", "contas")),
      el("Ligou as tabelas pela chave estrangeira id_cliente", 10, "FK", (ctx) => temVinculo(ctx.sql, "clientes", "contas", "id_cliente")),
      el("Contou as contas", 15, "COUNT", (ctx) => temFuncao(ctx, "count", "*")),
      el("Agrupou por cliente", 15, "GROUP BY", (ctx) => usou(ctx, "group by") && (agrupou(ctx, "nome") || agrupou(ctx, "id_cliente"))),
      el("Manteve grupos com mais de 3 contas", 25, "HAVING", (ctx) => temHavingCount(ctx, 3, "qtd_contas")),
      el("Nomeou a contagem como qtd_contas", 10, "AS", (ctx) => temAliasFuncao(ctx, "count", "*", "qtd_contas"))
    ]
  },
  {
    id: 29,
    nivel: "Relacionamentos",
    conteudo: "JOIN / ORDER BY",
    tabelas: ["clientes", "clientes_agencias", "agencias"],
    enunciado: "Liste o nome do cliente, o nome da agência e a cidade da agência, em ordem alfabética do cliente. Percorra clientes, clientes_agencias e agencias.",
    respostaEsperada: "SELECT clientes.nome, agencias.nome_agencia, agencias.cidade\nFROM clientes\nINNER JOIN clientes_agencias ON clientes.id_cliente = clientes_agencias.id_cliente\nINNER JOIN agencias ON clientes_agencias.id_agencia = agencias.id_agencia\nORDER BY clientes.nome;",
    explicacao: "São dois relacionamentos: cliente com a tabela de vínculo e vínculo com a agência. INNER JOIN só mostra clientes que realmente têm agência. ORDER BY nome organiza o resultado de A a Z.",
    elementos: [
      el("Retornou nome, nome_agencia e cidade", 15, "SELECT", (ctx) => usou(ctx, "select") && temCampos(ctx, ["nome", "nome_agencia", "cidade"])),
      el("Ligou clientes a clientes_agencias com INNER JOIN", 20, "INNER JOIN", (ctx) => relacionaInner(ctx.sql, "clientes", "clientes_agencias")),
      el("Ligou clientes_agencias a agencias com INNER JOIN", 20, "INNER JOIN", (ctx) => relacionaInner(ctx.sql, "clientes_agencias", "agencias")),
      el("Usou a chave id_cliente", 15, "PK", (ctx) => temVinculo(ctx.sql, "clientes", "clientes_agencias", "id_cliente")),
      el("Usou a chave id_agencia", 15, "FK", (ctx) => temVinculo(ctx.sql, "clientes_agencias", "agencias", "id_agencia")),
      el("Ordenou pelo nome do cliente", 15, "ORDER BY", (ctx) => temOrdenacao(ctx, "nome", "asc"))
    ]
  },
  {
    id: 30,
    nivel: "Relacionamentos",
    conteudo: "JOIN / HAVING",
    tabelas: ["agencias", "clientes_agencias", "clientes", "contas", "transacoes"],
    enunciado: "A diretoria quer o volume de transações concluídas por agência, somente quando esse volume for superior a 100000. Retorne nome_agencia e a soma de valor com o alias volume, da maior soma para a menor. Relacione agencias, clientes_agencias, clientes, contas e transacoes. Use o número 100000.",
    respostaEsperada: "SELECT agencias.nome_agencia, SUM(transacoes.valor) AS volume\nFROM agencias\nINNER JOIN clientes_agencias ON agencias.id_agencia = clientes_agencias.id_agencia\nINNER JOIN clientes ON clientes_agencias.id_cliente = clientes.id_cliente\nINNER JOIN contas ON clientes.id_cliente = contas.id_cliente\nINNER JOIN transacoes ON contas.id_conta = transacoes.id_conta\nWHERE transacoes.status = 'concluida'\nGROUP BY agencias.id_agencia, agencias.nome_agencia\nHAVING SUM(transacoes.valor) > 100000\nORDER BY volume DESC;",
    explicacao: "A consulta atravessa o caminho agência → vínculo → cliente → conta → transação. WHERE deixa só movimentos concluídos, SUM calcula o volume, GROUP BY separa as agências, HAVING corta quem não passou de 100000 e ORDER BY DESC mostra os maiores volumes primeiro.",
    elementos: [
      el("Envolveu as cinco tabelas do caminho", 5, "FROM", (ctx) => temTabelas(ctx, ["agencias", "clientes_agencias", "clientes", "contas", "transacoes"])),
      el("Relacionou as tabelas com INNER JOIN", 15, "INNER JOIN", (ctx) => juntouInternamente(ctx, ["agencias", "clientes_agencias", "clientes", "contas", "transacoes"])),
      el("Ligou agência, vínculo e cliente pelas chaves", 10, "FK", (ctx) => temVinculo(ctx.sql, "agencias", "clientes_agencias", "id_agencia") && temVinculo(ctx.sql, "clientes_agencias", "clientes", "id_cliente")),
      el("Ligou cliente, conta e transação pelas chaves", 10, "PK", (ctx) => temVinculo(ctx.sql, "clientes", "contas", "id_cliente") && temVinculo(ctx.sql, "contas", "transacoes", "id_conta")),
      el("Filtrou transações concluídas", 10, "WHERE", (ctx) => temWhereTexto(ctx, "status", "concluida")),
      el("Somou o valor das transações", 10, "SUM", (ctx) => temFuncao(ctx, "sum", "valor")),
      el("Nomeou a soma como volume", 10, "AS", (ctx) => temAliasFuncao(ctx, "sum", "valor", "volume")),
      el("Agrupou por agência", 10, "GROUP BY", (ctx) => usou(ctx, "group by") && (agrupou(ctx, "nome_agencia") || agrupou(ctx, "id_agencia"))),
      el("Manteve volume superior a 100000", 10, "HAVING", (ctx) => temHavingSoma(ctx, 100000, "volume")),
      el("Ordenou o volume do maior para o menor", 10, "ORDER BY", (ctx) => ordenouSomaDesc(ctx, "volume"))
    ]
  }
];

function validarBancoQuestoes() {
  const problemas = [];
  if (QUESTOES.length !== 30) problemas.push(`Há ${QUESTOES.length} questões; o esperado é 30.`);
  const ids = new Set();
  const vistos = new Set();
  QUESTOES.forEach((questao, indice) => {
    if (questao.id !== indice + 1) problemas.push(`Id fora de ordem na posição ${indice}.`);
    if (ids.has(questao.id)) problemas.push(`Id repetido: ${questao.id}.`);
    ids.add(questao.id);
    const soma = questao.elementos.reduce((total, item) => total + item.peso, 0);
    if (soma !== PONTOS_QUESTAO) problemas.push(`Questão ${questao.id} soma ${soma}.`);
    if (!questao.enunciado || !questao.respostaEsperada || !questao.explicacao) {
      problemas.push(`Questão ${questao.id} está incompleta.`);
    }
    questao.elementos.forEach((item) => {
      vistos.add(item.conteudo);
      if (typeof item.verificar !== "function" || !item.descricao) {
        problemas.push(`Questão ${questao.id} possui critério inválido.`);
      }
    });
  });
  CONTEUDOS_OBRIGATORIOS.forEach((conteudo) => {
    if (!vistos.has(conteudo)) problemas.push(`Conteúdo ausente: ${conteudo}.`);
  });
  return problemas;
}

function corrigirResposta(questao, resposta) {
  const ctx = analisarSql(resposta);
  if (!ctx.sql || comandoProibido(ctx.sql)) {
    return {
      pontos: 0,
      status: "incorreta",
      detalhes: [{
        descricao: "A resposta deve ser uma consulta SELECT, sem comandos de alteração",
        peso: PONTOS_QUESTAO,
        conteudo: "SELECT",
        ok: false
      }]
    };
  }

  const detalhes = questao.elementos.map((item) => {
    let ok = false;
    try {
      ok = Boolean(item.verificar(ctx));
    } catch (erro) {
      ok = false;
    }
    return { descricao: item.descricao, peso: item.peso, conteudo: item.conteudo, ok };
  });
  const pontos = Math.min(PONTOS_QUESTAO, detalhes.reduce((total, item) => total + (item.ok ? item.peso : 0), 0));
  let status = "incorreta";
  if (pontos >= PONTOS_QUESTAO) status = "correta";
  else if (pontos > 0) status = "parcial";
  return { pontos, status, detalhes };
}

function calcularNota(pontos) {
  const maxima = QUESTOES.length * PONTOS_QUESTAO;
  const nota = Math.round((pontos / maxima) * 10 * 10) / 10;
  return Math.min(10, Math.max(0, nota));
}

function classificarNota(nota) {
  if (nota >= 9.5) return { texto: "Excelente desempenho", classe: "excelente" };
  if (nota >= 8.5) return { texto: "Ótimo desempenho", classe: "otimo" };
  if (nota >= 7) return { texto: "Bom desempenho", classe: "bom" };
  if (nota >= 5) return { texto: "Em desenvolvimento", classe: "desenvolvimento" };
  return { texto: "Precisa melhorar", classe: "reforco" };
}

function nivelPercentual(percentual) {
  if (percentual >= 80) return "alto";
  if (percentual >= 60) return "medio";
  return "baixo";
}

function nivelQuestao(pontos) {
  if (pontos >= 80) return "alto";
  if (pontos >= 40) return "medio";
  return "baixo";
}

function emojiNivel(nivel) {
  if (nivel === "alto") return "🟢";
  if (nivel === "medio") return "🟡";
  return "🔴";
}

function calcularDiagnostico() {
  const porConteudo = {};
  QUESTOES.forEach((questao) => {
    const correcao = estado.correcoes[questao.id];
    if (!correcao) return;
    correcao.detalhes.forEach((detalhe) => {
      if (!porConteudo[detalhe.conteudo]) porConteudo[detalhe.conteudo] = { obtido: 0, total: 0 };
      porConteudo[detalhe.conteudo].total += detalhe.peso;
      if (detalhe.ok) porConteudo[detalhe.conteudo].obtido += detalhe.peso;
    });
  });

  const grupos = GRUPOS_DIAGNOSTICO.map((grupo) => {
    let obtido = 0;
    let total = 0;
    grupo.itens.forEach((item) => {
      if (!porConteudo[item]) return;
      obtido += porConteudo[item].obtido;
      total += porConteudo[item].total;
    });
    const percentual = total ? Math.round((obtido / total) * 100) : 0;
    return { ...grupo, obtido, total, percentual, nivel: nivelPercentual(percentual) };
  });

  const conteudos = Object.keys(porConteudo).map((nome) => {
    const dados = porConteudo[nome];
    const percentual = dados.total ? Math.round((dados.obtido / dados.total) * 100) : 0;
    return { nome, percentual, ...dados };
  });
  return { grupos, conteudos };
}

function juntar(lista) {
  if (lista.length <= 1) return lista[0] || "";
  if (lista.length === 2) return `${lista[0]} e ${lista[1]}`;
  return `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}`;
}

function gerarRecomendacao(diagnostico) {
  const fortes = diagnostico.grupos.filter((grupo) => grupo.percentual >= 80);
  const medios = diagnostico.grupos.filter((grupo) => grupo.percentual >= 60 && grupo.percentual < 80);
  const fracos = diagnostico.grupos.filter((grupo) => grupo.percentual < 60);
  const frases = [];

  if (fortes.length) {
    frases.push(`Seu desempenho demonstra bom domínio em ${juntar(fortes.map((grupo) => grupo.nome.toLowerCase()))}.`);
  } else {
    frases.push("Nenhum bloco de conteúdo chegou a 80% de aproveitamento.");
  }

  const piores = diagnostico.conteudos
    .filter((item) => item.total > 0 && item.percentual < 60)
    .sort((a, b) => a.percentual - b.percentual)
    .slice(0, 4);

  if (fracos.length) {
    frases.push(`Você apresentou mais dificuldade em ${juntar(fracos.map((grupo) => grupo.nome.toLowerCase()))}.`);
    if (piores.length) {
      frases.push(`Recomendamos revisar ${juntar(piores.map((item) => item.nome))} e praticar consultas bancárias com saldos, transações, empréstimos e o relacionamento entre clientes, contas e agências.`);
    }
  } else if (medios.length) {
    frases.push(`Alguns conteúdos ainda estão em desenvolvimento: ${juntar(medios.map((grupo) => grupo.nome.toLowerCase()))}. Vale refazer variações desses comandos antes de partir para consultas maiores.`);
  } else {
    frases.push("O resultado mostra cobertura sólida dos conteúdos avaliados. Um bom próximo passo é praticar consultas que combinem filtro, agregação e JOIN no mesmo cenário, como volume por agência ou análise de crédito.");
  }
  return frases.join(" ");
}

/* --------------------------------------------------------------------------
   Estado — permanece no navegador se a página for atualizada
   -------------------------------------------------------------------------- */

function estadoVazio() {
  return {
    nome: "",
    turma: "",
    dataProva: "",
    dataInicio: "",
    indice: 0,
    respostas: {},
    correcoes: {},
    iniciada: false,
    finalizada: false,
    tela: "inicio",
    versao: VERSAO_BANCO
  };
}

let estado = estadoVazio();
let aviso = "";

function hojeISO() {
  const data = new Date();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function formatarData(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!match) return "—";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function fmt(numero) {
  return Number(numero).toLocaleString("pt-BR");
}

function fmtNota(numero) {
  return numero.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function escapar(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function indiceMaximo() {
  if (estado.finalizada) return QUESTOES.length - 1;
  const pendente = QUESTOES.findIndex((questao) => !estado.correcoes[questao.id]);
  if (pendente === -1) return QUESTOES.length - 1;
  return pendente;
}

function pontuacaoAcumulada() {
  let obtido = 0;
  let corrigidas = 0;
  QUESTOES.forEach((questao) => {
    const correcao = estado.correcoes[questao.id];
    if (!correcao) return;
    obtido += correcao.pontos;
    corrigidas += 1;
  });
  return { obtido, maximo: corrigidas * PONTOS_QUESTAO, corrigidas };
}

function todasCorrigidas() {
  return QUESTOES.every((questao) => estado.correcoes[questao.id]);
}

function salvarEstado() {
  try {
    const dados = {
      nome: estado.nome,
      turma: estado.turma,
      dataProva: estado.dataProva,
      dataInicio: estado.dataInicio,
      indice: estado.indice,
      respostas: estado.respostas,
      correcoes: estado.correcoes,
      iniciada: estado.iniciada,
      finalizada: estado.finalizada,
      tela: estado.tela,
      versao: VERSAO_BANCO
    };
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados));
    avisoArmazenamento = "";
  } catch (erro) {
    avisoArmazenamento = "Não foi possível salvar o progresso neste navegador. Evite fechar a aba antes de terminar.";
  }
}

let avisoArmazenamento = "";

function carregarEstado() {
  try {
    const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!bruto) return;
    const dados = JSON.parse(bruto);
    if (!dados || dados.versao !== VERSAO_BANCO || !dados.iniciada) return;
    estado.nome = String(dados.nome || "").slice(0, 80);
    estado.turma = String(dados.turma || "").slice(0, 40);
    estado.dataProva = String(dados.dataProva || "");
    estado.dataInicio = String(dados.dataInicio || "");
    estado.respostas = {};
    Object.keys(dados.respostas || {}).forEach((id) => {
      estado.respostas[id] = String(dados.respostas[id] || "");
    });
    estado.correcoes = {};
    Object.keys(dados.correcoes || {}).forEach((id) => {
      const correcao = dados.correcoes[id];
      if (!correcao || typeof correcao.pontos !== "number" || !Array.isArray(correcao.detalhes)) return;
      estado.correcoes[id] = correcao;
    });
    estado.iniciada = true;
    estado.finalizada = Boolean(dados.finalizada);
    estado.tela = estado.finalizada && dados.tela === "resultado" ? "resultado" : "prova";
    const indice = Number(dados.indice) || 0;
    estado.indice = Math.min(Math.max(indice, 0), indiceMaximo());
  } catch (erro) {
    localStorage.removeItem(CHAVE_ARMAZENAMENTO);
    estado = estadoVazio();
  }
}

/* --------------------------------------------------------------------------
   Interface
   -------------------------------------------------------------------------- */

function htmlLogo() {
  return `<div class="marca"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="10" width="6" height="16" rx="1"></rect><rect x="13" y="4" width="6" height="22" rx="1"></rect><rect x="24" y="13" width="6" height="13" rx="1"></rect></svg><div><strong>Ambiente de prova</strong><span>SQL · Operações bancárias</span></div></div>`;
}

function htmlTopo() {
  const acoes = `<div class="topo-acoes"><button type="button" class="btn-sec" data-acao="esquema">Ver esquema</button><button type="button" class="btn-sec" data-acao="professor">Informações da avaliação</button>${estado.iniciada ? '<button type="button" class="btn-perigo" data-acao="reiniciar">Reiniciar prova</button>' : ""}</div>`;
  let progresso = "";
  if (estado.tela === "prova") {
    const posicao = estado.indice + 1;
    const largura = (posicao / QUESTOES.length) * 100;
    const acumulado = pontuacaoAcumulada();
    const aluno = [estado.nome, estado.turma, formatarData(estado.dataProva)].filter(Boolean).join(" · ");
    progresso = `<div class="prova-topo"><div class="prova-meta"><div><strong>Questão ${posicao} de ${QUESTOES.length}</strong><span class="aluno-mini">${escapar(aluno)}</span></div><div class="pontos-topo">Pontuação acumulada: <strong>${fmt(acumulado.obtido)}/${fmt(acumulado.maximo)}</strong></div></div><div class="progresso" role="progressbar" aria-valuenow="${posicao}" aria-valuemin="1" aria-valuemax="${QUESTOES.length}" aria-label="Posição na prova"><div style="width:${largura}%"></div></div><p class="progresso-legenda">${posicao}/${QUESTOES.length}</p></div>`;
  }
  return `<header class="topo"><div class="topo-interno"><div class="topo-linha">${htmlLogo()}${acoes}</div>${progresso}</div></header><div class="faixa-ouro"></div>`;
}

function htmlEsquema(nomes) {
  const lista = nomes ? ESQUEMA.filter((tabela) => nomes.includes(tabela.nome)) : ESQUEMA;
  return `<div class="esquema">${lista.map((tabela) => `
    <article class="tabela-esquema"><h3>${escapar(tabela.nome)}</h3><ul>${tabela.colunas.map(([nome, detalhe]) => {
      const classe = detalhe === "PK" ? "pk" : detalhe === "FK" ? "fk" : "";
      return `<li><code>${escapar(nome)}</code><span class="tag ${classe}">${escapar(detalhe)}</span></li>`;
    }).join("")}</ul></article>`).join("")}</div>`;
}

function htmlDialogos() {
  const problemas = validarBancoQuestoes();
  return `
    <dialog id="dialogo-esquema"><div class="dialogo-corpo"><div class="fechamento"><h2>Banco fictício da prova</h2><button type="button" class="btn claro" data-acao="fechar" data-dialogo="dialogo-esquema">Fechar</button></div><p>Use somente estes nomes. Nenhum dado é real e nenhum comando será executado.</p>${htmlEsquema()}<h3>Relacionamentos</h3><ul class="relacionamentos">${RELACIONAMENTOS.map((item) => `<li>${escapar(item)}</li>`).join("")}</ul><h3>Valores usados nas questões</h3><ul class="dominio">${DOMINIO.map((item) => `<li><code>${escapar(item)}</code></li>`).join("")}</ul><p class="nota-suave">A coluna cpf existe apenas como campo fictício de cadastro. A prova não pede documentos, senhas nem dados bancários reais.</p></div></dialog>
    <dialog id="dialogo-professor"><div class="dialogo-corpo"><div class="fechamento"><h2>Informações da avaliação</h2><button type="button" class="btn claro" data-acao="fechar" data-dialogo="dialogo-professor">Fechar</button></div><ul class="instrucoes"><li>Quantidade de questões: ${QUESTOES.length}.</li><li>Valor por questão: ${PONTOS_QUESTAO} pontos.</li><li>Pontuação máxima: ${fmt(QUESTOES.length * PONTOS_QUESTAO)}.</li><li>Nota máxima: 10.</li><li>A nota final é a pontuação total dividida por ${fmt(QUESTOES.length * PONTOS_QUESTAO)}, multiplicada por 10.</li></ul><h3>Conteúdos avaliados</h3><ul class="relacionamentos">${GRUPOS_DIAGNOSTICO.map((grupo) => `<li><strong>${escapar(grupo.nome)}:</strong> ${escapar(grupo.itens.join(", "))}</li>`).join("")}</ul><h3>Classificação</h3><ul class="relacionamentos"><li>0 a 4,9 — Precisa melhorar</li><li>5,0 a 6,9 — Em desenvolvimento</li><li>7,0 a 8,4 — Bom desempenho</li><li>8,5 a 9,4 — Ótimo desempenho</li><li>9,5 a 10 — Excelente desempenho</li></ul><p class="nota-suave">As questões ficam no array QUESTOES, no arquivo script.js. Cada critério tem descrição, peso e uma verificação própria. A soma dos pesos de cada questão é 100.</p>${problemas.length ? `<p class="erro">${problemas.map(escapar).join("<br>")}</p>` : ""}</div></dialog>`;
}

function htmlRodape() {
  const extra = avisoArmazenamento ? `<p class="erro">${escapar(avisoArmazenamento)}</p>` : "";
  return `<footer class="rodape">${extra}Simulação educacional. Nenhum comando SQL é executado e nenhuma informação é enviada a um servidor. Não informe dados pessoais, senhas ou informações bancárias reais. O progresso fica apenas neste navegador.</footer>`;
}

function htmlInicio() {
  return `<main class="pagina hero"><section><p class="kicker">Avaliação prática</p><h1>PROVA PRÁTICA DE SQL — OPERAÇÕES BANCÁRIAS</h1><p class="subtitulo">Avaliação de Comandos SQL, Agregações e Relacionamentos entre Tabelas</p><ul class="selos"><li>30 questões</li><li>Até 3.000 pontos</li><li>Nota de 0 a 10</li><li>Funciona no navegador</li></ul><div class="cartao"><h2>Instruções</h2><ul class="instrucoes"><li>A prova possui 30 questões.</li><li>Cada questão vale até 100 pontos.</li><li>A nota final será de 0 a 10.</li><li>O aluno deverá escrever comandos SQL.</li><li>Cada questão deverá ser corrigida individualmente.</li><li>Depois de corrigida, a resposta não poderá ser alterada.</li><li>A avaliação é baseada em operações bancárias fictícias.</li></ul><p class="nota-suave">Maiúsculas, espaços, quebras de linha, ponto e vírgula e aliases de tabela são aceitos quando a consulta é equivalente. O gabarito só aparece depois da correção da questão.</p></div></section><section class="cartao"><h2>Identificação</h2><form id="form-inicio" class="formulario"><label>Nome do aluno<input id="campo-nome" name="nome" type="text" maxlength="80" required autocomplete="name" value="${escapar(estado.nome)}"></label><label>Turma<input name="turma" type="text" maxlength="40" autocomplete="off" value="${escapar(estado.turma)}" placeholder="Opcional"></label><label>Data<input name="data" type="date" required value="${escapar(estado.dataProva || hojeISO())}"></label>${aviso ? `<p class="erro">${escapar(aviso)}</p>` : ""}<button class="btn btn-grande" type="submit">Iniciar prova</button></form></section></main>`;
}

function htmlMapa() {
  const limite = indiceMaximo();
  return `<div class="mapa" aria-label="Mapa das questões">${QUESTOES.map((questao, indice) => {
    const correcao = estado.correcoes[questao.id];
    let classe = "";
    if (correcao?.status === "correta") classe = "ok";
    else if (correcao?.status === "parcial") classe = "parcial";
    else if (correcao?.status === "incorreta") classe = "erro";
    if (indice === estado.indice) classe += " atual";
    const travado = indice > limite ? "disabled" : "";
    return `<button type="button" class="${classe.trim()}" data-acao="ir" data-indice="${indice}" ${travado} aria-label="Questão ${questao.id}">${questao.id}</button>`;
  }).join("")}</div>`;
}

function htmlFeedback(questao) {
  const correcao = estado.correcoes[questao.id];
  if (!correcao) return "";
  const rotulos = {
    correta: "Resposta correta!",
    parcial: "Resposta parcialmente correta",
    incorreta: "Resposta incorreta"
  };
  const icones = { correta: "🟢", parcial: "🟡", incorreta: "🔴" };
  return `<section class="feedback ${correcao.status}" aria-live="polite"><h3>${icones[correcao.status]} ${rotulos[correcao.status]}</h3><p class="pontuacao"><strong>Pontuação: ${correcao.pontos}/100</strong></p><ul class="criterios">${correcao.detalhes.map((item) => `<li class="${item.ok ? "ok" : "falha"}"><span class="estado-criterio">${item.ok ? "Atendido" : "Não encontrado"}</span><span>${escapar(item.descricao)}</span><strong>${item.ok ? item.peso : 0}/${item.peso}</strong></li>`).join("")}</ul><div class="bloco-codigo"><h3>Sua resposta</h3><pre>${escapar(estado.respostas[questao.id] || "")}</pre><h3>Resposta esperada</h3><pre>${escapar(questao.respostaEsperada)}</pre></div><h3>Explicação</h3><div class="explicacao"><p>${escapar(questao.explicacao)}</p><p class="nota-suave">Outras organizações equivalentes também recebem a pontuação dos critérios atendidos.</p></div></section>`;
}

function htmlProva() {
  const questao = QUESTOES[estado.indice];
  const corrigida = Boolean(estado.correcoes[questao.id]);
  const ultima = estado.indice === QUESTOES.length - 1;
  const botaoProxima = ultima && corrigida
    ? '<button type="button" class="btn" data-acao="resultado">Finalizar prova</button>'
    : `<button type="button" class="btn" data-acao="proxima" ${corrigida ? "" : "disabled"} title="${corrigida ? "" : "Corrija a questão atual para avançar"}">Próxima questão</button>`;
  const banner = estado.finalizada
    ? '<p class="aviso">Prova finalizada. As respostas permanecem bloqueadas para consulta.</p><button type="button" class="btn claro" data-acao="resultado">Voltar ao resultado</button>'
    : "";
  return `<main class="pagina layout-prova"><section class="cartao">${banner}<p><span class="badge">${escapar(questao.nivel)}</span> <span class="badge">${escapar(questao.conteudo)}</span></p><h1>Questão ${questao.id}</h1><p class="enunciado">${escapar(questao.enunciado)}</p><h2>Esquema necessário</h2>${htmlEsquema(questao.tabelas)}<details class="extra"><summary>Valores fictícios do cenário</summary><ul class="dominio">${DOMINIO.map((item) => `<li><code>${escapar(item)}</code></li>`).join("")}</ul></details></section><section class="cartao"><label for="editor-sql">Seu comando SQL</label><div class="editor"><pre class="editor-linhas" id="editor-linhas" aria-hidden="true">1</pre><textarea id="editor-sql" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" wrap="off" aria-label="Comando SQL da questão ${questao.id}" ${corrigida ? "readonly" : ""}></textarea></div><p class="editor-ajuda"><span>${corrigida ? "Questão corrigida. A resposta não pode mais ser alterada." : "Ctrl+Enter corrige a questão. Tab insere espaços."}</span><span>O SQL não é executado.</span></p>${aviso ? `<p class="aviso" id="aviso-ativo">${escapar(aviso)}</p>` : ""}</section>${htmlFeedback(questao)}<section class="cartao"><h2>Questões</h2>${htmlMapa()}<p class="nota-suave">É possível voltar nas questões já liberadas para consultar o resultado. Para avançar, corrija a questão atual.</p></section><div class="barra-fixa"><div class="interno"><button type="button" class="btn claro" data-acao="anterior" ${estado.indice === 0 ? "disabled" : ""}>Questão anterior</button>${corrigida ? "" : '<button type="button" class="btn" data-acao="corrigir">Corrigir questão</button>'}${botaoProxima}${todasCorrigidas() && !estado.finalizada ? '<button type="button" class="btn claro" data-acao="resultado">Ver resultado final</button>' : ""}</div></div></main>`;
}

function htmlResultado() {
  const pontos = pontuacaoAcumulada().obtido;
  const maxima = QUESTOES.length * PONTOS_QUESTAO;
  const percentual = Math.round((pontos / maxima) * 100);
  const nota = calcularNota(pontos);
  const classificacao = classificarNota(nota);
  const diagnostico = calcularDiagnostico();
  const estudo = diagnostico.grupos
    .filter((grupo) => grupo.percentual < 80)
    .sort((a, b) => a.percentual - b.percentual);
  const fortes = diagnostico.grupos.filter((grupo) => grupo.percentual >= 80);

  return `<main class="pagina resultado"><section class="cartao hero-nota"><div class="nota-circulo"><div><strong>${fmtNota(nota)}</strong><span>/ 10</span></div></div><div><p class="kicker">Resultado</p><h1>PROVA FINALIZADA</h1><p><strong>Aluno:</strong> ${escapar(estado.nome)}</p><p><strong>Turma:</strong> ${escapar(estado.turma || "Não informada")}</p><p><strong>Data:</strong> ${escapar(formatarData(estado.dataProva))}</p><p class="classificacao ${classificacao.classe}">${classificacao.texto}</p></div></section><section class="grades-3"><article><span>Pontuação</span><strong>${fmt(pontos)} / ${fmt(maxima)}</strong></article><article><span>Percentual</span><strong>${percentual}%</strong></article><article><span>Nota final</span><strong>${fmtNota(nota)} / 10</strong></article></section><section class="cartao"><h2>Seu desempenho</h2>${diagnostico.grupos.map((grupo) => `<div class="diag-item"><header><span>${escapar(grupo.nome)}</span><span>${emojiNivel(grupo.nivel)} ${grupo.percentual}%</span></header><div class="barra ${grupo.nivel}"><div style="width:${grupo.percentual}%"></div></div></div>`).join("")}<p class="nota-suave">🟢 a partir de 80% · 🟡 de 60% a 79% · 🔴 abaixo de 60%</p>${fortes.length ? `<div class="chips">${fortes.map((grupo) => `<span>Forte: ${escapar(grupo.nome)} · ${grupo.percentual}%</span>`).join("")}</div>` : ""}</section><section class="cartao recomendacao"><h2>Recomendação de estudo</h2><p>${escapar(gerarRecomendacao(diagnostico))}</p><h3>📚 Recomenda-se estudar mais:</h3>${estudo.length ? `<ol class="lista-estudo">${estudo.map((grupo) => `<li>${escapar(grupo.nome)} — ${grupo.percentual}%</li>`).join("")}</ol>` : "<p>Nenhum conteúdo ficou abaixo de 80%. Continue praticando consultas que misturam filtros, agregações e relacionamentos.</p>"}</section><section class="cartao"><h2>Desempenho por questão</h2><p class="nota-suave">🟢 80 a 100 · 🟡 40 a 79 · 🔴 0 a 39</p><div class="tabela-wrap"><table><thead><tr><th>Questão</th><th>Conteúdo</th><th class="num">Pontuação</th><th>Resultado</th><th></th></tr></thead><tbody>${QUESTOES.map((questao, indice) => {
    const correcao = estado.correcoes[questao.id];
    const nivel = nivelQuestao(correcao.pontos);
    return `<tr><td>${questao.id}</td><td>${escapar(questao.conteudo)}</td><td class="num">${correcao.pontos}</td><td>${emojiNivel(nivel)}</td><td><button type="button" class="btn claro" data-acao="ir" data-indice="${indice}">Ver</button></td></tr>`;
  }).join("")}</tbody></table></div><div class="acoes-questao"><button type="button" class="btn" data-acao="revisar">Revisar questões</button><button type="button" class="btn-perigo escuro" data-acao="reiniciar">Reiniciar prova</button></div></section></main>`;
}

function render() {
  const app = document.getElementById("app");
  const tela = estado.tela === "prova" ? htmlProva() : estado.tela === "resultado" ? htmlResultado() : htmlInicio();
  app.innerHTML = `${htmlTopo()}${tela}${htmlRodape()}${htmlDialogos()}`;
  ligarEditor();
  if (estado.tela === "inicio") document.getElementById("campo-nome")?.focus({ preventScroll: true });
}

function ligarEditor() {
  const area = document.getElementById("editor-sql");
  if (!area) return;
  const questao = QUESTOES[estado.indice];
  area.value = estado.respostas[questao.id] || "";
  atualizarLinhas();
  const linhas = document.getElementById("editor-linhas");
  area.addEventListener("scroll", () => {
    if (linhas) linhas.scrollTop = area.scrollTop;
  });
  area.addEventListener("keydown", (evento) => {
    if (area.readOnly) return;
    if (evento.key === "Tab") {
      evento.preventDefault();
      const inicio = area.selectionStart;
      const fim = area.selectionEnd;
      area.value = `${area.value.slice(0, inicio)}  ${area.value.slice(fim)}`;
      area.selectionStart = area.selectionEnd = inicio + 2;
      area.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (evento.key === "Enter" && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      corrigirQuestaoAtual();
    }
  });
}

function atualizarLinhas() {
  const area = document.getElementById("editor-sql");
  const linhas = document.getElementById("editor-linhas");
  if (!area || !linhas) return;
  const quantidade = Math.max(area.value.split("\n").length, 8);
  linhas.textContent = Array.from({ length: quantidade }, (_, indice) => indice + 1).join("\n");
}

function irPara(indice) {
  if (indice < 0 || indice > indiceMaximo()) return;
  estado.indice = indice;
  estado.tela = "prova";
  aviso = "";
  salvarEstado();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function corrigirQuestaoAtual() {
  const questao = QUESTOES[estado.indice];
  if (estado.correcoes[questao.id]) return;
  const texto = estado.respostas[questao.id] || "";
  const ctx = analisarSql(texto);
  if (!ctx.sql) {
    aviso = "Escreva um comando SQL antes de corrigir.";
    render();
    return;
  }
  if (!/\bselect\b/.test(ctx.sql)) {
    const seguir = window.confirm("Não encontrei um comando SELECT. Se corrigir agora, a questão será encerrada com a pontuação obtida e não poderá ser alterada. Deseja continuar?");
    if (!seguir) return;
  }
  estado.correcoes[questao.id] = corrigirResposta(questao, texto);
  aviso = "";
  salvarEstado();
  render();
  document.querySelector(".feedback")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function finalizarProva() {
  if (!todasCorrigidas()) return;
  estado.finalizada = true;
  estado.tela = "resultado";
  aviso = "";
  salvarEstado();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function reiniciarProva() {
  const confirmar = window.confirm("Deseja reiniciar a prova? As respostas e a pontuação salvas neste navegador serão apagadas.");
  if (!confirmar) return;
  estado = estadoVazio();
  aviso = "";
  try {
    localStorage.removeItem(CHAVE_ARMAZENAMENTO);
  } catch (erro) {
    avisoArmazenamento = "Não foi possível limpar o progresso salvo.";
  }
  render();
}

function aoClicar(evento) {
  if (evento.target instanceof HTMLDialogElement) {
    evento.target.close();
    return;
  }
  const botao = evento.target.closest("[data-acao]");
  if (!botao || botao.disabled) return;
  const acao = botao.dataset.acao;
  if (acao === "esquema") document.getElementById("dialogo-esquema")?.showModal();
  if (acao === "professor") document.getElementById("dialogo-professor")?.showModal();
  if (acao === "fechar") document.getElementById(botao.dataset.dialogo)?.close();
  if (acao === "corrigir") corrigirQuestaoAtual();
  if (acao === "anterior") irPara(estado.indice - 1);
  if (acao === "proxima") irPara(estado.indice + 1);
  if (acao === "ir") irPara(Number(botao.dataset.indice));
  if (acao === "resultado") finalizarProva();
  if (acao === "revisar") irPara(estado.indice);
  if (acao === "reiniciar") reiniciarProva();
}

function aoDigitar(evento) {
  if (evento.target.id !== "editor-sql") return;
  const questao = QUESTOES[estado.indice];
  if (estado.correcoes[questao.id]) return;
  estado.respostas[questao.id] = evento.target.value;
  aviso = "";
  const caixa = document.getElementById("aviso-ativo");
  if (caixa) caixa.remove();
  salvarEstado();
  atualizarLinhas();
}

function aoEnviar(evento) {
  if (evento.target.id !== "form-inicio") return;
  evento.preventDefault();
  const nome = evento.target.nome.value.trim();
  const turma = evento.target.turma.value.trim();
  const dataProva = evento.target.data.value || hojeISO();
  if (!nome) {
    aviso = "Informe o nome do aluno para iniciar a prova.";
    render();
    return;
  }
  estado = {
    ...estadoVazio(),
    nome: nome.slice(0, 80),
    turma: turma.slice(0, 40),
    dataProva,
    dataInicio: new Date().toISOString(),
    iniciada: true,
    tela: "prova"
  };
  aviso = "";
  salvarEstado();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function iniciar() {
  const problemas = validarBancoQuestoes();
  if (problemas.length && typeof console !== "undefined") console.warn(problemas);
  carregarEstado();
  const app = document.getElementById("app");
  app.addEventListener("click", aoClicar);
  app.addEventListener("input", aoDigitar);
  app.addEventListener("submit", aoEnviar);
  render();
}

if (typeof document === "undefined") {
  globalThis.QUESTOES = QUESTOES;
  globalThis.corrigirResposta = corrigirResposta;
  globalThis.validarBancoQuestoes = validarBancoQuestoes;
  globalThis.calcularNota = calcularNota;
  globalThis.classificarNota = classificarNota;
  globalThis.analisarSql = analisarSql;
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
