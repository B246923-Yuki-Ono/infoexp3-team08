async function loadMessages() {
    const r = await fetch('/api/messages');
    const xs = await r.json();

    document.querySelector('#messages').innerHTML =
        xs.map(x => `
            <article class="message">
                <b>${escapeHtml(x.name)}</b>

                <p>${escapeHtml(x.message)}</p>

                <div class="meta">
                    #${x.id} | ${formatDate(x.created_at)}
                </div>
              <button class="reply-trigger-btn" data-id="${x.id}" data-name="${escapeHtml(x.name)}" style="margin-top: 5px;">
                    #${x.id} に返信する
                </button>
                <button class="like-btn" data-id="${x.id}">
                   👍 いいね ${x.likes}
                </button>
                <div style="margin-top: 10px;">
                    <button class="edit-btn" data-id="${x.id}">編集</button>
                    <button class="delete-btn" data-id="${x.id}">削除</button>
                </div>
            </article>

        `).join('');

    // 削除ボタンのイベント登録
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            const id = e.currentTarget.getAttribute('data-id');

            if (!confirm(`投稿 #${id} を削除しますか？`)) return;

            const res = await fetch(`/api/messages/${id}`, {
                method: 'DELETE'
            });

            if (res.ok || res.status === 204) {
                await loadMessages();
            } else {
                alert('削除に失敗しました');
            }
        });
    });
    // いいねボタンのイベント登録
    document.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = e.currentTarget.getAttribute('data-id');
        const res = await fetch(`/api/messages/${id}/like`, {
            method: 'POST'
        });

        if (res.ok) {
            await loadMessages();
        } else {
            alert('いいねに失敗しました');
        }
      });
    });

    // 「〇番に返信する」ボタンが押されたとき、上の投稿フォームに自動で「>>〇」を挿入する親切設計
    document.querySelectorAll('.reply-trigger-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = e.currentTarget.getAttribute('data-id');
            const name = e.currentTarget.getAttribute('data-name');
            const messageArea = document.querySelector('#message');
            
            // メッセージ欄に「>>ID (名前さんへ): 」のようなアンカーを自動入力
            messageArea.value = `>>${id} (${name}さんへ)\n`;
            messageArea.focus();
        });
    });

    // 編集ボタンのイベント登録
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const article = e.currentTarget.closest('.message');
            const messageElement = article.querySelector('p');

            // 現在の投稿内容を取得
            const currentMessage = messageElement.textContent;

            // 編集用の入力欄を作成
            const textarea = document.createElement('textarea');
            textarea.value = currentMessage;
            textarea.maxLength = 300;

            // 保存ボタン
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '保存';

            // キャンセルボタン
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'キャンセル';

            // 編集用の領域
            const editArea = document.createElement('div');
            editArea.className = 'edit-area';

            editArea.appendChild(textarea);
            editArea.appendChild(saveBtn);
            editArea.appendChild(cancelBtn);

            // 元の本文を編集欄に置き換える
            messageElement.replaceWith(editArea);

            // 編集ボタンを一時的に非表示
            btn.style.display = 'none';

            // キャンセル処理
            cancelBtn.addEventListener('click', () => {
                editArea.replaceWith(messageElement);
                btn.style.display = '';
            });

            // 保存処理
            saveBtn.addEventListener('click', async () => {
                const newMessage = textarea.value.trim();

                if (!newMessage) {
                    alert('メッセージを入力してください');
                    return;
                }

                const id = btn.getAttribute('data-id');

                const res = await fetch(`/api/messages/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: newMessage
                    })
                });

                if (res.ok) {
                    await loadMessages();
                } else {
                    alert('編集に失敗しました');
                }
            });
        });
    });
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// 投稿日時を整形する関数
function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 文字数を更新する関数
function updateCount(inputId, countId, maxLength) {
    const input = document.querySelector(inputId);
    const count = document.querySelector(countId);

    const currentLength = input.value.length;

    count.textContent = `${currentLength} / ${maxLength}文字`;
}

// Nicknameの入力時に文字数を更新
document.querySelector('#name').addEventListener('input', () => {
    updateCount('#name', '#name-count', 30);
});

// Messageの入力時に文字数を更新
document.querySelector('#message').addEventListener('input', () => {
    updateCount('#message', '#message-count', 300);
});

// 初期表示
updateCount('#name', '#name-count', 30);
updateCount('#message', '#message-count', 300);

// ボタン制御関数
function setSubmitButtonState(isSubmitting) {
    const btn = document.querySelector('#form button') ||
                document.querySelector('button[type="submit"]');

    if (!btn) return;

    if (isSubmitting) {
        btn.disabled = true;
        btn._originalText = btn.textContent;
        btn.textContent = '送信中...';
    } else {
        btn.disabled = false;
        btn.textContent = btn._originalText || '送信';
    }
}

// 投稿処理
document.querySelector('#form').addEventListener('submit', async e => {
    e.preventDefault();

    const name = document.querySelector('#name').value;
    const message = document.querySelector('#message').value;

    // 送信開始：連打を防止
    setSubmitButtonState(true);

    try {
        const r = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, message })
        });

        document.querySelector('#status').textContent =
            r.ok ? '投稿しました' : '投稿に失敗しました';

        if (r.ok) {
            document.querySelector('#message').value = '';

            // 文字数カウントをリセット
            updateCount('#message', '#message-count', 300);

            await loadMessages();
        }
    } finally {
        // 送信終了：ボタンを元に戻す
        setSubmitButtonState(false);
    }
});

loadMessages();

// ==========================================
// 参加者募集機能
// ==========================================
function setupRecruitmentFeature() {
    // 1. 投稿フォームに「募集定員」入力欄を自動挿入
    const form = document.querySelector('#form');
    const submitBtn = form?.querySelector('button');
    if (form && submitBtn && !document.querySelector('#recruitment-capacity')) {
        const capInput = document.createElement('input');
        capInput.type = 'number';
        capInput.id = 'recruitment-capacity';
        capInput.min = '1';
        capInput.max = '50';
        capInput.placeholder = '募集定員（任意：1〜50人 / 空欄なら通常投稿）';
        form.insertBefore(capInput, submitBtn);
    }

    // 2. 新規投稿APIの完了を検知し、定員が入力されていれば募集情報を登録
    const originalFetch = window.fetch;
    window.fetch = async function (url, options) {
        const response = await originalFetch.apply(this, arguments);
        if (url === '/api/messages' && options?.method === 'POST' && response.ok) {
            const capInput = document.querySelector('#recruitment-capacity');
            const capacity = parseInt(capInput?.value, 10);
            if (capacity >= 1) {
                const created = await response.clone().json();
                await originalFetch('/api/recruitments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message_id: created.id, capacity })
                });
                capInput.value = '';
            }
        }
        return response;
    };

    // 3. 投稿一覧(#messages)が更新されたら各カードに募集UIを描画
    const messagesEl = document.querySelector('#messages');
    if (messagesEl) {
        const observer = new MutationObserver(() => {
            renderRecruitmentBoxes();
        });
        observer.observe(messagesEl, { childList: true });
    }
}

async function renderRecruitmentBoxes() {
    const res = await fetch('/api/recruitments');
    if (!res.ok) return;
    const recruitments = await res.json();

    document.querySelectorAll('#messages .message').forEach(article => {
        // 投稿IDを取得（削除ボタンのdata-id、またはメタ情報の #数字 から取得）
        const id = article.querySelector('.delete-btn')?.getAttribute('data-id')
            || article.querySelector('.meta')?.textContent.match(/#(\d+)/)?.[1];
        if (!id || !recruitments[id]) return;

        // 再描画用に既存の募集枠があれば一度削除
        article.querySelector('.recruitment-box')?.remove();

        const { capacity, participants } = recruitments[id];
        const isFull = participants.length >= capacity;

        const box = document.createElement('div');
        box.className = 'recruitment-box';
        box.innerHTML = `
            <div class="recruitment-header">
                <span class="recruitment-badge ${isFull ? 'full' : 'open'}">
                    ${isFull ? '満員御礼' : '参加者募集中'}（${participants.length} / ${capacity}人）
                </span>
            </div>
            <div class="recruitment-members">
                参加者：${participants.length > 0 ? participants.map(escapeHtml).join(', ') : 'まだいません'}
            </div>
            ${isFull ? '' : `
                <div class="recruitment-join-row">
                    <input type="text" class="join-name-input" maxlength="30" placeholder="参加する名前">
                    <button type="button" class="join-btn">参加する</button>
                </div>
            `}
        `;

        // 参加ボタンのクリック処理
        const joinBtn = box.querySelector('.join-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', async () => {
                const nameInput = box.querySelector('.join-name-input');
                const name = nameInput.value.trim();
                if (!name) {
                    alert('参加する名前を入力してください');
                    return;
                }
                joinBtn.disabled = true;
                try {
                    const joinRes = await fetch(`/api/recruitments/${id}/join`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name })
                    });
                    if (joinRes.ok) {
                        await renderRecruitmentBoxes();
                    } else {
                        const err = await joinRes.json().catch(() => ({}));
                        alert(err.error || '参加登録に失敗しました');
                    }
                } finally {
                    joinBtn.disabled = false;
                }
            });
        }

        article.appendChild(box);
    });
}

setupRecruitmentFeature();