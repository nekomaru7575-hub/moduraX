// js/room-index.js
// 部屋一覧ページ（index.html）のロジック。/api/roomsで一覧を取得し、
// 使用中の部屋は「入室」リンク、空き部屋は名前・プラグイン・BCDiceシステム・
// （任意で）全データ読み込みの簡易フォームを表示する。部屋の作成自体は
// このページ上で完結させ（POST /api/rooms）、成功したらそのまま盤面へ遷移する。
// 部屋作成前はWebSocket接続を一切受け付けないサーバー側仕様と対になっている。

import { listPlugins } from './parameters/registry.js';
import { fetchGameSystems, prefetchGameSystemInfo } from './bcdice-catalog.js';

const roomListEl = document.getElementById('roomList');

// BCDiceのシステム一覧。手書きの定数を持たず、ページを開いたときにAPI（サーバー側で
// キャッシュ済み）から取得したものを、全カードのselectと使用中カードの表示名で共有する。
// 取得に失敗した場合は空のままで、部屋一覧の表示・入室自体は止めない。
let bcdiceSystems = [];

function buildSelectOptions(select, options, { valueKey = 'id', labelKey = 'label', noneLabel } = {}) {
  select.innerHTML = '';
  if (noneLabel) {
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = noneLabel;
    select.appendChild(noneOpt);
  }
  options.forEach((opt) => {
    const el = document.createElement('option');
    el.value = opt[valueKey];
    el.textContent = opt[labelKey];
    select.appendChild(el);
  });
}

function buildOccupiedCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card';

  const header = document.createElement('div');
  header.className = 'room-card-header';

  const titleBlock = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'room-card-title';
  title.textContent = room.name || room.id;
  titleBlock.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'room-card-meta';
  const pluginLabel = room.activePlugin ? room.activePlugin : 'プラグインなし';
  const bcdiceLabel = bcdiceSystems.find((s) => s.id === room.bcdiceSystem)?.name || room.bcdiceSystem;
  meta.textContent = `${pluginLabel} / ${bcdiceLabel}`;
  titleBlock.appendChild(meta);

  header.appendChild(titleBlock);

  const joinLink = document.createElement('a');
  joinLink.className = 'btn';
  joinLink.textContent = '入室';
  joinLink.href = `/combined_layout.html?room=${encodeURIComponent(room.id)}`;
  header.appendChild(joinLink);

  card.appendChild(header);
  return card;
}

function buildVacantCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card vacant';

  const header = document.createElement('div');
  header.className = 'room-card-header';

  const titleBlock = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'room-card-title';
  title.textContent = `${room.id}（空き部屋）`;
  titleBlock.appendChild(title);
  header.appendChild(titleBlock);

  const setupBtn = document.createElement('button');
  setupBtn.type = 'button';
  setupBtn.className = 'btn btn-secondary';
  setupBtn.textContent = '初期設定';
  setupBtn.addEventListener('click', () => {
    card.classList.toggle('open');
  });
  header.appendChild(setupBtn);

  card.appendChild(header);

  // --- 初期設定フォーム（名前・プラグイン・BCDiceシステム・全データ読み込み） ---
  const form = document.createElement('form');
  form.className = 'vacant-form';

  const nameGroup = document.createElement('div');
  const nameLabel = document.createElement('label');
  nameLabel.textContent = '部屋名';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.required = true;
  nameInput.placeholder = room.id;
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  const selectRow = document.createElement('div');
  selectRow.className = 'vacant-form-row';

  const pluginGroup = document.createElement('div');
  const pluginLabel = document.createElement('label');
  pluginLabel.textContent = 'プラグイン（システム）';
  const pluginSelect = document.createElement('select');
  buildSelectOptions(pluginSelect, listPlugins(), { noneLabel: '（プラグインなし）' });
  pluginGroup.appendChild(pluginLabel);
  pluginGroup.appendChild(pluginSelect);
  selectRow.appendChild(pluginGroup);

  const bcdiceGroup = document.createElement('div');
  const bcdiceLabel = document.createElement('label');
  bcdiceLabel.textContent = 'BCDiceのシステム';
  const bcdiceSelect = document.createElement('select');
  if (bcdiceSystems.length > 0) {
    buildSelectOptions(bcdiceSelect, bcdiceSystems, { labelKey: 'name' });
    // 部屋作成時にシステムが決まったタイミングで、そのシステムの情報（command_pattern /
    // help_message）を先に取りに行き、サーバー側のキャッシュを温めておく。
    bcdiceSelect.addEventListener('change', () => prefetchGameSystemInfo(bcdiceSelect.value));
  } else {
    // 一覧を取得できなかった場合。値を空で送るとサーバー側が既定システムを使う。
    buildSelectOptions(bcdiceSelect, [], { noneLabel: '（一覧を取得できませんでした：既定のシステムで作成します）' });
  }
  bcdiceGroup.appendChild(bcdiceLabel);
  bcdiceGroup.appendChild(bcdiceSelect);
  selectRow.appendChild(bcdiceGroup);

  form.appendChild(selectRow);

  const fileGroup = document.createElement('div');
  const fileLabel = document.createElement('label');
  fileLabel.textContent = '部屋の全データ読み込み（任意・以前保存したファイル）';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileGroup.appendChild(fileLabel);
  fileGroup.appendChild(fileInput);
  form.appendChild(fileGroup);

  const errorText = document.createElement('p');
  errorText.className = 'error-text';
  errorText.style.display = 'none';
  form.appendChild(errorText);

  const btnRow = document.createElement('div');
  btnRow.className = 'vacant-form-buttons';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => card.classList.remove('open'));
  btnRow.appendChild(cancelBtn);

  const createBtn = document.createElement('button');
  createBtn.type = 'submit';
  createBtn.className = 'btn';
  createBtn.textContent = '作成して入室';
  btnRow.appendChild(createBtn);

  form.appendChild(btnRow);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorText.style.display = 'none';

    let importedState;
    const file = fileInput.files?.[0];
    if (file) {
      try {
        importedState = JSON.parse(await file.text());
      } catch (error) {
        errorText.textContent = `ファイルの読み込みに失敗しました: ${error.message}`;
        errorText.style.display = 'block';
        return;
      }
    }

    createBtn.disabled = true;
    createBtn.textContent = '作成中...';

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: room.id,
          name: nameInput.value,
          activePlugin: pluginSelect.value || null,
          bcdiceSystem: bcdiceSelect.value,
          importedState
        })
      });

      const result = await response.json();
      if (!response.ok) {
        errorText.textContent = result.error || '部屋の作成に失敗しました。';
        errorText.style.display = 'block';
        createBtn.disabled = false;
        createBtn.textContent = '作成して入室';
        return;
      }

      window.location.href = `/combined_layout.html?room=${encodeURIComponent(room.id)}`;
    } catch (error) {
      errorText.textContent = `通信エラー: ${error.message}`;
      errorText.style.display = 'block';
      createBtn.disabled = false;
      createBtn.textContent = '作成して入室';
    }
  });

  card.appendChild(form);
  return card;
}

async function loadRooms() {
  // BCDiceのシステム一覧は部屋一覧と同時に取りに行く。こちらが失敗しても
  // 部屋の一覧表示と入室は成立させたいので、失敗は空配列に丸めて先へ進む。
  const systemsPromise = fetchGameSystems().catch((error) => {
    console.warn('[room-index] BCDiceのシステム一覧を取得できませんでした:', error.message);
    return [];
  });

  try {
    const response = await fetch('/api/rooms');
    const data = await response.json();
    bcdiceSystems = await systemsPromise;

    roomListEl.innerHTML = '';
    data.rooms.forEach((room) => {
      const card = room.occupied ? buildOccupiedCard(room) : buildVacantCard(room);
      roomListEl.appendChild(card);
    });
  } catch (error) {
    roomListEl.innerHTML = '';
    const errorEl = document.createElement('p');
    errorEl.style.color = '#f28b82';
    errorEl.textContent = `部屋一覧の取得に失敗しました: ${error.message}`;
    roomListEl.appendChild(errorEl);
  }
}

loadRooms();
