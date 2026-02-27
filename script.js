<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BHminations - Kurucu Paneli Aktif</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
    
    <link rel="stylesheet" href="style.css">

    <style>
        /* CSS BURADA DA DURSUN GARANTİ OLSUN */
        :root { --bg: #f9f9f9; --txt: #0f0f0f; --card: #ffffff; --border: #e5e5e5; }
        .dark-mode { --bg: #0f0f0f; --txt: #ffffff; --card: #1e1e1e; --border: #383838; }
        
        body { background: var(--bg); color: var(--txt); font-family: 'Roboto', sans-serif; margin: 0; transition: 0.3s; }
        header { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: var(--card); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 1000; }
        .logo { font-size: 22px; font-weight: bold; color: #ff0000; cursor: pointer; }
        
        .main-layout { display: flex; }
        .sidebar { width: 240px; padding: 15px; border-right: 1px solid var(--border); height: 100vh; }
        .sidebar li { list-style: none; padding: 12px; border-radius: 8px; cursor: pointer; margin-bottom: 5px; }
        .sidebar li:hover { background: rgba(0,0,0,0.05); }
        .dark-mode .sidebar li:hover { background: rgba(255,255,255,0.1); }
        
        .content { flex: 1; padding: 30px; }
        .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }
        
        /* Admin Paneli Tasarımı */
        .admin-panel { background: var(--card); border: 2px solid #3ea6ff; padding: 25px; border-radius: 15px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .admin-panel input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--txt); box-sizing: border-box; }
        .publish-btn { background: #3ea6ff; color: white; border: none; padding: 15px; border-radius: 8px; width: 100%; font-weight: bold; cursor: pointer; font-size: 16px; }
        
        .verified-badge { color: #3ea6ff; margin-left: 5px; font-weight: bold; }
        .theme-btn { background: none; border: none; font-size: 20px; cursor: pointer; }
        .google-btn { background: #3ea6ff; color: white; border: none; padding: 8px 18px; border-radius: 20px; cursor: pointer; font-weight: 500; }
    </style>
</head>
<body class="light-mode">

    <header>
        <div class="logo">BHminations</div>
        <div class="header-right" style="display: flex; align-items: center; gap: 15px;">
            <button onclick="toggleTheme()" class="theme-btn">🌙</button>
            <button id="login-btn" class="google-btn" onclick="googleLogin()">Oturum aç</button>
            <div id="user-profile" style="display:none; align-items:center; gap: 10px;">
                <img id="user-img" style="width:35px; height:35px; border-radius:50%;">
                <span id="display-name"></span>
                <span id="global-verified-badge" class="verified-badge" style="display:none;">✔</span>
            </div>
        </div>
    </header>

    <div class="main-layout">
        <nav class="sidebar">
            <li class="active">🏠 Anasayfa</li>
            <li>🔥 Trendler</li>
            <div id="admin-menu" style="display:none; margin-top: 20px; border-top: 1px solid var(--border);">
                <p style="color: gray; font-size: 12px; padding: 10px 0 0 10px;">KURUCU ÖZEL</p>
                <li onclick="showAdminPanel()" style="color: #3ea6ff; font-weight: bold;">🛠️ Yönetim Paneli</li>
            </div>
        </nav>

        <main class="content">
            <div id="admin-panel" class="admin-panel" style="display:none;">
                <h2 style="margin-top:0;">🚀 Kurucu Paneli</h2>
                <input type="text" id="v-title" placeholder="Animasyon Başlığı">
                <input type="text" id="v-yt-url" placeholder="YouTube Linkini Yapıştır (Örn: https://youtu.be/...)">
                <label style="display:block; margin: 10px 0; cursor:pointer;">
                    <input type="checkbox" id="v-featured"> Öne Çıkar (Mavi Tikli Olsun)
                </label>
                <button onclick="publishYTVideo()" class="publish-btn">VİDEOYU YAYINLA</button>
            </div>

            <h2 id="main-title">Önerilen Videolar</h2>
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
        const db = firebase.firestore();
        const provider = new firebase.auth.GoogleAuthProvider();

        // --- TEMA DEĞİŞTİRME (Karanlık Mod) ---
        function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            document.querySelector('.theme-btn').innerText = isDark ? '☀️' : '🌙';
            console.log("Tema değiştirildi. Karanlık Mod:", isDark);
        }

        // --- GİRİŞ SİSTEMİ ---
        function googleLogin() {
            auth.signInWithPopup(provider).then(res => {
                console.log("Giriş başarılı:", res.user.email);
            }).catch(err => alert("Hata: " + err.message));
        }

        auth.onAuthStateChanged(user => {
            if (user) {
                document.getElementById('login-btn').style.display = 'none';
                document.getElementById('user-profile').style.display = 'flex';
                document.getElementById('user-img').src = user.photoURL;
                document.getElementById('display-name').innerText = user.displayName;

                // ALPER'İN MAİLİ KONTROLÜ
                if (user.email === "bluehairkomsi@gmail.com") {
                    document.getElementById('admin-menu').style.display = 'block';
                    document.getElementById('global-verified-badge').style.display = 'inline-block';
                }
            }
        });

        // --- VİDEO YAYINLAMA ---
        function publishYTVideo() {
            const title = document.getElementById('v-title').value;
            const url = document.getElementById('v-yt-url').value;
            const isVerified = document.getElementById('v-featured').checked;

            if(!title || !url) return alert("Alper, başlık ve linki boş bırakma!");

            let videoId = url.split('v=')[1] || url.split('/').pop();
            if(videoId.includes('&')) videoId = videoId.split('&')[0];

            const embedUrl = `https://www.youtube.com/embed/${videoId}`;
            const grid = document.getElementById('video-grid');

            const card = document.createElement('div');
            card.style.background = 'var(--card)';
            card.style.borderRadius = '12px';
            card.style.overflow = 'hidden';
            card.style.border = '1px solid var(--border)';

            card.innerHTML = `
                <iframe width="100%" height="180" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
                <div style="padding:15px;">
                    <h4 style="margin:0;">${title} ${isVerified ? '<span class="verified-badge">✔</span>' : ''}</h4>
                    <p style="font-size:12px; color:gray; margin-top:5px;">Yükleyen: ${auth.currentUser.displayName}</p>
                </div>
            `;

            grid.prepend(card);
            alert("Video Yayında! 🚀");
            document.getElementById('v-title').value = "";
            document.getElementById('v-yt-url').value = "";
        }

        function showAdminPanel() {
            const panel = document.getElementById('admin-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    </script>
</body>
</html>
