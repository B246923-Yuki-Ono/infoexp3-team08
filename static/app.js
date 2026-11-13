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
            </article>
        `).join('');
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

// 投稿処理
document.querySelector('#form').addEventListener('submit', async e => {
    e.preventDefault();

    const name = document.querySelector('#name').value;
    const message = document.querySelector('#message').value;

    const r = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message })
    });

    document.querySelector('#status').textContent =
        r.ok ? '投稿しました' : '投稿に失敗しました';

    if (r.ok) {
        document.querySelector('#message').value = '';

        // 投稿後にMessageの文字数もリセット
        updateCount('#message', '#message-count', 300);

        await loadMessages();
    }
});

loadMessages();