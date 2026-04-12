export function getChatbotTemplate(type = 'default', company) {
  const name = company.name || 'AI Assistant';
  const logo = company.logo || '';
  const apiKey = company.apiKey || '';
  const slug = company.slug || '';
  const apiUrl = process.env.VITE_API_URL || 'https://aithor1.vercel.app/api';

  const logoHtml = logo 
    ? `<img src="${logo}" alt="${name}" class="company-logo">`
    : `<div class="company-logo-placeholder">${name.charAt(0)}</div>`;

  const script = getTemplateScript(apiUrl, apiKey);

  const typingStyle = `
        .typing { display: flex; gap: 5px; padding: 10px 0; justify-content: center; }
        .typing span { width: 8px; height: 8px; background: currentColor; border-radius: 50%; opacity: 0.4; animation: typing 1s infinite alternate; }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing { from { transform: translateY(0); opacity: 0.4; } to { transform: translateY(-7px); opacity: 1; } }
  `;

  const templates = {
    'default': `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - Chat</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg: #050505;
            --card-bg: #111111;
            --border: #333333;
            --text: #ffffff;
            --text-muted: #888888;
            --primary: #4f46e5;
            --primary-glow: rgba(79, 70, 229, 0.4);
            --font-ar: 'Cairo', sans-serif;
        }

        ${typingStyle}

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: var(--font-ar); }
        
        body {
            background-color: var(--bg);
            color: var(--text);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        .chat-container {
            width: 100%; max-width: 600px; height: 100vh; display: flex; flex-direction: column;
            background: var(--card-bg);
            border-left: 1px solid var(--border); border-right: 1px solid var(--border);
            box-shadow: 0 0 40px rgba(0,0,0,0.5);
            position: relative;
        }

        .header {
            padding: 20px 24px; border-bottom: 1px solid var(--border);
            display: flex; align-items: center; justify-content: space-between;
            background: rgba(10, 10, 15, 0.4);
            backdrop-filter: blur(10px);
        }
        .header-left { display: flex; align-items: center; gap: 15px; }
        .company-logo, .company-logo-placeholder {
            width: 45px; height: 45px; border-radius: 14px; object-fit: cover;
            border: 2px solid var(--border);
        }
        .company-logo-placeholder {
            background: linear-gradient(135deg, var(--border), #222);
            display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 20px;
        }
        .header-info h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
        .status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #22c55e; }
        .status-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px #22c55e; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

        .messages-area {
            flex: 1; overflow-y: auto; padding: 25px; display: flex; flex-direction: column; gap: 20px;
            scroll-behavior: smooth;
        }
        .messages-area::-webkit-scrollbar { width: 5px; }
        .messages-area::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }

        .message { display: flex; gap: 12px; max-width: 85%; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .message.ai { align-self: flex-end; flex-direction: row-reverse; }
        .message.user { align-self: flex-start; flex-direction: row; }

        .msg-avatar {
            width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; font-size: 14px;
        }
        .message.ai .msg-avatar { background: var(--text); color: var(--bg); }
        .message.user .msg-avatar { background: var(--border); color: var(--text); }

        .msg-bubble {
            padding: 14px 18px; border-radius: 18px; font-size: 15px; line-height: 1.6;
            position: relative; white-space: pre-wrap; word-break: break-word; text-align: right;
        }
        .message.ai .msg-bubble { 
            background: transparent; border: 1px solid var(--border); 
            border-bottom-left-radius: 4px; color: var(--text);
        }
        .message.user .msg-bubble { 
            background: var(--text); color: var(--bg);
            border-bottom-right-radius: 4px;
        }
        
        .message .msg-content {
            display: flex; flex-direction: column; gap: 4px; 
            width: fit-content; max-width: 100%;
        }
        .message.ai .msg-content { align-items: flex-start; }
        .message.user .msg-content { align-items: flex-end; }

        .input-area {
            padding: 20px 24px; background: var(--bg); border-top: 1px solid var(--border);
        }
        .input-wrapper {
            display: flex; gap: 12px; background: var(--card-bg); padding: 8px;
            border-radius: 16px; border: 1px solid var(--border); transition: all 0.3s;
        }
        .input-wrapper:focus-within { border-color: var(--text); box-shadow: 0 0 15px rgba(255, 255, 255, 0.1); }
        input {
            flex: 1; background: transparent; border: none; outline: none; color: var(--text);
            padding: 10px 15px; font-size: 15px;
        }
        .send-btn {
            width: 45px; height: 45px; border-radius: 12px; background: var(--text);
            border: none; color: var(--bg); cursor: pointer; transition: 0.2s;
            display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .send-btn i { transform: scaleX(-1); }
        .send-btn:hover { transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ai-buttons-container {
            display: flex; flex-direction: column; gap: 6px;
            width: 100%; min-width: 150px; box-sizing: border-box; 
            align-items: stretch; margin-top: 8px;
        }
        
        .product-btn {
            background: var(--card-bg); border: 1px solid var(--border); color: var(--text); padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-align: center; width: 100%; display: block; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .product-btn:hover { border-color: var(--text); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(255,255,255,0.1); background: var(--text); color: var(--bg); }

        .autocomplete-menu {
            position: absolute; bottom: calc(100% + 10px); left: 0; width: 100%; maxWidth: 300px;
            background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
            box-shadow: 0 -5px 20px rgba(0,0,0,0.5); overflow: hidden;
            display: none; flex-direction: column; z-index: 10;
        }
        .autocomplete-item { padding: 12px 15px; border-bottom: 1px solid var(--border); cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; gap: 4px; }
        .autocomplete-item:hover { background: var(--primary); color: #ffffff; }

        @media (max-width: 480px) { .chat-container { border: none; height: 100vh; } .msg-bubble { font-size: 14px; } }
    </style>
</head>
<body>
<div class="chat-container">
    <div class="header">
        <div class="header-left">
            ${logoHtml}
            <div class="header-info">
                <h1>${name}</h1>
                <div class="status"><div class="status-dot"></div> متصل الآن</div>
            </div>
        </div>
        <div style="font-size: 11px; color: var(--text-muted)">مدعوم بواسطة <a href="/" style="color: var(--text); text-decoration: none; font-weight: bold;">VOXIO</a></div>
    </div>
    <div class="messages-area" id="chat-box"></div>
    <div class="input-area" style="position: relative;">
        <div class="autocomplete-menu" id="autocomplete-menu"></div>
        <div class="input-wrapper">
            <input type="text" id="user-input" placeholder="اكتب سؤالك أو اكتب / للأوامر..." autocomplete="off">
            <button id="send-btn" class="send-btn"><i class="fas fa-paper-plane"></i></button>
        </div>
    </div>
</div>
<script>${script}</script>
</body>
</html>`,
    'glassmorphism': `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - Chat</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg: #0f172a;
            --glass-bg: rgba(30, 41, 59, 0.7);
            --border: rgba(255, 255, 255, 0.1);
            --text: #f1f5f9;
            --primary: #38bdf8;
            --secondary: #818cf8;
            --font-ar: 'Cairo', sans-serif;
        }
        ${typingStyle}
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: var(--font-ar); }
        body { background: radial-gradient(circle at top left, #1e293b, #0f172a); color: var(--text); display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; }
        .chat-container { width: 100%; max-width: 600px; height: 95vh; display: flex; flex-direction: column; background: var(--glass-bg); backdrop-filter: blur(20px); border: 1px solid var(--border); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); margin: 20px; overflow: hidden; }
        .header { padding: 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.03); }
        .header-left { display: flex; align-items: center; gap: 15px; }
        .company-logo, .company-logo-placeholder { width: 50px; height: 50px; border-radius: 16px; object-fit: cover; border: 2px solid var(--primary); box-shadow: 0 0 15px rgba(56, 189, 248, 0.3); }
        .company-logo-placeholder { background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 20px; }
        .header-info h1 { font-size: 20px; font-weight: 800; background: linear-gradient(to right, #ffffff, #cbd5e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #4ade80; }
        .status-dot { width: 10px; height: 10px; background: #4ade80; border-radius: 50%; box-shadow: 0 0 10px #4ade80; animation: pulse 2s infinite; }
        .messages-area { flex: 1; overflow-y: auto; padding: 25px; display: flex; flex-direction: column; gap: 20px; }
        .message { display: flex; gap: 15px; max-width: 80%; animation: fadeIn 0.4s ease; }
        .message.ai { align-self: flex-end; flex-direction: row-reverse; }
        .message.user { align-self: flex-start; }
        .msg-bubble { padding: 16px 20px; border-radius: 20px; font-size: 15px; line-height: 1.6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); position: relative; }
        .message.ai .msg-bubble { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); border-bottom-left-radius: 5px; color: #e2e8f0; }
        .message.user .msg-bubble { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #ffffff; border-bottom-right-radius: 5px; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .input-area { padding: 24px; background: rgba(0,0,0,0.2); }
        .input-wrapper { display: flex; gap: 12px; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 18px; border: 1px solid var(--border); transition: 0.3s; }
        .input-wrapper:focus-within { border-color: var(--primary); box-shadow: 0 0 20px rgba(56, 189, 248, 0.2); }
        input { flex: 1; background: transparent; border: none; outline: none; color: #ffffff; padding: 12px; font-size: 16px; }
        .send-btn { width: 48px; height: 48px; border-radius: 14px; background: var(--primary); color: #ffffff; border: none; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">
            <div class="header-left">
                ${logoHtml}
                <div class="header-info">
                    <h1>${name}</h1>
                    <div class="status"><div class="status-dot"></div> متصل الآن</div>
                </div>
            </div>
            <div style="font-size: 11px; opacity: 0.6">مدعوم بواسطة <b>VOXIO</b></div>
        </div>
        <div class="messages-area" id="chat-box"></div>
        <div class="input-area">
            <div id="autocomplete-menu" style="display:none; position:absolute; bottom:100px; background:var(--glass-bg); backdrop-filter:blur(20px); border:1px solid var(--border); border-radius:15px; width:90%; padding:10px; z-index:100;"></div>
            <div class="input-wrapper">
                <input type="text" id="user-input" placeholder="اكتب سؤالك هنا..." autocomplete="off">
                <button id="send-btn" class="send-btn"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    </div>
    <script>${script}</script>
</body>
</html>`,
    'luxury': `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - Chat</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg: #0c0a09;
            --surface: #1c1917;
            --primary: #d97706;
            --text: #fafaf9;
            --border: #44403c;
            --font-ar: 'Cairo', sans-serif;
        }
        ${typingStyle}
        body { background: var(--bg); color: var(--text); display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: var(--font-ar); }
        .chat-container { width: 100%; max-width: 650px; height: 100vh; display: flex; flex-direction: column; background: var(--surface); border-left: 1px solid var(--border); border-right: 1px solid var(--border); }
        .header { padding: 30px; border-bottom: 1px solid var(--border); text-align: center; }
        .company-logo { width: 60px; height: 60px; border-radius: 50%; border: 2px solid var(--primary); margin-bottom: 10px; }
        .header h1 { font-size: 22px; color: var(--primary); font-weight: 800; letter-spacing: 1px; }
        .messages-area { flex: 1; padding: 30px; overflow-y: auto; display: flex; flex-direction: column; gap: 25px; }
        .msg-bubble { padding: 18px 24px; border-radius: 12px; font-size: 16px; border: 1px solid var(--border); }
        .message.ai { align-self: flex-end; flex-direction: row-reverse; width: 90%; }
        .message.ai .msg-bubble { background: rgba(217, 119, 6, 0.05); border-color: rgba(217, 119, 6, 0.2); }
        .message.user { align-self: flex-start; width: 90%; }
        .message.user .msg-bubble { background: var(--bg); border-color: var(--border); }
        .input-area { padding: 30px; background: var(--bg); }
        .input-wrapper { display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 5px; }
        input { flex: 1; background: transparent; border: none; color: #ffffff; padding: 15px; font-size: 16px; outline: none; }
        .send-btn { background: var(--primary); color: #000000; font-weight: bold; border: none; padding: 0 25px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">
            ${logoHtml}
            <h1>${name}</h1>
            <p style="font-size: 12px; opacity: 0.5;">PREMIUM ASSISTANT</p>
        </div>
        <div class="messages-area" id="chat-box"></div>
        <div class="input-area">
            <div id="autocomplete-menu" style="display:none; position:absolute; bottom:120px; background:var(--surface); border:1px solid var(--primary); width:80%; z-index:100;"></div>
            <div class="input-wrapper">
                <input type="text" id="user-input" placeholder="كيف يمكننا خدمتك؟">
                <button id="send-btn" class="send-btn">إرسال</button>
            </div>
        </div>
    </div>
    <script>${script}</script>
</body>
</html>`,
    'cyberpunk': `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - Chat</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg: #050505;
            --neon-blue: #00f3ff;
            --neon-pink: #ff00ff;
            --text: #ffffff;
            --font-ar: 'Cairo', sans-serif;
        }
        ${typingStyle}
        body { background: var(--bg); color: var(--text); font-family: var(--font-ar); overflow: hidden; height: 100vh; }
        .chat-container { width: 100%; max-width: 600px; height: 90vh; margin: 5vh auto; background: rgba(0,0,0,0.8); border: 2px solid var(--neon-blue); box-shadow: 0 0 20px var(--neon-blue); display: flex; flex-direction: column; position: relative; }
        .chat-container::before { content: ''; position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; border: 1px solid var(--neon-pink); z-index: -1; animation: glitch 2s infinite; }
        .header { padding: 20px; border-bottom: 2px solid var(--neon-blue); display: flex; justify-content: space-between; align-items: center; background: rgba(0, 243, 255, 0.1); }
        .messages-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
        .msg-bubble { padding: 12px 18px; border: 1px solid var(--neon-blue); background: rgba(0, 243, 255, 0.05); position: relative; font-size: 15px; }
        .message.user .msg-bubble { border-color: var(--neon-pink); background: rgba(255, 0, 255, 0.05); align-self: flex-start; }
        .message.ai .msg-bubble { align-self: flex-end; }
        .input-area { padding: 20px; border-top: 2px solid var(--neon-blue); }
        input { flex: 1; background: #000; border: 1px solid var(--neon-blue); color: var(--neon-blue); padding: 12px; outline: none; }
        .send-btn { background: var(--neon-blue); color: #000000; border: none; padding: 10px 20px; font-weight: 800; cursor: pointer; box-shadow: 0 0 10px var(--neon-blue); }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">
            <div style="display:flex; align-items:center; gap:10px;">${logoHtml} <b>${name.toUpperCase()} SYSTEM</b></div>
            <div style="font-size:10px; color:var(--neon-blue)">STATUS: ONLINE</div>
        </div>
        <div class="messages-area" id="chat-box"></div>
        <div class="input-area">
            <div class="input-wrapper" style="display:flex; gap:10px;">
                <input type="text" id="user-input" placeholder="ENTER COMMAND...">
                <button id="send-btn" class="send-btn">EXECUTE</button>
            </div>
        </div>
    </div>
    <script>${script}</script>
</body>
</html>`
  };

  return templates[type] || templates['default'];
}

function getTemplateScript(apiUrl, apiKey) {
  return `(function() {
    const box = document.getElementById('chat-box');
    const input = document.getElementById('user-input');
    const btn = document.getElementById('send-btn');
    const autocompMenu = document.getElementById('autocomplete-menu');
    let sid = localStorage.getItem('voxio_sid');
    if (!sid) {
        sid = "sess_" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('voxio_sid', sid);
    }
    let isProcessing = false;
    let webCommands = [];

    fetch('${apiUrl}/public/commands/${apiKey}')
        .then(r => r.json())
        .then(d => { if (d.success) webCommands = d.commands; })
        .catch(e => console.error(e));

    fetch('${apiUrl}/public/history?apiKey=${apiKey}&sessionId=' + sid)
        .then(r => r.json())
        .then(d => {
            if (d.success && d.history.length > 0) {
                d.history.forEach(m => append(m.sender, m.text));
            }
        })
        .catch(e => console.error(e));

    function append(role, text) {
        if (!box) return null;
        const div = document.createElement('div');
        div.className = 'message ' + role;
        const safeText = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\n/g, '<br>');
        
        div.innerHTML = '<div class="msg-avatar"><i class="fas fa-' + (role === "ai" ? "robot" : "user") + '"></i></div>' +
                          '<div class="msg-content">' +
                            '<div class="msg-bubble" dir="auto">' + safeText + '</div>' +
                          '</div>';
        
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
        return div;
    }

    function appendButtons(buttons, parentRow) {
        if (!buttons || buttons.length === 0) return;
        const container = document.createElement('div');
        container.className = 'ai-buttons-container';
        
        buttons.forEach(function(btnText) {
            const btn = document.createElement('button');
            btn.className = 'product-btn';
            btn.textContent = btnText;
            btn.onclick = function() {
                input.value = btnText;
                send();
            };
            container.appendChild(btn);
        });
        
        if (parentRow) {
            const content = parentRow.querySelector('.msg-content');
            if (content) content.appendChild(container);
        }
        box.scrollTop = box.scrollHeight;
    }

    async function send() {
        if (autocompMenu) autocompMenu.style.display = 'none';
        const text = input.value.trim();
        if (!text || isProcessing) return;

        isProcessing = true;
        input.disabled = true;
        btn.disabled = true;
        
        append('user', text);
        input.value = '';

        // Create typing/loading bubble
        const loadingRow = append('ai', '<div class="typing"><span></span><span></span><span></span></div>');
        const bubble = loadingRow.querySelector('.msg-bubble');

        try {
            const res = await fetch('${apiUrl}/public/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: '${apiKey}', prompt: text, sessionId: sid })
            });
            const data = await res.json();
            
            if (res.ok) {
                const reply = data.reply || "عذراً، لم أستطع فهم ذلك.";
                bubble.innerHTML = reply.replace(/\\n/g, '<br>');
                if (data.buttons && data.buttons.length > 0) {
                    appendButtons(data.buttons, loadingRow);
                }
            } else {
                bubble.innerHTML = data.error || "عذراً، حدث خطأ ما.";
            }
        } catch (e) {
            bubble.innerHTML = "⚠ خطأ في الاتصال.";
        } finally {
            isProcessing = false;
            input.disabled = false;
            btn.disabled = false;
            input.focus();
            box.scrollTop = box.scrollHeight;
        }
    }

    if (btn) btn.addEventListener('click', send);
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') send();
        });
        input.addEventListener('input', function(e) {
            const text = input.value;
            if (autocompMenu && text.startsWith('/') && webCommands.length > 0) {
                const query = text.replace('/', '').toLowerCase();
                const matches = webCommands.filter(c => c.command.toLowerCase().includes(query));
                if (matches.length > 0) {
                    autocompMenu.innerHTML = '';
                    matches.forEach(c => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item';
                        div.innerHTML = '<span>/' + c.command + '</span>';
                        div.onclick = function() {
                            input.value = '/' + c.command;
                            send();
                        };
                        autocompMenu.appendChild(div);
                    });
                    autocompMenu.style.display = 'block';
                } else {
                    autocompMenu.style.display = 'none';
                }
            } else if (autocompMenu) {
                autocompMenu.style.display = 'none';
            }
        });
    }

    document.addEventListener('click', function(e) {
        if (autocompMenu && !autocompMenu.contains(e.target) && e.target !== input) {
            autocompMenu.style.display = 'none';
        }
    });
})();`;
}
