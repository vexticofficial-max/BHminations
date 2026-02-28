/**
 * Vextic - Ultimate Edition
 * Kurucu: Alper
 */

// 1. FIREBASE BAŞLATMA (KESİN ÇÖZÜM - GİZLEME KALDIRILDI)
const firebaseConfig = {
    apiKey: "AIzaSyAaDFdyia63SMjnBreMRUQbCPs4foUHFl8",
    authDomain: "bhminations.firebaseapp.com",
    projectId: "bhminations",
    storageBucket: "bhminations.firebasestorage.app",
    messagingSenderId: "606037209431",
    appId: "1:606037209431:web:a1968ebb1673475deb8e12"
};

// Çakışma olmaması için kontrol ederek başlat
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// 2. OTURUM AÇMA (TAMİR EDİLDİ)
function googleLogin() {
    console.log("Giriş başlatılıyor...");
    auth.signInWithPopup(provider).then(result => {
        const user = result.user;
        db.collection('users').doc(user.uid).set({
            name: user.displayName,
            avatar: user.photoURL,
            email: user.email,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        location.reload();
    }).catch(err => {
        console.error("Giriş Hatası:", err);
        alert("Giriş yapılamadı: " + err.message);
    });
}

// 3. GECE MODU (TAMİR EDİLDİ)
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    console.log("Tema değiştirildi:", isDark ? "Karanlık" : "Aydınlık");
}

// Sayfa yüklendiğinde temayı hatırla
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// 4. VİDEOLARI YÜKLE
function loadVideos() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    db.collection('videos').orderBy('createdAt', 'desc').onSnapshot(snap => {
        grid.innerHTML = '';
        snap.forEach(doc => {
            const v = { id: doc.id, ...doc.data() };
            const card = document.createElement('div');
            card.className = 'video-card';
            card.onclick = () => openVideoModal(v);
            card.innerHTML = `
                <div class="video-thumbnail">
                    <img src="https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg">
                </div>
                <div style="display:flex; padding:12px; gap:12px;">
                    <img src="${v.authorAvatar}" style="width:36px; height:36px; border-radius:50%;">
                    <div>
                        <h3 style="font-size:14px; color:var(--text-color);">${v.title}</h3>
                        <p style="font-size:12px; color:var(--secondary-text);">${v.authorName}</p>
                    </div>
                </div>`;
            grid.appendChild(card);
        });
    });
}

// 5. VIDEO MODAL (İZLEME, LIKE, YORUM)
async function openVideoModal(video) {
    const modal = document.getElementById('video-modal');
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="watch-container" style="display:flex; width:100%; height:100%; background:var(--bg-color); color:var(--text-color); overflow-y:auto;">
            <button onclick="closeVideoModal()" style="position:fixed; top:20px; right:30px; background:none; border:none; color:white; font-size:40px; cursor:pointer; z-index:9999;">&times;</button>
            <div style="flex:3; padding:20px;">
                <iframe width="100%" style="aspect-ratio:16/9; border-radius:12px;" src="https://www.youtube.com/embed/${video.youtubeId}?autoplay=1" frameborder="0" allowfullscreen></iframe>
                <h1>${video.title}</h1>
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:15px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${video.authorAvatar}" style="width:40px; height:40px; border-radius:50%;">
                        <div>
                            <h4 style="margin:0;">${video.authorName}</h4>
                        </div>
                        <button onclick="handleSub('${video.authorId}')" style="background:var(--text-color); color:var(--bg-color); border:none; padding:10px 20px; border-radius:20px; font-weight:bold; cursor:pointer;">Abone Ol</button>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="likeVideo('${video.id}')" style="background:var(--hover-bg); border:none; padding:10px 15px; border-radius:20px; color:var(--text-color); cursor:pointer;">👍 ${video.likes || 0}</button>
                    </div>
                </div>
                <div style="margin-top:20px;">
                    <h3>Yorumlar</h3>
                    <div style="display:flex; gap:10px; margin:15px 0;">
                        <input id="c-input" type="text" placeholder="Yorum ekle..." style="flex:1; background:none; border:none; border-bottom:1px solid var(--border-color); color:var(--text-color); outline:none;">
                        <button onclick="addComment('${video.id}')" style="background:var(--blue); color:white; border:none; padding:10px 20px; border-radius:20px; cursor:pointer;">Gönder</button>
                    </div>
                    <div id="c-list"></div>
                </div>
            </div>
        </div>`;
    loadComments(video.id);
}

function closeVideoModal() {
    document.getElementById('video-modal').style.display = 'none';
}

// YORUMLARI YÜKLE
function loadComments(vid) {
    const list = document.getElementById('c-list');
    db.collection('videos').doc(vid).collection('comments').orderBy('createdAt', 'desc').onSnapshot(snap => {
        list.innerHTML = '';
        snap.forEach(doc => {
            const c = doc.data();
            list.innerHTML += `<div style="margin-bottom:15px;"><strong>${c.name}</strong>: ${c.text}</div>`;
        });
    });
}

// YORUM EKLE
async function addComment(vid) {
    const text = document.getElementById('c-input').value;
    if(!auth.currentUser || !text) return;
    await db.collection('videos').doc(vid).collection('comments').add({
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('c-input').value = '';
}

// Sayfa ilk açıldığında videoları getir
document.addEventListener('DOMContentLoaded', loadVideos);
