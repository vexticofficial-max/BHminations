/**
 * BHminations - Ultimate YouTube Klonu
 * Kurucu: Alper (bluehairkomsi@gmail.com)
 */

// ======== FIREBASE YAPILANDIRMASI ========
// ======== FIREBASE YAPILANDIRMASI (GÜVENLİ VE DÜZELTİLMİŞ) ========
// ======== FIREBASE YAPILANDIRMASI (TAMİR EDİLDİ) ========
const firebaseConfig = {
    // Vercel'deysen process.env'den al, yoksa (local) direkt anahtarı kullan
    apiKey: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) 
            ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY 
            : "AIzaSyAaDFdyia63SMjnBreMRUQbCPs4foUHFl8", // Buraya anahtarını geri koy
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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');

// ======== GLOBAL DEĞIŞKENLER ========
let currentUser = null;
let currentPage = 'home';
let currentVideo = null;
let allVideos = [];
let userLikes = [];
let userSubscriptions = [];
let shortsIndex = 0;
let filter = 'all';
let currentFileUpload = null;

// ======== SAYIFA KONTROLÜ ========
function goToPage(page) {
    // Tüm sayfaları gizle
    document.querySelectorAll('.page-section').forEach(section => {
        section.style.display = 'none';
    });

    // Modallari kapat
    closeVideoModal();
    closeUploadModal();

    // Aktif sayfa elemanini bul ve göster
    const pageElement = document.getElementById(page + '-page');
    if (pageElement) {
        pageElement.style.display = 'block';
        currentPage = page;
    }

    // Sidebar aktif elamani güncelle
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    if (event && event.target) {
        event.target.closest('a')?.classList.add('active');
    }

    // Sayfaya özel işlemler
    if (page === 'home') {
        loadVideos();
    } else if (page === 'shorts') {
        loadShorts();
    } else if (page === 'trends') {
        loadTrends();
    } else if (page === 'liked') {
        loadLikedVideos();
    } else if (page === 'notifications') {
        loadNotifications();
    } else if (page === 'mychannel') {
        loadMyChannel();
    } else if (page === 'subscribers') {
        loadMySubscribers();
    } else if (page === 'subscriptions') {
        loadMySubscriptions();
    } else if (page === 'settings') {
        loadProfileSettings();
    } else if (page === 'admin') {
        if (currentUser?.email === 'bluehairkomsi@gmail.com') {
            loadAdminPanel();
        } else {
            goToPage('home');
            alert('Yalnızca Kurucu bu sayfaya erişebilir');
        }
    }

    // Mobilde sidebar'ı kapat
    if (window.innerWidth < 768) {
        toggleSidebar();
    }
}

// ======== SIDEBAR TOGGLE ========
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar').parentElement;
    sidebar.classList.toggle('active');
}

// ======== TEMA DEĞIŞTIRME ========
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

// Tema yükle
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// ======== AUTHENTICATION ========
function googleLogin() {
    auth.signInWithPopup(provider)
        .then(result => {
            currentUser = result.user;
            updateUI();
            loadUserData();
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

// Auth durumunun değişmesini dinle
auth.onAuthStateChanged(user => {
    currentUser = user;
    updateUI();
    if (user) {
        ensureUserDoc();
        loadUserData();
        loadVideos();
    }
});

// Firestore kullanıcı belgesine sahip değilse oluştur
function ensureUserDoc() {
    if (!currentUser) return;
    const ref = db.collection('users').doc(currentUser.uid);
    ref.get().then(doc => {
        if (!doc.exists) {
            ref.set({
                displayName: currentUser.displayName,
                displayNameLower: currentUser.displayName.toLowerCase(),
                email: currentUser.email,
                avatar: currentUser.photoURL,
                isVerified: currentUser.email === 'bluehairkomsi@gmail.com'
            });
        } else {
            // keep verification status up to date
            if (currentUser.email === 'bluehairkomsi@gmail.com' && !doc.data().isVerified) {
                ref.update({ isVerified: true });
            }
        }
    });
}

// UI'ı kullanıcı durumuna göre güncelle
function updateUI() {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    const uploadMobileBtn = document.getElementById('upload-mobile-btn');
    const notificationsBtn = document.getElementById('notifications-btn');
    const adminItem = document.getElementById('admin-menu-item');
    const adminSep = document.getElementById('admin-sep');
    const editChannelBtn = document.getElementById('edit-channel-btn');
    const subscriptionsSection = document.getElementById('subscriptions-section');

    if (currentUser) {
        loginBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        uploadMobileBtn.style.display = 'flex';
        notificationsBtn.style.display = 'flex';

        document.getElementById('u-img').src = currentUser.photoURL;
        document.getElementById('u-name').innerText = currentUser.displayName;

        if (currentUser.email === 'bluehairkomsi@gmail.com') {
            adminItem.style.display = 'flex';
            adminSep.style.display = 'block';
        }

        subscriptionsSection.style.display = 'block';

        // unread badge (realtime)
        db.collection('notifications')
          .where('to','==', currentUser.uid)
          .where('read','==', false)
          .onSnapshot(snap=>{
                const count = snap.size;
                if(count > 0) {
                    notificationsBtn.innerHTML = `<i class="fas fa-bell"></i><span class="badge">${count}</span>`;
                } else {
                    notificationsBtn.innerHTML = '<i class="fas fa-bell"></i>';
                }
          });
    } else {
        loginBtn.style.display = 'block';
        userMenu.style.display = 'none';
        uploadMobileBtn.style.display = 'none';
        notificationsBtn.style.display = 'none';
        subscriptionsSection.style.display = 'none';
        adminItem.style.display = 'none';
        adminSep.style.display = 'none';
    }
}

// ======== VİDEO YÜKLEME (YOUTUBE LİNKİ) ========
async function publishVideoFromLink() {
    if (!currentUser) return alert('Lütfen önce giriş yapın');

    const title = document.getElementById('v-title').value.trim();
    const url = document.getElementById('v-url').value.trim();
    const description = document.getElementById('v-description').value.trim();
    const category = document.getElementById('v-category').value;

    if (!title || !url) return alert("Başlık ve YouTube linki gerekli!");

    let videoId = '';
    try {
        videoId = url.includes('youtu.be') 
            ? url.split('/').pop().split('?')[0]
            : url.split('v=')[1]?.split('&')[0];
        
        if (!videoId) throw new Error('Geçersiz link');
    } catch (e) {
        return alert("Geçersiz YouTube linki!");
    }

    let isShorts = document.getElementById('v-shorts-checkbox')?.checked || false;
    // youtube short link detection
    if (!isShorts && url.includes('/shorts/')) isShorts = true;
    try {
        const docRef = await db.collection("videos").add({
            title: title,
            description: description,
            videoId: videoId,
            videoUrl: null,
            author: currentUser.displayName,
            authorEmail: currentUser.email,
            authorUID: currentUser.uid,
            authorAvatar: currentUser.photoURL,
            category: category || 'general',
            isVerified: currentUser.email === 'bluehairkomsi@gmail.com',
            likes: 0,
            dislikes: 0,
            views: 0,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isShorts: isShorts
        });

        // bildirim gönder
        notifySubscribers({
            id: docRef.id,
            title,
            authorUID: currentUser.uid,
            author: currentUser.displayName
        });

        alert("Video başarıyla paylaşıldı! 🚀");
        document.getElementById('v-title').value = "";
        document.getElementById('v-url').value = "";
        document.getElementById('v-description').value = "";
        closeUploadModal();
        loadVideos();
        loadShorts();
        if (isShorts) goToPage('shorts');
    } catch (err) {
        console.error(err);
        alert("Video yüklenirken hata oluştu: " + err.message);
    }
}

// ======== VİDEO YÜKLEME (DOSYA) ========
let selectedFile = null;

function handleFileSelect() {
    selectedFile = document.getElementById('file-input').files[0];
    if (selectedFile) {
        document.getElementById('file-info').style.display = 'block';
        document.getElementById('file-name').textContent = selectedFile.name;
        document.getElementById('publish-file-btn').style.display = 'block';
    }
}

async function publishVideoFromFile() {
    if (!currentUser) return alert('Lütfen önce giriş yapın');
    if (!selectedFile) return alert('Lütfen video dosyası seçin');

    const title = document.getElementById('file-title').value.trim();
    const description = document.getElementById('file-description').value.trim();
    const thumbnail = document.getElementById('file-thumbnail').value.trim();
    const category = document.getElementById('file-category').value;
    const shortCheckbox = document.getElementById('file-shorts-checkbox');

    if (!title) return alert("Video başlığı gerekli!");

    let isShorts = shortCheckbox?.checked || false;

    // Otomatik oryantasyon kontrolü
    if (!isShorts) {
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
            URL.revokeObjectURL(vid.src);
            if (vid.videoHeight / vid.videoWidth > 1.7) {
                isShorts = true;
            }
            uploadFile();
        };
        vid.src = URL.createObjectURL(selectedFile);
    } else {
        uploadFile();
    }

    function uploadFile() {
        const fileRef = storage.ref('videos/' + currentUser.uid + '/' + selectedFile.name);
        
        try {
            const uploadTask = fileRef.put(selectedFile);
            
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    document.getElementById('upload-progress').style.width = progress + '%';
                },
                (error) => {
                    alert("Yükleme hatası: " + error.message);
                },
                async () => {
                    const videoUrl = await fileRef.getDownloadURL();
                    
                    const videoDocRef = await db.collection("videos").add({
                        title: title,
                        description: description,
                        videoId: null,
                        videoUrl: videoUrl,
                        author: currentUser.displayName,
                        authorEmail: currentUser.email,
                        authorUID: currentUser.uid,
                        authorAvatar: currentUser.photoURL,
                        category: category || 'general',
                        isVerified: currentUser.email === 'bluehairkomsi@gmail.com',
                        thumbnail: thumbnail || null,
                        likes: 0,
                        dislikes: 0,
                        views: 0,
                        uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        isShorts: isShorts
                    });

                    // bildirim gönder
                    notifySubscribers({
                        id: videoDocRef.id,
                        title,
                        authorUID: currentUser.uid,
                        author: currentUser.displayName
                    });
    
                    alert("Video başarıyla yüklendi! 🚀");
                    document.getElementById('file-title').value = "";
                    document.getElementById('file-description').value = "";
                    document.getElementById('file-thumbnail').value = "";
                    document.getElementById('file-input').value = "";
                    selectedFile = null;
                    closeUploadModal();
                    loadVideos();
                    loadShorts();
                    if (isShorts) goToPage('shorts');
                }
            );
        } catch (err) {
            alert("Hata: " + err.message);
        }
    }
}

// ======== MODAL KONTROLÜ ========
function openUploadModal() {
    document.getElementById('upload-modal').classList.add('active');
}

// ======== YARDIMCI FONKSİYONLAR ========
function formatTime(timestamp) {
    if (!timestamp) return '';
    let date;
    if (timestamp.toDate) date = timestamp.toDate();
    else date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Şimdi';
    if (diff < 3600) return Math.floor(diff / 60) + ' dakika önce';
    if (diff < 86400) return Math.floor(diff / 3600) + ' saat önce';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' gün önce';
    return date.toLocaleDateString();
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.remove('active');
}

function switchUploadTab(tab) {
    document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tab + '-tab').classList.add('active');
    
    document.querySelectorAll('.upload-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

// ======== VİDEO TÜM LİSTESİNİ YÜKLE ========
function loadVideos() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    // always load non-shorts sorted by upload time
    db.collection("videos")
      .where('isShorts', '==', false)
      .orderBy('uploadedAt', 'desc')
      .onSnapshot(snapshot => {
        allVideos = [];
        grid.innerHTML = '';

        snapshot.forEach(doc => {
            const video = { id: doc.id, ...doc.data() };
            // client side category filter to avoid index requirements
            if (!filter || filter === 'all' || video.category === filter) {
                allVideos.push(video);
                createVideoCard(video, grid);
            }
        });
    });
}

function createVideoCard(video, container) {
    const card = document.createElement('div');
    card.className = 'v-card';
    card.onclick = () => {
        openVideoModal(video);
    };

    const thumbnail = video.videoId 
        ? `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
        : video.thumbnail || 'https://via.placeholder.com/280x157?text=No+Image';
    const shortBadge = video.isShorts ? '<span style="position:absolute; top:8px; left:8px; background:var(--red); color:white; padding:2px 6px; font-size:10px; border-radius:4px;">SHORTS</span>' : '';
    let ownerControls = '';
    if (currentUser && video.authorUID === currentUser.uid) {
        ownerControls = `
            <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
                <button class="btn-action" style="font-size:12px; padding:4px 8px;" onclick="event.stopPropagation(); editVideo('${video.id}')">Düzenle</button>
                <button class="btn-action" style="font-size:12px; padding:4px 8px;" onclick="event.stopPropagation(); deleteVideo('${video.id}')">Sil</button>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="v-card-thumbnail" style="position:relative;">
            <img src="${thumbnail}" style="width:100%; height:100%; object-fit:cover;">
            ${shortBadge}
        </div>
        <div class="v-card-info">
            <img src="${video.authorAvatar}" class="v-card-avatar">
            <div class="v-card-details">
                <div class="v-card-title">
                    ${video.title}
                    ${video.isVerified ? '<i class="fas fa-check-circle" style="color:var(--blue); font-size:14px; margin-left:4px;"></i>' : ''}
                </div>
                <div class="v-card-category" style="font-size:11px; color:var(--secondary-text); margin-top:2px;">
                    ${video.category || 'Genel'}
                </div>
                <div class="v-card-author">${video.author}</div>
                <div class="v-card-meta">${video.views || 0} izlenme • ${formatTime(video.uploadedAt)}</div>
            </div>
        </div>
        ${ownerControls}
    `;

    // avatar/name clickable to channel
    const avatarImg = card.querySelector('.v-card-avatar');
    const authorName = card.querySelector('.v-card-author');
    if (avatarImg) {
        avatarImg.style.cursor = 'pointer';
        avatarImg.onclick = e => { e.stopPropagation(); openChannel(video.authorUID); };
    }
    if (authorName) {
        authorName.style.cursor = 'pointer';
        authorName.onclick = e => { e.stopPropagation(); openChannel(video.authorUID); };
    }

    container.appendChild(card);
}

// ======== VİDEO DETAY MODAL ========
function openVideoModal(video) {
    console.log('opening video:', video);
    currentVideo = video;
    const modal = document.getElementById('video-modal');
    const playerContainer = document.getElementById('detail-player-container');
    playerContainer.innerHTML = '';
    if (video.videoId) {
        const iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.frameBorder = '0';
        iframe.allow = 'fullscreen';
        iframe.src = `https://www.youtube.com/embed/${video.videoId}`;
        playerContainer.appendChild(iframe);
    } else if (video.videoUrl) {
        const vid = document.createElement('video');
        vid.controls = true;
        vid.width = '100%';
        vid.height = '100%';
        vid.src = video.videoUrl;
        playerContainer.appendChild(vid);
    } else {
        playerContainer.textContent = 'Video oynatıcı yüklenemedi.';
    }

    document.getElementById('detail-title').textContent = video.title;
    document.getElementById('detail-views').textContent = (video.views || 0) + ' izlenme';
    document.getElementById('detail-date').textContent = formatTime(video.uploadedAt);

    // view sayısını bir kere arttır
    db.collection('videos').doc(video.id).update({
        views: firebase.firestore.FieldValue.increment(1)
    });
    video.views = (video.views || 0) + 1; // yerel objeyi de güncelle
    document.getElementById('detail-author').textContent = video.author;
    document.getElementById('detail-avatar').src = video.authorAvatar;
    document.getElementById('detail-description').textContent = video.description || 'Açıklama bulunamadı';
    document.getElementById('like-count').textContent = video.likes || 0;
    document.getElementById('dislike-count').textContent = video.dislikes || 0;

    // Abone durumunu kontrol et
    updateSubscribeButton();

    // Yorumları yükle
    loadComments(video.id);

    // Sıradaki videoları yükle
    loadNextVideos(video.id);

    modal.classList.add('active');
}

function closeVideoModal() {
    document.getElementById('video-modal').classList.remove('active');
    currentVideo = null;
}

// ======== LIKE/DISLIKE SİSTEMİ ========
async function likeVideo() {
    if (!currentUser || !currentVideo) return alert('Lütfen giriş yapın');

    try {
        const docRef = db.collection('videos').doc(currentVideo.id);
        const userLikeRef = db.collection('videoLikes').where('videoId', '==', currentVideo.id)
            .where('userId', '==', currentUser.uid);

        const likeSnapshot = await userLikeRef.get();

        if (likeSnapshot.empty) {
            // Like ekle
            await docRef.update({ likes: firebase.firestore.FieldValue.increment(1) });
            await db.collection('videoLikes').add({
                videoId: currentVideo.id,
                userId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            document.getElementById('like-count').textContent = (currentVideo.likes || 0) + 1;
        } else {
            // Like kaldır
            likeSnapshot.forEach(doc => doc.ref.delete());
            await docRef.update({ likes: firebase.firestore.FieldValue.increment(-1) });
            document.getElementById('like-count').textContent = Math.max(0, (currentVideo.likes || 0) - 1);
        }
    } catch (err) {
        alert("Hata: " + err.message);
    }
}

async function dislikeVideo() {
    if (!currentUser || !currentVideo) return alert('Lütfen giriş yapın');
    try {
        const docRef = db.collection('videos').doc(currentVideo.id);
        const userDislikeRef = db.collection('videoDislikes').where('videoId','==',currentVideo.id)
            .where('userId','==',currentUser.uid);
        const snap = await userDislikeRef.get();
        if (snap.empty) {
            // dislike ekle
            await docRef.update({ dislikes: firebase.firestore.FieldValue.increment(1) });
            await db.collection('videoDislikes').add({
                videoId: currentVideo.id,
                userId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // dislike kaldır
            snap.forEach(doc=>doc.ref.delete());
            await docRef.update({ dislikes: firebase.firestore.FieldValue.increment(-1) });
        }
    } catch(err){
        alert('Hata: '+err.message);
    }
}

// ======== PAYLAŞ ========
function shareVideo() {
    if (!currentVideo) return;
    const url = window.location.href;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        alert("Link kopyalandı!");
    } else {
        alert("Video Linki: " + url);
    }
}

function saveToPlaylist() {
    alert("Çalma listesi özellikleri yakında gelecek!");
}

function reportVideo() {
    if (!currentUser || !currentVideo) return alert('Lütfen giriş yapın');
    const reason = prompt('Neden şikayet ediyorsunuz? (isteğe bağlı)');
    db.collection('reports').add({
        videoId: currentVideo.id,
        reporter: currentUser.uid,
        reason: reason || '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Şikayetiniz alındı, teşekkürler.');
}

// ======== YORUM SİSTEMİ ========
async function loadComments(videoId) {
    const commentsList = document.getElementById('comments-list');
    const commentInputArea = document.getElementById('comment-input-area');

    commentsList.innerHTML = '';

    // Yorum girişi
    if (currentUser) {
        commentInputArea.innerHTML = `
            <div class="comment-item" style="margin-bottom:20px;">
                <img src="${currentUser.photoURL}" class="comment-avatar">
                <div style="flex:1;">
                    <textarea id="new-comment-text" placeholder="Yorum yaz..." style="width:100%; padding:8px; border:1px solid var(--border-color); border-radius:4px; resize:vertical; min-height:60px; font-family:Roboto;"></textarea>
                    <div style="margin-top:8px; display:flex; gap:8px;">
                        <button class="btn-primary" style="padding:6px 16px; font-size:13px;" onclick="postComment('${videoId}')">Gönder</button>
                        <button style="padding:6px 16px; border:1px solid var(--border-color); background:none; cursor:pointer; border-radius:4px;" onclick="document.getElementById('new-comment-text').value=''">İptal</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Yorumları yükle
    const commentsSnapshot = await db.collection('comments')
        .where('videoId', '==', videoId)
        .orderBy('timestamp', 'desc')
        .get();

    commentsSnapshot.forEach(doc => {
        const comment = doc.data();
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        commentEl.innerHTML = `
            <img src="${comment.userAvatar}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-author">${comment.userName}</div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-actions">
                    <span onclick="likeComment('${doc.id}')">👍 ${comment.likes || 0}</span>
                    <span onclick="replyComment('${doc.id}')">Yanıtla</span>
                </div>
            </div>
        `;
        commentsList.appendChild(commentEl);
    });
}

async function postComment(videoId) {
    if (!currentUser) return alert('Lütfen giriş yapın');
    
    const text = document.getElementById('new-comment-text').value.trim();
    if (!text) return alert('Yorum yazın');

    try {
        const commentRef = await db.collection('comments').add({
            videoId: videoId,
            userId: currentUser.uid,
            userName: currentUser.displayName,
            userAvatar: currentUser.photoURL,
            text: text,
            likes: 0,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('new-comment-text').value = '';
        if (currentVideo) {
            loadComments(currentVideo.id);
        }
        // bildirim gönder video sahibine
        const vidDoc = await db.collection('videos').doc(videoId).get();
        if (vidDoc.exists) {
            const vid = vidDoc.data();
            if (vid.authorUID !== currentUser.uid) {
                sendNotification(vid.authorUID, `${currentUser.displayName} videonuza yorum yaptı: ${text}`, videoId);
            }
        }
    } catch (err) {
        alert("Yorum yazarken hata: " + err.message);
    }
}

function likeComment(commentId) {
    alert("Yorum beğenme yakında gelecek!");
}

function replyComment(commentId) {
    alert("Yanıt yazma yakında gelecek!");
}

// ======== SHORTS SİSTEMİ ========
let currentShorts = [];

function loadShorts() {
    db.collection('videos')
        .where('isShorts', '==', true)
        .orderBy('uploadedAt', 'desc')
        .get()
        .then(snapshot => {
            currentShorts = [];
            snapshot.forEach(doc => {
                currentShorts.push({ id: doc.id, ...doc.data() });
            });
            
            if (currentShorts.length > 0) {
                shortsIndex = 0;
                displayShort(currentShorts[shortsIndex]);
            } else {
                document.getElementById('shorts-viewer').innerHTML = '<p style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">Henüz Short yok</p>';
            }
        });
}

function displayShort(short) {
    currentVideo = short; // gerekli like/dislike işlemleri için
    document.getElementById('shorts-iframe').src = short.videoId 
        ? `https://www.youtube.com/embed/${short.videoId}`
        : short.videoUrl;
    document.getElementById('shorts-title').textContent = short.title;
    document.getElementById('shorts-description').textContent = short.description || '';
    document.getElementById('shorts-author').textContent = short.author;
    document.getElementById('shorts-avatar').src = short.authorAvatar;
    document.getElementById('short-likes').textContent = short.likes || 0;
    if(document.getElementById('short-dislikes')){
        document.getElementById('short-dislikes').textContent = short.dislikes || 0;
    }
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

function likeShort() {
    if (!currentVideo) return;
    likeVideo();
    // güncelle gösterge
    document.getElementById('short-likes').textContent = (currentVideo.likes || 0) + 1;
}

function dislikeShort() {
    if (!currentVideo) return;
    dislikeVideo();
}

function shareShort() {
    if (!currentVideo) return;
    shareVideo();
}

// ======== TRENDLERİ SAYFASI ========
function loadTrends() {
    const trendsGrid = document.getElementById('trends-grid');
    trendsGrid.innerHTML = '';

    db.collection('videos')
        .where('isShorts', '==', false)
        .orderBy('views', 'desc')
        .limit(12)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const video = { id: doc.id, ...doc.data() };
                createVideoCard(video, trendsGrid);
            });
        });
}

// ======== BEĞENİLEN VİDEOLAR ========
function loadLikedVideos() {
    if (!currentUser) return alert('Lütfen giriş yapın');

    const likedGrid = document.getElementById('liked-grid');
    likedGrid.innerHTML = '';

    db.collection('videoLikes')
        .where('userId', '==', currentUser.uid)
        .get()
        .then(snapshot => {
            const likedVideoIds = snapshot.docs.map(doc => doc.data().videoId);
            
            if (likedVideoIds.length === 0) {
                likedGrid.innerHTML = '<p>Henüz beğendiğiniz video yok</p>';
                return;
            }

            db.collection('videos')
                .where(firebase.firestore.FieldPath.documentId(), 'in', likedVideoIds)
                .get()
                .then(snapshot => {
                    snapshot.forEach(doc => {
                        const video = { id: doc.id, ...doc.data() };
                        createVideoCard(video, likedGrid);
                    });
                });
        });
}

// ======== KANAL SAYFASI ========
async function loadChannel(uid) {
    if (!uid) return;
    window._loadedChannelUid = uid;
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data() || {};
    
    const isOwner = currentUser && currentUser.uid === uid;

    // isim ve doğrulama rozeti
    let display = userData.displayName || 'Anonim';
    if (userData.isVerified || userData.email === 'bluehairkomsi@gmail.com') {
        display += ' <i class="fas fa-check-circle" style="color:var(--blue); font-size:16px;vertical-align:middle;"></i>';
    }
    document.getElementById('channel-name').innerHTML = display;
    document.getElementById('channel-avatar').src = userData.avatar || 'https://via.placeholder.com/100';
    document.getElementById('channel-bio-text').textContent = userData.bio || '';
    // banner varsa uygula
    if (userData.banner) {
        document.querySelector('.channel-cover').style.backgroundImage = `url(${userData.banner})`;
        document.querySelector('.channel-cover').style.backgroundSize = 'cover';
    } else {
        document.querySelector('.channel-cover').style.backgroundImage = '';
    }
    document.getElementById('edit-channel-btn').style.display = isOwner ? 'block' : 'none';
    document.getElementById('my-subscribers-btn').style.display = isOwner ? 'block' : 'none';
    document.getElementById('my-subscriptions-btn').style.display = isOwner ? 'block' : 'none';
    document.getElementById('channel-subscribe-btn').style.display = isOwner ? 'none' : 'block';
    updateChannelSubscribeButton(uid);

    // Abone sayısını yükle
    const subSnapshot = await db.collection('subscriptions')
        .where('channelId', '==', uid)
        .get();
    document.getElementById('channel-subscribers').textContent = subSnapshot.size + ' abone';

    // Kanalın videolarını yükle
    const videosGrid = document.getElementById('channel-videos');
    videosGrid.innerHTML = '';

    db.collection('videos')
        .where('authorUID', '==', uid)
        .orderBy('uploadedAt', 'desc')
        .onSnapshot(snapshot => {
            videosGrid.innerHTML = '';
            snapshot.forEach(doc => {
                const video = { id: doc.id, ...doc.data() };
                createVideoCard(video, videosGrid);
            });
        });
}

async function loadMyChannel() {
    if (!currentUser) {
        goToPage('home');
        return alert('Lütfen giriş yapın');
    }
    await loadChannel(currentUser.uid);
}

function openChannel(uid) {
    goToPage('mychannel');
    loadChannel(uid);
}

function editChannel() {
    alert("Kanal düzenleme özelliği yakında gelecek!");
}

function switchChannelTab(tab) {
    // Tab geçişi
}

// ======== PROFIL AYARLARI ========
async function loadProfileSettings() {
    if (!currentUser) {
        goToPage('home');
        return alert('Lütfen giriş yapın');
    }

    // Kullanıcı ayarlarını yükle
    const userDocRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userDocRef.get();
    let userData = userDoc.data() || {};

    document.getElementById('settings-avatar').src = userData.avatar || currentUser.photoURL;
    document.getElementById('channel-display-name').value = userData.displayName || currentUser.displayName;
    document.getElementById('channel-bio').value = userData.bio || '';
    document.getElementById('social-youtube').value = userData.socialYoutube || '';
    document.getElementById('social-instagram').value = userData.socialInstagram || '';
    document.getElementById('social-website').value = userData.socialWebsite || '';

    // Banner'ı göster
    if (userData.banner) {
        document.getElementById('channel-banner').style.backgroundImage = `url(${userData.banner})`;
        document.getElementById('channel-banner').style.backgroundSize = 'cover';
        document.getElementById('channel-banner').textContent = '';
    }
}

async function saveProfileSettings() {
    if (!currentUser) return alert('Lütfen giriş yapın');

    const displayName = document.getElementById('channel-display-name').value.trim();
    const bio = document.getElementById('channel-bio').value.trim();
    const socialYoutube = document.getElementById('social-youtube').value.trim();
    const socialInstagram = document.getElementById('social-instagram').value.trim();
    const socialWebsite = document.getElementById('social-website').value.trim();

    if (!displayName) return alert('Kanal adı gerekli!');

    try {
        await db.collection('users').doc(currentUser.uid).set({
            displayName: displayName,
            displayNameLower: displayName.toLowerCase(),
            bio: bio,
            socialYoutube: socialYoutube,
            socialInstagram: socialInstagram,
            socialWebsite: socialWebsite,
            avatar: currentUser.photoURL,
            email: currentUser.email
        }, { merge: true });

        alert('Profil ayarları kaydedildi! 🎉');
        goToPage('mychannel');
    } catch (err) {
        alert('Hata: ' + err.message);
    }
}

async function changeAvatar() {
    const file = document.getElementById('avatar-input').files[0];
    if (!file || !currentUser) return;

    const fileRef = storage.ref('avatars/' + currentUser.uid);
    try {
        await fileRef.put(file);
        const avatarUrl = await fileRef.getDownloadURL();
        
        await db.collection('users').doc(currentUser.uid).update({
            avatar: avatarUrl
        });

        document.getElementById('settings-avatar').src = avatarUrl;
        document.getElementById('u-img').src = avatarUrl;
        alert('Profil resmi güncellendi! ✅');
    } catch (err) {
        alert('Yükleme hatası: ' + err.message);
    }
}

async function changeBanner() {
    const file = document.getElementById('banner-input').files[0];
    if (!file || !currentUser) return;

    const fileRef = storage.ref('banners/' + currentUser.uid);
    try {
        await fileRef.put(file);
        const bannerUrl = await fileRef.getDownloadURL();
        
        await db.collection('users').doc(currentUser.uid).update({
            banner: bannerUrl
        });

        const banner = document.getElementById('channel-banner');
        banner.style.backgroundImage = `url(${bannerUrl})`;
        banner.style.backgroundSize = 'cover';
        banner.textContent = '';
        alert('Başlık fotoğrafı güncellendi! ✅');
    } catch (err) {
        alert('Yükleme hatası: ' + err.message);
    }
}

// ======== ABONELERİM SAYFASI ========
async function loadMySubscribers() {
    if (!currentUser) {
        goToPage('home');
        return alert('Lütfen giriş yapın');
    }

    const subscribersList = document.getElementById('subscribers-list');
    subscribersList.innerHTML = '';

    try {
        const subSnapshot = await db.collection('subscriptions')
            .where('channelId', '==', currentUser.uid)
            .get();

        document.getElementById('subscriber-count-text').textContent = subSnapshot.size + ' abone';

        for (const doc of subSnapshot.docs) {
            const sub = doc.data();
            
            // Abone bilgisini yükle
            const userDocRef = db.collection('users').doc(sub.subscriberId);
            const userDoc = await userDocRef.get();
            const userData = userDoc.data() || {};

            const card = document.createElement('div');
            card.className = 'subscriber-card';
            card.innerHTML = `
                <img src="${userData.avatar || 'https://via.placeholder.com/80?text=Avatar'}" class="subscriber-avatar">
                <div class="subscriber-name">${userData.displayName || 'Anonım Kullanıcı'}</div>
                <div class="subscriber-email">${userData.email}</div>
                <div class="subscriber-actions">
                    <button onclick="removeSubscriber('${doc.id}')">Çıkar</button>
                </div>
            `;
            subscribersList.appendChild(card);
        }

        if (subSnapshot.empty) {
            subscribersList.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Henüz aboneniz yok</p>';
        }
    } catch (err) {
        alert('Hata: ' + err.message);
    }
}

async function removeSubscriber(subscriptionId) {
    if (!confirm('Bu aboneyi çıkarmak istediğine emin misin?')) return;

    try {
        await db.collection('subscriptions').doc(subscriptionId).delete();
        loadMySubscribers();
    } catch (err) {
        alert('Hata: ' + err.message);
    }
}

// ======== ABONELİKLERİ SAYFASI ========
async function loadMySubscriptions() {
    if (!currentUser) {
        goToPage('home');
        return alert('Lütfen giriş yapın');
    }

    const grid = document.getElementById('subscriptions-videos-list');
    const container = document.querySelector('.subscriptions-container');
    
    // Önceki kanal başlıklarını temizle
    container.querySelectorAll('.subscription-channel-header').forEach(el => el.remove());
    grid.innerHTML = '';

    try {
        const subSnapshot = await db.collection('subscriptions')
            .where('subscriberId', '==', currentUser.uid)
            .get();

        if (subSnapshot.empty) {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; padding:40px;">Henüz kimseye abone olmadınız</p>';
            return;
        }

        for (const doc of subSnapshot.docs) {
            const sub = doc.data();
            
            // Abone olunan kanal bilgisini yükle (uid'ye göre)
            const userDocRef = db.collection('users').doc(sub.channelId);
            const userDoc = await userDocRef.get();
            const userData = userDoc.data() || {};

            // Kanal başlığını göster
            const channelHeader = document.createElement('div');
            channelHeader.className = 'subscription-channel-header';
            channelHeader.onclick = () => {
                alert('Başka kullanıcı kanalı görüntüleme yakında gelecek!');
            };
            channelHeader.innerHTML = `
                <img src="${userData.avatar || 'https://via.placeholder.com/80?text=Avatar'}" class="subscription-channel-avatar">
                <div class="subscription-channel-info">
                    <div class="subscription-channel-name">${userData.displayName || 'Anonım'}</div>
                    <div class="subscription-channel-email">${userData.email}</div>
                </div>
                <button class="subscription-unsubscribe-btn" onclick="event.stopPropagation(); unsubscribeFrom('${doc.id}')">Abonelikten Çık</button>
            `;
            container.appendChild(channelHeader);

            // Bu kanalın videolarını yükle (email'e göre)
            const videosSnapshot = await db.collection('videos')
                .where('authorEmail', '==', userData.email)
                .where('isShorts', '==', false)
                .orderBy('uploadedAt', 'desc')
                .limit(4)
                .get();

            videosSnapshot.forEach(videoDoc => {
                const video = { id: videoDoc.id, ...videoDoc.data() };
                createVideoCard(video, grid);
            });
        }
    } catch (err) {
        console.error(err);
        alert('Hata: ' + err.message);
    }
}

async function unsubscribeFrom(subscriptionId) {
    if (!confirm('Bu kanaldan abone olmaktan çıkmak istediğine emin misin?')) return;

    try {
        await db.collection('subscriptions').doc(subscriptionId).delete();
        alert('Abonelik kaldırıldı!');
        loadMySubscriptions();
    } catch (err) {
        alert('Hata: ' + err.message);
    }
}

// ======== ABONE SİSTEMİ ========
async function toggleDetailSubscribe() {
    if (!currentUser || !currentVideo) return alert('Lütfen giriş yapın');

    const subscriptionRef = db.collection('subscriptions')
        .where('subscriberId', '==', currentUser.uid)
        .where('channelId', '==', currentVideo.authorUID);

    const snapshot = await subscriptionRef.get();

    try {
        if (snapshot.empty) {
            // Abone ol
            await db.collection('subscriptions').add({
                subscriberId: currentUser.uid,
                channelId: currentVideo.authorUID,
                channelName: currentVideo.author,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            document.getElementById('detail-subscribe-btn').textContent = 'Aboneliği Kaldır';
            alert("Abone olundu!");
        } else {
            // Aboneliği kaldır
            snapshot.forEach(doc => doc.ref.delete());
            document.getElementById('detail-subscribe-btn').textContent = 'Abone Ol';
            alert("Abonelik kaldırıldı!");
        }
    } catch (err) {
        alert("Hata: " + err.message);
    }
}

function toggleSubscribe() {
    toggleDetailSubscribe();
}

// ======== KULLANICI VERİLERİNİ YÜKLE ========
function loadUserData() {
    if (!currentUser) return;

    // Abonelikleri yükle
    db.collection('subscriptions')
        .where('subscriberId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            const subList = document.getElementById('subscriptions-list');
            subList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const sub = doc.data();
                const subItem = document.createElement('a');
                subItem.href = '#';
                subItem.className = 'sidebar-item';
                subItem.textContent = sub.channelName;
                subItem.onclick = (e) => {
                    e.preventDefault();
                };
                subList.appendChild(subItem);
            });
        });

    // Beğenileri yükle
    db.collection('videoLikes')
        .where('userId', '==', currentUser.uid)
        .get()
        .then(snapshot => {
            userLikes = snapshot.docs.map(doc => doc.data().videoId);
        });
}

// ======== KATEGORİ FİLTRESİ ========
function filterCategory(category, btnElem) {
    filter = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (btnElem) btnElem.classList.add('active');

    // temizle arama sonuçları
    const channelResults = document.getElementById('channel-results');
    if (channelResults) channelResults.innerHTML = '';

    // yükle yeniden
    loadVideos();
}

// ======== ARAMA FONKSİYONU ========
async function searchVideos() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const channelResults = document.getElementById('channel-results');
    const grid = document.getElementById('video-grid');
    if (!searchTerm) {
        if (channelResults) channelResults.innerHTML = '';
        return loadVideos();
    }

    grid.innerHTML = '';
    if (channelResults) channelResults.innerHTML = '';

    // önce kanalları ara
    try {
        const usersSnap = await db.collection('users')
            .where('displayNameLower', '>=', searchTerm)
            .where('displayNameLower', '<', searchTerm + '\uf8ff')
            .limit(10)
            .get();
        usersSnap.forEach(doc => {
            const u = doc.data();
            if (channelResults) {
                const div = document.createElement('div');
                div.className = 'subscriber-card';
                div.style.cursor = 'pointer';
                div.onclick = () => openChannel(doc.id);
                let displayNameHtml = u.displayName || 'Anonim';
                if (u.isVerified || u.email === 'bluehairkomsi@gmail.com') {
                    displayNameHtml += ' <i class="fas fa-check-circle" style="color:var(--blue); font-size:14px; vertical-align:middle;"></i>';
                }
                div.innerHTML = `
                    <img src="${u.avatar || 'https://via.placeholder.com/80?text=Avatar'}" class="subscriber-avatar">
                    <div class="subscriber-name">${displayNameHtml}</div>
                `;
                channelResults.appendChild(div);
            }
        });
    } catch (err) {
        console.error(err);
    }

    // videoları ara
    const snapshot = await db.collection('videos').where('isShorts','==',false).get();
    snapshot.forEach(doc => {
        const video = { id: doc.id, ...doc.data() };
        if (video.title.toLowerCase().includes(searchTerm) ||
            video.author.toLowerCase().includes(searchTerm)) {
            createVideoCard(video, grid);
        }
    });
}

// ======== SIRAKIN VİDEOLARI ========
function loadNextVideos(currentVideoId) {
    const nextList = document.getElementById('next-videos-list');
    nextList.innerHTML = '';

    db.collection('videos')
        .where('isShorts', '==', false)
        .orderBy('uploadedAt', 'desc')
        .limit(10)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                if (doc.id !== currentVideoId) {
                    const video = { id: doc.id, ...doc.data() };
                    const nextItem = document.createElement('div');
                    nextItem.className = 'next-video-item';
                    nextItem.onclick = () => {
                        openVideoModal(video);
                    };
                    nextItem.innerHTML = `
                        <img src="https://img.youtube.com/vi/${video.videoId || 'default'}/default.jpg" class="next-video-thumbnail" onerror="this.src='https://via.placeholder.com/100x60?text=No+Image'">
                        <div class="next-video-info">
                            <div class="next-video-title">${video.title}</div>
                            <div class="next-video-author">${video.author}</div>
                        </div>
                    `;
                    nextList.appendChild(nextItem);
                }
            });
        });
}

// ======== ABONELİK BUTONU GÜNCELLEME ========
async function updateChannelSubscribeButton(channelUid) {
    if (!currentUser) return;
    const btn = document.getElementById('channel-subscribe-btn');
    const snapshot = await db.collection('subscriptions')
        .where('subscriberId','==', currentUser.uid)
        .where('channelId','==', channelUid)
        .get();
    if (snapshot.empty) {
        btn.textContent = 'Abone Ol';
    } else {
        btn.textContent = 'Aboneliği Kaldır';
    }
}

async function toggleChannelSubscribe() {
    if (!currentUser) return alert('Lütfen giriş yapın');
    const channelUid = document.querySelector('#mychannel-page') ? (currentPage === 'mychannel' && currentUser ? currentUser.uid : null) : null;
    // we can store last loaded channelUid globally
    if (!window._loadedChannelUid) return;
    const channelId = window._loadedChannelUid;
    const snapshot = await db.collection('subscriptions')
        .where('subscriberId','==', currentUser.uid)
        .where('channelId','==', channelId)
        .get();
    if (snapshot.empty) {
        await db.collection('subscriptions').add({
            subscriberId: currentUser.uid,
            channelId: channelId,
            channelName: document.getElementById('channel-name').textContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Abone olundu!');
    } else {
        snapshot.forEach(doc => doc.ref.delete());
        alert('Abonelik kaldırıldı!');
    }
    updateChannelSubscribeButton(channelId);
}

// ======== KURUCU PANELİ ========
async function loadAdminPanel() {
    if (currentUser?.email !== 'bluehairkomsi@gmail.com') return;

    const adminVideosList = document.getElementById('admin-videos-list');
    adminVideosList.innerHTML = '';

    const videosSnapshot = await db.collection('videos').get();
    
    videosSnapshot.forEach(doc => {
        const video = doc.data();
        const item = document.createElement('div');
        item.style.cssText = 'padding:12px; border:1px solid var(--border-color); border-radius:4px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;';
        item.innerHTML = `
            <div>
                <strong>${video.title}</strong>
                <p style="margin:4px 0; font-size:12px; color:var(--secondary-text);">Yükleyen: ${video.author}</p>
            </div>
            <button class="btn-danger" style="padding:6px 12px;" onclick="deleteVideo('${doc.id}')">Sil</button>
        `;
        adminVideosList.appendChild(item);
    });
}

async function deleteVideo(videoId) {
    if (!confirm('Bu videoyu silmek istediğine emin misin?')) return;

    try {
        const doc = await db.collection('videos').doc(videoId).get();
        const data = doc.data();
        if (!currentUser) return;
        if (currentUser.email !== 'bluehairkomsi@gmail.com' && data.authorUID !== currentUser.uid) {
            return alert('Bu işlemi yapmaya yetkiniz yok');
        }
        await db.collection('videos').doc(videoId).delete();
        alert('Video silindi');
        if (currentPage === 'admin') loadAdminPanel();
        else if (currentPage === 'mychannel' || currentPage === 'home') loadVideos();
    } catch (err) {
        alert('Silme hatası: ' + err.message);
    }
}

async function editVideo(videoId) {
    if (!currentUser) return;
    const doc = await db.collection('videos').doc(videoId).get();
    const data = doc.data();
    if (!data) return;
    if (currentUser.email !== 'bluehairkomsi@gmail.com' && data.authorUID !== currentUser.uid) {
        return alert('Bu işlemi yapmaya yetkiniz yok');
    }

    const newTitle = prompt('Yeni başlık', data.title) || data.title;
    const newDesc = prompt('Yeni açıklama', data.description || '') || data.description;
    const newCat = prompt('Yeni kategori (music,animation,gaming,tutorial)', data.category) || data.category;

    try {
        await db.collection('videos').doc(videoId).update({
            title: newTitle,
            description: newDesc,
            category: newCat
        });
        alert('Video güncellendi');
        loadVideos();
    } catch (err) {
        alert('Güncelleme hatası: ' + err.message);
    }
}

async function adminVerify() {
    const email = document.getElementById('admin-target-email').value.trim();
    if (!email) return alert('E-posta girin');

    alert(email + " kullanıcısına mavi tik verme özelliği yakında gelecek!");
}

async function adminBan() {
    const email = document.getElementById('admin-target-email').value.trim();
    if (!email) return alert('E-posta girin');

    alert(email + " kullanıcısı ban listesine eklendi!");
}

// ======== BAŞLANGIÇ ========
function showNotifications() {
    if (!currentUser) return alert('Lütfen giriş yapın');
    goToPage('notifications');
}

// genel bildirim ekleme fonksiyonu
function sendNotification(toUid, message, videoId = null) {
    if (!toUid) return;
    db.collection('notifications').add({
        to: toUid,
        from: currentUser ? currentUser.uid : null,
        message,
        videoId,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// yüklenen video üzerine abonelere bildirim gönderir
function notifySubscribers(video) {
    const { id, title, authorUID, author } = video;
    const message = `${author} yeni bir video paylaştı: ${title}`;
    db.collection('subscriptions').where('channelId', '==', authorUID)
      .get().then(snap => {
          snap.forEach(sub => {
              const toUid = sub.data().subscriberId;
              if (toUid === authorUID) return;
              sendNotification(toUid, message, id);
          });
      });
}

// bildirimleri yükler
async function loadNotifications() {
    if (!currentUser) return;
    const list = document.getElementById('notifications-list');
    list.innerHTML = '';
    // işaretle okunmamış olanları artık okundu
    const unreadSnap = await db.collection('notifications')
        .where('to', '==', currentUser.uid)
        .where('read', '==', false)
        .get();
    unreadSnap.forEach(d => d.ref.update({ read: true }));
    updateUI();

    const snapshot = await db.collection('notifications')
        .where('to', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .get();
    if (snapshot.empty) {
        const none = document.createElement('div');
        none.textContent = 'Yeni bildiriminiz yok.';
        none.style.color = 'var(--secondary-text)';
        none.style.textAlign = 'center';
        none.style.padding = '20px';
        list.appendChild(none);
    } else {
        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'notification-card';
            if (!data.read) card.classList.add('unread');
            card.textContent = data.message;
            card.onclick = () => {
                if (data.videoId) goToVideo(data.videoId);
                if (!data.read) {
                    doc.ref.update({ read: true });
                    card.classList.remove('unread');
                    updateUI();
                }
            };
            list.appendChild(card);
        });
    }
}

// videoya git
function goToVideo(id) {
    db.collection('videos').doc(id).get().then(doc => {
        if (doc.exists) {
            openVideoModal({ id: doc.id, ...doc.data() });
        }
    });
}

// Enter tuşu ile arama
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchVideos();
    });

    // İlk yükleme
    loadVideos();
});
// Bu fonksiyonu bul ve içindeki 'card.onclick' satırına dikkat et
function renderVideos(videos) {
    const container = document.getElementById('video-grid');
    if (!container) return;
    container.innerHTML = '';

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        
        // BURASI EKSİK VEYA HATALI: Videoya basınca modal açılmalı
        card.onclick = () => openVideoModal(video); 

        card.innerHTML = `
            <div class="video-thumbnail">
                <img src="https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg">
            </div>
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
                <p class="video-meta">${video.authorName} • ${video.views || 0} izlenme</p>
            </div>
        `;
        container.appendChild(card);
    });
}
function openVideoModal(video) {
    if (!video || !video.youtubeId) return;
    
    currentVideo = video;
    const modal = document.getElementById('video-modal');
    const playerContainer = document.getElementById('detail-player-container');

    // Pencereyi göster
    modal.style.display = 'flex';

    // YouTube oynatıcısını yükle
    playerContainer.innerHTML = `
        <iframe width="100%" height="100%" 
            src="https://www.youtube.com/embed/${video.youtubeId}?autoplay=1" 
            frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
        </iframe>
    `;

    // Yazıları güncelle
    document.getElementById('detail-title').textContent = video.title;
    document.getElementById('detail-description').textContent = video.description || "Açıklama yok.";
    document.getElementById('detail-views').textContent = `${video.views || 0} izlenme`;
    document.getElementById('detail-author').textContent = video.authorName;
    document.getElementById('detail-avatar').src = video.authorAvatar || 'https://via.placeholder.com/40';

    // İzlenme sayısını Firestore'da artır
    db.collection('videos').doc(video.id).update({
        views: firebase.firestore.FieldValue.increment(1)
    }).catch(err => console.error("İzlenme artırılamadı:", err));
}
// ======== VİDEO OYNATMA SİSTEMİNİ YENİDEN KUR (ALPER ÖZEL) ========
function openVideoModal(video) {
    console.log("Açılmaya çalışılan video objesi:", video);

    if (!video || !video.youtubeId) {
        console.error("Hata: Video ID'si bulunamadı!");
        alert("Video yüklenirken bir hata oluştu (ID eksik).");
        return;
    }

    const modal = document.getElementById('video-modal');
    const playerContainer = document.getElementById('detail-player-container');

    if (!modal || !playerContainer) {
        console.error("Hata: HTML içinde 'video-modal' veya 'detail-player-container' bulunamadı!");
        return;
    }

    // 1. Modalı görünür yap
    modal.style.display = 'flex';

    // 2. YouTube oynatıcısını temizle ve yeniden yükle
    // Not: autoplay=1 bazen tarayıcılar tarafından engellenir, gerekirse kaldırılabilir.
    playerContainer.innerHTML = `
        <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/${video.youtubeId}?rel=0&showinfo=0&autoplay=1" 
            title="YouTube video player" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen>
        </iframe>
    `;

    // 3. Metin bilgilerini güncelle (Hata almamak için opsiyonel zincirleme kullanıyoruz)
    const titleEl = document.getElementById('detail-title');
    const descEl = document.getElementById('detail-description');
    const viewsEl = document.getElementById('detail-views');

    if (titleEl) titleEl.textContent = video.title || "Başlıksız Video";
    if (descEl) descEl.textContent = video.description || "Açıklama bulunmuyor.";
    if (viewsEl) viewsEl.textContent = `${video.views || 0} izlenme`;

    // 4. İzlenmeyi veritabanında artır
    db.collection('videos').doc(video.id).update({
        views: firebase.firestore.FieldValue.increment(1)
    }).then(() => {
        console.log("İzlenme başarıyla artırıldı.");
    }).catch(err => {
        console.warn("İzlenme artırılamadı (Normal bir hata olabilir):", err);
    });
}
// ==========================================
// ALPER ÖZEL - ID VE VİDEO OYNATMA TAMİRİ
// ==========================================

// 1. VİDEO YÜKLERKEN ID'Yİ TEMİZLEYEN FONKSİYON (GİRİŞTE TEMİZLİK)
async function publishVideoFromLink() {
    const url = document.getElementById('v-url').value;
    const title = document.getElementById('v-title').value;
    const category = document.getElementById('v-category').value;
    const isShort = document.getElementById('v-shorts-checkbox').checked;

    if (!url || !title) return alert("Lütfen video linki ve başlık girin!");

    // YouTube ID'sini her türlü linkten (kısa/uzun) ayıklayan formül
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;

    if (!videoId) {
        alert("Geçersiz YouTube linki! Lütfen düzgün bir link yapıştır.");
        return;
    }

    try {
        await db.collection('videos').add({
            title: title,
            youtubeId: videoId, // Artık sadece 11 haneli temiz kod gidiyor
            category: category,
            isShort: isShort,
            authorId: currentUser.uid,
            authorName: currentUser.displayName,
            authorAvatar: currentUser.photoURL,
            views: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Video başarıyla yayınlandı!");
        closeUploadModal();
        goToPage('home');
    } catch (error) {
        console.error("Yükleme hatası:", error);
        alert("Video yüklenemedi: " + error.message);
    }
}

// 2. VİDEOYU OYNATIRKEN ESKİ HATALI LİNKLERİ KURTARAN FONKSİYON (ÇIKIŞTA TEMİZLİK)
function openVideoModal(video) {
    if (!video || !video.youtubeId) return;
    
    let finalId = video.youtubeId;

    // Eğer veritabanında eski/hatalı uzun bir link kalmışsa onu burada da temizle
    if (finalId.includes("v=")) {
        finalId = finalId.split("v=")[1].substring(0, 11);
    } else if (finalId.includes("youtu.be/")) {
        finalId = finalId.split("youtu.be/")[1].substring(0, 11);
    }

    const modal = document.getElementById('video-modal');
    const playerContainer = document.getElementById('detail-player-container');

    // Modalı göster
    modal.style.display = 'flex';

    // Iframe'i temiz ID ile oluştur
    playerContainer.innerHTML = `
        <iframe width="100%" height="100%" 
            src="https://www.youtube.com/embed/${finalId}?autoplay=1&rel=0" 
            frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
        </iframe>
    `;

    // Metin bilgilerini güncelle
    document.getElementById('detail-title').textContent = video.title || "Başlıksız";
    document.getElementById('detail-description').textContent = video.description || "Açıklama yok.";
    document.getElementById('detail-views').textContent = `${video.views || 0} izlenme`;
    
    // İzlenme sayısını Firestore'da artır
    db.collection('videos').doc(video.id).update({
        views: firebase.firestore.FieldValue.increment(1)
    }).catch(err => console.log("İzlenme artırılamadı:", err));
}
// ======== GOOGLE LOGIN TAMİRİ ========
function googleLogin() {
    console.log("Giriş denemesi başlatıldı...");
    const provider = new firebase.auth.GoogleAuthProvider();
    
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Giriş başarılı:", result.user.displayName);
            window.location.reload(); // Sayfayı yenileyerek verileri tazele
        })
        .catch((error) => {
            console.error("Giriş Hatası:", error.code, error.message);
            alert("Oturum açılamadı: " + error.message);
        });
}

function logout() {
    auth.signOut().then(() => {
        window.location.reload();
    });
}
// ======== VIDEO OYNATICI TAMİRİ (SON DOKUNUŞ) ========
function openVideoModal(video) {
    console.log("Oynatılacak video verisi:", video); // F12'de bunu kontrol edeceğiz

    if (!video || (!video.youtubeId && !video.url)) {
        alert("Video verisi eksik! YouTube ID bulunamadı.");
        return;
    }

    const modal = document.getElementById('video-modal');
    const playerContainer = document.getElementById('detail-player-container');

    // YouTube ID'sini ayıkla (Uzun link gelirse diye)
    let vidId = video.youtubeId || "";
    if (vidId.includes("v=")) vidId = vidId.split("v=")[1].split("&")[0];
    if (vidId.includes("youtu.be/")) vidId = vidId.split("youtu.be/")[1].split("?")[0];
    vidId = vidId.substring(0, 11);

    // Modalı aç
    modal.style.display = 'flex';

    // Oynatıcıyı oluştur
    playerContainer.innerHTML = `
        <iframe width="100%" height="100%" 
            src="https://www.youtube.com/embed/${vidId}?autoplay=1&rel=0" 
            frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
        </iframe>
    `;

    // Metinleri güncelle
    document.getElementById('detail-title').textContent = video.title || "Başlıksız";
    document.getElementById('detail-views').textContent = `${video.views || 0} izlenme`;
    
    // İzlenme artır
    db.collection('videos').doc(video.id).update({
        views: firebase.firestore.FieldValue.increment(1)
    }).catch(e => console.log("İzlenme artırılamadı:", e));
}
// ======== ZORLA TIKLAMA ÖZELLİĞİ EKLE ========
function renderVideos(videos) {
    const container = document.getElementById('video-grid');
    if (!container) return;
    container.innerHTML = '';

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        
        // Bu satır çok kritik, konsola mutlaka yazı yazmalı
        card.onclick = () => {
            console.log("Karta tıklandı! Video verisi:", video); 
            openVideoModal(video);
        };

        card.innerHTML = `
            <div class="video-thumbnail">
                <img src="https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg">
            </div>
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
                <p class="video-meta">${video.authorName} • ${video.views || 0} izlenme</p>
            </div>
        `;
        container.appendChild(card);
    });
}
// ======== ANA SAYFAYI ZORLA TAMİR ET ========
function loadVideos() {
    console.log("loadVideos tetiklendi, videolar çekiliyor...");
    
    db.collection('videos')
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            const container = document.getElementById('video-grid');
            if (!container) return;
            container.innerHTML = '';

            snapshot.forEach(doc => {
                const video = { id: doc.id, ...doc.data() };
                
                // Kategori filtresi varsa kontrol et
                if (filter !== 'all' && video.category !== filter) return;

                const card = document.createElement('div');
                card.className = 'video-card';
                
                // Tıklama olayını buraya çiviliyoruz
                card.onclick = () => {
                    console.log("Karta tıklandı! Video ID:", video.youtubeId);
                    openVideoModal(video);
                };

                card.innerHTML = `
                    <div class="video-thumbnail">
                        <img src="https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg">
                    </div>
                    <div class="video-info">
                        <h3 class="video-title">${video.title}</h3>
                        <p class="video-meta">${video.authorName} • ${video.views || 0} izlenme</p>
                    </div>
                `;
                container.appendChild(card);
            });
        });
}
function openVideoModal(video) {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('detail-player-container');
    
    if (!modal || !player) {
        console.error("HATA: HTML'de modal veya oynatıcı kutusu bulunamadı!");
        return;
    }

    // Modalı görünür yap
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.zIndex = '9999';

    // YouTube ID temizleme ve yükleme
    let vidId = video.youtubeId;
    if (vidId.includes("v=")) vidId = vidId.split("v=")[1].substring(0, 11);
    
    player.innerHTML = `
        <iframe width="100%" height="100%" 
            src="https://www.youtube.com/embed/${vidId}?autoplay=1" 
            frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
        </iframe>
    `;
    
    document.getElementById('detail-title').innerText = video.title;
}
// ======== ANASAYFA VİDEO DİZİCİ VE TAMİRCİ (ALPER ÖZEL) ========
function loadVideos() {
    console.log("BHminations: Videolar veritabanından çekiliyor...");
    const container = document.getElementById('video-grid');
    if (!container) return;

    db.collection('videos')
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            container.innerHTML = ''; // Önce temizle
            
            if (snapshot.empty) {
                container.innerHTML = '<p style="padding:20px;">Henüz video yüklenmemiş.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const video = { id: doc.id, ...doc.data() };
                
                // Filtre kontrolü (Kategori seçiliyse)
                if (filter !== 'all' && video.category !== filter) return;

                const card = document.createElement('div');
                card.className = 'video-card';
                
                // TIKLAMA ÖZELLİĞİ: Burası videoyu açan anahtar
                card.onclick = () => {
                    console.log("Video açılıyor ID:", video.youtubeId);
                    openVideoModal(video);
                };

                // Kartın görsel yapısı
                card.innerHTML = `
                    <div class="video-thumbnail">
                        <img src="https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg" alt="${video.title}">
                    </div>
                    <div class="video-info-main" style="display:flex; padding:12px; gap:12px;">
                        <img src="${video.authorAvatar || 'https://via.placeholder.com/36'}" style="width:36px; height:36px; border-radius:50%;">
                        <div class="video-text">
                            <h3 style="font-size:14px; margin-bottom:4px; color:var(--text-color);">${video.title}</h3>
                            <p style="font-size:12px; color:var(--secondary-text);">${video.authorName}</p>
                            <p style="font-size:12px; color:var(--secondary-text);">${video.views || 0} izlenme</p>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
            console.log("Videolar başarıyla dizildi.");
        })
        .catch(err => {
            console.error("Videolar dizilirken hata oluştu:", err);
            container.innerHTML = '<p>Videolar yüklenemedi. Lütfen internetinizi kontrol edin.</p>';
        });
}

// Sayfa yüklendiğinde videoları çekmesi için zorla tetikle
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadVideos, 1000); 
});
// ======== WATCH PAGE (FULL YOUTUBE) SİSTEMİ ========

// MODALI KAPATMA FONKSİYONU (X tuşu için)
function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const playerContainer = document.getElementById('detail-player-container');
    
    modal.style.display = 'none';
    playerContainer.innerHTML = ''; // Videoyu durdurmak için içini boşaltıyoruz
}

// FULL YOUTUBE ARAYÜZÜNÜ OLUŞTURAN ANA FONKSİYON
function openVideoModal(video) {
    const modal = document.getElementById('video-modal');
    const playerContainer = document.getElementById('detail-player-container');
    
    if (!modal || !playerContainer) return;

    // Modalı aç
    modal.style.display = 'flex';

    // YouTube ID'sini temizle
    let vidId = video.youtubeId || "";
    if (vidId.includes("v=")) vidId = vidId.split("v=")[1].split("&")[0];
    vidId = vidId.substring(0, 11);

    // ARAYÜZÜ YENİDEN İNŞA ET (Yorumlar, Sıradaki Videolar, Abone Ol butonu)
    modal.innerHTML = `
        <div class="watch-container" style="display: flex; width: 100%; height: 100%; background: #0f0f0f; color: white; overflow-y: auto; position: relative;">
            
            <button onclick="closeVideoModal()" style="position: absolute; right: 20px; top: 10px; background: none; border: none; color: white; font-size: 30px; cursor: pointer; z-index: 1000;">&times;</button>

            <div class="main-content" style="flex: 3; padding: 20px;">
                <div id="detail-player-container" style="width: 100%; aspect-ratio: 16/9; background: black;">
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${vidId}?autoplay=1" frameborder="0" allowfullscreen></iframe>
                </div>
                
                <h1 style="font-size: 20px; margin: 15px 0;">${video.title}</h1>
                
                <div class="video-actions" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 15px;">
                    <div class="user-info" style="display: flex; align-items: center; gap: 10px;">
                        <img src="${video.authorAvatar || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; border-radius: 50%;">
                        <div>
                            <p style="font-weight: bold;">${video.authorName}</p>
                            <p style="font-size: 12px; color: #aaa;">1M Abone</p>
                        </div>
                        <button onclick="handleSubscribe('${video.authorId}')" style="background: white; color: black; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; margin-left: 15px;">Abone Ol</button>
                    </div>
                    
                    <div class="like-dislike" style="display: flex; gap: 10px;">
                        <button onclick="handleLike('${video.id}')" style="background: #222; color: white; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer;">👍 Like</button>
                    </div>
                </div>

                <div class="comments-section" style="margin-top: 20px;">
                    <h3>Yorumlar</h3>
                    <div style="display: flex; gap: 10px; margin: 15px 0;">
                        <input type="text" placeholder="Yorum ekle..." style="flex: 1; background: none; border: none; border-bottom: 1px solid #333; color: white; padding: 5px;">
                        <button onclick="checkAuth('Yorum yapmak için giriş yapmalısın!')" style="background: #3ea6ff; border: none; color: black; padding: 5px 15px; border-radius: 5px; cursor: pointer;">Yorum Yap</button>
                    </div>
                </div>
            </div>

            <div class="sidebar-content" style="flex: 1; padding: 20px; border-left: 1px solid #333;">
                <h3 style="font-size: 16px; margin-bottom: 15px;">Sıradaki Videolar</h3>
                <div id="side-video-list">
                    </div>
            </div>
        </div>
    `;

    // Yan tarafa videoları diz
    loadSideVideos();
}

// GİRİŞ KONTROLÜ (Like, Yorum, Abone için)
function checkAuth(message) {
    if (!auth.currentUser) {
        alert(message);
        return false;
    }
    return true;
}

function handleLike(videoId) {
    if(checkAuth("Beğenmek için lütfen giriş yapın!")) {
        console.log("Beğenildi:", videoId);
    }
}

function handleSubscribe(authorId) {
    if(checkAuth("Abone olmak için lütfen giriş yapın!")) {
        alert("Başarıyla abone olundu!");
    }
}

// YAN TARAFA KÜÇÜK VİDEOLARI DİZEN FONKSİYON
function loadSideVideos() {
    const sideList = document.getElementById('side-video-list');
    db.collection('videos').limit(10).get().then(snapshot => {
        sideList.innerHTML = '';
        snapshot.forEach(doc => {
            const v = doc.data();
            sideList.innerHTML += `
                <div onclick="openVideoModal({id: '${doc.id}', ...${JSON.stringify(v)}})" style="display: flex; gap: 10px; margin-bottom: 12px; cursor: pointer;">
                    <img src="https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg" style="width: 120px; border-radius: 8px;">
                    <div>
                        <p style="font-size: 13px; font-weight: bold; line-height: 1.2;">${v.title}</p>
                        <p style="font-size: 11px; color: #aaa; margin-top: 5px;">${v.authorName}</p>
                    </div>
                </div>
            `;
        });
    });
}
// ======== GERÇEK VERİ TABANLI WATCH PAGE SİSTEMİ ========

async function openVideoModal(video) {
    const modal = document.getElementById('video-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    modal.innerHTML = '<div class="loading">Yükleniyor...</div>'; // Yüklenme ekranı

    // 1. Gerçek Verileri Çek (Abone Sayısı, Like Sayısı, Yorumlar)
    const authorDoc = await db.collection('users').doc(video.authorId).get();
    const authorData = authorDoc.data() || { subscribers: [] };
    const subCount = authorData.subscribers ? authorData.subscribers.length : 0;
    
    // Kullanıcı abone mi kontrol et
    const isSubbed = auth.currentUser && authorData.subscribers && authorData.subscribers.includes(auth.currentUser.uid);

    // 2. YouTube ID Temizleme
    let vidId = video.youtubeId || "";
    if (vidId.includes("v=")) vidId = vidId.split("v=")[1].split("&")[0];
    vidId = vidId.substring(0, 11);

    // 3. ARAYÜZÜ İNŞA ET
    modal.innerHTML = `
        <div class="watch-container" style="display:flex; width:100%; height:100%; background:#0f0f0f; color:white; overflow-y:auto;">
            <button onclick="closeVideoModal()" style="position:fixed; top:20px; right:30px; background:none; border:none; color:white; font-size:40px; cursor:pointer; z-index:9999;">&times;</button>

            <div style="flex:3; padding:20px; max-width: 1280px;">
                <div id="player" style="width:100%; aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${vidId}?autoplay=1" frameborder="0" allowfullscreen></iframe>
                </div>

                <h1 style="font-size:20px; margin:15px 0;">${video.title}</h1>

                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; border-bottom:1px solid #333; padding-bottom:20px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${video.authorAvatar}" onclick="goToProfile('${video.authorId}')" style="width:40px; height:40px; border-radius:50%; cursor:pointer;">
                        <div>
                            <h4 onclick="goToProfile('${video.authorId}')" style="cursor:pointer; margin:0;">${video.authorName}</h4>
                            <p style="font-size:12px; color:#aaa; margin:0;">${subCount} abone</p>
                        </div>
                        ${isSubbed 
                            ? `<button onclick="handleSubscription('${video.authorId}', true)" style="background:#333; color:white; border:none; padding:10px 20px; border-radius:20px; font-weight:bold; cursor:pointer; margin-left:15px;">Abonelikten Çık</button>`
                            : `<button onclick="handleSubscription('${video.authorId}', false)" style="background:white; color:black; border:none; padding:10px 20px; border-radius:20px; font-weight:bold; cursor:pointer; margin-left:15px;">Abone Ol</button>`
                        }
                    </div>

                    <div style="display:flex; background:#222; border-radius:20px; overflow:hidden;">
                        <button onclick="handleLike('${video.id}')" style="background:none; border:none; color:white; padding:10px 15px; cursor:pointer; border-right:1px solid #444; display:flex; align-items:center; gap:5px;">
                            <span class="material-icons">thumb_up</span> 
                            <span>${video.likes || 0}</span>
                        </button>
                        <button style="background:none; border:none; color:white; padding:10px 15px; cursor:pointer;">
                            <span class="material-icons">thumb_down</span>
                        </button>
                    </div>
                </div>

                <div id="comments-app" style="margin-top:20px;">
                    <h3 id="comment-count">Yükleniyor...</h3>
                    <div style="display:flex; gap:15px; margin:20px 0;">
                        <img src="${auth.currentUser ? auth.currentUser.photoURL : 'https://via.placeholder.com/40'}" style="width:40px; height:40px; border-radius:50%;">
                        <div style="flex:1;">
                            <input id="comment-input" type="text" placeholder="Yorum ekleyin..." style="width:100%; background:none; border:none; border-bottom:1px solid #333; color:white; padding:8px 0; outline:none;">
                            <div style="display:flex; justify-content:flex-end; margin-top:10px;">
                                <button onclick="addComment('${video.id}')" style="background:#3ea6ff; color:#000; border:none; padding:8px 16px; border-radius:18px; font-weight:bold; cursor:pointer;">Yorum Yap</button>
                            </div>
                        </div>
                    </div>
                    <div id="comments-list"></div>
                </div>
            </div>

            <div style="flex:1; padding:20px; border-left:1px solid #333; min-width:300px;">
                <h3 style="font-size:16px; margin-bottom:15px;">Sıradaki Videolar</h3>
                <div id="side-video-list"></div>
            </div>
        </div>
    `;

    loadComments(video.id);
    loadSideVideos(video.id);
}

// 2. PROFİLE GİTME FONKSİYONU
function goToProfile(userId) {
    console.log("Profile gidiliyor:", userId);
    window.location.href = `profile.html?id=${userId}`;
}

// 3. ABONE OLMA / ÇIKMA (GERÇEK)
async function handleSubscription(authorId, isSubbed) {
    if (!auth.currentUser) return alert("Abone olmak için giriş yapmalısın!");

    const authorRef = db.collection('users').doc(authorId);
    if (isSubbed) {
        await authorRef.update({
            subscribers: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid)
        });
    } else {
        await authorRef.update({
            subscribers: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid)
        });
    }
    // Videoyu tekrar yükleyerek arayüzü güncelle
    location.reload(); 
}

// 4. GERÇEK YORUM SİSTEMİ
async function loadComments(videoId) {
    const list = document.getElementById('comments-list');
    const snapshot = await db.collection('videos').doc(videoId).collection('comments').orderBy('createdAt', 'desc').get();
    
    document.getElementById('comment-count').innerText = `${snapshot.size} Yorum`;
    list.innerHTML = '';

    snapshot.forEach(doc => {
        const c = doc.data();
        list.innerHTML += `
            <div style="display:flex; gap:15px; margin-bottom:20px;">
                <img src="${c.userAvatar}" style="width:40px; height:40px; border-radius:50%;">
                <div>
                    <p style="font-size:13px; font-weight:bold; margin:0;">${c.userName} <span style="font-weight:normal; color:#aaa; margin-left:10px;">yeni</span></p>
                    <p style="margin:5px 0; font-size:14px;">${c.text}</p>
                </div>
            </div>
        `;
    });
}

async function addComment(videoId) {
    const text = document.getElementById('comment-input').value;
    if (!auth.currentUser) return alert("Yorum yapmak için giriş yapmalısın!");
    if (!text) return;

    await db.collection('videos').doc(videoId).collection('comments').add({
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName,
        userAvatar: auth.currentUser.photoURL,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('comment-input').value = '';
    loadComments(videoId);
}
// ======== VEXTIC PROFESYONEL İZLEME VE ETKİLEŞİM SİSTEMİ ========

async function openVideoModal(video) {
    const modal = document.getElementById('video-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    
    // 1. İZLENME SAYACI (Sadece 1 kere artırma - Session Tabanlı)
    const viewKey = `viewed_${video.id}`;
    if (!sessionStorage.getItem(viewKey)) {
        await db.collection('videos').doc(video.id).update({
            views: firebase.firestore.FieldValue.increment(1)
        });
        sessionStorage.setItem(viewKey, 'true'); // Bu sekme açık kaldıkça tekrar saymaz
    }

    // 2. ABONE VE LİKE VERİLERİNİ ÇEK
    const authorDoc = await db.collection('users').doc(video.authorId).get();
    const authorData = authorDoc.data() || { subscribers: [] };
    const isSubbed = auth.currentUser && authorData.subscribers?.includes(auth.currentUser.uid);

    // 3. ARAYÜZÜ OLUŞTUR (İkonlar ve Yan Panel)
    modal.innerHTML = `
        <div class="watch-container" style="display:flex; width:100%; height:100%; background:#0f0f0f; color:white; overflow-y:auto; font-family: Roboto, Arial, sans-serif;">
            <button onclick="closeVideoModal()" style="position:fixed; top:15px; right:20px; background:none; border:none; color:white; font-size:35px; cursor:pointer; z-index:10001;">&times;</button>

            <div style="flex:3; padding:20px; max-width:1200px;">
                <div id="player-container" style="width:100%; aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${video.youtubeId}?autoplay=1" frameborder="0" allowfullscreen></iframe>
                </div>

                <h1 style="font-size:20px; margin:15px 0;">${video.title}</h1>

                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:15px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${video.authorAvatar}" onclick="goToProfile('${video.authorId}')" style="width:40px; height:40px; border-radius:50%; cursor:pointer;">
                        <div>
                            <h4 style="margin:0; cursor:pointer;" onclick="goToProfile('${video.authorId}')">${video.authorName}</h4>
                            <p style="font-size:12px; color:#aaa; margin:0;">${authorData.subscribers?.length || 0} abone</p>
                        </div>
                        <button onclick="handleSubscription('${video.authorId}', ${isSubbed})" 
                            style="background:${isSubbed ? '#333' : 'white'}; color:${isSubbed ? 'white' : 'black'}; border:none; padding:10px 20px; border-radius:20px; font-weight:bold; cursor:pointer; margin-left:15px;">
                            ${isSubbed ? 'Abonelikten Çık' : 'Abone Ol'}
                        </button>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <div style="display:flex; background:#222; border-radius:20px; overflow:hidden;">
                            <button onclick="handleLike('${video.id}')" style="background:none; border:none; color:white; padding:10px 15px; cursor:pointer; border-right:1px solid #444; display:flex; align-items:center; gap:8px;">
                                <i class="material-icons" style="font-size:20px;">thumb_up</i> <span>${video.likes || 0}</span>
                            </button>
                            <button style="background:none; border:none; color:white; padding:10px 15px; cursor:pointer;">
                                <i class="material-icons" style="font-size:20px;">thumb_down</i>
                            </button>
                        </div>
                    </div>
                </div>

                <div style="margin-top:20px;">
                    <h3 id="comment-count-label">Yorumlar</h3>
                    <div id="comment-form" style="display:flex; gap:15px; margin:20px 0;">
                        <img src="${auth.currentUser?.photoURL || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; border-radius:50%;">
                        <div style="flex:1;">
                            <input id="main-comment-input" type="text" placeholder="Yorum ekleyin..." style="width:100%; background:none; border:none; border-bottom:1px solid #333; color:white; padding:8px 0; outline:none;">
                            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                                <button onclick="postComment('${video.id}')" style="background:#3ea6ff; color:#000; border:none; padding:8px 16px; border-radius:18px; font-weight:bold; cursor:pointer;">Yorum Yap</button>
                            </div>
                        </div>
                    </div>
                    <div id="comments-display-list"></div>
                </div>
            </div>

            <div style="flex:1; padding:20px; border-left:1px solid #333; min-width:350px;">
                <h3 style="font-size:16px; margin-bottom:15px;">Sıradaki Videolar</h3>
                <div id="next-videos-container"></div>
            </div>
        </div>
    `;

    loadComments(video.id);
    loadNextVideos(video.id);
}
// SIRADAKİ VİDEOLARI YÜKLE VE TIKLANABİLİR YAP
async function loadNextVideos(currentVidId) {
    const container = document.getElementById('next-videos-container');
    const snapshot = await db.collection('videos').limit(15).get();
    
    container.innerHTML = '';
    snapshot.forEach(doc => {
        if (doc.id === currentVidId) return; // Mevcut videoyu listede gösterme
        const data = doc.data();
        const v = { id: doc.id, ...data };

        container.innerHTML += `
            <div onclick='openVideoModal(${JSON.stringify(v)})' style="display:flex; gap:10px; margin-bottom:12px; cursor:pointer;">
                <img src="https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg" style="width:160px; border-radius:8px; object-fit:cover;">
                <div style="flex:1;">
                    <h4 style="font-size:14px; margin:0; line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${v.title}</h4>
                    <p style="font-size:12px; color:#aaa; margin:5px 0 0 0;">${v.authorName}</p>
                    <p style="font-size:11px; color:#aaa; margin:0;">${v.views || 0} izlenme</p>
                </div>
            </div>
        `;
    });
}

// YORUMA YANIT VERME SİSTEMİ
function showReplyInput(commentId) {
    if(!auth.currentUser) return alert("Yanıt vermek için giriş yap!");
    const replyArea = document.getElementById(`reply-area-${commentId}`);
    replyArea.style.display = replyArea.style.display === 'none' ? 'block' : 'none';
}

async function postReply(videoId, commentId) {
    const input = document.getElementById(`reply-input-${commentId}`);
    if(!input.value) return;

    await db.collection('videos').doc(videoId).collection('comments').doc(commentId).collection('replies').add({
        text: input.value,
        userName: auth.currentUser.displayName,
        userAvatar: auth.currentUser.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    input.value = '';
    alert("Yanıt gönderildi!");
    loadComments(videoId);
}
// ======== VEXTIC ULTIMATE WATCH SYSTEM (KALICI VERİ) ========

async function openVideoModal(video) {
    const modal = document.getElementById('video-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    // 1. İZLENME SİSTEMİ (Spam Engelli - Oturum Başına 1)
    const viewKey = `v_${video.id}`;
    if (!sessionStorage.getItem(viewKey)) {
        await db.collection('videos').doc(video.id).update({
            views: firebase.firestore.FieldValue.increment(1)
        });
        sessionStorage.setItem(viewKey, 'true');
    }

    // 2. ABONE DURUMU VE LİKE ÇEK
    const authorDoc = await db.collection('users').doc(video.authorId).get();
    const isSubbed = auth.currentUser && authorDoc.data()?.subscribers?.includes(auth.currentUser.uid);

    modal.innerHTML = `
        <div class="watch-container" style="display:flex; width:100%; height:100%; background:#0f0f0f; color:white; overflow-y:auto;">
            <button onclick="closeVideoModal()" style="position:fixed; top:20px; right:30px; background:none; border:none; color:white; font-size:40px; cursor:pointer; z-index:9999;">&times;</button>

            <div style="flex:3; padding:20px; max-width:1200px;">
                <div style="width:100%; aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${video.youtubeId}?autoplay=1" frameborder="0" allowfullscreen></iframe>
                </div>

                <h1 style="font-size:20px; margin:15px 0;">${video.title}</h1>

                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:15px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${video.authorAvatar}" onclick="goToProfile('${video.authorId}')" style="width:40px; height:40px; border-radius:50%; cursor:pointer;">
                        <div>
                            <h4 style="margin:0; cursor:pointer;" onclick="goToProfile('${video.authorId}')">${video.authorName}</h4>
                            <p style="font-size:12px; color:#aaa; margin:0;">${authorDoc.data()?.subscribers?.length || 0} abone</p>
                        </div>
                        <button id="sub-btn" onclick="toggleSub('${video.authorId}')" style="background:${isSubbed ? '#333' : 'white'}; color:${isSubbed ? 'white' : 'black'}; border:none; padding:10px 20px; border-radius:20px; font-weight:bold; cursor:pointer; margin-left:15px;">
                            ${isSubbed ? 'Abonelikten Çık' : 'Abone Ol'}
                        </button>
                    </div>

                    <div style="display:flex; gap:10px; background:#222; border-radius:20px; padding:5px 15px;">
                        <button onclick="handleLike('${video.id}')" style="background:none; border:none; color:white; cursor:pointer;">👍 ${video.likes || 0}</button>
                        <button style="background:none; border:none; color:white; cursor:pointer; border-left:1px solid #444; padding-left:10px;">👎</button>
                    </div>
                </div>

                <div style="margin-top:20px;">
                    <h3 id="c-count">Yorumlar</h3>
                    <div style="display:flex; gap:10px; margin-bottom:20px;">
                        <input id="c-input" type="text" placeholder="Yorum ekle..." style="flex:1; background:none; border:none; border-bottom:1px solid #333; color:white; padding:10px; outline:none;">
                        <button onclick="saveComment('${video.id}')" style="background:#3ea6ff; border:none; padding:10px 20px; border-radius:20px; cursor:pointer;">Yorum Yap</button>
                    </div>
                    <div id="c-list"></div>
                </div>
            </div>

            <div id="side-vids" style="flex:1; padding:20px; border-left:1px solid #333;">
                <h3>Sıradaki Videolar</h3>
            </div>
        </div>
    `;

    loadVideoComments(video.id);
    loadWatchNext(video.id);
}

// ======== KALICI YORUM KAYDETME ========
async function saveComment(videoId) {
    const text = document.getElementById('c-input').value;
    if (!auth.currentUser) return alert("Giriş yapmalısın!");
    if (!text) return;

    await db.collection('videos').doc(videoId).collection('comments').add({
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName,
        avatar: auth.currentUser.photoURL,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('c-input').value = '';
    loadVideoComments(videoId); // Listeyi tazele
}

// ======== YORUMLARI VE YANITLARI YÜKLE ========
async function loadVideoComments(videoId) {
    const list = document.getElementById('c-list');
    const snap = await db.collection('videos').doc(videoId).collection('comments').orderBy('createdAt', 'desc').get();
    
    document.getElementById('c-count').innerText = `${snap.size} Yorum`;
    list.innerHTML = '';

    snap.forEach(async doc => {
        const c = doc.data();
        const cid = doc.id;
        const commentDiv = document.createElement('div');
        commentDiv.style.marginBottom = "20px";
        commentDiv.innerHTML = `
            <div style="display:flex; gap:10px;">
                <img src="${c.avatar}" style="width:35px; height:35px; border-radius:50%;">
                <div style="flex:1;">
                    <p style="font-size:13px; font-weight:bold; margin:0;">${c.name}</p>
                    <p style="margin:5px 0;">${c.text}</p>
                    <button onclick="showReply('${cid}')" style="background:none; border:none; color:#aaa; font-size:12px; cursor:pointer;">Yanıtla</button>
                    <div id="reply-box-${cid}" style="display:none; margin-top:10px;">
                        <input id="ri-${cid}" type="text" placeholder="Yanıtla..." style="background:none; border:none; border-bottom:1px solid #444; color:white; width:70%;">
                        <button onclick="saveReply('${videoId}', '${cid}')" style="color:#3ea6ff; background:none; border:none; cursor:pointer;">Gönder</button>
                    </div>
                    <div id="rl-${cid}" style="margin-top:10px; padding-left:20px; border-left:2px solid #333;"></div>
                </div>
            </div>
        `;
        list.appendChild(commentDiv);
        loadReplies(videoId, cid);
    });
}

// ======== YANIT SİSTEMİ ========
function showReply(cid) {
    const box = document.getElementById(`reply-box-${cid}`);
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function saveReply(vid, cid) {
    const text = document.getElementById(`ri-${cid}`).value;
    if (!auth.currentUser || !text) return;

    await db.collection('videos').doc(vid).collection('comments').doc(cid).collection('replies').add({
        name: auth.currentUser.displayName,
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Yanıt eklendi!");
    loadVideoComments(vid);
}

// ======== SIRADAKİ VİDEOLARI DEĞİŞTİRME ÖZELLİĞİ ========
async function loadWatchNext(currentId) {
    const side = document.getElementById('side-vids');
    const snap = await db.collection('videos').limit(10).get();
    
    snap.forEach(doc => {
        if(doc.id === currentId) return;
        const v = { id: doc.id, ...doc.data() };
        const item = document.createElement('div');
        item.style = "display:flex; gap:10px; margin-bottom:15px; cursor:pointer;";
        item.onclick = () => openVideoModal(v); // Videoyu anında değiştirir
        item.innerHTML = `
            <img src="https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg" style="width:120px; border-radius:8px;">
            <div>
                <p style="font-size:13px; font-weight:bold; margin:0;">${v.title}</p>
                <p style="font-size:11px; color:#aaa;">${v.authorName}</p>
            </div>
        `;
        side.appendChild(item);
    });
}
