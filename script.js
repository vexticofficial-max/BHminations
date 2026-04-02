/**
 * BHminations - Ultimate YouTube Klonu
 * Kurucu: Alper (bluehairkomsi@gmail.com)
 */

// ======== FIREBASE YAPILANDIRMASI ========
const firebaseConfig = {
    apiKey: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) 
            ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY 
            : "AIzaSyAaDFdyia63SMjnBreMRUQbCPs4foUHFl8", 
    authDomain: "bhminations.firebaseapp.com",
    projectId: "bhminations",
    storageBucket: "bhminations.firebasestorage.app",
    messagingSenderId: "606037209431",
    appId: "1:606037209431:web:a1968ebb1673475deb8e12"
};

// Başlatma hatasını önlemek için kontrol
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');

// Çevrimdışı önbellekleme (Bağlantı kopmalarına karşı)
db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
db.enablePersistence().catch(err => console.warn("Offline persistence:", err.code));

// ======== GLOBAL DEĞIŞKENLER ========
let currentUser = null;
let currentPage = 'home';
let currentVideo = null;
let allVideos = [];
let userLikes = [];
let shortsIndex = 0;
let filter = 'all';

// ======== SAYFA KONTROLÜ ========
function goToPage(page) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });

    closeVideoModal();
    closeUploadModal();

    const pageElement = document.getElementById(page + '-page');
    if (pageElement) {
        pageElement.style.display = 'block';
        currentPage = page;
    }

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    if (typeof event !== 'undefined' && event?.target) {
        event.target.closest('a')?.classList.add('active');
    }

    if (page === 'home') loadVideos();
    else if (page === 'shorts') loadShorts();
    else if (page === 'trends') loadTrends();
    else if (page === 'liked') loadLikedVideos();
    else if (page === 'mychannel') loadChannel(currentUser?.uid);

    if (window.innerWidth < 768) toggleSidebar();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar')?.parentElement;
    if(sidebar) sidebar.classList.toggle('active');
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');

// ======== AUTHENTICATION ========
function googleLogin() {
    auth.signInWithPopup(provider)
        .then(result => {
            currentUser = result.user;
            ensureUserDoc();
            updateUI();
        })
        .catch(error => alert("Giriş Hatası: " + error.message));
}

function logout() {
    auth.signOut().then(() => {
        currentUser = null;
        updateUI();
        goToPage('home');
    });
}

auth.onAuthStateChanged(user => {
    currentUser = user;
    updateUI();
    if (user) {
        ensureUserDoc();
        loadVideos();
    }
});

function ensureUserDoc() {
    if (!currentUser) return;
    const ref = db.collection('users').doc(currentUser.uid);
    ref.get().then(doc => {
        if (!doc.exists) {
            ref.set({
                displayName: currentUser.displayName,
                email: currentUser.email,
                avatar: currentUser.photoURL,
                isVerified: currentUser.email === 'bluehairkomsi@gmail.com'
            });
        }
    });
}

function updateUI() {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    
    if (currentUser) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(userMenu) userMenu.style.display = 'flex';
        
        const uImg = document.getElementById('u-img');
        const uName = document.getElementById('u-name');
        if(uImg) uImg.src = currentUser.photoURL;
        if(uName) uName.innerText = currentUser.displayName;
    } else {
        if(loginBtn) loginBtn.style.display = 'block';
        if(userMenu) userMenu.style.display = 'none';
    }
}

// ======== VİDEO YÜKLEME ========
async function publishVideoFromLink() {
    if (!currentUser) return alert('Lütfen önce giriş yapın');

    const title = document.getElementById('v-title').value.trim();
    const url = document.getElementById('v-url').value.trim();
    const description = document.getElementById('v-description').value.trim();
    const category = document.getElementById('v-category').value;
    let isShorts = document.getElementById('v-shorts-checkbox')?.checked || false;

    if (!title || !url) return alert("Başlık ve YouTube linki gerekli!");

    let videoId = '';
    try {
        videoId = url.includes('youtu.be') ? url.split('/').pop().split('?')[0] : url.split('v=')[1]?.split('&')[0];
        if (!videoId) throw new Error('Geçersiz link');
    } catch (e) {
        return alert("Geçersiz YouTube linki!");
    }

    if (!isShorts && url.includes('/shorts/')) isShorts = true;

    try {
        await db.collection("videos").add({
            title, description, videoId, videoUrl: null,
            author: currentUser.displayName, authorUID: currentUser.uid,
            authorAvatar: currentUser.photoURL, category: category || 'general',
            views: 0, viewedUsers: [], // Anti-spam için
            likes: 0, dislikes: 0, isShorts,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Video paylaşıldı! 🚀");
        closeUploadModal();
        goToPage(isShorts ? 'shorts' : 'home');
    } catch (err) {
        alert("Hata: " + err.message);
    }
}

// ======== VİDEOLARI LİSTELEME ========
function loadVideos() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    db.collection("videos")
      .where('isShorts', '==', false)
      .orderBy('uploadedAt', 'desc')
      .onSnapshot(snapshot => {
        grid.innerHTML = '';
        snapshot.forEach(doc => {
            const video = { id: doc.id, ...doc.data() };
            if (!filter || filter === 'all' || video.category === filter) {
                createVideoCard(video, grid);
            }
        });
    }, err => console.warn("Videolar yüklenemedi (İzin hatası olabilir): ", err));
}

function createVideoCard(video, container) {
    const card = document.createElement('div');
    card.className = 'v-card';
    card.onclick = () => openVideoModal(video);

    const thumbnail = video.videoId 
        ? `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg` 
        : (video.thumbnail || 'https://via.placeholder.com/280x157?text=Video');

    card.innerHTML = `
        <div class="v-card-thumbnail">
            <img src="${thumbnail}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div class="v-card-info">
            <img src="${video.authorAvatar}" class="v-card-avatar" onclick="event.stopPropagation(); loadChannel('${video.authorUID}')">
            <div class="v-card-details">
                <div class="v-card-title">${video.title}</div>
                <div class="v-card-author">${video.author}</div>
                <div class="v-card-meta">${video.views || 0} izlenme</div>
            </div>
        </div>
    `;
    container.appendChild(card);
}

// ======== İZLENME KONTROLÜ (ANTI-SPAM) ========
async function incrementView(video) {
    if (!currentUser) return; // Sadece giriş yapanların izlenmesi sayılır
    
    const viewedUsers = video.viewedUsers || [];
    if (!viewedUsers.includes(currentUser.uid)) {
        try {
            await db.collection('videos').doc(video.id).update({
                views: firebase.firestore.FieldValue.increment(1),
                viewedUsers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
            video.views = (video.views || 0) + 1; // Arayüzde anında güncelle
        } catch(e) { console.warn("İzlenme artırılamadı:", e); }
    }
}

// ======== VİDEO İZLEME ========
function openVideoModal(video) {
    currentVideo = video;
    const modal = document.getElementById('video-modal');
    const playerContainer = document.getElementById('detail-player-container');
    
    incrementView(video); // Hilesiz izlenme artır

    playerContainer.innerHTML = video.videoId 
        ? `<iframe width="100%" height="100%" frameborder="0" allow="fullscreen" src="https://www.youtube.com/embed/${video.videoId}?autoplay=1"></iframe>`
        : `<video controls autoplay style="width:100%; height:100%;" src="${video.videoUrl}"></video>`;

    document.getElementById('detail-title').textContent = video.title;
    document.getElementById('detail-views').textContent = (video.views || 0) + ' izlenme';
    document.getElementById('detail-author').textContent = video.author;
    document.getElementById('detail-avatar').src = video.authorAvatar;
    document.getElementById('detail-description').textContent = video.description || 'Açıklama yok';

    loadComments(video.id);
    modal.classList.add('active');
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    if(modal) modal.classList.remove('active');
    document.getElementById('detail-player-container').innerHTML = '';
    currentVideo = null;
}

// ======== YORUMLAR (GERÇEK ZAMANLI) ========
function loadComments(videoId) {
    const list = document.getElementById('comments-list');
    if(!list) return;

    db.collection('comments')
      .where('videoId', '==', videoId)
      .orderBy('timestamp', 'desc')
      .onSnapshot(snapshot => {
          list.innerHTML = '';
          snapshot.forEach(doc => {
              const c = doc.data();
              list.innerHTML += `
                  <div class="comment-item" style="display:flex; gap:10px; margin-top:15px;">
                      <img src="${c.userAvatar}" style="width:36px; height:36px; border-radius:50%;">
                      <div>
                          <strong>${c.userName}</strong>
                          <p style="font-size:14px; margin-top:4px;">${c.text}</p>
                      </div>
                  </div>
              `;
          });
      });
}

async function postComment() {
    if (!currentUser) return alert("Giriş yapın!");
    const textObj = document.getElementById('new-comment-text');
    if(!textObj) return;
    
    const text = textObj.value.trim();
    if (!text || !currentVideo) return;

    try {
        await db.collection('comments').add({
            videoId: currentVideo.id,
            userId: currentUser.uid,
            userName: currentUser.displayName,
            userAvatar: currentUser.photoURL,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        textObj.value = '';
    } catch(e) { alert("Yorum gönderilemedi: " + e.message); }
}

// ======== SHORTS SİSTEMİ (DÜZELTİLDİ) ========
let currentShorts = [];
function loadShorts() {
    db.collection('videos').where('isShorts', '==', true).orderBy('uploadedAt', 'desc').get()
      .then(snapshot => {
          currentShorts = [];
          snapshot.forEach(doc => currentShorts.push({ id: doc.id, ...doc.data() }));
          if (currentShorts.length > 0) {
              shortsIndex = 0;
              displayShort(currentShorts[shortsIndex]);
          }
      });
}

function displayShort(short) {
    currentVideo = short;
    incrementView(short); // Shorts için de hilesiz izlenme
    
    const player = document.getElementById('shorts-iframe');
    if(player) {
        player.src = short.videoId ? `https://www.youtube.com/embed/${short.videoId}?autoplay=1&loop=1` : short.videoUrl;
    }
    
    const title = document.getElementById('shorts-title');
    if(title) title.textContent = short.title;
}

function nextShort() {
    if (currentShorts.length === 0) return;
    shortsIndex = (shortsIndex + 1) % currentShorts.length;
    displayShort(currentShorts[shortsIndex]);
}

function prevShort() {
    if (currentShorts.length === 0) return;
    shortsIndex = (shortsIndex - 1 + currentShorts.length) % currentShorts.length;
    displayShort(currentShorts[shortsIndex]);
}

// ======== YARDIMCI FONKSİYONLAR ========
function openUploadModal() {
    if(!currentUser) return alert('Giriş yapın!');
    document.getElementById('upload-modal').classList.add('active');
}
function closeUploadModal() {
    const m = document.getElementById('upload-modal');
    if(m) m.classList.remove('active');
}

// Global modal kapatıcı
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeUploadModal();
        closeVideoModal();
    }
};
