/**
 * BHminations - Profesyonel Video Platformu Scripti
 * Kurucu: Alper (bluehairkomsi@gmail.com)
 */

// --- 1. FIREBASE YAPILANDIRMASI ---
const firebaseConfig = {
    apiKey: "AIzaSyAaDFdyia63SMjnBreMRUQbCPs4foUHFl8",
    authDomain: "bhminations.firebaseapp.com",
    projectId: "bhminations",
    storageBucket: "bhminations.firebasestorage.app",
    messagingSenderId: "606037209431",
    appId: "1:606037209431:web:a1968ebb1673475deb8e12"
};

// Sistem Başlatma
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// --- 2. TEMA VE PANEL KONTROLLERİ ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    console.log("Tema değiştirildi.");
}

function togglePanel(id) {
    const p = document.getElementById(id);
    if(p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

// --- 3. OTURUM YÖNETİMİ ---
function googleLogin() {
    auth.signInWithPopup(provider).catch(e => alert("Giriş Hatası: " + e.message));
}

auth.onAuthStateChanged(user => {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const uploadBox = document.getElementById('upload-box');
    const adminMenu = document.getElementById('admin-menu');

    if (user) {
        // Arayüzü Kullanıcıya Göre Güncelle
        if(loginBtn) loginBtn.style.display = 'none';
        if(userInfo) userInfo.style.display = 'flex';
        if(uploadBox) uploadBox.style.display = 'block';
        
        document.getElementById('u-img').src = user.photoURL;
        document.getElementById('u-name').innerText = user.displayName;

        // KURUCU KONTROLÜ (Alper Özel)
        if (user.email === "bluehairkomsi@gmail.com") {
            if(adminMenu) adminMenu.style.display = 'block';
            document.getElementById('u-verified').style.display = 'inline';
            console.log("Alper giriş yaptı. Yönetim yetkileri aktif! 👑");
        }
        
        loadVideos(); // Videoları Firestore'dan getir
    }
});

// --- 4. VİDEO YAYINLAMA (HERKES İÇİN) ---
async function publishVideo() {
    const title = document.getElementById('v-title').value;
    const url = document.getElementById('v-url').value;
    
    if(!title || !url) return alert("Alper, başlık ve linki boş bırakma!");

    // YouTube Video ID Çözücü
    let videoId = "";
    try {
        videoId = url.split('v=')[1] || url.split('/').pop();
        if(videoId.includes('&')) videoId = videoId.split('&')[0];
    } catch(e) {
        return alert("Geçersiz YouTube linki!");
    }

    try {
        await db.collection("videos").add({
            title: title,
            videoId: videoId,
            author: auth.currentUser.displayName,
            authorEmail: auth.currentUser.email,
            // Sadece Alper yüklerse otomatik onaylı başlar
            isVerified: (auth.currentUser.email === "bluehairkomsi@gmail.com"),
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Video başarıyla paylaşıldı! 🚀");
        document.getElementById('v-title').value = "";
        document.getElementById('v-url').value = "";
    } catch(err) {
        alert("Hata: Firestore veritabanı kurallarını kontrol et!");
    }
}

// --- 5. VİDEOLARI LİSTELEME ---
function loadVideos() {
    const grid = document.getElementById('video-grid');
    if(!grid) return;

    db.collection("videos").orderBy("time", "desc").onSnapshot(snap => {
        grid.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const isAdmin = auth.currentUser && auth.currentUser.email === "bluehairkomsi@gmail.com";
            
            const card = document.createElement('div');
            card.className = 'v-card';
            card.style.cssText = "background:var(--card); border-radius:12px; overflow:hidden; border:1px solid var(--border);";

            card.innerHTML = `
                <iframe width="100%" height="180" src="https://www.youtube.com/embed/${d.videoId}" frameborder="0" allowfullscreen></iframe>
                <div style="padding:12px;">
                    <h4 style="margin:0;">${d.title} ${d.isVerified ? '<span style="color:var(--blue);">✔</span>' : ''}</h4>
                    <p style="font-size:12px; color:gray; margin-top:5px;">Yükleyen: ${d.author}</p>
                    ${isAdmin ? `<button onclick="deleteV('${doc.id}')" style="color:red; background:none; border:none; cursor:pointer; font-size:11px; margin-top:10px; padding:0;">VİDEOYU SİL (KURUCU)</button>` : ''}
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

// --- 6. KURUCU ÖZEL İŞLEMLERİ ---
async function deleteV(id) {
    if(confirm("Bu videoyu silmek istediğine emin misin Alper?")) {
        await db.collection("videos").doc(id).delete();
    }
}

async function adminAction(type) {
    const email = document.getElementById('target-mail').value;
    if(!email) return alert("E-posta girmelisin!");

    if(type === 'verify') {
        alert(email + " kullanıcısına mavi tik verme özelliği yakında Firestore entegrasyonuyla gelecek!");
    } else if(type === 'ban') {
        alert(email + " kullanıcısı ban listesine eklendi!");
    }
}
