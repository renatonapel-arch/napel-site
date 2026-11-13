/* Etapa 2: compra dentro do site. Lê o arquivo público de produtos da loja e monta:
   - a vitrine da página inicial            <div id="npl-vitrine">
   - a busca única (catálogo + loja)        <form id="npl-busca">
   - as peças ligadas ao artigo do blog     <section id="npl-artigo" data-titulo>
   Se o arquivo da loja não carregar, nada quebra: a página fica como estava. */
(function () {
  var C = window.NAPEL_LOJA || {};
  var ORIGEM = C.origem || 'site';
  var WA = C.whatsapp || '5544991227026';
  var LOJA = C.loja || 'https://loja.napel.com.br/';
  var CATALOGO = C.catalogo || 'https://catalogo.napel.com.br/';
  var prom = null;

  function carrega() {
    if (!prom) prom = fetch(C.json).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { return d.produtos || []; });
    return prom;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function brl(n) { return Number.isInteger(n) ? n.toLocaleString('pt-BR') : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function ir(p, pos) { return p.url + (p.url.indexOf('?') < 0 ? '?' : '&') + 'utm_source=' + ORIGEM + '&utm_medium=' + pos; }
  function zap(msg) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg); }
  function foto(p) { return p.foto_pequena || p.foto; }
  function ordem(a, b) { return (a.ordem || 9e9) - (b.ordem || 9e9); }

  /* duas versões da mesma peça (ferro e nylon, unidade e kit) não entram juntas numa vitrine */
  var VAZIAS = { de: 1, do: 1, da: 1, com: 1, sem: 1, para: 1, e: 1, kit: 1, par: 1 };
  function palavras(nome) {
    var o = {};
    norm(nome).split(' ').forEach(function (t) { if (!VAZIAS[t] && !/^\d+$/.test(t)) o[t.replace(/s$/, '')] = 1; });
    return o;
  }
  function parecidas(a, b) {
    var A = palavras(a.nome), B = palavras(b.nome), i = 0, u = 0, k;
    for (k in A) { u++; if (B[k]) i++; }
    for (k in B) if (!A[k]) u++;
    return u && i / u >= 0.6;
  }
  function semRepetir(lista, n) {
    var out = [];
    for (var i = 0; i < lista.length && out.length < n; i++) {
      if (!out.some(function (x) { return parecidas(x, lista[i]); })) out.push(lista[i]);
    }
    return out;
  }

  function card(p, pos) {
    var ret = p.so_retirada ? '<span class="npl-ret">Retire em Maringá</span>' : '';
    return '<article class="npl-card">' +
      '<a class="npl-foto" href="' + esc(ir(p, pos)) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(foto(p)) + '" alt="" loading="lazy" width="324" height="324"></a>' +
      '<div class="npl-corpo"><a class="npl-nome" href="' + esc(ir(p, pos)) + '">' + esc(p.nome) + '</a>' +
      '<span class="npl-preco"><small>R$</small>' + brl(p.preco) + '</span>' + ret +
      '<a class="npl-comprar" href="' + esc(ir(p, pos)) + '" aria-label="Comprar ' + esc(p.nome) + '">Comprar</a></div></article>';
  }
  function pesadas(P) { return P.filter(function (p) { return p.em_estoque && p.linha_pesada && foto(p); }); }

  /* ---------------- vitrine da página inicial ----------------
     Se a loja marcar "destaque": true em algum produto, a vitrine é essa lista. Senão, os mais vendidos da linha pesada. */
  var vit = document.getElementById('npl-vitrine');
  if (vit) carrega().then(function (P) {
    var base = pesadas(P).sort(ordem);
    var dest = base.filter(function (p) { return p.destaque; });
    var l = dest.length >= 4 ? dest.slice(0, 8) : semRepetir(base, 8);
    if (l.length < 4) return;
    vit.innerHTML = '<div class="npl npl-grade">' + l.map(function (p) { return card(p, 'vitrine'); }).join('') + '</div>';
    document.querySelectorAll('[data-npl-vitrine-on]').forEach(function (e) { e.hidden = false; });
    document.querySelectorAll('[data-npl-vitrine-off]').forEach(function (e) { e.hidden = true; });
  }).catch(function () {});

  /* ---------------- peças ligadas ao artigo do blog ----------------
     Só aparece quando o TÍTULO do artigo cita uma peça e a loja tem pelo menos 3 dessa peça, de linha pesada, com estoque. */
  var art = document.getElementById('npl-artigo');
  if (art) carrega().then(function (P) {
    var PECAS = ['feixe', 'mola', 'bucha', 'amortecedor', 'batente', 'coxim', 'catraca', 'lona', 'tambor', 'cuica', 'camara', 'diafragma', 'jumelo',
      'grampo', 'balanca', 'pino', 'tirante', 'tensor', 'retentor', 'pastilha', 'separador', 'suporte', 'bolsa', 'fole'];
    // estas palavras também aparecem como complemento ("bucha DA MOLA", "roda SEM CÂMARA"): só valem quando são a peça em si
    var SO_PECA = { mola: 1, feixe: 1, pino: 1, suporte: 1, bolsa: 1, fole: 1, camara: 1, separador: 1 };
    var PULA = { kit: 1, par: 1, jogo: 1, conjunto: 1, com: 1, de: 1 };
    function igual(t, k) { return t === k || (t.indexOf(k) === 0 && t.length <= k.length + 2); }
    function tem(toks, k) { return toks.some(function (t) { return igual(t, k); }); }
    function peca(toks) { for (var i = 0; i < toks.length; i++) if (!PULA[toks[i]] && !/^\d+$/.test(toks[i])) return toks[i]; return ''; }
    // o assunto é a PRIMEIRA peça citada no título ("Grampo de mola" é sobre grampo, não sobre mola)
    var tit = norm(art.dataset.titulo).split(' '), chaves = [];
    for (var ti = 0; ti < tit.length && !chaves.length; ti++) PECAS.forEach(function (k) { if (!chaves.length && igual(tit[ti], k)) chaves.push(k); });
    if (!chaves.length) return;
    var l = pesadas(P).map(function (p) {
      var toks = norm(p.nome).split(' '), cab = peca(toks), s = 0;
      chaves.forEach(function (k) { if (SO_PECA[k] ? igual(cab, k) : tem(toks, k)) s++; });
      return { p: p, s: s };
    }).filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || ordem(a.p, b.p); }).map(function (x) { return x.p; });
    l = semRepetir(l, 4);
    if (l.length < 3) return;
    art.querySelector('.npl-grade').innerHTML = l.map(function (p) { return card(p, 'artigo-blog'); }).join('');
    art.hidden = false;
  }).catch(function () {});

  /* ---------------- busca única: catálogo inteiro + loja; nunca devolve tela vazia ---------------- */
  var form = document.getElementById('npl-busca');
  if (!form) return;
  var inp = form.querySelector('input'), res = document.getElementById('npl-res');
  var idx = null, carregando = null, tm;

  function catalogo() {            // products.js do catálogo: só é baixado quando a pessoa começa a buscar
    return new Promise(function (ok) {
      if (typeof PRODUCTS !== 'undefined') return ok(PRODUCTS);
      var s = document.createElement('script'); s.src = C.produtosJs;
      s.onload = function () { ok(typeof PRODUCTS !== 'undefined' ? PRODUCTS : []); };
      s.onerror = function () { ok([]); };
      document.head.appendChild(s);
    });
  }
  function prepara() {
    if (!carregando) carregando = Promise.all([carrega().catch(function () { return []; }), catalogo()]).then(function (r) {
      var L = r[0], K = r[1], porSku = {}, out = [];
      K.forEach(function (c) { porSku[c.sku] = c; });
      L.forEach(function (p) {
        var c = porSku[p.sku]; if (c) c._naLoja = 1;
        out.push({ loja: p, compra: !!p.em_estoque, cod: /^\d{6}$/.test(p.sku || '') ? p.sku : '', nome: p.nome, img: foto(p),
          h: norm([p.nome, p.sku, p.categoria_nome, c && [c.descricao, c.cod_fab, c.num_orig, c.marca, c.aplicacao, c.compat].join(' ')].join(' ')) });
      });
      K.forEach(function (c) {
        if (c._naLoja) return;
        out.push({ cat: c, cod: c.sku, nome: c.descricao, img: c.img ? C.catalogoImg + c.img : '',
          h: norm([c.sku, c.descricao, c.desc_orig, c.marca, c.cod_fab, c.num_orig, c.d1, c.d2, c.aplicacao, c.compat].join(' ')) });
      });
      idx = out; return out;
    });
    return carregando;
  }
  // comprável de linha pesada primeiro, depois os demais compráveis, depois o que é por cotação (com foto antes)
  function peso(x) { return x.compra ? (x.loja.linha_pesada ? 0 : 1) : (x.img ? 2 : 3); }
  function busca(q) {
    var tk = norm(q).split(' ').filter(Boolean);
    if (!tk.length) return [];
    return idx.filter(function (x) { for (var i = 0; i < tk.length; i++) if (x.h.indexOf(tk[i]) < 0) return false; return true; })
      .sort(function (a, b) { return peso(a) - peso(b) || ((a.loja && a.loja.ordem) || 9e9) - ((b.loja && b.loja.ordem) || 9e9); });
  }
  function linha(x) {
    var img = '<img src="' + esc(x.img || C.semFoto) + '" alt="" loading="lazy" width="52" height="52">';
    var det = [];
    if (x.cod) det.push('Cód. ' + esc(x.cod));
    if (x.cat && x.cat.marca) det.push(esc(x.cat.marca));
    if (x.compra && x.loja.so_retirada) det.push('Retire em Maringá');
    var lado, dest;
    if (x.compra) {
      dest = ir(x.loja, 'busca');
      lado = '<span class="npl-v">R$ ' + brl(x.loja.preco) + '</span><a class="npl-acao c" href="' + esc(dest) + '">Comprar</a>';
    } else {
      var msg = 'Olá! Procuro esta peça no site da Napel:\n\n*' + x.nome + '*' + (x.cod ? '\nCódigo: ' + x.cod : '') + '\n\nPode me passar disponibilidade e preço?';
      dest = x.cat ? CATALOGO + '?q=' + encodeURIComponent(x.cod) + '#p=' + encodeURIComponent(x.cod) : zap(msg);
      lado = '<a class="npl-acao w" href="' + esc(zap(msg)) + '" target="_blank" rel="noopener">Cotar</a>';
    }
    var alvo = !x.compra && !x.cat ? ' target="_blank" rel="noopener"' : '';
    return '<div class="npl-item">' + img + '<span class="npl-txt"><a class="npl-t" href="' + esc(dest) + '"' + alvo + '>' + esc(x.nome) + '</a>' +
      (det.length ? '<span class="npl-c">' + det.join(' · ') + '</span>' : '') + '</span><span class="npl-lado">' + lado + '</span></div>';
  }
  function mostra() {
    var q = inp.value.trim();
    if (q.length < 2) { res.hidden = true; res.innerHTML = ''; return; }
    res.hidden = false;
    if (!idx) { res.innerHTML = '<p class="npl-aviso">Carregando o catálogo…</p>'; return; }
    var r = busca(q);
    if (!r.length) {
      res.innerHTML = '<p class="npl-aviso"><strong>Não achamos "' + esc(q) + '" no catálogo.</strong><br>Mande o código, a foto ou a aplicação pelo WhatsApp e a gente procura para você.</p>' +
        '<div class="npl-mais"><a href="' + esc(zap('Olá! Procurei "' + q + '" no site da Napel e não achei. Podem me ajudar?')) + '" target="_blank" rel="noopener">Perguntar no WhatsApp</a></div>';
      return;
    }
    var mais = [];
    if (r.length > 6) {                      // só oferece "ver todos" quando há mais do que a lista mostra
      var nCompra = r.filter(function (x) { return x.compra; }).length, nCat = r.filter(function (x) { return x.cat; }).length;
      if (nCompra) mais.push('<a href="' + esc(LOJA + '?s=' + encodeURIComponent(q) + '&post_type=product&utm_source=' + ORIGEM + '&utm_medium=busca') + '">Ver ' + nCompra + ' com compra online</a>');
      if (nCat) mais.push('<a href="' + esc(CATALOGO + '?q=' + encodeURIComponent(q)) + '">Ver ' + nCat + ' no catálogo</a>');
    }
    res.innerHTML = r.slice(0, 6).map(linha).join('') + (mais.length ? '<div class="npl-mais">' + mais.join('') + '</div>' : '');
  }
  inp.addEventListener('focus', function () { prepara().then(mostra); }, { once: true });
  inp.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { prepara().then(mostra); mostra(); }, 140); });
  form.addEventListener('submit', function (e) { e.preventDefault(); prepara().then(mostra); mostra(); });
  inp.addEventListener('keydown', function (e) { if (e.key === 'Escape') { inp.value = ''; mostra(); } });
})();
