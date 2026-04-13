export function getChatbotTemplate(type = 'default', company) {
  const name = company.name || 'AI Assistant';
  const logo = company.logo || '';
  const apiKey = company.chatToken || company.apiKey || '';
  const slug = company.slug || '';
  const apiUrl = process.env.VITE_API_URL || 'https://aithor1.vercel.app/api';

  const logoHtml = logo 
    ? `<img src="${logo}" alt="${name}" class="company-logo">`
    : `<div class="company-logo-placeholder">${name.charAt(0)}</div>`;

  const script = getTemplateScript(apiUrl, apiKey);

  const typingStyle = `
        .typing { display: flex; gap: 6px; padding: 12px 5px; justify-content: center; align-items: center; }
        .typing span { width: 8px; height: 8px; background: currentColor; border-radius: 50%; opacity: 0.3; animation: bounce 1.4s infinite ease-in-out both; }
        .typing span:nth-child(1) { animation-delay: -0.32s; }
        .typing span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
  `;

  // Shared CSS for Fullscreen and Scrollbars
  const resetAndLayout = `
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: var(--font-ar); }
        body { width: 100vw; height: 100dvh; overflow: hidden; display: flex; }
        .chat-container { width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; transition: all 0.3s ease; }
        .messages-area { flex: 1; overflow-y: auto; padding: 30px; display: flex; flex-direction: column; gap: 24px; scroll-behavior: smooth; }
        .messages-area::-webkit-scrollbar { width: 6px; }
        .messages-area::-webkit-scrollbar-thumb { border-radius: 10px; background: var(--scrollbar-thumb); }
        .messages-area::-webkit-scrollbar-track { background: transparent; }
        
        /* Smooth Message Animations */
        .message { display: flex; gap: 16px; max-width: 85%; opacity: 0; animation: messagePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes messagePop { 0% { opacity: 0; transform: translateY(30px) scale(0.95); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        
        .msg-content { display: flex; flex-direction: column; gap: 6px; width: fit-content; max-width: 100%; }
        .message.ai { align-self: flex-end; flex-direction: row-reverse; transform-origin: bottom right; }
        .message.user { align-self: flex-start; flex-direction: row; transform-origin: bottom left; }
  `;

  const templates = {
    'default': `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${name} - Chat</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg: #030303;
            --card-bg: #0d0d0d;
            --border: #222222;
            --text: #ffffff;
            --text-muted: #999999;
            --primary: #4f46e5;
            --scrollbar-thumb: #333;
            --font-ar: 'Cairo', sans-serif;
        }

        ${typingStyle}
        ${resetAndLayout}
        
        body { background-color: var(--bg); color: var(--text); }
        .chat-container { background: var(--bg); }

        .header {
            padding: 20px 30px; border-bottom: 1px solid var(--border);
            display: flex; align-items: center; justify-content: space-between;
            background: rgba(13, 13, 13, 0.8); backdrop-filter: blur(12px); z-index: 10;
            box-shadow: 0 4px 30px rgba(0,0,0,0.5);
        }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .company-logo, .company-logo-placeholder {
            width: 48px; height: 48px; border-radius: 14px; object-fit: cover;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 1px solid var(--border);
        }
        .company-logo-placeholder {
            background: linear-gradient(135deg, #111, #333);
            display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 22px;
        }
        .header-info h1 { font-size: 19px; font-weight: 700; margin-bottom: 3px; letter-spacing: -0.5px; }
        .status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #10b981; font-weight: 600; }
        .status-dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; box-shadow: 0 0 12px #10b981; animation: pulse 2s infinite ease-in-out; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

        .msg-avatar {
            width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
        .message.ai .msg-avatar { background: linear-gradient(135deg, var(--text), #ccc); color: var(--bg); }
        .message.user .msg-avatar { background: var(--border); color: var(--text); }

        .msg-bubble {
            padding: 16px 20px; border-radius: 20px; font-size: 16px; line-height: 1.6;
            white-space: pre-wrap; word-break: break-word; text-align: right; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .message.ai .msg-bubble { background: var(--card-bg); border: 1px solid var(--border); border-bottom-left-radius: 4px; color: var(--text); }
        .message.user .msg-bubble { background: var(--text); color: var(--bg); border-bottom-right-radius: 4px; font-weight: 600; }
        
        .input-area { padding: 25px 30px; background: var(--bg); border-top: 1px solid var(--border); position: relative; }
        .input-wrapper {
            display: flex; gap: 15px; background: var(--card-bg); padding: 10px;
            border-radius: 20px; border: 1px solid var(--border); transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        .input-wrapper:focus-within { border-color: var(--text); box-shadow: 0 8px 30px rgba(255, 255, 255, 0.08); transform: translateY(-2px); }
        input { flex: 1; background: transparent; border: none; outline: none; color: var(--text); padding: 10px 15px; font-size: 16px; }
        .send-btn {
            width: 50px; height: 50px; border-radius: 16px; background: var(--text); border: none; color: var(--bg); cursor: pointer; transition: all 0.3s ease;
            display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .send-btn i { transform: scaleX(-1); transition: transform 0.3s; }
        .send-btn:hover { transform: scale(1.05) translateY(-2px); box-shadow: 0 10px 20px rgba(255,255,255,0.2); }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ai-buttons-container { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 10px; }
        .product-btn {
            background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 12px 20px; border-radius: 14px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; text-align: right;
        }
        .product-btn:hover { border-color: var(--text); background: var(--text); color: var(--bg); transform: translateX(-5px); }

        .autocomplete-menu {
            position: absolute; bottom: calc(100% + 15px); left: 30px; width: calc(100% - 60px);
            background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px;
            box-shadow: 0 -15px 50px rgba(0,0,0,0.8); overflow: hidden; display: none; flex-direction: column; z-index: 1000;
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1);
        }
        .autocomplete-header { padding: 12px 20px; font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 800; border-bottom: 1px solid var(--border); letter-spacing: 1px; }
        .autocomplete-item { padding: 14px 20px; border-bottom: 1px solid var(--border); cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 15px; }
        .autocomplete-item:last-child { border-bottom: none; }
        .autocomplete-item i { color: var(--text); font-size: 14px; width: 20px; text-align: center; }
        .autocomplete-item .cmd-name { font-weight: 700; font-size: 15px; }
        .autocomplete-item .cmd-desc { font-size: 12px; color: var(--text-muted); margin-right: auto; }
        .autocomplete-item:hover, .autocomplete-item.selected { background: var(--text); color: var(--bg); }
        .autocomplete-item:hover .cmd-desc, .autocomplete-item.selected .cmd-desc { color: var(--bg); opacity: 0.7; }
        .autocomplete-item:hover i, .autocomplete-item.selected i { color: var(--bg); }
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
        <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">مدعوم بواسطة <a href="/" style="color: var(--text); text-decoration: none; font-weight: 800;">VOXIO</a></div>
    </div>
    <div class="messages-area" id="chat-box"></div>
    <div class="input-area">
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${name} - Chat</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --glass-bg: rgba(15, 23, 42, 0.4);
            --border: rgba(255, 255, 255, 0.15);
            --text: #f8fafc;
            --primary: #0ea5e9;
            --secondary: #6366f1;
            --scrollbar-thumb: rgba(255,255,255,0.2);
            --font-ar: 'Cairo', sans-serif;
        }
        ${typingStyle}
        ${resetAndLayout}
        
        body { 
            background: linear-gradient(45deg, #0f172a, #1e1b4b, #0f172a, #082f49);
            background-size: 400% 400%; animation: gradientBG 15s ease infinite; color: var(--text);
        }
        @keyframes gradientBG { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        
        .chat-container { background: var(--glass-bg); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); }
        
        /* Floating glowing orbs in background */
        .orb { position: absolute; border-radius: 50%; filter: blur(80px); z-index: -1; animation: float 10s infinite alternate; }
        .orb-1 { top: 10%; left: 10%; width: 300px; height: 300px; background: rgba(14, 165, 233, 0.3); animation-delay: 0s; }
        .orb-2 { bottom: 10%; right: 10%; width: 400px; height: 400px; background: rgba(99, 102, 241, 0.3); animation-delay: -5s; }
        @keyframes float { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(50px, 50px) scale(1.2); } }

        .header { padding: 25px 35px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.03); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .header-left { display: flex; align-items: center; gap: 18px; }
        .company-logo, .company-logo-placeholder { width: 55px; height: 55px; border-radius: 18px; object-fit: cover; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 0 20px rgba(14, 165, 233, 0.4); }
        .company-logo-placeholder { background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 24px; }
        .header-info h1 { font-size: 22px; font-weight: 800; background: linear-gradient(to right, #ffffff, #93c5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px; }
        .status { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #34d399; font-weight: 600;}
        .status-dot { width: 10px; height: 10px; background: #34d399; border-radius: 50%; box-shadow: 0 0 15px #34d399; animation: pulse 2s infinite; }

        .msg-bubble { padding: 18px 22px; border-radius: 22px; font-size: 16px; line-height: 1.6; backdrop-filter: blur(10px); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1); }
        .message.ai .msg-bubble { background: rgba(255, 255, 255, 0.05); border-bottom-left-radius: 6px; }
        .message.user .msg-bubble { background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(99, 102, 241, 0.8)); border-bottom-right-radius: 6px; border: 1px solid rgba(255,255,255,0.3); font-weight: 600; }
        .msg-avatar { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 1px solid var(--border); background: rgba(255,255,255,0.1); }

        .input-area { padding: 30px 35px; background: rgba(0,0,0,0.2); border-top: 1px solid var(--border); }
        .input-wrapper { display: flex; gap: 15px; background: rgba(255,255,255,0.07); padding: 10px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.2); transition: all 0.4s ease; backdrop-filter: blur(10px); }
        .input-wrapper:focus-within { border-color: var(--primary); background: rgba(255,255,255,0.1); box-shadow: 0 0 30px rgba(14, 165, 233, 0.3); transform: translateY(-3px); }
        input { flex: 1; background: transparent; border: none; outline: none; color: #ffffff; padding: 12px 18px; font-size: 17px; }
        input::placeholder { color: rgba(255,255,255,0.5); }
        .send-btn { width: 55px; height: 55px; border-radius: 18px; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #ffffff; border: none; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 5px 15px rgba(14, 165, 233, 0.4); }
        .send-btn i { transform: scaleX(-1); }
        .send-btn:hover { transform: scale(1.08) rotate(-5deg); box-shadow: 0 8px 25px rgba(14, 165, 233, 0.6); }
        
        .product-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 12px 20px; border-radius: 16px; cursor: pointer; backdrop-filter: blur(5px); transition: all 0.3s ease; text-align: right; font-weight: 600; }
        .product-btn:hover { background: rgba(255,255,255,0.15); border-color: #fff; transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
        
        .autocomplete-menu {
            position: absolute; bottom: calc(100% + 20px); left: 35px; width: calc(100% - 70px);
            background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
            border: 1px solid var(--border); border-radius: 20px; box-shadow: 0 -15px 50px rgba(0,0,0,0.6);
            display: none; flex-direction: column; z-index: 1000; overflow: hidden;
        }
        .autocomplete-header { padding: 12px 20px; font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.5); font-weight: 800; border-bottom: 1px solid var(--border); }
        .autocomplete-item { padding: 15px 20px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: 0.3s; border-bottom: 1px solid var(--border); }
        .autocomplete-item:last-child { border-bottom: none; }
        .autocomplete-item:hover, .autocomplete-item.selected { background: rgba(255, 255, 255, 0.1); border-right: 4px solid var(--primary); }
        .autocomplete-item i { color: var(--primary); font-size: 16px; }
        .autocomplete-item .cmd-name { font-weight: 700; color: #fff; }
        .autocomplete-item .cmd-desc { font-size: 12px; color: rgba(255,255,255,0.5); margin-right: auto; }
    </style>
</head>
<body>
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="chat-container">
        <div class="header">
            <div class="header-left">
                ${logoHtml}
                <div class="header-info">
                    <h1>${name}</h1>
                    <div class="status"><div class="status-dot"></div> متصل الآن</div>
                </div>
            </div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.6); font-weight: 600;">مدعوم بواسطة <b style="color:#fff;">VOXIO</b></div>
        </div>
        <div class="messages-area" id="chat-box"></div>
        <div class="input-area">
            <div class="autocomplete-menu" id="autocomplete-menu"></div>
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${name} - Chat</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg: #000000;
            --surface: #0a0a0a;
            --primary: #d4af37; /* Premium Gold */
            --primary-dark: #b5952f;
            --text: #ffffff;
            --border: #2a2a2a;
            --scrollbar-thumb: #d4af37;
            --font-ar: 'Cairo', sans-serif;
        }
        ${typingStyle}
        ${resetAndLayout}
        
        body { background: var(--bg); color: var(--text); }
        .chat-container { background: var(--surface); background-image: radial-gradient(circle at top, #111 0%, #000 100%); }
        
        .header { padding: 40px 30px; border-bottom: 1px solid var(--border); text-align: center; position: relative; }
        .header::after { content: ''; position: absolute; bottom: -1px; left: 10%; width: 80%; height: 1px; background: linear-gradient(90deg, transparent, var(--primary), transparent); }
        
        .company-logo, .company-logo-placeholder { width: 70px; height: 70px; border-radius: 50%; border: 2px solid var(--primary); margin: 0 auto 15px auto; box-shadow: 0 0 30px rgba(212, 175, 55, 0.15); }
        .company-logo-placeholder { background: transparent; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 28px; }
        .header h1 { font-size: 26px; color: var(--text); font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; }
        
        .messages-area { padding: 40px; }
        .msg-bubble { padding: 20px 28px; border-radius: 0; font-size: 16px; border: 1px solid var(--border); line-height: 1.8; letter-spacing: 0.5px; }
        .message.ai .msg-bubble { background: rgba(212, 175, 55, 0.03); border-color: rgba(212, 175, 55, 0.3); border-right: 3px solid var(--primary); }
        .message.user .msg-bubble { background: var(--bg); border-color: var(--border); border-left: 3px solid #fff; font-weight: 600; }
        .msg-avatar { display: none; } /* Hidden for minimal luxury look */

        .input-area { padding: 40px; background: var(--surface); position: relative; }
        .input-area::before { content: ''; position: absolute; top: 0; left: 10%; width: 80%; height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); }
        
        .input-wrapper { display: flex; background: var(--bg); border: 1px solid var(--border); padding: 8px; transition: all 0.4s; }
        .input-wrapper:focus-within { border-color: var(--primary); box-shadow: 0 0 20px rgba(212, 175, 55, 0.1); }
        input { flex: 1; background: transparent; border: none; color: #ffffff; padding: 18px 25px; font-size: 17px; outline: none; }
        input::placeholder { color: #555; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; }
        
        .send-btn { background: var(--primary); color: #000; font-weight: 800; border: none; padding: 0 40px; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s; }
        .send-btn:hover { background: var(--primary-dark); transform: scale(0.98); }
        
        .product-btn { background: transparent; border: 1px solid var(--primary); color: var(--primary); padding: 15px; text-transform: uppercase; letter-spacing: 1px; font-size: 13px; font-weight: 700; transition: 0.4s; }
        .product-btn:hover { background: var(--primary); color: #000; }
        
        .autocomplete-menu {
            position: absolute; bottom: calc(100% + 20px); left: 40px; width: calc(100% - 80px);
            background: #000; border: 1px solid var(--primary); box-shadow: 0 0 30px rgba(212, 175, 55, 0.2);
            display: none; flex-direction: column; z-index: 1000;
        }
        .autocomplete-header { padding: 10px 20px; font-size: 10px; color: var(--primary); letter-spacing: 2px; border-bottom: 1px solid #1a1a1a; font-weight: 800; }
        .autocomplete-item { padding: 15px 20px; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #1a1a1a; cursor: pointer; transition: 0.3s; }
        .autocomplete-item:hover, .autocomplete-item.selected { background: var(--primary); color: #000; }
        .autocomplete-item .cmd-name { font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .autocomplete-item .cmd-desc { font-size: 11px; opacity: 0.7; margin-right: auto; }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">
            ${logoHtml}
            <h1>${name}</h1>
            <p style="font-size: 12px; color: var(--primary); letter-spacing: 3px; font-weight: 600;">PREMIUM ASSISTANT</p>
        </div>
        <div class="messages-area" id="chat-box"></div>
        <div class="input-area">
            <div class="autocomplete-menu" id="autocomplete-menu"></div>
            <div class="input-wrapper">
                <input type="text" id="user-input" placeholder="كيف يمكننا خدمتك؟">
                <button id="send-btn" class="send-btn">إرسال</button>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #444; letter-spacing: 2px;">POWERED BY VOXIO</div>
        </div>
    </div>
    <script>${script}</script>
</body>
</html>`,

    'cyberpunk': `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${name} - Chat</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg: #050505;
            --neon-blue: #00f3ff;
            --neon-pink: #ff003c;
            --neon-yellow: #fcee0a;
            --text: #ffffff;
            --scrollbar-thumb: var(--neon-blue);
            --font-ar: 'Cairo', sans-serif;
        }
        ${typingStyle}
        ${resetAndLayout}
        
        body { background: var(--bg); color: var(--text); background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 243, 255, 0.05) 2px, rgba(0, 243, 255, 0.05) 4px); }
        .chat-container { border: 2px solid var(--neon-blue); box-shadow: inset 0 0 50px rgba(0, 243, 255, 0.1); position: relative; overflow: hidden; background: rgba(0,0,0,0.8); }
        
        /* Glitch effect on container edges */
        .chat-container::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; border: 2px solid var(--neon-pink); opacity: 0.5; z-index: -1; animation: glitch 3s infinite linear alternate-reverse; pointer-events: none; }
        @keyframes glitch { 0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 2px); } 20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -2px); } 40% { clip-path: inset(40% 0 50% 0); transform: translate(2px, 2px); } 60% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, -2px); } 80% { clip-path: inset(10% 0 70% 0); transform: translate(2px, 2px); } 100% { clip-path: inset(30% 0 50% 0); transform: translate(-2px, -2px); } }

        .header { padding: 25px; border-bottom: 3px solid var(--neon-blue); display: flex; justify-content: space-between; align-items: center; background: rgba(0, 243, 255, 0.15); position: relative; text-transform: uppercase; }
        .header::before { content: 'SYS.ACTIVE'; position: absolute; bottom: -10px; left: 20px; background: var(--bg); color: var(--neon-blue); font-size: 10px; padding: 0 5px; font-weight: bold; border: 1px solid var(--neon-blue); }
        
        .company-logo, .company-logo-placeholder { width: 50px; height: 50px; border-radius: 0; border: 2px solid var(--neon-yellow); clip-path: polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%); }
        .company-logo-placeholder { background: var(--neon-blue); color: #000; font-weight: 900; display: flex; align-items: center; justify-content: center; }

        .messages-area { background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%); }
        
        .msg-bubble { padding: 15px 20px; border: 1px solid var(--neon-blue); background: rgba(0, 243, 255, 0.05); position: relative; font-size: 16px; border-radius: 0; clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px)); }
        .message.user .msg-bubble { border-color: var(--neon-pink); background: rgba(255, 0, 60, 0.1); color: #fff; box-shadow: -5px 5px 0 rgba(255,0,60,0.2); }
        .message.ai .msg-bubble { border-color: var(--neon-blue); color: var(--neon-blue); box-shadow: 5px 5px 0 rgba(0,243,255,0.2); }
        .msg-avatar { display: none; }

        .input-area { padding: 25px; border-top: 3px solid var(--neon-pink); background: rgba(0,0,0,0.9); position: relative; }
        .input-area::before { content: 'INPUT_REQ'; position: absolute; top: -10px; right: 20px; background: var(--bg); color: var(--neon-pink); font-size: 10px; padding: 0 5px; font-weight: bold; border: 1px solid var(--neon-pink); }
        
        .input-wrapper { display: flex; gap: 15px; }
        input { flex: 1; background: #000; border: 2px solid var(--neon-blue); color: var(--neon-blue); padding: 15px; outline: none; font-size: 16px; font-family: monospace; transition: 0.3s; }
        input:focus { border-color: var(--neon-yellow); box-shadow: 0 0 15px rgba(252, 238, 10, 0.3); }
        input::placeholder { color: rgba(0,243,255,0.4); }
        
        .send-btn { background: var(--neon-pink); color: #000; border: none; padding: 0 30px; font-weight: 900; font-size: 18px; cursor: pointer; clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); transition: 0.2s; }
        .send-btn:hover { background: var(--neon-yellow); color: #000; box-shadow: 0 0 20px var(--neon-yellow); transform: scale(1.05); }

        .product-btn { background: #000; border: 1px solid var(--neon-blue); color: var(--neon-blue); padding: 12px; font-weight: bold; text-transform: uppercase; transition: 0.3s; cursor: pointer; }
        .product-btn:hover { background: var(--neon-blue); color: #000; box-shadow: 0 0 15px var(--neon-blue); }
        
        .autocomplete-menu {
            position: absolute; bottom: calc(100% + 20px); left: 25px; width: calc(100% - 50px);
            background: #000; border: 2px solid var(--neon-blue); box-shadow: 0 0 20px var(--neon-blue);
            display: none; flex-direction: column; z-index: 1000;
        }
        .autocomplete-header { padding: 10px 20px; background: var(--neon-blue); color: #000; font-weight: 900; font-size: 11px; letter-spacing: 2px; }
        .autocomplete-item { padding: 15px 20px; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid rgba(0, 243, 255, 0.2); cursor: pointer; font-family: monospace; }
        .autocomplete-item:hover, .autocomplete-item.selected { background: var(--neon-pink); color: #fff; border-color: #fff; }
        .autocomplete-item .cmd-name { font-weight: 900; }
        .autocomplete-item .cmd-desc { font-size: 11px; opacity: 0.8; margin-right: auto; }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">
            <div style="display:flex; align-items:center; gap:15px;">
                ${logoHtml} 
                <div>
                    <div style="font-size:20px; font-weight:900; color:var(--text); text-shadow: 2px 2px var(--neon-pink);">${name.toUpperCase()}</div>
                    <div style="font-size:11px; color:var(--neon-blue); font-weight:bold; letter-spacing:2px;">LINK ESTABLISHED</div>
                </div>
            </div>
            <div style="font-size:12px; color:var(--neon-yellow); font-weight:900; writing-mode: vertical-rl;">VOXIO</div>
        </div>
        <div class="messages-area" id="chat-box"></div>
        <div class="input-area">
            <div class="autocomplete-menu" id="autocomplete-menu"></div>
            <div class="input-wrapper">
                <input type="text" id="user-input" placeholder="> ENTER_COMMAND_">
                <button id="send-btn" class="send-btn">EXEC</button>
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
        
        // Smooth scroll to bottom after animation starts
        setTimeout(() => {
            box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
        }, 50);
        
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
        setTimeout(() => {
            box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
        }, 50);
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
            setTimeout(() => {
                box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
            }, 50);
        }
    }

    let selectedIndex = -1;

    function updateMenu(matches) {
        if (!autocompMenu) return;
        if (matches.length > 0) {
            autocompMenu.innerHTML = '<div class="autocomplete-header">Available Commands</div>';
            matches.forEach((c, index) => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item' + (index === selectedIndex ? ' selected' : '');
                const icon = c.icon || (c.command === 'help' ? 'question-circle' : 'bolt');
                div.innerHTML = '<i class="fas fa-' + icon + '"></i>' +
                                 '<span class="cmd-name">/' + c.command + '</span>' +
                                 '<span class="cmd-desc">' + (c.description || '') + '</span>';
                div.onclick = function() {
                    input.value = '/' + c.command;
                    send();
                };
                autocompMenu.appendChild(div);
            });
            autocompMenu.style.display = 'flex';
        } else {
            autocompMenu.style.display = 'none';
        }
    }

    if (btn) btn.addEventListener('click', send);
    if (input) {
        input.addEventListener('keydown', function(e) {
            if (autocompMenu && autocompMenu.style.display === 'flex') {
                const items = autocompMenu.querySelectorAll('.autocomplete-item');
                if (e.key === 'ArrowDown') {
                    selectedIndex = (selectedIndex + 1) % items.length;
                    e.preventDefault();
                    const matches = getMatches();
                    updateMenu(matches);
                } else if (e.key === 'ArrowUp') {
                    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                    e.preventDefault();
                    const matches = getMatches();
                    updateMenu(matches);
                } else if (e.key === 'Enter' && selectedIndex >= 0) {
                    const matches = getMatches();
                    input.value = '/' + matches[selectedIndex].command;
                    selectedIndex = -1;
                    send();
                    e.preventDefault();
                } else if (e.key === 'Escape') {
                    autocompMenu.style.display = 'none';
                    selectedIndex = -1;
                }
            } else if (e.key === 'Enter') {
                send();
            }
        });

        function getMatches() {
            const text = input.value;
            if (!text.startsWith('/')) return [];
            const query = text.replace('/', '').toLowerCase();
            return webCommands.filter(c => c.command.toLowerCase().includes(query));
        }

        input.addEventListener('input', function(e) {
            selectedIndex = -1;
            const matches = getMatches();
            updateMenu(matches);
        });
    }

    document.addEventListener('click', function(e) {
        if (autocompMenu && !autocompMenu.contains(e.target) && e.target !== input) {
            autocompMenu.style.display = 'none';
        }
    });
})();`;
}