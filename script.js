// --- 1. FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyAaDFdyia63SMjnBreMRUQbCPs4foUHFl8",
    authDomain: "bhminations.firebaseapp.com",
    projectId: "bhminations",
    storageBucket: "bhminations.firebasestorage.app",
    messagingSenderId: "606037209431",
    appId: "1:606037209431:web:a1968ebb1673475deb8e12",
    measurementId: "G-B7FV7X7F1H"
};

// Başlatma
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// --- 2. OTURUM YÖNETİMİ ---
function googleLogin() {
    auth.signInWithPopup(provider).then((result) => {
        handleUser(result.user);
    }).catch(err => console.error("Giriş Hatası:", err));
}

function handleUser(user) {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const userImg = document.getElementById('user-img');
    const displayName = document.getElementById('display-name');
    const adminPanel = document.getElementById('admin-panel');
    const globalVerified = document.getElementById('global-verified-badge');

    if (user) {
        loginBtn.style.display = 'none';
        userProfile.style.display = 'flex';
        userImg.src = user.photoURL;
        displayName.innerText = user.displayName;

        // KURUCU KONTROLÜ (Buraya kendi mailini yazmayı unutma Alper!)
        if (user.email === "seninmailin@gmail.com") { 
            adminPanel.style.display = 'block';
            globalVerified.style.display = 'inline-block';
        }
    } else {
        loginBtn.style.display = 'flex';
        userProfile.style.display = 'none';
        adminPanel.style.display = 'none';
    }
}

// --- 3. VİDEO YAYINLAMA ---
function publishVideo() {
    const title = document.getElementById('v-title').value;
    const url = document.getElementById('v-url').value;
    const isFeatured = document.getElementById('v-featured').checked;

    if(!title || !url) return alert("Boş alan bırakma Alper!");

    const grid = document.getElementById('video-grid');
    const card = document.createElement('div');
    card.className = isFeatured ? 'video-card featured' : 'video-card';
    
    card.innerHTML = `
        <img src="${url}" class="thumbnail">
        <div style="padding: 10px 0;">
            <h4 style="margin:0;">${title} ${isFeatured ? '<span class="verified-badge" style="display:inline-block">✔</span>' : ''}</h4>
            <p style="font-size:13px; color:gray; margin:5px 0;">BHminations Studio</p>
            <p style="font-size:12px; color:#3ea6ff; font-weight:bold;">${isFeatured ? '🔥 ÖNE ÇIKAN' : 'Yeni Video'}</p>
        </div>
    `;
    grid.appendChild(card);
    
    // Formu temizle
    document.getElementById('v-title').value = "";
    document.getElementById('v-url').value = "";
}

// --- 4. ARAYÜZ AYARLARI ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

// Oturumu Sürekli Takip Et
auth.onAuthStateChanged(handleUser);
