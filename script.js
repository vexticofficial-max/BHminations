<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BHminations - Kurucu Paneli</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>

    <style>
        /* TASARIM BURADA - CSS DOSYASINA GEREK YOK */
        :root {
            --bg: #f9f9f9;
            --txt: #0f0f0f;
            --header: #ffffff;
            --card: #ffffff;
            --border: #e5e5e5;
            --blue: #3ea6ff;
        }

        .dark-mode {
            --bg: #0f0f0f;
            --txt: #ffffff;
            --header: #0f0f0f;
            --card: #1e1e1e;
            --border: #383838;
        }

        body {
            margin: 0;
            font-family: 'Roboto', sans-serif;
            background-color: var(--bg);
            color: var(--txt);
            transition: 0.3s;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            background: var(--header);
            border-bottom: 1px solid var(--border);
            position: sticky;
            top: 0;
            z-index: 1000;
        }

        .logo { font-size: 20px; font-weight: bold; color: #ff0000; cursor: pointer; }

        .main-layout { display: flex; }

        .sidebar {
            width: 240px;
            height: 100vh;
            padding: 12px;
            border-right: 1px solid var(--border);
            background: var(--header);
        }

        .sidebar li {
            list-style: none;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 5px;
        }

        .sidebar li:hover { background: rgba(0,0,0,0.05); }
        .dark-mode .sidebar li:hover { background: rgba(255,255,255,0.1); }

        .content { flex: 1; padding: 24px; }

        .video-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        /* Admin Paneli */
        .admin-panel {
            background: var(--card);
            border: 2px solid var(--blue);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
        }

        input {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--bg);
            color: var(--txt);
            box-sizing: border-box;
        }

        .publish-btn {
            background: var(--blue);
            color: white;
            border: none;
            padding: 12px;
            width: 100%;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }

        .verified-badge { color: var(--blue); margin-left: 5px; font-weight: bold; }
        
        button { cursor: pointer; }
    </style>
</head>
<body>

    <header>
        <div class="logo">BHminations</div>
        <div style="display: flex; gap: 15px; align-items: center;">
            <button onclick="toggleTheme()" style="background:none; border:none; font-size:20px;">🌙</button>
            <button id="login-btn" onclick="googleLogin()" style="background:var(--blue); color:white; border:none; padding:8px 16px; border-radius:20px;">Oturum aç</button>
            <div id="user-profile" style="display:none; align-items:center; gap: 8px;">
                <img id="user-img" style="width:32px; height:32px; border-radius:50%;">
                <span id="display-name" style="font-weight: 500;"></span>
                <span id="global-verified" class="verified-badge" style="display:none;">✔</span>
            </div>
        </div>
    </header>

    <div class="main-layout">
        <nav class="sidebar">
            <li onclick="location.reload()">🏠 Anasayfa</li>
            <li>🔥 Trendler</li>
            <div id="admin-menu" style="display:none; border-top: 1px solid var(--border); margin-top: 20px; padding-top: 10px;">
                <li onclick="showAdmin()" style="color: var(--blue); font-weight: bold;">🛠️ Yönetim Paneli</li>
            </div>
        </nav>

        <main class="content">
            <div id="admin-panel" class="admin-panel" style="display:none;">
                <h3 style="margin:0;">🚀 Alper, Video Yayınla</h3>
                <input type="text" id="v-title" placeholder="Video Başlığı">
                <input type="text" id="v-url" placeholder="YouTube Linki (Örn: https://youtu.be/...)">
                <label><input type="checkbox" id="v-check"> Mavi Tikli Yayınla</label>
                <button onclick="publish()" class="publish-btn" style="margin-top:15px;">YAYINLA</button>
            </div>

            <h2 id="main-title">Önerilen Animasyonlar</h2>
            <div id="video-grid" class="video-grid">
                </div>
        </main>
    </div>

    <script>
        // --- FIREBASE AYARLARI ---
        const firebaseConfig = {
            apiKey: "AIzaSyAaDFdyia63SMjnBreMRUQbCPs4foUHFl8",
            authDomain: "bhminations.firebaseapp.com",
            projectId: "bhminations",
            storageBucket: "bhminations.firebasestorage.app",
            messagingSenderId: "606037209431",
            appId: "1:606037209431:web:a1968ebb1673475deb8e12"
        };

        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const provider = new firebase.auth.GoogleAuthProvider();

        // --- BUTON FONKSİYONLARI ---
        
        // 1. Karanlık Mod (Kesin Çalışır)
        function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            document.querySelector('.header-right button').innerText = isDark ? '☀️' : '🌙';
        }

        // 2. Google Giriş
        function googleLogin() {
            auth.signInWithPopup(provider).catch(err => alert("Hata: " + err.message));
        }

        // 3. Admin Paneli Göster/Gizle
        function showAdmin() {
            const p = document.getElementById('admin-panel');
            p.style.display = p.style.display === 'none' ? 'block' : 'none';
        }

        // 4. Video Yayınla
        function publish() {
            const title = document.getElementById('v-title').value;
            const url = document.getElementById('v-url').value;
            const checked = document.getElementById('v-check').checked;

            if(!title || !url) return alert("Boş bırakma Alper!");

            let id = url.split('v=')[1] || url.split('/').pop();
            if(id.includes('&')) id = id.split('&')[0];

            const grid = document.getElementById('video-grid');
            const card = document.createElement('div');
            card.style.background = 'var(--card)';
            card.style.borderRadius = '12px';
            card.style.overflow = 'hidden';
            card.style.border = '1px solid var(--border)';

            card.innerHTML = `
                <iframe width="100%" height="180" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>
                <div style="padding:12px;">
                    <h4 style="margin:0;">${title} ${checked ? '<span class="verified-badge">✔</span>' : ''}</h4>
                    <p style="font-size:12px; color:gray; margin:5px 0;">Yükleyen: ${auth.currentUser.displayName}</p>
                </div>
            `;
            grid.prepend(card);
            alert("Video başarıyla eklendi! 🚀");
        }

        // 5. Giriş Yapınca Ne Olacak?
        auth.onAuthStateChanged(user => {
            if (user) {
                document.getElementById('login-btn').style.display = 'none';
                document.getElementById('user-profile').style.display = 'flex';
                document.getElementById('user-img').src = user.photoURL;
                document.getElementById('display-name').innerText = user.displayName;

                // SENİN MAİLİN: bluehairkomsi@gmail.com
                if (user.email === "bluehairkomsi@gmail.com") {
                    document.getElementById('admin-menu').style.display = 'block';
                    document.getElementById('global-verified').style.display = 'inline-block';
                }
            }
        });
    </script>
</body>
</html>
