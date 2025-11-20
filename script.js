(function(){
  const STORAGE_KEY = 'ksa_nps_responses_v1';

  const ui = {
    scale: document.getElementById('scale'),
    submitBtn: document.getElementById('submitBtn'),
    downloadCsvBtn: document.getElementById('downloadCsv'),
    clearStorageBtn: document.getElementById('clearStorage'),
    like: document.getElementById('like'),
    help: document.getElementById('help'),
    problems: document.getElementById('problems'),
    improve: document.getElementById('improve'),
    role: document.getElementById('role'),
    count: document.getElementById('count'),
    nps: document.getElementById('nps'),
    prom: document.getElementById('prom'),
    neu: document.getElementById('neu'),
    det: document.getElementById('det'),
    responsesList: document.getElementById('responsesList')
  };

  let selectedScore = null;

  const storage = {
    load(){
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch(e){
        return [];
      }
    },
    save(list){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    },
    add(resp){
      const list = this.load();
      list.push(resp);
      this.save(list);
      return list;
    },
    clear(){
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  function categorizeScore(score){
    const v = Number(score);
    if (v >= 9) return 'prom';
    if (v >= 7) return 'neu';
    return 'det';
  }

  function computeNpsStats(list){
    if (!list.length){
      return {
        total: 0,
        prom: 0,
        neu: 0,
        det: 0,
        nps: '—'
      };
    }
    const counts = { prom: 0, neu: 0, det: 0 };
    list.forEach(r => {
      counts[categorizeScore(r.score)]++;
    });
    const total = list.length;
    const pProm = Math.round(100 * counts.prom / total);
    const pNeu = Math.round(100 * counts.neu / total);
    const pDet = Math.round(100 * counts.det / total);
    return {
      total,
      prom: pProm,
      neu: pNeu,
      det: pDet,
      nps: pProm - pDet
    };
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function csvSafe(value){
    if (!value && value !== 0) return '';
    let s = String(value).replace(/"/g, '""');
    // se tiver vírgula, aspas ou quebra de linha real, envolver em aspas
    if (/[",]/.test(s) || s.includes('\n')){
      s = `"${s}` + '"';
    }
    return s;
  }

  function buildScale(){
    for (let i = 0; i <= 10; i++){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = i;
      btn.dataset.value = String(i);
      btn.addEventListener('click', () => {
        selectedScore = i;
        document.querySelectorAll('#scale button').forEach(b => {
          b.classList.toggle('selected', b.dataset.value === String(i));
        });
      });
      ui.scale.appendChild(btn);
    }
  }

  function renderStats(){
    const list = storage.load();
    const stats = computeNpsStats(list);

    ui.count.textContent = stats.total;
    ui.nps.textContent = stats.nps;
    ui.prom.textContent = stats.prom;
    ui.neu.textContent = stats.neu;
    ui.det.textContent = stats.det;

    if (!list.length){
      ui.responsesList.innerHTML = '';
      return;
    }

    const recent = list.slice(-20).reverse();
    let html = '<table><thead><tr>' +
      '<th>#</th><th>Data</th><th>Nota</th><th>Papel</th>' +
      '<th>O que gosta</th><th>Ajuda no dia a dia</th>' +
      '<th>Problemas resolvidos</th><th>Melhorar</th>' +
      '</tr></thead><tbody>';

    recent.forEach((r, index) => {
      const rowNumber = list.length - index;
      html += `<tr>` +
        `<td>${rowNumber}</td>` +
        `<td>${escapeHtml(r.ts || '')}</td>` +
        `<td>${escapeHtml(r.score)}</td>` +
        `<td>${escapeHtml(r.role || '')}</td>` +
        `<td>${escapeHtml(r.like || '')}</td>` +
        `<td>${escapeHtml(r.help || '')}</td>` +
        `<td>${escapeHtml(r.problems || '')}</td>` +
        `<td>${escapeHtml(r.improve || '')}</td>` +
        `</tr>`;
    });

    html += '</tbody></table>';
    ui.responsesList.innerHTML = html;
  }

  function handleSubmit(){
    if (selectedScore === null){
      alert('Por favor, escolha uma nota de 0 a 10 antes de enviar.');
      return;
    }

    const response = {
      score: selectedScore,
      like: ui.like.value.trim(),
      help: ui.help.value.trim(),
      problems: ui.problems.value.trim(),
      improve: ui.improve.value.trim(),
      role: ui.role.value.trim(),
      ts: new Date().toLocaleString()
    };

    storage.add(response);
    resetForm();
    renderStats();
    alert('Obrigado! Resposta registrada.');
  }

  function resetForm(){
    selectedScore = null;
    document.querySelectorAll('#scale button').forEach(b => b.classList.remove('selected'));
    ui.like.value = '';
    ui.help.value = '';
    ui.problems.value = '';
    ui.improve.value = '';
    ui.role.value = '';
  }

  function handleDownloadCsv(){
    const list = storage.load();
    if (!list.length){
      alert('Nenhuma resposta para exportar.');
      return;
    }

    const header = ['Data','Papel','Nota','O que gosta','Ajuda no dia a dia','Problemas resolvidos','Melhorar'];
    const rows = list.map(r => [
      r.ts,
      csvSafe(r.role),
      r.score,
      csvSafe(r.like),
      csvSafe(r.help),
      csvSafe(r.problems),
      csvSafe(r.improve)
    ]);

    const csvLines = [header.join(';'), ...rows.map(r => r.join(';'))];
    const blob = new Blob([csvLines.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ksa_nps_respostas.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleClearStorage(){
    if (!confirm('Limpar todas as respostas salvas localmente? Essa ação não pode ser desfeita.')){
      return;
    }
    storage.clear();
    resetForm();
    renderStats();
  }

  function init(){
    buildScale();
    renderStats();
    ui.submitBtn.addEventListener('click', handleSubmit);
    ui.downloadCsvBtn.addEventListener('click', handleDownloadCsv);
    ui.clearStorageBtn.addEventListener('click', handleClearStorage);
  }

  init();
})();