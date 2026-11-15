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
                <button class="delete-btn" data-id="${x.id}">
                    削除
                </button>
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