// js/help/help-panel.js
// 「？ヘルプ」タブの中身。チャットボット風に選択肢を出し、押したら説明へ降りていく。
//
// ここが持つのはDOMの組み立てと「今どこを開いているか」だけで、文章は
// js/help/help-content.js にある。storeには一切触らない（ヘルプは各ブラウザの
// ローカルUIであって、部屋の状態ではないため）。
//
// 描画にinnerHTMLは使わない。文章は自前で書いたものだが、ここで一度でも
// innerHTMLを許すと「あとから部屋の値を差し込みたい」となったときに
// そのまま穴になる。最初からtextContentだけで組む。

import { GREETINGS, buildHelpRoot } from './help-content.js';
import { setIconText } from '../icons.js';

// アバター画像。差し替えるときはここだけ触ればよい。
// image/ は server/index.js の PUBLIC_DIRS に入っているので、そこへ置いたものは
// そのまま参照できる。
const HELP_AVATAR_SRC = './image/iconDediDevi.png';

// 直前に出したあいさつ。同じものが2回続くと「ランダム」に見えないので1回だけ引き直す。
let lastGreeting = null;

function pickGreeting() {
  if (GREETINGS.length === 0) return '';
  let text = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  if (text === lastGreeting && GREETINGS.length > 1) {
    text = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  }
  lastGreeting = text;
  return text;
}

// 本文（文字列の配列）を段落として吹き出しへ入れる。文字列1つだけでも受ける。
function fillBubble(bubble, body) {
  const paragraphs = Array.isArray(body) ? body : [body];
  paragraphs.forEach(text => {
    const p = document.createElement('p');
    p.className = 'help-paragraph';
    p.textContent = String(text);
    bubble.appendChild(p);
  });
}

/**
 * ヘルプの対話パネルを1つ作る。
 *
 * @param {object} options
 * @param {HTMLElement} options.container 対話を描き込む要素（#helpChat）
 * @param {() => (string|null)} options.getActivePlugin 開くたびに呼ばれ、部屋の適用プラグインIDを返す
 * @returns {{ open: () => void }}
 */
export function createHelpPanel({ container, getActivePlugin }) {
  // 今いる場所を根からの経路で持つ。[root, 本体機能, チャットコマンド, …]。
  // 末尾が「今表示しているノード」で、1つ前がその親。戻る導線はこの配列から作る。
  let path = [];

  function scrollToBottom() {
    container.scrollTop = container.scrollHeight;
  }

  // ボットの発言（アバター＋吹き出し）を1つ積む。
  function appendBotRow(body) {
    const row = document.createElement('div');
    row.className = 'help-chat-row';

    const avatar = document.createElement('div');
    avatar.className = 'help-avatar';
    avatar.style.backgroundImage = `url("${HELP_AVATAR_SRC}")`;
    row.appendChild(avatar);

    const bubble = document.createElement('div');
    bubble.className = 'help-bubble';
    fillBubble(bubble, body);
    row.appendChild(bubble);

    container.appendChild(row);
  }

  // 押した選択肢を「自分の発言」として積む（会話に見せるため）。
  function appendUserRow(text) {
    const row = document.createElement('div');
    row.className = 'help-chat-row is-user';

    const bubble = document.createElement('div');
    bubble.className = 'help-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);

    container.appendChild(row);
  }

  // 選択肢の並びを1ブロック積む。itemsは { label, isBack, icon, onSelect } の配列。
  // 積んだブロックは押されたら消す（過去の選択肢が残っていると、どれが「今の問い」か
  // 分からなくなるため）。
  function appendChoices(items) {
    if (items.length === 0) return;

    const box = document.createElement('div');
    box.className = 'help-choices';

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'help-choice' + (item.isBack ? ' is-back' : '');
      if (item.icon) {
        setIconText(btn, item.icon, item.label);
      } else {
        btn.textContent = item.label;
      }
      btn.addEventListener('click', () => {
        box.remove();
        appendUserRow(item.label);
        item.onSelect();
      });
      box.appendChild(btn);
    });

    container.appendChild(box);
  }

  // ノードを1つ開く。pathの末尾に積んでから、本文と次の選択肢を出す。
  function enter(node) {
    path.push(node);
    if (node.body) appendBotRow(node.body);

    const children = node.children || [];
    if (children.length > 0) {
      appendChoices(children.map(child => ({ label: child.label, onSelect: () => enter(child) })));
    } else {
      appendTerminalChoices();
    }
    scrollToBottom();
  }

  // 終端（次への選択肢が無い項目）を出したあとの戻り道。
  // 「同じ層の他の項目」→「1つ上の層へ」→「最初へ」の順に並べる。
  // ここを出さないと、終端に着いた人がヘルプタブを開き直すしかなくなる。
  function appendTerminalChoices() {
    const terminal = path[path.length - 1];
    const parent = path[path.length - 2] || null;
    const items = [];

    // 同じ層の兄弟（自分以外）。「基本機能／チャットコマンド」のような並びがここに戻る。
    (parent?.children || []).forEach(sibling => {
      if (sibling === terminal) return;
      items.push({
        label: sibling.label,
        onSelect: () => {
          path.pop(); // 終端を降りる（兄弟は同じ層なので親の下に積み直す）
          enter(sibling);
        }
      });
    });

    // 1つ上（親の親）へ。path[0]は根なので、path.lengthが4未満＝親の親が根ということ。
    // そのときは出さない（「最初にもどる」と行き先が同じになるうえ、根は選択肢として
    // 表示されるノードではないのでlabelも戻るボタン用の文言しか持っていない）。
    const grandParent = path.length >= 4 ? path[path.length - 3] : null;
    if (parent && grandParent) {
      items.push({
        label: `${grandParent.label}にもどる`,
        icon: 'chevron-left',
        isBack: true,
        onSelect: () => {
          path = path.slice(0, -3); // 終端・親・祖父を降ろしてから開き直す
          enter(grandParent);
        }
      });
    }

    items.push({ label: '最初にもどる', isBack: true, onSelect: () => open() });
    appendChoices(items);
  }

  // ヘルプを開く（「最初にもどる」からも呼ぶ）。毎回あいさつを引き直す。
  function open() {
    container.innerHTML = '';
    path = [];

    appendBotRow(pickGreeting());

    const root = buildHelpRoot(getActivePlugin());
    // 根は「選ばれて表示されるノード」ではないので、enter()には通さず自分で積む。
    path.push(root);
    appendChoices((root.children || []).map(child => ({
      label: child.label,
      onSelect: () => enter(child)
    })));
    scrollToBottom();
  }

  return { open };
}
