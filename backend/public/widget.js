(function() {
    // 1. Get the API Key from the script tag
    const script = document.currentScript;
    const apiKey = script.getAttribute('data-api-key');
    const baseUrl = script.getAttribute('data-base-url') || 'https://aithor0.vercel.app';
    const primaryColor = script.getAttribute('data-primary-color') || '#000';
    
    if (!apiKey) {
        console.error('Aithor Widget Error: data-api-key is missing from the script tag.');
        return;
    }

    // 2. Add FontAwesome for the icon
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    document.head.appendChild(fa);

    // 3. Create Styles
    const style = document.createElement('style');
    style.innerHTML = `
        #aithor-widget-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            direction: rtl;
        }
        #aithor-widget-button {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: ${primaryColor};
            color: ${primaryColor === '#c8ff00' ? '#000' : '#fff'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border: none;
        }
        #aithor-widget-button:hover { transform: scale(1.05); }
        #aithor-widget-button i { font-size: 24px; }

        #aithor-widget-window {
            position: absolute;
            bottom: 70px;
            right: 0;
            width: 380px;
            height: 520px;
            max-width: calc(100vw - 40px);
            max-height: calc(100vh - 100px);
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 12px 24px rgba(0,0,0,0.18);
            overflow: hidden;
            border: 1px solid rgba(0,0,0,0.1);
            display: none;
            flex-direction: column;
            transform-origin: bottom right;
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s;
            opacity: 0;
            transform: scale(0.9) translateY(20px);
        }
        #aithor-widget-window.open {
            display: flex;
            opacity: 1;
            transform: scale(1) translateY(0);
        }
        #aithor-widget-window iframe {
            border: none;
            width: 100%;
            height: 100%;
        }
    `;
    document.head.appendChild(style);

    // 4. Create the Container
    const container = document.createElement('div');
    container.id = 'aithor-widget-container';
    document.body.appendChild(container);

    // 5. Create Button
    const button = document.createElement('button');
    button.id = 'aithor-widget-button';
    button.innerHTML = '<i class="fas fa-message"></i>';
    container.appendChild(button);

    // 6. Create Chat Window
    const win = document.createElement('div');
    win.id = 'aithor-widget-window';
    win.innerHTML = `<iframe src="${baseUrl}/widget/${apiKey}" title="Aithor Chat"></iframe>`;
    container.appendChild(win);

    // 7. Toggle Window
    let isOpen = false;
    button.onclick = () => {
        isOpen = !isOpen;
        if (isOpen) {
            win.classList.add('open');
            button.innerHTML = '<i class="fas fa-xmark"></i>';
        } else {
            win.classList.remove('open');
            button.innerHTML = '<i class="fas fa-message"></i>';
        }
    };

    // Close on click outside (optional)
    document.addEventListener('mousedown', (e) => {
        if (isOpen && !container.contains(e.target)) {
            isOpen = false;
            win.classList.remove('open');
            button.innerHTML = '<i class="fas fa-message"></i>';
        }
    });

})();
