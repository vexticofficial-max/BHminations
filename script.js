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

// --- 2. OTURUM YÖNETİMİ ---
function googleLogin() {
    auth.signInWithPopup(provider).catch(err => alert("Giriş Hatası: " + err.message));
}

auth.onAuthStateChanged(user => {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const adminMenu = document.getElementById('admin-menu');
    const uploadSection = document.getElementById('upload-section'); // HTML'de bu ID olmalı

    if (user) {
        // Arayüz Güncelleme
        if(loginBtn) loginBtn.style.display = 'none';
        if(userProfile) userProfile.style.display = 'flex';
        document.getElementById('user-img').src = user.photoURL;
        document.getElementById('display-name').innerText = user.displayName;

        // HERKESE VİDEO YÜKLEME ALANINI GÖSTER
        // (Eğer index'te bu alan varsa görünür olur)
        if(document.getElementById('public-upload')) {
            document.getElementById('public-upload').style.display = 'block';
        }

        // KURUCU KONTROLÜ (Alper Özel)
        if (user.email === "bluehairkomsi@gmail.com") {
            adminMenu.style.display = 'block';
            document.getElementById('global-verified-badge').style.display = 'inline-block';
            console.log("Hoş geldin Kurucu Alper! Yetkiler tanımlandı. ✅");
        }
        
        loadVideos(); // Videoları Firestore'dan çek
    }
});

// --- 3. VİDEO YÜKLEME (HERKES İÇİN) ---
async function publishVideo() {
    const title = document.getElementById('v-title').value;
    const url = document.getElementById('v-url').value;
    
    if (!title || !url) return alert("Başlık ve link boş olamaz!");

    // YouTube ID Çözücü
    let videoId = url.split('v=')[1] || url.split('/').pop();
    if (videoId.includes('&')) videoId = videoId.split('&')[0];

    try {
        await db.collection("videos").add({
            title: title,
            videoId: videoId,
            uploaderName: auth.currentUser.displayName,
            uploaderImg: auth.currentUser.photoURL,
            uploaderEmail: auth.currentUser.email,
            isVerified: (auth.currentUser.email === "bluehairkomsi@gmail.com"), // Alper ise otomatik onaylı
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Animasyonun başarıyla yüklendi! 🚀");
        location.reload();
    } catch (err) {
        alert("Firestore hatası: Veritabanı kurallarını kontrol et!");
    }
}

// --- 4. VİDEOLARI LİSTELEME (PRO SİSTEM) ---
function loadVideos() {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = ''; // Temizle

    db.collection("videos").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        grid.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const isAdmin = auth.currentUser && auth.currentUser.email === "bluehairkomsi@gmail.com";
            
            const card = document.createElement('div');
            card.className = 'v-card';
            card.style.cssText = "background:var(--card); border-radius:12px; overflow:hidden; border:1px solid var(--border); position:relative;";

            card.innerHTML = `
                <iframe width="100%" height="180" src="https://www.youtube.com/embed/${data.videoId}" frameborder="0" allowfullscreen></iframe>
                <div style="padding:12px;">
                    <h4 style="margin:0;">${data.title} ${data.isVerified ? '<span style="color:#3ea6ff;">✔</span>' : ''}</h4>
                    <p style="font-size:12px; color:gray; margin:5px 0;">${data.uploaderName}</p>
                    ${isAdmin ? `<button onclick="deleteVideo('${doc.id}')" style="background:#ff0000; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer; font-size:10px;">VİDEOYU SİL (KURUCU)</button>` : ''}
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

// --- 5. KURUCU ÖZEL GÜCÜ: VİDEO SİLME ---
async function deleteVideo(docId) {
    if (confirm("Alper, bu videoyu silmek istediğine emin misin?")) {
        await db.collection("videos").doc(docId).delete();
        alert("Video sistemden kaldırıldı. 🗑️");
    }
}

// --- 6. TEMA DEĞİŞTİRİCİ ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light'); // Tercihi kaydet
}

// Sayfa açıldığında eski temayı hatırla
if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
