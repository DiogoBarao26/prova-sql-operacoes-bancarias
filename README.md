# Prova Prática de SQL — Operações Bancárias

Avaliação prática de SQL para alunos, com 30 questões contextualizadas em um banco fictício. A aplicação roda **somente no navegador**: não há backend, banco de dados, Node.js em produção nem coleta de dados pessoais.

Arquivos da aplicação:

- `index.html`
- `style.css`
- `script.js`

O progresso (nome, turma, respostas, correções e pontuação) fica no `localStorage` do navegador do aluno.

## Abrir no computador

Abra o arquivo `index.html` em um navegador moderno (Chrome, Edge, Firefox ou Safari). Não é necessário instalar nada.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie os arquivos do projeto para a branch `main` (incluindo `index.html`, `style.css`, `script.js` e este `README.md`).
3. No repositório, acesse **Settings**.
4. Acesse **Pages**.
5. Em **Build and deployment**, selecione **Deploy from a branch**.
6. Selecione:
   - Branch: **main**
   - Folder: **/ (root)**
7. Salve.
8. Aguarde o GitHub gerar o endereço e acesse a página publicada.

Os caminhos de `style.css` e `script.js` são relativos. A prova deve ficar na raiz do site publicado.

## Como a correção funciona

Cada questão vale 100 pontos e possui critérios próprios (comando, tabela, filtro, agregação ou relacionamento). A comparação não exige texto idêntico: maiúsculas, espaços, quebras de linha, ponto e vírgula e aliases de tabela equivalentes são aceitos.

A nota final é `(pontuação / 3000) × 10`, de 0 a 10.

## Para o professor

As questões estão no array `QUESTOES`, no arquivo `script.js`. Cada item traz enunciado, tabelas, resposta esperada, explicação e a lista `elementos` (descrição, peso e verificação). A soma dos pesos de cada questão deve ser 100.

Para incluir uma questão, copie um objeto existente, ajuste o `id` e os critérios. Se o enunciado ou a correção mudarem depois que os alunos já tiverem começado, aumente a constante `VERSAO_BANCO` no início de `script.js`. Isso descarta progressos antigos salvos no navegador, porque as respostas guardadas deixariam de corresponder às questões novas.

Nenhuma resposta é enviada a um servidor. SQL digitado **não é executado**. Os dados do cenário (clientes, contas, saldos, CPF de exemplo no esquema) são fictícios.
