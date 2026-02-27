// --- 1. FIREBASE YAPILANDIRMASI (Kendi Bilgilerini Buraya Yapıştır) ---
const firebaseConfig = {
    apiKey: "AIzaSyAaDFdyia63SMjnBreMRUQbCPs4foUHFl8",
    authDomain: "bhminations.firebaseapp.com",
    projectId: "bhminations",
    storageBucket: "bhminations.firebasestorage.app",
    messagingSenderId: "606037209431",
    appId: "1:606037209431:web:a1968ebb1673475deb8e12",
    measurementId: "G-B7FV7X7F1H"
};

// Firebase'i Başlat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// --- 2. OTURUM VE YETKİ KONTROLÜ ---
function googleLogin() {
    auth.signInWithPopup(provider)
        .then(res => handleUser(res.user))
        .catch(err => console.error("Giriş Hatası:", err));
}

function handleUser(user) {
    const adminMenu = document.getElementById('admin-menu');
    const globalVerified = document.getElementById('global-verified-badge');
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');

    if (user) {
        // Arayüzü Kullanıcıya Göre Düzenle
        loginBtn.style.display = 'none';
        userProfile.style.display = 'flex';
        document.getElementById('user-img').src = user.photoURL || '';
        document.getElementById('display-name').innerText = user.displayName;

        // KURUCU KONTROLÜ (Alper'in Maili)
        if (user.email === "bluehairkomsi@gmail.com") {
            adminMenu.style.display = 'block';
            globalVerified.style.display = 'inline-block';
            console.log("Kurucu Girişi Yapıldı: Hoş geldin Alper! ✅");
        }
    } else {
        loginBtn.style.display = 'block';
        userProfile.style.display = 'none';
    }
}

// --- 3. YOUTUBE VİDEO YAYINLAMA SİSTEMİ ---
function publishYTVideo() {
    const title = document.getElementById('v-title').value;
    const rawUrl = document.getElementById('v-yt-url').value;
    const isFeatured = document.getElementById('v-featured').checked;

    if(!title || !rawUrl) {
        alert("Başlık ve link boş olamaz!");
        return;
    }

    // YouTube ID'sini Güvenli Bir Şekilde Al
    let videoId = "";
    try {
        if (rawUrl.includes("v=")) {
            videoId = rawUrl.split("v=")[1].split("&")[0];
        } else if (rawUrl.includes("youtu.be/")) {
            videoId = rawUrl.split("youtu.be/")[1].split("?")[0];
        } else {
            videoId = rawUrl.split("/").pop();
        }
    } catch (e) {
        alert("Geçersiz YouTube linki!");
        return;
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const grid = document.getElementById('video-grid');
    
    // Video Kartını HTML Olarak Oluştur
    const card = document.createElement('div');
    card.className = isFeatured ? 'video-card featured' : 'video-card';
    
    card.innerHTML = `
        <iframe width="100%" height="200" src="${embedUrl}" frameborder="0" allowfullscreen style="border-radius:12px; border:none;"></iframe>
        <div style="padding: 12px; display:flex; gap:12px;">
            <img src="${auth.currentUser.photoURL}" style="width:36px; height:36px; border-radius:50%;">
            <div>
                <h4 style="margin:0; font-size:14px; font-weight:500;">
                    ${title} ${isFeatured ? '<span style="color:#3ea6ff;">✔</span>' : ''}
                </h4>
                <p style="font-size:12px; color:gray; margin:4px 0;">${auth.currentUser.displayName}</p>
            </div>
        </div>
    `;
    
    grid.prepend(card); // Yeni videoyu listenin başına koy
    alert("Video BHminations'a başarıyla eklendi! 🚀");
    
    // Formu Temizle
    document.getElementById('v-title').value = "";
    document.getElementById('v-yt-url').value = "";
}

// --- 4. KULLANICI YÖNETİMİ (Ban/Onay) ---
async function manageUser(action) {
    const email = document.getElementById('target-email').value;
    if(!email) return alert("E-posta girilmedi!");

    try {
        if (action === 'verify') {
            await db.collection("users").doc(email).set({ isVerified: true }, { merge: true });
            alert(email + " artık onaylı (mavi tikli)! ✅");
        } else if (action === 'ban') {
            await db.collection("users").doc(email).set({ isBanned: true }, { merge: true });
            alert(email + " banlandı! 🚫");
        }
    } catch (error) {
        console.error("Hata:", error);
        alert("Firestore Hatası: Firestore'un 'Test Modu' açık mı kontrol et!");
    }
}

// --- 5. TEMA VE PANEL FONKSİYONLARI ---
function showAdminPanel() {
    const panel = document.getElementById('admin-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

// Oturum Durumunu Dinle
auth.onAuthStateChanged(handleUser);
