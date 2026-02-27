<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BHminations - Animasyon Platformu</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
    
    <link rel="stylesheet" href="style.css">
</head>
<body class="light-mode">
    <header>
        <div class="header-left">
            <div class="menu-icon">☰</div>
            <div class="logo" onclick="location.reload()">BHminations</div>
        </div>
        
        <div class="header-middle">
            <div class="search-container">
                <input type="text" placeholder="Animasyon ara..." class="search-bar">
                <button class="search-btn">🔍</button>
            </div>
        </div>
        
        <div class="header-right">
            <button onclick="toggleTheme()" class="theme-btn">🌙</button>
            <button id="login-btn" class="google-btn" onclick="googleLogin()">Oturum aç</button>
            
            <div id="user-profile" style="display:none; align-items:center; gap: 10px;">
                <img id="user-img" style="width:32px; height:32px; border-radius:50%;">
                <span id="display-name" style="font-weight: 500;"></span>
                <span id="global-verified-badge" class="verified-badge" style="display:none;">✔</span>
            </div>
        </div>
    </header>

    <div class="main-layout">
        <nav class="sidebar">
            <ul>
                <li class="active">🏠 <span>Anasayfa</span></li>
                <li>🔥 <span>Trendler</span></li>
                <li>🎞️ <span>Abonelikler</span></li>
                <hr>
                <div id="admin-menu" style="display:none;">
                    <p style="padding-left:15px; font-size:11px; color:gray; font-weight: bold;">YÖNETİCİ</p>
                    <li onclick="showAdminPanel()">🛠️ <span>Kurucu Paneli</span></li>
                </div>
            </ul>
        </nav>

        <main class="content">
            <div class="admin-panel" id="admin-panel" style="display:none;">
                <h3>🛠️ BHminations Yönetim Merkezi</h3>
                
                <div class="admin-section">
                    <h4>📤 YouTube Videosu Ekle</h4>
                    <input type="text" id="v-title" placeholder="Video Başlığı">
                    <input type="text" id="v-yt-url" placeholder="YouTube Linkini Buraya Yapıştır">
                    <div style="margin: 10px 0;">
                        <label><input type="checkbox" id="v-featured"> Öne Çıkar (Mavi Tikli Kart)</label>
                    </div>
                    <button onclick="publishYTVideo()" class="publish-btn">Sisteme Yükle</button>
                </div>

                <hr style="margin: 20px 0; border: 0.5px solid var(--border-color);">

                <div class="admin-section">
                    <h4>🚫 Üye Yönetimi</h4>
                    <input type="text" id="target-email" placeholder="Kullanıcı E-postası">
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button onclick="manageUser('verify')" style="background: #2ba640; color: white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Mavi Tik Ver</button>
                        <button onclick="manageUser('ban')" style="background: #cc0000; color: white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Kullanıcıyı Yasakla</button>
                    </div>
                </div>
            </div>

            <h2 id="main-title">Önerilen Animasyonlar</h2>
            <div class="video-grid" id="video-grid">
                </div>
        </main>
    </div>

    <script src="script.js"></script>
</body>
</html>
